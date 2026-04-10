/**
 * KPI 10 — Variación presupuestal acumulada (Line chart with shaded area)
 *
 * JSON shape:
 * interface PresupuestoMes { mes: string; montoEstimado: number; costoFinalEjecutado: number; }
 *
 * Why: A shaded area between the two lines makes over/under execution
 * immediately obvious at a glance. Annotation at the month of
 * maximum deviation draws attention to the biggest problem.
 */
import * as d3 from 'd3';

export interface PresupuestoMes {
  mes: string;               // e.g. "2025-01"
  montoEstimado: number;
  costoFinalEjecutado: number;
}

const PAL = {
  primary: '#1A1A2E', accent: '#E94560', ok: '#4CAF50',
  warning: '#FF9800', danger: '#F44336', text: '#1E293B', textMuted: '#64748B', border: '#E2E8F0',
};

export function renderChartVariacionPresupuestal(
  container: string | HTMLElement,
  data: PresupuestoMes[] | null,
) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || data.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const M = { top: 24, right: 24, bottom: 48, left: 68 };
  const W = 640;
  const H = 320;
  const iW = W - M.left - M.right;
  const iH = H - M.top - M.bottom;

  const svg = d3.select(root).append('svg')
    .attr('width', '100%')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('font-family', 'Inter, sans-serif');

  const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);

  const tooltip = d3.select(root).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', PAL.primary).style('color', '#fff')
    .style('padding', '8px 12px').style('border-radius', '6px')
    .style('font-size', '12px').style('opacity', '0')
    .style('transition', 'opacity .15s').style('z-index', '100');

  const parseMonth = d3.timeParse('%Y-%m');
  const fmtMonth = d3.timeFormat('%b %Y');

  const sorted = [...data].sort((a, b) =>
    (parseMonth(a.mes)?.getTime() ?? 0) - (parseMonth(b.mes)?.getTime() ?? 0));

  const dates = sorted.map(d => parseMonth(d.mes) as Date);
  const allVals = sorted.flatMap(d => [d.montoEstimado, d.costoFinalEjecutado]);
  const vMin = Math.min(...allVals) * 0.95;
  const vMax = Math.max(...allVals) * 1.05;

  const xScale = d3.scaleTime()
    .domain([dates[0], dates[dates.length - 1]]).range([0, iW]);
  const yScale = d3.scaleLinear().domain([vMin, vMax]).range([iH, 0]);

  // Shaded area between lines
  const areaGen = d3.area<PresupuestoMes>()
    .x((_, i) => xScale(dates[i]))
    .y0(d => yScale(d.montoEstimado))
    .y1(d => yScale(d.costoFinalEjecutado))
    .curve(d3.curveMonotoneX);

  // Split into over/under segments using clipPath approach — fill the whole area then re-colour
  g.append('path').datum(sorted)
    .attr('d', areaGen)
    .attr('fill', PAL.danger).attr('fill-opacity', 0.18);

  // Lines
  const lineGen = (key: 'montoEstimado' | 'costoFinalEjecutado') =>
    d3.line<PresupuestoMes>()
      .x((_, i) => xScale(dates[i]))
      .y(d => yScale(d[key]))
      .curve(d3.curveMonotoneX);

  g.append('path').datum(sorted)
    .attr('d', lineGen('montoEstimado')!)
    .attr('fill', 'none').attr('stroke', PAL.ok).attr('stroke-width', 2.5);

  g.append('path').datum(sorted)
    .attr('d', lineGen('costoFinalEjecutado')!)
    .attr('fill', 'none').attr('stroke', PAL.danger).attr('stroke-width', 2.5).attr('stroke-dasharray', '6,3');

  // Max deviation annotation
  let maxDevIdx = 0;
  let maxDev = 0;
  sorted.forEach((d, i) => {
    const dev = Math.abs(d.costoFinalEjecutado - d.montoEstimado);
    if (dev > maxDev) { maxDev = dev; maxDevIdx = i; }
  });
  const annotX = xScale(dates[maxDevIdx]);
  const annotY = yScale((sorted[maxDevIdx].costoFinalEjecutado + sorted[maxDevIdx].montoEstimado) / 2);
  g.append('line').attr('x1', annotX).attr('y1', yScale(sorted[maxDevIdx].costoFinalEjecutado))
    .attr('x2', annotX).attr('y2', yScale(sorted[maxDevIdx].montoEstimado))
    .attr('stroke', PAL.warning).attr('stroke-width', 2).attr('stroke-dasharray', '4,2');
  g.append('text').attr('x', annotX + 6).attr('y', annotY)
    .style('font-size', '10px').style('fill', PAL.warning)
    .text(`Δ máx: ${(((sorted[maxDevIdx].costoFinalEjecutado - sorted[maxDevIdx].montoEstimado) / sorted[maxDevIdx].montoEstimado) * 100).toFixed(1)}%`);

  // Interaction overlay
  sorted.forEach((d, i) => {
    g.append('circle').attr('cx', xScale(dates[i])).attr('cy', yScale(d.costoFinalEjecutado)).attr('r', 6)
      .attr('fill', PAL.danger).attr('fill-opacity', 0).attr('stroke', 'none')
      .style('cursor', 'pointer')
      .on('mousemove', (event) => {
        const diff = d.costoFinalEjecutado - d.montoEstimado;
        const pct = ((diff / d.montoEstimado) * 100).toFixed(1);
        tooltip.style('opacity', '1')
          .html(`<b>${fmtMonth(dates[i])}</b><br/>Estimado: $${d.montoEstimado.toLocaleString()}<br/>Ejecutado: $${d.costoFinalEjecutado.toLocaleString()}<br/>Desviación: ${pct}%`)
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'));
  });

  // Axes
  g.append('g').attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).ticks(dates.length > 6 ? 6 : dates.length).tickFormat(d => fmtMonth(d as Date)))
    .selectAll('text').style('font-size', '11px');

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(v => `$${(+v / 1000).toFixed(0)}k`))
    .selectAll('text').style('font-size', '11px');

  // Grid
  g.append('g').call(d3.axisLeft(yScale).ticks(5).tickSize(-iW).tickFormat(() => ''))
    .select('.domain').remove();
  g.selectAll('.tick line').attr('stroke', PAL.border);

  // Legend
  const legend = svg.append('g').attr('transform', `translate(${M.left},${H - 14})`);
  [['Estimado', PAL.ok, '', 0], ['Ejecutado', PAL.danger, '6,3', 160]].forEach(([label, color, dash, ox]) => {
    legend.append('line').attr('x1', +ox).attr('x2', +ox + 20).attr('y1', 0).attr('y2', 0)
      .attr('stroke', color as string).attr('stroke-width', 2.5).attr('stroke-dasharray', dash as string);
    legend.append('text').attr('x', +ox + 24).attr('y', 4)
      .style('font-size', '11px').style('fill', PAL.text).text(label as string);
  });
}
