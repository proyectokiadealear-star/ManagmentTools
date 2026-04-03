# Proposal: Feature — Designación de Responsables por Área o Equipo

## Intent

El sistema SURMOTOR actualmente rastrea custodios **por activo individual** (campo `custodio` en `Asset`),
pero no existe ningún mecanismo para designar quién es responsable de un **área completa** (ej. "Cabina de
Pintura"), una **bahía** o una **caja** durante un período de tiempo determinado.

Esto genera dos problemas concretos:

1. **Brecha de trazabilidad organizacional**: Si algo ocurre en el Área de Mecánica, el sistema no puede
   responder "¿quién era el responsable en ese momento?". Solo puede decir quién custodia cada activo
   individualmente.
2. **Duplicidad de responsabilidad**: Sin validación de unicidad, varios usuarios podrían reclamar
   responsabilidad sobre la misma área simultáneamente, sin que el sistema lo detecte ni lo resuelva.

Esta feature incorpora una capa de **responsabilidad por unidad organizacional** con: períodos temporales,
historial de designaciones, validación de unicidad activa y flujos diferenciados por rol (`jefe` puede
asignar áreas, `tecnico` puede asignar cajas).

---

## Scope

### In Scope

- Nuevo módulo frontend: `front/src/features/asset-management/AreaResponsibility.tsx`
- Tipos mock: `AreaAssignment` con campos `areaId`, `personaId`, `desde`, `hasta?`, `permisos[]`, `estado`
- Catálogo mock de personas: `mockPersonnel` — lista fija de strings que reemplaza los hardcodes actuales
- Catálogo mock de áreas/cajas: `mockAreas` y `mockCajas` — extraídos del seed del backend
- Vista principal con dos paneles: **Asignaciones Activas** + **Historial de Designaciones**
- Modal de asignación: selector de área/caja, selector de persona, permisos checkboxes, fecha inicio
- Flujo de reasignación: cierra período anterior (`hasta = hoy`) + abre nuevo registro en una sola transacción mock
- Validación de unicidad activa: si el área ya tiene responsable → diálogo modal con 3 opciones:
  **Reasignar** / **Co-responsable** / **Cancelar**
- Notificación mock (toast/banner) al responsable designado
- Control de acceso por rol:
  - `jefe`: puede asignar/reasignar áreas y bahías
  - `tecnico`: puede asignar/reasignar cajas
  - `personal`: solo lectura (no ve el botón "Asignar")
- Registro de período: `desde` (requerido) y `hasta` (vacío = activo actualmente)
- Nueva ruta `/area-responsibility` en `App.tsx`
- Nuevo ítem en `Sidebar.tsx` para roles `tecnico` y `jefe`
- Estado React local (`useState`) — sin modificar `AssetContext` ni su reducer

### Out of Scope

- Integración con backend real (NestJS / Firebase) — modo mock puro
- Modificar el tipo `Asset` ni sus campos `responsable`/`custodio`
- Modificar `Custody.tsx`, `AssetFormModal.tsx` o `AssetContext`
- Sistema de notificaciones real (email, push, websocket)
- Gestión CRUD de áreas/bahías/cajas (solo lectura de catálogo mock)
- Permisos granulares en tiempo de ejecución (RBAC real) — solo visual
- Exportación de reportes de responsabilidades
- Integración con módulo de mantenimiento o préstamos

---

## Approach

Implementación **frontend puro con mock data**, sin contacto con el backend NestJS.

### Capa de datos mock

Se agrega en `front/src/data/mockData.ts`:

```ts
// Personas disponibles (reemplaza strings hardcodeados dispersos)
export const mockPersonnel: Personnel[] = [...]

// Áreas y cajas tomadas del seed del backend (locations.service.ts)
export const mockAreas: AreaMock[] = [
  { id: 'area-1', nombre: 'Mecánica' },
  { id: 'area-2', nombre: 'Enderezado' },
  { id: 'area-3', nombre: 'Pintura / Cabina' },
  { id: 'area-4', nombre: 'Lavado' },
  { id: 'area-5', nombre: 'Repuestos / Bodega' },
]

export const mockCajas: CajaMock[] = [...]

// Asignaciones de responsabilidad (estado inicial con 2-3 entradas)
export const mockAreaAssignments: AreaAssignment[] = [...]
```

### Tipos nuevos

```ts
export interface Personnel {
  id: string;
  nombre: string;
  cargo: string;
  rol: UserRole;
}

export type NivelUbicacion = 'area' | 'bahia' | 'caja';

export interface AreaAssignment {
  id: string;
  nivelUbicacion: NivelUbicacion;
  ubicacionId: string;
  ubicacionNombre: string;
  personaId: string;
  personaNombre: string;
  desde: string;        // ISO date
  hasta?: string;       // ISO date — vacío = activo
  permisos: string[];
  estado: 'activo' | 'cerrado';
  asignadoPor: string;  // nombre del autorizador
  notificado: boolean;
}
```

### Componente principal

`AreaResponsibility.tsx` con:
- Hook `useAreaAssignments` (estado local con `useState`, inicializado desde `mockAreaAssignments`)
- Panel izquierdo: tabla de asignaciones activas con badge de área y persona, botón "Reasignar" por fila
- Panel derecho: timeline de historial (mismo patrón visual que `Custody.tsx`)
- FAB o botón header "Nueva Designación" — solo visible para `jefe` y `tecnico`

### Flujos críticos

**Asignación nueva** (no hay responsable activo en el área):
1. Modal abre → selección área/persona/permisos/fecha
2. Submit → `dispatch`-like local: push a `assignments` array
3. Toast mock: "Carlos Mendoza notificado como responsable de Cabina de Pintura"

**Reasignación** (ya existe responsable activo):
1. Al seleccionar área en modal → sistema detecta conflicto
2. Diálogo de conflicto: **Reasignar** / **Agregar Co-responsable** / **Cancelar**
3. Si "Reasignar": cierra registro anterior (`hasta = hoy`) + crea nuevo
4. Si "Co-responsable": crea segundo registro activo para misma área (sin cerrar el anterior)

**Solo lectura** (rol `personal`):
- Vista filtrada: solo ve sus propias asignaciones activas
- No ve botón "Nueva Designación" ni "Reasignar"

### Integración de ruta

```tsx
// App.tsx — agregar:
import { AreaResponsibility } from '@features/asset-management/AreaResponsibility';
<Route path="/area-responsibility" element={<AreaResponsibility />} />

// Sidebar.tsx — agregar ítem:
{ path: '/area-responsibility', label: 'Responsables (F3)', icon: MapPin, roles: ['tecnico', 'jefe'] }
```

---

## Affected Files

| Área | Impacto | Descripción |
|------|---------|-------------|
| `front/src/data/mockData.ts` | Modificado | Agregar `Personnel`, `AreaMock`, `CajaMock`, `AreaAssignment`, y sus arrays mock |
| `front/src/features/asset-management/AreaResponsibility.tsx` | **Nuevo** | Componente principal de la feature |
| `front/src/App.tsx` | Modificado | Nueva ruta `/area-responsibility` |
| `front/src/features/navigation/Sidebar.tsx` | Modificado | Nuevo ítem de navegación con `MapPin` icon |

**No se toca:**

| Archivo | Razón de exclusión |
|---------|-------------------|
| `front/src/shared/context/AssetContext.tsx` | El estado de asignaciones es local al feature, no global |
| `front/src/features/asset-management/Custody.tsx` | Feature distinto — custodia de activos individuales |
| `front/src/features/asset-management/AssetFormModal.tsx` | Campos `responsable`/`custodio` no cambian |
| `back/` (todo el backend) | Mock puro — sin tocar NestJS ni Firebase |

---

## Rollback Plan

1. Revertir los 4 archivos modificados/creados:
   - Eliminar `AreaResponsibility.tsx`
   - Revertir los bloques añadidos a `mockData.ts` (tipos e interfaces al final del archivo)
   - Revertir el import + `<Route>` en `App.tsx`
   - Revertir el ítem de navegación en `Sidebar.tsx`
2. El rollback es quirúrgico y no afecta ninguna feature existente — todos los cambios son aditivos
3. No hay migraciones de estado persistido (localStorage) que revertir

---

## Risks

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Contaminación del `mockData.ts` (archivo ya es grande) | Media | Agregar tipos e interfaces al final del archivo con comentario delimitador claro; considerar separar en `mockData.responsibilities.ts` si el archivo supera 1000 líneas antes de la feature |
| Confusión semántica entre `Custody` (activo individual) y `AreaResponsibility` (unidad organizacional) | Media | Naming explícito: `AreaAssignment` vs `CustodyTransfer`; labels de UI diferenciados; prop `nivelUbicacion` |
| Rol `personal` accede a ruta directamente por URL | Baja | Validar rol en el componente con `useRole()` y mostrar pantalla "Sin acceso" en lugar de contenido |
| Demasiada lógica de negocio en un solo componente | Media | Extraer hook `useAreaAssignments` para contener toda la lógica de asignación/reasignación |
| Duplicación de catálogo de personas con otras features | Baja | Centralizar en `mockPersonnel` exportado desde `mockData.ts`; es dato mock, no hay DB que sincronizar |

---

## Success Criteria

- [ ] **Escenario 1 — Asignación nueva**: Rol `jefe` puede designar "Carlos Mendoza" como responsable de "Cabina de Pintura" con permisos seleccionados; la asignación aparece en el panel de activos con fecha de inicio correcta y toast de notificación visible
- [ ] **Escenario 2 — Asignación de caja**: Rol `tecnico` puede asignar "Pedro Sánchez" a "Caja-007"; rol `personal` no ve el botón de asignar
- [ ] **Escenario 3 — Reasignación con historial**: Reasignar un área cierra la asignación anterior (`hasta = fecha actual`) y crea una nueva; el historial muestra ambos registros con sus períodos correctos
- [ ] **Escenario 4 — Validación de unicidad**: Intentar asignar un segundo responsable a un área con responsable activo muestra el diálogo de conflicto con las 3 opciones; "Cancelar" no modifica el estado
- [ ] **No regresión**: `Custody.tsx`, `AssetFormModal.tsx`, `AssetContext` y el reducer no presentan cambios funcionales ni errores de compilación TypeScript
- [ ] **Compilación limpia**: `npm run build` en `front/` pasa sin errores ni warnings nuevos
