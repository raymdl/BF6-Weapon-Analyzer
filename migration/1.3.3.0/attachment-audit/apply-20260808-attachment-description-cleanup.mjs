/**
 * Repair OCR damage in the attachment descriptions.
 *
 * Four defects, in the order they are fixed:
 *
 * 1. Terminal punctuation. The panel ends every description with a full stop, but the OCR pass
 *    frequently read it as `_` or `,` or dropped it. Both were checked against the captures:
 *    `612MM VMW` on the M123K renders "...at the cost of weapon draw speed." yet was stored with
 *    a trailing comma, and `20" HBAR` on the M16A4 renders a full stop that was stored with no
 *    terminal punctuation at all. Neither was truncated — the text is complete, only the final
 *    character was misread. So a trailing `_` or `,` becomes `.`, and a description with no
 *    terminal punctuation gains one.
 *
 * 2. Garbled variants of one shared sentence. The same attachment carries the same description
 *    on every weapon that offers it, so where variants of one attachment all say the same thing,
 *    the differences are OCR noise ("tiring" for "firing", "ot" for "of") and the cleanest,
 *    most-attested variant wins.
 *
 *    This is deliberately NOT applied across the board. Some attachments genuinely describe
 *    themselves differently per weapon: a "20Rnd Magazine" is the standard magazine on one
 *    weapon and an extended one on another, and `16" Rifle` is a standard barrel on one and a
 *    long barrel on another. Variants are therefore clustered by similarity first, and a group
 *    is only normalised when its variants form a SINGLE cluster. The 38 groups that hold more
 *    than one genuine sentence are left alone.
 *
 * 3. Mojibake inside a multi-cluster group. A variant mangled badly enough to form its own
 *    cluster still needs rescuing — the SL9 "Laser/Light Combo Green" reads
 *    "Laser.provides slight,irnproven8 recovery, but iswisible to ener»y soldiers..." while eight
 *    other weapons carry the sentence intact. A variant containing non-ASCII mojibake adopts the
 *    nearest clean variant of the same attachment.
 *
 * 4. A description on a `None` card. 276 of the 277 `None` cards carry no description; the odd
 *    one out is the SL9 laser slot holding the literal string "-g". That is noise, not text.
 */
import fs from 'node:fs';
import path from 'node:path';

const auditRoot = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT
  ?? 'migration/1.3.3.0/attachment-audit');
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');

const document = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const described = document.records.filter(record => typeof record.attachmentDescription === 'string');

const summary = { punctuation: 0, normalised: 0, mojibakeRescued: 0, noneCardCleared: 0 };
const changes = [];
const record = (entry, before, after, rule) => {
  if (before === after) return false;
  entry.attachmentDescription = after;
  changes.push({ weapon: entry.weaponName, attachment: entry.attachmentName, rule, before, after });
  return true;
};

/* 1. Terminal punctuation. */
const repunctuate = (text) => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/[_,]$/.test(trimmed)) return `${trimmed.slice(0, -1)}.`;
  if (!/[.!?]$/.test(trimmed)) return `${trimmed}.`;
  return trimmed;
};
for (const entry of described) {
  if (record(entry, entry.attachmentDescription, repunctuate(entry.attachmentDescription), 'punctuation')) {
    summary.punctuation += 1;
  }
}

/* Group by attachment, then cluster each group's variants by similarity. */
const groupKey = entry => `${entry.attachmentType} ${entry.attachmentName}`;
const groups = new Map();
for (const entry of described) {
  if (entry.attachmentName === 'None') continue;
  if (!groups.has(groupKey(entry))) groups.set(groupKey(entry), []);
  groups.get(groupKey(entry)).push(entry);
}

const normalise = text => text.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
const mojibake = text => /[^\x00-\x7f]/.test(text);

/** Similarity as the longest-common-subsequence ratio over normalised letters. */
const similarity = (a, b) => {
  const x = normalise(a);
  const y = normalise(b);
  if (!x.length || !y.length) return 0;
  let previous = new Array(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i += 1) {
    const current = new Array(y.length + 1).fill(0);
    for (let j = 1; j <= y.length; j += 1) {
      current[j] = x[i - 1] === y[j - 1] ? previous[j - 1] + 1 : Math.max(previous[j], current[j - 1]);
    }
    previous = current;
  }
  return (2 * previous[y.length]) / (x.length + y.length);
};

/** Cleanest wins: no mojibake first, then a proper full stop, then attestation, then length. */
const rank = (text, count) => [mojibake(text) ? 0 : 1, /\.$/.test(text) ? 1 : 0, count, text.length];
const better = (a, b) => {
  const left = rank(...a);
  const right = rank(...b);
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return left[i] > right[i];
  }
  return false;
};

/*
 * Collapsing one group can change which variants a later pass sees, so repeat until nothing
 * moves. Without this a single run leaves a few groups one step short of their fixed point.
 */
let settled = false;
while (!settled) {
settled = true;
for (const entries of groups.values()) {
  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry.attachmentDescription, (counts.get(entry.attachmentDescription) ?? 0) + 1);
  }
  if (counts.size < 2) continue;

  const variants = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const clusters = [];
  for (const [text, count] of variants) {
    const hit = clusters.find(cluster => similarity(cluster.best[0], text) >= 0.75);
    if (hit) {
      hit.members.push(text);
      if (better([text, count], hit.best)) hit.best = [text, count];
    } else {
      clusters.push({ best: [text, count], members: [text] });
    }
  }

  /* 2. One shared sentence: everything in the group becomes the cleanest variant. */
  if (clusters.length === 1) {
    const [canonical] = clusters[0].best;
    for (const entry of entries) {
      if (record(entry, entry.attachmentDescription, canonical, 'normalised')) {
        summary.normalised += 1;
        settled = false;
      }
    }
    continue;
  }

  /* 3. Several genuine sentences: leave them, but rescue any mojibake variant. */
  const clean = clusters.filter(cluster => !mojibake(cluster.best[0]));
  if (!clean.length) continue;
  for (const entry of entries) {
    if (!mojibake(entry.attachmentDescription)) continue;
    let pick = null;
    let score = 0;
    for (const cluster of clean) {
      const ratio = similarity(cluster.best[0], entry.attachmentDescription);
      if (ratio > score) { score = ratio; pick = cluster.best[0]; }
    }
    if (pick && score >= 0.5 && record(entry, entry.attachmentDescription, pick, 'mojibake-rescue')) {
      summary.mojibakeRescued += 1;
      settled = false;
    }
  }
}
}

/* 4. A `None` card carries no description. */
for (const entry of document.records) {
  if (entry.attachmentName !== 'None') continue;
  if (typeof entry.attachmentDescription !== 'string') continue;
  changes.push({ weapon: entry.weaponName, attachment: 'None', rule: 'none-card-cleared', before: entry.attachmentDescription, after: null });
  entry.attachmentDescription = null;
  summary.noneCardCleared += 1;
}

/* A re-run is a no-op, so leave the review and the ledger from the run that did the work. */
if (changes.length) {
  document.generatedAt = new Date().toISOString();
  fs.writeFileSync(reviewPath, `${JSON.stringify(document, null, 2)}\n`);
  fs.writeFileSync(path.join(auditRoot, 'attachment-description-cleanup-20260808.json'),
    `${JSON.stringify({ summary, changes }, null, 2)}\n`);
}

console.log({ ...summary, totalChanges: changes.length, noOp: changes.length === 0 });
