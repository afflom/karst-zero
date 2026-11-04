/**
 * KARST: ZERO HORIZON — Core Game & Product Model Types
 */

export type EchelonTier = 0 | 1 | 2 | 3 | 4;

export type ChassisType =
  | 'Spliced'     // Bio-Organic (Integrity track, Staggered/Critical Trauma, +1 COG recovery)
  | 'Automaton'   // Mechanical Construct (Hull Plating, native Plating 1, immune to pain, d6 Subsystem Rupture on 3+ dmg)
  | 'Xenomorph'   // Feral Bio-Stalker (Integrity track, native Bio-Resilience 1 [6+ ignore], +2 MOV, -1 COG)
  | 'PhaseBorn'   // Void/Energy Entity (Integrity track, ignores rough terrain, native Arc Backlash vs Surge, +1 dmg from Resonance)
  | 'RigWalker';  // Heavy Vehicle Platform (Hull Plating, native Plating 1, Gyro Handling = Base EVA, Mount/Transport)

export type DoctrineRole =
  | 'Breacher'    // Close Assault (+1 FPR; 1 Surge = Kinetic Ram Push 1 sector or ignore Staggered)
  | 'Aegis'       // Frontline Bulwark (+1 EVA; 1 Surge = Deflector Pulse +1 auto-EVA self/ally)
  | 'Outrider'    // Flank & Recon (+2 MOV; 1 Surge = Thruster Juke 2-sector free shift)
  | 'Deadeye'     // Long-Range Suppression (12-sector Ranged; 1 Surge = Target Lock ignore cover or +6 range)
  | 'Saboteur'    // Electronic Warfare (+1 COG; 1 Surge = Neural Siphon drain 1 Surge or inflict Staggered)
  | 'Psion';      // Resonance Channeler (+1 COG, Resonance Weaving; 1 Surge = Harmonic Link +1 die to allies in 6")

export type ResonanceFrequency =
  | 'FerroKinetics' // Matter
  | 'PlasmaArc'     // Energy
  | 'BioSynth'      // Life
  | 'NeuroHacking'  // Mind
  | 'FoldSpace'     // Space
  | 'ChronoDrift';  // Time

export interface EchelonSpec {
  tier: EchelonTier;
  name: string;
  code: string;
  unitCount: number;       // 3 for E0, 2 for E1, 1 for E2-E4
  berthCost: number;       // 1 for E0-E2, 2 for E3, 3 for E4
  baseFpr: number;         // Firepower (Attack)
  baseEva: number;         // Evasion (Defense)
  baseCog: number;         // Cognition (Influence)
  maxIntegrityPerModel: number; // Wounds / Hull per model
  baseSurge: number;       // Recharging Surge Cells (DP)
  startingHardpoints: number;
  campaignMaxHardpoints: number;
  alloyCost: number;
  summary: string;
}

export interface ChassisSpec {
  id: ChassisType;
  name: string;
  trackLabel: 'Integrity' | 'Hull Plating';
  isMechanical: boolean;
  nativePlating: number;      // Armor (X)
  nativeResilience: number;   // Tough (X)
  moveDelta: number;
  cogDelta: number;
  ignoresRoughTerrain: boolean;
  hasArcBacklash: boolean;
  summary: string;
  traitDescription: string;
}

export interface DoctrineSpec {
  id: DoctrineRole;
  name: string;
  code: string;
  fprDelta: number;
  evaDelta: number;
  cogDelta: number;
  moveDelta: number;
  grantsRanged12: boolean;
  unlocksResonance: boolean;
  surgeTriggerName: string;
  surgeTriggerDescription: string;
  wardenAiDirective: string;
}

export interface HardpointModule {
  id: string;
  name: string;
  slotSize: 1 | 2;
  category: 'Combat' | 'Surge & Economy' | 'Field Utility' | 'Resonance' | 'Masterwork';
  alloyCost: number;
  minEchelon?: EchelonTier;
  effectSummary: string;
  grantsRanged8?: boolean;
  bonusPlating?: number;
  bonusResilience?: number;
  bonusSurge?: number;
  bonusMove?: number;
  autoHitOffense?: number;
  autoHitDefense?: number;
  armorPiercing?: number;
}

export interface MinorResonanceDirective {
  id: string;
  name: string;
  frequency: ResonanceFrequency;
  surgeCost: 0 | 1 | 2 | 3;
  rangeSectors: number; // 0 = Self, 1 = Touch, 6, 8, 12, 18
  resolution: 'Auto' | 'OpposedFpr' | 'OpposedEva' | 'OpposedCog' | 'TargetEvaTN2' | 'TargetCogTN2' | 'CogTN3';
  kind: 'Attack' | 'Buff' | 'Hex' | 'Heal' | 'Teleport' | 'Terrain';
  damage?: number;
  ignoresPlating?: boolean;
  inflictsStaggered?: boolean;
  healsIntegrity?: number;
  grantsPlating?: number;
  bonusDice?: number;
  pushSectors?: number;
  summary: string;
}

export interface CompiledUnit {
  id: string;
  name: string;
  callsign: string;
  faction: 'StrikeRoster' | 'WardenDirective';
  berthIndices: number[]; // e.g., [1, 2] for Echelon 3 Prime Leader, [1..6] for Wardens
  echelon: EchelonTier;
  chassis: ChassisType;
  doctrine: DoctrineRole;
  lockedHardpoints: string[];
  unlockedTotalHardpoints: number;
  knownDirectives: string[];
  majorFrequency?: ResonanceFrequency;

  // Computed Baseline Stats
  modelsMax: number;
  modelsCurrent: number;
  fpr: number;
  eva: number;
  cog: number;
  mov: number; // in inches/sectors
  maxIntegrityPerModel: number;
  maxSurge: number;
  plating: number;
  resilience: number;
  rangedRange: number; // 0 if melee-only, 8, 12, or 18

  // Live Battle State
  gridX: number; // 0..17 (each cell = 2 sectors/inches on 36x36 map)
  gridY: number; // 0..17
  accumulatedDamage: number; // damage on current model (or total SP damage)
  currentSurge: number;
  actionsRemaining: number;
  standardActionUsed: boolean;
  movedThisTurn: boolean;
  chargedThisTurn: boolean;
  activatedThisRound: boolean;
  activationsRemainingThisRound: number; // Multi-berth bosses activate once per berth occupied

  // Conditions & Buffs
  staggered: boolean;       // Hindered (-2 EVA)
  criticalTrauma: boolean;  // Impaired (-2 EVA, must pass COG TN 2 or crawl 2")
  shaken: boolean;          // Morale shaken (-1 FPR, cannot spend Surge)
  hidden: boolean;          // Stealth Ambush module
  deflectorActive: boolean; // +1 auto-EVA from Aegis trigger or buff
  targetLockActive: boolean;// Ignore cover / +6" range from Deadeye trigger
  kineticRamActive: boolean;// Push 1" / ignore Staggered from Breacher trigger
  harmonicBonusDice: number;// +1 die from Psion trigger / Rally
  subsystemRuptures: string[];

  // Campaign Persistence
  xp: number;
  penalties: { fpr: number; eva: number; cog: number };
}

export type TerrainKind = 'LowBarricade' | 'Bulkhead' | 'RoughDebris' | 'PlasmaHazard';

export interface TerrainCell {
  x: number;
  y: number;
  kind: TerrainKind;
  name: string;
  structurePoints?: number; // For Destructible Cover (4 SP, Armor 1)
}

export interface ObjectiveMarker {
  id: string;
  x: number;
  y: number;
  name: string;
  kind: 'AlloyCache' | 'CentralCore' | 'ExtractionZone' | 'VipCourier' | 'ControlBeacon';
  alloyValue: number;
  vpValue: number;
  claimedBy: 'None' | 'StrikeRoster' | 'WardenDirective';
  hackCount?: number; // For Scenario 3 Data Heist (up to 3)
}

export interface ScenarioSpec {
  id: string;
  number: number;
  title: string;
  code: string;
  subtitle: string;
  briefing: string;
  victoryConditions: string[];
  specialRuleTitle: string;
  specialRuleText: string;
  setupTerrain: () => TerrainCell[];
  setupObjectives: () => ObjectiveMarker[];
}

export type BattlePhase = 'UPKEEP' | 'SURGE_RECHARGE' | 'ACTIVATION' | 'END_PHASE' | 'COMPLETE';

export type CommandChit =
  | { id: string; kind: 'STRIKE'; label: string }
  | { id: string; kind: 'WARDEN'; label: string };

export interface CombatRollBreakdown {
  id: string;
  timestamp: string;
  attackerName: string;
  defenderName: string;
  actionLabel: string;
  attackerDice: number[];
  defenderDice: number[];
  attackerSurgeSpent: number;
  defenderSurgeSpent: number;
  coverBonus: number;
  rawAttackerHits: number;
  rawDefenderHits: number;
  netHits: number;
  platingMitigated: number;
  resilienceRolls: number[];
  resilienceSaved: number;
  finalDamage: number;
  outcomeSummary: string;
  wasmWireTrace: string[];
}

export interface CrewTaskAssignment {
  unitId: string;
  task: 'SectorRecon' | 'ScrapSalvaging' | 'MedBayOverhaul' | 'CombatSimDrill';
  rolled: boolean;
  pushed: boolean;
  dice: number[];
  successes: number;
  rewardSummary: string;
}

export interface CampaignState {
  companyName: string;
  alloyTreasury: number;
  reconProgress: number;
  prepTokens: number;
  consumablesCount: number;
  completedContracts: number;
  bastionFacilities: {
    autoDocInfirmary: boolean; // 8 Alloy: First Overhaul each Downtime is Free
    deepScanArray: boolean;    // 8 Alloy: +1 free Recon Success every Pre-Drop Phase
    ordnanceFoundry: boolean;  // 10 Alloy: +1 free Single-Use Consumable every scenario
  };
  roster: CompiledUnit[];
}
