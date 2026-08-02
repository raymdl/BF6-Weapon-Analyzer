import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const schema = JSON.parse(fs.readFileSync(new URL('../schemas/attachment-screenshot-review.schema.json', import.meta.url), 'utf8'));
const review = JSON.parse(fs.readFileSync(new URL('../migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json', import.meta.url), 'utf8'));

test('review document declares schema v4 and satisfies the core record contract', () => {
  assert.equal(review.$schema, '../../../schemas/attachment-screenshot-review.schema.json');
  assert.equal(review.schemaVersion, 4);
  assert.equal(review.recordCount, review.records.length);
  assert.equal(review.attachmentDetailCount, review.records.filter(record => record.stats).length);
  const allowedTypes = new Set(schema.$defs.attachmentType.enum);
  for (const record of review.records) {
    assert.ok(allowedTypes.has(record.attachmentType), `${record.weaponName}: unsupported type ${record.attachmentType}`);
    assert.equal('attachmentSlot' in record, false);
    assert.equal('sharedSlotGroup' in record, false);
    assert.equal('slotCompatibilityNotes' in record, false);
    for (const field of schema.$defs.record.required) assert.ok(field in record, `${record.weaponName}: missing ${field}`);
  }
});

test('schema exposes shared types and the new displayed subtype vocabulary without slot fields', () => {
  assert.ok(schema.$defs.attachmentType.enum.includes('Laser/Light'));
  assert.ok(schema.$defs.attachmentType.enum.includes('Grip/Laser/Light'));
  assert.ok(!schema.$defs.attachmentType.enum.includes('Range Finder'));
  const subtypeDescription = schema.$defs.record.properties.attachmentSubtype.description;
  for (const subtype of ['Subsonic', 'Sub HP', 'Sub Pen', 'Suppressed', 'Range Pen']) assert.match(subtypeDescription, new RegExp(subtype));
  assert.equal(schema.$defs.record.properties.attachmentSlot, undefined);
});
