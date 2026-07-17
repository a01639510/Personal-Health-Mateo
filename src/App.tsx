import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomTabBar, { AppTab } from './components/BottomTabBar';
import ScanPantry from './components/ScanPantry';
import RecipeList from './components/RecipeList';
import RecipeDetails from './components/RecipeDetails';
import FavoritesList from './components/FavoritesList';
import ScanHistory from './components/ScanHistory';
import Cookbook from './components/Cookbook';
import CookbookDetail from './components/CookbookDetail';
import PantryInventory from './components/PantryInventory';
import BarcodeScanner from './components/BarcodeScanner';
import PreferencesSheet from './components/PreferencesSheet';
import FitnessProfileSheet from './components/FitnessProfileSheet';
import NutritionTracking from './components/NutritionTracking';
import { SpoonacularRecipeSummary } from './types';
import { motion, AnimatePresence } from 'motion/react';

const TAB_TITLES: Record<AppTab, string> = {
  scan: 'Escanear',
  favorites: 'Guardadas',
  history: 'Historial',
  cookbook: 'Recetario',
  nutrition: 'Nutrición',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('scan');
  const [viewState, setViewState] = useState<'scan' | 'recipe-list' | 'recipe-details' | 'cookbook-details'>('scan');
  const [selectedCookbookId, setSelectedCookbookId] = useState<string | null>(null);
  const [scanSubView, setScanSubView] = useState<'scan' | 'inventory' | 'barcode-scanner'>('scan');
  const [showPreferences, setShowPreferences] = useState(false);
  const [showFitnessProfile, setShowFitnessProfile] = useState(false);

  // Scanned / Loaded ingredients state
  const [scannedIngredients, setScannedIngredients] = useState<string[]>([]);

  // Spoonacular recipes search results state
  const [recipes, setRecipes] = useState<SpoonacularRecipeSummary[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [recipesError, setRecipesError] = useState<{ message: string; details?: string } | null>(null);

  // Active details view
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [detailSource, setDetailSource] = useState<'recipes' | 'favorites'>('recipes');

  // Sync saved recipe IDs
  const [savedSpoonacularIds, setSavedSpoonacularIds] = useState<number[]>([]);
  const [refreshFavsTrigger, setRefreshFavsTrigger] = useState(0);

  // Register PWA service worker in production
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('Service Worker registrado con éxito:', reg.scope))
          .catch((err) => console.error('Error al registrar Service Worker:', err));
      });
    }
  }, []);

  // Deep link: si la URL trae ?receta=<id>, abre esa receta del Recetario directamente.
  useEffect(() => {
    const recetaId = new URLSearchParams(window.location.search).get('receta');
    if (recetaId) {
      setActiveTab('cookbook');
      setSelectedCookbookId(recetaId);
      setViewState('cookbook-details');
    }
  }, []);

  // Fetch saved recipes to keep list of saved IDs in sync
  useEffect(() => {
    fetchSavedIds();
  }, [refreshFavsTrigger]);

  const fetchSavedIds = async () => {
    try {
      const res = await fetch('/api/saved-recipes');
      if (res.ok) {
        const data = await res.json();
        const ids = (data.savedRecipes || []).map((r: any) => Number(r.spoonacular_id));
        setSavedSpoonacularIds(ids);
      }
    } catch (err) {
      console.error('Error al sincronizar recetas favoritas:', err);
    }
  };

  // Search recipes handler
  const handleSearchRecipes = async (ingredientsList: string[]) => {
    setViewState('recipe-list');
    setLoadingRecipes(true);
    setRecipesError(null);
    setScannedIngredients(ingredientsList);

    try {
      const res = await fetch('/api/find-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: ingredientsList }),
      });

      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 402) {
          throw new Error('Límite de API Spoonacular alcanzado: ' + (errData.message || 'Has excedido las peticiones gratuitas.'));
        }
        throw new Error(errData.message || errData.error || 'Fallo al buscar recetas');
      }

      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (err: any) {
      console.error(err);
      setRecipesError({
        message: 'Error al buscar recetas en Spoonacular',
        details: err.message || 'Prueba de nuevo más tarde o revisa tus claves de API.'
      });
    } finally {
      setLoadingRecipes(false);
    }
  };

  // Select recipe detail handler
  const handleSelectRecipe = (id: number, source: 'recipes' | 'favorites') => {
    setSelectedRecipeId(id);
    setDetailSource(source);
    setViewState('recipe-details');
  };

  // Action to load historical scan back into scan tab
  const handleLoadIngredientsFromHistory = (ingredientsList: string[]) => {
    setScannedIngredients(ingredientsList);
    setActiveTab('scan');
    setViewState('scan');
    // We automatically trigger a search with those ingredients
    handleSearchRecipes(ingredientsList);
  };

  const handleBack = () => {
    if (viewState === 'recipe-details') {
      if (detailSource === 'favorites') {
        setActiveTab('favorites');
        setViewState('scan');
      } else {
        setViewState('recipe-list');
      }
    } else if (viewState === 'recipe-list') {
      setViewState('scan');
    } else if (viewState === 'cookbook-details') {
      setViewState('scan');
      setSelectedCookbookId(null);
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  const handleSelectCookbookRecipe = (id: string) => {
    setSelectedCookbookId(id);
    setViewState('cookbook-details');
    window.history.pushState({}, '', `?receta=${id}`);
  };

  const handleSaveSuccess = () => {
    setRefreshFavsTrigger(prev => prev + 1);
  };

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    setViewState('scan'); // Reset inner view to root of the tab
    setScanSubView('scan');
  };

  const showGlobalHeader = viewState !== 'recipe-details' && viewState !== 'cookbook-details' && scanSubView !== 'barcode-scanner';
  const headerTitle = viewState === 'recipe-list' ? 'Recetas' : TAB_TITLES[activeTab];

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
      <div className="max-w-[430px] mx-auto min-h-screen flex flex-col relative">
        {showGlobalHeader && (
          <Header
            title={headerTitle}
            onTitleTap={() => handleTabChange('scan')}
            onOpenPreferences={() => setShowPreferences(true)}
            onOpenFitnessProfile={() => setShowFitnessProfile(true)}
          />
        )}

        <PreferencesSheet open={showPreferences} onClose={() => setShowPreferences(false)} />
        <FitnessProfileSheet open={showFitnessProfile} onClose={() => setShowFitnessProfile(false)} />

        {/* Main Content Area */}
        <main className="flex-grow w-full px-4 pb-tabbar">
          <AnimatePresence mode="wait">
            {activeTab === 'scan' && (
              <motion.div
                key="scan-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {viewState === 'scan' && scanSubView === 'scan' && (
                  <ScanPantry onSearchRecipes={handleSearchRecipes} onOpenInventory={() => setScanSubView('inventory')} />
                )}

                {viewState === 'scan' && scanSubView === 'inventory' && (
                  <PantryInventory onOpenScanner={() => setScanSubView('barcode-scanner')} />
                )}

                {viewState === 'scan' && scanSubView === 'barcode-scanner' && (
                  <BarcodeScanner
                    onBack={() => setScanSubView('inventory')}
                    onDone={() => setScanSubView('inventory')}
                  />
                )}

                {viewState === 'recipe-list' && (
                  <RecipeList
                    recipes={recipes}
                    onSelectRecipe={(id) => handleSelectRecipe(id, 'recipes')}
                    onBackToScan={handleBack}
                    loading={loadingRecipes}
                    error={recipesError}
                  />
                )}

                {viewState === 'recipe-details' && selectedRecipeId !== null && (
                  <RecipeDetails
                    recipeId={selectedRecipeId}
                    onBack={handleBack}
                    onSaveSuccess={handleSaveSuccess}
                    savedSpoonacularIds={savedSpoonacularIds}
                  />
                )}
              </motion.div>
            )}

            {activeTab === 'favorites' && (
              <motion.div
                key="favorites-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {viewState === 'scan' ? (
                  <FavoritesList
                    onSelectSavedRecipe={(id) => handleSelectRecipe(id, 'favorites')}
                    onRefreshTrigger={refreshFavsTrigger}
                  />
                ) : (
                  viewState === 'recipe-details' && selectedRecipeId !== null && (
                    <RecipeDetails
                      recipeId={selectedRecipeId}
                      onBack={handleBack}
                      onSaveSuccess={handleSaveSuccess}
                      savedSpoonacularIds={savedSpoonacularIds}
                    />
                  )
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ScanHistory onLoadIngredients={handleLoadIngredientsFromHistory} />
              </motion.div>
            )}

            {activeTab === 'cookbook' && (
              <motion.div
                key="cookbook-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {viewState === 'scan' && (
                  <Cookbook onSelectRecipe={handleSelectCookbookRecipe} />
                )}

                {viewState === 'cookbook-details' && selectedCookbookId !== null && (
                  <CookbookDetail recipeId={selectedCookbookId} onBack={handleBack} />
                )}
              </motion.div>
            )}

            {activeTab === 'nutrition' && (
              <motion.div
                key="nutrition-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <NutritionTracking onOpenFitnessProfile={() => setShowFitnessProfile(true)} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <BottomTabBar activeTab={activeTab} setActiveTab={handleTabChange} />
      </div>
    </div>
  );
}
