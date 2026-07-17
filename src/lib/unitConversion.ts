import { Language, UnitSystem } from './preferences';

// Solo las unidades de PESO se convierten entre sistemas (g/kg <-> oz/lb).
// Volumen (cup/tbsp/tsp) se queda igual en ambos sistemas -- son de uso común
// sin importar métrico/imperial -- solo se traduce la palabra si el idioma es español.
const WEIGHT_TO_METRIC = /(\d+(?:[.,]\d+)?)\s*(lbs?|pounds?|oz|ounces?)\b/i;
const WEIGHT_TO_IMPERIAL = /(\d+(?:[.,]\d+)?)\s*(kg|kilograms?|g|grams?)\b/i;

const MEASURE_WORD_ES: Record<string, string> = {
  cups: 'tazas', cup: 'taza',
  tbsp: 'cda', tablespoons: 'cucharadas', tablespoon: 'cucharada',
  tsp: 'cdta', teaspoons: 'cucharaditas', teaspoon: 'cucharadita',
  pinch: 'pizca',
  cloves: 'dientes', clove: 'diente',
  slices: 'rebanadas', slice: 'rebanada',
  can: 'lata', cans: 'latas',
  whole: 'entero',
  'to taste': 'al gusto',
};

function parseNumber(raw: string): number {
  return parseFloat(raw.replace(',', '.'));
}

export function convertWeightUnit(measure: string, targetSystem: UnitSystem): string {
  if (!measure) return measure;

  if (targetSystem === 'metric') {
    const match = measure.match(WEIGHT_TO_METRIC);
    if (!match) return measure;
    const value = parseNumber(match[1]);
    const unit = match[2].toLowerCase();
    const isPounds = unit.startsWith('lb') || unit.startsWith('pound');
    const grams = isPounds ? value * 453.6 : value * 28.35;
    const formatted = grams >= 1000 ? `${(grams / 1000).toFixed(2).replace(/\.00$/, '')}kg` : `${Math.round(grams)}g`;
    return measure.replace(WEIGHT_TO_METRIC, formatted);
  }

  const match = measure.match(WEIGHT_TO_IMPERIAL);
  if (!match) return measure;
  const value = parseNumber(match[1]);
  const unit = match[2].toLowerCase();
  const isKg = unit.startsWith('kg') || unit.startsWith('kilogram');
  const grams = isKg ? value * 1000 : value;
  const oz = grams / 28.35;
  const formatted = oz >= 16 ? `${(oz / 16).toFixed(2).replace(/\.00$/, '')}lb` : `${oz.toFixed(1).replace(/\.0$/, '')}oz`;
  return measure.replace(WEIGHT_TO_IMPERIAL, formatted);
}

export function translateMeasureWords(measure: string, language: Language): string {
  if (!measure || language !== 'es') return measure;
  let result = measure;
  for (const [en, es] of Object.entries(MEASURE_WORD_ES)) {
    result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), es);
  }
  return result;
}

export function formatMeasure(measure: string, prefs: { unitSystem: UnitSystem; language: Language }): string {
  const converted = convertWeightUnit(measure, prefs.unitSystem);
  return translateMeasureWords(converted, prefs.language);
}
