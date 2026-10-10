import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const dataDirectory = new URL('../docs/data/', import.meta.url);
const suppliedPath = process.argv.find((argument, index) => index > 1 && !argument.startsWith('--'));
const cataloguePath = suppliedPath ?? new URL('naruto-catalogue.json', dataDirectory);
const catalogue = JSON.parse(await readFile(cataloguePath, 'utf8'));
const schema = JSON.parse(await readFile(new URL('naruto-catalogue.schema.json', dataDirectory), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

if (!validate(catalogue)) {
  console.error(ajv.errorsText(validate.errors, { separator: '\n' }));
  process.exit(1);
}

const errors = [];
const sources = new Map();
const signs = new Map();
const techniqueIds = new Set();
const variantRecords = [];
const usedSignIds = new Set();
const expectedBasicSigns = ['rat', 'ox', 'tiger', 'hare', 'dragon', 'snake', 'horse', 'ram', 'monkey', 'bird', 'dog', 'boar'];

function addUnique(collection, id, value, label) {
  if (collection.has(id)) errors.push(`Duplicate ${label}: ${id}`);
  if (collection instanceof Map) collection.set(id, value);
  else collection.add(id);
}

function checkSources(ids, owner) {
  for (const id of ids) {
    if (!sources.has(id)) errors.push(`${owner} references missing source ${id}`);
  }
}

for (const source of catalogue.sources) {
  addUnique(sources, source.id, source, 'source ID');
}

for (const sign of catalogue.signs) {
  addUnique(signs, sign.id, sign, 'sign ID');
  checkSources(sign.sourceIds, sign.id);
}

const basicSigns = catalogue.signs.filter(sign => sign.kind === 'basic').map(sign => sign.id);
if (basicSigns.length !== 12 || expectedBasicSigns.some(id => !basicSigns.includes(id))) {
  errors.push('Basic sign vocabulary must contain exactly the twelve canonical IDs.');
}
for (const label of catalogue.recognition.rejectLabels) {
  if (signs.has(label)) errors.push(`Rejection label ${label} must not be a castable sign.`);
}

for (const technique of catalogue.techniques) {
  addUnique(techniqueIds, technique.id, technique, 'technique ID');
  const localVariantIds = new Set();
  const localSequences = new Set();
  for (const variant of technique.variants) {
    const key = `${technique.id}/${variant.id}`;
    addUnique(localVariantIds, variant.id, variant, `variant ID in ${technique.id}`);
    checkSources(variant.sourceIds, key);
    for (const id of variant.steps ?? []) {
      if (!signs.has(id)) errors.push(`${key} references missing sign ${id}`);
      usedSignIds.add(id);
    }
    if (variant.verificationStatus === 'primary_verified') {
      const primarySources = variant.sourceIds.map(id => sources.get(id)).filter(Boolean);
      if (!primarySources.some(source => source.kind === 'official' && source.access !== 'search_excerpt')) {
        errors.push(`${key} claims primary verification without a directly inspected official source.`);
      }
      if (!variant.sourceLocator?.trim()) errors.push(`${key} lacks a primary source locator.`);
    }
    // Identical steps can be distinct scene variants; preserve them but expose them in the report.
    const sequenceKey = JSON.stringify(variant.steps);
    const repeatedWithinTechnique = localSequences.has(sequenceKey);
    localSequences.add(sequenceKey);
    variantRecords.push({ key, techniqueId: technique.id, variant, repeatedWithinTechnique });
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const symbolicSequences = variantRecords.filter(({ variant }) =>
  (variant.triggerKind === 'seal_sequence' || variant.triggerKind === 'special_gesture') && variant.steps.length > 0
);
const sequenceGroups = new Map();
for (const entry of symbolicSequences) {
  const signature = JSON.stringify(entry.variant.steps);
  const group = sequenceGroups.get(signature) ?? { steps: entry.variant.steps, variants: [] };
  group.variants.push(entry.key);
  sequenceGroups.set(signature, group);
}

const exactCollisions = [...sequenceGroups.values()].filter(group =>
  new Set(group.variants.map(key => key.split('/')[0])).size > 1
);
const prefixes = [];
const groupedSequences = [...sequenceGroups.values()];
for (const shorter of groupedSequences) {
  for (const longer of groupedSequences) {
    if (shorter.steps.length >= longer.steps.length) continue;
    if (shorter.steps.every((step, index) => step === longer.steps[index])) {
      prefixes.push({ prefix: shorter, continuation: longer });
    }
  }
}

const countBy = (items, field, knownValues = []) => Object.fromEntries(
  [...new Set([...knownValues, ...items.map(item => item[field])])].sort().map(value => [value, items.filter(item => item[field] === value).length])
);
const report = {
  schemaVersion: '1.0.0',
  researchedOn: catalogue.researchedOn,
  counts: {
    signs: catalogue.signs.length,
    signsByKind: countBy(catalogue.signs, 'kind'),
    techniques: catalogue.techniques.length,
    techniquesByCategory: countBy(catalogue.techniques, 'category'),
    variants: variantRecords.length,
    variantsByVerification: countBy(variantRecords.map(entry => entry.variant), 'verificationStatus', ['secondary_reported', 'primary_verified', 'unresolved']),
    variantsByTrigger: countBy(variantRecords.map(entry => entry.variant), 'triggerKind'),
    sources: catalogue.sources.length,
    sourcesByAccess: countBy(catalogue.sources, 'access'),
  },
  exactSequenceCollisions: exactCollisions,
  sequencePrefixConflicts: prefixes,
  repeatedAdjacentSigns: symbolicSequences.flatMap(entry =>
    entry.variant.steps.flatMap((id, index, steps) => index > 0 && id === steps[index - 1]
      ? [{ variant: entry.key, signId: id, stepIndices: [index - 1, index] }]
      : [])
  ),
  unresolvedVariants: variantRecords.filter(entry => entry.variant.triggerKind === 'unresolved').map(entry => entry.key),
  noSealVariants: variantRecords.filter(entry => entry.variant.triggerKind === 'no_seals').map(entry => entry.key),
  unusedSigns: catalogue.signs.filter(sign => !usedSignIds.has(sign.id)).map(sign => sign.id),
  instructions: [
    'Shared and prefix sequences require selected-technique context or a deliberate completion rule.',
    'No-seal and unresolved entries must never be registered as empty gesture matchers.',
    'Repeated adjacent signs need a distinct release and re-entry event; do not deduplicate them.',
    'Symbolic sequence availability is not camera recognition accuracy or primary verification.',
  ],
};

const serializedReport = `${JSON.stringify(report, null, 2)}\n`;
const reportPath = new URL('catalogue-report.json', dataDirectory);
if (process.argv.includes('--write-report')) {
  if (suppliedPath) throw new Error('Do not write the canonical report from a supplied test catalogue.');
  await writeFile(reportPath, serializedReport);
  console.log(`Wrote ${fileURLToPath(reportPath)}`);
} else if (!suppliedPath) {
  const savedReport = await readFile(reportPath, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (savedReport !== serializedReport) {
    console.error('Catalogue report is absent or stale. Run npm run report:catalogue and review the changes.');
    process.exit(1);
  }
}

console.log(`Validated ${catalogue.signs.length} signs, ${catalogue.techniques.length} techniques, ${variantRecords.length} variants, ${catalogue.sources.length} sources.`);
console.log(`${exactCollisions.length} shared sequences and ${prefixes.length} prefix conflicts require explicit product handling.`);
