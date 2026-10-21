import type { ReactNode } from "react";
import type { Diagnosis } from "./runtime/recognition";
import type { CropSource } from "./runtime/crop";

export interface Seal {
  id: string;
  name: string;
  aliases: string[];
  sourceUrl: string;
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
  match: Diagnosis;
  matcher: "landmarks" | "image";
  crop?: CropSource;
  /** Hands-free capture for the next seal, while it has too few samples. */
  teaching: {
    seal: string;
    count: number;
    hold: number;
    waiting: boolean;
  } | null;
  setCalibrationOpen(open: boolean): void;
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
