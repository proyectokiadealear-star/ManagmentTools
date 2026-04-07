import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileDown, Loader2, AlertCircle } from 'lucide-react';
import { Asset } from '../../data/mockData';
import { generateFichaTecnicaBlob, generateFichaTecnicaPdf } from '@shared/utils/fichaTecnicaPdf';

interface Props {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FichaTecnicaPreviewModal({ asset, isOpen, onClose }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !asset) {
      setBlobUrl(null);
      setError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    setBlobUrl(null);

    generateFichaTecnicaBlob(asset)
      .then((blob) => {
        if (cancelled) return;
        // revoke previous URL to free memory
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        const url = URL.createObjectURL(blob);
        prevUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, asset?.id]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  const handleDownload = async () => {
    if (!asset || downloading) return;
    setDownloading(true);
    try {
      await generateFichaTecnicaPdf(asset);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && asset && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-4 sm:inset-8 z-50 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center">
                  <FileDown size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">Vista previa — Ficha Técnica</p>
                  <p className="text-slate-400 text-xs">{asset.descripcion} · {asset.codigo}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  disabled={downloading || loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {downloading ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                  {downloading ? 'Descargando...' : 'Descargar PDF'}
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-slate-100 relative overflow-hidden">
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 size={36} className="animate-spin text-amber-500" />
                  <p className="text-sm font-medium">Generando ficha técnica…</p>
                </div>
              )}

              {error && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <AlertCircle size={36} className="text-rose-400" />
                  <p className="text-sm font-medium text-slate-600">No se pudo generar la vista previa.</p>
                  <button
                    onClick={() => {
                      setError(false);
                      // Re-trigger effect by toggling asset; easiest: just re-run the generation
                      setLoading(true);
                      generateFichaTecnicaBlob(asset)
                        .then((blob) => {
                          if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
                          const url = URL.createObjectURL(blob);
                          prevUrlRef.current = url;
                          setBlobUrl(url);
                        })
                        .catch(() => setError(true))
                        .finally(() => setLoading(false));
                    }}
                    className="text-xs text-amber-600 underline"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {blobUrl && !loading && (
                <iframe
                  src={`${blobUrl}#toolbar=1&navpanes=0`}
                  className="w-full h-full border-0"
                  title="Vista previa ficha técnica"
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
