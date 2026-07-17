import { useSyncExternalStore } from 'react';
import { FitnessProfile } from './fitnessCalculator';

const STORAGE_KEY = 'chefrefri-fitness-profile';
const CHANGE_EVENT = 'chefrefri-fitness-profile-change';

// useSyncExternalStore requires getSnapshot to return a stable reference when
// nothing changed, or React re-renders in an infinite loop. Cache the parsed
// value keyed on the raw string so repeated calls don't allocate a new object.
let cachedRaw: string | null = null;
let cachedValue: FitnessProfile | null = null;

export function getFitnessProfile(): FitnessProfile | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw ? (JSON.parse(raw) as FitnessProfile) : null;
  } catch {
    cachedValue = null;
  }
  return cachedValue;
}

export function setFitnessProfile(profile: FitnessProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function clearFitnessProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useFitnessProfile(): FitnessProfile | null {
  return useSyncExternalStore(subscribe, getFitnessProfile, () => null);
}
