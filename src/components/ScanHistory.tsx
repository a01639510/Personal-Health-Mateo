import React, { useState, useEffect } from 'react';
import { History, Sparkles, Loader2, Calendar, ChefHat, ArrowUpRight, AlertCircle, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
          ? 'Estructura de Base de Datos Pendiente'
          : 'No pudimos consultar el historial de escaneos',
        details: err.message || 'Verifica la configuración de Supabase URL y Service Role Key.',
        isSchemaMissing: err.isSchemaMissing
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <h3 className="font-display font-semibold text-lg text-slate-800 mb-1">Cargando Historial</h3>
        <p className="text-slate-500 text-sm max-w-xs">
          Leyendo los últimos escaneos de ingredientes de tu refrigerador...
        </p>
      </div>
    );
  }

  if (error) {
    if (error.isSchemaMissing) {
      return (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto text-center space-y-5 shadow-sm">
          <div className="bg-amber-50 p-4 rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-amber-100">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-slate-800 mb-2">Tablas no creadas en Supabase</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              La conexión con Supabase es correcta, pero aún falta crear la tabla <strong className="text-slate-700">"pantry_scans"</strong> para guardar tu historial.
            </p>
            <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
              Por favor, dirígete a la pestaña <strong className="text-slate-600">"Recetas Guardadas"</strong> donde encontrarás un asistente con el script SQL de inicialización de un clic.
            </p>
          </div>
          <button
            onClick={fetchHistory}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-sm"
          >
            Reintentar Carga
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto text-center space-y-5 shadow-sm">
        <div className="bg-rose-50 p-4 rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-rose-100">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg text-slate-800 mb-2">{error.message}</h3>
          {error.details && <p className="text-sm text-slate-500">{error.details}</p>}
        </div>
        <button
          onClick={fetchHistory}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-sm"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
        <div className="bg-slate-50 p-4 rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-slate-200">
          <History className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="font-display font-semibold text-lg text-slate-800">Historial de escaneo vacío</h3>
        <p className="text-sm text-slate-500">
          Aún no has realizado escaneos de fotos. Sube una foto en la pestaña de "Escanear" y verás tus registros guardados aquí de forma automática.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-xl text-slate-800">Historial de Análisis de Refri</h2>
        <p className="text-xs text-slate-500">Consulta los ingredientes que tenías en escaneos anteriores y recárgalos fácilmente</p>
      </div>

      <div className="space-y-4 max-w-3xl mx-auto">
        {scans.map((scan, idx) => {
          const items = scan.detected_items || [];
          const dateStr = new Date(scan.created_at).toLocaleString();

          return (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-slate-300 transition-all shadow-sm"
            >
              <div className="flex items-start gap-4">
                {/* Photo Preview if uploaded */}
                {scan.photo_url ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-50">
                    <img
                      src={scan.photo_url}
                      alt="Miniatura de escaneo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{dateStr}</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-800">
                      {items.length} ingredientes detectados
                    </h4>
                    <p className="text-xs text-slate-500 capitalize max-w-xl leading-relaxed">
                      {items.map(item => item.name).join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => onLoadIngredients(items.map(i => i.name))}
                className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-emerald-600 border border-slate-200 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap self-start md:self-center shadow-sm"
              >
                <span>Usar ingredientes</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
