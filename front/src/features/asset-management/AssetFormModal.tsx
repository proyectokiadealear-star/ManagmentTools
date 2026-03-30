import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { Asset } from '../../data/mockData';
interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Asset) => void;
  initialData?: Asset | null;
}
const defaultAsset: Partial<Asset> = {
  codigo: '',
  descripcion: '',
  tipo: 'Equipo',
  marca: '',
  modelo: '',
  serial: '',
  placa: '',
  proveedor: '',
  factura: '',
  fechaCompra: '',
  valor: 0,
  ubicacion: '',
  area: '',
  bahia: '',
  rack: '',
  caja: '',
  responsable: '',
  custodio: '',
  encargado: '',
  estado: 'Activo',
  vidaUtil: 5,
  observacion: '',
  comentario: '',
  itemProveedor: '',
  capacidadEspecificacion: '',
  periodicidad: ''
};
export function AssetFormModal({
  isOpen,
  onClose,
  onSave,
  initialData
}: AssetFormModalProps) {
  const [formData, setFormData] = useState<Partial<Asset>>(defaultAsset);
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          ...defaultAsset,
          id: `A${Math.floor(Math.random() * 10000).
          toString().
          padStart(4, '0')}`
        });
      }
    }
  }, [isOpen, initialData]);
  const handleChange = (
  e: React.ChangeEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>

  {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'valor' || name === 'vidaUtil' ? Number(value) : value
    }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Asset);
    onClose();
  };
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{
          opacity: 0
        }}
        animate={{
          opacity: 1
        }}
        exit={{
          opacity: 0
        }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
            y: 20
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0
          }}
          exit={{
            opacity: 0,
            scale: 0.95,
            y: 20
          }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-900">
              {initialData ? 'Editar Activo' : 'Nuevo Activo'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form id="asset-form" onSubmit={handleSubmit} className="space-y-8">
              {/* Identificación */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                  Identificación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Código *
                    </label>
                    <input
                      required
                      type="text"
                      name="codigo"
                      value={formData.codigo}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Descripción *
                    </label>
                    <input
                      required
                      type="text"
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tipo
                    </label>
                    <select
                      name="tipo"
                      value={formData.tipo}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500">
                      
                      <option value="Equipo">Equipo</option>
                      <option value="Herramienta">Herramienta</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Conector">Conector</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Marca
                    </label>
                    <input
                      type="text"
                      name="marca"
                      value={formData.marca}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Modelo
                    </label>
                    <input
                      type="text"
                      name="modelo"
                      value={formData.modelo}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Serial
                    </label>
                    <input
                      type="text"
                      name="serial"
                      value={formData.serial}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Placa
                    </label>
                    <input
                      type="text"
                      name="placa"
                      value={formData.placa}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Estado
                    </label>
                    <select
                      name="estado"
                      value={formData.estado}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500">
                      
                      <option value="Activo">Activo</option>
                      <option value="En Reparación">En Reparación</option>
                      <option value="Dado de Baja">Dado de Baja</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                  Ubicación Física
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Área *
                    </label>
                    <select
                      name="area"
                      value={formData.area}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500">
                      <option value="">— Seleccionar área —</option>
                      <option value="Taller">Taller</option>
                      <option value="Recepción">Recepción</option>
                      <option value="Bodega">Bodega</option>
                      <option value="Administración">Administración</option>
                      <option value="EV / Híbridos">EV / Híbridos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Bahía
                    </label>
                    <select
                      name="bahia"
                      value={formData.bahia}
                      onChange={handleChange}
                      disabled={!formData.area}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-50 disabled:text-slate-400">
                      <option value="">
                        {formData.area ? '— Seleccionar bahía —' : '— Seleccione un área primero —'}
                      </option>
                      {(({
                        'Taller': ['Diagnóstico', 'Alineación y Balanceo', 'Mecánica General', 'Eléctrica', 'Lavado'],
                        'Recepción': ['Atención al Cliente', 'Entrega de Vehículos'],
                        'Bodega': ['Herramientas Especiales', 'Repuestos', 'Vehículos Eléctricos', 'General'],
                        'Administración': ['Oficina Jefe', 'Sala de Reuniones'],
                        'EV / Híbridos': ['Bahía EV-1', 'Bahía EV-2', 'Almacén EV'],
                      } as Record<string, string[]>)[formData.area ?? ''] ?? []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Rack / Estante
                    </label>
                    <input
                      type="text"
                      name="rack"
                      value={formData.rack ?? ''}
                      onChange={handleChange}
                      placeholder="ej. Estante B, Nivel 2"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Caja / Posición
                    </label>
                    <input
                      type="text"
                      name="caja"
                      value={formData.caja ?? ''}
                      onChange={handleChange}
                      placeholder="ej. Mesa de Trabajo - C. Mendoza"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                  </div>
                </div>
                <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-600">
                  Jerarquía: Área → Bahía → Rack → Caja (F1.1)
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ubicación (Texto Libre / Legado)
                  </label>
                  <input
                    type="text"
                    name="ubicacion"
                    value={formData.ubicacion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                </div>
              </div>

              {/* Responsabilidad */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                  Responsabilidad
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Responsable (Rol)
                    </label>
                    <select
                      name="responsable"
                      value={formData.responsable}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500">
                      <option value="">-- Seleccionar rol --</option>
                      <option value="Jefe de Taller">Jefe de Taller</option>
                      <option value="Jefe de Servicio">Jefe de Servicio</option>
                      <option value="Jefe de Repuestos">Jefe de Repuestos</option>
                      <option value="Técnico Líder">Técnico Líder</option>
                      <option value="Personal de Taller">Personal de Taller</option>
                      <option value="Gerente de Sucursal">Gerente de Sucursal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Custodio (Persona)
                    </label>
                    <select
                      name="custodio"
                      value={formData.custodio}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500">
                      <option value="">-- Seleccionar persona --</option>
                      <option value="Carlos Mendoza">Carlos Mendoza</option>
                      <option value="Ana Torres">Ana Torres</option>
                      <option value="Luis Pérez">Luis Pérez</option>
                      <option value="Roberto Gómez">Roberto Gómez</option>
                      <option value="Miguel Sánchez">Miguel Sánchez</option>
                      <option value="Bodeguero / Repuestos SURMOTOR">Bodeguero / Repuestos SURMOTOR</option>
                      <option value="Soporte IT">Soporte IT</option>
                      <option value="Bodega Central">Bodega Central</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                    <span>ℹ️</span>
                    <span><strong>F2.1:</strong> El Responsable es el rol que responde institucionalmente. El Custodio es la persona física que tiene el activo.</span>
                  </div>
                </div>
              </div>

              {/* Adquisición */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                  Adquisición
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Proveedor
                    </label>
                    <input
                      type="text"
                      name="proveedor"
                      value={formData.proveedor}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Factura
                    </label>
                    <input
                      type="text"
                      name="factura"
                      value={formData.factura}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Fecha Compra
                    </label>
                    <input
                      type="text"
                      name="fechaCompra"
                      value={formData.fechaCompra}
                      onChange={handleChange}
                      placeholder="ej. 28-oct-22"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Valor ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="valor"
                      value={formData.valor}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Vida Útil (Años)
                    </label>
                    <input
                      type="number"
                      name="vidaUtil"
                      value={formData.vidaUtil}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                  Observaciones
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Especificaciones
                    </label>
                    <input
                      type="text"
                      name="capacidadEspecificacion"
                      value={formData.capacidadEspecificacion}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Observación
                    </label>
                    <textarea
                      name="observacion"
                      value={formData.observacion}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500" />
                    
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              
              Cancelar
            </button>
            <button
              type="submit"
              form="asset-form"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors">
              
              <Save size={16} />
              Guardar Activo
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>);

}
