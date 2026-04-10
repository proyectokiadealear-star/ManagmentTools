/**
 * KPI 8 — Demanda vs disponibilidad de herramientas (Heatmap horizontal)
 *
 * JSON shape:
 * interface HeatmapItem {
 *   herramientaId: string; nombre: string;
 *   porcentajeTiempoPrestado: number;  // 0–100
 *   cantidadPrestamos: number;
 *   totalHorasEstimadas: number;
 * }
 *
 * Why: A horizontal utilization heatmap (one row per tool, one column per
 * demand bucket) reveals over-utilized vs idle tools at a glance.
 * Here we use a single bar-per-tool variant (simplified heatmap row)
 * since we don't have per-day data — the intensity encodes % utilization.
 */
import * as d3 from 'd3';

export interface HeatmapItem {
  herramientaId: string;
  nombre: string;
  porcentajeTiempoPrestado: number;
  cantidadPrestamos: number;
  totalHorasEstimadas: number;
}

const PAL = {
  primary: '#1A1A2E', text: '#1E293B', textMuted: '#64748B',
  border: '#E2E8F0', danger: '#F44336',
};

export function renderChartHeatmapDemanda(container: string | HTMLElement, data: HeatmapItem[] | null) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || data.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const sorted = [...data].sort((a, b) => b.porcentajeTiempoPrestado - a.porcentajeTiempoPrestado);

  const margin = { top: 24, right: 80, bottom: 30, left: 200 };
  const ROW_H = 32;
  const height = sorted.length * ROW_H + margin.top + margin.bottom;
  const W = 760;

  const svg = d3.select(root).append('svg')
    .attr('width', '100%')
    .attr('viewBox', `0 0 ${W} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('font-family', 'Inter, sans-serif');

  const innerW = W - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select(root).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', PAL.primary).style('color', '#fff')
    .style('padding', '8px 12px').style('border-radius', '6px')
    .style('font-size', '12px').style('opacity', '0')
    .style('transition', 'opacity .15s').style('z-index', '100');

  // Color scale: white → dark red
  const colorScale = d3.scaleSequential()
    .domain([0, 100])
    .interpolator(d3.interpolateRgb('#F0F4FF', '#B71C1C'));

  const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerW]);
  const yScale = d3.scaleBand()
    .domain(sorted.map(d => d.nombre))
    .range([0, innerH]).padding(0.15);

  // Background rects (full width = 100%)
  g.selectAll('.bg-bar')
    .data(sorted).join('rect').attr('class', 'bg-bar')
    .attr('x', 0).attr('y', d => yScale(d.nombre) ?? 0)
    .attr('width', innerW).attr('height', yScale.bandwidth())
    .attr('fill', PAL.border).attr('rx', 3);

  // Heatmap fill bars
  g.selectAll('.heat-bar')
    .data(sorted).join('rect').attr('class', 'heat-bar')
    .attr('x', 0).attr('y', d => yScale(d.nombre) ?? 0)
    .attr('width', d => xScale(d.porcentajeTiempoPrestado))
    .attr('height', yScale.bandwidth())
    .attr('fill', d => colorScale(d.porcentajeTiempoPrestado))
    .attr('rx', 3)
    .on('mousemove', (event, d) => {
      tooltip.style('opacity', '1')
        .html(
          `<b>${d.nombre}</b><br/>` +
          `Utilización: ${d.porcentajeTiempoPrestado.toFixed(1)}%<br/>` +
          `Total préstamos: ${d.cantidadPrestamos}<br/>` +
          `Horas estimadas: ${d.totalHorasEstimadas.toFixed(1)}h` +
          (d.porcentajeTiempoPrestado >= 80 ? '<br/><span style="color:#FF9800">⚠ Alta demanda</span>' : '')
        )
        .style('left', `${event.offsetX + 12}px`)
        .style('top', `${event.offsetY - 10}px`);
    })
    .on('mouseleave', () => tooltip.style('opacity', '0'));

  // Percentage labels
  g.selectAll('.pct-label')
    .data(sorted).join('text').attr('class', 'pct-label')
    .attr('x', d => xScale(d.porcentajeTiempoPrestado) + 6)
    .attr('y', d => (yScale(d.nombre) ?? 0) + yScale.bandwidth() / 2 + 4)
    .style('font-size', '11px')
    .style('fill', PAL.text)
    .style('font-weight', d => d.porcentajeTiempoPrestado >= 80 ? '700' : '400')
    .text(d => `${d.porcentajeTiempoPrestado.toFixed(0)}%`);

  // 80% threshold line
  g.append('line')
    .attr('x1', xScale(80)).attr('x2', xScale(80))
    .attr('y1', -8).attr('y2', innerH + 6)
    .attr('stroke', PAL.danger).attr('stroke-dasharray', '4,3').attr('stroke-width', 1.5);
  g.append('text')
    .attr('x', xScale(80) + 3).attr('y', -12)
    .style('font-size', '10px').style('fill', PAL.danger)
    .text('80% alerta');

  // Y Axis (herramienta names, bold if >80%)
  const yAxis = g.append('g').call(d3.axisLeft(yScale).tickSize(0)).select('.domain').remove();
  g.selectAll('.tick text')
    .style('font-size', '11px')
    .style('fill', PAL.text)
    .style('font-weight', d => {
      const item = sorted.find(s => s.nombre === d);
      return item && item.porcentajeTiempoPrestado >= 80 ? '700' : '400';
    });

  // Color scale legend (gradient)
  const gradId = `hmap-grad-${Math.random().toString(36).slice(2, 7)}`;
  const defs = svg.append('defs');
  const grad = defs.append('linearGradient').attr('id', gradId);
  grad.append('stop').attr('offset', '0%').attr('stop-color', '#F0F4FF');
  grad.append('stop').attr('offset', '100%').attr('stop-color', '#B71C1C');

  const legendG = svg.append('g').attr('transform', `translate(${W - margin.right + 10},${margin.top})`);
  legendG.append('rect').attr('width', 12).attr('height', 80).attr('fill', `url(#${gradId})`).attr('rx', 2);
  legendG.append('text').attr('x', 16).attr('y', 10).style('font-size', '9px').style('fill', PAL.textMuted).text('100%');
  legendG.append('text').attr('x', 16).attr('y', 80).style('font-size', '9px').style('fill', PAL.textMuted).text('0%');
}
