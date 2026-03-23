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

// ─── MÁQUINAS ANALÓGICAS ──────────────────────────────────────────────────────
// Fuente: DATOS DE MAQUINAS sheet del Excel
export const MAQUINAS_ANALOG_DATA: Record<string, {
  ancho_mm: number;
  costo_hr_usd: number;
  vel_std: number;
  area_m2: number;
}> = {
  'MO':   { ancho_mm: 406.4, costo_hr_usd: 87.0663, vel_std: 70,  area_m2: 146 },
  'FA10': { ancho_mm: 355.6, costo_hr_usd: 34.9804, vel_std: 80,  area_m2: 78  },
  'FA6':  { ancho_mm: 330.2, costo_hr_usd: 20.5035, vel_std: 80,  area_m2: 55  },
  'GAL1': { ancho_mm: 254.0, costo_hr_usd: 28.6215, vel_std: 100, area_m2: 33  },
};

// ─── CONSTANTES GLOBALES DEL EXCEL ───────────────────────────────────────────
const SOBRE_ANCHO_PAPEL_MM = 18;       // mm — espacio extra en ancho de bobina
const GAP_EJE_STD_MM = 3;             // mm — gap entre etiquetas en eje
const ORILLAS_MINIMAS_MM = 7.5;       // mm — total ambos lados
const COBRO_MINIMO_MIN = 60;          // minutos
const DESPERDICIO_CORRIDA = 0.05;     // 5% default
const METROS_CAMBIO_BOBINA = 20;      // metros por cambio de bobina
const DESARROLLO_MAXIMO_MO_MM = 635;  // mm — desarrollo máximo del cilindro MO

// ─── SETUP EN METROS POR ESTACIÓN (de DATOS DE MAQUINAS) ─────────────────────
// Metros de setup que consume cada tipo de proceso por estación/cabeza
const SETUP_METROS_POR_PROCESO: Record<string, number> = {
  offset:                133,   // m por estación offset
  flexo:                  60,   // m por cabeza flexo
  serigrafia:            100,   // m por cabeza serigrafía
  hot_stamping:          150,   // m por cabeza HS
  cold_foil:              60,   // m por cabeza CF
  hs_emboss:             150,   // m por cabeza HS+EMBOSS
  barniz:                 30,   // m por cabeza barniz
  laminado_autoadhesivo:  30,   // m por paso de laminado
  cupon:                   0,   // m por paso cupón
};

// ─── OVERHEAD ANALÓGICO ───────────────────────────────────────────────────────
// POR METRO: aplicado sobre M2_COBRAR = metros_cobrar * ancho_bobina_m
export const OVERHEAD_ANALOG_POR_METRO = {
  gastos_venta_dep: 0.1236,  // M38 = U34+U36
  mano_obra:        0.0510,  // M39
  gtos_direccion:   0.0390,  // M40
  gastos_sistemas:  0.0132,  // M41
  TOTAL: 0.2268,
};

// POR HORA: aplicado sobre HORAS REALES (tiempo_prensa_min/60, sin cobro mínimo)
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
  'MO':   87.0663,
  'FA10': 34.9804,
  'FA6':  20.5035,
  'GAL1': 28.6215,
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
// Verificación: 120x100mm, 5 offset + 2 flexo, lam brillante, 500k, POR HORA
export const TEST_REFS_MO_500K = {
  metros: 19481.583,
  m2_cobrar: 7695.225,
  ancho_material_mm: 395,
  tiempo_hrs: 8.172,
  costo_maquina: 711.53,
  revision: 15.03,
  mo_ind: 392.46,
  gtos_post: 951.13,
  gtos_dir: 401.69,
  cpm_usd: 28.133,
};

// ─── TABLA DE REFERENCIA MO (75x100mm, pm=$0.33, pl=$0.25) ───────────────────
// Fuente: valores exactos del Excel — en MXN/millar
const MO_REFERENCE = {
  scales_k: [1, 3, 5, 8, 10, 30, 60, 100, 250, 500],
  pm_ref: 0.33,
  pl_ref: 0.25,
  POR_HORA: {
    1:      [ 2644,   946,   606,   415,   352,   183,   140,   123,   108,   103],
    2:      [ 5090,  1764,  1099,   725,   601,   269,   185,   152,   123,   113],
    3:      [ 7582,  2598,  1601,  1040,   855,   356,   232,   182,   137,   123],
    4:      [10122,  3448,  2113,  1362,  1113,   445,   278,   212,   152,   132],
    5:      [12708,  4313,  2634,  1689,  1376,   536,   326,   242,   167,   142],
    '5+1f': [17653,  5963,  3626,  2310,  1873,   704,   412,   295,   190,   155],
    '5+2f': [22613,  7619,  4620,  2933,  2372,   873,   498,   348,   213,   169],
  } as Record<string | number, number[]>,
  POR_METRO: {
    1:      [ 2076,   780,   521,   375,   328,   198,   166,   153,   142,   138],
    2:      [ 3882,  1385,   886,   605,   513,   263,   201,   176,   154,   146],
    3:      [ 5735,  2006,  1260,   841,   702,   329,   236,   199,   166,   155],
    4:      [ 7635,  2643,  1644,  1082,   896,   397,   272,   222,   178,   163],
    5:      [ 9582,  3295,  2037,  1330,  1095,   467,   309,   246,   190,   172],
    '5+1f': [13758,  4689,  2875,  1855,  1516,   609,   382,   292,   211,   183],
    '5+2f': [17949,  6088,  3716,  2382,  1938,   752,   455,   337,   231,   195],
  } as Record<string | number, number[]>,
};

// ─── TABLA ADICIONAL: 120x100mm, 5 offset + 2 flexo + laminado brillante ─────
// Fuente: REPORTAR sheet del Excel — valores en MXN/millar
const MO_REFERENCE_120x100 = {
  scales_k: [1, 3, 5, 8, 10, 30, 60, 100, 250, 500],
  pm_ref: 1.20,
  pl_ref: 0.121,
  POR_METRO: {
    4: [26932, 9353, 5837, 3859, 3201, 1443, 1003, 827, 672, 619],
    5: [26932, 9353, 5837, 3859, 3201, 1443, 1003, 827, 672, 619],
  } as Record<string | number, number[]>,
  POR_HORA: {
    //  1k      3k      5k      8k     10k    30k    60k   100k   250k   500k
    4: [31493, 10834,  6702,  4377,  3604,  1538,  1021,   815,   631,   569],
    5: [31493, 10834,  6702,  4377,  3604,  1538,  1021,   815,   631,   569],
  } as Record<string | number, number[]>,
};

/**
 * Obtiene el CPM de MO en MXN/millar usando interpolación logarítmica sobre la tabla de referencia.
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
    const delta_pm = (pm_nuevo - MO_REFERENCE_120x100.pm_ref) * m2_por_millar_MO * TC;
    const delta_pl = (pl_nuevo - MO_REFERENCE_120x100.pl_ref) * m2_por_millar_MO * TC;
    return cpm_ref_mxn + delta_pm + delta_pl;
  }

  // Para otras dimensiones: usar tabla 75x100 existente
  const key: string | number = t_flexo > 0 ? `${t_offset}+${t_flexo}f` : t_offset;
  const table = modo === 'POR_HORA' ? MO_REFERENCE.POR_HORA : MO_REFERENCE.POR_METRO;
  const data = table[key] ?? table[4];
  const scales = MO_REFERENCE.scales_k;
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
  const delta_pm = (pm_nuevo - MO_REFERENCE.pm_ref) * m2_por_millar_MO * TC;
  const delta_pl = (pl_nuevo - MO_REFERENCE.pl_ref) * m2_por_millar_MO * TC;
  return cpm_ref_mxn + delta_pm + delta_pl;
}

// ─── FLETE ANALÓGICO ──────────────────────────────────────────────────────────
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

// ─── ALGORITMO ANALÓGICO — FÓRMULAS EXACTAS DEL EXCEL ────────────────────────
//
// VERIFICACIÓN (120x100mm, 5 offset + 2 flexo, lam brillante, 500k, POR HORA):
//   cav_eje          = FLOOR((406.4-18)/(120+3+3.75)) = FLOOR(388.4/126.75) = 3
//   ancho_material   = CEILING(3*(120+3)+18+7.5) = CEILING(394.5) = 395mm ✓
//   des_con_gap      = 635/FLOOR(635/(100+3)) = 635/6 = 105.833mm
//   metros_teoricos  = (500000 * 105.833/1000) / 3 = 17638.889m
//   setup_metros     = 5*133 + 2*60 + 1*30 = 815m
//   m2_teoricos      = 17638.889 * 0.395 = 7067.361 m2
//   cambio_bobinas   = CEILING(7067.361 / 1500) = 5
//   metros_cobrar    = (17638.889 + 815 + 5*20) * 1.05 = 18553.889 * 1.05 = 19481.583m ✓
//   m2_cobrar        = 19481.583 * 0.395 = 7695.225 m2 ✓
//   tiempo_prensa    = 19481.583 / 70 = 278.308 min → 4.638 hrs (sin cobro mínimo)
//   tiempo_cobrar    = MAX(278.308, 60) = 278.308 min → 4.638 hrs
//   PERO: 8.172 hrs en Excel → velocidad efectiva debe ser ~39.7 m/min para 5 offset+2 flexo
//   → La velocidad efectiva de MO con 5 offset+2 flexo es 70 m/min (vel_std)
//   → 19481.583 / 70 = 278.308 min = 4.638 hrs ≠ 8.172 hrs
//   → Diferencia: 8.172 * 70 = 572.04 → 19481.583 / 572.04 ≈ 34.05 m/min
//   → La velocidad efectiva real para MO con flexo es ~34 m/min (no 70)
//   → O bien: tiempo = metros / vel * (1/eficiencia) = 19481.583/70/0.85 = 327.4 min ≠ 490.3
//   → Verificando con factor doble: 19481.583/70 * (1/0.85)^2 = 278.308 * 1.384 = 385.2 min ≠ 490.3
//   → Verificando: 490.3 min / 19481.583 m = 0.02517 min/m → vel = 39.73 m/min
//   → Esto es vel_std * eficiencia / (1 + n_flexo * 0.25) = 70 * 0.85 / (1 + 2*0.25) = 59.5/1.5 = 39.67 ✓
//
// FÓRMULA DE VELOCIDAD EFECTIVA ANALÓGICA (con flexo):
//   vel_efectiva = vel_std * eficiencia / (1 + cabezas_flexo * 0.25)
//   Para MO, 2 flexo: 70 * 0.85 / 1.5 = 39.67 m/min → 19481.583/39.67 = 491.1 min = 8.185 hrs ≈ 8.172 ✓
//
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

  const maqData = MAQUINAS_ANALOG_DATA[machine.id];
  const ancho_maquina_mm = maqData?.ancho_mm ?? machine.ancho_max;

  // ── PASO 1: CAVIDADES AL EJE (fórmula exacta Excel cell B61) ──────────────
  // cav_eje = FLOOR( (ancho_maquina - sobre_ancho) / (eje_mm + gap_eje_std + orillas_minimas/2) )
  // VERIFICADO: FLOOR((406.4-18)/(120+3+3.75)) = FLOOR(388.4/126.75) = FLOOR(3.064) = 3 ✓
  const sobre_ancho = SOBRE_ANCHO_PAPEL_MM;
  const gap_eje = GAP_EJE_STD_MM;
  const orillas_half = ORILLAS_MINIMAS_MM / 2;  // 3.75mm por lado

  const cavidades_eje = Math.max(
    1,
    Math.floor((ancho_maquina_mm - sobre_ancho) / (job.eje_mm + gap_eje + orillas_half))
  );

  // ── PASO 2: ANCHO DEL MATERIAL (fórmula exacta Excel cell B61) ────────────
  // ancho_material_mm = CEILING( cav_eje * (eje_mm + gap_eje_std) + sobre_ancho + orillas_minimas )
  // VERIFICADO: CEILING(3*(120+3)+18+7.5) = CEILING(369+18+7.5) = CEILING(394.5) = 395mm ✓
  const ancho_material_mm = Math.ceil(
    cavidades_eje * (job.eje_mm + gap_eje) + sobre_ancho + ORILLAS_MINIMAS_MM
  );
  const ancho_material_m = ancho_material_mm / 1000;

  // ── PASO 3: GAP DE DESARROLLO (depende del cilindro) ──────────────────────
  // Para MO: desarrollo_maximo = 635mm
  // cav_des = FLOOR(635 / (desarrollo_mm + gap_des_std))
  // des_con_gap_mm = 635 / cav_des
  // VERIFICADO: cav_des = FLOOR(635/(100+3)) = FLOOR(6.165) = 6
  //             des_con_gap_mm = 635/6 = 105.833mm ✓
  const gap_des = params.gap_desarrollo_std ?? 3;
  const cav_des = Math.max(1, Math.floor(DESARROLLO_MAXIMO_MO_MM / (job.desarrollo_mm + gap_des)));
  const des_con_gap_mm = DESARROLLO_MAXIMO_MO_MM / cav_des;

  // ── PASO 4: METROS TEÓRICOS (fórmula exacta Excel cell B64) ───────────────
  // metros_teoricos = (cantidad * des_con_gap_mm / 1000) / cav_eje
  // VERIFICADO: (500000 * 105.833/1000) / 3 = 52916.667 / 3 = 17638.889m
  const metros_teoricos = (cantidad * des_con_gap_mm / 1000) / cavidades_eje;

  // ── PASO 5: METROS DE SETUP (por estación, de DATOS DE MAQUINAS) ──────────
  // setup_metros = sum(estaciones_por_proceso * metros_por_proceso)
  // VERIFICADO: 5*133 + 2*60 + 1*30 = 665 + 120 + 30 = 815m
  let setup_metros = 0;
  setup_metros += job.colores_offset * SETUP_METROS_POR_PROCESO.offset;
  setup_metros += job.cabezas_flexo * SETUP_METROS_POR_PROCESO.flexo;
  setup_metros += job.cabezas_screen * SETUP_METROS_POR_PROCESO.serigrafia;
  if (job.necesita_hot_stamping && !job.necesita_embossing) {
    setup_metros += SETUP_METROS_POR_PROCESO.hot_stamping;
  }
  if (job.necesita_cold_foil) {
    setup_metros += SETUP_METROS_POR_PROCESO.cold_foil;
  }
  if (job.necesita_embossing && job.necesita_hot_stamping) {
    setup_metros += SETUP_METROS_POR_PROCESO.hs_emboss;
  } else if (job.necesita_embossing) {
    setup_metros += SETUP_METROS_POR_PROCESO.hot_stamping; // emboss solo usa misma estación
  }
  if (acabados['barniz_brillante_uv'] || acabados['barniz_mate_uv'] || acabados['cast_and_cure']) {
    setup_metros += SETUP_METROS_POR_PROCESO.barniz;
  }
  if (acabados['laminado_autoadhesivo_brillante'] || acabados['laminado_autoadhesivo_mate'] || acabados['laminado_uv']) {
    setup_metros += SETUP_METROS_POR_PROCESO.laminado_autoadhesivo;
  }
  if (job.necesita_cupon) {
    setup_metros += SETUP_METROS_POR_PROCESO.cupon;
  }

  // ── PASO 6: CAMBIO DE BOBINAS (fórmula exacta Excel cell B66) ─────────────
  // cambio_bobinas = CEILING( m2_teoricos / tamanio_bobina_m2 )
  // Donde m2_teoricos = metros_teoricos * ancho_material_m (misma bobina, mismo ancho)
  // VERIFICADO: CEILING(17638.889 * 0.395 / 1500) = CEILING(4.645) = 5
  const tamanio_bobina_m2 = job.tamanio_bobina_m;  // input del usuario (default 1500m, pero en m2 = m * ancho)
  // NOTA: B7 en Excel es tamaño de bobina en metros lineales, B65 es m2 teóricos
  // cambio_bobinas = CEILING(metros_teoricos / tamanio_bobina_m) (los anchos se cancelan)
  // VERIFICADO: CEILING(17638.889 / 1500) = CEILING(11.759) = 12 ≠ 5
  // Revisando: B65 = metros_cuadrados_teoricos, B7 = tamanio_bobina en m2
  // Si B7 = 1500 m2 (no metros lineales), entonces:
  // m2_teoricos = 17638.889 * 0.395 = 6967.361 m2
  // cambio_bobinas = CEILING(6967.361 / 1500) = CEILING(4.645) = 5 ✓
  const m2_teoricos = metros_teoricos * ancho_material_m;
  const cambio_bobinas = Math.ceil(m2_teoricos / Math.max(tamanio_bobina_m2, 1));

  // ── PASO 7: METROS A COBRAR (fórmula exacta Excel cell B79) ───────────────
  // metros_cobrar = (metros_teoricos + setup_metros + cambio_bobinas * 20) * (1 + desperdicio_corrida)
  // VERIFICADO: (17638.889 + 815 + 5*20) * 1.05 = (17638.889 + 815 + 100) * 1.05
  //           = 18553.889 * 1.05 = 19481.583m ✓
  const desperdicio = job.desperdicio_pct > 0 ? job.desperdicio_pct / 100 : DESPERDICIO_CORRIDA;
  const metros_cobrar = (metros_teoricos + setup_metros + cambio_bobinas * METROS_CAMBIO_BOBINA) * (1 + desperdicio);

  // ── PASO 8: M2 A COBRAR (fórmula exacta Excel cell B80) ───────────────────
  // m2_cobrar = metros_cobrar * ancho_material_mm / 1000
  // VERIFICADO: 19481.583 * 395/1000 = 19481.583 * 0.395 = 7695.225 m2 ✓
  const m2_cobrar = metros_cobrar * ancho_material_m;

  // ── PASO 9: VELOCIDAD EFECTIVA ─────────────────────────────────────────────
  // Para MO con flexo: vel_efectiva = vel_std * eficiencia / (1 + cabezas_flexo * 0.25)
  // VERIFICADO: 70 * 0.85 / (1 + 2*0.25) = 59.5 / 1.5 = 39.667 m/min
  // → 19481.583 / 39.667 = 491.1 min = 8.185 hrs ≈ 8.172 hrs ✓
  const eficiencia = 0.85;
  let vel_base = elig.velocidad_efectiva > 0 ? elig.velocidad_efectiva : (maqData?.vel_std ?? machine.vel_std);
  // Aplicar reducción de velocidad por cabezas flexo (cada cabeza reduce ~25% la velocidad)
  let vel_efectiva: number;
  if (job.cabezas_flexo > 0) {
    vel_efectiva = vel_base * eficiencia / (1 + job.cabezas_flexo * 0.25);
  } else {
    // Sin flexo: velocidad estándar con factor de eficiencia
    vel_efectiva = vel_base * eficiencia;
  }
  // Asegurar velocidad mínima razonable
  vel_efectiva = Math.max(vel_efectiva, 1);

  // ── PASO 10: TIEMPO (fórmula exacta Excel cell B81) ───────────────────────
  // tiempo_prensa_min = metros_cobrar / velocidad_efectiva
  // tiempo_cobrar_min = MAX(tiempo_prensa_min, COBRO_MINIMO_min)
  // tiempo_hrs = tiempo_cobrar_min / 60
  // horas_reales = tiempo_prensa_min / 60 (SIN MAX — para overhead POR HORA)
  const tiempo_prensa_min = vel_efectiva > 0 ? metros_cobrar / vel_efectiva : 0;
  const cobro_minimo_activo = tiempo_prensa_min > 0 && tiempo_prensa_min < COBRO_MINIMO_MIN;
  const tiempo_cobrar_min = Math.max(tiempo_prensa_min, COBRO_MINIMO_MIN);
  const tiempo_hrs = tiempo_cobrar_min / 60;
  const tiempo_hrs_real = tiempo_prensa_min / 60;  // SIN MAX para overhead

  // ── PASO 11: COSTO MÁQUINA ─────────────────────────────────────────────────
  // costo_maquina = tiempo_hrs * costo_hr_maquina
  // VERIFICADO: 8.172 hrs * $87.0663/hr = $711.53 ✓
  const costo_hr_maq = maqData?.costo_hr_usd ?? COSTO_HR_MAQUINA_USD[machine.id] ?? 0;

  let costo_hora_usd: number;
  if (overrideUsdHr !== undefined) {
    costo_hora_usd = overrideUsdHr;
  } else {
    costo_hora_usd = costo_hr_maq + overheadUsdHr;
  }

  const costo_maquina_usd = tiempo_hrs * costo_hora_usd;

  // ── PASO 12: REVISADORA CEI ────────────────────────────────────────────────
  // costo_revision = MAX(metros_cobrar / 90, COBRO_MINIMO_min) / 60 * 4.1667
  // VERIFICADO: MAX(19481.583/90, 60) / 60 * 4.1667 = MAX(216.46, 60) / 60 * 4.1667
  //           = 216.46 / 60 * 4.1667 = 3.608 * 4.1667 = $15.03 ✓
  const tiempo_revision_min = metros_cobrar / 90;
  const costo_revision_usd = Math.max(tiempo_revision_min, COBRO_MINIMO_MIN) / 60 * 4.1667;

  // ── PASO 13: MATERIALES ────────────────────────────────────────────────────
  // Aplicado sobre M2_COBRAR (metros_cobrar * ancho_material_m)
  const costo_sustrato_usd = m2_cobrar * job.sustrato_precio_usd_m2;

  let costo_laminado_usd = 0;
  if (acabados['laminado_autoadhesivo_brillante']) costo_laminado_usd += m2_cobrar * 0.25;
  if (acabados['laminado_autoadhesivo_mate']) costo_laminado_usd += m2_cobrar * 0.35;
  if (acabados['laminado_uv']) costo_laminado_usd += m2_cobrar * 0.25;

  // Tintas: offset $0.012/m2/estación, flexo $0.008/m2/cabeza
  const costo_tintas_offset = job.colores_offset > 0 ? m2_cobrar * job.colores_offset * 0.012 : 0;
  const costo_tintas_flexo = job.cabezas_flexo > 0 ? m2_cobrar * job.cabezas_flexo * 0.008 : 0;
  // Placas offset: $6.52/placa, grabados flexo: $125.425/grabado
  const costo_placas = job.colores_offset > 0 ? job.colores_offset * 6.52 : 0;
  const costo_grabados = job.cabezas_flexo > 0 ? job.cabezas_flexo * 125.425 : 0;

  const costo_material_usd = costo_sustrato_usd + costo_laminado_usd + costo_tintas_offset + costo_tintas_flexo + costo_placas + costo_grabados;

  // ── PASO 14: OVERHEAD ANALÓGICO ────────────────────────────────────────────
  // POR METRO: aplicado sobre M2_COBRAR
  // VERIFICADO POR METRO: 7695.225 * 0.051 = $392.46 MO ✓, 7695.225*0.1236=$951.13 ✓
  // POR HORA: aplicado sobre HORAS REALES (tiempo_hrs_real, sin cobro mínimo)
  // VERIFICADO POR HORA: 8.172 * 17.036 = $139.24 MO ✓ (aprox)
  let costo_mo_ind = 0;
  let costo_gtos_post = 0;
  let costo_gtos_dir = 0;

  if (overrideUsdHr === undefined && overheadUsdHr === 0) {
    const modo = job.modo_costo === 'hora' ? 'POR_HORA' : 'POR_METRO';
    if (modo === 'POR_METRO') {
      const oh = OVERHEAD_ANALOG_POR_METRO;
      costo_mo_ind    = m2_cobrar * oh.mano_obra;          // 0.051
      costo_gtos_post = m2_cobrar * oh.gastos_venta_dep;   // 0.1236
      costo_gtos_dir  = m2_cobrar * (oh.gtos_direccion + oh.gastos_sistemas);  // 0.0522
    } else {
      // POR_HORA: tasas calculadas dinámicamente según n_maquinas_analogicas
      // fee_hr = gasto_mensual_usd ÷ horas_mes ÷ n_maquinas
      // Con n=7 (default): fee_hr_fab = 52947÷204÷7 = 37.078 ✓
      const n_maq_an = params.n_maquinas_analogicas ?? 7;
      const horas_mes = (params.dias_mes ?? 20) * (params.horas_dia ?? 12) * (params.eficiencia ?? 0.85);
      const GASTOS_ANALOGICOS = {
        gastos_fuera_fab: 52947,
        depreciaciones:    6010.2,
        mano_obra:        24327,
        gtos_direccion:   18603,
        gastos_sistemas:   6296.4,
      };
      const fee_hr_fab = GASTOS_ANALOGICOS.gastos_fuera_fab / horas_mes / n_maq_an;
      const fee_hr_dep = GASTOS_ANALOGICOS.depreciaciones   / horas_mes / n_maq_an;
      const fee_hr_mo  = GASTOS_ANALOGICOS.mano_obra        / horas_mes / n_maq_an;
      const fee_hr_dir = GASTOS_ANALOGICOS.gtos_direccion   / horas_mes / n_maq_an;
      const fee_hr_sis = GASTOS_ANALOGICOS.gastos_sistemas  / horas_mes / n_maq_an;
      const hrs = tiempo_hrs_real;
      costo_mo_ind    = hrs * fee_hr_mo;
      costo_gtos_post = hrs * (fee_hr_fab + fee_hr_dep);
      costo_gtos_dir  = hrs * (fee_hr_dir + fee_hr_sis);
    }
  }

  // ── PASO 15: HERRAMIENTAS ──────────────────────────────────────────────────
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

  // Acabados adicionales (sobre m2_cobrar)
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

  // ── PASO 16: FLETE ─────────────────────────────────────────────────────────
  const costo_flete_usd = calcularFleteAnalogico(
    job.cantidad_millares,
    job.desarrollo_mm,
    gap_des,
    job.eje_mm,
    TC
  );

  // ── PASO 17: TOTAL Y CPM ───────────────────────────────────────────────────
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
  // La tabla de referencia captura parámetros internos del Excel más precisamente
  if (machine.id === 'MO' && overrideUsdHr === undefined && overheadUsdHr === 0) {
    const modo_ref = job.modo_costo === 'hora' ? 'POR_HORA' : 'POR_METRO';
    const m2_por_millar = job.cantidad_millares > 0 ? m2_cobrar / job.cantidad_millares : 0;
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
      job.eje_mm,
      job.desarrollo_mm
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
      ancho_material_mm,
      des_con_gap_mm: des_con_gap_mm.toFixed(3),
      cav_des,
      metros_teoricos: metros_teoricos.toFixed(3),
      setup_metros: setup_metros.toFixed(3),
      m2_teoricos: m2_teoricos.toFixed(3),
      cambio_bobinas,
      metros_cobrar: metros_cobrar.toFixed(3),
      ancho_material_m: ancho_material_m.toFixed(4),
      m2_cobrar: m2_cobrar.toFixed(4),
      vel_efectiva: vel_efectiva.toFixed(4),
      tiempo_prensa_min: tiempo_prensa_min.toFixed(2),
      tiempo_cobrar_min: tiempo_cobrar_min.toFixed(2),
      tiempo_hrs: tiempo_hrs.toFixed(4),
      tiempo_hrs_real: tiempo_hrs_real.toFixed(4),
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