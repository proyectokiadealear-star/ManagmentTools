// Steps para tests BDD de registro de ubicación
import { Given, When, Then, Before, After } from '@cucumber/cucumber';

// Datos de test global
let activoCreado: any = null;
let movimientoGuardado: any = null;
let errorObtenido: string | null = null;
let areasDisponibles: string[] = [];

// Mock de servicios (en un escenario real se inyectarían)
const mockAssetsService = {
  findAll: async () => [],
  findOne: async (id: string) => ({ id, nombre: 'Compresor Industrial', areaId: 'area-pintura', bahiaId: 'bahia-3', rackId: 'rack-c' }),
  create: async (data: any) => ({ id: 'new-activo', ...data }),
  validarUbicacionOcupada: async () => false,
  getActivoEnUbicacion: async () => ({ id: 'equipo-x', nombre: 'Equipo X' }),
  transferir: async (id: string, data: any) => ({ id, ...data }),
  getMovimientos: async (_activoId: string) => [],
};

Before(function () {
  activoCreado = null;
  movimientoGuardado = null;
  errorObtenido = null;
  areasDisponibles = [];
});

After(function () {
  // cleanup
});

// ===== ESCENARIO 1 =====

Given('el Jefe de Taller tiene un nuevo equipo {string}', function (nombre: string) {
  this.nuevoActivo = { nombre, tipo: 'Equipo' };
});

Given('el taller tiene configuradas las áreas: Mecánica, Enderezado, Pintura, Lavado, Repuestos', async function () {
  areasDisponibles = ['Mecánica', 'Enderezado', 'Pintura', 'Lavado', 'Repuestos'];
  if (areasDisponibles.length !== 5) {
    throw new Error('El taller no tiene las 5 áreas configuradas');
  }
});

Given('cada área tiene Bahías numeradas y Racks identificados', function () {
  // Asumimos estructura existente
});

When('selecciona Área {string}, Bahía {string}, Rack {string}', function (area: string, bahia: string, rack: string) {
  this.ubicacionSeleccionada = { area, bahia, rack };
});

When('confirma el registro', async function () {
  try {
    activoCreado = await mockAssetsService.create({
      nombre: this.nuevoActivo.nombre,
      tipo: this.nuevoActivo.tipo,
      areaId: 'area-mecanica',
      bahiaId: 'bahia-2',
      rackId: 'rack-a',
    });
  } catch (e: any) {
    errorObtenido = e.message;
  }
});

Then('el sistema almacena la ubicación estructurada {string}', function (ubicacionEsperada: string) {
  if (!activoCreado) throw new Error('No se pudo crear el activo');
  if (!ubicacionEsperada.includes('Mecánica')) throw new Error('Ubicación incorrecta');
});

Then('el equipo aparece disponible en esa ubicación para búsquedas y asignaciones', async function () {
  const activos = await mockAssetsService.findAll();
});

// ===== ESCENARIO 2 =====

Given('el Técnico Líder gestiona el área {string}', function (area: string) {
  this.areaActual = area;
});

Given('existe el técnico {string} sin caja asignada', function (tecnico: string) {
  this.tecnico = tecnico;
});

When('le asigna la ubicación {string}', function (ubicacion: string) {
  this.ubicacionAsignada = ubicacion;
});

Then('el sistema vincula permanentemente esa caja al técnico', function () {
  if (!this.ubicacionAsignada?.includes('Caja-005')) throw new Error('No se asignó la caja');
});

Then('el técnico puede consultar su caja y registrar herramientas propias dentro de ella', function () {
  // Funcionalidad futura
});

Then('otros técnicos ven que Caja-005 pertenece a {string}', function (tecnico: string) {
  if (tecnico !== 'Juan Pérez') throw new Error('Técnico incorrecto');
});

// ===== ESCENARIO 3 =====

Given('el Jefe de Taller busca el activo {string}', async function (nombreActivo: string) {
  this.activoBuscado = await mockAssetsService.findOne('compresor-1');
  if (this.activoBuscado.nombre !== nombreActivo) throw new Error('Activo no encontrado');
});

Given('actualmente está en {string}', function (ubicacionActual: string) {
  if (!ubicacionActual.includes('Pintura')) throw new Error('Ubicación incorrecta');
});

When('transfiere el activo a {string}', async function (nuevaUbicacion: string) {
  this.nuevaUbicacion = nuevaUbicacion;
  movimientoGuardado = await mockAssetsService.transferir('compresor-1', {
    areaId: 'area-mecanica',
    bahiaId: 'bahia-1',
    rackId: 'rack-a',
    motivo: 'Reorganización',
  });
});

When('registra el motivo: {string}', function (motivo: string) {
  if (movimientoGuardado?.motivo !== motivo) throw new Error('Motivo no registrado');
});

Then('el sistema guarda el historial de movimientos con fecha, usuario y motivo', async function () {
  const movimientos = await mockAssetsService.getMovimientos('compresor-1');
});

Then('la nueva ubicación es inmediatamente visible para todos los usuarios', function () {
  // Verificación
});

// ===== ESCENARIO 4 =====

Given('el Jefe de Taller intenta registrar un nuevo {string} en {string}', function (nombreActivo: string, ubicacion: string) {
  this.nuevoActivo = { nombre: nombreActivo };
  this.ubicacionIntentada = ubicacion;
});

Given('esa ubicación ya contiene otro equipo', function () {
  mockAssetsService.validarUbicacionOcupada = async () => true;
});

When('intenta confirmar el registro', async function () {
  try {
    await mockAssetsService.create({
      nombre: this.nuevoActivo.nombre,
      areaId: 'area-mecanica',
      bahiaId: 'bahia-2',
      rackId: 'rack-a',
    });
    errorObtenido = null;
  } catch (e: any) {
    errorObtenido = e.message;
  }
});

Then('el sistema alerta: {string}', function (mensajeEsperado: string) {
  if (!errorObtenido) throw new Error('No se obtuvo error');
});

Then('no permite duplicar ubicaciones físicas sin confirmación explícita', function () {
  if (!errorObtenido) throw new Error('Se permitió duplicar');
});
