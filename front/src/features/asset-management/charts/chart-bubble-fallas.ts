/**
 * KPI 6 — Ranking activos más problemáticos (Bubble Chart)
 *
 * JSON shape:
 * interface BubbleItem {
 *   activoId: string; nombre: string; tipo: string;
 *   cantidadFallas: number; totalCosto: number; totalParadaHoras: number;
 * }
 *
 * Why: Bubble chart encodes 4 dimensions simultaneously — X (frecuencia),
 * Y (costo), size (downtime), color (tipo) — revealing multi-variable outliers.
 */
import * as d3 from 'd3';

export interface BubbleItem {
  activoId: string;
  nombre: string;
  tipo?: string;
  cantidadFallas: number;
  totalCosto: number;
  totalParadaHoras: number;
}

const PAL = {
  primary: '#1A1A2E', text: '#1E293B', textMuted: '#64748B', border: '#E2E8F0',
};

const TYPE_COLORS = [
  '#E94560', '#3B82F6', '#4CAF50', '#FF9800', '#9C27B0',
  '#00BCD4', '#FF5722', '#607D8B', '#CDDC39', '#F06292',
];

export function renderChartBubble(container: string | HTMLElement, data: BubbleItem[] | null) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || data.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const margin = { top: 20, right: 40, bottom: 60, left: 80 };
  const W = 760;
  const H = 420;
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const svg = d3.select(root).append('svg')
    .attr('width', '100%')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('font-family', 'Inter, sans-serif');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select(root).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', PAL.primary).style('color', '#fff')
    .style('padding', '8px 12px').style('border-radius', '6px')
    .style('font-size', '12px').style('opacity', '0')
    .style('transition', 'opacity .15s').style('z-index', '100');

  // Unique types for color scale
  const tipos = [...new Set(data.map(d => d.tipo ?? 'Sin tipo'))];
  const colorScale = d3.scaleOrdinal<string>().domain(tipos).range(TYPE_COLORS);

  const xScale = d3.scaleLinear()
    .domain([0, (d3.max(data, d => d.cantidadFallas) ?? 1) + 0.5])
    .range([0, innerW]);

  const yScale = d3.scaleLinear()
    .domain([0, (d3.max(data, d => d.totalCosto) ?? 1) * 1.1])
    .range([innerH, 0]);

  const maxParada = d3.max(data, d => d.totalParadaHoras) ?? 1;
  const rScale = d3.scaleSqrt().domain([0, maxParada]).range([6, 36]);

  // Grid
  g.append('g').attr('class', 'grid')
    .selectAll('line').data(yScale.ticks(5)).join('line')
    .attr('x1', 0).attr('x2', innerW)
    .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
    .attr('stroke', PAL.border).attr('stroke-dasharray', '3,3');

  // Bubbles
  g.selectAll('.bubble')
    .data(data).join('circle').attr('class', 'bubble')
    .attr('cx', d => xScale(d.cantidadFallas))
    .attr('cy', d => yScale(d.totalCosto))
    .attr('r', d => rScale(d.totalParadaHoras))
    .attr('fill', d => colorScale(d.tipo ?? 'Sin tipo'))
    .attr('opacity', 0.75)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .on('mousemove', (event, d) => {
      tooltip.style('opacity', '1')
        .html(
          `<b>${d.nombre}</b><br/>` +
          `Tipo: ${d.tipo ?? '—'}<br/>` +
          `Fallas: ${d.cantidadFallas}<br/>` +
          `Costo total: $${d.totalCosto.toLocaleString('es-EC')}<br/>` +
          `Parada: ${d.totalParadaHoras.toFixed(1)}h`
        )
        .style('left', `${event.offsetX + 12}px`)
        .style('top', `${event.offsetY - 10}px`);
    })
    .on('mouseleave', () => tooltip.style('opacity', '0'));

  // Labels for top items (most fallas)
  const topItems = [...data].sort((a, b) => b.cantidadFallas - a.cantidadFallas).slice(0, 5);
  g.selectAll('.bubble-label')
    .data(topItems).join('text').attr('class', 'bubble-label')
    .attr('x', d => xScale(d.cantidadFallas))
    .attr('y', d => yScale(d.totalCosto) - rScale(d.totalParadaHoras) - 4)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px').style('fill', PAL.text).style('font-weight', '600')
    .text(d => d.nombre.length > 16 ? d.nombre.substring(0, 16) + '…' : d.nombre);

  // Axes
  g.append('g').attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => `${d} fallas`))
    .select('.domain').remove();

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `$${(+d / 1000).toFixed(0)}k`))
    .select('.domain').remove();

  // Axis labels
  svg.append('text')
    .attr('x', margin.left + innerW / 2).attr('y', H - 10)
    .attr('text-anchor', 'middle').style('font-size', '11px').style('fill', PAL.textMuted)
    .text('Cantidad de fallas');

  svg.append('text')
    .attr('transform', `translate(14,${margin.top + innerH / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').style('font-size', '11px').style('fill', PAL.textMuted)
    .text('Costo total ($)');

  // Size legend
  const sizeLegend = svg.append('g').attr('transform', `translate(${W - 160},${margin.top + 10})`);
  sizeLegend.append('text').attr('x', 0).attr('y', 0).style('font-size', '10px').style('fill', PAL.textMuted).text('Tamaño = horas parada');
  [{ r: 6, label: 'Poco' }, { r: 18, label: 'Medio' }, { r: 32, label: 'Mucho' }].forEach(({ r: rr, label }, i) => {
    sizeLegend.append('circle').attr('cx', 20).attr('cy', 20 + i * 28).attr('r', rr)
      .attr('fill', 'none').attr('stroke', PAL.textMuted).attr('stroke-width', 1.5);
    sizeLegend.append('text').attr('x', 52).attr('y', 24 + i * 28)
      .style('font-size', '10px').style('fill', PAL.textMuted).text(label);
  });
}
