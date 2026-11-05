import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Play,
  Crosshair,
  Sparkles,
  Footprints,
  Cpu,
  FastForward,
  Pause,
  Radio,
  BookOpen,
} from 'lucide-react';
import {
  CHASSIS_SPECS,
  DOCTRINE_SPECS,
  MINOR_RESONANCE_DIRECTIVES,
  RESONANCE_BACKLASH_TABLE,
  generateWardenForce,
} from '../game/catalog';
import { resolveNemesisSubsystemRupture } from '../game/nemesisEngine';
import type {
  CampaignState,
  CompiledUnit,
  ScenarioSpec,
  TerrainCell,
  ObjectiveMarker,
  CommandChit,
  CombatRollBreakdown,
  MinorResonanceDirective,
} from '../game/types';
import type { KarstWasmMathBridge } from '../lib/karstHoloModel';
import type { SpatialCameraMode } from '../game/spatialModel';
import type { ActiveBattlefieldAnimationEvent } from '../game/animationModel';
import { soundFX } from '../game/sound';
import {
  UnitPortraitSvg,
  BattlefieldCellTerrainOrObjectiveSvg,
  SectorLocationPanoramaSvg,
  SpatialBattlefieldViewportSvg,
} from './KarstVisuals';
import {
  SCENARIO_NARRATIVES,
  getOperativeSelectionQuote,
  getOperativeBio,
} from '../game/lore';

interface BattlefieldViewProps {
  campaign: CampaignState;
  scenario: ScenarioSpec;
  threatLevel: 'Low' | 'Medium' | 'High';
  wasmBridge: KarstWasmMathBridge | null;
  onCompleteMission: (result: {
    victory: boolean;
    playerVp: number;
    wardenVp: number;
    alloyEarned: number;
    updatedRoster: CompiledUnit[];
  }) => void;
  onAbortToHub: () => void;
}

const GRID_SIZE = 18; // 18x18 cells, each cell = 2" (36"x36" sector)

function distInches(x1: number, y1: number, x2: number, y2: number): number {
  return Math.round(Math.hypot(x2 - x1, y2 - y1) * 2);
}

function isStraightLineMove(x1: number, y1: number, x2: number, y2: number): boolean {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  return dx === 0 || dy === 0 || dx === dy;
}

function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  terrain: TerrainCell[]
): boolean {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
  if (steps <= 1) return true;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const cx = Math.round(x1 + (x2 - x1) * t);
    const cy = Math.round(y1 + (y2 - y1) * t);
    if ((cx === x1 && cy === y1) || (cx === x2 && cy === y2)) continue;
    const blocker = terrain.find((cell) => cell.x === cx && cell.y === cy && cell.kind === 'Bulkhead');
    if (blocker) return false;
  }
  return true;
}

function hasPartialCover(targetX: number, targetY: number, terrain: TerrainCell[]): boolean {
  return terrain.some(
    (cell) =>
      cell.kind === 'LowBarricade' &&
      Math.abs(cell.x - targetX) <= 1 &&
      Math.abs(cell.y - targetY) <= 1
  );
}

function prepareInitialBattleUnits(
  roster: CompiledUnit[],
  threat: 'Low' | 'Medium' | 'High',
  scenarioNumber: number
): CompiledUnit[] {
  const playerUnits = roster.map((u, idx) => ({
    ...u,
    modelsCurrent: u.modelsMax,
    accumulatedDamage: u.accumulatedDamage ?? 0,
    currentSurge: u.maxSurge,
    actionsRemaining: 2,
    standardActionUsed: false,
    movedThisTurn: false,
    chargedThisTurn: false,
    activatedThisRound: false,
    activationsRemainingThisRound: 1,
    staggered: false,
    criticalTrauma: false,
    shaken: false,
    hidden: false,
    deflectorActive: false,
    targetLockActive: false,
    kineticRamActive: false,
    harmonicBonusDice: 0,
    subsystemRuptures: [],
    gridX: Math.min(16, 2 + idx * 3),
    gridY: 15,
  }));

  const wardens = generateWardenForce(threat, scenarioNumber).map((w, idx) => ({
    ...w,
    gridX: Math.min(16, 2 + idx * 3),
    gridY: 2,
    activationsRemainingThisRound: w.berthIndices.length,
  }));

  return [...playerUnits, ...wardens];
}

function buildRoundChitPool(units: CompiledUnit[]): CommandChit[] {
  const livingPlayers = units.filter(
    (u) => u.faction === 'StrikeRoster' && u.modelsCurrent > 0
  );
  const livingWardens = units.filter(
    (u) => u.faction === 'WardenDirective' && u.modelsCurrent > 0
  );
  const pool: CommandChit[] = livingPlayers.map((_, idx) => ({
    id: `chit-strike-${idx}-${Date.now()}`,
    kind: 'STRIKE',
    label: 'Strike Operative Ready',
  }));
  if (livingWardens.length > 0) {
    pool.push({
      id: `chit-warden-${Date.now()}`,
      kind: 'WARDEN',
      label: 'Warden Custodian Response',
    });
  }
  return pool;
}

export const BattlefieldView: React.FC<BattlefieldViewProps> = ({
  campaign,
  scenario,
  threatLevel,
  wasmBridge,
  onCompleteMission,
  onAbortToHub,
}) => {
  const narrative = SCENARIO_NARRATIVES[scenario.number] ?? SCENARIO_NARRATIVES[1];

  const [round, setRound] = useState<number>(1);
  const [units, setUnits] = useState<CompiledUnit[]>(() =>
    prepareInitialBattleUnits(campaign.roster, threatLevel, scenario.number)
  );
  const [terrain] = useState<TerrainCell[]>(() => scenario.setupTerrain());
  const [objectives, setObjectives] = useState<ObjectiveMarker[]>(() =>
    scenario.setupObjectives()
  );
  const [chitPool, setChitPool] = useState<CommandChit[]>(() =>
    buildRoundChitPool(prepareInitialBattleUnits(campaign.roster, threatLevel, scenario.number))
  );

  const [turnAuthority, setTurnAuthority] = useState<'AWAITING_CHIT' | 'PLAYER_TURN' | 'MISSION_OVER'>(
    'AWAITING_CHIT'
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<'MOVE' | 'ATTACK' | 'RESONANCE' | 'SUPPORT'>('MOVE');
  const [selectedDirectiveId, setSelectedDirectiveId] = useState<string>('res-arc-jolt');
  const [surgeToSpend, setSurgeToSpend] = useState<number>(0);

  // Mechanized Engine Director State
  const [autoDirector, setAutoDirector] = useState<boolean>(true);
  const [lastBoundaryContractId, setLastBoundaryContractId] = useState<string>('ctr-chit-step');
  const [lastVector, setLastVector] = useState<{
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    kind: 'MOVE' | 'ATTACK';
  } | null>(null);
  const [activeAnimations, setActiveAnimations] = useState<ActiveBattlefieldAnimationEvent[]>([]);

  const enqueueAnimationEvent = useCallback(
    (
      event: Omit<ActiveBattlefieldAnimationEvent, 'id' | 'startedAtMs'> & {
        delayMs?: number;
      }
    ) => {
      const { delayMs = 0, ...rest } = event;
      const now = performance.now();
      const entry: ActiveBattlefieldAnimationEvent = {
        ...rest,
        id: `anim-${rest.clipId}-${now.toFixed(1)}-${Math.random().toString(36).slice(2, 6)}`,
        startedAtMs: now + delayMs,
      };
      setActiveAnimations((prev) => [
        ...prev.filter((item) => now - item.startedAtMs < item.durationMs + 250).slice(-14),
        entry,
      ]);
    },
    []
  );

  const triggerOrbitalDropChoreography = useCallback(
    (targetUnits: CompiledUnit[]) => {
      const now = performance.now();
      const dropEvents: ActiveBattlefieldAnimationEvent[] = targetUnits
        .filter((u) => u.faction === 'StrikeRoster' && u.modelsCurrent > 0)
        .map((u, idx) => ({
          id: `anim-drop-${u.id}-${now.toFixed(0)}`,
          clipId: 'CLIP-08-ORBITAL-DROP',
          startedAtMs: now + idx * 90,
          durationMs: 900,
          fromX: u.gridX,
          fromY: u.gridY,
          toX: u.gridX,
          toY: u.gridY,
          unitId: u.id,
          doctrine: u.doctrine,
          chassis: u.chassis,
          calloutText: `POD · ${u.callsign}`,
        }));
      setActiveAnimations((prev) => [
        ...prev.filter((item) => now - item.startedAtMs < item.durationMs + 200),
        ...dropEvents,
      ]);
    },
    []
  );

  // Trigger Valkyrie-04 Orbital Drop-Pod Insertion (CLIP-08-ORBITAL-DROP) on initial mission entry
  useEffect(() => {
    triggerOrbitalDropChoreography(units);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [playerVp, setPlayerVp] = useState<number>(0);
  const [wardenVp, setWardenVp] = useState<number>(0);
  const [sessionAlloy, setSessionAlloy] = useState<number>(0);
  const [fieldStimsRemaining, setFieldStimsRemaining] = useState<number>(
    campaign.consumablesCount + (campaign.bastionFacilities.ordnanceFoundry ? 1 : 0)
  );
  const [prepTokensRemaining, setPrepTokensRemaining] = useState<number>(campaign.prepTokens);
  const [showSceneBriefing, setShowSceneBriefing] = useState<boolean>(true);
  const [showFullLogModal, setShowFullLogModal] = useState<boolean>(false);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [cameraMode, setCameraMode] = useState<SpatialCameraMode>('ISOMETRIC_25D');
  const [battleBanner, setBattleBanner] = useState<string>(
    narrative.roundAtmosphere[0] ?? 'Drop pods locked into subterranean vault floor — initializing tactical link...'
  );
  const [combatLogs, setCombatLogs] = useState<CombatRollBreakdown[]>([]);
  const [missionReport, setMissionReport] = useState<{
    victory: boolean;
    summary: string;
    traumaNotes: string[];
    updatedRoster: CompiledUnit[];
  } | null>(null);

  const selectedUnit = useMemo(
    () => units.find((u) => u.id === selectedUnitId && u.modelsCurrent > 0) ?? null,
    [units, selectedUnitId]
  );

  // Determine valid movement cells for selected friendly unit (always visible when unit has AP > 0)
  const validMoveCells = useMemo(() => {
    const map = new Map<string, { isChargeEligible: boolean; dist: number }>();
    if (
      turnAuthority !== 'PLAYER_TURN' ||
      !selectedUnit ||
      selectedUnit.faction !== 'StrikeRoster' ||
      selectedUnit.activatedThisRound ||
      selectedUnit.actionsRemaining <= 0 ||
      actionMode === 'RESONANCE'
    ) {
      return map;
    }

    const chs = CHASSIS_SPECS[selectedUnit.chassis];
    const maxInches = selectedUnit.criticalTrauma ? 2 : selectedUnit.mov;
    const hostiles = units.filter(
      (u) => u.faction === 'WardenDirective' && u.modelsCurrent > 0
    );

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (x === selectedUnit.gridX && y === selectedUnit.gridY) continue;
        if (terrain.some((t) => t.x === x && t.y === y && t.kind === 'Bulkhead')) continue;
        if (units.some((u) => u.modelsCurrent > 0 && u.gridX === x && u.gridY === y)) continue;

        const isRough = terrain.some((t) => t.x === x && t.y === y && t.kind === 'RoughDebris');
        const effectiveCap =
          isRough && !chs.ignoresRoughTerrain && selectedUnit.doctrine !== 'Outrider'
            ? Math.max(2, Math.floor(maxInches / 2))
            : maxInches;

        const d = distInches(selectedUnit.gridX, selectedUnit.gridY, x, y);
        if (d <= effectiveCap && hasLineOfSight(selectedUnit.gridX, selectedUnit.gridY, x, y, terrain)) {
          const straight = isStraightLineMove(selectedUnit.gridX, selectedUnit.gridY, x, y);
          const adjacentToEnemy = hostiles.some(
            (h) => distInches(x, y, h.gridX, h.gridY) <= 2
          );
          map.set(`${x},${y}`, {
            isChargeEligible: d >= 4 && straight && adjacentToEnemy,
            dist: d,
          });
        }
      }
    }
    return map;
  }, [turnAuthority, selectedUnit, actionMode, units, terrain]);

  // Determine valid attackable hostile targets for direct 1-click engagement on the grid
  const engageableHostileIds = useMemo(() => {
    const set = new Set<string>();
    if (
      turnAuthority !== 'PLAYER_TURN' ||
      !selectedUnit ||
      selectedUnit.faction !== 'StrikeRoster' ||
      selectedUnit.activatedThisRound ||
      selectedUnit.standardActionUsed ||
      selectedUnit.actionsRemaining <= 0
    ) {
      return set;
    }
    for (const u of units) {
      if (u.faction !== 'WardenDirective' || u.modelsCurrent <= 0) continue;
      const d = distInches(selectedUnit.gridX, selectedUnit.gridY, u.gridX, u.gridY);
      const isMelee = d <= 2;
      const maxReach = isMelee
        ? 2
        : selectedUnit.rangedRange + (selectedUnit.targetLockActive ? 6 : 0);
      if (d <= maxReach && (isMelee || hasLineOfSight(selectedUnit.gridX, selectedUnit.gridY, u.gridX, u.gridY, terrain))) {
        set.add(u.id);
      }
    }
    return set;
  }, [turnAuthority, selectedUnit, units, terrain]);

  // Apply damage to target unit & return updated unit + outcome description
  const applyDamageToUnit = useCallback(
    async (
      target: CompiledUnit,
      finalDamage: number,
      wireTrace: string[],
      forceCritOrTrauma = false
    ): Promise<{ updated: CompiledUnit; note: string; neutralized: boolean }> => {
      if (finalDamage <= 0 && !forceCritOrTrauma) {
        return { updated: target, note: 'Armor plating deflected all impact energy.', neutralized: false };
      }

      setLastBoundaryContractId('ctr-opposed-strike');
      const copy = { ...target, subsystemRuptures: [...target.subsystemRuptures] };
      const chs = CHASSIS_SPECS[copy.chassis];

      // Multi-Model Group Damage (Echelon 0 Swarm = 1 HP/model, Echelon 1 Grunt = 2 HP/model)
      if (copy.echelon <= 1) {
        let remainingDmg = finalDamage;
        let modelsLost = 0;
        while (remainingDmg > 0 && copy.modelsCurrent > 0) {
          const neededToKillCurrent = copy.maxIntegrityPerModel - copy.accumulatedDamage;
          if (remainingDmg >= neededToKillCurrent) {
            remainingDmg -= neededToKillCurrent;
            copy.modelsCurrent -= 1;
            copy.accumulatedDamage = 0;
            modelsLost += 1;
          } else {
            copy.accumulatedDamage += remainingDmg;
            remainingDmg = 0;
          }
        }
        if (wasmBridge && modelsLost > 0) {
          const r = await wasmBridge.dispatchOp(
            'subtract',
            target.modelsCurrent,
            modelsLost,
            `${target.callsign} Pack Casualties`
          );
          wireTrace.push(r.wireTrace);
        }
        if (copy.modelsCurrent <= 0) {
          return {
            updated: copy,
            note: `${copy.name} squad eliminated (${modelsLost} unit(s) down)!`,
            neutralized: true,
          };
        }
        return {
          updated: copy,
          note:
            modelsLost > 0
              ? `${modelsLost} squad member(s) downed (${copy.modelsCurrent}/${copy.modelsMax} active).`
              : `${copy.name} sustains ${finalDamage} damage.`,
          neutralized: false,
        };
      }

      // Single-model Echelon 2, 3, 4
      if (wasmBridge) {
        const r = await wasmBridge.dispatchOp(
          'add',
          copy.accumulatedDamage,
          finalDamage,
          `${copy.callsign} Damage Track`
        );
        copy.accumulatedDamage = r.value;
        wireTrace.push(r.wireTrace);
      } else {
        copy.accumulatedDamage += finalDamage;
      }

      if (chs.isMechanical) {
        let critNote = '';
        if ((finalDamage >= 3 || forceCritOrTrauma) && copy.accumulatedDamage < copy.maxIntegrityPerModel) {
          const critRoll = Math.floor(Math.random() * 6) + 1;
          const rupture = resolveNemesisSubsystemRupture(critRoll);
          if (rupture.code === 'ACTUATOR_LOCK') {
            copy.mov = Math.max(2, copy.mov - 2);
            copy.subsystemRuptures.push('Servo Lock (-2" MOV)');
            critNote = ` · Subsystem Rupture: ${rupture.label}!`;
          } else if (rupture.code === 'OPTICS_SCOUR') {
            copy.fpr = Math.max(1, copy.fpr - 1);
            copy.subsystemRuptures.push('Optics Scour (-1 FPR)');
            critNote = ` · Subsystem Rupture: ${rupture.label}!`;
          } else if (rupture.code === 'HULL_VENT') {
            copy.currentSurge = 0;
            copy.plating = Math.max(0, copy.plating - 1);
            copy.subsystemRuptures.push('Capacitor Vent (0 SRG, -1 ARM)');
            critNote = ` · Subsystem Rupture: ${rupture.label}!`;
          } else {
            copy.accumulatedDamage += 2;
            critNote = ` · Subsystem Rupture: ${rupture.label}!`;
          }
        }

        if (copy.accumulatedDamage >= copy.maxIntegrityPerModel) {
          copy.modelsCurrent = 0;
          return {
            updated: copy,
            note: `${copy.name} Hull Plating breached — Chassis Destroyed!${critNote}`,
            neutralized: true,
          };
        }
        return {
          updated: copy,
          note: `${copy.name} takes ${finalDamage} Hull Damage (${copy.maxIntegrityPerModel - copy.accumulatedDamage}/${copy.maxIntegrityPerModel} Hull remaining)${critNote}.`,
          neutralized: false,
        };
      }

      // Biological Integrity Track (Healthy -> Staggered -> Critical Trauma -> Neutralized at Integrity+1)
      if (forceCritOrTrauma && copy.accumulatedDamage < copy.maxIntegrityPerModel) {
        copy.criticalTrauma = true;
        copy.staggered = true;
      }
      if (copy.accumulatedDamage >= copy.maxIntegrityPerModel + 1) {
        copy.modelsCurrent = 0;
        return {
          updated: copy,
          note: `${copy.name} sustained critical biological failure — Neutralized!`,
          neutralized: true,
        };
      }
      if (copy.accumulatedDamage === copy.maxIntegrityPerModel || copy.criticalTrauma) {
        copy.criticalTrauma = true;
        copy.staggered = true;
        return {
          updated: copy,
          note: `${copy.name} is in Critical Trauma (${copy.accumulatedDamage}/${copy.maxIntegrityPerModel} Wounds)!`,
          neutralized: false,
        };
      }
      if (copy.accumulatedDamage >= Math.ceil(copy.maxIntegrityPerModel / 2)) {
        copy.staggered = true;
        return {
          updated: copy,
          note: `${copy.name} is Staggered by impact shock (${copy.accumulatedDamage}/${copy.maxIntegrityPerModel} Wounds)!`,
          neutralized: false,
        };
      }

      return {
        updated: copy,
        note: `${copy.name} takes ${finalDamage} Wound(s) (${copy.accumulatedDamage}/${copy.maxIntegrityPerModel}).`,
        neutralized: false,
      };
    },
    [wasmBridge]
  );

  // Execute Opposed Attack (Melee or Ranged)
  const executeOpposedCombat = useCallback(
    async (
      attacker: CompiledUnit,
      defender: CompiledUnit,
      isMelee: boolean,
      attackerBoostSurge: number,
      currentUnits: CompiledUnit[]
    ): Promise<CompiledUnit[]> => {
      setLastBoundaryContractId('ctr-opposed-strike');
      setLastVector({
        fromX: attacker.gridX,
        fromY: attacker.gridY,
        toX: defender.gridX,
        toY: defender.gridY,
        kind: 'ATTACK',
      });
      const wireTrace: string[] = [];
      const dist = distInches(attacker.gridX, attacker.gridY, defender.gridX, defender.gridY);

      let atkPool = attacker.fpr;
      if (attacker.modelsCurrent > 1) {
        atkPool += attacker.modelsCurrent - 1;
      }
      if (isMelee && attacker.chargedThisTurn) {
        const hasSkiff = attacker.lockedHardpoints.includes('hp-thruster-skiff');
        atkPool += hasSkiff ? 2 : 1;
      }
      if (attacker.harmonicBonusDice > 0) {
        atkPool += attacker.harmonicBonusDice;
      }
      atkPool += attackerBoostSurge;

      const defBoost =
        defender.faction === 'WardenDirective' && defender.currentSurge > 0 ? 1 : 0;
      const staggerPenalty =
        defender.staggered && !(isMelee && attacker.kineticRamActive) ? 2 : 0;
      const defPool = Math.max(1, defender.eva - staggerPenalty) + defBoost;

      const attackerDice: number[] = [];
      for (let i = 0; i < atkPool; i++) {
        attackerDice.push(Math.floor(Math.random() * 6) + 1);
      }
      const defenderDice: number[] = [];
      for (let i = 0; i < defPool; i++) {
        defenderDice.push(Math.floor(Math.random() * 6) + 1);
      }

      const inCover = !isMelee && hasPartialCover(defender.gridX, defender.gridY, terrain);
      const hasPrecision = attacker.lockedHardpoints.includes('hp-precision');
      const ignoreCover = attacker.targetLockActive || hasPrecision;
      const coverBonus = inCover && !ignoreCover ? 1 : 0;

      const hitThreshold = hasPrecision && !inCover && dist <= 6 ? 3 : 4;
      let rawAtkHits = attackerDice.filter((d) => d >= hitThreshold).length;

      if (attacker.lockedHardpoints.includes('hp-deterministic-strike')) {
        rawAtkHits += 1;
      }
      if (
        attacker.lockedHardpoints.includes('hp-exploit') &&
        defenderDice.some((d) => d === 1)
      ) {
        rawAtkHits += 1;
      }
      if (
        attacker.lockedHardpoints.includes('hp-crit-threshold') &&
        attackerDice.filter((d) => d === 6).length >= 2
      ) {
        rawAtkHits += 1;
      }

      const rawDefHits =
        defenderDice.filter((d) => d >= 4).length +
        coverBonus +
        (defender.deflectorActive ? 1 : 0) +
        (defender.lockedHardpoints.includes('hp-aegis-wall') ? 1 : 0);

      let netHits = Math.max(0, rawAtkHits - rawDefHits);
      if (wasmBridge) {
        const netRes = await wasmBridge.dispatchOp(
          'subtract',
          rawAtkHits,
          rawDefHits,
          `${attacker.callsign} vs ${defender.callsign} Net Hits`
        );
        netHits = Math.max(0, netRes.value);
        wireTrace.push(netRes.wireTrace);
      }

      let finalDamage = 0;
      let platingMitigated = 0;
      const resilienceRolls: number[] = [];
      let resilienceSaved = 0;

      if (netHits > 0) {
        const ap = attacker.lockedHardpoints.includes('hp-armor-piercing') ? 1 : 0;
        const effectivePlating = Math.max(0, defender.plating - ap);
        platingMitigated = Math.min(netHits, effectivePlating);

        if (wasmBridge) {
          const mitRes = await wasmBridge.dispatchOp(
            'subtract',
            netHits,
            effectivePlating,
            `${defender.callsign} Plating (${effectivePlating})`
          );
          finalDamage = Math.max(0, mitRes.value);
          wireTrace.push(mitRes.wireTrace);
        } else {
          finalDamage = Math.max(0, netHits - effectivePlating);
        }

        const effectiveResilience = Math.max(0, defender.resilience - Math.max(0, ap - defender.plating));
        if (effectiveResilience > 0 && finalDamage > 0) {
          for (let i = 0; i < finalDamage; i++) {
            const r = Math.floor(Math.random() * 6) + 1;
            resilienceRolls.push(r);
            if (r >= 6) resilienceSaved++;
          }
          finalDamage = Math.max(0, finalDamage - resilienceSaved);
        }
      }

      if (isMelee) soundFX.playMeleeImpact();
      else soundFX.playLaserFire();

      const triggersExecutioner =
        netHits >= 3 && attacker.lockedHardpoints.includes('hp-lethal-execution');

      const { updated: updatedDefender, note: dmgNote, neutralized } =
        await applyDamageToUnit(defender, finalDamage, wireTrace, triggersExecutioner);

      let arcBacklashNote = '';
      let attackerAccumulatedDmg = attacker.accumulatedDamage;
      if (attackerBoostSurge > 0 && CHASSIS_SPECS[defender.chassis].hasArcBacklash) {
        attackerAccumulatedDmg = Math.min(
          attacker.maxIntegrityPerModel,
          attacker.accumulatedDamage + attackerBoostSurge
        );
        arcBacklashNote = ` · Phase-Born Arc Backlash dealt ${attackerBoostSurge} feedback damage to ${attacker.name}!`;
      }

      const updatedAttacker: CompiledUnit = {
        ...attacker,
        accumulatedDamage: attackerAccumulatedDmg,
        currentSurge: Math.max(0, attacker.currentSurge - attackerBoostSurge),
        actionsRemaining: Math.max(0, attacker.actionsRemaining - 1),
        standardActionUsed: true,
        targetLockActive: false,
        kineticRamActive: false,
        harmonicBonusDice: 0,
      };

      if (finalDamage > 0 && attacker.lockedHardpoints.includes('hp-siphon') && updatedDefender.currentSurge > 0) {
        updatedDefender.currentSurge = Math.max(0, updatedDefender.currentSurge - 1);
        updatedAttacker.currentSurge = Math.min(
          updatedAttacker.maxSurge,
          updatedAttacker.currentSurge + 1
        );
      }

      if (neutralized && attacker.lockedHardpoints.includes('hp-dynamo-core')) {
        updatedAttacker.currentSurge = Math.min(
          updatedAttacker.maxSurge,
          updatedAttacker.currentSurge + 1
        );
      }

      if (neutralized) {
        if (defender.faction === 'WardenDirective') {
          const vpGain = defender.echelon >= 3 ? (scenario.number === 6 ? 6 : 2) : 1;
          setPlayerVp((v) => v + vpGain);
          if (attacker.lockedHardpoints.includes('hp-bounty-tracker') && defender.echelon >= 2) {
            setSessionAlloy((a) => a + 2);
          }
          if (scenario.number === 6 && defender.echelon >= 3) {
            setSessionAlloy((a) => a + 4);
          }
        } else {
          setWardenVp((v) => v + 1);
        }
      }

      const absorbedCount = platingMitigated + resilienceSaved;
      const breakdown: CombatRollBreakdown = {
        id: `cbt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        attackerName: attacker.name,
        defenderName: defender.name,
        actionLabel: isMelee
          ? attacker.chargedThisTurn
            ? 'Momentum Charge Assault'
            : 'Close-Quarters Strike'
          : `Ranged Fire (${dist}")`,
        attackerDice,
        defenderDice,
        attackerSurgeSpent: attackerBoostSurge,
        defenderSurgeSpent: defBoost,
        coverBonus,
        rawAttackerHits: rawAtkHits,
        rawDefenderHits: rawDefHits,
        netHits,
        platingMitigated,
        resilienceRolls,
        resilienceSaved,
        finalDamage,
        outcomeSummary:
          netHits === 0
            ? `${defender.name} evaded ${attacker.name}'s fire (${rawAtkHits} accuracy vs ${rawDefHits} defense).${arcBacklashNote}`
            : `${attacker.name} connected with ${netHits} net impact(s)${absorbedCount > 0 ? ` (${absorbedCount} absorbed by armor)` : ''} → ${finalDamage} Final Damage! ${dmgNote}${arcBacklashNote}`,
        wasmWireTrace: wireTrace,
      };

      setCombatLogs((prev) => [breakdown, ...prev.slice(0, 19)]);
      setBattleBanner(breakdown.outcomeSummary);

      enqueueAnimationEvent({
        clipId: isMelee ? 'CLIP-05-MELEE-CLEAVE' : 'CLIP-04-RANGED-TRACER',
        durationMs: isMelee ? 360 : 380,
        fromX: attacker.gridX,
        fromY: attacker.gridY,
        toX: defender.gridX,
        toY: defender.gridY,
        unitId: attacker.id,
        targetUnitId: defender.id,
        doctrine: attacker.doctrine,
        chassis: attacker.chassis,
        isCritical: triggersExecutioner || attackerDice.some((d) => d === 6),
        damageDealt: finalDamage,
        calloutText:
          netHits === 0
            ? 'EVADED · 0 DMG'
            : `-${finalDamage} HP · ${netHits} HIT${netHits > 1 ? 'S' : ''}`,
      });

      return currentUnits.map((u) => {
        if (u.id === updatedAttacker.id) return updatedAttacker;
        if (u.id === updatedDefender.id) {
          return {
            ...updatedDefender,
            currentSurge: Math.max(0, updatedDefender.currentSurge - defBoost),
            deflectorActive: false,
          };
        }
        return u;
      });
    },
    [terrain, wasmBridge, applyDamageToUnit, scenario.number, enqueueAnimationEvent]
  );

  // Autonomous Warden AI Execution when the Warden Garrison responds
  const executeWardenSlotTurn = useCallback(
    async (rolledSlotNumber: number, currentUnits: CompiledUnit[]): Promise<CompiledUnit[]> => {
      const readyWardens = currentUnits.filter(
        (u) =>
          u.faction === 'WardenDirective' &&
          u.modelsCurrent > 0 &&
          u.activationsRemainingThisRound > 0
      );
      if (readyWardens.length === 0) return currentUnits;

      let chosenWarden: CompiledUnit | undefined;
      for (let offset = 0; offset < 6; offset++) {
        const slotCandidate = ((rolledSlotNumber - 1 + offset) % 6) + 1;
        chosenWarden = readyWardens.find((w) => w.berthIndices.includes(slotCandidate));
        if (chosenWarden) break;
      }
      if (!chosenWarden) chosenWarden = readyWardens[0];

      const livingPlayers = currentUnits.filter(
        (u) => u.faction === 'StrikeRoster' && u.modelsCurrent > 0
      );
      if (livingPlayers.length === 0) return currentUnits;

      let targetPlayer = livingPlayers[0];
      if (chosenWarden.doctrine === 'Outrider') {
        targetPlayer = [...livingPlayers].sort((a, b) => a.eva - b.eva)[0];
      } else if (chosenWarden.doctrine === 'Saboteur') {
        targetPlayer = [...livingPlayers].sort((a, b) => b.currentSurge - a.currentSurge)[0];
      } else {
        targetPlayer = [...livingPlayers].sort(
          (a, b) =>
            distInches(chosenWarden!.gridX, chosenWarden!.gridY, a.gridX, a.gridY) -
            distInches(chosenWarden!.gridX, chosenWarden!.gridY, b.gridX, b.gridY)
        )[0];
      }

      let nextX = chosenWarden.gridX;
      let nextY = chosenWarden.gridY;
      const curDist = distInches(nextX, nextY, targetPlayer.gridX, targetPlayer.gridY);
      const maxRange = chosenWarden.rangedRange > 0 ? chosenWarden.rangedRange : 2;

      if (curDist > maxRange) {
        const maxCells = Math.max(1, Math.floor(chosenWarden.mov / 2));
        const dx = Math.sign(targetPlayer.gridX - nextX);
        const dy = Math.sign(targetPlayer.gridY - nextY);
        for (let step = 0; step < maxCells; step++) {
          const candX = Math.max(0, Math.min(GRID_SIZE - 1, nextX + dx));
          const candY = Math.max(0, Math.min(GRID_SIZE - 1, nextY + dy));
          const blocked =
            terrain.some((t) => t.x === candX && t.y === candY && t.kind === 'Bulkhead') ||
            currentUnits.some(
              (u) => u.modelsCurrent > 0 && u.gridX === candX && u.gridY === candY
            );
          if (!blocked) {
            nextX = candX;
            nextY = candY;
          }
          if (distInches(nextX, nextY, targetPlayer.gridX, targetPlayer.gridY) <= maxRange) {
            break;
          }
        }
      }

      const movedDist = distInches(chosenWarden.gridX, chosenWarden.gridY, nextX, nextY);
      const newDistToTarget = distInches(nextX, nextY, targetPlayer.gridX, targetPlayer.gridY);
      const charged = movedDist >= 4 && newDistToTarget <= 2;

      if (movedDist > 0) {
        setLastVector({
          fromX: chosenWarden.gridX,
          fromY: chosenWarden.gridY,
          toX: nextX,
          toY: nextY,
          kind: 'MOVE',
        });
        enqueueAnimationEvent({
          clipId: charged ? 'CLIP-03-MOMENTUM-CHARGE' : 'CLIP-02-STRIDE-STEP',
          durationMs: charged ? 540 : 420,
          fromX: chosenWarden.gridX,
          fromY: chosenWarden.gridY,
          toX: nextX,
          toY: nextY,
          unitId: chosenWarden.id,
          doctrine: chosenWarden.doctrine,
          chassis: chosenWarden.chassis,
          calloutText: charged ? 'WARDEN CHARGE!' : undefined,
        });
      }

      const updatedWardenAfterMove: CompiledUnit = {
        ...chosenWarden,
        gridX: nextX,
        gridY: nextY,
        chargedThisTurn: charged,
        activationsRemainingThisRound: chosenWarden.activationsRemainingThisRound - 1,
        activatedThisRound: chosenWarden.activationsRemainingThisRound - 1 <= 0,
      };

      let nextList = currentUnits.map((u) =>
        u.id === updatedWardenAfterMove.id ? updatedWardenAfterMove : u
      );

      if (newDistToTarget <= 2) {
        const boost = Math.min(1, updatedWardenAfterMove.currentSurge);
        nextList = await executeOpposedCombat(
          updatedWardenAfterMove,
          targetPlayer,
          true,
          boost,
          nextList
        );
      } else if (
        updatedWardenAfterMove.rangedRange > 0 &&
        newDistToTarget <= updatedWardenAfterMove.rangedRange &&
        hasLineOfSight(nextX, nextY, targetPlayer.gridX, targetPlayer.gridY, terrain)
      ) {
        const boost = Math.min(1, updatedWardenAfterMove.currentSurge);
        nextList = await executeOpposedCombat(
          updatedWardenAfterMove,
          targetPlayer,
          false,
          boost,
          nextList
        );
      } else {
        setBattleBanner(
          `Warden Custodian Response — ${chosenWarden.name} (${chosenWarden.doctrine}) advanced to sector (${nextX}, ${nextY}).`
        );
      }

      return nextList;
    },
    [terrain, executeOpposedCombat, enqueueAnimationEvent]
  );

  // Finalize Mission, compute Survivor XP & Taken Out Trauma ("Zero-Stat Death" Rule)
  const finalizeMission = useCallback(
    async (
      finalPlayerVp: number,
      finalWardenVp: number,
      finalUnits: CompiledUnit[]
    ) => {
      setLastBoundaryContractId('ctr-socket-unlock');
      let bonusEndVp = 0;
      if (
        scenario.number === 1 &&
        objectives.filter((o) => o.claimedBy === 'StrikeRoster').length >= 3
      ) {
        bonusEndVp = 2;
      }
      const totalPlayerVp = finalPlayerVp + bonusEndVp;
      const victory = totalPlayerVp >= finalWardenVp && totalPlayerVp >= 4;
      const traumaNotes: string[] = [];
      const updatedRoster: CompiledUnit[] = [];

      for (const baseUnit of campaign.roster) {
        const battleInstance = finalUnits.find((u) => u.id === baseUnit.id);
        if (!battleInstance || battleInstance.modelsCurrent > 0) {
          const bonusXp =
            victory &&
            ((threatLevel === 'Medium' && baseUnit.echelon >= 3) || threatLevel === 'High')
              ? 1
              : 0;
          updatedRoster.push({
            ...baseUnit,
            accumulatedDamage: 0,
            xp: baseUnit.xp + 1 + bonusXp,
          });
        } else {
          const traumaRoll = Math.floor(Math.random() * 6) + 1;
          const nextPen = { ...baseUnit.penalties };
          let statName = 'Firepower';
          if (traumaRoll <= 2) {
            nextPen.fpr += 1;
            statName = 'Firepower';
          } else if (traumaRoll <= 4) {
            nextPen.eva += 1;
            statName = 'Evasion';
          } else {
            nextPen.cog += 1;
            statName = 'Systems';
          }

          const newFpr = baseUnit.fpr - (traumaRoll <= 2 ? 1 : 0);
          const newEva = baseUnit.eva - (traumaRoll >= 3 && traumaRoll <= 4 ? 1 : 0);
          const newCog = baseUnit.cog - (traumaRoll >= 5 ? 1 : 0);

          if (newFpr <= 0 || newEva <= 0 || newCog <= 0) {
            traumaNotes.push(
              `${baseUnit.name} sustained fatal trauma (${statName} reduced to 0) → Fallen in Action!`
            );
          } else {
            traumaNotes.push(
              `${baseUnit.name} was evacuated under fire → Sustained permanent -1 ${statName} Trauma.`
            );
            updatedRoster.push({
              ...baseUnit,
              fpr: newFpr,
              eva: newEva,
              cog: newCog,
              accumulatedDamage: 0,
              penalties: nextPen,
            });
          }
        }
      }

      const threatBonusAlloy =
        victory ? (threatLevel === 'High' ? 4 : threatLevel === 'Medium' ? 2 : 0) : 0;
      const totalAlloyEarned = sessionAlloy + threatBonusAlloy;

      soundFX.playVictoryFanfare();
      setTurnAuthority('MISSION_OVER');
      setMissionReport({
        victory,
        summary: victory
          ? `Operation Accomplished (${totalPlayerVp} VP vs ${finalWardenVp} VP) · +${totalAlloyEarned} Zero-Point Alloy Extracted`
          : `Emergency Extraction (${totalPlayerVp} VP vs ${finalWardenVp} VP) · +${totalAlloyEarned} Zero-Point Alloy Salvaged`,
        traumaNotes,
        updatedRoster,
      });
    },
    [campaign.roster, threatLevel, sessionAlloy, scenario.number, objectives]
  );

  // Advance to next Tactical Turn in the Round Queue
  const handleDrawCommandChit = useCallback(async () => {
    if (chitPool.length === 0) return;
    setLastBoundaryContractId('ctr-chit-step');
    soundFX.playChitDraw();

    const randIdx = Math.floor(Math.random() * chitPool.length);
    const drawn = chitPool[randIdx];
    const remainingPool = chitPool.filter((_, idx) => idx !== randIdx);

    if (drawn.kind === 'STRIKE') {
      const unactivatedPlayers = units.filter(
        (u) =>
          u.faction === 'StrikeRoster' &&
          u.modelsCurrent > 0 &&
          !u.activatedThisRound
      );
      setChitPool(remainingPool);
      if (unactivatedPlayers.length > 0) {
        let readyUnit = unactivatedPlayers[0];
        let traumaNote = '';

        if (readyUnit.criticalTrauma && !CHASSIS_SPECS[readyUnit.chassis].isMechanical) {
          const cogPool = readyUnit.cog + (readyUnit.chassis === 'Spliced' ? 1 : 0);
          let successes = 0;
          for (let i = 0; i < cogPool; i++) {
            if (Math.floor(Math.random() * 6) + 1 >= 4) successes++;
          }
          if (successes >= 2) {
            readyUnit = { ...readyUnit, criticalTrauma: false, staggered: true };
            setUnits((prev) => prev.map((u) => (u.id === readyUnit.id ? readyUnit : u)));
            traumaNote = ` (Bio-stabilizers engaged → recovered from Critical Trauma to Staggered!)`;
          } else {
            traumaNote = ` (Critical Trauma persists — movement restricted!)`;
          }
        }

        setTurnAuthority('PLAYER_TURN');
        setSelectedUnitId(readyUnit.id);
        setActionMode('MOVE');
        enqueueAnimationEvent({
          clipId: 'CLIP-07-CHIT-DRAW',
          durationMs: 450,
          fromX: readyUnit.gridX,
          fromY: readyUnit.gridY,
          toX: readyUnit.gridX,
          toY: readyUnit.gridY,
          unitId: readyUnit.id,
          doctrine: readyUnit.doctrine,
          chassis: readyUnit.chassis,
          calloutText: `STRIKE CHIT · ${readyUnit.callsign}`,
        });
        setBattleBanner(
          `OPERATIVE ONLINE: ${readyUnit.name} (${readyUnit.actionsRemaining} Actions)${traumaNote}. Click green sectors to Move, red Wardens to Engage, or golden Caches to Extract.`
        );
      } else {
        setBattleBanner('All friendly operatives have completed their turns this round.');
      }
      return;
    }

    const d6Roll = Math.floor(Math.random() * 6) + 1;
    const updatedUnits = await executeWardenSlotTurn(d6Roll, units);
    const wardenFocus =
      updatedUnits.find(
        (u) => u.faction === 'WardenDirective' && u.berthIndices.includes(d6Roll)
      ) ??
      updatedUnits.find((u) => u.faction === 'WardenDirective' && u.modelsCurrent > 0);
    if (wardenFocus) {
      enqueueAnimationEvent({
        clipId: 'CLIP-07-CHIT-DRAW',
        durationMs: 450,
        fromX: wardenFocus.gridX,
        fromY: wardenFocus.gridY,
        toX: wardenFocus.gridX,
        toY: wardenFocus.gridY,
        unitId: wardenFocus.id,
        berthSlot: d6Roll,
        calloutText: `WARDEN 1d6 → BERTH #${d6Roll}`,
      });
    }
    setUnits(updatedUnits);

    const anyWardensRemaining = updatedUnits.some(
      (u) =>
        u.faction === 'WardenDirective' &&
        u.modelsCurrent > 0 &&
        u.activationsRemainingThisRound > 0
    );
    if (anyWardensRemaining) {
      setChitPool([
        ...remainingPool,
        {
          id: `chit-warden-${Date.now()}`,
          kind: 'WARDEN',
          label: 'Warden Custodian Response',
        },
      ]);
    } else {
      setChitPool(remainingPool);
    }
    setTurnAuthority('AWAITING_CHIT');
  }, [chitPool, units, executeWardenSlotTurn, enqueueAnimationEvent]);

  // Advance to Next Round (or End Mission after Round 5)
  const handleAdvanceRound = useCallback(async () => {
    let roundBonusVp = 0;
    if (scenario.number === 3 || scenario.number === 5) {
      const playersNearCenter = units.filter(
        (u) =>
          u.faction === 'StrikeRoster' &&
          u.modelsCurrent > 0 &&
          distInches(u.gridX, u.gridY, 8, 8) <= 4
      ).length;
      const wardensNearCenter = units.filter(
        (u) =>
          u.faction === 'WardenDirective' &&
          u.modelsCurrent > 0 &&
          distInches(u.gridX, u.gridY, 8, 8) <= 4
      ).length;
      if (playersNearCenter > wardensNearCenter) {
        roundBonusVp += scenario.number === 5 && round >= 2 ? 2 : 1;
      }
    }
    const nextPlayerVp = playerVp + roundBonusVp;
    if (roundBonusVp > 0) setPlayerVp(nextPlayerVp);

    if (round >= 5) {
      await finalizeMission(nextPlayerVp, wardenVp, units);
      return;
    }

    const nextRound = round + 1;
    const hazardNotes: string[] = [];
    const refreshedUnits = units.map((u) => {
      if (u.modelsCurrent <= 0) return u;
      let nextDmg = u.accumulatedDamage;
      const standingOnHazard = terrain.some(
        (t) => t.x === u.gridX && t.y === u.gridY && t.kind === 'PlasmaHazard'
      );
      if (standingOnHazard) {
        const evaRoll = Math.floor(Math.random() * 6) + 1;
        if (evaRoll < 4) {
          nextDmg = Math.min(u.maxIntegrityPerModel, u.accumulatedDamage + 1);
          hazardNotes.push(`${u.callsign} suffered 1 Plasma Hazard burn`);
        }
      }
      return {
        ...u,
        accumulatedDamage: nextDmg,
        currentSurge: u.maxSurge,
        actionsRemaining: 2,
        standardActionUsed: false,
        movedThisTurn: false,
        chargedThisTurn: false,
        activatedThisRound: false,
        activationsRemainingThisRound:
          u.faction === 'WardenDirective' ? u.berthIndices.length : 1,
        deflectorActive: false,
        targetLockActive: false,
        kineticRamActive: false,
        harmonicBonusDice: 0,
      };
    });

    setRound(nextRound);
    setUnits(refreshedUnits);
    const freshPool = buildRoundChitPool(refreshedUnits);
    setChitPool(freshPool);
    setTurnAuthority('AWAITING_CHIT');
    soundFX.playSurgeSpend();
    const roundAtmo =
      narrative.roundAtmosphere[nextRound - 1] ??
      `Round ${nextRound} — Surge Capacitors recharged across all active frames.`;
    setBattleBanner(
      `${roundAtmo}${hazardNotes.length > 0 ? ` · ${hazardNotes.join(', ')}` : ''}`
    );
  }, [scenario.number, units, round, playerVp, wardenVp, terrain, finalizeMission, narrative.roundAtmosphere]);

  // Mechanized Engine Tick Effect: when autoDirector is enabled and turnAuthority is AWAITING_CHIT,
  // automatically draw the next chit or advance the round after a short tactical beat
  useEffect(() => {
    if (!autoDirector || turnAuthority !== 'AWAITING_CHIT') return;

    const timer = window.setTimeout(() => {
      if (chitPool.length > 0) {
        void handleDrawCommandChit();
      } else {
        void handleAdvanceRound();
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [autoDirector, turnAuthority, chitPool.length, handleDrawCommandChit, handleAdvanceRound]);

  // End Current Player Unit's Activation
  const handleFinishUnitActivation = useCallback(
    (unitId: string, currentList = units) => {
      const nextUnits = currentList.map((u) =>
        u.id === unitId
          ? {
              ...u,
              activatedThisRound: true,
              actionsRemaining: 0,
              chargedThisTurn: false,
            }
          : u
      );
      setUnits(nextUnits);
      setTurnAuthority('AWAITING_CHIT');
      setSurgeToSpend(0);
      setBattleBanner(
        autoDirector
          ? 'Operative activation complete — Tactical Coordinator routing next squad activation...'
          : 'Operative activation complete — Click "Next Unit Ready" or "Auto-Execute Step".'
      );
    },
    [units, autoDirector]
  );

  // Claim or Hack a specific Objective Marker (including Scenario 3 Triple-Stage Mainframe Siphon)
  const claimObjectiveTarget = useCallback(
    async (operative: CompiledUnit, targetObj: ObjectiveMarker, currentUnits = units) => {
      soundFX.playObjectiveClaim();
      let nextAlloy = sessionAlloy + targetObj.alloyValue;
      if (wasmBridge) {
        const r = await wasmBridge.dispatchOp(
          'add',
          sessionAlloy,
          targetObj.alloyValue,
          `Claim ${targetObj.name}`
        );
        nextAlloy = r.value;
      }
      setSessionAlloy(nextAlloy);

      // Scenario 3 CentralCore supports 3 progressive hacks (+5 VP bonus on 3rd hack)
      if (targetObj.kind === 'CentralCore') {
        const nextHackCount = (targetObj.hackCount ?? 0) + 1;
        const hackBonusVp = nextHackCount >= 3 ? targetObj.vpValue + 5 : targetObj.vpValue;
        setPlayerVp((v) => v + hackBonusVp);
        setObjectives((prev) =>
          prev.map((o) =>
            o.id === targetObj.id
              ? {
                  ...o,
                  hackCount: nextHackCount,
                  claimedBy: nextHackCount >= 3 ? 'StrikeRoster' : 'None',
                }
              : o
          )
        );
        const nextActions = operative.actionsRemaining - 1;
        const updated: CompiledUnit = {
          ...operative,
          standardActionUsed: true,
          actionsRemaining: nextActions,
          activatedThisRound: nextActions <= 0,
        };
        const nextList = currentUnits.map((u) => (u.id === updated.id ? updated : u));
        setUnits(nextList);
        setBattleBanner(
          `${operative.name} spliced into ${targetObj.name} (${nextHackCount}/3 Siphons · +${targetObj.alloyValue} Alloy, +${hackBonusVp} VP)!`
        );
        if (nextActions <= 0) handleFinishUnitActivation(updated.id, nextList);
        return;
      }

      setPlayerVp((v) => v + targetObj.vpValue);
      setObjectives((prev) =>
        prev.map((o) =>
          o.id === targetObj.id ? { ...o, claimedBy: 'StrikeRoster' } : o
        )
      );

      const nextActions = operative.actionsRemaining - 1;
      const updated: CompiledUnit = {
        ...operative,
        standardActionUsed: true,
        actionsRemaining: nextActions,
        activatedThisRound: nextActions <= 0,
      };
      const nextList = currentUnits.map((u) => (u.id === updated.id ? updated : u));
      setUnits(nextList);
      setBattleBanner(
        `${operative.name} secured ${targetObj.name} (+${targetObj.alloyValue} Karst-Alloy, +${targetObj.vpValue} VP)!`
      );
      if (nextActions <= 0) handleFinishUnitActivation(updated.id, nextList);
    },
    [units, sessionAlloy, wasmBridge, handleFinishUnitActivation]
  );

  // Full Section V Resonance Directive Weaver (handles Buff, Heal, Teleport, Attack + Opposed COG + Overheat Backlash)
  const executeResonanceDirective = useCallback(
    async (
      caster: CompiledUnit,
      directive: MinorResonanceDirective,
      targetX: number,
      targetY: number,
      targetUnit: CompiledUnit | undefined
    ) => {
      if (caster.currentSurge < directive.surgeCost) {
        setBattleBanner(`Requires ${directive.surgeCost} Surge Cell(s) to channel ${directive.name}.`);
        return;
      }

      soundFX.playResonanceCast();
      const wireTrace: string[] = [];

      // Check for Resonance Overheat / Backlash when spending >= 1 Surge
      const cogDice: number[] = [];
      const poolCount = caster.cog + directive.surgeCost;
      for (let i = 0; i < poolCount; i++) {
        cogDice.push(Math.floor(Math.random() * 6) + 1);
      }
      const naturalOnes = cogDice.filter((d) => d === 1).length;
      let backlashNote = '';
      let casterBacklashDmg = 0;
      let casterBacklashStagger = false;

      if (directive.surgeCost > 0 && naturalOnes >= 2) {
        const bRoll = Math.min(6, Math.floor(Math.random() * 6) + 1 + directive.surgeCost);
        const bEntry =
          RESONANCE_BACKLASH_TABLE[Math.min(RESONANCE_BACKLASH_TABLE.length - 1, bRoll - 1)];
        backlashNote = ` · ⚠ RESONANCE FEEDBACK (${bEntry.name}: ${bEntry.effect})`;
        if (bRoll >= 3) casterBacklashDmg = bRoll >= 6 ? 2 : 1;
        if (bRoll >= 4) casterBacklashStagger = true;
      }

      const nextActions = caster.actionsRemaining - 1;
      enqueueAnimationEvent({
        clipId: 'CLIP-06-RESONANCE-WAVE',
        durationMs: 680,
        fromX: caster.gridX,
        fromY: caster.gridY,
        toX: targetX,
        toY: targetY,
        unitId: caster.id,
        targetUnitId: targetUnit?.id,
        doctrine: caster.doctrine,
        chassis: caster.chassis,
        isBacklash: casterBacklashDmg > 0 || casterBacklashStagger,
        calloutText: directive.name.toUpperCase(),
      });
      const basePostCaster: CompiledUnit = {
        ...caster,
        accumulatedDamage: Math.min(
          caster.maxIntegrityPerModel,
          caster.accumulatedDamage + casterBacklashDmg
        ),
        staggered: caster.staggered || casterBacklashStagger,
        currentSurge: Math.max(0, caster.currentSurge - directive.surgeCost),
        standardActionUsed: true,
        actionsRemaining: nextActions,
        activatedThisRound: nextActions <= 0,
      };

      // 1. Teleport Directive (Fold-Space Blink)
      if (directive.kind === 'Teleport') {
        const dist = distInches(caster.gridX, caster.gridY, targetX, targetY);
        if (dist <= 8 && !targetUnit) {
          const updated = { ...basePostCaster, gridX: targetX, gridY: targetY };
          const nextList = units.map((u) => (u.id === updated.id ? updated : u));
          setUnits(nextList);
          setActionMode('MOVE');
          setBattleBanner(
            `${caster.name} channeled ${directive.name} → Phase-shifted to sector (${targetX * 2}", ${targetY * 2}")!${backlashNote}`
          );
          if (nextActions <= 0) handleFinishUnitActivation(updated.id, nextList);
        }
        return;
      }

      // 2. Buff Directive (Ferro-Carapace Weave / Chrono-Slip Overdrive)
      if (directive.kind === 'Buff') {
        const recipient =
          targetUnit && targetUnit.faction === 'StrikeRoster' ? targetUnit : basePostCaster;
        const buffedRecipient: CompiledUnit = {
          ...(recipient.id === basePostCaster.id ? basePostCaster : recipient),
          plating: recipient.plating + (directive.grantsPlating ?? 0),
          deflectorActive: directive.grantsPlating ? true : recipient.deflectorActive,
          mov: directive.bonusDice ? recipient.mov + 2 : recipient.mov,
          harmonicBonusDice: recipient.harmonicBonusDice + (directive.bonusDice ?? 0),
        };
        const nextList = units.map((u) => {
          if (u.id === buffedRecipient.id) return buffedRecipient;
          if (u.id === basePostCaster.id) return basePostCaster;
          return u;
        });
        setUnits(nextList);
        setActionMode('MOVE');
        setBattleBanner(
          `${caster.name} channeled ${directive.name} on ${buffedRecipient.name}!${backlashNote}`
        );
        if (nextActions <= 0) handleFinishUnitActivation(basePostCaster.id, nextList);
        return;
      }

      // 3. Heal Directive (Nanite Suture)
      if (directive.kind === 'Heal') {
        const recipient =
          targetUnit && targetUnit.faction === 'StrikeRoster' ? targetUnit : basePostCaster;
        const healedRecipient: CompiledUnit = {
          ...(recipient.id === basePostCaster.id ? basePostCaster : recipient),
          accumulatedDamage: Math.max(0, recipient.accumulatedDamage - (directive.healsIntegrity ?? 1)),
          staggered: false,
          criticalTrauma: false,
        };
        const nextList = units.map((u) => {
          if (u.id === healedRecipient.id) return healedRecipient;
          if (u.id === basePostCaster.id) return basePostCaster;
          return u;
        });
        setUnits(nextList);
        setActionMode('MOVE');
        setBattleBanner(
          `${caster.name} channeled ${directive.name} → Restored Integrity & cleared Staggered on ${healedRecipient.name}!${backlashNote}`
        );
        if (nextActions <= 0) handleFinishUnitActivation(basePostCaster.id, nextList);
        return;
      }

      // 4. Attack Directive (Plasma-Arc Lance, Magnetic Sunder, Synaptic Spike, Ferro-Kinetic Shove)
      if (targetUnit && directive.kind === 'Attack') {
        const isMechBonus =
          directive.id === 'res-arc-jolt' && CHASSIS_SPECS[targetUnit.chassis].isMechanical ? 1 : 0;
        const totalDmg = (directive.damage ?? 1) + isMechBonus;
        const { updated: postTarget, note, neutralized } = await applyDamageToUnit(
          targetUnit,
          totalDmg,
          wireTrace
        );
        if (directive.inflictsStaggered && !CHASSIS_SPECS[postTarget.chassis].isMechanical) {
          postTarget.staggered = true;
        }
        if (directive.id === 'res-sunder-hull') {
          postTarget.plating = Math.max(0, postTarget.plating - 1);
        }
        if (directive.pushSectors && postTarget.modelsCurrent > 0) {
          const pushDx = Math.sign(postTarget.gridX - caster.gridX);
          const pushDy = Math.sign(postTarget.gridY - caster.gridY);
          const pushedX = Math.max(0, Math.min(GRID_SIZE - 1, postTarget.gridX + pushDx));
          const pushedY = Math.max(0, Math.min(GRID_SIZE - 1, postTarget.gridY + pushDy));
          if (!terrain.some((t) => t.x === pushedX && t.y === pushedY && t.kind === 'Bulkhead')) {
            postTarget.gridX = pushedX;
            postTarget.gridY = pushedY;
          }
        }
        if (neutralized && targetUnit.faction === 'WardenDirective') {
          setPlayerVp((v) => v + (targetUnit.echelon >= 3 ? 2 : 1));
        }

        const nextList = units.map((u) =>
          u.id === basePostCaster.id
            ? basePostCaster
            : u.id === postTarget.id
            ? postTarget
            : u
        );
        setUnits(nextList);
        setActionMode('MOVE');
        setBattleBanner(
          `${caster.name} channeled ${directive.name} on ${targetUnit.name}! ${note}${backlashNote}`
        );
        if (nextActions <= 0) handleFinishUnitActivation(basePostCaster.id, nextList);
      }
    },
    [units, terrain, applyDamageToUnit, handleFinishUnitActivation, enqueueAnimationEvent]
  );

  // Unified Direct-Click Grid Interaction (Move, Charge, Claim Cache, Attack, or Resonance without manual tab-switching)
  const handleCellClick = async (x: number, y: number) => {
    if (turnAuthority !== 'PLAYER_TURN' || !selectedUnit || selectedUnit.activatedThisRound) {
      return;
    }

    const unitAtCell = units.find(
      (u) => u.modelsCurrent > 0 && u.gridX === x && u.gridY === y
    );
    const unclaimedObjAtCell = objectives.find(
      (o) => o.claimedBy === 'None' && o.x === x && o.y === y
    );

    // 1. Cast Minor Resonance Directive when in RESONANCE mode
    if (
      actionMode === 'RESONANCE' &&
      !selectedUnit.standardActionUsed &&
      selectedUnit.actionsRemaining > 0
    ) {
      const directive = MINOR_RESONANCE_DIRECTIVES.find((d) => d.id === selectedDirectiveId);
      if (directive) {
        await executeResonanceDirective(selectedUnit, directive, x, y, unitAtCell);
      }
      return;
    }

    // 2. Direct Click on Hostile Warden → Attack immediately (works from MOVE or ATTACK mode!)
    if (
      unitAtCell &&
      unitAtCell.faction === 'WardenDirective' &&
      !selectedUnit.standardActionUsed &&
      selectedUnit.actionsRemaining > 0
    ) {
      const dist = distInches(selectedUnit.gridX, selectedUnit.gridY, x, y);
      const isMelee = dist <= 2;
      const maxReach = isMelee
        ? 2
        : selectedUnit.rangedRange + (selectedUnit.targetLockActive ? 6 : 0);

      if (dist > maxReach) {
        setBattleBanner(
          `Target out of weapon reach (${dist}" away; max reach ${maxReach}"). Click an emerald cell to advance closer first.`
        );
        return;
      }
      if (!isMelee && !hasLineOfSight(selectedUnit.gridX, selectedUnit.gridY, x, y, terrain)) {
        setBattleBanner('Line of Sight blocked by Reinforced Bulkhead!');
        return;
      }

      const nextList = await executeOpposedCombat(
        selectedUnit,
        unitAtCell,
        isMelee,
        surgeToSpend,
        units
      );
      setSurgeToSpend(0);

      const postAttacker = nextList.find((u) => u.id === selectedUnit.id);
      if (!postAttacker || postAttacker.actionsRemaining <= 0) {
        handleFinishUnitActivation(selectedUnit.id, nextList);
      } else {
        setUnits(nextList);
      }
      return;
    }

    // 3. Direct Click on an Unclaimed Objective Cache within Interaction Range → Claim immediately!
    const hasRemoteLink = selectedUnit.lockedHardpoints.includes('hp-remote-telemetry');
    const maxInteractDist = hasRemoteLink ? 6 : 2;
    if (
      unclaimedObjAtCell &&
      !selectedUnit.standardActionUsed &&
      selectedUnit.actionsRemaining > 0 &&
      distInches(selectedUnit.gridX, selectedUnit.gridY, x, y) <= maxInteractDist
    ) {
      await claimObjectiveTarget(selectedUnit, unclaimedObjAtCell, units);
      return;
    }

    // 4. Direct Click on a Valid Movement Cell → Move or Momentum Charge!
    if (validMoveCells.has(`${x},${y}`)) {
      const moveInfo = validMoveCells.get(`${x},${y}`)!;
      soundFX.playMoveStep();
      setLastVector({
        fromX: selectedUnit.gridX,
        fromY: selectedUnit.gridY,
        toX: x,
        toY: y,
        kind: 'MOVE',
      });
      enqueueAnimationEvent({
        clipId: moveInfo.isChargeEligible
          ? 'CLIP-03-MOMENTUM-CHARGE'
          : 'CLIP-02-STRIDE-STEP',
        durationMs: moveInfo.isChargeEligible ? 540 : 420,
        fromX: selectedUnit.gridX,
        fromY: selectedUnit.gridY,
        toX: x,
        toY: y,
        unitId: selectedUnit.id,
        doctrine: selectedUnit.doctrine,
        chassis: selectedUnit.chassis,
        calloutText: moveInfo.isChargeEligible ? 'MOMENTUM CHARGE!' : undefined,
      });

      const extractedOnNorthEdge = scenario.number === 2 && y === 0;
      if (extractedOnNorthEdge) {
        const vpGain = selectedUnit.berthIndices.length * 3;
        setPlayerVp((v) => v + vpGain);
      }

      const nextActions = selectedUnit.actionsRemaining - 1;
      const updatedUnit: CompiledUnit = {
        ...selectedUnit,
        gridX: x,
        gridY: y,
        movedThisTurn: true,
        chargedThisTurn: moveInfo.isChargeEligible,
        actionsRemaining: nextActions,
        activatedThisRound: nextActions <= 0,
      };

      const nextList = units.map((u) => (u.id === updatedUnit.id ? updatedUnit : u));
      setUnits(nextList);

      if (moveInfo.isChargeEligible) {
        setActionMode('ATTACK');
        setBattleBanner(
          `${selectedUnit.name} executed a ${moveInfo.dist}" Momentum Charge! Click the adjacent red Warden for a high-impact Melee Strike.`
        );
      } else if (nextActions <= 0) {
        handleFinishUnitActivation(updatedUnit.id, nextList);
      } else {
        setBattleBanner(
          `${selectedUnit.name} repositioned ${moveInfo.dist}" to sector (${x * 2}", ${y * 2}"). ${nextActions} Action remaining — click a red Warden to fire or a golden Cache to secure.`
        );
      }
    }
  };

  // Mechanized Co-Pilot / Tactical Step for Player Turn: Executes 1 smart tactical step for the selected friendly unit
  const handleExecuteCoPilotStep = async () => {
    if (turnAuthority === 'AWAITING_CHIT') {
      if (chitPool.length > 0) {
        await handleDrawCommandChit();
      } else {
        await handleAdvanceRound();
      }
      return;
    }

    if (turnAuthority !== 'PLAYER_TURN') return;
    const activeOperative =
      selectedUnit && !selectedUnit.activatedThisRound
        ? selectedUnit
        : units.find(
            (u) =>
              u.faction === 'StrikeRoster' &&
              u.modelsCurrent > 0 &&
              !u.activatedThisRound
          ) ?? null;

    if (!activeOperative) {
      setTurnAuthority('AWAITING_CHIT');
      return;
    }

    setSelectedUnitId(activeOperative.id);

    // 1. If adjacent to an unclaimed Objective Cache and Standard Action available, claim it!
    const hasRemoteLink = activeOperative.lockedHardpoints.includes('hp-remote-telemetry');
    const maxInteractDist = hasRemoteLink ? 6 : 2;
    const nearbyCache = objectives.find(
      (o) =>
        o.claimedBy === 'None' &&
        distInches(activeOperative.gridX, activeOperative.gridY, o.x, o.y) <= maxInteractDist
    );
    if (nearbyCache && !activeOperative.standardActionUsed && activeOperative.actionsRemaining > 0) {
      await claimObjectiveTarget(activeOperative, nearbyCache, units);
      return;
    }

    // 2. If a hostile Warden is in weapon range & LoS and Standard Action available, attack!
    const hostiles = units.filter(
      (u) => u.faction === 'WardenDirective' && u.modelsCurrent > 0
    );
    if (!activeOperative.standardActionUsed && activeOperative.actionsRemaining > 0) {
      const targetInSight = hostiles
        .filter((h) => {
          const d = distInches(activeOperative.gridX, activeOperative.gridY, h.gridX, h.gridY);
          const isMelee = d <= 2;
          const reach = isMelee
            ? 2
            : activeOperative.rangedRange + (activeOperative.targetLockActive ? 6 : 0);
          return (
            d <= reach &&
            (isMelee ||
              hasLineOfSight(activeOperative.gridX, activeOperative.gridY, h.gridX, h.gridY, terrain))
          );
        })
        .sort(
          (a, b) =>
            distInches(activeOperative.gridX, activeOperative.gridY, a.gridX, a.gridY) -
            distInches(activeOperative.gridX, activeOperative.gridY, b.gridX, b.gridY)
        )[0];

      if (targetInSight) {
        const d = distInches(
          activeOperative.gridX,
          activeOperative.gridY,
          targetInSight.gridX,
          targetInSight.gridY
        );
        const autoSurge = Math.min(1, activeOperative.currentSurge);
        const nextList = await executeOpposedCombat(
          activeOperative,
          targetInSight,
          d <= 2,
          autoSurge,
          units
        );
        const postAttacker = nextList.find((u) => u.id === activeOperative.id);
        if (!postAttacker || postAttacker.actionsRemaining <= 0) {
          handleFinishUnitActivation(activeOperative.id, nextList);
        } else {
          setUnits(nextList);
        }
        return;
      }
    }

    // 3. Otherwise advance toward nearest unclaimed Objective Cache or nearest Hostile Warden
    const unclaimedObjs = objectives.filter((o) => o.claimedBy === 'None');
    const goalX =
      unclaimedObjs.length > 0
        ? unclaimedObjs[0].x
        : hostiles.length > 0
        ? hostiles[0].gridX
        : 8;
    const goalY =
      unclaimedObjs.length > 0
        ? unclaimedObjs[0].y
        : hostiles.length > 0
        ? hostiles[0].gridY
        : 4;

    let bestCell: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (const [key] of validMoveCells.entries()) {
      const [cx, cy] = key.split(',').map(Number);
      const d = distInches(cx, cy, goalX, goalY);
      if (d < bestDist) {
        bestDist = d;
        bestCell = { x: cx, y: cy };
      }
    }

    if (bestCell) {
      await handleCellClick(bestCell.x, bestCell.y);
    } else {
      handleFinishUnitActivation(activeOperative.id, units);
    }
  };

  // Standard Action: Defend (Refresh Surge Pool to Maximum)
  const handleDefendAction = () => {
    if (!selectedUnit || selectedUnit.standardActionUsed || selectedUnit.actionsRemaining <= 0) return;
    soundFX.playSurgeSpend();
    const nextActions = selectedUnit.actionsRemaining - 1;
    const updated: CompiledUnit = {
      ...selectedUnit,
      currentSurge: selectedUnit.maxSurge,
      deflectorActive: true,
      standardActionUsed: true,
      actionsRemaining: nextActions,
      activatedThisRound: nextActions <= 0,
    };
    const nextList = units.map((u) => (u.id === updated.id ? updated : u));
    setUnits(nextList);
    setBattleBanner(
      `${selectedUnit.name} braced in Defensive Stance — Surge Cells recharged to ${selectedUnit.maxSurge} and Deflector Field active!`
    );
    if (nextActions <= 0) handleFinishUnitActivation(updated.id, nextList);
  };

  // Movement Action: Recover from Staggered
  const handleRecoverStaggered = () => {
    if (!selectedUnit || !selectedUnit.staggered || selectedUnit.actionsRemaining <= 0) return;
    soundFX.playSurgeSpend();
    const nextActions = selectedUnit.actionsRemaining - 1;
    const updated: CompiledUnit = {
      ...selectedUnit,
      staggered: false,
      criticalTrauma: false,
      actionsRemaining: nextActions,
      activatedThisRound: nextActions <= 0,
    };
    const nextList = units.map((u) => (u.id === updated.id ? updated : u));
    setUnits(nextList);
    setBattleBanner(`${selectedUnit.name} recalibrated suit stabilizers and cleared Staggered shock.`);
    if (nextActions <= 0) handleFinishUnitActivation(updated.id, nextList);
  };

  // Standard Action: Interact with adjacent Objective Cache / Central Core
  const handleInteractObjective = async () => {
    if (!selectedUnit || selectedUnit.standardActionUsed || selectedUnit.actionsRemaining <= 0) return;
    const hasRemoteLink = selectedUnit.lockedHardpoints.includes('hp-remote-telemetry');
    const maxInteractDist = hasRemoteLink ? 6 : 2;

    const targetObj = objectives.find(
      (obj) =>
        obj.claimedBy === 'None' &&
        distInches(selectedUnit.gridX, selectedUnit.gridY, obj.x, obj.y) <= maxInteractDist
    );
    if (!targetObj) {
      setBattleBanner(
        `No unsecured Objective Marker within ${maxInteractDist}" of ${selectedUnit.name}.`
      );
      return;
    }

    await claimObjectiveTarget(selectedUnit, targetObj, units);
  };

  // Spend 1 Surge on Role Doctrine Trigger
  const handleDoctrineSurgeTrigger = () => {
    if (!selectedUnit || selectedUnit.currentSurge < 1) return;
    soundFX.playSurgeSpend();
    const doc = DOCTRINE_SPECS[selectedUnit.doctrine];
    const updated: CompiledUnit = {
      ...selectedUnit,
      currentSurge: selectedUnit.currentSurge - 1,
      deflectorActive: selectedUnit.doctrine === 'Aegis' ? true : selectedUnit.deflectorActive,
      targetLockActive: selectedUnit.doctrine === 'Deadeye' ? true : selectedUnit.targetLockActive,
      kineticRamActive: selectedUnit.doctrine === 'Breacher' ? true : selectedUnit.kineticRamActive,
      harmonicBonusDice:
        selectedUnit.doctrine === 'Psion'
          ? selectedUnit.harmonicBonusDice + 1
          : selectedUnit.harmonicBonusDice,
      mov: selectedUnit.doctrine === 'Outrider' ? selectedUnit.mov + 2 : selectedUnit.mov,
    };
    setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setBattleBanner(
      `${selectedUnit.name} triggered ${doc.surgeTriggerName}: ${doc.surgeTriggerDescription}`
    );
  };

  // Free Action: Use Field Stim (+2 HP & Clear Staggered)
  const handleUseFieldStim = () => {
    if (!selectedUnit || fieldStimsRemaining <= 0) return;
    soundFX.playSurgeSpend();
    setFieldStimsRemaining((c) => c - 1);
    const updated: CompiledUnit = {
      ...selectedUnit,
      accumulatedDamage: Math.max(0, selectedUnit.accumulatedDamage - 2),
      staggered: false,
      criticalTrauma: false,
    };
    setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setBattleBanner(
      `${selectedUnit.name} injected a Field Stim — restored +2 Integrity/Hull and cleared Staggered shock!`
    );
  };

  // Free Action: Spend Tactical Prep Token (+2 Surge Cells)
  const handleUsePrepToken = () => {
    if (!selectedUnit || prepTokensRemaining <= 0) return;
    soundFX.playSurgeSpend();
    setPrepTokensRemaining((p) => p - 1);
    const updated: CompiledUnit = {
      ...selectedUnit,
      currentSurge: Math.min(selectedUnit.maxSurge + 1, selectedUnit.currentSurge + 2),
    };
    setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setBattleBanner(
      `${selectedUnit.name} tapped a Recon Telemetry Relay — gained +2 Surge Cells for this activation!`
    );
  };

  const advisorStepText = useMemo(() => {
    if (turnAuthority === 'AWAITING_CHIT') {
      const strikeLeft = chitPool.filter((c) => c.kind === 'STRIKE').length;
      if (autoDirector) {
        return `Tactical Pacing Active — coordinating next unit activation (${strikeLeft} Strike Operatives awaiting orders this round).`;
      }
      if (chitPool.length === 0) {
        return 'All units have acted this round. Click "Next Round" or "Auto-Execute Step" to recharge Capacitor Surge Cells and advance.';
      }
      return `Manual Pacing: Click "Next Unit Ready (${chitPool.length})" or "Auto-Execute Step" to activate the next unit on the field.`;
    }
    if (turnAuthority === 'PLAYER_TURN') {
      if (!selectedUnit || selectedUnit.activatedThisRound) {
        return 'Select any ready emerald Strike Operative on the sector grid or squad bar below to issue their 2 Combat Actions.';
      }
      if (actionMode === 'RESONANCE') {
        return `${selectedUnit.name} (${selectedUnit.actionsRemaining} Actions left) — Resonance Channeling: Pick a Directive on the right and click a target sector/unit within range.`;
      }
      return `${selectedUnit.name} (${selectedUnit.actionsRemaining} Actions left) — Click any emerald cell to Move, amber cell to Momentum Charge, red Warden to Fire, or golden Cache to Claim (or press "Auto-Execute Step").`;
    }
    return 'Sector operation concluded — review the After-Action Debrief.';
  }, [turnAuthority, chitPool, selectedUnit, actionMode, autoDirector]);

  const selectedBio = useMemo(() => {
    if (!selectedUnit) return null;
    return getOperativeBio(selectedUnit.name, selectedUnit.doctrine, selectedUnit.chassis);
  }, [selectedUnit]);

  const selectedQuote = useMemo(() => {
    if (!selectedUnit) return '';
    return getOperativeSelectionQuote(selectedUnit.name, selectedUnit.doctrine);
  }, [selectedUnit]);

  // Active or Hovered Gameboard Tile Inspector Data
  const inspectedTileInfo = useMemo(() => {
    const targetX = hoveredCell?.x ?? selectedUnit?.gridX ?? 8;
    const targetY = hoveredCell?.y ?? selectedUnit?.gridY ?? 15;
    const cellKey = `${targetX},${targetY}`;

    const unitAtTile = units.find(
      (u) => u.modelsCurrent > 0 && u.gridX === targetX && u.gridY === targetY
    );
    const objAtTile = objectives.find(
      (o) => o.claimedBy === 'None' && o.x === targetX && o.y === targetY
    );
    const terrainAtTile = terrain.find((t) => t.x === targetX && t.y === targetY);
    const moveOption = validMoveCells.get(cellKey);

    const distFromActive = selectedUnit
      ? distInches(selectedUnit.gridX, selectedUnit.gridY, targetX, targetY)
      : 0;
    const hasLosFromActive = selectedUnit
      ? hasLineOfSight(selectedUnit.gridX, selectedUnit.gridY, targetX, targetY, terrain)
      : true;
    const unitHasCover = unitAtTile
      ? hasPartialCover(unitAtTile.gridX, unitAtTile.gridY, terrain)
      : false;

    return {
      x: targetX,
      y: targetY,
      unitAtTile,
      objAtTile,
      terrainAtTile,
      moveOption,
      distFromActive,
      hasLosFromActive,
      unitHasCover,
    };
  }, [hoveredCell, selectedUnit, units, objectives, terrain, validMoveCells]);

  return (
    <div className="relative w-full h-screen bg-slate-950 text-slate-100 select-none overflow-hidden flex flex-col justify-between">
      {/* FULL-STAGE 2.5D OBJECT-SPATIAL WORLD VIEWPORT */}
      <div className="absolute inset-x-0 top-12 bottom-28 z-0">
        <SpatialBattlefieldViewportSvg
          scenario={scenario}
          units={units}
          terrain={terrain}
          objectives={objectives}
          selectedUnit={selectedUnit}
          validMoveCells={validMoveCells}
          engageableHostileIds={engageableHostileIds}
          hoveredCell={hoveredCell}
          lastVector={lastVector}
          activeAnimations={activeAnimations}
          cameraMode={cameraMode}
          onSelectCell={(x, y) => {
            const unitHere = units.find(
              (u) => u.modelsCurrent > 0 && u.gridX === x && u.gridY === y
            );
            if (
              unitHere &&
              unitHere.faction === 'StrikeRoster' &&
              turnAuthority === 'PLAYER_TURN' &&
              !unitHere.activatedThisRound &&
              actionMode !== 'RESONANCE'
            ) {
              setSelectedUnitId(unitHere.id);
              return;
            }
            void handleCellClick(x, y);
          }}
          onSelectUnit={(unitId) => setSelectedUnitId(unitId)}
          onHoverCell={(cell) => setHoveredCell(cell)}
        />
      </div>

      {/* FLOATING TOP VIDEO-GAME HUD OVERLAY */}
      <div className="relative z-20 pl-4 pr-52 pt-3 pointer-events-none flex flex-wrap items-start justify-between gap-3">
        {/* Top-Left: Round, Sector, Scoreboard & Camera Toggle */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 bg-slate-950/88 backdrop-blur-md border border-slate-800/90 rounded-xl px-3.5 py-2 shadow-xl">
          <div className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 rounded-lg font-mono text-xs font-bold text-amber-300 tabular-nums">
            ROUND {round} / 5
          </div>
          <div className="pr-2 border-r border-slate-800">
            <div className="text-xs font-bold text-white">
              {scenario.code}: {scenario.title}
            </div>
            <div className="text-[10px] font-mono text-emerald-400">
              {threatLevel} Threat · {narrative.locationHeader}
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-2 font-mono text-xs tabular-nums">
            <span className="text-emerald-400 font-bold">Strike VP: {playerVp}</span>
            <span className="text-slate-600">|</span>
            <span className="text-red-400 font-bold">Warden VP: {wardenVp}</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-bold">+{sessionAlloy} Alloy</span>
          </div>

          <button
            type="button"
            onClick={() =>
              setCameraMode((m) =>
                m === 'ISOMETRIC_25D' ? 'TOP_DOWN_ORTHO' : 'ISOMETRIC_25D'
              )
            }
            className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-slate-900 border border-slate-700 text-sky-300 hover:text-white cursor-pointer"
          >
            Camera: {cameraMode === 'ISOMETRIC_25D' ? '2.5D Isometric' : 'Top-Down Ortho'}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerOrbitalDropChoreography(units);
              setShowSceneBriefing(false);
            }}
            className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:text-white cursor-pointer"
            title="Replay Valkyrie-04 Orbital Drop-Pod Insertion Choreography (CLIP-08-ORBITAL-DROP)"
          >
            Replay Drop (CLIP-08)
          </button>
        </div>

        {/* Top-Center/Right: Floating Spatial Object Callout & Primary Mission Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {/* Compact Floating Spatial Object Inspector */}
          <div className="hidden xl:flex items-center gap-2.5 bg-slate-950/88 backdrop-blur-md border border-slate-800/90 rounded-xl px-3 py-1.5 max-w-md shadow-xl">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
              {inspectedTileInfo.unitAtTile ? (
                <UnitPortraitSvg
                  doctrine={inspectedTileInfo.unitAtTile.doctrine}
                  chassis={inspectedTileInfo.unitAtTile.chassis}
                  echelon={inspectedTileInfo.unitAtTile.echelon}
                  hardpoints={inspectedTileInfo.unitAtTile.lockedHardpoints}
                  faction={inspectedTileInfo.unitAtTile.faction}
                  callsign={inspectedTileInfo.unitAtTile.callsign}
                  size="sm"
                />
              ) : inspectedTileInfo.objAtTile || inspectedTileInfo.terrainAtTile ? (
                <BattlefieldCellTerrainOrObjectiveSvg
                  terrainKind={inspectedTileInfo.terrainAtTile?.kind}
                  objectiveKind={inspectedTileInfo.objAtTile?.kind}
                  hackCount={inspectedTileInfo.objAtTile?.hackCount}
                />
              ) : (
                <Footprints className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div className="min-w-0 text-xs">
              <div className="font-bold text-white truncate">
                {inspectedTileInfo.unitAtTile
                  ? `${inspectedTileInfo.unitAtTile.name} (${inspectedTileInfo.unitAtTile.doctrine} · ${inspectedTileInfo.unitAtTile.chassis})`
                  : inspectedTileInfo.objAtTile
                  ? `${inspectedTileInfo.objAtTile.name} (${inspectedTileInfo.distFromActive}" away)`
                  : inspectedTileInfo.terrainAtTile
                  ? inspectedTileInfo.terrainAtTile.name
                  : `Sector (${inspectedTileInfo.x * 2}", ${inspectedTileInfo.y * 2}")`}
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {inspectedTileInfo.unitAtTile
                  ? inspectedTileInfo.unitAtTile.faction === 'WardenDirective'
                    ? `${inspectedTileInfo.distFromActive}" away · ${
                        inspectedTileInfo.hasLosFromActive ? 'Clear Shot' : 'Sight Blocked'
                      } · Click in 3D scene to fire`
                    : `${inspectedTileInfo.unitAtTile.rangedRange || 2}" Weapon · ${inspectedTileInfo.unitAtTile.mov}" Stride`
                  : inspectedTileInfo.objAtTile
                  ? inspectedTileInfo.distFromActive <= 2
                    ? 'Within 2" Reach — Click in scene to Secure (+5 Alloy, +1 VP)!'
                    : 'Move within 2" in scene to extract this objective'
                  : inspectedTileInfo.terrainAtTile
                  ? inspectedTileInfo.terrainAtTile.kind === 'Bulkhead'
                    ? 'Solid Blast Wall — Blocks Movement & Sightlines'
                    : inspectedTileInfo.terrainAtTile.kind === 'LowBarricade'
                    ? 'Waist-High Cover Shield — Grants +1 Cover Evasion'
                    : inspectedTileInfo.terrainAtTile.kind === 'PlasmaHazard'
                    ? 'Molten Magma Vent — Inflicts 2 Thermal Damage'
                    : 'Cavern Basalt Rubble — Costs 2× Stride'
                  : inspectedTileInfo.moveOption
                  ? `Reachable Floor (${inspectedTileInfo.moveOption.dist}" stride) — Click tile to move`
                  : advisorStepText}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/88 backdrop-blur-md border border-slate-800/90 rounded-xl p-1.5 shadow-xl">
            {turnAuthority !== 'MISSION_OVER' && (
              <button
                type="button"
                onClick={handleExecuteCoPilotStep}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer shadow"
              >
                <FastForward className="w-3.5 h-3.5" />
                {turnAuthority === 'PLAYER_TURN' ? 'Auto-Execute' : 'Advance Turn'}
              </button>
            )}

            {chitPool.length === 0 && turnAuthority !== 'MISSION_OVER' && (
              <button
                type="button"
                onClick={handleAdvanceRound}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                {round < 5 ? `Next Round (${round + 1})` : 'Complete'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowSceneBriefing(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Briefing
            </button>

            <button
              type="button"
              onClick={() => finalizeMission(playerVp, wardenVp, units)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Extract
            </button>

            <button
              type="button"
              onClick={onAbortToHub}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg cursor-pointer"
              title="Abort Drop and Return to Orbital Bastion"
            >
              Orbit
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING BOTTOM TACTICAL COMMAND DOCK (Anchored Over the Spatial World) */}
      <div className="relative z-20 px-4 pb-3 pointer-events-none flex flex-col items-center gap-2">
        {/* Live Tactical Comms & Narrative Action Banner */}
        <div className="pointer-events-auto w-full max-w-5xl bg-slate-950/88 backdrop-blur-md border border-slate-800/90 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shadow-xl">
          <div className="text-slate-200 truncate max-w-2xl">
            <strong className="text-amber-400 font-mono mr-2">COMMS:</strong>
            {battleBanner}
          </div>
          <div className="text-[11px] font-mono text-emerald-300 truncate">
            {advisorStepText}
          </div>
        </div>
        {/* Contextual Pop-Up Order Tray Above Dock (Only Appears When Attack, Resonance, or Support Mode is Active) */}
        {selectedUnit &&
          turnAuthority === 'PLAYER_TURN' &&
          selectedUnit.faction === 'StrikeRoster' &&
          !selectedUnit.activatedThisRound &&
          actionMode !== 'MOVE' && (
            <div className="pointer-events-auto w-full max-w-3xl bg-slate-950/92 backdrop-blur-md border border-slate-700 rounded-xl p-3 shadow-2xl">
              {actionMode === 'ATTACK' && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-bold text-amber-400 uppercase">
                      Target Fire Control · Click Red Hostile in 3D Scene or Below
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-[11px]">Weapon Overcharge:</span>
                      {[
                        { amt: 0, label: 'Std' },
                        { amt: 1, label: '+1 Cell' },
                        { amt: 2, label: '+2 Cells' },
                        { amt: 3, label: 'Max' },
                      ].map(({ amt, label }) => (
                        <button
                          key={amt}
                          type="button"
                          disabled={amt > selectedUnit.currentSurge}
                          onClick={() => setSurgeToSpend(amt)}
                          className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer disabled:opacity-30 ${
                            surgeToSpend === amt
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-900 text-slate-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={selectedUnit.currentSurge < 1}
                        onClick={handleDoctrineSurgeTrigger}
                        className="ml-2 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/40 rounded cursor-pointer disabled:opacity-35"
                      >
                        ⚡ {DOCTRINE_SPECS[selectedUnit.doctrine].surgeTriggerName}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {units
                      .filter((u) => u.faction === 'WardenDirective' && u.modelsCurrent > 0)
                      .map((hostile) => {
                        const d = distInches(
                          selectedUnit.gridX,
                          selectedUnit.gridY,
                          hostile.gridX,
                          hostile.gridY
                        );
                        const isMelee = d <= 2;
                        const maxReach = isMelee
                          ? 2
                          : selectedUnit.rangedRange + (selectedUnit.targetLockActive ? 6 : 0);
                        const los = hasLineOfSight(
                          selectedUnit.gridX,
                          selectedUnit.gridY,
                          hostile.gridX,
                          hostile.gridY,
                          terrain
                        );
                        const inRangeAndLos = d <= maxReach && (isMelee || los);
                        return (
                          <button
                            key={hostile.id}
                            type="button"
                            disabled={!inRangeAndLos || selectedUnit.standardActionUsed}
                            onClick={() => void handleCellClick(hostile.gridX, hostile.gridY)}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-400 disabled:opacity-40 flex items-center justify-between gap-2 text-left text-xs cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">{hostile.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {d}&quot; · FPR {selectedUnit.fpr + surgeToSpend} vs EVA {hostile.eva}
                              </div>
                            </div>
                            <span className="px-2 py-1 rounded bg-amber-500 text-slate-950 font-bold text-[10px] shrink-0">
                              {inRangeAndLos ? (isMelee ? 'Strike' : 'Fire') : 'Out'}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {actionMode === 'RESONANCE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedUnit.knownDirectives.map((dirId) => {
                    const dir = MINOR_RESONANCE_DIRECTIVES.find((d) => d.id === dirId);
                    if (!dir) return null;
                    const active = selectedDirectiveId === dir.id;
                    return (
                      <div
                        key={dir.id}
                        onClick={() => setSelectedDirectiveId(dir.id)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-cyan-500/15 border-cyan-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold truncate">
                            {dir.name} ({dir.surgeCost} Surge)
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{dir.summary}</div>
                        </div>
                        {(dir.kind === 'Buff' || dir.kind === 'Heal') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void executeResonanceDirective(
                                selectedUnit,
                                dir,
                                selectedUnit.gridX,
                                selectedUnit.gridY,
                                selectedUnit
                              );
                            }}
                            className="px-2 py-1 rounded bg-cyan-400 text-slate-950 font-bold text-[10px] shrink-0 cursor-pointer"
                          >
                            Channel
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {actionMode === 'SUPPORT' && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={selectedUnit.standardActionUsed}
                      onClick={handleDefendAction}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg cursor-pointer"
                    >
                      Brace &amp; Recharge (+1 EVA, +1 Surge)
                    </button>
                    <button
                      type="button"
                      disabled={selectedUnit.currentSurge < 1}
                      onClick={handleDoctrineSurgeTrigger}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/40 rounded-lg cursor-pointer disabled:opacity-40"
                    >
                      ⚡ {DOCTRINE_SPECS[selectedUnit.doctrine].surgeTriggerName}
                    </button>
                    {fieldStimsRemaining > 0 && (
                      <button
                        type="button"
                        disabled={selectedUnit.accumulatedDamage === 0 && !selectedUnit.staggered}
                        onClick={handleUseFieldStim}
                        className="px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/40 rounded-lg cursor-pointer disabled:opacity-40"
                      >
                        Field Stim ({fieldStimsRemaining})
                      </button>
                    )}
                    {prepTokensRemaining > 0 && (
                      <button
                        type="button"
                        onClick={handleUsePrepToken}
                        className="px-3 py-1.5 text-xs font-semibold text-sky-300 bg-sky-500/15 border border-sky-500/40 rounded-lg cursor-pointer"
                      >
                        Recon Relay ({prepTokensRemaining})
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setAutoDirector((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border cursor-pointer ${
                      autoDirector
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {autoDirector ? <Cpu className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    Auto-Pacing: {autoDirector ? 'ON' : 'MANUAL'}
                  </button>
                </div>
              )}
            </div>
          )}

        {/* Primary Bottom Action Dock */}
        <div className="pointer-events-auto w-full max-w-5xl bg-slate-950/92 backdrop-blur-md border border-slate-800 rounded-2xl px-4 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
          {/* Left: Selected Operative Portrait & Live Stats */}
          {selectedUnit ? (
            <div className="flex items-center gap-3 min-w-0">
              <UnitPortraitSvg
                doctrine={selectedUnit.doctrine}
                chassis={selectedUnit.chassis}
                echelon={selectedUnit.echelon}
                hardpoints={selectedUnit.lockedHardpoints}
                faction={selectedUnit.faction}
                callsign={selectedUnit.callsign}
                size="sm"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white truncate">{selectedUnit.name}</span>
                  <span className="text-[11px] font-mono text-amber-400">
                    [{selectedUnit.doctrine} · {selectedUnit.chassis}]
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300 tabular-nums">
                  <span className="text-emerald-400 font-bold">
                    HP {selectedUnit.maxIntegrityPerModel - selectedUnit.accumulatedDamage}/
                    {selectedUnit.maxIntegrityPerModel}
                  </span>
                  <span className="text-amber-300">
                    Surge {selectedUnit.currentSurge}/{selectedUnit.maxSurge}
                  </span>
                  <span>
                    FPR {selectedUnit.fpr} · EVA {selectedUnit.eva} · RNG {selectedUnit.rangedRange || 2}&quot;
                  </span>
                  <span className="text-sky-300 font-bold">
                    {selectedUnit.actionsRemaining} AP Left
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs font-mono text-slate-400">
              Click any operative in the 2.5D cavern scene to command
            </div>
          )}

          {/* Center: 4-Order Video-Game Action Buttons */}
          {selectedUnit &&
            turnAuthority === 'PLAYER_TURN' &&
            selectedUnit.faction === 'StrikeRoster' &&
            !selectedUnit.activatedThisRound && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActionMode('MOVE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    actionMode === 'MOVE'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  Move ({selectedUnit.mov}&quot;)
                </button>

                <button
                  type="button"
                  disabled={selectedUnit.standardActionUsed}
                  onClick={() => setActionMode('ATTACK')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                    actionMode === 'ATTACK'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  Attack ({engageableHostileIds.size})
                </button>

                <button
                  type="button"
                  disabled={
                    selectedUnit.standardActionUsed || selectedUnit.knownDirectives.length === 0
                  }
                  onClick={() => {
                    setActionMode('RESONANCE');
                    if (selectedUnit.knownDirectives.length > 0) {
                      setSelectedDirectiveId(selectedUnit.knownDirectives[0]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                    actionMode === 'RESONANCE'
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Resonance
                </button>

                <button
                  type="button"
                  onClick={() => setActionMode('SUPPORT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    actionMode === 'SUPPORT'
                      ? 'bg-slate-200 text-slate-950'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                >
                  Gear &amp; Brace
                </button>

                <button
                  type="button"
                  disabled={selectedUnit.standardActionUsed}
                  onClick={handleInteractObjective}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 disabled:opacity-35 cursor-pointer"
                >
                  Secure Cache
                </button>

                <button
                  type="button"
                  onClick={() => handleFinishUnitActivation(selectedUnit.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 cursor-pointer"
                >
                  End Turn
                </button>
              </div>
            )}

          {/* Right: Squad Roster Quick-Switch Strip & Latest Comms Pill */}
          <div className="flex items-center gap-1.5">
            {units
              .filter((u) => u.faction === 'StrikeRoster' && u.modelsCurrent > 0)
              .map((u) => {
                const isSel = selectedUnit?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUnitId(u.id)}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition-colors cursor-pointer ${
                      isSel
                        ? 'bg-amber-500/25 border-amber-400 text-white font-bold'
                        : u.activatedThisRound
                        ? 'bg-slate-900 border-slate-800 text-slate-500'
                        : 'bg-slate-900 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                    }`}
                  >
                    {u.callsign.slice(0, 4)}
                  </button>
                );
              })}

            {combatLogs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFullLogModal(true)}
                title={combatLogs[0].outcomeSummary}
                className="ml-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-mono text-amber-300 hover:text-white cursor-pointer max-w-[180px] truncate"
              >
                {combatLogs[0].attackerName} → {combatLogs[0].finalDamage} Dmg
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mission Scene Briefing Modal Overlay (Pre-Drop & On-Demand Inspection) */}
      {showSceneBriefing && (
        <div className="fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                SECTOR DROP BRIEFING · {scenario.code}: {scenario.title} ({threatLevel} Threat)
              </div>
              <span className="text-xs font-mono text-emerald-400">{narrative.atmosphereTag}</span>
            </div>

            <SectorLocationPanoramaSvg scenario={scenario} />

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">{narrative.locationHeader}</h2>
              <p className="text-xs text-slate-200 leading-relaxed">{narrative.sceneProse}</p>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
              <div className="text-[11px] font-mono text-emerald-400 uppercase font-bold">
                Tactical Objective &amp; Engagement Rules
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {narrative.tacticalGoalProse}
              </p>
              <div className="text-xs text-amber-300 italic pt-1.5 border-t border-slate-800">
                {narrative.flightDirectorQuote}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onAbortToHub}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Return to Orbital Bastion
              </button>
              <button
                type="button"
                onClick={() => setShowSceneBriefing(false)}
                className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl cursor-pointer shadow"
              >
                Touch Down &amp; Enter 2.5D Sector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional Full Combat Log Modal */}
      {showFullLogModal && (
        <div className="fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Full Sector Engagement Log ({combatLogs.length} Exchanges)
              </h3>
              <button
                type="button"
                onClick={() => setShowFullLogModal(false)}
                className="px-3 py-1 text-xs font-mono text-slate-300 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {combatLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">
                      {log.attackerName} → {log.defenderName} ({log.actionLabel})
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">{log.timestamp}</span>
                  </div>
                  <div className="text-slate-200">{log.outcomeSummary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mission Complete Modal */}
      {missionReport && (
        <div className="fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/60 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="text-xs font-mono text-amber-400">
              AFTER-ACTION DEBRIEF · {scenario.code}: {scenario.title}
            </div>
            <h2 className="text-xl font-bold text-white">
              {missionReport.victory ? 'Sector Operation Accomplished' : 'Emergency Dropship Extraction'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {missionReport.victory
                ? `Your Strike Roster held the cavern perimeter and broke the Warden Directive's lock on ${scenario.title}. Dropship Valkyrie-04 has recovered all surviving operatives and hauled your salvaged Karst-Alloy back to the Orbital Bastion.`
                : `Under heavy autonomous Warden pressure inside ${scenario.title}, Flight Director Mara Vos ordered an emergency dust-off. Your squad returns to the Orbital Bastion with all recovered Alloy caches intact.`}
            </p>
            <p className="text-xs text-amber-300 font-mono">{missionReport.summary}</p>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 text-xs">
              <div className="font-bold text-emerald-400">
                Service Commendations &amp; Med-Bay Trauma Assessment (+1 XP per surviving operative)
              </div>
              {missionReport.traumaNotes.length === 0 ? (
                <div className="text-slate-400">
                  All operatives extracted intact — zero permanent combat trauma sustained.
                </div>
              ) : (
                missionReport.traumaNotes.map((note, idx) => (
                  <div key={idx} className="text-red-400 font-mono">
                    • {note}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() =>
                  onCompleteMission({
                    victory: missionReport.victory,
                    playerVp,
                    wardenVp,
                    alloyEarned:
                      sessionAlloy +
                      (missionReport.victory
                        ? threatLevel === 'High'
                          ? 4
                          : threatLevel === 'Medium'
                          ? 2
                          : 0
                        : 0),
                    updatedRoster: missionReport.updatedRoster,
                  })
                }
                className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
              >
                Return to Orbital Bastion &amp; Save Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
