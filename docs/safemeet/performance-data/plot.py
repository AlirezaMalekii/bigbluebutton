"""Render the exploratory comparison; requires matplotlib, never meeting access."""
import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

root = Path(__file__).resolve().parent
data = {run["name"]: run for run in json.loads((root / "summary.json").read_text(encoding="utf-8"))}
before = data["smoke-chrome"]["scenes"]
after = data["after-loop-fix"]["scenes"]
fig, ax = plt.subplots(figsize=(8, 4.8), layout="constrained")
for offset, scenes, label, color in [(-0.18, before, "Before", "#b74c4c"), (0.18, after, "Participant-loop fix only", "#098779")]:
    means = [scene["mainThreadPercent"]["mean"] for scene in scenes]
    deviations = [scene["mainThreadPercent"]["sd"] for scene in scenes]
    bars = ax.bar([i + offset for i in range(2)], means, width=0.34, label=label, color=color,
                  yerr=deviations, capsize=4)
    ax.bar_label(bars, labels=[f"{value:.2f}%" for value in means], padding=6, fontsize=11)
ax.set_xticks([0, 1], ["No webcams", "Two webcams"])
ax.set_ylabel("Main-thread busy time (%)")
ax.set_ylim(0, 115)
ax.set_title("Exploratory two-client comparison\nOne 20-second run per scenario; error bars = sample SD", loc="left", pad=18)
ax.spines[["top", "right"]].set_visible(False)
ax.set_axisbelow(True)
ax.grid(axis="y", alpha=0.15)
ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.1), ncol=2, frameon=False)
fig.savefig(root / "main-thread-before-after.png", dpi=160)
fig.savefig(root / "main-thread-before-after.svg")
