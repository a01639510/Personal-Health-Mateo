import React, { useState, useEffect } from 'react';
import { ChevronLeft, Heart, Loader2, Clock, Check, Utensils, AlertCircle, Copy, Database, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RecipeDetail } from '../types';
import MacroRing from './MacroRing';
import Skeleton from './Skeleton';

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
        message: 'No pudimos cargar la receta',
        details: err.message || 'Verifica la conexión o el límite diario de Spoonacular.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipe || isSaved) return;

    setSaving(true);
    try {
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
      setTimeout(() => setShowSavedToast(false), 2500);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      console.error(err);
      setSaveError({
        message: err.isSchemaMissing
          ? 'Falta configurar la base de datos'
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
      <div className="pt-2 pb-2">
        <Skeleton className="h-80 w-full rounded-[28px]" />
        <div className="mt-5 rounded-[28px] overflow-hidden">
          <Skeleton className="h-56 w-full rounded-[28px]" />
        </div>
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-16 w-full rounded-[24px]" />
        </div>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="pt-10 text-center space-y-5">
        <div className="bg-[var(--danger-bg)] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
          <AlertCircle className="w-7 h-7 text-[#ff3b30]" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1.5">{error?.message || 'Error desconocido'}</h3>
          {error?.details && <p className="text-[13px] text-[var(--text-primary)]/40 leading-relaxed px-4">{error.details}</p>}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onBack}
            className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold px-5 py-2.5 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            Atrás
          </button>
          <button
            onClick={fetchRecipeDetail}
            className="bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold px-5 py-2.5 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const nutrients = recipe.nutrition?.nutrients || [];
  const calories = Math.round(nutrients.find(n => n.name.toLowerCase() === 'calories')?.amount || 0);
  const protein = Math.round(nutrients.find(n => n.name.toLowerCase() === 'protein')?.amount || 0);
  const carbs = Math.round(nutrients.find(n => n.name.toLowerCase() === 'carbohydrates')?.amount || 0);
  const fat = Math.round(nutrients.find(n => n.name.toLowerCase() === 'fat')?.amount || 0);

  const steps = recipe.analyzedInstructions?.[0]?.steps || [];

  const macros = [
    { label: 'Proteína', value: protein, max: 50, color: 'var(--ring-protein)' },
    { label: 'Carbos', value: carbs, max: 100, color: 'var(--ring-carbs)' },
    { label: 'Grasas', value: fat, max: 40, color: 'var(--ring-fat)' },
  ];

  return (
    <div className="pt-2 pb-2">
      {/* Image + floating nav */}
      <div className="relative h-80 w-full overflow-hidden rounded-[28px]">
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/10" />

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" color="#0a0a0a" strokeWidth={2.25} />
          </button>

          <button
            onClick={handleSaveRecipe}
            disabled={isSaved || saving}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" color="#0a0a0a" />
            ) : (
              <Heart className="w-[18px] h-[18px]" strokeWidth={2} color="#0a0a0a" fill={isSaved ? '#0a0a0a' : 'none'} />
            )}
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-[22px] font-bold text-white tracking-tight leading-tight drop-shadow-sm">
            {recipe.title}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-[12px] font-medium text-white/90">
            {recipe.readyInMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                {recipe.readyInMinutes} min
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5" strokeWidth={2} />
                {recipe.servings} porciones
              </span>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-3 rounded-2xl flex items-center gap-2.5 text-[13px] font-semibold"
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            <span>Guardada en favoritos</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Macro Rings Panel */}
      {calories > 0 && (
        <div className="mt-5 bg-[var(--bg-surface)] rounded-[28px] p-6">
          <div className="flex items-center justify-center mb-6">
            <MacroRing value={calories} max={800} size={126} strokeWidth={10} color="var(--ring-calories)" delay={0.1}>
              <div className="text-center">
                <div className="text-[26px] font-extrabold text-[var(--text-primary)] leading-none tracking-tight">{calories}</div>
                <div className="text-[11px] text-[var(--text-primary)]/40 font-semibold mt-1">kcal</div>
              </div>
            </MacroRing>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {macros.map((m, idx) => (
              <div key={m.label} className="flex flex-col items-center gap-2">
                <MacroRing value={m.value} max={m.max} size={56} strokeWidth={5} color={m.color} delay={0.45 + idx * 0.12}>
                  <span className="text-[12px] font-bold text-[var(--text-primary)]">{m.value}g</span>
                </MacroRing>
                <span className="text-[11px] text-[var(--text-primary)]/40 font-medium">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingredients Panel */}
      <div className="mt-6">
        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2 px-0.5">Ingredientes</h3>
        <div className="bg-[var(--bg-surface)] rounded-[24px] px-4">
          {recipe.extendedIngredients.map((ing, i) => (
            <div
              key={`${ing.name}-${i}`}
              className={`flex justify-between items-center py-3.5 text-[13.5px] capitalize ${
                i !== recipe.extendedIngredients.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''
              }`}
            >
              <span className="text-[var(--text-primary)] font-medium leading-tight pr-3">{ing.name}</span>
              <span className="text-[var(--text-primary)]/40 font-medium flex-shrink-0 text-right">
                {Math.round(ing.amount * 10) / 10} {ing.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps Panel */}
      <div className="mt-6">
        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-3 px-0.5">Preparación</h3>

        {steps.length > 0 ? (
          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex gap-3.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center font-bold text-[12px] text-[var(--accent-foreground)]">
                  {idx + 1}
                </div>
                <p className="text-[13.5px] text-[var(--text-primary)]/70 leading-relaxed pt-0.5">
                  {step.step}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-[var(--text-primary)]/40 text-[13px] bg-[var(--bg-surface)] rounded-[24px] px-6">
            <p>No hay instrucciones estructuradas para esta receta.</p>
            {recipe.summary && (
              <div
                className="mt-4 text-left text-[var(--text-primary)]/50 leading-relaxed text-[12px] max-h-48 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: recipe.summary }}
              />
            )}
          </div>
        )}
      </div>

      {/* Save Error Bottom Sheet */}
      <AnimatePresence>
        {saveError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setSaveError(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-[430px] bg-[var(--bg-surface)] rounded-t-[28px] p-6 pb-safe space-y-4 text-left max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-9 h-1 bg-[var(--text-primary)]/10 rounded-full mx-auto mb-1" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-[var(--text-primary)]/60" strokeWidth={1.75} />
                  <h3 className="text-[16px] font-bold text-[var(--text-primary)]">{saveError.message}</h3>
                </div>
                <button
                  onClick={() => setSaveError(null)}
                  className="w-8 h-8 rounded-full bg-[var(--bg-surface)] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4 text-[var(--text-primary)]/50" />
                </button>
              </div>

              {saveError.isSchemaMissing && saveError.sql ? (
                <div className="space-y-4">
                  <p className="text-[13px] text-[var(--text-primary)]/50 leading-relaxed">
                    Supabase está conectado. Ejecuta este script SQL en el editor de consultas para poder guardar recetas favoritas:
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[var(--text-primary)]/35 uppercase tracking-wide font-semibold">Script SQL</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(saveError.sql || '');
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2500);
                        }}
                        className="flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)]/70 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" strokeWidth={2} />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-black text-white/90 p-4 rounded-2xl text-[10.5px] overflow-x-auto max-h-40 leading-relaxed">
                      {saveError.sql}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--danger-bg)] rounded-2xl p-3.5 text-[12.5px] text-[var(--danger-fg)]">
                  {saveError.details}
                </div>
              )}

              <button
                onClick={() => setSaveError(null)}
                className="w-full bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold py-3.5 rounded-full text-[14px] cursor-pointer active:scale-[0.98] transition-transform"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
