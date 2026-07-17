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
  usedIngredients: { name: string; amount?: number; unit?: string }[];
  missedIngredients: { name: string; amount?: number; unit?: string }[];
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
