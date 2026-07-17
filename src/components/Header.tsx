import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, History, Smartphone, Camera } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  activeTab: 'scan' | 'favorites' | 'history';
  setActiveTab: (tab: 'scan' | 'favorites' | 'history') => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Safari on iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      // Guide iOS user
      alert('Para instalar ChefRefri en tu iPhone:\n\n1. Toca el botón "Compartir" (Share) en la barra inferior de Safari.\n2. Desplázate hacia abajo y selecciona "Agregar a inicio" (Add to Home Screen).\n3. Toca "Agregar" arriba a la derecha.');
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('scan')}>
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shadow-emerald-500/20">
              C
            </div>
            <div>
              <h1 className="font-display font-bold text-lg tracking-tight text-slate-800 flex items-center gap-1.5">
                ChefScan <span className="text-emerald-500 font-semibold text-xs bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">MVP</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-mono hidden sm:block uppercase tracking-wider">Fase 1 • Escaneo de Refri</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('scan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'scan'
                  ? 'bg-white text-emerald-600 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Escáner</span>
            </button>

            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'favorites'
                  ? 'bg-white text-emerald-600 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Guardadas</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-emerald-600 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial</span>
            </button>
          </nav>

          {/* Install PWA Button */}
          {isInstallable ? (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={handleInstallClick}
              className="hidden md:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Instalar App</span>
            </motion.button>
          ) : (
            <div className="hidden md:block w-8 h-8 rounded-full bg-slate-100 border border-slate-200"></div>
          )}
        </div>
      </div>
    </header>
  );
}
