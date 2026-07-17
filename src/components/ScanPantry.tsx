import React, { useState, useRef } from 'react';
import { Camera, Plus, Trash2, Sparkles, RefreshCw, X, Loader2, ListPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DetectedItem } from '../types';

interface ScanPantryProps {
  onSearchRecipes: (ingredients: string[]) => void;
}

export default function ScanPantry({ onSearchRecipes }: ScanPantryProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [detectedIngredients, setDetectedIngredients] = useState<DetectedItem[]>([]);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientCategory, setNewIngredientCategory] = useState('Otros');
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
    setLoadingStep('Subiendo imagen al almacén de Supabase...');
    
    // Cycle beautiful loading states to keep user engaged
    const timers = [
      setTimeout(() => setLoadingStep('Ejecutando visión por computadora con Claude 3.5 Sonnet...'), 2000),
      setTimeout(() => setLoadingStep('Analizando ingredientes, empaques y texturas...'), 4500),
      setTimeout(() => setLoadingStep('Clasificando en categorías y estimando confianza...'), 7000),
      setTimeout(() => setLoadingStep('Guardando reporte de análisis en la base de datos...'), 9000),
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
          message: 'No pudimos detectar ningún ingrediente reconocible.',
          details: 'Prueba tomando la foto con mejor iluminación o agrega tus ingredientes manualmente abajo.'
        });
      }
    } catch (err: any) {
      timers.forEach(clearTimeout);
      console.error(err);
      setError({
        message: 'Error al escanear la imagen',
        details: err.message || 'Por favor verifica tus API Keys o intenta de nuevo con otra foto.'
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
      category: newIngredientCategory,
      confidence: 'alta'
    };

    setDetectedIngredients(prev => [...prev, newItem]);
    setNewIngredientName('');
    setNewIngredientCategory('Otros');
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
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-4xl mx-auto">
      {/* Dynamic Main Stage */}
      <AnimatePresence mode="wait">
        {!imagePreview ? (
          /* START SCANNING SCREEN */
          <motion.div
            key="start-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col items-center justify-center text-center py-12 px-4"
          >
            <div className="bg-emerald-50 p-6 rounded-full border border-emerald-100 mb-6 shadow-sm animate-pulse">
              <Camera className="w-12 h-12 text-emerald-600" />
            </div>
            
            <h2 className="font-display font-semibold text-2xl text-slate-800 tracking-tight mb-3">
              ¿Qué tienes en tu refrigerador hoy?
            </h2>
            <p className="text-slate-500 text-sm max-w-md mb-8">
              Toma una foto de tu refrigerador o alacena abierta. Nuestra inteligencia de visión identificará los ingredientes y te sugerirá recetas al instante.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="group flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-4 rounded-2xl text-base shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all cursor-pointer scale-100 active:scale-95"
            >
              <Camera className="w-5 h-5 text-white group-hover:rotate-6 transition-transform" />
              <span>Escanear refrigerador</span>
            </button>
          </motion.div>
        ) : isScanning ? (
          /* LOADING SCAN SCREEN */
          <motion.div
            key="scanning-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center text-center py-12"
          >
            {/* Image Preview with overlay animation */}
            <div className="relative w-64 h-64 rounded-3xl overflow-hidden border border-slate-200 shadow-md mb-8">
              <img
                src={imagePreview}
                alt="Escaneando"
                className="w-full h-full object-cover opacity-60 blur-[1px]"
                referrerPolicy="no-referrer"
              />
              {/* Scan beam */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent h-1/4 animate-[bounce_2.5s_infinite] border-b-2 border-emerald-400" />
            </div>

            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
            <h3 className="font-display font-medium text-lg text-slate-800 mb-2">Analizando Alimentos</h3>
            <p className="text-slate-500 text-xs font-mono max-w-sm px-6 h-10 transition-all duration-300">
              {loadingStep}
            </p>
          </motion.div>
        ) : (
          /* RESULTS / EDIT CHIPS SCREEN */
          <motion.div
            key="results-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header of results screen */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="Pantry Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-slate-800">Ingredientes Detectados</h3>
                  <p className="text-xs text-slate-500">Edita la lista para que sea exacta antes de buscar recetas.</p>
                </div>
              </div>

              <button
                onClick={resetAll}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 transition-colors bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-center shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tomar otra foto</span>
              </button>
            </div>

            {/* Error view */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-red-700">
                  <X className="w-4 h-4 text-red-500" />
                  <span>{error.message}</span>
                </div>
                {error.details && <p className="text-red-600/90 pl-5">{error.details}</p>}
              </div>
            )}

            {/* Chips Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-500 font-semibold uppercase tracking-wider">
                  Ingredientes ({detectedIngredients.length})
                </span>
                {detectedIngredients.length > 0 && (
                  <button
                    onClick={() => setDetectedIngredients([])}
                    className="text-[10px] font-mono text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Borrar todo
                  </button>
                )}
              </div>

              {detectedIngredients.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  Aún no hay ingredientes. Escribe algunos abajo para comenzar.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5 max-h-72 overflow-y-auto p-1">
                  <AnimatePresence>
                    {detectedIngredients.map((item, index) => {
                      const confidenceColors = {
                        alta: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        media: 'bg-amber-50 text-amber-700 border-amber-200',
                        baja: 'bg-rose-50 text-rose-700 border-rose-200'
                      };

                      return (
                        <motion.div
                          key={`${item.name}-${index}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          onClick={() => setEditingIngredient({ index, name: item.name, category: item.category, confidence: item.confidence })}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border bg-white border-slate-200 hover:border-slate-300 text-slate-700 text-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] hover:bg-slate-50 shadow-xs group"
                          title="Haz clic para editar"
                        >
                          <span className="capitalize font-medium group-hover:text-emerald-700 transition-colors">{item.name}</span>
                          <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md font-mono border border-slate-100">
                            {item.category}
                          </span>
                          
                          {/* Confidence Indicator */}
                          <span className={`text-[10px] font-mono px-1 py-0.5 rounded-md border uppercase font-medium ${confidenceColors[item.confidence] || confidenceColors.alta}`}>
                            {item.confidence}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteIngredient(index);
                            }}
                            className="text-slate-400 hover:text-rose-500 transition-colors ml-1 p-0.5 cursor-pointer"
                            title="Eliminar ingrediente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Add Manual Ingredient Form */}
            <form onSubmit={handleAddIngredient} className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1.5">Agregar ingrediente manual</label>
                  <input
                    type="text"
                    value={newIngredientName}
                    onChange={(e) => setNewIngredientName(e.target.value)}
                    placeholder="Ej. Cebolla, pollo, pimiento..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1.5">Categoría</label>
                  <select
                    value={newIngredientCategory}
                    onChange={(e) => setNewIngredientCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Verdura">Verdura</option>
                    <option value="Fruta">Fruta</option>
                    <option value="Lácteo">Lácteo</option>
                    <option value="Carne">Carne</option>
                    <option value="Huevo">Huevo</option>
                    <option value="Salsa">Salsa</option>
                    <option value="Condimento">Condimento</option>
                    <option value="Legumbre">Legumbre</option>
                    <option value="Panadería">Panadería</option>
                    <option value="Pescado">Pescado</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-emerald-600 px-4 py-2 rounded-xl text-sm font-semibold transition-all self-end h-[38px] w-full sm:w-auto cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </div>
            </form>

            {/* Search Recipes CTA Button */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={triggerSearch}
                disabled={detectedIngredients.length === 0}
                className="w-full sm:w-auto group flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer text-sm"
              >
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
                <span>Buscar Recetas Sugeridas</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ingredient Editor Modal */}
      <AnimatePresence>
        {editingIngredient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4"
            onClick={() => setEditingIngredient(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display font-semibold text-base text-slate-800">Editar Ingrediente</h3>
                <button
                  onClick={() => setEditingIngredient(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveIngredientEdit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1.5">Nombre</label>
                  <input
                    type="text"
                    value={editingIngredient.name}
                    onChange={(e) => setEditingIngredient(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1.5">Categoría</label>
                  <select
                    value={editingIngredient.category}
                    onChange={(e) => setEditingIngredient(prev => prev ? { ...prev, category: e.target.value } : null)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Verdura">Verdura</option>
                    <option value="Fruta">Fruta</option>
                    <option value="Lácteo">Lácteo</option>
                    <option value="Carne">Carne</option>
                    <option value="Huevo">Huevo</option>
                    <option value="Salsa">Salsa</option>
                    <option value="Condimento">Condimento</option>
                    <option value="Legumbre">Legumbre</option>
                    <option value="Panadería">Panadería</option>
                    <option value="Pescado">Pescado</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1.5">Nivel de Confianza</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['alta', 'media', 'baja'] as const).map((level) => {
                      const levelColors = {
                        alta: 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
                        media: 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100',
                        baja: 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100',
                      };
                      const activeColors = {
                        alta: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700',
                        media: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600',
                        baja: 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700',
                      };
                      const isActive = editingIngredient.confidence === level;

                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setEditingIngredient(prev => prev ? { ...prev, confidence: level } : null)}
                          className={`border rounded-xl py-2 text-xs font-semibold capitalize transition-all cursor-pointer text-center ${
                            isActive ? activeColors[level] : levelColors[level]
                          }`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingIngredient(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm shadow-emerald-600/10"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
