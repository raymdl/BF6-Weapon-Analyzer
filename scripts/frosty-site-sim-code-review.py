"""Review every line in the captured sim/*.js lexical inventory.

This is a research ledger. It does not modify simulator behavior.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import re
from pathlib import Path


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def repairs_mojibake(text):
    try:
        return text.encode('cp1252').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text


def js_braces(line, in_block_comment=False):
    """Count structural braces while ignoring comments and quoted strings."""
    opens = closes = 0
    i = 0
    quote = None
    while i < len(line):
        if in_block_comment:
            end = line.find('*/', i)
            if end < 0:
                return opens, closes, True
            i = end + 2
            in_block_comment = False
            continue
        ch = line[i]
        nxt = line[i + 1] if i + 1 < len(line) else ''
        if quote:
            if ch == '\\':
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch == '/' and nxt == '/':
            break
        if ch == '/' and nxt == '*':
            in_block_comment = True
            i += 2
            continue
        if ch in ('"', "'", '`'):
            quote = ch
        elif ch == '{':
            opens += 1
        elif ch == '}':
            closes += 1
        i += 1
    return opens, closes, in_block_comment


FAMILIES = {
    'sim/ballistics.js': {
        'isProjectileModel': ('project-validation', 'projectile-model-guard', 'frosty-site-equations-2026-09-23.json#ballistics',
                              'Site decides which records are eligible for this model; this predicate is not an in-game projectile classifier.'),
        'flightTimeAtDistance': ('model-equation', 'level-flight-drag', 'frosty-site-equations-2026-09-23.json#ballistics',
                                 'Closed-form Analyzer drag equation; input speed/drag source is separate and native flight formula is unproved.'),
        'derivative': ('model-equation', 'gravity-drag-derivative', 'frosty-site-equations-2026-09-23.json#ballistics',
                       'Vector ODE chosen by site; Frosty projectile inputs do not prove native gravity/drag law.'),
        'rk4Step': ('project-numerical-method', 'rk4-integrator', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                    'Runge-Kutta integration is Analyzer numerical method, not an engine algorithm claim.'),
        'trajectoryAtDistance': ('model-equation', 'trajectory-solver', 'frosty-site-equations-2026-09-23.json#ballistics',
                                 'Numerical trajectory solver is an Analyzer model; native flight path requires runtime/recording verification.'),
        'zeroRelativeVerticalOffset': ('model-equation', 'zeroing-solver', 'frosty-site-equations-2026-09-23.json#ballistics',
                                       'Bisection bounds/iteration and aim correction are site rules. Default game zero selection and native correction remain unproved.'),
    },
    'sim/core.js': {
        'mulberry32': ('project-implementation', 'deterministic-rng', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                       'Deterministic site-side sampling only; no Frosty source is expected and this is not evidence of game RNG.'),
        'whash': ('project-implementation', 'deterministic-rng', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                  'String seed hash for reproducibility; no game RNG claim.'),
        'uniformDev': ('model-equation', 'recoil-direction-sampling', 'frosty-site-equations-2026-09-23.json#recoil recovery',
                       'Uniform direction variation is the Analyzer model choice; a matching source variation bound does not establish native sampling distribution.'),
        'recoilRecoveryWeight': ('model-equation', 'recoil-recovery', 'frosty-site-equations-2026-09-23.json#recoil recovery',
                                 'Site continuous recovery approximation; native spring/fade/decrease fields are not bound to these operands and no runtime opcode/consumer proof exists.'),
        'recoverRecoilAxis': ('model-equation', 'recoil-recovery', 'frosty-site-equations-2026-09-23.json#recoil recovery',
                              'Per-axis closed-form special branch / iterative approximation is site logic; native recovery equation remains unproved.'),
        'applyRecoilDecay': ('model-equation', 'recoil-recovery', 'frosty-site-equations-2026-09-23.json#recoil recovery',
                             'The equation and 1 ms integration are site choices. Current Frosty source receipts support stored operands, not equation/clock/reset behavior.'),
        'requiredRecoilGroup': ('site-data-resolver', 'recoil-input-selection', 'frosty-site-recoil-2026-09-23.json',
                                'Site input selection paths and stored operands are audited; active native selector/state binding remains unresolved.'),
        'recoilGroup': ('site-data-resolver', 'recoil-input-selection', 'frosty-site-recoil-2026-09-23.json',
                        'Site selector behavior; source value matches do not prove selected native aim state.'),
        'baseRecoilGroup': ('site-data-resolver', 'recoil-input-selection', 'frosty-site-recoil-2026-09-23.json',
                            'Site selector behavior; source value matches do not prove native base group.'),
        'weaponRpm': ('site-data-resolver', 'shot-cadence', 'frosty-site-timing-2026-09-23.json',
                      'Current source cadence fields are partly matched; bolt-action, selector, burst, and pump runtime cadence remain distinct.'),
        'recoilAmount': ('site-data-resolver', 'recoil-input-selection', 'frosty-site-recoil-2026-09-23.json',
                         'Stored amount operands do not establish a native consumer.'),
        'recoilVariation': ('site-data-resolver', 'recoil-input-selection', 'frosty-site-recoil-2026-09-23.json',
                            'Stored variation operands do not establish native distribution.'),
        'selectedRecoilAmountBeforePlatformFor': ('site-data-resolver', 'recoil-composition', 'frosty-site-recoil-2026-09-23.json',
                                                   'Analyzer source/tier composition rule; active native order/consumer unresolved.'),
        'selectedRecoilAmountFor': ('site-data-resolver', 'recoil-composition', 'frosty-site-recoil-2026-09-23.json',
                                    'Analyzer source/tier composition rule; active native order/consumer unresolved.'),
        'selectedRecoilVariationFor': ('site-data-resolver', 'recoil-composition', 'frosty-site-recoil-2026-09-23.json',
                                       'Analyzer source/tier composition rule; active native order/consumer unresolved.'),
        'sampleSpreadRadius': ('model-equation', 'spread-distribution', 'frosty-site-equations-2026-09-23.json#spread growth/recovery and distribution',
                               'Radial random distribution is an Analyzer model choice; Frosty dispersion values do not prove native sampling.'),
        'spreadBounds': ('site-data-resolver', 'spread-input-selection', 'frosty-site-spread-reviewed-2026-09-23.json',
                         'Site state/index resolution is code behavior; exact operands are separately joined, but native stance/aim selectors remain unproved.'),
        'spreadDynamics': ('site-data-resolver', 'spread-input-selection', 'frosty-site-spread-reviewed-2026-09-23.json',
                           'Maps stored values into Analyzer states; names/equal values do not prove native field semantics.'),
        'selectedSpreadIncFor': ('site-data-resolver', 'spread-input-selection', 'frosty-site-spread-reviewed-2026-09-23.json',
                                 'Site source resolver; native accumulation not proven.'),
        'hasCycleCadence': ('site-model-rule', 'fire-cadence', 'frosty-site-equations-2026-09-23.json#attachment composition',
                            'Burst/pump handling is a site mode rule; mode values are site data, not runtime activation proof.'),
        'shotIntervalAfter': ('model-equation', 'fire-cadence', 'frosty-site-equations-2026-09-23.json#attachment composition',
                              'Cadence derivation and shot timing are Analyzer rules; several weapon exceptions require runtime/capture evidence.'),
        'isBurstGapAfter': ('model-equation', 'fire-cadence', 'frosty-site-equations-2026-09-23.json#attachment composition',
                            'Gap segmentation is site behavior; native burst-cycle timing remains unverified.'),
        'spreadRecoveries': ('site-data-resolver', 'spread-recovery-inputs', 'frosty-site-spread-reviewed-2026-09-23.json',
                             'Stored firing/not-firing operands are separate; native mode transition binding is unresolved.'),
        'applySpreadRecovery': ('model-equation', 'spread-recovery', 'frosty-site-equations-2026-09-23.json#spread growth/recovery and distribution',
                                'Stepped recovery/clamping is the site equation, not native engine proof.'),
        'effectiveSpreadMax': ('project-metric', 'spread-display-metric', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                               '50-increase statistic for the Analyzer display; not a game maximum.'),
        'simulateSpread': ('model-equation', 'spread-recovery-and-simulation', 'frosty-site-equations-2026-09-23.json#spread growth/recovery and distribution',
                           'Step timing, clamp and burst gap behavior are modeled. Controlled repeated recordings are needed to establish actual recovery/cadence.'),
        'genRecoilPts': ('model-equation', 'recoil-output', 'frosty-site-equations-2026-09-23.json#recoil recovery',
                         'Site kick/compensation/delivery and recovery sequence; exact CameraRecoil/native camera effect is not proven. Recording predictions must distinguish amount, direction distribution, delivery, recovery and aim-state changes.'),
        'validateWeaponSimulation': ('project-validation', 'simulation-input-guards', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                                     'Availability guard for missing/invalid site inputs; not a game mechanic.'),
        'setSimContext': ('site-runtime-context', 'simulation-context-injection', 'frosty-site-equations-2026-09-23.json#recoil recovery|spread growth/recovery and distribution',
                          'Context wiring determines callbacks and aim/stance state. Defaults must be checked with the app initializer; no values here prove native state binding.'),
    },
    'sim/weapon-attributes.js': {
        'createWeaponAttributeModel': ('model-equation', 'weapon-attributes', 'docs/WEAPON_ATTRIBUTES_MODEL.md; frosty-site-equations-2026-09-23.json#control attribute|hipfire attribute|precision attribute|mobility attribute',
                                       'Control coefficients have delegate trace candidates; Hipfire is partial decode (5/6 panel check, DB-12 mismatch); Precision table values match but lookup policy is site checker logic; Mobility coefficients are fitted/inferred. Native delegate semantics, all inputs, and branch execution are not fully established.'),
        'exactRecoil': ('site-data-resolver', 'attribute-recoil-inputs', 'docs/WEAPON_ATTRIBUTES_MODEL.md; frosty-site-equations-2026-09-23.json#control attribute|precision attribute',
                        'Resolves source-derived recoil tier sums for score calculation; source inputs are separate from inferred score formula and selector behavior.'),
        'mobilityIndices': ('site-data-resolver', 'attribute-mobility-inputs', 'docs/WEAPON_ATTRIBUTES_MODEL.md; frosty-site-equations-2026-09-23.json#mobility attribute',
                            'Resolves indices and bounds; coefficients remain inferred, and input indices do not establish the native scoring delegate.'),
        'keys': ('site-data-resolver', 'precision-table-keys', 'docs/WEAPON_ATTRIBUTES_MODEL.md; frosty-site-equations-2026-09-23.json#precision attribute',
                 'Reconstructs exact/near Precision lookup keys; tolerance and fallback are Analyzer checker rules, not proven game lookup semantics.'),
        'lookup': ('site-model-rule', 'precision-table-selection', 'docs/WEAPON_ATTRIBUTES_MODEL.md; frosty-site-equations-2026-09-23.json#precision attribute',
                   'Source table values are matched, but selection tolerance/tie/fallback rules are checker logic and remain native-runtime unproved.'),
    },
    'sim/damage.js': {
        'resolveHitMultipliers': ('site-data-resolver', 'hit-zone-and-ammo-inputs', 'frosty-site-equations-2026-09-23.json#damage',
                                  'Selects site hit multipliers from data; source leaf reviews are separate, and runtime selection semantics require gameplay evidence.'),
        'requireMultiplier': ('project-validation', 'damage-input-guard', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                              'Rejects missing/invalid values; site validation, not a game rule.'),
        'damageAtRange': ('site-model-rule', 'damage-curve-interpolation', 'docs/DAMAGE_BALLISTICS.md; frosty-site-equations-2026-09-23.json#damage',
                          'Damage curve source data is independently audited; piecewise linear interpolation and endpoint clamp are Analyzer policy.'),
        'damagePerShotAtRange': ('site-model-rule', 'damage-per-shot', 'docs/DAMAGE_BALLISTICS.md; frosty-site-equations-2026-09-23.json#damage',
                                 'Ammo and curve composition is Analyzer behavior; tier source does not establish all runtime modes.'),
        'zoneMultiplierForWeapon': ('site-data-resolver', 'hit-zone-multiplier-selection', 'frosty-site-equations-2026-09-23.json#damage',
                                    'Selects a stored multiplier for display calculation; native hit zone selection remains unproved.'),
        'bulletsToKillWithHits': ('site-model-rule', 'shot-count-arithmetic', 'frosty-site-equations-2026-09-23.json#damage',
                                  'Shot-count and epsilon handling are Analyzer calculation; does not prove hit registration or native rounding.'),
        'bulletsToKillAtRange': ('site-model-rule', 'shots-to-kill', 'frosty-site-equations-2026-09-23.json#damage',
                                 'Combines site damage curve and zone arithmetic; recordings validate selected cases only.'),
    },
    'sim/applyAttachments.js': {
        'floorVelocityDisplay': ('project-display-model', 'velocity-display-rounding', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                                 'Rounds a displayed velocity; does not alter source value or assert game precision.'),
        'byId': ('project-resolver', 'attachment-lookup', 'frosty-site-equations-2026-09-23.json#attachment composition',
                 'Catalog identity lookup only; exact source identity records are separate.'),
        'hasOwn': ('project-implementation', 'object-property-guard', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                   'JavaScript own-property guard; no game semantic claim.'),
        'millisecondsToSeconds': ('site-unit-conversion', 'draw-time-units', 'frosty-site-draw-2026-09-23.json',
                                  'Site unit conversion. Source milliseconds/seconds evidence is joined separately; gameplay phase semantics remain unresolved.'),
        'invalidDrawTime': ('project-validation', 'draw-time-guard', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                            'Unavailable-result guard for invalid timing data, not a game rule.'),
        'integerField': ('site-data-resolver', 'selector-index-validation', 'frosty-site-equations-2026-09-23.json#attachment composition',
                         'Validates integer selectors used by the site; source selector match is not proof of native consumption.'),
        'clampTierCoordinate': ('site-resolver-rule', 'tier-index-clamp', 'docs/ATTACHMENT_MODEL.md; frosty-site-equations-2026-09-23.json#attachment composition',
                                'Analyzer clamps source tier coordinates; native out-of-range behavior is not established.'),
        'resolveDrawTime': ('site-resolver-rule', 'draw-time-selection', 'frosty-site-draw-2026-09-23.json',
                            'Current-build DTA table leaves are source matched, but this selector/interpolation and gameplay transition completion remain Analyzer rules.'),
        'resolveAmmoVelocity': ('site-resolver-rule', 'ammo-velocity-composition', 'docs/ATTACHMENT_MODEL.md; frosty-site-equations-2026-09-23.json#attachment composition',
                                'Source ammo values are separate; multiplication/rounding/order are Analyzer composition rules.'),
        'resolveBarrelVelocity': ('site-resolver-rule', 'barrel-velocity-composition', 'docs/ATTACHMENT_MODEL.md; frosty-site-equations-2026-09-23.json#attachment composition',
                                  'Source modifiers are separate from site composition and rounding rules.'),
        'resolveReloadTiming': ('site-resolver-rule', 'reload-timing-composition', 'docs/ATTACHMENT_MODEL.md; frosty-site-equations-2026-09-23.json#attachment composition',
                                'Modifier and speed multipliers are source evidence; ordering/phase choice is Analyzer rule and needs runtime proof.'),
        'setAttachmentContext': ('site-runtime-context', 'attachment-context-injection', 'sim/applyAttachments.js; app initializer required',
                                 'Controls resolver context. App-initialized tables/functions determine actual site outputs; no native-state claim.'),
        'applyAttachments': ('site-resolver-rule', 'attachment-composition', 'docs/ATTACHMENT_MODEL.md; frosty-site-equations-2026-09-23.json#attachment composition',
                             'Some operands have source receipts. Tier shifts, operation order, defaults, clamp, overrides and linked modifiers are Analyzer composition; native ordering/consumption requires controlled paired-build captures.'),
        'wLabel': ('project-display-model', 'weapon-label-projection', 'frosty-site-weapon-labels-2026-09-23.json',
                   'Builds Analyzer label from selected attachments; source UI/name identity is separately audited.'),
    },
    'sim/loadout.js': {
        '*': ('project-resolver', 'loadout-selection', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
              'Catalog filtering, shared-mount resolution, and defaults are Analyzer selection rules over data. Exact data leaves are separately audited; this code does not prove in-game default selection or attachability.'),
    },
    'sim/attachments.js': {
        '*': ('project-resolver', 'attachment-context', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
              'Context/getter glue for the site resolver. It contributes no independent Frosty scalar or native mechanic.'),
    },
    'sim/required-data.js': {
        '*': ('project-validation', 'required-data-guards', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
              'Missing/invalid-data reporting and guards are Analyzer behavior; no Frosty source expected.'),
    },
    'sim/share-state.js': {
        '*': ('project-serialization', 'share-url-codec', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
              'Encoding, range checks and compatibility defaults are URL schema implementation. No Frosty source or gameplay meaning expected.'),
    },
    'sim/target.js': {
        '*': ('project-display-model', 'target-geometry-and-summary', 'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
              'Target pixel geometry, zone mapping, aim-point and marker display are Analyzer geometry choices. Any damage result still depends on separately reviewed damage/hit-zone inputs; no engine targeting behavior claimed.'),
    },
}


def context_map(path, lines):
    contexts = {}
    brace_depth = 0
    in_comment = False
    stack = []
    function_re = re.compile(r'^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\b')
    for number, line in enumerate(lines, 1):
        match = function_re.match(line)
        if match:
            stack.append((match.group(1), brace_depth))
        contexts[number] = stack[-1][0] if stack else None
        opens, closes, in_comment = js_braces(line, in_comment)
        brace_depth += opens - closes
        while stack and brace_depth <= stack[-1][1]:
            stack.pop()
    return contexts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--inventory', type=Path, required=True)
    ap.add_argument('--numeric-classifications', type=Path, required=True)
    ap.add_argument('--detail', type=Path, required=True)
    ap.add_argument('--summary', type=Path, required=True)
    args = ap.parse_args()
    repo = Path(__file__).resolve().parents[1]
    rows = [json.loads(line) for line in args.inventory.read_text(encoding='utf-8').splitlines() if line]
    numeric = {(r['siteFile'], r['line']): r for r in (json.loads(line) for line in args.numeric_classifications.read_text(encoding='utf-8').splitlines() if line)}
    inventory_by_key = {(r['siteFile'], r['line']): r for r in rows}
    assert len(inventory_by_key) == len(rows)
    numeric_line_mismatches = []
    for key, entry in numeric.items():
        assert key in inventory_by_key, key
        for token in entry['numericCandidates']:
            if token not in inventory_by_key[key]['code']:
                numeric_line_mismatches.append({'siteFile': key[0], 'line': key[1], 'token': token,
                                                'code': inventory_by_key[key]['code']})
    files = sorted({r['siteFile'] for r in rows})
    source_info, source_lines, contexts = {}, {}, {}
    inventory_line_diffs = []
    for file in files:
        p = repo / file
        lines = p.read_text(encoding='utf-8').splitlines()
        indexed = [r for r in rows if r['siteFile'] == file]
        for r in indexed:
            actual = lines[r['line'] - 1]
            if actual != r['code']:
                agreement = 'exact-after-cp1252-utf8-mojibake-repair' if actual == repairs_mojibake(r['code']) else 'source-line-diff'
                inventory_line_diffs.append({'siteFile': file, 'line': r['line'], 'agreement': agreement,
                                             'inventoryCode': r['code'], 'currentSourceCode': actual})
        source_lines[file] = lines
        contexts[file] = context_map(file, lines)
        source_info[file] = {'path': str(p.resolve()), 'sha256': sha(p), 'lines': len(lines)}

    counts, family_counts, per_file = Counter(), Counter(), defaultdict(Counter)
    args.detail.parent.mkdir(parents=True, exist_ok=True)
    with args.detail.open('w', encoding='utf-8', newline='\n') as out:
        for row in rows:
            file, line = row['siteFile'], row['line']
            fn = contexts[file].get(line)
            family = FAMILIES[file]
            if file == 'sim/applyAttachments.js' and 428 <= line <= 432:
                if line == 431:
                    entry = ('site-source-candidate', 'spotting-world-base',
                             'frosty-site-spotting-2026-09-23.json#sourceCoverage.weaponBases; spotting-base-range-trace-2026-09-23.json',
                             'WB Field_5ebda408/Field_9918e670 is a raw-byte-verified world-base candidate: 61/63 site WBs store 54 m; M45A1 and Skorpion store 27 m. The Analyzer literal remains 54 m for all. Native consumption/modifier composition is unproved; source prediction for the two outliers is 27 m if the candidate is consumed.')
                elif line == 432:
                    entry = ('site-source-candidate', 'spotting-minimap-base',
                             'frosty-site-spotting-2026-09-23.json#sourceCoverage.weaponBases; spotting-base-range-trace-2026-09-23.json',
                             'WB Field_5ebda408/Field_31022dc5 is a raw-byte-verified minimap-base candidate: 61/63 site WBs store 150 m; M45A1 and Skorpion store 64.285713 m. The Analyzer literal remains 150 m for all. Native consumption/modifier composition is unproved; source prediction for the two outliers is 64.285713 m if the candidate is consumed.')
                else:
                    entry = ('source-comment-or-site-claim', 'spotting-base-candidate',
                             'frosty-site-spotting-2026-09-23.json#sourceCoverage.weaponBases',
                             'Code comment describes the current site model; source candidates and native limits are captured in the spotting source receipt.')
            else:
                entry = family.get(fn, family.get('*'))
            if entry:
                kind, group, citation, limit = entry
            else:
                code = row['code'].strip()
                module_entry = None
                if file == 'sim/core.js' and (code.startswith(('let _ctx =', 'aimState:', 'stanceState:', 'RECOIL_DEC:', 'RECOIL_DEC_EXP:', 'RECOIL_DEC_TEXP:', 'compensationFn:', 'platformRecoilMultFn:')) or (line == 39 and code == '};')):
                    module_entry = ('site-runtime-context', 'simulation-context-defaults',
                        'sim/core.js:setSimContext; app initializer required',
                        'Site-side defaults for simulator callbacks/state. Determine app-provided overrides before interpreting an output; not native-default proof.')
                elif file == 'sim/core.js' and code.startswith(('const RECOIL_TIME_STEP', 'export const SPREAD_EFFECTIVE_MAX_SHOTS', 'export const SPREAD_BAR_SCALE', 'export const SPREAD_TIME_STEP')):
                    module_entry = ('project-model-parameter', 'recoil-spread-integration-and-display',
                        'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                        'Numerical step or presentation scale selected by the Analyzer; no game-engine equivalent is claimed.')
                elif file == 'sim/core.js' and code.startswith('const hasCycleCadence'):
                    module_entry = ('site-model-rule', 'fire-cadence',
                        'frosty-site-equations-2026-09-23.json#attachment composition',
                        'Analyzer mode classification for burst/pump cadence; mode labels do not prove native activation/timing.')
                elif file == 'sim/applyAttachments.js' and (code.startswith(('let _ctx =', 'MUZZLES:', 'AMMO:', 'MUZZLES_BY_ID:', 'AMMO_BY_ID:', 'RECOIL_MULT:', 'COLLATERAL_MULT_OVERRIDE:', 'MOVING_ACC_TIERS:', 'ADS_SPD_TIERS:', 'DRAW_TIME_TABLES:', 'RELOAD_SPEED_MULTIPLIERS:', 'VELOCITY_LADDER:', 'HEALTH_REGEN_DELAY_S:')) or (line == 48 and code == '};')):
                    module_entry = ('site-runtime-context', 'attachment-resolver-context-defaults',
                        'frosty-site-balance-operands-2026-09-23.json; frosty-site-recoil-2026-09-23.json; frosty-site-constants-2026-09-23.json',
                        'Resolver context placeholders/defaults; actual app context can override them. Per-leaf input receipts source several stored values, but the literal/fallback and native consumption must not be conflated.')
                elif file == 'sim/applyAttachments.js' and code.startswith('export const VELOCITY_DISPLAY_EPSILON'):
                    module_entry = ('project-display-model', 'velocity-display-epsilon',
                        'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                        'Floating-point display threshold only; it is not a game velocity constant.')
                elif file == 'sim/ballistics.js' and code.startswith(('const MAX_STEP_SECONDS', 'const MAX_FLIGHT_SECONDS')):
                    module_entry = ('project-numerical-method', 'ballistics-solver-controls',
                        'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                        'Numerical integration timestep/flight cap selected for the site solver; no native equivalence is claimed.')
                elif file == 'sim/damage.js' and code.startswith('const REDUCED_BODY_ZONES'):
                    module_entry = ('site-model-rule', 'body-zone-grouping',
                        'frosty-site-equations-2026-09-23.json#damage',
                        'Site grouping of hit-zone labels for a simplified body-hit option; it does not establish native zone aggregation.')
                elif file == 'sim/damage.js' and code.startswith('const DAMAGE_EPSILON'):
                    module_entry = ('project-numerical-method', 'damage-floating-point-tolerance',
                        'frosty-site-equations-2026-09-23.json#projectConstantsSeparate',
                        'Numerical boundary tolerance only; not a game damage rule.')
                if module_entry:
                    kind, group, citation, limit = module_entry
                elif not code or code.startswith(('//', '/*', '*', '*/')):
                    kind, group, citation, limit = 'source-comment-or-blank', 'non-executable', 'sim-source-file-hash', 'No executable value or expression on this line.'
                elif code.startswith(('import ', 'export {')):
                    kind, group, citation, limit = 'module-dependency', 'module-wiring', 'sim-source-file-hash', 'Dependency wiring only; semantic consumers are reviewed under their functions.'
                elif fn:
                    kind, group, citation, limit = 'unclassified-function-line', f'{file}:{fn}', 'requires-function-review', 'Function has no explicit family classification; do not treat as reviewed.'
                else:
                    kind, group, citation, limit = 'module-scope-line', f'{file}:module', 'requires-module-review', 'Top-level statement needs explicit role classification.'
            num = numeric.get((file, line))
            if num:
                numeric_info = {'classification': num['classification'], 'candidateTokens': num['numericCandidates'],
                                'reviewDisposition': kind, 'sourceOrRuntimeLimit': limit}
            else:
                numeric_info = None
            reviewed = kind not in ('unclassified-function-line', 'module-scope-line')
            out_row = dict(row, currentSourceCode=source_lines[file][line - 1], function=fn or '<module>', reviewClass=kind, family=group,
                           familyEvidence=citation, sourceOrRuntimeLimit=limit,
                           numericReview=numeric_info, reviewed=reviewed)
            out.write(json.dumps(out_row, ensure_ascii=False) + '\n')
            counts[kind] += 1
            family_counts[group] += 1
            per_file[file][kind] += 1
    spot_dir = Path(args.detail).parent.parent
    spot_raw_paths = {
        'baseTrace': spot_dir / 'spotting-base-range-trace-2026-09-23.json',
        'fieldBindings': spot_dir / 'site-spotting-field-bindings-2026-09-23.jsonl',
        'audit': spot_dir / 'site-spotting-audit-2026-09-23.json',
        'selectedChoices': spot_dir / 'site-spotting-runtime-choices-2026-09-23.json',
    }
    spotting_receipt = repo / 'reference-data/provenance/frosty-site-spotting-2026-09-23.json'
    result = {
        'schemaVersion': 1, 'date': '2026-09-23', 'build': '1.4.3.0',
        'sourceInventory': {'path': str(args.inventory.resolve()), 'sha256': sha(args.inventory), 'rows': len(rows)},
        'sourceLineComparisons': {'mismatchCount': len(inventory_line_diffs),
                                  'verifiedMojibakeRepairs': sum(1 for d in inventory_line_diffs if d['agreement'] == 'exact-after-cp1252-utf8-mojibake-repair'),
                                  'unexplainedMismatches': sum(1 for d in inventory_line_diffs if d['agreement'] == 'source-line-diff'),
                                  'mismatches': inventory_line_diffs},
        'numericClassification': {'path': str(args.numeric_classifications.resolve()), 'sha256': sha(args.numeric_classifications), 'rows': len(numeric)},
        'numericCandidateTokens': sum(len(item['numericCandidates']) for item in numeric.values()),
        'numericCandidateLineTokenMismatches': numeric_line_mismatches,
        'sources': source_info, 'detail': {'path': str(args.detail.resolve()), 'sha256': sha(args.detail), 'rows': len(rows)},
        'lineCounts': dict(counts), 'familyLineCounts': dict(family_counts),
        'perFile': {k: dict(v) for k, v in per_file.items()},
        'unclassifiedLines': sum(v for k, v in counts.items() if k in ('unclassified-function-line', 'module-scope-line')),
        'codeInventoryReviewComplete': sum(v for k, v in counts.items() if k in ('unclassified-function-line', 'module-scope-line')) == 0,
        'modelFamilies': ['ballistics', 'recoil-recovery', 'spread-recovery', 'spread-distribution', 'fire-cadence', 'damage', 'attachment-composition', 'weapon-attributes'],
        'spottingBaseComparison': {
            'siteLiterals': {'worldMeters': 54, 'minimapMeters': 150},
            'sourceFields': {'world': 'WB Field_5ebda408/Field_9918e670', 'minimap': 'WB Field_5ebda408/Field_31022dc5'},
            'siteWeaponDistribution': {'match54_150': 61, 'm45a1': [27, 64.285713], 'vz61': [27, 64.285713]},
            'referenceOnly': {'KSG': [75, 150], 'includedInMultiplayerCount': False},
            'receipt': {'path': str(spotting_receipt.resolve()), 'sha256': sha(spotting_receipt)},
            'rawEvidence': {name: {'path': str(path.resolve()), 'sha256': sha(path)} for name, path in spot_raw_paths.items()},
            'status': 'mixed source candidate and site hardcode; no correction proposed until native WB consumption and modifier composition are resolved.'},
        'limits': ['Reviewed code documents the Analyzer implementation, not native Frosty consumption.',
                   'Source operand evidence is a separate ledger; equation/function behavior remains a site model unless a specific runtime record proves it.',
                   'No game-process or production behavior was changed.'],
    }
    args.summary.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'lines': len(rows), 'unclassified': result['unclassifiedLines'], 'classes': dict(counts)}))


if __name__ == '__main__':
    main()
