import rawCatalogue from './naruto-catalogue.json' with { type: 'json' };
import type { Catalogue, Variant } from './catalogue.types.js';

// The schema and reference checks in npm run check validate this JSON before shipping.
export const catalogue = rawCatalogue as Catalogue;
export type * from './catalogue.types.js';

export type SequenceVariant = Extract<Variant, { triggerKind: 'seal_sequence' | 'special_gesture' }>;

/** Lists research candidates only; camera recognition requires a trained model. */
export function getSequenceCandidates({ includeSecondaryReports = false } = {}) {
  return catalogue.techniques.flatMap(technique =>
    technique.variants.flatMap(variant => {
      if (variant.triggerKind !== 'seal_sequence' && variant.triggerKind !== 'special_gesture') return [];
      if (variant.verificationStatus !== 'primary_verified' && !includeSecondaryReports) return [];
      return [{ techniqueId: technique.id, variantId: variant.id, variant }];
    })
  );
}
