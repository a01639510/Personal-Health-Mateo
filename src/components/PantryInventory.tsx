import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Package, Trash2, Download, Upload, ScanBarcode, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  InventoryItem,
  getAllItemsSortedByExpiration,
  deleteItem,
  exportAllAsJson,
  importFromJson,
} from '../lib/inventoryDb';
import { daysRemaining, expirationStatus, statusColor, formatDaysLabel } from '../lib/inventoryUtils';
import { requestNotificationPermission, checkAndNotifyExpiringItems } from '../lib/notifications';

interface PantryInventoryProps {
  onOpenScanner: () => void;
}

export default function PantryInventory({ onOpenScanner }: PantryInventoryProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const all = await getAllItemsSortedByExpiration();
    setItems(all);
    setLoading(false);
    requestNotificationPermission().then(() => checkAndNotifyExpiringItems(all));
  }, []);

  useEffect(() => {
    loadItems();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadItems();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadItems]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    await deleteItem(itemToDelete.id);
    setItemToDelete(null);
    loadItems();
  };

  const handleExport = async () => {
    const json = await exportAllAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      await importFromJson(reader.result as string);
      loadItems();
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const categories = Array.from(new Set(items.map((i) => i.category))).sort();

  const filtered = items.filter((item) => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.brand?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !category || item.category === category;
    return matchesSearch && matchesCategory;
  });

  const expiringSoon = items.filter((item) => daysRemaining(item.expirationDate) <= 2);

  return (
    <div className="pt-2 pb-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[19px] font-bold text-[var(--text-primary)]">Inventario</h2>
          <p className="text-[12px] text-[var(--text-primary)]/40">{items.length} productos guardados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="w-9 h-9 rounded-full bg-[var(--bg-surface)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform" title="Exportar respaldo">
            <Download className="w-4 h-4 text-[var(--text-primary)]/60" strokeWidth={2} />
          </button>
          <button onClick={() => importInputRef.current?.click()} className="w-9 h-9 rounded-full bg-[var(--bg-surface)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform" title="Importar respaldo">
            <Upload className="w-4 h-4 text-[var(--text-primary)]/60" strokeWidth={2} />
          </button>
          <input type="file" ref={importInputRef} accept="application/json" onChange={handleImportFile} className="hidden" />
        </div>
      </div>

      <button
        onClick={onOpenScanner}
        className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold py-4 rounded-full text-[15px] cursor-pointer active:scale-[0.98] transition-transform mb-5"
      >
        <ScanBarcode className="w-[18px] h-[18px]" strokeWidth={2} />
        <span>Escanear producto</span>
      </button>

      {expiringSoon.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2 px-0.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger-fg)]" strokeWidth={2} />
            <h3 className="text-[13px] font-bold text-[var(--danger-fg)]">Por vencer pronto</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {expiringSoon.map((item) => {
              const days = daysRemaining(item.expirationDate);
              const colors = statusColor(expirationStatus(days));
              return (
                <div key={item.id} className="flex-shrink-0 w-32 rounded-2xl p-3" style={{ backgroundColor: colors.bg }}>
                  <p className="text-[12px] font-bold line-clamp-1" style={{ color: colors.fg }}>{item.name}</p>
                  <p className="text-[10.5px] font-medium mt-0.5" style={{ color: colors.fg }}>{formatDaysLabel(days)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 bg-[var(--bg-surface)] rounded-full px-4 py-3 mb-3">
        <Search className="w-4 h-4 text-[var(--text-primary)]/35 flex-shrink-0" strokeWidth={2} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="flex-grow bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[var(--text-primary)]/35 focus:outline-none min-w-0"
        />
        {search && (
          <button onClick={() => setSearch('')} className="flex-shrink-0 cursor-pointer">
            <X className="w-4 h-4 text-[var(--text-primary)]/35" />
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setCategory(null)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-full text-[12.5px] font-semibold cursor-pointer transition-colors ${
              !category ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]/60'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat === category ? null : cat)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-full text-[12.5px] font-semibold cursor-pointer transition-colors ${
                category === cat ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-[var(--text-primary)]/30 text-[13px]">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="pt-10 text-center space-y-4">
          <div className="bg-[var(--bg-surface)] w-14 h-14 mx-auto flex items-center justify-center rounded-full">
            <Package className="w-7 h-7 text-[var(--text-primary)]/40" strokeWidth={1.75} />
          </div>
          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
            {items.length === 0 ? 'Inventario vacío' : 'Sin resultados'}
          </h3>
          <p className="text-[13px] text-[var(--text-primary)]/40 leading-relaxed px-4">
            {items.length === 0 ? 'Escanea un producto para empezar a llevar tu inventario.' : 'Prueba con otra búsqueda o filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((item) => {
              const days = daysRemaining(item.expirationDate);
              const colors = statusColor(expirationStatus(days));
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="flex items-center gap-3 bg-[var(--bg-surface)] rounded-[24px] p-3"
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[var(--bg-elevated)] flex-shrink-0 flex items-center justify-center">
                    {item.imageUrl || item.imageBase64 ? (
                      <img src={item.imageUrl || item.imageBase64} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Package className="w-5 h-5 text-[var(--text-primary)]/25" strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="text-[13.5px] font-bold text-[var(--text-primary)] line-clamp-1">{item.name}</h4>
                    {item.brand && <p className="text-[11px] text-[var(--text-primary)]/40 line-clamp-1">{item.brand}</p>}
                    <span
                      className="inline-block mt-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: colors.bg, color: colors.fg }}
                    >
                      {formatDaysLabel(days)}
                    </span>
                  </div>
                  <button
                    onClick={() => setItemToDelete(item)}
                    className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-90 transition-transform"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[var(--text-primary)]/40" strokeWidth={1.75} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {itemToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setItemToDelete(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-[430px] bg-[var(--bg-surface)] rounded-t-[28px] p-6 pb-safe space-y-5 text-center max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-9 h-1 bg-[var(--text-primary)]/10 rounded-full mx-auto" />
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">¿Eliminar producto?</h3>
              <p className="text-[13px] text-[var(--text-primary)]/40 px-2">
                Vas a quitar <strong className="text-[var(--text-primary)]/70">"{itemToDelete.name}"</strong> de tu inventario.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setItemToDelete(null)} className="flex-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold py-3.5 rounded-full text-[14px] cursor-pointer active:scale-[0.98] transition-transform">
                  Cancelar
                </button>
                <button onClick={handleDelete} className="flex-1 bg-[#ff3b30] text-white font-semibold py-3.5 rounded-full text-[14px] cursor-pointer active:scale-[0.98] transition-transform">
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
