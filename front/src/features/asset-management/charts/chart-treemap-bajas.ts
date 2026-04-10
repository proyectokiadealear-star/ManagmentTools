/**
 * KPI 12 — Capital inmovilizado en activos dados de baja (Treemap)
 *
 * JSON shape:
 * interface ActivoDadoBaja {
 *   activoId: string; nombre: string; valorOriginal: number;
 *   fechaBaja: string; diasDesdeBaja: number;
 * }
 *
 * Why: Treemaps show proportion of a total at a glance — each cell's
 * area = valorOriginal. Color encodes age since baja (white=recent,
 * dark red=long-term idle capital).
 */
import * as d3 from 'd3';

export interface ActivoDadoBaja {
  activoId: string;
  nombre: string;
  valorOriginal: number;
  fechaBaja: string;
  diasDesdeBaja: number;
}

const PAL = {
  primary: '#1A1A2E', text: '#1E293B', textMuted: '#64748B',
};

export function renderChartTreemapBajas(
  container: string | HTMLElement,
  data: ActivoDadoBaja[] | null,
) {
  const root = typeof container === 'string'
    ? (document.querySelector(container) as HTMLElement) : container;
  if (!root) return;
  root.innerHTML = '';

  if (!data || data.length === 0) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;color:${PAL.textMuted};font-family:sans-serif;">Sin datos disponibles</div>`;
    return;
  }

  const W = 640;
  const H = 360;

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

  const maxDias = Math.max(...data.map(d => d.diasDesdeBaja));
  const colorScale = d3.scaleSequential(d3.interpolateReds)
    .domain([0, maxDias]);

  // Treemap layout
  interface TreeRoot { children: ActivoDadoBaja[] }
  const root2 = d3.hierarchy<TreeRoot>({ children: data })
    .sum(d => (d as unknown as ActivoDadoBaja).valorOriginal ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const treemapLayout = d3.treemap<TreeRoot>()
    .size([W, H - 24])
    .paddingOuter(4)
    .paddingInner(2)
    .round(true);

  treemapLayout(root2);

  const leaves = root2.leaves() as unknown as Array<d3.HierarchyRectangularNode<ActivoDadoBaja>>;

  const cell = svg.selectAll<SVGGElement, d3.HierarchyRectangularNode<ActivoDadoBaja>>('g')
    .data(leaves)
    .join('g')
    .attr('transform', d => `translate(${d.x0},${d.y0})`);

  cell.append('rect')
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .attr('fill', d => colorScale(d.data.diasDesdeBaja))
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .attr('rx', 3)
    .style('cursor', 'pointer')
    .on('mousemove', (event, d) => {
      tooltip.style('opacity', '1')
        .html(`<b>${d.data.nombre}</b><br/>Valor original: $${d.data.valorOriginal.toLocaleString()}<br/>Fecha baja: ${d.data.fechaBaja}<br/>Días inmovilizado: ${d.data.diasDesdeBaja}`)
        .style('left', `${event.offsetX + 12}px`)
        .style('top', `${event.offsetY - 10}px`);
    })
    .on('mouseleave', () => tooltip.style('opacity', '0'));

  // Label — only when cell is large enough
  cell.append('text')
    .attr('x', 4).attr('y', 14)
    .style('font-size', '11px')
    .style('fill', d => d.data.diasDesdeBaja > maxDias * 0.5 ? '#fff' : PAL.text)
    .style('pointer-events', 'none')
    .text(d => {
      const w = d.x1 - d.x0;
      if (w < 50) return '';
      return d.data.nombre.length > Math.floor(w / 7) ? d.data.nombre.substring(0, Math.floor(w / 7) - 1) + '…' : d.data.nombre;
    });

  cell.append('text')
    .attr('x', 4).attr('y', 28)
    .style('font-size', '10px')
    .style('fill', d => d.data.diasDesdeBaja > maxDias * 0.5 ? 'rgba(255,255,255,0.8)' : PAL.textMuted)
    .style('pointer-events', 'none')
    .text(d => {
      const w = d.x1 - d.x0;
      if (w < 60) return '';
      return `$${(d.data.valorOriginal / 1000).toFixed(0)}k`;
    });

  // Color legend (continuous)
  const legendW = 160;
  const legendG = svg.append('g').attr('transform', `translate(${(W - legendW) / 2},${H - 20})`);
  const defs = svg.append('defs');
  const gradId = 'treemap-grad';
  const grad = defs.append('linearGradient').attr('id', gradId);
  d3.range(0, 1.01, 0.1).forEach(t => {
    grad.append('stop').attr('offset', `${t * 100}%`)
      .attr('stop-color', colorScale(t * maxDias));
  });
  legendG.append('rect').attr('width', legendW).attr('height', 8)
    .attr('fill', `url(#${gradId})`).attr('rx', 3);
  legendG.append('text').attr('y', -3).style('font-size', '9px').style('fill', PAL.textMuted)
    .text('0 días');
  legendG.append('text').attr('x', legendW).attr('y', -3).attr('text-anchor', 'end')
    .style('font-size', '9px').style('fill', PAL.textMuted).text(`${maxDias} días`);
}
