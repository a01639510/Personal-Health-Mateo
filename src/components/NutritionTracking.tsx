import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, AlertCircle, Dumbbell, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FoodLogEntry, DailyNutritionTotals } from '../types';
import { useFitnessProfile } from '../lib/fitnessProfileStore';
import { calculateFitnessTargets } from '../lib/fitnessCalculator';
import MacroRing from './MacroRing';
import Skeleton from './Skeleton';
import LogFoodSheet from './LogFoodSheet';

interface NutritionTrackingProps {
  onOpenFitnessProfile: () => void;
}

const WEEKDAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function NutritionTracking({ onOpenFitnessProfile }: NutritionTrackingProps) {
  const profile = useFitnessProfile();
  const targets = profile ? calculateFitnessTargets(profile) : null;

  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [trends, setTrends] = useState<DailyNutritionTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; details?: string; isSchemaMissing?: boolean } | null>(null);
  const [showLogSheet, setShowLogSheet] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [entriesRes, trendsRes] = await Promise.all([
        fetch('/api/food-log'),
        fetch('/api/food-log/trends?days=7'),
      ]);

      if (!entriesRes.ok) {
        const errData = await entriesRes.json();
        const err: any = new Error(errData.message || 'Error al cargar el registro');
        err.isSchemaMissing = errData.isSchemaMissing;
        throw err;
      }
      const entriesData = await entriesRes.json();
      setEntries(entriesData.entries || []);

      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        setTrends(trendsData.trends || []);
      }
    } catch (err: any) {
      setError({
        message: err.isSchemaMissing ? 'Falta configurar la base de datos' : 'No pudimos cargar tu nutrición',
        details: err.message || 'Verifica la conexión con Supabase.',
        isSchemaMissing: err.isSchemaMissing,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await fetch(`/api/food-log/${id}`, { method: 'DELETE' });
      loadData();
    } catch {
      loadData();
    }
  };

  const consumed = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + Number(e.calories),
      protein_g: acc.protein_g + Number(e.protein_g),
      carbs_g: acc.carbs_g + Number(e.carbs_g),
      fat_g: acc.fat_g + Number(e.fat_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const calorieTarget = targets?.targetCalories ?? 2000;
  const remaining = calorieTarget - consumed.calories;
  const maxTrend = Math.max(calorieTarget, ...trends.map((t) => t.calories), 1);

  if (loading) {
    return (
      <div className="pt-2 space-y-4">
        <Skeleton className="h-64 w-full rounded-[28px]" />
        <Skeleton className="h-40 w-full rounded-[28px]" />
      </div>
    );
  }

  if (error?.isSchemaMissing) {
    return (
      <div className="pt-10 text-center space-y-4">
        <div className="bg-[var(--warning-bg)] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
          <AlertCircle className="w-7 h-7 text-[var(--warning-fg)]" strokeWidth={1.75} />
        </div>
        <h3 className="text-[16px] font-bold text-[var(--text-primary)]">Falta configurar la base de datos</h3>
        <p className="text-[13px] text-[var(--text-primary)]/40 leading-relaxed px-6">
          La tabla "food_log" todavía no existe en Supabase.
        </p>
        <button onClick={loadData} className="bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer">
          Reintentar
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-10 text-center space-y-4">
        <div className="bg-[var(--danger-bg)] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
          <AlertCircle className="w-7 h-7 text-[#ff3b30]" strokeWidth={1.75} />
        </div>
        <h3 className="text-[16px] font-bold text-[var(--text-primary)]">{error.message}</h3>
        {error.details && <p className="text-[13px] text-[var(--text-primary)]/40 leading-relaxed px-6">{error.details}</p>}
        <button onClick={loadData} className="bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="pt-2 pb-2 space-y-5">
      <div className="px-0.5">
        <h2 className="text-[19px] font-bold text-[var(--text-primary)]">Nutrición</h2>
        <p className="text-[12px] text-[var(--text-primary)]/40">Hoy · {entries.length} alimentos registrados</p>
      </div>

      {!profile && (
        <button
          onClick={onOpenFitnessProfile}
          className="w-full flex items-center gap-3 bg-[var(--bg-surface)] rounded-[24px] p-4 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-5 h-5 text-[var(--text-primary)]/60" strokeWidth={1.75} />
          </div>
          <div className="text-left">
            <p className="text-[13px] font-bold text-[var(--text-primary)]">Configura tu Perfil Fitness</p>
            <p className="text-[11.5px] text-[var(--text-primary)]/40">Para ver tus metas personalizadas de calorías y macros</p>
          </div>
        </button>
      )}

      <div className="bg-[var(--bg-surface)] rounded-[28px] p-6">
        <div className="flex items-center justify-center mb-4">
          <MacroRing value={Math.min(consumed.calories, calorieTarget)} max={calorieTarget} size={126} strokeWidth={10} color="var(--ring-calories)" delay={0.1}>
            <div className="text-center">
              <div className="text-[24px] font-extrabold text-[var(--text-primary)] leading-none tracking-tight">{Math.round(consumed.calories)}</div>
              <div className="text-[11px] text-[var(--text-primary)]/40 font-semibold mt-1">de {calorieTarget} kcal</div>
            </div>
          </MacroRing>
        </div>
        <p className="text-center text-[12.5px] font-semibold mb-5" style={{ color: remaining >= 0 ? '#248a3d' : 'var(--danger-fg)' }}>
          {remaining >= 0 ? `Te faltan ${Math.round(remaining)} kcal` : `Superaste tu meta por ${Math.round(-remaining)} kcal`}
        </p>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-2">
            <MacroRing value={consumed.protein_g} max={targets?.proteinG ?? 150} size={56} strokeWidth={5} color="var(--ring-protein)" delay={0.45}>
              <span className="text-[12px] font-bold text-[var(--text-primary)]">{Math.round(consumed.protein_g)}g</span>
            </MacroRing>
            <span className="text-[11px] text-[var(--text-primary)]/40 font-medium">Proteína</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <MacroRing value={consumed.carbs_g} max={targets?.carbsG ?? 250} size={56} strokeWidth={5} color="var(--ring-carbs)" delay={0.57}>
              <span className="text-[12px] font-bold text-[var(--text-primary)]">{Math.round(consumed.carbs_g)}g</span>
            </MacroRing>
            <span className="text-[11px] text-[var(--text-primary)]/40 font-medium">Carbos</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <MacroRing value={consumed.fat_g} max={targets?.fatG ?? 90} size={56} strokeWidth={5} color="var(--ring-fat)" delay={0.69}>
              <span className="text-[12px] font-bold text-[var(--text-primary)]">{Math.round(consumed.fat_g)}g</span>
            </MacroRing>
            <span className="text-[11px] text-[var(--text-primary)]/40 font-medium">Grasas</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowLogSheet(true)}
        className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold py-4 rounded-full text-[15px] cursor-pointer active:scale-[0.98] transition-transform"
      >
        <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
        <span>Registrar alimento</span>
      </button>

      <div>
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-2.5 px-0.5">Tendencia · últimos 7 días</h3>
        <div className="bg-[var(--bg-surface)] rounded-[24px] p-4">
          <div className="flex items-end justify-between gap-2 h-28">
            {trends.map((day) => {
              const heightPct = Math.max(2, (day.calories / maxTrend) * 100);
              const isToday = day.date === new Date().toISOString().slice(0, 10);
              const weekday = WEEKDAY_LABELS[new Date(`${day.date}T12:00:00`).getDay()];
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex-grow flex items-end">
                    <div
                      className="w-full rounded-full transition-all"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: isToday ? 'var(--accent)' : 'var(--ring-track)',
                      }}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold ${isToday ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]/35'}`}>
                    {weekday}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] mb-2.5 px-0.5">Registrado hoy</h3>
        {entries.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-[24px] p-6 text-center">
            <Utensils className="w-6 h-6 text-[var(--text-primary)]/25 mx-auto mb-2" strokeWidth={1.75} />
            <p className="text-[12.5px] text-[var(--text-primary)]/35">Nada registrado todavía hoy.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence>
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="flex items-center gap-3 bg-[var(--bg-surface)] rounded-[20px] p-3.5"
                >
                  <div className="flex-grow min-w-0">
                    <p className="text-[13px] font-bold text-[var(--text-primary)] capitalize line-clamp-1">{entry.name}</p>
                    <p className="text-[11px] text-[var(--text-primary)]/40 mt-0.5">
                      {Math.round(entry.calories)} kcal · P{Math.round(entry.protein_g)}g · C{Math.round(entry.carbs_g)}g · G{Math.round(entry.fat_g)}g
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-90 transition-transform"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[var(--text-primary)]/40" strokeWidth={1.75} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <LogFoodSheet open={showLogSheet} onClose={() => setShowLogSheet(false)} onLogged={loadData} />
    </div>
  );
}
