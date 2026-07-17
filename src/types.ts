export interface DetectedItem {
  name: string;
  category: string;
  confidence: 'alta' | 'media' | 'baja';
}

export interface PantryScan {
  id: string;
  photo_url: string;
  detected_items: DetectedItem[];
  created_at: string;
}

export interface SavedRecipe {
  id: string;
  spoonacular_id: number;
  title: string;
  image_url: string;
  nutrition: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
  ingredients: {
    name: string;
    amount: number;
    unit: string;
  }[];
  saved_at: string;
}

export interface SpoonacularRecipeSummary {
  id: number;
  title: string;
  image: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
  missedIngredientCountSecondary: number;
  usedIngredients: { name: string; amount?: number; unit?: string; isSecondary?: boolean }[];
  missedIngredients: { name: string; amount?: number; unit?: string; isSecondary?: boolean }[];
}

export interface CookbookRecipe {
  id: string;
  external_id: string;
  title: string;
  title_es?: string | null;
  image_url: string;
  category: string;
  area: string;
  tags: string[];
}

export interface CookbookRecipeDetail extends CookbookRecipe {
  ingredients: { name: string; measure: string }[];
  ingredients_es?: { name: string; measure: string }[] | null;
  instructions: string;
  instructions_es?: string | null;
  video_url: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  nutrition_is_estimated?: boolean;
}

export interface RecipeDetail {
  id: number;
  title: string;
  image: string;
  summary: string;
  readyInMinutes: number;
  servings: number;
  extendedIngredients: {
    name: string;
    original: string;
    amount: number;
    unit: string;
  }[];
  analyzedInstructions: {
    name: string;
    steps: {
      number: number;
      step: string;
    }[];
  }[];
  nutrition?: {
    nutrients: {
      name: string;
      amount: number;
      unit: string;
    }[];
  };
}

export interface FoodLogEntry {
  id: string;
  source: 'cookbook' | 'ai_recipe' | 'manual';
  source_id: string | null;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
}

export interface UsdaFoodSearchResult {
  fdc_id: number;
  description: string;
  kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
}

export interface DailyNutritionTotals {
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
