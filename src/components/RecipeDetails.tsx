import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Loader2, List, Info, Clock, Check, Utensils, AlertCircle, Copy, Database, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RecipeDetail } from '../types';

interface RecipeDetailsProps {
  recipeId: number;
  onBack: () => void;
  onSaveSuccess?: () => void;
  savedSpoonacularIds: number[];
}

export default function RecipeDetails({ recipeId, onBack, onSaveSuccess, savedSpoonacularIds }: RecipeDetailsProps) {
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const [saveError, setSaveError] = useState<{ message: string; details?: string; isSchemaMissing?: boolean; sql?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchRecipeDetail();
    setIsSaved(savedSpoonacularIds.includes(recipeId));
  }, [recipeId, savedSpoonacularIds]);

  const fetchRecipeDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipe/${recipeId}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || errData.error || 'Error al cargar detalles');
      }
      const data = await res.json();
      setRecipe(data.recipe);
    } catch (err: any) {
      console.error(err);
      setError({
        message: 'No pudimos cargar los detalles de la receta',
        details: err.message || 'Verifica la conexión o el límite diario de consultas de Spoonacular.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipe || isSaved) return;

    setSaving(true);
    try {
      // Find core nutrients
      const nutrients = recipe.nutrition?.nutrients || [];
      const getNutrient = (name: string) => {
        const nut = nutrients.find(n => n.name.toLowerCase() === name.toLowerCase());
        return nut ? `${Math.round(nut.amount)}${nut.unit}` : 'N/A';
      };

      const nutritionPayload = {
        calories: Math.round(nutrients.find(n => n.name.toLowerCase() === 'calories')?.amount || 0),
        protein: getNutrient('protein'),
        carbs: getNutrient('carbohydrates'),
        fat: getNutrient('fat'),
      };

      const ingredientsPayload = recipe.extendedIngredients.map(ing => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
      }));

      const res = await fetch('/api/save-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spoonacular_id: recipe.id,
          title: recipe.title,
          image_url: recipe.image,
          nutrition: nutritionPayload,
          ingredients: ingredientsPayload
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        const err = new Error(errData.message || 'Error al guardar la receta');
        (err as any).isSchemaMissing = errData.isSchemaMissing;
        (err as any).sql = errData.sql;
        throw err;
      }

      setIsSaved(true);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      console.error(err);
      setSaveError({
        message: err.isSchemaMissing 
          ? 'Estructura de Base de Datos Pendiente' 
          : 'Error al guardar la receta',
        details: err.message || 'Verifica la conexión con Supabase.',
        isSchemaMissing: err.isSchemaMissing,
        sql: err.sql
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <h3 className="font-display font-semibold text-lg text-slate-800 mb-1">Cargando Receta</h3>
        <p className="text-slate-500 text-sm max-w-sm">
          Obteniendo ingredientes completos, pasos y desglose nutricional...
        </p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto text-center space-y-5 shadow-sm">
        <div className="bg-rose-50 p-4 rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-rose-100">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg text-slate-800 mb-2">{error?.message || 'Error desconocido'}</h3>
          {error?.details && <p className="text-sm text-slate-500">{error.details}</p>}
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onBack}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold px-5 py-2 rounded-xl transition-all text-xs cursor-pointer shadow-sm"
          >
            Atrás
          </button>
          <button
            onClick={fetchRecipeDetail}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-xl transition-all text-xs cursor-pointer shadow-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Extract Nutrition Info
  const nutrients = recipe.nutrition?.nutrients || [];
  const calories = Math.round(nutrients.find(n => n.name.toLowerCase() === 'calories')?.amount || 0);
  const protein = nutrients.find(n => n.name.toLowerCase() === 'protein');
  const carbs = nutrients.find(n => n.name.toLowerCase() === 'carbohydrates');
  const fat = nutrients.find(n => n.name.toLowerCase() === 'fat');

  // Steps
  const steps = recipe.analyzedInstructions?.[0]?.steps || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation and Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 transition-colors bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 cursor-pointer font-semibold shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a recetas</span>
        </button>

        <button
          onClick={handleSaveRecipe}
          disabled={isSaved || saving}
          className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl border transition-all cursor-pointer shadow-sm ${
            isSaved
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white'
          }`}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSaved ? (
            <Heart className="w-4 h-4 fill-emerald-600 text-emerald-600" />
          ) : (
            <Heart className="w-4 h-4 fill-transparent" />
          )}
          <span>{isSaved ? 'Guardada en Favoritos' : 'Guardar Receta'}</span>
        </button>
      </div>

      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold shadow-sm"
          >
            <div className="bg-emerald-500 text-white rounded-full p-1 flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>¡Receta guardada con éxito en Favoritos!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Details Card */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Banner Image */}
        <div className="relative h-64 md:h-80 w-full overflow-hidden">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/30 to-transparent" />
          
          {/* Title and metadata overlays */}
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="font-display font-bold text-2xl md:text-3xl text-white tracking-tight mb-3 drop-shadow-sm">
              {recipe.title}
            </h1>
            
            <div className="flex flex-wrap gap-4 text-xs font-mono text-white">
              {recipe.readyInMinutes && (
                <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{recipe.readyInMinutes} min</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                  <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{recipe.servings} porciones</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 bg-white">
          {/* Left Column: Ingredients and Nutrition */}
          <div className="lg:col-span-1 space-y-8">
            {/* Nutrition Panel */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200/60 pb-3">
                <Info className="w-4.5 h-4.5 text-emerald-600" />
                <h3 className="font-display font-bold text-sm tracking-tight">Información Nutricional</h3>
              </div>

              {calories > 0 ? (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-slate-500">Calorías</span>
                    <span className="text-xl font-display font-bold text-slate-800">{calories} kcal</span>
                  </div>

                  {/* Micro Nutrients bars */}
                  {[
                    { label: 'Proteína', value: protein?.amount, unit: protein?.unit, color: 'bg-emerald-500' },
                    { label: 'Carbohidratos', value: carbs?.amount, unit: carbs?.unit, color: 'bg-amber-500' },
                    { label: 'Grasas', value: fat?.amount, unit: fat?.unit, color: 'bg-rose-500' }
                  ].map(nut => (
                    <div key={nut.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-500">{nut.label}</span>
                        <span className="text-slate-800 font-semibold">
                          {nut.value ? `${Math.round(nut.value)}${nut.unit}` : '0g'}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${nut.color} rounded-full`}
                          style={{ width: `${Math.min((nut.value || 0) * 1.5, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">Información de macronutrientes no disponible.</p>
              )}
            </div>

            {/* Ingredients Panel */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800">
                <List className="w-4.5 h-4.5 text-emerald-600" />
                <h3 className="font-display font-bold text-sm tracking-tight">Ingredientes</h3>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {recipe.extendedIngredients.map((ing, i) => (
                  <div
                    key={`${ing.name}-${i}`}
                    className="flex justify-between items-start text-xs border-b border-slate-100 pb-2.5 capitalize"
                  >
                    <span className="text-slate-700 font-medium leading-tight">{ing.name}</span>
                    <span className="text-slate-500 font-mono flex-shrink-0 text-right ml-4">
                      {Math.round(ing.amount * 10) / 10} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Instructions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-3">
              <Utensils className="w-4.5 h-4.5 text-emerald-600" />
              <h3 className="font-display font-bold text-sm tracking-tight">Pasos de Preparación</h3>
            </div>

            {steps.length > 0 ? (
              <div className="space-y-6">
                {steps.map((step, idx) => (
                  <div key={step.number} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center font-mono font-bold text-xs text-slate-700 shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="space-y-1 pt-0.5">
                      <p className="text-sm text-slate-600 leading-relaxed font-normal">
                        {step.step}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                <p>No se encontraron instrucciones estructuradas para esta receta.</p>
                {recipe.summary && (
                  <div
                    className="mt-4 px-6 text-left text-slate-500 leading-relaxed text-xs max-h-48 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: recipe.summary }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Error Modal */}
      <AnimatePresence>
        {saveError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4"
            onClick={() => setSaveError(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-xl space-y-4 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-600" />
                  <h3 className="font-display font-semibold text-base text-slate-800">{saveError.message}</h3>
                </div>
                <button
                  onClick={() => setSaveError(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {saveError.isSchemaMissing && saveError.sql ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    ¡La conexión con Supabase es correcta! Pero necesitas ejecutar este script SQL en tu editor de consultas de Supabase para poder guardar recetas favoritas:
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Script SQL de Inicialización</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(saveError.sql || '');
                          setCopied(true);
                          setTimeout(() => setCopied(false), 3000);
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl border border-emerald-200 hover:border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar SQL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-40 border border-slate-800 leading-relaxed shadow-inner">
                      {saveError.sql}
                    </pre>
                  </div>

                  <p className="text-xs text-slate-400 font-normal">
                    Pega esto en el <strong className="text-slate-500">SQL Editor</strong> de Supabase y haz clic en <strong className="text-emerald-700">Run</strong>. ¡Luego intenta guardar tu receta de nuevo!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">
                    Hubo un problema al procesar tu solicitud:
                  </p>
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-xs text-rose-800 font-mono overflow-x-auto">
                    {saveError.details}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSaveError(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
