import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const aiAlt = process.env.GEMINI_API_KEY_ALT
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY_ALT,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    })
  : null;

const GEMINI_MODEL = 'gemini-3.5-flash';

function isRetryableGeminiError(error: any): boolean {
  const msg = (error?.message || '').toString();
  return /UNAVAILABLE|"code":503|overloaded|high demand|RESOURCE_EXHAUSTED|"code":429|quota/i.test(msg);
}

function isQuotaExhaustedError(error: any): boolean {
  const msg = (error?.message || '').toString();
  return /RESOURCE_EXHAUSTED|"code":429|quota/i.test(msg);
}

// Reintenta con backoff; si la key principal se queda sin cuota y hay una key de
// respaldo (GEMINI_API_KEY_ALT) configurada, cambia a esa automáticamente.
async function generateWithRetry(params: Parameters<typeof ai.models.generateContent>[0], retries = 2, baseDelayMs = 1000) {
  let client = ai;
  let switchedToAlt = false;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await client.models.generateContent(params);
    } catch (error: any) {
      if (isQuotaExhaustedError(error) && aiAlt && !switchedToAlt) {
        client = aiAlt;
        switchedToAlt = true;
        continue;
      }
      if (attempt === retries || !isRetryableGeminiError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }
  throw new Error('No se pudo completar la solicitud a Gemini tras varios intentos.');
}

function friendlyGeminiErrorMessage(error: any, fallback: string): string {
  if (isRetryableGeminiError(error)) {
    return 'El servicio de IA está saturado en este momento. Espera unos segundos e intenta de nuevo.';
  }
  return error?.message || fallback;
}

const recipeCache = new Map<number, any>();

const app = express();

app.use(express.json({ limit: '15mb' }));

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

const DATABASE_SETUP_SQL = `-- Copia y ejecuta este script SQL en el "SQL Editor" de tu panel de Supabase:

-- 1. Tabla de Recetas Favoritas
CREATE TABLE IF NOT EXISTS public.saved_recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    spoonacular_id BIGINT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    image_url TEXT,
    nutrition JSONB,
    ingredients JSONB,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo en saved_recipes" ON public.saved_recipes FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabla de Historial de Escaneos de Despensa
CREATE TABLE IF NOT EXISTS public.pantry_scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    photo_url TEXT,
    detected_items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pantry_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo en pantry_scans" ON public.pantry_scans FOR ALL USING (true) WITH CHECK (true);
`;

function isSchemaError(error: any): boolean {
  if (!error) return false;
  const errMsg = (error.message || '').toLowerCase();
  const errDetails = (error.details || '').toLowerCase();
  const errCode = error.code || '';
  return (
    errCode === '42P01' ||
    errCode === 'PGRST205' ||
    errMsg.includes('does not exist') ||
    errMsg.includes('no existe la relación') ||
    errMsg.includes('schema cache') ||
    errMsg.includes('could not find the table') ||
    errDetails.includes('does not exist') ||
    errDetails.includes('no existe la relación') ||
    errDetails.includes('schema cache')
  );
}

function checkEnvKeys(keys: string[], res: express.Response): boolean {
  const missing = keys.filter(key => !process.env[key]);
  if (missing.length > 0) {
    res.status(500).json({
      error: 'Configuración incompleta',
      message: `Faltan las siguientes variables de entorno: ${missing.join(', ')}. Por favor, configúralas para continuar.`
    });
    return false;
  }
  return true;
}

function getFoodImage(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('pasta') || t.includes('fideos') || t.includes('tallarines') || t.includes('lasaña') || t.includes('spaghetti') || t.includes('macarrones')) {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
  }
  if (t.includes('ensalada') || t.includes('salad') || t.includes('lechuga') || t.includes('verdura')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80';
  }
  if (t.includes('carne') || t.includes('res') || t.includes('bife') || t.includes('asado') || t.includes('lomito') || t.includes('cerdo') || t.includes('puerco')) {
    return 'https://images.unsplash.com/photo-1432139534695-9c8401a31c4f?w=600&auto=format&fit=crop&q=80';
  }
  if (t.includes('pollo') || t.includes('pavo') || t.includes('ave') || t.includes('chicken') || t.includes('alitas')) {
    return 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600&auto=format&fit=crop&q=80';
  }
  if (t.includes('sopa') || t.includes('caldo') || t.includes('crema') || t.includes('consome')) {
    return 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80';
  }
  if (t.includes('postre') || t.includes('dulce') || t.includes('tarta') || t.includes('pastel') || t.includes('chocolate') || t.includes('helado') || t.includes('flan')) {
    return 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop&q=80';
  }
  if (t.includes('pescado') || t.includes('marisco') || t.includes('salmon') || t.includes('atun') || t.includes('camaron') || t.includes('mariscos') || t.includes('ceviche')) {
    return 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80';
  }
  if (t.includes('arroz') || t.includes('paella') || t.includes('risotto')) {
    return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80';
  }
  if (t.includes('desayuno') || t.includes('huevo') || t.includes('panqueques') || t.includes('tostadas') || t.includes('omlette')) {
    return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80';
  }
  if (t.includes('jugo') || t.includes('bebida') || t.includes('licuado') || t.includes('cocktail') || t.includes('cafe') || t.includes('té')) {
    return 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80';
}

const SECONDARY_INGREDIENT_KEYWORDS = /\b(sal|pimienta|especias?|condimento|aceite|mantequilla|margarina|az[uú]car|vinagre|salsa de soya|salsa soya|caldo en cubo|consom[eé] en polvo|ajo en polvo|cebolla en polvo|ol(i|í)va oil|salt|pepper|spice|seasoning|oil|butter|sugar|vinegar|soy sauce|bouillon|garlic powder|onion powder)\b/i;

function isSecondaryIngredientName(name: string): boolean {
  return SECONDARY_INGREDIENT_KEYWORDS.test((name || '').toLowerCase());
}

app.post('/api/identify-ingredients', async (req, res) => {
  try {
    if (!checkEnvKeys(['GEMINI_API_KEY'], res)) return;

    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Falta la imagen en formato base64' });
    }

    let base64Data = imageBase64;
    let mimeType = 'image/jpeg';
    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      base64Data = parts[1];
    }

    let photoUrl = '';
    if (supabase) {
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `pantry_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('pantry-photos')
          .upload(fileName, buffer, { contentType: mimeType, upsert: true });

        if (uploadError) {
          console.error('Error al subir foto a Supabase Storage:', uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage.from('pantry-photos').getPublicUrl(fileName);
          photoUrl = publicUrlData?.publicUrl || '';
        }
      } catch (storageErr) {
        console.error('Excepción al interactuar con Supabase Storage:', storageErr);
      }
    }

    const imagePart = { inlineData: { mimeType, data: base64Data } };
    const textPart = { text: "Analiza la foto del refrigerador, despensa o ingredientes y detecta todos los ingredientes comestibles visibles. Clasifícalos y califica tu nivel de confianza en la detección." };
    const systemInstruction = "Eres un chef experto e IA de visión avanzada de Google. Detecta todos los ingredientes de alimentos visibles en la imagen. Responde con un JSON estructurado según el esquema solicitado. En la categoría usa nombres cortos en español como: Verdura, Lácteo, Carne, Fruta, Huevo, Salsa, Condimento, Legumbre, Panadería, Pescado u Otros. Para confidence usa únicamente: alta, media, o baja.";

    const response = await generateWithRetry({
      model: GEMINI_MODEL,
      contents: [imagePart, textPart],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Nombre del ingrediente en español (ej: jitomate, leche, pollo)" },
                  category: { type: Type.STRING, description: "Categoría del ingrediente" },
                  confidence: { type: Type.STRING, description: "alta, media, baja" }
                },
                required: ["name", "category", "confidence"]
              }
            }
          },
          required: ["ingredients"]
        }
      }
    });

    const responseText = response.text || '{"ingredients": []}';
    const parsedResult = JSON.parse(responseText.trim());

    if (!parsedResult || !Array.isArray(parsedResult.ingredients)) {
      throw new Error("Formato de respuesta inválido de Gemini");
    }

    let savedScan = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('pantry_scans')
          .insert({ photo_url: photoUrl || null, detected_items: parsedResult.ingredients })
          .select()
          .single();
        if (error) {
          console.error('Error al guardar escaneo en Supabase pantry_scans:', error);
        } else {
          savedScan = data;
        }
      } catch (dbErr) {
        console.error('Excepción al insertar en pantry_scans:', dbErr);
      }
    }

    res.json({
      success: true,
      scanId: savedScan?.id || null,
      photoUrl: photoUrl || null,
      ingredients: parsedResult.ingredients
    });
  } catch (error: any) {
    console.error('Error en /api/identify-ingredients con Gemini:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: friendlyGeminiErrorMessage(error, 'Ocurrió un error inesperado al procesar la foto con Gemini.')
    });
  }
});

app.post('/api/find-recipes', async (req, res) => {
  try {
    if (!checkEnvKeys(['GEMINI_API_KEY'], res)) return;

    const { ingredients } = req.body;
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Falta la lista de ingredientes' });
    }

    const systemInstruction = "Eres un chef profesional creativo de habla hispana. Sugiere de 6 a 10 recetas deliciosas y fáciles que se puedan preparar priorizando la lista de ingredientes que el usuario proporciona. Indica claramente cuántos ingredientes de la lista del usuario se usan (usedIngredients) y cuáles ingredientes adicionales no listados son necesarios (missedIngredients). Para cada ingrediente de usedIngredients y missedIngredients, marca isSecondary: true si es un ingrediente básico de despensa que casi cualquier cocina tiene y que NO debería impedir preparar la receta (especias, hierbas secas, sal, pimienta, aceite, mantequilla, vinagre, azúcar como condimento, salsas de condimento); usa isSecondary: false para proteínas, vegetales, lácteos principales, granos, y cualquier ingrediente central de la receta. Responde en formato JSON según el esquema especificado.";
    const promptText = `Sugiéreme recetas deliciosas que pueda preparar usando principalmente estos ingredientes: ${ingredients.join(', ')}.`;

    const response = await generateWithRetry({
      model: GEMINI_MODEL,
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER, description: "ID numérico único entre 10000 y 99999" },
                  title: { type: Type.STRING },
                  usedIngredientCount: { type: Type.INTEGER },
                  missedIngredientCount: { type: Type.INTEGER },
                  usedIngredients: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { name: { type: Type.STRING }, amount: { type: Type.NUMBER }, unit: { type: Type.STRING }, isSecondary: { type: Type.BOOLEAN } },
                      required: ["name", "isSecondary"]
                    }
                  },
                  missedIngredients: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { name: { type: Type.STRING }, amount: { type: Type.NUMBER }, unit: { type: Type.STRING }, isSecondary: { type: Type.BOOLEAN } },
                      required: ["name", "isSecondary"]
                    }
                  }
                },
                required: ["id", "title", "usedIngredientCount", "missedIngredientCount", "usedIngredients", "missedIngredients"]
              }
            }
          },
          required: ["recipes"]
        }
      }
    });

    const responseText = response.text || '{"recipes": []}';
    const parsedResult = JSON.parse(responseText.trim());

    const recipes = (parsedResult.recipes || []).map((recipe: any) => {
      const usedIngredients = (recipe.usedIngredients || []).map((i: any) => ({
        ...i,
        isSecondary: i.isSecondary === true || isSecondaryIngredientName(i.name)
      }));
      const missedIngredients = (recipe.missedIngredients || []).map((i: any) => ({
        ...i,
        isSecondary: i.isSecondary === true || isSecondaryIngredientName(i.name)
      }));
      const missedIngredientCount = missedIngredients.filter((i: any) => !i.isSecondary).length;
      const missedIngredientCountSecondary = missedIngredients.length - missedIngredientCount;

      const enrichedRecipe = {
        ...recipe,
        usedIngredients,
        missedIngredients,
        usedIngredientCount: usedIngredients.length,
        missedIngredientCount,
        missedIngredientCountSecondary,
        image: getFoodImage(recipe.title)
      };
      recipeCache.set(recipe.id, enrichedRecipe);
      return enrichedRecipe;
    });

    res.json({ recipes });
  } catch (error: any) {
    console.error('Error en /api/find-recipes con Gemini:', error);
    res.status(500).json({
      error: 'Error interno al buscar recetas',
      message: friendlyGeminiErrorMessage(error, 'No se pudo conectar con el servicio de recetas de Gemini.')
    });
  }
});

app.get('/api/recipe/:id', async (req, res) => {
  try {
    if (!checkEnvKeys(['GEMINI_API_KEY'], res)) return;

    const recipeId = Number(req.params.id);
    let cached = recipeCache.get(recipeId);

    let title = "";
    if (!cached && supabase) {
      try {
        const { data } = await supabase
          .from('saved_recipes')
          .eq('spoonacular_id', recipeId)
          .select('*')
          .maybeSingle();
        if (data) {
          cached = { id: recipeId, title: data.title, image: data.image_url, usedIngredients: data.ingredients || [] };
        }
      } catch (dbErr) {
        console.error('Error al recuperar receta guardada para generar detalle:', dbErr);
      }
    }

    title = cached ? cached.title : "Receta Saludable de ChefScan";

    const systemInstruction = "Eres un chef experto de habla hispana. Tu labor es detallar por completo las instrucciones de preparación, resumen, ingredientes detallados con cantidades (extendedIngredients) y desglose nutricional de una receta de cocina específica. Responde en formato JSON cumpliendo exactamente con el esquema esperado.";
    const ingredientsDesc = cached && cached.usedIngredients
      ? `que usa ingredientes como: ${cached.usedIngredients.map((i: any) => i.name).join(', ')}`
      : "";
    const promptText = `Genera la receta detallada para: "${title}" ${ingredientsDesc}. Proporciona el tiempo de preparación (readyInMinutes, un número entero entre 10 y 60), el número de porciones (servings, un número entero entre 1 y 6), un resumen corto de 1 párrafo (summary), la lista detallada de ingredientes (extendedIngredients) con sus cantidades y unidades, y los pasos numerados de preparación (analyzedInstructions). También incluye información nutricional con calorías, proteínas, carbohidratos y grasas.`;

    const response = await generateWithRetry({
      model: GEMINI_MODEL,
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            readyInMinutes: { type: Type.INTEGER },
            servings: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            extendedIngredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, original: { type: Type.STRING }, amount: { type: Type.NUMBER }, unit: { type: Type.STRING } },
                required: ["name", "original", "amount", "unit"]
              }
            },
            analyzedInstructions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  steps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { number: { type: Type.INTEGER }, step: { type: Type.STRING } },
                      required: ["number", "step"]
                    }
                  }
                },
                required: ["steps"]
              }
            },
            nutrition: {
              type: Type.OBJECT,
              properties: {
                nutrients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { name: { type: Type.STRING }, amount: { type: Type.NUMBER }, unit: { type: Type.STRING } },
                    required: ["name", "amount", "unit"]
                  }
                }
              },
              required: ["nutrients"]
            }
          },
          required: ["readyInMinutes", "servings", "summary", "extendedIngredients", "analyzedInstructions", "nutrition"]
        }
      }
    });

    const responseText = response.text || '{}';
    const parsedDetail = JSON.parse(responseText.trim());

    const fullRecipeDetail = {
      id: recipeId,
      title,
      image: cached?.image || getFoodImage(title),
      summary: parsedDetail.summary || `Una deliciosa receta de ${title}.`,
      readyInMinutes: parsedDetail.readyInMinutes || 30,
      servings: parsedDetail.servings || 4,
      extendedIngredients: parsedDetail.extendedIngredients || [],
      analyzedInstructions: parsedDetail.analyzedInstructions || [{ name: "", steps: [] }],
      nutrition: parsedDetail.nutrition || { nutrients: [] }
    };

    res.json({ recipe: fullRecipeDetail });
  } catch (error: any) {
    console.error(`Error en GET /api/recipe/${req.params.id} con Gemini:`, error);
    res.status(500).json({
      error: 'Error al obtener detalle de la receta',
      message: friendlyGeminiErrorMessage(error, 'No se pudo generar la información detallada con Gemini.')
    });
  }
});

app.post('/api/save-recipe', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], res)) return;

    const { spoonacular_id, title, image_url, nutrition, ingredients } = req.body;
    if (!spoonacular_id || !title) {
      return res.status(400).json({ error: 'spoonacular_id y title son campos requeridos.' });
    }
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const { data, error } = await supabase
      .from('saved_recipes')
      .insert({ spoonacular_id, title, image_url, nutrition, ingredients })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, savedRecipe: data });
  } catch (error: any) {
    console.error('Error en /api/save-recipe:', error);
    const schemaMissing = isSchemaError(error);
    res.status(500).json({
      error: 'Error al guardar la receta en favoritos',
      message: schemaMissing ? 'La tabla "saved_recipes" no existe en tu base de datos de Supabase.' : (error.message || 'Ocurrió un error al intentar registrar la receta en Supabase.'),
      isSchemaMissing: schemaMissing,
      sql: schemaMissing ? DATABASE_SETUP_SQL : undefined
    });
  }
});

app.get('/api/saved-recipes', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], res)) return;
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const { data, error } = await supabase.from('saved_recipes').select('*').order('saved_at', { ascending: false });
    if (error) throw error;

    res.json({ savedRecipes: data || [] });
  } catch (error: any) {
    console.error('Error en GET /api/saved-recipes:', error);
    const schemaMissing = isSchemaError(error);
    res.status(500).json({
      error: 'Error al consultar recetas favoritas',
      message: schemaMissing ? 'La tabla "saved_recipes" no existe en tu base de datos de Supabase.' : (error.message || 'No se pudo leer la tabla de favoritos en Supabase.'),
      isSchemaMissing: schemaMissing,
      sql: schemaMissing ? DATABASE_SETUP_SQL : undefined
    });
  }
});

app.delete('/api/saved-recipes/:id', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], res)) return;
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const { data, error } = await supabase.from('saved_recipes').delete().eq('id', req.params.id).select();
    if (error) throw error;

    res.json({ success: true, deleted: data });
  } catch (error: any) {
    console.error(`Error en DELETE /api/saved-recipes/${req.params.id}:`, error);
    const schemaMissing = isSchemaError(error);
    res.status(500).json({
      error: 'Error al eliminar receta favorita',
      message: schemaMissing ? 'La tabla "saved_recipes" no existe en tu base de datos de Supabase.' : (error.message || 'No se pudo eliminar el registro en Supabase.'),
      isSchemaMissing: schemaMissing,
      sql: schemaMissing ? DATABASE_SETUP_SQL : undefined
    });
  }
});

app.get('/api/scans', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], res)) return;
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const { data, error } = await supabase.from('pantry_scans').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    res.json({ scans: data || [] });
  } catch (error: any) {
    console.error('Error en GET /api/scans:', error);
    const schemaMissing = isSchemaError(error);
    res.status(500).json({
      error: 'Error al consultar historial de escaneos',
      message: schemaMissing ? 'La tabla "pantry_scans" no existe en tu base de datos de Supabase.' : (error.message || 'No se pudo leer la tabla de escaneos.'),
      isSchemaMissing: schemaMissing,
      sql: schemaMissing ? DATABASE_SETUP_SQL : undefined
    });
  }
});

// 8. ENDPOINT: Cookbook — browse the local recipe library (no Gemini calls)
app.get('/api/cookbook', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], res)) return;
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const { q, category, area, tag, page, limit } = req.query as Record<string, string | undefined>;
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(60, Math.max(1, parseInt(limit || '24', 10) || 24));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabase
      .from('recipes')
      .select('id, external_id, title, title_es, image_url, category, area, tags', { count: 'exact' })
      .order('title', { ascending: true })
      .range(from, to);

    if (q) query = query.ilike('title', `%${q}%`);
    if (category) query = query.eq('category', category);
    if (area) query = query.eq('area', area);
    if (tag) query = query.contains('tags', [tag]);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ recipes: data || [], total: count || 0, page: pageNum, limit: limitNum });
  } catch (error: any) {
    console.error('Error en GET /api/cookbook:', error);
    res.status(500).json({
      error: 'Error al consultar el recetario',
      message: error.message || 'No se pudo leer la tabla de recetas.'
    });
  }
});

// 9. ENDPOINT: Cookbook filter options (distinct categories/areas)
app.get('/api/cookbook/filters', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], res)) return;
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const { data, error } = await supabase.from('recipes').select('category, area');
    if (error) throw error;

    const categories = Array.from(new Set((data || []).map((r: any) => r.category).filter(Boolean))).sort();
    const areas = Array.from(new Set((data || []).map((r: any) => r.area).filter(Boolean))).sort();

    res.json({ categories, areas });
  } catch (error: any) {
    console.error('Error en GET /api/cookbook/filters:', error);
    res.status(500).json({
      error: 'Error al obtener los filtros del recetario',
      message: error.message || 'No se pudieron leer las categorías.'
    });
  }
});

// 10. ENDPOINT: Cookbook recipe detail
app.get('/api/cookbook/:id', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], res)) return;
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const { data, error } = await supabase.from('recipes').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    res.json({ recipe: data });
  } catch (error: any) {
    console.error(`Error en GET /api/cookbook/${req.params.id}:`, error);
    res.status(500).json({
      error: 'Error al obtener la receta',
      message: error.message || 'No se pudo generar el detalle de la receta.'
    });
  }
});

// 11. ENDPOINT (admin, uso único): traduce un lote de recetas del Recetario al español vía Gemini.
// Se llama repetidamente con un límite pequeño hasta que "remaining" sea 0 (evita timeouts de función serverless).
app.post('/api/admin/translate-recipes', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'], res)) return;
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const limitNum = Math.min(50, Math.max(1, parseInt((req.body?.limit ?? req.query?.limit ?? '40') as string, 10) || 40));

    const { data: pendingPool, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title, instructions, ingredients')
      .is('title_es', null)
      .limit(300);
    if (fetchError) throw fetchError;

    // Prioriza recetas con pollo mientras se agota la cuota de Gemini.
    const isChickenRecipe = (r: any) =>
      /chicken/i.test(r.title) || (r.ingredients || []).some((i: any) => /chicken/i.test(i.name || ''));
    const pending = [...(pendingPool || [])]
      .sort((a, b) => Number(isChickenRecipe(b)) - Number(isChickenRecipe(a)))
      .slice(0, limitNum);

    const { count: remainingBefore } = await supabase
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .is('title_es', null);

    let translated = 0;
    const errors: string[] = [];

    if (pending && pending.length > 0) {
      try {
        const batchPayload = pending.map((r: any) => ({
          id: r.id,
          title: r.title,
          ingredient_names: (r.ingredients || []).map((i: any) => i.name),
          instructions: (r.instructions || '').slice(0, 3000),
        }));

        const promptText = `Traduce al español ${batchPayload.length} recetas de cocina. Para cada receta traduce el título, la lista de nombres de ingredientes (mismo orden y misma cantidad de elementos, no omitas ninguno) y las instrucciones de preparación. Usa lenguaje natural y culinario en español, no traducción literal palabra por palabra. Recetas en JSON: ${JSON.stringify(batchPayload)}`;

        const response = await generateWithRetry({
          model: GEMINI_MODEL,
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recipes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title_es: { type: Type.STRING },
                      instructions_es: { type: Type.STRING },
                      ingredient_names_es: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['id', 'title_es', 'instructions_es', 'ingredient_names_es'],
                  },
                },
              },
              required: ['recipes'],
            },
          },
        }, 3, 15000);

        const parsed = JSON.parse((response.text || '{}').trim());
        const byId = new Map<string, any>((parsed.recipes || []).map((r: any) => [r.id, r]));

        for (const recipe of pending) {
          try {
            const translation = byId.get(recipe.id);
            if (!translation) throw new Error('Gemini no devolvió traducción para esta receta');

            const translatedNames: string[] = translation.ingredient_names_es || [];
            const ingredientsEs = (recipe.ingredients || []).map((ing: any, idx: number) => ({
              name: translatedNames[idx] || ing.name,
              measure: ing.measure,
            }));

            const { error: patchError } = await supabase
              .from('recipes')
              .update({
                title_es: translation.title_es || recipe.title,
                instructions_es: translation.instructions_es || recipe.instructions,
                ingredients_es: ingredientsEs,
              })
              .eq('id', recipe.id);
            if (patchError) throw patchError;

            translated++;
          } catch (err: any) {
            errors.push(`${recipe.id}: ${err.message || err}`);
          }
        }
      } catch (batchErr: any) {
        errors.push(`batch: ${batchErr.message || batchErr}`);
      }
    }

    const remaining = Math.max(0, (remainingBefore || 0) - translated);
    res.json({ translated, remaining, errors });
  } catch (error: any) {
    console.error('Error en /api/admin/translate-recipes:', error);
    res.status(500).json({
      error: 'Error al traducir recetas',
      message: friendlyGeminiErrorMessage(error, error.message || 'Error inesperado durante la traducción.')
    });
  }
});

// 12. ENDPOINT: buscar alimentos en la referencia USDA para registro manual.
app.get('/api/food-search', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], res)) return;
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const q = (req.query.q as string || '').trim();
    if (!q) return res.json({ foods: [] });

    const { data, error } = await supabase
      .from('usda_foods')
      .select('fdc_id, description, kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g')
      .ilike('description', `%${q}%`)
      .limit(20);
    if (error) throw error;

    const foods = (data || []).sort((a: any, b: any) => a.description.length - b.description.length);
    res.json({ foods });
  } catch (error: any) {
    console.error('Error en GET /api/food-search:', error);
    res.status(500).json({ error: 'Error al buscar alimentos', message: error.message || 'No se pudo consultar la base de alimentos.' });
  }
});

// 13. ENDPOINTS: registro de comidas (food log)
app.post('/api/food-log', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], res)) return;
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const { source, source_id, name, calories, protein_g, carbs_g, fat_g } = req.body;
    if (!source || !name) {
      return res.status(400).json({ error: 'source y name son campos requeridos.' });
    }

    const { data, error } = await supabase
      .from('food_log')
      .insert({
        source,
        source_id: source_id || null,
        name,
        calories: calories || 0,
        protein_g: protein_g || 0,
        carbs_g: carbs_g || 0,
        fat_g: fat_g || 0,
      })
      .select()
      .single();
    if (error) throw error;

    res.json({ success: true, entry: data });
  } catch (error: any) {
    console.error('Error en POST /api/food-log:', error);
    const schemaMissing = isSchemaError(error);
    res.status(500).json({
      error: 'Error al registrar la comida',
      message: schemaMissing ? 'La tabla "food_log" no existe en tu base de datos de Supabase.' : (error.message || 'No se pudo registrar la comida.'),
      isSchemaMissing: schemaMissing,
    });
  }
});

app.get('/api/food-log', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], res)) return;
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const dateParam = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);

    const { data, error } = await supabase
      .from('food_log')
      .select('*')
      .gte('logged_at', startOfDay.toISOString())
      .lte('logged_at', endOfDay.toISOString())
      .order('logged_at', { ascending: false });
    if (error) throw error;

    res.json({ entries: data || [] });
  } catch (error: any) {
    console.error('Error en GET /api/food-log:', error);
    const schemaMissing = isSchemaError(error);
    res.status(500).json({
      error: 'Error al consultar el registro de comidas',
      message: schemaMissing ? 'La tabla "food_log" no existe en tu base de datos de Supabase.' : (error.message || 'No se pudo leer el registro de comidas.'),
      isSchemaMissing: schemaMissing,
    });
  }
});

app.delete('/api/food-log/:id', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], res)) return;
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const { error } = await supabase.from('food_log').delete().eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error(`Error en DELETE /api/food-log/${req.params.id}:`, error);
    res.status(500).json({ error: 'Error al eliminar el registro', message: error.message || 'No se pudo eliminar.' });
  }
});

app.get('/api/food-log/trends', async (req, res) => {
  try {
    if (!checkEnvKeys(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], res)) return;
    if (!supabase) {
      return res.status(503).json({ error: 'Cliente de Supabase no inicializado.' });
    }

    const days = Math.min(30, Math.max(1, parseInt((req.query.days as string) || '7', 10) || 7));
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const { data, error } = await supabase
      .from('food_log')
      .select('calories, protein_g, carbs_g, fat_g, logged_at')
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: true });
    if (error) throw error;

    const byDay = new Map<string, { calories: number; protein_g: number; carbs_g: number; fat_g: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      byDay.set(d.toISOString().slice(0, 10), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    }
    for (const entry of data || []) {
      const day = (entry.logged_at as string).slice(0, 10);
      const bucket = byDay.get(day);
      if (bucket) {
        bucket.calories += Number(entry.calories) || 0;
        bucket.protein_g += Number(entry.protein_g) || 0;
        bucket.carbs_g += Number(entry.carbs_g) || 0;
        bucket.fat_g += Number(entry.fat_g) || 0;
      }
    }

    const trends = Array.from(byDay.entries()).map(([date, totals]) => ({ date, ...totals }));
    res.json({ trends });
  } catch (error: any) {
    console.error('Error en GET /api/food-log/trends:', error);
    res.status(500).json({ error: 'Error al calcular tendencias', message: error.message || 'No se pudieron calcular las tendencias.' });
  }
});

export default app;
