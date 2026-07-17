import React from 'react';
import { ChefHat, ArrowRight, Check, AlertCircle, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { SpoonacularRecipeSummary } from '../types';
import Skeleton from './Skeleton';

interface RecipeListProps {
  recipes: SpoonacularRecipeSummary[];
  onSelectRecipe: (id: number) => void;
  onBackToScan: () => void;
  loading: boolean;
  error: { message: string; details?: string } | null;
}

export default function RecipeList({ recipes, onSelectRecipe, onBackToScan, loading, error }: RecipeListProps) {
  if (loading) {
    return (
      <div className="space-y-4 pt-2">
        <div className="px-0.5">
          <h2 className="text-[19px] font-bold text-[var(--text-primary)]">Buscando recetas</h2>
          <p className="text-[12px] text-[var(--text-primary)]/40">Calculando las mejores combinaciones...</p>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[28px] overflow-hidden">
            <Skeleton className="h-44 w-full rounded-[28px]" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-10 text-center space-y-5">
        <div className="bg-[var(--danger-bg)] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
          <AlertCircle className="w-7 h-7 text-[#ff3b30]" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1.5">{error.message}</h3>
          {error.details && <p className="text-[13px] text-[var(--text-primary)]/40 leading-relaxed px-4">{error.details}</p>}
        </div>
        <button
          onClick={onBackToScan}
          className="bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
        >
          Volver a escanear
        </button>
      </div>
    );
  }

  const sortedRecipes = [...recipes].sort((a, b) => a.missedIngredientCount - b.missedIngredientCount);

  if (sortedRecipes.length === 0) {
    return (
      <div className="pt-10 text-center space-y-4">
        <div className="bg-[var(--bg-surface)] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
          <ChefHat className="w-7 h-7 text-[var(--text-primary)]/40" strokeWidth={1.75} />
        </div>
        <h3 className="text-[16px] font-bold text-[var(--text-primary)]">No se encontraron recetas</h3>
        <p className="text-[13px] text-[var(--text-primary)]/40 leading-relaxed px-4">
          Prueba agregando ingredientes básicos como aceite, sal, ajo o verduras comunes.
        </p>
        <button
          onClick={onBackToScan}
          className="bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
        >
          Añadir ingredientes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h2 className="text-[19px] font-bold text-[var(--text-primary)]">Recetas sugeridas</h2>
          <p className="text-[12px] text-[var(--text-primary)]/40">{sortedRecipes.length} coincidencias con tu refri</p>
        </div>
        <button
          onClick={onBackToScan}
          className="text-[12px] font-semibold text-[var(--text-primary)]/50 cursor-pointer"
        >
          Editar
        </button>
      </div>

      <div className="space-y-4">
        {sortedRecipes.map((recipe, idx) => {
          const hasAll = recipe.missedIngredientCount === 0;
          const missedPrimary = (recipe.missedIngredients || []).filter(i => !i.isSecondary);
          const missedSecondary = (recipe.missedIngredients || []).filter(i => i.isSecondary);

          return (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.05, 0.3) }}
              onClick={() => onSelectRecipe(recipe.id)}
              className="bg-[var(--bg-surface)] rounded-[28px] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
            >
              <div className="relative h-44 overflow-hidden bg-[var(--bg-surface)]">
                <img
                  src={recipe.image}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />

                <div className="absolute top-3.5 left-3.5">
                  {hasAll ? (
                    <span className="flex items-center gap-1 bg-white/95 backdrop-blur text-black text-[11px] font-semibold px-2.5 py-1 rounded-full">
                      <Check className="w-3 h-3" strokeWidth={3} />
                      Tienes todo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-black/75 backdrop-blur text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                      <ShoppingCart className="w-3 h-3" strokeWidth={2.25} />
                      Faltan {recipe.missedIngredientCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] leading-snug line-clamp-2">
                  {recipe.title}
                </h3>

                {recipe.usedIngredients && recipe.usedIngredients.length > 0 && (
                  <p className="text-[12px] text-[var(--text-primary)]/40 capitalize line-clamp-1 leading-relaxed">
                    {recipe.usedIngredients.map(i => i.name).join(' · ')}
                  </p>
                )}

                {missedPrimary.length > 0 && (
                  <p className="text-[12px] text-[#ff3b30] capitalize line-clamp-1 leading-relaxed font-medium">
                    Falta: {missedPrimary.map(i => i.name).join(', ')}
                  </p>
                )}

                {missedSecondary.length > 0 && (
                  <p className="text-[11.5px] text-[var(--text-primary)]/40 capitalize line-clamp-1 leading-relaxed">
                    + {missedSecondary.map(i => i.name).join(', ')} (opcional)
                  </p>
                )}

                <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[12.5px] font-semibold text-[var(--text-primary)]/70">
                  <span>Ver receta</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.25} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
