#!/usr/bin/env python3
"""Compile a SafeMeet meeting theme JSON into a CSS variable override.

Usage:
  scripts/safemeet-theme-compile.py branding/themes/roomeet.json -o theme-override.css
  scripts/safemeet-theme-compile.py theme.json --validate-only
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
COLOR_RE = re.compile(
    r"^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})"
    r"|rgba?\([^)]+\)"
    r"|hsla?\([^)]+\)"
    r"|transparent"
    r"|currentColor"
    r"|[a-zA-Z-]+)$"
)


def die(msg: str) -> None:
    print(f"[safemeet-theme] ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    h = value.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) == 8:
        h = h[:6]
    if len(h) != 6:
        die(f"Invalid hex color: {value}")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def is_hex(value: str) -> bool:
    return bool(re.match(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$", value))


def rgba(hex_color: str, alpha: float) -> str:
    if not is_hex(hex_color):
        die(f"Cannot derive rgba from non-hex color: {hex_color}")
    r, g, b = hex_to_rgb(hex_color)
    a = f"{alpha:.3f}".rstrip("0").rstrip(".")
    return f"rgba({r}, {g}, {b}, {a})"


def require_dict(obj: Any, path: str) -> dict[str, Any]:
    if not isinstance(obj, dict):
        die(f"{path} must be an object")
    return obj


def require_str(obj: dict[str, Any], key: str, path: str) -> str:
    if key not in obj or not isinstance(obj[key], str) or not obj[key].strip():
        die(f"{path}.{key} is required")
    return obj[key].strip()


def opt_str(obj: dict[str, Any], key: str, default: str | None = None) -> str:
    value = obj.get(key, default)
    if value is None:
        return ""
    if not isinstance(value, str) or not value.strip():
        die(f"{key} must be a non-empty string when present")
    return value.strip()


def validate_colorish(value: str, path: str) -> str:
    compact = " ".join(value.split())
    if (
        COLOR_RE.match(compact)
        or "gradient(" in compact
        or compact.startswith("url(")
        or "," in compact  # layered backgrounds
    ):
        return value
    die(f"{path} looks invalid: {value[:100]}")
    return value


def load_theme(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        die(f"Invalid JSON in {path}: {exc}")
    require_dict(data, "root")
    version = data.get("schemaVersion")
    if version != SCHEMA_VERSION:
        die(f"Unsupported schemaVersion {version!r}; expected {SCHEMA_VERSION}")
    for key in ("id", "name"):
        if not isinstance(data.get(key), str) or not data[key].strip():
            die(f"root.{key} is required")
    require_dict(data.get("dark"), "dark")
    if "light" in data and data["light"] is not None:
        require_dict(data.get("light"), "light")
    return data


def resolve_palette(mode: str, palette: dict[str, Any]) -> dict[str, Any]:
    brand_raw = require_dict(palette.get("brand"), f"{mode}.brand")
    brand = {
        "50": validate_colorish(require_str(brand_raw, "50", f"{mode}.brand"), f"{mode}.brand.50"),
        "100": validate_colorish(require_str(brand_raw, "100", f"{mode}.brand"), f"{mode}.brand.100"),
        "200": validate_colorish(require_str(brand_raw, "200", f"{mode}.brand"), f"{mode}.brand.200"),
        "300": validate_colorish(require_str(brand_raw, "300", f"{mode}.brand"), f"{mode}.brand.300"),
        "400": validate_colorish(require_str(brand_raw, "400", f"{mode}.brand"), f"{mode}.brand.400"),
        "500": validate_colorish(require_str(brand_raw, "500", f"{mode}.brand"), f"{mode}.brand.500"),
        "600": validate_colorish(require_str(brand_raw, "600", f"{mode}.brand"), f"{mode}.brand.600"),
        "700": validate_colorish(require_str(brand_raw, "700", f"{mode}.brand"), f"{mode}.brand.700"),
        "accent": validate_colorish(require_str(brand_raw, "accent", f"{mode}.brand"), f"{mode}.brand.accent"),
    }
    brand["gradient"] = validate_colorish(
        opt_str(
            brand_raw,
            "gradient",
            f"linear-gradient(135deg, {brand['500']} 0%, {brand['400']} 100%)",
        ),
        f"{mode}.brand.gradient",
    )
    brand["gradientSoft"] = validate_colorish(
        opt_str(
            brand_raw,
            "gradientSoft",
            (
                f"linear-gradient(135deg, {rgba(brand['500'], 0.18)} 0%, "
                f"{rgba(brand['400'], 0.28)} 100%)"
                if is_hex(brand["500"]) and is_hex(brand["400"])
                else brand["gradient"]
            ),
        ),
        f"{mode}.brand.gradientSoft",
    )

    status_raw = require_dict(palette.get("status"), f"{mode}.status")
    danger = validate_colorish(require_str(status_raw, "danger", f"{mode}.status"), f"{mode}.status.danger")
    danger_end = opt_str(status_raw, "dangerEnd", "#FF6A66")
    status = {
        "success": validate_colorish(
            opt_str(status_raw, "success", brand["400"]), f"{mode}.status.success"
        ),
        "danger": danger,
        "dangerEnd": validate_colorish(danger_end, f"{mode}.status.dangerEnd"),
        "dangerSoft": validate_colorish(
            opt_str(status_raw, "dangerSoft", rgba(danger, 0.16) if is_hex(danger) else danger),
            f"{mode}.status.dangerSoft",
        ),
        "dangerBorder": validate_colorish(
            opt_str(status_raw, "dangerBorder", rgba(danger, 0.38) if is_hex(danger) else danger),
            f"{mode}.status.dangerBorder",
        ),
        "dangerGradient": validate_colorish(
            opt_str(
                status_raw,
                "dangerGradient",
                f"linear-gradient(135deg, {danger} 0%, {danger_end} 100%)",
            ),
            f"{mode}.status.dangerGradient",
        ),
        "warning": validate_colorish(
            opt_str(status_raw, "warning", "#F5C451"), f"{mode}.status.warning"
        ),
    }

    surface_raw = require_dict(palette.get("surface"), f"{mode}.surface")
    surface_keys = [
        "background",
        "backgroundDeep",
        "content",
        "surface",
        "surface2",
        "surface3",
        "offWhite",
        "userList",
        "dropdown",
        "toolbarButton",
        "toolbarList",
        "toolbarListFocus",
        "btnDefault",
        "listHover",
        "overlay",
        "loader",
        "webcam",
        "grayLightest",
        "grayLighter",
        "grayLight",
    ]
    surface = {
        key: validate_colorish(require_str(surface_raw, key, f"{mode}.surface"), f"{mode}.surface.{key}")
        for key in surface_keys
    }

    text_raw = require_dict(palette.get("text"), f"{mode}.text")
    text = {
        "primary": validate_colorish(require_str(text_raw, "primary", f"{mode}.text"), f"{mode}.text.primary"),
        "secondary": validate_colorish(require_str(text_raw, "secondary", f"{mode}.text"), f"{mode}.text.secondary"),
        "muted": validate_colorish(require_str(text_raw, "muted", f"{mode}.text"), f"{mode}.text.muted"),
        "body": validate_colorish(
            opt_str(text_raw, "body", text_raw.get("secondary", "")), f"{mode}.text.body"
        ),
        "onBrand": validate_colorish(
            opt_str(text_raw, "onBrand", "#FFFFFF"), f"{mode}.text.onBrand"
        ),
        "white": validate_colorish(opt_str(text_raw, "white", "#FFFFFF"), f"{mode}.text.white"),
    }

    accent_hex = brand["accent"] if is_hex(brand["accent"]) else brand["400"]
    accent_raw = require_dict(palette.get("accent"), f"{mode}.accent")
    accent = {
        "soft": validate_colorish(
            opt_str(accent_raw, "soft", rgba(accent_hex, 0.12) if is_hex(accent_hex) else accent_hex),
            f"{mode}.accent.soft",
        ),
        "border": validate_colorish(
            opt_str(accent_raw, "border", rgba(accent_hex, 0.36) if is_hex(accent_hex) else accent_hex),
            f"{mode}.accent.border",
        ),
        "glow": validate_colorish(
            opt_str(accent_raw, "glow", rgba(accent_hex, 0.10) if is_hex(accent_hex) else accent_hex),
            f"{mode}.accent.glow",
        ),
        "hoverBg": validate_colorish(
            opt_str(accent_raw, "hoverBg", rgba(accent_hex, 0.14) if is_hex(accent_hex) else accent_hex),
            f"{mode}.accent.hoverBg",
        ),
        "activeBg": validate_colorish(
            opt_str(
                accent_raw,
                "activeBg",
                (
                    f"linear-gradient(145deg, {rgba(brand['500'], 0.88)}, {rgba(brand['600'], 0.92)})"
                    if is_hex(brand["500"]) and is_hex(brand["600"])
                    else brand["gradient"]
                ),
            ),
            f"{mode}.accent.activeBg",
        ),
        "btnPrimaryBorder": validate_colorish(
            opt_str(
                accent_raw,
                "btnPrimaryBorder",
                rgba(brand["400"], 0.55) if is_hex(brand["400"]) else brand["400"],
            ),
            f"{mode}.accent.btnPrimaryBorder",
        ),
        "ghostBg": validate_colorish(
            opt_str(accent_raw, "ghostBg", rgba(brand["400"], 0.12) if is_hex(brand["400"]) else brand["400"]),
            f"{mode}.accent.ghostBg",
        ),
        "ghostBorder": validate_colorish(
            opt_str(
                accent_raw,
                "ghostBorder",
                rgba(brand["400"], 0.28) if is_hex(brand["400"]) else brand["400"],
            ),
            f"{mode}.accent.ghostBorder",
        ),
        "blueLightest": validate_colorish(
            opt_str(
                accent_raw,
                "blueLightest",
                rgba(brand["400"], 0.22) if is_hex(brand["400"]) else brand["400"],
            ),
            f"{mode}.accent.blueLightest",
        ),
        "webcamPlaceholderBorder": validate_colorish(
            opt_str(
                accent_raw,
                "webcamPlaceholderBorder",
                rgba(brand["400"], 0.45) if is_hex(brand["400"]) else brand["400"],
            ),
            f"{mode}.accent.webcamPlaceholderBorder",
        ),
        "webcamTalking": validate_colorish(
            opt_str(
                accent_raw,
                "webcamTalking",
                rgba(brand["400"], 0.22) if is_hex(brand["400"]) else brand["400"],
            ),
            f"{mode}.accent.webcamTalking",
        ),
    }

    border_raw = require_dict(palette.get("border"), f"{mode}.border")
    border = {
        "default": validate_colorish(
            opt_str(
                border_raw,
                "default",
                rgba(brand["400"], 0.18) if is_hex(brand["400"]) else brand["400"],
            ),
            f"{mode}.border.default",
        ),
        "strong": validate_colorish(
            opt_str(
                border_raw,
                "strong",
                rgba(brand["400"], 0.34) if is_hex(brand["400"]) else brand["400"],
            ),
            f"{mode}.border.strong",
        ),
        "subtle": validate_colorish(
            opt_str(border_raw, "subtle", "rgba(218, 230, 245, 0.08)"),
            f"{mode}.border.subtle",
        ),
        "emphasis": validate_colorish(
            opt_str(
                border_raw,
                "emphasis",
                rgba(brand["400"], 0.14) if is_hex(brand["400"]) else brand["400"],
            ),
            f"{mode}.border.emphasis",
        ),
    }

    glass_raw = require_dict(palette.get("glass"), f"{mode}.glass")
    glass = {
        "glass": validate_colorish(require_str(glass_raw, "glass", f"{mode}.glass"), f"{mode}.glass.glass"),
        "strong": validate_colorish(require_str(glass_raw, "strong", f"{mode}.glass"), f"{mode}.glass.strong"),
        "blur": opt_str(glass_raw, "blur", "saturate(170%) blur(16px)"),
    }

    shadow_raw = require_dict(palette.get("shadow"), f"{mode}.shadow")
    shadow = {
        "glowSm": validate_colorish(
            opt_str(
                shadow_raw,
                "glowSm",
                f"0 0 0 1px {rgba(brand['400'], 0.10)}" if is_hex(brand["400"]) else "0 0 0 1px transparent",
            ),
            f"{mode}.shadow.glowSm",
        ),
        "glowMd": validate_colorish(
            opt_str(
                shadow_raw,
                "glowMd",
                f"0 6px 16px {rgba(brand['500'], 0.18)}" if is_hex(brand["500"]) else "0 6px 16px transparent",
            ),
            f"{mode}.shadow.glowMd",
        ),
    }

    loader_raw = require_dict(palette.get("loader"), f"{mode}.loader")
    loader = {
        "bullet": validate_colorish(
            opt_str(loader_raw, "bullet", brand["accent"]), f"{mode}.loader.bullet"
        ),
        "ring": validate_colorish(
            opt_str(loader_raw, "ring", rgba(accent_hex, 0.18) if is_hex(accent_hex) else brand["accent"]),
            f"{mode}.loader.ring",
        ),
        "ringActive": validate_colorish(
            opt_str(
                loader_raw,
                "ringActive",
                rgba(accent_hex, 0.85) if is_hex(accent_hex) else brand["accent"],
            ),
            f"{mode}.loader.ringActive",
        ),
    }

    panel_raw = require_dict(palette.get("panel"), f"{mode}.panel")
    panel = {
        "bg": validate_colorish(require_str(panel_raw, "bg", f"{mode}.panel"), f"{mode}.panel.bg"),
        "solid": validate_colorish(require_str(panel_raw, "solid", f"{mode}.panel"), f"{mode}.panel.solid"),
        "border": validate_colorish(require_str(panel_raw, "border", f"{mode}.panel"), f"{mode}.panel.border"),
        "divider": validate_colorish(require_str(panel_raw, "divider", f"{mode}.panel"), f"{mode}.panel.divider"),
        "header": validate_colorish(require_str(panel_raw, "header", f"{mode}.panel"), f"{mode}.panel.header"),
        "text": validate_colorish(require_str(panel_raw, "text", f"{mode}.panel"), f"{mode}.panel.text"),
        "textMuted": validate_colorish(
            require_str(panel_raw, "textMuted", f"{mode}.panel"), f"{mode}.panel.textMuted"
        ),
        "textDim": validate_colorish(
            require_str(panel_raw, "textDim", f"{mode}.panel"), f"{mode}.panel.textDim"
        ),
        "input": validate_colorish(require_str(panel_raw, "input", f"{mode}.panel"), f"{mode}.panel.input"),
        "accent": validate_colorish(
            opt_str(panel_raw, "accent", brand["accent"]), f"{mode}.panel.accent"
        ),
        "accent2": validate_colorish(
            opt_str(panel_raw, "accent2", rgba(accent_hex, 0.85) if is_hex(accent_hex) else brand["accent"]),
            f"{mode}.panel.accent2",
        ),
        "accentSoft": validate_colorish(
            opt_str(panel_raw, "accentSoft", accent["hoverBg"]), f"{mode}.panel.accentSoft"
        ),
        "shadow": validate_colorish(require_str(panel_raw, "shadow", f"{mode}.panel"), f"{mode}.panel.shadow"),
        "bubbleBg": validate_colorish(
            require_str(panel_raw, "bubbleBg", f"{mode}.panel"), f"{mode}.panel.bubbleBg"
        ),
        "bubbleText": validate_colorish(
            require_str(panel_raw, "bubbleText", f"{mode}.panel"), f"{mode}.panel.bubbleText"
        ),
    }

    modal_raw = require_dict(palette.get("modal"), f"{mode}.modal")
    modal = {
        "surface": validate_colorish(
            opt_str(modal_raw, "surface", surface["surface"]), f"{mode}.modal.surface"
        ),
        "border": validate_colorish(
            opt_str(modal_raw, "border", border["default"]), f"{mode}.modal.border"
        ),
        "text": validate_colorish(opt_str(modal_raw, "text", text["primary"]), f"{mode}.modal.text"),
        "textMuted": validate_colorish(
            opt_str(modal_raw, "textMuted", text["muted"]), f"{mode}.modal.textMuted"
        ),
    }

    skeleton_raw = require_dict(palette.get("skeleton"), f"{mode}.skeleton") if "skeleton" in palette else {}
    skeleton = {
        "base": validate_colorish(
            opt_str(skeleton_raw, "base", surface["surface3"]), f"{mode}.skeleton.base"
        ),
        "highlight": validate_colorish(
            opt_str(skeleton_raw, "highlight", rgba(accent_hex, 0.18) if is_hex(accent_hex) else brand["accent"]),
            f"{mode}.skeleton.highlight",
        ),
    }

    gradient_bg = validate_colorish(
        opt_str(
            palette,
            "gradientBg",
            (
                f"radial-gradient(1100px 580px at 10% 0%, {rgba(accent_hex, 0.16)}, transparent 56%), "
                f"radial-gradient(980px 540px at 92% 100%, {rgba(brand['400'], 0.12)}, transparent 58%), "
                f"radial-gradient(720px 420px at 55% 45%, rgba(88, 120, 190, 0.07), transparent 62%), "
                f"linear-gradient(180deg, {surface['offWhite']} 0%, {surface['background']} 42%, {surface['backgroundDeep']} 100%)"
                if is_hex(accent_hex) and is_hex(brand["400"])
                else surface["background"]
            ),
        ),
        f"{mode}.gradientBg",
    )

    return {
        "brand": brand,
        "status": status,
        "surface": surface,
        "text": text,
        "accent": accent,
        "border": border,
        "glass": glass,
        "shadow": shadow,
        "loader": loader,
        "panel": panel,
        "modal": modal,
        "skeleton": skeleton,
        "gradientBg": gradient_bg,
    }


def emit_vars(p: dict[str, Any], primary_token: str) -> list[str]:
    b, s, surf, t, a, border, g, sh, loader, panel, modal, sk = (
        p["brand"],
        p["status"],
        p["surface"],
        p["text"],
        p["accent"],
        p["border"],
        p["glass"],
        p["shadow"],
        p["loader"],
        p["panel"],
        p["modal"],
        p["skeleton"],
    )
    lines = [
        f"  --skyroom-brand-50: {b['50']};",
        f"  --skyroom-brand-100: {b['100']};",
        f"  --skyroom-brand-200: {b['200']};",
        f"  --skyroom-brand-300: {b['300']};",
        f"  --skyroom-brand-400: {b['400']};",
        f"  --skyroom-brand-500: {b['500']};",
        f"  --skyroom-brand-600: {b['600']};",
        f"  --skyroom-brand-700: {b['700']};",
        f"  --skyroom-accent: {b['accent']};",
        f"  --skyroom-accent-soft: {a['soft']};",
        f"  --skyroom-accent-border: {a['border']};",
        f"  --skyroom-accent-glow: {a['glow']};",
        f"  --skyroom-accent-hover-bg: {a['hoverBg']};",
        f"  --skyroom-accent-active-bg: {a['activeBg']};",
        f"  --skyroom-danger-soft: {s['dangerSoft']};",
        f"  --skyroom-danger-border: {s['dangerBorder']};",
        f"  --color-primary: {primary_token};",
        f"  --color-link: {primary_token};",
        f"  --color-success: {s['success']};",
        f"  --btn-primary-bg: {b['500']};",
        f"  --btn-primary-hover-bg: {b['400']};",
        f"  --btn-primary-active-bg: {b['600']};",
        f"  --btn-primary-border: {a['btnPrimaryBorder']};",
        f"  --btn-primary-color: {t['onBrand']};",
        f"  --btn-success-bg: {b['500']};",
        f"  --btn-success-border: {b['400']};",
        f"  --color-white: {t['white']};",
        f"  --color-off-white: {surf['offWhite']};",
        f"  --color-background: {surf['background']};",
        f"  --color-content-background: {surf['content']};",
        f"  --user-list-bg: {surf['userList']};",
        f"  --dropdown-bg: {surf['dropdown']};",
        f"  --toolbar-button-bg: {surf['toolbarButton']};",
        f"  --toolbar-list-bg: {surf['toolbarList']};",
        f"  --toolbar-list-bg-focus: {surf['toolbarListFocus']};",
        f"  --skyroom-text-primary: {t['primary']};",
        f"  --skyroom-text-secondary: {t['secondary']};",
        f"  --skyroom-text-muted: {t['muted']};",
        f"  --skyroom-text-on-brand: {t['onBrand']};",
        f"  --color-heading: {t['primary']};",
        f"  --color-text: {t['body']};",
        f"  --color-gray: {t['secondary']};",
        f"  --color-gray-dark: {t['primary']};",
        f"  --color-gray-label: {t['secondary']};",
        f"  --user-list-text: {t['primary']};",
        f"  --color-muted: {t['muted']};",
        f"  --palette-placeholder-text: {t['muted']};",
        f"  --list-item-bg-hover: {surf['listHover']};",
        f"  --btn-default-color: {t['primary']};",
        f"  --btn-default-bg: {surf['btnDefault']};",
        f"  --btn-default-ghost-color: {t['primary']};",
        f"  --btn-default-ghost-bg: {a['ghostBg']};",
        f"  --btn-default-ghost-border: {a['ghostBorder']};",
        f"  --toolbar-button-color: {t['primary']};",
        f"  --toolbar-list-color: {t['primary']};",
        f"  --system-message-font-color: {t['primary']};",
        f"  --color-gray-lightest: {surf['grayLightest']};",
        f"  --color-gray-lighter: {surf['grayLighter']};",
        f"  --color-gray-light: {surf['grayLight']};",
        f"  --pll-stats-border-color: {surf['grayLightest']};",
        f"  --color-blue-lightest: {a['blueLightest']};",
        f"  --color-overlay: {surf['overlay']};",
        f"  --webcam-background-color: {surf['webcam']};",
        f"  --webcam-placeholder-border: {a['webcamPlaceholderBorder']};",
        f"  --webcam-talking-background-color: {a['webcamTalking']};",
        f"  --skyroom-surface: {surf['surface']};",
        f"  --skyroom-surface-2: {surf['surface2']};",
        f"  --skyroom-surface-3: {surf['surface3']};",
        f"  --skyroom-border: {border['default']};",
        f"  --skyroom-border-strong: {border['strong']};",
        f"  --border-subtle: {border['subtle']};",
        f"  --border-emphasis: {border['emphasis']};",
        f"  --skyroom-panel-border-token: {border['emphasis']};",
        f"  --skyroom-glass: {g['glass']};",
        f"  --skyroom-glass-strong: {g['strong']};",
        f"  --skyroom-glass-blur: {g['blur']};",
        f"  --shadow-glow-sm: {sh['glowSm']};",
        f"  --shadow-glow-md: {sh['glowMd']};",
        f"  --skyroom-gradient-primary: {b['gradient']};",
        f"  --skyroom-gradient-primary-soft: {b['gradientSoft']};",
        f"  --skyroom-gradient-danger: {s['dangerGradient']};",
        f"  --skyroom-gradient-bg: {p['gradientBg']};",
        f"  --loader-bg: {surf['loader']};",
        f"  --loader-bullet: {loader['bullet']};",
        f"  --loader-ring: {loader['ring']};",
        f"  --loader-ring-active: {loader['ringActive']};",
        f"  --skyroom-modal-surface: {modal['surface']};",
        f"  --skyroom-modal-border: {modal['border']};",
        f"  --skyroom-modal-text: {modal['text']};",
        f"  --skyroom-modal-text-muted: {modal['textMuted']};",
        f"  --skyroom-skeleton-base: {sk['base']};",
        f"  --skyroom-skeleton-highlight: {sk['highlight']};",
        f"  --skyroom-bubble-bg: {panel['bubbleBg']};",
        f"  --skyroom-bubble-text: {panel['bubbleText']};",
        f"  --skyroom-bubble-border: {border['subtle']};",
    ]
    return lines


def emit_panel_vars(p: dict[str, Any]) -> list[str]:
    panel = p["panel"]
    return [
        f"  --skyroom-panel-bg: {panel['bg']};",
        f"  --skyroom-panel-solid: {panel['solid']};",
        f"  --skyroom-panel-border: {panel['border']};",
        f"  --skyroom-panel-divider: {panel['divider']};",
        f"  --skyroom-panel-header: {panel['header']};",
        f"  --skyroom-panel-text: {panel['text']};",
        f"  --skyroom-panel-text-muted: {panel['textMuted']};",
        f"  --skyroom-panel-text-dim: {panel['textDim']};",
        f"  --skyroom-panel-input: {panel['input']};",
        f"  --skyroom-panel-accent: {panel['accent']};",
        f"  --skyroom-panel-accent-2: {panel['accent2']};",
        f"  --skyroom-panel-accent-soft: {panel['accentSoft']};",
        f"  --skyroom-panel-shadow: {panel['shadow']};",
        f"  --skyroom-bubble-bg: {panel['bubbleBg']};",
        f"  --skyroom-bubble-text: {panel['bubbleText']};",
    ]


def compile_css(theme: dict[str, Any]) -> str:
    dark = resolve_palette("dark", theme["dark"])
    light = resolve_palette("light", theme["light"]) if theme.get("light") else None
    theme_id = theme["id"]
    theme_name = theme["name"]

    chunks: list[str] = [
        "/* =====================================================================",
        f"   SafeMeet theme override — {theme_name} ({theme_id})",
        f"   Generated by safemeet-theme-compile.py (schemaVersion={SCHEMA_VERSION})",
        "   Do not edit by hand on the BBB server; re-apply via installer.",
        "   ===================================================================== */",
        "",
        ":root,",
        ':root[data-theme="dark"],',
        'html[data-skyroom="true"] {',
        *emit_vars(dark, "var(--skyroom-brand-400)"),
        "}",
        "",
        '#layout[data-skyroom-column="true"],',
        'html[data-skyroom="true"] #layout[data-skyroom-column="true"] {',
        *emit_panel_vars(dark),
        "}",
        "",
        "/* Whiteboard / TLDraw selection tokens */",
        '#layout[data-skyroom-column="true"] .tl-theme__dark,',
        '#layout[data-skyroom-column="true"] .tlui-theme__dark {',
        f"  --color-selected: {dark['accent']['soft']} !important;",
        f"  --color-selected-contrast: {dark['text']['white']} !important;",
        "}",
        "",
    ]

    if light:
        chunks.extend(
            [
                ':root[data-theme="light"],',
                'html[data-skyroom="true"][data-theme="light"] {',
                *emit_vars(light, "var(--skyroom-brand-500)"),
                "}",
                "",
                'html[data-theme="light"] #layout[data-skyroom-column="true"] {',
                *emit_panel_vars(light),
                "}",
                "",
            ]
        )

    return "\n".join(chunks).rstrip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Compile SafeMeet theme JSON to CSS override")
    parser.add_argument("input", type=Path, help="Path to theme JSON")
    parser.add_argument("-o", "--output", type=Path, help="Write CSS to this path")
    parser.add_argument("--validate-only", action="store_true", help="Validate JSON only")
    args = parser.parse_args()

    if not args.input.is_file():
        die(f"Theme file not found: {args.input}")

    theme = load_theme(args.input)
    # Force full resolve/validation for dark (+ light if present)
    resolve_palette("dark", theme["dark"])
    if theme.get("light"):
        resolve_palette("light", theme["light"])

    if args.validate_only:
        print(f"[safemeet-theme] OK: {theme['id']} ({theme['name']})")
        return

    css = compile_css(theme)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(css, encoding="utf-8")
        print(f"[safemeet-theme] Wrote {args.output}")
    else:
        sys.stdout.write(css)


if __name__ == "__main__":
    main()
