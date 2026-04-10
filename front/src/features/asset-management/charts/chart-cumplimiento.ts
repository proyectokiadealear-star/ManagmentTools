/**
 * KPI 5 — Cumplimiento del plan de mantenimiento (Donut con drill-down)
 *
 * JSON shape:
 * interface CumplimientoData {
 *   semaforos: { verde: number; amarillo: number; naranja: number; rojo: number };
 *   cumplimientoPorcentaje: number;
 *   vencidas?: { activoId: string; activoNombre: string; diasVencido: number }[];
 * }
 *
 * Why: Donut centers the key metric (% cumplimiento) and segments give
 * immediate breakdown. Click on "vencido/naranja" drills into a list.
 */
import * as d3 from 'd3';

export interface CumplimientoData {
  semaforos: { verde: number; amarillo: number; naranja: number; rojo: number };
  cumplimientoPorcentaje: number;
  vencidas?: { activoId: string; activoNombre: string; diasVencido?: number }[];
}

const PAL = {
  primary: '#1A1A2E', ok: '#4CAF50', warning: '#FF9800', naranja: '#FF5722',
  danger: '#F44336', text: '#1E293B', textMuted: '#64748B', border: '#E2E8F0',
};

export function renderChartCumplimiento(container: string | HTMLElement, data: CumplimientoData | null) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const W = 560;
  const H = 320;
  const cx = 200;
  const cy = H / 2;
  const r = 110;

  const svg = d3.select(root).append('svg')
    .attr('width', '100%')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('font-family', 'Inter, sans-serif');

  const tooltip = d3.select(root).append('div')
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('background', PAL.primary).style('color', '#fff')
    .style('padding', '8px 12px').style('border-radius', '6px')
    .style('font-size', '12px').style('opacity', '0')
    .style('transition', 'opacity .15s').style('z-index', '100');

  const segments = [
    { key: 'verde', label: 'Vigente', value: data.semaforos.verde, color: PAL.ok },
    { key: 'amarillo', label: 'Próximo (≤30d)', value: data.semaforos.amarillo, color: PAL.warning },
    { key: 'naranja', label: 'Próximo (≤7d)', value: data.semaforos.naranja, color: PAL.naranja },
    { key: 'rojo', label: 'Vencido', value: data.semaforos.rojo, color: PAL.danger },
  ];

  const total = segments.reduce((s, d) => s + d.value, 0);

  const pie = d3.pie<typeof segments[0]>()
    .value(d => d.value)
    .sort(null);

  const arc = d3.arc<d3.PieArcDatum<typeof segments[0]>>()
    .innerRadius(r * 0.62)
    .outerRadius(r);

  const arcHover = d3.arc<d3.PieArcDatum<typeof segments[0]>>()
    .innerRadius(r * 0.62)
    .outerRadius(r * 1.06);

  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

  g.selectAll('.arc')
    .data(pie(segments))
    .join('path').attr('class', 'arc')
    .attr('d', arc as any)
    .attr('fill', d => d.data.color)
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('mousemove', (event, d) => {
      d3.select(event.currentTarget).attr('d', arcHover as any);
      const pct = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : '0';
      tooltip.style('opacity', '1')
        .html(`<b>${d.data.label}</b><br/>${d.data.value} programaciones<br/>${pct}% del plan`)
        .style('left', `${event.offsetX + 12}px`)
        .style('top', `${event.offsetY - 10}px`);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).attr('d', arc as any);
      tooltip.style('opacity', '0');
    })
    .on('click', (_event, d) => {
      if ((d.data.key === 'rojo' || d.data.key === 'naranja') && data.vencidas && data.vencidas.length > 0) {
        showDrillDown(root, svg, data.vencidas);
      }
    });

  // Center text
  g.append('text').attr('text-anchor', 'middle').attr('y', -14)
    .style('font-size', '32px').style('font-weight', '800')
    .style('fill', data.cumplimientoPorcentaje >= 90 ? PAL.ok : data.cumplimientoPorcentaje >= 70 ? PAL.warning : PAL.danger)
    .text(`${data.cumplimientoPorcentaje}%`);

  g.append('text').attr('text-anchor', 'middle').attr('y', 12)
    .style('font-size', '12px').style('fill', PAL.textMuted)
    .text('cumplimiento');

  // Legend
  const legend = svg.append('g').attr('transform', `translate(${cx + r + 20}, ${cy - segments.length * 11})`);
  segments.forEach(({ label, color, value }, i) => {
    legend.append('circle').attr('cx', 6).attr('cy', i * 26 + 2).attr('r', 6).attr('fill', color);
    legend.append('text').attr('x', 18).attr('y', i * 26 + 7)
      .style('font-size', '11px').style('fill', PAL.text)
      .text(`${label}: ${value}`);
  });

  // Hint for drill down
  if (data.semaforos.rojo > 0 || data.semaforos.naranja > 0) {
    svg.append('text').attr('x', W / 2).attr('y', H - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px').style('fill', PAL.textMuted)
      .text('Clic en segmento rojo/naranja para ver detalle de vencidas');
  }
}

function showDrillDown(
  root: HTMLElement,
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  vencidas: { activoId: string; activoNombre: string; diasVencido?: number }[],
) {
  const panel = d3.select(root).append('div')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', '100%').style('height', '100%')
    .style('background', 'rgba(26,26,46,0.97)')
    .style('color', '#fff').style('padding', '20px').style('border-radius', '8px')
    .style('overflow-y', 'auto').style('z-index', '200').style('font-family', 'Inter, sans-serif');

  panel.append('div')
    .style('display', 'flex').style('justify-content', 'space-between').style('align-items', 'center').style('margin-bottom', '14px')
    .html(`<span style="font-weight:700;font-size:14px">⚠ Programaciones vencidas (${vencidas.length})</span>`)
    .append('button')
    .style('background', '#E94560').style('border', 'none').style('color', '#fff')
    .style('padding', '4px 12px').style('border-radius', '4px').style('cursor', 'pointer')
    .text('Cerrar')
    .on('click', () => panel.remove());

  vencidas.forEach(v => {
    panel.append('div')
      .style('padding', '8px 0').style('border-bottom', '1px solid rgba(255,255,255,0.1)')
      .html(`<span style="font-weight:600">${v.activoNombre}</span><span style="float:right;color:#FF9800">${v.diasVencido != null ? `${v.diasVencido}d vencido` : 'vencido'}</span>`);
  });
}
