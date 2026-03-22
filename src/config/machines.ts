export interface AnalogMachine {
  id: string;
  name: string;
  type: 'analog';
  ancho_max: number; // mm
  area_m2: number;
  depreciacion_mxn: number;
  cabezas_offset: number;
  cabezas_flexo: number;
  cabezas_screen: number;
  cold_foil: number;
  hot_stamping: number;
  emboss: number;
  puede_cupon: boolean;
  vel_std: number; // m/min
  vel_screen: number;
  vel_cupon: number;
  vel_hs_base: number;
  cabezas_combinadas_max: number;
}

export interface DigitalMachine {
  id: string;
  name: string;
  type: 'digital';
  planilla_13: number; // mm
  planilla_30: number; // mm
  vel_por_tintas: Record<number, number>; // tintas -> m/min
  modo: 'click' | 'ink_jet';
  costo_click?: number; // USD per click
  costo_tinta_m2?: number; // USD per m²
  depreciacion_mxn: number; // for overhead calculation
}

export const ANALOG_MACHINES: AnalogMachine[] = [
  {
    id: 'MO',
    name: 'MO',
    type: 'analog',
    ancho_max: 406,
    area_m2: 146,
    depreciacion_mxn: 2400000,
    cabezas_offset: 5,
    cabezas_flexo: 4,
    cabezas_screen: 2,
    cold_foil: 1,
    hot_stamping: 1,
    emboss: 0,
    puede_cupon: false,
    vel_std: 70,
    vel_screen: 40,
    vel_cupon: 0,
    vel_hs_base: 35,
    cabezas_combinadas_max: 8,
  },
  {
    id: 'FA10',
    name: 'FA10',
    type: 'analog',
    ancho_max: 355,
    area_m2: 78,
    depreciacion_mxn: 950000,
    cabezas_offset: 0,
    cabezas_flexo: 10,
    cabezas_screen: 0,
    cold_foil: 1,
    hot_stamping: 0,
    emboss: 0,
    puede_cupon: true,
    vel_std: 80,
    vel_screen: 0,
    vel_cupon: 45,
    vel_hs_base: 0,
    cabezas_combinadas_max: 11,
  },
  {
    id: 'FA6',
    name: 'FA6',
    type: 'analog',
    ancho_max: 330,
    area_m2: 55,
    depreciacion_mxn: 550000,
    cabezas_offset: 0,
    cabezas_flexo: 6,
    cabezas_screen: 0,
    cold_foil: 1,
    hot_stamping: 0,
    emboss: 0,
    puede_cupon: false,
    vel_std: 80,
    vel_screen: 0,
    vel_cupon: 0,
    vel_hs_base: 0,
    cabezas_combinadas_max: 7,
  },
  {
    id: 'GAL1',
    name: 'GAL1',
    type: 'analog',
    ancho_max: 254,
    area_m2: 33,
    depreciacion_mxn: 800000,
    cabezas_offset: 0,
    cabezas_flexo: 4,
    cabezas_screen: 2,
    cold_foil: 1,
    hot_stamping: 2,
    emboss: 2,
    puede_cupon: false,
    vel_std: 100,
    vel_screen: 40,
    vel_cupon: 0,
    vel_hs_base: 35,
    cabezas_combinadas_max: 8,
  },
];

export const DIGITAL_MACHINES: DigitalMachine[] = [
  {
    id: 'V12',
    name: 'V12',
    type: 'digital',
    planilla_13: 320,
    planilla_30: 762,
    vel_por_tintas: { 1: 120, 2: 120, 3: 120, 4: 120, 5: 120, 6: 120, 7: 120 },
    modo: 'click',
    costo_click: 0.023,
    depreciacion_mxn: 2200000 * 22,
  },
  {
    id: '20MIL',
    name: '20 MIL',
    type: 'digital',
    planilla_13: 714,
    planilla_30: 714,
    vel_por_tintas: { 1: 42, 2: 42, 3: 42, 4: 31, 5: 25, 6: 20, 7: 18 },
    modo: 'click',
    costo_click: 0.025,
    depreciacion_mxn: 2000000 * 22,
  },
  {
    id: 'INK_JET',
    name: 'INK JET',
    type: 'digital',
    planilla_13: 317,
    planilla_30: 762,
    vel_por_tintas: { 1: 42, 2: 42, 3: 42, 4: 42, 5: 20, 6: 18, 7: 15 },
    modo: 'ink_jet',
    costo_tinta_m2: 0.08,
    depreciacion_mxn: 540000 * 22,
  },
  {
    id: '6MIL',
    name: '6 MIL',
    type: 'digital',
    planilla_13: 317,
    planilla_30: 762,
    vel_por_tintas: { 1: 42, 2: 42, 3: 42, 4: 31, 5: 25, 6: 20, 7: 18 },
    modo: 'click',
    costo_click: 0.022,
    depreciacion_mxn: 780000 * 22,
  },
];

export interface GlobalParams {
  tipo_cambio: number;
  dias_mes: number;
  horas_dia: number;
  eficiencia: number;
  gap_eje_std: number;
  gap_desarrollo_std: number;
  sobre_ancho_papel: number;
  orillas_minimas: number;
  merma_estaqueado: number;
  cobro_minimo: number;
  metros_cambio_bobina: number;
  meses_depreciacion: number;
}

export const DEFAULT_GLOBAL_PARAMS: GlobalParams = {
  tipo_cambio: 22,
  dias_mes: 20,
  horas_dia: 12,
  eficiencia: 0.85,
  gap_eje_std: 3,
  gap_desarrollo_std: 3,
  sobre_ancho_papel: 18,
  orillas_minimas: 7.5,
  merma_estaqueado: 0.05,
  cobro_minimo: 60,
  metros_cambio_bobina: 20,
  meses_depreciacion: 120,
};

// ─── EXTENDED MACHINE PARAMETERS (for Parameters Tab) ───────────────────────

export interface AnalogMachineParams {
  id: string;
  name: string;
  costo_usd: number;        // USD (costo con financiamiento)
  tipo_cambio_compra: number; // divisor (e.g. 22)
  meses_depreciacion: number;
  poliza_usd_mes: number;
  ancho_max_mm: number;
  area_m2: number;
  cabezas_offset: number;
  cabezas_flexo: number;
  cabezas_screen: number;
  cold_foil: boolean;
  hot_stamping: boolean;
  embossing: boolean;
  cupon: boolean;
  vel_std: number;
  vel_screen: number;
  vel_hs: number | 'calc'; // 'calc' means calculated
  vel_hs_screen: number | 'calc';
  vel_cupon: number;
}

export const DEFAULT_ANALOG_MACHINE_PARAMS: AnalogMachineParams[] = [
  {
    id: 'MO', name: 'MO',
    costo_usd: 2400000 / 22, meses_depreciacion: 120, poliza_usd_mes: 0,
    tipo_cambio_compra: 22,
    ancho_max_mm: 406, area_m2: 146,
    cabezas_offset: 5, cabezas_flexo: 4, cabezas_screen: 2,
    cold_foil: true, hot_stamping: true, embossing: false, cupon: false,
    vel_std: 70, vel_screen: 40, vel_hs: 'calc', vel_hs_screen: 'calc', vel_cupon: 0,
  },
  {
    id: 'FA10', name: 'FA10',
    costo_usd: 950000 / 22, meses_depreciacion: 120, poliza_usd_mes: 0,
    tipo_cambio_compra: 22,
    ancho_max_mm: 355, area_m2: 78,
    cabezas_offset: 0, cabezas_flexo: 10, cabezas_screen: 0,
    cold_foil: true, hot_stamping: false, embossing: false, cupon: true,
    vel_std: 80, vel_screen: 0, vel_hs: 0, vel_hs_screen: 0, vel_cupon: 45,
  },
  {
    id: 'FA6', name: 'FA6',
    costo_usd: 550000 / 22, meses_depreciacion: 120, poliza_usd_mes: 0,
    tipo_cambio_compra: 22,
    ancho_max_mm: 330, area_m2: 55,
    cabezas_offset: 0, cabezas_flexo: 6, cabezas_screen: 0,
    cold_foil: true, hot_stamping: false, embossing: false, cupon: false,
    vel_std: 80, vel_screen: 0, vel_hs: 0, vel_hs_screen: 0, vel_cupon: 0,
  },
  {
    id: 'GAL1', name: 'GAL1',
    costo_usd: 800000 / 22, meses_depreciacion: 120, poliza_usd_mes: 0,
    tipo_cambio_compra: 22,
    ancho_max_mm: 254, area_m2: 33,
    cabezas_offset: 0, cabezas_flexo: 4, cabezas_screen: 2,
    cold_foil: true, hot_stamping: true, embossing: true, cupon: false,
    vel_std: 100, vel_screen: 40, vel_hs: 'calc', vel_hs_screen: 'calc', vel_cupon: 0,
  },
];

export interface DigitalMachineParams {
  id: string;
  name: string;
  costo_usd: number;
  meses_depreciacion: number;
  division_costo: number;
  ancho_13_mm: number;
  ancho_30_mm: number;
  frame_largo_cm: number;
  setup_metros: number;
  tintas_max: number;
  tiene_plata: boolean;
  tiene_reinsercion: boolean;
  tiene_invisible: boolean;
  camas_blanco_max: number;
  doble_hit: boolean;
}

export const DEFAULT_DIGITAL_MACHINE_PARAMS: DigitalMachineParams[] = [
  {
    id: '6MIL', name: '6 MIL',
    costo_usd: 780000 / 22, meses_depreciacion: 120, division_costo: 6,
    ancho_13_mm: 317, ancho_30_mm: 317,
    frame_largo_cm: 97, setup_metros: 5,
    tintas_max: 14, tiene_plata: true, tiene_reinsercion: true, tiene_invisible: true,
    camas_blanco_max: 4, doble_hit: true,
  },
  {
    id: 'V12', name: 'V12',
    costo_usd: 2200000 / 22, meses_depreciacion: 120, division_costo: 6,
    ancho_13_mm: 320, ancho_30_mm: 320,
    frame_largo_cm: 100, setup_metros: 100,
    tintas_max: 6, tiene_plata: false, tiene_reinsercion: true, tiene_invisible: false,
    camas_blanco_max: 1, doble_hit: false,
  },
  {
    id: '20MIL', name: '20 MIL',
    costo_usd: 2000000 / 22, meses_depreciacion: 120, division_costo: 6,
    ancho_13_mm: 714, ancho_30_mm: 714,
    frame_largo_cm: 110, setup_metros: 10,
    tintas_max: 4, tiene_plata: false, tiene_reinsercion: true, tiene_invisible: false,
    camas_blanco_max: 1, doble_hit: true,
  },
  {
    id: 'INK_JET', name: 'INK JET',
    costo_usd: 540000 / 22, meses_depreciacion: 120, division_costo: 6,
    ancho_13_mm: 317, ancho_30_mm: 317,
    frame_largo_cm: 400, setup_metros: 10,
    tintas_max: 5, tiene_plata: false, tiene_reinsercion: false, tiene_invisible: false,
    camas_blanco_max: 1, doble_hit: false,
  },
];

// Speed table: tintas -> speed per machine
export type DigitalSpeedTable = Record<string, Record<number, number>>;

export const DEFAULT_DIGITAL_SPEED_TABLE: DigitalSpeedTable = {
  '6MIL':   { 1: 42, 2: 42, 3: 42, 4: 31, 5: 25, 6: 20, 7: 18 },
  'V12':    { 1: 120, 2: 120, 3: 120, 4: 120, 5: 120, 6: 120, 7: 60 },
  '20MIL':  { 1: 42, 2: 42, 3: 42, 4: 31, 5: 25, 6: 20, 7: 18 },
  'INK_JET':{ 1: 42, 2: 42, 3: 42, 4: 42, 5: 20, 6: 18, 7: 15 },
};

// Click value table
export interface ClickValueRow {
  machine_id: string;
  machine_name: string;
  valor_click_base_usd: number;
  margen_click: number; // fraction e.g. 0.15
}

export const DEFAULT_CLICK_VALUES: ClickValueRow[] = [
  { machine_id: '6MIL',    machine_name: '6 MIL',   valor_click_base_usd: 0.022, margen_click: 0.15 },
  { machine_id: 'V12',     machine_name: 'V12',      valor_click_base_usd: 0.023, margen_click: 0.15 },
  { machine_id: '20MIL',   machine_name: '20 MIL',   valor_click_base_usd: 0.025, margen_click: 0.15 },
  { machine_id: 'INK_JET', machine_name: 'INK JET',  valor_click_base_usd: 0,     margen_click: 0 },
];

// ─── SUSTRATOS DIGITALES ─────────────────────────────────────────────────────

export interface SustratoDigital {
  nombre: string;
  precio_usd_m2: number;
  ancho_std_13_mm: number;
  ancho_std_30_mm: number;
  compra_estandar: boolean;
}

export const DEFAULT_SUSTRATOS_DIGITALES: SustratoDigital[] = [
  { nombre: 'COUCHE HM',            precio_usd_m2: 0.62, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: true },
  { nombre: 'COUCHE ACR',           precio_usd_m2: 0.65, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: true },
  { nombre: 'COUCHE 1096',          precio_usd_m2: 0.68, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: true },
  { nombre: 'COUCHE/PET',           precio_usd_m2: 0.85, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: true },
  { nombre: 'Papel Metalizado',     precio_usd_m2: 0.95, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: true },
  { nombre: 'BOPP White',           precio_usd_m2: 0.92, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: true },
  { nombre: 'BOPP Clear',           precio_usd_m2: 0.85, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: true },
  { nombre: 'BOPP Metalizado',      precio_usd_m2: 1.05, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: true },
  { nombre: 'BOPP Clear C/PET',     precio_usd_m2: 1.10, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: false },
  { nombre: 'BOPP White Hot Melt',  precio_usd_m2: 1.15, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: false },
  { nombre: 'PE White',             precio_usd_m2: 0.98, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: true },
  { nombre: 'PE Clear',             precio_usd_m2: 0.90, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: true },
  { nombre: 'PE Metalizado',        precio_usd_m2: 1.08, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: false },
  { nombre: 'PET White',            precio_usd_m2: 1.20, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: true },
  { nombre: 'PET Clear',            precio_usd_m2: 1.15, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: true },
  { nombre: 'PET Metalizado',       precio_usd_m2: 1.35, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: false },
  { nombre: 'Vellum',               precio_usd_m2: 0.75, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: false },
  { nombre: 'Yupo',                 precio_usd_m2: 1.45, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: false },
  { nombre: 'Teslin',               precio_usd_m2: 1.55, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: false },
  { nombre: 'Mylar',                precio_usd_m2: 1.60, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: false },
  { nombre: 'Kromekote',            precio_usd_m2: 0.80, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: false },
  { nombre: 'Dull Silver',          precio_usd_m2: 1.10, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: false },
  { nombre: 'Allure Diamond',       precio_usd_m2: 1.80, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: false },
  { nombre: 'AGAVE',                precio_usd_m2: 2.10, ancho_std_13_mm: 320, ancho_std_30_mm: 762, compra_estandar: false },
];

// ─── BARNICES ────────────────────────────────────────────────────────────────

export interface BarnizParams {
  nombre: string;
  precio_usd_kg: number;
  deposito_g_m2: number;
  setup_metros: number;
}

export const DEFAULT_BARNICES: BarnizParams[] = [
  { nombre: 'Brillante',    precio_usd_kg: 14,  deposito_g_m2: 4,  setup_metros: 20 },
  { nombre: 'Mate',         precio_usd_kg: 21,  deposito_g_m2: 4,  setup_metros: 20 },
  { nombre: 'Táctil',       precio_usd_kg: 40,  deposito_g_m2: 12, setup_metros: 35 },
  { nombre: 'Digital',      precio_usd_kg: 120, deposito_g_m2: 10, setup_metros: 30 },
  { nombre: 'Cast&Cure',    precio_usd_kg: 14,  deposito_g_m2: 8,  setup_metros: 30 },
];

// ─── LAMINADOS ───────────────────────────────────────────────────────────────

export interface LaminadoParams {
  nombre: string;
  precio_usd_m2: number;
  setup_metros: number;
}

export const DEFAULT_LAMINADOS: LaminadoParams[] = [
  { nombre: 'Brillante',           precio_usd_m2: 0.25, setup_metros: 15 },
  { nombre: 'Mate',                precio_usd_m2: 0.35, setup_metros: 15 },
  { nombre: 'Brillante Adhesivo',  precio_usd_m2: 0.10, setup_metros: 10 },
];

// ─── ESTAMPADOS ──────────────────────────────────────────────────────────────

export interface EstampadoParams {
  nombre: string;
  precio_usd_m2: number;
  precio_hs_mx_cm2: number;
  precio_embosado_mx_cm2: number;
}

export const DEFAULT_ESTAMPADOS: EstampadoParams[] = [
  { nombre: 'Plata/Oro',           precio_usd_m2: 0.69, precio_hs_mx_cm2: 0, precio_embosado_mx_cm2: 0 },
  { nombre: 'Colores',             precio_usd_m2: 0.87, precio_hs_mx_cm2: 0, precio_embosado_mx_cm2: 0 },
  { nombre: 'Cold Foil plata/oro', precio_usd_m2: 0.44, precio_hs_mx_cm2: 0, precio_embosado_mx_cm2: 0 },
];

// ─── OVERHEAD DIGITAL ────────────────────────────────────────────────────────

export interface OverheadConcepto {
  concepto: string;
  gasto_mensual_usd: number;
  pct_digital: number;   // fraction 0-1
  m2_mensuales: number;
  nro_maquinas: number;        // number of DIGITAL machines
  nro_maquinas_analog?: number; // number of ANALOG machines (optional, derived if not set)
  horas_disponibles_maq: number; // calculated: dias_mes * horas_dia * eficiencia
}

export const DEFAULT_OVERHEAD_CONCEPTOS: OverheadConcepto[] = [
  { concepto: 'Gastos generales',          gasto_mensual_usd: 176490, pct_digital: 0.70, m2_mensuales: 477000, nro_maquinas: 14, nro_maquinas_analog: 7, horas_disponibles_maq: 0 },
  { concepto: 'Depreciaciones analógicas', gasto_mensual_usd: 20034,  pct_digital: 0.70, m2_mensuales: 477000, nro_maquinas: 14, nro_maquinas_analog: 7, horas_disponibles_maq: 0 },
  { concepto: 'Mano de obra',              gasto_mensual_usd: 81090,  pct_digital: 0.70, m2_mensuales: 477000, nro_maquinas: 14, nro_maquinas_analog: 7, horas_disponibles_maq: 0 },
  { concepto: 'Gastos de dirección',       gasto_mensual_usd: 62010,  pct_digital: 0.70, m2_mensuales: 477000, nro_maquinas: 14, nro_maquinas_analog: 7, horas_disponibles_maq: 0 },
  { concepto: 'Gastos sistemas',           gasto_mensual_usd: 20988,  pct_digital: 0.70, m2_mensuales: 477000, nro_maquinas: 14, nro_maquinas_analog: 7, horas_disponibles_maq: 0 },
];

export const SUSTRATOS = [
  { label: 'BOPP Transparente', precio_usd_m2: 0.85 },
  { label: 'BOPP Blanco', precio_usd_m2: 0.92 },
  { label: 'PVC Blanco', precio_usd_m2: 1.1 },
  { label: 'Poliéster', precio_usd_m2: 1.35 },
  { label: 'Papel Couché', precio_usd_m2: 0.62 },
  { label: 'Papel Térmico', precio_usd_m2: 0.78 },
  { label: 'OTRO', precio_usd_m2: 0 },
];