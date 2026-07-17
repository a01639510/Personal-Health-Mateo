import React, { useState, useEffect } from 'react';
import { History, Loader2, ArrowUpRight, AlertCircle, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { PantryScan } from '../types';

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
      <div className="flex flex-col items-center justify-center text-center py-20">
        <Loader2 className="w-8 h-8 text-black/60 animate-spin mb-4" strokeWidth={2} />
        <h3 className="text-[16px] font-bold text-black mb-1">Cargando historial</h3>
        <p className="text-black/40 text-[13px] max-w-[240px] leading-relaxed">
          Leyendo tus escaneos anteriores...
        </p>
      </div>
    );
  }

  if (error) {
    if (error.isSchemaMissing) {
      return (
        <div className="pt-10 text-center space-y-5">
          <div className="bg-[#FFF6E5] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
            <AlertCircle className="w-7 h-7 text-[#b8860b]" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-black mb-1.5">Tablas no creadas en Supabase</h3>
            <p className="text-[13px] text-black/40 leading-relaxed px-4">
              La conexión con Supabase es correcta, pero falta crear la tabla <strong className="text-black/60">"pantry_scans"</strong>.
            </p>
            <p className="text-[12px] text-black/30 mt-2 px-6 leading-relaxed">
              Ve a la pestaña "Guardadas" para encontrar el script SQL de inicialización.
            </p>
          </div>
          <button
            onClick={fetchHistory}
            className="bg-black text-white font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return (
      <div className="pt-10 text-center space-y-5">
        <div className="bg-[#FFF1F0] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
          <AlertCircle className="w-7 h-7 text-[#ff3b30]" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-[16px] font-bold text-black mb-1.5">{error.message}</h3>
          {error.details && <p className="text-[13px] text-black/40 leading-relaxed px-4">{error.details}</p>}
        </div>
        <button
          onClick={fetchHistory}
          className="bg-black text-white font-semibold px-6 py-3 rounded-full text-[13px] cursor-pointer active:scale-[0.98] transition-transform"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="pt-10 text-center space-y-4">
        <div className="bg-[#F5F5F7] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
          <History className="w-7 h-7 text-black/40" strokeWidth={1.75} />
        </div>
        <h3 className="text-[16px] font-bold text-black">Historial vacío</h3>
        <p className="text-[13px] text-black/40 leading-relaxed px-4">
          Escanea una foto en "Escanear" y tus registros aparecerán aquí automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="px-0.5">
        <h2 className="text-[19px] font-bold text-black">Historial</h2>
        <p className="text-[12px] text-black/40">Vuelve a usar ingredientes de escaneos anteriores</p>
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
              className="flex items-center gap-3 bg-[#F5F5F7] rounded-[24px] p-3"
            >
              {scan.photo_url ? (
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white flex-shrink-0">
                  <img
                    src={scan.photo_url}
                    alt="Miniatura de escaneo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-5 h-5 text-black/25" strokeWidth={1.75} />
                </div>
              )}

              <div className="flex-grow min-w-0">
                <h4 className="text-[13.5px] font-bold text-black leading-snug">
                  {items.length} ingredientes
                </h4>
                <p className="text-[11.5px] text-black/40 capitalize line-clamp-1 mt-0.5">
                  {items.map(item => item.name).join(', ')}
                </p>
                <p className="text-[10.5px] text-black/30 mt-1 font-medium">{dateStr}</p>
              </div>

              <button
                onClick={() => onLoadIngredients(items.map(i => i.name))}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-90 transition-transform"
                title="Usar ingredientes"
              >
                <ArrowUpRight className="w-4 h-4 text-black/60" strokeWidth={2} />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
