import React, { useState, useEffect } from 'react';
import { Heart, Trash2, Clock, Info, Check, Sparkles, Loader2, BookOpen, AlertCircle, Copy, Database } from 'lucide-react';
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
          ? 'Estructura de Base de Datos Pendiente' 
          : 'No pudimos conectar con la base de datos de favoritos',
        details: err.message || 'Verifica la configuración de Supabase URL y Service Role Key.',
        isSchemaMissing: err.isSchemaMissing,
        sql: err.sql
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFavoriteClick = (e: React.MouseEvent, recipe: SavedRecipe) => {
    e.stopPropagation(); // avoid selecting the card
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
        details: err.message || 'Ocurrió un problema inesperado con la base de datos de Supabase.'
      });
      setRecipeToUnsave(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <h3 className="font-display font-semibold text-lg text-slate-800 mb-1">Cargando Recetas Favoritas</h3>
        <p className="text-slate-500 text-sm max-w-xs">
          Consultando tus registros guardados en Supabase Postgres...
        </p>
      </div>
    );
  }

  if (error) {
    if (error.isSchemaMissing && error.sql) {
      const handleCopySql = () => {
        navigator.clipboard.writeText(error.sql || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      };

      return (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-2xl mx-auto text-left space-y-6 shadow-sm">
          <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900">
            <div className="bg-amber-100 p-2.5 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-amber-700 animate-pulse" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Base de datos conectada pero vacía</h4>
              <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
                ¡Tu base de datos de Supabase está correctamente conectada! Sin embargo, aún no has creado las tablas necesarias para guardar recetas e historial.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-display font-semibold text-sm text-slate-800">Pasos rápidos para activar Favoritos e Historial:</h3>
            <ol className="text-xs text-slate-600 space-y-2.5 list-decimal list-inside pl-1">
              <li>Inicia sesión en tu consola de <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-semibold underline">Supabase</a> y abre tu proyecto.</li>
              <li>En la barra lateral izquierda, selecciona la pestaña <strong className="text-slate-800">SQL Editor</strong>.</li>
              <li>Haz clic en <strong className="text-slate-800">New Query</strong> (Nueva consulta).</li>
              <li>Copia el script SQL de abajo, pégalo en el editor y haz clic en el botón verde <strong className="text-emerald-700">Run</strong>.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Script SQL de Inicialización</span>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-200 hover:border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer"
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
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800 leading-relaxed shadow-inner">
              {error.sql}
            </pre>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={fetchFavorites}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-xs cursor-pointer text-center shadow-sm"
            >
              Ya ejecuté el SQL, verificar base de datos
            </button>
          </div>
        </div>
      );
    }

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
          onClick={fetchFavorites}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-sm"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
        <div className="bg-emerald-50 p-4 rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-emerald-100">
          <Heart className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="font-display font-semibold text-lg text-slate-800">No tienes recetas favoritas guardadas</h3>
        <p className="text-sm text-slate-500">
          Escanea tu refrigerador, selecciona una receta sugerida y haz clic en "Guardar Receta" para tenerla siempre accesible en este menú.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-xl text-slate-800">Tus Recetas Guardadas</h2>
        <p className="text-xs text-slate-500">Acceso rápido a las preparaciones e información nutricional que ya guardaste</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {favorites.map((recipe, idx) => {
            const cal = recipe.nutrition?.calories || 0;
            const protein = recipe.nutrition?.protein || 'N/A';
            const carbs = recipe.nutrition?.carbs || 'N/A';
            const fat = recipe.nutrition?.fat || 'N/A';

            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => onSelectSavedRecipe(recipe.spoonacular_id)}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all group flex flex-col h-full relative"
              >
                {/* Delete Button absolute overlay */}
                <button
                  onClick={(e) => handleDeleteFavoriteClick(e, recipe)}
                  className="absolute top-3 right-3 z-10 bg-white/95 hover:bg-rose-500 border border-slate-200 hover:border-rose-400 text-slate-500 hover:text-white p-2 rounded-xl transition-all shadow-md cursor-pointer"
                  title="Eliminar de favoritas"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Card Image */}
                <div className="h-40 overflow-hidden bg-slate-100 flex-shrink-0 relative">
                  <img
                    src={recipe.image_url}
                    alt={recipe.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col justify-between flex-grow">
                  <div className="space-y-3">
                    <h3 className="font-display font-bold text-base text-slate-800 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-snug">
                      {recipe.title}
                    </h3>

                    {/* Mini nutrition panel */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block">Calorías</span>
                        <span className="text-slate-800 font-semibold">{cal} kcal</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Proteína</span>
                        <span className="text-emerald-600 font-semibold">{protein}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Carbohidratos</span>
                        <span className="text-amber-600 font-semibold">{carbs}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Grasas</span>
                        <span className="text-rose-600 font-semibold">{fat}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-slate-700 transition-colors">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      Ver instrucciones
                    </span>
                    <span>Guardado {new Date(recipe.saved_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {recipeToUnsave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4"
            onClick={() => setRecipeToUnsave(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-rose-50 border border-rose-100 rounded-full w-12 h-12 flex items-center justify-center text-rose-600 mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="font-display font-semibold text-lg text-slate-800">¿Eliminar de Favoritas?</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  ¿Estás seguro de que quieres quitar <strong className="text-slate-700">"{recipeToUnsave.title}"</strong> de tus recetas guardadas?
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRecipeToUnsave(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmUnsave}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm shadow-rose-600/10 animate-scale-in"
                >
                  Sí, eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
