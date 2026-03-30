import React from 'react';
import { HardHat, UserCog, ClipboardCheck } from 'lucide-react';

export type UserRole = 'personal' | 'tecnico' | 'jefe';

export interface RoleProfile {
  role: UserRole;
  nombre: string;
  cargo: string;
  iniciales: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  descripcion: string;
  accesos: string[];
}

export const roleProfiles: RoleProfile[] = [
  {
    role: 'personal',
    nombre: 'Juan Castro',
    cargo: 'Personal de Taller',
    iniciales: 'JC',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: HardHat,
    descripcion: 'Ejecuta mantenimientos, registra actividades del día a día.',
    accesos: ['Ver cronograma de mantenimientos', 'Recibir alertas de vencimiento', 'Registrar ejecución de tareas'],
  },
  {
    role: 'tecnico',
    nombre: 'Carlos Mendoza',
    cargo: 'Técnico Líder',
    iniciales: 'CM',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: UserCog,
    descripcion: 'Supervisa el taller, gestiona cotizaciones y documenta fallas.',
    accesos: ['Cronograma con alertas semáforo', 'Flujo de cotizaciones comparativas', 'Registro de fallas correctivas'],
  },
  {
    role: 'jefe',
    nombre: 'Roberto Gómez',
    cargo: 'Jefe de Taller',
    iniciales: 'RG',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: ClipboardCheck,
    descripcion: 'Aprueba decisiones, audita procesos y evalúa reparar vs. reemplazar.',
    accesos: ['Trazabilidad de aprobaciones', 'KPIs tiempo de respuesta gerencia', 'Alerta reparar vs. reemplazar'],
  },
];
