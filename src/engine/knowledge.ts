/**
 * BASE DE CONOCIMIENTO — Motor de Decisión Técnica Quimera
 *
 * Este archivo contiene TODA la información técnica de las máquinas,
 * reglas de elegibilidad, inventario de cilindros y restricciones.
 * Es la fuente única de verdad para el pensador.
 *
 * Las constantes pueden ser sobreescritas en tiempo de ejecución por la
 * tabla `reglas_config` de Supabase (sin tocar código).
 */

// ─── CONSTANTES GLOBALES ──────────────────────────────────────────────────────

export const PASO_DIENTE_MM = 3.175;          // 1/8" en mm
export const GAP_MIN_MM     = 2.5;            // gap mínimo entre etiquetas

/** Puntos de cambio de tecnología (metros lineales). Editables en Supabase. */
export const UMBRALES = {
  metros_6mil_to_v12:          1200,   // 6K → V12
  metros_digital_to_analog:    5000,   // Digital → Analógica
};

// ─── MÁQUINAS DIGITALES ───────────────────────────────────────────────────────

export interface MaquinaDigital {
  id: string;
  nombre: string;
  planilla_mm: number;        // Ancho de planilla (eje disponible)
  frame_cm: number;           // Largo del frame (desarrollo disponible)
  setup_m: number;            // Metros de preparación
  gap_eje_mm: number;         // Gap entre etiquetas al eje
  gap_des_mm: number;         // Gap entre etiquetas al desarrollo
  click_usd: number;          // Costo por click (impresión)
  tintas_max: number;         // Máximo número de tintas
  soporta_blanco: boolean;    // Tiene tinta blanca
  soporta_plata: boolean;     // Tiene tinta plata/metálica
  soporta_barniz_uv: boolean; // Tiene estación UV inline
  vel_m_min: Record<number, number>; // Velocidad por número de tintas
  nota_tecnica?: string;
}

export const MAQUINAS_DIGITAL: MaquinaDigital[] = [
  {
    id: '6MIL',
    nombre: 'HP Indigo 6K',
    planilla_mm: 317,
    frame_cm: 97.0,
    setup_m: 5,
    gap_eje_mm: 3,
    gap_des_mm: 3,
    click_usd: 0.0242,
    tintas_max: 7,
    soporta_blanco: true,
    soporta_plata: true,
    soporta_barniz_uv: false,
    vel_m_min: { 1:42, 2:42, 3:42, 4:31, 5:25, 6:21, 7:18, 8:15, 9:13, 10:12 },
    nota_tecnica: 'Planilla 13" (317mm). Soporta hasta 7 tintas base + blanco + plata.',
  },
  {
    id: 'V12',
    nombre: 'HP Indigo V12',
    planilla_mm: 313,
    frame_cm: 100.0,
    setup_m: 100,
    gap_eje_mm: 3,
    gap_des_mm: 3,
    click_usd: 0.022,
    tintas_max: 14,
    soporta_blanco: true,
    soporta_plata: false,
    soporta_barniz_uv: false,
    vel_m_min: { 1:120, 2:120, 3:120, 4:120, 5:120, 6:120, 7:60, 8:60, 9:60, 10:60, 11:60, 12:60, 13:30, 14:30 },
    nota_tecnica: 'Planilla 13" (313mm). NO soporta tinta plata/metálica. Setup alto (100m) — viable solo a volúmenes medios-altos.',
  },
  {
    id: '20MIL',
    nombre: 'HP Indigo 20K',
    planilla_mm: 714,
    frame_cm: 110.0,
    setup_m: 10,
    gap_eje_mm: 3,
    gap_des_mm: 3,
    click_usd: 0.0715,
    tintas_max: 7,
    soporta_blanco: true,
    soporta_plata: true,
    soporta_barniz_uv: false,
    vel_m_min: { 1:42, 2:42, 3:42, 4:31, 5:25, 6:21, 7:18, 8:15, 9:13, 10:12 },
    nota_tecnica: 'Planilla 30" (714mm). Para etiquetas grandes que no caben en 6K/V12.',
  },
];

// ─── MÁQUINAS ANALÓGICAS ──────────────────────────────────────────────────────

export interface MaquinaAnalog {
  id: string;
  nombre: string;
  ancho_max_mm: number;       // Ancho máximo de bobina
  gap_eje_mm: number;         // Gap mínimo entre etiquetas al eje
  gap_des_max_mm: number;     // Gap máximo aceptable al desarrollo (para cilindros)
  vel_std_m_min: number;      // Velocidad estándar
  vel_screen_m_min: number;   // Velocidad con serigrafía
  vel_hs_m_min: number;       // Velocidad con hot stamping
  cabezas_offset: number;     // Número máximo de tintas offset
  cabezas_flexo: number;      // Número máximo de tintas flexo
  cabezas_screen: number;     // Número de estaciones serigrafía
  tiene_cold_foil: boolean;
  tiene_hot_stamping: boolean;
  tiene_embossing: boolean;
  puede_cupon: boolean;
  nota_tecnica?: string;
}

export const MAQUINAS_ANALOG: MaquinaAnalog[] = [
  {
    id: 'MO',
    nombre: 'MO Fusion',
    ancho_max_mm: 406.4,
    gap_eje_mm: 3,
    gap_des_max_mm: 6.0,
    vel_std_m_min: 70,
    vel_screen_m_min: 40,
    vel_hs_m_min: 35,
    cabezas_offset: 5,
    cabezas_flexo: 4,
    cabezas_screen: 2,
    tiene_cold_foil: true,
    tiene_hot_stamping: true,
    tiene_embossing: false,
    puede_cupon: false,
    nota_tecnica: 'Prensa offset+flexo híbrida. Cilindros d176–d200. Máximo ancho de bobina 406mm.',
  },
  {
    id: 'FA10',
    nombre: 'FA10',
    ancho_max_mm: 355.6,
    gap_eje_mm: 3,
    gap_des_max_mm: 6.0,
    vel_std_m_min: 80,
    vel_screen_m_min: 0,
    vel_hs_m_min: 0,
    cabezas_offset: 0,
    cabezas_flexo: 10,
    cabezas_screen: 0,
    tiene_cold_foil: true,
    tiene_hot_stamping: false,
    tiene_embossing: false,
    puede_cupon: true,
    nota_tecnica: 'Solo flexo. La única máquina que puede hacer cupón. Sin offset, sin screen.',
  },
  {
    id: 'FA6',
    nombre: 'FA6',
    ancho_max_mm: 330.2,
    gap_eje_mm: 3,
    gap_des_max_mm: 16.0,
    vel_std_m_min: 80,
    vel_screen_m_min: 0,
    vel_hs_m_min: 0,
    cabezas_offset: 0,
    cabezas_flexo: 6,
    cabezas_screen: 0,
    tiene_cold_foil: true,
    tiene_hot_stamping: false,
    tiene_embossing: false,
    puede_cupon: false,
    nota_tecnica: 'Solo flexo, 6 cabezas. Gap máximo de desarrollo 16mm (más permisivo que otras).',
  },
  {
    id: 'GAL1',
    nombre: 'Gallus 1',
    ancho_max_mm: 254.0,
    gap_eje_mm: 3,
    gap_des_max_mm: 13.0,
    vel_std_m_min: 100,
    vel_screen_m_min: 40,
    vel_hs_m_min: 35,
    cabezas_offset: 0,
    cabezas_flexo: 4,
    cabezas_screen: 2,
    tiene_cold_foil: true,
    tiene_hot_stamping: true,
    tiene_embossing: true,
    puede_cupon: false,
    nota_tecnica: 'Flexo + screen + HS + embossing. Ancho máximo limitado (254mm).',
  },
];

// ─── INVENTARIO DE CILINDROS ──────────────────────────────────────────────────
// Fuente: CALCULADOR DE LOS DIENTES
// Formato: { dientes: cantidad_disponible }

export const CILINDROS: Record<string, Record<number, number>> = {
  MO: { 176: 4, 184: 4, 192: 4, 200: 4 },
  FA10: {
    96:6, 98:6, 102:10, 106:10, 109:6, 113:10, 115:10,
    120:10, 122:10, 124:10, 126:10, 130:12, 132:6, 134:6,
    136:10, 138:10, 141:10, 144:10, 146:10, 148:10, 150:6,
    154:6, 156:10, 160:6, 164:6, 166:6, 168:10, 174:10, 176:10,
  },
  FA6: {
    96:6, 98:6, 102:10, 106:10, 109:6, 113:10, 115:10,
    120:10, 122:10, 124:10, 126:10, 130:12, 132:6, 134:6,
    136:6, 138:10, 141:10, 144:10, 146:10, 148:10, 150:6,
    154:6, 156:12, 160:6, 164:6, 166:6, 168:6, 174:10, 176:10,
  },
  GAL1: {
    65:1, 66:2, 67:4, 68:6, 69:7, 70:8, 71:8,
    73:8, 74:8, 75:8, 77:8, 78:8, 79:8, 80:8,
    81:8, 82:8, 83:8, 84:8, 85:8, 86:7, 87:7,
    88:7, 89:7, 90:7, 91:7, 92:7, 93:7, 94:7,
    95:7, 96:7, 97:7, 98:7, 102:4, 103:7, 108:7,
    109:7, 112:7, 113:7, 115:7, 120:7,
  },
};

// ─── SELECCIÓN DE CILINDRO ÓPTIMO ─────────────────────────────────────────────

export interface CilindroSeleccionado {
  dientes: number;
  cav_des: number;
  gap_mm: number;
  des_max_mm: number;
}

export function seleccionarCilindro(
  machineId: string,
  desarrollo_mm: number
): CilindroSeleccionado | null {
  const inv = CILINDROS[machineId];
  const m = MAQUINAS_ANALOG.find(x => x.id === machineId);
  if (!inv || !m) return null;

  const gapMax = m.gap_des_max_mm;
  let bestGap = Infinity, bestD: number | null = null, bestCav: number | null = null;

  for (const [ds, qty] of Object.entries(inv)) {
    const d = Number(ds);
    if (qty < 1) continue;
    const des_max = d * PASO_DIENTE_MM;
    const cav = Math.floor(des_max / (desarrollo_mm + GAP_MIN_MM));
    if (cav < 1) continue;
    const gap = des_max / cav - desarrollo_mm;
    if (gap < GAP_MIN_MM || gap > gapMax) continue;
    if (gap < bestGap) { bestGap = gap; bestD = d; bestCav = cav; }
  }

  if (bestD === null || bestCav === null) return null;
  return { dientes: bestD, cav_des: bestCav, gap_mm: bestGap, des_max_mm: bestD * PASO_DIENTE_MM };
}

// ─── CÁLCULO DE METROS (digital) ─────────────────────────────────────────────

export interface MetrosDigital {
  cav_eje: number;
  cav_des: number;
  frames: number;
  metros: number;
}

export function calcMetrosDigital(
  m: MaquinaDigital,
  eje_mm: number,
  des_mm: number,
  cantidad: number
): MetrosDigital | null {
  const ge = m.gap_eje_mm / 10;   // mm → cm
  const gd = m.gap_des_mm / 10;
  const cav_e = Math.floor(m.planilla_mm / 10 / (eje_mm / 10 + ge));
  const cav_d = Math.floor(m.frame_cm / (des_mm / 10 + gd * 2));
  if (cav_e < 1 || cav_d < 1) return null;
  const ani = m.frame_cm - (des_mm / 10 + gd) * cav_d;
  const frames = Math.ceil(cantidad / (cav_e * cav_d));
  const metros = frames * (m.frame_cm - ani) / 100 + m.setup_m;
  return { cav_eje: cav_e, cav_des: cav_d, frames, metros };
}

// ─── CÁLCULO DE METROS (analógico) ───────────────────────────────────────────

export interface MetrosAnalog {
  cav_eje: number;
  cav_des: number;
  cilindro: CilindroSeleccionado;
  frames: number;
  metros: number;
}

export function calcMetrosAnalog(
  m: MaquinaAnalog,
  eje_mm: number,
  des_mm: number,
  cantidad: number
): MetrosAnalog | null {
  const cil = seleccionarCilindro(m.id, des_mm);
  if (!cil) return null;
  const cav_e = Math.floor((m.ancho_max_mm - 18) / (eje_mm + m.gap_eje_mm));
  if (cav_e < 1) return null;
  const cav_d = cil.cav_des;
  const frames = Math.ceil(cantidad / (cav_e * cav_d));
  const metros = frames * (des_mm + cil.gap_mm) / 1000 + 20;
  return { cav_eje: cav_e, cav_des: cav_d, cilindro: cil, frames, metros };
}

// ─── BÚSQUEDA DE PUNTO DE CRUCE ───────────────────────────────────────────────
// Busca el millar más grande donde metros <= umbral

export function buscarCruceDigital(
  m: MaquinaDigital,
  eje_mm: number,
  des_mm: number,
  metros_umbral: number
): number | null {
  let lo = 100, hi = 20_000_000, best: number | null = null;
  for (let i = 0; i < 64; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const r = calcMetrosDigital(m, eje_mm, des_mm, mid);
    if (!r) break;
    if (r.metros <= metros_umbral) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best ? Math.ceil(best / 1000) : null;
}

// ─── DATOS DE ENTRADA ─────────────────────────────────────────────────────────

export interface DatosEtiqueta {
  // Dimensiones
  eje_mm: number;
  des_mm: number;

  // Material
  material_id: string;
  material_nombre: string;

  // Tintas
  tintas_proceso: number;     // CMYK = 4, etc.
  tiene_blanco: boolean;
  tiene_plata: boolean;
  tiene_invisible: boolean;
  tiene_barniz_uv: boolean;

  // Acabados especiales
  tiene_hot_stamping: boolean;
  tiene_cold_foil: boolean;
  tiene_embossing: boolean;
  tiene_screen: boolean;
  tiene_cupon: boolean;

  // Cantidades del RFQ
  cantidades: number[];       // en piezas
  nombre: string;
  cliente: string;

  // Modo de usuario
  modo: 'ingenieria' | 'vendedor';
}

// ─── CATÁLOGO DE MATERIALES ───────────────────────────────────────────────────

export interface Material {
  id: string;
  nombre: string;
  categoria: 'BOPP' | 'PE' | 'PAPEL' | 'ESPECIAL';
  // Restricciones técnicas por máquina
  // null = sin restricción, string = razón del rechazo
  restricciones: Partial<Record<string, string>>;
}

export const MATERIALES: Material[] = [
  { id: 'bopp_blanco',   nombre: 'BOPP Blanco',       categoria: 'BOPP',   restricciones: {} },
  { id: 'bopp_metal',    nombre: 'BOPP Metalizado',    categoria: 'BOPP',   restricciones: {} },
  { id: 'bopp_trans',    nombre: 'BOPP Transparente',  categoria: 'BOPP',   restricciones: {} },
  { id: 'bopp_pearl',    nombre: 'BOPP Perlado',       categoria: 'BOPP',   restricciones: {} },
  { id: 'papel_couche',  nombre: 'Papel Couché',       categoria: 'PAPEL',  restricciones: {} },
  { id: 'papel_kraft',   nombre: 'Papel Kraft',        categoria: 'PAPEL',  restricciones: {} },
  { id: 'pe_blanco',     nombre: 'PE Blanco',          categoria: 'PE',     restricciones: {} },
  { id: 'pe_metal',      nombre: 'PE Metalizado',      categoria: 'PE',     restricciones: {} },
  { id: 'holografico',   nombre: 'Papel Holográfico',  categoria: 'ESPECIAL', restricciones: {} },
  { id: 'dull_silver',   nombre: 'Dull Silver',        categoria: 'ESPECIAL', restricciones: {} },
  { id: 'otro',          nombre: 'Otro / Especial',    categoria: 'ESPECIAL', restricciones: {} },
];
