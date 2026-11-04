//! Repository gates (`cargo run -p xtask -- <task>`).
//!
//! Enforces R1-R6 and CM-01..CM-05 across `model/*.toml`, `CONFORMANCE.md`,
//! `.prism/build/<digest>/model.prism.json`, `src/*.lex.tex`, `view/`, and the
//! Rust conformance test suite.

#![deny(missing_docs)]

mod audit;
mod bootstrap;

use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};

use repo_model::{codegen, Model};

/// A gate failure, reported with the rule it broke.
pub(crate) type Fail = Box<dyn std::error::Error>;

fn main() -> ExitCode {
    let task = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "validate".to_string());
    let write = std::env::args().nth(2).is_some_and(|a| a == "--write");
    let root = repo_model::repo_root();

    let result = match task.as_str() {
        "check-model" => check_model(&root, write),
        "audit-limits" => audit::audit_limits(&root),
        "audit-deferral" => audit::audit_deferral(&root),
        "audit-bootstrap" => bootstrap::audit(&root),
        "render-view" => render_view(&root),
        "validate" => validate(&root),
        other => {
            eprintln!(
                "unknown xtask subcommand `{other}`\n\
                 usage: cargo run -p xtask -- <check-model [--write] | audit-limits | \
                 audit-deferral | audit-bootstrap | render-view | validate>"
            );
            return ExitCode::from(2);
        }
    };

    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("gate failed: {e}");
            ExitCode::FAILURE
        }
    }
}

fn render_view(root: &Path) -> Result<(), Fail> {
    run_cmd(root, "python3", &["scripts/render_portal.py"])
}

fn check_model(root: &Path, write: bool) -> Result<(), Fail> {
    let model = Model::load(&root.join("model"))?;
    model.check()?;

    let conformance = codegen::render_conformance(&model);
    let conformance_path: PathBuf = root.join(codegen::CONFORMANCE_PATH);

    if write {
        std::fs::write(&conformance_path, &conformance)?;
        println!("wrote {}", conformance_path.display());
        return Ok(());
    }

    let committed = std::fs::read_to_string(&conformance_path).map_err(|e| {
        format!(
            "{}: {e}\nrun `cargo run -p xtask -- check-model --write`",
            conformance_path.display()
        )
    })?;
    if committed != conformance {
        return Err(format!(
            "{} is stale: it disagrees with model/ids.toml.\n\
             R2: a claim cannot exist in the documentation without a ledger row. \
             Run `cargo run -p xtask -- check-model --write`.",
            conformance_path.display()
        )
        .into());
    }
    println!(
        "check-model: CONFORMANCE.md equals the model, {} ids (CM-01)",
        model.ids.id.len()
    );
    Ok(())
}

fn validate(root: &Path) -> Result<(), Fail> {
    check_model(root, false)?;
    audit::audit_limits(root)?;
    audit::audit_deferral(root)?;
    bootstrap::audit(root)?;

    let prismpm_compiler = Path::new("/home/alex/Desktop/PrismPM/target/debug/prismpm-compiler");
    if prismpm_compiler.is_file() {
        run_cmd(
            root,
            prismpm_compiler.to_str().unwrap_or("prismpm-compiler"),
            &["check", root.to_str().unwrap_or(".")],
        )?;
        let lexlean_bin = Path::new("/home/alex/.local/bin/lexlean");
        if lexlean_bin.is_file() {
            run_cmd(root, lexlean_bin.to_str().unwrap_or("lexlean"), &["lock"])?;
        }
    }
    run_cmd(
        root,
        "cargo",
        &[
            "clippy",
            "--workspace",
            "--all-targets",
            "--",
            "-D",
            "warnings",
        ],
    )?;
    run_cmd(root, "cargo", &["test", "--workspace"])?;
    println!("validate: every gate passed");
    Ok(())
}

fn run_cmd(root: &Path, program: &str, args: &[&str]) -> Result<(), Fail> {
    println!("validate: running `{program} {}`", args.join(" "));
    let status = Command::new(program)
        .current_dir(root)
        .args(args)
        .status()?;
    if !status.success() {
        return Err(format!("`{program} {}` exited with {status}", args.join(" ")).into());
    }
    Ok(())
}
