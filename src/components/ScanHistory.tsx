import React, { useState, useEffect } from 'react';
import { History, ArrowUpRight, AlertCircle, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { PantryScan } from '../types';
import Skeleton from './Skeleton';

interface ScanHistoryProps {
  onLoadIngredients: (ingredients: string[]) => void;
}

export default function ScanHistory({ onLoadIngredients }: ScanHistoryProps) {
  const [scans, setScans] = useState<PantryScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; details?: string; isSchemaMissing?: boolean } | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scans');
      if (!res.ok) {
        const errData = await res.json();
        const err = new Error(errData.message || errData.error || 'Error al obtener historial');
        (err as any).isSchemaMissing = errData.isSchemaMissing;
        throw err;
      }
      const data = await res.json();
      setScans(data.scans || []);
    } catch (err: any) {
      console.error(err);
      setError({
        message: err.isSchemaMissing
          ? 'Falta configurar la base de datos'
          : 'No pudimos cargar el historial',
        details: err.message || 'Verifica la configuración de Supabase.',
        isSchemaMissing: err.isSchemaMissing
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 pt-2">
        <div className="px-0.5">
          <Skeleton className="h-6 w-24 rounded-md mb-2" />
          <Skeleton className="h-3 w-48 rounded-md" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-[24px] p-3">
              <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0" />
              <div className="flex-grow space-y-2">
                <Skeleton className="h-3.5 w-1/2 rounded-md" />
                <Skeleton className="h-3 w-3/4 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    if (error.isSchemaMissing) {
      return (
        <div className="pt-10 text-center space-y-5">
          <div className="bg-[var(--warning-bg)] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
            <AlertCircle className="w-7 h-7 text-[var(--warning-fg)]" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1.5">Tablas no creadas en Supabase</h3>
            <p className="text-[13px] text-[var(--text-primary)]/40 leading-relaxed px-4">
              La conexión con Supabase es correcta, pero falta crear la tabla <strong className="text-[var(--text-primary)]/60">"pantry_scans"</strong>.
            </p>
            <p className="text-[12px] text-[var(--text-primary)]/30 mt-2 px-6 leading-relaxed">
              Ve a la pestaña "Guardadas" para encontrar el script SQL de inicialización.
            </p>
          </div>
          <button
            onClick={fetchHistory}
            className="bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return (
      <div className="pt-10 text-center space-y-5">
        <div className="bg-[var(--danger-bg)] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
          <AlertCircle className="w-7 h-7 text-[#ff3b30]" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1.5">{error.message}</h3>
          {error.details && <p className="text-[13px] text-[var(--text-primary)]/40 leading-relaxed px-4">{error.details}</p>}
        </div>
        <button
          onClick={fetchHistory}
          className="bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="pt-10 text-center space-y-4">
        <div className="bg-[var(--bg-surface)] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
          <History className="w-7 h-7 text-[var(--text-primary)]/40" strokeWidth={1.75} />
        </div>
        <h3 className="text-[16px] font-bold text-[var(--text-primary)]">Historial vacío</h3>
        <p className="text-[13px] text-[var(--text-primary)]/40 leading-relaxed px-4">
          Escanea una foto en "Escanear" y tus registros aparecerán aquí automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="px-0.5">
        <h2 className="text-[19px] font-bold text-[var(--text-primary)]">Historial</h2>
        <p className="text-[12px] text-[var(--text-primary)]/40">Vuelve a usar ingredientes de escaneos anteriores</p>
      </div>

      <div className="space-y-3">
        {scans.map((scan, idx) => {
          const items = scan.detected_items || [];
          const dateStr = new Date(scan.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

          return (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.24) }}
              className="flex items-center gap-3 bg-[var(--bg-surface)] rounded-[24px] p-3"
            >
              {scan.photo_url ? (
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[var(--bg-elevated)] flex-shrink-0">
                  <img
                    src={scan.photo_url}
                    alt="Miniatura de escaneo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-5 h-5 text-[var(--text-primary)]/25" strokeWidth={1.75} />
                </div>
              )}

              <div className="flex-grow min-w-0">
                <h4 className="text-[13.5px] font-bold text-[var(--text-primary)] leading-snug">
                  {items.length} ingredientes
                </h4>
                <p className="text-[11.5px] text-[var(--text-primary)]/40 capitalize line-clamp-1 mt-0.5">
                  {items.map(item => item.name).join(', ')}
                </p>
                <p className="text-[10.5px] text-[var(--text-primary)]/30 mt-1 font-medium">{dateStr}</p>
              </div>

              <button
                onClick={() => onLoadIngredients(items.map(i => i.name))}
                className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-90 transition-transform"
                title="Usar ingredientes"
              >
                <ArrowUpRight className="w-4 h-4 text-[var(--text-primary)]/60" strokeWidth={2} />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
