#!/usr/bin/env python3
"""Parse mọi workflow YAML trước khi push.

Lý do tồn tại: một dòng `- run: echo "Site URL: ${{ ... }}"` để trần làm YAML
hiểu "Site URL:" thành mapping key. Workflow hỏng ngay lúc khởi động — 0 job
chạy, nên CI không thể tự bắt lỗi này. Chỉ chạy local trước khi push mới bắt được.

    python3 tools/lint_workflows.py
"""
import pathlib
import sys

try:
    import yaml
except ImportError:
    sys.exit("Cần PyYAML: pip install pyyaml")

root = pathlib.Path(__file__).resolve().parent.parent
files = sorted(root.glob(".github/workflows/*.yml")) + sorted(root.glob(".github/workflows/*.yaml"))
if not files:
    sys.exit("Không tìm thấy workflow nào")

bad = 0
for f in files:
    rel = f.relative_to(root)
    try:
        doc = yaml.safe_load(f.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        bad += 1
        print(f"  ✗ {rel}\n     {e}")
        continue
    # `on` là từ khoá YAML 1.1 nên safe_load biến nó thành True, không phải "on".
    trigger = doc.get("on", doc.get(True))
    if not isinstance(doc, dict) or "jobs" not in doc or trigger is None:
        bad += 1
        print(f"  ✗ {rel} — thiếu 'on' hoặc 'jobs'")
        continue
    print(f"  ✓ {rel} — {len(doc['jobs'])} job: {', '.join(doc['jobs'])}")

sys.exit(1 if bad else 0)
