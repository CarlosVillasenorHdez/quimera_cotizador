/**
 * Parser de RFQ exportados de CERM en formato HTML
 */
import { DatosEtiqueta } from './knowledge';

function caption(doc: Document, text: string): string {
  for (const el of Array.from(doc.querySelectorAll('.caption'))) {
    if (el.textContent?.toLowerCase().includes(text.toLowerCase())) {
      return el.nextElementSibling?.textContent?.trim() ?? '';
    }
  }
  return '';
}

function getQty(doc: Document, label: string): number {
  const raw = caption(doc, label).replace(/,/g, '').replace(/\s/g, '');
  return parseInt(raw) || 0;
}

export function parseRFQHtml(html: string): Partial<DatosEtiqueta> | null {
  if (typeof window === 'undefined') return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const eje = parseFloat(caption(doc, 'Label size across')) || 0;
  const des = parseFloat(caption(doc, 'Label size around')) || 0;
  if (!eje || !des) return null;

  // Quantities
  const cantidades: number[] = [];
  const bq = getQty(doc, 'Basic quantity');
  if (bq > 0) cantidades.push(bq);
  doc.querySelectorAll('.caption').forEach(el => {
    if (el.textContent?.toLowerCase().includes('alternative quantities')) {
      const v = parseInt((el.nextElementSibling?.textContent ?? '').replace(/,/g, '')) || 0;
      if (v > 0) cantidades.push(v);
    }
  });

  // Header lines for name/client
  const hdr = (doc.querySelector('.header_left')?.textContent ?? '')
    .split('\n').map(s => s.trim()).filter(Boolean);

  return {
    eje_mm: eje,
    des_mm: des,
    cantidades: [...new Set(cantidades)].sort((a, b) => a - b),
    nombre: hdr[0] ?? '',
    cliente: hdr[1] ?? '',
  };
}
