#!/usr/bin/env node
/**
 * MML topographic vector map (Shapefile) -> L0 documents.
 *
 * The clustering key is `collection * 4^order + hilbert(centroid)`: the high bits
 * make each layer a contiguous block, so a profile that wants eight layers never
 * touches the other sixty-four, and the low bits put spatially near features next
 * to each other, so a bounding box is a handful of contiguous ranges.
 *
 * Nothing derivable is stored: the position is the id, the catalog maps positions
 * to key ranges, the collection is in the key and the centroid is in the geometry.
 */
import { readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { readShapes } from './shapefile.js';
import { readDbf } from './dbf.js';
import { encodeParts } from '../src/geom.js';
import { gridder } from '../src/hilbert.js';

export const ORDER = 18;                       // 2.7 m cells over the Finnish extent
export const EXTENT = { minx: 50000, miny: 6570000, maxx: 760000, maxy: 7800000 };
export const SPAN = 2 ** (2 * ORDER);
const NODATA = -29999;                          // MML's "unknown" sentinel

/** Layer name from `M5R_TieViiva.shp` -> `TieViiva`. */
const layerOf = f => basename(f).replace(/^[^_]+_/, '').replace(/\.shp$/i, '');

/**
 * Collection names are `<layer>@<scale>`, because a generalised scale is NOT a
 * subset of the detailed one — its features are different features, merged and
 * displaced by the cartographer. Treating the pair as one collection puts each
 * in its own contiguous block, so a viewport reads the scale it wants and never
 * touches the other.
 */
export const collectionsOf = sources => [...new Set(sources.flatMap(({ dirs, scale }) =>
  dirs.flatMap(d => readdirSync(d).filter(f => f.endsWith('.shp'))
    .map(f => `${layerOf(f)}@${scale}`))))].sort();

export function* readSheets(sources) {
  const collections = collectionsOf(sources);
  const idOf = new Map(collections.map((l, i) => [l, i]));
  const grid = gridder(ORDER, EXTENT);

  for (const { dirs, scale } of sources) for (const dir of dirs) {
    for (const f of readdirSync(dir).filter(x => x.endsWith('.shp'))) {
      const layer = layerOf(f), ci = idOf.get(`${layer}@${scale}`);
      const dbf = join(dir, f.replace(/\.shp$/i, '.dbf'));
      const attrs = existsSync(dbf) ? readDbf(dbf).rows : [];
      let i = 0;
      for (const sh of readShapes(join(dir, f))) {
        const a = attrs[i++] ?? {};
        if (!sh.parts.length) continue;
        let sx = 0, sy = 0, n = 0;
        for (const p of sh.parts) for (const [x, y] of p) { sx += x; sy += y; n++; }
        if (!n) continue;
        const doc = {
          // `ki` is the collection index as a number, and it IS stored: the name
          // is derivable from the key's high bits, but only to granule precision
          // without an extra fetch, and a renderer needs to know exactly which
          // layer a feature belongs to. Two varint bytes against a repeated
          // string is the cheap way to be exact.
          kokoelma: `${layer}@${scale}`, ki: ci, taso: layer, mittakaava: scale,
          avain: ci * SPAN + grid(sx / n, sy / n),
          x: Math.round(sx / n), y: Math.round(sy / n),
          geom: encodeParts(sh.parts),
        };
        for (const [k, v] of Object.entries(a)) doc[k] = (v === NODATA || v === '') ? null : v;
        yield doc;
      }
    }
  }
}


