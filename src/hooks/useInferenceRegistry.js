import { useMemo } from 'react';

/**
 * Evidence-gated inference capability registry.
 *
 * Future sensors may unlock additional inferences, but an inference is only
 * eligible when the capability declares its required evidence, validation
 * status, and minimum evidence thresholds. The registry never manufactures
 * evidence and never upgrades an unsupported inference to a fact.
 */
const VERSION = 'inference-registry-v1.1';

const DEFAULT_CAPABILITIES = [
  { id: 'spatial-motion', label: 'Spatial / motion inference', requires: ['position', 'time'], allowed: true, minValidationScore: 70 },
  { id: 'trajectory-outcome', label: 'Physical trajectory outcome inference', requires: ['position', 'time', 'predictionCalibration'], allowed: true, minValidationScore: 70 },
  { id: 'hazard-state', label: 'Objective hazard-state inference', requires: ['validatedHazard'], allowed: true, minValidationScore: 70 },
  { id: 'physiology', label: 'Physiological inference', requires: ['validatedBiometricSensor'], allowed: false },
  { id: 'neural-state', label: 'Neural-state inference', requires: ['validatedNeuralSensor'], allowed: false },
  { id: 'identity', label: 'Identity inference', requires: ['validatedIdentitySource'], allowed: false },
];

function finite(v) { return Number.isFinite(Number(v)) ? Number(v) : null; }

function evaluateCapability(capability, evidence = {}) {
  const missing = [];
  for (const requirement of capability.requires || []) {
    const value = evidence[requirement];
    const present = typeof value === 'boolean' ? value : value != null;
    if (!present) missing.push(requirement);
  }
  const validationScore = finite(evidence.validationScore);
  const corroboration = finite(evidence.corroborationScore);
  const confidence = finite(evidence.confidence);
  const thresholdOk = (validationScore != null && validationScore >= 70) &&
    (corroboration != null && corroboration >= 60) &&
    (confidence != null && confidence >= 0.6);
  const meetsSpecificThreshold = capability.minValidationScore == null || (validationScore != null && validationScore >= capability.minValidationScore);
  return {
    id: capability.id,
    label: capability.label,
    status: !capability.allowed ? 'CAPABILITY-LOCKED' : missing.length ? 'INSUFFICIENT DATA' : (thresholdOk && meetsSpecificThreshold) ? 'ELIGIBLE' : 'UNRESOLVED',
    missing,
    validationScore,
    corroboration,
    confidence,
    validationReady: thresholdOk && meetsSpecificThreshold,
  };
}

export default function useInferenceRegistry({ evidence = {}, capabilities = DEFAULT_CAPABILITIES } = {}) {
  return useMemo(() => {
    const evaluated = (Array.isArray(capabilities) ? capabilities : DEFAULT_CAPABILITIES).map(c => evaluateCapability(c, evidence));
    return {
      version: VERSION,
      evaluated,
      eligible: evaluated.filter(x => x.status === 'ELIGIBLE'),
      unavailable: evaluated.filter(x => x.status !== 'ELIGIBLE'),
      canInfer: (id) => evaluated.some(x => x.id === id && x.status === 'ELIGIBLE'),
      policy: 'EVIDENCE-GATED · REAL DATA ONLY · UNKNOWN WHEN UNSUPPORTED',
    };
  }, [evidence, capabilities]);
}