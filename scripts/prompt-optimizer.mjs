import { rankSkills } from './catalog.mjs';
import { assessVisionClarity, buildFullStackLayers, domainSignals } from './router.mjs';
import { selectModelForTurn } from './model-router.mjs';

const DOMAIN_CONSTRAINTS = {
  frontend: 'Enforce visual hierarchy, responsive breakpoints (desktop 1440px + mobile 390px), keyboard focus visibility, and semantic HTML.',
  design: 'Maintain WCAG AA contrast, >=12px functional text floor, prefers-reduced-motion media guard, and zero AI-slop gradient text or nested cards.',
  backend: 'Validate all payloads at API boundaries, enforce idempotency keys on webhooks, return structured JSON errors, and protect auth secrets.',
  security: 'Apply OWASP checks, verify webhook HMAC signatures on raw bytes, parameterize SQL, and prevent secret leakage.',
  testing: 'Author deterministic unit + integration assertions first, verify after edits, and inspect rendered desktop/mobile output.',
  performance: 'Minimize render blocking JS, use composite animations only, index hot SQL columns, and route verbose terminal checks via RTK.',
  architecture: 'Separate domain boundaries cleanly, document schema invariants, and verify cross-file integration contracts.',
  infrastructure: 'Use stateless edge/worker handlers, least-privilege IAM, and reversible database migrations.',
  research: 'Cite verified local file paths and authoritative docs before coding.',
  documentation: 'Keep technical copy concise, accurate, and anchored to inspected code.'
};

export function optimizePrompt(
  rawPrompt,
  {
    catalog = { skills: [], agents: [] },
    workspacePath = '',
    currentHost = 'antigravity',
    requestedModel = 'velomesh/auto',
    checkClis = false
  } = {}
) {
  const originalPrompt = String(rawPrompt || '').trim();
  if (!originalPrompt) {
    return {
      originalPrompt: '',
      optimizedPrompt: '',
      clarityScore: 0,
      upgradedScore: 0,
      domains: [],
      visionStatus: 'NEEDS_ELABORATION',
      clarifyingQuestions: [
        'What product or workflow do you want to build, and who are the primary users?',
        'What core actions, integrations, or data schema rules must exist on day one?',
        'What visual aesthetic or technical stack constraints should VeloMesh follow?'
      ],
      addedConstraints: [],
      matchedPlatformSkills: [],
      modelRoute: null
    };
  }

  const words = originalPrompt.split(/\s+/).filter(Boolean);
  const domains = domainSignals(originalPrompt);
  const vision = assessVisionClarity(originalPrompt);
  const matchedPlatformSkills = rankSkills(originalPrompt, catalog?.skills || [], { currentHost, limit: 6 });
  const modelRoute = selectModelForTurn({
    prompt: originalPrompt,
    requestedModel,
    checkClis,
    record: false
  });

  // Compute heuristic clarity score for the incoming prompt
  let clarityScore = Math.min(48, words.length * 2.5);
  clarityScore += Math.min(24, domains.length * 8);
  if (vision.status === 'READY_FOR_FULLSTACK_EXECUTION') clarityScore += 22;
  else if (vision.status === 'NOT_A_BUILD_PROMPT' && words.length >= 6) clarityScore += 18;
  clarityScore = Math.max(12, Math.min(96, Math.round(clarityScore)));

  const effectiveDomains = domains.length ? domains : ['architecture', 'testing'];
  const addedConstraints = effectiveDomains
    .map((d) => DOMAIN_CONSTRAINTS[d])
    .filter(Boolean);

  if (matchedPlatformSkills.some((s) => /rtk/i.test(s.name))) {
    addedConstraints.push('Route verbose shell inspection and test output through RTK compression to protect context budget.');
  }

  const clarifyingQuestions = [];
  if (vision.status === 'NEEDS_ELABORATION') {
    if (vision.missingDimensions.includes('target_audience_and_domain')) {
      clarifyingQuestions.push('Who are the primary users and what core domain problem does this solve?');
    }
    if (vision.missingDimensions.includes('core_workflows_and_features')) {
      clarifyingQuestions.push('What are the 2-3 core user workflows, API endpoints, or realtime data flows?');
    }
    if (vision.missingDimensions.includes('aesthetic_direction_or_stack')) {
      clarifyingQuestions.push('What visual direction (e.g. monochrome Swiss, editorial, high-density dashboard) and backend/DB stack do you prefer?');
    }
  }

  const layerBundle = buildFullStackLayers();
  const topSkillNames = matchedPlatformSkills.length
    ? matchedPlatformSkills.map((s) => `${s.name} [${s.hosts.slice(0, 3).join(',')}]`)
    : [...layerBundle.frontend_ui.slice(0, 2), ...layerBundle.backend_api.slice(0, 2)];

  const specLines = [
    `[VeloMesh Optimized Engineering Spec]`,
    `Objective: ${originalPrompt}`,
    `Platform Model Route: ${modelRoute.selectedModel} (phase=${modelRoute.phase}, transport=${modelRoute.transport}, tier=${modelRoute.antigravityTier})`,
    `Active Platform & Mesh Skills: ${topSkillNames.join('; ')}`,
    `Constraints:\n${addedConstraints.map((c, idx) => `  ${idx + 1}. ${c}`).join('\n')}`
  ];

  if (workspacePath) {
    specLines.push(`Workspace Scope: ${workspacePath}`);
  }
  if (clarifyingQuestions.length) {
    specLines.push(`Vision Gate (${vision.status}): Clarify before scaffolding:\n${clarifyingQuestions.map((q) => `  - ${q}`).join('\n')}`);
  } else {
    specLines.push('Verification Gate: Run unit/integration suites + desktop/mobile visual craft check with zero skipped assertions.');
  }

  const optimizedPrompt = specLines.join('\n');
  const upgradedScore = clarifyingQuestions.length
    ? Math.max(clarityScore + 28, 76)
    : Math.max(clarityScore + 18, 94);

  return {
    originalPrompt,
    optimizedPrompt,
    clarityScore,
    upgradedScore: Math.min(99, upgradedScore),
    domains: effectiveDomains,
    visionStatus: vision.status,
    clarifyingQuestions,
    addedConstraints,
    matchedPlatformSkills,
    modelRoute
  };
}
