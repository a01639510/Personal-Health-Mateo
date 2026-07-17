import React from 'react';
import { Camera, Heart, History } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomTabBarProps {
  activeTab: 'scan' | 'favorites' | 'history';
  setActiveTab: (tab: 'scan' | 'favorites' | 'history') => void;
}

const tabs = [
  { id: 'scan' as const, label: 'Escanear', icon: Camera },
  { id: 'favorites' as const, label: 'Guardadas', icon: Heart },
  { id: 'history' as const, label: 'Historial', icon: History },
];

export default function BottomTabBar({ activeTab, setActiveTab }: BottomTabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-t border-black/[0.06] pb-safe">
      <div className="max-w-[430px] mx-auto flex items-stretch justify-around h-[58px] px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute top-1.5 w-1 h-1 rounded-full bg-black"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className="w-[22px] h-[22px] transition-colors"
                strokeWidth={isActive ? 2.25 : 1.75}
                color={isActive ? '#0a0a0a' : '#a1a1a6'}
                fill={isActive && tab.id === 'favorites' ? '#0a0a0a' : 'none'}
              />
              <span
                className={`text-[10px] leading-none transition-colors ${
                  isActive ? 'text-black font-semibold' : 'text-[#a1a1a6] font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
