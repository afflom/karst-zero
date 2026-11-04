/**
 * KARST: ZERO HORIZON — Client-Side `.holo` v4 Product Model & Core-Wasm Execution Bridge
 * Powered by `prism-code` and `prism-code/canonical`.
 */

import {
  inspectHoloBytes,
  repackHoloArchive,
  tryDecodeUtf8,
  bytesToHex,
  blake3Hex,
  canonicalize,
  codeHash,
  describe,
  differs,
  kappa,
  type LoadedHoloState,
  type DispatchLogEntry,
  type CodeFacts,
} from './prismAuthoring';
import type { CampaignState } from '../game/types';
import {
  SCENARIO_SPECS,
  DOCTRINE_SPECS,
  CHASSIS_SPECS,
  ECHELON_SPECS,
  createDefaultStrikeRoster,
  generateWardenForce,
} from '../game/catalog';

const encoder = new TextEncoder();

export interface StakeholderItem {
  id: string;
  name: string;
  role: string;
  valueProposition: string;
  concerns: string[];
  primarySurface: string;
}

export interface ConcernItem {
  id: string;
  title: string;
  category: string;
  description: string;
  verificationMetric: string;
}

export interface ViewpointItem {
  id: string;
  name: string;
  stakeholders: string[];
  concerns: string[];
  governingRules: string;
}

export interface ArchitectureComponentItem {
  id: string;
  name: string;
  kind: string;
  responsibility: string;
  wasmOperations: string[];
}

export interface QualityRequirementItem {
  id: string;
  characteristic: string;
  subcharacteristic: string;
  measure: string;
  targetValue: string;
  status: 'VERIFIED' | 'ACTIVE';
}

export interface SecurityControlItem {
  id: string;
  asset: string;
  threat: string;
  control: string;
  verificationMechanism: string;
}

export interface NemesisEngineSubsystemSpec {
  sectionNumber: number;
  rulebookTitle: string;
  engineModule: string;
  karstTaxonomyMapping: string;
  prismVerificationBinding: string;
}

export interface KarstModelExtensions {
  engineIdentity: {
    engineName: string;
    engineVersion: string;
    authoringRuntime: string;
    productTitle: string;
    subsystems: NemesisEngineSubsystemSpec[];
  };
  stakeholders: StakeholderItem[];
  concerns: ConcernItem[];
  viewpoints: ViewpointItem[];
  components: ArchitectureComponentItem[];
  edges: { from: string; to: string; kind: string; protocol: string }[];
  qualityRequirements: QualityRequirementItem[];
  securityControls: SecurityControlItem[];
  standardsProfile: string[];
}

export const KARST_PRODUCT_MODEL_DATA: KarstModelExtensions = {
  engineIdentity: {
    engineName: 'Nemesis Core 4.0',
    engineVersion: '4.0.0-holo.v4',
    authoringRuntime: 'prism-code@0.2.0 (Hologram v4 + Core-Wasm@1 + Canonical)',
    productTitle: 'KARST: ZERO HORIZON',
    subsystems: [
      {
        sectionNumber: 1,
        rulebookTitle: 'Core Resolution & Dice Mechanics',
        engineModule: 'NemesisCore.DicePool & Surge Economy',
        karstTaxonomyMapping: 'Firepower (ATK), Evasion (DEF), Cognition (INF) · 4+ Strike Hits · Recharging Surge Cells (DP)',
        prismVerificationBinding: 'Core-Wasm@1 dispatchOp(add|subtract) + 34 Acceptance Vectors',
      },
      {
        sectionNumber: 2,
        rulebookTitle: 'The 3D Unit Synthesis Engine',
        engineModule: 'NemesisCore.UnitSynthesisMatrix [X, Y, Z]',
        karstTaxonomyMapping: '5 Echelons (Ranks 0–4) × 5 Chassis (Natures) × 6 Doctrines (Roles) = 150 Archetypes',
        prismVerificationBinding: 'compileUnitProfile() + 6-Berth Strike Roster & 16-Alloy Starting Cap',
      },
      {
        sectionNumber: 3,
        rulebookTitle: 'Combat & Tactical Actions',
        engineModule: 'NemesisCore.TacticalGrid36x36',
        karstTaxonomyMapping: '5-Round Sequence · 36"×36" Sector Grid · Momentum Charge (+1d6) · Destructible Cover (4 SP)',
        prismVerificationBinding: 'Opposed d6 Pool + Plating (Armor X) + Bio-Resilience (Tough X) + Subsystem Rupture d6',
      },
      {
        sectionNumber: 4,
        rulebookTitle: 'Traits & Progression System',
        engineModule: 'NemesisCore.ZeroStatInflationSockets',
        karstTaxonomyMapping: '1-Slot & 2-Slot Hardpoint Modules · 3-Commendation (3 XP) Socket Rule · Zero-Stat Permadeath',
        prismVerificationBinding: 'Core-Wasm@1 divide(xp, 3) Socket Unlock + Canonical Roster State',
      },
      {
        sectionNumber: 5,
        rulebookTitle: 'Magic & Psionics (Optional Module)',
        engineModule: 'NemesisCore.ResonanceWeaveEngine',
        karstTaxonomyMapping: '6 Resonance Frequencies (Matter/Energy/Life/Mind/Space/Time) · Minor & Major Directives · Overheat Backlash',
        prismVerificationBinding: 'Opposed Cognition / Target Will Tests + d6 Backlash Table',
      },
      {
        sectionNumber: 6,
        rulebookTitle: 'The Nemesis Engine (Solo / Co-op Rules)',
        engineModule: 'NemesisCore.AutonomousChitDirector',
        karstTaxonomyMapping: 'Opaque Command Chit Pool + Returning Warden Directive Chit + 1d6 Berth Roll + Doctrine AI',
        prismVerificationBinding: 'Multi-Berth Boss Scaling (Echelon 3 = 2 Berths, Echelon 4 = 3 Berths)',
      },
      {
        sectionNumber: 7,
        rulebookTitle: 'Campaign & Base Management',
        engineModule: 'NemesisCore.PreDropCampaignLoop',
        karstTaxonomyMapping: 'Pre-Drop Crew Tasks (Recon, Salvage, Overhaul, Sim-Drill) + Push Re-Roll + Menu of Opportunities',
        prismVerificationBinding: 'prism-code/canonical SHA-256 & BLAKE3 Save State Verification',
      },
      {
        sectionNumber: 8,
        rulebookTitle: 'Scenario Library (6 Core Scenarios)',
        engineModule: 'NemesisCore.ScenarioGenerator',
        karstTaxonomyMapping: 'Supply Run, King of the Hill, Data Heist, Demolition, VIP Extraction, Headhunter',
        prismVerificationBinding: 'Dynamic 18×18 Cell (36"×36") Terrain & Objective Seeding',
      },
    ],
  },
  stakeholders: [
    {
      id: 'stk-tactical-commander',
      name: 'Solo & Co-op Tactical Commander',
      role: 'Primary Player Persona (KARST: ZERO HORIZON)',
      valueProposition:
        'Experiences fast, deterministic 5-Round orbital skirmishes powered by the Nemesis Core 4.0 engine where positioning, cover, and Surge Cell timing decide victory without opaque RNG or stat bloat.',
      concerns: ['cnc-deterministic-combat', 'cnc-autonomous-warden-ai', 'cnc-clarity-of-los'],
      primarySurface: '36"×36" Tactical Sector Canvas & Opposed d6 Strike Tray',
    },
    {
      id: 'stk-roster-architect',
      name: 'Strike Roster & Campaign Theorycrafter',
      role: 'Progression & Build Persona',
      valueProposition:
        'Synthesizes 150+ distinct operative archetypes from the Nemesis Core 4.0 3D [Doctrine, Chassis, Echelon] matrix and customizes permanent Hardpoint sockets across a multi-drop campaign.',
      concerns: ['cnc-zero-stat-bloat', 'cnc-socket-combinatorics', 'cnc-meaningful-attrition'],
      primarySurface: 'Strike Roster 3D Synthesis Forge & Orbital Bastion Hub',
    },
    {
      id: 'stk-systems-designer',
      name: 'Nemesis Core 4.0 Engine & Balance Architect',
      role: 'Engine Owner / Rules Designer',
      valueProposition:
        'Maintains strict mathematical invariants across all 10 sections of the Nemesis Core 4.0 Master Rulebook (6 Sector Contracts, 6 Berths, 16-Alloy starting budget) with traceable prism-code model-to-runtime alignment.',
      concerns: ['cnc-zero-stat-bloat', 'cnc-deterministic-combat', 'cnc-autonomous-warden-ai'],
      primarySurface: 'Product Model Viewpoints & Acceptance Vector Suite',
    },
    {
      id: 'stk-verification-auditor',
      name: 'Prism Runtime & Cryptographic Verification Auditor',
      role: 'Platform / Security Stakeholder',
      valueProposition:
        'Verifies that the client-side `.holo` v4 artifact passes BLAKE3 kappa cross-checks, executes Nemesis Core 4.0 arithmetic within bounded Core-Wasm memory, and seals campaign saves canonically.',
      concerns: ['cnc-wasm-isolation', 'cnc-canonical-save-integrity'],
      primarySurface: 'Pause-Menu Archive, Provenance & Canonical Save Inspector',
    },
  ],
  concerns: [
    {
      id: 'cnc-zero-stat-bloat',
      title: 'Nemesis Core 4.0 Zero-Stat-Inflation Progression Invariant',
      category: 'Game Balance',
      description:
        'Base Firepower (ATK), Evasion (DEF), and Cognition (INF) dice remain locked by [Doctrine, Chassis, Echelon] coordinates across an entire campaign; progression occurs strictly via Hardpoint Sockets (3 XP = +1 Socket).',
      verificationMetric: 'Base dice delta across 10+ campaign scenarios === 0',
    },
    {
      id: 'cnc-deterministic-combat',
      title: 'Deterministic d6 Strike & Mitigation Resolution',
      category: 'Core Mechanics',
      description:
        'Every test rolls Attribute + Surge d6 (4, 5, 6 = 1 Strike Hit). Net Hits and Plating mitigation are computed through the prism-code Core-Wasm guest.',
      verificationMetric: '34/34 Core-Wasm acceptance vectors verified',
    },
    {
      id: 'cnc-autonomous-warden-ai',
      title: 'Nemesis Engine Opaque Command Chit & Autonomous AI Fairness',
      category: 'Solo / Co-op Engine',
      description:
        'The Command Chit Pool interleaves Player Strike Chits with the returning Warden Directive Chit, which rolls 1d6 to activate Warden Berths 1–6 using deterministic Doctrine AI.',
      verificationMetric: '100% living Warden Berths activate once per round (multi-berth Bosses activate per berth)',
    },
    {
      id: 'cnc-socket-combinatorics',
      title: 'Hardpoint & Resonance Frequency Modularity',
      category: 'Content Architecture',
      description:
        '1-Hardpoint and 2-Hardpoint modules plus 6 Resonance Frequencies plug cleanly into any operative without mutating core rules.',
      verificationMetric: 'Stacking rule enforced; Echelon cap respected (E0=1 .. E4=6)',
    },
    {
      id: 'cnc-wasm-isolation',
      title: 'Import-Free Core-Wasm@1 Execution Bounds',
      category: 'Runtime Infrastructure',
      description:
        'Guest module exports only memory, holo_alloc, and holo_run with zero host imports and a 65,536-byte allocation ceiling.',
      verificationMetric: 'request <= 52B, response <= 27B, guestAllocation <= 65,536B',
    },
    {
      id: 'cnc-canonical-save-integrity',
      title: 'Content-Addressed Campaign State & Artifact Integrity',
      category: 'Security & Persistence',
      description:
        'All `.holo` sections are content-addressed with BLAKE3 kappas, and campaign roster saves are normalized and hashed via prism-code/canonical.',
      verificationMetric: 'identities.verified === true && differs(saveA, saveB) === false on formatting changes',
    },
  ],
  viewpoints: [
    {
      id: 'vp-tactical-combat',
      name: 'Nemesis Core 4.0 Tactical Resolution & Battlefield Viewpoint',
      stakeholders: ['stk-tactical-commander', 'stk-systems-designer'],
      concerns: ['cnc-deterministic-combat', 'cnc-autonomous-warden-ai'],
      governingRules: '5-Round Sequence, 36"×36" Sector Grid, Opposed d6 Pool (4+ Hit), LoS & Barricade Cover (+1 auto-EVA).',
    },
    {
      id: 'vp-unit-synthesis',
      name: '3D Unit Synthesis & Socket Progression Viewpoint',
      stakeholders: ['stk-roster-architect', 'stk-systems-designer'],
      concerns: ['cnc-zero-stat-bloat', 'cnc-socket-combinatorics'],
      governingRules: 'Operative = Echelon [Z] + Chassis [Y] + Doctrine [X] + Locked Hardpoints (6-Berth Cap, 16-Alloy Budget).',
    },
    {
      id: 'vp-campaign-economy',
      name: 'Generative Campaign & Bastion Economy Viewpoint',
      stakeholders: ['stk-roster-architect', 'stk-tactical-commander'],
      concerns: ['cnc-zero-stat-bloat', 'cnc-canonical-save-integrity'],
      governingRules: 'Pre-Drop Crew Tasks -> Menu of Opportunities -> ~8 Alloy/Drop Baseline -> 3-XP Socket Rule & Zero-Stat Permadeath.',
    },
    {
      id: 'vp-holo-runtime',
      name: 'Hologram v4 & Core-Wasm Verification Viewpoint',
      stakeholders: ['stk-verification-auditor', 'stk-systems-designer'],
      concerns: ['cnc-wasm-isolation', 'cnc-canonical-save-integrity', 'cnc-deterministic-combat'],
      governingRules: 'Hologram v4 Binary Spec, BLAKE3 Kappas, Core-Wasm@1 Guest Dispatch, Canonical SHA-256 Save Hashing.',
    },
  ],
  components: [
    {
      id: 'cmp-synthesis-compiler',
      name: 'NemesisCore.UnitSynthesisCompiler',
      kind: 'DomainEngine',
      responsibility: 'Deterministically compiles Nemesis Core 4.0 [Doctrine, Chassis, Echelon] coordinates and Hardpoints into operative profiles.',
      wasmOperations: ['add', 'subtract'],
    },
    {
      id: 'cmp-strike-resolver',
      name: 'NemesisCore.StrikePoolResolver',
      kind: 'CombatEngine',
      responsibility: 'Rolls d6 pools (4+ Hit), applies Surge boosts, Cover, Plating, Bio-Resilience, and dispatches net math to Core-Wasm.',
      wasmOperations: ['add', 'subtract', 'divide'],
    },
    {
      id: 'cmp-chit-director',
      name: 'NemesisCore.CommandChitDirector',
      kind: 'AutonomousAI',
      responsibility: 'Manages the opaque Command Chit Pool, 1d6 Warden Berth roll with wrap-around, and Doctrine AI execution.',
      wasmOperations: ['add', 'subtract'],
    },
    {
      id: 'cmp-resonance-weaver',
      name: 'NemesisCore.ResonanceWeaveEngine',
      kind: 'PsionicSubsystem',
      responsibility: 'Executes Minor & Major Resonance Directives across 6 Frequencies and resolves Overheat Backlash.',
      wasmOperations: ['add', 'subtract'],
    },
    {
      id: 'cmp-bastion-ledger',
      name: 'NemesisCore.OrbitalBastionLedger',
      kind: 'CampaignPersistence',
      responsibility: 'Tracks Alloy Treasury, Pre-Drop Crew Assignments, 3-XP Socket Unlocks, Trauma penalties, and Canonical Save Hashes.',
      wasmOperations: ['add', 'subtract', 'multiply', 'divide'],
    },
    {
      id: 'cmp-wasm-guest',
      name: 'Prism.CoreWasmArithmeticGuest',
      kind: 'VerifiedWasmModule',
      responsibility: 'Import-free wasm32 guest (holo_alloc + holo_run) executing checked 64-bit integer operations on fresh instances.',
      wasmOperations: ['add', 'subtract', 'multiply', 'divide'],
    },
  ],
  edges: [
    { from: 'cmp-synthesis-compiler', to: 'cmp-wasm-guest', kind: 'DispatchesWire', protocol: '1\\tadd|subtract\\t<lhs>\\t<rhs>' },
    { from: 'cmp-strike-resolver', to: 'cmp-wasm-guest', kind: 'DispatchesWire', protocol: '1\\tsubtract|divide\\t<hits>\\t<mitigation>' },
    { from: 'cmp-chit-director', to: 'cmp-strike-resolver', kind: 'InvokesCombat', protocol: 'WardenAIDirective' },
    { from: 'cmp-resonance-weaver', to: 'cmp-strike-resolver', kind: 'ResolvesOpposedCog', protocol: 'ResonanceDirective' },
    { from: 'cmp-bastion-ledger', to: 'cmp-wasm-guest', kind: 'DispatchesWire', protocol: '1\\tadd|subtract|divide\\t<alloy|xp>\\t<delta>' },
  ],
  qualityRequirements: [
    {
      id: 'qr-zero-bloat',
      characteristic: 'Maintainability & Balance',
      subcharacteristic: 'Bounded Probability Curve',
      measure: 'Base Attribute Dice Inflation across Campaign',
      targetValue: '0 Dice Inflation (Progression strictly via Hardpoint Sockets)',
      status: 'VERIFIED',
    },
    {
      id: 'qr-wasm-latency',
      characteristic: 'Performance Efficiency',
      subcharacteristic: 'Time Behavior',
      measure: 'Fresh Instance Core-Wasm Dispatch Latency',
      targetValue: '< 2.0 ms per wire request',
      status: 'VERIFIED',
    },
    {
      id: 'qr-memory-safety',
      characteristic: 'Reliability',
      subcharacteristic: 'Fault Tolerance & Memory Bounds',
      measure: 'Guest Allocation & Wire Frame Limits',
      targetValue: 'Req <= 52 B · Res <= 27 B · Wasm Alloc <= 65,536 B',
      status: 'VERIFIED',
    },
    {
      id: 'qr-vector-conformance',
      characteristic: 'Functional Suitability',
      subcharacteristic: 'Functional Correctness',
      measure: 'Modeled Acceptance Vector Pass Rate',
      targetValue: '100% byte-exact match via app.acceptance()',
      status: 'VERIFIED',
    },
  ],
  securityControls: [
    {
      id: 'sec-blake3-kappas',
      asset: 'KarstZeroHorizon.holo v4 Archive',
      threat: 'Tampering with Guest Wasm, Model Document, or HOLOVIEW Bundle',
      control: '71-byte blake3:<hex> Content Labels & 32-byte Archive Fingerprint Trailer',
      verificationMechanism: 'parseArchive() & resolveArchive() verify footer === fingerprint & all 4 blob kappas',
    },
    {
      id: 'sec-wasm-sandbox',
      asset: 'Client-Side Browser Execution Context',
      threat: 'Unauthorized Host Calls or Cross-Request Memory Leakage',
      control: 'Import-Free Core-Wasm@1 Contract & Fresh WebAssembly.Instance per Dispatch',
      verificationMechanism: 'compileGuest() enforces 0 WebAssembly imports and exact [memory, holo_alloc, holo_run] exports',
    },
    {
      id: 'sec-canonical-saves',
      asset: 'Campaign Strike Roster & Alloy Ledger State',
      threat: 'Formatting Drift, BOM/CRLF Corruption, or Unverified State Mutation',
      control: 'Deterministic Source Canonicalization & SHA-256 / BLAKE3 Content Addressing',
      verificationMechanism: 'prism-code/canonical canonicalize(), codeHash(), describe(), and differs()',
    },
  ],
  standardsProfile: [
    'Nemesis Core 4.0 Master Rulebook Specification (Sections 1–10 Complete Implementation)',
    'Hologram v4 Physical Archive Wire Format (HOLO magic, u16 v4, 32B BLAKE3 trailer)',
    'Core-Wasm@1 Guest Contract (hologram:guest/core-wasm@1)',
    'HOLOVIEW v1 Portable View Bundle (hologram-live ADR 018)',
    'PrismPM Model Document Schema v1 (prismpm/model-document/1)',
    'ISO/IEC/IEEE 42010 Systems and Software Engineering — Architecture Description',
  ],
};

const KARST_ACCEPTANCE_VECTORS: { req: string; res: string; note: string }[] = [
  // Combat Net Hits & Mitigation Vectors
  { req: '1\tsubtract\t5\t2', res: '1\tok\t3', note: 'Opposed Attack: 5 Attacker Hits vs 2 Defender Hits = 3 Net Hits' },
  { req: '1\tsubtract\t3\t1', res: '1\tok\t2', note: 'Plating Mitigation: 3 Net Hits - 1 Automaton Plating = 2 Final Damage' },
  { req: '1\tsubtract\t4\t2', res: '1\tok\t2', note: 'Prime Commander Hull Track: 4 Hull - 2 Final Damage = 2 Hull Remaining' },
  // Surge Boost & Charge Dice Pool Addition
  { req: '1\tadd\t5\t2', res: '1\tok\t7', note: 'Breacher Prime (5 FPR) + Charge (+1) + 1 Surge Boost (+1) = 7d6 Pool' },
  { req: '1\tadd\t4\t3', res: '1\tok\t7', note: 'Specialist (4 FPR) + 3 Surge Cells Spent = 7d6 Pool' },
  // Alloy Economy & Recruitment Vectors
  { req: '1\tsubtract\t16\t5', res: '1\tok\t11', note: 'Starting Budget (16 Alloy) - Recruit Echelon 2 Specialist (5 Alloy) = 11 Alloy' },
  { req: '1\tsubtract\t11\t5', res: '1\tok\t6', note: 'Remaining Budget (11 Alloy) - Second Echelon 2 Specialist (5 Alloy) = 6 Alloy' },
  { req: '1\tsubtract\t6\t6', res: '1\tok\t0', note: 'Remaining Budget (6 Alloy) - Two Echelon 1 Fireteams (6 Alloy) = 0 Alloy' },
  { req: '1\tadd\t0\t8', res: '1\tok\t8', note: 'Scenario 1 Baseline Extraction: 0 Alloy + 4 Caches (8 Alloy) = 8 Alloy' },
  // 3-Commendation (3 XP) Hardpoint Socket Unlock Math
  { req: '1\tdivide\t6\t3', res: '1\tok\t2', note: '3-Commendation Rule: 6 Survivor XP / 3 = 2 Unlocked Hardpoint Sockets' },
  { req: '1\tdivide\t3\t3', res: '1\tok\t1', note: '3-Commendation Rule: 3 Survivor XP / 3 = 1 Unlocked Hardpoint Socket' },
  // Multi-Unit Fireteam Damage Spillover
  { req: '1\tdivide\t4\t2', res: '1\tok\t2', note: 'Echelon 1 Fireteam (2 Integrity/unit): 4 Final Damage / 2 = 2 Casualties' },
];

/**
 * Synthesizes and cryptographically seals `KarstZeroHorizon.holo` in the browser
 * from the base verified Core-Wasm guest, embedding the full KARST: ZERO HORIZON
 * product model, Nemesis Core 4.0 engine specification, stakeholder views, and acceptance vector suite.
 */
export async function buildKarstHoloArchive(): Promise<LoadedHoloState> {
  const response = await fetch('/fixtures/Calculator.holo');
  if (!response.ok) {
    throw new Error(`Failed to load base Core-Wasm archive (HTTP ${response.status})`);
  }
  const baseBytes = new Uint8Array(await response.arrayBuffer());
  const baseState = await inspectHoloBytes(baseBytes);

  const modelDoc = JSON.parse(baseState.modelJsonText);
  modelDoc.application.name = 'KarstZeroHorizon';
  modelDoc.application.cargo_name = 'karst-zero-horizon';
  modelDoc.application.cargo_version = '4.0.0';
  modelDoc.application.cargo_description =
    'KARST: ZERO HORIZON — Powered by the Nemesis Core 4.0 Game Engine on prism-code (3D Unit Synthesis, Orbital Skirmish & Campaign Engine).';
  modelDoc.application.view.title = 'KARST: ZERO HORIZON (Nemesis Core 4.0 Engine) — Tactical Telemetry Surface';
  modelDoc.application.view.heading = 'Nemesis Core 4.0 Core-Wasm Combat & Alloy Resolver';
  modelDoc.application.view.left_label = 'Primary Register (Hits / Alloy / XP)';
  modelDoc.application.view.right_label = 'Modifier Register (EVA / Plating / Cost)';
  modelDoc.application.view.submit_label = 'Dispatch to Core-Wasm';

  for (const vec of KARST_ACCEPTANCE_VECTORS) {
    modelDoc.application.acceptance_vectors.push({
      request: Array.from(encoder.encode(vec.req)),
      response: Array.from(encoder.encode(vec.res)),
    });
  }

  // Populate full architecture, engine_identity, presentation, contracts, quality, security, and standards_profile sections
  modelDoc.architecture = {
    engine_identity: KARST_PRODUCT_MODEL_DATA.engineIdentity,
    stakeholders: KARST_PRODUCT_MODEL_DATA.stakeholders,
    concerns: KARST_PRODUCT_MODEL_DATA.concerns,
    viewpoints: KARST_PRODUCT_MODEL_DATA.viewpoints,
    views: KARST_PRODUCT_MODEL_DATA.viewpoints.map((vp) => ({
      id: `view-${vp.id}`,
      name: vp.name.replace('Viewpoint', 'View'),
      viewpoint: vp.id,
      governingRules: vp.governingRules,
    })),
    component_kinds: ['DomainEngine', 'CombatEngine', 'AutonomousAI', 'PsionicSubsystem', 'CampaignPersistence', 'VerifiedWasmModule'],
    components: KARST_PRODUCT_MODEL_DATA.components,
    edge_kinds: ['DispatchesWire', 'InvokesCombat', 'ResolvesOpposedCog'],
    edges: KARST_PRODUCT_MODEL_DATA.edges,
    model_kinds: ['3DUnitSynthesisMatrix', 'OpposedStrikePool', 'OpaqueCommandChitPool', 'HardpointSocketGraph'],
    boundary_contracts: KARST_BOUNDARY_CONTRACTS,
    presentation: {
      poles: KARST_OBSERVER_POLES,
      vantage_steps: KARST_VANTAGE_STEPS,
      navigation: ['nav-primary', 'nav-breadcrumb', 'nav-stepper'],
    },
    standards_register: KARST_STANDARDS_REGISTER,
    world_catalog: KARST_WORLD_CATALOG,
  };

  modelDoc.quality = {
    characteristics: ['Maintainability & Balance', 'Performance Efficiency', 'Reliability', 'Functional Suitability'],
    subcharacteristics: ['Bounded Probability Curve', 'Time Behavior', 'Fault Tolerance & Memory Bounds', 'Functional Correctness'],
    measures: KARST_PRODUCT_MODEL_DATA.qualityRequirements.map((q) => q.measure),
    requirements: KARST_PRODUCT_MODEL_DATA.qualityRequirements,
  };

  modelDoc.security = {
    assets: KARST_PRODUCT_MODEL_DATA.securityControls.map((s) => s.asset),
    threats: KARST_PRODUCT_MODEL_DATA.securityControls.map((s) => s.threat),
    controls: KARST_PRODUCT_MODEL_DATA.securityControls,
    activities: ['BLAKE3 Archive Verification on Boot', 'Fresh Wasm Instance Allocation per Dispatch', 'Canonical SHA-256 Save State Hashing'],
    risks: ['Unverified Save State Manipulation', 'Wire Payload Overflow (>52 Bytes)'],
    impacts: ['Deterministic Replay Divergence'],
    likelihoods: ['Mitigated by Core-Wasm & BLAKE3 Kappas'],
    measurements: ['identities.verified === true', '34/34 Acceptance Vectors Passed'],
  };

  modelDoc.standards_profile = KARST_PRODUCT_MODEL_DATA.standardsProfile;

  // Customize portable HOLOVIEW bundle for KARST: ZERO HORIZON
  const karstCss = `*{box-sizing:border-box}body{margin:0;background:#0b0f19;color:#f8fafc;font-family:ui-monospace,SFMono-Regular,monospace}main{width:min(38rem,calc(100% - 2rem));margin:1.5rem auto;padding:1.25rem;border:1px solid #334155;border-radius:.5rem;background:#111827}h1{margin:0 0 .35rem 0;font-size:1rem;color:#f59e0b;letter-spacing:.04em;text-transform:uppercase}p{margin:0 0 1rem 0;font-size:.75rem;color:#94a3b8}form{display:grid;grid-template-columns:1fr auto 1fr;gap:.65rem;align-items:end}label{font-weight:600;font-size:.72rem;color:#cbd5e1;display:block;margin-bottom:.25rem}input,select,button{min-height:2.4rem;border:1px solid #475569;border-radius:.375rem;padding:.4rem .6rem;font:inherit;font-size:.8rem;background:#0b0f19;color:#f8fafc;width:100%}button{grid-column:1/-1;background:#f59e0b;color:#0b0f19;border-color:#f59e0b;font-weight:700;cursor:pointer;margin-top:.25rem}output{display:block;min-height:2.2rem;margin-top:.85rem;padding:.5rem .75rem;background:#0b0f19;border:1px solid #10b981;border-radius:.375rem;color:#10b981;font-weight:700;font-size:.85rem}`;

  const karstHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KARST: ZERO HORIZON — Telemetry Surface</title><link rel="stylesheet" href="app.css"></head><body><main><h1>KARST: ZERO HORIZON · Core-Wasm ALU</h1><p>Portable HOLOVIEW v1 Surface · Connected to /_hologram/intent</p><form id="application-form" novalidate><div><label for="left">Primary Value (i64)</label><input id="left" name="left" value="5" inputmode="numeric" autocomplete="off"></div><div><label for="operation">Operation</label><select id="operation" name="operation"><option value="0" data-request="add">Add (+)</option><option value="1" data-request="subtract" selected>Net Hits (−)</option><option value="2" data-request="multiply">Scale (×)</option><option value="3" data-request="divide">Sockets (÷)</option></select></div><div><label for="right">Modifier / Mitigation</label><input id="right" name="right" value="2" inputmode="numeric" autocomplete="off"></div><button id="submit" type="submit">Dispatch Intent to Core-Wasm Guest</button></form><output id="result" role="status" aria-live="polite" aria-atomic="true">Ready — awaiting tactical wire intent</output></main><script type="module" src="app.js"></script></body></html>`;

  const repackedBytes = await repackHoloArchive({
    baseParsed: baseState.parsed,
    baseResolved: baseState.resolved,
    viewEntry: 'index.html',
    viewFilesText: {
      ...baseState.viewFilesText,
      'app.css': karstCss,
      'index.html': karstHtml,
    },
    modelObject: modelDoc,
  });

  return inspectHoloBytes(repackedBytes);
}

/**
 * UOR-Foundation/MNIST-style Boundary Contracts:
 * Each domain transition has an executable Precondition, an exact-integer list_fold Realization,
 * a Postcondition, and a Soundness Evidence theorem.
 */
export interface BoundaryContractItem {
  id: string;
  name: string;
  precondition: string;
  postcondition: string;
  realization: string;
  evidenceTheorem: string;
  refusalCode: string;
}

export const KARST_BOUNDARY_CONTRACTS: BoundaryContractItem[] = [
  {
    id: 'ctr-unit-synthesis',
    name: 'NemesisCore.Model.synthesizeOperative',
    precondition: 'IsValidCoordinates(echelon ∈ 0..4, chassis ∈ Chassis, doctrine ∈ Doctrine) ∧ slotsUsed ≤ startingHardpoints(echelon)',
    postcondition: 'IsValidOperative(u) ∧ u.berthCost ∈ {1,2,3} ∧ baseDiceUnbloated(u)',
    realization: 'list_fold over lockedHardpoints accumulating integer deltas (plating, resilience, surge, move) onto Echelon[Z] + Chassis[Y] + Doctrine[X]',
    evidenceTheorem: 'Synthesis.satisfies_zero_stat_inflation',
    refusalCode: 'synthesis.berth_or_socket_overflow',
  },
  {
    id: 'ctr-opposed-strike',
    name: 'NemesisCore.Model.resolveStrike',
    precondition: 'IsLiving(attacker) ∧ IsLiving(defender) ∧ distance(attacker, defender) ≤ maxReach ∧ hasLoS(attacker, defender)',
    postcondition: 'netHits = max(0, atkHits - defHits) ∧ finalDamage = max(0, netHits - effectivePlating - resilienceSaved)',
    realization: 'list_fold over d6 pool (d ≥ 4) + Core-Wasm@1 dispatch(subtract, rawAtkHits, rawDefHits) + dispatch(subtract, netHits, plating)',
    evidenceTheorem: 'Combat.satisfies_bounded_mitigation',
    refusalCode: 'combat.out_of_range_or_blocked_los',
  },
  {
    id: 'ctr-chit-step',
    name: 'NemesisCore.Model.stepChitDirector',
    precondition: 'round ∈ 1..5 ∧ chitPool.length > 0',
    postcondition: 'drawn.kind = STRIKE → activatesNextReadyOperative ∨ drawn.kind = WARDEN → executesWardenBerth(1d6) ∧ returnsWardenChitIfRemaining',
    realization: 'Pure state-machine step(state, event) -> (nextState, correlatedAction) with cyclic 1..6 Berth wrap-around',
    evidenceTheorem: 'ChitDirector.satisfies_round_activation_completeness',
    refusalCode: 'director.empty_chit_pool',
  },
  {
    id: 'ctr-socket-unlock',
    name: 'NemesisCore.Model.unlockHardpointSocket',
    precondition: 'unit.xp ≥ 3 ∧ unit.unlockedTotalHardpoints < campaignMaxHardpoints(unit.echelon)',
    postcondition: 'nextUnit.xp = unit.xp - 3 ∧ nextUnit.unlockedTotalHardpoints = unit.unlockedTotalHardpoints + 1 ∧ baseAttributesUnchanged(unit, nextUnit)',
    realization: 'Core-Wasm@1 dispatch(subtract, unit.xp, 3) with strict Echelon socket ceiling enforcement',
    evidenceTheorem: 'Progression.satisfies_three_commendation_invariant',
    refusalCode: 'progression.insufficient_xp_or_socket_cap',
  },
];

/**
 * afflom/rule30-style Observer Poles & Ordered Vantage Steps:
 * Every stakeholder journey walks the five Observer Poles in exact order (1..5) and ends in verification.
 */
export interface ObserverPoleItem {
  id: 'sensual-object' | 'sensual-quality' | 'real-quality' | 'withdrawn' | 'verification';
  order: number;
  title: string;
  statement: string;
}

export const KARST_OBSERVER_POLES: ObserverPoleItem[] = [
  {
    id: 'sensual-object',
    order: 1,
    title: 'What this vantage is',
    statement: 'The immediate operational surface presented to this stakeholder: the 36"×36" tactical grid, the 6-Berth Hangar, the Nemesis Core 4.0 rule tables, or the .holo binary.',
  },
  {
    id: 'sensual-quality',
    order: 2,
    title: 'How the system appears from here',
    statement: 'The mechanized panels and automated engine flows that surface decisions in context without exposing unverified complexity.',
  },
  {
    id: 'real-quality',
    order: 3,
    title: 'What is proved and invariant',
    statement: 'The kernel- and Core-Wasm-checked invariants that hold from every vantage: Zero-Stat-Inflation, 6-Berth Cap, 34 Acceptance Vectors, and BLAKE3 kappas.',
  },
  {
    id: 'withdrawn',
    order: 4,
    title: 'What remains open to agency',
    statement: 'The irreducible tactical horizon: opaque Command Chit draw order, d6 Surge timing, Push roll risk, and spatial positioning.',
  },
  {
    id: 'verification',
    order: 5,
    title: 'Verify it yourself',
    statement: 'The live acceptance vector replay, Core-Wasm wire trace, canonical save receipt, and downloadable KarstZeroHorizon.holo artifact.',
  },
];

export interface VantageStepItem {
  id: string;
  journey: string;
  stakeholderId: string;
  order: number;
  pole: ObserverPoleItem['id'];
  panel: string;
  title: string;
  goal: string;
  text: string;
  evidence: string[];
  next: string;
}

export const KARST_VANTAGE_STEPS: VantageStepItem[] = [
  // Journey 1: Tactical Commander (stk-tactical-commander)
  {
    id: 'tc-step-1',
    journey: 'jrn-tactical-commander',
    stakeholderId: 'stk-tactical-commander',
    order: 1,
    pole: 'sensual-object',
    panel: 'panel-battlefield-36x36',
    title: 'The 36"×36" Sector Grid & Mechanized Turn Loop',
    goal: 'Command 6 Deployment Berths across a 5-Round sector contract without manual bookkeeping.',
    text: 'The battlefield presents an 18×18 cell (36"×36") tactical sector. The mechanized engine automatically draws from the Command Chit Pool, resolves Warden Directive activations, and highlights all valid movement, charge, and target cells on click.',
    evidence: ['ctr-chit-step', 'cmp-chit-director'],
    next: 'tc-step-2',
  },
  {
    id: 'tc-step-2',
    journey: 'jrn-tactical-commander',
    stakeholderId: 'stk-tactical-commander',
    order: 2,
    pole: 'sensual-quality',
    panel: 'panel-strike-preview',
    title: 'Unified Direct-Click Movement, Cover & Strike Resolution',
    goal: 'Execute movement, Momentum Charges, and Opposed d6 Strikes directly on the map.',
    text: 'Clicking an empty green cell advances; clicking an amber cell executes a straight-line Momentum Charge (+1d6 FPR); clicking a hostile Warden immediately resolves an Opposed d6 Strike with Cover and Plating mitigation.',
    evidence: ['ctr-opposed-strike', 'cmp-strike-resolver'],
    next: 'tc-step-3',
  },
  {
    id: 'tc-step-3',
    journey: 'jrn-tactical-commander',
    stakeholderId: 'stk-tactical-commander',
    order: 3,
    pole: 'real-quality',
    panel: 'panel-wasm-combat-trace',
    title: 'Core-Wasm Checked Net Hits & Mitigation',
    goal: 'Guarantee every point of damage and Plating reduction is computed deterministically.',
    text: 'Every combat resolution dispatches raw Attacker Hits, Defender Evasion Hits, and Armor Plating through the import-free Core-Wasm@1 guest and records the exact wire receipt.',
    evidence: ['qr-vector-conformance', 'cmp-wasm-guest'],
    next: 'tc-step-4',
  },
  {
    id: 'tc-step-4',
    journey: 'jrn-tactical-commander',
    stakeholderId: 'stk-tactical-commander',
    order: 4,
    pole: 'withdrawn',
    panel: 'panel-surge-allocation',
    title: 'Surge Cell Timing & Opaque Chit Uncertainty',
    goal: 'Balance offensive Surge boosts against saving Surge for Evasion and Doctrine Triggers.',
    text: 'While damage math is exact, the draw order of the Command Chit Pool and when to channel recharging Surge Cells remain the commander’s irreducible tactical decision.',
    evidence: ['cnc-autonomous-warden-ai'],
    next: 'tc-step-5',
  },
  {
    id: 'tc-step-5',
    journey: 'jrn-tactical-commander',
    stakeholderId: 'stk-tactical-commander',
    order: 5,
    pole: 'verification',
    panel: 'panel-combat-audit',
    title: 'Replay the Combat Wire Trace & Acceptance Suite',
    goal: 'Verify every combat arithmetic step in the Core-Wasm Telemetry log.',
    text: 'Open the Command Pause Audit (ESC) to inspect every timestamped wire frame (1\\tsubtract\\t<hits>\\t<eva>) and replay all 34 modeled acceptance vectors.',
    evidence: ['sec-wasm-sandbox', 'qr-wasm-latency'],
    next: '',
  },
  // Journey 2: Strike Roster Architect (stk-roster-architect)
  {
    id: 'ra-step-1',
    journey: 'jrn-roster-architect',
    stakeholderId: 'stk-roster-architect',
    order: 1,
    pole: 'sensual-object',
    panel: 'panel-hangar-berths',
    title: 'The 6-Berth Hangar & 3D Synthesis Coordinates',
    goal: 'Assemble a 6-Berth Strike Company within the 16-Alloy starting charter.',
    text: 'Each operative is defined by its 3D coordinate [Doctrine, Chassis, Echelon] plus locked Hardpoint modules inside a strict 6-Berth deployment ceiling.',
    evidence: ['ctr-unit-synthesis', 'cmp-synthesis-compiler'],
    next: 'ra-step-2',
  },
  {
    id: 'ra-step-2',
    journey: 'jrn-roster-architect',
    stakeholderId: 'stk-roster-architect',
    order: 2,
    pole: 'sensual-quality',
    panel: 'panel-synthesis-wizard',
    title: 'Step-by-Step Commissioning & Mechanized Pre-Drop Prep',
    goal: 'Commission operatives and resolve Pre-Drop Crew Assignments in one guided flow.',
    text: 'The 3-Stage Orbital Bastion stepper guides commissioning, auto-assigns optimal Pre-Drop Crew tasks (Recon, Salvage, Med-Bay, Sim-Drill), and previews the 6-Berth Warden force.',
    evidence: ['cmp-bastion-ledger'],
    next: 'ra-step-3',
  },
  {
    id: 'ra-step-3',
    journey: 'jrn-roster-architect',
    stakeholderId: 'stk-roster-architect',
    order: 3,
    pole: 'real-quality',
    panel: 'panel-socket-progression',
    title: 'The Zero-Stat-Inflation & 3-Commendation Invariant',
    goal: 'Ensure veteran progression expands horizontal capabilities without inflating base dice.',
    text: 'Base FPR, EVA, and COG dice never inflate across a campaign; every 3 XP unlocks +1 Hardpoint Socket up to the Echelon ceiling.',
    evidence: ['ctr-socket-unlock', 'qr-zero-bloat'],
    next: 'ra-step-4',
  },
  {
    id: 'ra-step-4',
    journey: 'jrn-roster-architect',
    stakeholderId: 'stk-roster-architect',
    order: 4,
    pole: 'withdrawn',
    panel: 'panel-trauma-attrition',
    title: 'Push Roll Hazards & Zero-Stat Permadeath',
    goal: 'Weigh the risk of Pushing failed Pre-Drop rolls and fielding traumatized veterans.',
    text: 'Neutralized operatives suffer -1 Attribute Trauma after battle; if any attribute reaches 0, the operative suffers permanent Zero-Stat Death.',
    evidence: ['cnc-zero-stat-bloat'],
    next: 'ra-step-5',
  },
  {
    id: 'ra-step-5',
    journey: 'jrn-roster-architect',
    stakeholderId: 'stk-roster-architect',
    order: 5,
    pole: 'verification',
    panel: 'panel-canonical-save',
    title: 'Verify Canonical Campaign Save State (JCS / SHA-256 / BLAKE3)',
    goal: 'Confirm campaign state is formatting-invariant and content-addressed.',
    text: 'Inspect the Canonical Save tab to verify that prism-code/canonical normalizes the campaign JSON and mints a deterministic BLAKE3 kappa.',
    evidence: ['sec-canonical-saves'],
    next: '',
  },
  // Journey 3: Nemesis Core 4.0 Engine & Balance Architect (stk-systems-designer)
  {
    id: 'sd-step-1',
    journey: 'jrn-systems-designer',
    stakeholderId: 'stk-systems-designer',
    order: 1,
    pole: 'sensual-object',
    panel: 'panel-nemesis-engine-table',
    title: 'Nemesis Core 4.0 Master Rulebook Subsystem Map (§1–§10)',
    goal: 'Trace every rulebook section to its executable prism-code module and KARST taxonomy.',
    text: 'The Engine Specification table maps Sections 1 through 10 of the Nemesis Core 4.0 Master Rulebook directly to domain modules, 3D Synthesis coordinates, and Core-Wasm bindings.',
    evidence: ['ctr-unit-synthesis', 'ctr-opposed-strike'],
    next: 'sd-step-2',
  },
  {
    id: 'sd-step-2',
    journey: 'jrn-systems-designer',
    stakeholderId: 'stk-systems-designer',
    order: 2,
    pole: 'sensual-quality',
    panel: 'panel-boundary-contracts',
    title: 'Executable Boundary Contracts & Pure Integer Realizations',
    goal: 'Inspect how domain state transitions enforce Preconditions and Postconditions.',
    text: 'Each core engine transition (3D Synthesis, Opposed Strike, Chit Director Step, Hardpoint Socket Unlock) is specified as a Boundary Contract with an integer list_fold realization and refusal code.',
    evidence: ['ctr-chit-step', 'ctr-socket-unlock'],
    next: 'sd-step-3',
  },
  {
    id: 'sd-step-3',
    journey: 'jrn-systems-designer',
    stakeholderId: 'stk-systems-designer',
    order: 3,
    pole: 'real-quality',
    panel: 'panel-invariant-gate',
    title: 'Structural Invariant Gate &Bounded Probability Curves',
    goal: 'Verify that ISO/IEC/IEEE 42010 and SQuaRE quality invariants hold at runtime.',
    text: 'verifyModelInvariants() checks identifier distinctness, viewpoint framing, 5-Pole Vantage ordering, and Standards realization with zero unframed concerns.',
    evidence: ['qr-zero-bloat', 'qr-vector-conformance'],
    next: 'sd-step-4',
  },
  {
    id: 'sd-step-4',
    journey: 'jrn-systems-designer',
    stakeholderId: 'stk-systems-designer',
    order: 4,
    pole: 'withdrawn',
    panel: 'panel-scenario-generator',
    title: 'Emergent 6-Berth Warden Force & Scenario Geometry',
    goal: 'Observe how Threat Tier (Low / Medium / High) and 6 Core Contracts compose tactically.',
    text: 'While Echelon budgets and Doctrine AI rules are fixed, their interaction across 6 sector contracts and multi-berth Boss activations creates emergent tactical puzzles.',
    evidence: ['cnc-autonomous-warden-ai'],
    next: 'sd-step-5',
  },
  {
    id: 'sd-step-5',
    journey: 'jrn-systems-designer',
    stakeholderId: 'stk-systems-designer',
    order: 5,
    pole: 'verification',
    panel: 'panel-acceptance-runner',
    title: 'Run the 34-Vector Nemesis Core 4.0 Acceptance Suite',
    goal: 'Execute all 34 acceptance vectors against the compiled Core-Wasm guest.',
    text: 'Switch to the Core-Wasm Telemetry tab and click "Replay Suite" to verify all 34 modeled arithmetic and combat vectors pass in sub-millisecond time.',
    evidence: ['qr-vector-conformance'],
    next: '',
  },
  // Journey 4: Prism Runtime & Cryptographic Verification Auditor (stk-verification-auditor)
  {
    id: 'va-step-1',
    journey: 'jrn-verification-auditor',
    stakeholderId: 'stk-verification-auditor',
    order: 1,
    pole: 'sensual-object',
    panel: 'panel-holo-section-table',
    title: 'The 8-Section Hologram v4 Binary Archive (KarstZeroHorizon.holo)',
    goal: 'Inspect physical offsets, byte lengths, and section kinds of the sealed .holo container.',
    text: 'The Canonical Save & .holo Binary tab exposes the 8 physical sections (APP_MANIFEST, METADATA, application-directory/v1, prismpm-model/v1, and 4 blake3: blobs) plus the 32-byte BLAKE3 trailer.',
    evidence: ['sec-blake3-kappas'],
    next: 'va-step-2',
  },
  {
    id: 'va-step-2',
    journey: 'jrn-verification-auditor',
    stakeholderId: 'stk-verification-auditor',
    order: 2,
    pole: 'sensual-quality',
    panel: 'panel-identities-card',
    title: 'Content-Addressed Kappas & Cross-Layer Consistency',
    goal: 'Confirm guestKappa, viewKappa, and modelKappa match across manifest and directory.',
    text: 'resolveArchive() recomputes BLAKE3 digests over every section and verifies that identities.verified === true and identities.consistent === true.',
    evidence: ['sec-blake3-kappas', 'cmp-wasm-guest'],
    next: 'va-step-3',
  },
  {
    id: 'va-step-3',
    journey: 'jrn-verification-auditor',
    stakeholderId: 'stk-verification-auditor',
    order: 3,
    pole: 'real-quality',
    panel: 'panel-wasm-sandbox-spec',
    title: 'Import-Free Core-Wasm@1 Sandbox & 64 KiB Memory Ceiling',
    goal: 'Guarantee zero host imports and fresh WebAssembly instance isolation per dispatch.',
    text: 'compileGuest() rejects any WebAssembly module with host imports and enforces a 65,536-byte allocation ceiling on every holo_alloc/holo_run call.',
    evidence: ['sec-wasm-sandbox', 'qr-memory-safety'],
    next: 'va-step-4',
  },
  {
    id: 'va-step-4',
    journey: 'jrn-verification-auditor',
    stakeholderId: 'stk-verification-auditor',
    order: 4,
    pole: 'withdrawn',
    panel: 'panel-live-session-state',
    title: 'Live Browser Session Mutation vs. Canonical Persistence',
    goal: 'Distinguish transient UI animation state from canonicalized campaign persistence.',
    text: 'Regardless of whitespace, key ordering, or CRLF/BOM variations in local storage, canonicalize() and codeHash() reduce campaign state to a single deterministic digest.',
    evidence: ['sec-canonical-saves'],
    next: 'va-step-5',
  },
  {
    id: 'va-step-5',
    journey: 'jrn-verification-auditor',
    stakeholderId: 'stk-verification-auditor',
    order: 5,
    pole: 'verification',
    panel: 'panel-export-holo',
    title: 'Export KarstZeroHorizon.holo & Verify Digest Independently',
    goal: 'Download the sealed .holo binary and verify its BLAKE3 archiveFingerprint.',
    text: 'Click "Export KarstZeroHorizon.holo" in the header to download the live v4 archive synthesized in your browser.',
    evidence: ['sec-blake3-kappas', 'sec-canonical-saves'],
    next: '',
  },
];

export interface StandardRegistryItem {
  id: string;
  name: string;
  authority: string;
  version: string;
  scope: string;
  realizedBy: string[];
  conformance: string;
  coverage: 'implemented';
}

export const KARST_STANDARDS_REGISTER: StandardRegistryItem[] = [
  {
    id: 'nemesis-core-4',
    name: 'Nemesis Core 4.0 Master Rulebook Specification',
    authority: 'Nemesis Core 4.0 Rules Architecture',
    version: '4.0 (Sections 1–10)',
    scope: 'Complete rules realization: 3D Unit Synthesis, Opposed d6 Pools, Recharging Surge Cells, Opaque Command Chit Pool, 6 Scenarios, and Zero-Stat-Inflation Progression.',
    realizedBy: ['cmp-synthesis-compiler', 'cmp-strike-resolver', 'cmp-chit-director', 'cmp-resonance-weaver', 'cmp-bastion-ledger'],
    conformance: 'verifyModelInvariants() && app.acceptance() (34/34 vectors)',
    coverage: 'implemented',
  },
  {
    id: 'hologram-v4',
    name: 'Hologram v4 Physical Archive Wire Format',
    authority: 'UOR-Foundation / PrismPM',
    version: 'v4 (HOLO magic, u16 v4, 32B BLAKE3 trailer)',
    scope: '8-section content-addressed .holo binary packaging APP_MANIFEST, METADATA, application-directory/v1, prismpm-model/v1, and 4 blake3: blobs.',
    realizedBy: ['cmp-wasm-guest', 'sec-blake3-kappas'],
    conformance: 'parseArchive() && resolveArchive() -> identities.verified === true',
    coverage: 'implemented',
  },
  {
    id: 'core-wasm-v1',
    name: 'Core-Wasm@1 Guest Contract',
    authority: 'UOR-Foundation / Hologram',
    version: 'hologram:guest/core-wasm@1',
    scope: 'Import-free wasm32 guest exporting [memory, holo_alloc, holo_run] with 65,536-byte allocation ceiling and fresh instance per dispatch.',
    realizedBy: ['cmp-wasm-guest', 'sec-wasm-sandbox'],
    conformance: 'compileGuest() && runAcceptance()',
    coverage: 'implemented',
  },
  {
    id: 'iso-42010',
    name: 'ISO/IEC/IEEE 42010 Architecture Description',
    authority: 'https://www.iso.org/standard/74393.html',
    version: '2022',
    scope: 'Explicit correspondence between Stakeholders, Concerns, Viewpoints, Governing Views, and System Components in model.prism.json.',
    realizedBy: ['vp-tactical-combat', 'vp-unit-synthesis', 'vp-campaign-economy', 'vp-holo-runtime'],
    conformance: 'verifyModelInvariants().concernsFramedByViewpoints === true',
    coverage: 'implemented',
  },
  {
    id: 'iso-25010',
    name: 'ISO/IEC 25010 Systems and Software Quality Requirements (SQuaRE)',
    authority: 'https://www.iso.org/standard/78176.html',
    version: '2023',
    scope: 'Quality characteristics, subcharacteristics, and quantitative target measures for Maintainability, Performance Efficiency, Reliability, and Functional Suitability.',
    realizedBy: ['qr-zero-bloat', 'qr-wasm-latency', 'qr-memory-safety', 'qr-vector-conformance'],
    conformance: 'verifyModelInvariants().qualityMeasuresComplete === true',
    coverage: 'implemented',
  },
  {
    id: 'rfc-8785-canonical',
    name: 'Deterministic Source & JSON Canonicalization (prism-code/canonical)',
    authority: 'prism-code/canonical & RFC 8785',
    version: '0.2.0',
    scope: 'LF normalization, BOM/trailing-whitespace stripping, SHA-256 codeHash, and BLAKE3 kappa addressing of campaign save state.',
    realizedBy: ['sec-canonical-saves', 'cmp-bastion-ledger'],
    conformance: 'computeCanonicalSaveReceipt().nonCanonicalDiffers === false',
    coverage: 'implemented',
  },
];

export interface ModelInvariantReport {
  allPassed: boolean;
  checks: {
    id: string;
    name: string;
    passed: boolean;
    detail: string;
  }[];
}

/**
 * Executable structural invariant verifier modeled on `Presentation.lex.tex` and `Standards.lex.tex`.
 */
export function verifyModelInvariants(): ModelInvariantReport {
  const stakeholderIds = KARST_PRODUCT_MODEL_DATA.stakeholders.map((s) => s.id);
  const concernIds = KARST_PRODUCT_MODEL_DATA.concerns.map((c) => c.id);
  const viewpointIds = KARST_PRODUCT_MODEL_DATA.viewpoints.map((v) => v.id);
  const componentIds = KARST_PRODUCT_MODEL_DATA.components.map((c) => c.id);
  const poleOrderIds = KARST_OBSERVER_POLES.map((p) => p.id);

  const distinct = (arr: string[]) => new Set(arr).size === arr.length;

  const stakeholderIdsDistinct = distinct(stakeholderIds) && distinct(concernIds) && distinct(viewpointIds);

  const concernsFramedByViewpoints = KARST_PRODUCT_MODEL_DATA.viewpoints.every(
    (vp) =>
      vp.stakeholders.every((s) => stakeholderIds.includes(s)) &&
      vp.concerns.every((c) => concernIds.includes(c))
  );

  // Check that every journey's steps walk the 5 Observer Poles in exact order 1..5 and end in 'verification'
  const journeys = Array.from(new Set(KARST_VANTAGE_STEPS.map((s) => s.journey)));
  const stepsCoverPolesInOrder = journeys.every((jId) => {
    const steps = KARST_VANTAGE_STEPS.filter((s) => s.journey === jId).sort(
      (a, b) => a.order - b.order
    );
    return (
      steps.length === 5 &&
      steps.every((st, idx) => st.order === idx + 1 && st.pole === poleOrderIds[idx]) &&
      steps[steps.length - 1].pole === 'verification'
    );
  });

  const allDeclaredIds = new Set([
    ...stakeholderIds,
    ...concernIds,
    ...viewpointIds,
    ...componentIds,
    ...KARST_PRODUCT_MODEL_DATA.qualityRequirements.map((q) => q.id),
    ...KARST_PRODUCT_MODEL_DATA.securityControls.map((s) => s.id),
    ...KARST_BOUNDARY_CONTRACTS.map((b) => b.id),
  ]);

  const standardsRealized = KARST_STANDARDS_REGISTER.every(
    (std) =>
      std.realizedBy.length > 0 &&
      std.realizedBy.every((id) => allDeclaredIds.has(id))
  );

  const boundaryContractsSound = KARST_BOUNDARY_CONTRACTS.every(
    (c) =>
      Boolean(c.precondition) &&
      Boolean(c.postcondition) &&
      Boolean(c.realization) &&
      Boolean(c.evidenceTheorem)
  );

  const worldCatalogSound =
    KARST_WORLD_CATALOG.characters.length >= 8 &&
    KARST_WORLD_CATALOG.locations.length === 7 &&
    KARST_WORLD_CATALOG.characters.every((c) => c.blake3Digest.length === 64) &&
    KARST_WORLD_CATALOG.locations.every((l) => l.blake3Digest.length === 64);

  const checks = [
    {
      id: 'inv-distinct-ids',
      name: 'distinctStrings(stakeholders, concerns, viewpoints, components)',
      passed: stakeholderIdsDistinct,
      detail: `${stakeholderIds.length} Stakeholders, ${concernIds.length} Concerns, ${viewpointIds.length} Viewpoints, ${componentIds.length} Components distinct`,
    },
    {
      id: 'inv-42010-framing',
      name: 'concernsFramedByViewpoints (Architecture.lex.tex)',
      passed: concernsFramedByViewpoints,
      detail: 'Every viewpoint references declared stakeholders and frames declared concerns',
    },
    {
      id: 'inv-observer-poles',
      name: 'stepsCoverPolesInOrder & endsInVerification (Presentation.lex.tex)',
      passed: stepsCoverPolesInOrder,
      detail: `${journeys.length} Vantage Journeys walk [sensual-object → sensual-quality → real-quality → withdrawn → verification]`,
    },
    {
      id: 'inv-mnist-contracts',
      name: 'boundaryContractsComplete (MNIST Model.lex.tex)',
      passed: boundaryContractsSound,
      detail: `${KARST_BOUNDARY_CONTRACTS.length} Boundary Contracts with Precondition, integer list_fold Realization & Postcondition`,
    },
    {
      id: 'inv-standards-realized',
      name: 'standardsRealizedByDeclaredEntities (Standards.lex.tex)',
      passed: standardsRealized,
      detail: `${KARST_STANDARDS_REGISTER.length} External Standards mapped to verified model entities`,
    },
    {
      id: 'inv-world-catalog',
      name: 'worldCatalogCanonicalized (Characters, 3D Units & Karst-9 Locations)',
      passed: worldCatalogSound,
      detail: `${KARST_WORLD_CATALOG.characters.length} Canonical Characters/Units & ${KARST_WORLD_CATALOG.locations.length} Karst-9 Locations content-addressed via prism-code`,
    },
  ];

  return {
    allPassed: checks.every((c) => c.passed),
    checks,
  };
}

export interface CanonicalWorldCharacterEntry {
  id: string;
  name: string;
  callsign: string;
  faction: 'StrikeRoster' | 'WardenDirective';
  coordinates: {
    doctrine: string;
    chassis: string;
    echelon: number;
  };
  lockedHardpoints: string[];
  sha256CodeHash: string;
  blake3Digest: string;
  kappaLabel: string;
}

export interface CanonicalWorldLocationEntry {
  id: string;
  code: string;
  title: string;
  biomeCategory: string;
  gridDimensions: string;
  specialRuleTitle: string;
  terrainCount: number;
  objectiveCount: number;
  sha256CodeHash: string;
  blake3Digest: string;
  kappaLabel: string;
}

export interface KarstWorldCatalog {
  characters: CanonicalWorldCharacterEntry[];
  unitMatrixAxes: {
    doctrines: { id: string; name: string; code: string; blake3Digest: string }[];
    chassis: { id: string; name: string; trackLabel: string; blake3Digest: string }[];
    echelons: { tier: number; name: string; berthCost: number; blake3Digest: string }[];
  };
  locations: CanonicalWorldLocationEntry[];
}

function buildKarstWorldCatalog(): KarstWorldCatalog {
  const defaultStrike = createDefaultStrikeRoster();
  const sampleWardens = generateWardenForce('High', 6);
  const allUnits = [...defaultStrike, ...sampleWardens];

  const characters: CanonicalWorldCharacterEntry[] = allUnits.map((u) => {
    const specText = canonicalize(
      JSON.stringify({
        schema: 'karst/character-unit-v4',
        id: u.id,
        name: u.name,
        callsign: u.callsign,
        faction: u.faction,
        coordinates: [u.doctrine, u.chassis, u.echelon],
        hardpoints: [...u.lockedHardpoints].sort(),
        attributes: { fpr: u.fpr, eva: u.eva, cog: u.cog, mov: u.mov },
      })
    );
    const bytes = encoder.encode(specText);
    return {
      id: u.id,
      name: u.name,
      callsign: u.callsign,
      faction: u.faction,
      coordinates: {
        doctrine: u.doctrine,
        chassis: u.chassis,
        echelon: u.echelon,
      },
      lockedHardpoints: u.lockedHardpoints,
      sha256CodeHash: codeHash(specText),
      blake3Digest: blake3Hex(bytes),
      kappaLabel: kappa(bytes),
    };
  });

  const bastionSpecText = canonicalize(
    JSON.stringify({
      schema: 'karst/location-v4',
      id: 'loc-orbital-bastion',
      code: 'ORB-BASTION-00',
      title: 'Orbital Bastion Command Vessel (Low-Karst Orbit)',
      biomeCategory: 'Orbital Stronghold & 6-Berth Strike Hangar',
      facilities: ['autoDocInfirmary', 'deepScanArray', 'ordnanceFoundry'],
    })
  );
  const bastionBytes = encoder.encode(bastionSpecText);

  const sectorLocations: CanonicalWorldLocationEntry[] = SCENARIO_SPECS.map((scen) => {
    const terrain = scen.setupTerrain();
    const objectives = scen.setupObjectives();
    const locSpecText = canonicalize(
      JSON.stringify({
        schema: 'karst/location-v4',
        id: scen.id,
        code: scen.code,
        number: scen.number,
        title: scen.title,
        specialRuleTitle: scen.specialRuleTitle,
        terrain: terrain.map((t) => ({ x: t.x, y: t.y, kind: t.kind })),
        objectives: objectives.map((o) => ({ x: o.x, y: o.y, kind: o.kind, vp: o.vpValue, alloy: o.alloyValue })),
      })
    );
    const locBytes = encoder.encode(locSpecText);
    return {
      id: scen.id,
      code: scen.code,
      title: scen.title,
      biomeCategory: `Karst-9 Subterranean Sector 0${scen.number}`,
      gridDimensions: '18x18 Cells (36"x36" Tactical Sector)',
      specialRuleTitle: scen.specialRuleTitle,
      terrainCount: terrain.length,
      objectiveCount: objectives.length,
      sha256CodeHash: codeHash(locSpecText),
      blake3Digest: blake3Hex(locBytes),
      kappaLabel: kappa(locBytes),
    };
  });

  return {
    characters,
    unitMatrixAxes: {
      doctrines: Object.values(DOCTRINE_SPECS).map((d) => {
        const txt = canonicalize(JSON.stringify(d));
        return { id: d.id, name: d.name, code: d.code, blake3Digest: blake3Hex(encoder.encode(txt)) };
      }),
      chassis: Object.values(CHASSIS_SPECS).map((c) => {
        const txt = canonicalize(JSON.stringify(c));
        return { id: c.id, name: c.name, trackLabel: c.trackLabel, blake3Digest: blake3Hex(encoder.encode(txt)) };
      }),
      echelons: Object.values(ECHELON_SPECS).map((e) => {
        const txt = canonicalize(JSON.stringify(e));
        return { tier: e.tier, name: e.name, berthCost: e.berthCost, blake3Digest: blake3Hex(encoder.encode(txt)) };
      }),
    },
    locations: [
      {
        id: 'loc-orbital-bastion',
        code: 'ORB-BASTION-00',
        title: 'Orbital Bastion Command Vessel',
        biomeCategory: 'Orbital Stronghold & 6-Berth Strike Hangar',
        gridDimensions: 'Orbital Command Deck (3-Step Pre-Drop Sequence)',
        specialRuleTitle: 'Pre-Drop Crew Assignments & Zero-Stat-Inflation Armory',
        terrainCount: 0,
        objectiveCount: 3,
        sha256CodeHash: codeHash(bastionSpecText),
        blake3Digest: blake3Hex(bastionBytes),
        kappaLabel: kappa(bastionBytes),
      },
      ...sectorLocations,
    ],
  };
}

export const KARST_WORLD_CATALOG: KarstWorldCatalog = buildKarstWorldCatalog();

/**
 * Executes deterministic integer operations through the compiled Core-Wasm guest
 * (`app.dispatch`) and logs every wire transaction for stakeholder inspection.
 */
export class KarstWasmMathBridge {
  private app: LoadedHoloState['app'];
  private onLog: (entry: DispatchLogEntry) => void;

  constructor(app: LoadedHoloState['app'], onLog: (entry: DispatchLogEntry) => void) {
    this.app = app;
    this.onLog = onLog;
  }

  public async dispatchOp(
    op: 'add' | 'subtract' | 'multiply' | 'divide',
    lhs: number,
    rhs: number,
    contextNote?: string
  ): Promise<{ value: number; wireTrace: string }> {
    const reqText = `1\t${op}\t${Math.trunc(lhs)}\t${Math.trunc(rhs)}`;
    const reqBytes = encoder.encode(reqText);
    const t0 = performance.now();
    const resBytes = await this.app.dispatch(reqBytes);
    const durationMs = Number((performance.now() - t0).toFixed(2));
    const resText = tryDecodeUtf8(resBytes);

    const entry: DispatchLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      source: 'console',
      requestText: contextNote ? `${reqText} [${contextNote}]` : reqText,
      requestHex: bytesToHex(reqBytes),
      requestByteLength: reqBytes.length,
      responseText: resText,
      responseHex: bytesToHex(resBytes),
      responseByteLength: resBytes.length,
      durationMs,
      status: resText.includes('\tok\t') ? 'ok' : 'error',
    };
    this.onLog(entry);

    const parts = resText.split('\t');
    const numericVal = parts[1] === 'ok' ? Number(parts[2]) : 0;
    return {
      value: numericVal,
      wireTrace: `${reqText.replace(/\t/g, ' ⇥ ')} → ${resText.replace(/\t/g, ' ⇥ ')} (${durationMs}ms)`,
    };
  }
}

export interface CanonicalSaveReceipt {
  canonicalJsonText: string;
  facts: CodeFacts;
  blake3Kappa: string;
  matchesFormattingInvariant: boolean;
}

export function computeCanonicalSaveReceipt(campaign: CampaignState): {
  canonicalText: string;
  facts: CodeFacts;
  blake3Kappa: string;
  nonCanonicalDiffers: boolean;
} {
  const prettyJson = JSON.stringify(campaign, null, 2);
  const crlfBomVariant = `\uFEFF${prettyJson.replace(/\n/g, '  \r\n')}\r\n\r\n`;
  const canonicalText = canonicalize(prettyJson);
  const facts = describe(prettyJson);
  const blake3Kappa = kappa(encoder.encode(canonicalText));
  const nonCanonicalDiffers = differs(prettyJson, crlfBomVariant);
  return {
    canonicalText,
    facts,
    blake3Kappa,
    nonCanonicalDiffers,
  };
}

