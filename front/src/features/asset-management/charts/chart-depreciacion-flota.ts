/**
 * KPI 14 — Flota con depreciación crítica (Horizontal bar + threshold + icons)
 *
 * JSON shape:
 * interface DepreciacionItem {
 *   activoId: string; nombre: string;
 *   porcentajeDepreciado: number;     // 0–100
 *   estado: 'activo' | 'inactivo' | 'en-reparacion' | 'dado-de-baja';
 *   valorOriginal: number; valorActual: number;
 * }
 *
 * Why: A horizontal bar per asset coloured by depreciation level,
 * with a bold threshold line at 80% and a ⚠ warning icon next to
 * any still-active asset that has crossed it.
 */
import * as d3 from 'd3';

export interface DepreciacionItem {
  activoId: string;
  nombre: string;
  porcentajeDepreciado: number;
  estado: 'activo' | 'inactivo' | 'en-reparacion' | 'dado-de-baja';
  valorOriginal: number;
  valorActual: number;
}

const PAL = {
  primary: '#1A1A2E', ok: '#4CAF50', warning: '#FF9800', danger: '#F44336',
  text: '#1E293B', textMuted: '#64748B', border: '#E2E8F0',
};

const CRITICAL_PCT = 80;
const BAR_H = 22;
const BAR_GAP = 8;

function barColor(item: DepreciacionItem): string {
  if (item.porcentajeDepreciado >= 90) return PAL.danger;
  if (item.porcentajeDepreciado >= CRITICAL_PCT) return PAL.warning;
  return PAL.ok;
}

export function renderChartDepreciacionFlota(
  container: string | HTMLElement,
  data: DepreciacionItem[] | null,
) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || data.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  // Sort descending by depreciation %
  const sorted = [...data].sort((a, b) => b.porcentajeDepreciado - a.porcentajeDepreciado);

  const LABEL_W = 160;
  const ICON_W = 28;
  const M = { top: 24, right: ICON_W + 8, bottom: 32, left: LABEL_W + 8 };
  const W = 680;
  const rowH = BAR_H + BAR_GAP;
  const H = M.top + sorted.length * rowH + M.bottom;

  const svg = d3.select(root).append('svg')
    .attr('width', '100%')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('font-family', 'Inter, sans-serif');

  const iW = W - M.left - M.right;
  const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);

  const tooltip = d3.select(root).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', PAL.primary).style('color', '#fff')
    .style('padding', '8px 12px').style('border-radius', '6px')
    .style('font-size', '12px').style('opacity', '0')
    .style('transition', 'opacity .15s').style('z-index', '100');

  const xScale = d3.scaleLinear().domain([0, 100]).range([0, iW]);

  // Background track + bar per row
  sorted.forEach((item, i) => {
    const y = i * rowH;
    const color = barColor(item);
    const isCritical = item.porcentajeDepreciado >= CRITICAL_PCT && item.estado === 'activo';

    // Track
    g.append('rect').attr('x', 0).attr('y', y).attr('width', iW).attr('height', BAR_H)
      .attr('fill', PAL.border).attr('rx', 4);

    // Fill bar
    g.append('rect').attr('x', 0).attr('y', y)
      .attr('width', xScale(item.porcentajeDepreciado)).attr('height', BAR_H)
      .attr('fill', color).attr('fill-opacity', 0.85).attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mousemove', (event) => {
        tooltip.style('opacity', '1')
          .html(`<b>${item.nombre}</b><br/>Depreciado: ${item.porcentajeDepreciado.toFixed(1)}%<br/>Valor original: $${item.valorOriginal.toLocaleString()}<br/>Valor actual: $${item.valorActual.toLocaleString()}<br/>Estado: ${item.estado}`)
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'));

    // Percentage label inside bar
    g.append('text')
      .attr('x', Math.max(4, xScale(item.porcentajeDepreciado) - 4))
      .attr('y', y + BAR_H / 2 + 1)
      .attr('text-anchor', item.porcentajeDepreciado < 15 ? 'start' : 'end')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '11px').style('font-weight', '600')
      .style('fill', item.porcentajeDepreciado < 15 ? color : '#fff')
      .style('pointer-events', 'none')
      .text(`${item.porcentajeDepreciado.toFixed(0)}%`);

    // Asset name label
    svg.append('text')
      .attr('x', M.left - 8).attr('y', M.top + y + BAR_H / 2 + 1)
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
      .style('font-size', '11px').style('fill', PAL.text)
      .text(item.nombre.length > 22 ? item.nombre.substring(0, 22) + '…' : item.nombre);

    // ⚠ icon for critical active assets
    if (isCritical) {
      svg.append('text')
        .attr('x', M.left + iW + ICON_W / 2).attr('y', M.top + y + BAR_H / 2 + 1)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .style('font-size', '16px')
        .text('⚠');
    }
  });

  // Threshold line at 80%
  const threshX = xScale(CRITICAL_PCT);
  g.append('line').attr('x1', threshX).attr('x2', threshX)
    .attr('y1', -8).attr('y2', sorted.length * rowH + 4)
    .attr('stroke', PAL.danger).attr('stroke-width', 2).attr('stroke-dasharray', '6,3');
  g.append('text').attr('x', threshX + 4).attr('y', -10)
    .style('font-size', '10px').style('fill', PAL.danger).text(`${CRITICAL_PCT}% umbral`);

  // X axis
  g.append('g').attr('transform', `translate(0,${sorted.length * rowH + 4})`)
    .call(d3.axisBottom(xScale).ticks(5).tickFormat(v => `${v}%`))
    .selectAll('text').style('font-size', '11px');

  // State legend
  const STATES: Array<[string, string]> = [
    ['Activo', PAL.ok], ['Inactivo', PAL.textMuted], ['En reparación', PAL.warning], ['Dado de baja', PAL.danger],
  ];
  const lG = svg.append('g').attr('transform', `translate(${M.left},${H - 14})`);
  STATES.forEach(([label, color], i) => {
    lG.append('circle').attr('cx', i * 140 + 6).attr('cy', 0).attr('r', 5).attr('fill', color);
    lG.append('text').attr('x', i * 140 + 14).attr('y', 4).style('font-size', '10px').style('fill', PAL.text).text(label);
  });
}
