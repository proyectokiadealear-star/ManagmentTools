import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  Receipt,
  TrendingDown,
  AlertCircle,
  ShoppingCart,
  Plus,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag } from
'lucide-react';
import { mockWishlist, WishlistItem, Proforma } from '../../data/mockData';
import { calcDepreciation } from '@shared/utils/depreciation';
import { useAssets } from '@shared/context/AssetContext';
import { AddWishlistModal } from './AddWishlistModal';
import { AddProformaModal } from './AddProformaModal';

export function Depreciation() {
  const assets = useAssets();
  const [activeTab, setActiveTab] = useState<'depreciation' | 'wishlist'>(
    'depreciation'
  );
  const [wishlist, setWishlist] = useState<WishlistItem[]>(mockWishlist);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  // Modal states
  const [isAddWishlistOpen, setIsAddWishlistOpen] = useState(false);
  const [isAddProformaOpen, setIsAddProformaOpen] = useState(false);
  const [selectedWishlistId, setSelectedWishlistId] = useState<string | null>(
    null
  );
  // Form states
  const [newWishlist, setNewWishlist] = useState<Partial<WishlistItem>>({
    tipo: 'Herramienta',
    prioridad: 'Media',
    estado: 'Pendiente',
    cantidad: 1
  });
  const [newProforma, setNewProforma] = useState<Partial<Proforma>>({
    valor: 0,
    validezDias: 30,
    seleccionada: false
  });
  // Helper to calculate depreciation (Straight line method) — delegated to shared utility
  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
    prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };
  const handleSelectProforma = (wishlistItemId: string, proformaId: string) => {
    setWishlist((prev) =>
    prev.map((item) => {
      if (item.id === wishlistItemId) {
        return {
          ...item,
          estado: 'Aprobado',
          proformas: item.proformas.map((p) => ({
            ...p,
            seleccionada: p.id === proformaId
          }))
        };
      }
      return item;
    })
    );
  };
  const handleSaveWishlist = (e: React.FormEvent) => {
    e.preventDefault();
    const item: WishlistItem = {
      ...newWishlist,
      id: `WL${Math.floor(Math.random() * 1000).
      toString().
      padStart(3, '0')}`,
      fechaSolicitud: new Date().toISOString().split('T')[0],
      proformas: []
    } as WishlistItem;
    setWishlist((prev) => [item, ...prev]);
    setIsAddWishlistOpen(false);
    setNewWishlist({
      tipo: 'Herramienta',
      prioridad: 'Media',
      estado: 'Pendiente',
      cantidad: 1
    });
  };
  const handleSaveProforma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWishlistId) return;
    const proforma: Proforma = {
      ...newProforma,
      id: `P${Math.floor(Math.random() * 1000).
      toString().
      padStart(3, '0')}`,
      wishlistItemId: selectedWishlistId,
      fechaCotizacion: new Date().toISOString().split('T')[0]
    } as Proforma;
    setWishlist((prev) =>
    prev.map((item) => {
      if (item.id === selectedWishlistId) {
        return {
          ...item,
          estado: item.estado === 'Pendiente' ? 'Cotizando' : item.estado,
          proformas: [...item.proformas, proforma]
        };
      }
      return item;
    })
    );
    setIsAddProformaOpen(false);
    setNewProforma({
      valor: 0,
      validezDias: 30,
      seleccionada: false
    });
  };
  // Wishlist KPIs
  const totalWishlistItems = wishlist.length;
  const urgentItems = wishlist.filter((w) => w.prioridad === 'Alta').length;
  const pendingProformas = wishlist.filter(
    (w) => w.proformas.length === 0
  ).length;
  const estimatedTotal = wishlist.reduce((sum, item) => {
    const selected = item.proformas.find((p) => p.seleccionada);
    if (selected) return sum + selected.valor * item.cantidad;
    // If none selected, use average or cheapest. Let's use cheapest for estimate.
    if (item.proformas.length > 0) {
      const cheapest = Math.min(...item.proformas.map((p) => p.valor));
      return sum + cheapest * item.cantidad;
    }
    return sum;
  }, 0);
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Finanzas y Adquisiciones
          </h1>
          <p className="text-slate-500 mt-1">
            Gestión de depreciación y lista de compras futuras
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-lg w-fit mb-8">
        <button
          onClick={() => setActiveTab('depreciation')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'depreciation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
          
          <TrendingDown size={16} />
          Depreciación Activos
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'wishlist' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}>
          
          <ShoppingCart size={16} />
          Wishlist de Compras
        </button>
      </div>

      {activeTab === 'depreciation' &&
      <div className="space-y-8">
          {/* F3.1 Calculadora de Depreciación */}
          <motion.div
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <Calculator size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Calculadora de Depreciación (F3.1)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Línea recta basada en vida útil y fecha de compra
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                <AlertCircle size={14} />
                Requiere normalizar fechas (ej: "28-oct-22")
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-medium">Activo</th>
                    <th className="px-5 py-3 font-medium">Fecha Compra</th>
                    <th className="px-5 py-3 font-medium text-right">
                      Valor Inicial
                    </th>
                    <th className="px-5 py-3 font-medium text-center">
                      Vida Útil
                    </th>
                    <th className="px-5 py-3 font-medium text-center">Años de Uso</th>
                    <th className="px-5 py-3 font-medium text-right">
                      Depreciación Acum.
                    </th>
                    <th className="px-5 py-3 font-medium text-right text-emerald-700">
                      Valor Actual
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((asset) => {
                  const dep = calcDepreciation(
                    asset.valor,
                    asset.fechaCompra,
                    asset.vidaUtil
                  );
                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50/50 transition-colors">
                      
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">
                            {asset.descripcion}
                          </p>
                          <p className="text-xs text-slate-500">{asset.tipo}</p>
                        </td>
                        <td className="px-5 py-3 font-mono text-slate-600">
                          {asset.fechaCompra}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-slate-900">
                          $
                          {asset.valor.toLocaleString('es-EC', {
                          minimumFractionDigits: 2
                        })}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                            {asset.vidaUtil}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">
                            años
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`font-bold text-sm ${dep.yearsUsed >= asset.vidaUtil ? 'text-rose-600' : 'text-slate-700'}`}>
                            {dep.yearsUsed}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">años</span>
                          {dep.yearsUsed >= asset.vidaUtil && (
                            <p className="text-[10px] text-rose-500 mt-0.5">Vida útil agotada</p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-rose-600 font-medium">
                          -$
                          {dep.accumulatedDepreciation.toLocaleString('es-EC', {
                          minimumFractionDigits: 2
                        })}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                          className={`font-bold ${dep.isFullyDepreciated ? 'text-slate-400' : 'text-emerald-600'}`}>
                          
                            $
                            {dep.currentValue.toLocaleString('es-EC', {
                            minimumFractionDigits: 2
                          })}
                          </span>
                          {dep.isFullyDepreciated &&
                        <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                              Depreciado
                            </p>
                        }
                        </td>
                      </tr>);

                })}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* F3.2 Trazabilidad de Costos */}
          <motion.div
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: 0.1
          }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Receipt size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Trazabilidad de Adquisición (F3.2)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Agrupación por proveedor y documento
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-medium">Proveedor</th>
                    <th className="px-5 py-3 font-medium">Factura</th>
                    <th className="px-5 py-3 font-medium">Activo Adquirido</th>
                    <th className="px-5 py-3 font-medium text-right">
                      Valor Pagado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...assets].
                sort((a, b) => a.proveedor.localeCompare(b.proveedor)).
                map((asset, _index, arr) => {
                  // Highlight inconsistencies
                  const isAekia = asset.proveedor.includes('AEKIA');
                  const hasInconsistency =
                  isAekia &&
                  arr.some(
                    (a) =>
                    a.proveedor.includes('AEKIA') &&
                    a.proveedor !== asset.proveedor
                  );
                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50/50 transition-colors">
                      
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">
                                {asset.proveedor}
                              </span>
                              {hasInconsistency &&
                          <span
                            className="flex items-center gap-1 text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold"
                            title="Inconsistencia detectada en el nombre del proveedor">
                            
                                  <AlertCircle size={10} /> Inconsistente
                                </span>
                          }
                            </div>
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-600">
                            {asset.factura}
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-slate-900">
                              {asset.descripcion}
                            </p>
                            <p className="text-xs text-slate-500">
                              Item: {asset.itemProveedor}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-slate-900">
                            $
                            {asset.valor.toLocaleString('es-EC', {
                          minimumFractionDigits: 2
                        })}
                          </td>
                        </tr>);

                })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      }

      {activeTab === 'wishlist' &&
      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Lista de Compras Pendientes
              </h2>
              <p className="text-sm text-slate-500">
                Accesorios y herramientas por adquirir con gestión de proformas
              </p>
            </div>
            <button
            onClick={() => setIsAddWishlistOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors shadow-sm">
            
              <Plus size={16} />
              Nuevo Item
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-1">
                Total Items
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {totalWishlistItems}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-1">
                Valor Estimado Total
              </p>
              <p className="text-2xl font-bold text-slate-900">
                $
                {estimatedTotal.toLocaleString('es-EC', {
                minimumFractionDigits: 2
              })}
              </p>
            </div>
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 shadow-sm">
              <p className="text-xs font-medium text-rose-600 mb-1">
                Items Urgentes
              </p>
              <p className="text-2xl font-bold text-rose-700">{urgentItems}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
              <p className="text-xs font-medium text-amber-600 mb-1">
                Sin Proformas
              </p>
              <p className="text-2xl font-bold text-amber-700">
                {pendingProformas}
              </p>
            </div>
          </div>

          {/* Wishlist Cards */}
          <div className="space-y-4">
            {wishlist.map((item) => {
            const isExpanded = expandedItems.includes(item.id);
            const selectedProforma = item.proformas.find(
              (p) => p.seleccionada
            );
            return (
              <motion.div
                key={item.id}
                initial={{
                  opacity: 0,
                  y: 10
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                
                  {/* Card Header (Always visible) */}
                  <div
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(item.id)}>
                  
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-slate-900">
                          {item.descripcion}
                        </h3>
                        <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.prioridad === 'Alta' ? 'bg-rose-100 text-rose-700' : item.prioridad === 'Media' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        
                          {item.prioridad}
                        </span>
                        <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.estado === 'Comprado' ? 'bg-emerald-100 text-emerald-700' : item.estado === 'Aprobado' ? 'bg-blue-100 text-blue-700' : item.estado === 'Cotizando' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                        
                          {item.estado}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Tag size={14} /> {item.tipo}
                        </span>
                        <span>
                          {item.marca} {item.modelo}
                        </span>
                        <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          Cant: {item.cantidad}
                        </span>
                        {selectedProforma &&
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 size={14} />
                            Aprobado: $
                            {selectedProforma.valor.toLocaleString('es-EC', {
                          minimumFractionDigits: 2
                        })}
                          </span>
                      }
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-0.5">
                          Proformas
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {item.proformas.length}
                        </p>
                      </div>
                      <div className="p-2 text-slate-400 bg-slate-100 rounded-full">
                        {isExpanded ?
                      <ChevronUp size={20} /> :

                      <ChevronDown size={20} />
                      }
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded &&
                  <motion.div
                    initial={{
                      height: 0,
                      opacity: 0
                    }}
                    animate={{
                      height: 'auto',
                      opacity: 1
                    }}
                    exit={{
                      height: 0,
                      opacity: 0
                    }}
                    className="border-t border-slate-100 bg-slate-50/50">
                    
                        <div className="p-5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="md:col-span-2">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                Justificación
                              </p>
                              <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                                {item.justificacion}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                Solicitado Por
                              </p>
                              <p className="text-sm text-slate-900 font-medium">
                                {item.solicitadoPor}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Fecha: {item.fechaSolicitud}
                              </p>
                            </div>
                          </div>

                          {/* Proformas Section */}
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <FileText size={16} className="text-blue-500" />
                                Proformas y Cotizaciones
                              </h4>
                              <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWishlistId(item.id);
                              setIsAddProformaOpen(true);
                            }}
                            className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors border border-blue-200">
                            
                                + Agregar Proforma
                              </button>
                            </div>

                            {item.proformas.length === 0 ?
                        <div className="text-center py-6 bg-white rounded-lg border border-dashed border-slate-300">
                                <p className="text-sm text-slate-500">
                                  No hay proformas registradas para este item.
                                </p>
                              </div> :

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {item.proformas.map((proforma) =>
                          <div
                            key={proforma.id}
                            className={`p-4 rounded-xl border transition-all ${proforma.seleccionada ? 'bg-emerald-50 border-emerald-200 shadow-sm ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                            
                                    <div className="flex justify-between items-start mb-3">
                                      <div>
                                        <p className="font-bold text-slate-900">
                                          {proforma.proveedor}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {proforma.contacto}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-lg font-bold text-slate-900">
                                          $
                                          {proforma.valor.toLocaleString(
                                    'es-EC',
                                    {
                                      minimumFractionDigits: 2
                                    }
                                  )}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                          Total c/IVA
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">
                                        Validez: {proforma.validezDias} días
                                      </span>
                                      <span
                                className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium truncate max-w-[200px]"
                                title={proforma.condiciones}>
                                
                                        Cond: {proforma.condiciones}
                                      </span>
                                    </div>
                                    <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectProforma(
                                  item.id,
                                  proforma.id
                                );
                              }}
                              disabled={proforma.seleccionada}
                              className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${proforma.seleccionada ? 'bg-emerald-500 text-white cursor-default' : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200'}`}>
                              
                                      {proforma.seleccionada ?
                              '✓ Proforma Seleccionada' :
                              'Seleccionar esta Proforma'}
                                    </button>
                                  </div>
                          )}
                              </div>
                        }
                          </div>
                        </div>
                      </motion.div>
                  }
                  </AnimatePresence>
                </motion.div>);

          })}
          </div>
        </div>
      }

      <AddWishlistModal
        isOpen={isAddWishlistOpen}
        onClose={() => setIsAddWishlistOpen(false)}
        newWishlist={newWishlist}
        setNewWishlist={setNewWishlist}
        handleSaveWishlist={handleSaveWishlist}
      />

      <AddProformaModal
        isOpen={isAddProformaOpen}
        onClose={() => setIsAddProformaOpen(false)}
        newProforma={newProforma}
        setNewProforma={setNewProforma}
        handleSaveProforma={handleSaveProforma}
      />
    </div>);

}
