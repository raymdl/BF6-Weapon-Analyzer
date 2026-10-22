import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const provenance = new URL('../reference-data/provenance/', import.meta.url);
const mappingFile = readdirSync(provenance)
  .filter(name => /^frosty-optic-category-mapping-\d{4}-\d{2}-\d{2}\.json$/.test(name))
  .sort().at(-1);
const mapping = read(`../reference-data/provenance/${mappingFile}`);
const attachments = read('../data/attachments.json');
const weapons = read('../data/weapons.json');

test('site optic categories and costs match the latest Frosty optics', () => {
  assert.deepEqual(mapping.unresolvedSources, [], 'every Frosty optic has a label category');
  assert.deepEqual(mapping.membersOutsideSiteCategories, [], 'no Frosty category is missing from the site');

  // Frosty optics grouped by weapon and category; each group must have one cost.
  const frosty = {};
  for (const member of mapping.categories.flatMap(category => category.members)) {
    ((frosty[member.weapon] ??= {})[member.category] ??= new Set()).add(member.sourcePointCost);
  }

  // Site sights are individual optics; each belongs to one legacy category.
  const sights = Object.fromEntries(attachments.SIGHTS.map(sight => [sight.id, sight]));
  for (const weapon of weapons) {
    const source = frosty[weapon.id];
    assert.ok(source, `${weapon.id} has Frosty optics`);
    const wa = attachments.WEAPON_ATTS[weapon.id];
    assert.ok(wa.sight.every(id => sights[id] && !sights[id].legacy), `${weapon.id} lists only current optics`);
    const siteCategories = [...new Set(wa.sight.map(id => sights[id].category ?? id))].sort();
    assert.deepEqual(siteCategories, Object.keys(source).sort(), `${weapon.id} optic categories`);
    for (const [category, costs] of Object.entries(source)) {
      assert.equal(costs.size, 1, `${weapon.id} ${category} has one Frosty cost`);
      for (const id of wa.sight.filter(id => (sights[id].category ?? id) === category)) {
        assert.equal(wa.sightPoints?.[id] ?? sights[id].pts, [...costs][0], `${weapon.id} ${id} cost`);
      }
    }
  }
});
