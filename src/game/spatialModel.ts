/**
 * KARST: ZERO HORIZON — Prism-Code Object-Spatial Model & 2.5D Projection Engine
 *
 * Implements a unified Object-Spatial Model where every entity in the game
 * (Orbital Carrier Rooms, Drop-Pod Berths, Planetary Sector Nodes, Cavern Floor Tiles,
 * Extruded 3D Terrain Structures, Objective Artifacts, and Character Sprites)
 * is a canonical spatial object synthesized and content-addressed via `prism-code`.
 */

import { blake3Hex, canonicalJson, kappa } from 'prism-code';
import { canonicalize, codeHash } from 'prism-code/canonical';
import type {
  CompiledUnit,
  ObjectiveMarker,
  TerrainCell,
} from './types';

const encoder = new TextEncoder();

export type SpatialCameraMode = 'ISOMETRIC_25D' | 'TOP_DOWN_ORTHO';

export type SpatialObjectKind =
  | 'CarrierRoomNode'
  | 'DropBerthNode'
  | 'PlanetarySectorNode'
  | 'CavernFloorTile'
  | 'TerrainStructure'
  | 'ObjectiveArtifact'
  | 'CharacterUnit';

export interface WorldCoord3D {
  x: number; // 0..17 grid X (each unit = 2" sector)
  y: number; // 0..17 grid Y (each unit = 2" sector)
  z: number; // vertical elevation in world units (0 = floor, 1 = waist cover, 2.2 = bulkhead wall)
}

export interface ProjectedTileGeometry {
  centerX: number;
  centerY: number;
  topCenterX: number;
  topCenterY: number;
  depthKey: number;
  scale: number;
  floorPolygon: string;
  topPolygon: string;
  leftWallPolygon: string;
  rightWallPolygon: string;
}

export interface PrismSpatialObjectNode {
  id: string;
  kind: SpatialObjectKind;
  label: string;
  sublabel: string;
  world: WorldCoord3D;
  extrusionHeight: number;
  footprintRadius: number;
  canonicalSpec: string;
  sha256Hash: string;
  blake3Signature: string;
  spatialKappa: string;
  wasmDeterministicFacetSeed: number;
  projected: ProjectedTileGeometry;
  unitRef?: CompiledUnit;
  terrainRef?: TerrainCell;
  objectiveRef?: ObjectiveMarker;
}

/**
 * Projects a 3D world coordinate `(x, y, z)` on the 18x18 Karst sector grid
 * into 2D viewport coordinates `(sx, sy)` inside a `1000 x 680` SVG spatial stage.
 */
export function projectSpatialCoord(
  x: number,
  y: number,
  z: number,
  camera: SpatialCameraMode
): { sx: number; sy: number; scale: number; depthKey: number } {
  if (camera === 'TOP_DOWN_ORTHO') {
    // Centered top-down tactical projection inside 1000x680 canvas
    const cellSize = 33.5;
    const originX = 198;
    const originY = 38;
    const sx = originX + (x + 0.5) * cellSize;
    const sy = originY + (y + 0.5) * cellSize - z * 4.5;
    return {
      sx,
      sy,
      scale: 0.96,
      depthKey: y * 100 + x + z * 0.1,
    };
  }

  // 2.5D Isometric Tactical Perspective Projection inside 1000x680 canvas
  // Tile half-width = 25.5, tile half-height = 13.8, vertical extrusion = 16px per z-unit
  const halfW = 25.5;
  const halfH = 13.8;
  const originX = 500;
  const originY = 76;

  const sx = originX + (x - y) * halfW;
  const sy = originY + (x + y) * halfH - z * 15.5;

  // Subtle perspective depth scaling from back (north y=0) to front (south y=17)
  const depthProgress = (x + y) / 34;
  const scale = 0.88 + depthProgress * 0.2;

  return {
    sx,
    sy,
    scale,
    depthKey: (x + y) * 100 + y + z * 10,
  };
}

/**
 * Computes the complete 2.5D extruded prism polygon faces (floor diamond, elevated top face,
 * shaded left wall, shadowed right wall) for any tile `(x, y)` with vertical extrusion `heightZ`.
 */
export function computeProjectedTilePrism(
  x: number,
  y: number,
  heightZ: number,
  camera: SpatialCameraMode
): ProjectedTileGeometry {
  const centerFloor = projectSpatialCoord(x, y, 0, camera);
  const centerTop = projectSpatialCoord(x, y, heightZ, camera);

  // 4 corners of the tile in grid space: N=(x-0.5, y-0.5), E=(x+0.5, y-0.5), S=(x+0.5, y+0.5), W=(x-0.5, y+0.5)
  const fN = projectSpatialCoord(x - 0.48, y - 0.48, 0, camera);
  const fE = projectSpatialCoord(x + 0.48, y - 0.48, 0, camera);
  const fS = projectSpatialCoord(x + 0.48, y + 0.48, 0, camera);
  const fW = projectSpatialCoord(x - 0.48, y + 0.48, 0, camera);

  const tN = projectSpatialCoord(x - 0.48, y - 0.48, heightZ, camera);
  const tE = projectSpatialCoord(x + 0.48, y - 0.48, heightZ, camera);
  const tS = projectSpatialCoord(x + 0.48, y + 0.48, heightZ, camera);
  const tW = projectSpatialCoord(x - 0.48, y + 0.48, heightZ, camera);

  const floorPolygon = `${fN.sx.toFixed(1)},${fN.sy.toFixed(1)} ${fE.sx.toFixed(1)},${fE.sy.toFixed(1)} ${fS.sx.toFixed(1)},${fS.sy.toFixed(1)} ${fW.sx.toFixed(1)},${fW.sy.toFixed(1)}`;
  const topPolygon = `${tN.sx.toFixed(1)},${tN.sy.toFixed(1)} ${tE.sx.toFixed(1)},${tE.sy.toFixed(1)} ${tS.sx.toFixed(1)},${tS.sy.toFixed(1)} ${tW.sx.toFixed(1)},${tW.sy.toFixed(1)}`;

  // Visible front-left wall (W -> S) and front-right wall (S -> E) in isometric view
  const leftWallPolygon = `${tW.sx.toFixed(1)},${tW.sy.toFixed(1)} ${tS.sx.toFixed(1)},${tS.sy.toFixed(1)} ${fS.sx.toFixed(1)},${fS.sy.toFixed(1)} ${fW.sx.toFixed(1)},${fW.sy.toFixed(1)}`;
  const rightWallPolygon = `${tS.sx.toFixed(1)},${tS.sy.toFixed(1)} ${tE.sx.toFixed(1)},${tE.sy.toFixed(1)} ${fE.sx.toFixed(1)},${fE.sy.toFixed(1)} ${fS.sx.toFixed(1)},${fS.sy.toFixed(1)}`;

  return {
    centerX: centerFloor.sx,
    centerY: centerFloor.sy,
    topCenterX: centerTop.sx,
    topCenterY: centerTop.sy,
    depthKey: centerFloor.depthKey,
    scale: centerFloor.scale,
    floorPolygon,
    topPolygon,
    leftWallPolygon,
    rightWallPolygon,
  };
}

/**
 * Synthesizes a `prism-code` spatial object node with canonical hash, BLAKE3 digest,
 * `uor:kappa` identifier, and deterministic facet seed.
 */
export function buildPrismSpatialNode(params: {
  id: string;
  kind: SpatialObjectKind;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  z: number;
  extrusionHeight: number;
  footprintRadius: number;
  camera: SpatialCameraMode;
  metadata?: Record<string, unknown>;
  unitRef?: CompiledUnit;
  terrainRef?: TerrainCell;
  objectiveRef?: ObjectiveMarker;
}): PrismSpatialObjectNode {
  const canonicalSpec = canonicalize(
    JSON.stringify({
      id: params.id,
      kind: params.kind,
      x: params.x,
      y: params.y,
      z: params.z,
      extrusionHeight: params.extrusionHeight,
      meta: params.metadata ?? {},
    })
  );
  const sha256Hash = codeHash(canonicalSpec);
  const bytes = encoder.encode(canonicalSpec);
  const blake3Signature = blake3Hex(bytes);
  const spatialKappa = kappa(bytes);
  const wasmDeterministicFacetSeed = parseInt(blake3Signature.slice(0, 6), 16) % 360;

  const projected = computeProjectedTilePrism(
    params.x,
    params.y,
    params.extrusionHeight,
    params.camera
  );

  return {
    id: params.id,
    kind: params.kind,
    label: params.label,
    sublabel: params.sublabel,
    world: { x: params.x, y: params.y, z: params.z },
    extrusionHeight: params.extrusionHeight,
    footprintRadius: params.footprintRadius,
    canonicalSpec,
    sha256Hash,
    blake3Signature,
    spatialKappa,
    wasmDeterministicFacetSeed,
    projected,
    unitRef: params.unitRef,
    terrainRef: params.terrainRef,
    objectiveRef: params.objectiveRef,
  };
}

/**
 * Compiles the entire 18x18 Battlefield Scene into depth-sorted `PrismSpatialObjectNode`s
 * so that 3D extruded Bulkhead walls, Low Barricades, Magma Vents, Alloy Cache crates,
 * Mainframe Cores, Strike Operatives, and Hostile Wardens render in true painter's algorithm
 * back-to-front spatial order.
 */
export function compileBattlefieldSpatialScene(params: {
  units: CompiledUnit[];
  terrain: TerrainCell[];
  objectives: ObjectiveMarker[];
  camera: SpatialCameraMode;
}): {
  floorNodes: PrismSpatialObjectNode[];
  sortedSceneObjects: PrismSpatialObjectNode[];
  sceneStateKappa: string;
} {
  const { units, terrain, objectives, camera } = params;

  const terrainByCell = new Map<string, TerrainCell>();
  for (const t of terrain) {
    terrainByCell.set(`${t.x},${t.y}`, t);
  }

  const floorNodes: PrismSpatialObjectNode[] = [];
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < 18; x++) {
      const t = terrainByCell.get(`${x},${y}`);
      const zoneLabel =
        y <= 2
          ? 'Northern Warden Garrison Perimeter'
          : y >= 15
          ? 'Valkyrie-04 Drop-Pod Landing Pad'
          : 'Subterranean Basalt Vault Deck';
      floorNodes.push(
        buildPrismSpatialNode({
          id: `tile-${x}-${y}`,
          kind: 'CavernFloorTile',
          label: `Sector (${x * 2}", ${y * 2}")`,
          sublabel: zoneLabel,
          x,
          y,
          z: 0,
          extrusionHeight: 0,
          footprintRadius: 1,
          camera,
          terrainRef: t,
        })
      );
    }
  }

  const objects: PrismSpatialObjectNode[] = [];

  // 1. Extruded 3D Terrain Structures
  for (const t of terrain) {
    const heightZ =
      t.kind === 'Bulkhead'
        ? 1.85
        : t.kind === 'LowBarricade'
        ? 0.78
        : t.kind === 'RoughDebris'
        ? 0.45
        : 0.12;
    const sublabel =
      t.kind === 'Bulkhead'
        ? 'Reinforced Titanium Blast Wall · Blocks Sight & Move'
        : t.kind === 'LowBarricade'
        ? 'Waist-High Aegis Trench Shield · +1 Cover Evasion'
        : t.kind === 'RoughDebris'
        ? 'Collapsed Basalt Boulders · 2× Stride Cost'
        : 'Molten Geothermal Magma Fissure · 2 Thermal Dmg';

    objects.push(
      buildPrismSpatialNode({
        id: `terrain-${t.x}-${t.y}`,
        kind: 'TerrainStructure',
        label: t.name,
        sublabel,
        x: t.x,
        y: t.y,
        z: 0,
        extrusionHeight: heightZ,
        footprintRadius: 0.9,
        camera,
        metadata: { kind: t.kind },
        terrainRef: t,
      })
    );
  }

  // 2. 3D Objective Artifacts (Alloy Crates, Mainframe Cores, VIP Stasis Pods)
  for (const o of objectives) {
    if (o.claimedBy !== 'None') continue;
    const heightZ = o.kind === 'CentralCore' ? 1.45 : o.kind === 'VipCourier' ? 1.1 : 0.72;
    const hackCount = o.hackCount ?? 0;
    const sublabel =
      o.kind === 'CentralCore'
        ? `Warden Mainframe Spire · ${3 - hackCount} Overrides Remaining`
        : o.kind === 'VipCourier'
        ? 'Downed Specialist Cryo-Stasis Pod · Move ≤2" to Extract'
        : 'Zero-Point Alloy Salvage Crate · Move ≤2" to Secure (+5 Alloy, +1 VP)';

    objects.push(
      buildPrismSpatialNode({
        id: `obj-${o.id}`,
        kind: 'ObjectiveArtifact',
        label: o.name,
        sublabel,
        x: o.x,
        y: o.y,
        z: 0,
        extrusionHeight: heightZ,
        footprintRadius: 0.75,
        camera,
        metadata: { kind: o.kind, hackCount },
        objectiveRef: o,
      })
    );
  }

  // 3. Standing Character & Construct Figures
  for (const u of units) {
    if (u.modelsCurrent <= 0) continue;
    const heightZ = u.echelon === 4 ? 1.9 : u.echelon === 3 ? 1.65 : 1.35;
    objects.push(
      buildPrismSpatialNode({
        id: `unit-${u.id}`,
        kind: 'CharacterUnit',
        label: `${u.callsign} · ${u.name}`,
        sublabel: `${u.faction === 'StrikeRoster' ? 'Strike Operative' : 'Hostile Warden'} · [${
          u.doctrine
        } · ${u.chassis} · E${u.echelon}]`,
        x: u.gridX,
        y: u.gridY,
        z: 0,
        extrusionHeight: heightZ,
        footprintRadius: 0.85,
        camera,
        metadata: {
          doctrine: u.doctrine,
          chassis: u.chassis,
          echelon: u.echelon,
          faction: u.faction,
          hp: u.maxIntegrityPerModel - u.accumulatedDamage,
        },
        unitRef: u,
      })
    );
  }

  // Sort back-to-front so closer isometric objects naturally overlap objects behind them
  objects.sort((a, b) => a.projected.depthKey - b.projected.depthKey);

  const sceneCanonical = canonicalize(
    JSON.stringify({
      camera,
      unitCount: units.filter((u) => u.modelsCurrent > 0).length,
      objectiveCount: objectives.filter((o) => o.claimedBy === 'None').length,
      topObjectHash: objects[0]?.sha256Hash ?? 'empty',
    })
  );
  const sceneStateKappa = kappa(encoder.encode(sceneCanonical));

  return {
    floorNodes,
    sortedSceneObjects: objects,
    sceneStateKappa,
  };
}

/**
 * Evaluates a deterministic `prism-code` spatial distance & elevation occlusion trajectory
 * to verify spatial trajectory clearance between two world objects.
 */
export function evaluateSpatialTrajectoryWasm(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  blockerCount: number
): { manhattanSectors: number; clearanceScore: number; moduleKappa: string } {
  const dx = Math.abs(toX - fromX) * 2;
  const dy = Math.abs(toY - fromY) * 2;
  const clearanceScore = Math.max(0, 100 - (dx + dy) - blockerCount * 10);
  const canonicalPayload = canonicalJson({
    fromX,
    fromY,
    toX,
    toY,
    blockerCount,
    clearanceScore,
  });

  return {
    manhattanSectors: Math.max(dx, dy),
    clearanceScore,
    moduleKappa: kappa(encoder.encode(canonicalPayload)),
  };
}
