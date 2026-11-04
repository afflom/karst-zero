import React, { useEffect, useState } from 'react';
import {
  Play,
  ChevronRight,
  AlertTriangle,
  Plus,
  CheckCircle2,
  X,
  Radio,
  Volume2,
  VolumeX,
  BookOpen,
} from 'lucide-react';
import type {
  CampaignState,
  CompiledUnit,
} from './game/types';
import {
  SCENARIO_SPECS,
  STARTING_COMPANY_PRESETS,
} from './game/catalog';
import {
  buildKarstHoloArchive,
  KarstWasmMathBridge,
  KARST_PRODUCT_MODEL_DATA,
} from './lib/karstHoloModel';
import type {
  LoadedHoloState,
  DispatchLogEntry,
} from './lib/prismAuthoring';
import { soundFX } from './game/sound';
import { CampaignHubView, type BastionStage } from './components/CampaignHubView';
import { BattlefieldView } from './components/BattlefieldView';
import { PauseAuditModal } from './components/PauseAuditModal';
import {
  KARST_WORLD_PREMISE,
  SCENARIO_NARRATIVES,
} from './game/lore';

type ThreatTier = 'Low' | 'Medium' | 'High';

const STORAGE_KEY = 'karst_zero_horizon_campaign_v4';

function createInitialCampaign(
  companyName = '7th Obsidian Strike Company',
  presetId = 'preset-vanguard'
): CampaignState {
  const preset =
    STARTING_COMPANY_PRESETS.find((p) => p.id === presetId) ??
    STARTING_COMPANY_PRESETS[0];
  return {
    companyName,
    alloyTreasury: preset.startingAlloy,
    reconProgress: 2,
    prepTokens: 1,
    consumablesCount: 1,
    completedContracts: 0,
    bastionFacilities: {
      autoDocInfirmary: false,
      deepScanArray: false,
      ordnanceFoundry: false,
    },
    roster: preset.buildRoster(),
  };
}

export default function App() {
  // Single Continuous Player-Journey State:
  // Either in Low-Karst Orbit (with optional Title Prologue Curtain) or descended into a Subterranean Vault Drop
  const [inBattlefield, setInBattlefield] = useState<boolean>(false);
  const [prologueCurtainOpen, setPrologueCurtainOpen] = useState<boolean>(true);
  const [showSurvivalGuide, setShowSurvivalGuide] = useState<boolean>(false);
  const [bastionInitialStage, setBastionInitialStage] = useState<BastionStage>('NONE');

  const [campaign, setCampaign] = useState<CampaignState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed.companyName === 'string' &&
          Array.isArray(parsed.roster) &&
          parsed.roster.length > 0 &&
          parsed.bastionFacilities
        ) {
          return parsed as CampaignState;
        }
      }
    } catch {
      // Fallback to default campaign state
    }
    return createInitialCampaign();
  });

  // Guided New Company Commissioning Modal State
  const [commissionModalOpen, setCommissionModalOpen] = useState<boolean>(false);
  const [newCompanyName, setNewCompanyName] = useState<string>('9th Obsidian Strike Company');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset-vanguard');

  // Active combat launch configuration
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const [selectedThreat, setSelectedThreat] = useState<ThreatTier>('Low');

  // Prism .holo v4 Archive & Core-Wasm Runtime State
  const [holoState, setHoloState] = useState<LoadedHoloState | null>(null);
  const [holoError, setHoloError] = useState<string | null>(null);
  const [wasmBridge, setWasmBridge] = useState<KarstWasmMathBridge | null>(null);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLogEntry[]>([]);

  // Pause-Menu System & Telemetry Audit Modal (`ESC`)
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);

  // Persist campaign state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign));
    } catch {
      // Ignore storage quota errors
    }
  }, [campaign]);

  // Boot the KarstZeroHorizon.holo v4 archive on mount
  useEffect(() => {
    let cancelled = false;
    async function bootKarstHolo() {
      try {
        const loaded = await buildKarstHoloArchive();
        if (cancelled) return;
        setHoloState(loaded);

        const bridge = new KarstWasmMathBridge(loaded.app, (entry) => {
          setDispatchLogs((prev) => [entry, ...prev.slice(0, 59)]);
        });
        setWasmBridge(bridge);

        await bridge.dispatchOp('subtract', 16, 16, 'Initial 16-Alloy Recruitment Check');
        await loaded.app.acceptance();
      } catch (err) {
        if (!cancelled) {
          setHoloError(err instanceof Error ? err.message : String(err));
        }
      }
    }
    bootKarstHolo();
    return () => {
      cancelled = true;
    };
  }, []);

  // Global ESC key handler for Pause-Menu System & Telemetry Audit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundFX.playChitDraw();
        setAuditModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Bridge embedded HOLOVIEW v1 iframe /_hologram/intent requests to Core-Wasm app.dispatch
  useEffect(() => {
    if (!holoState) return;
    const handleMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== 'PRISM_HOLOVIEW_INTENT') return;
      try {
        const reqBytes = new Uint8Array(data.bytes ?? []);
        const t0 = performance.now();
        const resBytes = await holoState.app.dispatch(reqBytes);
        const durationMs = Number((performance.now() - t0).toFixed(2));
        const decoder = new TextDecoder();
        const reqText = decoder.decode(reqBytes);
        const resText = decoder.decode(resBytes);
        setDispatchLogs((prev) => [
          {
            id: `holoview-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            source: 'holoview-intent',
            requestText: `${reqText} [HOLOVIEW v1]`,
            requestHex: Array.from(reqBytes)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join(' '),
            requestByteLength: reqBytes.length,
            responseText: resText,
            responseHex: Array.from(resBytes)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join(' '),
            responseByteLength: resBytes.length,
            durationMs,
            status: resText.includes('\tok\t') ? 'ok' : 'error',
          },
          ...prev.slice(0, 59),
        ]);
        if (event.source && 'postMessage' in event.source) {
          (event.source as WindowProxy).postMessage(
            {
              type: 'PRISM_HOLOVIEW_RESPONSE',
              id: data.id,
              ok: true,
              status: 200,
              bytes: Array.from(resBytes),
            },
            '*'
          );
        }
      } catch (err) {
        if (event.source && 'postMessage' in event.source) {
          (event.source as WindowProxy).postMessage(
            {
              type: 'PRISM_HOLOVIEW_RESPONSE',
              id: data.id,
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            '*'
          );
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [holoState]);

  const handleToggleSound = () => {
    const nextMuted = !soundMuted;
    setSoundMuted(nextMuted);
    soundFX.muted = nextMuted;
    if (!nextMuted) soundFX.playChitDraw();
  };

  const handleCommissionNewCompany = () => {
    soundFX.playObjectiveClaim();
    const fresh = createInitialCampaign(
      newCompanyName.trim() || '7th Obsidian Strike Company',
      selectedPresetId
    );
    setCampaign(fresh);
    setCommissionModalOpen(false);
    setPrologueCurtainOpen(false);
    setBastionInitialStage('HANGAR');
    setInBattlefield(false);
  };

  const handleLaunchProvingGrounds = () => {
    soundFX.playObjectiveClaim();
    setSelectedScenarioIndex(0);
    setSelectedThreat('Low');
    setPrologueCurtainOpen(false);
    setInBattlefield(true);
  };

  const handleCompleteMission = (result: {
    victory: boolean;
    playerVp: number;
    wardenVp: number;
    alloyEarned: number;
    updatedRoster: CompiledUnit[];
  }) => {
    setCampaign((prev) => ({
      ...prev,
      alloyTreasury: prev.alloyTreasury + result.alloyEarned,
      completedContracts: prev.completedContracts + 1,
      roster: result.updatedRoster,
    }));
    setBastionInitialStage('NONE');
    setInBattlefield(false);
  };

  const activeScenario = SCENARIO_SPECS[selectedScenarioIndex] ?? SCENARIO_SPECS[0];
  const activeNarrative = SCENARIO_NARRATIVES[activeScenario.number] ?? SCENARIO_NARRATIVES[1];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#030712] text-slate-100 select-none selection:bg-amber-500 selection:text-slate-950">
      {/* Discrete In-World Corner Utility Pill (Audio & Telemetry / ESC Menu) */}
      <div className="fixed top-3 right-4 z-40 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-xl">
        <button
          type="button"
          onClick={handleToggleSound}
          className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {soundMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>{soundMuted ? 'Muted' : 'Audio'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playChitDraw();
            setAuditModalOpen(true);
          }}
          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          ESC · Telemetry
        </button>
      </div>

      {/* Error banner if .holo v4 boot failed */}
      {holoError && (
        <div className="fixed top-14 left-4 right-4 z-50 bg-rose-950/95 border border-rose-500/40 rounded-xl px-4 py-2 text-xs text-rose-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Runtime Archive Initialization Alert: {holoError}</span>
          </div>
        </div>
      )}

      {/* SINGLE CONTINUOUS PLAYER-JOURNEY VIEWPORT */}
      {!inBattlefield ? (
        <>
          {/* Live Interactive Spatial World of Low-Karst Orbit (Carrier & Planet Karst-9) */}
          <CampaignHubView
            campaign={campaign}
            onUpdateCampaign={setCampaign}
            wasmBridge={wasmBridge}
            selectedScenarioIndex={selectedScenarioIndex}
            onSelectScenarioIndex={setSelectedScenarioIndex}
            selectedThreat={selectedThreat}
            onSelectThreat={setSelectedThreat}
            onStartTacticalDrop={() => {
              soundFX.playObjectiveClaim();
              setPrologueCurtainOpen(false);
              setInBattlefield(true);
            }}
            onOpenPrologue={() => {
              soundFX.playChitDraw();
              setPrologueCurtainOpen(true);
            }}
            initialStage={bastionInitialStage}
          />

          {/* Atmospheric Title & Mission Prologue Curtain Over the Live Orbital World */}
          {prologueCurtainOpen && (
            <div className="fixed inset-0 z-30 bg-slate-950/78 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto select-text">
              <div className="max-w-3xl w-full rounded-2xl bg-slate-900/95 border border-slate-700/90 p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="space-y-2 border-b border-slate-800 pb-5">
                  <div className="text-xs font-mono text-amber-400">
                    {KARST_WORLD_PREMISE.subtitle} · Powered by {KARST_PRODUCT_MODEL_DATA.engineIdentity.engineName}
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                    KARST:{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-emerald-400">
                      ZERO HORIZON
                    </span>
                  </h1>
                  <p className="text-sm sm:text-base font-medium text-slate-300">
                    {KARST_WORLD_PREMISE.headline}
                  </p>
                </div>

                {/* Narrative Setting & Flight Director Transmission */}
                <div className="space-y-3 text-sm text-slate-200 leading-relaxed">
                  <p>{KARST_WORLD_PREMISE.leadParagraph}</p>
                  <p className="text-slate-300">{KARST_WORLD_PREMISE.bastionRoleParagraph}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-xs font-mono text-emerald-400 flex items-center gap-2 font-semibold">
                    <Radio className="w-3.5 h-3.5" />
                    <span>INCOMING TRANSMISSION · {activeNarrative.locationHeader}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 italic leading-relaxed">
                    {activeNarrative.flightDirectorQuote}
                  </p>
                </div>

                {/* Optional Collapsible 3-Pillar Field Manual */}
                {showSurvivalGuide && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {KARST_WORLD_PREMISE.threePillars.map((pillar) => (
                      <div
                        key={pillar.title}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                      >
                        <div className="text-[11px] font-mono text-amber-400 font-bold">
                          {pillar.number}
                        </div>
                        <h3 className="text-xs font-bold text-white">{pillar.title}</h3>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {pillar.prose}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Player-Journey Entry Actions */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playObjectiveClaim();
                      setPrologueCurtainOpen(false);
                    }}
                    className="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-between gap-3 font-bold text-sm shadow-lg shadow-amber-500/20 transition-colors cursor-pointer"
                  >
                    <span>
                      Step Aboard Orbital Bastion ({campaign.companyName} · Operation #
                      {campaign.completedContracts + 1})
                    </span>
                    <ChevronRight className="w-5 h-5 shrink-0" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={handleLaunchProvingGrounds}
                      className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Quick Drop: Vault 01
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playChitDraw();
                        setCommissionModalOpen(true);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      Commission New Company
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playChitDraw();
                        setShowSurvivalGuide((prev) => !prev);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                      {showSurvivalGuide ? 'Hide Field Guide' : 'How to Play'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <BattlefieldView
          campaign={campaign}
          scenario={activeScenario}
          threatLevel={selectedThreat}
          wasmBridge={wasmBridge}
          onCompleteMission={handleCompleteMission}
          onAbortToHub={() => {
            soundFX.playChitDraw();
            setInBattlefield(false);
          }}
        />
      )}

      {/* Guided New Strike Company Commissioning Modal */}
      {commissionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono text-amber-400">
                  Strike Company Charter
                </div>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  Commission New Strike Company
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCommissionModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Strike Company Designation
              </label>
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-300">
                Select Starting 6-Berth Charter (1 Prime Leader + 16 Alloy Roster)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTING_COMPANY_PRESETS.map((preset) => {
                  const active = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        soundFX.playChitDraw();
                        setSelectedPresetId(preset.id);
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-amber-500/15 border-amber-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{preset.name}</span>
                        {active && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                      <div className="text-[11px] font-mono text-amber-400 mt-0.5">
                        {preset.tagline}
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        {preset.playstyle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCommissionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommissionNewCompany}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Commission Company &amp; Enter Orbital Bastion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause-Menu System & Telemetry Audit Modal (`ESC`) */}
      <PauseAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        holoState={holoState}
        campaign={campaign}
        dispatchLogs={dispatchLogs}
        onClearLogs={() => setDispatchLogs([])}
      />
    </div>
  );
}
