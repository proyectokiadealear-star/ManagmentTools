/**
 * KPI 13 — Consumo anómalo de insumos (Scatter plot with zones)
 *
 * JSON shape:
 * interface ConsumoAnomalia {
 *   insumoId: string; nombre: string;
 *   tecnicoId: string; tecnicoNombre: string;
 *   consumoEsperado: number; consumoReal: number;
 *   desviacion: number;  // (real - esperado) / esperado
 * }
 *
 * Why: Identity line (y=x) separates over from under-consumption.
 * A ±30% band highlights acceptable variance. Points outside that
 * band are colored red and annotated.
 */
import * as d3 from 'd3';

export interface ConsumoAnomalia {
  insumoId: string;
  nombre: string;
  tecnicoId: string;
  tecnicoNombre: string;
  consumoEsperado: number;
  consumoReal: number;
  desviacion: number;
}

const PAL = {
  primary: '#1A1A2E', ok: '#4CAF50', warning: '#FF9800', danger: '#F44336',
  text: '#1E293B', textMuted: '#64748B', border: '#E2E8F0',
};

export function renderChartScatterInsumos(
  container: string | HTMLElement,
  data: ConsumoAnomalia[] | null,
) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || data.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const M = { top: 24, right: 32, bottom: 56, left: 64 };
  const W = 640;
  const H = 380;
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

  const allX = data.map(d => d.consumoEsperado);
  const allY = data.map(d => d.consumoReal);
  const maxV = Math.max(...allX, ...allY) * 1.1;
  const BAND = 0.30;

  const xScale = d3.scaleLinear().domain([0, maxV]).range([0, iW]).nice();
  const yScale = d3.scaleLinear().domain([0, maxV]).range([iH, 0]).nice();

  // Shaded ±30% band around identity line — draw as filled polygon
  const bpts = (() => {
    const ticks = d3.range(0, maxV * 1.05, maxV / 100);
    const upper = ticks.map(v => [xScale(v), yScale(v * (1 + BAND))] as [number, number]);
    const lower = ticks.map(v => [xScale(v), yScale(v * (1 - BAND))] as [number, number]).reverse();
    return [...upper, ...lower, upper[0]];
  })();
  g.append('polygon')
    .attr('points', bpts.map(p => p.join(',')).join(' '))
    .attr('fill', PAL.ok).attr('fill-opacity', 0.12);

  // Identity line y = x
  g.append('line')
    .attr('x1', xScale(0)).attr('y1', yScale(0))
    .attr('x2', xScale(maxV)).attr('y2', yScale(maxV))
    .attr('stroke', PAL.textMuted).attr('stroke-width', 1.5).attr('stroke-dasharray', '5,3');

  // Grid
  g.append('g').call(d3.axisLeft(yScale).ticks(5).tickSize(-iW).tickFormat(() => ''))
    .select('.domain').remove();
  g.selectAll('.tick line').attr('stroke', PAL.border);

  // Color by técnico (unique color per técnico, up to 8 then grey)
  const tecnicos = Array.from(new Set(data.map(d => d.tecnicoId)));
  const tecnicoColors = d3.schemeTableau10;
  const tecnicoColorMap = new Map<string, string>(tecnicos.map((id, i) => [id, tecnicoColors[i % 10]]));

  // Dots
  data.forEach(d => {
    const overLimit = Math.abs(d.desviacion) > BAND;
    const color = overLimit ? PAL.danger : (tecnicoColorMap.get(d.tecnicoId) ?? PAL.textMuted);

    g.append('circle')
      .attr('cx', xScale(d.consumoEsperado)).attr('cy', yScale(d.consumoReal))
      .attr('r', overLimit ? 8 : 6)
      .attr('fill', color).attr('fill-opacity', 0.75)
      .attr('stroke', overLimit ? PAL.danger : '#fff').attr('stroke-width', overLimit ? 2 : 1)
      .style('cursor', 'pointer')
      .on('mousemove', (event) => {
        const pct = (d.desviacion * 100).toFixed(1);
        tooltip.style('opacity', '1')
          .html(`<b>${d.nombre}</b><br/>Técnico: ${d.tecnicoNombre}<br/>Esperado: ${d.consumoEsperado}<br/>Real: ${d.consumoReal}<br/>Desviación: ${pct}%`)
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'));

    // Annotate extreme outliers
    if (Math.abs(d.desviacion) > 0.5) {
      g.append('text')
        .attr('x', xScale(d.consumoEsperado) + 10)
        .attr('y', yScale(d.consumoReal) - 4)
        .style('font-size', '9px').style('fill', PAL.danger)
        .text(d.nombre.length > 14 ? d.nombre.substring(0, 14) + '…' : d.nombre);
    }
  });

  // Band legend
  g.append('text').attr('x', xScale(maxV * 0.6)).attr('y', yScale(maxV * 0.6 * (1 + BAND)) - 5)
    .style('font-size', '9px').style('fill', PAL.ok).text('+30% límite');
  g.append('text').attr('x', xScale(maxV * 0.6)).attr('y', yScale(maxV * 0.6 * (1 - BAND)) + 12)
    .style('font-size', '9px').style('fill', PAL.ok).text('-30% límite');

  // Axes
  g.append('g').attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).ticks(5))
    .selectAll('text').style('font-size', '11px');
  g.append('g').call(d3.axisLeft(yScale).ticks(5))
    .selectAll('text').style('font-size', '11px');

  svg.append('text')
    .attr('x', M.left + iW / 2).attr('y', H - 6)
    .attr('text-anchor', 'middle').style('font-size', '11px').style('fill', PAL.textMuted)
    .text('Consumo esperado');
  svg.append('text')
    .attr('transform', `translate(14,${M.top + iH / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').style('font-size', '11px').style('fill', PAL.textMuted)
    .text('Consumo real');

  // Técnico legend (sidebar)
  const legendG = svg.append('g').attr('transform', `translate(${M.left},${H - 14})`);
  tecnicos.slice(0, 8).forEach((id, i) => {
    const tec = data.find(d => d.tecnicoId === id);
    if (!tec) return;
    legendG.append('circle').attr('cx', i * 120 + 6).attr('cy', 0).attr('r', 5)
      .attr('fill', tecnicoColorMap.get(id) ?? PAL.textMuted);
    legendG.append('text').attr('x', i * 120 + 14).attr('y', 4)
      .style('font-size', '10px').style('fill', PAL.text)
      .text(tec.tecnicoNombre.split(' ')[0]);
  });
}
