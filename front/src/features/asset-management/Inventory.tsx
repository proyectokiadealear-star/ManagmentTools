import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Eye, MapPin, Plus, Edit, Trash2, LayoutList, LayoutGrid, Wrench, CheckCircle, XCircle, FileDown } from 'lucide-react';
import { Asset } from '../../data/mockData';
import { AssetDetailModal } from './AssetDetailModal';
import { AssetFormModal } from './AssetFormModal';
import { FichaTecnicaPreviewModal } from './FichaTecnicaPreviewModal';
import { useAssets, useAssetContext } from '@shared/context/AssetContext';
import { ConfirmModal } from '@shared/components';
import { getLocationTree } from '@services/assetService';

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export function Inventory() {
  const assets = useAssets();
  const { state: { assetsLoaded }, removeAsset, addAsset, editAsset } = useAssetContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [viewMode, setViewMode] = useState<'tabla' | 'galeria'>('tabla');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pdfPreviewAsset, setPdfPreviewAsset] = useState<Asset | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const [areaMap, setAreaMap] = useState<Record<string, string>>({});
  const [bahiaMap, setBahiaMap] = useState<Record<string, string>>({});
  const [rackMap, setRackMap] = useState<Record<string, string>>({});
  const [cajaMap, setCajaMap] = useState<Record<string, string>>({});

  useEffect(() => {
    getLocationTree().then(({ areas, bahias, racks, cajas }) => {
      setAreaMap(Object.fromEntries(areas.map(a => [a.id, a.nombre])));
      setBahiaMap(Object.fromEntries(bahias.map(b => [b.id, b.nombre])));
      setRackMap(Object.fromEntries(racks.map(r => [r.id, r.nombre])));
      setCajaMap(Object.fromEntries((cajas ?? []).map(c => [c.id, c.numero])));
    }).catch(() => {/* keep maps empty on error */});
  }, []);

  const uniqueAreas = Array.from(new Set(assets.map((a) => a.area).filter(Boolean))) as string[];

  const filteredAssets = assets.filter((asset) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (asset.descripcion ?? '').toLowerCase().includes(term) ||
      (asset.codigo ?? '').toLowerCase().includes(term) ||
      (asset.placa ?? '').toLowerCase().includes(term);
    const matchesArea = filterArea === '' || asset.area === filterArea;
    return matchesSearch && matchesArea;
  });

  const handleViewAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDetailModalOpen(true);
  };
  const handleEditAsset = (asset: Asset) => {
    setAssetToEdit(asset);
    setIsFormModalOpen(true);
    setIsDetailModalOpen(false);
  };
  const handleDeleteAsset = (id: string) => {
    setConfirmDeleteId(id);
  };
  const handleSaveAsset = async (asset: Asset) => {
    try {
      if (assetToEdit) {
        await editAsset(asset.id, asset);
        showToast('success', 'Activo actualizado correctamente.');
      } else {
        const { id: _id, ...rest } = asset;
        await addAsset(rest);
        showToast('success', 'Activo creado correctamente.');
      }
      setIsFormModalOpen(false);
      setAssetToEdit(null);
    } catch (error) {
      const backendMessage =
        error instanceof Error && error.message
          ? error.message
          : 'No se pudo guardar el activo. Intente de nuevo.';
      showToast('error', backendMessage);
    }
  };
  const handleOpenNewAsset = () => {
    setAssetToEdit(null);
    setIsFormModalOpen(true);
  };

  const estadoBadgeClass = (estado: string) =>
    estado === 'Activo'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : estado === 'En Reparación'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Inventario y Ubicaciones
          </h1>
          <p className="text-slate-500 mt-1">
            F1.1 Ubicación Jerárquica y F1.2 Ficha Visual
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18} />
            <input
              type="text"
              placeholder="Buscar por código, descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent w-full sm:w-64 text-sm" />
          </div>

          {/* Filter by Area */}
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="py-2 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm text-slate-700 bg-white shadow-sm">
            <option value="">Todas las áreas</option>
            {uniqueAreas.map((area) => (
              <option key={area} value={area}>{areaMap[area] ?? area}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('tabla')}
              title="Vista tabla"
              className={`p-2 transition-colors ${viewMode === 'tabla' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setViewMode('galeria')}
              title="Vista galería"
              className={`p-2 transition-colors ${viewMode === 'galeria' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <LayoutGrid size={16} />
            </button>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm">
            <Filter size={16} />
            Filtros
          </button>
          <button
            onClick={handleOpenNewAsset}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 border border-transparent rounded-lg text-white hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm">
            <Plus size={16} />
            Nuevo Activo
          </button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'tabla' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-medium">Activo</th>
                  <th className="px-6 py-4 font-medium">
                    Ubicación Jerárquica (F1.1)
                  </th>
                  <th className="px-6 py-4 font-medium">Placa / Serie</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!assetsLoaded ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                      No se encontraron activos.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset, index) =>
                <motion.tr
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={asset.id}
                  className="hover:bg-slate-50/50 transition-colors group">

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        {asset.imagenUrl ?
                        <img
                          src={asset.imagenUrl}
                          alt=""
                          className="w-full h-full object-cover" /> :
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                          Img
                        </div>
                        }
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {asset.descripcion}
                        </p>
                        <p className="text-xs font-mono text-slate-500">
                          {asset.codigo}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {asset.area ?
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                        <MapPin size={14} className="text-blue-500" />
                        {areaMap[asset.area!] ?? asset.area}
                      </div>
                      {asset.bahia && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-5">
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          {bahiaMap[asset.bahia] ?? asset.bahia}
                        </div>
                      )}
                      {asset.rack && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 pl-5">
                          <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                          {rackMap[asset.rack] ?? asset.rack}
                        </div>
                      )}
                      {asset.caja && (
                        <div className="pl-5">
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                            Caja: {cajaMap[asset.caja] ?? asset.caja}
                          </span>
                        </div>
                      )}
                    </div> :
                    <div className="text-amber-600 text-xs flex items-center gap-1 bg-amber-50 px-2 py-1 rounded inline-flex border border-amber-100">
                      <MapPin size={12} />
                      Texto libre: {asset.ubicacion}
                    </div>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-mono text-slate-700">{asset.placa}</p>
                    <p
                    className="text-xs text-slate-500 truncate max-w-[120px]"
                    title={asset.serial}>
                      S/N: {asset.serial}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${estadoBadgeClass(asset.estado)}`}>
                      {asset.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                      onClick={() => handleViewAsset(asset)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Ver Ficha">
                        <Eye size={18} />
                      </button>
                      <button
                      onClick={() => setPdfPreviewAsset(asset)}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      title="Ver Ficha Técnica PDF">
                        <FileDown size={18} />
                      </button>
                      <button
                      onClick={() => handleEditAsset(asset)}
                      className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                      title="Editar">
                        <Edit size={18} />
                      </button>
                      <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GALLERY VIEW */}
      {viewMode === 'galeria' && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAssets.map((asset, index) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

                {/* Image with placa badge */}
                <div className="relative aspect-square bg-slate-100">
                  {asset.imagenUrl ? (
                    <img
                      src={asset.imagenUrl}
                      alt={asset.descripcion}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Wrench size={48} />
                    </div>
                  )}
                  {/* Placa badge */}
                  <span className="absolute top-2 right-2 bg-slate-900/75 text-white text-[10px] font-mono px-2 py-0.5 rounded-full backdrop-blur-sm">
                    PLACA: {asset.placa}
                  </span>
                </div>

                {/* Card body */}
                <div className="p-3 flex flex-col gap-2">
                  {/* Estado badge */}
                  <span className={`self-start px-2 py-0.5 rounded-full text-xs font-medium border ${estadoBadgeClass(asset.estado)}`}>
                    {asset.estado}
                  </span>

                  {/* Name & code */}
                  <div>
                    <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                      {asset.descripcion}
                    </p>
                    <p className="font-mono text-xs text-slate-500 mt-0.5">
                      {asset.codigo}
                    </p>
                  </div>

                  {/* Location hierarchy */}
                  {asset.area ? (
                    <div className="flex flex-col gap-0.5 text-xs">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <MapPin size={12} className="text-blue-500 shrink-0" />
                        {areaMap[asset.area!] ?? asset.area ?? '—'}
                      </div>
                      {asset.bahia && (
                        <p className="text-slate-500 pl-4">
                          {bahiaMap[asset.bahia] ?? asset.bahia}{asset.rack ? ` / ${rackMap[asset.rack] ?? asset.rack}` : ''}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-amber-600 text-xs flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                      <MapPin size={11} className="shrink-0" />
                      <span className="truncate">Texto libre: {asset.ubicacion}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => handleViewAsset(asset)}
                      className="flex-1 flex items-center justify-center p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Ver Ficha">
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => setPdfPreviewAsset(asset)}
                      className="flex-1 flex items-center justify-center p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      title="Ver Ficha Técnica PDF">
                      <FileDown size={16} />
                    </button>
                    <button
                      onClick={() => handleEditAsset(asset)}
                      className="flex-1 flex items-center justify-center p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                      title="Editar">
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="flex-1 flex items-center justify-center p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <AssetDetailModal
        asset={selectedAsset}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleEditAsset}
        onDelete={handleDeleteAsset} />

      <AssetFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveAsset}
        initialData={assetToEdit} />

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (!confirmDeleteId) return;
          try {
            await removeAsset(confirmDeleteId);
            setIsDetailModalOpen(false);
            showToast('success', 'Activo eliminado correctamente.');
          } catch {
            showToast('error', 'No se pudo eliminar el activo. Intente de nuevo.');
          }
        }}
        title="Eliminar activo"
        message="Esta acción no se puede deshacer. ¿Está seguro de que desea eliminar este activo del inventario?"
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="danger"
      />

      <FichaTecnicaPreviewModal
        asset={pdfPreviewAsset}
        isOpen={pdfPreviewAsset !== null}
        onClose={() => setPdfPreviewAsset(null)}
      />
    </div>
  );
}
