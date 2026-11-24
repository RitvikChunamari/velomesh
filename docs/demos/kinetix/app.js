// Kinetix Real-Time Collaborative Shader & UI Studio (CRDT Sync + Postgres Revisions + R2 Assets)

function projectMomentum(velocityPxPerSec, decel = 0.994) {
  return ((velocityPxPerSec / 1000) * decel) / (1 - decel);
}

function pseudoHashHex(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const part = (h >>> 0).toString(16).padStart(8, '0');
  return `${part}${part.split('').reverse().join('')}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('kx-shader-canvas');
  const ctx = canvas?.getContext('2d');

  const state = {
    preset: 'interference',
    frequency: 3.6,
    harmonics: 5,
    phaseVelocity: 1.2,
    vectorClock: { ZRH: 14, TYO: 9, SFO: 22 },
    activeRevId: 'rev_048f9a',
    r2AssetKey: 'proj_01/grain-lut.cube',
    pointer: { x: 0.5, y: 0.5, active: false, vx: 0, vy: 0 },
    peers: [
      { id: 'ZRH', label: 'peer_zurich', x: 0.34, y: 0.42 },
      { id: 'TYO', label: 'peer_tokyo', x: 0.72, y: 0.58 }
    ]
  };

  const revisions = [
    {
      id: 'rev_048f9a',
      author: 'peer_sf',
      preset: 'interference',
      frequency: 3.6,
      harmonics: 5,
      phaseVelocity: 1.2,
      r2Asset: 'proj_01/grain-lut.cube',
      clock: 45
    },
    {
      id: 'rev_047c12',
      author: 'peer_zurich',
      preset: 'lattice',
      frequency: 4.8,
      harmonics: 7,
      phaseVelocity: 1.6,
      r2Asset: 'proj_01/sdf-height.raw',
      clock: 44
    },
    {
      id: 'rev_045e3b',
      author: 'peer_tokyo',
      preset: 'halftone',
      frequency: 2.8,
      harmonics: 4,
      phaseVelocity: 0.9,
      r2Asset: 'proj_01/dither-4x4.png',
      clock: 41
    },
    {
      id: 'rev_040a01',
      author: 'peer_sf',
      preset: 'interference',
      frequency: 2.0,
      harmonics: 3,
      phaseVelocity: 0.8,
      r2Asset: 'proj_01/init.glsl',
      clock: 36
    }
  ];

  const feedItems = [
    { badge: 'CRDT MERGED', text: 'peer_zurich LWW-updated harmonics=5 (clock ZRH:14)' },
    { badge: 'R2 PUT 200', text: 'Signed AWS4-HMAC-SHA256 upload proj_01/grain-lut.cube (48KB)' }
  ];

  const clockEl = document.getElementById('kx-kpi-clock');
  const revEl = document.getElementById('kx-kpi-rev');
  const revSubEl = document.getElementById('kx-kpi-rev-sub');
  const r2El = document.getElementById('kx-kpi-r2');
  const r2SubEl = document.getElementById('kx-kpi-r2-sub');
  const freqEl = document.getElementById('kx-val-freq');
  const harmEl = document.getElementById('kx-val-harm');
  const velEl = document.getElementById('kx-val-vel');
  const feedEl = document.getElementById('kx-crdt-feed');
  const sqlBannerEl = document.getElementById('kx-sql-banner');
  const revBodyEl = document.getElementById('kx-revision-body');

  function getColors() {
    const cs = getComputedStyle(document.documentElement);
    const isLight = document.documentElement.dataset.theme === 'light';
    return {
      isLight,
      bg: cs.getPropertyValue('--bg-elevated').trim() || (isLight ? '#ffffff' : '#101016'),
      ink: cs.getPropertyValue('--ink').trim() || (isLight ? '#121216' : '#f4f4f7'),
      muted: cs.getPropertyValue('--ink-muted').trim() || (isLight ? '#5b5c68' : '#8f909e'),
      rule: cs.getPropertyValue('--rule').trim() || (isLight ? '#dfddd6' : '#21222c'),
      accent: cs.getPropertyValue('--kx-accent').trim() || (isLight ? '#b44d15' : '#d96b27'),
      accentInk: cs.getPropertyValue('--kx-accent-ink').trim() || (isLight ? '#9e3f0d' : '#f09a67'),
      cyan: cs.getPropertyValue('--kx-cyan').trim() || (isLight ? '#096e8c' : '#5ccfe6'),
      ok: cs.getPropertyValue('--kx-ok').trim() || (isLight ? '#137547' : '#4cc38a')
    };
  }

  function renderUI() {
    const vc = state.vectorClock;
    if (clockEl) clockEl.textContent = `clock: [ZRH:${vc.ZRH}, TYO:${vc.TYO}, SFO:${vc.SFO}]`;
    if (revEl) revEl.textContent = `${state.activeRevId} · SHA-256 Verified`;
    if (revSubEl) revSubEl.textContent = `${revisions.length} immutable snapshots stored`;
    if (r2SubEl) r2SubEl.textContent = `r2://kinetix-assets/${state.r2AssetKey}`;
    if (freqEl) freqEl.textContent = state.frequency.toFixed(1);
    if (harmEl) harmEl.textContent = String(state.harmonics);
    if (velEl) velEl.textContent = state.phaseVelocity.toFixed(1);

    document.querySelectorAll('[data-preset]').forEach((btn) => {
      const active = btn.dataset.preset === state.preset;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    if (feedEl) {
      feedEl.innerHTML = feedItems
        .slice(0, 6)
        .map((item) => {
          const badgeCls =
            item.badge.startsWith('R2')
              ? ' is-r2'
              : item.badge.startsWith('PG') || item.badge.startsWith('LWW')
                ? ' is-pg'
                : '';
          return `<li class="kx-crdt-item"><span>${item.text}</span><span class="kx-crdt-badge${badgeCls}">${item.badge}</span></li>`;
        })
        .join('');
    }

    if (revBodyEl) {
      revBodyEl.innerHTML = revisions
        .map((r) => {
          const activeClass = r.id === state.activeRevId ? ' active' : '';
          return `<tr class="kx-revision-row${activeClass}" data-rev-id="${r.id}">
            <td>${r.id}</td>
            <td>${r.author}</td>
            <td>${r.preset} · f=${r.frequency.toFixed(1)} h=${r.harmonics}</td>
            <td>${r.r2Asset}</td>
            <td>#${r.clock}</td>
          </tr>`;
        })
        .join('');

      revBodyEl.querySelectorAll('[data-rev-id]').forEach((row) => {
        row.addEventListener('click', () => {
          const picked = revisions.find((r) => r.id === row.dataset.revId);
          if (!picked) return;
          state.activeRevId = picked.id;
          state.preset = picked.preset;
          state.frequency = picked.frequency;
          state.harmonics = picked.harmonics;
          state.phaseVelocity = picked.phaseVelocity;
          state.r2AssetKey = picked.r2Asset;
          if (sqlBannerEl) {
            sqlBannerEl.textContent = `SELECT uniforms_json, sha256_checksum FROM shader_revisions WHERE revision_id = '${picked.id}';`;
          }
          feedItems.unshift({
            badge: 'CHECKOUT OK',
            text: `Restored Postgres ${picked.id} (${picked.preset}, clock=#${picked.clock})`
          });
          renderUI();
        });
      });
    }
  }

  let phaseTime = 0;

  function drawShaderFrame(nowMs = 0) {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(300, Math.floor(rect.width || 1120));
    const h = Math.max(200, Math.floor(rect.height || 310));
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = getColors();
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, w, h);

    if (!reduced) {
      phaseTime = (nowMs / 1000) * state.phaseVelocity;
    }

    const px = state.pointer.x * w;
    const py = state.pointer.y * h;

    // Subtle monochrome coordinate grid
    ctx.strokeStyle = c.rule;
    ctx.lineWidth = 1;
    const stepGrid = 56;
    for (let x = stepGrid; x < w; x += stepGrid) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = stepGrid; y < h; y += stepGrid) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }

    if (state.preset === 'interference') {
      // Multi-harmonic Spectral Cyan & Copper-Amber standing wave isolines
      const lines = Math.max(8, Math.min(20, 6 + state.harmonics * 2));
      for (let l = 0; l < lines; l++) {
        const yBase = ((l + 0.5) / lines) * h;
        const isAccent = l % 3 === 0;
        const isFocus = l === Math.floor(lines / 2);
        ctx.strokeStyle = isFocus ? c.ink : isAccent ? c.accentInk : c.cyan;
        ctx.globalAlpha = isFocus ? 0.92 : isAccent ? 0.62 : 0.42;
        ctx.lineWidth = isFocus ? 2 : isAccent ? 1.5 : 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const nx = x / w;
          const dx = x - px;
          const dy = yBase - py;
          const dist = Math.hypot(dx, dy);
          const pull = Math.exp(-dist / 160) * 18 * Math.sin(dist * 0.06 - phaseTime * 2);
          const wave =
            Math.sin(nx * Math.PI * state.frequency + phaseTime + l * 0.4) * 14 +
            Math.cos(nx * Math.PI * state.frequency * 1.5 - phaseTime * 0.7) * (state.harmonics * 1.4);
          const y = yBase + wave + pull;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (state.preset === 'lattice') {
      // Geodesic wireframe SDF wave surface with optics pointer heatmap
      const cols = 22;
      const rows = 9;
      const nodes = [];
      for (let r = 0; r < rows; r++) {
        nodes[r] = [];
        for (let col = 0; col < cols; col++) {
          const u = col / (cols - 1);
          const v = r / (rows - 1);
          const bx = 28 + u * (w - 56);
          const by = 28 + v * (h - 56);
          const d = Math.hypot(bx - px, by - py);
          const disp = Math.sin(u * state.frequency * 2 + v * state.harmonics + phaseTime) * 11 + Math.exp(-d / 140) * 18;
          nodes[r][col] = [bx + disp * 0.45, by + disp, d];
        }
      }
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          const [x0, y0, d] = nodes[r][col];
          const near = d < 145;
          ctx.strokeStyle = near ? c.accentInk : (r + col) % 2 === 0 ? c.cyan : c.muted;
          ctx.globalAlpha = near ? 0.9 : 0.48;
          ctx.lineWidth = near ? 1.55 : 1.05;
          if (col + 1 < cols) {
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(nodes[r][col + 1][0], nodes[r][col + 1][1]);
            ctx.stroke();
          }
          if (r + 1 < rows) {
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(nodes[r + 1][col][0], nodes[r + 1][col][1]);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    } else {
      // Halftone Swiss spectral wave matrix
      const gap = 22;
      for (let x = 22; x < w - 16; x += gap) {
        for (let y = 22; y < h - 16; y += gap) {
          const nx = x / w;
          const ny = y / h;
          const dist = Math.hypot(x - px, y - py);
          const amp =
            0.5 +
            0.5 *
              Math.sin(nx * state.frequency * 3 + phaseTime + Math.cos(ny * state.harmonics * 2 - phaseTime));
          const focus = Math.exp(-dist / 170) * 0.45;
          const energy = amp + focus;
          const radius = Math.max(1.2, Math.min(8.5, energy * 6.5));
          ctx.fillStyle = energy > 0.85 ? c.accentInk : energy > 0.56 ? c.cyan : c.muted;
          ctx.globalAlpha = energy > 0.85 ? 0.92 : energy > 0.56 ? 0.72 : 0.35;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    // Draw remote collaborator CRDT cursor markers (Spectral Cyan & Copper-Amber optical reticles)
    ctx.font = '12px "JetBrains Mono", monospace';
    state.peers.forEach((peer, idx) => {
      const shiftX = reduced ? 0 : Math.sin(phaseTime * 0.7 + idx * 2.1) * 0.08;
      const shiftY = reduced ? 0 : Math.cos(phaseTime * 0.6 + idx * 1.4) * 0.06;
      const cx = (peer.x + shiftX) * w;
      const cy = (peer.y + shiftY) * h;
      const peerColor = idx % 2 === 0 ? c.cyan : c.accentInk;

      ctx.strokeStyle = peerColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy);
      ctx.lineTo(cx + 7, cy);
      ctx.moveTo(cx, cy - 7);
      ctx.lineTo(cx, cy + 7);
      ctx.stroke();

      ctx.fillStyle = peerColor;
      ctx.fillText(peer.id, cx + 10, cy + 4);
    });
  }

  function animate(now) {
    drawShaderFrame(now);
    if (!reduced) {
      requestAnimationFrame(animate);
    }
  }

  function applyLocalCrdtDelta(patch, label) {
    Object.assign(state, patch);
    state.vectorClock.SFO += 1;
    feedItems.unshift({
      badge: 'CRDT SYNCED',
      text: `peer_sf updated ${label} -> clock SFO:${state.vectorClock.SFO}`
    });
    renderUI();
    if (reduced) drawShaderFrame();
  }

  function simulateRemotePeerOp() {
    const pick = Math.random() > 0.5 ? 'ZRH' : 'TYO';
    state.vectorClock[pick] += 1;
    state.frequency = Number((2.2 + ((state.vectorClock[pick] % 8) * 0.4)).toFixed(1));
    state.harmonics = 3 + (state.vectorClock[pick] % 6);
    feedItems.unshift({
      badge: 'WS CRDT OK',
      text: `peer_${pick.toLowerCase()} merged f=${state.frequency.toFixed(1)}, h=${state.harmonics} (clock ${pick}:${state.vectorClock[pick]})`
    });
    renderUI();
    if (reduced) drawShaderFrame();
  }

  function simulateR2Upload() {
    const seq = state.vectorClock.SFO + state.vectorClock.ZRH;
    const key = `proj_01/shader-lut-${seq}.png`;
    state.r2AssetKey = key;
    if (r2El) r2El.textContent = 'R2 Presigned PUT 200';
    feedItems.unshift({
      badge: 'R2 PUT 200',
      text: `Verified AWS4-HMAC-SHA256 upload -> r2://kinetix-assets/${key}`
    });
    renderUI();
  }

  function commitPostgresRevision() {
    const totalClock = state.vectorClock.ZRH + state.vectorClock.TYO + state.vectorClock.SFO;
    const hashSeed = `${state.preset}:${state.frequency}:${state.harmonics}:${totalClock}:${state.r2AssetKey}`;
    const newRevId = `rev_${pseudoHashHex(hashSeed).slice(0, 6)}`;
    state.activeRevId = newRevId;
    revisions.unshift({
      id: newRevId,
      author: 'peer_sf',
      preset: state.preset,
      frequency: state.frequency,
      harmonics: state.harmonics,
      phaseVelocity: state.phaseVelocity,
      r2Asset: state.r2AssetKey,
      clock: totalClock
    });
    if (sqlBannerEl) {
      sqlBannerEl.textContent = `INSERT INTO shader_revisions (revision_id, lamport_clock, sha256_checksum) VALUES ('${newRevId}', ${totalClock}, '${pseudoHashHex(hashSeed)}...');`;
    }
    feedItems.unshift({
      badge: 'PG COMMITTED',
      text: `Immutable snapshot ${newRevId} persisted (clock=#${totalClock})`
    });
    renderUI();
  }

  function simulateConcurrentConflictMerge() {
    state.vectorClock.ZRH += 1;
    state.vectorClock.TYO += 1;
    const zrhVal = 5.4;
    const tyoVal = 4.2;
    const zrhClock = state.vectorClock.ZRH;
    const tyoClock = state.vectorClock.TYO;
    const winner = zrhClock >= tyoClock ? 'peer_zurich' : 'peer_tokyo';
    state.frequency = winner === 'peer_zurich' ? zrhVal : tyoVal;
    feedItems.unshift({
      badge: 'LWW CONVERGED',
      text: `Concurrent edits converged deterministically (${winner} won, f=${state.frequency.toFixed(1)}, 0 conflicts)`
    });
    renderUI();
    if (reduced) drawShaderFrame();
  }

  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyLocalCrdtDelta({ preset: btn.dataset.preset || 'interference' }, `preset=${btn.dataset.preset}`);
    });
  });

  document.getElementById('kx-freq-dec')?.addEventListener('click', () => {
    applyLocalCrdtDelta({ frequency: Math.max(1.0, Number((state.frequency - 0.4).toFixed(1))) }, 'frequency');
  });
  document.getElementById('kx-freq-inc')?.addEventListener('click', () => {
    applyLocalCrdtDelta({ frequency: Math.min(9.6, Number((state.frequency + 0.4).toFixed(1))) }, 'frequency');
  });
  document.getElementById('kx-harm-dec')?.addEventListener('click', () => {
    applyLocalCrdtDelta({ harmonics: Math.max(1, state.harmonics - 1) }, 'harmonics');
  });
  document.getElementById('kx-harm-inc')?.addEventListener('click', () => {
    applyLocalCrdtDelta({ harmonics: Math.min(10, state.harmonics + 1) }, 'harmonics');
  });
  document.getElementById('kx-vel-dec')?.addEventListener('click', () => {
    applyLocalCrdtDelta({ phaseVelocity: Math.max(0.2, Number((state.phaseVelocity - 0.2).toFixed(1))) }, 'phaseVelocity');
  });
  document.getElementById('kx-vel-inc')?.addEventListener('click', () => {
    applyLocalCrdtDelta({ phaseVelocity: Math.min(3.2, Number((state.phaseVelocity + 0.2).toFixed(1))) }, 'phaseVelocity');
  });

  document.getElementById('kx-btn-peer-patch')?.addEventListener('click', simulateRemotePeerOp);
  document.getElementById('kx-btn-crdt-op')?.addEventListener('click', simulateRemotePeerOp);
  document.getElementById('kx-btn-r2-upload')?.addEventListener('click', simulateR2Upload);
  document.getElementById('kx-btn-commit-rev')?.addEventListener('click', commitPostgresRevision);
  document.getElementById('kx-btn-crdt-conflict')?.addEventListener('click', simulateConcurrentConflictMerge);

  canvas?.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height)));
    state.pointer = { x: nx, y: ny, active: true, vx: e.movementX || 0, vy: projectMomentum(e.movementY || 0) };
    if (reduced) drawShaderFrame();
  });

  const applyTheme = (mode) => {
    if (mode === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    drawShaderFrame();
  };

  document.getElementById('kx-theme-toggle')?.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data && event.data.type === 'velomesh-theme') {
      applyTheme(event.data.theme);
    }
  });

  if (typeof ResizeObserver !== 'undefined' && canvas) {
    new ResizeObserver(() => drawShaderFrame()).observe(canvas);
  }

  renderUI();
  if (reduced) {
    drawShaderFrame(0);
  } else {
    requestAnimationFrame(animate);
  }
});
