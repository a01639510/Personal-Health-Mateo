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

// Lista verificada directamente contra los valores reales en la tabla `recipes`
// (no todos coinciden con los nombres "oficiales" de TheMealDB, ej. "France" en vez de "French").
const AREA_ES: Record<string, string> = {
  Algerian: 'Argelina',
  Argentina: 'Argentina',
  Australian: 'Australiana',
  British: 'Británica',
  Canadian: 'Canadiense',
  Chinese: 'China',
  Croatian: 'Croata',
  Egyptian: 'Egipcia',
  Filipino: 'Filipina',
  France: 'Francesa',
  Greek: 'Griega',
  India: 'India',
  Irish: 'Irlandesa',
  Italian: 'Italiana',
  Jamaican: 'Jamaiquina',
  Japanese: 'Japonesa',
  Kenyan: 'Keniana',
  Malaysian: 'Malasia',
  Mexican: 'Mexicana',
  Moroccan: 'Marroquí',
  Netherlands: 'Holandesa',
  Norway: 'Noruega',
  Polish: 'Polaca',
  Portuguese: 'Portuguesa',
  Russian: 'Rusa',
  'Saudi Arabian': 'Saudí',
  Slovakia: 'Eslovaca',
  Spanish: 'Española',
  Syrian: 'Siria',
  Thai: 'Tailandesa',
  Tunisian: 'Tunecina',
  Turkish: 'Turca',
  Ukrainian: 'Ucraniana',
  'United States': 'Estadounidense',
  Uruguayan: 'Uruguaya',
  Venezuela: 'Venezolana',
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
