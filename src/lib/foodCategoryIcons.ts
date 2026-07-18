// Símbolos y traducciones para las categorías de alimentos de la referencia USDA
// (FoodData Central "SR Legacy"). Es un conjunto fijo y conocido de ~25 categorías,
// pero cualquier valor no reconocido cae a un ícono/etiqueta genéricos sin romper la UI.

const FOOD_CATEGORY_ICONS: Record<string, string> = {
  'Dairy and Egg Products': '🥚',
  'Spices and Herbs': '🌿',
  'Baby Foods': '🍼',
  'Fats and Oils': '🫒',
  'Poultry Products': '🍗',
  'Soups, Sauces, and Gravies': '🥣',
  'Sausages and Luncheon Meats': '🌭',
  'Breakfast Cereals': '🥞',
  'Fruits and Fruit Juices': '🍎',
  'Pork Products': '🥓',
  'Vegetables and Vegetable Products': '🥦',
  'Nut and Seed Products': '🥜',
  'Beef Products': '🥩',
  'Beverages': '🥤',
  'Finfish and Shellfish Products': '🐟',
  'Legumes and Legume Products': '🫘',
  'Lamb, Veal, and Game Products': '🍖',
  'Baked Products': '🍞',
  'Sweets': '🍬',
  'Cereal Grains and Pasta': '🍝',
  'Fast Foods': '🍔',
  'Meals, Entrees, and Side Dishes': '🍱',
  'Snacks': '🍿',
  'American Indian/Alaska Native Foods': '🌽',
  'Restaurant Foods': '🍽️',
};

const FOOD_CATEGORY_ES: Record<string, string> = {
  'Dairy and Egg Products': 'Lácteos y huevo',
  'Spices and Herbs': 'Especias y hierbas',
  'Baby Foods': 'Alimentos para bebé',
  'Fats and Oils': 'Grasas y aceites',
  'Poultry Products': 'Aves',
  'Soups, Sauces, and Gravies': 'Sopas y salsas',
  'Sausages and Luncheon Meats': 'Embutidos',
  'Breakfast Cereals': 'Cereales de desayuno',
  'Fruits and Fruit Juices': 'Frutas y jugos',
  'Pork Products': 'Cerdo',
  'Vegetables and Vegetable Products': 'Verduras',
  'Nut and Seed Products': 'Nueces y semillas',
  'Beef Products': 'Res',
  'Beverages': 'Bebidas',
  'Finfish and Shellfish Products': 'Pescados y mariscos',
  'Legumes and Legume Products': 'Legumbres',
  'Lamb, Veal, and Game Products': 'Cordero y caza',
  'Baked Products': 'Panadería',
  'Sweets': 'Dulces',
  'Cereal Grains and Pasta': 'Cereales y pasta',
  'Fast Foods': 'Comida rápida',
  'Meals, Entrees, and Side Dishes': 'Platillos preparados',
  'Snacks': 'Botanas',
  'American Indian/Alaska Native Foods': 'Comida indígena americana',
  'Restaurant Foods': 'Comida de restaurante',
};

// Categorías cuya unidad natural de captura es volumen (ml/L) en vez de peso (g).
const LIQUID_CATEGORIES = new Set(['Beverages']);

export function getCategoryIcon(category: string | null | undefined): string {
  if (!category) return '🍽️';
  return FOOD_CATEGORY_ICONS[category] || '🍽️';
}

export function translateFoodCategory(category: string, language: 'es' | 'en'): string {
  if (language !== 'es') return category;
  return FOOD_CATEGORY_ES[category] || category;
}

export function isLiquidCategory(category: string | null | undefined): boolean {
  return !!category && LIQUID_CATEGORIES.has(category);
}
