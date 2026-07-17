// Fórmulas y rangos de referencia estándar en nutrición deportiva/clínica:
// - BMR: ecuación de Mifflin-St Jeor (Academy of Nutrition and Dietetics, la más precisa
//   para adultos sanos según la revisión sistemática de Frankenfield et al. 2005).
// - TDEE: multiplicadores de actividad estándar (convención de la industria, no una
//   guía clínica única).
// - IMC: cortes de la OMS.
// - Proteína: ISSN Position Stand (Jäger et al. 2017) — rangos por objetivo.
// - Grasas/carbohidratos: AMDR del Institute of Medicine (EE. UU.).
//
// Estos son valores de referencia para bienestar general, no sustituyen consejo médico
// individualizado.

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type FitnessGoal = 'lose' | 'maintain' | 'gain';

export interface FitnessProfile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
}

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario (poco o nada de ejercicio)',
  light: 'Ligero (ejercicio 1-3 días/semana)',
  moderate: 'Moderado (ejercicio 3-5 días/semana)',
  active: 'Activo (ejercicio intenso 6-7 días/semana)',
  very_active: 'Muy activo (entrenamiento diario intenso o 2x/día)',
};

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  lose: 'Perder grasa',
  maintain: 'Mantener peso',
  gain: 'Ganar músculo',
};

// g de proteína por kg de peso corporal, según objetivo (dentro de los rangos ISSN).
const PROTEIN_G_PER_KG: Record<FitnessGoal, number> = {
  lose: 2.4,   // 2.3-3.1 g/kg: preserva músculo en déficit calórico
  maintain: 1.6, // 1.4-2.0 g/kg: rango general de fitness
  gain: 1.8,   // 1.4-2.0 g/kg: construcción muscular
};

// Ajuste calórico respecto al TDEE, según objetivo (déficit/superávit moderados y sostenibles).
const CALORIE_ADJUSTMENT: Record<FitnessGoal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

const FAT_PERCENT_OF_CALORIES = 0.27; // dentro del AMDR de 20-35%

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export interface BMICategory {
  label: string;
  colorVar: string;
}

export function classifyBMI(bmi: number): BMICategory {
  if (bmi < 18.5) return { label: 'Bajo peso', colorVar: 'var(--warning-fg)' };
  if (bmi < 25) return { label: 'Peso saludable', colorVar: '#248a3d' };
  if (bmi < 30) return { label: 'Sobrepeso', colorVar: 'var(--warning-fg)' };
  if (bmi < 35) return { label: 'Obesidad (clase I)', colorVar: 'var(--danger-fg)' };
  if (bmi < 40) return { label: 'Obesidad (clase II)', colorVar: 'var(--danger-fg)' };
  return { label: 'Obesidad (clase III)', colorVar: 'var(--danger-fg)' };
}

export function calculateBMR(profile: Pick<FitnessProfile, 'sex' | 'weightKg' | 'heightCm' | 'age'>): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === 'male' ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export interface FitnessTargets {
  bmi: number;
  bmiCategory: BMICategory;
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export function calculateFitnessTargets(profile: FitnessProfile): FitnessTargets {
  const bmi = calculateBMI(profile.weightKg, profile.heightCm);
  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const targetCalories = Math.max(1200, Math.round(tdee + CALORIE_ADJUSTMENT[profile.goal]));

  const proteinG = Math.round(PROTEIN_G_PER_KG[profile.goal] * profile.weightKg);
  const proteinKcal = proteinG * 4;
  const fatKcal = targetCalories * FAT_PERCENT_OF_CALORIES;
  const fatG = Math.round(fatKcal / 9);
  const carbsKcal = Math.max(0, targetCalories - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory: classifyBMI(bmi),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories,
    proteinG,
    fatG,
    carbsG,
  };
}
