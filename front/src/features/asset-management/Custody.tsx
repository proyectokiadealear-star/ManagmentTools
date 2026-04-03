import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowRightLeft, Shield, UserCircle, Plus, X, Save, Loader2 } from 'lucide-react';
import { CustodyTransfer } from '../../data/mockData';
import { httpClient } from '../../services/httpClient';
import { useAssets } from '@shared/context/AssetContext';

interface MovimientoTransfer {
  id: string;
  activoId: string;
  motivo: string;
  usuarioNombre?: string;
  fecha: string;
  desde?: { areaId?: string; bahiaId?: string };
  hasta: { areaId?: string; bahiaId?: string };
}

export function Custody() {
  const assets = useAssets();
  const [transfers, setTransfers] = useState<CustodyTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState<{
    assetId: string;
    fromCustodio: string;
    toCustodio: string;
    autorizadoPor: string;
  }>({ assetId: '', fromCustodio: '', toCustodio: '', autorizadoPor: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Try loading all movements from backend
        const movimientos = await httpClient.get<MovimientoTransfer[]>('/api/activos/movimientos');
        if (!cancelled) {
          const mapped: CustodyTransfer[] = movimientos.map((m) => ({
            id: m.id,
            assetId: m.activoId,
            fromCustodio: m.desde?.areaId || 'N/A',
            toCustodio: m.hasta?.areaId || m.motivo,
            fecha: m.fecha?.split('T')[0] || '',
            autorizadoPor: m.usuarioNombre || 'Sistema',
          }));
          setTransfers(mapped);
        }
      } catch {
        // Backend not available — show empty state
        if (!cancelled) {
          setTransfers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAssetSelect = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    setNewTransfer(prev => ({
      ...prev,
      assetId,
      fromCustodio: asset?.custodio || '',
    }));
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // POST to backend
      await httpClient.post(`/api/activos/${newTransfer.assetId}/transferir`, {
        areaId: '',
        bahiaId: '',
        rackId: '',
        motivo: `Transferencia de custodia: ${newTransfer.fromCustodio} → ${newTransfer.toCustodio}`,
        nuevoCustodio: newTransfer.toCustodio,
        autorizadoPor: newTransfer.autorizadoPor,
      });
    } catch {
      // Backend offline — add locally
      console.warn('[Custody] Backend offline, adding transfer locally');
    }
    // Add to local state regardless
    const transfer: CustodyTransfer = {
      id: `TR-${String(transfers.length + 1).padStart(3, '0')}`,
      assetId: newTransfer.assetId,
      fromCustodio: newTransfer.fromCustodio,
      toCustodio: newTransfer.toCustodio,
      fecha: new Date().toISOString().split('T')[0],
      autorizadoPor: newTransfer.autorizadoPor,
    };
    setTransfers(prev => [transfer, ...prev]);
    setIsTransferModalOpen(false);
    setNewTransfer({ assetId: '', fromCustodio: '', toCustodio: '', autorizadoPor: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Gestión de Custodia
        </h1>
        <p className="text-slate-500 mt-1">
          F2.1 Separación Rol vs Persona y F2.2 Historial de Transferencias
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* F2.1 Separación de roles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Asignaciones Actuales (F2.1)
              </h2>
              <p className="text-xs text-slate-500">
                Rol Responsable vs Persona Custodio
              </p>
            </div>
          </div>
          <div className="p-0 overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-medium">Activo</th>
                  <th className="px-5 py-3 font-medium">
                    <div className="flex items-center gap-1.5 text-blue-700">
                      <Shield size={14} />
                      Rol Responsable
                    </div>
                  </th>
                  <th className="px-5 py-3 font-medium">
                    <div className="flex items-center gap-1.5 text-amber-700">
                      <UserCircle size={14} />
                      Persona Custodio
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.slice(0, 5).map((asset) =>
                  <tr
                    key={asset.id}
                    className="hover:bg-slate-50/50 transition-colors">

                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900 truncate max-w-[150px]">
                        {asset.descripcion}
                      </p>
                      <p className="text-xs font-mono text-slate-500">
                        {asset.codigo}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium">
                        {asset.responsable}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-100 text-xs font-medium">
                        {asset.custodio}
                      </span>
                      {asset.custodio === 'Bodeguero / Repuestos SURMOTOR' &&
                        <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Problema: Mezcla rol/persona
                        </p>
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* F2.2 Historial de transferencias */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                <ArrowRightLeft size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Historial de Transferencias (F2.2)
                </h2>
                <p className="text-xs text-slate-500">
                  Trazabilidad de cambios de custodia
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
              <Plus size={14} /> Nueva Transferencia
            </button>
          </div>
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
              {transfers.map((transfer) => {
                const asset = assets.find((a) => a.id === transfer.assetId);
                return (
                  <div key={transfer.id} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-white border-2 border-amber-500 rounded-full -left-[7px] top-1.5"></div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-bold text-slate-900">
                          {asset?.descripcion ?? transfer.assetId}
                        </p>
                        <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                          {transfer.fecha}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex-1 bg-white p-2 rounded border border-slate-200">
                          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">
                            De (Anterior)
                          </p>
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {transfer.fromCustodio}
                          </p>
                        </div>
                        <ArrowRightLeft size={14} className="text-slate-400 shrink-0" />
                        <div className="flex-1 bg-amber-50 p-2 rounded border border-amber-100">
                          <p className="text-[10px] text-amber-600 uppercase font-semibold mb-0.5">
                            A (Nuevo)
                          </p>
                          <p className="text-xs font-medium text-amber-900 truncate">
                            {transfer.toCustodio}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-1.5 text-xs text-slate-500">
                        <Shield size={12} />
                        Autorizado por:{' '}
                        <span className="font-medium text-slate-700">
                          {transfer.autorizadoPor}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modal: Registrar Transferencia de Custodia */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <ArrowRightLeft size={18} />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    Registrar Transferencia de Custodia (F2.2)
                  </h2>
                </div>
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSaveTransfer} className="flex flex-col flex-1">
                <div className="p-6 space-y-4 flex-1">

                  {/* Activo */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Activo
                    </label>
                    <select
                      required
                      value={newTransfer.assetId}
                      onChange={e => handleAssetSelect(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400">
                      <option value="">Seleccionar activo…</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.descripcion} ({a.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custodio Anterior */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Custodio Anterior (De)
                    </label>
                    <input
                      type="text"
                      required
                      value={newTransfer.fromCustodio}
                      onChange={e => setNewTransfer(prev => ({ ...prev, fromCustodio: e.target.value }))}
                      placeholder="Custodio actual del activo"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    />
                  </div>

                  {/* Nuevo Custodio */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Nuevo Custodio (A)
                    </label>
                    <input
                      type="text"
                      required
                      value={newTransfer.toCustodio}
                      onChange={e => setNewTransfer(prev => ({ ...prev, toCustodio: e.target.value }))}
                      placeholder="Nombre del nuevo custodio"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    />
                  </div>

                  {/* Autorizado Por */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Autorizado Por
                    </label>
                    <input
                      type="text"
                      required
                      value={newTransfer.autorizadoPor}
                      onChange={e => setNewTransfer(prev => ({ ...prev, autorizadoPor: e.target.value }))}
                      placeholder="Nombre de quien autoriza"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors shadow-sm">
                    <Save size={15} />
                    Registrar Transferencia
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
