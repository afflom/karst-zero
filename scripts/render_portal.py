#!/usr/bin/env python3
"""Build the interactive Karst: Zero Horizon application and PrismPM/LexLean portal into view/."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path


def find_prism_build(root: Path) -> Path:
    build_root = root / ".prism" / "build"
    if build_root.is_dir():
        for child in sorted(build_root.iterdir()):
            if (child / "model.prism.json").is_file():
                return child
    raise RuntimeError("No .prism/build/<digest>/model.prism.json found; run prismpm-compiler build")


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    view_dir = root / "view"
    dist_dir = root / "dist"

    print("render_portal: building interactive Karst: Zero Horizon application via npm run build...")
    subprocess.run(["npm", "run", "build"], cwd=root, check=True)

    if view_dir.exists():
        shutil.rmtree(view_dir)
    shutil.copytree(dist_dir, view_dir)

    (view_dir / ".nojekyll").write_text("", encoding="utf-8")

    for svg_name in ["logo.svg", "banner.svg", "topology.svg"]:
        src_svg = root / "assets" / svg_name
        if src_svg.is_file():
            shutil.copy2(src_svg, view_dir / svg_name)

    prism_build = find_prism_build(root)
    shutil.copy2(prism_build / "model.prism.json", view_dir / "model.prism.json")

    design_src = prism_build / "design"
    design_dst = view_dir / "design"
    if design_src.is_dir():
        shutil.copytree(design_src, design_dst, dirs_exist_ok=True)

    register = {
        "schema": "karst-zero/portal-register/1",
        "product": "Karst: Zero Horizon",
        "engine": "Nemesis Core 4.0",
        "template_contract": "uor.template-contract/1",
        "commit": os.environ.get("GITHUB_SHA", "local"),
        "prism_build_id": prism_build.name,
        "conformance_ids": [
            "TC-01",
            "KZ-01",
            "KZ-02",
            "KZ-03",
            "KZ-04",
            "KZ-05",
            "KZ-06",
            "KZ-07",
            "KZ-08",
            "KZ-09",
            "KZ-10",
            "KZ-11",
            "KZ-12",
            "KZ-13",
            "KZ-14",
            "KZ-15",
        ],
    }
    (view_dir / "register.json").write_text(
        json.dumps(register, indent=2) + "\n", encoding="utf-8"
    )
    print(f"render_portal: populated {view_dir} with interactive app + PrismPM build {prism_build.name}")


if __name__ == "__main__":
    main()
