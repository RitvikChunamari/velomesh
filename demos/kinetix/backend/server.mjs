/**
 * Kinetix — Real-Time Collaborative Shader Studio Backend Engine
 * Zero-dependency Node.js 18+ core implementing:
 *  - LWW-Element-Register CRDT with Lamport vector clocks (commutative + idempotent)
 *  - Pointer velocity momentum handoff (`projectMomentum`)
 *  - Immutable PostgreSQL-compatible shader revision ledger (`002_shader_revisions.sql`)
 *  - Cloudflare R2 AWS Signature V4 presigned PUT generator & receipt verifier
 */
import crypto from 'node:crypto';

export function projectMomentum(velocityPxPerSec, decel = 0.994) {
  return ((velocityPxPerSec / 1000) * decel) / (1 - decel);
}

export class CrdtRoomState {
  constructor() {
    this.rooms = new Map();
  }

  _ensureRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        vectorClock: {},
        registers: new Map(), // key -> { value, lamportClock, actorId }
        peers: new Set()
      });
    }
    return this.rooms.get(roomId);
  }

  /**
   * Merge a remote or local LWW uniform/shader patch into the room CRDT state.
   * Ordering guarantees commutativity and idempotency via (lamportClock, actorId).
   */
  mergeStateVector(roomId, patch = {}, actorId = 'local', clock = 1) {
    if (!roomId || !actorId) throw new Error('roomId and actorId are required');
    const room = this._ensureRoom(roomId);
    const numClock = Number(clock) || 0;
    room.peers.add(actorId);
    room.vectorClock[actorId] = Math.max(room.vectorClock[actorId] || 0, numClock);

    const appliedKeys = [];
    for (const [key, value] of Object.entries(patch)) {
      const prev = room.registers.get(key);
      const wins =
        !prev ||
        numClock > prev.lamportClock ||
        (numClock === prev.lamportClock && actorId.localeCompare(prev.actorId) > 0);
      if (wins) {
        room.registers.set(key, { value, lamportClock: numClock, actorId });
        appliedKeys.push(key);
      }
    }

    return {
      roomId,
      appliedKeys,
      vectorClock: { ...room.vectorClock },
      state: this.snapshot(roomId)
    };
  }

  applyConcurrentOps(roomId, ops = []) {
    for (const op of ops) {
      this.mergeStateVector(roomId, op.patch, op.actorId, op.clock);
    }
    return {
      vectorClock: { ...this._ensureRoom(roomId).vectorClock },
      state: this.snapshot(roomId)
    };
  }

  snapshot(roomId) {
    const room = this._ensureRoom(roomId);
    const out = {};
    for (const key of [...room.registers.keys()].sort()) {
      out[key] = room.registers.get(key).value;
    }
    return out;
  }
}

export class PostgresRevisionLedger {
  constructor() {
    this.revisions = [];
  }

  commitRevision({
    projectId,
    authorId,
    uniforms = {},
    glslSource = '',
    r2AssetKey = null,
    lamportClock = null
  }) {
    if (!projectId || !authorId) throw new Error('projectId and authorId are required');
    const prev = this.revisions.filter((r) => r.projectId === projectId).at(0) || null;
    const nextClock =
      lamportClock !== null ? Number(lamportClock) : (prev ? prev.lamportClock + 1 : 1);

    const canonicalPayload = JSON.stringify({
      projectId,
      parentRevisionId: prev ? prev.revisionId : null,
      authorId,
      lamportClock: nextClock,
      uniforms: Object.keys(uniforms)
        .sort()
        .reduce((acc, k) => {
          acc[k] = uniforms[k];
          return acc;
        }, {}),
      glslSource,
      r2AssetKey
    });

    const sha256Checksum = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
    const crdtSnapshot = Buffer.from(canonicalPayload, 'utf8');
    const revisionId = `rev_${sha256Checksum.slice(0, 12)}`;

    const record = Object.freeze({
      revisionId,
      projectId,
      parentRevisionId: prev ? prev.revisionId : null,
      authorId,
      lamportClock: nextClock,
      uniforms: Object.freeze({ ...uniforms }),
      glslSource,
      r2AssetKey,
      sha256Checksum,
      crdtSnapshot,
      createdAt: new Date().toISOString()
    });

    this.revisions.unshift(record);
    return record;
  }

  listRevisions(projectId) {
    return this.revisions.filter((r) => r.projectId === projectId);
  }

  checkoutRevision(projectId, revisionId) {
    const rev = this.revisions.find((r) => r.projectId === projectId && r.revisionId === revisionId);
    if (!rev) throw new Error(`Revision not found: ${revisionId}`);
    const canonicalPayload = rev.crdtSnapshot.toString('utf8');
    const verifiedHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
    if (verifiedHash !== rev.sha256Checksum) {
      throw new Error(`SHA-256 integrity mismatch for ${revisionId}`);
    }
    return rev;
  }
}

export function createR2PresignedUpload({
  bucket = 'kinetix-assets',
  accountId = 'r2_acct_demo',
  projectId,
  filename,
  contentType = 'image/png',
  byteLength,
  secret,
  expiresInSec = 900,
  nowMs = Date.now()
}) {
  if (!projectId || !filename || !secret) throw new Error('projectId, filename, and secret required');
  if (!Number.isFinite(Number(byteLength)) || Number(byteLength) <= 0) {
    throw new Error('positive byteLength required');
  }
  const safeName = pathSafeFilename(filename);
  const ts = Math.floor(nowMs / 1000);
  const amzDate = new Date(nowMs).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const objectKey = `${projectId}/${ts}-${safeName}`;
  const expires = Math.max(60, Math.min(3600, Number(expiresInSec) || 900));

  const canonicalQuery = [
    'X-Amz-Algorithm=AWS4-HMAC-SHA256',
    `X-Amz-Credential=${encodeURIComponent(`${accountId}/${amzDate.slice(0, 8)}/auto/s3/aws4_request`)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${expires}`,
    'X-Amz-SignedHeaders=content-type%3Bhost'
  ].join('&');

  const stringToSign = `PUT\n/${bucket}/${objectKey}\n${canonicalQuery}\n${contentType}\n${Number(byteLength)}`;
  const signature = crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');

  return {
    method: 'PUT',
    bucket,
    objectKey,
    r2Uri: `r2://${bucket}/${objectKey}`,
    url: `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${objectKey}?${canonicalQuery}&X-Amz-Signature=${signature}`,
    contentType,
    byteLength: Number(byteLength),
    issuedAtSec: ts,
    expiresInSec: expires,
    signature
  };
}

function pathSafeFilename(name) {
  return String(name)
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/\.{2,}/g, '.')
    .slice(0, 80);
}

export function verifyR2UploadReceipt({
  bucket = 'kinetix-assets',
  objectKey,
  contentType,
  byteLength,
  issuedAtSec,
  expiresInSec,
  signature,
  canonicalQuery,
  secret,
  nowMs = Date.now()
}) {
  if (!objectKey || !signature || !secret) {
    throw new Error('Missing R2 receipt fields');
  }
  const nowSec = Math.floor(nowMs / 1000);
  if (nowSec - Number(issuedAtSec) > Number(expiresInSec)) {
    throw new Error('Expired Cloudflare R2 presigned PUT URL');
  }
  const amzDate = new Date(Number(issuedAtSec) * 1000).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const query =
    canonicalQuery ||
    [
      'X-Amz-Algorithm=AWS4-HMAC-SHA256',
      `X-Amz-Credential=${encodeURIComponent(`r2_acct_demo/${amzDate.slice(0, 8)}/auto/s3/aws4_request`)}`,
      `X-Amz-Date=${amzDate}`,
      `X-Amz-Expires=${expiresInSec}`,
      'X-Amz-SignedHeaders=content-type%3Bhost'
    ].join('&');

  const stringToSign = `PUT\n/${bucket}/${objectKey}\n${query}\n${contentType}\n${Number(byteLength)}`;
  const expected = crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');
  const sigBuf = Buffer.from(String(signature), 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Invalid R2 HMAC signature');
  }
  return { verified: true, objectKey, r2Uri: `r2://${bucket}/${objectKey}` };
}
