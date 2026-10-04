import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'cmvisual.targetLockStyle.v1';
const DEFAULTS = {
  style: 'bracket',
  size: 'medium',
  showLabel: true,
  showEvidence: true,
  showConfidence: true,
  showRange: true,
  showTrail: true,
  showUncertainty: true,
  showHeading: true,
  opacity: 92,
};

export const TARGET_LOCK_STYLES = [
  { id: 'bracket', label: 'Brackets' },
  { id: 'reticle', label: 'Reticle' },
  { id: 'ring', label: 'Ring' },
  { id: 'minimal', label: 'Minimal' },
];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function useTargetLockStyle() {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }, [settings]);

  const api = useMemo(() => ({
    settings,
    styles: TARGET_LOCK_STYLES,
    update: (patch) => setSettings(current => ({ ...current, ...patch })),
    reset: () => setSettings(DEFAULTS),
  }), [settings]);

  return api;
}