---
name: cloudflare-edge-workers
description: Build low-latency Cloudflare Workers, Durable Objects, R2 presigned object uploads, D1 SQLite, and edge WebSocket state coordinators.
---

# Cloudflare Workers, Durable Objects & R2

Ship edge-native APIs and real-time collaborative coordinators on Cloudflare.

## Core Patterns
1. Keep stateless routing in Workers and isolate per-room/per-doc WebSocket + CRDT coordination in Durable Objects with transactional SQLite state.
2. Use R2 presigned URLs or bounded multipart uploads with strict content-type, byte-size, and tenant key-prefix validation (`tenants/{tenantId}/{assetId}`).
3. Validate CORS, HMAC signatures, and request payload sizes before forwarding to origin storage.
