# Data Flow and Validation

Where every number on the site comes from, and what each gate checks before a value ships.

Four kinds of evidence feed this project, and only two of them are allowed to write into `data/`.
The screenshot corpus — the largest body of evidence by far — is deliberately not one of them.

> **"The scrape is a test fixture, not a data source."**
> — [DERIVED_ATTACHMENT_MODEL.md](../migration/1.3.3.0/DERIVED_ATTACHMENT_MODEL.md) §7

---

## Contents

- [The pipeline](#the-pipeline)
- [Which source owns which field](#which-source-owns-which-field)
- [How a value earns its status](#how-a-value-earns-its-status)
- [The validation gates](#the-validation-gates)
- [Reading the runtime boundary](#reading-the-runtime-boundary)

---

## The pipeline

Solid arrows move values. **Dashed arrows carry no values at all** — they are comparisons, where one
artifact is used to test another. The screenshot corpus reaches `data/` only through a human
promotion step, never automatically.

<img src="img/data-flow-pipeline.svg" alt="Pipeline from upstream sources through staging and promotion gates into data/ and the runtime" width="100%">

<details open>
<summary>Diagram source (mermaid)</summary>

The SVG above is rendered from this source and committed alongside it, so the diagram
looks the same everywhere. GitHub's mermaid renderer lays subgraphs out differently from
the one this was drawn with, which is why it is embedded as an image rather than a live
fence. Re-render with `node scripts/render-docs-diagrams.mjs` after editing.

```mermaid
flowchart TB
  classDef src     fill:#DCEBE4,stroke:#2E6B57,stroke-width:1.5px,color:#12231C
  classDef stage   fill:#DEE8F2,stroke:#46688C,stroke-width:1.5px,color:#14202C
  classDef live    fill:#F3E4CB,stroke:#96682A,stroke-width:1.5px,color:#2E2008
  classDef ref     fill:#E3E6E9,stroke:#656E79,stroke-width:1.5px,color:#1D2227
  classDef gate    fill:#FFFFFF,stroke:#171B21,stroke-width:1.5px,color:#171B21
  classDef runtime fill:#EFE3F0,stroke:#7A4A80,stroke-width:1.5px,color:#2A162C

  subgraph UP [" UPSTREAM SOURCES — outside the repo "]
    direction TB
    EA["EA update notes<br/>declared mechanics, hit zones,<br/>velocity + recoil changes"]
    SYM["sym.gg bf6.json<br/>pinned sha256 129C2A55…<br/>306,610 bytes"]
    SYMD["sym.gg damage republish<br/>2026-07-25<br/>damage.dmgs / damage.dists only"]
    SHOT["In-game screenshots<br/>~1.7 GB · gitignored · local only"]
    COMM["Community research<br/>Henry · TheXclusiveAce<br/>SORROW · SheetOnMyFace"]
  end
  class EA,SYM,SYMD,SHOT,COMM src

  subgraph STG [" STAGING — reviewable, never served "]
    direction TB
    GEN["generated-data/sym/1.3.3.0/<br/>mapping · normalized · diff<br/>reconciliation · excluded-fields"]
    AUD["attachment-screenshot-review.json<br/>3,177 records · 3,115 with stats<br/>62 weapons"]
    OCR["field-ocr · cost-ocr · visual-stat-map<br/>manual-review-overrides<br/>rename-manifest + provenance"]
  end
  class GEN,AUD,OCR stage

  subgraph GATES [" PROMOTION GATES "]
    direction TB
    IMP["scripts/sym-import.mjs<br/>default mode writes review artifacts ONLY"]
    DMG["scripts/apply-sym-damage.mjs --write<br/>the only writer of damage curves"]
    APPLY["migration apply-*.mjs<br/>one scoped, reviewed correction each"]
    S7{{"§7 four checks<br/>value · cross-field<br/>field-by-slot · name-vs-effect"}}
    HUMAN{{"Manual adjudication<br/>screenshot wins;<br/>a model may never rewrite a reading"}}
  end
  class IMP,DMG,APPLY,S7,HUMAN gate

  subgraph LIVE [" data/ — fetched by the browser "]
    direction TB
    WEAP["weapons.json<br/>identity, rpm, recoil, spread,<br/>damage curve"]
    ATT["attachments.json<br/>shared modifier tables +<br/>WEAPON_ATTS / MAG / ERGO"]
    AMMOD["ammo.json<br/>AMMO + WEAPON_AMMO<br/>+ velocityTreatments"]
    BAL["balance_tables.json<br/>tier ladders + class rules"]
    BALL["ballistics.json"]
    RD["recoil_decay.json"]
  end
  class WEAP,ATT,AMMOD,BAL,BALL,RD live

  subgraph REPO [" data/ — repo-only, NOT served "]
    direction TB
    PROV["provenance/*.json<br/>source authority + field policy"]
    RLX["reload-exceptions.json"]
  end
  class PROV,RLX ref

  subgraph RT [" RUNTIME "]
    direction TB
    SIM["sim/ — applyAttachments, damage,<br/>ballistics, loadout, core"]
    APP["ui/app.js"]
    SITE["GitHub Pages<br/>raymdl.github.io"]
  end
  class SIM,APP,SITE runtime

  EA ~~~ SYM ~~~ SYMD ~~~ SHOT ~~~ COMM
  GEN ~~~ AUD ~~~ OCR
  IMP ~~~ DMG ~~~ APPLY ~~~ S7 ~~~ HUMAN
  WEAP ~~~ ATT ~~~ AMMOD ~~~ BAL ~~~ BALL ~~~ RD
  PROV ~~~ RLX
  SIM ~~~ APP ~~~ SITE

  EA   --> DMG
  EA   --> APPLY
  SYM  --> IMP
  SYMD --> DMG
  SHOT --> AUD
  AUD  --> OCR
  OCR  --> APPLY
  COMM --> APPLY

  IMP   --> GEN
  GEN   -.->|"reviewed by hand,<br/>then hand-applied"| WEAP
  DMG   --> WEAP
  APPLY --> S7
  S7    --> HUMAN
  HUMAN --> ATT
  HUMAN --> AMMOD
  HUMAN --> BAL

  PROV -.->|"declares which source<br/>owns which field"| IMP
  PROV -.-> DMG
  RLX  -.-> S7

  WEAP  --> SIM
  ATT   --> SIM
  AMMOD --> SIM
  BAL   --> SIM
  BALL  --> SIM
  RD    --> SIM
  SIM   --> APP --> SITE

  AUD -.->|"TEST FIXTURE:<br/>compared against, never copied in"| S7
  SIM -.->|"resolver output is<br/>diffed against the corpus"| S7
```

</details>

The two dashed edges at the bottom are the important ones: the screenshot corpus and the resolver
are compared *to each other*, and a disagreement is recorded rather than auto-resolved.

---

## Which source owns which field

`data/provenance/1.3.3.0.json` is the tiebreaker. It records not just where a value came from, but
which source **wins** when two disagree, and which fields no remote source can answer at all.

| Policy | Fields | Reaches `data/` how |
|---|---|---|
| `eaOverride` | Hit-zone multipliers, automatic headshot multipliers, explicitly listed velocity and recoil changes, sniper sweet-spot ranges | Overrides Sym wherever the two disagree |
| `symImport` | Weapon identity and class, rate of fire, velocity, gravity, drag, magazine and reload, deploy, recoil, spread and recovery | Staged to `generated-data/`, reviewed, then applied |
| `inGameRequired` | Post-patch damage floats, PP-19 attachment availability and point costs, all barrel × ammunition velocity combinations, attachment effects no current source exposes | Screenshot evidence → §7 gates → manual promotion |
| `deferred` | REDSEC armor simulation; bullet drag, travel-time, remaining-velocity, lead and drop simulation | Not modeled — absent rather than guessed |

---

## How a value earns its status

Not every value in `data/` has the same standing. Two of these classes carry an explicit marker so
the UI can footnote them; the rest are load-bearing without qualification.

<img src="img/data-flow-value-class.svg" alt="Decision flow for how a single stat earns its provenance class" width="100%">

<details open>
<summary>Diagram source (mermaid)</summary>

The SVG above is rendered from this source and committed alongside it, so the diagram
looks the same everywhere. GitHub's mermaid renderer lays subgraphs out differently from
the one this was drawn with, which is why it is embedded as an image rather than a live
fence. Re-render with `node scripts/render-docs-diagrams.mjs` after editing.

```mermaid
flowchart TB
  classDef q      fill:#FFFFFF,stroke:#171B21,stroke-width:1.5px,color:#171B21
  classDef ok     fill:#DCEBE4,stroke:#2E6B57,stroke-width:1.5px,color:#12231C
  classDef derive fill:#F3E4CB,stroke:#96682A,stroke-width:1.5px,color:#2E2008
  classDef warn   fill:#F6E0D6,stroke:#A65A3F,stroke-width:1.5px,color:#2E1710
  classDef note   fill:#E3E6E9,stroke:#656E79,stroke-width:1.5px,color:#1D2227

  START(["A stat the site must display"]) --> Q1{"Did EA declare it<br/>in the patch notes?"}
  Q1 -->|yes| EAV["EA-declared<br/>overrides every other source"]
  Q1 -->|no| Q2{"Does the pinned<br/>sym.gg payload carry it?"}
  Q2 -->|yes| SYMV["Sym-sourced<br/>staged, diffed, then applied"]
  Q2 -->|no| Q3{"Do the in-game<br/>screenshots show it?"}
  Q3 -->|yes| Q4{"Does it hold across every<br/>weapon that has the attachment?"}
  Q3 -->|no| Q6{"Is there a donor weapon<br/>close enough to model from?"}
  Q4 -->|"yes — n of n"| RULE["Broad category rule<br/>one row in attachments.json /<br/>balance_tables.json for all weapons"]
  Q4 -->|"no — exceptions"| OVR["Per-weapon override<br/>COLLATERAL_MULT_OVERRIDE,<br/>WEAPON_MAG, velocityTreatments"]
  Q6 -->|yes| EST["estimated: true<br/>+ donor provenance<br/>BROD 3 and EF88 only"]
  Q6 -->|no| Q7{"Can the model be fitted<br/>to a known output curve?"}
  Q7 -->|yes| ASM["assumedFields<br/>fitted, not datamined<br/>triggers the sidebar footnote"]
  Q7 -->|no| OMIT["Left absent<br/>VSSM stays off the roster<br/>until Sym publishes"]

  class START,OMIT note
  class Q1,Q2,Q3,Q4,Q6,Q7 q
  class EAV,SYMV ok
  class RULE,OVR derive
  class EST,ASM warn
```

</details>

The bottom path is the one that keeps the model honest: a value with no evidence is omitted, not
filled with a plausible default.

### The four classes in practice

**Broad category rule.** The shared tables in `attachments.json` — one entry per barrel, muzzle,
grip, ammo — apply to every weapon offering that attachment. Class-level rules live alongside them
in `balance_tables.json`: `HIP_CLS`, `LIMB_CLASS`, `AUTO_HS_MULT`, and collateral by weapon class.

**Per-weapon override.** When a broad rule holds for most weapons but not all, the exception is
named explicitly rather than weakening the rule — `COLLATERAL_MULT_OVERRIDE`, `WEAPON_MAG` tier
shifts, and per-pair `velocityTreatments`.

**Assumed.** `assumedFields` marks a value that reproduces an observed output curve without being a
confirmed game parameter — the heavy-barrel `adsSpreadIncMult: 0.80` is the standing example. The UI
footnotes these.

**Visually calibrated.** Chart scale defaults, scatter run count, spread-bubble schedule, cone shape,
distance-panel sizing. Design choices; they make no claim about game behaviour.

---

## The validation gates

The §7 checks are executable, not described. Each catches a different failure mode, and the third
exists specifically because assuming a stat's inputs is how a wrong model survives review.

| Check | Question | Caught in practice |
|---|---|---|
| 1 · value | Does the reading match the model? | 8 of 9 reload errors; 22 recoil-variation errors |
| 2 · cross-field | Does the capacity in the attachment *name* match its `magazineSize`? | RPK-74M 36Rnd — value right, name wrong |
| 3 · field-by-slot | Which slots change this stat, and does the resolver agree? | Heavy Extended moving sprint recovery — a slot the resolver modeled as inert |
| 4 · name-vs-effect | Does a name implying a speed effect actually have one? | 11 unnamed 1.13 magazines; PP-19 20Rnd Fast Mag |

**Check 1 may never rewrite a reading on its own.** A model–panel disagreement is a request to
re-read the screenshot. The one time this was inverted, the model was wrong and the scrape was right
— and the bad record became invisible to every later sweep precisely because it now agreed with the
model.

**Disagreements are inventoried, not resolved by rule.** `model-tier-mismatch-inventory` and
`field-slot-asymmetry-inventory` hold findings open with an explicit `unadjudicated` status.

**Corrections are executable receipts.** Each `migration/1.3.3.0/attachment-audit/apply-*.mjs`
carries pinned before/after values, the reason the correction is safe, and mirrors itself into the
manual-review override ledger. Reruns report `noOp` and change nothing.

**`scripts/validate-data.mjs` guards referential and derivational integrity** — every id referenced
by `WEAPON_AMMO`, `HIP_CLS`, `COLLATERAL_MULT_OVERRIDE` and friends must resolve, and coupled fields
must agree (for example `drawTimeTier === defSpr + sprintOrigin`).

---

## Reading the runtime boundary

`ship-surface.json` pins what the live site actually loads. Six JSON files are fetched by the
browser:

```
data/ammo.json          data/balance_tables.json     data/recoil_decay.json
data/attachments.json   data/ballistics.json         data/weapons.json
```

Everything else under `data/` is build- and validation-only. `data/provenance/` and
`data/reload-exceptions.json` are never served, and neither is anything under `migration/`,
`scripts/`, `generated-data/`, or `docs/`.

---

*Drawn against `main` at v1.3.3.0. Record counts from the tracked attachment audit
(3,177 records / 62 weapons); field policy from `data/provenance/1.3.3.0.json`.*
