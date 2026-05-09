"""
Remove sim functions from each HTML file and replace with import from sim/core.js.
Also renames old function names to canonical names where they differ.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ── bracket-balanced function-body finder ──────────────────────────────────────

def find_function_span(src, fn_name, search_start=0, search_end=None):
    """Return (start, end) of `function fn_name(...)  { ... }` in src."""
    if search_end is None: search_end = len(src)
    # match `function NAME(` — may have whitespace, may be on its own line
    pat = re.compile(rf'(?m)^function\s+{re.escape(fn_name)}\s*\(')
    m = pat.search(src, search_start, search_end)
    if not m:
        return None
    # Find opening `{`
    brace_start = src.index('{', m.end(), search_end)
    depth = 0
    in_str = False; sc = ''
    i = brace_start
    while i < search_end:
        c = src[i]
        if in_str:
            if c == '\\' and i+1 < search_end: i += 2; continue
            if c == sc: in_str = False
            i += 1; continue
        if c in ('"', "'"): in_str = True; sc = c; i += 1; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                # eat trailing newline
                if end < search_end and src[end] == '\n': end += 1
                return m.start(), end
        i += 1
    return None


def find_oneliner_span(src, fn_name, search_start=0, search_end=None):
    """Return (start, end) of a const/function single-liner ending in `;`."""
    if search_end is None: search_end = len(src)
    pat = re.compile(rf'(?m)^function\s+{re.escape(fn_name)}\b.*\n')
    m = pat.search(src, search_start, search_end)
    if m:
        return m.start(), m.end()
    return None


def remove_functions(src, names, search_start=0, search_end=None):
    """Remove all listed function definitions. Returns modified src and count."""
    if search_end is None: search_end = len(src)
    spans = []
    for name in names:
        span = find_function_span(src, name, search_start, search_end)
        if not span:
            # Try one-liner
            span = find_oneliner_span(src, name, search_start, search_end)
        if span:
            spans.append(span)
        else:
            print(f'  WARN: function {name} not found')
    # Remove back to front
    spans.sort(key=lambda s: s[0], reverse=True)
    for start, end in spans:
        src = src[:start] + src[end:]
    return src, len(spans)


def replace_all(src, old, new):
    return src.replace(old, new)


# ── SIM IMPORT LINE ──────────────────────────────────────────────────────────

SIM_IMPORT = """import {
  setSimContext, mulberry32, whash, uniformDev, applyRecoilDecay,
  recoilGroup, baseRecoilGroup, recoilAmount, recoilVariation,
  selectedRecoilAmountFor, selectedRecoilVariationFor,
  spreadBounds, spreadDynamics, selectedSpreadIncFor,
  simulateBloom, genRecoilPts,
} from './sim/core.js';"""


def inject_after_line_containing(src, fragment, text):
    idx = src.find(fragment)
    if idx == -1: raise ValueError(f'Anchor not found: {fragment!r}')
    eol = src.find('\n', idx)
    return src[:eol+1] + text + '\n' + src[eol+1:]


# ══════════════════════════════════════════════════════════════════════════════
# index.html
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== index.html ===')
src = (ROOT / 'index.html').read_text(encoding='utf-8')

# Bound to main module script only
mod_start = src.find('<script type="module">')
mod_end   = src.rfind('</script>')

# 1. Remove duplicate functions
TO_REMOVE_INDEX = [
    'mulberry32', 'whash', 'uniformDev', 'applyRecoilDecay',
    'recoilGroup', 'baseRecoilGroup',
    'groupRecoilAmount', 'groupRecoilVariation',  # renamed → recoilAmount / recoilVariation
    'selectedRecoilAmountFor', 'selectedRecoilVariationFor',
    'spreadKeyForState',           # helper only used by removed fns
    'selectedSpreadBoundsFor',     # renamed → spreadBounds
    'selectedSpreadDynamicsFor',   # renamed → spreadDynamics
    'selectedSpreadIncFor',
    'genRecoilPts', 'simulateBloom',
]
src, removed = remove_functions(src, TO_REMOVE_INDEX, mod_start, mod_end)
print(f'  Removed {removed} functions')

# 2. Rename surviving call sites (only in module script, not HTML)
# groupRecoilAmount → recoilAmount
src = src.replace('groupRecoilAmount(', 'recoilAmount(')
src = src.replace('groupRecoilVariation(', 'recoilVariation(')
# selectedSpreadBoundsFor → spreadBounds
src = src.replace('selectedSpreadBoundsFor(', 'spreadBounds(')
# selectedSpreadDynamicsFor → spreadDynamics
src = src.replace('selectedSpreadDynamicsFor(', 'spreadDynamics(')
print('  Renamed call sites')

# 3. Add import after the ammo destructuring line (end of fetch block)
src = inject_after_line_containing(
    src, "const { AMMOS, WEAPON_AMMO } = _ammo;", SIM_IMPORT)
print('  Injected import')

# 4. setSimContext init — inject after the HP_HS_HIGH = new Set line
INIT_CTX_INDEX = """setSimContext({
  aimState: recoilAim, stanceState: recoilStance,
  RECOIL_DEC, RECOIL_DEC_EXP, RECOIL_DEC_TEXP,
  compensationFn: selectedCompensationLevel,
});"""
src = inject_after_line_containing(src, 'const HP_HS_HIGH = new Set(_HP_HS_HIGH)', INIT_CTX_INDEX)
print('  Injected setSimContext init')

# 5. Update setRecoilAim and setRecoilStance to sync context
src = src.replace(
    "function setRecoilAim(aim) {\n  recoilAim=aim==='hip'?'hip':'ads';",
    "function setRecoilAim(aim) {\n  recoilAim=aim==='hip'?'hip':'ads';\n  setSimContext({ aimState: recoilAim });"
)
src = src.replace(
    "function setRecoilStance(stance) {\n  recoilStance=stance==='move'?'move':'stand';",
    "function setRecoilStance(stance) {\n  recoilStance=stance==='move'?'move':'stand';\n  setSimContext({ stanceState: recoilStance });"
)
print('  Patched setRecoilAim / setRecoilStance')

(ROOT / 'index.html').write_text(src, encoding='utf-8')
print(f'  Done. Lines: {src.count(chr(10))}')


# ══════════════════════════════════════════════════════════════════════════════
# preview_bloom.html
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== preview_bloom.html ===')
src = (ROOT / 'preview_bloom.html').read_text(encoding='utf-8')

mod_start = src.find('<script type="module">')
mod_end   = src.rfind('</script>')

TO_REMOVE_BLOOM = [
    'mulberry32', 'whash', 'uniformDev', 'applyRecoilDecay',
    'recoilGroup', 'baseRecoilGroup', 'recoilAmount', 'recoilVariation',
    'selectedRecoilAmountFor', 'selectedRecoilVariationFor',
    'spreadBounds', 'spreadDynamics', 'selectedSpreadIncFor',
    'simulateBloom', 'genRecoilPts',
    'selectedCompensationLevel',  # stub — replaced by compensationFn in context
]
src, removed = remove_functions(src, TO_REMOVE_BLOOM, mod_start, mod_end)
print(f'  Removed {removed} functions')

# Add import after last fetch line
src = inject_after_line_containing(
    src, "await fetch('./data/recoil_decay.json')", SIM_IMPORT)
print('  Injected import')

# setSimContext init — inject right after the aimState/stanceState let declarations
INIT_CTX_BLOOM = """setSimContext({
  aimState, stanceState,
  RECOIL_DEC, RECOIL_DEC_EXP, RECOIL_DEC_TEXP,
  compensationFn: () => 0,
});"""
src = inject_after_line_containing(src, 'let stanceState =', INIT_CTX_BLOOM)
print('  Injected setSimContext init')

# Patch aim/stance change event handlers (they update let vars at lines 867/877)
# preview_bloom uses dataset buttons with addEventListener — patch those assignments
src = src.replace(
    "    aimState = btn.dataset.aim;",
    "    aimState = btn.dataset.aim;\n    setSimContext({ aimState });"
)
src = src.replace(
    "    stanceState = btn.dataset.stance;",
    "    stanceState = btn.dataset.stance;\n    setSimContext({ stanceState });"
)
print('  Patched aim/stance event handlers')

(ROOT / 'preview_bloom.html').write_text(src, encoding='utf-8')
print(f'  Done. Lines: {src.count(chr(10))}')


# ══════════════════════════════════════════════════════════════════════════════
# preview_distance.html
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== preview_distance.html ===')
src = (ROOT / 'preview_distance.html').read_text(encoding='utf-8')

# The module script starts AFTER the text/plain block
plain_close  = src.find('</script>')
mod_start    = src.find('<script type="module">', plain_close)
mod_end      = src.rfind('</script>')

TO_REMOVE_DIST = [
    'mulberry32', 'whash', 'uniformDev', 'applyRecoilDecay',
    'recoilGroup', 'baseRecoilGroup', 'recoilAmount', 'recoilVariation',
    'selectedRecoilAmountFor', 'selectedRecoilVariationFor',
    'spreadBounds', 'spreadDynamics',
    'simulateBloom', 'genRecoilPts',
]
src, removed = remove_functions(src, TO_REMOVE_DIST, mod_start, mod_end)
print(f'  Removed {removed} functions')

# Also remove selectedSpreadIncFor from dist module — it was absent originally but
# now exists if it was added. Check first:
span = find_function_span(src, 'selectedSpreadIncFor', mod_start, mod_end)
if span:
    src = src[:span[0]] + src[span[1]:]
    print('  Removed selectedSpreadIncFor (was present)')
else:
    print('  selectedSpreadIncFor not in module (expected)')

# Add import after EMBEDDED_WEAPONS fetch line
src = inject_after_line_containing(
    src, "await fetch('./data/weapons.json')", SIM_IMPORT)
print('  Injected import')

# setSimContext init — inject after stanceState declaration
INIT_CTX_DIST = """setSimContext({
  aimState, stanceState,
  RECOIL_DEC, RECOIL_DEC_EXP, RECOIL_DEC_TEXP,
  compensationFn: selectedCompensationLevel,
});"""
src = inject_after_line_containing(src, 'let stanceState =', INIT_CTX_DIST)
print('  Injected setSimContext init')

# Patch setAim / setStance to sync context
src = src.replace(
    'function setAim(value) {\n  aimState = value;',
    'function setAim(value) {\n  aimState = value;\n  setSimContext({ aimState });'
)
src = src.replace(
    'function setStance(value) {\n  stanceState = value;',
    'function setStance(value) {\n  stanceState = value;\n  setSimContext({ stanceState });'
)
print('  Patched setAim / setStance')

(ROOT / 'preview_distance.html').write_text(src, encoding='utf-8')
print(f'  Done. Lines: {src.count(chr(10))}')
