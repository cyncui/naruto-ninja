/** Symbolic research data; this does not describe a trained gesture model. */
export type VerificationStatus = 'secondary_reported' | 'primary_verified' | 'unresolved';
export type TriggerKind = 'seal_sequence' | 'special_gesture' | 'no_seals' | 'unresolved';
export type SourceKind = 'official' | 'secondary_reference' | 'creator_demonstration';
export type SourceAccess = 'full_page' | 'search_excerpt' | 'primary_image';
export type Medium = 'manga' | 'anime' | 'movie' | 'mixed' | 'unspecified';

export interface Source {
  id: string;
  title: string;
  url: string;
  kind: SourceKind;
  access: SourceAccess;
  accessedOn: string;
  notes: string;
}

export interface Sign {
  id: string;
  name: string;
  kind: 'basic' | 'special' | 'variant' | 'action';
  aliases: string[];
  description: string;
  sourceIds: string[];
  geometryStatus: 'reference_required';
  recognitionStatus: 'untrained';
}

export interface VariantEvidence {
  id: string;
  label: string;
  sourceIds: string[];
  medium: Medium;
  /** Reported locators are not proof that the original scene was inspected. */
  sourceLocator: string | null;
  notes: string[];
}

export type Variant = VariantEvidence & (
  | {
      triggerKind: 'seal_sequence' | 'special_gesture';
      steps: [string, ...string[]];
      verificationStatus: 'secondary_reported' | 'primary_verified';
    }
  | {
      triggerKind: 'no_seals';
      steps: [];
      verificationStatus: 'secondary_reported' | 'primary_verified';
    }
  | {
      triggerKind: 'unresolved';
      steps: null;
      verificationStatus: 'unresolved';
    }
);

export interface Technique {
  id: string;
  name: string;
  aliases: string[];
  /** Associations are navigation metadata, not exclusive ownership claims. */
  associations: Array<{
    id: string;
    kind: 'clan' | 'character' | 'group' | 'village';
    name: string;
  }>;
  category: 'elemental' | 'clan' | 'general';
  nature: string[];
  variants: Variant[];
  /** Proposed app visual, not a claim about a canonical activation gesture. */
  effectSuggestion: string;
  notes: string[];
}

export interface Catalogue {
  schemaVersion: '1.0.0';
  researchedOn: string;
  scope: {
    focus: string[];
    exhaustive: false;
    limitations: string[];
  };
  recognition: {
    status: 'untrained';
    rejectLabels: ['unknown', 'transition', 'tracking_lost'];
    notes: string[];
  };
  sources: Source[];
  signs: Sign[];
  techniques: Technique[];
}
