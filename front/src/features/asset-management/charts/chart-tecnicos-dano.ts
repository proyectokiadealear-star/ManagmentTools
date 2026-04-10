/**
 * KPI 7 — Técnicos con mayor daño en herramientas (Bar + dual axis)
 *
 * JSON shape:
 * interface TecnicoConDano {
 *   tecnicoId: string; nombre: string;
 *   prestamosConDano: number; costoReparacionTotal: number;
 *   costoReposicionTotal: number; costoTotal: number;
 * }
 *
 * Why: Dual-axis bar+line makes it easy to compare "how often" (bars)
 * with "how much it cost" (line). The threshold at the group average
 * flags outliers without needing manual interpretation.
 */
import * as d3 from 'd3';

export interface TecnicoConDano {
  tecnicoId: string;
  nombre: string;
  prestamosConDano: number;
  costoReparacionTotal: number;
  costoReposicionTotal: number;
  costoTotal: number;
}

const PAL = {
  primary: '#1A1A2E', accent: '#E94560', ok: '#4CAF50', warning: '#FF9800',
  text: '#1E293B', textMuted: '#64748B', border: '#E2E8F0', blue: '#3B82F6',
};

export function renderChartTecnicosDano(container: string | HTMLElement, data: TecnicoConDano[] | null) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || data.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const sorted = [...data].sort((a, b) => b.costoTotal - a.costoTotal);
  const avgCosto = d3.mean(sorted, d => d.costoTotal) ?? 0;
  const avgDanos = d3.mean(sorted, d => d.prestamosConDano) ?? 0;

  const margin = { top: 30, right: 80, bottom: 70, left: 60 };
  const W = 720;
  const H = 340;
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

  const xScale = d3.scaleBand()
    .domain(sorted.map(d => d.nombre))
    .range([0, innerW]).padding(0.3);

  const yLeft = d3.scaleLinear()
    .domain([0, (d3.max(sorted, d => d.prestamosConDano) ?? 1) * 1.2])
    .range([innerH, 0]);

  const yRight = d3.scaleLinear()
    .domain([0, (d3.max(sorted, d => d.costoTotal) ?? 1) * 1.2])
    .range([innerH, 0]);

  // Grid
  g.append('g').selectAll('line').data(yLeft.ticks(5)).join('line')
    .attr('x1', 0).attr('x2', innerW)
    .attr('y1', d => yLeft(d)).attr('y2', d => yLeft(d))
    .attr('stroke', PAL.border).attr('stroke-dasharray', '3,3');

  // Bars (count daños) — stacked reparacion + reposicion
  sorted.forEach(d => {
    const x = xScale(d.nombre) ?? 0;
    const w = xScale.bandwidth();

    // Repair cost bar
    const h1 = innerH - yLeft(d.prestamosConDano);

    g.append('rect')
      .attr('x', x).attr('y', yLeft(d.prestamosConDano))
      .attr('width', w).attr('height', h1)
      .attr('fill', d.prestamosConDano > avgDanos ? PAL.accent : PAL.blue)
      .attr('rx', 3)
      .on('mousemove', (event) => {
        tooltip.style('opacity', '1')
          .html(
            `<b>${d.nombre}</b><br/>` +
            `Préstamos con daño: ${d.prestamosConDano}<br/>` +
            `Costo reparación: $${d.costoReparacionTotal.toLocaleString('es-EC')}<br/>` +
            `Costo reposición: $${d.costoReposicionTotal.toLocaleString('es-EC')}<br/>` +
            `Costo total: $${d.costoTotal.toLocaleString('es-EC')}<br/>` +
            (d.prestamosConDano > avgDanos ? '<span style="color:#FF9800">⚠ Sobre el promedio</span>' : '<span style="color:#4CAF50">✓ Bajo el promedio</span>')
          )
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'));
  });

  // Line overlay: costo total (right y-axis)
  const lineGen = d3.line<TecnicoConDano>()
    .x(d => (xScale(d.nombre) ?? 0) + xScale.bandwidth() / 2)
    .y(d => yRight(d.costoTotal))
    .curve(d3.curveMonotoneX);

  g.append('path').datum(sorted)
    .attr('d', lineGen)
    .attr('fill', 'none')
    .attr('stroke', PAL.warning)
    .attr('stroke-width', 2.5);

  g.selectAll('.cost-dot')
    .data(sorted).join('circle').attr('class', 'cost-dot')
    .attr('cx', d => (xScale(d.nombre) ?? 0) + xScale.bandwidth() / 2)
    .attr('cy', d => yRight(d.costoTotal))
    .attr('r', 4).attr('fill', PAL.warning).attr('stroke', '#fff').attr('stroke-width', 1.5);

  // Threshold line at avg prestamosConDano
  g.append('line')
    .attr('x1', 0).attr('x2', innerW)
    .attr('y1', yLeft(avgDanos)).attr('y2', yLeft(avgDanos))
    .attr('stroke', PAL.textMuted).attr('stroke-dasharray', '5,3').attr('stroke-width', 1.5);
  g.append('text')
    .attr('x', innerW + 4).attr('y', yLeft(avgDanos) + 4)
    .style('font-size', '10px').style('fill', PAL.textMuted)
    .text('prom');

  // Axes
  g.append('g').attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .selectAll('text')
    .style('font-size', '11px').style('fill', PAL.text)
    .attr('transform', 'rotate(-20)').attr('text-anchor', 'end');
  d3.select(g.node()?.querySelector('.domain') as any).remove();

  g.append('g').call(d3.axisLeft(yLeft).ticks(5)).select('.domain').remove();

  g.append('g').attr('transform', `translate(${innerW},0)`)
    .call(d3.axisRight(yRight).ticks(5).tickFormat(d => `$${(+d / 1000).toFixed(0)}k`))
    .select('.domain').remove();
}
