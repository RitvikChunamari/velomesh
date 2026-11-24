// PulseLedger Interactive Demo — Multi-Tenant RLS, Damped-Spring Runway & Stripe HMAC Feed

const TENANTS = {
  kinetix: {
    uuid: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    name: 'Kinetix Labs Inc.',
    cashCents: 1420000000,
    accountSplit: 'Mercury Ops $4.2M · T-Bills $10.0M',
    grossBurnCents: 51000000,
    mrrCents: 12500000,
    entries: [
      { id: 'ent_kx_019', account: '4100-SAAS', memo: 'Stripe invoice.paid · Enterprise Cohort', time: '14:18 UTC', amountCents: 12500000 },
      { id: 'ent_kx_018', account: '6200-CLOUD', memo: 'Reserved GPU Compute Cluster', time: '11:42 UTC', amountCents: -6840000 },
      { id: 'ent_kx_017', account: '6100-PAY', memo: 'Bi-weekly Engineering Payroll', time: 'Yesterday', amountCents: -19400000 },
      { id: 'ent_kx_016', account: '4200-YIELD', memo: 'Treasury T-Bill Coupon Yield', time: 'Nov 16', amountCents: 4120000 }
    ]
  },
  aether: {
    uuid: '4c9f71c2-88a1-4f3d-b711-90a21e68f412',
    name: 'Aether Compute Systems',
    cashCents: 980000000,
    accountSplit: 'Brex Cash $3.3M · Money Market $6.5M',
    grossBurnCents: 46500000,
    mrrCents: 15500000,
    entries: [
      { id: 'ent_ae_044', account: '4100-SAAS', memo: 'Stripe invoice.paid · Inference Cluster', time: '13:04 UTC', amountCents: 15500000 },
      { id: 'ent_ae_043', account: '6200-INFRA', memo: 'Colocation Fiber Transit', time: '09:15 UTC', amountCents: -4100000 },
      { id: 'ent_ae_042', account: '6100-PAY', memo: 'Core Systems Engineering Payroll', time: 'Nov 17', amountCents: -18200000 }
    ]
  },
  veridian: {
    uuid: '7d2e108a-55c4-419e-82d0-119b4c772e09',
    name: 'Veridian Bio Instruments',
    cashCents: 540000000,
    accountSplit: 'SVB Treasury $2.4M · T-Bills $3.0M',
    grossBurnCents: 24000000,
    mrrCents: 4500000,
    entries: [
      { id: 'ent_vb_011', account: '4100-LIC', memo: 'Stripe invoice.paid · Diagnostics Lab', time: '12:51 UTC', amountCents: 4500000 },
      { id: 'ent_vb_010', account: '6300-LAB', memo: 'Wet-Lab Reagent & Assay Batch', time: 'Nov 17', amountCents: -5200000 },
      { id: 'ent_vb_009', account: '6100-PAY', memo: 'Clinical Bioinformatics Team', time: 'Nov 15', amountCents: -11600000 }
    ]
  }
};

const SCENARIOS = {
  base: { burnMult: 1.0, cashBoostCents: 0, mrrGrowth: 0.022 },
  hiring: { burnMult: 1.22, cashBoostCents: 0, mrrGrowth: 0.025 },
  bridge: { burnMult: 1.04, cashBoostCents: 800000000, mrrGrowth: 0.028 },
  contraction: { burnMult: 0.82, cashBoostCents: 0, mrrGrowth: 0.018 }
};

function formatUsdCompact(cents) {
  const abs = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatUsdFull(cents) {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${Math.round(Math.abs(cents) / 100).toLocaleString('en-US')}`;
}

function computeSeries(tenant, scenarioKey) {
  const sc = SCENARIOS[scenarioKey] || SCENARIOS.base;
  let cash = Math.max(0, tenant.cashCents + sc.cashBoostCents);
  let mrr = tenant.mrrCents;
  const grossBurn = tenant.grossBurnCents * sc.burnMult;
  const points = [];
  for (let m = 0; m < 36; m++) {
    points.push(cash / 100);
    mrr *= 1 + sc.mrrGrowth;
    cash = Math.max(0, cash - Math.max(0, grossBurn - mrr));
  }
  const initialNetBurn = Math.max(100000, grossBurn - tenant.mrrCents);
  const effectiveCash = Math.max(0, tenant.cashCents + sc.cashBoostCents);
  const runwayMonths = Math.min(99, effectiveCash / initialNetBurn);
  return { points, effectiveCash, grossBurn, mrr: tenant.mrrCents, netBurn: initialNetBurn, runwayMonths };
}

document.addEventListener('DOMContentLoaded', () => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activeTenantKey = 'kinetix';
  let activeScenarioKey = 'base';
  let hoverMonthIdx = 11;
  let eventCounter = 1;

  const canvas = document.getElementById('pl-runway-canvas');
  const ctx = canvas?.getContext('2d');

  // Critically damped spring state across 36 month points
  const initial = computeSeries(TENANTS[activeTenantKey], activeScenarioKey);
  const springPos = [...initial.points];
  const springVel = new Array(36).fill(0);
  let targetPos = [...initial.points];
  let rafId = 0;

  const cashEl = document.getElementById('pl-kpi-cash');
  const cashSubEl = document.getElementById('pl-kpi-cash-sub');
  const burnEl = document.getElementById('pl-kpi-burn');
  const burnSubEl = document.getElementById('pl-kpi-burn-sub');
  const runwayEl = document.getElementById('pl-kpi-runway');
  const runwaySubEl = document.getElementById('pl-kpi-runway-sub');
  const rlsEl = document.getElementById('pl-kpi-rls');
  const uuidEl = document.getElementById('pl-kpi-tenant-uuid');
  const sqlBannerEl = document.getElementById('pl-sql-banner');
  const ledgerBodyEl = document.getElementById('pl-ledger-body');
  const feedEl = document.getElementById('pl-webhook-feed');
  const scrubEl = document.getElementById('pl-scrub-readout');

  const webhookLogs = [
    { badge: '202 HMAC OK', text: 'invoice.paid (+$125,000) -> 9b1deb4d...3dcb6d' },
    { badge: 'RLS ENFORCED', text: 'SET LOCAL app.current_tenant_id verified on treasury_ledger_entries' }
  ];

  function getColors() {
    const cs = getComputedStyle(document.documentElement);
    const isLight = document.documentElement.dataset.theme === 'light';
    return {
      isLight,
      bg: cs.getPropertyValue('--bg-elevated').trim() || (isLight ? '#ffffff' : '#0d121b'),
      ink: cs.getPropertyValue('--ink').trim() || (isLight ? '#0f172a' : '#f4f6fb'),
      muted: cs.getPropertyValue('--ink-muted').trim() || (isLight ? '#526075' : '#8b95ad'),
      rule: cs.getPropertyValue('--rule').trim() || (isLight ? '#dce3ed' : '#1c2434'),
      accent: cs.getPropertyValue('--pl-accent').trim() || (isLight ? '#3d4dc7' : '#5263e8'),
      accentInk: cs.getPropertyValue('--pl-accent-ink').trim() || (isLight ? '#3544b5' : '#9aaaff'),
      pos: cs.getPropertyValue('--pl-pos').trim() || (isLight ? '#0d7a4e' : '#3ecf8e'),
      neg: cs.getPropertyValue('--pl-neg').trim() || (isLight ? '#945206' : '#eab364'),
      danger: cs.getPropertyValue('--pl-danger').trim() || (isLight ? '#be123c' : '#f27272')
    };
  }

  function renderMetricsAndLedger() {
    const t = TENANTS[activeTenantKey];
    const metrics = computeSeries(t, activeScenarioKey);
    targetPos = metrics.points;

    if (cashEl) cashEl.textContent = formatUsdFull(metrics.effectiveCash);
    if (cashSubEl) cashSubEl.textContent = t.accountSplit;
    if (burnEl) burnEl.textContent = `${formatUsdFull(-metrics.netBurn)}/mo`;
    if (burnSubEl) burnSubEl.textContent = `Gross ${formatUsdCompact(metrics.grossBurn)} · Stripe MRR +${formatUsdCompact(metrics.mrr)}`;
    if (runwayEl) runwayEl.textContent = `${metrics.runwayMonths.toFixed(1)} Months`;

    const horizonDate = new Date(2026, 10 + Math.round(metrics.runwayMonths), 1);
    const horizonLabel = horizonDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (runwaySubEl) runwaySubEl.textContent = `Zero-Cash Horizon: ${horizonLabel}`;
    if (uuidEl) uuidEl.textContent = `tenant_id: ${t.uuid}`;
    if (sqlBannerEl && !sqlBannerEl.classList.contains('is-blocked')) {
      sqlBannerEl.textContent = `SET LOCAL app.current_tenant_id = '${t.uuid}';`;
    }

    if (ledgerBodyEl) {
      ledgerBodyEl.innerHTML = t.entries
        .map((row) => {
          const isPositive = row.amountCents >= 0;
          const signAmount = isPositive ? `+${formatUsdFull(row.amountCents)}` : formatUsdFull(row.amountCents);
          const amtClass = isPositive ? 'pl-amt-pos' : 'pl-amt-neg';
          return `<tr><td>${row.id}</td><td>${row.account}</td><td>${row.memo}</td><td>${row.time}</td><td class="${amtClass}">${signAmount}</td></tr>`;
        })
        .join('');
    }

    if (feedEl) {
      feedEl.innerHTML = webhookLogs
        .slice(0, 6)
        .map((item) => {
          const isBlocked = item.badge.includes('403') || item.badge.includes('BLOCKED');
          return `<li class="pl-webhook-item"><span>${item.text}</span><span class="pl-webhook-badge${isBlocked ? ' is-blocked' : ''}">${item.badge}</span></li>`;
        })
        .join('');
    }

    if (reduced) {
      for (let i = 0; i < 36; i++) {
        springPos[i] = targetPos[i];
        springVel[i] = 0;
      }
      drawChart();
    } else if (!rafId) {
      rafId = requestAnimationFrame(tickSpring);
    }
  }

  function updateScrubText() {
    if (!scrubEl) return;
    const val = Math.round((springPos[hoverMonthIdx] || 0) * 100);
    scrubEl.textContent = `Scrub chart: M${String(hoverMonthIdx + 1).padStart(2, '0')} · ${formatUsdCompact(val)} projected`;
  }

  function drawChart() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(300, Math.floor(rect.width || 1120));
    const h = Math.max(200, Math.floor(rect.height || 300));
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = getColors();
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, w, h);

    const pad = { top: 28, right: 24, bottom: 32, left: 68 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const maxVal = Math.max(2000000, ...springPos, ...targetPos) * 1.08;
    const xAt = (i) => pad.left + (i / 35) * cw;
    const yAt = (v) => pad.top + ch - (Math.max(0, v) / maxVal) * ch;

    // Horizontal Swiss hairlines + axis scale
    ctx.strokeStyle = c.rule;
    ctx.lineWidth = 1;
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = c.muted;
    ctx.textBaseline = 'middle';

    for (let g = 0; g <= 4; g++) {
      const frac = g / 4;
      const y = Math.round(pad.top + frac * ch) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      const labelVal = maxVal * (1 - frac);
      ctx.fillText(`$${(labelVal / 1e6).toFixed(1)}M`, 10, y);
    }

    // Vertical month ticks (M01, M12, M24, M36)
    ctx.textBaseline = 'top';
    [0, 11, 23, 35].forEach((idx) => {
      const x = Math.round(xAt(idx)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, h - pad.bottom);
      ctx.stroke();
      ctx.fillText(`M${String(idx + 1).padStart(2, '0')}`, x - 10, h - pad.bottom + 8);
    });

    // Subtle Mercury Indigo gradient beneath projection curve
    ctx.beginPath();
    springPos.forEach((v, i) => {
      const x = xAt(i);
      const y = yAt(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(xAt(35), h - pad.bottom);
    ctx.lineTo(xAt(0), h - pad.bottom);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    grad.addColorStop(0, c.isLight ? 'rgba(61, 77, 199, 0.22)' : 'rgba(82, 99, 232, 0.28)');
    grad.addColorStop(1, c.isLight ? 'rgba(61, 77, 199, 0.01)' : 'rgba(82, 99, 232, 0.01)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Crisp Indigo spring trajectory curve
    ctx.beginPath();
    springPos.forEach((v, i) => {
      const x = xAt(i);
      const y = yAt(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Interactive scrub crosshair & Treasury Emerald active data point
    const hx = xAt(hoverMonthIdx);
    const hy = yAt(springPos[hoverMonthIdx] || 0);
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(hx, pad.top);
    ctx.lineTo(hx, h - pad.bottom);
    ctx.strokeStyle = c.pos;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = c.pos;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx, hy, 2, 0, Math.PI * 2);
    ctx.fillStyle = c.bg;
    ctx.fill();

    updateScrubText();
  }

  function tickSpring() {
    let settled = true;
    const stiffness = 0.085;
    const damping = 0.84;
    for (let i = 0; i < 36; i++) {
      const v = (springVel[i] + (targetPos[i] - springPos[i]) * stiffness) * damping;
      springVel[i] = v;
      springPos[i] += v;
      if (Math.abs(targetPos[i] - springPos[i]) > 1500 || Math.abs(v) > 500) {
        settled = false;
      }
    }
    drawChart();
    if (!settled) {
      rafId = requestAnimationFrame(tickSpring);
    } else {
      for (let i = 0; i < 36; i++) {
        springPos[i] = targetPos[i];
        springVel[i] = 0;
      }
      drawChart();
      rafId = 0;
    }
  }

  function simulateStripeWebhook(amountCents, memo, account = '4100-SAAS', eventType = 'invoice.paid') {
    const t = TENANTS[activeTenantKey];
    t.cashCents += amountCents;
    if (amountCents > 0) t.mrrCents += Math.round(amountCents * 0.2);
    const idNum = String(20 + eventCounter++).padStart(3, '0');
    t.entries.unshift({
      id: `ent_${activeTenantKey.slice(0, 2)}_${idNum}`,
      account,
      memo: `Stripe ${eventType} · ${memo}`,
      time: 'Just now',
      amountCents
    });
    if (rlsEl) {
      rlsEl.textContent = 'RLS ENFORCED · HMAC 202';
      rlsEl.classList.remove('is-blocked');
      rlsEl.classList.add('is-ok');
    }
    if (sqlBannerEl) sqlBannerEl.classList.remove('is-blocked');
    webhookLogs.unshift({
      badge: '202 HMAC OK',
      text: `${eventType} (${formatUsdCompact(amountCents)}) -> ${t.uuid.slice(0, 8)}...`
    });
    renderMetricsAndLedger();
  }

  function simulateCrossTenantRlsBlock() {
    const t = TENANTS[activeTenantKey];
    const targetOther = activeTenantKey === 'aether' ? TENANTS.kinetix : TENANTS.aether;
    if (rlsEl) {
      rlsEl.textContent = 'RLS BLOCKED (403 ISOLATED)';
      rlsEl.classList.remove('is-ok');
      rlsEl.classList.add('is-blocked');
    }
    if (sqlBannerEl) {
      sqlBannerEl.classList.add('is-blocked');
      sqlBannerEl.textContent = `ERROR: 42501 RLS policy violation blocked read from ${t.uuid.slice(0, 8)} to ${targetOther.uuid.slice(0, 8)};`;
    }
    webhookLogs.unshift({
      badge: '403 RLS BLOCKED',
      text: `Denied cross-tenant read from ${t.uuid.slice(0, 8)} to ${targetOther.uuid.slice(0, 8)}`
    });
    renderMetricsAndLedger();
  }

  document.querySelectorAll('[data-tenant]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTenantKey = btn.dataset.tenant || 'kinetix';
      document.querySelectorAll('[data-tenant]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      if (rlsEl) {
        rlsEl.textContent = 'RLS ENFORCED · HMAC 202';
        rlsEl.classList.remove('is-blocked');
        rlsEl.classList.add('is-ok');
      }
      if (sqlBannerEl) sqlBannerEl.classList.remove('is-blocked');
      renderMetricsAndLedger();
    });
  });

  document.querySelectorAll('[data-scenario]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeScenarioKey = btn.dataset.scenario || 'base';
      document.querySelectorAll('[data-scenario]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      renderMetricsAndLedger();
    });
  });

  document.getElementById('pl-fire-webhook-btn')?.addEventListener('click', () => {
    simulateStripeWebhook(4800000, 'Series-A Customer Expansion');
  });

  document.getElementById('pl-btn-invoice')?.addEventListener('click', () => {
    simulateStripeWebhook(4800000, 'Enterprise Annual Seat Renewal');
  });

  document.getElementById('pl-btn-debit')?.addEventListener('click', () => {
    simulateStripeWebhook(-3250000, 'Compute Settlement Payout', '6200-INFRA', 'infra.settlement');
  });

  document.getElementById('pl-btn-rls-attack')?.addEventListener('click', simulateCrossTenantRlsBlock);

  canvas?.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const padLeft = 68;
    const padRight = 24;
    const rel = (e.clientX - rect.left - padLeft) / Math.max(1, rect.width - padLeft - padRight);
    hoverMonthIdx = Math.max(0, Math.min(35, Math.round(rel * 35)));
    drawChart();
  });

  const applyTheme = (mode) => {
    if (mode === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    drawChart();
  };

  document.getElementById('pl-theme-toggle')?.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data && event.data.type === 'velomesh-theme') {
      applyTheme(event.data.theme);
    }
  });

  if (typeof ResizeObserver !== 'undefined' && canvas) {
    new ResizeObserver(() => drawChart()).observe(canvas);
  }

  renderMetricsAndLedger();
  drawChart();
});
