/**
 * Minimal dBASE III (.dbf) reader — the attribute half of a Shapefile.
 *
 * Fixed-width records behind a field table: no dependency earns its keep here.
 * The character encoding lives in the sibling .cpg, because MML writes Finnish
 * place names and getting ä wrong is not a cosmetic problem.
 */
import { readFileSync, existsSync } from 'node:fs';

const CODEPAGE = { UTF8: 'utf8', 'UTF-8': 'utf8', ISO88591: 'latin1', 'ISO-8859-1': 'latin1' };

export function readDbf(path) {
  const b = readFileSync(path);
  const count = b.readUInt32LE(4), headerLen = b.readUInt16LE(8), recLen = b.readUInt16LE(10);

  const cpg = path.replace(/\.dbf$/i, '.cpg');
  const tag = existsSync(cpg) ? readFileSync(cpg, 'ascii').trim().toUpperCase().replace(/\s/g, '') : '';
  const enc = CODEPAGE[tag] ?? (/UTF/.test(tag) ? 'utf8' : 'latin1');

  const fields = [];
  for (let o = 32; b[o] !== 0x0d && o + 32 <= headerLen; o += 32) {
    fields.push({
      name: b.toString('ascii', o, o + 11).replace(/\0.*$/, ''),
      type: String.fromCharCode(b[o + 11]),
      length: b[o + 16],
    });
  }

  const rows = [];
  for (let i = 0; i < count; i++) {
    let o = headerLen + i * recLen;
    if (b[o] === 0x2a) continue;                       // 0x2a marks a deleted record
    o += 1;
    const row = {};
    for (const f of fields) {
      const raw = b.toString(enc, o, o + f.length).trim();
      o += f.length;
      row[f.name] = f.type === 'N' || f.type === 'F' ? (raw === '' ? null : Number(raw))
                  : f.type === 'L' ? /^[YyTt]$/.test(raw)
                  : f.type === 'D' && raw.length === 8
                    ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6)}`
                  : raw;
    }
    rows.push(row);
  }
  return { fields, rows };
}
