import React from 'react';
import { X, Languages, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePreferences, setPreferences } from '../lib/preferences';

interface PreferencesSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function PreferencesSheet({ open, onClose }: PreferencesSheetProps) {
  const prefs = usePreferences();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-[430px] bg-[var(--bg-surface)] rounded-t-[28px] p-6 pb-safe space-y-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 bg-[var(--text-primary)]/10 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-[var(--text-primary)]">Preferencias</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-[var(--text-primary)]/50" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Languages className="w-4 h-4 text-[var(--text-primary)]/50" strokeWidth={2} />
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">Idioma de las recetas</span>
              </div>
              <div className="flex bg-[var(--bg-elevated)] rounded-2xl p-1">
                <button
                  onClick={() => setPreferences({ language: 'es' })}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors ${
                    prefs.language === 'es' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'text-[var(--text-primary)]/60'
                  }`}
                >
                  Español
                </button>
                <button
                  onClick={() => setPreferences({ language: 'en' })}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors ${
                    prefs.language === 'en' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'text-[var(--text-primary)]/60'
                  }`}
                >
                  English
                </button>
              </div>
              <p className="text-[11.5px] text-[var(--text-primary)]/35 mt-2 px-0.5 leading-relaxed">
                Aplica al Recetario: título, ingredientes, instrucciones, categoría y cocina.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Scale className="w-4 h-4 text-[var(--text-primary)]/50" strokeWidth={2} />
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">Unidades de medida</span>
              </div>
              <div className="flex bg-[var(--bg-elevated)] rounded-2xl p-1">
                <button
                  onClick={() => setPreferences({ unitSystem: 'metric' })}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors ${
                    prefs.unitSystem === 'metric' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'text-[var(--text-primary)]/60'
                  }`}
                >
                  Métrico (kg, g)
                </button>
                <button
                  onClick={() => setPreferences({ unitSystem: 'imperial' })}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors ${
                    prefs.unitSystem === 'imperial' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'text-[var(--text-primary)]/60'
                  }`}
                >
                  Imperial (lb, oz)
                </button>
              </div>
              <p className="text-[11.5px] text-[var(--text-primary)]/35 mt-2 px-0.5 leading-relaxed">
                Tazas, cucharadas y cucharaditas no cambian entre sistemas.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
