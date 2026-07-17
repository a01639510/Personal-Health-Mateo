import React from 'react';
import { motion } from 'motion/react';

interface MacroRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  delay?: number;
  children?: React.ReactNode;
}

export default function MacroRing({
  value,
  max,
  size = 64,
  strokeWidth = 6,
  color,
  trackColor = 'var(--ring-track)',
  delay = 0,
  children,
}: MacroRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
        />
      </svg>
      {children && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: delay + 0.3 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
