// Traducciones estáticas de las categorías y cocinas (áreas) fijas de TheMealDB.
// No requieren base de datos: son un conjunto pequeño y conocido de valores.

const CATEGORY_ES: Record<string, string> = {
  Beef: 'Res',
  Breakfast: 'Desayuno',
  Chicken: 'Pollo',
  Dessert: 'Postre',
  Goat: 'Cabra',
  Lamb: 'Cordero',
  Miscellaneous: 'Varios',
  Pasta: 'Pasta',
  Pork: 'Cerdo',
  Seafood: 'Mariscos',
  Side: 'Guarnición',
  Starter: 'Entrada',
  Vegan: 'Vegano',
  Vegetarian: 'Vegetariano',
};

const AREA_ES: Record<string, string> = {
  American: 'Estadounidense',
  British: 'Británica',
  Canadian: 'Canadiense',
  Chinese: 'China',
  Croatian: 'Croata',
  Dutch: 'Holandesa',
  Egyptian: 'Egipcia',
  Filipino: 'Filipina',
  French: 'Francesa',
  Greek: 'Griega',
  Indian: 'India',
  Irish: 'Irlandesa',
  Italian: 'Italiana',
  Jamaican: 'Jamaiquina',
  Japanese: 'Japonesa',
  Kenyan: 'Keniana',
  Malaysian: 'Malasia',
  Mexican: 'Mexicana',
  Moroccan: 'Marroquí',
  Polish: 'Polaca',
  Portuguese: 'Portuguesa',
  Russian: 'Rusa',
  Spanish: 'Española',
  Thai: 'Tailandesa',
  Tunisian: 'Tunecina',
  Turkish: 'Turca',
  Ukrainian: 'Ucraniana',
  Uruguayan: 'Uruguaya',
  Vietnamese: 'Vietnamita',
};

export function translateCategory(category: string, language: 'es' | 'en'): string {
  if (language !== 'es' || !category) return category;
  return CATEGORY_ES[category] || category;
}

export function translateArea(area: string, language: 'es' | 'en'): string {
  if (language !== 'es' || !area) return area;
  return AREA_ES[area] || area;
}
