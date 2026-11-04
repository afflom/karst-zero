//! Certified `#![no_std]` Rust realization of the `Karst: Zero Horizon` and
//! `Nemesis Core 4.0` LexLean v0.4 kernel.
//!
//! Mirrors the total, allocation-free, float-free integer realizations declared across
//! `src/Contract.lex.tex`, `src/Application.lex.tex`, `src/UnitSynthesis.lex.tex`,
//! `src/CombatEngine.lex.tex`, `src/ResonanceWeave.lex.tex`, `src/NemesisChit.lex.tex`,
//! `src/CampaignBastion.lex.tex`, `src/NemesisEngine.lex.tex`, `src/Architecture.lex.tex`,
//! `src/Design.lex.tex`, `src/Presentation.lex.tex`, `src/Standards.lex.tex`, and
//! `src/Main.lex.tex`.

#![no_std]
#![forbid(unsafe_code)]
#![deny(missing_docs)]

pub mod combat;
pub mod nemesis;
pub mod synthesis;

/// A single pinned SHA-256 digest pair (`Contract.lex.tex` -> `Pin`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Pin {
    /// Expected locked 32-byte SHA-256 digest.
    pub locked: [u8; 32],
    /// Actual observed 32-byte SHA-256 digest on disk.
    pub observed: [u8; 32],
}

/// Six-file template contract observation (`Contract.lex.tex` -> `Observation`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Observation {
    /// `.devcontainer/devcontainer.json` digest pair.
    pub devcontainer: Pin,
    /// `.github/workflows/bootstrap.yml` digest pair.
    pub bootstrap: Pin,
    /// `AGENTS.md` digest pair.
    pub agents: Pin,
    /// `VERIFICATION.md` digest pair.
    pub verification: Pin,
    /// `prismpm.lock` digest pair.
    pub sdk_lock: Pin,
    /// `prismpm.toml` / `template.lock` digest pair.
    pub template_lock: Pin,
}

/// Check whether a single `Pin` has identical locked and observed digests (`Contract::pinMatches`).
#[must_use]
pub const fn pin_matches(pin: &Pin) -> bool {
    let mut i = 0usize;
    while i < 32 {
        if pin.locked[i] != pin.observed[i] {
            return false;
        }
        i += 1;
    }
    true
}

/// Decide whether all six template-contract pins match (`Contract::conformant`, `TC-01`).
#[must_use]
pub const fn conformant(obs: &Observation) -> bool {
    pin_matches(&obs.devcontainer)
        && pin_matches(&obs.bootstrap)
        && pin_matches(&obs.agents)
        && pin_matches(&obs.verification)
        && pin_matches(&obs.sdk_lock)
        && pin_matches(&obs.template_lock)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn conformant_matches_identical_pins() {
        let p = Pin {
            locked: [0xAB; 32],
            observed: [0xAB; 32],
        };
        let obs = Observation {
            devcontainer: p,
            bootstrap: p,
            agents: p,
            verification: p,
            sdk_lock: p,
            template_lock: p,
        };
        assert!(conformant(&obs));
    }
}
