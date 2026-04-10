/**
 * KPI 1 — TCO vs Valor Original (Grouped Horizontal Bar Chart)
 *
 * JSON shape:
 * interface TcoItem {
 *   activoId: string; nombre: string; valorOriginal: number;
 *   costoMantenimientos: number; costoFallas: number; tcoTotal: number;
 * }
 *
 * Why: Horizontal bars allow long asset names; grouping makes the comparison
 * between "what we paid" vs "total cost of ownership" instantly readable.
 */
import * as d3 from 'd3';

export interface TcoItem {
  activoId: string;
  nombre: string;
  valorOriginal: number;
  costoMantenimientos: number;
  costoFallas: number;
  tcoTotal: number;
}

const PAL = {
  primary: '#1A1A2E',
  accent: '#E94560',
  neutral: '#16213E',
  ok: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  blue: '#3B82F6',
  bg: '#F8FAFC',
  border: '#E2E8F0',
  text: '#1E293B',
  textMuted: '#64748B',
};

export function renderChartTCO(container: string | HTMLElement, data: TcoItem[] | null) {
  const root =
    typeof container === 'string'
      ? (document.querySelector(container) as HTMLElement)
      : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || data.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const margin = { top: 20, right: 160, bottom: 40, left: 200 };
  const ROW_H = 40;
  const height = data.length * ROW_H + margin.top + margin.bottom;

  const svg = d3
    .select(root)
    .append('svg')
    .attr('width', '100%')
    .attr('viewBox', `0 0 860 ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('font-family', 'Inter, sans-serif');

  const innerW = 860 - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Tooltip
  const tooltip = d3
    .select(root)
    .append('div')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('background', PAL.primary)
    .style('color', '#fff')
    .style('padding', '8px 12px')
    .style('border-radius', '6px')
    .style('font-size', '12px')
    .style('opacity', '0')
    .style('transition', 'opacity .15s')
    .style('z-index', '100');

  const maxVal = d3.max(data, (d) => Math.max(d.valorOriginal, d.tcoTotal)) ?? 0;

  const xScale = d3.scaleLinear().domain([0, maxVal * 1.05]).range([0, innerW]);
  const yScale = d3
    .scaleBand()
    .domain(data.map((d) => d.nombre))
    .range([0, innerH])
    .padding(0.35);

  // Grid lines
  g.append('g')
    .attr('class', 'grid')
    .selectAll('line')
    .data(xScale.ticks(5))
    .join('line')
    .attr('x1', (d) => xScale(d))
    .attr('x2', (d) => xScale(d))
    .attr('y1', 0)
    .attr('y2', innerH)
    .attr('stroke', PAL.border)
    .attr('stroke-dasharray', '3,3');

  // Bars — valor original
  const bandH = yScale.bandwidth() / 2 - 2;

  g.selectAll('.bar-original')
    .data(data)
    .join('rect')
    .attr('class', 'bar-original')
    .attr('x', 0)
    .attr('y', (d) => (yScale(d.nombre) ?? 0))
    .attr('width', (d) => xScale(d.valorOriginal))
    .attr('height', bandH)
    .attr('fill', PAL.blue)
    .attr('rx', 3)
    .on('mousemove', (event, d) => {
      tooltip
        .style('opacity', '1')
        .html(
          `<b>${d.nombre}</b><br/>Valor original: $${d.valorOriginal.toLocaleString('es-EC')}`,
        )
        .style('left', `${event.offsetX + 12}px`)
        .style('top', `${event.offsetY - 10}px`);
    })
    .on('mouseleave', () => tooltip.style('opacity', '0'));

  // Bars — TCO total
  g.selectAll('.bar-tco')
    .data(data)
    .join('rect')
    .attr('class', 'bar-tco')
    .attr('x', 0)
    .attr('y', (d) => (yScale(d.nombre) ?? 0) + bandH + 4)
    .attr('width', (d) => xScale(d.tcoTotal))
    .attr('height', bandH)
    .attr('fill', (d) => (d.tcoTotal > d.valorOriginal ? PAL.danger : PAL.accent))
    .attr('rx', 3)
    .on('mousemove', (event, d) => {
      const diff = d.tcoTotal - d.valorOriginal;
      tooltip
        .style('opacity', '1')
        .html(
          `<b>${d.nombre}</b><br/>TCO total: $${d.tcoTotal.toLocaleString('es-EC')}<br/>` +
            `Mantenim.: $${d.costoMantenimientos.toLocaleString('es-EC')}<br/>` +
            `Fallas: $${d.costoFallas.toLocaleString('es-EC')}<br/>` +
            (diff > 0
              ? `<span style="color:#FF9800">⚠ Excede valor original en $${diff.toLocaleString('es-EC')}</span>`
              : `<span style="color:#4CAF50">✓ Bajo valor original</span>`),
        )
        .style('left', `${event.offsetX + 12}px`)
        .style('top', `${event.offsetY - 10}px`);
    })
    .on('mouseleave', () => tooltip.style('opacity', '0'));

  // Reference line at valor original for each row (100%)
  g.selectAll('.ref-line')
    .data(data)
    .join('line')
    .attr('x1', (d) => xScale(d.valorOriginal))
    .attr('x2', (d) => xScale(d.valorOriginal))
    .attr('y1', (d) => yScale(d.nombre) ?? 0)
    .attr('y2', (d) => (yScale(d.nombre) ?? 0) + yScale.bandwidth())
    .attr('stroke', PAL.primary)
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '4,2')
    .attr('opacity', 0.5);

  // Y Axis
  g.append('g')
    .call(d3.axisLeft(yScale).tickSize(0))
    .select('.domain')
    .remove();
  g.selectAll('.tick text')
    .style('fill', PAL.text)
    .style('font-size', '11px');

  // X Axis
  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(
      d3
        .axisBottom(xScale)
        .ticks(5)
        .tickFormat((d) => `$${(+d / 1000).toFixed(0)}k`),
    )
    .select('.domain')
    .remove();

  // Legend
  const legend = svg.append('g').attr('transform', `translate(${860 - margin.right + 10}, ${margin.top})`);
  [
    { label: 'Valor original', color: PAL.blue },
    { label: 'TCO total', color: PAL.accent },
    { label: 'TCO > valor (alerta)', color: PAL.danger },
  ].forEach(({ label, color }, i) => {
    legend.append('rect').attr('x', 0).attr('y', i * 22).attr('width', 12).attr('height', 12).attr('fill', color).attr('rx', 2);
    legend.append('text').attr('x', 16).attr('y', i * 22 + 10).text(label).style('font-size', '11px').style('fill', PAL.text);
  });
}
