import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  title: string;
  onTitleTap?: () => void;
}

export default function Header({ title, onTitleTap }: HeaderProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

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
      setShowIOSHint(true);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl pt-safe">
      <div className="max-w-[430px] mx-auto px-5 h-[52px] flex items-center justify-between">
        <button onClick={onTitleTap} className="text-[19px] font-bold tracking-tight text-black cursor-pointer">
          {title}
        </button>

        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-black/[0.04] active:bg-black/[0.08] transition-colors cursor-pointer"
            title="Instalar app"
          >
            <Download className="w-[15px] h-[15px] text-black/70" strokeWidth={2} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showIOSHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setShowIOSHint(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-[430px] bg-white rounded-t-[28px] p-6 pb-safe space-y-3 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-9 h-1 bg-black/10 rounded-full mx-auto mb-1" />
              <h3 className="text-[17px] font-bold text-black">Instalar ChefRefri</h3>
              <p className="text-[13px] text-black/50 leading-relaxed px-2">
                Toca el botón <strong className="text-black/70">Compartir</strong> en la barra de Safari, luego
                selecciona <strong className="text-black/70">"Agregar a inicio"</strong>.
              </p>
              <button
                onClick={() => setShowIOSHint(false)}
                className="w-full bg-black text-white font-semibold text-[15px] py-3.5 rounded-2xl mt-2 cursor-pointer active:scale-[0.98] transition-transform"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
