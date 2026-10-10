/**
 * Minimal ESRI Shapefile reader — geometry only, no dependencies.
 *
 * The .shp is a flat record stream: a 100-byte header, then per record an
 * 8-byte big-endian header followed by little-endian content. That is the whole
 * format for the three shapes MML uses (point, polyline, polygon), so a reader
 * is smaller than a dependency.
 */
import { readFileSync } from 'node:fs';

export const SHAPE = { NULL: 0, POINT: 1, POLYLINE: 3, POLYGON: 5, MULTIPOINT: 8 };

/** Yields { type, parts: [[ [x,y], … ], … ] } per record; a point is one 1-point part. */
export function* readShapes(path) {
  const b = readFileSync(path);
  if (b.readInt32BE(0) !== 9994) throw new Error(`${path}: not a .shp (bad file code)`);
  const end = b.readInt32BE(24) * 2;                 // file length is in 16-bit words
  let o = 100;
  while (o + 8 <= end) {
    const len = b.readInt32BE(o + 4) * 2;            // content length, 16-bit words
    const c = o + 8;
    const type = b.readInt32LE(c);
    if (type === SHAPE.POINT) {
      yield { type, parts: [[[b.readDoubleLE(c + 4), b.readDoubleLE(c + 12)]]] };
    } else if (type === SHAPE.POLYLINE || type === SHAPE.POLYGON) {
      const nParts = b.readInt32LE(c + 36), nPts = b.readInt32LE(c + 40);
      const pStart = c + 44, xy = pStart + nParts * 4;
      const parts = [];
      for (let i = 0; i < nParts; i++) {
        const from = b.readInt32LE(pStart + i * 4);
        const to = i + 1 < nParts ? b.readInt32LE(pStart + (i + 1) * 4) : nPts;
        const ring = [];
        for (let k = from; k < to; k++) ring.push([b.readDoubleLE(xy + k * 16), b.readDoubleLE(xy + k * 16 + 8)]);
        parts.push(ring);
      }
      yield { type, parts };
    } else if (type !== SHAPE.NULL) {
      yield { type, parts: [] };                     // multipoint etc., not needed here
    }
    o = c + len;
  }
}
