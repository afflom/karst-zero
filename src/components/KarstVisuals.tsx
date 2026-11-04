import React, { useMemo } from 'react';
import { blake3Hex, kappa } from 'prism-code';
import { canonicalize, codeHash } from 'prism-code/canonical';
import {
  compileBattlefieldSpatialScene,
  evaluateSpatialTrajectoryWasm,
  projectSpatialCoord,
  type SpatialCameraMode,
} from '../game/spatialModel';
import type {
  ChassisType,
  CompiledUnit,
  DoctrineRole,
  EchelonTier,
  ObjectiveMarker,
  ScenarioSpec,
  TerrainCell,
} from '../game/types';

const encoder = new TextEncoder();

export interface PrismVisualGenome {
  canonicalSpec: string;
  sha256CodeHash: string;
  blake3Digest: string;
  visualKappa: string;
  primaryHue: string;
  secondaryHue: string;
  accentHex: string;
}

/**
 * Deterministically computes a prism-code cryptographic visual genome for any unit or location
 * using `canonicalize()`, `codeHash()`, `blake3Hex()`, and `kappa()`.
 */
export function computeUnitVisualGenome(
  paramsOrDoctrine:
    | {
        echelon: EchelonTier;
        chassis: ChassisType;
        doctrine: DoctrineRole;
        lockedHardpoints?: string[];
        hardpoints?: string[];
        faction?: 'StrikeRoster' | 'WardenDirective';
      }
    | DoctrineRole,
  chassisArg?: ChassisType,
  echelonArg?: EchelonTier,
  hardpointsArg?: string[],
  factionArg?: 'StrikeRoster' | 'WardenDirective'
): PrismVisualGenome {
  const params =
    typeof paramsOrDoctrine === 'string'
      ? {
          doctrine: paramsOrDoctrine,
          chassis: chassisArg ?? ('Spliced' as ChassisType),
          echelon: echelonArg ?? (1 as EchelonTier),
          lockedHardpoints: hardpointsArg ?? [],
          faction: factionArg ?? 'StrikeRoster',
        }
      : {
          doctrine: paramsOrDoctrine.doctrine,
          chassis: paramsOrDoctrine.chassis,
          echelon: paramsOrDoctrine.echelon,
          lockedHardpoints:
            paramsOrDoctrine.lockedHardpoints ?? paramsOrDoctrine.hardpoints ?? [],
          faction: paramsOrDoctrine.faction ?? 'StrikeRoster',
        };

  const rawSpec = JSON.stringify({
    axisX_doctrine: params.doctrine,
    axisY_chassis: params.chassis,
    axisZ_echelon: params.echelon,
    faction: params.faction ?? 'StrikeRoster',
    hardpoints: [...(params.lockedHardpoints ?? [])].sort(),
  });
  const canonicalSpec = canonicalize(rawSpec);
  const sha256CodeHash = codeHash(canonicalSpec);
  const bytes = encoder.encode(canonicalSpec);
  const blake3Digest = blake3Hex(bytes);
  const visualKappa = kappa(bytes);

  const isWarden = params.faction === 'WardenDirective';

  const doctrineColors: Record<
    DoctrineRole,
    { primary: string; secondary: string; accent: string }
  > = {
    Breacher: {
      primary: isWarden ? '#EF4444' : '#F59E0B',
      secondary: '#78350F',
      accent: '#FBBF24',
    },
    Aegis: {
      primary: isWarden ? '#F87171' : '#10B981',
      secondary: '#064E3B',
      accent: '#34D399',
    },
    Outrider: {
      primary: isWarden ? '#FB923C' : '#38BDF8',
      secondary: '#0C4A6E',
      accent: '#7DD3FC',
    },
    Deadeye: {
      primary: isWarden ? '#F43F5E' : '#FBBF24',
      secondary: '#1E293B',
      accent: '#FDE68A',
    },
    Saboteur: {
      primary: isWarden ? '#E11D48' : '#A855F7',
      secondary: '#3B0764',
      accent: '#C084FC',
    },
    Psion: {
      primary: isWarden ? '#EC4899' : '#06B6D4',
      secondary: '#164E63',
      accent: '#67E8F9',
    },
  };

  const palette = doctrineColors[params.doctrine];

  return {
    canonicalSpec,
    sha256CodeHash,
    blake3Digest,
    visualKappa,
    primaryHue: palette.primary,
    secondaryHue: palette.secondary,
    accentHex: palette.accent,
  };
}

/**
 * Shared SVG weapon & tactical equipment renderer used by both portraits and gameboard sprites
 * so players can visually identify a character's combat role (Breacher hammer/shotgun,
 * Aegis riot shield, Outrider jump-wings & twin carbines, Deadeye long rail-rifle,
 * Saboteur phase-blades, Psion harmonic staff & psi-orbs).
 */
const CharacterDoctrineWeaponSvg: React.FC<{
  doctrine: DoctrineRole;
  accentColor: string;
  primaryColor: string;
}> = ({ doctrine, accentColor, primaryColor }) => {
  if (doctrine === 'Breacher') {
    return (
      <g>
        {/* Heavy Two-Handed Kinetic Breach Hammer / Ram */}
        <line
          x1="20"
          y1="74"
          x2="78"
          y2="34"
          stroke="#CBD5E1"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <g transform="translate(72, 30) rotate(-34)">
          <rect
            x="-12"
            y="-8"
            width="24"
            height="16"
            rx="2"
            fill="#0F172A"
            stroke={accentColor}
            strokeWidth="2.2"
          />
          <rect x="8" y="-6" width="5" height="12" fill={primaryColor} />
          <line x1="-8" y1="0" x2="5" y2="0" stroke={accentColor} strokeWidth="2" />
        </g>
      </g>
    );
  }

  if (doctrine === 'Aegis') {
    return (
      <g>
        {/* Heavy Interlocking Tower Riot Shield + Energy Field */}
        <polygon
          points="26,34 46,28 52,36 52,78 44,86 26,80"
          fill="#0F172A"
          fillOpacity="0.92"
          stroke={accentColor}
          strokeWidth="2.5"
        />
        <polygon
          points="30,39 45,35 48,40 48,74 42,80 30,76"
          fill={primaryColor}
          fillOpacity="0.45"
          stroke="#FFFFFF"
          strokeWidth="1.2"
        />
        {/* Shield Viewport Slit */}
        <rect x="33" y="45" width="12" height="4" rx="1" fill="#FFFFFF" />
        {/* Sidearm Barrel on Right */}
        <rect
          x="68"
          y="54"
          width="18"
          height="6"
          rx="1.5"
          fill="#334155"
          stroke={accentColor}
          strokeWidth="1.5"
        />
      </g>
    );
  }

  if (doctrine === 'Outrider') {
    return (
      <g>
        {/* Swept Jump-Jet Thruster Wings */}
        <polygon
          points="26,48 6,22 18,20 32,40"
          fill={primaryColor}
          stroke={accentColor}
          strokeWidth="1.8"
        />
        <polygon
          points="74,48 94,22 82,20 68,40"
          fill={primaryColor}
          stroke={accentColor}
          strokeWidth="1.8"
        />
        {/* Thruster Exhaust Plumes */}
        <circle cx="14" cy="54" r="3.5" fill="#38BDF8" />
        <circle cx="86" cy="54" r="3.5" fill="#38BDF8" />
        {/* Dual Sub-Carbines */}
        <rect x="14" y="58" width="16" height="5" rx="1" fill="#0F172A" stroke={accentColor} strokeWidth="1.5" />
        <rect x="70" y="58" width="16" height="5" rx="1" fill="#0F172A" stroke={accentColor} strokeWidth="1.5" />
      </g>
    );
  }

  if (doctrine === 'Deadeye') {
    return (
      <g>
        {/* Long-Barreled Precision Rail-Sniper Rifle + Scope + Laser Sight */}
        <line
          x1="14"
          y1="64"
          x2="94"
          y2="46"
          stroke="#0F172A"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="16"
          y1="64"
          x2="94"
          y2="46"
          stroke={accentColor}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Rifle Optic Scope */}
        <rect
          x="44"
          y="48"
          width="14"
          height="5"
          rx="1.5"
          transform="rotate(-12 51 50)"
          fill="#0F172A"
          stroke="#FFFFFF"
          strokeWidth="1.4"
        />
        {/* Target Lock Reticle at Muzzle */}
        <circle cx="84" cy="24" r="8" fill="none" stroke={accentColor} strokeWidth="1.6" />
        <line x1="73" y1="24" x2="95" y2="24" stroke={accentColor} strokeWidth="1.2" />
        <line x1="84" y1="13" x2="84" y2="35" stroke={accentColor} strokeWidth="1.2" />
      </g>
    );
  }

  if (doctrine === 'Saboteur') {
    return (
      <g>
        {/* Twin Energized Phase-Daggers + EMP Siphon Arc */}
        <polygon
          points="10,42 28,58 22,64"
          fill={accentColor}
          stroke="#FFFFFF"
          strokeWidth="1.2"
        />
        <polygon
          points="90,42 72,58 78,64"
          fill={accentColor}
          stroke="#FFFFFF"
          strokeWidth="1.2"
        />
        <path
          d="M18 72 Q50 56 82 72"
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
          strokeDasharray="3 2"
        />
      </g>
    );
  }

  // Psion
  return (
    <g>
      {/* Psionic Resonance Staff & Orbiting Harmonic Spheres */}
      <line
        x1="78"
        y1="20"
        x2="72"
        y2="86"
        stroke={accentColor}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="78" cy="20" r="6.5" fill="#0F172A" stroke="#67E8F9" strokeWidth="2" />
      <circle cx="78" cy="20" r="3" fill="#FFFFFF" />
      <circle cx="22" cy="26" r="4.5" fill="#67E8F9" stroke="#FFFFFF" strokeWidth="1" />
      <path
        d="M22 26 Q50 10 78 20"
        fill="none"
        stroke="#67E8F9"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
    </g>
  );
};

/**
 * Shared SVG Chassis Body & Head renderer used by both portraits and gameboard tokens
 * so each biological/mechanical origin is visually unmistakable.
 */
const CharacterChassisBodySvg: React.FC<{
  chassis: ChassisType;
  strokeColor: string;
  fillPrimary: string;
  isWarden: boolean;
}> = ({ chassis, strokeColor, fillPrimary, isWarden }) => {
  if (chassis === 'Spliced') {
    return (
      <g>
        {/* Bio-Engineered Human Commando Torso & Tactical Rig */}
        <path
          d="M26 86 L31 52 L42 46 L58 46 L69 52 L74 86 Z"
          fill="#1E293B"
          stroke={strokeColor}
          strokeWidth="2.2"
        />
        {/* Chest Armor Plate */}
        <polygon
          points="38,52 62,52 58,72 42,72"
          fill={fillPrimary}
          fillOpacity="0.35"
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        {/* Armored Shoulder Pauldrons */}
        <path d="M21 60 L33 49 L36 63 L21 66 Z" fill={fillPrimary} stroke={strokeColor} strokeWidth="1.4" />
        <path d="M79 60 L67 49 L64 63 L79 66 Z" fill={fillPrimary} stroke={strokeColor} strokeWidth="1.4" />
        {/* Combat Helmet & Glowing Visor */}
        <path
          d="M36 31 C36 19, 64 19, 64 31 L61 45 L39 45 Z"
          fill="#0F172A"
          stroke={strokeColor}
          strokeWidth="2.2"
        />
        <rect x="40" y="30" width="20" height="6" rx="2.5" fill={strokeColor} />
        <line x1="44" y1="33" x2="56" y2="33" stroke="#FFFFFF" strokeWidth="1.2" />
      </g>
    );
  }

  if (chassis === 'Automaton') {
    return (
      <g>
        {/* Heavy Angular War-Droid Chassis */}
        <polygon
          points="24,86 27,48 38,42 62,42 73,48 76,86"
          fill="#0F172A"
          stroke={strokeColor}
          strokeWidth="2.4"
        />
        {/* Shoulder Hydraulic Pistons */}
        <rect x="19" y="48" width="9" height="18" rx="1.5" fill="#334155" stroke={strokeColor} strokeWidth="1.5" />
        <rect x="72" y="48" width="9" height="18" rx="1.5" fill="#334155" stroke={strokeColor} strokeWidth="1.5" />
        {/* Glowing Chest Reactor Core */}
        <polygon
          points="50,51 59,60 50,69 41,60"
          fill={fillPrimary}
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
        {/* Armored Droid Turret Head & Cyclops Optic */}
        <rect
          x="37"
          y="22"
          width="26"
          height="19"
          rx="2.5"
          fill="#1E293B"
          stroke={strokeColor}
          strokeWidth="2.2"
        />
        <rect x="41" y="29" width="18" height="6" rx="2" fill="#020617" />
        <circle cx="50" cy="32" r="4" fill={isWarden ? '#EF4444' : strokeColor} />
        <circle cx="50" cy="32" r="1.8" fill="#FFFFFF" />
      </g>
    );
  }

  if (chassis === 'Xenomorph') {
    return (
      <g>
        {/* Chitinous Predatory Carapace & Dorsal Spines */}
        <path
          d="M16 40 L28 52 M84 40 L72 52"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M22 84 Q32 48 50 42 Q68 48 78 84 L65 86 L50 64 L35 86 Z"
          fill="#0F172A"
          stroke={strokeColor}
          strokeWidth="2.2"
        />
        {/* Elongated Bio-Chitin Crest Skull & Glowing Compound Eyes */}
        <path
          d="M50 13 C66 20, 67 38, 50 46 C33 38, 34 20, 50 13 Z"
          fill={fillPrimary}
          stroke={strokeColor}
          strokeWidth="2"
        />
        <circle cx="44" cy="32" r="2.5" fill="#FFFFFF" />
        <circle cx="56" cy="32" r="2.5" fill="#FFFFFF" />
        <circle cx="46" cy="26" r="1.8" fill={strokeColor} />
        <circle cx="54" cy="26" r="1.8" fill={strokeColor} />
      </g>
    );
  }

  if (chassis === 'PhaseBorn') {
    return (
      <g>
        {/* Outer Phase-Crystal Diamond Halo */}
        <polygon
          points="50,12 80,48 50,86 20,48"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeDasharray="4 2"
        />
        {/* Ethereal Phase Shroud & Harmonic Singularity Core */}
        <path
          d="M28 84 Q37 48 50 40 Q63 48 72 84 Z"
          fill={fillPrimary}
          fillOpacity="0.45"
          stroke={strokeColor}
          strokeWidth="2.2"
        />
        <circle
          cx="50"
          cy="29"
          r="10"
          fill="#0F172A"
          stroke={strokeColor}
          strokeWidth="2.2"
        />
        <circle cx="50" cy="29" r="4.5" fill="#FFFFFF" />
      </g>
    );
  }

  // RigWalker (Heavy Exo-Mech Walker)
  return (
    <g>
      {/* Twin Shoulder Missile / Autocannon Pods */}
      <rect
        x="14"
        y="22"
        width="15"
        height="26"
        rx="2"
        fill="#1E293B"
        stroke={strokeColor}
        strokeWidth="2"
      />
      <circle cx="21.5" cy="29" r="2.5" fill={fillPrimary} />
      <circle cx="21.5" cy="38" r="2.5" fill={fillPrimary} />
      <rect
        x="71"
        y="22"
        width="15"
        height="26"
        rx="2"
        fill="#1E293B"
        stroke={strokeColor}
        strokeWidth="2"
      />
      <circle cx="78.5" cy="29" r="2.5" fill={fillPrimary} />
      <circle cx="78.5" cy="38" r="2.5" fill={fillPrimary} />
      {/* Heavy Bipedal Walker Legs & Cockpit Hull */}
      <rect x="33" y="70" width="10" height="18" rx="1.5" fill="#334155" stroke={strokeColor} strokeWidth="1.6" />
      <rect x="57" y="70" width="10" height="18" rx="1.5" fill="#334155" stroke={strokeColor} strokeWidth="1.6" />
      <polygon
        points="28,74 31,32 69,32 72,74"
        fill="#0F172A"
        stroke={strokeColor}
        strokeWidth="2.5"
      />
      {/* Armored Walker Canopy Glass */}
      <polygon
        points="37,40 63,40 59,56 41,56"
        fill={fillPrimary}
        stroke="#FFFFFF"
        strokeWidth="1.4"
      />
    </g>
  );
};

/**
 * Renders a detailed tactical SVG character/unit portrait synthesized from its 3D coordinate:
 * - Y-Axis (Chassis): Spliced, Automaton, Xenomorph, PhaseBorn, RigWalker anatomy
 * - X-Axis (Doctrine): Breacher, Aegis, Outrider, Deadeye, Saboteur, Psion weapon/rig
 * - Z-Axis (Echelon): Swarm (×3), Fireteam (×2), Specialist, Prime Commander, Dreadnought Sovereign
 */
export const UnitPortraitSvg: React.FC<{
  echelon: EchelonTier;
  chassis: ChassisType;
  doctrine: DoctrineRole;
  lockedHardpoints?: string[];
  hardpoints?: string[];
  callsign?: string;
  faction?: 'StrikeRoster' | 'WardenDirective';
  size?: 'sm' | 'md' | 'lg';
  showHashBadge?: boolean;
}> = ({
  echelon,
  chassis,
  doctrine,
  lockedHardpoints,
  hardpoints,
  faction = 'StrikeRoster',
  size = 'md',
  showHashBadge = false,
}) => {
  const resolvedHardpoints = lockedHardpoints ?? hardpoints ?? [];
  const genome = useMemo(
    () =>
      computeUnitVisualGenome({
        echelon,
        chassis,
        doctrine,
        lockedHardpoints: resolvedHardpoints,
        faction,
      }),
    [echelon, chassis, doctrine, resolvedHardpoints, faction]
  );

  const dims =
    size === 'sm'
      ? 'w-11 h-11'
      : size === 'lg'
      ? 'w-24 h-24'
      : 'w-16 h-16';

  const isWarden = faction === 'WardenDirective';
  const strokeColor = isWarden ? '#F87171' : genome.accentHex;
  const fillPrimary = genome.primaryHue;

  return (
    <div
      className={`relative ${dims} rounded-xl bg-slate-950 border ${
        isWarden ? 'border-red-500/60' : 'border-slate-700'
      } overflow-hidden shrink-0 flex items-center justify-center shadow-inner`}
      title={`[${doctrine} · ${chassis} · Echelon ${echelon}]`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`glow-${genome.blake3Digest.slice(0, 8)}`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={fillPrimary} stopOpacity="0.35" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.96" />
          </radialGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill={`url(#glow-${genome.blake3Digest.slice(0, 8)})`}
        />

        {/* Z-Axis Echelon Command Halo */}
        {echelon >= 3 && (
          <circle
            cx="50"
            cy="50"
            r={echelon === 4 ? 45 : 41}
            fill="none"
            stroke={strokeColor}
            strokeWidth={echelon === 4 ? '2.2' : '1.4'}
            strokeDasharray={echelon === 4 ? '6 3' : '4 4'}
            opacity="0.8"
          />
        )}

        {/* Multi-Model Squad Wingmen for Echelon 0 (3 models) & Echelon 1 (2 models) */}
        {echelon === 0 && (
          <g opacity="0.5" transform="translate(-18, -5) scale(0.72)">
            <circle cx="50" cy="32" r="10" fill={fillPrimary} />
            <path d="M34 72 L50 46 L66 72 Z" fill={fillPrimary} />
          </g>
        )}
        {echelon <= 1 && (
          <g opacity="0.55" transform="translate(18, -4) scale(0.75)">
            <circle cx="50" cy="32" r="10" fill={fillPrimary} />
            <path d="M34 72 L50 46 L66 72 Z" fill={fillPrimary} />
          </g>
        )}

        {/* Y-Axis Chassis Body & Head */}
        <CharacterChassisBodySvg
          chassis={chassis}
          strokeColor={strokeColor}
          fillPrimary={fillPrimary}
          isWarden={isWarden}
        />

        {/* X-Axis Doctrine Weapon & Tactical Gear */}
        <CharacterDoctrineWeaponSvg
          doctrine={doctrine}
          accentColor={strokeColor}
          primaryColor={fillPrimary}
        />
      </svg>

      {/* Echelon Corner Tag */}
      <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-slate-950/90 border border-slate-700 font-mono text-[9px] font-bold text-amber-400 leading-none">
        E{echelon}
      </span>

      {showHashBadge && (
        <span className="absolute bottom-0.5 right-1 font-mono text-[8px] text-emerald-400/90 bg-slate-950/85 px-1 rounded">
          {doctrine.slice(0, 3).toUpperCase()}
        </span>
      )}
    </div>
  );
};


/**
 * Illustrated Sector Location Panorama for each of the 6 Core Scenarios + Orbital Bastion.
 * Uses prism-code `blake3Hex` over the scenario's canonical specification to stamp its location identity.
 */
export const SectorLocationPanoramaSvg: React.FC<{
  scenario: ScenarioSpec;
  threatLevel?: 'Low' | 'Medium' | 'High';
  compact?: boolean;
}> = ({ scenario, threatLevel = 'Low', compact = false }) => {
  const locationKappa = useMemo(() => {
    const spec = canonicalize(
      JSON.stringify({
        code: scenario.code,
        id: scenario.id,
        number: scenario.number,
        title: scenario.title,
      })
    );
    return blake3Hex(encoder.encode(spec)).slice(0, 12);
  }, [scenario]);

  const terrain = useMemo(() => scenario.setupTerrain(), [scenario]);
  const objectives = useMemo(() => scenario.setupObjectives(), [scenario]);

  const biomeThemes: Record<
    number,
    { biomeName: string; skyGradStart: string; skyGradEnd: string; accent: string }
  > = {
    1: {
      biomeName: 'VAULT SECTOR 01 · MOLTEN SLAG REFINERY',
      skyGradStart: '#1E1B4B',
      skyGradEnd: '#451A03',
      accent: '#F59E0B',
    },
    2: {
      biomeName: 'NORTHERN PERIMETER · INTERLOCKING BLAST-GATE',
      skyGradStart: '#0F172A',
      skyGradEnd: '#1E293B',
      accent: '#38BDF8',
    },
    3: {
      biomeName: 'SUB-LEVEL 09 · MAINFRAME ARCHIVE SANCTUM',
      skyGradStart: '#042F2E',
      skyGradEnd: '#0F172A',
      accent: '#06B6D4',
    },
    4: {
      biomeName: 'SECTOR 04 · DOWNED DROPSHIP CRASH DEBRIS',
      skyGradStart: '#3F1D2E',
      skyGradEnd: '#0F172A',
      accent: '#10B981',
    },
    5: {
      biomeName: 'GEOTHERMAL CORE · PLASMA TURBINE CHAMBER',
      skyGradStart: '#450A0A',
      skyGradEnd: '#0F172A',
      accent: '#F97316',
    },
    6: {
      biomeName: 'OBSIDIAN CITADEL · WARDEN OVERSEER THRONE',
      skyGradStart: '#2E1065',
      skyGradEnd: '#090D16',
      accent: '#EC4899',
    },
  };

  const theme = biomeThemes[scenario.number] ?? biomeThemes[1];

  return (
    <div
      className={`relative rounded-xl border border-slate-800 overflow-hidden bg-slate-950 ${
        compact ? 'h-28' : 'h-44'
      }`}
    >
      <svg
        viewBox="0 0 600 180"
        preserveAspectRatio="none"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`biome-bg-${scenario.number}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.skyGradStart} />
            <stop offset="100%" stopColor={theme.skyGradEnd} />
          </linearGradient>
        </defs>

        <rect width="600" height="180" fill={`url(#biome-bg-${scenario.number})`} />

        {/* Perspective Subterranean Cavern Ceiling & Structural Ribs */}
        <path
          d="M0 0 L600 0 L540 36 L60 36 Z"
          fill="#020617"
          opacity="0.7"
        />
        <path
          d="M80 0 L120 180 M240 0 L260 180 M380 0 L360 180 M520 0 L480 180"
          stroke="#334155"
          strokeWidth="2"
          opacity="0.35"
        />

        {/* Perspective Isometric Floor Grid */}
        <path
          d="M0 130 H600 M0 150 H600 M0 170 H600"
          stroke={theme.accent}
          strokeWidth="0.8"
          opacity="0.3"
        />

        {/* Scenario-Specific Architectural Landmarks */}
        {scenario.number === 1 && (
          <g>
            <rect x="60" y="135" width="480" height="8" fill="#F59E0B" opacity="0.35" />
            {[150, 240, 360, 450].map((cx, i) => (
              <g key={i} transform={`translate(${cx}, 92)`}>
                <rect
                  x="-16"
                  y="0"
                  width="32"
                  height="28"
                  rx="3"
                  fill="#0F172A"
                  stroke="#F59E0B"
                  strokeWidth="2"
                />
                <polygon points="-8,18 0,6 8,18" fill="#FBBF24" />
              </g>
            ))}
          </g>
        )}

        {scenario.number === 2 && (
          <g>
            <rect
              x="160"
              y="32"
              width="280"
              height="90"
              fill="#0F172A"
              stroke="#38BDF8"
              strokeWidth="2.5"
            />
            <line x1="300" y1="32" x2="300" y2="122" stroke="#38BDF8" strokeWidth="3" />
            <polygon points="285,75 300,55 315,75" fill="#38BDF8" />
          </g>
        )}

        {scenario.number === 3 && (
          <g>
            <polygon
              points="270,25 330,25 345,130 255,130"
              fill="#042F2E"
              stroke="#06B6D4"
              strokeWidth="2.5"
            />
            <circle cx="300" cy="75" r="18" fill="none" stroke="#67E8F9" strokeWidth="2" />
            <circle cx="300" cy="75" r="7" fill="#67E8F9" />
          </g>
        )}

        {scenario.number === 4 && (
          <g>
            <polygon
              points="180,115 230,65 360,72 410,115"
              fill="#1E293B"
              stroke="#10B981"
              strokeWidth="2"
            />
            <circle cx="300" cy="52" r="10" fill="#10B981" opacity="0.85" />
            <circle cx="300" cy="52" r="22" fill="none" stroke="#10B981" strokeDasharray="4 3" />
          </g>
        )}

        {scenario.number === 5 && (
          <g>
            <circle
              cx="300"
              cy="82"
              r="42"
              fill="#450A0A"
              stroke="#F97316"
              strokeWidth="3"
            />
            <circle cx="300" cy="82" r="22" fill="#F97316" opacity="0.6" />
            <circle cx="300" cy="82" r="9" fill="#FEF08A" />
          </g>
        )}

        {scenario.number === 6 && (
          <g>
            <polygon points="170,130 190,30 220,30 230,130" fill="#1E1B4B" stroke="#EC4899" strokeWidth="1.5" />
            <polygon points="370,130 380,30 410,30 430,130" fill="#1E1B4B" stroke="#EC4899" strokeWidth="1.5" />
            <polygon points="270,125 300,22 330,125" fill="#4C1D95" stroke="#F43F5E" strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {/* Top Left Biome Location Header */}
      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
        <div className="px-2.5 py-1 rounded bg-slate-950/90 border border-slate-800">
          <div className="text-[10px] font-mono font-bold text-amber-400">
            {theme.biomeName}
          </div>
          <div className="text-xs font-bold text-white">
            {scenario.code}: {scenario.title} ({threatLevel} Threat)
          </div>
        </div>

        {!compact && (
          <div
            className="w-24 h-24 rounded-lg bg-slate-950/95 border border-slate-700 p-1.5 shrink-0 shadow-lg"
            title="Live 36x36 Sector Radar Preview (Amber = Objectives, Cyan = Cover/Bulkheads)"
          >
            <svg viewBox="0 0 18 18" className="w-full h-full">
              <rect width="18" height="18" fill="#020617" />
              <rect x="0" y="0" width="18" height="3" fill="#EF4444" fillOpacity="0.18" />
              <rect x="0" y="15" width="18" height="3" fill="#10B981" fillOpacity="0.18" />
              {terrain.map((t, idx) => (
                <rect
                  key={idx}
                  x={t.x}
                  y={t.y}
                  width="1"
                  height="1"
                  fill={
                    t.kind === 'Bulkhead'
                      ? '#94A3B8'
                      : t.kind === 'LowBarricade'
                      ? '#38BDF8'
                      : t.kind === 'PlasmaHazard'
                      ? '#EF4444'
                      : '#78350F'
                  }
                />
              ))}
              {objectives.map((o) => (
                <circle
                  key={o.id}
                  cx={o.x + 0.5}
                  cy={o.y + 0.5}
                  r="0.85"
                  fill="#F59E0B"
                />
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* Bottom Location Telemetry Strip */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-slate-300 bg-slate-950/85 px-2.5 py-1 rounded border border-slate-800/80">
        <span>
          Objectives: <strong className="text-amber-400">{objectives.length} Markers</strong> · Terrain:{' '}
          <strong className="text-sky-400">{terrain.length} Sectors</strong>
        </span>
        <span className="text-emerald-400">loc-κ: {locationKappa}</span>
      </div>
    </div>
  );
};

/**
 * Renders rich, self-explanatory SVG illustrations for every Terrain structure and Objective item
 * on the 18x18 Gameboard (and in the Visual Board Inspector):
 * - StandardCache: Open armored salvage crate with glowing Zero-Point Alloy crystal ingots
 * - CentralCore: Cybernetic Mainframe Core spire with rotating data rings & lock segments
 * - VipCourier: Illuminated Cryo-Stasis Beacon Pod with medical/extraction canopy
 * - Bulkhead: Reinforced titanium Blast Wall with beveled armor plates, rivets & hazard stripes
 * - LowBarricade: Directional waist-high Aegis trench shield with glowing cyan cover emitter
 * - RoughDebris: Fractured basalt cavern boulders & collapsed steel beams
 * - PlasmaHazard: Bubbling molten geothermal magma fissure & warning grate
 */
export const BattlefieldCellTerrainOrObjectiveSvg: React.FC<{
  terrain?: TerrainCell;
  objective?: ObjectiveMarker;
  terrainKind?: TerrainCell['kind'];
  objectiveKind?: ObjectiveMarker['kind'];
  hackCount?: number;
}> = ({ terrain, objective, terrainKind, objectiveKind, hackCount }) => {
  const resolvedObjKind = objective?.kind ?? objectiveKind;
  const resolvedHackCount = objective?.hackCount ?? hackCount ?? 0;
  const resolvedTerrainKind = terrain?.kind ?? terrainKind;

  if (
    resolvedObjKind === 'AlloyCache' ||
    resolvedObjKind === 'ControlBeacon' ||
    resolvedObjKind === 'ExtractionZone'
  ) {
    return (
      <div className="w-full h-full flex items-center justify-center p-[1px]">
        <svg viewBox="0 0 64 64" className="w-full h-full">
          {/* Outer Beacon Ring */}
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="#F59E0B"
            fillOpacity="0.16"
            stroke="#FBBF24"
            strokeWidth="1.8"
            strokeDasharray="5 3"
          />
          {/* Armored Salvage Chest Base */}
          <rect
            x="12"
            y="24"
            width="40"
            height="28"
            rx="4"
            fill="#1E293B"
            stroke="#F59E0B"
            strokeWidth="2.5"
          />
          {/* Open Crate Lid */}
          <polygon
            points="10,24 18,12 46,12 54,24"
            fill="#0F172A"
            stroke="#FBBF24"
            strokeWidth="2"
          />
          {/* Glowing Golden Zero-Point Alloy Crystal Ingots Inside */}
          <polygon points="22,36 27,20 32,36" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.2" />
          <polygon points="30,38 36,18 42,38" fill="#FBBF24" stroke="#FFFFFF" strokeWidth="1.2" />
          {/* Crate Clasp & Lock Light */}
          <rect x="27" y="38" width="10" height="8" rx="1.5" fill="#F59E0B" />
        </svg>
      </div>
    );
  }

  if (resolvedObjKind === 'CentralCore') {
    const locksLeft = Math.max(1, 3 - resolvedHackCount);
    return (
      <div className="w-full h-full flex items-center justify-center p-[1px]">
        <svg viewBox="0 0 64 64" className="w-full h-full">
          {/* Cybernetic Mainframe Core Tower & Data Rings */}
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="#06B6D4"
            fillOpacity="0.18"
            stroke="#67E8F9"
            strokeWidth="2"
          />
          <polygon
            points="22,54 25,12 39,12 42,54"
            fill="#0F172A"
            stroke="#38BDF8"
            strokeWidth="2.5"
          />
          {/* Glowing Core Singularity */}
          <circle cx="32" cy="30" r="9" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="1.8" />
          {/* 3 Override Lock Pips at Base */}
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={19 + i * 10}
              y="46"
              width="6"
              height="5"
              rx="1"
              fill={i < locksLeft ? '#F59E0B' : '#10B981'}
            />
          ))}
        </svg>
      </div>
    );
  }

  if (resolvedObjKind === 'VipCourier') {
    return (
      <div className="w-full h-full flex items-center justify-center p-[1px]">
        <svg viewBox="0 0 64 64" className="w-full h-full">
          {/* Stasis Rescue Pod & Beacon Pulse */}
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="#10B981"
            fillOpacity="0.2"
            stroke="#34D399"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
          {/* Pod Capsule Hull */}
          <rect
            x="18"
            y="10"
            width="28"
            height="44"
            rx="12"
            fill="#0F172A"
            stroke="#34D399"
            strokeWidth="2.5"
          />
          {/* Illuminated Cryo Canopy & Survivor Silhouette */}
          <ellipse cx="32" cy="26" rx="8" ry="10" fill="#10B981" fillOpacity="0.45" stroke="#A7F3D0" strokeWidth="1.5" />
          <circle cx="32" cy="24" r="4" fill="#FFFFFF" />
          {/* Rescue Cross Beacon */}
          <path d="M32 39 V49 M27 44 H37" stroke="#34D399" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (!resolvedTerrainKind) return null;

  if (resolvedTerrainKind === 'Bulkhead') {
    return (
      <div className="w-full h-full">
        <svg viewBox="0 0 64 64" className="w-full h-full">
          {/* Reinforced Vault Steel Wall Block (Impassable / Blocks Line of Sight) */}
          <rect
            x="2"
            y="2"
            width="60"
            height="60"
            rx="4"
            fill="#334155"
            stroke="#94A3B8"
            strokeWidth="3"
          />
          {/* Inner Beveled Steel Armor Plate & Cross-Bracing */}
          <rect
            x="10"
            y="10"
            width="44"
            height="44"
            rx="2"
            fill="#1E293B"
            stroke="#64748B"
            strokeWidth="2"
          />
          <line x1="10" y1="10" x2="54" y2="54" stroke="#475569" strokeWidth="2.5" />
          <line x1="54" y1="10" x2="10" y2="54" stroke="#475569" strokeWidth="2.5" />
          {/* Center Structural Lock Hub */}
          <rect x="24" y="24" width="16" height="16" rx="2" fill="#334155" stroke="#CBD5E1" strokeWidth="1.5" />
          {/* Corner Rivets */}
          <circle cx="15" cy="15" r="2.2" fill="#CBD5E1" />
          <circle cx="49" cy="15" r="2.2" fill="#CBD5E1" />
          <circle cx="15" cy="49" r="2.2" fill="#CBD5E1" />
          <circle cx="49" cy="49" r="2.2" fill="#CBD5E1" />
        </svg>
      </div>
    );
  }

  if (resolvedTerrainKind === 'LowBarricade') {
    return (
      <div className="w-full h-full">
        <svg viewBox="0 0 64 64" className="w-full h-full">
          {/* Waist-High Tactical Blast Barricade & Energy Shield Wall (+1 Cover Evasion) */}
          <polygon
            points="6,46 14,22 50,22 58,46"
            fill="#0F172A"
            stroke="#38BDF8"
            strokeWidth="2.5"
          />
          {/* Glowing Cyan Deflector Strip Across Top */}
          <rect x="14" y="18" width="36" height="6" rx="2" fill="#38BDF8" />
          {/* Armor Chevrons & Shield Emblem */}
          <polygon
            points="32,27 41,31 41,40 32,45 23,40 23,31"
            fill="#0284C7"
            stroke="#BAE6FD"
            strokeWidth="1.5"
          />
          {/* Base Anchors */}
          <rect x="8" y="46" width="12" height="6" rx="1" fill="#475569" />
          <rect x="44" y="46" width="12" height="6" rx="1" fill="#475569" />
        </svg>
      </div>
    );
  }

  if (resolvedTerrainKind === 'PlasmaHazard') {
    return (
      <div className="w-full h-full">
        <svg viewBox="0 0 64 64" className="w-full h-full">
          {/* Bubbling Molten Geothermal Magma Vent / Plasma Hazard */}
          <rect x="2" y="2" width="60" height="60" rx="4" fill="#450A0A" stroke="#EF4444" strokeWidth="2" />
          {/* Glowing Lava Pool & Fissures */}
          <path
            d="M12 36 Q20 14 36 18 Q54 22 50 40 Q44 54 24 50 Q10 46 12 36 Z"
            fill="#EA580C"
            stroke="#FBBF24"
            strokeWidth="2"
          />
          <circle cx="30" cy="34" r="9" fill="#FDE047" />
          <circle cx="40" cy="26" r="4" fill="#FEF08A" />
          <path d="M18 20 L26 28 M46 44 L38 36" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // RoughDebris (Collapsed Cavern Boulders & Cracked Basalt Rubble)
  return (
    <div className="w-full h-full">
      <svg viewBox="0 0 64 64" className="w-full h-full">
        {/* Jagged Basalt Rocks & Broken Vault Girders */}
        <polygon
          points="8,50 18,24 34,30 38,50"
          fill="#44403C"
          stroke="#A8A29E"
          strokeWidth="2"
        />
        <polygon
          points="28,52 38,20 54,28 56,52"
          fill="#292524"
          stroke="#D6D3D1"
          strokeWidth="2"
        />
        <polygon
          points="18,54 28,36 44,40 48,54"
          fill="#57534E"
          stroke="#F59E0B"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
};


/**
 * Full-Viewport 2.5D Object-Spatial Battlefield World Renderer (`SpatialBattlefieldViewportSvg`).
 * Replaces flat HTML button-grid dashboards with a depth-sorted 2.5D Isometric / Ortho spatial scene
 * synthesized from `prism-code` spatial object nodes.
 */
export const SpatialBattlefieldViewportSvg: React.FC<{
  scenario: ScenarioSpec;
  units: CompiledUnit[];
  terrain: TerrainCell[];
  objectives: ObjectiveMarker[];
  selectedUnit: CompiledUnit | null;
  validMoveCells: Map<string, { isChargeEligible: boolean; dist: number }>;
  engageableHostileIds: Set<string>;
  hoveredCell: { x: number; y: number } | null;
  lastVector: {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    kind: 'MOVE' | 'ATTACK';
  } | null;
  cameraMode: SpatialCameraMode;
  onSelectCell: (x: number, y: number) => void;
  onSelectUnit: (unitId: string) => void;
  onHoverCell: (cell: { x: number; y: number } | null) => void;
}> = ({
  scenario,
  units,
  terrain,
  objectives,
  selectedUnit,
  validMoveCells,
  engageableHostileIds,
  hoveredCell,
  lastVector,
  cameraMode,
  onSelectCell,
  onSelectUnit,
  onHoverCell,
}) => {
  const spatialScene = useMemo(
    () =>
      compileBattlefieldSpatialScene({
        units,
        terrain,
        objectives,
        camera: cameraMode,
      }),
    [units, terrain, objectives, cameraMode]
  );

  // Outer platform corners for the 36"x36" vault deck slab
  const slabCorners = useMemo(() => {
    const cN = projectSpatialCoord(-0.5, -0.5, 0, cameraMode);
    const cE = projectSpatialCoord(17.5, -0.5, 0, cameraMode);
    const cS = projectSpatialCoord(17.5, 17.5, 0, cameraMode);
    const cW = projectSpatialCoord(-0.5, 17.5, 0, cameraMode);

    const bW = { sx: cW.sx, sy: cW.sy + 18 };
    const bS = { sx: cS.sx, sy: cS.sy + 18 };
    const bE = { sx: cE.sx, sy: cE.sy + 18 };

    return {
      topDeck: `${cN.sx.toFixed(1)},${cN.sy.toFixed(1)} ${cE.sx.toFixed(1)},${cE.sy.toFixed(1)} ${cS.sx.toFixed(1)},${cS.sy.toFixed(1)} ${cW.sx.toFixed(1)},${cW.sy.toFixed(1)}`,
      leftRim: `${cW.sx.toFixed(1)},${cW.sy.toFixed(1)} ${cS.sx.toFixed(1)},${cS.sy.toFixed(1)} ${bS.sx.toFixed(1)},${bS.sy.toFixed(1)} ${bW.sx.toFixed(1)},${bW.sy.toFixed(1)}`,
      rightRim: `${cS.sx.toFixed(1)},${cS.sy.toFixed(1)} ${cE.sx.toFixed(1)},${cE.sy.toFixed(1)} ${bE.sx.toFixed(1)},${bE.sy.toFixed(1)} ${bS.sx.toFixed(1)},${bS.sy.toFixed(1)}`,
      cN,
      cS,
    };
  }, [cameraMode]);

  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
      onMouseLeave={() => onHoverCell(null)}
    >
      <svg
        viewBox="0 0 1000 680"
        className="w-full h-full max-h-[calc(100vh-92px)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="cavern-abyss-glow" cx="50%" cy="52%" r="60%">
            <stop offset="0%" stopColor="#1E293B" stopOpacity="0.55" />
            <stop offset="65%" stopColor="#090D16" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </radialGradient>
          <linearGradient id="bulkhead-top-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="bulkhead-left-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
          <linearGradient id="bulkhead-right-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>

        {/* Subterranean Cavern Abyss & Geothermal Chasm Backdrop */}
        <rect width="1000" height="680" fill="url(#cavern-abyss-glow)" />

        {/* Ambient Sub-Crust Magma Veins in the Chasm Below the Platform */}
        <path
          d="M 40 580 Q 220 620 480 650 T 940 590"
          fill="none"
          stroke="#EA580C"
          strokeWidth="3"
          opacity="0.22"
        />
        <path
          d="M 80 120 Q 260 65 500 35 T 920 115"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          opacity="0.22"
        />

        {/* 3D Extruded Subterranean Vault Deck Slab Rim */}
        <polygon points={slabCorners.leftRim} fill="#1E293B" stroke="#475569" strokeWidth="1.2" />
        <polygon points={slabCorners.rightRim} fill="#0F172A" stroke="#334155" strokeWidth="1.2" />
        <polygon points={slabCorners.topDeck} fill="#090D16" stroke="#475569" strokeWidth="2" />

        {/* Layer 1: 18x18 Interactive Projected Floor Plates */}
        {spatialScene.floorNodes.map((tile) => {
          const { x, y } = tile.world;
          const cellKey = `${x},${y}`;
          const moveOption = validMoveCells.get(cellKey);
          const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
          const isSelectedTile =
            selectedUnit && selectedUnit.gridX === x && selectedUnit.gridY === y;

          const isNorthWardenZone = y <= 2;
          const isSouthDropZone = y >= 15;

          let fill = (x + y) % 2 === 0 ? '#0F172A' : '#131C31';
          let stroke = '#1E293B';
          let strokeWidth = 0.8;

          if (isNorthWardenZone) {
            fill = (x + y) % 2 === 0 ? '#281117' : '#1F0D12';
            stroke = '#451A23';
          } else if (isSouthDropZone) {
            fill = (x + y) % 2 === 0 ? '#0A2622' : '#081E1B';
            stroke = '#11423A';
          }

          if (moveOption) {
            if (moveOption.isChargeEligible) {
              fill = 'rgba(245, 158, 11, 0.38)';
              stroke = '#FBBF24';
              strokeWidth = 1.4;
            } else {
              fill = 'rgba(16, 185, 129, 0.28)';
              stroke = '#34D399';
              strokeWidth = 1.2;
            }
          }

          if (isSelectedTile) {
            fill = 'rgba(251, 191, 36, 0.35)';
            stroke = '#FBBF24';
            strokeWidth = 2;
          } else if (isHovered) {
            stroke = '#FFFFFF';
            strokeWidth = 1.8;
          }

          return (
            <g
              key={tile.id}
              className="cursor-pointer"
              onMouseEnter={() => onHoverCell({ x, y })}
              onClick={() => onSelectCell(x, y)}
            >
              <polygon
                points={tile.projected.floorPolygon}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
              {/* Reachable Tile Center Dot */}
              {moveOption && !isSelectedTile && (
                <circle
                  cx={tile.projected.centerX}
                  cy={tile.projected.centerY}
                  r={moveOption.isChargeEligible ? 3.2 : 2.2}
                  fill={moveOption.isChargeEligible ? '#FBBF24' : '#34D399'}
                  opacity="0.85"
                />
              )}
            </g>
          );
        })}

        {/* Zone Perimeter Labels Projected in World Space */}
        <text
          x={slabCorners.cN.sx}
          y={slabCorners.cN.sy - 12}
          textAnchor="middle"
          fill="#FCA5A5"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="bold"
        >
          ▲ NORTHERN WARDEN GARRISON GATE ({scenario.code}) ▲
        </text>
        <text
          x={slabCorners.cS.sx}
          y={slabCorners.cS.sy + 32}
          textAnchor="middle"
          fill="#6EE7B7"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="bold"
        >
          ▼ VALKYRIE-04 DROP-POD LANDING ZONE ▼
        </text>

        {/* Layer 2: Ground-Level Objective Salvage Tethers from Active Operative */}
        {selectedUnit &&
          objectives
            .filter((o) => o.claimedBy === 'None')
            .map((obj) => {
              const p1 = projectSpatialCoord(selectedUnit.gridX, selectedUnit.gridY, 0.2, cameraMode);
              const p2 = projectSpatialCoord(obj.x, obj.y, 0.2, cameraMode);
              const dist =
                Math.max(
                  Math.abs(selectedUnit.gridX - obj.x),
                  Math.abs(selectedUnit.gridY - obj.y)
                ) * 2;
              if (dist > 14) return null;
              return (
                <line
                  key={`tether-${obj.id}`}
                  x1={p1.sx}
                  y1={p1.sy}
                  x2={p2.sx}
                  y2={p2.sy}
                  stroke="#FBBF24"
                  strokeWidth={dist <= 2 ? '2.2' : '1.1'}
                  strokeDasharray="4 4"
                  opacity={dist <= 2 ? '0.9' : '0.45'}
                  className="pointer-events-none"
                />
              );
            })}

        {/* Layer 3: Depth-Sorted 2.5D Extruded Terrain Structures, Objectives & Character Figures */}
        {spatialScene.sortedSceneObjects.map((node) => {
          const { x, y } = node.world;
          const { projected } = node;

          // 3A. Extruded 3D Terrain Structure
          if (node.kind === 'TerrainStructure' && node.terrainRef) {
            const tKind = node.terrainRef.kind;
            if (tKind === 'Bulkhead') {
              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onMouseEnter={() => onHoverCell({ x, y })}
                  onClick={() => onSelectCell(x, y)}
                >
                  {/* 3D Extruded Titanium Vault Blast Wall */}
                  <polygon
                    points={projected.leftWallPolygon}
                    fill="url(#bulkhead-left-grad)"
                    stroke="#64748B"
                    strokeWidth="1"
                  />
                  <polygon
                    points={projected.rightWallPolygon}
                    fill="url(#bulkhead-right-grad)"
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <polygon
                    points={projected.topPolygon}
                    fill="url(#bulkhead-top-grad)"
                    stroke="#CBD5E1"
                    strokeWidth="1.2"
                  />
                  {/* Top Structural Cross-Brace & Rivet Hub */}
                  <circle
                    cx={projected.topCenterX}
                    cy={projected.topCenterY}
                    r="4"
                    fill="#1E293B"
                    stroke="#F59E0B"
                    strokeWidth="1"
                  />
                </g>
              );
            }

            if (tKind === 'LowBarricade') {
              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onMouseEnter={() => onHoverCell({ x, y })}
                  onClick={() => onSelectCell(x, y)}
                >
                  {/* Waist-High 3D Aegis Cover Barricade */}
                  <polygon
                    points={projected.leftWallPolygon}
                    fill="#0F172A"
                    stroke="#0284C7"
                    strokeWidth="1"
                  />
                  <polygon
                    points={projected.rightWallPolygon}
                    fill="#082F49"
                    stroke="#0369A1"
                    strokeWidth="1"
                  />
                  <polygon
                    points={projected.topPolygon}
                    fill="#0284C7"
                    fillOpacity="0.65"
                    stroke="#38BDF8"
                    strokeWidth="1.5"
                  />
                  {/* Cyan Deflector Shield Emitter Crest */}
                  <circle
                    cx={projected.topCenterX}
                    cy={projected.topCenterY}
                    r="3.2"
                    fill="#BAE6FD"
                  />
                </g>
              );
            }

            if (tKind === 'PlasmaHazard') {
              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onMouseEnter={() => onHoverCell({ x, y })}
                  onClick={() => onSelectCell(x, y)}
                >
                  <polygon
                    points={projected.floorPolygon}
                    fill="#7F1D1D"
                    stroke="#EF4444"
                    strokeWidth="1.4"
                  />
                  <ellipse
                    cx={projected.centerX}
                    cy={projected.centerY}
                    rx="11"
                    ry="6"
                    fill="#EA580C"
                    stroke="#FDE047"
                    strokeWidth="1.2"
                  />
                  <circle cx={projected.centerX} cy={projected.centerY} r="4" fill="#FEF08A" />
                </g>
              );
            }

            // RoughDebris (3D Basalt Boulders)
            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => onHoverCell({ x, y })}
                onClick={() => onSelectCell(x, y)}
              >
                <polygon
                  points={projected.floorPolygon}
                  fill="#292524"
                  stroke="#78716C"
                  strokeWidth="1"
                />
                <polygon
                  points={`${projected.centerX - 10},${projected.centerY + 3} ${
                    projected.centerX - 4
                  },${projected.centerY - 9} ${projected.centerX + 5},${projected.centerY + 2}`}
                  fill="#57534E"
                  stroke="#D6D3D1"
                  strokeWidth="1"
                />
                <polygon
                  points={`${projected.centerX - 1},${projected.centerY + 5} ${
                    projected.centerX + 6
                  },${projected.centerY - 7} ${projected.centerX + 12},${projected.centerY + 4}`}
                  fill="#44403C"
                  stroke="#A8A29E"
                  strokeWidth="1"
                />
              </g>
            );
          }

          // 3B. 3D Objective Artifact (Alloy Cache Crate, Mainframe Data Core, or VIP Stasis Pod)
          if (node.kind === 'ObjectiveArtifact' && node.objectiveRef) {
            const obj = node.objectiveRef;
            const distFromActive = selectedUnit
              ? Math.max(
                  Math.abs(selectedUnit.gridX - obj.x),
                  Math.abs(selectedUnit.gridY - obj.y)
                ) * 2
              : 99;
            const canClaimNow = distFromActive <= 2;

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => onHoverCell({ x, y })}
                onClick={() => onSelectCell(x, y)}
              >
                {/* Vertical Beacon Pillar */}
                <line
                  x1={projected.centerX}
                  y1={projected.centerY}
                  x2={projected.centerX}
                  y2={projected.topCenterY - 22}
                  stroke={obj.kind === 'CentralCore' ? '#38BDF8' : '#FBBF24'}
                  strokeWidth="2"
                  strokeDasharray="3 2"
                  opacity="0.8"
                />

                {/* 3D Extruded Pedestal / Crate Box */}
                <polygon
                  points={projected.leftWallPolygon}
                  fill={obj.kind === 'CentralCore' ? '#083344' : '#451A03'}
                  stroke={obj.kind === 'CentralCore' ? '#38BDF8' : '#F59E0B'}
                  strokeWidth="1.2"
                />
                <polygon
                  points={projected.rightWallPolygon}
                  fill="#0F172A"
                  stroke={obj.kind === 'CentralCore' ? '#0284C7' : '#D97706'}
                  strokeWidth="1.2"
                />
                <polygon
                  points={projected.topPolygon}
                  fill={obj.kind === 'CentralCore' ? '#06B6D4' : '#FBBF24'}
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                />

                {/* Floating Crystal / Core Emblem & Distance Callout Tag */}
                <g transform={`translate(${projected.centerX}, ${projected.topCenterY - 24})`}>
                  <rect
                    x="-28"
                    y="-11"
                    width="56"
                    height="15"
                    rx="4"
                    fill={canClaimNow ? '#F59E0B' : '#020617'}
                    stroke="#FBBF24"
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="-1"
                    textAnchor="middle"
                    fill={canClaimNow ? '#020617' : '#FDE68A'}
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {canClaimNow
                      ? 'CLAIM NOW!'
                      : obj.kind === 'CentralCore'
                      ? `CORE (${3 - (obj.hackCount ?? 0)})`
                      : obj.kind === 'VipCourier'
                      ? 'VIP POD'
                      : `CACHE ${distFromActive < 90 ? `${distFromActive}"` : ''}`}
                  </text>
                </g>
              </g>
            );
          }

          // 3C. Standing 2.5D Character or Hostile Warden Figure
          if (node.kind === 'CharacterUnit' && node.unitRef) {
            const u = node.unitRef;
            const isPlayer = u.faction === 'StrikeRoster';
            const isSelected = selectedUnit?.id === u.id;
            const isEngageable = engageableHostileIds.has(u.id);
            const hpRemaining = Math.max(0, u.maxIntegrityPerModel - u.accumulatedDamage);
            const hpRatio = Math.max(
              0,
              Math.min(1, hpRemaining / Math.max(1, u.maxIntegrityPerModel))
            );

            const strokeColor = isPlayer
              ? isSelected
                ? '#FBBF24'
                : '#34D399'
              : isEngageable
              ? '#FBBF24'
              : '#F87171';
            const fillPrimary = isPlayer ? '#10B981' : '#EF4444';
            const spriteScale = 0.42 * projected.scale;

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => onHoverCell({ x, y })}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPlayer && !u.activatedThisRound) {
                    onSelectUnit(u.id);
                    return;
                  }
                  onSelectCell(x, y);
                }}
              >
                {/* 3D Projected Elliptical Pedestal Ring on the Cavern Floor */}
                <ellipse
                  cx={projected.centerX}
                  cy={projected.centerY + 2}
                  rx={16 * projected.scale}
                  ry={8.5 * projected.scale}
                  fill={isPlayer ? '#064E3B' : '#450A0A'}
                  stroke={strokeColor}
                  strokeWidth={isSelected || isEngageable ? '2.4' : '1.5'}
                />

                {/* Selected Operative Ground Aura Ring */}
                {isSelected && (
                  <ellipse
                    cx={projected.centerX}
                    cy={projected.centerY + 2}
                    rx={21 * projected.scale}
                    ry={11 * projected.scale}
                    fill="none"
                    stroke="#FBBF24"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                )}

                {/* Engageable Hostile Target Reticle Ring */}
                {isEngageable && !isPlayer && (
                  <ellipse
                    cx={projected.centerX}
                    cy={projected.centerY + 2}
                    rx={22 * projected.scale}
                    ry={11.5 * projected.scale}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="1.8"
                    strokeDasharray="5 3"
                  />
                )}

                {/* Upright Character Figure with Chassis Anatomy & Held Doctrine Weapon */}
                <g
                  transform={`translate(${projected.centerX - 50 * spriteScale}, ${
                    projected.centerY - 82 * spriteScale
                  }) scale(${spriteScale})`}
                >
                  {/* Multi-Model Squad Wingmen */}
                  {u.modelsCurrent >= 2 && (
                    <g opacity="0.7" transform="translate(22, -10) scale(0.76)">
                      <CharacterChassisBodySvg
                        chassis={u.chassis}
                        strokeColor={strokeColor}
                        fillPrimary={fillPrimary}
                        isWarden={!isPlayer}
                      />
                    </g>
                  )}
                  {u.modelsCurrent >= 3 && (
                    <g opacity="0.65" transform="translate(-22, -10) scale(0.76)">
                      <CharacterChassisBodySvg
                        chassis={u.chassis}
                        strokeColor={strokeColor}
                        fillPrimary={fillPrimary}
                        isWarden={!isPlayer}
                      />
                    </g>
                  )}

                  <CharacterChassisBodySvg
                    chassis={u.chassis}
                    strokeColor={strokeColor}
                    fillPrimary={fillPrimary}
                    isWarden={!isPlayer}
                  />
                  <CharacterDoctrineWeaponSvg
                    doctrine={u.doctrine}
                    accentColor={strokeColor}
                    primaryColor={fillPrimary}
                  />
                </g>

                {/* Floating Overhead Character Nameplate & Health Bar */}
                <g
                  transform={`translate(${projected.centerX}, ${
                    projected.centerY - 38 * projected.scale
                  })`}
                >
                  <rect
                    x="-24"
                    y="-12"
                    width="48"
                    height="13"
                    rx="3"
                    fill="#020617"
                    fillOpacity="0.92"
                    stroke={strokeColor}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="-3.5"
                    textAnchor="middle"
                    fill={isPlayer ? '#A7F3D0' : '#FECACA'}
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {u.callsign.slice(0, 5)}
                    {u.modelsCurrent > 1 ? `×${u.modelsCurrent}` : ''}
                  </text>
                  {/* Health Bar Track */}
                  <rect x="-22" y="-1.5" width="44" height="2.5" rx="1" fill="#1E293B" />
                  <rect
                    x="-22"
                    y="-1.5"
                    width={Math.max(6, Math.round(44 * hpRatio))}
                    height="2.5"
                    rx="1"
                    fill={hpRatio > 0.5 ? (isPlayer ? '#34D399' : '#EF4444') : '#FBBF24'}
                  />
                </g>
              </g>
            );
          }

          return null;
        })}

        {/* Layer 4: 3D Parabolic Weapon Sightline Arcs to Engageable Hostiles */}
        {selectedUnit &&
          units
            .filter((u) => engageableHostileIds.has(u.id))
            .map((target) => {
              const p1 = projectSpatialCoord(
                selectedUnit.gridX,
                selectedUnit.gridY,
                1.0,
                cameraMode
              );
              const p2 = projectSpatialCoord(target.gridX, target.gridY, 1.0, cameraMode);
              const midX = (p1.sx + p2.sx) / 2;
              const midY = Math.min(p1.sy, p2.sy) - 28;
              const traj = evaluateSpatialTrajectoryWasm(
                selectedUnit.gridX,
                selectedUnit.gridY,
                target.gridX,
                target.gridY,
                0
              );

              return (
                <g
                  key={`arc-los-${target.id}`}
                  className="cursor-pointer"
                  onClick={() => onSelectCell(target.gridX, target.gridY)}
                >
                  <path
                    d={`M ${p1.sx} ${p1.sy} Q ${midX} ${midY} ${p2.sx} ${p2.sy}`}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    opacity="0.9"
                  />
                  {/* Floating Mid-Air Fire Target Callout */}
                  <g transform={`translate(${midX}, ${midY + 6})`}>
                    <rect
                      x="-36"
                      y="-9"
                      width="72"
                      height="15"
                      rx="4"
                      fill="#7F1D1D"
                      stroke="#FBBF24"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="1"
                      textAnchor="middle"
                      fill="#FEF08A"
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      FIRE · {traj.manhattanSectors}&quot;
                    </text>
                  </g>
                </g>
              );
            })}

        {/* Layer 5: Last Combat Fire Beam or Movement Trace */}
        {lastVector &&
          (() => {
            const p1 = projectSpatialCoord(
              lastVector.fromX,
              lastVector.fromY,
              lastVector.kind === 'ATTACK' ? 1.0 : 0.15,
              cameraMode
            );
            const p2 = projectSpatialCoord(
              lastVector.toX,
              lastVector.toY,
              lastVector.kind === 'ATTACK' ? 1.0 : 0.15,
              cameraMode
            );
            return (
              <g className="pointer-events-none">
                <line
                  x1={p1.sx}
                  y1={p1.sy}
                  x2={p2.sx}
                  y2={p2.sy}
                  stroke={lastVector.kind === 'ATTACK' ? '#EF4444' : '#34D399'}
                  strokeWidth={lastVector.kind === 'ATTACK' ? '3' : '2'}
                  strokeDasharray={lastVector.kind === 'MOVE' ? '5 3' : undefined}
                  opacity="0.85"
                />
                <circle
                  cx={p2.sx}
                  cy={p2.sy}
                  r="5"
                  fill={lastVector.kind === 'ATTACK' ? '#FBBF24' : '#34D399'}
                />
              </g>
            );
          })()}
      </svg>
    </div>
  );
};

/**
 * Interactive Object-Spatial Cutaway of the Salvage Carrier *Orbital Bastion* & Planet Karst-9.
 * Allows players to click directly on:
 * - The 6 Ventral Drop-Pod Berths (each showing the character sprite standing inside their launch bay)
 * - The 4 Carrier Decks (Cryo-Med Bay, Ordnance Foundry, Resonance Sanctum, Command Bridge)
 * - The 6 Subterranean Sector Nodes (`KV-01` .. `KV-06`) embedded in Planet Karst-9's fractured crust
 */
export const InteractiveOrbitalBastionSpatialSvg: React.FC<{
  roster: CompiledUnit[];
  scenarios: ScenarioSpec[];
  selectedScenarioId: string;
  selectedOperativeId?: string | null;
  facilities: {
    medBay: boolean;
    ordnanceFoundry: boolean;
    resonanceSanctum: boolean;
  };
  onSelectOperative?: (unitId: string) => void;
  onSelectEmptyBerth?: (berthNumber: number) => void;
  onSelectDeck?: (deck: 'SQUAD_BAY' | 'CREW_PREP' | 'CONTRACT_BRIEFING') => void;
  onSelectScenario?: (scenarioId: string) => void;
  onLaunchDrop?: () => void;
}> = ({
  roster,
  scenarios,
  selectedScenarioId,
  selectedOperativeId,
  facilities,
  onSelectOperative,
  onSelectEmptyBerth,
  onSelectDeck,
  onSelectScenario,
  onLaunchDrop,
}) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none">
      <svg
        viewBox="0 0 1000 540"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="spatial-orbit-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="55%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#271105" />
          </linearGradient>
          <radialGradient id="spatial-karst-horizon" cx="50%" cy="112%" r="72%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.58" />
            <stop offset="45%" stopColor="#EA580C" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1000" height="540" fill="url(#spatial-orbit-bg)" />
        <rect width="1000" height="540" fill="url(#spatial-karst-horizon)" />

        {/* Starfield */}
        {[
          [85, 36],
          [190, 64],
          [320, 28],
          [480, 42],
          [690, 25],
          [820, 58],
          [910, 32],
          [140, 180],
          [880, 195],
        ].map(([sx, sy], i) => (
          <circle key={i} cx={sx} cy={sy} r="1.4" fill="#94A3B8" opacity="0.65" />
        ))}

        {/* ================= UPPER ORBIT: SALVAGE CARRIER "ORBITAL BASTION" CUTAWAY ================= */}
        <g transform="translate(90, 32)">
          {/* Rear Ion Thruster Plumes */}
          <polygon points="-38,90 12,72 12,138 -38,120" fill="#38BDF8" opacity="0.7" />
          <polygon points="-20,96 12,84 12,126 -20,114" fill="#BAE6FD" opacity="0.9" />

          {/* Main Armored Carrier Hull Cutaway Frame */}
          <polygon
            points="12,56 115,24 680,24 810,68 770,178 55,178"
            fill="#0F172A"
            stroke="#64748B"
            strokeWidth="2.5"
          />
          <polygon
            points="24,62 120,32 672,32 792,72 758,170 64,170"
            fill="#090D16"
            stroke="#334155"
            strokeWidth="1.2"
          />

          {/* Carrier Cutaway Hull Callout Label */}
          <text
            x="405"
            y="16"
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="9.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            SALVAGE CARRIER &quot;ORBITAL BASTION&quot; · CLICK ANY COMPARTMENT OR DROP POD TO INTERACT
          </text>

          {/* Upper Command Superstructure & Deck Interactive Rooms */}
          {/* Room 1: Cryo-Med & Crew Deck */}
          <g
            className="cursor-pointer"
            onClick={() => onSelectDeck?.('CREW_PREP')}
          >
            <rect
              x="125"
              y="40"
              width="155"
              height="38"
              rx="4"
              fill={facilities.medBay ? '#064E3B' : '#1E293B'}
              stroke={facilities.medBay ? '#34D399' : '#475569'}
              strokeWidth="1.5"
            />
            <text x="202" y="56" textAnchor="middle" fill="#A7F3D0" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
              CRYO-MED &amp; CREW DECK
            </text>
            <text x="202" y="69" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">
              {facilities.medBay ? 'ONLINE · CLICK FOR SHIFTS' : 'CLICK TO ASSIGN SHIFTS'}
            </text>
          </g>

          {/* Room 2: Ordnance Foundry & Armory */}
          <g
            className="cursor-pointer"
            onClick={() => onSelectDeck?.('CREW_PREP')}
          >
            <rect
              x="295"
              y="40"
              width="165"
              height="38"
              rx="4"
              fill={facilities.ordnanceFoundry ? '#451A03' : '#1E293B'}
              stroke={facilities.ordnanceFoundry ? '#F59E0B' : '#475569'}
              strokeWidth="1.5"
            />
            <text x="377" y="56" textAnchor="middle" fill="#FDE68A" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
              ORDNANCE FOUNDRY
            </text>
            <text x="377" y="69" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">
              {facilities.ordnanceFoundry ? 'ONLINE (+1 FIELD STIM)' : 'CLICK TO UPGRADE BAY'}
            </text>
          </g>

          {/* Room 3: Resonance Sanctum & Bridge */}
          <g
            className="cursor-pointer"
            onClick={() => onSelectDeck?.('CONTRACT_BRIEFING')}
          >
            <rect
              x="475"
              y="40"
              width="185"
              height="38"
              rx="4"
              fill={facilities.resonanceSanctum ? '#083344' : '#1E293B'}
              stroke={facilities.resonanceSanctum ? '#38BDF8' : '#475569'}
              strokeWidth="1.5"
            />
            <text x="567" y="56" textAnchor="middle" fill="#67E8F9" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
              FLIGHT BRIDGE &amp; SANCTUM
            </text>
            <text x="567" y="69" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">
              CLICK FOR SECTOR INTEL
            </text>
          </g>

          {/* Lower Ventral Hangar: 6 Interactive Drop-Pod Berths with Standing Character Sprites */}
          {Array.from({ length: 6 }).map((_, idx) => {
            const berthNum = idx + 1;
            const unitInBerth = roster.find((u) => u.berthIndices.includes(berthNum));
            const isSelected = Boolean(unitInBerth && selectedOperativeId === unitInBerth.id);
            const bx = 98 + idx * 102;
            const by = 88;

            return (
              <g
                key={berthNum}
                transform={`translate(${bx}, ${by})`}
                className="cursor-pointer"
                onClick={() => {
                  if (unitInBerth) {
                    onSelectOperative?.(unitInBerth.id);
                    onSelectDeck?.('SQUAD_BAY');
                  } else if (onSelectEmptyBerth) {
                    onSelectEmptyBerth(berthNum);
                  } else {
                    onSelectDeck?.('SQUAD_BAY');
                  }
                }}
              >
                {/* Drop-Pod Launch Tube Frame */}
                <rect
                  x="0"
                  y="0"
                  width="88"
                  height="76"
                  rx="6"
                  fill={isSelected ? '#1E293B' : '#020617'}
                  stroke={
                    isSelected
                      ? '#FBBF24'
                      : unitInBerth
                      ? '#10B981'
                      : '#334155'
                  }
                  strokeWidth={isSelected ? '2.2' : '1.4'}
                />
                {/* Berth Header Tag */}
                <text
                  x="44"
                  y="12"
                  textAnchor="middle"
                  fill={unitInBerth ? '#6EE7B7' : '#64748B'}
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  BERTH 0{berthNum} {unitInBerth ? `· ${unitInBerth.callsign.slice(0, 5)}` : '· OPEN'}
                </text>

                {/* Standing Character Figure Inside Drop Pod */}
                {unitInBerth ? (
                  <>
                    <g transform="translate(19, 13) scale(0.5)">
                      <CharacterChassisBodySvg
                        chassis={unitInBerth.chassis}
                        strokeColor={isSelected ? '#FBBF24' : '#34D399'}
                        fillPrimary="#10B981"
                        isWarden={false}
                      />
                      <CharacterDoctrineWeaponSvg
                        doctrine={unitInBerth.doctrine}
                        accentColor={isSelected ? '#FBBF24' : '#34D399'}
                        primaryColor="#10B981"
                      />
                    </g>
                    <text
                      x="44"
                      y="71"
                      textAnchor="middle"
                      fill="#FDE68A"
                      fontSize="7.5"
                      fontFamily="monospace"
                    >
                      {unitInBerth.doctrine} · E{unitInBerth.echelon}
                    </text>
                  </>
                ) : (
                  <g>
                    <circle
                      cx="44"
                      cy="38"
                      r="12"
                      fill="#0F172A"
                      stroke="#475569"
                      strokeDasharray="3 2"
                    />
                    <path
                      d="M44 33 V43 M39 38 H49"
                      stroke="#94A3B8"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <text
                      x="44"
                      y="68"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="7.5"
                      fontFamily="monospace"
                    >
                      + RECRUIT
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* ================= ORBITAL DROP TRAJECTORIES TO PLANET KARST-9 ================= */}
        {scenarios.map((scen, idx) => {
          const isTarget = scen.id === selectedScenarioId;
          const nodeX = 140 + idx * 144;
          const nodeY = 415 + (idx % 2 === 0 ? -16 : 18);
          const launchOriginX = 240 + idx * 96;
          const launchOriginY = 210;

          return (
            <g key={scen.id}>
              {/* Orbital Drop Trajectory Line from Carrier Ventral Bay to Sector Node */}
              <path
                d={`M ${launchOriginX} ${launchOriginY} Q ${(launchOriginX + nodeX) / 2} 310 ${nodeX} ${nodeY}`}
                fill="none"
                stroke={isTarget ? '#F59E0B' : '#334155'}
                strokeWidth={isTarget ? '2.5' : '1.1'}
                strokeDasharray={isTarget ? '6 4' : '3 4'}
                opacity={isTarget ? '0.95' : '0.45'}
              />
              {isTarget && (
                <circle
                  cx={(launchOriginX + nodeX) / 2}
                  cy={312}
                  r="4.5"
                  fill="#FBBF24"
                />
              )}
            </g>
          );
        })}

        {/* ================= LOWER ZONE: PLANET KARST-9 CRUST & 6 SUBTERRANEAN SECTOR NODES ================= */}
        <path
          d="M -60 475 Q 500 280 1060 475 L 1060 550 L -60 550 Z"
          fill="#090D16"
          stroke="#F59E0B"
          strokeWidth="2.5"
        />
        {/* Glowing Sub-Surface Tectonic Fissures */}
        <path
          d="M 90 450 L 235 410 L 380 442 L 520 398 L 680 436 L 855 405"
          fill="none"
          stroke="#EA580C"
          strokeWidth="2"
          opacity="0.65"
        />

        {/* 6 Interactive Planetary Vault Sector Nodes (`KV-01` .. `KV-06`) */}
        {scenarios.map((scen, idx) => {
          const isTarget = scen.id === selectedScenarioId;
          const nodeX = 140 + idx * 144;
          const nodeY = 415 + (idx % 2 === 0 ? -16 : 18);

          return (
            <g
              key={`planet-node-${scen.id}`}
              transform={`translate(${nodeX}, ${nodeY})`}
              className="cursor-pointer"
              onClick={() => onSelectScenario?.(scen.id)}
            >
              {/* Outer Target Ring */}
              {isTarget && (
                <circle
                  cx="0"
                  cy="0"
                  r="34"
                  fill="#F59E0B"
                  fillOpacity="0.18"
                  stroke="#FBBF24"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                />
              )}

              {/* Vault Sector Bunker Hexagon */}
              <polygon
                points="0,-22 20,-11 20,11 0,22 -20,11 -20,-11"
                fill={isTarget ? '#451A03' : '#0F172A'}
                stroke={isTarget ? '#FBBF24' : '#64748B'}
                strokeWidth={isTarget ? '2.4' : '1.5'}
              />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                fill={isTarget ? '#FDE68A' : '#CBD5E1'}
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {scen.code}
              </text>

              {/* Sector Title Plaque */}
              <rect
                x="-58"
                y="26"
                width="116"
                height="20"
                rx="4"
                fill="#020617"
                fillOpacity="0.92"
                stroke={isTarget ? '#F59E0B' : '#334155'}
                strokeWidth="1"
              />
              <text
                x="0"
                y="39"
                textAnchor="middle"
                fill={isTarget ? '#FFFFFF' : '#94A3B8'}
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {scen.title.slice(0, 16)}
              </text>
            </g>
          );
        })}

        {/* Direct In-Scene Drop Launch Button on the Planet Horizon */}
        {onLaunchDrop && (
          <g
            transform="translate(500, 502)"
            className="cursor-pointer"
            onClick={onLaunchDrop}
          >
            <rect
              x="-135"
              y="-18"
              width="270"
              height="34"
              rx="8"
              fill="#F59E0B"
              stroke="#FEF08A"
              strokeWidth="1.8"
            />
            <text
              x="0"
              y="3"
              textAnchor="middle"
              fill="#020617"
              fontSize="11.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ▼ LAUNCH DROPSHIP TO TARGET SECTOR ▼
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};


