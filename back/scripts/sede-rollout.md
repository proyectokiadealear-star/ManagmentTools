# Runbook — Rollout de normalización de `activo.sede`

## Objetivo

Normalizar activos legacy para que `activo.sede` quede alineada con `areaId -> areas.sede`.

## Prerrequisitos

- Backend desplegado con derivación de sede desde `areaId` en create/update/transferir.
- Variables Firebase configuradas en `back/.env`.
- Ventana operativa definida para ejecutar el backfill.

## Paso 1: Diagnóstico pre-ejecución

```bash
npm run sede:diagnostico
```

Validar métricas clave:
- `Sin sede (legacy)`
- `Sede inconsistente vs área`
- `Requieren normalización`

## Paso 2: Simulación (dry-run)

```bash
npm run sede:backfill
```

Debe mostrar candidatos > 0 y `Actualizados: 0`.

## Paso 3: Ejecución controlada (apply)

```bash
npm run sede:backfill -- apply
```

Registrar resultados:
- Evaluados
- Candidatos a normalizar
- Actualizados
- Errores

## Paso 4: Verificación post-ejecución

```bash
npm run sede:diagnostico
```

Esperado:
- `Sin sede (legacy) = 0` (o residual explicado)
- `Sede inconsistente vs área = 0` (o residual explicado)

## Checklist de cierre (criterio 5.3)

- [ ] Backfill ejecutado en entorno objetivo con evidencia pre/post.
- [ ] Monitoreo de búsquedas por sede+área sin regresiones.
- [ ] Incidentes de datos inconsistentes = 0 en ventana de estabilización acordada.
- [ ] Decisión formal de retiro de fallback legacy documentada.
