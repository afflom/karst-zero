//! `audit-bootstrap`: toolchain, PrismPM/LexLean manifests, portal artifacts, and template contract (`CM-04`, R6).

use std::path::Path;

use sha2::{Digest, Sha256};

use crate::Fail;

fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    let mut out = String::with_capacity(64);
    for b in digest {
        use std::fmt::Write as _;
        let _ = write!(out, "{b:02x}");
    }
    out
}

/// Check the bootstrap, rendered portal, and template contract invariants on `root`.
pub fn audit(root: &Path) -> Result<(), Fail> {
    let mut v = Vec::new();

    // 1. `.devcontainer/devcontainer.json` exists and pins `@sha256:`.
    let dev = root.join(".devcontainer/devcontainer.json");
    match std::fs::read_to_string(&dev) {
        Err(_) => v.push("CM-04: `.devcontainer/devcontainer.json` is missing.".to_string()),
        Ok(text) => {
            if !text.contains("@sha256:") {
                v.push(
                    "CM-04: `.devcontainer/devcontainer.json` must pin its container image by \
                     `@sha256:` digest."
                        .to_string(),
                );
            }
        }
    }

    // 2. `prismpm.toml` and `lexlean.toml` exist at the repository root.
    for manifest in ["prismpm.toml", "lexlean.toml"] {
        if !root.join(manifest).is_file() {
            v.push(format!(
                "CM-04: `{manifest}` is missing at the repository root."
            ));
        }
    }

    // 3. `.prism/build` contains at least one compiled `model.prism.json` and `design/` folder.
    let prism_build = root.join(".prism/build");
    let mut found_model = false;
    if let Ok(entries) = std::fs::read_dir(&prism_build) {
        for entry in entries.flatten() {
            if entry.path().join("model.prism.json").is_file()
                && entry.path().join("design").is_dir()
            {
                found_model = true;
                break;
            }
        }
    }
    if !found_model {
        v.push(
            "CM-04: `.prism/build/<digest>/model.prism.json` and `design/` are missing; run \
             the PrismPM compiler to build the model."
                .to_string(),
        );
    }

    // 4. Rendered GitHub Pages portal artifacts exist under `view/`.
    for view_artifact in [
        "view/.nojekyll",
        "view/index.html",
        "view/register.json",
        "view/model.prism.json",
        "view/logo.svg",
        "view/banner.svg",
        "view/topology.svg",
    ] {
        if !root.join(view_artifact).is_file() {
            v.push(format!(
                "CM-04: rendered portal artifact `{view_artifact}` is missing; run \
                 `cargo run -p xtask -- render-view`."
            ));
        }
    }

    // 5. `template-contract.json` exists and every pinned file matches its SHA-256 digest.
    let contract_path = root.join("template-contract.json");
    match std::fs::read_to_string(&contract_path) {
        Err(_) => v.push("CM-04: `template-contract.json` is missing.".to_string()),
        Ok(text) => match serde_json::from_str::<serde_json::Value>(&text) {
            Err(e) => v.push(format!(
                "CM-04: `template-contract.json` is not valid JSON: {e}"
            )),
            Ok(doc) => {
                if doc.get("schema").and_then(|s| s.as_str()) != Some("uor.template-contract/1") {
                    v.push(
                        "CM-04: `template-contract.json` must declare `schema = \
                         \"uor.template-contract/1\"`."
                            .to_string(),
                    );
                }
                if let Some(pins) = doc.get("pins").and_then(|p| p.as_array()) {
                    for pin in pins {
                        let Some(path) = pin.get("path").and_then(|p| p.as_str()) else {
                            continue;
                        };
                        let Some(expected) = pin.get("sha256").and_then(|s| s.as_str()) else {
                            continue;
                        };
                        match std::fs::read(root.join(path)) {
                            Err(_) => v.push(format!(
                                "CM-04: `{path}` is pinned in `template-contract.json` but missing."
                            )),
                            Ok(bytes) => {
                                let actual = sha256_hex(&bytes);
                                if actual != expected {
                                    v.push(format!(
                                        "CM-04: `{path}` drifted from `template-contract.json` \
                                         (expected {expected}, got {actual})."
                                    ));
                                }
                            }
                        }
                    }
                }
            }
        },
    }

    if v.is_empty() {
        println!("audit-bootstrap: ok");
        Ok(())
    } else {
        Err(v.join("\n").into())
    }
}
