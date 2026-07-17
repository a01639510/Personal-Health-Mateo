// Script de un solo uso: calcula calorías/proteína/carbohidratos/grasa estimadas
// para cada receta del Recetario (tabla `recipes`), usando la tabla `usda_foods`
// (importada previamente por scripts/import-usda-nutrition.ts) como referencia
// de nutrientes por 100g, más una conversión aproximada de las medidas de
// TheMealDB (texto libre: "200g", "1 cup", "2 tbsp", etc.) a gramos.
//
// Esto es una ESTIMACIÓN: fuzzy-match de nombre de ingrediente + conversión de
// unidades aproximada + un número de porciones asumido (4, ya que TheMealDB no
// provee porciones). Por eso cada receta se marca con nutrition_is_estimated = true.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/compute-recipe-nutrition.ts

const ASSUMED_SERVINGS = 4;

const STOPWORDS = new Set([
  'fresh', 'dried', 'chopped', 'diced', 'sliced', 'minced', 'crushed', 'ground',
  'canned', 'cooked', 'raw', 'grated', 'peeled', 'large', 'small', 'medium',
  'ripe', 'to', 'taste', 'optional', 'plain', 'self-raising', 'self', 'raising',
  'finely', 'roughly', 'thinly', 'a', 'of', 'and', 'or', 'for', 'the',
]);

// Overrides manuales para casos frecuentes donde el fuzzy-match genérico falla o es ambiguo.
const SYNONYM_OVERRIDES: Record<string, string> = {
  'oil': 'Oil, olive, salad or cooking',
  'olive oil': 'Oil, olive, salad or cooking',
  'vegetable oil': 'Oil, vegetable, safflower, salad or cooking',
  'butter': 'Butter, without salt',
  'sugar': 'Sugars, granulated',
  'flour': 'Wheat flour, white, all-purpose, enriched, bleached',
  'plain flour': 'Wheat flour, white, all-purpose, enriched, bleached',
  'self-raising flour': 'Wheat flour, white, all-purpose, enriched, bleached',
  'milk': 'Milk, whole, 3.25% milkfat, with added vitamin D',
  'egg': 'Egg, whole, raw, fresh',
  'eggs': 'Egg, whole, raw, fresh',
  'water': null as any,
  'salt': null as any,
  'onion': 'Onions, raw',
  'garlic': 'Garlic, raw',
  'tomato': 'Tomatoes, red, ripe, raw, year round average',
  'tomatoes': 'Tomatoes, red, ripe, raw, year round average',
  'rice': 'Rice, white, long-grain, regular, raw, unenriched',
  'chicken breast': 'Chicken, broilers or fryers, breast, meat only, raw',
  'chicken': 'Chicken, broilers or fryers, meat and skin, raw',
  'cheese': 'Cheese, cheddar',
  'cream': 'Cream, fluid, heavy whipping',
};

// Peso "unidad completa" aproximado (gramos) para ingredientes contados por pieza sin unidad explícita.
const WHOLE_ITEM_GRAMS: Record<string, number> = {
  'egg': 50, 'eggs': 50, 'onion': 110, 'onions': 110, 'tomato': 120, 'tomatoes': 120,
  'potato': 170, 'potatoes': 170, 'carrot': 60, 'carrots': 60, 'banana': 120,
  'apple': 180, 'lemon': 60, 'lime': 45, 'clove': 5, 'cloves': 5,
};

function normalizeIngredientName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantWords(normalized: string): string[] {
  return normalized.split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function parseMeasureToGrams(measure: string, ingredientName: string): number {
  const m = (measure || '').toLowerCase().trim();
  if (!m || /to taste|as needed|as required|optional/.test(m)) return 0;

  // Peso explícito en gramos (ej. "200g", "250 g", "1 can (400g)") tiene prioridad sobre todo lo demás.
  const explicitGrams = m.match(/(\d+(?:\.\d+)?)\s*g(?:rams?)?\b/);
  if (explicitGrams) return parseFloat(explicitGrams[1]);
  const explicitKg = m.match(/(\d+(?:\.\d+)?)\s*kg\b/);
  if (explicitKg) return parseFloat(explicitKg[1]) * 1000;

  const fractionMap: Record<string, number> = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 0.333, '⅔': 0.667 };
  let qtyMatch = m.match(/^(\d+)\/(\d+)/) || m.match(/^(\d+(?:\.\d+)?)/);
  let qty = 1;
  if (qtyMatch) {
    qty = qtyMatch.length === 3 ? parseFloat(qtyMatch[1]) / parseFloat(qtyMatch[2]) : parseFloat(qtyMatch[1]);
  }
  const fracChar = m.match(/[¼½¾⅓⅔]/);
  if (fracChar) qty += fractionMap[fracChar[0]] || 0;

  const isDry = /flour|sugar|cocoa|oats|rice|breadcrumb/.test(ingredientName.toLowerCase());

  if (/\bl\b|liter|litre/.test(m)) return qty * 1000;
  if (/ml|millilit/.test(m)) return qty;
  if (/cup/.test(m)) return qty * (isDry ? 150 : 225);
  if (/tbsp|tablespoon/.test(m)) return qty * 15;
  if (/tsp|teaspoon/.test(m)) return qty * 5;
  if (/oz|ounce/.test(m)) return qty * 28.35;
  if (/lb|pound/.test(m)) return qty * 453.6;
  if (/pinch/.test(m)) return qty * 1;
  if (/clove/.test(m)) return qty * 5;
  if (/slice/.test(m)) return qty * 25;
  if (/can\b/.test(m)) return qty * 400;

  const nameLower = ingredientName.toLowerCase();
  for (const key of Object.keys(WHOLE_ITEM_GRAMS)) {
    if (nameLower.includes(key)) return qty * WHOLE_ITEM_GRAMS[key];
  }
  if (qtyMatch) return qty * 50; // "whole item" genérico sin unidad reconocida
  return 15; // fallback conservador para medidas no reconocibles
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.');
    process.exit(1);
  }
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  console.log('Descargando recetas...');
  const recipesRes = await fetch(`${supabaseUrl}/rest/v1/recipes?select=id,ingredients&limit=1000`, { headers });
  const recipes: { id: string; ingredients: { name: string; measure: string }[] }[] = await recipesRes.json();
  console.log(`  ${recipes.length} recetas descargadas.`);

  const matchCache = new Map<string, { kcal: number; protein: number; carbs: number; fat: number } | null>();
  const unmatched = new Set<string>();

  async function matchIngredient(name: string): Promise<{ kcal: number; protein: number; carbs: number; fat: number } | null> {
    const normalized = normalizeIngredientName(name);
    if (matchCache.has(normalized)) return matchCache.get(normalized)!;

    if (normalized in SYNONYM_OVERRIDES || Object.prototype.hasOwnProperty.call(SYNONYM_OVERRIDES, normalized)) {
      const overrideDesc = SYNONYM_OVERRIDES[normalized];
      if (overrideDesc === null) { matchCache.set(normalized, null); return null; } // agua/sal: sin aporte calórico relevante
      if (overrideDesc) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/usda_foods?description=eq.${encodeURIComponent(overrideDesc)}&select=kcal_per_100g,protein_g_per_100g,carbs_g_per_100g,fat_g_per_100g&limit=1`,
          { headers }
        );
        const rows = await res.json();
        if (rows[0]) {
          const result = { kcal: rows[0].kcal_per_100g, protein: rows[0].protein_g_per_100g, carbs: rows[0].carbs_g_per_100g, fat: rows[0].fat_g_per_100g };
          matchCache.set(normalized, result);
          return result;
        }
      }
    }

    const words = significantWords(normalized);
    if (words.length === 0) { matchCache.set(normalized, null); return null; }

    const filters = words.map((w) => `description=ilike.*${encodeURIComponent(w)}*`).join('&');
    const res = await fetch(
      `${supabaseUrl}/rest/v1/usda_foods?${filters}&select=description,kcal_per_100g,protein_g_per_100g,carbs_g_per_100g,fat_g_per_100g&limit=20`,
      { headers }
    );
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      const best = rows.sort((a: any, b: any) => a.description.length - b.description.length)[0];
      const result = { kcal: best.kcal_per_100g, protein: best.protein_g_per_100g, carbs: best.carbs_g_per_100g, fat: best.fat_g_per_100g };
      matchCache.set(normalized, result);
      return result;
    }

    matchCache.set(normalized, null);
    unmatched.add(name);
    return null;
  }

  let processed = 0;
  let withNutrition = 0;
  for (const recipe of recipes) {
    let totalKcal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    let anyMatched = false;

    for (const ing of recipe.ingredients || []) {
      const macros = await matchIngredient(ing.name);
      if (!macros) continue;
      const grams = parseMeasureToGrams(ing.measure, ing.name);
      const factor = grams / 100;
      totalKcal += macros.kcal * factor;
      totalProtein += macros.protein * factor;
      totalCarbs += macros.carbs * factor;
      totalFat += macros.fat * factor;
      anyMatched = true;
    }

    processed++;
    if (anyMatched && totalKcal > 0) {
      withNutrition++;
      const patchRes = await fetch(`${supabaseUrl}/rest/v1/recipes?id=eq.${recipe.id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          calories: Math.round(totalKcal / ASSUMED_SERVINGS),
          protein_g: Math.round((totalProtein / ASSUMED_SERVINGS) * 10) / 10,
          carbs_g: Math.round((totalCarbs / ASSUMED_SERVINGS) * 10) / 10,
          fat_g: Math.round((totalFat / ASSUMED_SERVINGS) * 10) / 10,
          nutrition_is_estimated: true,
        }),
      });
      if (!patchRes.ok) {
        console.error(`Error al actualizar receta ${recipe.id}: ${patchRes.status} ${await patchRes.text()}`);
      }
    }
    if (processed % 50 === 0) console.log(`  Procesadas ${processed}/${recipes.length} (con nutrición: ${withNutrition})`);
  }

  console.log(`\nListo. ${withNutrition}/${recipes.length} recetas con nutrición calculada.`);
  console.log(`Ingredientes sin match (${unmatched.size}):`, [...unmatched].slice(0, 40).join(', '));
}

main();
