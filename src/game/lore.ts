/**
 * KARST: ZERO HORIZON — World Lore, Scene Prose, Character Biographies & Narrative Translators
 * Connects all gameplay mechanics into a cohesive sci-fi tactical video game experience
 * without exposing raw tabletop dice or engine jargon on player-facing surfaces.
 */

import type {
  ChassisType,
  CompiledUnit,
  DoctrineRole,
  EchelonTier,
} from './types';

export const KARST_WORLD_PREMISE = {
  subtitle: 'THE ZERO HORIZON BLACKOUT · ORBITAL BASTION SALVAGE COMMAND',
  headline: 'Thirty Cycles After the Zero Horizon Blackout',
  leadParagraph:
    'Beneath the fractured basalt crust of Karst-9 lie the deep-mantle foundries—the only facilities in the sector capable of refining Zero-Point Alloy for interstellar fold-drives. When a catastrophic resonance surge severed the planet from orbital command, the automated custodian network known as the Warden Directive sealed the subterranean vaults and turned its weapons on the survivors.',
  bastionRoleParagraph:
    'You command the salvage carrier Orbital Bastion, holding a decaying low orbit above the crust fissures. With six orbital drop-berths and a dwindling reserve of Alloy, you must deploy specialized Strike Operatives into the dark beneath Karst-9—securing Alloy Caches, sabotaging Warden mainframes, and breaking the autonomous garrisons before the vault doors lock forever.',
  threePillars: [
    {
      number: '01. The Orbital Bastion',
      title: 'Assemble & Prepare Your Six-Berth Strike Force',
      prose:
        'Between drops, manage your carrier hangar. Commission operatives across five distinct physiologies and six combat doctrines, assign your crew to shipboard recon and engineering departments, and outfit veteran survivors with permanent hardpoint equipment.',
    },
    {
      number: '02. The Subterranean Drop',
      title: 'Outmaneuver the Warden Garrison Before Lockdown',
      prose:
        'Each descent into Karst-9 gives your squad five tactical turns before the sector blast doors seal. Move from cover to cover across the subterranean floor, flank heavily plated Warden constructs, and extract high-grade Alloy Caches.',
    },
    {
      number: '03. The Cost of Survival',
      title: 'Horizontal Equipment Mastery & Permanent Scars',
      prose:
        'Operatives who survive a drop earn field commendations that unlock new weapon and system sockets. Those who fall in the vaults suffer permanent physical or neural trauma—and if pushed beyond their limits, are lost to the deep crust forever.',
    },
  ],
};

export interface ScenarioNarrativeSpec {
  number: number;
  actLabel: string;
  locationName: string;
  locationHeader: string;
  atmosphereTag: string;
  sceneProse: string;
  tacticalGoalProse: string;
  flightDirectorQuote: string;
  roundAtmosphere: Record<number, string>;
}

export const SCENARIO_NARRATIVES: Record<number, ScenarioNarrativeSpec> = {
  1: {
    number: 1,
    actLabel: 'Operation 01 · Sub-Crust Refinery Floor',
    locationName: 'Vault Sector 01 — Molten Slag Refinery',
    locationHeader: 'Vault Sector 01 — Molten Slag Refinery',
    atmosphereTag: 'Thermal Haze · 4 Unclaimed Alloy Crates · Blast Doors Closing in 5 Turns',
    sceneProse:
      'Rivers of cooling slag cast an amber glow across the catwalks of Vault Sector 01. When the evacuation sirens sounded thirty cycles ago, four pressurized crates of refined Zero-Point Alloy were left locked to the refinery floor. Automated Warden patrols now prowl the northern gantries, programmed to incinerate any salvage team that crosses the perimeter.',
    tacticalGoalProse:
      'Advance your operatives from the southern drop zone to the four glowing golden Alloy Caches ($). Move adjacent to a cache and click it to extract its Alloy and secure Mission Points before the 5-turn lockdown timer expires.',
    flightDirectorQuote:
      '“Bastion Treasury is running on fumes, Commander. Get down to the refinery floor, pry those four Alloy crates off the deckplates, and pull your squad out before the Warden sentries box you in.” — Flight Director Mara Vos',
    roundAtmosphere: {
      1: 'Drop pods breach the refinery ceiling. Warden optical sensors sweep the northern catwalks.',
      2: 'Slag conduits vent superheated steam across the central floor. Four turns until vault lockdown.',
      3: 'Warden garrison sub-routines lock onto your squad’s thermal signatures. Three turns remaining.',
      4: 'Hydraulic blast doors begin descending along the perimeter walls. Two turns left to extract!',
      5: 'Final Turn! Emergency extraction beacons are live—claim final caches and clear the kill-zone!',
    },
  },
  2: {
    number: 2,
    actLabel: 'Operation 02 · Northern Lockdown Gate',
    locationName: 'Sector Perimeter — Interlocking Blast-Gate',
    locationHeader: 'Sector Perimeter — Interlocking Blast-Gate',
    atmosphereTag: 'Fortified Blockade · 2 High-Yield Caches · Northern Breakthrough',
    sceneProse:
      'To reach the deeper vaults of Karst-9, your strike company must punch through the interlocking blast-gates of Sector 02. The Warden Directive has erected a fortified trench line across the central causeway, guarding two high-density Alloy containers while sealing the northern transit tunnel.',
    tacticalGoalProse:
      'Crack the central blockade, secure the two high-yield Alloy Caches along the centerline, and drive your surviving operatives all the way to the northern perimeter edge (top row) to breach the inner vault.',
    flightDirectorQuote:
      '“That blast-gate is the only corridor into the lower mantle. Break their trench line, grab the heavy Alloy containers, and push our people through the northern threshold.” — Flight Director Mara Vos',
    roundAtmosphere: {
      1: 'Your squad deploys beneath the towering northern blast-gate. Warden snipers hold the trench line.',
      2: 'Arc conduits flicker along the eastern bulkhead as Warden reinforcements advance.',
      3: 'The northern gate locks are cycling—push your fastest operatives toward the northern edge.',
      4: 'Two turns left before the transit corridor seals. Break through the final defenders!',
      5: 'Final Turn! Drive every remaining operative onto the northern perimeter line!',
    },
  },
  3: {
    number: 3,
    actLabel: 'Operation 03 · Sub-Level 09 Data Sanctum',
    locationName: 'Sub-Level 09 — Warden Mainframe Sanctum',
    locationHeader: 'Sub-Level 09 — Warden Mainframe Sanctum',
    atmosphereTag: 'Cryo-Cooled Server Spires · Triple-Stage Core Siphon',
    sceneProse:
      'Deep beneath the refinery strata sits Sub-Level 09, a cavernous server sanctum where the Warden Directive coordinates its planetary lockdown. A towering optical mainframe pulses at the center of the chamber, surrounded by defensive shielding and autonomous security constructs.',
    tacticalGoalProse:
      'Fight your way to the Central Mainframe Core (C3) in the middle of the map. Siphon the core three times by clicking it with an adjacent operative (or from range using a Remote Telemetry Link) to strip the Warden network’s encryption keys.',
    flightDirectorQuote:
      '“Every sector map we need is locked inside that central spire. Hold the center ring and siphon all three data partitions before their security constructs wipe the memory banks.” — Flight Director Mara Vos',
    roundAtmosphere: {
      1: 'Cold blue light bathes the server pillars as your squad enters the Mainframe Sanctum.',
      2: 'Firewall countermeasures trigger—Warden constructs converge on the central spire.',
      3: 'Encryption partitions are cycling rapidly. Maintain control of the central mainframe ring!',
      4: 'Mainframe purge sequence at eighty percent—complete the final data siphons now!',
      5: 'Final Turn! Extract the last data partition before the sanctum locks down!',
    },
  },
  4: {
    number: 4,
    actLabel: 'Operation 04 · Downed Recon Dropship',
    locationName: 'Sector 04 — Shattered Fuselage & Crash Site',
    locationHeader: 'Sector 04 — Shattered Fuselage & Crash Site',
    atmosphereTag: 'Wreckage Field · Stranded Cryptographer VIP · 4 Alloy Caches',
    sceneProse:
      'A Foundry reconnaissance shuttle was shot down in Sector 04 while carrying Chief Cryptographer Ilyas Venn and a cargo hold of refined Alloy. Pinned inside a survival pod amidst the burning fuselage, Venn’s distress beacon is drawing every Warden hunter-killer pack in the quadrant.',
    tacticalGoalProse:
      'Advance to the central crash site, secure the stranded VIP Cryptographer Pod (VIP), and recover the four scattered Alloy Caches around the wreckage.',
    flightDirectorQuote:
      '“Cryptographer Venn knows the override codes for the Obsidian Citadel. Reach his survival pod in the wreckage before those Xenomorph stalkers tear the hull open.” — Flight Director Mara Vos',
    roundAtmosphere: {
      1: 'Burning fuselage fragments illuminate the cavern. The VIP beacon pulses at the center of the map.',
      2: 'Warden hunter packs prowl the wreckage perimeter, closing in on the survival pod.',
      3: 'Life-support power in the VIP pod is dropping—link up with the central beacon immediately!',
      4: 'Two turns remaining—secure the remaining cargo caches and cover the extraction corridor!',
      5: 'Final Turn! Clear the crash site and complete extraction!',
    },
  },
  5: {
    number: 5,
    actLabel: 'Operation 05 · Geothermal Core Chamber',
    locationName: 'Mantle Conduit — Plasma Turbine Chamber',
    locationHeader: 'Mantle Conduit — Plasma Turbine Chamber',
    atmosphereTag: 'Volatile Plasma Vents · High-Yield Central Core · Hold the Center',
    sceneProse:
      'At the bottom of the industrial shaft roars the Geothermal Plasma Turbine—the power heart feeding the Warden Directive’s heavy manufactories. Unstable coolant vents erupt across the floor while elite Warden constructs guard the central turbine housing.',
    tacticalGoalProse:
      'Seize the central turbine platform and extract the high-density Alloy cores. Holding more operatives near the center of the chamber at the end of each turn awards bonus dominance points—watch your step around glowing red Plasma Vents!',
    flightDirectorQuote:
      '“The heat down here will cook an unshielded frame, Commander. Keep your operatives off the plasma vents, take the central turbine ring, and strip the reactor cores.” — Flight Director Mara Vos',
    roundAtmosphere: {
      1: 'Geothermal turbines thunder beneath the deckplates. Volatile plasma vents hiss in the center lane.',
      2: 'Reactor pressure spikes—holding the central platform now yields critical telemetry.',
      3: 'Magnetic containment fields shimmer across the chamber. Hold the center against the counter-attack!',
      4: 'Two turns until thermal purge—strip the remaining reactor caches!',
      5: 'Final Turn! Consolidate your squad on the central platform for extraction!',
    },
  },
  6: {
    number: 6,
    actLabel: 'Operation 06 · The Obsidian Citadel',
    locationName: 'Inner Sanctum — Warden Overseer Throne',
    locationHeader: 'Inner Sanctum — Warden Overseer Throne',
    atmosphereTag: 'Apex Command Vault · High-Value Overseer Target · Decisive Strike',
    sceneProse:
      'Using the decrypted coordinates from the lower vaults, your strike company breaches the Obsidian Citadel—the nerve center of the Warden Directive on Karst-9. Towering obsidian monoliths flank the command dais where the Warden Overseer directs the planetary quarantine.',
    tacticalGoalProse:
      'Focus your squad’s firepower to bring down the heavily armored Warden Overseer (occupying the primary command berths in the north) while securing the Citadel’s Vault Caches.',
    flightDirectorQuote:
      '“This is the heart of the quarantine, Commander. Bring down the Warden Overseer and the entire sector’s vault locks will shatter at once.” — Flight Director Mara Vos',
    roundAtmosphere: {
      1: 'The Obsidian Citadel gates blow open. The Warden Overseer powers up its main weapons array.',
      2: 'Monolith capacitors hum with lethal energy as the Overseer advances down the central aisle.',
      3: 'Halfway to lockdown—focus armor-piercing fire and overcharged strikes on the Overseer!',
      4: 'The Citadel’s structural integrity is failing—two turns left to finish the Overseer!',
      5: 'Final Turn! Deliver the decisive blow before the vault collapses!',
    },
  },
};

export const CHASSIS_LORE: Record<
  ChassisType,
  { tagline: string; loreProse: string; prose: string; survivabilityStyle: string }
> = {
  Spliced: {
    tagline: 'Gene-Forged Human Veteran',
    loreProse:
      'Veteran deep-crust salvagers augmented with high-gravity muscle fibers and neural reflex shunts. Spliced operatives rely on grit, field stims, and cognitive composure under fire.',
    prose:
      'Veteran deep-crust salvagers augmented with high-gravity muscle fibers and neural reflex shunts. Spliced operatives rely on grit, field stims, and cognitive composure under fire.',
    survivabilityStyle:
      'Biological Health: Can be temporarily rattled (Staggered) by heavy hits, but shrugs off critical trauma through sheer discipline.',
  },
  Automaton: {
    tagline: 'Armored Combat Android',
    loreProse:
      'Purpose-built industrial and security androids clad in ablative alloy plates. They feel neither pain nor fear, marching steadily through small-arms fire that would pin biological troops.',
    prose:
      'Purpose-built industrial and security androids clad in ablative alloy plates. They feel neither pain nor fear, marching steadily through small-arms fire that would pin biological troops.',
    survivabilityStyle:
      'Armored Hull: Built-in Armor Plating automatically shaves 1 damage off every hit and never suffers pain penalties, though massive hits can rupture internal servos.',
  },
  Xenomorph: {
    tagline: 'Bonded Deep-Karst Predator',
    loreProse:
      'Subterranean chitinous predators native to Karst-9’s deep fissures, neural-bonded to Bastion handlers. They bound across the cavern floor at blinding speed to tear apart isolated targets.',
    prose:
      'Subterranean chitinous predators native to Karst-9’s deep fissures, neural-bonded to Bastion handlers. They bound across the cavern floor at blinding speed to tear apart isolated targets.',
    survivabilityStyle:
      'Chitin Regeneration: Fast and elusive with natural biological resilience that can shrug off incoming wounds, though unable to operate complex computer consoles.',
  },
  PhaseBorn: {
    tagline: 'Resonance-Shifted Mystic',
    loreProse:
      'Operatives forever altered by exposure to the Zero Horizon event. Existing partially out of phase with physical matter, they glide effortlessly over rubble and punish attackers with feedback arcs.',
    prose:
      'Operatives forever altered by exposure to the Zero Horizon event. Existing partially out of phase with physical matter, they glide effortlessly over rubble and punish attackers with feedback arcs.',
    survivabilityStyle:
      'Phase Shroud: Glides across rough debris without slowing down, and scorches any enemy that overcharges weapons against them.',
  },
  RigWalker: {
    tagline: 'Piloted Heavy Exosuit',
    loreProse:
      'Bipedal industrial loader-mechs refitted with military siege plating and shoulder ordnance pods. A Rig-Walker anchors the entire battle line as a walking bunker.',
    prose:
      'Bipedal industrial loader-mechs refitted with military siege plating and shoulder ordnance pods. A Rig-Walker anchors the entire battle line as a walking bunker.',
    survivabilityStyle:
      'Siege Exosuit: Heavy Hull Plating reduces incoming damage and ignores pain effects.',
  },
};

export const DOCTRINE_LORE: Record<
  DoctrineRole,
  { roleTitle: string; combatStyleProse: string; prose: string; signatureAbilityLabel: string }
> = {
  Breacher: {
    roleTitle: 'Close-Quarters Shock Assault',
    combatStyleProse:
      'Built to close the distance fast and shatter enemy lines in point-blank combat. Breachers excel at charging into entrenched positions and knocking defenders out of cover.',
    prose:
      'Built to close the distance fast and shatter enemy lines in point-blank combat. Breachers excel at charging into entrenched positions and knocking defenders out of cover.',
    signatureAbilityLabel: 'Kinetic Ram — Knocks targets back and ignores pain penalties in melee',
  },
  Aegis: {
    roleTitle: 'Frontline Shield Guardian',
    combatStyleProse:
      'Equipped with projected energy barriers and heavy defensive suites. Aegis operatives hold contested objectives and project protective shields over nearby squadmates.',
    prose:
      'Equipped with projected energy barriers and heavy defensive suites. Aegis operatives hold contested objectives and project protective shields over nearby squadmates.',
    signatureAbilityLabel: 'Deflector Pulse — Projects an energy barrier that blocks +1 incoming hit',
  },
  Outrider: {
    roleTitle: 'High-Speed Recon & Flanker',
    combatStyleProse:
      'Masters of mobility and subterranean reconnaissance. Outriders race ahead of the main squad to claim distant Alloy Caches and strike exposed enemies from the flanks.',
    prose:
      'Masters of mobility and subterranean reconnaissance. Outriders race ahead of the main squad to claim distant Alloy Caches and strike exposed enemies from the flanks.',
    signatureAbilityLabel: 'Thruster Juke — Boosts movement range by +1 tile for rapid repositioning',
  },
  Deadeye: {
    roleTitle: 'Long-Range Precision Marksman',
    combatStyleProse:
      'Carries long-barrel rail and pulse rifles capable of engaging targets across the entire cavern. Deadeyes pick off dangerous Warden constructs before they can close in.',
    prose:
      'Carries long-barrel rail and pulse rifles capable of engaging targets across the entire cavern. Deadeyes pick off dangerous Warden constructs before they can close in.',
    signatureAbilityLabel: 'Target Lock — Extends weapon range and ignores enemy low cover',
  },
  Saboteur: {
    roleTitle: 'Electronic Warfare & Siphon Specialist',
    combatStyleProse:
      'Specializes in disrupting autonomous Warden systems and draining their energy reserves. Every successful hit siphons power from the target to recharge the Saboteur’s own cells.',
    prose:
      'Specializes in disrupting autonomous Warden systems and draining their energy reserves. Every successful hit siphons power from the target to recharge the Saboteur’s own cells.',
    signatureAbilityLabel: 'Neural Siphon — Drains enemy energy cells and disrupts target optics',
  },
  Psion: {
    roleTitle: 'Resonance Frequency Weaver',
    combatStyleProse:
      'Channels the raw subterranean frequencies of Karst-9 to hurl plasma-arc lances, mend allied wounds from afar, or accelerate squadmates across the battlefield.',
    prose:
      'Channels the raw subterranean frequencies of Karst-9 to hurl plasma-arc lances, mend allied wounds from afar, or accelerate squadmates across the battlefield.',
    signatureAbilityLabel: 'Harmonic Link — Boosts weapon accuracy for the operative’s next action',
  },
};

export const ECHELON_LORE: Record<
  EchelonTier,
  { rankTitle: string; squadScaleProse: string; prose: string }
> = {
  0: {
    rankTitle: 'Drone Swarm (3-Unit Pack)',
    squadScaleProse:
      'A three-unit pack of expendable recon drones occupying 1 Hangar Berth. Every surviving drone in the pack adds its weapons to the volley.',
    prose:
      'A three-unit pack of expendable recon drones occupying 1 Hangar Berth. Every surviving drone in the pack adds its weapons to the volley.',
  },
  1: {
    rankTitle: 'Tactical Fireteam (2-Unit Duo)',
    squadScaleProse:
      'A coordinated two-unit trooper team occupying 1 Hangar Berth. Durable, cost-effective backbone for holding objectives and flanking.',
    prose:
      'A coordinated two-unit trooper team occupying 1 Hangar Berth. Durable, cost-effective backbone for holding objectives and flanking.',
  },
  2: {
    rankTitle: 'Veteran Specialist (Solo Operative)',
    squadScaleProse:
      'An elite solo operative occupying 1 Hangar Berth, equipped with recharging Overcharge Energy and dual equipment sockets.',
    prose:
      'An elite solo operative occupying 1 Hangar Berth, equipped with recharging Overcharge Energy and dual equipment sockets.',
  },
  3: {
    rankTitle: 'Prime Commander (Heavy Leader · 2 Berths)',
    squadScaleProse:
      'A heavily armed command unit requiring 2 Hangar Berths. Boasts high firepower, deep energy reserves, and three equipment sockets.',
    prose:
      'A heavily armed command unit requiring 2 Hangar Berths. Boasts high firepower, deep energy reserves, and three equipment sockets.',
  },
  4: {
    rankTitle: 'Dreadnought Sovereign (Apex Titan · 3 Berths)',
    squadScaleProse:
      'A towering siege platform occupying 3 Hangar Berths—half of a drop ship’s capacity—capable of taking on an entire Warden garrison.',
    prose:
      'A towering siege platform occupying 3 Hangar Berths—half of a drop ship’s capacity—capable of taking on an entire Warden garrison.',
  },
};

export const NAMED_OPERATIVE_BIOS: Record<string, string> = {
  'Vaelen Korr':
    'Former chief security frame of Deep-Vault 04. Refusing the Warden Directive’s purge override, Korr severed his own network tether and now leads the 7th Obsidian Vanguard from the front.',
  'Sera Vance':
    'An orbital sharpshooter who survived three weeks alone in the ash vents during the Zero Horizon blackout. Her custom pulse rifle has dropped more Warden overseers than any weapon on the Bastion.',
  'Oryn Sol':
    'A navigator who was standing beside the main resonance conduit when it ruptured. Now existing half a second out of phase with normal space, Sol bends vault energy with a thought.',
  'Ironclad Section Alpha':
    'A pair of heavy industrial breach-androids retrofitted with interlocking deflector shields to hold narrow subterranean choke points.',
  'Stalker Pack Beta':
    'Two bonded Karst-9 fissure-hounds bred for high-speed cache retrieval and flanking enemy marksmen.',
  'Bastion Walker Mark IV':
    'A heavily armored loading mech converted into a frontline command walker, piloted by veteran engineer Corin Hal.',
  'Archon Lyra':
    'High resonance weaver of the Zero Horizon Choir, capable of threading plasma arcs and spatial blinks across the battlefield.',
};

export interface OperativeBioProfile {
  roleTitle: string;
  origin: string;
  biography: string;
  combatQuote: string;
}

export function getOperativeSelectionQuote(
  unitOrName: CompiledUnit | string,
  doctrineArg?: DoctrineRole
): string {
  const name = typeof unitOrName === 'string' ? unitOrName : unitOrName.name;
  const doctrine =
    typeof unitOrName === 'string'
      ? doctrineArg ?? ('Breacher' as DoctrineRole)
      : unitOrName.doctrine;

  switch (doctrine) {
    case 'Breacher':
      return `“${name} online. Point me at the nearest bulkhead or Warden line.”`;
    case 'Aegis':
      return `“${name} holding formation. Deflector fields are charged and green.”`;
    case 'Outrider':
      return `“${name} on the move. I have eyes on the Alloy caches.”`;
    case 'Deadeye':
      return `“${name} in position. Sightlines are clear—pick your target.”`;
    case 'Saboteur':
      return `“${name} ready. Their power conduits are wide open to a siphon.”`;
    case 'Psion':
      return `“${name} attuned. The vault’s resonance is singing today.”`;
  }
}

export function getOperativeBio(
  unitOrName: CompiledUnit | string,
  doctrineArg?: DoctrineRole,
  chassisArg?: ChassisType,
  echelonArg?: EchelonTier
): OperativeBioProfile {
  const name = typeof unitOrName === 'string' ? unitOrName : unitOrName.name;
  const doctrine =
    typeof unitOrName === 'string'
      ? doctrineArg ?? ('Breacher' as DoctrineRole)
      : unitOrName.doctrine;
  const chassis =
    typeof unitOrName === 'string'
      ? chassisArg ?? ('Spliced' as ChassisType)
      : unitOrName.chassis;
  const echelon =
    typeof unitOrName === 'string'
      ? echelonArg ?? (2 as EchelonTier)
      : unitOrName.echelon;

  const chs = CHASSIS_LORE[chassis];
  const doc = DOCTRINE_LORE[doctrine];
  const ech = ECHELON_LORE[echelon];

  const biography = NAMED_OPERATIVE_BIOS[name]
    ? NAMED_OPERATIVE_BIOS[name]
    : `${chs.tagline} trained in ${doc.roleTitle.toLowerCase()}. ${chs.loreProse}`;

  return {
    roleTitle: `${doc.roleTitle} · ${chs.tagline}`,
    origin: ech.rankTitle,
    biography,
    combatQuote: getOperativeSelectionQuote(name, doctrine),
  };
}
