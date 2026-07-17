import { useSyncExternalStore } from 'react';

export type Language = 'es' | 'en';
export type UnitSystem = 'metric' | 'imperial';

export interface Preferences {
  language: Language;
  unitSystem: UnitSystem;
}

const STORAGE_KEY = 'chefrefri-preferences';
const DEFAULT_PREFERENCES: Preferences = { language: 'es', unitSystem: 'metric' };
const CHANGE_EVENT = 'chefrefri-preferences-change';

function readPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      language: parsed.language === 'en' ? 'en' : 'es',
      unitSystem: parsed.unitSystem === 'imperial' ? 'imperial' : 'metric',
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function getPreferences(): Preferences {
  return readPreferences();
}

export function setPreferences(update: Partial<Preferences>): void {
  const next = { ...readPreferences(), ...update };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function subscribePreferences(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribePreferences, getPreferences, () => DEFAULT_PREFERENCES);
}
