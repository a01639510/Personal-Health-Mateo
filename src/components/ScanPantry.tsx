import React, { useState, useRef } from 'react';
import { Camera, Plus, X, Loader2, ArrowRight, RotateCcw, ScanBarcode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DetectedItem } from '../types';

interface ScanPantryProps {
  onSearchRecipes: (ingredients: string[]) => void;
  onOpenInventory: () => void;
}

const CATEGORIES = ['Verdura', 'Fruta', 'Lácteo', 'Carne', 'Huevo', 'Salsa', 'Condimento', 'Legumbre', 'Panadería', 'Pescado', 'Otros'];

const CONFIDENCE_DOT: Record<string, string> = {
  alta: '#34c759',
  media: '#ff9f0a',
  baja: '#ff3b30',
};

export default function ScanPantry({ onSearchRecipes, onOpenInventory }: ScanPantryProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [detectedIngredients, setDetectedIngredients] = useState<DetectedItem[]>([]);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [editingIngredient, setEditingIngredient] = useState<{
    index: number;
    name: string;
    category: string;
    confidence: 'alta' | 'media' | 'baja';
  } | null>(null);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      startScan(base64String);
    };
    reader.readAsDataURL(file);
  };

  const startScan = async (base64Image: string) => {
    setIsScanning(true);
    setLoadingStep('Subiendo imagen...');

    const timers = [
      setTimeout(() => setLoadingStep('Analizando con visión IA...'), 2000),
      setTimeout(() => setLoadingStep('Identificando ingredientes...'), 4500),
      setTimeout(() => setLoadingStep('Clasificando por categoría...'), 7000),
      setTimeout(() => setLoadingStep('Guardando resultados...'), 9000),
    ];

    try {
      const response = await fetch('/api/identify-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      timers.forEach(clearTimeout);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || errData.error || 'Error al identificar ingredientes');
      }

      const data = await response.json();
      setDetectedIngredients(data.ingredients || []);

      if (data.ingredients.length === 0) {
        setError({
          message: 'No detectamos ingredientes.',
          details: 'Prueba con mejor luz o agrégalos manualmente abajo.'
        });
      }
    } catch (err: any) {
      timers.forEach(clearTimeout);
      console.error(err);
      setError({
        message: 'Error al escanear la imagen',
        details: err.message || 'Verifica tus API Keys o intenta con otra foto.'
      });
    } finally {
      setIsScanning(false);
      setLoadingStep('');
    }
  };

  const handleDeleteIngredient = (index: number) => {
    setDetectedIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngredientName.trim()) return;

    const newItem: DetectedItem = {
      name: newIngredientName.trim().toLowerCase(),
      category: 'Otros',
      confidence: 'alta'
    };

    setDetectedIngredients(prev => [...prev, newItem]);
    setNewIngredientName('');
  };

  const handleSaveIngredientEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIngredient || !editingIngredient.name.trim()) return;

    setDetectedIngredients(prev => {
      const updated = [...prev];
      updated[editingIngredient.index] = {
        name: editingIngredient.name.trim().toLowerCase(),
        category: editingIngredient.category,
        confidence: editingIngredient.confidence
      };
      return updated;
    });
    setEditingIngredient(null);
  };

  const triggerSearch = () => {
    const ingredientsList = detectedIngredients.map(item => item.name);
    if (ingredientsList.length === 0) return;
    onSearchRecipes(ingredientsList);
  };

  const resetAll = () => {
    setImagePreview(null);
    setDetectedIngredients([]);
    setError(null);
  };

  return (
    <div className="pt-1">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {!imagePreview ? (
          /* START SCANNING SCREEN */
          <motion.div
            key="start-screen"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col pt-2"
          >
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[4/5] rounded-[32px] bg-[var(--bg-surface)] flex flex-col items-center justify-center gap-5 cursor-pointer active:scale-[0.99] transition-transform px-8"
            >
              <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                <Camera className="w-7 h-7 text-[var(--text-primary)]/80" strokeWidth={1.75} />
              </div>
              <div className="text-center">
                <h2 className="text-[19px] font-bold text-[var(--text-primary)] tracking-tight">¿Qué tienes en tu refri?</h2>
                <p className="text-[13px] text-[var(--text-primary)]/40 mt-1.5 leading-relaxed max-w-[240px]">
                  Toma una foto y la IA detecta tus ingredientes al instante
                </p>
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold text-[15px] py-4 rounded-full active:scale-[0.98] transition-transform cursor-pointer"
            >
              <Camera className="w-[18px] h-[18px]" strokeWidth={2} />
              <span>Escanear refrigerador</span>
            </button>

            <button
              onClick={onOpenInventory}
              className="mt-2.5 w-full flex items-center justify-center gap-2 bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold text-[15px] py-4 rounded-full active:scale-[0.98] transition-transform cursor-pointer"
            >
              <ScanBarcode className="w-[18px] h-[18px]" strokeWidth={2} />
              <span>Escanear código de barras</span>
            </button>
          </motion.div>
        ) : isScanning ? (
          /* LOADING SCAN SCREEN */
          <motion.div
            key="scanning-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center pt-4"
          >
            <div className="relative w-full aspect-[4/5] rounded-[32px] overflow-hidden bg-[var(--bg-surface)]">
              <img
                src={imagePreview}
                alt="Escaneando"
                className="w-full h-full object-cover opacity-50 blur-[1px]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-transparent h-1/4 animate-[bounce_2.5s_infinite]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm">
                  <Loader2 className="w-6 h-6" color="#0a0a0a" strokeWidth={2} />
                </div>
                <p className="text-[12px] font-medium text-black/60 bg-white/80 backdrop-blur px-3.5 py-1.5 rounded-full max-w-[85%] text-center leading-snug">
                  {loadingStep}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          /* RESULTS / EDIT CHIPS SCREEN */
          <motion.div
            key="results-screen"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5 pt-2"
          >
            {/* Header of results screen */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 bg-[var(--bg-surface)]">
                <img
                  src={imagePreview}
                  alt="Pantry Preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">Ingredientes detectados</h3>
                <p className="text-[12px] text-[var(--text-primary)]/40">Toca para editar cada uno</p>
              </div>
              <button
                onClick={resetAll}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--bg-surface)] active:opacity-60 transition-colors cursor-pointer flex-shrink-0"
                title="Tomar otra foto"
              >
                <RotateCcw className="w-4 h-4 text-[var(--text-primary)]/60" strokeWidth={2} />
              </button>
            </div>

            {/* Error view */}
            {error && (
              <div className="bg-[var(--danger-bg)] text-[var(--danger-fg)] p-3.5 rounded-2xl text-[12px] leading-relaxed">
                <div className="font-semibold">{error.message}</div>
                {error.details && <p className="opacity-80 mt-0.5">{error.details}</p>}
              </div>
            )}

            {/* Chips Grid */}
            <div>
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <span className="text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide">
                  {detectedIngredients.length} ingredientes
                </span>
                {detectedIngredients.length > 0 && (
                  <button
                    onClick={() => setDetectedIngredients([])}
                    className="text-[11px] font-medium text-[#ff3b30] cursor-pointer"
                  >
                    Borrar todo
                  </button>
                )}
              </div>

              {detectedIngredients.length === 0 ? (
                <div className="bg-[var(--bg-surface)] rounded-2xl p-6 text-center text-[var(--text-primary)]/30 text-[13px]">
                  Aún no hay ingredientes. Agrega algunos abajo.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {detectedIngredients.map((item, index) => (
                      <motion.button
                        key={`${item.name}-${index}`}
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        onClick={() => setEditingIngredient({ index, name: item.name, category: item.category, confidence: item.confidence })}
                        className="flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-[13px] cursor-pointer active:scale-95 transition-transform"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CONFIDENCE_DOT[item.confidence] || CONFIDENCE_DOT.alta }}
                        />
                        <span className="capitalize font-medium">{item.name}</span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteIngredient(index);
                          }}
                          className="text-[var(--text-primary)]/30 ml-0.5 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Add Manual Ingredient Form */}
            <form onSubmit={handleAddIngredient} className="flex items-center gap-2">
              <input
                type="text"
                value={newIngredientName}
                onChange={(e) => setNewIngredientName(e.target.value)}
                placeholder="Agregar ingrediente..."
                className="flex-grow bg-[var(--bg-surface)] rounded-full px-4 py-3 text-[14px] text-[var(--text-primary)] placeholder-[var(--text-primary)]/30 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center justify-center w-11 h-11 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] flex-shrink-0 cursor-pointer active:scale-95 transition-transform disabled:opacity-30"
                disabled={!newIngredientName.trim()}
              >
                <Plus className="w-5 h-5" strokeWidth={2.25} />
              </button>
            </form>

            {/* Search Recipes CTA Button */}
            <div className="pt-1">
              <button
                onClick={triggerSearch}
                disabled={detectedIngredients.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--accent-foreground)] font-semibold py-4 rounded-full transition-transform active:scale-[0.98] cursor-pointer text-[15px]"
              >
                <span>Buscar recetas</span>
                <ArrowRight className="w-[18px] h-[18px]" strokeWidth={2} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ingredient Editor Bottom Sheet */}
      <AnimatePresence>
        {editingIngredient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setEditingIngredient(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-[430px] bg-[var(--bg-surface)] rounded-t-[28px] p-6 pb-safe space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-9 h-1 bg-[var(--text-primary)]/10 rounded-full mx-auto" />

              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-bold text-[var(--text-primary)]">Editar ingrediente</h3>
                <button
                  onClick={() => setEditingIngredient(null)}
                  className="w-8 h-8 rounded-full bg-[var(--bg-surface)] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4 text-[var(--text-primary)]/50" />
                </button>
              </div>

              <form onSubmit={handleSaveIngredientEdit} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Nombre</label>
                  <input
                    type="text"
                    value={editingIngredient.name}
                    onChange={(e) => setEditingIngredient(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full bg-[var(--bg-surface)] rounded-2xl px-4 py-3.5 text-[15px] text-[var(--text-primary)] focus:outline-none"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Categoría</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditingIngredient(prev => prev ? { ...prev, category: cat } : null)}
                        className={`px-3.5 py-2 rounded-full text-[12.5px] font-medium cursor-pointer transition-colors ${
                          editingIngredient.category === cat
                            ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)]/60'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Confianza</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['alta', 'media', 'baja'] as const).map((level) => {
                      const isActive = editingIngredient.confidence === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setEditingIngredient(prev => prev ? { ...prev, confidence: level } : null)}
                          className={`rounded-2xl py-2.5 text-[13px] font-semibold capitalize transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                            isActive ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]/50'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? 'var(--accent-foreground)' : CONFIDENCE_DOT[level] }} />
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold py-4 rounded-full text-[15px] cursor-pointer active:scale-[0.98] transition-transform"
                >
                  Guardar
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
