/**
 * KPI 3 — MTBF por tipo de equipo (Lollipop chart)
 *
 * JSON shape:
 * interface MtbfItem { activoId: string; nombre: string; cantidadFallas: number; mtbfDias: number; }
 * // tipoEquipo se deriva del nombre o se puede añadir como campo
 *
 * Why: Lollipops distill a single metric per entity into a scannable ranking.
 * The colored dot encodes criticality without requiring a legend lookup.
 */
import * as d3 from 'd3';

export interface MtbfItem {
  activoId: string;
  nombre: string;
  cantidadFallas: number;
  mtbfDias: number;
}

const PAL = {
  primary: '#1A1A2E', ok: '#4CAF50', warning: '#FF9800', danger: '#F44336',
  text: '#1E293B', textMuted: '#64748B', border: '#E2E8F0',
};

function mtbfColor(dias: number) {
  if (dias < 30) return PAL.danger;
  if (dias < 90) return PAL.warning;
  return PAL.ok;
}

export function renderChartMTBF(container: string | HTMLElement, data: MtbfItem[] | null) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || data.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const sorted = [...data].sort((a, b) => a.mtbfDias - b.mtbfDias);

  const margin = { top: 20, right: 60, bottom: 50, left: 200 };
  const ROW_H = 36;
  const height = sorted.length * ROW_H + margin.top + margin.bottom;

  const svg = d3.select(root).append('svg')
    .attr('width', '100%')
    .attr('viewBox', `0 0 720 ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('font-family', 'Inter, sans-serif');

  const innerW = 720 - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select(root).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', PAL.primary).style('color', '#fff')
    .style('padding', '8px 12px').style('border-radius', '6px')
    .style('font-size', '12px').style('opacity', '0')
    .style('transition', 'opacity .15s').style('z-index', '100');

  const maxDias = d3.max(sorted, d => d.mtbfDias) ?? 0;
  const xScale = d3.scaleLinear().domain([0, maxDias * 1.1]).range([0, innerW]);
  const yScale = d3.scaleBand().domain(sorted.map(d => d.nombre)).range([0, innerH]).padding(0.3);

  // Threshold lines
  [30, 90].forEach((v, i) => {
    g.append('line')
      .attr('x1', xScale(v)).attr('x2', xScale(v))
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', i === 0 ? PAL.danger : PAL.warning)
      .attr('stroke-dasharray', '4,3')
      .attr('stroke-width', 1.5);
    g.append('text')
      .attr('x', xScale(v) + 4).attr('y', -6)
      .style('font-size', '10px')
      .style('fill', i === 0 ? PAL.danger : PAL.warning)
      .text(i === 0 ? '30d crítico' : '90d normal');
  });

  // Horizontal lines (stems)
  g.selectAll('.stem')
    .data(sorted).join('line').attr('class', 'stem')
    .attr('x1', 0)
    .attr('x2', d => xScale(d.mtbfDias))
    .attr('y1', d => (yScale(d.nombre) ?? 0) + yScale.bandwidth() / 2)
    .attr('y2', d => (yScale(d.nombre) ?? 0) + yScale.bandwidth() / 2)
    .attr('stroke', d => mtbfColor(d.mtbfDias))
    .attr('stroke-width', 2)
    .attr('opacity', 0.4);

  // Dots
  g.selectAll('.dot')
    .data(sorted).join('circle').attr('class', 'dot')
    .attr('cx', d => xScale(d.mtbfDias))
    .attr('cy', d => (yScale(d.nombre) ?? 0) + yScale.bandwidth() / 2)
    .attr('r', 7)
    .attr('fill', d => mtbfColor(d.mtbfDias))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .on('mousemove', (event, d) => {
      tooltip.style('opacity', '1')
        .html(`<b>${d.nombre}</b><br/>MTBF: ${d.mtbfDias.toFixed(1)} días<br/>Fallas registradas: ${d.cantidadFallas}<br/><span style="color:${mtbfColor(d.mtbfDias)}">${d.mtbfDias < 30 ? '🔴 Crítico' : d.mtbfDias < 90 ? '🟠 Atención' : '🟢 Bueno'}</span>`)
        .style('left', `${event.offsetX + 12}px`)
        .style('top', `${event.offsetY - 10}px`);
    })
    .on('mouseleave', () => tooltip.style('opacity', '0'));

  // MTBF value labels
  g.selectAll('.val-label')
    .data(sorted).join('text').attr('class', 'val-label')
    .attr('x', d => xScale(d.mtbfDias) + 12)
    .attr('y', d => (yScale(d.nombre) ?? 0) + yScale.bandwidth() / 2 + 4)
    .style('font-size', '11px')
    .style('fill', d => mtbfColor(d.mtbfDias))
    .style('font-weight', '600')
    .text(d => `${d.mtbfDias.toFixed(0)}d`);

  // Y Axis
  g.append('g').call(d3.axisLeft(yScale).tickSize(0)).select('.domain').remove();
  g.selectAll('.tick text').style('font-size', '11px').style('fill', PAL.text);

  // X Axis
  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => `${d}d`))
    .select('.domain').remove();
}
