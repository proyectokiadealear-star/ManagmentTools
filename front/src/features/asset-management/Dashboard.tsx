import { motion } from 'framer-motion';
import { Package, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import { KPICard } from './KPICard';
import { useAssets } from '@shared/context/AssetContext';

export function Dashboard() {
  const assets = useAssets();
  const totalAssets = assets.length;
  const activeAssets = assets.filter((a) => a.estado === 'Activo').length;
  const repairAssets = assets.filter((a) => a.estado === 'En Reparación').length;
  const totalValue = assets.reduce((sum, a) => sum + a.valor, 0);
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    }
  };
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard General</h1>
        <p className="text-slate-500 mt-1">
          Resumen del estado de activos de SURMOTOR
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        <motion.div variants={itemVariants}>
          <KPICard
            title="Total Activos"
            value={totalAssets}
            icon={Package}
            color="blue"
            subtitle="Registrados en sistema" />
          
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="Activos Operativos"
            value={activeAssets}
            icon={CheckCircle2}
            color="green"
            trend="up"
            trendValue="+2% vs mes anterior" />
          
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="En Reparación"
            value={repairAssets}
            icon={AlertTriangle}
            color="amber"
            subtitle="Requieren atención" />
          
        </motion.div>
        <motion.div variants={itemVariants}>
          <KPICard
            title="Valor Total Adquisición"
            value={`$${totalValue.toLocaleString('es-EC')}`}
            icon={DollarSign}
            color="slate"
            subtitle="Costo histórico" />
          
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            delay: 0.4
          }}
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Activos Recientes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Ubicación</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {assets.slice(0, 4).map((asset) =>
                <tr
                  key={asset.id}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {asset.codigo}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {asset.descripcion}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {asset.area || asset.ubicacion}
                    </td>
                    <td className="px-4 py-3">
                      <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${asset.estado === 'Activo' ? 'bg-emerald-100 text-emerald-700' : asset.estado === 'En Reparación' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      
                        {asset.estado}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

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
            delay: 0.5
          }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Distribución por Área
          </h3>
          <div className="space-y-4">
            {[
            {
              area: 'Taller Mecánica',
              count: 2,
              color: 'bg-blue-500'
            },
            {
              area: 'Bodega Repuestos',
              count: 2,
              color: 'bg-amber-500'
            },
            {
              area: 'Recepción',
              count: 1,
              color: 'bg-emerald-500'
            }].
            map((item) =>
            <div key={item.area}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">
                    {item.area}
                  </span>
                  <span className="text-slate-500">{item.count}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                  className={`${item.color} h-2 rounded-full`}
                  style={{
                    width: `${item.count / totalAssets * 100}%`
                  }}>
                </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>);

}
