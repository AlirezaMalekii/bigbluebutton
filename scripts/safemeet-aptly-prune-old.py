#!/usr/bin/env python3
"""Keep the newest N versions of each package in a local aptly repo."""
from __future__ import annotations

import argparse
import collections
import re
import subprocess
import sys

KEY_RE = re.compile(r"^(.+)_(\d+:.+)_([a-z0-9]+)$")
RUN_RE = re.compile(r"\+(\d+)-git")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo")
    parser.add_argument("--keep", type=int, default=2)
    args = parser.parse_args()

    raw = subprocess.check_output(["aptly", "repo", "search", args.repo], text=True).strip()
    if not raw:
        return 0

    groups: dict[tuple[str, str], list[tuple[int, str]]] = collections.defaultdict(list)
    for key in raw.splitlines():
        key = key.strip()
        match = KEY_RE.match(key)
        if not match:
            continue
        name, ver, arch = match.groups()
        run = RUN_RE.search(ver)
        rank = int(run.group(1)) if run else 0
        groups[(name, arch)].append((rank, key))

    to_drop: list[str] = []
    for items in groups.values():
        items.sort(key=lambda item: item[0], reverse=True)
        to_drop.extend(key for _, key in items[args.keep :])

    if not to_drop:
        print(f"No old versions to prune in {args.repo}")
        return 0

    subprocess.check_call(["aptly", "repo", "remove", args.repo, *to_drop])
    print(f"Pruned {len(to_drop)} old package version(s); kept latest {args.keep} per name")
    return 0


if __name__ == "__main__":
    sys.exit(main())
