// Centroide (ponderado por área) do maior polígono de um GeoJSON. Usado só para posicionar marcadores.
function ringCentroid(ring) {
  let area = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
  }
  area /= 2;
  if (area === 0) return null;
  return { area: Math.abs(area), lng: cx / (6 * area), lat: cy / (6 * area) };
}

export function geometryCenter(geojson) {
  const polygons = [];
  for (const f of geojson?.features ?? []) {
    const g = f.geometry;
    if (g?.type === 'Polygon') polygons.push(g.coordinates);
    else if (g?.type === 'MultiPolygon') polygons.push(...g.coordinates);
  }
  const best = polygons.map((p) => ringCentroid(p[0])).filter(Boolean).sort((a, b) => b.area - a.area)[0];
  return best ? { lat: best.lat, lng: best.lng } : null;
}
