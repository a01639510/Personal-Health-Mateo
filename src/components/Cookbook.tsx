import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, SlidersHorizontal, AlertCircle, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CookbookRecipe } from '../types';
import Skeleton from './Skeleton';
import { usePreferences } from '../lib/preferences';
import { translateCategory, translateArea } from '../lib/categoryTranslations';

interface CookbookProps {
  onSelectRecipe: (id: string) => void;
}

const LIMIT = 24;

export default function Cookbook({ onSelectRecipe }: CookbookProps) {
  const prefs = usePreferences();
  const [recipes, setRecipes] = useState<CookbookRecipe[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [showAreaSheet, setShowAreaSheet] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);

  const requestId = useRef(0);

  useEffect(() => {
    fetch('/api/cookbook/filters')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setCategories(data.categories || []);
          setAreas(data.areas || []);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchRecipes = useCallback(async (targetPage: number, append: boolean) => {
    const myRequest = ++requestId.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (category) params.set('category', category);
      if (area) params.set('area', area);
      params.set('page', String(targetPage));
      params.set('limit', String(LIMIT));

      const res = await fetch(`/api/cookbook?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || errData.error || 'Error al cargar el recetario');
      }
      const data = await res.json();
      if (myRequest !== requestId.current) return;

      setTotal(data.total || 0);
      setRecipes((prev) => (append ? [...prev, ...(data.recipes || [])] : data.recipes || []));
      setPage(targetPage);
    } catch (err: any) {
      if (myRequest !== requestId.current) return;
      console.error(err);
      setError({
        message: 'No pudimos cargar el recetario',
        details: err.message || 'Verifica la conexión con Supabase.'
      });
    } finally {
      if (myRequest === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [debouncedSearch, category, area]);

  useEffect(() => {
    fetchRecipes(1, false);
  }, [fetchRecipes]);

  const hasMore = recipes.length < total;
  const activeAreaLabel = area ? translateArea(area, prefs.language) : 'Cocina';

  return (
    <div className="pt-2 pb-2">
      <div className="px-0.5 mb-4">
        <h2 className="text-[19px] font-bold text-[var(--text-primary)]">Recetario</h2>
        <p className="text-[12px] text-[var(--text-primary)]/40">{total} recetas para explorar</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-grow flex items-center gap-2 bg-[var(--bg-surface)] rounded-full px-4 py-3">
          <Search className="w-4 h-4 text-[var(--text-primary)]/35 flex-shrink-0" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar receta..."
            className="flex-grow bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[var(--text-primary)]/35 focus:outline-none min-w-0"
          />
          {search && (
            <button onClick={() => setSearch('')} className="flex-shrink-0 cursor-pointer">
              <X className="w-4 h-4 text-[var(--text-primary)]/35" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAreaSheet(true)}
          className={`flex items-center gap-1.5 flex-shrink-0 px-3.5 py-3 rounded-full text-[13px] font-semibold cursor-pointer transition-colors ${
            area ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]/60'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={2} />
          <span className="max-w-[60px] truncate">{activeAreaLabel}</span>
        </button>
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setCategory(null)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-full text-[12.5px] font-semibold cursor-pointer transition-colors ${
              !category ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]/60'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat === category ? null : cat)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-full text-[12.5px] font-semibold cursor-pointer transition-colors ${
                category === cat ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]/60'
              }`}
            >
              {translateCategory(cat, prefs.language)}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="pt-10 text-center space-y-5">
          <div className="bg-[var(--danger-bg)] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
            <AlertCircle className="w-7 h-7 text-[#ff3b30]" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1.5">{error.message}</h3>
            {error.details && <p className="text-[13px] text-[var(--text-primary)]/40 leading-relaxed px-4">{error.details}</p>}
          </div>
          <button
            onClick={() => fetchRecipes(1, false)}
            className="bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading skeleton grid */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-[20px]" />
              <Skeleton className="h-3 w-3/4 rounded-md" />
              <Skeleton className="h-2.5 w-1/2 rounded-md" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && recipes.length === 0 && (
        <div className="pt-10 text-center space-y-4">
          <div className="bg-[var(--bg-surface)] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
            <BookOpen className="w-7 h-7 text-[var(--text-primary)]/40" strokeWidth={1.75} />
          </div>
          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">No encontramos recetas</h3>
          <p className="text-[13px] text-[var(--text-primary)]/40 leading-relaxed px-4">
            Prueba con otra búsqueda o quita algún filtro.
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && recipes.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {recipes.map((recipe, idx) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min((idx % LIMIT) * 0.02, 0.3) }}
                onClick={() => onSelectRecipe(recipe.id)}
                className="cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="aspect-square w-full rounded-[20px] overflow-hidden bg-[var(--bg-surface)] relative">
                  <img
                    src={recipe.image_url}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  {recipe.category && (
                    <span className="absolute top-2 left-2 bg-white/90 backdrop-blur text-black text-[9.5px] font-semibold px-2 py-0.5 rounded-full">
                      {translateCategory(recipe.category, prefs.language)}
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-[12.5px] font-bold text-[var(--text-primary)] leading-snug line-clamp-2">
                  {prefs.language === 'es' && recipe.title_es ? recipe.title_es : recipe.title}
                </h3>
                {recipe.area && (
                  <p className="text-[10.5px] text-[var(--text-primary)]/40 mt-0.5">{translateArea(recipe.area, prefs.language)}</p>
                )}
              </motion.div>
            ))}
          </div>

          {hasMore && (
            <div className="pt-5 flex justify-center">
              <button
                onClick={() => fetchRecipes(page + 1, true)}
                disabled={loadingMore}
                className="bg-[var(--bg-surface)] text-[var(--text-primary)]/70 font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Area filter bottom sheet */}
      <AnimatePresence>
        {showAreaSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setShowAreaSheet(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-[430px] bg-[var(--bg-surface)] rounded-t-[28px] p-6 pb-safe space-y-4 max-h-[75vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-9 h-1 bg-[var(--text-primary)]/10 rounded-full mx-auto" />

              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-bold text-[var(--text-primary)]">Filtrar por cocina</h3>
                <button
                  onClick={() => setShowAreaSheet(false)}
                  className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4 text-[var(--text-primary)]/50" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setArea(null);
                    setShowAreaSheet(false);
                  }}
                  className={`px-3.5 py-2 rounded-full text-[12.5px] font-medium cursor-pointer transition-colors ${
                    !area ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)]/60'
                  }`}
                >
                  Todas
                </button>
                {areas.map((a) => (
                  <button
                    key={a}
                    onClick={() => {
                      setArea(a === area ? null : a);
                      setShowAreaSheet(false);
                    }}
                    className={`px-3.5 py-2 rounded-full text-[12.5px] font-medium cursor-pointer transition-colors ${
                      area === a ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)]/60'
                    }`}
                  >
                    {translateArea(a, prefs.language)}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
