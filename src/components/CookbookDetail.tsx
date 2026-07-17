import React, { useState, useEffect } from 'react';
import { ChevronLeft, AlertCircle, Youtube, Share2, Check, UtensilsCrossed } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Skeleton from './Skeleton';
import NutritionRings from './NutritionRings';
import { CookbookRecipeDetail } from '../types';
import { usePreferences } from '../lib/preferences';
import { translateCategory, translateArea } from '../lib/categoryTranslations';
import { formatMeasure } from '../lib/unitConversion';

interface CookbookDetailProps {
  recipeId: string;
  onBack: () => void;
}

export default function CookbookDetail({ recipeId, onBack }: CookbookDetailProps) {
  const prefs = usePreferences();
  const [recipe, setRecipe] = useState<CookbookRecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [recipeId]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cookbook/${recipeId}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || errData.error || 'Error al cargar la receta');
      }
      const data = await res.json();
      setRecipe(data.recipe);
    } catch (err: any) {
      console.error(err);
      setError({
        message: 'No pudimos cargar la receta',
        details: err.message || 'Verifica la conexión con Supabase.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-2 pb-2">
        <Skeleton className="h-80 w-full rounded-[28px]" />
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
            onClick={fetchDetail}
            className="bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold px-5 py-2.5 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const displayTitle = prefs.language === 'es' && recipe.title_es ? recipe.title_es : recipe.title;
  const displayInstructions = prefs.language === 'es' && recipe.instructions_es ? recipe.instructions_es : recipe.instructions;
  const displayIngredients = prefs.language === 'es' && recipe.ingredients_es?.length ? recipe.ingredients_es : recipe.ingredients;

  const paragraphs = (displayInstructions || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const handleLogEaten = async () => {
    if (!recipe || logging) return;
    setLogging(true);
    try {
      const res = await fetch('/api/food-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'cookbook',
          source_id: recipeId,
          name: displayTitle,
          calories: recipe.calories ?? 0,
          protein_g: recipe.protein_g ?? 0,
          carbs_g: recipe.carbs_g ?? 0,
          fat_g: recipe.fat_g ?? 0,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al registrar la comida');
      }
      setLogged(true);
      setTimeout(() => setLogged(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setLogging(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/?receta=${recipeId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: displayTitle, text: `Mira esta receta: ${displayTitle}`, url });
      } catch {
        // el usuario canceló el share sheet, no hacemos nada
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="pt-2 pb-2">
      <div className="relative h-80 w-full overflow-hidden rounded-[28px]">
        <img
          src={recipe.image_url}
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
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            title="Compartir receta"
          >
            <Share2 className="w-[18px] h-[18px]" strokeWidth={2} color="#0a0a0a" />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-[22px] font-bold text-white tracking-tight leading-tight drop-shadow-sm">
            {displayTitle}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-[12px] font-medium text-white/90">
            {recipe.category && (
              <span className="bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">{translateCategory(recipe.category, prefs.language)}</span>
            )}
            {recipe.area && (
              <span className="bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">{translateArea(recipe.area, prefs.language)}</span>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-3 rounded-2xl flex items-center gap-2.5 text-[13px] font-semibold"
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            <span>Link copiado al portapapeles</span>
          </motion.div>
        )}
      </AnimatePresence>

      {recipe.video_url && (
        <a
          href={recipe.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold py-3.5 rounded-full text-[14px] active:scale-[0.98] transition-transform"
        >
          <Youtube className="w-4 h-4" strokeWidth={2} />
          <span>Ver video de preparación</span>
        </a>
      )}

      <NutritionRings
        calories={recipe.calories ?? 0}
        protein={recipe.protein_g ?? 0}
        carbs={recipe.carbs_g ?? 0}
        fat={recipe.fat_g ?? 0}
        estimated={recipe.nutrition_is_estimated}
      />

      <button
        onClick={handleLogEaten}
        disabled={logging}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-[var(--bg-surface)] disabled:opacity-50 text-[var(--text-primary)] font-semibold py-3.5 rounded-full text-[14px] cursor-pointer active:scale-[0.98] transition-transform"
      >
        {logged ? (
          <>
            <Check className="w-4 h-4" strokeWidth={2.5} />
            <span>Registrado</span>
          </>
        ) : (
          <>
            <UtensilsCrossed className="w-4 h-4" strokeWidth={2} />
            <span>{logging ? 'Registrando...' : 'Registrar como comido hoy'}</span>
          </>
        )}
      </button>

      <div className="mt-6">
        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2 px-0.5">
          Ingredientes ({displayIngredients.length})
        </h3>
        <div className="bg-[var(--bg-surface)] rounded-[24px] px-4">
          {displayIngredients.map((ing, i) => (
            <div
              key={`${ing.name}-${i}`}
              className={`flex justify-between items-center py-3.5 text-[13.5px] capitalize ${
                i !== displayIngredients.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''
              }`}
            >
              <span className="text-[var(--text-primary)] font-medium leading-tight pr-3">{ing.name}</span>
              <span className="text-[var(--text-primary)]/40 font-medium flex-shrink-0 text-right">
                {formatMeasure(ing.measure, prefs)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-3 px-0.5">Preparación</h3>

        {paragraphs.length > 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-[24px] p-4 space-y-3">
            {paragraphs.map((p, idx) => (
              <p key={idx} className="text-[13.5px] text-[var(--text-primary)]/70 leading-relaxed whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-[var(--text-primary)]/40 text-[13px] bg-[var(--bg-surface)] rounded-[24px] px-6">
            No hay instrucciones disponibles para esta receta.
          </div>
        )}
      </div>
    </div>
  );
}
