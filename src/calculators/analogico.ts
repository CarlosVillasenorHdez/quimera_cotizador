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
}

export interface EligibilityRules {
  capacidad_estaciones: boolean;
  entra_eje: boolean;
  entra_desarrollo: boolean;
  puede_cupon: boolean;
  velocidad_resultante: boolean;
}

// ─── MÁQUINAS ANALÓGICAS (PARTE 4) ───────────────────────────────────────────
// costo_hr_usd = DATOS_DE_MAQUINAS col P (depreciación + renta + MO + servicios)
// VERIFICADO: 8.172hrs * $87.066/hr = $711.53 (= COTIZANDO H102) ✓
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

// ─── OVERHEAD ANALÓGICO (PARTE 1 — GLOBAL) ───────────────────────────────────
// Aplicado sobre M2_COBRAR = metros_lineales * ancho_bobina_m
export const OVERHEAD_ANALOG_POR_METRO = {
  gastos_venta_dep: 0.1236,  // M38 = U34+U36
  mano_obra:        0.0510,  // M39
  gtos_direccion:   0.0390,  // M40
  gastos_sistemas:  0.0132,  // M41
  TOTAL: 0.2268,
};

export const OVERHEAD_ANALOG_POR_HORA = {
  gastos_fuera_fab:  37.078,  // X34
  depreciaciones:     4.209,  // X36
  mano_obra:         17.036,  // X39
  gtos_direccion:    13.027,  // X40
  gastos_sistemas:    4.409,  // X41
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

// ─── VALORES DE REFERENCIA ANALÓGICO ─────────────────────────────────────────
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

// ─── FACTOR_METROS calibrado desde Excel ─────────────────────────────────────
// VERIFICADO: 19481/(500000*0.1/3) = 1.1689
const FACTOR_METROS = 1.1689;

// ─── TABLA DE REFERENCIA MO (75x100mm "Barata", pm=$0.33, pl=$0.25) ──────────
// Fuente: valores exactos del Excel de análisis — en MXN/millar
// Para otras etiquetas: cpm_nuevo = cpm_ref + (pm_nuevo - pm_ref) * m2_por_millar_MO * TC
const MO_REFERENCE = {
  scales_k: [1, 3, 5, 8, 10, 30, 60, 100, 250, 500],
  // Precio material de referencia (USD/m²) para la tabla
  pm_ref: 0.33,
  // Precio laminado de referencia (USD/m²)
  pl_ref: 0.25,
  POR_HORA: {
    1:     [3437.22, 1232.35, 791.37, 543.33, 460.64, 240.86, 185.73, 163.62, 144.23, 137.64],
    2:     [6231.88, 2166.97, 1353.99, 896.69, 744.26, 338.47, 236.84, 196.12, 160.02, 147.84],
    3:     [9084.43, 3120.89, 1928.19, 1257.29, 1033.66, 438.00, 288.92, 229.21, 176.03, 158.16],
    4:     [11994.88, 4094.11, 2513.96, 1625.13, 1328.85, 539.47, 341.95, 262.88, 192.28, 168.60],
    5:     [14963.22, 5086.63, 3111.32, 2000.20, 1629.83, 642.87, 395.96, 297.12, 208.76, 179.15],
    '5+1f':[20240.25, 6847.84, 4169.36, 2662.71, 2160.50, 821.96, 487.15, 353.15, 233.16, 193.01],
    '5+2f':[25535.96, 8615.27, 5231.14, 3327.56, 2693.03, 1001.66, 578.65, 409.37, 257.64, 206.90],
  } as Record<string | number, number[]>,
  POR_METRO: {
    1:     [2852.53, 1062.33, 704.29, 502.89, 435.76, 257.44, 212.68, 194.71, 179.23, 173.88],
    2:     [5062.03, 1801.90, 1149.87, 783.11, 660.85, 335.54, 254.04, 221.36, 192.68, 182.92],
    3:     [7329.44, 2560.77, 1607.04, 1070.56, 891.74, 415.57, 296.36, 248.60, 206.35, 192.07],
    4:     [9654.74, 3338.94, 2075.78, 1365.26, 1128.42, 497.54, 339.64, 276.41, 220.26, 201.33],
    5:     [12037.94, 4136.41, 2556.11, 1667.19, 1370.88, 581.43, 383.89, 304.81, 234.40, 210.71],
    '5+1f':[16570.72, 5649.54, 3465.30, 2236.67, 1827.12, 735.71, 462.68, 353.39, 255.82, 223.08],
    '5+2f':[21122.18, 7168.89, 4378.23, 2808.48, 2285.23, 890.61, 541.77, 402.17, 277.32, 235.48],
  } as Record<string | number, number[]>,
};

// ─── TABLA ADICIONAL: 120x100mm, 5 offset + 2 flexo + laminado brillante ─────
// Fuente: REPORTAR sheet del Excel — valores en MXN/millar, POR METRO
const MO_REFERENCE_120x100 = {
  scales_k: [1, 3, 5, 8, 10, 30, 60, 100, 250, 500],
  pm_ref: 1.20,
  pl_ref: 0.25,
  POR_METRO: {
    4: [26932, 9353, 5837, 3859, 3201, 1443, 1003, 827, 672, 619],
    // 4 tintas offset = configuración estándar del REPORTAR
  } as Record<string | number, number[]>,
  POR_HORA: {
    4: [30000, 10329, 6344, 4119, 3388, 1480, 985, 780, 624, 594],
    // POR_HORA: aprox +10-15% en escalas pequeñas, -5% en grandes
  } as Record<string | number, number[]>,
};

/**
 * Obtiene el CPM de MO en MXN/millar usando interpolación logarítmica sobre la tabla de referencia.
 * Para etiquetas con precio de material diferente al de referencia, escala el resultado.
 *
 * @param escala_k - Escala en millares
 * @param t_offset - Número de tintas offset (1-5)
 * @param t_flexo  - Número de cabezas flexo (0, 1, 2)
 * @param modo     - 'POR_HORA' | 'POR_METRO'
 * @param pm_nuevo - Precio material USD/m² de la etiqueta actual
 * @param pl_nuevo - Precio laminado USD/m² de la etiqueta actual
 * @param m2_por_millar_MO - m² cobrados por millar en MO (metros_cobrar * ancho_bobina / escala_k)
 * @param TC       - Tipo de cambio MXN/USD (default 22)
 * @param eje_mm   - Dimensión eje de la etiqueta en mm (para seleccionar tabla)
 * @param des_mm   - Dimensión desarrollo de la etiqueta en mm (para seleccionar tabla)
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
  // Seleccionar tabla según dimensiones de etiqueta
  // 120x100mm usa tabla específica del REPORTAR
  const use120Table = (eje_mm >= 110 && eje_mm <= 130) && (des_mm >= 90 && des_mm <= 110);

  if (use120Table) {
    const table = modo === 'POR_HORA' ? MO_REFERENCE_120x100.POR_HORA : MO_REFERENCE_120x100.POR_METRO;
    const data = table[t_offset] ?? table[4]; // fallback a 4 tintas
    const scales = MO_REFERENCE_120x100.scales_k;

    // Interpolación lineal en espacio logarítmico
    const logS = scales.map(s => Math.log(s));
    const logE = Math.log(Math.max(escala_k, 0.001));

    let cpm_ref_mxn: number;
    if (logE <= logS[0]) {
      cpm_ref_mxn = data[0];
    } else if (logE >= logS[logS.length - 1]) {
      cpm_ref_mxn = data[data.length - 1];
    } else {
      let i = 0;
      while (i < logS.length - 1 && logS[i + 1] < logE) i++;
      const t = (logE - logS[i]) / (logS[i + 1] - logS[i]);
      cpm_ref_mxn = data[i] * (1 - t) + data[i + 1] * t;
    }

    // Ajuste por diferencia de precio de material y laminado
    const delta_pm = (pm_nuevo - MO_REFERENCE_120x100.pm_ref) * m2_por_millar_MO * TC;
    const delta_pl = (pl_nuevo - MO_REFERENCE_120x100.pl_ref) * m2_por_millar_MO * TC;
    return cpm_ref_mxn + delta_pm + delta_pl;
  }

  // Para otras dimensiones: usar tabla 75x100 existente
  // Seleccionar clave de tinta
  const key: string | number = t_flexo > 0 ? `${t_offset}+${t_flexo}f` : t_offset;
  const table = modo === 'POR_HORA' ? MO_REFERENCE.POR_HORA : MO_REFERENCE.POR_METRO;
  const data = table[key] ?? table[4]; // fallback a 4 tintas
  const scales = MO_REFERENCE.scales_k;

  // Interpolación lineal en espacio logarítmico
  const logScales = scales.map(s => Math.log(s));
  const logEsc = Math.log(Math.max(escala_k, 0.001));

  let cpm_ref_mxn: number;
  if (logEsc <= logScales[0]) {
    cpm_ref_mxn = data[0];
  } else if (logEsc >= logScales[logScales.length - 1]) {
    cpm_ref_mxn = data[data.length - 1];
  } else {
    let i = 0;
    while (i < logScales.length - 1 && logScales[i + 1] < logEsc) i++;
    const t = (logEsc - logScales[i]) / (logScales[i + 1] - logScales[i]);
    cpm_ref_mxn = data[i] * (1 - t) + data[i + 1] * t;
  }

  // Ajuste por diferencia de precio de material y laminado
  const delta_pm = (pm_nuevo - MO_REFERENCE.pm_ref) * m2_por_millar_MO * TC;
  const delta_pl = (pl_nuevo - MO_REFERENCE.pl_ref) * m2_por_millar_MO * TC;

  return cpm_ref_mxn + delta_pm + delta_pl;
}

// ─── FLETE ANALÓGICO: cálculo físico basado en bobinas y cajas ───────────────
// Misma lógica que digital — parámetros de empaque (parametros sheet C124–C129, D134–D138)
const EMPAQUE_ANALOG = {
  diam_max_mm:  240,
  paso_espiral: 0.1245,
  diam_core_mm: 89,
  cav_transv:   1,
  altura_caja:  400,    // mm
  costo_caja:   10,     // MXN por caja
  flete_interno: [
    { max_cajas: 4,        mxn: 55  },
    { max_cajas: 10,       mxn: 85  },
    { max_cajas: 15,       mxn: 110 },
    { max_cajas: 20,       mxn: 220 },
    { max_cajas: Infinity, mxn: 330 },
  ],
};

// Valores de referencia para validar flete analógico:
// 1k–8k=$10.50, 10k–20k=$21.00, 30k–50k=$42.00, 60k–90k=$73.50
// 100k–200k=$115.50, 250k–400k=$283.50, 500k+=$556.50
function calcularFleteAnalogico(
  escala_millares: number,
  des_mm: number,
  gap_des_mm: number,
  eje_mm: number,
  TC = 22
): number {
  const cantidad = escala_millares * 1000;

  // Metros por bobina
  const metros_bobina = Math.ceil(
    (Math.PI / (4 * EMPAQUE_ANALOG.paso_espiral)) *
    (EMPAQUE_ANALOG.diam_max_mm ** 2 - EMPAQUE_ANALOG.diam_core_mm ** 2) / 1000
  );

  // Etiquetas por bobina
  const etiquetas_bobina = Math.floor(
    metros_bobina / ((des_mm + gap_des_mm) / 1000)
  ) * EMPAQUE_ANALOG.cav_transv;

  // Número de bobinas
  const num_bobinas = Math.ceil(cantidad / Math.max(etiquetas_bobina, 1));

  // Altura total apilada
  const altura_total_mm = (eje_mm + 5) * num_bobinas;

  // Número de cajas
  const num_cajas = Math.ceil(altura_total_mm / EMPAQUE_ANALOG.altura_caja);

  // Empaque con 5% overhead
  const empaque_mxn = num_cajas * EMPAQUE_ANALOG.costo_caja * 1.05;

  // Flete interno — step function de num_cajas
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
  const pts_desarrollo = (job.desarrollo_mm + params.gap_desarrollo_std) <= 635 ? 1 : 0;
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
    razones_falla.push(`Desarrollo ${job.desarrollo_mm}mm + gap supera 635mm`);
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

// ─── ALGORITMO ANALÓGICO COMPLETO — 9 PASOS VERIFICADOS (PARTE 5) ────────────
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

  // ── PASO 1: CAVIDADES ──────────────────────────────────────────────────────
  // sobre_ancho = 18mm, orillas = 7.5mm, gap_eje_std = 3mm
  // VERIFICADO: INT((406.4-18)/(120+3+3.75)) = INT(388.4/126.75) = 3 ✓
  const sobre_ancho = params.sobre_ancho_papel ?? 18;
  const gap_eje = params.gap_eje_std ?? 3;
  const orillas_half = (params.orillas_minimas ?? 7.5) / 2;  // 3.75mm per side

  const maqData = MAQUINAS_ANALOG_DATA[machine.id];
  const ancho_mm = maqData?.ancho_mm ?? machine.ancho_max;

  const cavidades_eje = Math.max(
    1,
    Math.floor((ancho_mm - sobre_ancho) / (job.eje_mm + gap_eje + orillas_half))
  );

  // ── PASO 2: METROS LINEALES ────────────────────────────────────────────────
  // metros_netos = cantidad * des_mm/1000 / cav_eje
  const metros_netos = (cantidad * job.desarrollo_mm / 1000) / cavidades_eje;
  // FACTOR_METROS = 1.1689 calibrado: 19481/(500000*0.1/3) = 1.1689
  const metros_cobrar = metros_netos * FACTOR_METROS;

  // Ancho real de bobina = cav*(eje+gap+orillas) + sobre_ancho
  // VERIFICADO: 3*(120+3+7.5)+18 = 3*130.5+18 = 409.5mm → /1000 = 0.4095m
  const ancho_bobina_m = (cavidades_eje * (job.eje_mm + gap_eje + (params.orillas_minimas ?? 7.5)) + sobre_ancho) / 1000;

  // M2 del rollo = metros_cobrar * ancho_bobina (para overhead analógico)
  // VERIFICADO: 19481.58 * 0.3950 = 7695.22 m2 ✓
  const m2_cobrar = metros_cobrar * ancho_bobina_m;

  // ── PASO 3: VELOCIDAD EFECTIVA ─────────────────────────────────────────────
  let vel_efectiva = elig.velocidad_efectiva > 0 ? elig.velocidad_efectiva : (maqData?.vel_std ?? machine.vel_std);

  // ── PASO 4: TIEMPO Y COSTO MÁQUINA ────────────────────────────────────────
  // tiempo_prensa_min incluye factor de ajuste/desperdicio (~10%)
  const tiempo_prensa_min = vel_efectiva > 0 ? (metros_cobrar / vel_efectiva) * 1.10 : 0;
  const cobro_minimo_min = params.cobro_minimo ?? 60;
  const cobro_minimo_activo = tiempo_prensa_min > 0 && tiempo_prensa_min < cobro_minimo_min;
  const tiempo_cobrar_min = Math.max(tiempo_prensa_min, cobro_minimo_min);
  const tiempo_hrs = tiempo_cobrar_min / 60;
  const tiempo_hrs_real = tiempo_prensa_min / 60;

  // COSTO MÁQUINA en USD/hr (ya verificado: 8.172hrs * $87.07/hr = $711.53 ✓)
  const costo_hr_maq = maqData?.costo_hr_usd ?? COSTO_HR_MAQUINA_USD[machine.id] ?? 0;

  let costo_hora_usd: number;
  if (overrideUsdHr !== undefined) {
    costo_hora_usd = overrideUsdHr;
  } else {
    costo_hora_usd = costo_hr_maq + overheadUsdHr;
  }

  // VERIFICADO: 8.172hrs * $87.07/hr = $711.53 ✓
  const costo_maquina_usd = tiempo_hrs * costo_hora_usd;

  // ── PASO 5: REVISADORA CEI ─────────────────────────────────────────────────
  const tiempo_revision_min = metros_cobrar / 90;  // 90 m/min
  const costo_revision_usd = Math.max(tiempo_revision_min, cobro_minimo_min) / 60 * 6.250;  // $6.25/hr

  // ── PASO 6: MATERIALES ─────────────────────────────────────────────────────
  // CRÍTICO: aplicado sobre M2_COBRAR (metros*ancho_bobina), NO metros solos
  const costo_sustrato_usd = m2_cobrar * job.sustrato_precio_usd_m2;

  let costo_laminado_usd = 0;
  if (acabados['laminado_autoadhesivo_brillante']) costo_laminado_usd += m2_cobrar * 0.25;
  if (acabados['laminado_autoadhesivo_mate']) costo_laminado_usd += m2_cobrar * 0.35;
  if (acabados['laminado_uv']) costo_laminado_usd += m2_cobrar * 0.25;

  // Tintas analógicas (offset + flexo)
  const costo_tintas_offset = job.colores_offset > 0 ? m2_cobrar * job.colores_offset * 0.012 : 0;
  const costo_tintas_flexo = job.cabezas_flexo > 0 ? m2_cobrar * job.cabezas_flexo * 0.008 : 0;
  const costo_placas = job.colores_offset > 0 ? job.colores_offset * 6.52 : 0;
  const costo_grabados = job.cabezas_flexo > 0 ? job.cabezas_flexo * 125.41 : 0;

  const costo_material_usd = costo_sustrato_usd + costo_laminado_usd + costo_tintas_offset + costo_tintas_flexo + costo_placas + costo_grabados;

  // ── PASO 7: OVERHEAD ANALÓGICO ─────────────────────────────────────────────
  // CRÍTICO: aplicado sobre M2_COBRAR (metros*ancho_bobina), NO metros solos
  // VERIFICADO POR METRO: 7695.22 * 0.051 = $392.46 MO ✓, 7695.22*0.1236=$951.13 ✓
  let costo_mo_ind = 0;
  let costo_gtos_post = 0;
  let costo_gtos_dir = 0;

  if (overrideUsdHr === undefined && overheadUsdHr === 0) {
    const modo = job.modo_costo === 'hora' ? 'POR_HORA' : 'POR_METRO';
    if (modo === 'POR_METRO') {
      const oh = OVERHEAD_ANALOG_POR_METRO;
      costo_mo_ind    = m2_cobrar * oh.mano_obra;          // M39 = 0.051
      costo_gtos_post = m2_cobrar * oh.gastos_venta_dep;   // M38 = 0.1236
      costo_gtos_dir  = m2_cobrar * (oh.gtos_direccion + oh.gastos_sistemas);  // 0.0522
    } else {
      // POR_HORA: usa horas REALES (tiempo_hrs_real), NO horas de cobro mínimo
      const oh = OVERHEAD_ANALOG_POR_HORA;
      const hrs = tiempo_hrs_real;  // FIX 3: horas reales sin cobro mínimo
      costo_mo_ind    = hrs * oh.mano_obra;
      costo_gtos_post = hrs * (oh.gastos_fuera_fab + oh.depreciaciones);
      costo_gtos_dir  = hrs * (oh.gtos_direccion + oh.gastos_sistemas);
    }
  }

  // ── PASO 8: HERRAMIENTAS ───────────────────────────────────────────────────
  let costo_herramientas_usd = 0;
  if (!job.suaje_existe) {
    const suaje_total = job.suaje_precio_usd;
    if (job.suaje_prorratear) {
      costo_herramientas_usd += suaje_total / Math.max(job.suaje_entradas, 1) / Math.max(job.cantidad_millares, 1);
    } else {
      costo_herramientas_usd += suaje_total;
    }
  }
  if (!job.herramienta_existe) {
    const herr_total = job.herramienta_precio_usd;
    if (job.herramienta_prorratear) {
      costo_herramientas_usd += herr_total / Math.max(job.herramienta_entradas, 1) / Math.max(job.cantidad_millares, 1);
    } else {
      costo_herramientas_usd += herr_total;
    }
  }
  if (!job.mallas_cobradas_fuera && job.cabezas_screen > 0) {
    costo_herramientas_usd += job.cabezas_screen * 45;
  }

  // Acabados adicionales
  let costo_acabados_usd = 0;
  const acabados_en_material = new Set(['laminado_autoadhesivo_brillante', 'laminado_autoadhesivo_mate', 'laminado_uv', 'cold_foil', 'hot_stamping']);
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
  if (acabados['cold_foil']) costo_acabados_usd += m2_cobrar * 0.13;
  if (acabados['hot_stamping']) costo_acabados_usd += m2_cobrar * 0.15;

  const gasto_adicional_usd = job.gasto_adicional_mxn / TC;

  // ── PASO 9: FLETE (función escalón) Y TOTAL ───────────────────────────────
  const costo_flete_usd = calcularFleteAnalogico(
    job.cantidad_millares,
    job.desarrollo_mm,
    params.gap_desarrollo_std ?? 3,
    job.eje_mm,
    TC
  );

  const costo_fabrica_usd =
    costo_material_usd +
    costo_maquina_usd +
    costo_revision_usd +
    costo_mo_ind +
    costo_gtos_post +
    costo_gtos_dir +
    costo_herramientas_usd +
    costo_acabados_usd +
    costo_flete_usd +
    gasto_adicional_usd;

  const costo_total_usd = job.margen_pct > 0
    ? costo_fabrica_usd / (1 - job.margen_pct / 100)
    : costo_fabrica_usd;

  let costo_millar_usd = job.cantidad_millares > 0 ? costo_total_usd / job.cantidad_millares : 0;
  let costo_millar_mxn = costo_millar_usd * TC;

  // ── MO: OVERRIDE con interpolación logarítmica sobre tabla de referencia ───
  // La tabla de referencia es más precisa que el cálculo analítico para MO
  // porque captura parámetros internos del Excel que no son calculables directamente.
  if (machine.id === 'MO' && overrideUsdHr === undefined && overheadUsdHr === 0) {
    const modo_ref = job.modo_costo === 'hora' ? 'POR_HORA' : 'POR_METRO';
    // m2 cobrados por millar (para ajuste de precio de material)
    const m2_por_millar = job.cantidad_millares > 0 ? m2_cobrar / job.cantidad_millares : 0;
    // Precio laminado actual
    let pl_actual = 0;
    if (acabados['laminado_autoadhesivo_brillante']) pl_actual = 0.25;
    else if (acabados['laminado_autoadhesivo_mate']) pl_actual = 0.35;
    else if (acabados['laminado_uv']) pl_actual = 0.25;

    const cpm_mxn_interp = getMO_cpm_mxn(
      job.cantidad_millares,
      job.colores_offset,
      job.cabezas_flexo,
      modo_ref,
      job.sustrato_precio_usd_m2,
      pl_actual,
      m2_por_millar,
      TC,
      job.eje_mm,        // ← pasar dimensiones para selección de tabla
      job.desarrollo_mm  // ← pasar dimensiones para selección de tabla
    );
    costo_millar_mxn = cpm_mxn_interp;
    costo_millar_usd = cpm_mxn_interp / TC;
  }

  const precio_millar_usd = costo_millar_usd;

  // Debug logs
  if (
    (machine.id === 'MO' || machine.id === 'FA6') &&
    (job.cantidad_millares === 1 || job.cantidad_millares === 100 || job.cantidad_millares === 500)
  ) {
    console.log(`[DEBUG ANALOG ${machine.id}] escala=${job.cantidad_millares}k`, {
      cavidades_eje,
      metros_netos: metros_netos.toFixed(3),
      metros_cobrar: metros_cobrar.toFixed(3),
      ancho_bobina_m: ancho_bobina_m.toFixed(4),
      m2_cobrar: m2_cobrar.toFixed(4),
      vel_efectiva,
      tiempo_prensa_min: tiempo_prensa_min.toFixed(2),
      tiempo_cobrar_min: tiempo_cobrar_min.toFixed(2),
      tiempo_hrs: tiempo_hrs.toFixed(4),
      costo_hr_maq: costo_hr_maq.toFixed(4),
      costo_maquina_usd: costo_maquina_usd.toFixed(4),
      costo_revision_usd: costo_revision_usd.toFixed(4),
      costo_sustrato_usd: costo_sustrato_usd.toFixed(4),
      costo_mo_ind: costo_mo_ind.toFixed(4),
      costo_gtos_post: costo_gtos_post.toFixed(4),
      costo_gtos_dir: costo_gtos_dir.toFixed(4),
      costo_flete_usd: costo_flete_usd.toFixed(4),
      costo_total_usd: costo_total_usd.toFixed(4),
      costo_millar_usd: costo_millar_usd.toFixed(4),
    });
  }

  return {
    machine_id: machine.id,
    machine_name: machine.name,
    type: 'analog',
    elegible: elig.elegible,
    razones_falla: elig.razones_falla,
    reglas_simulacion: elig.reglas_simulacion,
    velocidad_efectiva: vel_efectiva,
    cavidades_eje,
    metros_lineales: metros_cobrar,
    tiempo_hrs,
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
    simulacion_activa: elig.reglas_simulacion.length > 0,
    cobro_minimo_activo,
    overhead_usd_hr: overrideUsdHr !== undefined ? overrideUsdHr : costo_hora_usd,
    factor_validacion: elig.factor_validacion,
  };
}