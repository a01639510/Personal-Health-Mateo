import React, { useState, useEffect } from 'react';
import { Heart, Trash2, Check, Loader2, AlertCircle, Copy, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedRecipe } from '../types';

interface FavoritesListProps {
  onSelectSavedRecipe: (spoonacularId: number) => void;
  onRefreshTrigger: number;
}

export default function FavoritesList({ onSelectSavedRecipe, onRefreshTrigger }: FavoritesListProps) {
  const [favorites, setFavorites] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipeToUnsave, setRecipeToUnsave] = useState<SavedRecipe | null>(null);
  const [error, setError] = useState<{ message: string; details?: string; isSchemaMissing?: boolean; sql?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, [onRefreshTrigger]);

  const fetchFavorites = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/saved-recipes');
      if (!res.ok) {
        const errData = await res.json();
        const err = new Error(errData.message || errData.error || 'Error al obtener favoritas');
        (err as any).isSchemaMissing = errData.isSchemaMissing;
        (err as any).sql = errData.sql;
        throw err;
      }
      const data = await res.json();
      setFavorites(data.savedRecipes || []);
    } catch (err: any) {
      console.error(err);
      setError({
        message: err.isSchemaMissing
          ? 'Falta configurar la base de datos'
          : 'No pudimos conectar con tus favoritos',
        details: err.message || 'Verifica la configuración de Supabase.',
        isSchemaMissing: err.isSchemaMissing,
        sql: err.sql
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFavoriteClick = (e: React.MouseEvent, recipe: SavedRecipe) => {
    e.stopPropagation();
    setRecipeToUnsave(recipe);
  };

  const confirmUnsave = async () => {
    if (!recipeToUnsave) return;

    try {
      const res = await fetch(`/api/saved-recipes/${recipeToUnsave.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Error al eliminar');
      }
      setFavorites(prev => prev.filter(f => f.id !== recipeToUnsave.id));
      setRecipeToUnsave(null);
    } catch (err: any) {
      console.error(err);
      setError({
        message: 'No se pudo eliminar de favoritas',
        details: err.message || 'Ocurrió un problema con la base de datos.'
      });
      setRecipeToUnsave(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <Loader2 className="w-8 h-8 text-black/60 animate-spin mb-4" strokeWidth={2} />
        <h3 className="text-[16px] font-bold text-black mb-1">Cargando favoritas</h3>
        <p className="text-black/40 text-[13px] max-w-[240px] leading-relaxed">
          Consultando tus recetas guardadas...
        </p>
      </div>
    );
  }

  if (error) {
    if (error.isSchemaMissing && error.sql) {
      const handleCopySql = () => {
        navigator.clipboard.writeText(error.sql || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      };

      return (
        <div className="pt-4 space-y-5">
          <div className="flex items-start gap-3 bg-[#FFF6E5] rounded-[24px] p-4">
            <div className="bg-white p-2 rounded-xl flex items-center justify-center flex-shrink-0">
              <Database className="w-4 h-4 text-[#b8860b]" strokeWidth={1.75} />
            </div>
            <div>
              <h4 className="font-bold text-[13px] text-black">Base de datos conectada pero vacía</h4>
              <p className="text-[12px] text-black/50 leading-relaxed mt-1">
                Supabase está conectado, pero faltan crear las tablas para guardar recetas e historial.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-[13px] font-bold text-black px-0.5">Activar favoritos e historial:</h3>
            <ol className="text-[12.5px] text-black/50 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
              <li>Abre tu proyecto en <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-black font-semibold underline">Supabase</a>.</li>
              <li>Ve a la pestaña <strong className="text-black/70">SQL Editor</strong>.</li>
              <li>Crea una <strong className="text-black/70">New Query</strong>.</li>
              <li>Pega el script de abajo y presiona <strong className="text-black/70">Run</strong>.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-black/35 uppercase tracking-wide font-semibold">Script SQL</span>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-full bg-[#F5F5F7] text-black/70 cursor-pointer"
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
            <pre className="bg-black text-white/90 p-4 rounded-2xl text-[10.5px] overflow-x-auto max-h-48 leading-relaxed">
              {error.sql}
            </pre>
          </div>

          <button
            onClick={fetchFavorites}
            className="w-full bg-black text-white font-semibold py-3.5 rounded-full text-[14px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            Ya ejecuté el SQL, verificar
          </button>
        </div>
      );
    }

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
          onClick={fetchFavorites}
          className="bg-black text-white font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="pt-10 text-center space-y-4">
        <div className="bg-[#F5F5F7] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
          <Heart className="w-7 h-7 text-black/40" strokeWidth={1.75} />
        </div>
        <h3 className="text-[16px] font-bold text-black">Sin recetas guardadas</h3>
        <p className="text-[13px] text-black/40 leading-relaxed px-4">
          Escanea tu refri, elige una receta y toca el corazón para guardarla aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="px-0.5">
        <h2 className="text-[19px] font-bold text-black">Tus favoritas</h2>
        <p className="text-[12px] text-black/40">{favorites.length} recetas guardadas</p>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {favorites.map((recipe) => {
            const cal = recipe.nutrition?.calories || 0;
            const protein = recipe.nutrition?.protein || '—';
            const carbs = recipe.nutrition?.carbs || '—';
            const fat = recipe.nutrition?.fat || '—';

            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                onClick={() => onSelectSavedRecipe(recipe.spoonacular_id)}
                className="flex items-center gap-3 bg-[#F5F5F7] rounded-[24px] p-3 cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white flex-shrink-0">
                  <img
                    src={recipe.image_url}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>

                <div className="flex-grow min-w-0">
                  <h3 className="text-[14px] font-bold text-black line-clamp-1 leading-snug">
                    {recipe.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] font-semibold">
                    <span className="text-black/60">{cal} kcal</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-black/20" />
                    <span style={{ color: 'var(--ring-protein)' }}>{protein}</span>
                    <span style={{ color: 'var(--ring-carbs)' }}>{carbs}</span>
                    <span style={{ color: 'var(--ring-fat)' }}>{fat}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeleteFavoriteClick(e, recipe)}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-90 transition-transform"
                  title="Eliminar de favoritas"
                >
                  <Trash2 className="w-3.5 h-3.5 text-black/40" strokeWidth={1.75} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Bottom Sheet */}
      <AnimatePresence>
        {recipeToUnsave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setRecipeToUnsave(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-[430px] bg-white rounded-t-[28px] p-6 pb-safe space-y-5 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-9 h-1 bg-black/10 rounded-full mx-auto" />
              <div className="bg-[#FFF1F0] rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5 text-[#ff3b30]" strokeWidth={1.75} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-[16px] font-bold text-black">¿Eliminar de favoritas?</h3>
                <p className="text-black/40 text-[13px] leading-relaxed px-2">
                  Vas a quitar <strong className="text-black/70">"{recipeToUnsave.title}"</strong> de tus recetas guardadas.
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setRecipeToUnsave(null)}
                  className="flex-1 bg-[#F5F5F7] text-black font-semibold py-3.5 rounded-full text-[14px] cursor-pointer active:scale-[0.98] transition-transform"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmUnsave}
                  className="flex-1 bg-[#ff3b30] text-white font-semibold py-3.5 rounded-full text-[14px] cursor-pointer active:scale-[0.98] transition-transform"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
