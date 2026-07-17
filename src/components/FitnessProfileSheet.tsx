import React, { useState } from 'react';
import { X, Dumbbell, Info, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFitnessProfile, setFitnessProfile } from '../lib/fitnessProfileStore';
import {
  FitnessProfile,
  Sex,
  ActivityLevel,
  FitnessGoal,
  ACTIVITY_LABELS,
  GOAL_LABELS,
  calculateFitnessTargets,
} from '../lib/fitnessCalculator';
import MacroRing from './MacroRing';

interface FitnessProfileSheetProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_FORM: FitnessProfile = {
  sex: 'male',
  age: 30,
  heightCm: 170,
  weightKg: 70,
  activityLevel: 'moderate',
  goal: 'maintain',
};

export default function FitnessProfileSheet({ open, onClose }: FitnessProfileSheetProps) {
  const profile = useFitnessProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FitnessProfile>(profile || DEFAULT_FORM);

  const showForm = !profile || editing;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFitnessProfile(form);
    setEditing(false);
  };

  const startEdit = () => {
    setForm(profile || DEFAULT_FORM);
    setEditing(true);
  };

  const targets = profile ? calculateFitnessTargets(profile) : null;

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
            className="w-full max-w-[430px] bg-[var(--bg-surface)] rounded-t-[28px] p-6 pb-safe space-y-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 bg-[var(--text-primary)]/10 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-[var(--text-primary)]/70" strokeWidth={2} />
                <h3 className="text-[17px] font-bold text-[var(--text-primary)]">Mi Perfil Fitness</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-[var(--text-primary)]/50" />
              </button>
            </div>

            {showForm ? (
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Sexo</label>
                  <div className="flex bg-[var(--bg-elevated)] rounded-2xl p-1">
                    {(['male', 'female'] as Sex[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, sex: s }))}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer transition-colors ${
                          form.sex === s ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'text-[var(--text-primary)]/60'
                        }`}
                      >
                        {s === 'male' ? 'Hombre' : 'Mujer'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Edad</label>
                    <input
                      type="number"
                      min={14}
                      max={100}
                      value={form.age}
                      onChange={(e) => setForm((f) => ({ ...f, age: Number(e.target.value) }))}
                      className="w-full bg-[var(--bg-elevated)] rounded-2xl px-3 py-3 text-[15px] text-[var(--text-primary)] focus:outline-none text-center"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Altura cm</label>
                    <input
                      type="number"
                      min={100}
                      max={250}
                      value={form.heightCm}
                      onChange={(e) => setForm((f) => ({ ...f, heightCm: Number(e.target.value) }))}
                      className="w-full bg-[var(--bg-elevated)] rounded-2xl px-3 py-3 text-[15px] text-[var(--text-primary)] focus:outline-none text-center"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Peso kg</label>
                    <input
                      type="number"
                      min={30}
                      max={300}
                      value={form.weightKg}
                      onChange={(e) => setForm((f) => ({ ...f, weightKg: Number(e.target.value) }))}
                      className="w-full bg-[var(--bg-elevated)] rounded-2xl px-3 py-3 text-[15px] text-[var(--text-primary)] focus:outline-none text-center"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Nivel de actividad</label>
                  <div className="space-y-2">
                    {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, activityLevel: level }))}
                        className={`w-full text-left px-4 py-3 rounded-2xl text-[13px] font-medium cursor-pointer transition-colors ${
                          form.activityLevel === level ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)]/70'
                        }`}
                      >
                        {ACTIVITY_LABELS[level]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Objetivo</label>
                  <div className="flex bg-[var(--bg-elevated)] rounded-2xl p-1">
                    {(Object.keys(GOAL_LABELS) as FitnessGoal[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, goal: g }))}
                        className={`flex-1 py-2.5 rounded-xl text-[12.5px] font-semibold cursor-pointer transition-colors ${
                          form.goal === g ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'text-[var(--text-primary)]/60'
                        }`}
                      >
                        {GOAL_LABELS[g]}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold py-4 rounded-full text-[15px] cursor-pointer active:scale-[0.98] transition-transform"
                >
                  Calcular mis metas
                </button>

                {profile && (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="w-full bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold py-3.5 rounded-full text-[14px] cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    Cancelar
                  </button>
                )}
              </form>
            ) : (
              targets && (
                <div className="space-y-5">
                  <div className="bg-[var(--bg-elevated)] rounded-[24px] p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide">IMC</p>
                      <p className="text-[24px] font-extrabold text-[var(--text-primary)] tracking-tight">{targets.bmi}</p>
                      <p className="text-[12.5px] font-semibold mt-0.5" style={{ color: targets.bmiCategory.colorVar }}>
                        {targets.bmiCategory.label}
                      </p>
                    </div>
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-1.5 bg-[var(--bg-surface)] text-[var(--text-primary)]/70 font-semibold px-3.5 py-2 rounded-full text-[12.5px] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                      Editar
                    </button>
                  </div>

                  <div className="bg-[var(--bg-elevated)] rounded-[28px] p-6">
                    <div className="flex items-center justify-center mb-6">
                      <MacroRing value={targets.targetCalories} max={3500} size={126} strokeWidth={10} color="var(--ring-calories)" delay={0.1}>
                        <div className="text-center">
                          <div className="text-[24px] font-extrabold text-[var(--text-primary)] leading-none tracking-tight">{targets.targetCalories}</div>
                          <div className="text-[11px] text-[var(--text-primary)]/40 font-semibold mt-1">kcal/día</div>
                        </div>
                      </MacroRing>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center gap-2">
                        <MacroRing value={targets.proteinG} max={250} size={56} strokeWidth={5} color="var(--ring-protein)" delay={0.45}>
                          <span className="text-[12px] font-bold text-[var(--text-primary)]">{targets.proteinG}g</span>
                        </MacroRing>
                        <span className="text-[11px] text-[var(--text-primary)]/40 font-medium">Proteína</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <MacroRing value={targets.carbsG} max={400} size={56} strokeWidth={5} color="var(--ring-carbs)" delay={0.57}>
                          <span className="text-[12px] font-bold text-[var(--text-primary)]">{targets.carbsG}g</span>
                        </MacroRing>
                        <span className="text-[11px] text-[var(--text-primary)]/40 font-medium">Carbos</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <MacroRing value={targets.fatG} max={150} size={56} strokeWidth={5} color="var(--ring-fat)" delay={0.69}>
                          <span className="text-[12px] font-bold text-[var(--text-primary)]">{targets.fatG}g</span>
                        </MacroRing>
                        <span className="text-[11px] text-[var(--text-primary)]/40 font-medium">Grasas</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[12.5px] text-[var(--text-primary)]/50 bg-[var(--bg-elevated)] rounded-2xl px-4 py-3">
                    <span>Metabolismo basal (BMR)</span>
                    <span className="font-semibold text-[var(--text-primary)]">{targets.bmr} kcal</span>
                  </div>
                  <div className="flex items-center justify-between text-[12.5px] text-[var(--text-primary)]/50 bg-[var(--bg-elevated)] rounded-2xl px-4 py-3 -mt-3">
                    <span>Gasto total diario (TDEE)</span>
                    <span className="font-semibold text-[var(--text-primary)]">{targets.tdee} kcal</span>
                  </div>

                  <div className="flex gap-2.5 bg-[var(--bg-elevated)] rounded-2xl p-4">
                    <Info className="w-4 h-4 text-[var(--text-primary)]/35 flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <p className="text-[11.5px] text-[var(--text-primary)]/40 leading-relaxed">
                      Estimaciones basadas en la ecuación de Mifflin-St Jeor y estándares de nutrición deportiva (ISSN).
                      El IMC no distingue masa muscular de grasa corporal — úsalo solo como referencia general, no como
                      diagnóstico. Esto no sustituye el consejo de un profesional de la salud.
                    </p>
                  </div>
                </div>
              )
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
