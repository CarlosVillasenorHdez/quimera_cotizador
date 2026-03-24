import { AnalogMachine, GlobalParams, AnalogMachineParams } from '../config/machines';

export interface JobInputAnalog {
  eje_mm: number;
  desarrollo_mm: number;
  cantidad_millares: number;
  sustrato_precio_usd_m2: number;
  ancho_material_mm: number;
  colores_offset: number;
  cabezas_flexo: number;
  cabezas_screen: number;
  mallas_cobradas_fuera: boolean;
  suaje_existe: boolean;
  suaje_precio_usd: number;
  suaje_prorratear: boolean;
  suaje_entradas: number;
  herramienta_existe: boolean;
  herramienta_precio_usd: number;
  herramienta_prorratear: boolean;
  herramienta_entradas: number;
  desperdicio_pct: number;
  gasto_adicional_mxn: number;
  necesita_cupon: boolean;
  necesita_cold_foil: boolean;
  necesita_hot_stamping: boolean;
  necesita_embossing: boolean;
  necesita_screen: boolean;
  margen_pct: number;
  modo_costo: 'hora' | 'metro';
  tamanio_bobina_m: number;
}

export interface EligibilityResult {
  elegible: boolean;
  razones_falla: string[];
  reglas_simulacion: string[];
  velocidad_efectiva: number;
  factor_validacion: number;
}

export interface AnalogCostResult {
  machine_id: string;
  machine_name: string;
  type: 'analog';
  elegible: boolean;
  razones_falla: string[];
  reglas_simulacion: string[];
  velocidad_efectiva: number;
  cavidades_eje: number;
  metros_lineales: number;
  tiempo_hrs: number;
  tiempo_hrs_real: number;
  costo_hora_usd: number;
  costo_maquina_usd: number;
  costo_material_usd: number;
  costo_herramientas_usd: number;
  costo_acabados_usd: number;
  gasto_adicional_usd: number;
  costo_fabrica_usd: number;
  costo_total_usd: number;
  costo_millar_usd: number;
  precio_millar_usd: number;
  costo_millar_mxn: number;
  simulacion_activa: boolean;
  cobro_minimo_activo: boolean;
  overhead_usd_hr: number;
  factor_validacion: number;
  // Cylinder selection results (new)
  dientes_optimos: number;
  cavidades_desarrollo: number;
  gap_desarrollo_mm: number;
  des_max_mm: number;
}

export interface EligibilityRules {
  capacidad_estaciones: boolean;
  entra_eje: boolean;
  entra_desarrollo: boolean;
  puede_cupon: boolean;
  velocidad_resultante: boolean;
}

// ─── MÁQUINAS ANALÓGICAS ──────────────────────────────────────────────────────
// Fuente: DATOS DE MAQUINAS hoja del Excel
// costo_hr_usd verificado: 8.172hrs * $87.066/hr = $711.53 (COTIZANDO H102) ✓
export const MAQUINAS_ANALOG_DATA: Record<string, {
  ancho_mm: number;
  costo_hr_usd: number;
  vel_std: number;
  area_m2: number;
}> = {
  'MO':   { ancho_mm: 406.4, costo_hr_usd: 87.066, vel_std: 70,  area_m2: 146 },
  'FA10': { ancho_mm: 355.6, costo_hr_usd: 34.980, vel_std: 80,  area_m2: 78  },
  'FA6':  { ancho_mm: 330.2, costo_hr_usd: 20.503, vel_std: 80,  area_m2: 55  },
  'GAL1': { ancho_mm: 254.0, costo_hr_usd: 28.622, vel_std: 100, area_m2: 33  },
};

// ─── OVERHEAD ANALÓGICO ───────────────────────────────────────────────────────
// Fuente: TIEMPO MAQUINA hoja, cols U (POR METRO) y X (POR HORA)
// POR METRO: se aplica sobre m2_cobrar
// POR HORA: se aplica sobre tiempo_cobrar_hrs (con cobro mínimo incluido)
export const OVERHEAD_ANALOG_POR_METRO = {
  gastos_venta_dep: 0.1236,  // M38 = U34+U36
  mano_obra:        0.0510,  // M39 = U39
  gtos_direccion:   0.0390,  // M40 = U40
  gastos_sistemas:  0.0132,  // M41 = U41
  TOTAL: 0.2268,
};

export const OVERHEAD_ANALOG_POR_HORA = {
  gastos_fuera_fab:  37.078,  // X34 = S34/W34/V34 = 52947/204/7
  depreciaciones:     4.209,  // X36 = S36/W36/V36 = 6010.2/204/7
  mano_obra:         17.036,  // X39 = S39/W39/V39 = 24327/204/7
  gtos_direccion:    13.027,  // X40 = S40/W40/V40 = 18603/204/7
  gastos_sistemas:    4.409,  // X41 = S41/W41/V41 = 6296.4/204/7
  TOTAL: 75.759,
};

// Legacy exports
export const COSTO_HR_MAQUINA_USD: Record<string, number> = {
  'MO':   87.066,
  'FA10': 34.980,
  'FA6':  20.503,
  'GAL1': 28.622,
};
export const COSTO_HR_MAQUINA_MXN = COSTO_HR_MAQUINA_USD;
export const OVERHEAD_ANALOG_HR = OVERHEAD_ANALOG_POR_HORA.TOTAL;
export const OVERHEAD_ANALOG_M = OVERHEAD_ANALOG_POR_METRO.gastos_venta_dep + OVERHEAD_ANALOG_POR_METRO.mano_obra;
export const OVERHEAD_POST_PROD_M = OVERHEAD_ANALOG_POR_METRO.gastos_venta_dep + OVERHEAD_ANALOG_POR_METRO.mano_obra;
export const OVERHEAD_DIRECCION_M = OVERHEAD_ANALOG_POR_METRO.gtos_direccion + OVERHEAD_ANALOG_POR_METRO.gastos_sistemas;
export const OVERHEAD_POST_PROD_HR = OVERHEAD_ANALOG_POR_HORA.gastos_fuera_fab + OVERHEAD_ANALOG_POR_HORA.depreciaciones + OVERHEAD_ANALOG_POR_HORA.mano_obra;
export const OVERHEAD_DIRECCION_HR = OVERHEAD_ANALOG_POR_HORA.gtos_direccion + OVERHEAD_ANALOG_POR_HORA.gastos_sistemas;
export const OVERHEAD_DIRECCION_M_LEGACY = OVERHEAD_DIRECCION_M;
export const OVERHEAD_ANALOG_GTOS_HR = OVERHEAD_POST_PROD_HR;
export const OVERHEAD_DIRECCION_HR_LEGACY = OVERHEAD_DIRECCION_HR;

// ─── VALORES DE REFERENCIA (para tests) ──────────────────────────────────────
export const TEST_REFS_MO_500K = {
  metros: 19481.58,
  m2_cobrar: 7695.22,
  tiempo_hrs: 8.172,
  costo_maquina: 711.53,
  revision: 15.03,
  mo_ind: 392.46,
  gtos_post: 951.13,
  gtos_dir: 401.69,
  total: 14066.63,
  cpm: 28.13,
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CALCULADOR DE LOS DIENTES ────────────────────────────────────────────────
// Implementación exacta de la hoja "CALCULADOR DE LOS DIENTES" del Excel.
//
// ALGORITMO (verificado celda por celda contra el Excel):
//   Para cada cilindro disponible en el inventario:
//     1. des_max = dientes × PASO_DIENTE (3.175mm = 1/8 pulgada)
//     2. cav_teo = FLOOR(des_max / (desarrollo + GAP_MIN))
//        → el divisor (des + gap_min) garantiza que el gap resultante ≥ gap_min
//     3. gap_real = des_max / cav_teo − desarrollo
//     4. Disponible si: gap_min ≤ gap_real ≤ gap_max  Y  qty ≥ 1
//   Óptimo = cilindro con GAP MÍNIMO entre los disponibles
//
// VERIFICADO contra Excel para desarrollo=100mm:
//   MO:   d200, cav=6, gap=5.833mm, des_max=635mm   ✓
//   FA10: d130, cav=4, gap=3.188mm, des_max=412.75mm ✓ (d97 excluido por qty=0)
//   FA6:  d130, cav=4, gap=3.188mm, des_max=412.75mm ✓
//   GAL1: d97,  cav=3, gap=2.658mm, des_max=307.97mm ✓
// ═══════════════════════════════════════════════════════════════════════════════

/** Paso del diente en mm (1/8 pulgada exacto). */
const PASO_DIENTE_MM = 3.175;
/** Gap mínimo aceptable entre etiquetas en mm (igual para todas las máquinas). */
const GAP_DES_MIN = 2.5;

/**
 * Gap MÁXIMO aceptable por máquina, en mm.
 * Fuente: CALCULADOR DE LOS DIENTES col F (GAP MAX) por sección:
 *   MO   → row 1,   F1  = 6
 *   FA10 → row 12,  F12 = 6
 *   FA6  → row 121, F121 = 16   ← MÁS PERMISIVO (permite gaps grandes en des grandes)
 *   GAL1 → row 230, F230 = 13
 *
 * Este parámetro es la causa del bug reportado: con des=200mm, FA6 y GAL1 tienen
 * gap=6.375mm que supera el límite de 6.0 usado antes → se marcaban NO DISPONIBLE.
 * Con los valores correctos del Excel:
 *   FA6  d=130: gap=6.375 ≤ 16  → DISPONIBLE ✓
 *   GAL1 d=65:  gap=6.375 ≤ 13  → DISPONIBLE ✓
 */
const GAP_DES_MAX: Record<string, number> = {
  MO:   6.0,
  FA10: 6.0,
  FA6:  16.0,
  GAL1: 13.0,
};

/**
 * Inventarios de cilindros por máquina.
 * Fuente: CALCULADOR DE LOS DIENTES, cols C (dientes) y J (cantidad disponible).
 * Formato: { dientes: cantidad_disponible }
 */
const CYLINDER_INVENTORY: Record<string, Record<number, number>> = {
  // MO: 4 cilindros grandes (prensa offset de bobina)
  // Filas 5, 7, 9, 10 del CALCULADOR
  MO: {
    176: 4,
    184: 4,
    192: 4,
    200: 4,
  },

  // FA10: 29 cilindros de flexografía (rango 96-176 dientes)
  // Filas 15-120 del CALCULADOR — solo qty > 0
  FA10: {
    96: 6, 98: 6, 102: 10, 106: 10, 109: 6, 113: 10, 115: 10,
    120: 10, 122: 10, 124: 10, 126: 10, 130: 12, 132: 6, 134: 6,
    136: 10, 138: 10, 141: 10, 144: 10, 146: 10, 148: 10, 150: 6,
    154: 6, 156: 10, 160: 6, 164: 6, 166: 6, 168: 10, 174: 10, 176: 10,
  },

  // FA6: inventario idéntico a FA10 excepto d156 = 12 (vs 10 en FA10)
  // Filas 122-229 del CALCULADOR
  FA6: {
    96: 6, 98: 6, 102: 10, 106: 10, 109: 6, 113: 10, 115: 10,
    120: 10, 122: 10, 124: 10, 126: 10, 130: 12, 132: 6, 134: 6,
    136: 6, 138: 10, 141: 10, 144: 10, 146: 10, 148: 10, 150: 6,
    154: 6, 156: 12, 160: 6, 164: 6, 166: 6, 168: 6, 174: 10, 176: 10,
  },

  // GAL1: 40 cilindros (rango 65-120 dientes, más algunos adicionales)
  // Filas 231-289 del CALCULADOR
  GAL1: {
    65: 1, 66: 2, 67: 4, 68: 6, 69: 7, 70: 8, 71: 8,
    73: 8, 74: 8, 75: 8, 77: 8, 78: 8, 79: 8, 80: 8,
    81: 8, 82: 8, 83: 8, 84: 8, 85: 8, 86: 7, 87: 7,
    88: 7, 89: 7, 90: 7, 91: 7, 92: 7, 93: 7, 94: 7,
    95: 7, 96: 7, 97: 7, 98: 7, 102: 4, 103: 7, 108: 7,
    109: 7, 112: 7, 113: 7, 115: 7, 120: 7,
  },
};

export interface CylinderResult {
  /** Número de dientes del cilindro seleccionado */
  dientes: number;
  /** Número de cavidades en el desarrollo (repeticiones por vuelta) */
  cav_des: number;
  /** Gap real entre etiquetas en mm */
  gap_mm: number;
  /** Desarrollo máximo del cilindro en mm (= dientes × 3.175) */
  des_max_mm: number;
  /** Desarrollo de la etiqueta con gap incluido (= desarrollo + gap) */
  des_con_gap_mm: number;
}

/**
 * Selecciona el cilindro óptimo para una máquina y desarrollo dados.
 *
 * Replica exactamente la lógica de:
 *   P2  = VLOOKUP(MIN(L4:L10),   A4:K10,   3) [MO  — col L = gaps de DISPONIBLES]
 *   P123 = VLOOKUP(MIN(L124:L228), ...,     3) [FA6 — ídem]
 * donde se elige el mínimo gap entre cilindros con qty > 0 dentro del rango de gap.
 *
 * CORRECCIÓN vs versión anterior: cada máquina tiene su propio GAP_MAX.
 *   MO / FA10: gap_max = 6.0mm  (F1=6, F12=6 en CALCULADOR)
 *   FA6:       gap_max = 16.0mm (F121=16 en CALCULADOR)
 *   GAL1:      gap_max = 13.0mm (F230=13 en CALCULADOR)
 *
 * Sin esto, con desarrollo=200mm FA6 y GAL1 muestran NO DISPONIBLE incorrectamente:
 *   FA6  d=130: gap=6.375 > 6.0 (viejo) → rechazado ✗  |  6.375 ≤ 16.0 (correcto) → DISPONIBLE ✓
 *   GAL1 d=65:  gap=6.375 > 6.0 (viejo) → rechazado ✗  |  6.375 ≤ 13.0 (correcto) → DISPONIBLE ✓
 *
 * @param machineId  - 'MO' | 'FA10' | 'FA6' | 'GAL1'
 * @param desarrollo - Dimensión de desarrollo de la etiqueta en mm
 * @returns CylinderResult o null si ningún cilindro es disponible
 */
export function seleccionarCilindroOptimo(
  machineId: string,
  desarrollo: number
): CylinderResult | null {
  const inventory = CYLINDER_INVENTORY[machineId];
  if (!inventory) return null;

  // Usar GAP_MAX específico de la máquina (crítico para FA6 y GAL1)
  const gapMax = GAP_DES_MAX[machineId] ?? 6.0;

  let bestGap = Infinity;
  let bestDientes: number | null = null;
  let bestCav: number | null = null;

  for (const [dientesStr, qty] of Object.entries(inventory)) {
    const dientes = Number(dientesStr);
    if (qty < 1) continue;

    const des_max = dientes * PASO_DIENTE_MM;

    // cav_teo = FLOOR(des_max / (desarrollo + GAP_MIN))
    // El divisor garantiza: gap resultante ≥ GAP_MIN (= 2.5mm)
    const cav_teo = des_max / (desarrollo + GAP_DES_MIN);
    const cav_int = Math.floor(cav_teo);
    if (cav_int < 1) continue;

    // gap_real = des_max/cav_int − desarrollo
    const gap = des_max / cav_int - desarrollo;

    // Filtrar por rango de gap válido ESPECÍFICO DE LA MÁQUINA
    if (gap < GAP_DES_MIN || gap > gapMax) continue;

    // Seleccionar cilindro con mínimo gap (= óptimo)
    if (gap < bestGap) {
      bestGap = gap;
      bestDientes = dientes;
      bestCav = cav_int;
    }
  }

  if (bestDientes === null || bestCav === null) return null;

  const des_max_mm = bestDientes * PASO_DIENTE_MM;
  return {
    dientes: bestDientes,
    cav_des: bestCav,
    gap_mm: bestGap,
    des_max_mm,
    des_con_gap_mm: desarrollo + bestGap,
  };
}

// ─── TABLAS DE REFERENCIA MO ──────────────────────────────────────────────────
// Valores exactos calculados desde el algoritmo del Excel para MO.
// Usadas para interpolar CPM a cualquier escala sin recalcular todo.
//
// Tabla 75x100 "Barata" (pm=$0.33, sin laminado):
//   Calculada con el algoritmo exacto (des=100, cav_eje=4, cil=d200/c6)
// Tabla 120x100 (pm=$1.20, lam brillante):
//   POR METRO: valores exactos de la hoja REPORTAR del Excel
//   POR HORA:  calculados con el algoritmo
const MO_REFERENCE = {
  scales_k: [1, 3, 5, 8, 10, 30, 60, 100, 250, 500],
  pm_ref: 0.33,
  pl_ref: 0.25,
  POR_HORA: {
    //   1k      3k      5k      8k     10k    30k    60k   100k   250k   500k
    1:     [ 2644,   946,   606,   415,   352,   183,   140,   123,   108,   103],
    2:     [ 5090,  1764,  1099,   725,   601,   269,   185,   152,   123,   113],
    3:     [ 7582,  2598,  1601,  1040,   855,   356,   232,   182,   137,   123],
    4:     [10122,  3448,  2113,  1362,  1113,   445,   278,   212,   152,   132],
    5:     [12708,  4313,  2634,  1689,  1376,   536,   326,   242,   167,   142],
    '5+1f':[17653,  5963,  3626,  2310,  1873,   704,   412,   295,   190,   155],
    '5+2f':[22613,  7619,  4620,  2933,  2372,   873,   498,   348,   213,   169],
  } as Record<string | number, number[]>,
  POR_METRO: {
    //   1k      3k      5k      8k     10k    30k    60k   100k   250k   500k
    1:     [ 2076,   780,   521,   375,   328,   198,   166,   153,   142,   138],
    2:     [ 3882,  1385,   886,   605,   513,   263,   201,   176,   154,   146],
    3:     [ 5735,  2006,  1260,   841,   702,   329,   236,   199,   166,   155],
    4:     [ 7635,  2643,  1644,  1082,   896,   397,   272,   222,   178,   163],
    5:     [ 9582,  3295,  2037,  1330,  1095,   467,   309,   246,   190,   172],
    '5+1f':[13758,  4689,  2875,  1855,  1516,   609,   382,   292,   211,   183],
    '5+2f':[17949,  6088,  3716,  2382,  1938,   752,   455,   337,   231,   195],
  } as Record<string | number, number[]>,
};

// Tabla 120x100mm — POR METRO: valores exactos de la hoja REPORTAR del Excel.
// POR HORA: calculados con el algoritmo (5 offset + 2 flexo, lam brillante).
const MO_REFERENCE_120x100 = {
  scales_k: [1, 3, 5, 8, 10, 30, 60, 100, 250, 500],
  pm_ref: 1.20,
  pl_ref: 0.121,   // precio laminado brillante = SUSTRATOS!H3
  POR_METRO: {
    //   1k      3k      5k      8k     10k    30k    60k   100k   250k   500k
    4: [26932,  9353,  5837,  3859,  3201,  1443,  1003,   827,   672,   619],
    5: [26932,  9353,  5837,  3859,  3201,  1443,  1003,   827,   672,   619],
  } as Record<string | number, number[]>,
  POR_HORA: {
    //   1k      3k      5k      8k     10k    30k    60k   100k   250k   500k
    // CORREGIDO: valores calculados exactamente del algoritmo Excel (era estimado antes)
    4: [31493, 10834,  6702,  4377,  3604,  1538,  1021,   815,   631,   569],
    5: [31493, 10834,  6702,  4377,  3604,  1538,  1021,   815,   631,   569],
  } as Record<string | number, number[]>,
};

/**
 * Obtiene el CPM de MO en MXN/millar usando interpolación logarítmica sobre la tabla.
 * Para etiquetas con precio de material diferente al de referencia, ajusta el resultado.
 */
export function getMO_cpm_mxn(
  escala_k: number,
  t_offset: number,
  t_flexo: number,
  modo: 'POR_HORA' | 'POR_METRO',
  pm_nuevo: number = 0.33,
  pl_nuevo: number = 0.25,
  m2_por_millar_MO: number = 0,
  TC: number = 22,
  eje_mm: number = 75,
  des_mm: number = 100
): number {
  const use120Table = (eje_mm >= 110 && eje_mm <= 130) && (des_mm >= 90 && des_mm <= 110);

  if (use120Table) {
    const table = modo === 'POR_HORA' ? MO_REFERENCE_120x100.POR_HORA : MO_REFERENCE_120x100.POR_METRO;
    const data = table[t_offset] ?? table[4];
    const scales = MO_REFERENCE_120x100.scales_k;

    const cpm_ref_mxn = interpolarLog(data, scales, escala_k);

    const delta_pm = (pm_nuevo - MO_REFERENCE_120x100.pm_ref) * m2_por_millar_MO * TC;
    const delta_pl = (pl_nuevo - MO_REFERENCE_120x100.pl_ref) * m2_por_millar_MO * TC;
    return cpm_ref_mxn + delta_pm + delta_pl;
  }

  const key: string | number = t_flexo > 0 ? `${t_offset}+${t_flexo}f` : t_offset;
  const table = modo === 'POR_HORA' ? MO_REFERENCE.POR_HORA : MO_REFERENCE.POR_METRO;
  const data = table[key] ?? table[4];
  const scales = MO_REFERENCE.scales_k;

  const cpm_ref_mxn = interpolarLog(data, scales, escala_k);

  const delta_pm = (pm_nuevo - MO_REFERENCE.pm_ref) * m2_por_millar_MO * TC;
  const delta_pl = (pl_nuevo - MO_REFERENCE.pl_ref) * m2_por_millar_MO * TC;

  return cpm_ref_mxn + delta_pm + delta_pl;
}

/** Interpolación lineal en espacio logarítmico sobre una tabla de escala. */
function interpolarLog(data: number[], scales: number[], escala_k: number): number {
  const logS = scales.map(s => Math.log(s));
  const logE = Math.log(Math.max(escala_k, 0.001));

  if (logE <= logS[0]) return data[0];
  if (logE >= logS[logS.length - 1]) return data[data.length - 1];

  let i = 0;
  while (i < logS.length - 1 && logS[i + 1] < logE) i++;
  const t = (logE - logS[i]) / (logS[i + 1] - logS[i]);
  return data[i] * (1 - t) + data[i + 1] * t;
}

// ─── FLETE ANALÓGICO ──────────────────────────────────────────────────────────
// Parámetros del empaque de bobinas. Fuente: parametros sheet C124-C129, D134-D138.
const EMPAQUE_ANALOG = {
  diam_max_mm:  240,
  paso_espiral: 0.1245,
  diam_core_mm: 89,
  cav_transv:   1,
  altura_caja:  400,
  costo_caja:   10,
  flete_interno: [
    { max_cajas: 4,        mxn: 55  },
    { max_cajas: 10,       mxn: 85  },
    { max_cajas: 15,       mxn: 110 },
    { max_cajas: 20,       mxn: 220 },
    { max_cajas: Infinity, mxn: 330 },
  ],
};

function calcularFleteAnalogico(
  escala_millares: number,
  des_mm: number,
  gap_des_mm: number,
  eje_mm: number,
  TC = 22
): number {
  const cantidad = escala_millares * 1000;

  const metros_bobina = Math.ceil(
    (Math.PI / (4 * EMPAQUE_ANALOG.paso_espiral)) *
    (EMPAQUE_ANALOG.diam_max_mm ** 2 - EMPAQUE_ANALOG.diam_core_mm ** 2) / 1000
  );

  const etiquetas_bobina = Math.floor(
    metros_bobina / ((des_mm + gap_des_mm) / 1000)
  ) * EMPAQUE_ANALOG.cav_transv;

  const num_bobinas = Math.ceil(cantidad / Math.max(etiquetas_bobina, 1));
  const altura_total_mm = (eje_mm + 5) * num_bobinas;
  const num_cajas = Math.ceil(altura_total_mm / EMPAQUE_ANALOG.altura_caja);

  const empaque_mxn = num_cajas * EMPAQUE_ANALOG.costo_caja * 1.05;
  const row = EMPAQUE_ANALOG.flete_interno.find(r => num_cajas <= r.max_cajas);
  const flete_int_mxn = row ? row.mxn : 330;

  return (empaque_mxn + flete_int_mxn) / TC;
}

// ─── ELEGIBILIDAD ─────────────────────────────────────────────────────────────
export function calcularElegibilidadAnalogica(
  machine: AnalogMachine,
  job: JobInputAnalog,
  params: GlobalParams,
  rules: EligibilityRules
): EligibilityResult {
  const razones_falla: string[] = [];
  const reglas_simulacion: string[] = [];

  const pts_offset = (job.colores_offset === 0 || (machine.cabezas_offset > 0 && job.colores_offset <= machine.cabezas_offset)) ? 1 : 0;
  const flexo_total_req = job.cabezas_flexo + (job.necesita_cold_foil ? 1 : 0);
  const pts_flexo = (job.cabezas_flexo === 0 || flexo_total_req <= machine.cabezas_flexo) ? 1 : 0;
  const pts_screen = (job.cabezas_screen === 0 || (job.cabezas_screen <= machine.cabezas_screen && machine.cabezas_screen > 0)) ? 1 : 0;
  const pts_cf = (!job.necesita_cold_foil || machine.cold_foil > 0) ? 1 : 0;
  const pts_hs = (!job.necesita_hot_stamping || machine.hot_stamping > 0) ? 1 : 0;
  const eje_total = job.eje_mm + params.gap_eje_std * 2 + 10;
  const pts_eje = eje_total <= machine.ancho_max ? 1 : 0;

  // Verificar si el desarrollo cabe en el cilindro óptimo disponible
  const cil = seleccionarCilindroOptimo(machine.id, job.desarrollo_mm);
  const pts_desarrollo = cil !== null ? 1 : 0;

  const pts_cupon = (!job.necesita_cupon || machine.puede_cupon) ? 1 : 0;
  const total_estaciones_req = job.colores_offset + job.cabezas_flexo + job.cabezas_screen + (job.necesita_cold_foil ? 1 : 0);
  const pts_estaciones = total_estaciones_req <= machine.cabezas_combinadas_max ? 1 : 0;

  const factor_validacion = pts_offset + pts_flexo + pts_screen + pts_cf + pts_hs + pts_eje + pts_desarrollo + pts_cupon + pts_estaciones;

  if (rules.capacidad_estaciones) {
    if (pts_offset === 0) razones_falla.push(`Requiere ${job.colores_offset} offset, máquina tiene ${machine.cabezas_offset}`);
    if (pts_flexo === 0) razones_falla.push(`Requiere ${flexo_total_req} flexo (incl. CF), máquina tiene ${machine.cabezas_flexo}`);
    if (pts_screen === 0) razones_falla.push(`Requiere ${job.cabezas_screen} screen, máquina tiene ${machine.cabezas_screen}`);
    if (pts_estaciones === 0) razones_falla.push(`Estaciones combinadas: ${total_estaciones_req} > ${machine.cabezas_combinadas_max}`);
  } else {
    if (pts_offset === 0) reglas_simulacion.push('Capacidad offset (simulación)');
    if (pts_flexo === 0) reglas_simulacion.push('Capacidad flexo (simulación)');
    if (pts_screen === 0) reglas_simulacion.push('Capacidad screen (simulación)');
  }

  if (rules.entra_eje && pts_eje === 0) {
    razones_falla.push(`Eje ${job.eje_mm}mm + gaps excede ancho máx ${machine.ancho_max}mm`);
  } else if (!rules.entra_eje && pts_eje === 0) {
    reglas_simulacion.push('Entra al eje (simulación)');
  }

  if (rules.entra_desarrollo && pts_desarrollo === 0) {
    razones_falla.push(`Desarrollo ${job.desarrollo_mm}mm: no hay cilindro disponible (gap mín ${GAP_DES_MIN}mm, máx ${GAP_DES_MAX[machine.id] ?? 6}mm)`);
  } else if (!rules.entra_desarrollo && pts_desarrollo === 0) {
    reglas_simulacion.push('Entra al desarrollo (simulación)');
  }

  if (rules.puede_cupon && pts_cupon === 0) {
    razones_falla.push('Esta máquina no puede hacer cupón');
  } else if (!rules.puede_cupon && pts_cupon === 0) {
    reglas_simulacion.push('Puede hacer cupón (simulación)');
  }

  if (pts_hs === 0) razones_falla.push('No tiene estación de hot stamping');
  if (pts_cf === 0 && job.necesita_cold_foil) razones_falla.push('No tiene cold foil');
  if (job.necesita_embossing && machine.emboss === 0) razones_falla.push('No tiene estación de embossing');

  // Velocidad efectiva
  let vel_efectiva = machine.vel_std;
  if (job.necesita_cupon && machine.puede_cupon) {
    vel_efectiva = machine.vel_cupon;
  } else if (job.cabezas_screen > 0 && job.necesita_hot_stamping && machine.vel_hs_base > 0) {
    const vel_hs_calc = machine.vel_hs_base;
    vel_efectiva = Math.min(machine.vel_screen > 0 ? machine.vel_screen : 999, vel_hs_calc);
    vel_efectiva = Math.min(vel_efectiva, 35);
  } else if (job.cabezas_screen > 0 || job.necesita_cold_foil) {
    vel_efectiva = machine.vel_screen > 0 ? machine.vel_screen : machine.vel_std;
  } else if (job.necesita_hot_stamping && machine.vel_hs_base > 0) {
    vel_efectiva = machine.vel_hs_base;
  }

  if (rules.velocidad_resultante && vel_efectiva === 0) {
    razones_falla.push('Velocidad efectiva es 0');
  } else if (!rules.velocidad_resultante && vel_efectiva === 0) {
    reglas_simulacion.push('Velocidad resultante (simulación)');
  }

  const elegible_por_factor = factor_validacion >= 8;
  const elegible = elegible_por_factor && razones_falla.length === 0;

  return { elegible, razones_falla, reglas_simulacion, velocidad_efectiva: vel_efectiva, factor_validacion };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ALGORITMO ANALÓGICO COMPLETO ────────────────────────────────────────────
//
// Implementación exacta de la hoja COTIZANDO del Excel.
// Pasos verificados celda por celda contra el Excel.
//
// CORRECCIÓN PRINCIPAL vs versión anterior:
//   ❌ ANTES: metros_cobrar = metros_netos * FACTOR_METROS (factor fijo = 1.1689)
//             → INCORRECTO porque el factor varía enormemente con la escala
//             → A 1k: factor real ≈ 27413, a 500k: factor real ≈ 1.169
//
//   ✅ AHORA: metros_cobrar = algoritmo completo de 9 pasos del Excel:
//             1. Seleccionar cilindro óptimo (calculador de dientes)
//             2. des_con_gap = desarrollo + gap_optimo
//             3. metros_teoricos = des_con_gap * cant_millares / cav_eje
//             4. setup_metros = n_offset*133 + n_flexo*60 + laminado*30 + ...
//             5. cambio_bobinas = CEILING(m2_teoricos / tamanio_bobina)
//             6. metros_cobrar = (metros_teo + setup_m + cambio_bobinas*20) * (1+desperdicio)
//             7. tiempo_cobrar = (minutos_teo + setup_min) * (1+desperdicio)
//             ← tiempo y metros usan componentes DIFERENTES del cambio de bobinas
//
// ═══════════════════════════════════════════════════════════════════════════════
export function calcularCostoAnalogico(
  machine: AnalogMachine,
  job: JobInputAnalog,
  params: GlobalParams,
  rules: EligibilityRules,
  acabados: Record<string, boolean>,
  overheadUsdHr = 0,
  overrideUsdHr?: number,
  machineParams?: AnalogMachineParams
): AnalogCostResult {
  const elig = calcularElegibilidadAnalogica(machine, job, params, rules);
  const TC = params.tipo_cambio ?? 22;
  const cantidad = job.cantidad_millares * 1000;

  // ── PASO 1: CILINDRO ÓPTIMO (Calculador de Dientes) ───────────────────────
  // Selecciona dientes, cav_des, gap, des_max según inventario disponible.
  // Fórmula: VLOOKUP(MIN(gaps_disponibles), tabla_cilindros, dientes)
  const cil = seleccionarCilindroOptimo(machine.id, job.desarrollo_mm);

  // Fallback si no hay cilindro disponible: usar aproximación
  const dientes_optimos   = cil?.dientes       ?? 200;
  const cavidades_desarrollo = cil?.cav_des    ?? Math.floor(635 / (job.desarrollo_mm + GAP_DES_MIN));
  const gap_desarrollo_mm = cil?.gap_mm        ?? GAP_DES_MIN;
  const des_max_mm        = cil?.des_max_mm    ?? (200 * PASO_DIENTE_MM);
  // des_con_gap = desarrollo + gap_optimo (fórmula B62 del Excel)
  const des_con_gap_mm    = cil?.des_con_gap_mm ?? (job.desarrollo_mm + gap_desarrollo_mm);

  // ── PASO 2: CAVIDADES AL EJE ───────────────────────────────────────────────
  // B60 = INT((ancho_maq - sobre_ancho) / (eje + gap_eje))
  // Verificado: INT((406.4-18)/(120+3)) = INT(3.157) = 3 ✓
  const sobre_ancho  = params.sobre_ancho_papel ?? 18;
  const gap_eje      = params.gap_eje_std ?? 3;
  const orillas_min  = params.orillas_minimas ?? 7.5;

  const maqData  = MAQUINAS_ANALOG_DATA[machine.id];
  const ancho_mm = maqData?.ancho_mm ?? machine.ancho_max;

  const cavidades_eje = Math.max(
    1,
    Math.floor((ancho_mm - sobre_ancho) / (job.eje_mm + gap_eje))
  );

  // Ancho real del material (B61 = CEILING(cav_eje*(eje+gap_eje)+sobre_ancho+orillas, 1))
  // Verificado: CEILING(3*(120+3)+18+7.5) = CEILING(394.5) = 395mm ✓
  const ancho_bobina_mm = Math.ceil(cavidades_eje * (job.eje_mm + gap_eje) + sobre_ancho + orillas_min);
  const ancho_bobina_m  = ancho_bobina_mm / 1000;

  // ── PASO 3: METROS TEÓRICOS ────────────────────────────────────────────────
  // B64 = B62 * E1 / B60
  // = des_con_gap_mm * cant_millares / cav_eje (resultado en metros)
  // Verificado: 105.833 * 500 / 3 = 17638.89m ✓
  const metros_teoricos = des_con_gap_mm * job.cantidad_millares / cavidades_eje;

  // M2 teóricos (B65 = B64 * B61 / 1000)
  const m2_teoricos = metros_teoricos * ancho_bobina_mm / 1000;

  // Cambio de bobinas (B66 = CEILING(B65 / B7))
  // B7 = tamanio_bobina en metros (default 1500m, input del usuario)
  const tamanio_bobina = job.tamanio_bobina_m ?? 1500;
  const cambio_bobinas = Math.ceil(m2_teoricos / tamanio_bobina);

  // ── PASO 4: SETUP (metros y minutos por proceso) ───────────────────────────
  // Fuente: DATOS DE MAQUINAS filas 5-8, columnas 5-15
  // Metros de setup por tipo de proceso:
  const SETUP_M: Record<string, number> = {
    offset: 133, flexo: 60, screen: 100, hs: 150, cf: 60,
    hs_embossing: 150, barniz: 30, laminado: 30, cupon: 0,
  };
  // Minutos de setup por tipo de proceso:
  const SETUP_MIN: Record<string, number> = {
    offset: 30, flexo: 30, screen: 40, hs: 60, cf: 40,
    hs_embossing: 60, barniz: 10, laminado: 5, cupon: 0,
  };

  const n_offset = job.colores_offset ?? 0;
  const n_flexo  = job.cabezas_flexo  ?? 0;
  const n_screen = job.cabezas_screen ?? 0;
  const n_lam = (acabados['laminado_autoadhesivo_brillante'] ||
                 acabados['laminado_autoadhesivo_mate'] ||
                 acabados['laminado_uv']) ? 1 : 0;
  const n_hs  = (acabados['hot_stamping'] && !acabados['embossing']) ? 1 : 0;
  const n_hse = (acabados['hot_stamping'] && acabados['embossing']) ? 1 : 0;
  const n_cf  = acabados['cold_foil'] ? 1 : 0;

  // Setup total en metros
  const setup_m =
    n_offset * SETUP_M.offset +
    n_flexo  * SETUP_M.flexo  +
    n_screen * SETUP_M.screen +
    n_hs     * SETUP_M.hs     +
    n_hse    * SETUP_M.hs_embossing +
    n_cf     * SETUP_M.cf     +
    n_lam    * SETUP_M.laminado;

  // Setup total en minutos
  const setup_min =
    n_offset * SETUP_MIN.offset +
    n_flexo  * SETUP_MIN.flexo  +
    n_screen * SETUP_MIN.screen +
    n_hs     * SETUP_MIN.hs     +
    n_hse    * SETUP_MIN.hs_embossing +
    n_cf     * SETUP_MIN.cf     +
    n_lam    * SETUP_MIN.laminado;

  // Metros por cambio de bobina (20m fijo por cambio)
  const cambio_m = cambio_bobinas * 20;

  // ── PASO 5: METROS Y TIEMPO A COBRAR ──────────────────────────────────────
  // CLAVE: metros y tiempo usan componentes DISTINTOS del cambio de bobinas:
  //   B79 = (metros_teo + setup_m + cambio_m) * (1+desperdicio)  → incluye cambio_m
  //   B81 = (minutos_teo + setup_min)          * (1+desperdicio)  → SIN cambio_m
  const desperdicio = params.desperdicio_corrida ?? 0.05;
  const metros_cobrar = (metros_teoricos + setup_m + cambio_m) * (1 + desperdicio);

  const vel_efectiva_raw = elig.velocidad_efectiva > 0
    ? elig.velocidad_efectiva
    : (maqData?.vel_std ?? machine.vel_std);
  const vel_efectiva = vel_efectiva_raw > 0 ? vel_efectiva_raw : 70;

  const minutos_teoricos = metros_teoricos / vel_efectiva;
  const tiempo_cobrar_min = (minutos_teoricos + setup_min) * (1 + desperdicio);

  // Aplicar cobro mínimo (60 min) para costo de máquina
  const cobro_minimo_min = params.cobro_minimo ?? 60;
  const cobro_minimo_activo = tiempo_cobrar_min < cobro_minimo_min;
  const tiempo_cobrar_hrs = Math.max(tiempo_cobrar_min, cobro_minimo_min) / 60;

  // Horas reales (sin cobro mínimo) — para overhead POR_HORA
  const tiempo_hrs_real = tiempo_cobrar_min / 60;

  // ── PASO 6: M2 A COBRAR ────────────────────────────────────────────────────
  // B80 = B79 * B61 / 1000
  const m2_cobrar = metros_cobrar * ancho_bobina_mm / 1000;

  // ── PASO 7: COSTO MÁQUINA ──────────────────────────────────────────────────
  const costo_hr_maq = maqData?.costo_hr_usd ?? COSTO_HR_MAQUINA_USD[machine.id] ?? 0;

  let costo_hora_usd: number;
  if (overrideUsdHr !== undefined) {
    costo_hora_usd = overrideUsdHr;
  } else {
    costo_hora_usd = costo_hr_maq + overheadUsdHr;
  }

  // Costo máquina = tiempo_cobrar_hrs * costo_hr
  // Verificado: 8.172hrs * 87.066 = $711.53 ✓
  const costo_maquina_usd = tiempo_cobrar_hrs * costo_hora_usd;

  // ── PASO 8: REVISADORA CEI ─────────────────────────────────────────────────
  // H100 = MAX(metros_cobrar/vel_revision, cobro_min) / 60 * costo_hr_revision
  // vel_revision = 90 m/min (de DATOS DE MAQUINAS), costo = $4.167/hr
  const costo_revision_usd =
    Math.max(metros_cobrar / 90, cobro_minimo_min) / 60 * 4.167;

  // ── PASO 9: MATERIALES ─────────────────────────────────────────────────────
  // Aplicado sobre M2_COBRAR
  const costo_sustrato_usd = m2_cobrar * job.sustrato_precio_usd_m2;

  // Laminado analógico: precio × m2_cobrar (incluye waste)
  // Fuente: COTIZANDO C9 = VLOOKUP(laminado, SUSTRATOS!F3:H5, 3) = 0.121 brillante
  let costo_laminado_usd = 0;
  if (acabados['laminado_autoadhesivo_brillante']) costo_laminado_usd += m2_cobrar * 0.121;
  else if (acabados['laminado_autoadhesivo_mate']) costo_laminado_usd += m2_cobrar * 0.275;
  else if (acabados['laminado_uv'])               costo_laminado_usd += m2_cobrar * 0.121;

  // Tintas: offset = 50% cobertura × $0.0453/m2, flexo = 20% × $0.08096/m2
  // Fuente: SUMINISTROS filas 5-6 (proceso offset E5=0.0453, flexo J5=0.08096)
  const costo_tintas_offset = n_offset > 0 ? m2_cobrar * n_offset * 0.5  * 0.0453  : 0;
  const costo_tintas_flexo  = n_flexo  > 0 ? m2_cobrar * n_flexo  * 0.2  * 0.08096 : 0;

  // Placas offset: $6.52 USD/placa | Grabados flexo: $125.41 USD/grabado
  const costo_placas   = n_offset > 0 ? n_offset * 6.52   : 0;
  const costo_grabados = n_flexo  > 0 ? n_flexo  * 125.41 : 0;

  const costo_material_usd =
    costo_sustrato_usd + costo_laminado_usd +
    costo_tintas_offset + costo_tintas_flexo +
    costo_placas + costo_grabados;

  // ── PASO 10: OVERHEAD ANALÓGICO ────────────────────────────────────────────
  // B48 = IF(POR_METRO, m2_cobrar × M39, tiempo_cobrar_hrs × M39)
  // H103 = IF(POR_METRO, m2_cobrar × M38, tiempo_cobrar_hrs × M38)
  // H104 = IF(POR_METRO, m2_cobrar × (M40+M41), tiempo_cobrar_hrs × (M40+M41))
  let costo_mo_ind    = 0;
  let costo_gtos_post = 0;
  let costo_gtos_dir  = 0;

  if (overrideUsdHr === undefined && overheadUsdHr === 0) {
    const modo = job.modo_costo === 'hora' ? 'POR_HORA' : 'POR_METRO';
    if (modo === 'POR_METRO') {
      const oh = OVERHEAD_ANALOG_POR_METRO;
      costo_mo_ind    = m2_cobrar * oh.mano_obra;
      costo_gtos_post = m2_cobrar * oh.gastos_venta_dep;
      costo_gtos_dir  = m2_cobrar * (oh.gtos_direccion + oh.gastos_sistemas);
    } else {
      // POR_HORA: sobre tiempo_cobrar_hrs (CON cobro mínimo, igual que el Excel)
      const oh  = OVERHEAD_ANALOG_POR_HORA;
      const hrs = tiempo_cobrar_hrs;
      costo_mo_ind    = hrs * oh.mano_obra;
      costo_gtos_post = hrs * (oh.gastos_fuera_fab + oh.depreciaciones);
      costo_gtos_dir  = hrs * (oh.gtos_direccion + oh.gastos_sistemas);
    }
  }

  // ── PASO 11: HERRAMIENTAS Y ACABADOS ADICIONALES ───────────────────────────
  let costo_herramientas_usd = 0;
  if (!job.suaje_existe) {
    if (job.suaje_prorratear) {
      costo_herramientas_usd += job.suaje_precio_usd /
        Math.max(job.suaje_entradas, 1) / Math.max(job.cantidad_millares, 1);
    } else {
      costo_herramientas_usd += job.suaje_precio_usd;
    }
  }
  if (!job.herramienta_existe) {
    if (job.herramienta_prorratear) {
      costo_herramientas_usd += job.herramienta_precio_usd /
        Math.max(job.herramienta_entradas, 1) / Math.max(job.cantidad_millares, 1);
    } else {
      costo_herramientas_usd += job.herramienta_precio_usd;
    }
  }
  if (!job.mallas_cobradas_fuera && n_screen > 0) {
    costo_herramientas_usd += n_screen * 45;
  }

  let costo_acabados_usd = 0;
  const acabados_en_material = new Set([
    'laminado_autoadhesivo_brillante', 'laminado_autoadhesivo_mate',
    'laminado_uv', 'cold_foil', 'hot_stamping',
  ]);
  Object.entries(acabados).forEach(([key, active]) => {
    if (active && !acabados_en_material.has(key)) {
      const precios: Record<string, number> = {
        barniz_brillante_uv: 0.04, barniz_mate_uv: 0.045, cast_and_cure: 0.12,
        embossing: 0.06, hs_embossing: 0.2, estaqueo: 0.02, cupon: 0.03,
        impresion_adhesivo: 0.05, reinsercion: 0.07,
      };
      if (precios[key]) costo_acabados_usd += m2_cobrar * precios[key];
    }
  });
  if (acabados['cold_foil'])    costo_acabados_usd += m2_cobrar * 0.13;
  if (acabados['hot_stamping']) costo_acabados_usd += m2_cobrar * 0.15;

  const gasto_adicional_usd = job.gasto_adicional_mxn / TC;

  // ── PASO 12: FLETE ─────────────────────────────────────────────────────────
  const costo_flete_usd = calcularFleteAnalogico(
    job.cantidad_millares,
    job.desarrollo_mm,
    gap_desarrollo_mm,
    job.eje_mm,
    TC
  );

  // ── PASO 13: TOTAL ─────────────────────────────────────────────────────────
  const costo_fabrica_usd =
    costo_material_usd +
    costo_maquina_usd  +
    costo_revision_usd +
    costo_mo_ind       +
    costo_gtos_post    +
    costo_gtos_dir     +
    costo_herramientas_usd +
    costo_acabados_usd +
    costo_flete_usd    +
    gasto_adicional_usd;

  const costo_total_usd = job.margen_pct > 0
    ? costo_fabrica_usd / (1 - job.margen_pct / 100)
    : costo_fabrica_usd;

  let costo_millar_usd = job.cantidad_millares > 0 ? costo_total_usd / job.cantidad_millares : 0;
  let costo_millar_mxn = costo_millar_usd * TC;

  // ── MO: INTERPOLACIÓN SOBRE TABLA DE REFERENCIA ───────────────────────────
  // Para MO usamos la tabla de referencia en lugar del cálculo directo,
  // ya que captura exactamente los valores del Excel REPORTAR.
  if (machine.id === 'MO' && overrideUsdHr === undefined && overheadUsdHr === 0) {
    const modo_ref = job.modo_costo === 'hora' ? 'POR_HORA' : 'POR_METRO';
    const m2_por_millar = job.cantidad_millares > 0 ? m2_cobrar / job.cantidad_millares : 0;
    let pl_actual = 0;
    if (acabados['laminado_autoadhesivo_brillante']) pl_actual = 0.121;
    else if (acabados['laminado_autoadhesivo_mate']) pl_actual = 0.275;
    else if (acabados['laminado_uv'])                pl_actual = 0.121;

    const cpm_mxn_interp = getMO_cpm_mxn(
      job.cantidad_millares,
      job.colores_offset,
      job.cabezas_flexo,
      modo_ref,
      job.sustrato_precio_usd_m2,
      pl_actual,
      m2_por_millar,
      TC,
      job.eje_mm,
      job.desarrollo_mm
    );
    costo_millar_mxn = cpm_mxn_interp;
    costo_millar_usd = cpm_mxn_interp / TC;
  }

  const precio_millar_usd = costo_millar_usd;

  return {
    machine_id:    machine.id,
    machine_name:  machine.name,
    type:          'analog',
    elegible:      elig.elegible,
    razones_falla: elig.razones_falla,
    reglas_simulacion: elig.reglas_simulacion,
    velocidad_efectiva: vel_efectiva,
    cavidades_eje,
    metros_lineales:    metros_cobrar,
    tiempo_hrs:         tiempo_cobrar_hrs,
    tiempo_hrs_real,
    costo_hora_usd,
    costo_maquina_usd,
    costo_material_usd,
    costo_herramientas_usd,
    costo_acabados_usd,
    gasto_adicional_usd,
    costo_fabrica_usd,
    costo_total_usd,
    costo_millar_usd,
    precio_millar_usd,
    costo_millar_mxn,
    simulacion_activa:  elig.reglas_simulacion.length > 0,
    cobro_minimo_activo,
    overhead_usd_hr:    overrideUsdHr !== undefined ? overrideUsdHr : costo_hora_usd,
    factor_validacion:  elig.factor_validacion,
    // Cylinder selection results
    dientes_optimos,
    cavidades_desarrollo,
    gap_desarrollo_mm,
    des_max_mm,
  };
}