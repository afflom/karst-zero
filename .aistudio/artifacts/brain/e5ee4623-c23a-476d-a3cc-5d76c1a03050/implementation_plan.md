# KARST: ZERO HORIZON — Tactical Orbital Skirmish & Campaign Video Game

**KARST: ZERO HORIZON** is a standalone, client-side tactical sci-fi skirmish and generative Solo/Co-op campaign video game with its own original universe, brand identity, and in-game taxonomy—engineered from the ground up on the `prism-code` Hologram v4 (`.holo`) runtime, Core-Wasm deterministic math guest, and formal stakeholder product model.

### User Review & Critical Decisions

> [!IMPORTANT]
> This revised plan establishes **KARST: ZERO HORIZON** as its own complete game product with an independent brand and domain taxonomy (zero references to "Nemesis" or "Prism" in the game's branding, lore, or player-facing terminology), full end-to-end player user journeys, and a complete `prism-code` product model (`model.prism.json`, `.holo` v4 archive, Core-Wasm guest execution, and canonical state verification). Review and click **Proceed** to build the application.

- **Confirmed Decision 1 — Standalone Game Identity & Taxonomy (`KARST: ZERO HORIZON`)**: Set inside **The Karst**, a shattered orbital megastructure patrolled by autonomous **Warden Directives**. Players command a 6-Berth **Strike Roster** synthesized from a 3D unit taxonomy (`[Doctrine, Chassis, Echelon]`), equipping **Hardpoint Modules** and **Resonance Frequencies**, and fighting across a 5-Round tactical sector grid using recharging **Surge Cells** and an opaque **Command Chit Pool**.
- **Confirmed Decision 2 — Immersive Full-Screen Game + Pause-Menu Stakeholder & Telemetry Audit (`ESC`)**: The user experience is 100% dedicated to **KARST: ZERO HORIZON** as a polished tactical video game. Pressing `ESC` (or clicking the top-right **System Audit** button) opens the pause-menu inspection overlay where stakeholders, systems architects, and verification auditors can inspect the live `KarstZeroHorizon.holo` product model, stakeholder viewpoints, Core-Wasm wire dispatches, acceptance vector suite, and canonical save hashes.
- **Confirmed Decision 3 — Tactical Dark Slate Visual Identity (`#0B0F19` / `#F59E0B` / `#10B981`)**: High-contrast obsidian slate command deck with amber Surge/Objective telemetry, emerald hit/LoS confirmation, crimson threat indicators, and synthesized Web Audio tactical sound design.

---

### 1. Overview & Core Concept

- **What It Does**: **KARST: ZERO HORIZON** places the player in command of an orbital salvage and strike company operating across derelict sectors of The Karst Ring. Players engineer custom units using the deterministic **3D Unit Synthesis Matrix (`[Doctrine, Chassis, Echelon]`)**, slot permanent **Hardpoint Modules** and **Resonance Frequencies**, run between-drop **Pre-Drop Crew Assignments** (`Sector Recon`, `Scrap Salvaging`, `Med-Bay Overhaul`, `Combat Sim-Drill`), launch **Sector Contracts** across 6 distinct tactical mission types, and battle autonomous **Warden Directives** driven by an interleaved **Command Chit Pool**.
- **Target Audience & Product Stakeholders**:
  - **Solo & Co-op Tactical Players**: Seek deep, deterministic turn-based combat where positioning, Line of Sight, cover, and resource timing (`Surge Cells`) matter more than stat inflation.
  - **Roster Theorycrafters & Campaign Commanders**: Enjoy building synergistic 6-Berth squads, unlocking Hardpoints via the **3-Commendation Rule**, upgrading their **Orbital Bastion**, and managing high-stakes permanent trauma.
  - **Product Owners & Game Systems Designers**: Require traceable alignment between player value, deterministic game balance, and modular content scalability inside the `prism-code` product model.
  - **Verification & Runtime Engineers**: Audit deterministic Core-Wasm execution (`holo_alloc` / `holo_run`), content-addressed BLAKE3 kappas, acceptance vector conformance, and canonical save-state integrity.
- **Key Stakeholder Value**: Delivers a complete commercial-grade browser strategy game whose entire rules math, architectural topology, stakeholder viewpoints, quality attributes, and security controls are formally modeled and cryptographically sealed inside a live client-side `.holo` v4 archive (`KarstZeroHorizon.holo`).

---

### 2. Game Design, World Taxonomy & Rules Architecture

#### A. The 3D Unit Synthesis Matrix (`[X: Doctrine, Y: Chassis, Z: Echelon]`)
Every friendly operative and hostile Warden unit on the battlefield is deterministically compiled from three coordinates plus locked **Hardpoint Modules**—ensuring base dice probabilities never bloat across a campaign:

$$\text{Operative Profile} = \text{Echelon } [Z] + \text{Chassis } [Y] + \text{Doctrine } [X] + \text{Locked Hardpoint Modules}$$

1. **Z-Axis — Echelon (Unit Scale, Berth Cost, Base Dice & Hardpoints)**:
   - **Echelon 0: Drone Pack** — `3 Units` · `1 Berth` · Base Dice `2 FPR / 2 EVA / 1 COG` · `1 Integrity/unit` · `0 Surge` · `0 Starting Hardpoints` (Campaign Max `1`) · Recruitment: `2 Alloy`.
   - **Echelon 1: Trooper Fireteam** — `2 Units` · `1 Berth` · Base Dice `3 FPR / 3 EVA / 2 COG` · `2 Integrity/unit` · `0 Surge` · `1 Starting Hardpoint` (Campaign Max `2`) · Recruitment: `3 Alloy`.
   - **Echelon 2: Specialist Operative** — `1 Unit` · `1 Berth` · Base Dice `4 FPR / 3 EVA / 3 COG` · `3 Integrity/Hull` · `1 Surge` · `2 Starting Hardpoints` (Campaign Max `4`) · Recruitment: `5 Alloy`.
   - **Echelon 3: Prime Commander** — `1 Unit` · `2 Berths` · Base Dice `5 FPR / 4 EVA / 4 COG` · `4 Integrity/Hull` · `3 Surge` · `3 Starting Hardpoints` (Campaign Max `5`) · Recruitment: `8 Alloy` (First Prime Leader is Free at campaign start).
   - **Echelon 4: Dreadnought Sovereign** — `1 Unit` · `3 Berths` · Base Dice `6 FPR / 5 EVA / 4 COG` · `6 Integrity/Hull` · `4 Surge` · `4 Starting Hardpoints` (Campaign Max `6`) · Recruitment: `12 Alloy`.
   - *Multi-Unit Pack Cohesion (`Echelon 0 & 1`)*: Activate together on a single Command Chit, maintain `2-sector` coherency, and can **Combine Fire** (`+1 FPR die` per additional pack member) with spillover damage removing individual pack members without pain penalties.

2. **Y-Axis — Chassis (Material Nature, Mitigation & Damage Track)**:
   - **Spliced (Bio-Organic)**: Uses the **Integrity** track. Suffers **Staggered** (`-2 EVA`, min 1) at $\ge \lceil \text{Integrity}/2 \rceil$ damage (cleared by spending 1 Move Action) and **Critical Trauma** at $\text{Damage} = \text{Integrity}$ (must pass a free `COG TN 2` check at activation start to clear or can only crawl `2 sectors` and loses Standard Action). Neutralized at $\text{Integrity} + 1$. Gains `+1 COG` on recovery/morale checks.
   - **Automaton (Mechanical Construct)**: Uses **Hull Plating (`HUL`)** and native **Plating (`ARM 1`)**. Immune to Staggered, Critical Trauma, and neural effects. Destroyed at `0 HUL`. Suffering `3+ Final Damage` in one hit triggers a `1d6` **Subsystem Rupture**: `1–2` *Servo Lock* (`-2 MOV`), `3–4` *Optics Scour* (`-1 FPR`), `5` *Capacitor Vent* (lose all Surge & `-1 ARM`), `6` *Core Breach* (`+2 HUL` damage).
   - **Xenomorph (Feral Bio-Stalker)**: Uses **Integrity**, native **Bio-Resilience (`TGH 1`)** (ignores each point of damage on a `d6` roll of `6+`), and `+2 MOV` (`Base 6`). Suffers `-1 COG` (min 1) and cannot interact with complex data terminals.
   - **Phase-Born (Void / Energy Entity)**: Uses **Integrity**, ignores all rough terrain penalties, and projects **Arc Backlash** (enemies spending Surge against its Evasion suffer `1 automatic damage` or `-1 die` on their next test per Surge spent). Suffers `+1 damage` from Resonance attacks.
   - **Rig-Walker (Heavy Vehicle Platform)**: Uses **Hull (`HUL`)**, native **Plating (`ARM 1`)**, and **Gyro Handling (`GYR` = Base Evasion)**. Supports Operator & Crew mounting/transport and forces a `TN 2` **Emergency Eject** check on all passengers if reduced to `0 HUL`.

3. **X-Axis — Tactical Doctrine (Stat Bias, 1-Surge Trigger & Warden AI Routine)**:
   - **Breacher (Close Assault)**: `+1 FPR` · **1-Surge Trigger**: *Kinetic Ram* (Push target `1 sector` or ignore Staggered on melee attack) · **Warden AI**: Rush and charge nearest hostile in Line of Sight.
   - **Aegis (Frontline Bulwark)**: `+1 EVA` · **1-Surge Trigger**: *Deflector Pulse* (`+1 automatic Evasion hit` for self or adjacent ally within `1 sector`) · **Warden AI**: Secure nearest objective cache or interpose in front of highest-Echelon Warden.
   - **Outrider (Flank & Recon)**: `+2 MOV` (`Base 6`, or `8` if Xenomorph) · **1-Surge Trigger**: *Thruster Juke* (Move `2 sectors` free before or after resolving an action) · **Warden AI**: Seek cover and attack hostile with lowest Evasion or lowest remaining Integrity/Hull.
   - **Deadeye (Long-Range Suppression)**: Unlocks `12-sector Ranged Profile` · **1-Surge Trigger**: *Target Lock* (Ignore cover penalty or `+6 range` for one shot) · **Warden AI**: Maintain distance in cover up to `12 sectors` away and fire on most exposed target.
   - **Saboteur (Electronic Warfare)**: `+1 COG` · **1-Surge Trigger**: *Neural Siphon* (On hit or Opposed `COG` within `12 sectors`, drain `1 Surge` or inflict *Staggered*) · **Warden AI**: Target hostile with highest current Surge or the Prime Commander.
   - **Psion (Resonance Channeler)**: `+1 COG` & unlocks **Resonance Weaving** · **1-Surge Trigger**: *Harmonic Link* (Allies within `6 sectors` gain `+1 die` on next test, or share Surge pool) · **Warden AI**: Hold cover and cast barrier buffs, neural hexes, or `12-sector` resonance lances.

#### B. Core Tabletop & Combat Resolution Engine
- **Unified d6 Strike Pool**: Roll `Attribute + Modifiers + Surge Spent` (`+1d6` per Surge Cell spent). Every `4, 5, or 6` = **1 Strike Hit**.
- **Opposed Combat & Mitigation**:
  $$\text{Net Hits} = \max(0, \text{Attacker Hits} - (\text{Defender Hits} + \text{Cover Bonus}))$$
  $$\text{Final Damage} = \max(0, \text{Net Hits} - \text{Plating}) - \text{Bio-Resilience Saves (6+)}$$
- **Momentum Charge**: Moving at least `4 sectors` in a straight line directly into base contact (`1 sector`) and performing a Melee Attack grants `+1 FPR die` (`+2` with *Thruster Skiff* mount).
- **Line of Sight & Cover**: Center-to-center raycasting across the `36×36` sector grid. **Low Barricades (Partial Cover)** grant `+1 automatic Evasion hit` against ranged fire; **Bulkheads (Full Cover)** block LoS completely.
- **5-Round Sequence & Opaque Command Chit Pool**:
  1. **Sector Hazard & Upkeep Phase**: Resolve radiation/plasma zones and start-of-round regeneration.
  2. **Surge Cell Recharge Phase**: Reset all units' Surge Cells (`SRG`) to maximum.
  3. **Interleaved Activation Phase (The Command Chit Pool)**: An opaque pool holds `1 Strike Chit` per occupied Player Berth plus `1 Warden Directive Chit`. Drawing a Strike Chit lets the player activate any unactivated friendly berth (`2 Actions`: Move + Standard, or Double Move). Drawing the Warden Chit rolls `1d6` to activate that Warden Berth (`1–6`, wrapping to the next unactivated living Warden) and **returns the Warden Chit to the pool** until all living Warden Berths have activated for the round. Multi-berth Warden bosses (`Echelon 3` = 2 Berths, `Echelon 4` = 3 Berths) activate once for *each* berth they occupy.
  4. **Telemetry & Scoring Phase**: Score objective control, check victory conditions, and advance the Round counter (`Rounds 1–5`).

#### C. Hardpoint Modules & Resonance Weaving
- **1-Hardpoint Modules (`Cost: 3 Alloy`)**:
  - *Combat*: `Weakpoint Exploit` (enemy natural 1s grant +1 hit), `Overcharge Crit (2)` (two 6s deal +1 damage), `Optics Precision` (ignore Partial Cover or 3+ hits within 6 sectors), `ECM Jammer (1)`, `Smoke Canister`, `Tactical Rally`, `Armor Piercer (1)`, `Reinforced Carapace`, `Pulse Carbine (Range 8 / +6)`.
  - *Surge & Economy*: `Surge Drain (1)`, `Surge Siphon (1)`, `Dynamo Core (+1 Base Surge)`, `Capacitor Overload (+2d6 boost, self Staggered)`, `Focus Bank`, `High-Value Bounty (+2 Alloy)`, `Beacon Tap (+1 Alloy)`, `Telemetry Burn`.
  - *Field Utility*: `Remote Telemetry (Interact 6")`, `Phase Transposer (Swap Places 6")`, `Deployable Barricade`, `Holo-Decoy`.
  - *Minor Resonance Initiate*: Unlocks 2 (or 3 for Psions) **Minor Resonance Directives** across 6 Frequencies (*Ferro-Kinetics*, *Plasma-Arc*, *Bio-Synth*, *Neuro-Hacking*, *Fold-Space*, *Chrono-Drift*) plus `Resonance Focus Amp`.
- **2-Hardpoint Masterworks & Major Resonance Harmonics (`Cost: 6 Alloy`)**:
  - *Masterworks (`Echelon 2+`)*: `Deterministic Strike / Aegis Wall (+1 auto-hit)`, `Direct Channel (+1 auto-hit for 1 Surge)`, `Thruster Skiff Mount (+3 MOV, ARM/TGH 1, +2 Charge dice)`, `Phase Walk`, `Executioner Shot (3+ Net Hits = Trauma/Crit)`, `Perimeter Lockdown (3" deny charge)`, `Command Aura (6" +1 die)`.
  - *Major Resonance Harmonics (`Echelon 3+` or `Psions`)*: Unlocks dynamic Technique synthesis (*Perceive, Fortify, Control, Move, Transform, Weaken, Summon, Annihilate*) across the 6 Frequencies at `Rank = Echelon - 1` (plus `Sovereign Mastery Rank 4`), governed by Target Number modifiers (`Base TN 2`) and the `1d6` **Resonance Backlash / Overheat Table**.

---

### 3. Complete Player User Journeys & Visual Design

#### A. End-to-End User Journeys
1. **Journey 1 — Instant Tactical Drop (`Title Deck -> Quick Operation`)**:
   - Player launches **KARST: ZERO HORIZON** and lands on the atmospheric **Orbital Command Deck**.
   - Clicks **Quick Tactical Drop**, selects one of the **6 Core Sector Contracts** (*Alloy Cache Sweep*, *Bulkhead Breakthrough*, *Core Data Sabotage*, *VIP Courier Extraction*, *Central Reactor Hold*, *Warden Decapitation Strike*) and a threat level (*Low*, *Medium*, *High*), and deploys immediately onto the `36×36` interactive battlefield with a balanced 6-Berth Strike Roster.
2. **Journey 2 — Strike Roster Engineering (`Warband Forge -> 3D Unit Synthesis`)**:
   - Player opens the **Strike Roster Forge**, names their company, and builds or customizes units within the **6-Berth Cap** (1 Free Echelon 3 Prime Commander in Berths 1–2 + `16 Alloy` starting treasury for Berths 3–6).
   - Adjusting the `[Doctrine, Chassis, Echelon]` selectors updates base dice, Integrity/Hull, Surge Cells, and Hardpoint capacity in real time, while every stat calculation dispatches through the `prism-code` Core-Wasm guest.
3. **Journey 3 — Campaign Recon & Contract Selection (`Pre-Drop Operations`)**:
   - Between campaign drops, the player assigns each surviving operative (Echelon 1+) to one of four **Pre-Drop Crew Assignments**:
     - *Sector Recon (`COG` or Outrider `FPR`)*: Invest successes into unlocking higher-tier Sector Contracts or spend `2 successes` to re-roll a Warden Berth.
     - *Scrap Salvaging (`FPR` or `EVA`)*: Every `2 successes` yields `+1 Alloy` or a single-use Field Stim.
     - *Med-Bay / Repair Bay (`COG`)*: Every `2 successes` clears a permanent attribute penalty or repairs `4 Hull`.
     - *Combat Sim-Drill (`FPR` or `COG`)*: Every `2 successes` grants a **Tactical Prep Token** (`+1 Surge` or `1 die re-roll` in battle).
   - Failed or low rolls can be **Pushed** once (re-rolling failed dice, risking `-1 Attribute` or `1 starting damage` on any natural `1`).
4. **Journey 4 — 5-Round Tactical Battle (`Battlefield Canvas & Command Chit Loop`)**:
   - During the **Activation Phase**, the player clicks **Draw Command Chit** from the opaque pool.
   - **On a Strike Chit**: Player selects an unactivated friendly operative, views highlighted valid movement sectors (with straight-line `4+` Charge lanes and Partial/Full Cover indicators), executes Movement + Standard Actions, spends **Surge Cells** for `+1d6` boosts or **1-Surge Doctrine Triggers**, and watches the animated **Opposed d6 Strike Tray** resolve hits, Plating/Resilience mitigation, and damage via Core-Wasm `dispatch()`.
   - **On a Warden Chit**: The engine rolls `1d6` to select the active Warden Berth, highlights the unit on the canvas, executes its deterministic Doctrine AI movement and attack, and returns the Warden Chit to the pool if unactivated Wardens remain.
5. **Journey 5 — Post-Drop Extraction, Trauma & Orbital Bastion (`Downtime`)**:
   - At Round 5 (or full wipe/extraction), the **After-Action Telemetry Screen** tallies Victory Points, Alloy salvaged, and **Veteran Commendations (`+1 XP` per survivor)**.
   - Any unit neutralized during the mission rolls `1d6` on the **Permanent Trauma Table** (`1–2: -1 FPR`, `3–4: -1 EVA`, `5–6: -1 COG`; if any core attribute reaches `0`, the unit suffers **Zero-Stat Permadeath**).
   - In the **Orbital Bastion**, the player spends `3 XP` to unlock new Hardpoint sockets, spends `3 / 6 Alloy` to lock new Enhancements, recruits replacements, or constructs permanent **Bastion Facilities** (*Auto-Doc Infirmary [8 Alloy]*, *Deep-Scan Array [8 Alloy]*, *Ordnance Foundry [10 Alloy]*).
6. **Journey 6 — Pause-Menu Prism Product Model & Verification Audit (`ESC`)**:
   - At any point, pressing `ESC` opens the **Prism Product Model & Runtime Audit Overlay** without interrupting the game state, allowing inspection of the 4 Stakeholder Viewpoints, Architecture Graph, Quality & Security Matrices, Core-Wasm Wire Telemetry log, 30+ Acceptance Vectors, Canonical Save Hasher, and `.holo` v4 binary export.

#### B. Visual Identity, Layout & Motion
- **Color System (60-30-10 Discipline)**:
  - **60% Tactical Canvas**: Deep Void Slate (`#0B0F19`) and Bulkhead Slate (`#111827`).
  - **30% Structural Panels & Grid**: Gunmetal (`#1E293B`) with crisp `1px` hairlines (`#334155`), alabaster text (`#F8FAFC`), and steel metadata (`#94A3B8`).
  - **10% Telemetry Accents**: Surge Amber (`#F59E0B`), Strike Emerald (`#10B981`), Warden Crimson (`#EF4444`), and Resonance Cyan (`#06B6D4`).
- **Typography**: `Plus Jakarta Sans` for crisp tactical headers and card legibility; `JetBrains Mono` (`tabular-nums`) for all coordinates, dice pools, inch/sector distances, and BLAKE3 kappas.

---

### 4. Complete `prism-code` Product Model & Technical Architecture

#### A. How `prism-code` Powers KARST: ZERO HORIZON
1. **Client-Side `.holo` v4 Archive Synthesis (`KarstZeroHorizon.holo`)**:
   - On boot in the browser, the engine uses `prism-code` (`parseArchive`, `resolveArchive`, `encodeHoloview`, `canonicalJson`, `kappa`, `blake3`, `loadArchive`) to assemble and cryptographically seal `KarstZeroHorizon.holo` in memory.
   - Every section of the `.holo` v4 binary—`APP_MANIFEST (15)`, `METADATA (8)`, `application-directory/v1 (14)`, `prismpm-model/v1 (14)`, and the 4 `CONTENT_BLOB (16)` sections (`guestKappa`, `viewKappa`, `modelKappa`, `capabilitiesKappa`) plus the 32-byte BLAKE3 trailer—is verified via `app.identities.verified === true`.
2. **Formal Product Model (`model.prism.json` — `prismpm/model-document/1`)**:
   - **`architecture.stakeholders`**:
     - `stk-commander`: *Tactical Solo/Co-op Commander* (Fast, deterministic combat resolution and transparent dice math).
     - `stk-theorist`: *Campaign & Roster Architect* (Combinatorial depth across `6×5×5` `[Doctrine, Chassis, Echelon]` profiles without stat bloat).
     - `stk-designer`: *Product & Systems Designer* (Balanced 6-Berth economy, 6 core scenarios, and modular hardpoint extensibility).
     - `stk-auditor`: *Runtime & Verification Auditor* (Cryptographic artifact integrity, bounded Wasm memory, and deterministic replay vectors).
   - **`architecture.concerns` & `architecture.viewpoints`**:
     - *Tactical Resolution Viewpoint*, *3D Synthesis & Progression Viewpoint*, *Autonomous Warden AI Viewpoint*, and *Cryptographic Runtime & State Viewpoint*.
   - **`architecture.components` & `architecture.edges`**:
     - Models the 6 core subsystems (`UnitSynthesisCompiler`, `StrikePoolResolver`, `CommandChitDirector`, `ResonanceWeaveEngine`, `CampaignBastionLedger`, `CoreWasmGuestBridge`) and their data-flow edges.
   - **`quality` & `security`**:
     - Defines measurable quality requirements (Zero Stat Inflation invariant, $\le 52\text{B}$ wire request bound, $65,536\text{B}$ guest allocation cap, $100\%$ acceptance vector pass rate) and security controls (BLAKE3 content-addressed kappas, `prism-code/canonical` save-state verification via `codeHash` and `differs`).
3. **Core-Wasm Deterministic Arithmetic Dispatch (`app.dispatch`)**:
   - All core integer arithmetic during gameplay—computing **Net Hits** (`sub`), **Mitigated Final Damage** (`sub`), **Integrity/Hull Depletion** (`sub`), **Multi-Unit Pack Spillover** (`divide`/`sub`), **Alloy Treasury Transactions** (`add`/`sub`), and **Veteran Commendation Socket Unlocks** (`divide`)—dispatches wire frames (`1\t<op>\t<lhs>\t<rhs>`) through `app.dispatch()` on the compiled Core-Wasm guest (`holo_alloc` + `holo_run`).

#### B. System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                   KARST: ZERO HORIZON — CLIENT-SIDE BROWSER ENGINE                 │
│                                                                                    │
│  ┌──────────────────────────────────────┐   ┌───────────────────────────────────┐  │
│  │    KarstZeroHorizon.holo (v4)        │   │   prism-code/canonical Save Guard │  │
│  │  • Core-Wasm Guest (holo_run)        │   │  • canonicalize() Campaign JSON   │  │
│  │  • model.prism.json (Stakeholders,   │   │  • codeHash() SHA-256 & kappa()   │  │
│  │    Architecture, Quality, Security)  │   │  • describe() & differs() Audit   │  │
│  │  • HOLOVIEW Portable Bundle          │   └─────────────────┬─────────────────┘  │
│  └──────────────────┬───────────────────┘                     │                    │
│                     │ app.dispatch(bytes) / app.acceptance()  │                    │
│                     ▼                                         ▼                    │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                     KARST DETERMINISTIC TACTICAL ENGINE                      │  │
│  │  ┌───────────────────────┐ ┌──────────────────────┐ ┌─────────────────────┐  │  │
│  │  │ 3D Synthesis [X,Y,Z]  │ │ d6 Strike & Armor    │ │ Command Chit Pool   │  │  │
│  │  │ • Echelon 0–4 (Z)     │ │ • 4,5,6 = Strike Hit │ │ • Player Chits (6)  │  │  │
│  │  │ • Chassis (5) (Y)     │ │ • Opposed FPR vs EVA │ │ • Warden Chit + 1d6 │  │  │
│  │  │ • Doctrine (6) (X)    │ │ • Integrity vs Hull  │ │ • 6 Doctrine AIs    │  │  │
│  │  │ • Hardpoints & Psion  │ │ • Core-Wasm Dispatch │ │ • 6 Sector Contracts│  │  │
│  │  └───────────┬───────────┘ └──────────┬───────────┘ └──────────┬──────────┘  │  │
│  └──────────────┼────────────────────────┼────────────────────────┼─────────────┘  │
│                 ▼                        ▼                        ▼                │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                      FULL-SCREEN TACTICAL GAME INTERFACE                     │  │
│  │  • Orbital Command Title Deck         • 36×36 Interactive Sector Grid Canvas │  │
│  │  • Strike Roster 3D Synthesis Forge   • Active Operative HUD & Surge Bar     │  │
│  │  • Pre-Drop Recon & Bastion Downtime  • Animated Opposed d6 Resolution Tray  │  │
│  └───────────────────────────────────────┬──────────────────────────────────────┘  │
│                                          │ ESC / System Audit Overlay              │
│                                          ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │              PAUSE-MENU PRODUCT MODEL & VERIFICATION INSPECTOR               │  │
│  │  • Stakeholder Viewpoints & Concerns  • Architecture, Quality & Security     │  │
│  │  • Live Core-Wasm Wire Telemetry Log  • Acceptance Suite & .holo Export      │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────┘
```
