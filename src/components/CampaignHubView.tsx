import React, { useState, useMemo } from 'react';
import {
  Compass,
  Wrench,
  Play,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Sliders,
  Radio,
  X,
  BookOpen,
} from 'lucide-react';
import {
  SCENARIO_SPECS,
  DOCTRINE_SPECS,
  ECHELON_SPECS,
  generateWardenForce,
} from '../game/catalog';
import type {
  CampaignState,
  CompiledUnit,
  CrewTaskAssignment,
} from '../game/types';
import type { KarstWasmMathBridge } from '../lib/karstHoloModel';
import { soundFX } from '../game/sound';
import { RosterForgeView } from './RosterForgeView';
import {
  UnitPortraitSvg,
  SectorLocationPanoramaSvg,
  InteractiveOrbitalBastionSpatialSvg,
} from './KarstVisuals';
import { SCENARIO_NARRATIVES } from '../game/lore';

export type BastionStage = 'NONE' | 'HANGAR' | 'CREW_PREP' | 'CONTRACT_BRIEFING';

interface CampaignHubViewProps {
  campaign: CampaignState;
  onUpdateCampaign: (next: CampaignState) => void;
  wasmBridge: KarstWasmMathBridge | null;
  selectedScenarioIndex: number;
  onSelectScenarioIndex: (idx: number) => void;
  selectedThreat: 'Low' | 'Medium' | 'High';
  onSelectThreat: (threat: 'Low' | 'Medium' | 'High') => void;
  onStartTacticalDrop: () => void;
  onOpenPrologue?: () => void;
  initialStage?: BastionStage;
}

type TaskType = CrewTaskAssignment['task'];

const TASK_DESCRIPTIONS: Record<
  TaskType,
  { title: string; department: string; yieldDesc: string }
> = {
  SectorRecon: {
    title: 'Deep-Core Recon',
    department: 'Sensor & Telemetry Deck',
    yieldDesc:
      'Launches seismic probes into the crust fractures to map Warden patrol routes (+Recon Intel toward Medium & High Threat Operations).',
  },
  ScrapSalvaging: {
    title: 'Alloy Reclamation',
    department: 'Smelting & Hull Bay',
    yieldDesc:
      'Breaks down recovered bulkhead slag and dormant drone hulls to refine raw Zero-Point Alloy for the Company Treasury.',
  },
  MedBayOverhaul: {
    title: 'Med-Bay & Stim Synthesis',
    department: 'Bio-Foundry Lab',
    yieldDesc:
      'Synthesizes Single-Use Field Stim injectors that restore +2 Integrity/Hull and clear Staggered trauma during combat.',
  },
  CombatSimDrill: {
    title: 'Tactical Simulator',
    department: 'Holographic War-Room',
    yieldDesc:
      'Runs live-fire breach simulations against recorded Warden patterns, awarding Tactical Prep Tokens (+2 Surge Cells in battle).',
  },
};

function getRecommendedTaskForUnit(unit: CompiledUnit): TaskType {
  switch (unit.doctrine) {
    case 'Outrider':
      return 'SectorRecon';
    case 'Breacher':
    case 'Aegis':
      return 'ScrapSalvaging';
    case 'Psion':
      return 'MedBayOverhaul';
    case 'Deadeye':
    case 'Saboteur':
      return 'CombatSimDrill';
  }
}

export const CampaignHubView: React.FC<CampaignHubViewProps> = ({
  campaign,
  onUpdateCampaign,
  wasmBridge,
  selectedScenarioIndex,
  onSelectScenarioIndex,
  selectedThreat,
  onSelectThreat,
  onStartTacticalDrop,
  onOpenPrologue,
  initialStage = 'NONE',
}) => {
  const [stage, setStage] = useState<BastionStage>(initialStage);
  const [selectedOperativeId, setSelectedOperativeId] = useState<string | null>(
    campaign.roster[0]?.id ?? null
  );
  const [initialForgeMode, setInitialForgeMode] = useState<'DOSSIER' | 'SYNTHESIS_WIZARD'>(
    'DOSSIER'
  );
  const [prepSubTab, setPrepSubTab] = useState<'SHIFTS' | 'FACILITIES'>('SHIFTS');
  const [briefingSubTab, setBriefingSubTab] = useState<'SCENE' | 'WARDENS'>('SCENE');
  const [taskChoices, setTaskChoices] = useState<Record<string, TaskType>>({});
  const [taskResults, setTaskResults] = useState<Record<string, CrewTaskAssignment>>({});
  const [bannerNote, setBannerNote] = useState<string | null>(null);

  const eligibleUnits = useMemo(
    () => campaign.roster.filter((u) => u.echelon > 0),
    [campaign.roster]
  );

  const occupiedBerths = useMemo(
    () => campaign.roster.reduce((sum, u) => sum + ECHELON_SPECS[u.echelon].berthCost, 0),
    [campaign.roster]
  );

  const selectedScenario = SCENARIO_SPECS[selectedScenarioIndex] ?? SCENARIO_SPECS[0];
  const selectedNarrative =
    SCENARIO_NARRATIVES[selectedScenario.number] ?? SCENARIO_NARRATIVES[1];

  const previewWardens = useMemo(
    () => generateWardenForce(selectedThreat, selectedScenario.number),
    [selectedThreat, selectedScenario.number]
  );

  const getTaskPoolCount = (unit: CompiledUnit, task: TaskType): number => {
    switch (task) {
      case 'SectorRecon':
        return unit.doctrine === 'Outrider' ? Math.max(unit.cog, unit.fpr) : unit.cog;
      case 'ScrapSalvaging':
        return Math.max(unit.fpr, unit.eva);
      case 'MedBayOverhaul':
        return unit.cog;
      case 'CombatSimDrill':
        return Math.max(unit.fpr, unit.cog);
    }
  };

  const applyTaskReward = async (
    task: TaskType,
    successes: number,
    currentState: CampaignState
  ): Promise<{ updated: CampaignState; summary: string }> => {
    const next = { ...currentState };
    if (task === 'SectorRecon') {
      const bonus = next.bastionFacilities.deepScanArray ? 1 : 0;
      const totalGain = successes + bonus;
      if (wasmBridge) {
        const r = await wasmBridge.dispatchOp(
          'add',
          next.reconProgress,
          totalGain,
          'Sector Recon Progress'
        );
        next.reconProgress = r.value;
      } else {
        next.reconProgress += totalGain;
      }
      return {
        updated: next,
        summary:
          totalGain > 0
            ? `Telemetry sweep locked in +${totalGain} Recon Intel${bonus ? ' (+1 Deep-Scan Array)' : ''}.`
            : 'Seismic interference blocked deep-crust telemetry this shift.',
      };
    }

    const pairs = Math.floor(successes / 2);
    if (task === 'ScrapSalvaging') {
      if (pairs > 0) {
        if (wasmBridge) {
          const r = await wasmBridge.dispatchOp(
            'add',
            next.alloyTreasury,
            pairs,
            'Scrap Salvaging Yield'
          );
          next.alloyTreasury = r.value;
        } else {
          next.alloyTreasury += pairs;
        }
      }
      return {
        updated: next,
        summary:
          pairs > 0
            ? `Smelting crew refined +${pairs} Zero-Point Alloy for the Treasury.`
            : 'Low-grade slag only — no refineable Alloy extracted (Overclock available).',
      };
    }

    if (task === 'MedBayOverhaul') {
      if (pairs > 0) {
        next.consumablesCount += pairs;
      }
      return {
        updated: next,
        summary:
          pairs > 0
            ? `Bio-Foundry synthesized +${pairs} Field Stim Pack(s).`
            : 'Reagent calibration incomplete — 0 Field Stims synthesized (Overclock available).',
      };
    }

    if (pairs > 0) {
      next.prepTokens += pairs;
    }
    return {
      updated: next,
      summary:
        pairs > 0
          ? `Tactical Simulator calibrated +${pairs} Prep Token(s) for the drop.`
          : 'Routine drill completed — 0 bonus Prep Tokens (Overclock available).',
    };
  };

  const handleExecuteTask = async (unit: CompiledUnit) => {
    const chosenTask: TaskType = taskChoices[unit.id] ?? getRecommendedTaskForUnit(unit);
    const diceCount = getTaskPoolCount(unit, chosenTask);
    const dice: number[] = [];
    for (let i = 0; i < diceCount; i++) {
      dice.push(Math.floor(Math.random() * 6) + 1);
    }
    const successes = dice.filter((d) => d >= 4).length;
    soundFX.playStrikeRoll();

    const { updated, summary } = await applyTaskReward(chosenTask, successes, campaign);
    onUpdateCampaign(updated);

    setTaskResults((prev) => ({
      ...prev,
      [unit.id]: {
        unitId: unit.id,
        task: chosenTask,
        rolled: true,
        pushed: false,
        dice,
        successes,
        rewardSummary: summary,
      },
    }));
  };

  const handleExecuteAllTasks = async (advanceAfter = false) => {
    soundFX.playStrikeRoll();
    let workingState = { ...campaign };
    const nextResults = { ...taskResults };

    for (const unit of eligibleUnits) {
      if (nextResults[unit.id]?.rolled) continue;
      const chosenTask: TaskType = taskChoices[unit.id] ?? getRecommendedTaskForUnit(unit);
      const diceCount = getTaskPoolCount(unit, chosenTask);
      const dice: number[] = [];
      for (let i = 0; i < diceCount; i++) {
        dice.push(Math.floor(Math.random() * 6) + 1);
      }
      const successes = dice.filter((d) => d >= 4).length;
      const { updated, summary } = await applyTaskReward(
        chosenTask,
        successes,
        workingState
      );
      workingState = updated;
      nextResults[unit.id] = {
        unitId: unit.id,
        task: chosenTask,
        rolled: true,
        pushed: false,
        dice,
        successes,
        rewardSummary: summary,
      };
    }

    onUpdateCampaign(workingState);
    setTaskResults(nextResults);
    if (advanceAfter) {
      setBannerNote('Shipboard Preparations completed — Ready for Sector Operation Briefing.');
      setStage('CONTRACT_BRIEFING');
    }
  };

  const handleOverclockTask = async (unit: CompiledUnit) => {
    const existing = taskResults[unit.id];
    if (!existing || existing.pushed) return;

    const newDice: number[] = [];
    let sustainedOverclockStrain = false;
    let addedSuccesses = 0;

    for (const d of existing.dice) {
      if (d >= 4) {
        newDice.push(d);
      } else {
        const reroll = Math.floor(Math.random() * 6) + 1;
        newDice.push(reroll);
        if (reroll === 1) sustainedOverclockStrain = true;
        if (reroll >= 4) addedSuccesses++;
      }
    }

    soundFX.playSurgeSpend();
    let nextCampaign = { ...campaign };

    if (addedSuccesses > 0) {
      const { updated } = await applyTaskReward(
        existing.task,
        addedSuccesses,
        nextCampaign
      );
      nextCampaign = updated;
    }

    let hazardNote = '';
    if (sustainedOverclockStrain) {
      nextCampaign.roster = nextCampaign.roster.map((u) =>
        u.id === unit.id
          ? {
              ...u,
              accumulatedDamage: Math.min(
                u.maxIntegrityPerModel - 1,
                u.accumulatedDamage + 1
              ),
            }
          : u
      );
      hazardNote = ' · Overclock Strain: Operative deploys with 1 minor Integrity/Hull wear!';
    }

    onUpdateCampaign(nextCampaign);
    const totalSuccesses = newDice.filter((d) => d >= 4).length;

    setTaskResults((prev) => ({
      ...prev,
      [unit.id]: {
        ...existing,
        pushed: true,
        dice: newDice,
        successes: totalSuccesses,
        rewardSummary: `Overclocked Shift Output (Efficiency Rating ${totalSuccesses})${hazardNote}`,
      },
    }));
  };

  const handleConstructFacility = async (
    key: keyof CampaignState['bastionFacilities'],
    cost: number,
    label: string
  ) => {
    if (campaign.bastionFacilities[key]) return;
    if (campaign.alloyTreasury < cost) {
      setBannerNote(`Requires ${cost} Alloy to construct ${label}.`);
      return;
    }
    let nextAlloy = campaign.alloyTreasury - cost;
    if (wasmBridge) {
      const r = await wasmBridge.dispatchOp(
        'subtract',
        campaign.alloyTreasury,
        cost,
        `Construct ${label}`
      );
      nextAlloy = r.value;
    }
    soundFX.playObjectiveClaim();
    onUpdateCampaign({
      ...campaign,
      alloyTreasury: nextAlloy,
      bastionFacilities: {
        ...campaign.bastionFacilities,
        [key]: true,
      },
    });
    setBannerNote(`Constructed ${label} aboard the Orbital Bastion.`);
  };

  // Next natural player-journey hint
  const completedShiftsCount = Object.keys(taskResults).length;
  const journeyHint =
    completedShiftsCount === 0
      ? 'Click any Ventral Drop Pod to inspect your squad, or click the Carrier Crew Deck to run pre-drop shifts.'
      : `Crew shifts complete. Click ${selectedScenario.code} (${selectedScenario.title}) on Planet Karst-9 below to review your drop briefing and launch.`;

  return (
    <div className="relative w-full h-screen bg-[#030712] overflow-hidden select-none">
      {/* ================= LAYER 0: FULL-SCREEN INTERACTIVE SPATIAL WORLD (CARRIER & PLANET KARST-9) ================= */}
      <div className="absolute inset-0 z-0">
        <InteractiveOrbitalBastionSpatialSvg
          roster={campaign.roster}
          scenarios={SCENARIO_SPECS}
          selectedScenarioId={selectedScenario.id}
          selectedOperativeId={selectedOperativeId}
          facilities={{
            medBay: campaign.bastionFacilities.autoDocInfirmary,
            ordnanceFoundry: campaign.bastionFacilities.ordnanceFoundry,
            resonanceSanctum: campaign.bastionFacilities.deepScanArray,
          }}
          onSelectOperative={(unitId) => {
            soundFX.playChitDraw();
            setSelectedOperativeId(unitId);
            setInitialForgeMode('DOSSIER');
            setStage('HANGAR');
          }}
          onSelectEmptyBerth={() => {
            soundFX.playChitDraw();
            setInitialForgeMode('SYNTHESIS_WIZARD');
            setStage('HANGAR');
          }}
          onSelectDeck={(deck) => {
            soundFX.playChitDraw();
            if (deck === 'SQUAD_BAY') {
              setInitialForgeMode('DOSSIER');
              setStage('HANGAR');
            } else if (deck === 'CREW_PREP') {
              setStage('CREW_PREP');
            } else {
              setStage('CONTRACT_BRIEFING');
            }
          }}
          onSelectScenario={(scenId) => {
            soundFX.playChitDraw();
            const idx = SCENARIO_SPECS.findIndex((s) => s.id === scenId);
            if (idx >= 0) onSelectScenarioIndex(idx);
            setStage('CONTRACT_BRIEFING');
          }}
          onLaunchDrop={onStartTacticalDrop}
        />
      </div>

      {/* ================= LAYER 1: FLOATING TOP-LEFT IN-WORLD COMPANY & TREASURY HUD ================= */}
      <div className="absolute top-3 left-4 z-20 flex flex-wrap items-center gap-3 pointer-events-auto max-w-[calc(100vw-260px)]">
        <div className="px-4 py-2.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 shadow-xl flex flex-wrap items-center gap-4">
          <div>
            <div className="text-[10px] font-mono text-amber-400">
              LOW-KARST ORBIT · OPERATION #{campaign.completedContracts + 1} STAGING
            </div>
            <div className="text-sm sm:text-base font-bold text-white flex items-center gap-3">
              <span>{campaign.companyName}</span>
              {onOpenPrologue && (
                <button
                  type="button"
                  onClick={onOpenPrologue}
                  className="text-xs font-normal text-slate-400 hover:text-amber-300 underline cursor-pointer flex items-center gap-1"
                >
                  <BookOpen className="w-3 h-3" />
                  Mission Prologue
                </button>
              )}
            </div>
          </div>

          <div className="h-7 w-px bg-slate-800 hidden sm:block" />

          {/* Unboxed Typographic Resource Readout */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono tabular-nums text-slate-300">
            <span>
              Treasury: <strong className="text-amber-400">{campaign.alloyTreasury} Alloy</strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              Recon: <strong className="text-emerald-400">{campaign.reconProgress}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              Prep: <strong className="text-sky-400">{campaign.prepTokens}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              Stims: <strong className="text-purple-400">{campaign.consumablesCount}</strong>
            </span>
          </div>
        </div>

        {bannerNote && (
          <div className="px-3.5 py-2 rounded-xl bg-slate-950/95 border border-amber-500/60 text-xs font-mono text-amber-300 flex items-center gap-3 shadow-lg">
            <span>{bannerNote}</span>
            <button
              type="button"
              onClick={() => setBannerNote(null)}
              className="underline text-slate-400 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* ================= LAYER 2: FLOATING BOTTOM PLAYER-JOURNEY GUIDE BAR ================= */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(1120px,96vw)] pointer-events-auto">
        <div className="px-4 py-3 rounded-2xl bg-slate-950/92 backdrop-blur-md border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-3">
          {/* Flight Director Guided Journey Prompt */}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
              <Radio className="w-3 h-3 shrink-0" />
              <span>FLIGHT DIRECTOR MARA VOS · PRE-DROP SEQUENCE</span>
            </div>
            <div className="text-xs text-slate-200 truncate mt-0.5">{journeyHint}</div>
          </div>

          {/* 3 Progressive Journey Step Triggers + Launch Drop CTA */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundFX.playChitDraw();
                setInitialForgeMode('DOSSIER');
                setStage(stage === 'HANGAR' ? 'NONE' : 'HANGAR');
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                stage === 'HANGAR'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>1. Drop Berths ({occupiedBerths}/6)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playChitDraw();
                setStage(stage === 'CREW_PREP' ? 'NONE' : 'CREW_PREP');
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                stage === 'CREW_PREP'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>
                2. Crew Shifts ({completedShiftsCount}/{eligibleUnits.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playChitDraw();
                setStage(stage === 'CONTRACT_BRIEFING' ? 'NONE' : 'CONTRACT_BRIEFING');
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                stage === 'CONTRACT_BRIEFING'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>
                3. Target: {selectedScenario.code} ({selectedThreat})
              </span>
            </button>

            <button
              type="button"
              onClick={onStartTacticalDrop}
              className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Launch Drop Pods</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= LAYER 3: IN-WORLD CONTEXTUAL COMPARTMENT MODAL OVERLAY ================= */}
      {stage !== 'NONE' && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setStage('NONE')}
        >
          <div
            className="w-full max-w-[1180px] max-h-[82vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 p-5 sm:p-6 shadow-2xl space-y-5 select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <div className="text-[11px] font-mono text-amber-400">
                  {stage === 'HANGAR'
                    ? 'ORBITAL BASTION · VENTRAL DROP-POD HANGAR & OPERATIVE DOSSIERS'
                    : stage === 'CREW_PREP'
                    ? 'ORBITAL BASTION · SHIPBOARD CREW DECK & ENGINEERING FACILITIES'
                    : `PLANET KARST-9 TARGET LOCK · ${selectedScenario.code}: ${selectedScenario.title.toUpperCase()}`}
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  {stage === 'HANGAR'
                    ? 'Inspect Operatives, Biographies & Hardpoint Loadouts'
                    : stage === 'CREW_PREP'
                    ? 'Assign Pre-Drop Department Shifts & Construct Carrier Bays'
                    : `Tactical Drop Briefing — ${selectedScenario.title} (${selectedThreat} Threat)`}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setStage('NONE')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
                Return to Carrier Cutaway
              </button>
            </div>

            {/* OVERLAY 1: VENTRAL DROP BERTHS & OPERATIVE DOSSIERS */}
            {stage === 'HANGAR' && (
              <div className="space-y-4">
                <RosterForgeView
                  campaign={campaign}
                  onUpdateCampaign={onUpdateCampaign}
                  wasmBridge={wasmBridge}
                  externalSelectedUnitId={selectedOperativeId}
                  initialForgeMode={initialForgeMode}
                  onSelectUnitId={(id) => setSelectedOperativeId(id)}
                  onLaunchDrop={() => {
                    soundFX.playChitDraw();
                    setStage('CREW_PREP');
                  }}
                />

                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStage('NONE')}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                  >
                    Close &amp; View Carrier Cutaway
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playChitDraw();
                      setStage('CREW_PREP');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Next Step: Run Shipboard Crew Shifts
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY 2: SHIPBOARD CREW DECK & PERMANENT FACILITIES */}
            {stage === 'CREW_PREP' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playChitDraw();
                        setPrepSubTab('SHIFTS');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        prepSubTab === 'SHIFTS'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      1. Crew Department Shifts ({completedShiftsCount}/{eligibleUnits.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playChitDraw();
                        setPrepSubTab('FACILITIES');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        prepSubTab === 'FACILITIES'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      2. Carrier Permanent Facilities
                    </button>
                  </div>

                  {prepSubTab === 'SHIFTS' && (
                    <button
                      type="button"
                      onClick={() => void handleExecuteAllTasks(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Execute All Shifts &amp; Open Target Briefing
                    </button>
                  )}
                </div>

                {prepSubTab === 'SHIFTS' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {eligibleUnits.map((unit) => {
                      const chosen = taskChoices[unit.id] ?? getRecommendedTaskForUnit(unit);
                      const res = taskResults[unit.id];
                      const aptitude = getTaskPoolCount(unit, chosen);
                      const taskMeta = TASK_DESCRIPTIONS[chosen];

                      return (
                        <div
                          key={unit.id}
                          className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <UnitPortraitSvg
                                doctrine={unit.doctrine}
                                chassis={unit.chassis}
                                echelon={unit.echelon}
                                hardpoints={unit.lockedHardpoints}
                                faction={unit.faction}
                                callsign={unit.callsign}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <span className="text-xs font-mono text-amber-400 block truncate">
                                  {unit.callsign} · {unit.doctrine} (Aptitude {aptitude})
                                </span>
                                <h3 className="text-sm font-bold text-white truncate">
                                  {unit.name}
                                </h3>
                              </div>
                            </div>

                            {!res?.rolled ? (
                              <button
                                type="button"
                                onClick={() => handleExecuteTask(unit)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Execute Shift
                              </button>
                            ) : (
                              !res.pushed &&
                              res.dice.some((d) => d < 4) && (
                                <button
                                  type="button"
                                  onClick={() => handleOverclockTask(unit)}
                                  className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  Overclock Shift
                                </button>
                              )
                            )}
                          </div>

                          <div className="space-y-2">
                            <select
                              value={chosen}
                              disabled={Boolean(res?.rolled)}
                              onChange={(e) =>
                                setTaskChoices((prev) => ({
                                  ...prev,
                                  [unit.id]: e.target.value as TaskType,
                                }))
                              }
                              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                            >
                              <option value="SectorRecon">Deep-Core Recon (+Recon Intel)</option>
                              <option value="ScrapSalvaging">Alloy Reclamation (+Alloy)</option>
                              <option value="MedBayOverhaul">Med-Bay Synthesis (+Field Stims)</option>
                              <option value="CombatSimDrill">
                                Tactical Simulator (+Prep Tokens)
                              </option>
                            </select>

                            <div className="text-[11px] text-slate-400 leading-relaxed">
                              <strong className="text-slate-200">{taskMeta.department}:</strong>{' '}
                              {taskMeta.yieldDesc}
                            </div>
                          </div>

                          {res && (
                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                              <span className="font-mono text-slate-400">
                                Output Rating: <strong className="text-white">{res.successes}</strong>
                                {res.pushed ? ' (Overclocked)' : ''}
                              </span>
                              <span className="text-emerald-400 font-semibold truncate">
                                {res.rewardSummary}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        key: 'autoDocInfirmary' as const,
                        name: 'Auto-Doc Infirmary & Repair Bay',
                        cost: 8,
                        desc: 'Automated surgical and chassis-welding cradles restore permanent combat trauma at zero Alloy cost between drops.',
                      },
                      {
                        key: 'deepScanArray' as const,
                        name: 'Deep-Scan Telemetry Array',
                        cost: 8,
                        desc: 'Orbital gravimetric sensors automatically add +1 Recon Intel whenever an operative runs Deep-Core Recon.',
                      },
                      {
                        key: 'ordnanceFoundry' as const,
                        name: 'Ordnance & Stim Foundry',
                        cost: 10,
                        desc: 'Automated bio-printer supplies +1 free Single-Use Field Stim injector at the start of every sector drop.',
                      },
                    ].map((fac) => {
                      const owned = campaign.bastionFacilities[fac.key];
                      return (
                        <div
                          key={fac.key}
                          className="p-5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-1.5">
                            <div className="text-sm font-bold text-white">{fac.name}</div>
                            <p className="text-xs text-slate-400 leading-relaxed">{fac.desc}</p>
                          </div>
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-mono text-amber-400">
                              Cost: {fac.cost} Alloy
                            </span>
                            {owned ? (
                              <span className="text-xs font-mono text-emerald-400 font-bold">
                                INSTALLED
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleConstructFacility(fac.key, fac.cost, fac.name)
                                }
                                className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Construct ({fac.cost} A)
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playChitDraw();
                      setStage('HANGAR');
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Drop Berths
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playChitDraw();
                      setStage('CONTRACT_BRIEFING');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Next Step: Target Vault Drop Briefing
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY 3: PLANETARY VAULT DROP BRIEFING */}
            {stage === 'CONTRACT_BRIEFING' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="space-y-1.5">
                    <div className="text-xs font-mono text-amber-400">
                      Target Planetary Vault Sector
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {SCENARIO_SPECS.map((scen, idx) => {
                        const active = selectedScenarioIndex === idx;
                        return (
                          <button
                            key={scen.id}
                            type="button"
                            onClick={() => {
                              soundFX.playChitDraw();
                              onSelectScenarioIndex(idx);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono border whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                              active
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {scen.code}: {scen.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-mono text-slate-400">
                      Vault Depth (Threat Tier · Recon {campaign.reconProgress})
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                      {(['Low', 'Medium', 'High'] as const).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => {
                            soundFX.playChitDraw();
                            onSelectThreat(tier);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                            selectedThreat === tier
                              ? 'bg-emerald-400 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {tier} Threat
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playChitDraw();
                        setBriefingSubTab('SCENE');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        briefingSubTab === 'SCENE'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      1. Subterranean Vault Scene &amp; Objectives
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playChitDraw();
                        setBriefingSubTab('WARDENS');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        briefingSubTab === 'WARDENS'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      2. Hostile Warden Garrison ({previewWardens.length} Units)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onStartTacticalDrop}
                    className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    Launch Drop Pods into {selectedScenario.title}
                  </button>
                </div>

                {briefingSubTab === 'SCENE' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    <div className="lg:col-span-7 space-y-4">
                      <SectorLocationPanoramaSvg scenario={selectedScenario} />

                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-sm text-slate-200 leading-relaxed">
                        <p>{selectedNarrative.sceneProse}</p>
                        <p className="text-slate-300">{selectedNarrative.tacticalGoalProse}</p>
                      </div>
                    </div>

                    <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                        <div className="font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
                          <Radio className="w-3.5 h-3.5" />
                          <span>FLIGHT DIRECTOR MARA VOS · DROP BRIEFING</span>
                        </div>
                        <p className="text-sm text-slate-200 italic leading-relaxed">
                          {selectedNarrative.flightDirectorQuote}
                        </p>
                      </div>

                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                        <div className="font-bold text-amber-400">
                          Sector Environmental Condition — {selectedScenario.specialRuleTitle}
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          {selectedScenario.specialRuleText}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={onStartTacticalDrop}
                        className="w-full py-3.5 px-5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        Deploy Strike Roster into {selectedScenario.title}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {previewWardens.map((w) => (
                      <div
                        key={w.id}
                        className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UnitPortraitSvg
                            doctrine={w.doctrine}
                            chassis={w.chassis}
                            echelon={w.echelon}
                            hardpoints={w.lockedHardpoints}
                            faction="WardenDirective"
                            callsign={w.callsign}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="font-mono text-red-400 font-bold">
                              Berth {w.berthIndices.join(' & ')}:
                            </span>{' '}
                            <strong className="text-white">{w.name}</strong>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {w.doctrine} · {w.chassis} · {ECHELON_SPECS[w.echelon].name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              AI Directive: {DOCTRINE_SPECS[w.doctrine].wardenAiDirective}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono text-right text-slate-300 whitespace-nowrap shrink-0 tabular-nums">
                          <div>
                            FPR {w.fpr} · EVA {w.eva} · Move {w.mov}&quot;
                          </div>
                          <div className="text-[11px] text-amber-400 mt-0.5">
                            {w.maxIntegrityPerModel} HP{w.modelsMax > 1 ? ` ×${w.modelsMax}` : ''} · Armor {w.plating}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
