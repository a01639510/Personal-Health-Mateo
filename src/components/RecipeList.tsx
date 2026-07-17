import React from 'react';
import { ChefHat, ArrowRight, Check, AlertCircle, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { SpoonacularRecipeSummary } from '../types';

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
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="w-14 h-14 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-4">
          <ChefHat className="w-6 h-6 text-black/70 animate-bounce" strokeWidth={1.75} />
        </div>
        <h3 className="text-[16px] font-bold text-black mb-1">Buscando recetas</h3>
        <p className="text-black/40 text-[13px] max-w-[260px] leading-relaxed">
          Calculando las mejores combinaciones con tus ingredientes...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-10 text-center space-y-5">
        <div className="bg-[#FFF1F0] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
          <AlertCircle className="w-7 h-7 text-[#ff3b30]" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-black mb-1.5">{error.message}</h3>
          {error.details && <p className="text-[13px] text-black/40 leading-relaxed px-4">{error.details}</p>}
        </div>
        <button
          onClick={onBackToScan}
          className="bg-black text-white font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
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
        <div className="bg-[#F5F5F7] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
          <ChefHat className="w-7 h-7 text-black/40" strokeWidth={1.75} />
        </div>
        <h3 className="text-[16px] font-bold text-black">No se encontraron recetas</h3>
        <p className="text-[13px] text-black/40 leading-relaxed px-4">
          Prueba agregando ingredientes básicos como aceite, sal, ajo o verduras comunes.
        </p>
        <button
          onClick={onBackToScan}
          className="bg-black text-white font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
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
          <h2 className="text-[19px] font-bold text-black">Recetas sugeridas</h2>
          <p className="text-[12px] text-black/40">{sortedRecipes.length} coincidencias con tu refri</p>
        </div>
        <button
          onClick={onBackToScan}
          className="text-[12px] font-semibold text-black/50 cursor-pointer"
        >
          Editar
        </button>
      </div>

      <div className="space-y-4">
        {sortedRecipes.map((recipe, idx) => {
          const hasAll = recipe.missedIngredientCount === 0;

          return (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.05, 0.3) }}
              onClick={() => onSelectRecipe(recipe.id)}
              className="bg-white rounded-[28px] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
            >
              <div className="relative h-44 overflow-hidden bg-[#F5F5F7]">
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
                <h3 className="text-[16px] font-bold text-black leading-snug line-clamp-2">
                  {recipe.title}
                </h3>

                {recipe.usedIngredients && recipe.usedIngredients.length > 0 && (
                  <p className="text-[12px] text-black/40 capitalize line-clamp-1 leading-relaxed">
                    {recipe.usedIngredients.map(i => i.name).join(' · ')}
                  </p>
                )}

                <div className="pt-2.5 border-t border-black/[0.05] flex items-center justify-between text-[12.5px] font-semibold text-black/70">
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
