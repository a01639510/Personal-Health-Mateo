import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { ChevronLeft, AlertCircle, Camera, Search, Check } from 'lucide-react';
import { addItem, InventoryItem } from '../lib/inventoryDb';

interface BarcodeScannerProps {
  onDone: () => void;
  onBack: () => void;
}

interface OpenFoodFactsProduct {
  name: string;
  brand?: string;
  quantity?: string;
  imageUrl?: string;
  category?: string;
}

type Step = 'scanning' | 'manual-code' | 'confirm' | 'manual-product' | 'expiration';

const CATEGORIES = ['Verdura', 'Fruta', 'Lácteo', 'Carne', 'Huevo', 'Salsa', 'Condimento', 'Legumbre', 'Panadería', 'Pescado', 'Congelado', 'Bebida', 'Enlatado', 'Otros'];
const LOCATIONS = ['Puerta', 'Cajón', 'Congelador', 'Alacena'];

export default function BarcodeScanner({ onDone, onBack }: BarcodeScannerProps) {
  const [step, setStep] = useState<Step>('scanning');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [product, setProduct] = useState<OpenFoodFactsProduct | null>(null);

  const [manualName, setManualName] = useState('');
  const [manualCategory, setManualCategory] = useState(CATEGORIES[0]);
  const [manualPhotoBase64, setManualPhotoBase64] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState('');
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (step !== 'scanning') return;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.UPC_A]);
    const reader = new BrowserMultiFormatReader(hints);
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, _err, controls) => {
        controlsRef.current = controls;
        if (result && !cancelled) {
          cancelled = true;
          controls.stop();
          handleBarcodeDetected(result.getText());
        }
      })
      .catch((err) => {
        setCameraError(err?.message || 'No se pudo acceder a la cámara.');
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleBarcodeDetected = (code: string) => {
    setBarcode(code);
    lookupProduct(code);
  };

  const lookupProduct = async (code: string) => {
    setLoadingLookup(true);
    setLookupError(null);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      if (!res.ok) throw new Error('No se pudo conectar con Open Food Facts.');
      const data = await res.json();
      if (data.status === 1 && data.product) {
        setProduct({
          name: data.product.product_name || 'Producto sin nombre',
          brand: data.product.brands,
          quantity: data.product.quantity,
          imageUrl: data.product.image_url,
          category: data.product.categories?.split(',')[0]?.trim(),
        });
        setStep('confirm');
      } else {
        setManualName('');
        setStep('manual-product');
      }
    } catch (err: any) {
      setLookupError(err.message || 'Error de red al buscar el producto.');
    } finally {
      setLoadingLookup(false);
    }
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setBarcode(manualCode.trim());
    lookupProduct(manualCode.trim());
  };

  const handleManualPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setManualPhotoBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const goToExpirationStep = () => {
    const today = new Date().toISOString().slice(0, 10);
    setExpirationDate(today);
    setStep('expiration');
  };

  const handleSave = async () => {
    setSaving(true);
    const item: InventoryItem = {
      id: crypto.randomUUID(),
      barcode: barcode || undefined,
      name: product?.name || manualName || 'Producto',
      brand: product?.brand,
      imageUrl: product?.imageUrl,
      imageBase64: !product ? manualPhotoBase64 || undefined : undefined,
      category: product?.category || manualCategory,
      quantity,
      location: location || undefined,
      entryDate: new Date().toISOString(),
      expirationDate: expirationDate || new Date().toISOString().slice(0, 10),
    };
    await addItem(item);
    setSaving(false);
    onDone();
  };

  return (
    <div className="pt-2 pb-2">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[var(--bg-surface)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" strokeWidth={2.25} />
        </button>
        <h2 className="text-[17px] font-bold text-[var(--text-primary)]">Escanear código de barras</h2>
      </div>

      {step === 'scanning' && (
        <div className="space-y-4">
          {!cameraError ? (
            <div className="relative w-full aspect-square rounded-[28px] overflow-hidden bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-0 border-[3px] border-white/40 m-8 rounded-2xl pointer-events-none" />
            </div>
          ) : (
            <div className="bg-[var(--danger-bg)] text-[var(--danger-fg)] p-4 rounded-2xl text-[13px] leading-relaxed flex gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <span>No se pudo acceder a la cámara ({cameraError}). Ingresa el código manualmente.</span>
            </div>
          )}

          <button
            onClick={() => setStep('manual-code')}
            className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold py-3.5 rounded-full text-[14px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            Ingresar código manualmente
          </button>
        </div>
      )}

      {step === 'manual-code' && (
        <form onSubmit={handleManualCodeSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Código de barras</label>
            <input
              type="text"
              inputMode="numeric"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ej. 7501234567890"
              className="w-full bg-[var(--bg-surface)] rounded-2xl px-4 py-3.5 text-[15px] text-[var(--text-primary)] focus:outline-none"
              autoFocus
            />
          </div>
          {lookupError && (
            <div className="bg-[var(--danger-bg)] text-[var(--danger-fg)] p-3.5 rounded-2xl text-[12px] leading-relaxed flex items-center justify-between">
              <span>{lookupError}</span>
              <button type="button" onClick={() => barcode && lookupProduct(barcode)} className="font-semibold underline flex-shrink-0 ml-2">Reintentar</button>
            </div>
          )}
          <button
            type="submit"
            disabled={!manualCode.trim() || loadingLookup}
            className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] disabled:opacity-30 text-[var(--accent-foreground)] font-semibold py-4 rounded-full text-[15px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            <Search className="w-4 h-4" strokeWidth={2} />
            <span>{loadingLookup ? 'Buscando...' : 'Buscar'}</span>
          </button>
        </form>
      )}

      {step === 'confirm' && product && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-surface)] rounded-[24px] p-4 flex gap-3 items-center">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0">
                <Camera className="w-6 h-6 text-[var(--text-primary)]/30" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] line-clamp-2">{product.name}</h3>
              {product.brand && <p className="text-[12px] text-[var(--text-primary)]/40 mt-0.5">{product.brand}</p>}
              {product.quantity && <p className="text-[11px] text-[var(--text-primary)]/40">{product.quantity}</p>}
            </div>
          </div>
          <button
            onClick={goToExpirationStep}
            className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold py-4 rounded-full text-[15px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            <span>Confirmar producto</span>
          </button>
        </div>
      )}

      {step === 'manual-product' && (
        <div className="space-y-5">
          <div className="bg-[var(--warning-bg)] text-[var(--warning-fg)] p-3.5 rounded-2xl text-[12.5px] leading-relaxed">
            No encontramos este producto en Open Food Facts. Créalo manualmente.
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleManualPhoto}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-video rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center cursor-pointer overflow-hidden"
          >
            {manualPhotoBase64 ? (
              <img src={manualPhotoBase64} alt="Foto del producto" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[var(--text-primary)]/40">
                <Camera className="w-6 h-6" strokeWidth={1.75} />
                <span className="text-[12px] font-medium">Tomar foto (opcional)</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Nombre</label>
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Nombre del producto"
              className="w-full bg-[var(--bg-surface)] rounded-2xl px-4 py-3.5 text-[15px] text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setManualCategory(cat)}
                  className={`px-3.5 py-2 rounded-full text-[12.5px] font-medium cursor-pointer transition-colors ${
                    manualCategory === cat ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={goToExpirationStep}
            disabled={!manualName.trim()}
            className="w-full bg-[var(--accent)] disabled:opacity-30 text-[var(--accent-foreground)] font-semibold py-4 rounded-full text-[15px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            Continuar
          </button>
        </div>
      )}

      {step === 'expiration' && (
        <div className="space-y-5">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Fecha de caducidad</label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="w-full bg-[var(--bg-surface)] rounded-2xl px-4 py-3.5 text-[15px] text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Cantidad</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold cursor-pointer">−</button>
              <span className="text-[16px] font-bold text-[var(--text-primary)] w-8 text-center">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} className="w-10 h-10 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold cursor-pointer">+</button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-primary)]/35 uppercase tracking-wide mb-2">Ubicación (opcional)</label>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLocation(loc === location ? '' : loc)}
                  className={`px-3.5 py-2 rounded-full text-[12.5px] font-medium cursor-pointer transition-colors ${
                    location === loc ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]/60'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[var(--accent)] disabled:opacity-50 text-[var(--accent-foreground)] font-semibold py-4 rounded-full text-[15px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            {saving ? 'Guardando...' : 'Guardar en inventario'}
          </button>
        </div>
      )}
    </div>
  );
}
