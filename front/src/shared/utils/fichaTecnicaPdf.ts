/**
 * fichaTecnicaPdf.ts — Genera la "Ficha Técnica de Equipos" en PDF usando jsPDF.
 *
 * Replicates the official SURMOTOR / KIA template with all asset data
 * and maintenance info pulled from the backend.
 */

import { jsPDF } from 'jspdf';
import { Asset } from '../../data/mockData';
import { httpClient } from '../../services/httpClient';
import { calcDepreciation } from './depreciation';

// ─── Types for maintenance data fetched from API ─────────────────────────────

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
  } catch {
    return d;
  }
}

// ─── Image loader (convert URL → base64 for jsPDF) ──────────────────────────

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Fetch maintenance data ──────────────────────────────────────────────────

async function fetchMantenimientos(activoId: string): Promise<Mantenimiento[]> {
  try {
    return await httpClient.get<Mantenimiento[]>(`/api/mantenimientos?activoId=${activoId}`);
  } catch {
    return [];
  }
}

async function fetchProgramaciones(activoId: string): Promise<ProgramacionMantenimiento[]> {
  try {
    const all = await httpClient.get<ProgramacionMantenimiento[]>('/api/mantenimientos/programacion');
    return all.filter((p) => p.activoId === activoId);
  } catch {
    return [];
  }
}

// ─── PDF Table Drawing Primitives ────────────────────────────────────────────

interface CellDef {
  text: string;
  width: number;
  bold?: boolean;
  align?: 'left' | 'center';
  fill?: string;
}

function drawRow(
  doc: jsPDF,
  x: number,
  y: number,
  height: number,
  cells: CellDef[],
): void {
  let cx = x;
  for (const cell of cells) {
    // Fill
    if (cell.fill) {
      doc.setFillColor(cell.fill);
      doc.rect(cx, y, cell.width, height, 'F');
    }
    // Border
    doc.setDrawColor('#333333');
    doc.setLineWidth(0.3);
    doc.rect(cx, y, cell.width, height, 'S');
    // Text
    doc.setFont('helvetica', cell.bold ? 'bold' : 'normal');
    doc.setFontSize(7);
    doc.setTextColor('#111111');
    const textX = cell.align === 'center' ? cx + cell.width / 2 : cx + 2;
    const textY = y + height / 2 + 2.5;
    doc.text(cell.text, textX, textY, {
      align: cell.align === 'center' ? 'center' : 'left',
      maxWidth: cell.width - 4,
    });
    cx += cell.width;
  }
}

function drawLabelValueRow(
  doc: jsPDF,
  x: number,
  y: number,
  height: number,
  totalWidth: number,
  pairs: { label: string; value: string; labelWidth?: number }[],
): number {
  const pairCount = pairs.length;
  const defaultLabelW = 35;
  let cx = x;
  for (let i = 0; i < pairCount; i++) {
    const labelW = pairs[i].labelWidth ?? defaultLabelW;
    const usedAfter = pairs.slice(i + 1).reduce((a, p) => a + (p.labelWidth ?? defaultLabelW) + 40, 0);
    const valueW = i === pairCount - 1
      ? (x + totalWidth - cx - labelW)
      : Math.max(20, ((totalWidth - (cx - x)) - usedAfter - labelW) / 2);

    drawRow(doc, cx, y, height, [
      { text: pairs[i].label, width: labelW, bold: true, fill: '#E8E8E8' },
      { text: pairs[i].value, width: valueW },
    ]);
    cx += labelW + valueW;
  }
  return y + height;
}

// ─── Main PDF Generator ──────────────────────────────────────────────────────

export async function generateFichaTecnicaPdf(asset: Asset): Promise<void> {
  // Fetch maintenance data in parallel
  const [mantenimientos, programaciones, imageBase64] = await Promise.all([
    fetchMantenimientos(asset.id),
    fetchProgramaciones(asset.id),
    asset.imagenUrl ? loadImageAsBase64(asset.imagenUrl) : Promise.resolve(null),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentW = pageW - margin * 2;
  let y = margin;
  const rowH = 8;

  // ════════════════════════════════════════════════════════════════════════════
  //  HEADER — FICHA TÉCNICA DE EQUIPOS + SURMOTOR
  // ════════════════════════════════════════════════════════════════════════════

  doc.setFillColor('#1a1a2e');
  doc.rect(margin, y, contentW, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor('#FFFFFF');
  doc.text('FICHA TÉCNICA DE EQUIPOS', margin + contentW / 2, y + 9.5, { align: 'center' });

  // SURMOTOR logo text on the right
  doc.setFontSize(8);
  doc.text('SURMOTOR', margin + contentW - 3, y + 5, { align: 'right' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestión de Activos', margin + contentW - 3, y + 10, { align: 'right' });

  y += 16;

  // ════════════════════════════════════════════════════════════════════════════
  //  SECCIÓN 1 — Datos generales
  // ════════════════════════════════════════════════════════════════════════════

  const halfW = contentW / 2;

  // Realizado por / Fecha
  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'REALIZADO POR:', value: safe(asset.custodio), labelWidth: 32 },
    { label: 'FECHA:', value: formatDate(new Date().toISOString()), labelWidth: 20 },
  ]);

  // Nombre del equipo / Ubicación
  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'NOMBRE EQUIPO:', value: safe(asset.descripcion), labelWidth: 32 },
    { label: 'UBICACIÓN:', value: safe(asset.ubicacion || `${asset.area ?? ''} / ${asset.bahia ?? ''}`), labelWidth: 25 },
  ]);

  // Fabricante / Sección
  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'FABRICANTE:', value: safe(asset.marca), labelWidth: 32 },
    { label: 'SECCIÓN:', value: safe(asset.area), labelWidth: 25 },
  ]);

  // Modelo
  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'MODELO:', value: safe(asset.modelo), labelWidth: 32 },
    { label: 'SERIAL:', value: safe(asset.serial), labelWidth: 25 },
  ]);

  // Marca / Código inventario
  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'MARCA:', value: safe(asset.marca), labelWidth: 32 },
    { label: 'CÓD. INVENTARIO:', value: safe(asset.codigo), labelWidth: 32 },
  ]);

  y += 2;

  // ════════════════════════════════════════════════════════════════════════════
  //  SECCIÓN 2 — Características técnicas + Foto
  // ════════════════════════════════════════════════════════════════════════════

  const specW = halfW;
  const photoW = contentW - specW;
  const sectionH = 40;

  // Header row
  drawRow(doc, margin, y, rowH, [
    { text: 'CARACTERÍSTICAS TÉCNICAS', width: specW, bold: true, align: 'center', fill: '#E8E8E8' },
    { text: 'FOTO DEL EQUIPO / REFERENCIA', width: photoW, bold: true, align: 'center', fill: '#E8E8E8' },
  ]);
  y += rowH;

  // Specs cell
  doc.setDrawColor('#333333');
  doc.setLineWidth(0.3);
  doc.rect(margin, y, specW, sectionH, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor('#111111');

  const specs: string[] = [];
  if (asset.tipo) specs.push(`Tipo: ${asset.tipo}`);
  if (asset.capacidadEspecificacion) specs.push(`Especificación: ${asset.capacidadEspecificacion}`);
  if (asset.periodicidad) specs.push(`Periodicidad Mtto: ${asset.periodicidad}`);
  if (asset.placa) specs.push(`Placa: ${asset.placa}`);
  if (asset.proveedor) specs.push(`Proveedor: ${asset.proveedor}`);
  if (asset.itemProveedor) specs.push(`Ítem Proveedor: ${asset.itemProveedor}`);
  if (asset.factura) specs.push(`Factura: ${asset.factura}`);
  if (asset.estado) specs.push(`Estado: ${asset.estado}`);
  if (asset.observacion) specs.push(`Observación: ${asset.observacion}`);

  let specY = y + 4;
  for (const line of specs) {
    doc.text(`• ${line}`, margin + 3, specY, { maxWidth: specW - 6 });
    specY += 4.2;
    if (specY > y + sectionH - 2) break;
  }

  // Photo cell
  doc.rect(margin + specW, y, photoW, sectionH, 'S');
  if (imageBase64) {
    try {
      doc.addImage(imageBase64, 'JPEG', margin + specW + 2, y + 2, photoW - 4, sectionH - 4);
    } catch {
      doc.setFontSize(7);
      doc.text('(imagen no disponible)', margin + specW + photoW / 2, y + sectionH / 2, { align: 'center' });
    }
  } else {
    doc.setFontSize(7);
    doc.setTextColor('#999999');
    doc.text('Sin imagen', margin + specW + photoW / 2, y + sectionH / 2, { align: 'center' });
    doc.setTextColor('#111111');
  }

  y += sectionH + 2;

  // ════════════════════════════════════════════════════════════════════════════
  //  SECCIÓN 3 — Calendario de mantenimiento
  // ════════════════════════════════════════════════════════════════════════════

  // Section header
  doc.setFillColor('#1a1a2e');
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor('#FFFFFF');
  doc.text('CALENDARIO DE MANTENIMIENTO', margin + contentW / 2, y + 5, { align: 'center' });
  y += 7;

  // Table header
  const mColWidths = [40, 25, 25, 50, 46];
  drawRow(doc, margin, y, rowH, [
    { text: 'EQUIPO', width: mColWidths[0], bold: true, align: 'center', fill: '#D4D4D4' },
    { text: 'APLICA', width: mColWidths[1], bold: true, align: 'center', fill: '#D4D4D4' },
    { text: 'NO APLICA', width: mColWidths[2], bold: true, align: 'center', fill: '#D4D4D4' },
    { text: 'FRECUENCIA MTTO', width: mColWidths[3], bold: true, align: 'center', fill: '#D4D4D4' },
    { text: 'PROVEEDOR', width: mColWidths[4], bold: true, align: 'center', fill: '#D4D4D4' },
  ]);
  y += rowH;

  // Rows — programaciones
  if (programaciones.length > 0) {
    for (const prog of programaciones) {
      const freq = prog.periodicidadDias
        ? `Cada ${prog.periodicidadDias} días (${prog.tipo})`
        : prog.tipo;
      drawRow(doc, margin, y, rowH, [
        { text: safe(asset.descripcion).slice(0, 25), width: mColWidths[0] },
        { text: 'SÍ', width: mColWidths[1], align: 'center' },
        { text: '', width: mColWidths[2], align: 'center' },
        { text: freq, width: mColWidths[3], align: 'center' },
        { text: safe(prog.proveedorHabitual), width: mColWidths[4] },
      ]);
      y += rowH;
    }
  } else {
    // Single row saying maintenance applies based on periodicidad
    drawRow(doc, margin, y, rowH, [
      { text: safe(asset.descripcion).slice(0, 25), width: mColWidths[0] },
      { text: asset.periodicidad && asset.periodicidad !== 'N/A' ? 'SÍ' : 'NO', width: mColWidths[1], align: 'center' },
      { text: asset.periodicidad && asset.periodicidad !== 'N/A' ? '' : 'X', width: mColWidths[2], align: 'center' },
      { text: safe(asset.periodicidad), width: mColWidths[3], align: 'center' },
      { text: safe(asset.proveedor), width: mColWidths[4] },
    ]);
    y += rowH;
  }

  y += 2;

  // ════════════════════════════════════════════════════════════════════════════
  //  SECCIÓN 4 — Último y próximo mantenimiento
  // ════════════════════════════════════════════════════════════════════════════

  const lastMaint = mantenimientos.length > 0 ? mantenimientos[0] : null;
  const nextProg = programaciones.find((p) => p.estado === 'vigente' || p.estado === 'proximo');

  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'FECHA ÚLTIMO MTTO:', value: lastMaint ? formatDate(lastMaint.fechaRealizada) : '—', labelWidth: 40 },
    { label: 'PRÓXIMO MTTO:', value: nextProg ? formatDate(nextProg.proximoMantenimiento) : '—', labelWidth: 32 },
  ]);

  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'RESPONSABLE ÚLTIMO MTTO:', value: lastMaint ? safe(lastMaint.realizadoPor) : '—', labelWidth: 50 },
  ]);

  y += 2;

  // ════════════════════════════════════════════════════════════════════════════
  //  SECCIÓN 5 — Detalle de actividades de mantenimiento
  // ════════════════════════════════════════════════════════════════════════════

  doc.setFillColor('#1a1a2e');
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor('#FFFFFF');
  doc.text('DETALLE DE ACTIVIDADES DE MANTENIMIENTO', margin + contentW / 2, y + 5, { align: 'center' });
  y += 7;

  if (mantenimientos.length > 0) {
    // Table header
    const dColWidths = [25, 22, 50, 35, 25, 29];
    drawRow(doc, margin, y, rowH, [
      { text: 'FECHA', width: dColWidths[0], bold: true, align: 'center', fill: '#D4D4D4' },
      { text: 'TIPO', width: dColWidths[1], bold: true, align: 'center', fill: '#D4D4D4' },
      { text: 'DESCRIPCIÓN', width: dColWidths[2], bold: true, align: 'center', fill: '#D4D4D4' },
      { text: 'PROVEEDOR', width: dColWidths[3], bold: true, align: 'center', fill: '#D4D4D4' },
      { text: 'COSTO', width: dColWidths[4], bold: true, align: 'center', fill: '#D4D4D4' },
      { text: 'REALIZADO POR', width: dColWidths[5], bold: true, align: 'center', fill: '#D4D4D4' },
    ]);
    y += rowH;

    const maxRows = 6;
    for (let i = 0; i < Math.min(mantenimientos.length, maxRows); i++) {
      const m = mantenimientos[i];
      drawRow(doc, margin, y, rowH, [
        { text: formatDate(m.fechaRealizada), width: dColWidths[0], align: 'center' },
        { text: m.tipo.toUpperCase(), width: dColWidths[1], align: 'center' },
        { text: safe(m.descripcion).slice(0, 35), width: dColWidths[2] },
        { text: safe(m.proveedorNombre).slice(0, 22), width: dColWidths[3] },
        { text: formatCurrency(m.costoFinal), width: dColWidths[4], align: 'center' },
        { text: safe(m.realizadoPor).slice(0, 18), width: dColWidths[5] },
      ]);
      y += rowH;
    }
    if (mantenimientos.length > maxRows) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor('#666666');
      doc.text(`... y ${mantenimientos.length - maxRows} registros más`, margin + 3, y + 3);
      doc.setTextColor('#111111');
      y += 5;
    }
  } else {
    doc.rect(margin, y, contentW, 12, 'S');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor('#999999');
    doc.text('Sin registros de mantenimiento', margin + contentW / 2, y + 7, { align: 'center' });
    doc.setTextColor('#111111');
    y += 12;
  }

  y += 2;

  // ════════════════════════════════════════════════════════════════════════════
  //  SECCIÓN 6 — Datos financieros
  // ════════════════════════════════════════════════════════════════════════════

  const dep = calcDepreciation(asset.valor ?? 0, asset.fechaCompra ?? '', asset.vidaUtil ?? 5);

  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'VALOR:', value: formatCurrency(asset.valor), labelWidth: 32 },
    { label: 'VALOR ACTUAL:', value: formatCurrency(dep.currentValue), labelWidth: 30 },
  ]);

  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'VIDA ÚTIL:', value: `${asset.vidaUtil ?? '—'} años`, labelWidth: 32 },
    { label: 'DEPRECIACIÓN:', value: `${dep.porcentajeDepreciado.toFixed(1)}%`, labelWidth: 30 },
  ]);

  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'FECHA COMPRA:', value: formatDate(asset.fechaCompra), labelWidth: 32 },
    { label: 'PROVEEDOR:', value: safe(asset.proveedor), labelWidth: 30 },
  ]);

  y += 2;

  // ════════════════════════════════════════════════════════════════════════════
  //  SECCIÓN 7 — Ubicación jerárquica
  // ════════════════════════════════════════════════════════════════════════════

  doc.setFillColor('#1a1a2e');
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor('#FFFFFF');
  doc.text('UBICACIÓN FÍSICA', margin + contentW / 2, y + 5, { align: 'center' });
  y += 7;

  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'ÁREA:', value: safe(asset.area), labelWidth: 20 },
    { label: 'BAHÍA:', value: safe(asset.bahia), labelWidth: 20 },
  ]);

  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'RACK:', value: safe(asset.rack), labelWidth: 20 },
    { label: 'CAJA:', value: safe(asset.caja), labelWidth: 20 },
  ]);

  y += 2;

  // ════════════════════════════════════════════════════════════════════════════
  //  SECCIÓN 8 — Observaciones
  // ════════════════════════════════════════════════════════════════════════════

  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'OBSERVACIONES:', value: safe(asset.observacion), labelWidth: 32 },
  ]);

  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'COMENTARIO:', value: safe(asset.comentario), labelWidth: 32 },
  ]);

  y += 4;

  // ════════════════════════════════════════════════════════════════════════════
  //  SECCIÓN 9 — Custodia / Responsabilidad
  // ════════════════════════════════════════════════════════════════════════════

  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'RESPONSABLE:', value: safe(asset.responsable), labelWidth: 32 },
    { label: 'CUSTODIO:', value: safe(asset.custodio), labelWidth: 25 },
  ]);

  y = drawLabelValueRow(doc, margin, y, rowH, contentW, [
    { label: 'ENCARGADO:', value: safe(asset.encargado), labelWidth: 32 },
  ]);

  // ════════════════════════════════════════════════════════════════════════════
  //  Footer
  // ════════════════════════════════════════════════════════════════════════════

  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor('#CCCCCC');
  doc.setLineWidth(0.3);
  doc.line(margin, pageH - 12, margin + contentW, pageH - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor('#999999');
  doc.text(
    `SURMOTOR — Ficha Técnica generada el ${new Date().toLocaleDateString('es-EC')} | ${safe(asset.codigo)}`,
    margin + contentW / 2,
    pageH - 8,
    { align: 'center' },
  );

  // Save
  const filename = `Ficha_Tecnica_${(asset.codigo || asset.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(filename);
}
