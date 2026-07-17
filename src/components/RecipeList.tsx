import React from 'react';
import { ChefHat, ArrowRight, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center text-center py-20 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <ChefHat className="w-12 h-12 text-emerald-600 animate-bounce mb-4" />
        <h3 className="font-display font-semibold text-lg text-slate-800 mb-1">Buscando Recetas Compatibles</h3>
        <p className="text-slate-500 text-sm max-w-sm">
          Spoonacular está calculando combinaciones óptimas con tus ingredientes...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto text-center space-y-5 shadow-sm">
        <div className="bg-rose-50 p-4 rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-rose-100">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg text-slate-800 mb-2">{error.message}</h3>
          {error.details && <p className="text-sm text-slate-500">{error.details}</p>}
        </div>
        <button
          onClick={onBackToScan}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-sm"
        >
          Volver a Escanear
        </button>
      </div>
    );
  }

  // Sort recipes: fewest missing first
  const sortedRecipes = [...recipes].sort((a, b) => a.missedIngredientCount - b.missedIngredientCount);

  if (sortedRecipes.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
        <div className="bg-slate-50 p-4 rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-slate-200">
          <ChefHat className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="font-display font-semibold text-lg text-slate-800">No se encontraron recetas</h3>
        <p className="text-sm text-slate-500">
          Ninguna receta coincide con tus ingredientes seleccionados. Prueba agregando ingredientes básicos adicionales como aceite, sal, ajo, harina, o verduras comunes.
        </p>
        <button
          onClick={onBackToScan}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-sm"
        >
          Añadir Ingredientes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-800">Recetas Sugeridas ({sortedRecipes.length})</h2>
          <p className="text-xs text-slate-500">Ordenadas de mayor a menor coincidencia de ingredientes</p>
        </div>
        <button
          onClick={onBackToScan}
          className="text-xs text-emerald-600 hover:text-emerald-700 font-mono font-semibold hover:underline cursor-pointer"
        >
          ← Agregar más ingredientes
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedRecipes.map((recipe, idx) => {
          const hasAll = recipe.missedIngredientCount === 0;

          return (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelectRecipe(recipe.id)}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl overflow-hidden cursor-pointer hover:shadow-md transition-all group flex flex-col h-full"
            >
              {/* Image Section */}
              <div className="relative h-48 overflow-hidden bg-slate-100 flex-shrink-0">
                <img
                  src={recipe.image}
                  alt={recipe.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                
                {/* Badge Overlay */}
                <div className="absolute top-4 left-4">
                  {hasAll ? (
                    <span className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tienes todo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-amber-500 text-slate-900 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Faltan {recipe.missedIngredientCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Content Section */}
              <div className="p-5 flex flex-col justify-between flex-grow">
                <div className="space-y-4">
                  <h3 className="font-display font-bold text-lg text-slate-800 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-tight">
                    {recipe.title}
                  </h3>

                  {/* Summary of Ingredients matching */}
                  <div className="space-y-2">
                    {/* Used ingredients */}
                    {recipe.usedIngredients && recipe.usedIngredients.length > 0 && (
                      <div>
                        <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider block mb-1">
                          Ingredientes que tienes ({recipe.usedIngredientCount}):
                        </span>
                        <p className="text-xs text-slate-600 capitalize line-clamp-2">
                          {recipe.usedIngredients.map(i => i.name).join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Missed ingredients */}
                    {!hasAll && recipe.missedIngredients && recipe.missedIngredients.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] font-mono text-amber-600 uppercase tracking-wider block mb-1">
                          Ingredientes que te faltan ({recipe.missedIngredientCount}):
                        </span>
                        <p className="text-xs text-slate-500 capitalize line-clamp-1">
                          {recipe.missedIngredients.map(i => i.name).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card CTA Footer */}
                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-500 font-semibold group-hover:text-slate-800 transition-colors">
                  <span>Ver preparación y nutrición</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-all" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
