//! Nemesis Core 4.0 2.5D Object-Spatial Projection Engine, Isometric Painter's Depth Sort,
//! Sector Trajectory Clearance, 7 Karst-9 World Locations, 9 Minor Resonance Directives,
//! 4 Starting Company Presets, and Threat-Scaled Warden Force Profiles (`SpatialWorld.lex.tex`).

use crate::synthesis::EchelonTier;

/// Viewport Spatial Camera Mode (`SpatialWorld::SpatialCameraViewMode`, `KZ-16`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum SpatialCameraMode {
    /// 2.5D isometric projection with extruded prism elevation and painter's algorithm depth sorting.
    Isometric25D = 0,
    /// 2D orthographic top-down tactical sector grid.
    TopDown2D = 1,
}

/// Canonical Spatial Scene Object Category (`SpatialWorld::SpatialObjectCategory`, `KZ-16`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum SpatialObjectKind {
    /// Orbital Bastion carrier facility room node.
    CarrierRoomNode = 0,
    /// Orbital Bastion 6-Berth drop pod bay node.
    DropBerthNode = 1,
    /// Karst-9 planetary sector contract node.
    PlanetarySectorNode = 2,
    /// Subterranean `18x18` (`324`-tile) cavern floor sector tile.
    CavernFloorTile = 3,
    /// Reinforced barricade, solid bulkhead, or resonance conduit structure.
    TerrainStructure = 4,
    /// Salvage cache, resonance relay, or extraction beacon objective artifact.
    ObjectiveArtifact = 5,
    /// Strike Operative or Autonomous Warden character unit token.
    CharacterUnit = 6,
}

/// Spatial Trajectory Clearance Evaluation (`SpatialWorld::evaluateSpatialTrajectory`, `KZ-16`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SpatialTrajectoryClearance {
    /// Manhattan distance `|bx - ax| + |by - ay|` in sectors.
    pub manhattan_distance: u8,
    /// Operative movement allowance in sectors (`MOV`).
    pub move_allowance: u8,
    /// Number of obstructed or occupied intermediate sectors along the path.
    pub blocked_sectors: u8,
    /// Deterministic isometric painter's depth key at the destination `(bx, by)`.
    pub destination_depth_key: u32,
    /// Whether the trajectory is within `move_allowance` and unobstructed (`blocked_sectors == 0`).
    pub trajectory_clear: bool,
}

/// Threat-Scaled Warden Force Profile (`SpatialWorld::WardenThreatForceSpec`, `KZ-16`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct WardenForceSummary {
    /// Sector threat tier (`1 = Low`, `2 = Medium`, `3 = High`).
    pub threat_tier: u8,
    /// Number of distinct Warden unit entries deployed.
    pub unit_entries_count: u8,
    /// Total Berth weight of the Warden garrison (`4`, `5`, or `6`).
    pub total_berth_weight: u8,
    /// Highest Echelon tier commanding the Warden garrison (`ECH-2`, `ECH-3`, or `ECH-4`).
    pub commander_echelon: EchelonTier,
}

/// Compute the deterministic integer painter's algorithm depth key for a 2.5D isometric object
/// (`SpatialWorld::computeIsometricDepthKey`, `KZ-16`).
#[must_use]
pub const fn compute_isometric_depth_key(grid_x: u16, grid_y: u16, elevation_layer: u16) -> u32 {
    let sum = (grid_x as u32) + (grid_y as u32);
    (sum * 100) + (grid_y as u32) + ((elevation_layer as u32) * 10)
}

/// Compute the Manhattan sector distance `|bx - ax| + |by - ay|` (`SpatialWorld::manhattanSectorDistance`, `KZ-16`).
#[must_use]
pub const fn manhattan_sector_distance(ax: u8, ay: u8, bx: u8, by: u8) -> u8 {
    let dx = ax.abs_diff(bx);
    let dy = ay.abs_diff(by);
    dx.saturating_add(dy)
}

/// Evaluate a spatial movement trajectory across the `18x18` subterranean vault grid
/// (`SpatialWorld::evaluateSpatialTrajectory`, `KZ-16`).
#[must_use]
pub const fn evaluate_spatial_trajectory(
    ax: u8,
    ay: u8,
    bx: u8,
    by: u8,
    move_allowance: u8,
    blocked_sectors: u8,
) -> SpatialTrajectoryClearance {
    let manhattan_distance = manhattan_sector_distance(ax, ay, bx, by);
    let destination_depth_key = compute_isometric_depth_key(bx as u16, by as u16, 1);
    let trajectory_clear = manhattan_distance <= move_allowance && blocked_sectors == 0;
    SpatialTrajectoryClearance {
        manhattan_distance,
        move_allowance,
        blocked_sectors,
        destination_depth_key,
        trajectory_clear,
    }
}

/// Return the canonical Threat-Tier Warden Force Profile (`SpatialWorld::wardenThreatForces`, `KZ-16`).
#[must_use]
pub const fn warden_force_for_threat(threat_tier: u8) -> WardenForceSummary {
    match threat_tier {
        0 | 1 => WardenForceSummary {
            threat_tier: 1,
            unit_entries_count: 3,
            total_berth_weight: 4,
            commander_echelon: EchelonTier::Ech2Vanguard,
        },
        2 => WardenForceSummary {
            threat_tier: 2,
            unit_entries_count: 4,
            total_berth_weight: 5,
            commander_echelon: EchelonTier::Ech3Enforcer,
        },
        _ => WardenForceSummary {
            threat_tier: 3,
            unit_entries_count: 4,
            total_berth_weight: 6,
            commander_echelon: EchelonTier::Ech4Sovereign,
        },
    }
}
