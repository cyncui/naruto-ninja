import type { ReactNode } from "react";

export interface Seal {
  id: string;
  name: string;
  aliases: string[];
}
export interface TechniqueOption {
  id: string;
  name: string;
  family: string;
  nature: string[];
  variants: {
    id: string;
    label: string;
    steps: string[] | null;
    kind: string;
    evidence: string;
    sourceUrl: string;
    notes: string[];
  }[];
}
export interface AppModel {
  stage: ReactNode;
  techniques: TechniqueOption[];
  seals: Seal[];
  selected: TechniqueOption;
  variantId: string;
  sequence: Seal[];
  progress: number;
  mode: "demo" | "camera";
  cameraStatus: "idle" | "requesting" | "live" | "error";
  cameraMessage: string;
  trackerStatus: "idle" | "loading" | "ready" | "error";
  trackerMessage: string;
  faceStatus: "idle" | "loading" | "ready" | "error";
  handsDetected: number;
  detectedSeal: string | null;
  samples: Record<string, number>;
  activeEffect: boolean;
  effectName: string;
  mirrored: boolean;
  reducedMotion: boolean;
  status: string;
  startCamera(): void;
  stopCamera(): void;
  setMode(mode: "demo" | "camera"): void;
  selectTechnique(id: string): void;
  selectVariant(id: string): void;
  inputSeal(id: string): void;
  resetSequence(): void;
  previewEffect(): void;
  calibrate(id: string): void;
  clearCalibration(): void;
  toggleMirror(): void;
  toggleReducedMotion(): void;
}
