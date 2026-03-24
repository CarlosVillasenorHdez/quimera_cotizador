import { DigitalMachine, GlobalParams, DigitalMachineParams, DigitalSpeedTable, ClickValueRow } from '../config/machines';

export interface JobInputDigital {
  eje_mm: number;
  desarrollo_mm: number;
  cantidad_millares: number;
  sustrato_precio_usd_m2: number;
  ancho_material_mm: number;
  ancho_material_20mil_mm: number;
  num_tintas: number;
  cama_blanco: boolean;
  blanco_cobertura_pct: number;
  blanco_num_camas: number;
  tinta_plata: boolean;
  plata_cobertura_pct: number;
  plata_num_camas: number;
  tinta_invisible: boolean;
  tinta_pink: boolean;
  tinta_raised: boolean;
  usa_primer_extra: boolean;
  pasos_omega: number;
  pasos_estampador: number;
  pasos_jtfix: number;
  reinsercion_digital: boolean;
  flete_externo: boolean;
  flete_monto_mxn: number;
  margen_pct: number;
  modo_costo: 'hora' | 'metro';
  desperdicio_pct: number;
}

export interface DigitalEligibilityRules {
  dimension_digital: boolean;
  velocidad_resultante: boolean;
}

export interface DigitalCostResult {
  machine_id: string;
  machine_name: string;
  type: 'digital';
  elegible: boolean;
  razones_falla: string[];
  reglas_simulacion: string[];
  velocidad_efectiva: number;
  cavidades_usadas: number;
  planilla_usada: '13"' | '30"';
  metros_lineales: number;
  tiempo_hrs: number;
  tiempo_hrs_real: number;
  clicks_totales: number;
  tintas_totales: number;
  costo_click_usd: number;
  costo_tinta_usd: number;
  costo_material_usd: number;
  costo_acabados_usd: number;
  costo_fabrica_usd: number;
  costo_total_usd: number;
  costo_millar_usd: number;
  precio_millar_usd: number;
  costo_millar_mxn: number;
  simulacion_activa: boolean;
  cobro_minimo_activo: boolean;
  overhead_usd_hr: number;
  frames_necesarios: number;
  m2_totales: number;
  costo_hp_usd: number;
  costo_overhead_usd: number;
  frames_setup: number;
  frames_tiro: number;
  metros_omega: number;
  metros_total_con_omega: number;
  costo_sustrato_usd: number;
  costo_laminado_usd: number;
  costo_cei_usd: number;
  costo_omega_usd: number;
  costo_gtos_grales_usd: number;
  costo_gtos_direccion_usd: number;
  costo_envios_usd: number;
}

// ─── CONSTANTES GLOBALES VERIFICADAS (PARTE 1) ───────────────────────────────
export const GLOBAL = {
  TC: 22,
  dias_mes: 20,
  horas_dia: 12,
  eficiencia: 0.85,
  horas_reales_mes: 204,  // 20*12*0.85

  // Overhead digital (parametros sheet) — USD por M2 NETO o por hora
  // M2_NETO = eje_m * des_m * cantidad (área pura de etiqueta, sin desperdicio)
  // VERIFICADO: 6000 * 0.319 = $1,915.20 gtos_grales ✓, 6000 * 0.119 = $714 MO ✓, 6000 * 0.091 = $546 dir ✓
  overhead_digital_por_m2: {
    gastos_grales:   0.259,
    depreciaciones:  0.0294,
    mano_obra:       0.119,   // K32 — VERIFICADO: 6000 * 0.119 = $714 ✓
    gtos_direccion:  0.091,   // K33 — VERIFICADO: 6000 * 0.091 = $546 ✓
    gastos_sistemas: 0.031,
    // gastos_grales + depreciaciones + gastos_sistemas = 0.259 + 0.0294 + 0.031 = 0.3194 ≈ 0.319 ✓
    TOTAL: 0.5292,
  },
  overhead_digital_por_hr: {
    gastos_grales:   43.257,
    depreciaciones:   4.910,
    mano_obra:       19.875,  // N32 — VERIFICADO
    gtos_direccion:  15.199,  // N33 — VERIFICADO
    gastos_sistemas:  5.144,
    // gastos_grales + depreciaciones + gastos_sistemas = 43.257 + 4.910 + 5.144 = 53.311 ✓
    TOTAL: 88.385,
  },

  // Overhead analógico (TIEMPO MAQUINA cols M y X)
  overhead_analog_por_m2: {
    gastos_venta_dep: 0.1236,
    mano_obra:        0.0510,
    gtos_direccion:   0.0390,
    gastos_sistemas:  0.0132,
    TOTAL: 0.2268,
  },
  overhead_analog_por_hr: {
    gastos_fuera_fab:  37.078,
    depreciaciones:     4.209,
    mano_obra:         17.036,
    gtos_direccion:    13.027,
    gastos_sistemas:    4.409,
    TOTAL: 75.759,
  },

  // Máquinas auxiliares
  omega:     { costo_hr: 14.236, vel_m_min: 25, setup_min: 30, cobro_min_min: 60 },
  CEI:       { costo_hr:  6.250, vel_m_min: 100, cobro_min_min: 60 },
  pack_ready:{ costo_hr: 12.500 },
};

// ─── MÁQUINAS DIGITALES ───────────────────────────────────────────────────────
// Fuente: parametros sheet del Excel
// 6MIL: planilla=31.7cm, frame=97cm, setup=5m, click=$0.0242, costo_hp=$74.167/hr
// V12:  planilla=31.3cm, frame=100cm, setup=100m, click=$0.0220, costo_hp=$194.097/hr
export const MAQUINAS_DIGITAL: Record<string, {
  planilla_cm: number;
  frame_largo_cm: number;
  setup_metros: number;
  click_usd: number | null;
  costo_tinta_m2?: number;
  costo_hr_impresion: number;
  cobro_minimo_min: number;
  ancho_material_m: number;
  velocidades_m_min: Record<number, number>;
}> = {
  '6MIL': {
    planilla_cm: 31.7,
    frame_largo_cm: 97.0,
    setup_metros: 5.0,
    click_usd: 0.0242,
    costo_hr_impresion: 74.167,
    cobro_minimo_min: 10,
    ancho_material_m: 0.320,
    velocidades_m_min: { 1:42, 2:42, 3:42, 4:31, 5:25, 6:21, 7:18, 8:15, 9:13, 10:12 },
  },
  'V12': {
    planilla_cm: 31.3,
    frame_largo_cm: 100.0,
    setup_metros: 100.0,
    click_usd: 0.022,
    costo_hr_impresion: 194.097,
    cobro_minimo_min: 10,
    ancho_material_m: 0.320,
    velocidades_m_min: { 1:120, 2:120, 3:120, 4:120, 5:120, 6:120, 7:60, 8:60, 9:60, 10:60 },
  },
  '20MIL': {
    planilla_cm: 71.4,
    frame_largo_cm: 110.0,
    setup_metros: 10.0,
    click_usd: 0.0715,
    costo_hr_impresion: 74.167,
    cobro_minimo_min: 10,
    ancho_material_m: 0.714,
    velocidades_m_min: { 1:42, 2:42, 3:42, 4:31, 5:25, 6:21, 7:18, 8:15, 9:13, 10:12 },
  },
  'INK_JET': {
    planilla_cm: 31.7,
    frame_largo_cm: 400.0,
    setup_metros: 10.0,
    click_usd: null,
    costo_tinta_m2: 0.0289,
    costo_hr_impresion: 74.167,
    cobro_minimo_min: 10,
    ancho_material_m: 0.320,
    velocidades_m_min: { 1:42, 2:42, 3:42, 4:42, 5:20, 6:20, 7:20, 8:20, 9:20, 10:20 },
  },
};

// ─── MODO OVERHEAD ────────────────────────────────────────────────────────────
export let MODO_OVERHEAD: 'POR_METRO' | 'POR_HORA' = 'POR_METRO';

// ─── VALORES DE REFERENCIA PARA VALIDACIÓN (PARTE 6) ─────────────────────────
// Etiqueta: eje=120mm, des=100mm, mat=$1.20, laminado brillante, 4 tintas, 1 Omega, 500k, POR_METRO
export const REFS_6MIL_500K = {
  metros_imp: 25755.2,
  clicks: 111112,
  m2_netos: 6000,
  sustrato: 9897.68,
  clicks_cost: 2688.91,
  acabados: 2424.02,
  hp: 1358.18,
  mo: 714.00,
  omega: 294.69,
  gtos_gral: 1915.20,
  gtos_dir: 546.00,
  envios: 39.82,
  total: 19905.34,
  cpm_usd: 39.81,
  cpm_mxn: 875.82,
};

export const REFS_MO_500K = {
  metros: 19481.58,
  m2_cobrar: 7695.22,
  tiempo_hrs: 8.172,
  costo_maquina: 711.53,
  revision: 15.03,
  mo_ind: 392.46,
  gtos_post: 951.13,
  gtos_dir: 401.69,
  total: 14066.63,
  cpm_usd: 28.13,
  cpm_mxn: 618.93,
};

// ─── LEGACY EXPORTS (backward compatibility) ─────────────────────────────────
export const PARAMS = {
  tipo_cambio: GLOBAL.TC,
  dias_mes: GLOBAL.dias_mes,
  horas_dia: GLOBAL.horas_dia,
  eficiencia: GLOBAL.eficiencia,
  horas_reales_mes: GLOBAL.horas_reales_mes,
  sobre_ancho_mm: 18,
  orillas_mm: 7.5,
  gap_eje_std_mm: 3,
  gap_des_std_mm: 3,
  cobro_minimo_min: 60,
  merma_corrida: 0.05,
  metros_cambio_bobina: 20,
};

export const OVERHEAD_DIGITAL = {
  gastos_grales:   { mensual: 176490, pct: 0.70, num_maq: 14, fee_hr: 43.257, fee_m2: 0.259 },
  depreciaciones:  { mensual:  20034, pct: 0.70, num_maq: 14, fee_hr:  4.910, fee_m2: 0.029 },
  mano_obra:       { mensual:  81090, pct: 0.70, num_maq: 14, fee_hr: 19.875, fee_m2: 0.119 },
  gtos_direccion:  { mensual:  62010, pct: 0.70, num_maq: 14, fee_hr: 15.199, fee_m2: 0.091 },
  gastos_sistemas: { mensual:  20988, pct: 0.70, num_maq: 14, fee_hr:  5.144, fee_m2: 0.031 },
  total_fee_hr: 88.385,
  total_fee_m2: 0.5292,
};

export const OVERHEAD_GTOS_GRALES_M2 = GLOBAL.overhead_digital_por_m2.gastos_grales + GLOBAL.overhead_digital_por_m2.depreciaciones + GLOBAL.overhead_digital_por_m2.gastos_sistemas; // 0.319
export const OVERHEAD_GTOS_DIRECCION_M2 = GLOBAL.overhead_digital_por_m2.mano_obra + GLOBAL.overhead_digital_por_m2.gtos_direccion; // 0.210
export const OVERHEAD_GTOS_GRALES_HR = GLOBAL.overhead_digital_por_hr.gastos_grales + GLOBAL.overhead_digital_por_hr.depreciaciones + GLOBAL.overhead_digital_por_hr.gastos_sistemas; // 53.311
export const OVERHEAD_GTOS_DIRECCION_HR = GLOBAL.overhead_digital_por_hr.mano_obra + GLOBAL.overhead_digital_por_hr.gtos_direccion; // 35.074

export const COSTO_HR_IMPRESION: Record<string, number> = {
  '6MIL':    74.167,
  'V12':    194.097,
  '20MIL':   74.167,
  'INK_JET': 74.167,
};

export const VALOR_CLICK: Record<string, number> = {
  '6MIL':    0.0242,
  'V12':     0.0220,
  '20MIL':   0.0715,
  'INK_JET': 0,
};

export const VELOCIDADES_DIGITAL: Record<string, Record<number, number>> = {
  '6MIL':    { 1:42, 2:42, 3:42, 4:31, 5:25, 6:21, 7:18, 8:15, 9:13, 10:12 },
  'V12':     { 1:120, 2:120, 3:120, 4:120, 5:120, 6:120, 7:60, 8:60, 9:60, 10:60 },
  '20MIL':   { 1:42, 2:42, 3:42, 4:31, 5:25, 6:21, 7:18, 8:15, 9:13, 10:12 },
  'INK_JET': { 1:42, 2:42, 3:42, 4:42, 5:20, 6:20, 7:20, 8:20, 9:20, 10:20 },
};

export const DIGITAL_MACHINE_DATA: Record<string, {
  planilla_mm: number;
  frame_cm: number;
  set_up_m: number;
  click: number;
  costo_hr: number;
}> = {
  '6MIL':    { planilla_mm: 317, frame_cm: 97,  set_up_m: 5,   click: 0.0242, costo_hr: 74.167  },
  'V12':     { planilla_mm: 313, frame_cm: 100, set_up_m: 100, click: 0.0220, costo_hr: 194.097 },
  '20MIL':   { planilla_mm: 714, frame_cm: 110, set_up_m: 10,  click: 0.0715, costo_hr: 74.167  },
  'INK_JET': { planilla_mm: 317, frame_cm: 400, set_up_m: 10,  click: 0,      costo_hr: 74.167  },
};

export const VEL_CEI_M_MIN = 100;   // m/min (GLOBAL.CEI.vel_m_min)
export const COSTO_HR_CEI = 6.250;  // USD/hr (GLOBAL.CEI.costo_hr)
export const COSTO_HR_OMEGA = 14.236;
export const VEL_OMEGA_M_MIN = 25;  // GLOBAL.omega.vel_m_min
export const OMEGA_SETUP_MIN = 30;  // GLOBAL.omega.setup_min
export const MO_RATE_DIGITAL_HR = 39.02;
export const COSTO_TINTA_INKJET_M2 = 0.0289;
export const ANCHO_MATERIAL_M: Record<string, number> = {
  '6MIL':    0.320,
  'V12':     0.320,
  '20MIL':   0.714,
  'INK_JET': 0.320,
};
export const ANCHO_OMEGA_MM = 317;

export const TEST_REFS_500K_EJE120 = {
  '6MIL': {
    sustrato: 9897.68,
    clicks: 2688.91,
    acabados: 2424.02,
    hp: 1358.18,
    mo: 714.00,
    omega: 294.69,
    overhead: 2461.20,
    total: 19905.34,
    cpm: 39.81,
  },
};

export const TEST_REFS_EJE75: Record<string, Record<number, number>> = {
  '6MIL':    { 1: 1021.88, 10: 295.78, 100: 249.89, 500: 247.05 },
  'V12':     { 1: 1882.10, 10: 356.09, 100: 221.57, 500: 214.15 },
  'INK_JET': { 1: 955.62,  10: 241.10, 100: 188.40, 500: 185.27 },
};

// ─── FLETE DIGITAL: cálculo físico basado en bobinas y cajas ─────────────────
// Parámetros físicos de empaque (parametros sheet C124–C129, D134–D138)
const EMPAQUE_DIGITAL = {
  diam_max_mm:  240,    // C124
  paso_espiral: 0.1245, // C125
  diam_core_mm: 89,     // C126
  cav_transv:   1,      // C127 cavidades transversales de la bobina
  altura_caja:  400,    // C128 mm — altura de caja para empacar bobinas
  costo_caja:   10,     // C129 MXN por caja
  flete_interno: [
    { max_cajas: 4,        mxn: 55  },  // D134
    { max_cajas: 10,       mxn: 85  },  // D135
    { max_cajas: 15,       mxn: 110 },  // D136
    { max_cajas: 20,       mxn: 220 },  // D137
    { max_cajas: Infinity, mxn: 330 },  // D138
  ],
};

function calcFleteDigital(
  escala_k: number,
  des_mm: number,
  gap_des_mm: number,
  eje_mm: number,
  TC = 22
): number {
  const cantidad = escala_k * 1000;

  // Metros por bobina (B149)
  const metros_bobina = Math.ceil(
    (Math.PI / (4 * EMPAQUE_DIGITAL.paso_espiral)) *
    (EMPAQUE_DIGITAL.diam_max_mm ** 2 - EMPAQUE_DIGITAL.diam_core_mm ** 2) / 1000
  );  // ≈ 314m

  // Etiquetas por bobina (B152)
  const etiquetas_bobina = Math.floor(
    metros_bobina / ((des_mm + gap_des_mm) / 1000)
  ) * EMPAQUE_DIGITAL.cav_transv;

  // Número de bobinas necesarias (B153)
  const num_bobinas = Math.ceil(cantidad / Math.max(etiquetas_bobina, 1));

  // Altura total apilada en mm (B154)
  const altura_total_mm = (eje_mm + 5) * num_bobinas;

  // Número de cajas (B155)
  const num_cajas = Math.ceil(altura_total_mm / EMPAQUE_DIGITAL.altura_caja);

  // Empaque (B160) — costo cajas con 5% overhead
  const empaque_mxn = num_cajas * EMPAQUE_DIGITAL.costo_caja * 1.05;

  // Flete interno (B157) — step function de num_cajas
  const row = EMPAQUE_DIGITAL.flete_interno.find(r => num_cajas <= r.max_cajas);
  const flete_int_mxn = row ? row.mxn : 330;

  return (empaque_mxn + flete_int_mxn) / TC;
}

// ─── FLETE (función escalón — NO proporcional) ────────────────────────────────
function calcularFlete(escala_millares: number): number {
  if (escala_millares <= 9)   return 10.50;
  if (escala_millares <= 20)  return 21.00;
  if (escala_millares <= 50)  return 42.00;
  if (escala_millares <= 90)  return 73.50;
  if (escala_millares <= 200) return 115.50;
  if (escala_millares <= 400) return 283.50;
  return 556.50;  // 500k+
}

// ─── ALGORITMO DIGITAL COMPLETO — 13 PASOS VERIFICADOS (PARTE 3) ─────────────
export function calcularCostoDigital(
  machine: DigitalMachine,
  job: JobInputDigital,
  params: GlobalParams,
  rules: DigitalEligibilityRules,
  acabados: Record<string, boolean>,
  overheadUsdHr = 0,
  overrideUsdHr?: number,
  machineParams?: DigitalMachineParams,
  speedTable?: DigitalSpeedTable,
  clickValues?: ClickValueRow[]
): DigitalCostResult {
  const razones_falla: string[] = [];
  const reglas_simulacion: string[] = [];

  const efic = GLOBAL.eficiencia;  // 0.85
  const TC = params.tipo_cambio ?? GLOBAL.TC;  // FIX: usar tipo_cambio del job, no hardcoded
  const cantidad = job.cantidad_millares * 1000;

  // Obtener datos de la máquina desde MAQUINAS_DIGITAL
  const maqKey = machine.id;
  const maqData = MAQUINAS_DIGITAL[maqKey] ?? MAQUINAS_DIGITAL['6MIL'];

  const planilla_cm = machineParams?.planilla_cm ?? maqData.planilla_cm;
  const frame_largo_cm = machineParams?.frame_largo_cm ?? maqData.frame_largo_cm;
  const setup_metros = machineParams?.setup_metros ?? maqData.setup_metros;

  const eje_cm = job.eje_mm / 10;
  const des_cm = job.desarrollo_mm / 10;
  const gap_e_cm = (params.gap_eje_std ?? 3) / 10;
  const gap_d_cm = (params.gap_desarrollo_std ?? 3) / 10;

  // ── PASO 1: CAVIDADES ──────────────────────────────────────────────────────
  // cav_eje = INT(planilla_cm / (eje_cm + gap_eje_cm))
  const cav_eje = Math.floor(planilla_cm / (eje_cm + gap_e_cm));
  // cav_des = INT(frame_largo_cm / (des_cm + gap_des_cm * 2))
  const cav_des = Math.floor(frame_largo_cm / (des_cm + gap_d_cm * 2));

  if (cav_eje === 0 || cav_des === 0) {
    if (rules.dimension_digital) {
      razones_falla.push('Dimensiones no caben en planilla');
    } else {
      reglas_simulacion.push('Dimensión digital (simulación)');
    }
  }

  const cavidades_usadas = Math.max(cav_eje, 1) * Math.max(cav_des, 1);
  const planilla_usada: '13"' | '30"' = '13"';

  // ── PASO 2: FRAMES ─────────────────────────────────────────────────────────
  // area_no_impresa = frame_largo_cm - (des_cm + gap_des) * cav_des
  // CRÍTICO: usa gap_d_cm (no gap_d_cm*2) para area_no_imp
  const area_no_imp = frame_largo_cm - (des_cm + gap_d_cm) * Math.max(cav_des, 1);
  // frames = ROUNDUP(cantidad / (cav_eje * cav_des))
  const frames_tiro = Math.ceil(cantidad / (Math.max(cav_eje, 1) * Math.max(cav_des, 1)));
  const frames_total = frames_tiro;
  const frames_setup = 0;

  // ── PASO 3: METROS ─────────────────────────────────────────────────────────
  // metros_impresion = frames * (frame_largo - area_no_imp) / 100 + setup_metros
  // VERIFICADO: 27778 * (97-4.3)/100 + 5 = 25755.2m ✓
  const metros_imp = frames_total * (frame_largo_cm - area_no_imp) / 100 + setup_metros;
  // metros_omega_minimo = 20m (parametros!L9)
  const metros_omega_min_val = 20;
  const metros_total_base = metros_imp + metros_omega_min_val;  // = N9 "metros a imprimir"

  // ── PASO 4: M2 ─────────────────────────────────────────────────────────────
  const ancho_m = ANCHO_MATERIAL_M[machine.id] ?? maqData.ancho_material_m;
  // m2_para_laminado = metros_imp × ancho (J4 del Excel — SIN los 20m de omega)
  // CORRECCIÓN 1: laminado se calcula sobre metros_imp solamente, NO metros_total
  const m2_para_laminado = metros_imp * ancho_m;
  // m2_total usa metros_total_base (metros_imp + 20m omega) — para sustrato y CEI
  // CORRECCIÓN 3: sustrato sí usa metros_total (incluye los 20m de omega mínimo)
  const m2_total = metros_total_base * ancho_m;

  // M2_NETOS = área pura de etiqueta × cantidad (para overhead)
  // VERIFICADO: 0.12m * 0.10m * 500000 = 6000 m2_netos → MO=$714 ✓
  const m2_netos = (eje_cm / 100) * (des_cm / 100) * cantidad;

  // ── PASO 5: CLICKS Y CONSUMIBLES ──────────────────────────────────────────
  const camas_blanco = job.cama_blanco ? job.blanco_num_camas : 0;
  const camas_plata = job.tinta_plata ? job.plata_num_camas : 0;
  const tintas_ef = job.num_tintas + camas_blanco + camas_plata;
  const tintas_totales = tintas_ef;

  const clicks_totales = machine.modo === 'click'
    ? Math.floor(frames_total * tintas_ef)
    : 0;

  let valor_click_usd = maqData.click_usd ?? VALOR_CLICK[machine.id] ?? 0;
  if (clickValues) {
    const cv = clickValues.find(c => c.machine_id === machine.id);
    if (cv && cv.valor_click_base_usd > 0) {
      valor_click_usd = cv.valor_click_base_usd * (1 + cv.margen_click);
    }
  }

  let costo_click_usd = 0;
  let costo_tinta_usd = 0;

  if (machine.modo === 'click') {
    costo_click_usd = clicks_totales * (valor_click_usd ?? 0);
    costo_tinta_usd = costo_click_usd;
  } else {
    // INK JET: costo_tinta = m2_total * costo_tinta_m2
    const costo_inkjet_m2 = maqData.costo_tinta_m2 ?? COSTO_TINTA_INKJET_M2;
    costo_tinta_usd = m2_total * costo_inkjet_m2;
  }

  // ── PASO 6: SUSTRATO ───────────────────────────────────────────────────────
  // FIX 1: usa m2_total (con omega) para sustrato
  const costo_sustrato_usd = m2_total * job.sustrato_precio_usd_m2;

  // ── PASO 7: ACABADOS (laminado, barniz, etc.) ──────────────────────────────
  // CORRECCIÓN 1: laminado usa m2_para_laminado (metros_imp × ancho, SIN omega)
  // dividido entre eficiencia (fórmula Excel: L36 = J4 * precio / efic)
  // VERIFICADO: metros_imp=25755.2 * 0.32 * 0.25 / 0.85 = $2,424.02 ✓
  let precio_laminado_m2 = 0;
  if (acabados['laminado_autoadhesivo_brillante']) precio_laminado_m2 += 0.25;
  if (acabados['laminado_autoadhesivo_mate']) precio_laminado_m2 += 0.35;
  if (acabados['laminado_uv']) precio_laminado_m2 += 0.25;

  const costo_laminado_usd = precio_laminado_m2 > 0
    ? (m2_para_laminado * precio_laminado_m2) / efic
    : 0;

  let costo_otros_acabados = 0;
  if (acabados['barniz_brillante_uv']) costo_otros_acabados += m2_total * 0.04;
  if (acabados['barniz_mate_uv']) costo_otros_acabados += m2_total * 0.045;
  if (acabados['cast_and_cure']) costo_otros_acabados += m2_total * 0.12;
  if (acabados['hot_stamping']) costo_otros_acabados += m2_total * 0.15;
  if (acabados['cold_foil']) costo_otros_acabados += m2_total * 0.13;
  if (acabados['embossing']) costo_otros_acabados += m2_total * 0.06;
  if (acabados['hs_embossing']) costo_otros_acabados += m2_total * 0.2;
  if (acabados['estaqueo']) costo_otros_acabados += m2_total * 0.02;
  if (acabados['cupon']) costo_otros_acabados += m2_total * 0.03;
  if (acabados['impresion_adhesivo']) costo_otros_acabados += m2_total * 0.05;
  if (acabados['reinsercion'] || job.reinsercion_digital) costo_otros_acabados += m2_total * 0.07;
  if (job.usa_primer_extra) costo_otros_acabados += m2_total * 0.015;
  if (job.pasos_estampador > 0) costo_otros_acabados += m2_total * job.pasos_estampador * 0.03;
  if (job.pasos_jtfix > 0) costo_otros_acabados += m2_total * job.pasos_jtfix * 0.02;

  const costo_acabados_usd = costo_laminado_usd + costo_otros_acabados;

  // ── PASO 8: TIEMPO DE IMPRESIÓN Y COSTO HP ────────────────────────────────
  const speedMap = speedTable?.[machine.id] ?? VELOCIDADES_DIGITAL[machine.id] ?? maqData.velocidades_m_min;
  const vel_key = Math.min(Math.max(tintas_ef, 1), 10);
  const velocidad_efectiva = speedMap[vel_key] ?? speedMap[7] ?? 20;

  if (rules.velocidad_resultante && velocidad_efectiva === 0) {
    razones_falla.push('Velocidad efectiva es 0');
  }

  // CRÍTICO: factor de eficiencia doble aplicado al tiempo
  // VERIFICADO: 25755/31 * (1+0.15)^2 = 1098.75 min ✓
  const M4_tiempo_min = velocidad_efectiva > 0
    ? (metros_imp / velocidad_efectiva) * Math.pow(1 + (1 - efic), 2)
    : 0;

  // cobro_minimo = maqData.cobro_minimo_min (10 min para digitales)
  const cobro_minimo_min = maqData.cobro_minimo_min;
  const cobro_minimo_activo = M4_tiempo_min > 0 && M4_tiempo_min < cobro_minimo_min;
  const tiempo_cobrar_min = Math.max(M4_tiempo_min, cobro_minimo_min);
  // horas_impresion_reales = M4_tiempo_min / 60 (horas REALES, no cobro mínimo)
  const horas_impresion_reales = M4_tiempo_min / 60;

  // VERIFICADO: MAX(1098.75, 10)/60 * 74.167 = $1,358.18 ✓
  const costo_hr_hp = COSTO_HR_IMPRESION[machine.id] ?? maqData.costo_hr_impresion;
  const costo_hp_usd = job.num_tintas === 0 ? 0 : (tiempo_cobrar_min / 60) * costo_hr_hp;
  const costo_overhead_usd = costo_hp_usd;

  const tiempo_hrs = tiempo_cobrar_min / 60;
  const tiempo_hrs_real = horas_impresion_reales;

  // ── PASO 9: OMEGA (post-proceso) ──────────────────────────────────────────
  // VERIFICADO: (30 + 25755/25/0.85) * 1 = 1242.01 min → MAX(1242,60)/60*14.236 = $294.69 ✓
  let metros_omega = 0;
  let costo_omega_usd = 0;
  if (job.pasos_omega > 0) {
    const tiempo_omega_min = (GLOBAL.omega.setup_min + (metros_imp / GLOBAL.omega.vel_m_min / efic)) * job.pasos_omega;
    costo_omega_usd = Math.max(tiempo_omega_min, GLOBAL.omega.cobro_min_min) / 60 * GLOBAL.omega.costo_hr;
    metros_omega = metros_imp;
  }

  // ── PASO 10: CEI (rebobinadora) ────────────────────────────────────────────
  // CRÍTICO: usa metros_total (metros_imp + 20) dividido entre 100 m/min
  // VERIFICADO: (25755+20)/100 = 257.75 min → MAX(257.75,60)/60*6.25 = $26.85 ✓
  const tiempo_cei_min = metros_total_base / GLOBAL.CEI.vel_m_min;
  const costo_cei_usd = Math.max(tiempo_cei_min, GLOBAL.CEI.cobro_min_min) / 60 * GLOBAL.CEI.costo_hr;

  const costo_mo_usd = costo_cei_usd;

  // ── PASO 11: OVERHEAD ──────────────────────────────────────────────────────
  // CRÍTICO: aplicado sobre M2_NETOS (no m2_total ni metros_lineales)
  // VERIFICADO POR METRO: 6000 * 0.119 = $714 MO ✓, 6000*0.319=$1915 gtos ✓, 6000*0.091=$546 dir ✓
  let costo_gtos_grales_usd = 0;
  let costo_gtos_direccion_usd = 0;

  const modo = job.modo_costo === 'hora' ? 'POR_HORA' : 'POR_METRO';

  if (overrideUsdHr !== undefined) {
    // Override total: apply override rate over real hours for POR_HORA, m2_netos for POR_METRO
    if (modo === 'POR_METRO') {
      const oh = GLOBAL.overhead_digital_por_m2;
      costo_gtos_grales_usd = m2_netos * (oh.gastos_grales + oh.depreciaciones + oh.gastos_sistemas);
      costo_gtos_direccion_usd = m2_netos * oh.gtos_direccion;
    } else {
      costo_gtos_grales_usd = 0;
      costo_gtos_direccion_usd = 0;
    }
  } else if (modo === 'POR_METRO') {
    const oh = GLOBAL.overhead_digital_por_m2;
    // GTOS GRALES+SISTEMAS (row L62) = m2_netos * (gastos_grales + depreciaciones + gastos_sistemas) = 6000 * 0.319 = $1915.20 ✓
    costo_gtos_grales_usd = m2_netos * (oh.gastos_grales + oh.depreciaciones + oh.gastos_sistemas);  // 0.319
    // GTOS DIRECCIÓN (row L63) = m2_netos * gtos_direccion = 6000 * 0.091 = $546 ✓
    costo_gtos_direccion_usd = m2_netos * oh.gtos_direccion;  // 0.091
  } else {
    // POR_HORA: tasas calculadas dinámicamente según n_maquinas_digitales
    // fee_hr = gasto_mensual_usd × pct_digital ÷ horas_mes ÷ n_maquinas
    // Con n=14 (default): fee_hr_gastos = 176490×0.70÷204÷14 = 43.257 ✓
    const n_maq_dig = params.n_maquinas_digitales ?? 14;
    const horas_mes = (params.dias_mes ?? 20) * (params.horas_dia ?? 12) * (params.eficiencia ?? 0.85);
    const GASTOS_DIGITALES = {
      gastos_grales:   { mensual: 176490, pct: 0.70 },
      depreciaciones:  { mensual:  20034, pct: 0.70 },
      mano_obra:       { mensual:  81090, pct: 0.70 },
      gtos_direccion:  { mensual:  62010, pct: 0.70 },
      gastos_sistemas: { mensual:  20988, pct: 0.70 },
    };
    const fee_hr_gastos = GASTOS_DIGITALES.gastos_grales.mensual   * GASTOS_DIGITALES.gastos_grales.pct   / horas_mes / n_maq_dig;
    const fee_hr_depre  = GASTOS_DIGITALES.depreciaciones.mensual  * GASTOS_DIGITALES.depreciaciones.pct  / horas_mes / n_maq_dig;
    const fee_hr_sis    = GASTOS_DIGITALES.gastos_sistemas.mensual * GASTOS_DIGITALES.gastos_sistemas.pct / horas_mes / n_maq_dig;
    // L63: GTOS_DIR = horas_reales * K33 (usa K33=0.091, NO N33=15.199) — fórmula exacta del Excel
    costo_gtos_grales_usd = horas_impresion_reales * (fee_hr_gastos + fee_hr_depre + fee_hr_sis);
    costo_gtos_direccion_usd = horas_impresion_reales * GLOBAL.overhead_digital_por_m2.gtos_direccion;  // K33 = 0.091
  }

  // ── PASO 12: ENVÍOS ────────────────────────────────────────────────────────
  let costo_envios_usd = 0;
  if (job.flete_externo) {
    costo_envios_usd = job.flete_monto_mxn / TC;
  } else {
    // FIX 2: Flete digital — cálculo físico basado en bobinas y cajas
    const gap_des_mm = (params.gap_desarrollo_std ?? 3);
    costo_envios_usd = calcFleteDigital(
      job.cantidad_millares,
      job.desarrollo_mm,
      gap_des_mm,
      job.eje_mm,
      TC
    );
  }

  // ── PASO 13: TOTAL ─────────────────────────────────────────────────────────
  // MO overhead (m2_netos * 0.119) se suma como parte del total
  // En modo POR_METRO: MO overhead = m2_netos * 0.119 (separado de CEI)
  // Para el total final, sumamos: sustrato + clicks + acabados + HP + CEI + omega + MO_overhead + gtos_gral + gtos_dir + envios
  let costo_mo_overhead_usd = 0;
  if (overrideUsdHr !== undefined) {
    // Override mode: apply override rate over real hours
    costo_mo_overhead_usd = horas_impresion_reales * overrideUsdHr;
  } else if (modo === 'POR_METRO') {
    costo_mo_overhead_usd = m2_netos * GLOBAL.overhead_digital_por_m2.mano_obra;  // 0.119
  } else {
    // POR_HORA: MO overhead calculado dinámicamente según n_maquinas_digitales
    // If overheadUsdHr provided from parameters table, use it as total overhead (replaces built-in)
    if (overheadUsdHr > 0) {
      // overheadUsdHr is the total fee/hr from parameters table (all concepts combined)
      // Apply it over real hours — this replaces the individual concept calculations
      costo_mo_overhead_usd = horas_impresion_reales * overheadUsdHr;
      // Zero out the separately computed gtos_grales and gtos_direccion to avoid double-counting
      costo_gtos_grales_usd = 0;
      costo_gtos_direccion_usd = 0;
    } else {
      const n_maq_dig = params.n_maquinas_digitales ?? 14;
      const horas_mes = (params.dias_mes ?? 20) * (params.horas_dia ?? 12) * (params.eficiencia ?? 0.85);
      const fee_hr_mo = 81090 * 0.70 / horas_mes / n_maq_dig;
      costo_mo_overhead_usd = horas_impresion_reales * fee_hr_mo;
    }
  }

  const costo_fabrica_usd = costo_sustrato_usd
    + costo_tinta_usd
    + costo_acabados_usd
    + costo_hp_usd
    + costo_mo_usd          // CEI rebobinadora
    + costo_mo_overhead_usd // MO overhead (m2_netos * 0.119)
    + costo_omega_usd
    + costo_gtos_grales_usd
    + costo_gtos_direccion_usd
    + costo_envios_usd;

  const costo_total_usd = job.margen_pct > 0
    ? costo_fabrica_usd / (1 - job.margen_pct / 100)
    : costo_fabrica_usd;

  const costo_millar_usd = job.cantidad_millares > 0 ? costo_total_usd / job.cantidad_millares : 0;
  const precio_millar_usd = costo_millar_usd;
  const costo_millar_mxn = costo_millar_usd * TC;

  // Debug logs
  if (
    (machine.id === '6MIL' || machine.id === 'V12') &&
    (job.cantidad_millares === 1 || job.cantidad_millares === 100 || job.cantidad_millares === 500)
  ) {
    console.log(`[DEBUG DIGITAL ${machine.id}] escala=${job.cantidad_millares}k`, {
      cav_eje, cav_des, cavidades_usadas,
      frames_tiro, frames_total,
      metros_imp: metros_imp.toFixed(3),
      metros_total_base: metros_total_base.toFixed(3),
      m2_total: m2_total.toFixed(4),
      m2_netos: m2_netos.toFixed(4),
      tintas_ef, clicks_totales,
      costo_tinta_usd: costo_tinta_usd.toFixed(4),
      costo_sustrato_usd: costo_sustrato_usd.toFixed(4),
      costo_laminado_usd: costo_laminado_usd.toFixed(4),
      velocidad_efectiva,
      M4_tiempo_min: M4_tiempo_min.toFixed(2),
      tiempo_cobrar_min: tiempo_cobrar_min.toFixed(2),
      horas_impresion_reales: horas_impresion_reales.toFixed(4),
      costo_hp_usd: costo_hp_usd.toFixed(4),
      costo_omega_usd: costo_omega_usd.toFixed(4),
      costo_cei_usd: costo_cei_usd.toFixed(4),
      costo_mo_overhead_usd: costo_mo_overhead_usd.toFixed(4),
      costo_gtos_grales_usd: costo_gtos_grales_usd.toFixed(4),
      costo_gtos_direccion_usd: costo_gtos_direccion_usd.toFixed(4),
      costo_envios_usd: costo_envios_usd.toFixed(4),
      costo_total_usd: costo_total_usd.toFixed(4),
      costo_millar_usd: costo_millar_usd.toFixed(4),
    });
  }

  return {
    machine_id: machine.id,
    machine_name: machine.name,
    type: 'digital',
    elegible: razones_falla.length === 0,
    razones_falla,
    reglas_simulacion,
    velocidad_efectiva,
    cavidades_usadas: Math.max(cav_eje, 1),
    planilla_usada,
    metros_lineales: metros_total_base,
    tiempo_hrs,
    tiempo_hrs_real,
    clicks_totales,
    tintas_totales,
    costo_click_usd,
    costo_tinta_usd,
    costo_material_usd: costo_sustrato_usd,
    costo_acabados_usd,
    costo_fabrica_usd,
    costo_total_usd,
    costo_millar_usd,
    precio_millar_usd,
    costo_millar_mxn,
    simulacion_activa: reglas_simulacion.length > 0,
    cobro_minimo_activo,
    overhead_usd_hr: overrideUsdHr !== undefined ? overrideUsdHr : costo_hr_hp,
    frames_necesarios: frames_total,
    m2_totales: m2_total,
    costo_hp_usd,
    costo_overhead_usd,
    frames_setup,
    frames_tiro,
    metros_omega,
    metros_total_con_omega: metros_total_base,
    costo_sustrato_usd,
    costo_laminado_usd,
    costo_cei_usd,
    costo_omega_usd,
    costo_gtos_grales_usd,
    costo_gtos_direccion_usd,
    costo_envios_usd,
  };
}

// Legacy export aliases
export const VALOR_CLICK_EXCEL = VALOR_CLICK;
export const COSTO_HR_IMPRESION_EXCEL = COSTO_HR_IMPRESION;
export const OVERHEAD_DIGITAL_HR = OVERHEAD_DIGITAL.total_fee_hr;
export const COSTO_HR_CEI_LEGACY = COSTO_HR_CEI;
export const OVERHEAD_GTOS_GRALES_M = OVERHEAD_GTOS_GRALES_M2;
export const OVERHEAD_GTOS_DIRECCION_M = OVERHEAD_GTOS_DIRECCION_M2;
export const ANCHO_OMEGA_MM_LEGACY = ANCHO_OMEGA_MM;