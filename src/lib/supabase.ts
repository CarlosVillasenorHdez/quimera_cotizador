/**
 * Cliente Supabase que enruta todas las llamadas por /api/db (Route Handler).
 * Esto hace que los requests salgan desde Vercel (server-side), no desde
 * el browser — resolviendo la restricción de host del sb_publishable key.
 *
 * Flujo:
 *   Browser → /api/db (Next.js Route Handler en Vercel) → Supabase
 */

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface MaquinaDigital {
  id: string;
  nombre: string;
  planilla_mm: number;
  frame_cm: number;
  setup_m: number;
  click_usd: number | null;
  tinta_m2_usd: number | null;
  hp_hr_usd: number;
  cobro_min_min: number;
  ancho_mat_m: number;
  velocidades: Record<string, number>;
  activo: boolean;
  updated_at?: string;
}

export interface MaquinaAnalog {
  id: string;
  nombre: string;
  ancho_max_mm: number;
  costo_hr_usd: number;
  vel_std: number;
  vel_screen: number;
  vel_hs: number;
  vel_cupon: number;
  cabezas_offset: number;
  cabezas_flexo: number;
  cabezas_screen: number;
  cold_foil: boolean;
  hot_stamping: boolean;
  embossing: boolean;
  puede_cupon: boolean;
  activo: boolean;
  updated_at?: string;
}

export interface OverheadConfig {
  id: 'digital' | 'analog';
  conceptos: Array<{ nombre: string; mensual_usd: number; pct: number; n_maq: number }>;
  updated_at?: string;
}

export interface ConfigCruces {
  id: string;
  metros_6mil_v12: number;
  metros_digital_analog: number;
  factor_v12: number;
  gap_eje_mm: number;
  gap_des_mm: number;
  updated_at?: string;
}

export interface Material {
  id: string;
  nombre: string;
  precio_usd: number;
  categoria: string;
  activo: boolean;
}

export interface Acabado {
  id: string;
  nombre: string;
  precio_dig: number;
  precio_ana: number;
  activo: boolean;
}

// ─── HELPERS INTERNOS ─────────────────────────────────────────────────────────

async function dbGet<T>(table: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ table, ...params }).toString();
  const res = await fetch(`/api/db?${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`DB GET ${table} → ${res.status}`);
  return res.json();
}

async function dbPatch(table: string, id: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch('/api/db', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, id, data }),
  });
  if (!res.ok) throw new Error(`DB PATCH ${table}:${id} → ${res.status}`);
}

async function dbPost(table: string, data: unknown, upsert = false): Promise<void> {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, data, upsert }),
  });
  if (!res.ok) throw new Error(`DB POST ${table} → ${res.status}`);
}

// ─── LECTURA ──────────────────────────────────────────────────────────────────

export async function getMaquinasDigital(): Promise<MaquinaDigital[]> {
  return dbGet<MaquinaDigital[]>('maquinas_digital', { activo: 'true' });
}

export async function getMaquinasAnalog(): Promise<MaquinaAnalog[]> {
  return dbGet<MaquinaAnalog[]>('maquinas_analog', { activo: 'true' });
}

export async function getOverhead(tipo: 'digital' | 'analog'): Promise<OverheadConfig | null> {
  try { return await dbGet<OverheadConfig>('overhead_config', { eq_id: tipo, single: '1' }); }
  catch { return null; }
}

export async function getConfigCruces(): Promise<ConfigCruces | null> {
  try { return await dbGet<ConfigCruces>('config_cruces', { eq_id: 'default', single: '1' }); }
  catch { return null; }
}

export async function getMateriales(): Promise<Material[]> {
  return dbGet<Material[]>('materiales', { activo: 'true' });
}

export async function getAcabados(): Promise<Acabado[]> {
  return dbGet<Acabado[]>('acabados', { activo: 'true' });
}

// ─── ESCRITURA ────────────────────────────────────────────────────────────────

export async function updateMaquinaDigital(id: string, patch: Partial<MaquinaDigital>) {
  return dbPatch('maquinas_digital', id, patch as Record<string, unknown>);
}

export async function updateMaquinaAnalog(id: string, patch: Partial<MaquinaAnalog>) {
  return dbPatch('maquinas_analog', id, patch as Record<string, unknown>);
}

export async function updateOverhead(tipo: 'digital' | 'analog', conceptos: OverheadConfig['conceptos']) {
  return dbPatch('overhead_config', tipo, { conceptos });
}

export async function updateConfigCruces(patch: Partial<ConfigCruces>) {
  return dbPatch('config_cruces', 'default', patch as Record<string, unknown>);
}

export async function saveCotizacionRFQ(data: {
  rfq_html?: string;
  eje_mm: number; des_mm: number;
  material?: string; pm_usd: number;
  tintas_dig: number; tintas_off: number; tintas_flex: number;
  acabados: Record<string, boolean>;
  cantidades: number[];
  resultado: unknown;
  ingeniero?: string;
}) {
  return dbPost('cotizaciones_rfq', data);
}
