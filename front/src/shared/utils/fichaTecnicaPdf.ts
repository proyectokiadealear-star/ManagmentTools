/**
 * fichaTecnicaPdf.ts — Genera la "Ficha Técnica de Equipos" en PDF.
 *
 * Uses jsPDF + jspdf-autotable for symmetric, professional layouts.
 * Exports:
 *   generateFichaTecnicaBlob(asset) → Blob   (for preview)
 *   generateFichaTecnicaPdf(asset)  → void   (direct download)
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Asset } from '../../data/mockData';
import { httpClient } from '../../services/httpClient';
import { environment } from '../../environments/environment';
import { calcDepreciation } from './depreciation';

// ─── Palette ──────────────────────────────────────────────────────────────────
const NAVY   = [26,  32,  60]  as [number, number, number];
const GREY   = [240, 242, 247] as [number, number, number];
const LIGHT  = [250, 250, 252] as [number, number, number];
const BORDER = [200, 200, 210] as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Mantenimiento {
  id: string;
  activoId: string;
  tipo: 'preventivo' | 'correctivo' | 'calibracion';
  descripcion: string;
  proveedorNombre: string;
  costoFinal: number;
  fechaProgramada?: string;
  fechaRealizada: string;
  observaciones: string;
  realizadoPor: string;
}

interface ProgramacionMantenimiento {
  id: string;
  activoId: string;
  activoNombre: string;
  tipo: 'preventivo' | 'calibracion';
  periodicidadDias: number;
  ultimoMantenimiento?: string;
  proximoMantenimiento: string;
  proveedorHabitual?: string;
  responsableNombre: string;
  estado: 'vigente' | 'vencido' | 'proximo' | 'cancelado';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safe = (val: string | number | undefined | null): string =>
  val !== undefined && val !== null && val !== '' ? String(val) : '—';

function formatCurrency(val: number | undefined): string {
  if (val === undefined || val === null) return '—';
  return `$${val.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string | undefined): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

// ─── Image loader ─────────────────────────────────────────────────────────────

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ─── Fetch maintenance data ───────────────────────────────────────────────────

async function fetchMantenimientos(activoId: string): Promise<Mantenimiento[]> {
  try {
    return await httpClient.get<Mantenimiento[]>(`/api/mantenimientos?activoId=${activoId}`);
  } catch { return []; }
}

async function fetchProgramaciones(activoId: string): Promise<ProgramacionMantenimiento[]> {
  try {
    const all = await httpClient.get<ProgramacionMantenimiento[]>('/api/mantenimientos/programacion');
    return all.filter((p) => p.activoId === activoId);
  } catch { return []; }
}

// ─── Section header helper ────────────────────────────────────────────────────

function drawSectionHeader(doc: jsPDF, x: number, y: number, w: number, title: string): number {
  doc.setFillColor(...NAVY);
  doc.rect(x, y, w, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(title, x + w / 2, y + 5, { align: 'center' });
  return y + 7;
}

// ─── autoTable style defaults ────────────────────────────────────────────────

function tableStyles() {
  return {
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      textColor: [30, 30, 30] as [number, number, number],
      lineColor: BORDER,
      lineWidth: 0.25,
      overflow: 'linebreak' as const,
    },
    theme: 'grid' as const,
  };
}

// ─── Core build: returns jsPDF document ──────────────────────────────────────

async function buildDoc(asset: Asset): Promise<jsPDF> {
  const [mantenimientos, programaciones, imageBase64] = await Promise.all([
    fetchMantenimientos(asset.id),
    fetchProgramaciones(asset.id),
    asset.imagenUrl
      ? loadImageAsBase64(`${environment.apiUrl}/api/activos/${asset.id}/imagen-proxy`)
      : Promise.resolve(null),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const margin = 13;
  const cW     = pageW - margin * 2;   // 184 mm
  // column plan: label=42, value=50, label=42, value=50 → total=184 ✓
  const L = 42, V = 50;

  let y = margin;

  // ══════════════════════════════════════════════════════════════════════
  //  HEADER
  // ══════════════════════════════════════════════════════════════════════
  const hH = 30;
  const photoW = 52;
  const textW  = cW - photoW;

  doc.setFillColor(...NAVY);
  doc.rect(margin, y, cW, hH, 'F');

  // --- Photo block (right side) ---
  const pX = margin + textW + 1;
  const pY = y + 2;
  const pW = photoW - 3;
  const pH = hH - 4;

  if (imageBase64) {
    try {
      doc.addImage(imageBase64, 'JPEG', pX, pY, pW, pH, undefined, 'FAST');
    } catch {
      doc.setFillColor(40, 50, 80);
      doc.rect(pX, pY, pW, pH, 'F');
    }
  } else {
    doc.setFillColor(40, 50, 80);
    doc.rect(pX, pY, pW, pH, 'F');
    doc.setFontSize(6);
    doc.setTextColor(150, 160, 180);
    doc.text('Sin imagen', pX + pW / 2, pY + pH / 2 + 1, { align: 'center' });
  }
  // thin white frame around photo
  doc.setDrawColor(...WHITE);
  doc.setLineWidth(0.4);
  doc.rect(pX, pY, pW, pH, 'S');

  // --- Text block (left side) ---
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SURMOTOR', margin + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Concesionario Autorizado KIA', margin + 4, y + 16.5);

  // divider line
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(margin + 4, y + 18.5, margin + textW - 4, y + 18.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('FICHA TÉCNICA DE EQUIPOS', margin + 4, y + 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(190, 200, 220);
  doc.text(`Gestión de Activos — ${formatDate(new Date().toISOString())}`, margin + 4, y + 29.5);

  y += hH + 1;

  // ══════════════════════════════════════════════════════════════════════
  //  INFO BAR (código / placa / estado)
  // ══════════════════════════════════════════════════════════════════════
  autoTable(doc, {
    startY: y,
    body: [[
      `Código: ${safe(asset.codigo)}`,
      `Placa: ${safe(asset.placa)}`,
      `Estado: ${safe(asset.estado)}`,
      `Custodio: ${safe(asset.custodio)}`,
    ]],
    theme: 'plain',
    styles: {
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
      textColor: WHITE,
      fillColor: [40, 50, 85] as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: cW / 4 },
      1: { cellWidth: cW / 4 },
      2: { cellWidth: cW / 4 },
      3: { cellWidth: cW / 4 },
    },
    margin: { left: margin, right: margin },
    tableWidth: cW,
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // ══════════════════════════════════════════════════════════════════════
  //  SECCIÓN 1 — Datos generales  (4-col symmetric: L|V|L|V)
  // ══════════════════════════════════════════════════════════════════════
  y = drawSectionHeader(doc, margin, y, cW, 'DATOS GENERALES DEL EQUIPO');

  autoTable(doc, {
    startY: y,
    body: [
      ['NOMBRE / DESCRIPCIÓN', safe(asset.descripcion), 'CÓD. INVENTARIO', safe(asset.codigo)],
      ['FABRICANTE / MARCA',   safe(asset.marca),        'MODELO',          safe(asset.modelo)],
      ['TIPO DE EQUIPO',       safe(asset.tipo),         'N° SERIE',        safe(asset.serial)],
      ['PLACA',                safe(asset.placa),        'ESTADO',          safe(asset.estado)],
      ['SECCIÓN / ÁREA',       safe(asset.area),         'UBICACIÓN',       safe(asset.ubicacion || asset.bahia || '—')],
      ['RESPONSABLE',          safe(asset.responsable),  'CUSTODIO',        safe(asset.custodio)],
    ],
    ...tableStyles(),
    columnStyles: {
      0: { fillColor: GREY, fontStyle: 'bold', cellWidth: L },
      1: { fillColor: LIGHT, cellWidth: V },
      2: { fillColor: GREY, fontStyle: 'bold', cellWidth: L },
      3: { fillColor: LIGHT, cellWidth: V },
    },
    margin: { left: margin, right: margin },
    tableWidth: cW,
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // ══════════════════════════════════════════════════════════════════════
  //  SECCIÓN 2 — Características técnicas  (2-col: label=60, value=124)
  // ══════════════════════════════════════════════════════════════════════
  y = drawSectionHeader(doc, margin, y, cW, 'CARACTERÍSTICAS TÉCNICAS');

  const techRows: [string, string][] = [
    ['ESPECIFICACIÓN / CAPACIDAD', safe(asset.capacidadEspecificacion)],
    ['PERIODICIDAD DE MANTENIMIENTO', safe(asset.periodicidad)],
    ['PROVEEDOR HABITUAL', safe(asset.proveedor)],
    ['ÍTEM / REF. PROVEEDOR', safe(asset.itemProveedor)],
    ['N° FACTURA ADQUISICIÓN', safe(asset.factura)],
    ['OBSERVACIONES', safe(asset.observacion)],
  ].filter(r => r[1] !== '—') as [string, string][];

  if (techRows.length === 0) techRows.push(['Sin datos técnicos adicionales', '']);

  autoTable(doc, {
    startY: y,
    body: techRows,
    ...tableStyles(),
    columnStyles: {
      0: { fillColor: GREY, fontStyle: 'bold', cellWidth: 60 },
      1: { fillColor: LIGHT, cellWidth: cW - 60 },
    },
    margin: { left: margin, right: margin },
    tableWidth: cW,
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // ══════════════════════════════════════════════════════════════════════
  //  SECCIÓN 3 — Planificación de mantenimiento
  // ══════════════════════════════════════════════════════════════════════
  y = drawSectionHeader(doc, margin, y, cW, 'PLANIFICACIÓN DE MANTENIMIENTO');

  const maintPlanRows: string[][] = programaciones.length > 0
    ? programaciones.map(p => [
        safe(asset.descripcion),
        'SÍ',
        '',
        p.periodicidadDias ? `Cada ${p.periodicidadDias} días (${p.tipo})` : p.tipo,
        safe(p.proveedorHabitual),
        safe(p.responsableNombre),
      ])
    : [[
        safe(asset.descripcion),
        asset.periodicidad && asset.periodicidad !== 'N/A' ? 'SÍ' : 'NO',
        asset.periodicidad && asset.periodicidad !== 'N/A' ? '' : 'X',
        safe(asset.periodicidad),
        safe(asset.proveedor),
        safe(asset.responsable),
      ]];

  autoTable(doc, {
    startY: y,
    head: [['EQUIPO', 'APLICA', 'NO APLICA', 'FRECUENCIA', 'PROVEEDOR', 'RESPONSABLE']],
    body: maintPlanRows,
    ...tableStyles(),
    headStyles: { fillColor: [55, 65, 100] as [number, number, number], textColor: WHITE, fontStyle: 'bold', fontSize: 7, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 42 },
      4: { cellWidth: 38 },
      5: { cellWidth: cW - 38 - 16 - 16 - 42 - 38 },
    },
    margin: { left: margin, right: margin },
    tableWidth: cW,
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // ══════════════════════════════════════════════════════════════════════
  //  SECCIÓN 4 — Historial de mantenimiento
  // ══════════════════════════════════════════════════════════════════════
  y = drawSectionHeader(doc, margin, y, cW, 'HISTORIAL DE MANTENIMIENTO');

  if (mantenimientos.length > 0) {
    const maxRows = 8;
    const histRows = mantenimientos.slice(0, maxRows).map(m => [
      formatDate(m.fechaRealizada),
      m.tipo.toUpperCase(),
      safe(m.descripcion),
      safe(m.proveedorNombre),
      formatCurrency(m.costoFinal),
      safe(m.realizadoPor),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['FECHA', 'TIPO', 'DESCRIPCIÓN', 'PROVEEDOR', 'COSTO', 'REALIZADO POR']],
      body: histRows,
      ...tableStyles(),
      headStyles: { fillColor: [55, 65, 100] as [number, number, number], textColor: WHITE, fontStyle: 'bold', fontSize: 7, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 52 },
        3: { cellWidth: 36 },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: cW - 24 - 22 - 52 - 36 - 24 },
      },
      margin: { left: margin, right: margin },
      tableWidth: cW,
    });
    y = (doc as any).lastAutoTable.finalY;

    if (mantenimientos.length > maxRows) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 120);
      y += 2;
      doc.text(`+ ${mantenimientos.length - maxRows} registros adicionales no mostrados`, margin + 2, y + 3);
      doc.setTextColor(30, 30, 30);
      y += 5;
    } else {
      y += 3;
    }
  } else {
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.25);
    doc.rect(margin, y, cW, 10, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 160);
    doc.text('Sin registros de mantenimiento', margin + cW / 2, y + 6.5, { align: 'center' });
    doc.setTextColor(30, 30, 30);
    y += 13;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  SECCIÓN 5 — Datos financieros  (4-col symmetric)
  // ══════════════════════════════════════════════════════════════════════
  y = drawSectionHeader(doc, margin, y, cW, 'DATOS FINANCIEROS Y DEPRECIACIÓN');

  const dep = calcDepreciation(asset.valor ?? 0, asset.fechaCompra ?? '', asset.vidaUtil ?? 5);
  const lastMaint  = mantenimientos.length > 0 ? mantenimientos[0] : null;
  const nextProg   = programaciones.find(p => p.estado === 'vigente' || p.estado === 'proximo');

  autoTable(doc, {
    startY: y,
    body: [
      ['VALOR ADQUISICIÓN', formatCurrency(asset.valor),                    'VALOR ACTUAL (DEP.)', formatCurrency(dep.currentValue)],
      ['VIDA ÚTIL',         `${asset.vidaUtil ?? '—'} años`,               'DEP. ACUMULADA',      `${dep.porcentajeDepreciado.toFixed(1)}%`],
      ['FECHA DE COMPRA',   formatDate(asset.fechaCompra),                  'PROVEEDOR',           safe(asset.proveedor)],
      ['ÚLTIMO MTTO',       lastMaint ? formatDate(lastMaint.fechaRealizada) : '—',
                                                                             'PRÓXIMO MTTO',        nextProg ? formatDate(nextProg.proximoMantenimiento) : formatDate(asset.fechaUltimoMantenimiento)],
    ],
    ...tableStyles(),
    columnStyles: {
      0: { fillColor: GREY, fontStyle: 'bold', cellWidth: L },
      1: { fillColor: LIGHT, cellWidth: V },
      2: { fillColor: GREY, fontStyle: 'bold', cellWidth: L },
      3: { fillColor: LIGHT, cellWidth: V },
    },
    margin: { left: margin, right: margin },
    tableWidth: cW,
  });
  y = (doc as any).lastAutoTable.finalY + 3;

  // ══════════════════════════════════════════════════════════════════════
  //  SECCIÓN 6 — Ubicación y observaciones  (4-col symmetric)
  // ══════════════════════════════════════════════════════════════════════
  y = drawSectionHeader(doc, margin, y, cW, 'UBICACIÓN FÍSICA Y OBSERVACIONES');

  autoTable(doc, {
    startY: y,
    body: [
      ['ÁREA',          safe(asset.area),        'BAHÍA',      safe(asset.bahia)],
      ['RACK',          safe(asset.rack),         'CAJA',       safe(asset.caja)],
      ['OBSERVACIONES', safe(asset.observacion),  'COMENTARIO', safe(asset.comentario)],
      ['ENCARGADO',     safe(asset.encargado),    'CUSTODIO',   safe(asset.custodio)],
    ],
    ...tableStyles(),
    columnStyles: {
      0: { fillColor: GREY, fontStyle: 'bold', cellWidth: L },
      1: { fillColor: LIGHT, cellWidth: V },
      2: { fillColor: GREY, fontStyle: 'bold', cellWidth: L },
      3: { fillColor: LIGHT, cellWidth: V },
    },
    margin: { left: margin, right: margin },
    tableWidth: cW,
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // ══════════════════════════════════════════════════════════════════════
  //  FIRMAS
  // ══════════════════════════════════════════════════════════════════════
  const sigW = (cW - 12) / 3;
  const sigH = 18;
  const sigLabels = ['RESPONSABLE DEL ACTIVO', 'RECIBIDO / REVISADO', 'AUTORIZADO POR'];
  for (let i = 0; i < 3; i++) {
    const sx = margin + i * (sigW + 6);
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.25);
    doc.rect(sx, y, sigW, sigH, 'FD');
    // signature line
    doc.setDrawColor(120, 120, 140);
    doc.setLineWidth(0.3);
    doc.line(sx + 5, y + sigH - 6, sx + sigW - 5, y + sigH - 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(60, 70, 100);
    doc.text(sigLabels[i], sx + sigW / 2, y + sigH - 2, { align: 'center' });
  }
  y += sigH;

  // ══════════════════════════════════════════════════════════════════════
  //  FOOTER
  // ══════════════════════════════════════════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.rect(margin, pageH - 11, cW, 9, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(190, 200, 220);
  doc.text(
    `SURMOTOR — Ficha Técnica  |  Código: ${safe(asset.codigo)}  |  Generado: ${new Date().toLocaleDateString('es-EC')}`,
    margin + cW / 2,
    pageH - 5.5,
    { align: 'center' },
  );

  void y; // suppress unused-variable warning
  return doc;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns a Blob of the PDF (used for browser preview). */
export async function generateFichaTecnicaBlob(asset: Asset): Promise<Blob> {
  const doc = await buildDoc(asset);
  return doc.output('blob');
}

/** Directly downloads the PDF (legacy usage). */
export async function generateFichaTecnicaPdf(asset: Asset): Promise<void> {
  const doc = await buildDoc(asset);
  const filename = `Ficha_Tecnica_${(asset.codigo || asset.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(filename);
}
