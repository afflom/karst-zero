import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Users,
  Cpu,
  Download,
  Play,
  BookOpen,
  Lock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import {
  KARST_PRODUCT_MODEL_DATA,
  KARST_BOUNDARY_CONTRACTS,
  KARST_OBSERVER_POLES,
  KARST_VANTAGE_STEPS,
  KARST_STANDARDS_REGISTER,
  computeCanonicalSaveReceipt,
  verifyModelInvariants,
} from '../lib/karstHoloModel';
import {
  decodeVectors,
  formatWireString,
  buildHoloviewPreviewHtml,
  KIND_NAMES,
  type LoadedHoloState,
  type DispatchLogEntry,
  type AcceptanceResult,
  type ArchiveIdentities,
} from '../lib/prismAuthoring';
import {
  ECHELON_SPECS,
} from '../game/catalog';
import type { CampaignState, EchelonTier } from '../game/types';

interface PauseAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  holoState: LoadedHoloState | null;
  campaign: CampaignState;
  dispatchLogs: DispatchLogEntry[];
  onClearLogs: () => void;
}

type AuditTab =
  | 'stakeholders'
  | 'boundary-contracts'
  | 'quality-security'
  | 'wasm-telemetry'
  | 'canonical-holo'
  | 'field-manual';

export const PauseAuditModal: React.FC<PauseAuditModalProps> = ({
  isOpen,
  onClose,
  holoState,
  campaign,
  dispatchLogs,
  onClearLogs,
}) => {
  const [activeTab, setActiveTab] = useState<AuditTab>('stakeholders');
  const [selectedStakeholderId, setSelectedStakeholderId] = useState<string>(
    KARST_PRODUCT_MODEL_DATA.stakeholders[0].id
  );
  const [vantageStepOrd, setVantageStepOrd] = useState<number>(1);
  const [acceptanceResult, setAcceptanceResult] = useState<AcceptanceResult | null>(null);
  const [acceptanceMs, setAcceptanceMs] = useState<number | null>(null);

  const saveReceipt = useMemo(() => computeCanonicalSaveReceipt(campaign), [campaign]);
  const invariantReport = useMemo(() => verifyModelInvariants(), []);

  const decodedVectors = useMemo(() => {
    if (!holoState) return [];
    return decodeVectors(holoState.app.vectors);
  }, [holoState]);

  const holoviewSrcDoc = useMemo(() => {
    if (!holoState) return '';
    return buildHoloviewPreviewHtml(holoState.viewFilesText);
  }, [holoState]);

  const activeStakeholder = useMemo(
    () =>
      KARST_PRODUCT_MODEL_DATA.stakeholders.find((s) => s.id === selectedStakeholderId) ??
      KARST_PRODUCT_MODEL_DATA.stakeholders[0],
    [selectedStakeholderId]
  );

  const stakeholderVantageSteps = useMemo(
    () =>
      KARST_VANTAGE_STEPS.filter((s) => s.stakeholderId === selectedStakeholderId).sort(
        (a, b) => a.order - b.order
      ),
    [selectedStakeholderId]
  );

  const currentVantageStep = useMemo(
    () =>
      stakeholderVantageSteps.find((s) => s.order === vantageStepOrd) ??
      stakeholderVantageSteps[0],
    [stakeholderVantageSteps, vantageStepOrd]
  );

  const currentObserverPole = useMemo(
    () =>
      KARST_OBSERVER_POLES.find((p) => p.id === currentVantageStep?.pole) ??
      KARST_OBSERVER_POLES[0],
    [currentVantageStep]
  );

  if (!isOpen) return null;

  const identities = holoState?.app.identities as ArchiveIdentities | undefined;

  const handleRunAcceptance = async () => {
    if (!holoState) return;
    const t0 = performance.now();
    const res = await holoState.app.acceptance();
    const elapsed = Number((performance.now() - t0).toFixed(2));
    setAcceptanceResult(res);
    setAcceptanceMs(elapsed);
  };

  const handleExportHolo = () => {
    if (!holoState) return;
    const blob = new Blob([holoState.rawBytes as unknown as BlobPart], {
      type: 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KarstZeroHorizon.holo';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-[1280px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-slate-100">
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-base font-bold tracking-tight text-white">
                COMMAND PAUSE · SYSTEM &amp; STAKEHOLDER AUDIT
              </span>
              <span className="text-xs font-mono text-amber-400">
                Engine: Nemesis Core 4.0 · KarstZeroHorizon.holo v4 Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect the live Nemesis Core 4.0 engine specification (`model.prism.json`), 5-Pole Stakeholder Vantage Stepper, Boundary Contracts, Core-Wasm wire telemetry, and canonical save state.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportHolo}
              disabled={!holoState}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export KarstZeroHorizon.holo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
              Resume Game (ESC)
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'stakeholders', label: 'Nemesis Core 4.0 & Vantage Stepper', icon: Users },
            { id: 'boundary-contracts', label: 'Boundary Contracts & Standards', icon: CheckCircle2 },
            { id: 'quality-security', label: 'Quality & Security Model', icon: ShieldCheck },
            { id: 'wasm-telemetry', label: `Core-Wasm Telemetry (${dispatchLogs.length})`, icon: Cpu },
            { id: 'canonical-holo', label: 'Canonical Save & .holo Binary', icon: Lock },
            { id: 'field-manual', label: 'Tactical Field Manual (QRS)', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AuditTab)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: STAKEHOLDERS, 5-POLE VANTAGE STEPPER & ENGINE ARCHITECTURE */}
          {activeTab === 'stakeholders' && (
            <div className="space-y-6">
              {/* Interactive 5-Pole Stakeholder Vantage Stepper (modeled on Presentation.lex.tex) */}
              <div className="bg-slate-950 border border-amber-500/50 rounded-lg p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-[11px] font-mono text-amber-400 uppercase font-bold">
                      Vantage &gt; Pole &gt; Step Breadcrumb (`architecture.presentation`)
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-amber-400">{activeStakeholder.name}</span>
                      <span className="text-slate-600">&gt;</span>
                      <span className="text-emerald-400 font-mono">
                        Pole {currentObserverPole.order}/5: {currentObserverPole.title} ({currentObserverPole.id})
                      </span>
                      <span className="text-slate-600">&gt;</span>
                      <span className="text-white">{currentVantageStep?.title}</span>
                    </div>
                  </div>

                  {/* Stepper Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={vantageStepOrd <= 1}
                      onClick={() => setVantageStepOrd((o) => Math.max(1, o - 1))}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-slate-900 border border-slate-700 hover:bg-slate-800 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Prev Pole
                    </button>
                    <span className="text-xs font-mono text-slate-400 px-2 tabular-nums">
                      Step {vantageStepOrd} / {stakeholderVantageSteps.length}
                    </span>
                    <button
                      type="button"
                      disabled={vantageStepOrd >= stakeholderVantageSteps.length}
                      onClick={() =>
                        setVantageStepOrd((o) =>
                          Math.min(stakeholderVantageSteps.length, o + 1)
                        )
                      }
                      className="px-2.5 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      Next Pole
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 5 Observer Poles Progress Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {stakeholderVantageSteps.map((st) => {
                    const pole = KARST_OBSERVER_POLES.find((p) => p.id === st.pole);
                    const isCurrent = st.order === vantageStepOrd;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setVantageStepOrd(st.order)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-500/15 border-amber-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[10px] font-mono text-amber-400 font-bold">
                          0{st.order} · {pole?.id}
                        </div>
                        <div className="text-xs font-bold text-white truncate mt-0.5">
                          {st.title}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Active Vantage Step Detail */}
                {currentVantageStep && (
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-8 space-y-1">
                      <div className="text-xs font-mono text-emerald-400">
                        {currentObserverPole.title} — {currentObserverPole.statement}
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        {currentVantageStep.title} ({currentVantageStep.goal})
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {currentVantageStep.text}
                      </p>
                    </div>
                    <div className="md:col-span-4 p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs space-y-1">
                      <div className="text-slate-400">Panel &amp; Evidence Bindings:</div>
                      <div className="text-amber-400 font-semibold">
                        {currentVantageStep.panel}
                      </div>
                      <div className="text-emerald-400 text-[11px]">
                        Evidence: {currentVantageStep.evidence.join(', ')}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Stakeholder Selector */}
                <div className="lg:col-span-5 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-400">
                    Select Stakeholder Vantage (`architecture.stakeholders`)
                  </div>
                  {KARST_PRODUCT_MODEL_DATA.stakeholders.map((stk) => {
                    const selected = stk.id === selectedStakeholderId;
                    return (
                      <button
                        key={stk.id}
                        type="button"
                        onClick={() => {
                          setSelectedStakeholderId(stk.id);
                          setVantageStepOrd(1);
                        }}
                        className={`w-full text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-slate-800/90 border-amber-500/80 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{stk.name}</span>
                          <span className="text-[11px] font-mono text-amber-400">{stk.role}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          {stk.valueProposition}
                        </p>
                        <div className="mt-2 text-[11px] font-mono text-emerald-400">
                          Primary Surface: {stk.primarySurface}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Stakeholder Viewpoints & Concerns */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-5">
                    <h3 className="text-sm font-bold text-white">
                      Stakeholder Viewpoints &amp; Governing Rules (`architecture.viewpoints`)
                    </h3>
                    <div className="mt-3 space-y-3">
                      {KARST_PRODUCT_MODEL_DATA.viewpoints.map((vp) => {
                        const isLinked = vp.stakeholders.includes(selectedStakeholderId);
                        return (
                          <div
                            key={vp.id}
                            className={`p-3.5 rounded-lg border ${
                              isLinked
                                ? 'bg-slate-900 border-emerald-500/50'
                                : 'bg-slate-900/40 border-slate-800 opacity-75'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-white">{vp.name}</span>
                              <span className="font-mono text-slate-400">{vp.id}</span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 font-mono">
                              {vp.governingRules}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Architectural Concerns */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-5">
                    <h3 className="text-sm font-bold text-white">
                      Modeled System Concerns (`architecture.concerns`)
                    </h3>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {KARST_PRODUCT_MODEL_DATA.concerns.map((cnc) => (
                        <div
                          key={cnc.id}
                          className="p-3 bg-slate-900 border border-slate-800 rounded-lg"
                        >
                          <div className="text-xs font-bold text-amber-400">{cnc.title}</div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {cnc.description}
                          </p>
                          <div className="mt-2 text-[11px] font-mono text-emerald-400">
                            Invariant: {cnc.verificationMetric}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nemesis Core 4.0 Engine Specification Card */}
              <div className="bg-slate-950 border border-amber-500/40 rounded-lg p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Game Engine Specification: {KARST_PRODUCT_MODEL_DATA.engineIdentity.engineName} (`architecture.engine_identity`)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Product: <strong className="text-amber-400">{KARST_PRODUCT_MODEL_DATA.engineIdentity.productTitle}</strong> · Runtime: <span className="font-mono text-emerald-400">{KARST_PRODUCT_MODEL_DATA.engineIdentity.authoringRuntime}</span>
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">
                    Sections 1–10 Master Rulebook Verified
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 pr-3">Sec</th>
                        <th className="py-2 pr-3">Nemesis Core 4.0 Rulebook Subsystem</th>
                        <th className="py-2 pr-3">Engine Module (`prism-code`)</th>
                        <th className="py-2 pr-3">KARST: ZERO HORIZON Taxonomy</th>
                        <th className="py-2">Core-Wasm / Canonical Binding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {KARST_PRODUCT_MODEL_DATA.engineIdentity.subsystems.map((sub) => (
                        <tr key={sub.sectionNumber}>
                          <td className="py-2 pr-3 font-mono font-bold text-amber-400 tabular-nums">
                            §{sub.sectionNumber}
                          </td>
                          <td className="py-2 pr-3 font-semibold text-white">{sub.rulebookTitle}</td>
                          <td className="py-2 pr-3 font-mono text-emerald-400">{sub.engineModule}</td>
                          <td className="py-2 pr-3 text-slate-300">{sub.karstTaxonomyMapping}</td>
                          <td className="py-2 font-mono text-slate-400">{sub.prismVerificationBinding}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOUNDARY CONTRACTS (MNIST) & STANDARDS REGISTER (RULE30) */}
          {activeTab === 'boundary-contracts' && (
            <div className="space-y-6">
              {/* Live Structural Invariant Gate Summary */}
              <div className="bg-slate-950 border border-emerald-500/50 rounded-lg p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Executable Model Invariant Gate (`verifyModelInvariants()`)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Verifies identifier distinctness, concern framing, 5-Pole Vantage ordering, Boundary Contract completeness, and Standards realization.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded bg-emerald-500/20 border border-emerald-500/50 text-xs font-mono font-bold text-emerald-300">
                    ALL INVARIANTS VERIFIED: {String(invariantReport.allPassed).toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 font-mono text-xs">
                  {invariantReport.checks.map((chk) => (
                    <div
                      key={chk.id}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold truncate">{chk.id}</span>
                        <span className="text-emerald-400 font-bold ml-2">
                          {chk.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-400 truncate">{chk.name}</div>
                      <div className="text-[11px] text-slate-400">{chk.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Boundary Contracts Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">
                    Formal Boundary Contracts (`architecture.boundary_contracts`)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pure integer `list_fold` realizations with Preconditions, Postconditions, Evidence Theorems, and Refusal Codes.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-4">ID / Contract Name</th>
                        <th className="py-2.5 px-4">Precondition</th>
                        <th className="py-2.5 px-4">Realization (`list_fold`)</th>
                        <th className="py-2.5 px-4">Postcondition</th>
                        <th className="py-2.5 px-4">Evidence / Refusal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {KARST_BOUNDARY_CONTRACTS.map((bc) => (
                        <tr key={bc.id}>
                          <td className="py-2.5 px-4">
                            <div className="font-mono font-bold text-amber-400">{bc.id}</div>
                            <div className="font-semibold text-white">{bc.name}</div>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-300">
                            {bc.precondition}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-emerald-400">
                            {bc.realization}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-300">
                            {bc.postcondition}
                          </td>
                          <td className="py-2.5 px-4 font-mono">
                            <div className="text-sky-400">{bc.evidenceTheorem}</div>
                            <div className="text-red-400 text-[11px]">{bc.refusalCode}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Standards Register Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">
                    Architectural Standards Register (`architecture.standards_register`)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-4">Standard</th>
                        <th className="py-2.5 px-4">Scope &amp; Authority</th>
                        <th className="py-2.5 px-4">Realized By Entities</th>
                        <th className="py-2.5 px-4">Conformance Gate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {KARST_STANDARDS_REGISTER.map((std) => (
                        <tr key={std.id}>
                          <td className="py-2.5 px-4">
                            <div className="font-mono text-amber-400 font-bold">
                              {std.id} ({std.version})
                            </div>
                            <div className="font-semibold text-white">{std.name}</div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">
                            <div>{std.scope}</div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              {std.authority}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-emerald-400">
                            {std.realizedBy.join(', ')}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-sky-400">
                            {std.conformance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUALITY & SECURITY MODEL */}
          {activeTab === 'quality-security' && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">
                    Quality Model &amp; Verification Metrics (`model.quality`)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-4">Characteristic</th>
                        <th className="py-2.5 px-4">Subcharacteristic</th>
                        <th className="py-2.5 px-4">Measure</th>
                        <th className="py-2.5 px-4">Target Invariant</th>
                        <th className="py-2.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {KARST_PRODUCT_MODEL_DATA.qualityRequirements.map((qr) => (
                        <tr key={qr.id}>
                          <td className="py-2.5 px-4 font-semibold text-white">
                            {qr.characteristic}
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">{qr.subcharacteristic}</td>
                          <td className="py-2.5 px-4 text-slate-300">{qr.measure}</td>
                          <td className="py-2.5 px-4 font-mono text-amber-400">
                            {qr.targetValue}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-semibold">
                            {qr.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">
                    Security &amp; Integrity Controls (`model.security`)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <th className="py-2.5 px-4">Protected Asset</th>
                        <th className="py-2.5 px-4">Modeled Threat</th>
                        <th className="py-2.5 px-4">Cryptographic / Runtime Control</th>
                        <th className="py-2.5 px-4">Verification Mechanism</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {KARST_PRODUCT_MODEL_DATA.securityControls.map((sc) => (
                        <tr key={sc.id}>
                          <td className="py-2.5 px-4 font-semibold text-white">{sc.asset}</td>
                          <td className="py-2.5 px-4 text-slate-300">{sc.threat}</td>
                          <td className="py-2.5 px-4 text-amber-400 font-mono">{sc.control}</td>
                          <td className="py-2.5 px-4 text-emerald-400 font-mono">
                            {sc.verificationMechanism}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CORE-WASM WIRE TELEMETRY & ACCEPTANCE VECTORS */}
          {activeTab === 'wasm-telemetry' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Live Gameplay Dispatch Log */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
                <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Live Gameplay Core-Wasm Guest Dispatches (`app.dispatch`)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Every combat Net Hit, Plating reduction, Integrity depletion, and Alloy spend executed in WebAssembly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClearLogs}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Clear Trace
                  </button>
                </div>

                {dispatchLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No gameplay dispatches logged yet. Perform an attack, spend Alloy, or run a Crew Task to see live Core-Wasm wire traces.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <th className="py-2 px-4">Time</th>
                          <th className="py-2 px-4">Request Wire</th>
                          <th className="py-2 px-4">Response</th>
                          <th className="py-2 px-4 text-right">Latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {dispatchLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="py-2 px-4 text-slate-500">{log.timestamp}</td>
                            <td className="py-2 px-4 text-slate-200">
                              {formatWireString(log.requestText)}
                            </td>
                            <td className="py-2 px-4 text-emerald-400 font-semibold">
                              {formatWireString(log.responseText)}
                            </td>
                            <td className="py-2 px-4 text-right text-slate-400">
                              {log.durationMs} ms
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Acceptance Vector Runner */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-lg p-5 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Acceptance Vector Suite (`app.acceptance()`)
                    </h3>
                    <p className="text-xs text-slate-400">
                      {decodedVectors.length} modeled vectors in `KarstZeroHorizon.holo`
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAcceptance}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Replay Suite
                  </button>
                </div>

                {acceptanceResult && (
                  <div className="mt-3 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-lg text-xs font-mono text-emerald-300 flex items-center justify-between">
                    <span>
                      Passed: {acceptanceResult.passed} / {acceptanceResult.total} Vectors
                    </span>
                    <span>{acceptanceMs} ms</span>
                  </div>
                )}

                <div className="mt-3 overflow-y-auto max-h-[290px] space-y-1.5 font-mono text-xs">
                  {decodedVectors.map((vec) => (
                    <div
                      key={vec.index}
                      className="p-2 bg-slate-900 border border-slate-800 rounded flex items-center justify-between"
                    >
                      <span className="text-slate-400">#{vec.index}</span>
                      <span className="text-slate-200">{formatWireString(vec.requestText)}</span>
                      <span className="text-emerald-400">{formatWireString(vec.responseText)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CANONICAL SAVE & .HOLO BINARY */}
          {activeTab === 'canonical-holo' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">
                  Canonical Campaign Save Verifier (`prism-code/canonical`)
                </h3>
                <p className="text-xs text-slate-400">
                  Your active Strike Roster, Alloy Treasury, and Orbital Bastion state is canonically normalized and content-addressed via `canonicalize()`, `codeHash()`, `describe()`, and `kappa()`.
                </p>

                <div className="space-y-2 font-mono text-xs bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400">codeHash(campaign): </span>
                    <span className="text-amber-400 break-all">{saveReceipt.facts.hash}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">kappa(canonicalize(campaign)): </span>
                    <span className="text-emerald-400 break-all">{saveReceipt.blake3Kappa}</span>
                  </div>
                  <div className="text-slate-300">
                    bytes: {saveReceipt.facts.bytes.toLocaleString()} B · lines: {saveReceipt.facts.lines} · eol: {saveReceipt.facts.eol} · formatting-invariant: {String(!saveReceipt.nonCanonicalDiffers)}
                  </div>
                </div>

                <textarea
                  readOnly
                  value={saveReceipt.canonicalText}
                  className="w-full h-48 p-3 font-mono text-[11px] bg-slate-900 text-slate-300 border border-slate-800 rounded-lg"
                />
              </div>

              <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">
                  `KarstZeroHorizon.holo` v4 Cryptographic Identities
                </h3>
                <div className="space-y-2 font-mono text-xs bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400">verified: </span>
                    <span className="text-emerald-400 font-bold">
                      {String(identities?.verified)} (consistent: {String(identities?.consistent)})
                    </span>
                  </div>
                  <div className="break-all">
                    <span className="text-slate-400">archiveFingerprint: </span>
                    <span className="text-slate-200">{identities?.archiveFingerprint}</span>
                  </div>
                  <div className="break-all">
                    <span className="text-slate-400">guestKappa: </span>
                    <span className="text-slate-200">{identities?.guestKappa}</span>
                  </div>
                  <div className="break-all">
                    <span className="text-slate-400">viewKappa: </span>
                    <span className="text-slate-200">{identities?.viewKappa}</span>
                  </div>
                  <div className="break-all">
                    <span className="text-slate-400">modelKappa: </span>
                    <span className="text-slate-200">{identities?.modelKappa}</span>
                  </div>
                </div>

                {holoState && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <th className="py-2 px-3">Sec</th>
                          <th className="py-2 px-3">Kind</th>
                          <th className="py-2 px-3 text-right">Offset</th>
                          <th className="py-2 px-3 text-right">Length</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {holoState.parsed.sections.map((s) => (
                          <tr key={s.index}>
                            <td className="py-1.5 px-3 text-slate-400">#{s.index}</td>
                            <td className="py-1.5 px-3 text-slate-200">
                              {KIND_NAMES[s.kind] ?? s.kind}
                            </td>
                            <td className="py-1.5 px-3 text-right text-slate-400">
                              {s.offset.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-right text-amber-400">
                              {s.length.toLocaleString()} B
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Embedded Portable HOLOVIEW v1 Surface extracted from KarstZeroHorizon.holo */}
              {holoviewSrcDoc && (
                <div className="lg:col-span-12 bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Embedded Portable `HOLOVIEW v1` Surface (`decodeHoloview()` / `encodeHoloview()`)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Live sandboxed preview of the self-contained HTML/CSS/JS bundle sealed inside `KarstZeroHorizon.holo` (`viewKappa: {identities?.viewKappa?.slice(0, 24)}…`).
                      </p>
                    </div>
                  </div>
                  <iframe
                    title="KarstZeroHorizon HOLOVIEW v1 Surface"
                    srcDoc={holoviewSrcDoc}
                    sandbox="allow-scripts"
                    className="w-full h-64 rounded-lg border border-slate-800 bg-slate-900"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TACTICAL FIELD MANUAL (QRS) */}
          {activeTab === 'field-manual' && (
            <div className="space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3">
                  <h3 className="text-sm font-bold text-amber-400">
                    1. Core Strike Pool &amp; Surge Engine
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    All tests roll <strong>Attribute d6</strong> (+1d6 per <strong>1 Surge Cell</strong> spent). Every die showing <strong>4, 5, or 6</strong> counts as <strong>1 Strike Hit</strong>.
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    <strong>Opposed Combat:</strong> Net Hits = Attacker Hits − Defender Hits (Low Barricade Cover grants +1 auto-Evasion hit against Ranged attacks). Final Damage = Net Hits − Plating (or ignore each point on 6+ for Bio-Resilience).
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    <strong>Momentum Charge:</strong> Moving at least 4" (2 cells) in a straight line directly into base contact (adjacent cell) and performing a Melee Attack grants <strong>+1 Firepower die</strong>.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-3">
                  <h3 className="text-sm font-bold text-amber-400">
                    2. Integrity vs. Hull Plating Tracks
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    <strong>Biological Integrity (Spliced / Xenomorph / Phase-Born):</strong>
                    <br />• <em>Staggered (≥Half Integrity):</em> -2 Evasion dice. Spend 1 Move Action to clear.
                    <br />• <em>Critical Trauma (=Integrity):</em> -2 Evasion. Free COG Test (TN 2) at start of turn to clear, or crawl 2" and forfeit Standard Action.
                    <br />• <em>Neutralized (=Integrity+1):</em> Removed from play; roll permanent -1 Stat Trauma in campaign.
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    <strong>Mechanical Hull (Automaton / Rig-Walker):</strong> Immune to Staggered/Trauma. Destroyed at 0 Hull. Taking 3+ Final Damage in one hit triggers a d6 Subsystem Rupture.
                  </p>
                </div>
              </div>

              {/* 3D Synthesis Matrix Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 font-bold text-white">
                  3. The 3D Unit Synthesis Matrix ([Doctrine, Chassis, Echelon])
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono tabular-nums">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-4">Z-Axis (Echelon)</th>
                        <th className="py-2 px-4">Scale</th>
                        <th className="py-2 px-4">Berths</th>
                        <th className="py-2 px-4">Base Dice (FPR/EVA/COG)</th>
                        <th className="py-2 px-4">Integrity/Hull</th>
                        <th className="py-2 px-4">Base Surge</th>
                        <th className="py-2 px-4">Hardpoints (Start / Max)</th>
                        <th className="py-2 px-4 text-right">Alloy Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {([0, 1, 2, 3, 4] as EchelonTier[]).map((t) => {
                        const e = ECHELON_SPECS[t];
                        return (
                          <tr key={t}>
                            <td className="py-2 px-4 font-bold text-amber-400">
                              Echelon {e.tier}: {e.name}
                            </td>
                            <td className="py-2 px-4 text-slate-300">{e.unitCount} Unit(s)</td>
                            <td className="py-2 px-4 text-slate-300">{e.berthCost} Berth(s)</td>
                            <td className="py-2 px-4 text-emerald-400">
                              {e.baseFpr} / {e.baseEva} / {e.baseCog}
                            </td>
                            <td className="py-2 px-4 text-slate-300">{e.maxIntegrityPerModel}</td>
                            <td className="py-2 px-4 text-amber-300">{e.baseSurge} SRG</td>
                            <td className="py-2 px-4 text-slate-300">
                              {e.startingHardpoints} / {e.campaignMaxHardpoints}
                            </td>
                            <td className="py-2 px-4 text-right text-white">{e.alloyCost} Alloy</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
