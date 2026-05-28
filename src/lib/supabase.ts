import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
}

export interface OverheadConfig {
  id: 'digital' | 'analog';
  conceptos: Array<{
    nombre: string;
    mensual_usd: number;
    pct: number;
    n_maq: number;
  }>;
}

export interface ConfigCruces {
  id: string;
  metros_6mil_v12: number;
  metros_digital_analog: number;
  factor_v12: number;
  gap_eje_mm: number;
  gap_des_mm: number;
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

// ─── HELPERS DE LECTURA ───────────────────────────────────────────────────────

export async function getMaquinasDigital(): Promise<MaquinaDigital[]> {
  const { data, error } = await supabase
    .from('maquinas_digital')
    .select('*')
    .eq('activo', true)
    .order('id');
  if (error) throw error;
  return data ?? [];
}

export async function getMaquinasAnalog(): Promise<MaquinaAnalog[]> {
  const { data, error } = await supabase
    .from('maquinas_analog')
    .select('*')
    .eq('activo', true)
    .order('id');
  if (error) throw error;
  return data ?? [];
}

export async function getOverhead(tipo: 'digital' | 'analog'): Promise<OverheadConfig | null> {
  const { data, error } = await supabase
    .from('overhead_config')
    .select('*')
    .eq('id', tipo)
    .single();
  if (error) return null;
  return data;
}

export async function getConfigCruces(): Promise<ConfigCruces | null> {
  const { data, error } = await supabase
    .from('config_cruces')
    .select('*')
    .eq('id', 'default')
    .single();
  if (error) return null;
  return data;
}

export async function getMateriales(): Promise<Material[]> {
  const { data, error } = await supabase
    .from('materiales')
    .select('*')
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return data ?? [];
}

export async function getAcabados(): Promise<Acabado[]> {
  const { data, error } = await supabase
    .from('acabados')
    .select('*')
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return data ?? [];
}

// ─── HELPERS DE ESCRITURA ─────────────────────────────────────────────────────

export async function updateMaquinaDigital(id: string, patch: Partial<MaquinaDigital>) {
  const { error } = await supabase
    .from('maquinas_digital')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateMaquinaAnalog(id: string, patch: Partial<MaquinaAnalog>) {
  const { error } = await supabase
    .from('maquinas_analog')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateOverhead(tipo: 'digital' | 'analog', conceptos: OverheadConfig['conceptos']) {
  const { error } = await supabase
    .from('overhead_config')
    .update({ conceptos, updated_at: new Date().toISOString() })
    .eq('id', tipo);
  if (error) throw error;
}

export async function updateConfigCruces(patch: Partial<ConfigCruces>) {
  const { error } = await supabase
    .from('config_cruces')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 'default');
  if (error) throw error;
}

export async function saveCotizacionRFQ(data: {
  rfq_html?: string;
  eje_mm: number;
  des_mm: number;
  material?: string;
  pm_usd: number;
  tintas_dig: number;
  tintas_off: number;
  tintas_flex: number;
  acabados: Record<string, boolean>;
  cantidades: number[];
  resultado: unknown;
  ingeniero?: string;
}) {
  const { error } = await supabase.from('cotizaciones_rfq').insert([data]);
  if (error) throw error;
}
