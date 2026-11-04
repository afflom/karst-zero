//! The grep-shaped gates (R4, R5).

use std::path::{Path, PathBuf};

use crate::Fail;

fn shipped(root: &Path) -> Result<Vec<String>, Fail> {
    let mut out = Vec::new();
    let dir = root.join("crates");
    if !dir.exists() {
        return Ok(out);
    }
    for entry in std::fs::read_dir(&dir)? {
        let path = entry?.path();
        let manifest = path.join("Cargo.toml");
        let Ok(toml) = std::fs::read_to_string(&manifest) else {
            continue;
        };
        if toml.lines().any(|l| l.trim() == "publish = false") {
            continue;
        }
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            out.push(name.to_string());
        }
    }
    out.sort();
    Ok(out)
}

struct Source {
    rel: String,
    text: String,
}

fn shipped_sources(root: &Path) -> Result<Vec<Source>, Fail> {
    let mut out = Vec::new();
    for name in shipped(root)? {
        let dir = root.join("crates").join(&name).join("src");
        if !dir.exists() {
            continue;
        }
        collect(&dir, root, &mut out)?;
    }
    Ok(out)
}

fn collect(dir: &Path, root: &Path, out: &mut Vec<Source>) -> Result<(), Fail> {
    for entry in std::fs::read_dir(dir)? {
        let path = entry?.path();
        if path.is_dir() {
            collect(&path, root, out)?;
        } else if path.extension().is_some_and(|e| e == "rs") {
            let text = std::fs::read_to_string(&path)?;
            let rel = path
                .strip_prefix(root)
                .unwrap_or(&path)
                .display()
                .to_string();
            out.push(Source { rel, text });
        }
    }
    Ok(())
}

fn effective_lines(text: &str) -> Vec<(usize, &str)> {
    let mut out = Vec::new();
    let mut in_test = false;
    let mut test_depth = 0i32;
    let mut depth = 0i32;
    for (i, raw) in text.lines().enumerate() {
        let line = raw.trim();
        if line.starts_with("//") || line.starts_with("#!") {
            continue;
        }
        let opens = raw.matches('{').count() as i32;
        let closes = raw.matches('}').count() as i32;
        if line.starts_with("#[cfg(test)]") {
            in_test = true;
            test_depth = depth;
        }
        if !in_test {
            let code = line.split("//").next().unwrap_or("");
            if !code.trim().is_empty() {
                out.push((i + 1, code));
            }
        }
        depth += opens - closes;
        if in_test && depth <= test_depth && closes > 0 {
            in_test = false;
        }
    }
    out
}

/// R5: no arbitrary limitation. Every bound is a property of the caller's
/// chosen instantiation, never of the code.
pub fn audit_limits(root: &Path) -> Result<(), Fail> {
    let sources = shipped_sources(root)?;
    let sanctioned = ["NotAProduct", "ObservedBound", "KappaError"];

    let mut violations = Vec::new();
    for src in &sources {
        for (line_no, line) in effective_lines(&src.text) {
            let Some(pos) = line.find("Result<") else {
                continue;
            };
            let tail = &line[pos..];
            if sanctioned.iter().any(|s| tail.contains(s)) {
                continue;
            }
            violations.push(format!("{}:{line_no}:{}", src.rel, line.trim()));
        }
    }
    if !violations.is_empty() {
        return Err(format!(
            "R5: every bound is derived from declared parameters and is a \
             property of the caller's chosen instantiation. A `Result` over \
             anything else is a limitation the model does not sanction.\n\n{}",
            violations.join("\n")
        )
        .into());
    }
    println!("audit-limits: no shipped crate returns an unsanctioned error (R5)");
    Ok(())
}

/// R4: nothing is deferred.
pub fn audit_deferral(root: &Path) -> Result<(), Fail> {
    let markers = [
        concat!("TO", "DO"),
        concat!("FIX", "ME"),
        concat!("XX", "X"),
        concat!("unimplemented", "!"),
        concat!("to", "do!"),
        concat!("for ", "now"),
        concat!("later ", "version"),
    ];
    let mut violations = Vec::new();

    let mut files: Vec<PathBuf> = Vec::new();
    for dir in [root.join("crates"), root.join("xtask")] {
        if dir.exists() {
            gather_all(&dir, &mut files)?;
        }
    }
    for entry in std::fs::read_dir(root)? {
        let p = entry?.path();
        if p.extension().is_some_and(|e| e == "md") {
            files.push(p);
        }
    }

    for path in files {
        let Ok(text) = std::fs::read_to_string(&path) else {
            continue;
        };
        let rel = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .display()
            .to_string();
        for (i, line) in text.lines().enumerate() {
            for marker in markers {
                if !line.contains(marker) {
                    continue;
                }
                if outside_code_spans(line, marker) {
                    violations.push(format!("{rel}:{}: {}", i + 1, line.trim()));
                }
            }
        }
    }

    if !violations.is_empty() {
        return Err(format!(
            "R4: nothing is deferred. None of {} may appear, and no stub, no \
             placeholder section, and no capability behind a flag that turns it \
             off. Every capability ships in the one release.\n\n{}",
            markers.join(", "),
            violations.join("\n")
        )
        .into());
    }
    println!("audit-deferral: nothing is deferred (R4)");
    Ok(())
}

fn outside_code_spans(line: &str, marker: &str) -> bool {
    let mut rest = line;
    let mut at = 0usize;
    while let Some(pos) = rest.find(marker) {
        let absolute = at + pos;
        if line[..absolute].matches('`').count().is_multiple_of(2) {
            return true;
        }
        at = absolute + marker.len();
        rest = &line[at..];
    }
    false
}

fn gather_all(dir: &Path, out: &mut Vec<PathBuf>) -> Result<(), Fail> {
    for entry in std::fs::read_dir(dir)? {
        let path = entry?.path();
        if path.is_dir() {
            if path.file_name().is_some_and(|n| n == "target") {
                continue;
            }
            gather_all(&path, out)?;
        } else if path
            .extension()
            .is_some_and(|e| e == "rs" || e == "md" || e == "toml")
        {
            out.push(path);
        }
    }
    Ok(())
}
