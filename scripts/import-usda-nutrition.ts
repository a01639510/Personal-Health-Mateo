// Script de un solo uso: transforma el dataset USDA FoodData Central "SR Legacy"
// (CSV, descargado manualmente desde https://fdc.nal.usda.gov/download-datasets/)
// y lo sube a la tabla `usda_foods` en Supabase vía REST directo.
//
// Requiere que la tabla `usda_foods` ya exista (ver scripts/setup_nutrition_tables.sql).
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/import-usda-nutrition.ts --dir /ruta/a/FoodData_Central_sr_legacy_food_csv_2018-04

import { readFileSync } from 'fs';
import { join } from 'path';

const NUTRIENT_IDS = {
  kcal: '1008',   // "Energy" (KCAL)
  protein: '1003', // "Protein" (G)
  fat: '1004',     // "Total lipid (fat)" (G)
  carbs: '1005',   // "Carbohydrate, by difference" (G)
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseCsvFile(path: string): string[][] {
  const raw = readFileSync(path, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  return lines.slice(1).map(parseCsvLine); // skip header row
}

async function main() {
  const dirArgIndex = process.argv.indexOf('--dir');
  if (dirArgIndex === -1 || !process.argv[dirArgIndex + 1]) {
    console.error('Uso: npx tsx scripts/import-usda-nutrition.ts --dir /ruta/a/FoodData_Central_sr_legacy_food_csv_2018-04');
    process.exit(1);
  }
  const dir = process.argv[dirArgIndex + 1];

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.');
    process.exit(1);
  }

  console.log('Leyendo food_category.csv...');
  const categoryRows = parseCsvFile(join(dir, 'food_category.csv'));
  const categoryMap = new Map<string, string>(); // id -> description
  for (const [id, , description] of categoryRows) categoryMap.set(id, description);

  console.log('Leyendo food.csv...');
  const foodRows = parseCsvFile(join(dir, 'food.csv'));
  const foodMap = new Map<string, { description: string; categoryId: string }>();
  for (const [fdcId, , description, foodCategoryId] of foodRows) {
    foodMap.set(fdcId, { description, categoryId: foodCategoryId });
  }
  console.log(`  ${foodMap.size} alimentos encontrados.`);

  console.log('Leyendo food_nutrient.csv (puede tardar unos segundos)...');
  const nutrientRows = parseCsvFile(join(dir, 'food_nutrient.csv'));
  const macrosByFood = new Map<string, { kcal?: number; protein?: number; fat?: number; carbs?: number }>();
  for (const row of nutrientRows) {
    const [, fdcId, nutrientId, amountStr] = row;
    let key: keyof typeof NUTRIENT_IDS | null = null;
    if (nutrientId === NUTRIENT_IDS.kcal) key = 'kcal';
    else if (nutrientId === NUTRIENT_IDS.protein) key = 'protein';
    else if (nutrientId === NUTRIENT_IDS.fat) key = 'fat';
    else if (nutrientId === NUTRIENT_IDS.carbs) key = 'carbs';
    if (!key) continue;

    const amount = parseFloat(amountStr);
    if (Number.isNaN(amount)) continue;

    const entry = macrosByFood.get(fdcId) || {};
    entry[key] = amount;
    macrosByFood.set(fdcId, entry);
  }
  console.log(`  ${macrosByFood.size} alimentos con al menos un macro encontrado.`);

  const records: any[] = [];
  for (const [fdcId, macros] of macrosByFood.entries()) {
    if (macros.kcal === undefined) continue; // sin energía no sirve para nuestro cálculo
    const food = foodMap.get(fdcId);
    if (!food) continue;
    records.push({
      fdc_id: Number(fdcId),
      description: food.description,
      food_category: categoryMap.get(food.categoryId) || null,
      kcal_per_100g: macros.kcal,
      protein_g_per_100g: macros.protein ?? 0,
      carbs_g_per_100g: macros.carbs ?? 0,
      fat_g_per_100g: macros.fat ?? 0,
    });
  }
  console.log(`Total de registros a subir: ${records.length}`);

  const CHUNK_SIZE = 500;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const res = await fetch(`${supabaseUrl}/rest/v1/usda_foods?on_conflict=fdc_id`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Error en chunk ${i}-${i + chunk.length}: ${res.status} ${text}`);
      process.exit(1);
    }
    console.log(`  Subido chunk ${i}-${i + chunk.length}`);
  }

  console.log('Listo.');
}

main();
