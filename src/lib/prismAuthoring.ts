import {
  load,
  loadArchive,
  parseArchive,
  resolveArchive,
  decodeHoloview,
  encodeHoloview,
  compileGuest,
  runGuest,
  runAcceptance,
  blake3,
  blake3Hex,
  kappa,
  canonicalJson,
  PrismCodeError,
  type Application,
  type ParsedArchive,
  type ArchiveIdentities,
  type AcceptanceResult,
  type Vector,
  type Limits,
} from 'prism-code';
import {
  canonicalize,
  codeHash,
  describe,
  differs,
  type CanonicalizeOptions,
  type HashOptions,
  type CodeFacts,
} from 'prism-code/canonical';

export {
  load,
  loadArchive,
  parseArchive,
  resolveArchive,
  decodeHoloview,
  encodeHoloview,
  compileGuest,
  runGuest,
  runAcceptance,
  blake3,
  blake3Hex,
  kappa,
  canonicalJson,
  PrismCodeError,
  canonicalize,
  codeHash,
  describe,
  differs,
  type Application,
  type ParsedArchive,
  type ArchiveIdentities,
  type AcceptanceResult,
  type Vector,
  type Limits,
  type CanonicalizeOptions,
  type HashOptions,
  type CodeFacts,
};

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false });
const strictDecoder = new TextDecoder('utf-8', { fatal: true });

export const KIND_NAMES: Record<number, string> = {
  15: 'APP_MANIFEST (15)',
  8: 'METADATA (8)',
  14: 'EXTENSION (14)',
  16: 'CONTENT_BLOB (16)',
};

export const DIRECTORY_EXTENSION = 'https://hologram.foundation/extension/application-directory/v1';
export const MODEL_EXTENSION = 'https://uor.foundation/extension/prismpm-model/v1';

export interface DecodedVector {
  index: number;
  requestBytes: Uint8Array;
  responseBytes: Uint8Array;
  requestText: string;
  responseText: string;
  requestHex: string;
  responseHex: string;
}

export interface DispatchLogEntry {
  id: string;
  timestamp: string;
  source: 'console' | 'holoview-intent' | 'acceptance';
  requestText: string;
  requestHex: string;
  requestByteLength: number;
  responseText: string;
  responseHex: string;
  responseByteLength: number;
  durationMs: number;
  status: 'ok' | 'error' | 'refused';
}

export interface LoadedHoloState {
  rawBytes: Uint8Array;
  app: Application;
  parsed: ParsedArchive;
  resolved: ReturnType<typeof resolveArchive>;
  viewFilesText: Record<string, string>;
  modelJsonText: string;
}

export function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, '0');
  }
  return s;
}

export function bytesToSpacedHex(bytes: Uint8Array, maxBytes = 64): string {
  const slice = bytes.subarray(0, maxBytes);
  const parts: string[] = [];
  for (let i = 0; i < slice.length; i++) {
    parts.push(slice[i].toString(16).padStart(2, '0'));
  }
  return parts.join(' ') + (bytes.length > maxBytes ? ` … (+${bytes.length - maxBytes} B)` : '');
}

export function tryDecodeUtf8(bytes: Uint8Array): string {
  try {
    return strictDecoder.decode(bytes);
  } catch {
    return `0x${bytesToHex(bytes)}`;
  }
}

export function formatWireString(raw: string): string {
  return raw.replace(/\t/g, ' ⇥ ');
}

export function parseEscapedWireInput(input: string): Uint8Array {
  // Support literal tabs or \t escape sequences for ergonomic authoring
  const normalized = input.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
  return encoder.encode(normalized);
}

export function decodeVectors(vectors: Vector[]): DecodedVector[] {
  return vectors.map((v, index) => ({
    index,
    requestBytes: v.request,
    responseBytes: v.response,
    requestText: tryDecodeUtf8(v.request),
    responseText: tryDecodeUtf8(v.response),
    requestHex: bytesToHex(v.request),
    responseHex: bytesToHex(v.response),
  }));
}

export async function inspectHoloBytes(rawBytes: Uint8Array): Promise<LoadedHoloState> {
  const app = await loadArchive(rawBytes);
  const parsed = parseArchive(rawBytes);
  const resolved = resolveArchive(parsed);

  const viewFilesText: Record<string, string> = {};
  for (const [filename, content] of app.view.files.entries()) {
    viewFilesText[filename] = decoder.decode(content);
  }

  const modelJsonText = JSON.stringify(app.model, null, 2);

  return {
    rawBytes,
    app,
    parsed,
    resolved,
    viewFilesText,
    modelJsonText,
  };
}

function encodeExtensionSection(name: string, payloadText: string): Uint8Array {
  const nameBytes = encoder.encode(name);
  const payloadBytes = encoder.encode(payloadText);
  const out = new Uint8Array(2 + nameBytes.length + payloadBytes.length);
  out[0] = nameBytes.length & 0xff;
  out[1] = (nameBytes.length >> 8) & 0xff;
  out.set(nameBytes, 2);
  out.set(payloadBytes, 2 + nameBytes.length);
  return out;
}

function encodeBlobSection(content: Uint8Array): { label: string; sectionBytes: Uint8Array } {
  const label = kappa(content);
  const labelBytes = encoder.encode(label);
  const sectionBytes = new Uint8Array(labelBytes.length + content.length);
  sectionBytes.set(labelBytes, 0);
  sectionBytes.set(content, labelBytes.length);
  return { label, sectionBytes };
}

/**
 * Repacks and cryptographically seals a Hologram v4 `.holo` archive using `prism-code` primitives:
 * - `encodeHoloview` for the HOLOVIEW v1 portable view bundle
 * - `canonicalJson` for deterministic JSON serialization
 * - `kappa` (`blake3:<64-hex>`) for content-addressed blob labels & manifest cross-references
 * - `blake3` (32-byte digest) for the archive fingerprint footer
 */
export async function repackHoloArchive(params: {
  baseParsed: ParsedArchive;
  baseResolved: ReturnType<typeof resolveArchive>;
  viewEntry: string;
  viewFilesText: Record<string, string>;
  modelObject: Record<string, unknown>;
  guestBytes?: Uint8Array;
  capabilitiesBytes?: Uint8Array;
}): Promise<Uint8Array> {
  const {
    baseParsed,
    baseResolved,
    viewEntry,
    viewFilesText,
    modelObject,
    guestBytes = baseResolved.guest.content,
    capabilitiesBytes = baseResolved.capabilities.content,
  } = params;

  // 1. Encode HOLOVIEW bundle
  const viewFileMap = new Map<string, Uint8Array>();
  for (const [path, textContent] of Object.entries(viewFilesText)) {
    viewFileMap.set(path, encoder.encode(textContent));
  }
  if (!viewFileMap.has(viewEntry)) {
    throw new Error(`HOLOVIEW entry "${viewEntry}" must exist in view files`);
  }
  const encodedViewBytes = encodeHoloview({ entry: viewEntry, files: viewFileMap });

  // 2. Encode model.prism.json using canonicalJson
  const encodedModelBytes = encoder.encode(canonicalJson(modelObject));

  // 3. Build the 4 content-addressed blobs & compute their BLAKE3 kappas
  const guestBlob = encodeBlobSection(guestBytes);
  const viewBlob = encodeBlobSection(encodedViewBytes);
  const capBlob = encodeBlobSection(capabilitiesBytes);
  const modelBlob = encodeBlobSection(encodedModelBytes);

  // 4. Update application-directory/v1 extension
  const directoryClone = JSON.parse(JSON.stringify(baseResolved.directory));
  directoryClone.requires_kappa = capBlob.label;
  if (Array.isArray(directoryClone.layers)) {
    for (const layer of directoryClone.layers) {
      if (layer.kind === 'wasm') layer.content_kappa = guestBlob.label;
      if (layer.kind === 'view') {
        layer.content_kappa = viewBlob.label;
        layer.entry = viewEntry;
      }
    }
  }
  directoryClone.blobs = [
    { kappa: guestBlob.label, byte_length: guestBytes.length },
    { kappa: viewBlob.label, byte_length: encodedViewBytes.length },
    { kappa: capBlob.label, byte_length: capabilitiesBytes.length },
    { kappa: modelBlob.label, byte_length: encodedModelBytes.length },
  ];

  // 5. Update prismpm-model/v1 provenance extension
  const provenanceClone = JSON.parse(JSON.stringify(baseResolved.provenance));
  provenanceClone.guest_content_kappa = guestBlob.label;
  provenanceClone.model_content_kappa = modelBlob.label;
  if (provenanceClone.view_binding && typeof provenanceClone.view_binding === 'object') {
    provenanceClone.view_binding.view_content_kappa = viewBlob.label;
  }

  // 6. Rebuild Section 0: APP_MANIFEST (356 bytes)
  // Prefix is 57 bytes, then three 71-byte labels [requires_kappa, wasm_kappa, view_kappa], then 86-byte suffix
  const origManifestSection = baseParsed.sections.find((s) => s.kind === 15);
  if (!origManifestSection) throw new Error('Base archive missing APP_MANIFEST section');
  const manifestBody = new Uint8Array(356);
  manifestBody.set(origManifestSection.body.subarray(0, 57), 0);
  const labelsOrdered = [capBlob.label, guestBlob.label, viewBlob.label];
  for (let i = 0; i < 3; i++) {
    manifestBody.set(encoder.encode(labelsOrdered[i]), 57 + i * 71);
  }
  manifestBody.set(origManifestSection.body.subarray(57 + 3 * 71), 57 + 3 * 71);

  // 7. Rebuild Section 1: METADATA (kind 8)
  const origMetadataSection = baseParsed.sections.find((s) => s.kind === 8);
  const metadataBody = origMetadataSection
    ? origMetadataSection.body
    : encoder.encode(canonicalJson({ version: 4 }));

  // 8. Rebuild Section 2 & 3: EXTENSION sections (kind 14)
  const dirExtBody = encodeExtensionSection(DIRECTORY_EXTENSION, canonicalJson(directoryClone));
  const modelExtBody = encodeExtensionSection(MODEL_EXTENSION, canonicalJson(provenanceClone));

  const sectionDefinitions: { kind: number; body: Uint8Array }[] = [
    { kind: 15, body: manifestBody },
    { kind: 8, body: metadataBody },
    { kind: 14, body: dirExtBody },
    { kind: 14, body: modelExtBody },
    { kind: 16, body: guestBlob.sectionBytes },
    { kind: 16, body: viewBlob.sectionBytes },
    { kind: 16, body: capBlob.sectionBytes },
    { kind: 16, body: modelBlob.sectionBytes },
  ];

  const sectionCount = sectionDefinitions.length;
  const headerLength = 10;
  const tableLength = sectionCount * 24;
  const bodyStart = headerLength + tableLength;
  const totalSectionBytes = sectionDefinitions.reduce((acc, s) => acc + s.body.length, 0);
  const bodyEnd = bodyStart + totalSectionBytes;
  const totalArchiveBytes = bodyEnd + 32;

  const out = new Uint8Array(totalArchiveBytes);
  const view = new DataView(out.buffer);

  // Write "HOLO" magic + version 4 + flags 0 + section count
  out.set(encoder.encode('HOLO'), 0);
  view.setUint16(4, 4, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, sectionCount, true);

  let cursor = bodyStart;
  for (let i = 0; i < sectionCount; i++) {
    const { kind, body } = sectionDefinitions[i];
    const tableAt = headerLength + i * 24;
    view.setBigUint64(tableAt, BigInt(kind), true);
    view.setBigUint64(tableAt + 8, BigInt(cursor), true);
    view.setBigUint64(tableAt + 16, BigInt(body.length), true);
    out.set(body, cursor);
    cursor += body.length;
  }

  // Compute 32-byte BLAKE3 archive fingerprint footer over everything before it
  const archiveBody = out.subarray(0, bodyEnd);
  const footerDigest = blake3(archiveBody, 32);
  out.set(footerDigest, bodyEnd);

  return out;
}

/**
 * Generates a self-contained HTML srcdoc for the HOLOVIEW bundle that routes
 * `POST /_hologram/intent` calls directly through the workbench's loaded Core-Wasm guest.
 */
export function buildHoloviewPreviewHtml(viewFilesText: Record<string, string>, entry = 'index.html'): string {
  const rawHtml = viewFilesText[entry] ?? '<!doctype html><html><body><p>Missing entry HTML</p></body></html>';
  const cssContent = viewFilesText['app.css'] ?? '';
  const jsContent = viewFilesText['app.js'] ?? '';

  const intentBridgeScript = `
<script>
(function() {
  const originalFetch = window.fetch.bind(window);
  let reqSeq = 0;
  const pending = new Map();

  window.addEventListener('message', function(event) {
    const data = event.data;
    if (!data || data.type !== 'PRISM_HOLOGRAM_INTENT_RESPONSE') return;
    const resolver = pending.get(data.reqId);
    if (resolver) {
      pending.delete(data.reqId);
      resolver(data);
    }
  });

  window.fetch = async function(input, init) {
    const urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : String(input));
    if (urlStr.endsWith('/_hologram/intent') || urlStr === '_hologram/intent') {
      const reqId = ++reqSeq;
      const bodyText = init && init.body ? String(init.body) : '{}';
      const reply = await new Promise((resolve) => {
        pending.set(reqId, resolve);
        window.parent.postMessage({
          type: 'PRISM_HOLOGRAM_INTENT_REQUEST',
          reqId,
          bodyText
        }, '*');
      });
      return new Response(JSON.stringify(reply.payload), {
        status: reply.status || 200,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }
    return originalFetch(input, init);
  };
})();
</script>`;

  // Replace external <link rel="stylesheet" href="app.css"> and <script type="module" src="app.js"></script>
  let hydrated = rawHtml
    .replace(/<link[^>]*href=["']app\.css["'][^>]*>/i, `<style>\n${cssContent}\n</style>`)
    .replace(/<script[^>]*src=["']app\.js["'][^>]*><\/script>/i, `<script type="module">\n${jsContent}\n</script>`);

  if (hydrated.includes('</head>')) {
    hydrated = hydrated.replace('</head>', `${intentBridgeScript}\n</head>`);
  } else {
    hydrated = `${intentBridgeScript}\n${hydrated}`;
  }

  return hydrated;
}

export interface AuthoringPreset {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  customize: (baseState: LoadedHoloState) => {
    viewFilesText: Record<string, string>;
    modelObject: Record<string, unknown>;
  };
}

export const AUTHORING_PRESETS: AuthoringPreset[] = [
  {
    id: 'calculator-default',
    title: 'Calculator.holo',
    subtitle: 'Official SDK Fixture · 22 Vectors',
    description: 'Canonical Lean-verified checked i64 arithmetic application shipped in prism-code/fixtures/Calculator.holo.',
    customize: (baseState) => ({
      viewFilesText: { ...baseState.viewFilesText },
      modelObject: JSON.parse(baseState.modelJsonText),
    }),
  },
  {
    id: 'treasury-basis-engine',
    title: 'TreasuryLedger.holo',
    subtitle: 'Financial Basis-Point Engine · 25 Vectors',
    description: 'Authored HOLOVIEW surface and extended acceptance vector suite for checked 64-bit integer basis-point ledger settlement.',
    customize: (baseState) => {
      const model = JSON.parse(baseState.modelJsonText);
      model.application.name = 'TreasuryLedger';
      model.application.cargo_description = 'Checked i64 basis-point settlement engine powered by Core-Wasm guest.';
      model.application.view.title = 'Treasury Basis-Point Settlement';
      model.application.view.heading = 'Treasury i64 Settlement ALU';
      model.application.view.left_label = 'Principal (minor units)';
      model.application.view.right_label = 'Adjustment / Factor';
      model.application.view.submit_label = 'Execute Settlement';

      const extraVectors = [
        { req: '1\tadd\t100000000\t250000', res: '1\tok\t100250000' },
        { req: '1\tsubtract\t500000000\t12500000', res: '1\tok\t487500000' },
        { req: '1\tmultiply\t250000\t365', res: '1\tok\t91250000' },
      ];
      for (const ev of extraVectors) {
        model.application.acceptance_vectors.push({
          request: Array.from(encoder.encode(ev.req)),
          response: Array.from(encoder.encode(ev.res)),
        });
      }

      const customCss = `*{box-sizing:border-box}body{margin:0;background:#0f172a;color:#f8fafc;font-family:ui-sans-serif,system-ui,sans-serif}main{width:min(38rem,calc(100% - 2rem));margin:2.5rem auto;padding:1.75rem;border:1px solid #334155;border-radius:.5rem;background:#1e293b}h1{margin:0 0 .35rem 0;font-size:1.25rem;letter-spacing:-0.01em}p.sub{margin:0 0 1.25rem 0;font-size:.8rem;color:#94a3b8}form{display:grid;grid-template-columns:1fr auto 1fr;gap:.75rem;align-items:end}label{font-weight:600;font-size:.78rem;color:#cbd5e1;display:block;margin-bottom:.25rem}input,select,button{min-height:2.6rem;border:1px solid #475569;border-radius:.375rem;padding:.5rem .65rem;font:inherit;background:#0f172a;color:#f8fafc;width:100%}button{grid-column:1/-1;background:#2563eb;color:#fff;border-color:#2563eb;font-weight:600;cursor:pointer;margin-top:.35rem}button:hover{background:#1d4ed8}output{display:block;min-height:2.5rem;margin-top:1rem;padding:.65rem .85rem;background:#0f172a;border:1px solid #334155;border-radius:.375rem;font-family:ui-monospace,monospace;font-weight:600;color:#38bdf8}`;

      const customHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Treasury Basis-Point Settlement</title><link rel="stylesheet" href="app.css"></head><body><main><h1>Treasury i64 Settlement ALU</h1><p class="sub">Hologram Core-Wasm@1 Verified Fixed-Point Execution</p><form id="application-form" novalidate><div><label for="left">Principal (minor units)</label><input id="left" name="left" value="100000000" inputmode="numeric" autocomplete="off"></div><div><label for="operation">Operation</label><select id="operation" name="operation"><option value="0" data-request="add" selected>Credit (+)</option><option value="1" data-request="subtract">Debit (−)</option><option value="2" data-request="multiply">Scale (×)</option><option value="3" data-request="divide">Tranche (÷)</option></select></div><div><label for="right">Adjustment / Factor</label><input id="right" name="right" value="250000" inputmode="numeric" autocomplete="off"></div><button id="submit" type="submit">Execute Settlement</button></form><output id="result" role="status" aria-live="polite" aria-atomic="true">Ready — submit intent to Core-Wasm guest</output></main><script type="module" src="app.js"></script></body></html>`;

      return {
        viewFilesText: {
          ...baseState.viewFilesText,
          'app.css': customCss,
          'index.html': customHtml,
        },
        modelObject: model,
      };
    },
  },
  {
    id: 'telemetry-bounds-unit',
    title: 'TelemetryBounds.holo',
    subtitle: 'Hardware Register Verifier · 24 Vectors',
    description: 'High-contrast industrial instrument HOLOVIEW tailored for 64-bit signed integer boundary and overflow verification.',
    customize: (baseState) => {
      const model = JSON.parse(baseState.modelJsonText);
      model.application.name = 'TelemetryBounds';
      model.application.cargo_description = 'Signed 64-bit hardware register boundary and saturation traps.';
      model.application.view.title = 'Register ALU Bounds Check';
      model.application.view.heading = 'i64 Register Boundary Unit';

      const extraVectors = [
        { req: '1\tmultiply\t3037000499\t3037000499', res: '1\tok\t9223372030926249001' },
        { req: '1\tmultiply\t3037000500\t3037000500', res: '1\terror\toverflow' },
      ];
      for (const ev of extraVectors) {
        model.application.acceptance_vectors.push({
          request: Array.from(encoder.encode(ev.req)),
          response: Array.from(encoder.encode(ev.res)),
        });
      }

      const customCss = `*{box-sizing:border-box}body{margin:0;background:#ffffff;color:#0f172a;font-family:ui-monospace,SFMono-Regular,monospace}main{width:min(38rem,calc(100% - 2rem));margin:2rem auto;padding:1.5rem;border:2px solid #0f172a;background:#f8fafc}h1{margin:0 0 1rem 0;font-size:1.1rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #cbd5e1;padding-bottom:.5rem}form{display:grid;grid-template-columns:1fr auto 1fr;gap:.75rem;align-items:end}label{font-weight:700;font-size:.75rem}input,select,button{min-height:2.5rem;border:1px solid #334155;padding:.45rem .6rem;font:inherit;background:#fff}button{grid-column:1/-1;background:#0f172a;color:#fff;font-weight:700;cursor:pointer}output{display:block;min-height:2.25rem;margin-top:1rem;padding:.5rem .75rem;border:1px solid #0f172a;background:#fff;font-weight:700}`;

      const customHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Register ALU Bounds Check</title><link rel="stylesheet" href="app.css"></head><body><main><h1>i64 Register Boundary Unit</h1><form id="application-form" novalidate><label for="left">REG_A (i64)<input id="left" name="left" value="9223372036854775807" inputmode="numeric" autocomplete="off"></label><label for="operation">OP<select id="operation" name="operation"><option value="0" data-request="add" selected>ADD</option><option value="1" data-request="subtract">SUB</option><option value="2" data-request="multiply">MUL</option><option value="3" data-request="divide">DIV</option></select></label><label for="right">REG_B (i64)<input id="right" name="right" value="1" inputmode="numeric" autocomplete="off"></label><button id="submit" type="submit">DISPATCH TO CORE-WASM</button></form><output id="result" role="status" aria-live="polite" aria-atomic="true">0x00 — AWAITING INTENT</output></main><script type="module" src="app.js"></script></body></html>`;

      return {
        viewFilesText: {
          ...baseState.viewFilesText,
          'app.css': customCss,
          'index.html': customHtml,
        },
        modelObject: model,
      };
    },
  },
];

export const CANONICAL_SOURCE_SAMPLES: {
  id: string;
  label: string;
  description: string;
  sourceA: string;
  sourceB: string;
}[] = [
  {
    id: 'lexlean-calculator',
    label: 'LexLean Calculator Model',
    description: 'Compare two LexLean / Lean 4 model specifications that differ only in CRLF line endings, BOM, and trailing whitespace.',
    sourceA: `namespace PrismCalculator.Calculator\n\ninductive Operation where\n  | Add : Operation\n  | Subtract : Operation\n  | Multiply : Operation\n  | Divide : Operation\n  deriving DecidableEq, Repr\n\ndef calculate (op : Operation) (lhs rhs : Int64) : Except CalculatorError Int64 :=\n  match op with\n  | .Add => checkedAdd lhs rhs\n  | .Subtract => checkedSub lhs rhs\n  | .Multiply => checkedMul lhs rhs\n  | .Divide => checkedDiv lhs rhs\n`,
    sourceB: `\uFEFFnamespace PrismCalculator.Calculator\r\n\r\ninductive Operation where   \r\n  | Add : Operation\t\r\n  | Subtract : Operation\r\n  | Multiply : Operation\r\n  | Divide : Operation\r\n  deriving DecidableEq, Repr\r\n\r\ndef calculate (op : Operation) (lhs rhs : Int64) : Except CalculatorError Int64 :=  \r\n  match op with\r\n  | .Add => checkedAdd lhs rhs\r\n  | .Subtract => checkedSub lhs rhs\r\n  | .Multiply => checkedMul lhs rhs\r\n  | .Divide => checkedDiv lhs rhs\r\n\r\n\r\n`,
  },
  {
    id: 'substantive-diff',
    label: 'Substantive Wire Limit Mutation',
    description: 'Compare two Prism application definitions where request_maximum was altered from 52 to 64 bytes.',
    sourceA: `structure ApplicationLimits where\n  requestMaximum : Nat := 52\n  responseMaximum : Nat := 27\n  guestAllocationMaximum : Nat := 65536\n`,
    sourceB: `structure ApplicationLimits where\n  requestMaximum : Nat := 64\n  responseMaximum : Nat := 27\n  guestAllocationMaximum : Nat := 65536\n`,
  },
];
