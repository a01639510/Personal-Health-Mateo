import React from 'react';
import MacroRing from './MacroRing';

interface NutritionRingsProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  estimated?: boolean;
}

export default function NutritionRings({ calories, protein, carbs, fat, estimated }: NutritionRingsProps) {
  if (!calories || calories <= 0) return null;

  const macros = [
    { label: 'Proteína', value: protein, max: 50, color: 'var(--ring-protein)' },
    { label: 'Carbos', value: carbs, max: 100, color: 'var(--ring-carbs)' },
    { label: 'Grasas', value: fat, max: 40, color: 'var(--ring-fat)' },
  ];

  return (
    <div className="mt-5 bg-[var(--bg-surface)] rounded-[28px] p-6">
      <div className="flex items-center justify-center mb-6">
        <MacroRing value={calories} max={800} size={126} strokeWidth={10} color="var(--ring-calories)" delay={0.1}>
          <div className="text-center">
            <div className="text-[26px] font-extrabold text-[var(--text-primary)] leading-none tracking-tight">{calories}</div>
            <div className="text-[11px] text-[var(--text-primary)]/40 font-semibold mt-1">kcal</div>
          </div>
        </MacroRing>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {macros.map((m, idx) => (
          <div key={m.label} className="flex flex-col items-center gap-2">
            <MacroRing value={m.value} max={m.max} size={56} strokeWidth={5} color={m.color} delay={0.45 + idx * 0.12}>
              <span className="text-[12px] font-bold text-[var(--text-primary)]">{m.value}g</span>
            </MacroRing>
            <span className="text-[11px] text-[var(--text-primary)]/40 font-medium">{m.label}</span>
          </div>
        ))}
      </div>

      {estimated && (
        <p className="text-center text-[10.5px] text-[var(--text-primary)]/35 font-medium mt-4">
          Estimado a partir de ingredientes — puede variar del valor real
        </p>
      )}
    </div>
  );
}
