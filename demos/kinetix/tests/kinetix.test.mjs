import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CrdtRoomState,
  PostgresRevisionLedger,
  createR2PresignedUpload,
  verifyR2UploadReceipt,
  projectMomentum
} from '../backend/server.mjs';

test('CrdtRoomState converges commutatively and idempotently across concurrent out-of-order peer ops', () => {
  const ops = [];
  const actors = ['peer_zurich', 'peer_tokyo', 'peer_sf'];
  for (let i = 1; i <= 210; i++) {
    const actor = actors[i % actors.length];
    ops.push({
      actorId: actor,
      clock: Math.floor((i + 2) / 3),
      patch: {
        frequency: Number((1.5 + (i % 9) * 0.35).toFixed(2)),
        harmonics: (i % 7) + 1,
        preset: i % 2 === 0 ? 'lattice' : 'interference'
      }
    });
  }

  const roomA = new CrdtRoomState();
  const roomB = new CrdtRoomState();

  roomA.applyConcurrentOps('proj_studio_01', ops);
  // Reverse order + duplicate replay on roomB must converge identically
  const reversedAndDuped = [...ops].reverse().concat(ops.slice(0, 40));
  roomB.applyConcurrentOps('proj_studio_01', reversedAndDuped);

  assert.deepEqual(roomA.snapshot('proj_studio_01'), roomB.snapshot('proj_studio_01'));
  assert.deepEqual(roomA._ensureRoom('proj_studio_01').vectorClock, roomB._ensureRoom('proj_studio_01').vectorClock);
  assert.ok(Math.round(projectMomentum(1200)) > 190);
});

test('PostgresRevisionLedger commits immutable SHA-256 shader revisions and supports time-travel checkout', () => {
  const ledger = new PostgresRevisionLedger();
  const rev1 = ledger.commitRevision({
    projectId: 'proj_kinetix',
    authorId: 'peer_zurich',
    uniforms: { frequency: 3.2, harmonics: 5, damping: 0.84 },
    glslSource: 'float f(vec2 uv){ return sin(uv.x * 3.2); }',
    r2AssetKey: 'proj_kinetix/1000-grain-lut.png'
  });
  const rev2 = ledger.commitRevision({
    projectId: 'proj_kinetix',
    authorId: 'peer_tokyo',
    uniforms: { frequency: 6.4, harmonics: 8, damping: 0.91 },
    glslSource: 'float f(vec2 uv){ return cos(uv.y * 6.4); }'
  });

  assert.equal(rev1.lamportClock, 1);
  assert.equal(rev2.lamportClock, 2);
  assert.equal(rev2.parentRevisionId, rev1.revisionId);
  assert.equal(rev1.sha256Checksum.length, 64);
  assert.equal(ledger.listRevisions('proj_kinetix').length, 2);

  const checkedOut = ledger.checkoutRevision('proj_kinetix', rev1.revisionId);
  assert.equal(checkedOut.uniforms.frequency, 3.2);
  assert.throws(() => {
    rev1.lamportClock = 999;
  }, TypeError);
});

test('createR2PresignedUpload and verifyR2UploadReceipt sign PUT uploads and reject tampered or expired receipts', () => {
  const secret = 'r2_demo_signing_key_xyz';
  const nowMs = 1763600000000;
  const signed = createR2PresignedUpload({
    bucket: 'kinetix-assets',
    projectId: 'proj_kinetix',
    filename: 'monochrome-lut.cube',
    contentType: 'application/octet-stream',
    byteLength: 49152,
    secret,
    expiresInSec: 300,
    nowMs
  });

  assert.equal(signed.method, 'PUT');
  assert.ok(signed.url.includes('X-Amz-Algorithm=AWS4-HMAC-SHA256'));
  assert.ok(signed.url.includes(signed.signature));

  const valid = verifyR2UploadReceipt({ ...signed, secret, nowMs: nowMs + 60000 });
  assert.equal(valid.verified, true);
  assert.equal(valid.r2Uri, `r2://kinetix-assets/${signed.objectKey}`);

  // Reject tampered byteLength
  assert.throws(() => verifyR2UploadReceipt({ ...signed, byteLength: 99999, secret, nowMs: nowMs + 60000 }), /Invalid R2/);
  // Reject expired presigned URL
  assert.throws(() => verifyR2UploadReceipt({ ...signed, secret, nowMs: nowMs + 600000 }), /Expired Cloudflare R2/);
});
