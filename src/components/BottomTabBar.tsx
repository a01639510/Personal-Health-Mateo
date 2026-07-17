import React from 'react';
import { Camera, Heart, History } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomTabBarProps {
  activeTab: 'scan' | 'favorites' | 'history';
  setActiveTab: (tab: 'scan' | 'favorites' | 'history') => void;
}

const SIDE_TABS = [
  { id: 'history' as const, label: 'Historial', icon: History },
  { id: 'favorites' as const, label: 'Guardadas', icon: Heart },
];

export default function BottomTabBar({ activeTab, setActiveTab }: BottomTabBarProps) {
  const isScanActive = activeTab === 'scan';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="max-w-[430px] mx-auto relative">
        <div className="absolute inset-x-0 bottom-0 h-[58px] bg-[var(--bg-app-translucent)] backdrop-blur-xl border-t border-[var(--border-subtle)]" />

        <div className="relative flex items-stretch justify-between h-[58px] px-2">
          {/* Left tab */}
          <TabButton tab={SIDE_TABS[0]} isActive={activeTab === SIDE_TABS[0].id} onSelect={setActiveTab} />

          {/* Center FAB spacer */}
          <div className="w-[76px] flex-shrink-0" />

          {/* Right tab */}
          <TabButton tab={SIDE_TABS[1]} isActive={activeTab === SIDE_TABS[1].id} onSelect={setActiveTab} />
        </div>

        {/* Elevated center Scan FAB */}
        <button
          onClick={() => setActiveTab('scan')}
          className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center gap-1 cursor-pointer"
        >
          <motion.div
            whileTap={{ scale: 0.92 }}
            animate={{ scale: isScanActive ? 1.04 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.25)] ring-4 ring-[var(--bg-app)] bg-[var(--accent)]"
          >
            <Camera className="w-6 h-6 text-[var(--accent-foreground)]" strokeWidth={2} />
          </motion.div>
          <span className={`text-[10px] leading-none ${isScanActive ? 'text-[var(--text-primary)] font-semibold' : 'text-[#a1a1a6] font-medium'}`}>
            Escanear
          </span>
        </button>
      </div>
    </nav>
  );
}

function TabButton({
  tab,
  isActive,
  onSelect,
}: {
  tab: { id: 'favorites' | 'history'; label: string; icon: typeof Heart };
  isActive: boolean;
  onSelect: (tab: 'scan' | 'favorites' | 'history') => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={() => onSelect(tab.id)}
      className={`relative flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer ${
        isActive ? 'text-[var(--text-primary)]' : 'text-[#a1a1a6]'
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute top-1.5 w-1 h-1 rounded-full bg-[var(--text-primary)]"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
      <Icon
        className="w-[22px] h-[22px] transition-colors"
        strokeWidth={isActive ? 2.25 : 1.75}
        color="currentColor"
        fill={isActive && tab.id === 'favorites' ? 'currentColor' : 'none'}
      />
      <span
        className={`text-[10px] leading-none transition-colors ${
          isActive ? 'text-[var(--text-primary)] font-semibold' : 'text-[#a1a1a6] font-medium'
        }`}
      >
        {tab.label}
      </span>
    </button>
  );
}
