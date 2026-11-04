import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Shield,
  Zap,
  Crosshair,
  Wrench,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Award,
  HeartPulse,
  CheckCircle2,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  ECHELON_SPECS,
  CHASSIS_SPECS,
  DOCTRINE_SPECS,
  HARDPOINT_MODULES,
  MINOR_RESONANCE_DIRECTIVES,
  compileUnitProfile,
} from '../game/catalog';
import type {
  CampaignState,
  CompiledUnit,
  EchelonTier,
  ChassisType,
  DoctrineRole,
} from '../game/types';
import type { KarstWasmMathBridge } from '../lib/karstHoloModel';
import { soundFX } from '../game/sound';
import { UnitPortraitSvg, computeUnitVisualGenome } from './KarstVisuals';
import {
  CHASSIS_LORE,
  DOCTRINE_LORE,
  ECHELON_LORE,
  getOperativeBio,
} from '../game/lore';

interface RosterForgeViewProps {
  campaign: CampaignState;
  onUpdateCampaign: (next: CampaignState) => void;
  wasmBridge: KarstWasmMathBridge | null;
  onLaunchDrop: () => void;
  externalSelectedUnitId?: string | null;
  initialForgeMode?: 'DOSSIER' | 'SYNTHESIS_WIZARD';
  onSelectUnitId?: (id: string) => void;
}

type ForgeMode = 'DOSSIER' | 'SYNTHESIS_WIZARD';
type DossierTab = 'BIO' | 'COMBAT' | 'LOADOUT';
type WizardStep = 1 | 2 | 3 | 4;

export const RosterForgeView: React.FC<RosterForgeViewProps> = ({
  campaign,
  onUpdateCampaign,
  wasmBridge,
  onLaunchDrop,
  externalSelectedUnitId,
  initialForgeMode = 'DOSSIER',
  onSelectUnitId,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    externalSelectedUnitId || campaign.roster[0]?.id || ''
  );
  const [forgeMode, setForgeMode] = useState<ForgeMode>(initialForgeMode);
  const [dossierTab, setDossierTab] = useState<DossierTab>('BIO');
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [installingSocketOnUnit, setInstallingSocketOnUnit] = useState<boolean>(false);

  React.useEffect(() => {
    if (externalSelectedUnitId) {
      setSelectedUnitId(externalSelectedUnitId);
      setForgeMode('DOSSIER');
    }
  }, [externalSelectedUnitId]);

  React.useEffect(() => {
    setForgeMode(initialForgeMode);
  }, [initialForgeMode]);

  // Guided 4-Step 3D Synthesizer State
  const [synthName, setSynthName] = useState<string>('Kaelen Vex');
  const [synthCallsign, setSynthCallsign] = useState<string>('OPR-07');
  const [synthEchelon, setSynthEchelon] = useState<EchelonTier>(2);
  const [synthChassis, setSynthChassis] = useState<ChassisType>('Spliced');
  const [synthDoctrine, setSynthDoctrine] = useState<DoctrineRole>('Deadeye');
  const [synthHardpoints, setSynthHardpoints] = useState<string[]>([
    'hp-precision',
    'hp-pulse-carbine',
  ]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const occupiedBerths = useMemo(() => {
    return campaign.roster.reduce((sum, u) => sum + u.berthIndices.length, 0);
  }, [campaign.roster]);

  const selectedUnit = useMemo(() => {
    return (
      campaign.roster.find((u) => u.id === selectedUnitId) ??
      campaign.roster[0] ??
      null
    );
  }, [campaign.roster, selectedUnitId]);

  const selectedUnitUsedSlots = useMemo(() => {
    if (!selectedUnit) return 0;
    return selectedUnit.lockedHardpoints.reduce((sum, id) => {
      const mod = HARDPOINT_MODULES.find((m) => m.id === id);
      return sum + (mod?.slotSize ?? 1);
    }, 0);
  }, [selectedUnit]);

  const synthPreview = useMemo(() => {
    return compileUnitProfile({
      id: 'preview-unit',
      name: synthName || 'Operative',
      callsign: synthCallsign || 'OPR',
      faction: 'StrikeRoster',
      berthIndices: [1],
      echelon: synthEchelon,
      chassis: synthChassis,
      doctrine: synthDoctrine,
      lockedHardpoints: synthHardpoints,
    });
  }, [synthName, synthCallsign, synthEchelon, synthChassis, synthDoctrine, synthHardpoints]);

  const synthSlotsUsed = useMemo(() => {
    return synthHardpoints.reduce((sum, id) => {
      const mod = HARDPOINT_MODULES.find((m) => m.id === id);
      return sum + (mod?.slotSize ?? 1);
    }, 0);
  }, [synthHardpoints]);

  const synthMaxStartSlots = ECHELON_SPECS[synthEchelon].startingHardpoints;

  const handleStartCommissionWizard = () => {
    soundFX.playChitDraw();
    setForgeMode('SYNTHESIS_WIZARD');
    setWizardStep(1);
    setStatusMessage(null);
  };

  const handleToggleSynthHardpoint = (modId: string) => {
    const mod = HARDPOINT_MODULES.find((m) => m.id === modId);
    if (!mod) return;
    if (synthHardpoints.includes(modId)) {
      setSynthHardpoints((prev) => prev.filter((id) => id !== modId));
      return;
    }
    if (mod.minEchelon !== undefined && synthEchelon < mod.minEchelon) {
      setStatusMessage(`${mod.name} requires Echelon ${mod.minEchelon}+.`);
      return;
    }
    if (synthSlotsUsed + mod.slotSize > synthMaxStartSlots) {
      setStatusMessage(
        `Echelon ${synthEchelon} starts with ${synthMaxStartSlots} Hardpoint slot(s). Unselect a module first.`
      );
      return;
    }
    soundFX.playChitDraw();
    setSynthHardpoints((prev) => [...prev, modId]);
    setStatusMessage(null);
  };

  const handleRecruitUnit = async () => {
    const echSpec = ECHELON_SPECS[synthEchelon];
    if (occupiedBerths + echSpec.berthCost > 6) {
      setStatusMessage(
        `Insufficient Hangar Berths (${occupiedBerths}/6 occupied; Echelon ${synthEchelon} requires ${echSpec.berthCost} Berth(s)). Dismiss an operative first.`
      );
      return;
    }
    const cost = echSpec.alloyCost;
    if (campaign.alloyTreasury < cost) {
      setStatusMessage(
        `Insufficient Alloy Treasury (${campaign.alloyTreasury} Alloy available; Echelon ${synthEchelon} costs ${cost} Alloy).`
      );
      return;
    }

    let nextAlloy = campaign.alloyTreasury - cost;
    if (wasmBridge) {
      const res = await wasmBridge.dispatchOp(
        'subtract',
        campaign.alloyTreasury,
        cost,
        `Commission ${synthName} (${echSpec.name})`
      );
      nextAlloy = res.value;
    }

    const usedNumbers = new Set(campaign.roster.flatMap((u) => u.berthIndices));
    const assignedBerths: number[] = [];
    for (let b = 1; b <= 6 && assignedBerths.length < echSpec.berthCost; b++) {
      if (!usedNumbers.has(b)) assignedBerths.push(b);
    }

    const recruited = compileUnitProfile({
      id: `strike-${Date.now()}`,
      name: synthName.trim() || echSpec.name,
      callsign: synthCallsign.trim() || `BRT-${assignedBerths.join('')}`,
      faction: 'StrikeRoster',
      berthIndices: assignedBerths,
      echelon: synthEchelon,
      chassis: synthChassis,
      doctrine: synthDoctrine,
      lockedHardpoints: synthHardpoints,
      gridX: 3 + assignedBerths[0] * 2,
      gridY: 15,
    });

    soundFX.playObjectiveClaim();
    const nextRoster = [...campaign.roster, recruited];
    onUpdateCampaign({
      ...campaign,
      alloyTreasury: nextAlloy,
      roster: nextRoster,
    });
    setSelectedUnitId(recruited.id);
    setForgeMode('DOSSIER');
    setStatusMessage(
      `Commissioned ${recruited.name} into Berth(s) ${assignedBerths.join(', ')} for ${cost} Alloy.`
    );
  };

  const handleDismissUnit = (unitId: string) => {
    const target = campaign.roster.find((u) => u.id === unitId);
    if (!target) return;
    if (campaign.roster.length <= 1) {
      setStatusMessage('Cannot dismiss the final operative in your Strike Company.');
      return;
    }
    const nextRoster = campaign.roster.filter((u) => u.id !== unitId);
    const refund =
      target.berthIndices.includes(1) && target.echelon === 3
        ? 0
        : ECHELON_SPECS[target.echelon].alloyCost;
    soundFX.playChitDraw();
    onUpdateCampaign({
      ...campaign,
      alloyTreasury: campaign.alloyTreasury + refund,
      roster: nextRoster,
    });
    if (selectedUnitId === unitId) {
      setSelectedUnitId(nextRoster[0]?.id ?? '');
    }
    setStatusMessage(
      `Decommissioned ${target.name} from Berth(s) ${target.berthIndices.join(', ')} (+${refund} Alloy returned).`
    );
  };

  // 3-Commendation (3 XP) Rule: Spend 3 XP to permanently unlock +1 Hardpoint Socket
  const handleUnlockXpSocket = async (unit: CompiledUnit) => {
    const echSpec = ECHELON_SPECS[unit.echelon];
    if (unit.unlockedTotalHardpoints >= echSpec.campaignMaxHardpoints) {
      setStatusMessage(
        `${unit.name} has reached its Echelon ${unit.echelon} maximum of ${echSpec.campaignMaxHardpoints} Hardpoint sockets.`
      );
      return;
    }
    if (unit.xp < 3) {
      setStatusMessage(
        `${unit.name} requires 3 Commendations (XP) to unlock a new Hardpoint socket (currently ${unit.xp}/3 XP).`
      );
      return;
    }
    let nextXp = unit.xp - 3;
    if (wasmBridge) {
      const res = await wasmBridge.dispatchOp(
        'subtract',
        unit.xp,
        3,
        `${unit.name} 3-XP Socket Unlock`
      );
      nextXp = res.value;
    }
    soundFX.playSurgeSpend();
    const nextRoster = campaign.roster.map((u) =>
      u.id === unit.id
        ? { ...u, xp: nextXp, unlockedTotalHardpoints: u.unlockedTotalHardpoints + 1 }
        : u
    );
    onUpdateCampaign({ ...campaign, roster: nextRoster });
    setInstallingSocketOnUnit(true);
    setStatusMessage(
      `Unlocked +1 Hardpoint Socket on ${unit.name} via the 3-Commendation Rule! Select a module below to lock into the open socket.`
    );
  };

  // Install a Hardpoint Module into an open socket on an existing operative
  const handleInstallModuleOnExisting = async (unit: CompiledUnit, modId: string) => {
    const mod = HARDPOINT_MODULES.find((m) => m.id === modId);
    if (!mod) return;
    if (unit.lockedHardpoints.includes(modId)) {
      setStatusMessage(`${unit.name} already has ${mod.name} locked.`);
      return;
    }
    if (mod.minEchelon !== undefined && unit.echelon < mod.minEchelon) {
      setStatusMessage(`${mod.name} requires Echelon ${mod.minEchelon}+.`);
      return;
    }
    const openSlots = unit.unlockedTotalHardpoints - selectedUnitUsedSlots;
    if (mod.slotSize > openSlots) {
      setStatusMessage(
        `${mod.name} requires ${mod.slotSize} open socket(s), but ${unit.name} only has ${openSlots} open.`
      );
      return;
    }
    if (campaign.alloyTreasury < mod.alloyCost) {
      setStatusMessage(
        `Requires ${mod.alloyCost} Alloy to fabricate and lock ${mod.name} (${campaign.alloyTreasury} Alloy available).`
      );
      return;
    }

    let nextAlloy = campaign.alloyTreasury - mod.alloyCost;
    if (wasmBridge) {
      const r = await wasmBridge.dispatchOp(
        'subtract',
        campaign.alloyTreasury,
        mod.alloyCost,
        `Lock ${mod.name} on ${unit.callsign}`
      );
      nextAlloy = r.value;
    }

    const updatedHardpoints = [...unit.lockedHardpoints, modId];
    const recompiled = compileUnitProfile({
      id: unit.id,
      name: unit.name,
      callsign: unit.callsign,
      faction: unit.faction,
      berthIndices: unit.berthIndices,
      echelon: unit.echelon,
      chassis: unit.chassis,
      doctrine: unit.doctrine,
      lockedHardpoints: updatedHardpoints,
      knownDirectives: unit.knownDirectives,
      gridX: unit.gridX,
      gridY: unit.gridY,
      xp: unit.xp,
      penalties: unit.penalties,
    });
    recompiled.unlockedTotalHardpoints = unit.unlockedTotalHardpoints;

    soundFX.playObjectiveClaim();
    onUpdateCampaign({
      ...campaign,
      alloyTreasury: nextAlloy,
      roster: campaign.roster.map((u) => (u.id === unit.id ? recompiled : u)),
    });
    setInstallingSocketOnUnit(false);
    setStatusMessage(`Locked ${mod.name} onto ${unit.name} (-${mod.alloyCost} Alloy).`);
  };

  // Clear permanent Trauma Penalty (2 Alloy, or 0 if Auto-Doc Infirmary is built)
  const handleOverhaulTrauma = async (unit: CompiledUnit) => {
    const hasPenalty =
      unit.penalties.fpr > 0 || unit.penalties.eva > 0 || unit.penalties.cog > 0;
    if (!hasPenalty) return;
    const cost = campaign.bastionFacilities.autoDocInfirmary ? 0 : 2;
    if (campaign.alloyTreasury < cost) {
      setStatusMessage(`Requires ${cost} Alloy for Med-Bay / Repair Overhaul.`);
      return;
    }
    let nextAlloy = campaign.alloyTreasury - cost;
    if (wasmBridge && cost > 0) {
      const res = await wasmBridge.dispatchOp(
        'subtract',
        campaign.alloyTreasury,
        cost,
        'Trauma Overhaul'
      );
      nextAlloy = res.value;
    }
    const nextPenalties = { ...unit.penalties };
    if (nextPenalties.fpr > 0) nextPenalties.fpr--;
    else if (nextPenalties.eva > 0) nextPenalties.eva--;
    else if (nextPenalties.cog > 0) nextPenalties.cog--;

    const recompiled = compileUnitProfile({
      id: unit.id,
      name: unit.name,
      callsign: unit.callsign,
      faction: unit.faction,
      berthIndices: unit.berthIndices,
      echelon: unit.echelon,
      chassis: unit.chassis,
      doctrine: unit.doctrine,
      lockedHardpoints: unit.lockedHardpoints,
      knownDirectives: unit.knownDirectives,
      gridX: unit.gridX,
      gridY: unit.gridY,
      xp: unit.xp,
      penalties: nextPenalties,
    });
    recompiled.unlockedTotalHardpoints = unit.unlockedTotalHardpoints;

    soundFX.playObjectiveClaim();
    onUpdateCampaign({
      ...campaign,
      alloyTreasury: nextAlloy,
      roster: campaign.roster.map((u) => (u.id === unit.id ? recompiled : u)),
    });
    setStatusMessage(`Restored +1 penalized attribute on ${unit.name}.`);
  };

  const selectedBio = useMemo(() => {
    if (!selectedUnit) return null;
    return getOperativeBio(
      selectedUnit.name,
      selectedUnit.doctrine,
      selectedUnit.chassis,
      selectedUnit.echelon
    );
  }, [selectedUnit]);

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div className="p-3.5 bg-slate-900 border border-amber-500/50 rounded-xl text-xs text-amber-300 font-mono flex items-center justify-between">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="underline text-slate-400 hover:text-white ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Visual 6-Berth Deployment Hangar */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">
                Drop Pod Manifest · 6-Berth Cap
              </div>
              <h2 className="text-base font-bold text-white">
                Active Strike Hangar ({occupiedBerths}/6 Berths)
              </h2>
            </div>
            {occupiedBerths < 6 && (
              <button
                type="button"
                onClick={handleStartCommissionWizard}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Commission Operative
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {campaign.roster.map((unit) => {
              const isSelected = forgeMode === 'DOSSIER' && selectedUnit?.id === unit.id;
              const ech = ECHELON_SPECS[unit.echelon];
              const chs = CHASSIS_SPECS[unit.chassis];
              const doc = DOCTRINE_SPECS[unit.doctrine];
              const hasTrauma =
                unit.penalties.fpr > 0 || unit.penalties.eva > 0 || unit.penalties.cog > 0;
              const readyForSocket =
                unit.xp >= 3 && unit.unlockedTotalHardpoints < ech.campaignMaxHardpoints;

              return (
                <div
                  key={unit.id}
                  onClick={() => {
                    soundFX.playChitDraw();
                    setSelectedUnitId(unit.id);
                    onSelectUnitId?.(unit.id);
                    setForgeMode('DOSSIER');
                    setInstallingSocketOnUnit(false);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/95 border-amber-500 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
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
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-amber-400">
                            BERTH {unit.berthIndices.join(' & ')}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            · {unit.callsign}
                          </span>
                          {readyForSocket && (
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">
                              ★ +1 SOCKET READY
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white mt-0.5 truncate">{unit.name}</h3>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs tabular-nums shrink-0">
                      <div className="text-emerald-400 font-semibold">
                        {unit.fpr} / {unit.eva} / {unit.cog}
                      </div>
                      <div className="text-[10px] text-slate-400">FPR / EVA / SYS</div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                    <span>
                      {doc.name} · {chs.name} · {ech.name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {unit.lockedHardpoints.length}/{unit.unlockedTotalHardpoints} Modules · {unit.xp} XP
                    </span>
                  </div>

                  {hasTrauma && (
                    <div className="mt-1.5 text-[11px] font-mono text-red-400">
                      ⚠ Active Combat Trauma (-{unit.penalties.fpr + unit.penalties.eva + unit.penalties.cog} Rating)
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty Hangar Berth Prompt Cards */}
            {occupiedBerths < 6 && (
              <button
                type="button"
                onClick={handleStartCommissionWizard}
                className={`w-full p-4 rounded-xl border border-dashed text-left transition-all flex items-center justify-between cursor-pointer ${
                  forgeMode === 'SYNTHESIS_WIZARD'
                    ? 'bg-amber-500/10 border-amber-500 text-white'
                    : 'bg-slate-950/40 border-slate-800 hover:border-amber-500/50 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs font-mono text-amber-400 uppercase">
                    {6 - occupiedBerths} Open Deployment Berth(s) Available
                  </div>
                  <div className="text-sm font-bold mt-0.5">
                    + Commission New Operative ({campaign.alloyTreasury} Alloy in Treasury)
                  </div>
                </div>
                <Plus className="w-5 h-5 text-amber-400 shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* Right 7 Cols: Contextually Either Selected Operative Dossier OR 4-Step Synthesis Wizard */}
        <div className="lg:col-span-7">
          {forgeMode === 'DOSSIER' && selectedUnit && selectedBio ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
              {/* Top Dossier Identity Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-start gap-4">
                  <UnitPortraitSvg
                    doctrine={selectedUnit.doctrine}
                    chassis={selectedUnit.chassis}
                    echelon={selectedUnit.echelon}
                    hardpoints={selectedUnit.lockedHardpoints}
                    faction={selectedUnit.faction}
                    callsign={selectedUnit.callsign}
                    size="lg"
                    showHashBadge
                  />
                  <div>
                    <div className="text-xs font-mono text-amber-400">
                      BERTH {selectedUnit.berthIndices.join(' & ')} · {selectedUnit.callsign}
                    </div>
                    <h2 className="text-2xl font-bold text-white mt-0.5">
                      {selectedUnit.name}
                    </h2>
                    <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                      {selectedBio.roleTitle} · {selectedBio.origin}
                    </div>
                  </div>
                </div>

                {/* Focused 3-Tab Dossier Frame Selector */}
                <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  {[
                    { id: 'BIO' as const, label: '1. Story & Bio' },
                    { id: 'COMBAT' as const, label: '2. Combat Profile' },
                    {
                      id: 'LOADOUT' as const,
                      label: `3. Loadout (${selectedUnitUsedSlots}/${selectedUnit.unlockedTotalHardpoints})`,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        soundFX.playChitDraw();
                        setDossierTab(tab.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        dossierTab === tab.id
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTIVE TAB 1: STORY, BIOGRAPHY & MED-BAY STATUS */}
              {dossierTab === 'BIO' && (
                <div className="space-y-4">
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {selectedBio.biography}
                    </p>
                    <div className="text-xs text-amber-300 italic pt-2 border-t border-slate-800">
                      {selectedBio.combatQuote}
                    </div>
                  </div>

                  {/* Contextual Trauma Alert if damaged */}
                  {(selectedUnit.penalties.fpr > 0 ||
                    selectedUnit.penalties.eva > 0 ||
                    selectedUnit.penalties.cog > 0) ? (
                    <div className="p-4 bg-red-950/30 border border-red-500/40 rounded-xl flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                          <HeartPulse className="w-4 h-4 text-red-400" />
                          Active Combat Trauma
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Sustained in prior drop: Firepower -{selectedUnit.penalties.fpr}, Evasion -{selectedUnit.penalties.eva}, Systems -{selectedUnit.penalties.cog}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOverhaulTrauma(selectedUnit)}
                        className="px-3.5 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Med-Bay Overhaul ({campaign.bastionFacilities.autoDocInfirmary ? 'FREE' : '2 Alloy'})
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-4 text-xs">
                      <span className="text-slate-300">
                        Medical Status: <strong className="text-emerald-400">Cleared for Subterranean Drop</strong> · Service Commendations: <strong className="text-amber-400">{selectedUnit.xp} XP</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDismissUnit(selectedUnit.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-500/40 text-xs text-slate-400 hover:text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Decommission
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVE TAB 2: COMBAT PROFILE, DOCTRINE & CHASSIS TRAITS */}
              {dossierTab === 'COMBAT' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="text-[10px] text-slate-400">COMBAT RATINGS</div>
                      <div className="text-base font-bold text-white mt-1">
                        {selectedUnit.fpr} / {selectedUnit.eva} / {selectedUnit.cog}
                      </div>
                      <div className="text-[10px] text-emerald-400 mt-0.5">
                        Firepower · Evasion · Systems
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="text-[10px] text-slate-400">
                        {CHASSIS_SPECS[selectedUnit.chassis].trackLabel.toUpperCase()}
                      </div>
                      <div className="text-base font-bold text-emerald-400 mt-1">
                        {selectedUnit.maxIntegrityPerModel} HP
                        {selectedUnit.modelsMax > 1 ? ` × ${selectedUnit.modelsMax}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Armor {selectedUnit.plating} · Toughness {selectedUnit.resilience}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="text-[10px] text-slate-400">MOBILITY &amp; RANGE</div>
                      <div className="text-base font-bold text-white mt-1">
                        {selectedUnit.mov}&quot; Move · {selectedUnit.rangedRange || 2}&quot; Rng
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {selectedUnit.rangedRange > 0 ? 'Ranged & Melee' : 'Close Quarters'}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="text-[10px] text-slate-400">SURGE CAPACITORS</div>
                      <div className="text-base font-bold text-amber-400 mt-1">
                        {selectedUnit.maxSurge} Cells / Turn
                      </div>
                      <div className="text-[10px] text-amber-300/80 mt-0.5 truncate">
                        {DOCTRINE_SPECS[selectedUnit.doctrine].surgeTriggerName}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                      <div className="font-mono text-[11px] text-amber-400 font-bold">
                        Doctrine: {DOCTRINE_SPECS[selectedUnit.doctrine].name} — {DOCTRINE_LORE[selectedUnit.doctrine].roleTitle}
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        {DOCTRINE_LORE[selectedUnit.doctrine].prose}
                      </p>
                      <p className="text-emerald-400 text-[11px] font-medium pt-1">
                        Signature Ability ({DOCTRINE_SPECS[selectedUnit.doctrine].surgeTriggerName}): {DOCTRINE_SPECS[selectedUnit.doctrine].surgeTriggerDescription}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                      <div className="font-mono text-[11px] text-emerald-400 font-bold">
                        Physiology: {CHASSIS_SPECS[selectedUnit.chassis].name} — {CHASSIS_LORE[selectedUnit.chassis].tagline}
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        {CHASSIS_LORE[selectedUnit.chassis].prose}
                      </p>
                      <p className="text-amber-300 text-[11px] font-medium pt-1">
                        Passive Trait: {CHASSIS_SPECS[selectedUnit.chassis].traitDescription}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTIVE TAB 3: HARDPOINT LOADOUT, XP ADVANCEMENT & RESONANCE DIRECTIVES */}
              {dossierTab === 'LOADOUT' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-400" />
                        Hardpoint Sockets ({selectedUnitUsedSlots} / {selectedUnit.unlockedTotalHardpoints} Equipped · Max {ECHELON_SPECS[selectedUnit.echelon].campaignMaxHardpoints})
                      </h3>
                      <p className="text-xs text-slate-400">
                        Unlock new equipment sockets every 3 Service Commendations (XP) earned from surviving drops.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-amber-400 tabular-nums">
                        {selectedUnit.xp} / 3 XP
                      </span>
                      {selectedUnit.xp >= 3 &&
                        selectedUnit.unlockedTotalHardpoints <
                          ECHELON_SPECS[selectedUnit.echelon].campaignMaxHardpoints && (
                          <button
                            type="button"
                            onClick={() => handleUnlockXpSocket(selectedUnit)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Spend 3 XP → Unlock Socket
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Equipped Hardpoint Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedUnit.lockedHardpoints.map((hpId) => {
                      const mod = HARDPOINT_MODULES.find((m) => m.id === hpId);
                      if (!mod) return null;
                      return (
                        <div
                          key={hpId}
                          className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-amber-400">
                            <span>{mod.name}</span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {mod.slotSize} Socket{mod.slotSize > 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                            {mod.effectSummary}
                          </p>
                        </div>
                      );
                    })}

                    {/* Open Socket Install Trigger */}
                    {selectedUnitUsedSlots < selectedUnit.unlockedTotalHardpoints && (
                      <button
                        type="button"
                        onClick={() => setInstallingSocketOnUnit((prev) => !prev)}
                        className="p-3 rounded-xl border border-dashed border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/15 text-left transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-bold text-emerald-300">
                            {selectedUnit.unlockedTotalHardpoints - selectedUnitUsedSlots} Open Hardpoint Socket(s)
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Click to mount a new weapon or system module
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                      </button>
                    )}
                  </div>

                  {/* Contextual Socket Installation Drawer */}
                  {installingSocketOnUnit &&
                    selectedUnitUsedSlots < selectedUnit.unlockedTotalHardpoints && (
                      <div className="p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-300">
                            Select Module to Mount ({campaign.alloyTreasury} Alloy Available)
                          </span>
                          <button
                            type="button"
                            onClick={() => setInstallingSocketOnUnit(false)}
                            className="text-xs text-slate-400 hover:text-white cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                          {HARDPOINT_MODULES.filter(
                            (m) => !selectedUnit.lockedHardpoints.includes(m.id)
                          ).map((mod) => (
                            <button
                              key={mod.id}
                              type="button"
                              onClick={() => handleInstallModuleOnExisting(selectedUnit, mod.id)}
                              className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-white">
                                <span>{mod.name}</span>
                                <span className="font-mono text-[11px] text-amber-400">
                                  {mod.alloyCost} Alloy · {mod.slotSize}S
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                                {mod.effectSummary}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Known Resonance Directives */}
                  {selectedUnit.knownDirectives.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-800">
                      <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Attuned Resonance Directives ({selectedUnit.knownDirectives.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedUnit.knownDirectives.map((dirId) => {
                          const dir = MINOR_RESONANCE_DIRECTIVES.find((d) => d.id === dirId);
                          if (!dir) return null;
                          return (
                            <div
                              key={dirId}
                              className="p-2.5 bg-slate-950 border border-cyan-500/30 rounded-lg text-xs"
                            >
                              <div className="flex items-center justify-between font-bold text-cyan-300">
                                <span>{dir.name}</span>
                                <span className="font-mono text-[10px]">
                                  {dir.surgeCost === 0 ? '0 Surge (Safe)' : `${dir.surgeCost} Surge`}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">{dir.summary}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Guided 4-Step 3D Unit Synthesis Wizard */
            <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs font-mono text-amber-400 uppercase">
                    Orbital Foundry · Operative Commissioning (Step {wizardStep} of 4)
                  </div>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    Commission New Strike Operative
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setForgeMode('DOSSIER')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
                >
                  Cancel &amp; Return to Dossier
                </button>
              </div>

              {/* 4-Step Wizard Progress Bar */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { step: 1 as const, label: '1. Echelon Rank' },
                  { step: 2 as const, label: '2. Chassis Frame' },
                  { step: 3 as const, label: '3. Combat Doctrine' },
                  { step: 4 as const, label: '4. Hardpoints' },
                ].map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setWizardStep(s.step)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold font-mono border text-center transition-colors cursor-pointer ${
                      wizardStep === s.step
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : wizardStep > s.step
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* STEP 1: ECHELON [Z] */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Step 1: Select Echelon Rank
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Determines squad scale, drop-pod berth footprint, base combat ratings, and Alloy commissioning cost.
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {([0, 1, 2, 3, 4] as EchelonTier[]).map((tier) => {
                      const spec = ECHELON_SPECS[tier];
                      const lore = ECHELON_LORE[tier];
                      const active = synthEchelon === tier;
                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => {
                            soundFX.playChitDraw();
                            setSynthEchelon(tier);
                            setSynthHardpoints([]);
                          }}
                          className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-4 ${
                            active
                              ? 'bg-amber-500/15 border-amber-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-amber-400">
                                Echelon {tier} · {spec.name}
                              </span>
                              <span className="text-xs font-mono text-slate-400">
                                ({spec.unitCount} Unit{spec.unitCount > 1 ? 's' : ''} · {spec.berthCost} Berth{spec.berthCost > 1 ? 's' : ''})
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1">{lore.prose}</p>
                          </div>
                          <div className="text-right font-mono shrink-0 tabular-nums">
                            <div className="text-sm font-bold text-amber-400">
                              {spec.alloyCost} Alloy
                            </div>
                            <div className="text-[11px] text-emerald-400">
                              Ratings {spec.baseFpr}/{spec.baseEva}/{spec.baseCog} · {spec.startingHardpoints} Socket(s)
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: CHASSIS [Y] */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Step 2: Select Chassis Physiology
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Determines how the operative absorbs damage (Biological Integrity vs Mechanical Hull Plating) and its native defensive traits.
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {(Object.keys(CHASSIS_SPECS) as ChassisType[]).map((cid) => {
                      const spec = CHASSIS_SPECS[cid];
                      const lore = CHASSIS_LORE[cid];
                      const active = synthChassis === cid;
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => {
                            soundFX.playChitDraw();
                            setSynthChassis(cid);
                          }}
                          className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? 'bg-emerald-500/15 border-emerald-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">
                              {spec.name} — <span className="text-emerald-300 font-normal">{lore.tagline}</span>
                            </span>
                            <span className="text-xs font-mono text-emerald-400">
                              {spec.trackLabel} · Armor {spec.nativePlating}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{lore.prose}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: DOCTRINE [X] */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Step 3: Select Combat Doctrine
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Determines tactical role, combat rating bonuses, and the operative&apos;s signature Surge ability.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(DOCTRINE_SPECS) as DoctrineRole[]).map((did) => {
                      const spec = DOCTRINE_SPECS[did];
                      const lore = DOCTRINE_LORE[did];
                      const active = synthDoctrine === did;
                      return (
                        <button
                          key={did}
                          type="button"
                          onClick={() => {
                            soundFX.playChitDraw();
                            setSynthDoctrine(did);
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? 'bg-amber-500/15 border-amber-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{spec.name}</span>
                            <span className="text-[11px] font-mono text-amber-400">
                              {lore.roleTitle}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            {lore.prose}
                          </p>
                          <div className="text-xs font-semibold text-emerald-400 mt-1.5">
                            ⚡ {spec.surgeTriggerName}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4: STARTING HARDPOINTS & CALLSIGN */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Operative Name
                      </label>
                      <input
                        type="text"
                        value={synthName}
                        onChange={(e) => setSynthName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Tactical Callsign
                      </label>
                      <input
                        type="text"
                        value={synthCallsign}
                        onChange={(e) => setSynthCallsign(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-400">
                        Select Starting Hardpoint Modules ({synthSlotsUsed} / {synthMaxStartSlots} Sockets Used)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {HARDPOINT_MODULES.map((mod) => {
                        const selected = synthHardpoints.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => handleToggleSynthHardpoint(mod.id)}
                            className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                              selected
                                ? 'bg-amber-500/20 border-amber-500 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span>{mod.name}</span>
                              <span className="font-mono text-[11px] text-amber-400">
                                {mod.slotSize} Socket{mod.slotSize > 1 ? 's' : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                              {mod.effectSummary}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Live Synthesized Visual Preview Bar & Step Navigation */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <UnitPortraitSvg
                      doctrine={synthPreview.doctrine}
                      chassis={synthPreview.chassis}
                      echelon={synthPreview.echelon}
                      hardpoints={synthPreview.lockedHardpoints}
                      faction="StrikeRoster"
                      callsign={synthPreview.callsign}
                      size="lg"
                      showHashBadge
                    />
                    <div className="space-y-1 font-mono text-xs">
                      <div className="text-emerald-400 font-bold">
                        LIVE SYNTHESIS PROFILE: [{synthPreview.doctrine} · {synthPreview.chassis} · Echelon {synthPreview.echelon}]
                      </div>
                      <div className="text-white tabular-nums">
                        Firepower {synthPreview.fpr} · Evasion {synthPreview.eva} · Systems {synthPreview.cog} · Move {synthPreview.mov}&quot; · Health {synthPreview.maxIntegrityPerModel}×{synthPreview.modelsMax} · Surge {synthPreview.maxSurge}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Visual Silhouette updates dynamically as you configure Rank, Chassis, Doctrine &amp; Modules
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  {wizardStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep((s) => (s - 1) as WizardStep)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Previous Step
                    </button>
                  ) : (
                    <div />
                  )}

                  {wizardStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep((s) => (s + 1) as WizardStep)}
                      className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      Next Step
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRecruitUnit}
                      className="px-5 py-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Deploy Operative to Hangar ({ECHELON_SPECS[synthEchelon].alloyCost} Alloy)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
