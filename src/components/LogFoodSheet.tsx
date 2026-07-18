import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Check, AlertCircle, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UsdaFoodSearchResult, CookbookSearchResult } from '../types';
import { usePreferences } from '../lib/preferences';
import { getCategoryIcon, translateFoodCategory, isLiquidCategory } from '../lib/foodCategoryIcons';

interface LogFoodSheetProps {
  open: boolean;
  onClose: () => void;
  onLogged: () => void;
}

type Step = 'choose' | 'dish-search' | 'category-grid' | 'ingredient-search' | 'quantity';

const GRAM_PRESETS = [50, 100, 150, 200, 300];
const ML_PRESETS = [100, 200, 250, 500, 1000];
const SERVING_MULTIPLIERS = [0.5, 1, 1.5, 2];

export default function LogFoodSheet({ open, onClose, onLogged }: LogFoodSheetProps) {
  const prefs = usePreferences();
  const [step, setStep] = useState<Step>('choose');

  const [dishQuery, setDishQuery] = useState('');
  const [dishResults, setDishResults] = useState<CookbookSearchResult[]>([]);
  const [selectedDish, setSelectedDish] = useState<CookbookSearchResult | null>(null);
  const [servingMultiplier, setServingMultiplier] = useState(1);

  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [ingredientResults, setIngredientResults] = useState<UsdaFoodSearchResult[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<UsdaFoodSearchResult | null>(null);
  const [quantity, setQuantity] = useState(100);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) {
      setStep('choose');
      setDishQuery(''); setDishResults([]); setSelectedDish(null); setServingMultiplier(1);
      setSelectedCategory(null); setIngredientQuery(''); setIngredientResults([]); setSelectedIngredient(null);
      setQuantity(100); setError(null);
    }
  }, [open]);

  // Precarga categorías al abrir la hoja (se usan al entrar a "Ingrediente").
  useEffect(() => {
    if (!open || categories.length > 0) return;
    setCategoriesLoading(true);
    fetch('/api/food-categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {})
      .finally(() => setCategoriesLoading(false));
  }, [open]);

  useEffect(() => {
    if (step !== 'dish-search' || !dishQuery.trim()) {
      setDishResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const myRequest = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cookbook-search?q=${encodeURIComponent(dishQuery.trim())}`);
        if (!res.ok) throw new Error('Error al buscar platillos');
        const data = await res.json();
        if (myRequest !== requestId.current) return;
        setDishResults(data.recipes || []);
      } catch (err: any) {
        if (myRequest !== requestId.current) return;
        setError(err.message || 'No se pudo buscar el platillo');
      } finally {
        if (myRequest === requestId.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [dishQuery, step]);

  useEffect(() => {
    if (step !== 'ingredient-search' || !selectedCategory) return;
    const t = setTimeout(async () => {
      const myRequest = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ category: selectedCategory });
        if (ingredientQuery.trim()) params.set('q', ingredientQuery.trim());
        const res = await fetch(`/api/food-search?${params.toString()}`);
        if (!res.ok) throw new Error('Error al buscar ingredientes');
        const data = await res.json();
        if (myRequest !== requestId.current) return;
        setIngredientResults(data.foods || []);
      } catch (err: any) {
        if (myRequest !== requestId.current) return;
        setError(err.message || 'No se pudo buscar el ingrediente');
      } finally {
        if (myRequest === requestId.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [ingredientQuery, selectedCategory, step]);

  const liquid = isLiquidCategory(selectedIngredient?.food_category);
  const unitLabel = liquid ? 'ml' : 'g';
  const presets = liquid ? ML_PRESETS : GRAM_PRESETS;
  const factor = quantity / 100;
  const computedCalories = selectedIngredient ? Math.round(selectedIngredient.kcal_per_100g * factor) : 0;
  const computedProtein = selectedIngredient ? Math.round(selectedIngredient.protein_g_per_100g * factor * 10) / 10 : 0;
  const computedCarbs = selectedIngredient ? Math.round(selectedIngredient.carbs_g_per_100g * factor * 10) / 10 : 0;
  const computedFat = selectedIngredient ? Math.round(selectedIngredient.fat_g_per_100g * factor * 10) / 10 : 0;

  const dishTitle = (r: CookbookSearchResult) => (prefs.language === 'es' && r.title_es ? r.title_es : r.title);
  const dishCalories = selectedDish ? Math.round((selectedDish.calories || 0) * servingMultiplier) : 0;
  const dishProtein = selectedDish ? Math.round((selectedDish.protein_g || 0) * servingMultiplier * 10) / 10 : 0;
  const dishCarbs = selectedDish ? Math.round((selectedDish.carbs_g || 0) * servingMultiplier * 10) / 10 : 0;
  const dishFat = selectedDish ? Math.round((selectedDish.fat_g || 0) * servingMultiplier * 10) / 10 : 0;

  const logEntry = async (payload: any) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/food-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al registrar la comida');
      }
      onLogged();
      onClose();
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar la comida');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDish = () => {
    if (!selectedDish) return;
    logEntry({
      source: 'cookbook',
      source_id: selectedDish.id,
      name: `${dishTitle(selectedDish)}${servingMultiplier !== 1 ? ` (x${servingMultiplier})` : ''}`,
      calories: dishCalories,
      protein_g: dishProtein,
      carbs_g: dishCarbs,
      fat_g: dishFat,
    });
  };

  const handleSaveIngredient = () => {
    if (!selectedIngredient) return;
    logEntry({
      source: 'manual',
      name: selectedIngredient.description,
      calories: computedCalories,
      protein_g: computedProtein,
      carbs_g: computedCarbs,
      fat_g: computedFat,
    });
  };

  const headerTitle: Record<Step, string> = {
    choose: 'Registrar alimento',
    'dish-search': 'Elige un platillo',
    'category-grid': 'Elige una categoría',
    'ingredient-search': selectedCategory ? translateFoodCategory(selectedCategory, prefs.language) : 'Ingredientes',
    quantity: selectedIngredient?.description || 'Cantidad',
  };

  const handleBack = () => {
    setError(null);
    if (step === 'dish-search') {
      if (selectedDish) { setSelectedDish(null); return; }
      setStep('choose');
    } else if (step === 'category-grid') {
      setStep('choose');
    } else if (step === 'ingredient-search') {
      setSelectedCategory(null);
      setIngredientQuery('');
      setIngredientResults([]);
      setStep('category-grid');
    } else if (step === 'quantity') {
      setSelectedIngredient(null);
      setStep('ingredient-search');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-[430px] bg-[var(--bg-surface)] rounded-t-[28px] p-6 pb-safe space-y-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 bg-[var(--text-primary)]/10 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {step !== 'choose' && (
                  <button
                    onClick={handleBack}
                    className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer flex-shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4 text-[var(--text-primary)]/60" strokeWidth={2.25} />
                  </button>
                )}
                <h3 className="text-[17px] font-bold text-[var(--text-primary)] capitalize truncate">{headerTitle[step]}</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4 text-[var(--text-primary)]/50" />
              </button>
            </div>

            {error && (
              <div className="bg-[var(--danger-bg)] text-[var(--danger-fg)] p-3 rounded-2xl text-[12px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                <span>{error}</span>
              </div>
            )}

            {/* Paso 1: elegir tipo de registro */}
            {step === 'choose' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStep('dish-search')}
                  className="bg-[var(--bg-elevated)] rounded-[24px] p-5 flex flex-col items-center gap-2.5 cursor-pointer active:scale-[0.97] transition-transform"
                >
                  <span className="text-[34px] leading-none">🍽️</span>
                  <span className="text-[13.5px] font-semibold text-[var(--text-primary)]">Platillo</span>
                  <span className="text-[11px] text-[var(--text-primary)]/40 text-center leading-snug">Del Recetario</span>
                </button>
                <button
                  onClick={() => setStep('category-grid')}
                  className="bg-[var(--bg-elevated)] rounded-[24px] p-5 flex flex-col items-center gap-2.5 cursor-pointer active:scale-[0.97] transition-transform"
                >
                  <span className="text-[34px] leading-none">🥕</span>
                  <span className="text-[13.5px] font-semibold text-[var(--text-primary)]">Ingrediente</span>
                  <span className="text-[11px] text-[var(--text-primary)]/40 text-center leading-snug">Por categoría</span>
                </button>
              </div>
            )}

            {/* Paso 2a: buscar platillo del recetario */}
            {step === 'dish-search' && !selectedDish && (
              <>
                <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-full px-4 py-3">
                  <Search className="w-4 h-4 text-[var(--text-primary)]/35 flex-shrink-0" strokeWidth={2} />
                  <input
                    type="text"
                    value={dishQuery}
                    onChange={(e) => setDishQuery(e.target.value)}
                    placeholder="Ej. tacos, pollo al horno..."
                    className="flex-grow bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[var(--text-primary)]/35 focus:outline-none min-w-0"
                    autoFocus
                  />
                </div>

                {loading && <p className="text-[12.5px] text-[var(--text-primary)]/35 text-center py-4">Buscando...</p>}
                {!loading && dishQuery.trim() && dishResults.length === 0 && (
                  <p className="text-[12.5px] text-[var(--text-primary)]/35 text-center py-4">Sin resultados.</p>
                )}

                <div className="space-y-2">
                  {dishResults.map((dish) => (
                    <button
                      key={dish.id}
                      onClick={() => { setSelectedDish(dish); setServingMultiplier(1); }}
                      className="w-full flex items-center gap-3 text-left bg-[var(--bg-elevated)] rounded-2xl px-3 py-2.5 cursor-pointer active:scale-[0.99] transition-transform"
                    >
                      <img
                        src={dish.image_url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-cover flex-shrink-0 bg-[var(--bg-surface)]"
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)] capitalize line-clamp-1">{dishTitle(dish)}</p>
                        <p className="text-[11px] text-[var(--text-primary)]/40 mt-0.5">
                          {dish.calories != null ? `${Math.round(dish.calories)} kcal / porción` : 'Sin datos de nutrición'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Paso 2a-confirm: confirmar platillo + porciones */}
            {step === 'dish-search' && selectedDish && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-2xl px-3 py-3">
                  <img
                    src={selectedDish.image_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  />
                  <p className="text-[13.5px] font-semibold text-[var(--text-primary)] capitalize line-clamp-2">{dishTitle(selectedDish)}</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Porciones</label>
                  <div className="flex gap-2">
                    {SERVING_MULTIPLIERS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setServingMultiplier(m)}
                        className={`flex-1 py-2.5 rounded-full text-[13px] font-semibold cursor-pointer transition-colors ${
                          servingMultiplier === m ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)]/60'
                        }`}
                      >
                        {m}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[15px] font-bold text-[var(--text-primary)]">{dishCalories}</p>
                    <p className="text-[10.5px] text-[var(--text-primary)]/40 font-medium">kcal</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold" style={{ color: 'var(--ring-protein)' }}>{dishProtein}g</p>
                    <p className="text-[10.5px] text-[var(--text-primary)]/40 font-medium">Proteína</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold" style={{ color: 'var(--ring-carbs)' }}>{dishCarbs}g</p>
                    <p className="text-[10.5px] text-[var(--text-primary)]/40 font-medium">Carbos</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold" style={{ color: 'var(--ring-fat)' }}>{dishFat}g</p>
                    <p className="text-[10.5px] text-[var(--text-primary)]/40 font-medium">Grasas</p>
                  </div>
                </div>

                <button
                  onClick={handleSaveDish}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] disabled:opacity-50 text-[var(--accent-foreground)] font-semibold py-4 rounded-full text-[15px] cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  <span>{saving ? 'Guardando...' : 'Registrar'}</span>
                </button>
              </div>
            )}

            {/* Paso 2b: grid de categorías */}
            {step === 'category-grid' && (
              <>
                {categoriesLoading && <p className="text-[12.5px] text-[var(--text-primary)]/35 text-center py-4">Cargando categorías...</p>}
                <div className="grid grid-cols-3 gap-2.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setIngredientQuery(''); setStep('ingredient-search'); }}
                      className="bg-[var(--bg-elevated)] rounded-[20px] p-3 flex flex-col items-center gap-1.5 cursor-pointer active:scale-[0.96] transition-transform"
                    >
                      <span className="text-[26px] leading-none">{getCategoryIcon(cat)}</span>
                      <span className="text-[10.5px] font-semibold text-[var(--text-primary)] text-center leading-tight line-clamp-2">
                        {translateFoodCategory(cat, prefs.language)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Paso 3: buscar ingrediente dentro de la categoría */}
            {step === 'ingredient-search' && !selectedIngredient && (
              <>
                <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-full px-4 py-3">
                  <Search className="w-4 h-4 text-[var(--text-primary)]/35 flex-shrink-0" strokeWidth={2} />
                  <input
                    type="text"
                    value={ingredientQuery}
                    onChange={(e) => setIngredientQuery(e.target.value)}
                    placeholder="Filtrar en esta categoría..."
                    className="flex-grow bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[var(--text-primary)]/35 focus:outline-none min-w-0"
                    autoFocus
                  />
                </div>

                {loading && <p className="text-[12.5px] text-[var(--text-primary)]/35 text-center py-4">Buscando...</p>}
                {!loading && ingredientResults.length === 0 && (
                  <p className="text-[12.5px] text-[var(--text-primary)]/35 text-center py-4">Sin resultados.</p>
                )}

                <div className="space-y-2">
                  {ingredientResults.map((food) => (
                    <button
                      key={food.fdc_id}
                      onClick={() => { setSelectedIngredient(food); setQuantity(isLiquidCategory(food.food_category) ? 250 : 100); setStep('quantity'); }}
                      className="w-full text-left bg-[var(--bg-elevated)] rounded-2xl px-4 py-3 cursor-pointer active:scale-[0.99] transition-transform"
                    >
                      <p className="text-[13px] font-semibold text-[var(--text-primary)] capitalize line-clamp-2">{food.description}</p>
                      <p className="text-[11px] text-[var(--text-primary)]/40 mt-0.5">
                        {Math.round(food.kcal_per_100g)} kcal / 100{isLiquidCategory(food.food_category) ? 'ml' : 'g'}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Paso 4: cantidad */}
            {step === 'quantity' && selectedIngredient && (
              <div className="space-y-5">
                <div className="bg-[var(--bg-elevated)] rounded-2xl px-4 py-3 flex items-center gap-2.5">
                  <span className="text-[22px] leading-none flex-shrink-0">{getCategoryIcon(selectedIngredient.food_category)}</span>
                  <p className="text-[13.5px] font-semibold text-[var(--text-primary)] capitalize line-clamp-2">{selectedIngredient.description}</p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">
                    Cantidad ({unitLabel})
                  </label>
                  <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => setQuantity((q) => Math.max(1, q - (liquid ? 50 : 10)))} className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold cursor-pointer">−</button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="flex-grow bg-[var(--bg-elevated)] rounded-2xl px-3 py-3 text-[15px] text-[var(--text-primary)] focus:outline-none text-center"
                    />
                    <button onClick={() => setQuantity((q) => q + (liquid ? 50 : 10))} className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold cursor-pointer">+</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <button
                        key={p}
                        onClick={() => setQuantity(p)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${
                          quantity === p ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)]/55'
                        }`}
                      >
                        {liquid && p >= 1000 ? `${p / 1000}L` : `${p}${unitLabel}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[15px] font-bold text-[var(--text-primary)]">{computedCalories}</p>
                    <p className="text-[10.5px] text-[var(--text-primary)]/40 font-medium">kcal</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold" style={{ color: 'var(--ring-protein)' }}>{computedProtein}g</p>
                    <p className="text-[10.5px] text-[var(--text-primary)]/40 font-medium">Proteína</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold" style={{ color: 'var(--ring-carbs)' }}>{computedCarbs}g</p>
                    <p className="text-[10.5px] text-[var(--text-primary)]/40 font-medium">Carbos</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold" style={{ color: 'var(--ring-fat)' }}>{computedFat}g</p>
                    <p className="text-[10.5px] text-[var(--text-primary)]/40 font-medium">Grasas</p>
                  </div>
                </div>

                <button
                  onClick={handleSaveIngredient}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] disabled:opacity-50 text-[var(--accent-foreground)] font-semibold py-4 rounded-full text-[15px] cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  <span>{saving ? 'Guardando...' : 'Registrar'}</span>
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
