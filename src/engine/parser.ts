/**
 * Parser de RFQ exportados de CERM en formato HTML
 *
 * Extrae: dimensiones, cantidades, tintas (digital + analógica),
 * material, acabados. Maneja tanto el HTML de la calculadora de metros
 * como los HTMLs de tintas, material y terminados.
 */
import { DatosEtiqueta, MATERIALES } from './knowledge';

function txt(el: Element | null): string {
  return el?.textContent?.trim() ?? '';
}

function findInTables(doc: Document, rowLabel: string): string {
  for (const row of Array.from(doc.querySelectorAll('tr'))) {
    const cells = Array.from(row.querySelectorAll('td, th'));
    if (cells.length >= 2) {
      const label = cells[0].textContent?.trim().toUpperCase() ?? '';
      if (label === rowLabel.toUpperCase()) return cells[1].textContent?.trim() ?? '';
    }
  }
  return '';
}

function findCaptionValue(doc: Document, label: string): string {
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    const t = el.textContent?.trim().toLowerCase() ?? '';
    if (t.includes(label.toLowerCase()) && el.children.length === 0) {
      const sib = el.nextElementSibling;
      if (sib && sib.children.length === 0) return txt(sib);
      const row = el.closest('tr');
      if (row) {
        const cells = Array.from(row.querySelectorAll('td, th'));
        const idx = cells.indexOf(el as HTMLTableCellElement);
        if (idx >= 0 && cells[idx + 1]) return txt(cells[idx + 1]);
      }
    }
  }
  return '';
}

// ── DIMENSIONES ────────────────────────────────────────────────────────────────

function parseDim(doc: Document): { eje_mm: number; des_mm: number } {
  // Input fields (calculadora de metros)
  const ejeEl = doc.getElementById('eje-etiqueta') as HTMLInputElement | null;
  const desEl = doc.getElementById('desarrollo-etiqueta') as HTMLInputElement | null;
  if (ejeEl?.value && desEl?.value) {
    const e = parseFloat(ejeEl.value), d = parseFloat(desEl.value);
    if (e > 0 && d > 0) return { eje_mm: e, des_mm: d };
  }
  // Caption fields (RFQ export)
  const e = parseFloat(findCaptionValue(doc, 'Label size across') ||
            findCaptionValue(doc, 'Eje') || '0');
  const d = parseFloat(findCaptionValue(doc, 'Label size around') ||
            findCaptionValue(doc, 'Desarrollo') || '0');
  if (e > 0 && d > 0) return { eje_mm: e, des_mm: d };
  // Fallback: N×M mm pattern
  const pat = /(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*mm/i;
  for (const el of Array.from(doc.querySelectorAll('td, th, div, p'))) {
    const m = el.textContent?.match(pat);
    if (m) return { eje_mm: parseFloat(m[1]), des_mm: parseFloat(m[2]) };
  }
  return { eje_mm: 0, des_mm: 0 };
}

// ── CANTIDADES ─────────────────────────────────────────────────────────────────

function parseCantidades(doc: Document): number[] {
  const qty: number[] = [];
  const bq = parseInt((findCaptionValue(doc, 'Basic quantity') || '').replace(/\D/g, ''));
  if (bq > 0) qty.push(bq);
  for (const el of Array.from(doc.querySelectorAll('td, th, .caption'))) {
    const t = el.textContent?.toLowerCase() ?? '';
    if (t.includes('alternative quantit') || t.includes('cantidad altern')) {
      const row = el.closest('tr');
      const val = parseInt((row?.querySelectorAll('td')[1]?.textContent ?? '').replace(/\D/g, ''));
      if (val > 0) qty.push(val);
    }
  }
  return [...new Set(qty)].sort((a, b) => a - b).slice(0, 6);
}

// ── TINTAS ─────────────────────────────────────────────────────────────────────

function parseTintas(doc: Document): Partial<DatosEtiqueta> {
  const r: Partial<DatosEtiqueta> = {};
  const body = doc.body?.textContent?.toLowerCase() ?? '';
  if (!body.includes('tinta') && !body.includes('cmyk')) return r;

  // CMYK
  const cmyk = body.match(/cmyk\s*\((\d+)\s*tintas?\)/i);
  r.tintas_proceso = cmyk ? parseInt(cmyk[1]) : (body.includes('cmyk') ? 4 : 0);

  // Especiales digitales
  r.tiene_blanco    = body.includes('blanco') && (body.includes('cama de blanco') || body.includes('tinta blanca'));
  r.tiene_plata     = body.includes('plata') && (body.includes('cama') || body.includes('tinta plata'));
  r.tiene_invisible = body.includes('invisible') || body.includes('fluorescente');
  r.tiene_barniz_uv = body.includes('barniz uv') || body.includes('barniz digital');

  // VOG — contar colores activos como tintas proceso adicionales
  const vog = body.match(/vog[^\n]{0,80}/i);
  if (vog) {
    const vogN = (vog[0].match(/violeta|naranja|verde/gi) ?? []).length;
    r.tintas_proceso = (r.tintas_proceso ?? 4) + vogN;
  }

  // Analógicas
  const flexo = body.match(/flexograf[ií]a[:\s]+(\d+)\s*tinta/i);
  if (flexo) r.tintas_flexo = parseInt(flexo[1]);

  const seri = body.match(/serigraf[ií]a[:\s]+(\d+)\s*tinta/i);
  if (seri) r.tintas_screen = parseInt(seri[1]);

  return r;
}

// ── MATERIAL ───────────────────────────────────────────────────────────────────

function parseMaterial(doc: Document): Partial<DatosEtiqueta> {
  const nombre = findInTables(doc, 'MATERIAL');
  if (!nombre) return {};
  const norm = nombre.toUpperCase().trim();
  const found = MATERIALES.find(m =>
    m.nombre.toUpperCase() === norm ||
    norm.includes(m.nombre.toUpperCase()) ||
    m.nombre.toUpperCase().includes(norm)
  );
  if (found) return { material_id: found.id, material_nombre: found.nombre };
  return { material_id: 'otro', material_nombre: nombre };
}

// ── TERMINADOS ─────────────────────────────────────────────────────────────────

function parseTerminados(doc: Document): Partial<DatosEtiqueta> {
  const r: Partial<DatosEtiqueta> = {};
  const body = doc.body?.textContent?.toLowerCase() ?? '';
  if (!body.includes('terminado') && !body.includes('barniz') &&
      !body.includes('stamping') && !body.includes('embos')) return r;

  r.tiene_hot_stamping = body.includes('hot stamping');
  r.tiene_cold_foil    = body.includes('cold foil');
  r.tiene_embossing    = body.includes('embosado') || body.includes('embossing');
  r.tiene_screen       = /serigraf[ií]a.*s[ií]|screen.*s[ií]/i.test(body);
  r.tiene_cupon        = /cup[oó]n.*s[ií]/i.test(body);

  return r;
}

// ── HEADER ─────────────────────────────────────────────────────────────────────

function parseHeader(doc: Document): { nombre: string; cliente: string } {
  const hdr = doc.querySelector('.header_left');
  if (hdr) {
    const lines = (hdr.textContent ?? '').split('\n').map(s => s.trim()).filter(Boolean);
    return { nombre: lines[0] ?? '', cliente: lines[1] ?? '' };
  }
  return { nombre: doc.querySelector('title')?.textContent?.trim() ?? '', cliente: '' };
}

// ── EXPORT ─────────────────────────────────────────────────────────────────────

export function parseRFQHtml(html: string): Partial<DatosEtiqueta> | null {
  if (typeof window === 'undefined') return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const dim = parseDim(doc);
  if (!dim.eje_mm || !dim.des_mm) return null;
  const cantidades = parseCantidades(doc);
  return {
    ...dim,
    cantidades: cantidades.length > 0 ? cantidades : [1000, 5000, 10000, 50000],
    ...parseHeader(doc),
    ...parseTintas(doc),
    ...parseMaterial(doc),
    ...parseTerminados(doc),
  };
}
