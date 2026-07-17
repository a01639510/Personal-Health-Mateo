import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UsdaFoodSearchResult } from '../types';

interface LogFoodSheetProps {
  open: boolean;
  onClose: () => void;
  onLogged: () => void;
}

export default function LogFoodSheet({ open, onClose, onLogged }: LogFoodSheetProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UsdaFoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UsdaFoodSearchResult | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setResults([]);
      setSelected(null);
      setQuantity(100);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const myRequest = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/food-search?q=${encodeURIComponent(search.trim())}`);
        if (!res.ok) throw new Error('Error al buscar alimentos');
        const data = await res.json();
        if (myRequest !== requestId.current) return;
        setResults(data.foods || []);
      } catch (err: any) {
        if (myRequest !== requestId.current) return;
        setError(err.message || 'No se pudo buscar el alimento');
      } finally {
        if (myRequest === requestId.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const factor = quantity / 100;
  const computedCalories = selected ? Math.round(selected.kcal_per_100g * factor) : 0;
  const computedProtein = selected ? Math.round(selected.protein_g_per_100g * factor * 10) / 10 : 0;
  const computedCarbs = selected ? Math.round(selected.carbs_g_per_100g * factor * 10) / 10 : 0;
  const computedFat = selected ? Math.round(selected.fat_g_per_100g * factor * 10) / 10 : 0;

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/food-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'manual',
          name: selected.description,
          calories: computedCalories,
          protein_g: computedProtein,
          carbs_g: computedCarbs,
          fat_g: computedFat,
        }),
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
              <h3 className="text-[17px] font-bold text-[var(--text-primary)]">Registrar alimento</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-[var(--text-primary)]/50" />
              </button>
            </div>

            {!selected ? (
              <>
                <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-full px-4 py-3">
                  <Search className="w-4 h-4 text-[var(--text-primary)]/35 flex-shrink-0" strokeWidth={2} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ej. pollo, arroz, manzana..."
                    className="flex-grow bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[var(--text-primary)]/35 focus:outline-none min-w-0"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="bg-[var(--danger-bg)] text-[var(--danger-fg)] p-3 rounded-2xl text-[12px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                    <span>{error}</span>
                  </div>
                )}

                {loading && (
                  <p className="text-[12.5px] text-[var(--text-primary)]/35 text-center py-4">Buscando...</p>
                )}

                {!loading && search.trim() && results.length === 0 && (
                  <p className="text-[12.5px] text-[var(--text-primary)]/35 text-center py-4">Sin resultados.</p>
                )}

                <div className="space-y-2">
                  {results.map((food) => (
                    <button
                      key={food.fdc_id}
                      onClick={() => setSelected(food)}
                      className="w-full text-left bg-[var(--bg-elevated)] rounded-2xl px-4 py-3 cursor-pointer active:scale-[0.99] transition-transform"
                    >
                      <p className="text-[13px] font-semibold text-[var(--text-primary)] capitalize line-clamp-2">{food.description}</p>
                      <p className="text-[11px] text-[var(--text-primary)]/40 mt-0.5">{Math.round(food.kcal_per_100g)} kcal / 100g</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-5">
                <div className="bg-[var(--bg-elevated)] rounded-2xl px-4 py-3 flex items-center justify-between">
                  <p className="text-[13.5px] font-semibold text-[var(--text-primary)] capitalize line-clamp-2 pr-2">{selected.description}</p>
                  <button onClick={() => setSelected(null)} className="text-[12px] font-semibold text-[var(--text-primary)]/50 flex-shrink-0 cursor-pointer">
                    Cambiar
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Cantidad (gramos)</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQuantity((q) => Math.max(10, q - 10))} className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold cursor-pointer">−</button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="flex-grow bg-[var(--bg-elevated)] rounded-2xl px-3 py-3 text-[15px] text-[var(--text-primary)] focus:outline-none text-center"
                    />
                    <button onClick={() => setQuantity((q) => q + 10)} className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold cursor-pointer">+</button>
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

                {error && (
                  <div className="bg-[var(--danger-bg)] text-[var(--danger-fg)] p-3 rounded-2xl text-[12px]">{error}</div>
                )}

                <button
                  onClick={handleSave}
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
