import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Database,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { DataQualityIssue } from '../../data/mockData';

export function DataQuality() {
  const [issues, setIssues] = useState<DataQualityIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // TODO: Replace with real API endpoint when available
        // const data = await httpClient.get<DataQualityIssue[]>('/api/activos/calidad');
        // if (!cancelled) setIssues(data);
        if (!cancelled) setIssues([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
      y: 0
    }
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
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="text-rose-500" />
            Dashboard de Calidad de Datos
          </h1>
          <p className="text-slate-500 mt-1">
            Análisis del dataset original y problemas detectados que impiden la
            automatización.
          </p>
        </div>
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm shadow-sm">
          <Database size={18} />
          {issues.length} Problemas Estructurales
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {issues.map((issue, index) =>
        <motion.div
          key={index}
          variants={itemVariants}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          
            <div
            className={`h-1 w-full ${issue.severidad === 'Alta' ? 'bg-rose-500' : issue.severidad === 'Media' ? 'bg-amber-500' : 'bg-blue-500'}`} />
          
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-slate-900 text-lg">
                  {issue.campo}
                </h3>
                <span
                className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${issue.severidad === 'Alta' ? 'bg-rose-100 text-rose-700' : issue.severidad === 'Media' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                
                  {issue.severidad}
                </span>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Problema Detectado
                  </p>
                  <p className="text-sm text-slate-800 font-medium flex items-start gap-2">
                    <AlertTriangle
                    size={16}
                    className="text-amber-500 shrink-0 mt-0.5" />
                  
                    {issue.problema}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Impacto en el Sistema
                  </p>
                  <p className="text-sm text-slate-600">{issue.impacto}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-auto">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Ejemplos del Dataset
                  </p>
                  <p className="text-sm font-mono text-slate-700 break-words">
                    {issue.ejemplos}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2 mb-2">
          <CheckCircle2 className="text-emerald-600" />
          Solución Propuesta (Modelo Normalizado)
        </h3>
        <p className="text-emerald-800 text-sm">
          El nuevo sistema implementa un modelo de datos relacional que resuelve
          estos problemas: catálogos estructurados para ubicaciones (Área/Zona),
          separación estricta de entidades (Rol vs Persona), tipos de datos
          nativos para fechas y numéricos, y consolidación de campos de texto
          libre.
        </p>
      </div>
    </div>);

}
