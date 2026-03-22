'use client';
import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import { Printer, TrendingUp, AlertTriangle, RotateCcw, ZoomIn, ZoomOut, Maximize2, Target } from 'lucide-react';
import { AnalogCostResult } from '../../../calculators/analogico';
import { DigitalCostResult, MAQUINAS_DIGITAL, GLOBAL } from '../../../calculators/digital';


type CostResult = AnalogCostResult | DigitalCostResult;

export interface CurvesChartProps {
  allScaleResults: Record<number, CostResult[]>;
  scales: number[];
  nombreTrabajo: string;
  ejeMm: number;
  desarrolloMm: number;
  computeForScale: (scale: number) => CostResult[];
  ejeCm?: number;
  desarrolloCm?: number;
  gapCm?: number;
  anchoMaterialMm?: number;
  sobreAncho?: number;
  gapEje?: number;
  orillas?: number;
  planilla13?: number;
  planilla30?: number;
  anchoMaterial20milMm?: number;
  mermaAnalog?: number;
  mermaDigital?: number;
}

// CAMBIO 3 — Colores default contrastantes
const DEFAULT_MACHINE_COLORS: Record<string, string> = {
  '6MIL':    '#E91E63',  // rosa fuerte
  'V12':     '#00BCD4',  // cyan
  '20MIL':   '#FF9800',  // naranja
  'INK_JET': '#FFEB3B',  // amarillo
  'MO':      '#2196F3',  // azul
  'FA10':    '#4CAF50',  // verde
  'FA6':     '#9C27B0',  // morado
  'GAL1':    '#FF5722',  // naranja rojo
};

const MACHINE_ORDER = ['MO', 'FA10', 'FA6', 'GAL1', 'V12', '20MIL', 'INK_JET', '6MIL'];
const DIGITAL_IDS = new Set(['V12', '20MIL', 'INK_JET', '6MIL']);
const ANALOG_IDS = new Set(['MO', 'FA10', 'FA6', 'GAL1']);

const DIGITAL_REFERENCE_MACHINES = ['6 MIL', 'V12', '20 MIL', 'INK JET'];
const REF_DISPLAY_TO_ID: Record<string, string> = {
  '6 MIL':   '6MIL',
  'V12':     'V12',
  '20 MIL':  '20MIL',
  'INK JET': 'INK_JET',
};

function fmt2(n: number) {
  return isFinite(n) ? n.toFixed(2) : '—';
}

function fmtInt(n: number) {
  return isFinite(n) ? Math.round(n).toLocaleString() : '—';
}

function machineName(id: string) {
  if (id === 'INK_JET') return 'INK JET';
  if (id === '20MIL') return '20 MIL';
  if (id === '6MIL') return '6 MIL';
  return id;
}

// ── CORRECCIÓN 1: SUAVIZADO GAUSSIANO EN ESPACIO LOGARÍTMICO ──
// sigma=0.08 en log-scale elimina los escalones del flete sin distorsionar la curva
const GAUSSIAN_SIGMA = 0.08;

function gaussianSmooth(
  logScales: number[],
  values: number[],
  sigma: number = GAUSSIAN_SIGMA
): number[] {
  return values.map((_, i) => {
    let weightSum = 0;
    let valueSum = 0;
    for (let j = 0; j < logScales.length; j++) {
      // FIX 1 — Ignorar NaN (puntos inelegibles) en el promedio ponderado
      if (!isFinite(values[j])) continue;
      const w = Math.exp(-0.5 * Math.pow((logScales[j] - logScales[i]) / sigma, 2));
      weightSum += w;
      valueSum += w * values[j];
    }
    if (weightSum === 0) return NaN;
    return valueSum / weightSum;
  });
}

// Generar escalas densas con distribución logarítmica
function generarEscalasDensas(min_k: number, max_k: number, n_puntos: number = 200): number[] {
  const log_min = Math.log10(Math.max(min_k, 0.1));
  const log_max = Math.log10(max_k * 2);
  const scales: number[] = [];
  for (let i = 0; i < n_puntos; i++) {
    const t = i / (n_puntos - 1);
    scales.push(Math.pow(10, log_min + t * (log_max - log_min)));
  }
  return scales;
}

// ── CORRECCIÓN 1: ECUACIÓN A/x^α + B ajustada sobre datos suavizados ──
// Regresión en espacio log: log(y-B) = log(A) - alpha*log(x)
// Excluye el primer 30% de puntos (zona del cobro mínimo / kink)
function regressionPowerLaw(points: { x: number; y: number }[]): { A: number; alpha: number; B: number } {
  const valid = points.filter((p) => p.x > 0 && isFinite(p.y) && p.y > 0);
  if (valid.length < 4) return { A: 0, alpha: 1, B: 0 };

  // Excluir el primer 30% de puntos (zona del kink / cobro mínimo)
  const startIdx = Math.floor(valid.length * 0.3);
  const pts = valid.slice(startIdx);
  if (pts.length < 4) return { A: 0, alpha: 1, B: 0 };

  // Estimar B como el mínimo observado × 0.98
  const B_est = Math.min(...pts.map(p => p.y)) * 0.98;

  // Regresión lineal en espacio log: log(y-B) = log(A) - alpha*log(x)
  const logX = pts.map(p => Math.log(p.x));
  const logY = pts.map(p => Math.log(Math.max(p.y - B_est, 1e-6)));

  const n = pts.length;
  const sumX = logX.reduce((a, b) => a + b, 0);
  const sumY = logY.reduce((a, b) => a + b, 0);
  const sumXY = logX.reduce((acc, x, i) => acc + x * logY[i], 0);
  const sumX2 = logX.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;

  if (Math.abs(denom) < 1e-12) return { A: 0, alpha: 1, B: Math.round(B_est) };

  const neg_alpha = (n * sumXY - sumX * sumY) / denom;
  const logA = (sumY - neg_alpha * sumX) / n;

  const A = Math.exp(logA);
  const alpha = -neg_alpha;

  return {
    A: Math.round(A),
    alpha: parseFloat(alpha.toFixed(2)),
    B: Math.round(B_est),
  };
}

// CORRECCIÓN 1 — Detectar cruces comparando valores calculados PUNTO A PUNTO (sobre datos suavizados)
// AMBAS curvas deben estar indexadas por el MISMO array de scale_k
function findCrossoversDirect(
  curvaA: { scale_k: number; x: number; cpm_mxn: number }[],
  curvaB: { scale_k: number; x: number; cpm_mxn: number }[]
): { x: number; scale_k: number; cpm_mxn: number }[] {
  const crossovers: { x: number; scale_k: number; cpm_mxn: number }[] = [];
  const minLen = Math.min(curvaA.length, curvaB.length);
  for (let i = 0; i < minLen - 1; i++) {
    const diffI   = curvaA[i].cpm_mxn   - curvaB[i].cpm_mxn;
    const diffNext = curvaA[i+1].cpm_mxn - curvaB[i+1].cpm_mxn;
    if (diffI * diffNext < 0) {
      const t = diffI / (diffI - diffNext);
      const x_cruce     = curvaA[i].x       + t * (curvaA[i+1].x       - curvaA[i].x);
      const scale_cruce = curvaA[i].scale_k  + t * (curvaA[i+1].scale_k  - curvaA[i].scale_k);
      const cpm_cruce   = curvaA[i].cpm_mxn  + t * (curvaA[i+1].cpm_mxn  - curvaA[i].cpm_mxn);
      crossovers.push({ x: x_cruce, scale_k: scale_cruce, cpm_mxn: cpm_cruce });
    }
  }
  return crossovers;
}

// Calcular metros que corre la máquina DIGITAL de referencia para una escala dada
function calcMetrosDigitalReferencia(
  refMachineId: string,
  scaleMillares: number,
  ejeMm: number,
  desarrolloMm: number,
  gapEjeMm: number = 3,
  gapDesMm: number = 3,
): number {
  const maqData = MAQUINAS_DIGITAL[refMachineId];
  if (!maqData) return 0;

  const eje_cm = ejeMm / 10;
  const des_cm = desarrolloMm / 10;
  const gap_e_cm = gapEjeMm / 10;
  const gap_d_cm = gapDesMm / 10;

  const cav_eje = Math.floor(maqData.planilla_cm / (eje_cm + gap_e_cm));
  const cav_des = Math.floor(maqData.frame_largo_cm / (des_cm + gap_d_cm * 2));
  if (cav_eje <= 0 || cav_des <= 0) return 0;

  const cantidad = scaleMillares * 1000;
  const frames_total = Math.ceil(cantidad / (cav_eje * cav_des));
  const area_no_imp = maqData.frame_largo_cm - (des_cm + gap_d_cm) * cav_des;
  const metros_imp = frames_total * (maqData.frame_largo_cm - area_no_imp) / 100 + maqData.setup_metros;
  const metros_total = metros_imp + 20;

  return metros_total;
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}) {
  if (!active || !payload || !label) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl text-xs max-w-[220px]">
      <p className="text-slate-300 font-semibold mb-2">
        {`${Number(label).toFixed(0)} m lineales (ref. digital)`}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-3 mb-1">
          <span style={{ color: entry.color }} className="font-medium">{entry.name}</span>
          <span className="text-slate-200 font-mono">${fmt2(entry.value)}/millar MXN</span>
        </div>
      ))}
    </div>
  );
}

function logTickFormatterX(value: number): string {
  if (value <= 0) return '';
  const niceX = [10, 50, 100, 500, 1000, 5000, 10000, 50000];
  const isNice = niceX.some((n) => Math.abs(value - n) / n < 0.01);
  if (!isNice) return '';
  return value >= 1000 ? `${value / 1000}k` : String(value);
}

function logTickFormatterY(value: number): string {
  if (value <= 0) return '';
  const niceY = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 30000, 50000];
  const isNice = niceY.some((n) => Math.abs(value - n) / n < 0.05);
  if (isNice) {
    return value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value.toFixed(0)}`;
  }
  const log = Math.log10(value);
  if (Math.abs(log - Math.round(log)) < 0.05) {
    return `$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toFixed(0)}`;
  }
  return '';
}

interface AxisControlsProps {
  label: string;
  isLog: boolean;
  onToggleLog: (v: boolean) => void;
  minVal: string;
  maxVal: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}

function AxisControls({ label, isLog, onToggleLog, minVal, maxVal, onMinChange, onMaxChange }: AxisControlsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-slate-400 font-medium w-10 flex-shrink-0">{label}</span>
      <label className="flex items-center gap-1 cursor-pointer text-xs text-slate-300">
        <input
          type="radio"
          name={`scale-${label}`}
          checked={!isLog}
          onChange={() => onToggleLog(false)}
          className="accent-orange-500"
        />
        Lineal
      </label>
      <label className="flex items-center gap-1 cursor-pointer text-xs text-slate-300">
        <input
          type="radio"
          name={`scale-${label}`}
          checked={isLog}
          onChange={() => onToggleLog(true)}
          className="accent-orange-500"
        />
        Logarítmico
      </label>
      <span className="text-xs text-slate-500">Mín:</span>
      <input
        type="number"
        value={minVal}
        onChange={(e) => onMinChange(e.target.value)}
        className="w-20 bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
        step="any"
      />
      <span className="text-xs text-slate-500">Máx:</span>
      <input
        type="number"
        value={maxVal}
        onChange={(e) => onMaxChange(e.target.value)}
        className="w-20 bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
        step="any"
      />
    </div>
  );
}

export default function CurvesChart({
  allScaleResults,
  scales,
  nombreTrabajo,
  ejeMm,
  desarrolloMm,
  computeForScale,
  anchoMaterialMm = 300,
  sobreAncho = 18,
  gapEje = 3,
  orillas = 7.5,
  mermaAnalog = 5,
  mermaDigital = 5,
  anchoMaterial20milMm = 300,
}: CurvesChartProps) {
  const [hiddenCurves, setHiddenCurves] = useState<Set<string>>(new Set());
  const [refMachineDisplay, setRefMachineDisplay] = useState<string>('6 MIL');

  // CAMBIO 3 — Color pickers por máquina
  const [machineColors, setMachineColors] = useState<Record<string, string>>({ ...DEFAULT_MACHINE_COLORS });

  const [xLogScale, setXLogScale] = useState<boolean>(true);
  const [yLogScale, setYLogScale] = useState<boolean>(true);
  const [xMinInput, setXMinInput] = useState<string>('');
  const [xMaxInput, setXMaxInput] = useState<string>('');
  const [yMinInput, setYMinInput] = useState<string>('');
  const [yMaxInput, setYMaxInput] = useState<string>('');

  // CORRECCIÓN 2 — Zoom captivo: refs para acceso a estado actual desde handler nativo
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isShiftDrag, setIsShiftDrag] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; xMin: number; xMax: number; yMin: number; yMax: number } | null>(null);
  const shiftBoxRef = useRef<{ startX: number; startY: number } | null>(null);
  const [shiftBox, setShiftBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const refMachineId = REF_DISPLAY_TO_ID[refMachineDisplay] || '6MIL';

  const toggleCurve = useCallback((id: string) => {
    setHiddenCurves((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleColorChange = useCallback((machineId: string, color: string) => {
    setMachineColors(prev => ({ ...prev, [machineId]: color }));
  }, []);

  const handleResetColors = useCallback(() => {
    setMachineColors({ ...DEFAULT_MACHINE_COLORS });
  }, []);

  const eligibleMachines = useMemo(() => {
    const firstScale = scales[0];
    const results = allScaleResults[firstScale] || [];
    return new Set(results.filter((r) => r.elegible).map((r) => r.machine_id));
  }, [allScaleResults, scales]);

  // ── CORRECCIÓN 1: Generar curvas con suavizado gaussiano en espacio log ──
  const { curveData, regressions, allCrossings, defaultXMin, defaultXMax, defaultYMin, defaultYMax } = useMemo(() => {
    if (scales.length < 2) return {
      curveData: [], regressions: {}, allCrossings: [],
      defaultXMin: 50, defaultXMax: 35000, defaultYMin: 500, defaultYMax: 30000
    };

    const NUM_POINTS = 200;
    const userScaleMin = Math.min(...scales);
    const userScaleMax = Math.max(...scales);
    const scaleMin = Math.max(userScaleMin * 0.5, 0.1);
    const scaleMax = userScaleMax * 3;

    // PASO 1: Generar array COMPARTIDO de escalas densas (mismo índice = misma escala_k)
    const denseScales = generarEscalasDensas(scaleMin, scaleMax, NUM_POINTS);
    const logScalesShared = denseScales.map(s => Math.log(s));

    // PASO 2: Para cada escala, calcular metros de referencia digital y resultados de todas las máquinas
    // Almacenar en matrices indexadas por [escala_idx][machineId]
    const metrosRef: number[] = new Array(NUM_POINTS).fill(0);
    // FIX 1 — rawCpm usa number | null | typeof NaN:
    //   null  = índice no procesado (metros <= 0)
    //   NaN   = máquina no elegible en esta escala (intencional — mantiene alineación de índices)
    //   number = valor válido
    const rawCpm: Record<string, (number | null)[]> = {};
    MACHINE_ORDER.forEach(id => { rawCpm[id] = new Array(NUM_POINTS).fill(null); });

    for (let idx = 0; idx < denseScales.length; idx++) {
      const scaleMillares = denseScales[idx];

      const metros = calcMetrosDigitalReferencia(
        refMachineId,
        scaleMillares,
        ejeMm,
        desarrolloMm,
        gapEje,
        3
      );
      metrosRef[idx] = metros;

      if (metros <= 0) continue;

      const results = computeForScale(scaleMillares);

      // FIX 1 — Para cada máquina elegible globalmente, SIEMPRE registrar un valor en este índice.
      // Si la máquina no es elegible en esta escala específica → NaN (mantiene alineación de índices).
      // Antes: `if (!r.elegible) continue` → V12 saltaba escalas pequeñas → array más corto → índices desalineados.
      MACHINE_ORDER.forEach((machineId) => {
        if (!eligibleMachines.has(machineId)) return;
        const r = results.find((res) => res.machine_id === machineId);
        const costoUsd = (r && r.elegible && r.costo_millar_usd > 0 && isFinite(r.costo_millar_usd))
          ? r.costo_millar_usd
          : NaN;
        // Almacenar NaN si no elegible — se excluye de regresión y gráfica pero mantiene posición de índice
        rawCpm[machineId][idx] = isFinite(costoUsd) ? costoUsd * GLOBAL.TC : NaN;
      });
    }

    // PASO 3: Para cada máquina, construir curva suavizada SOLO con puntos válidos (no NaN)
    // Los NaN son intencionalmente inelegibles — NO se interpolan, se dejan fuera de la curva
    const curvas: Record<string, { scale_k: number; x: number; cpm_mxn: number }[]> = {};

    MACHINE_ORDER.forEach((machineId) => {
      if (!eligibleMachines.has(machineId)) return;

      const raw = rawCpm[machineId];

      // FIX 1 — Solo índices con valores finitos (excluir null y NaN)
      const validIndices = raw.map((v, i) => (v !== null && isFinite(v as number)) ? i : -1).filter(i => i >= 0);
      if (validIndices.length < 3) return;

      // FIX 1 — filled: solo copiar valores finitos; NaN/null quedan como NaN
      // NO interpolar sobre NaN (son inelegibles, no huecos accidentales)
      const filled: number[] = new Array(NUM_POINTS).fill(NaN);
      for (let i = 0; i < NUM_POINTS; i++) {
        const v = raw[i];
        if (v !== null && isFinite(v as number)) {
          filled[i] = v as number;
        }
        // NaN (inelegible) o null (metros<=0): dejar NaN — no interpolar
      }

      // Suavizado gaussiano en espacio log (sigma=0.08) sobre el array completo compartido
      // gaussianSmooth maneja NaN correctamente (los ignora en el promedio ponderado)
      const smoothed = gaussianSmooth(logScalesShared, filled, GAUSSIAN_SIGMA);

      // Construir curva solo para índices con valor original válido (no NaN)
      const firstValid = validIndices[0];
      const lastValid = validIndices[validIndices.length - 1];

      const pts: { scale_k: number; x: number; cpm_mxn: number }[] = [];
      for (let i = firstValid; i <= lastValid; i++) {
        // FIX 1 — Solo incluir si el valor original era finito (no NaN inelegible)
        if (metrosRef[i] > 0 && isFinite(filled[i]) && smoothed[i] > 0 && isFinite(smoothed[i])) {
          pts.push({
            scale_k: denseScales[i],
            x: metrosRef[i],
            cpm_mxn: smoothed[i],
          });
        }
      }

      if (pts.length >= 3) curvas[machineId] = pts;
    });

    // ── PASO 4: Calcular regresiones A/x^α + B sobre datos suavizados ──
    const regs: Record<string, { A: number; alpha: number; B: number }> = {};
    Object.entries(curvas).forEach(([id, pts]) => {
      regs[id] = regressionPowerLaw(pts.map((p) => ({ x: p.x, y: p.cpm_mxn })));
    });

    const firstMachineId = Object.keys(curvas)[0];
    if (!firstMachineId) return {
      curveData: [], regressions: regs, allCrossings: [],
      defaultXMin: 50, defaultXMax: 35000, defaultYMin: 500, defaultYMax: 30000
    };

    // FIX 2 — Construir chartData buscando por scale_k, no por índice directo
    // Antes: `pts[i]` asumía que el índice i de V12 correspondía a la misma escala que el índice i de 6MIL.
    // Eso es falso cuando tienen distinto número de puntos (V12 salta escalas donde no es elegible).
    const chartData: Record<string, number>[] = [];
    for (let i = 0; i < denseScales.length; i++) {
      const scale_k = denseScales[i];
      const x = metrosRef[i];
      if (x <= 0) continue;

      const entry: Record<string, number> = { x, x_millares: scale_k };
      let hasAny = false;
      MACHINE_ORDER.forEach((id) => {
        const mPts = curvas[id];
        if (!mPts) return;
        // FIX 2 — Buscar el punto con scale_k más cercana (no por índice)
        let bestDiff = Infinity;
        let bestVal = NaN;
        for (const pt of mPts) {
          const diff = Math.abs(pt.scale_k - scale_k);
          if (diff < bestDiff) { bestDiff = diff; bestVal = pt.cpm_mxn; }
        }
        // Solo incluir si está dentro del 1% de la escala de referencia
        if (bestDiff / scale_k < 0.01 && isFinite(bestVal)) {
          entry[id] = bestVal;
          hasAny = true;
        }
      });
      if (hasAny) chartData.push(entry);
    }

    // ── PASO 5: Detectar cruces DIRECTAMENTE sobre allScaleResults (eje = millares) ──
    // CORRECCIÓN CRÍTICA: el eje X del gráfico son metros de la máquina digital de
    // referencia. Sin embargo, MO corre ~19k metros para 500k etiquetas mientras 6MIL
    // corre ~25k metros para los mismos 500k. Al comparar curvas sobre ese eje, los
    // datos de MO y 6MIL están en posiciones X distintas para la misma escala → los
    // cruces quedan desplazados.
    //
    // Solución: calcular cruces sobre el eje de MILLARES (común a todas las máquinas),
    // usando los valores crudos de allScaleResults. Solo después convertimos a metros
    // para la columna de la tabla.
    const crossingsList: {
      machine1: string;
      machine2: string;
      xMetros: number;
      xMillares: number;
      y: number;
      isDigitalAnalog: boolean;
      inRange: boolean;
    }[] = [];

    // Ordenar las escalas del usuario (eje compartido de millares)
    const sortedUserScales = [...scales].sort((a, b) => a - b);

    // Función auxiliar: obtener CPM MXN y metros de una máquina en una escala dada
    const getDataPoint = (machineId: string, scale_k: number): { cpm_mxn: number; metros: number } | null => {
      const results = allScaleResults[scale_k] || [];
      const r = results.find(res => res.machine_id === machineId);
      if (!r || !r.elegible || !isFinite(r.costo_millar_mxn) || r.costo_millar_mxn <= 0) return null;
      // metros_lineales puede venir de analog o digital; usar 0 si no existe
      const metros = (r as { metros_lineales?: number }).metros_lineales ?? 0;
      return { cpm_mxn: r.costo_millar_mxn, metros };
    };

    const machineIdsWithCurves = Object.keys(curvas);

    for (let i = 0; i < machineIdsWithCurves.length; i++) {
      for (let j = i + 1; j < machineIdsWithCurves.length; j++) {
        const id1 = machineIdsWithCurves[i];
        const id2 = machineIdsWithCurves[j];

        // Construir serie paralela sobre el eje de millares del usuario
        const pts1: { scale_k: number; cpm_mxn: number; metros: number }[] = [];
        const pts2: { scale_k: number; cpm_mxn: number; metros: number }[] = [];

        for (const scale_k of sortedUserScales) {
          const p1 = getDataPoint(id1, scale_k);
          const p2 = getDataPoint(id2, scale_k);
          if (!p1 || !p2) continue; // skip escalas donde alguna máquina no es elegible
          pts1.push({ scale_k, cpm_mxn: p1.cpm_mxn, metros: p1.metros });
          pts2.push({ scale_k, cpm_mxn: p2.cpm_mxn, metros: p2.metros });
        }

        if (pts1.length < 2) continue;

        // Detectar cambios de signo en (cpm1 - cpm2) sobre el eje de millares
        for (let k = 0; k < pts1.length - 1; k++) {
          const diff0 = pts1[k].cpm_mxn - pts2[k].cpm_mxn;
          const diff1 = pts1[k + 1].cpm_mxn - pts2[k + 1].cpm_mxn;

          if (diff0 * diff1 >= 0) continue; // sin cruce en este intervalo

          // Interpolación lineal en espacio logarítmico (más precisa para curvas con caída power-law)
          const logK0 = Math.log(pts1[k].scale_k);
          const logK1 = Math.log(pts1[k + 1].scale_k);
          const t = diff0 / (diff0 - diff1); // fracción del intervalo donde se cruzan
          const logK_cruce = logK0 + t * (logK1 - logK0);
          const k_cruce = Math.exp(logK_cruce);

          // CPM en el cruce: promedio ponderado de ambas curvas en ese punto
          const cpm1_cruce = pts1[k].cpm_mxn + t * (pts1[k + 1].cpm_mxn - pts1[k].cpm_mxn);
          const cpm2_cruce = pts2[k].cpm_mxn + t * (pts2[k + 1].cpm_mxn - pts2[k].cpm_mxn);
          const cpm_cruce = (cpm1_cruce + cpm2_cruce) / 2;

          // Metros en el cruce: interpolar metros de la máquina ANTES del cruce (la que conviene antes)
          // Usamos la máquina más barata antes del cruce
          const metros1_cruce = pts1[k].metros + t * (pts1[k + 1].metros - pts1[k].metros);
          const metros2_cruce = pts2[k].metros + t * (pts2[k + 1].metros - pts2[k].metros);
          // Para el eje X del gráfico usamos metros de la máquina digital de referencia a esa escala,
          // para mantener consistencia con el eje X del gráfico
          const xMetros_ref = calcMetrosDigitalReferencia(refMachineId, k_cruce, ejeMm, desarrolloMm, gapEje, 3);
          // Si la referencia no está disponible, usar promedio de ambas máquinas
          const xMetros = xMetros_ref > 0 ? xMetros_ref : (metros1_cruce + metros2_cruce) / 2;

          if (!isFinite(k_cruce) || !isFinite(cpm_cruce) || cpm_cruce <= 0) continue;

          const isDA =
            (DIGITAL_IDS.has(id1) && ANALOG_IDS.has(id2)) ||
            (ANALOG_IDS.has(id1) && DIGITAL_IDS.has(id2));

          crossingsList.push({
            machine1: id1,
            machine2: id2,
            xMetros: isFinite(xMetros) && xMetros > 0 ? xMetros : (metros1_cruce + metros2_cruce) / 2,
            xMillares: k_cruce,
            y: cpm_cruce,
            isDigitalAnalog: isDA,
            inRange: true,
          });
        }
      }
    }

    crossingsList.sort((a, b) => a.xMetros - b.xMetros);

    const allX = chartData.map((d) => d.x).filter((v) => v > 0);
    const allY = chartData.flatMap((d) =>
      MACHINE_ORDER.filter((id) => eligibleMachines.has(id))
        .map((id) => d[id] as number)
        .filter((v) => v > 0 && isFinite(v))
    );

    const defXMin = allX.length > 0 ? Math.min(...allX) * 0.8 : 50;
    const defXMax = allX.length > 0 ? Math.max(...allX) * 1.2 : 35000;
    const defYMin = 500;
    const defYMax = allY.length > 0 ? Math.min(Math.max(...allY) * 1.2, 50000) : 30000;

    return {
      curveData: chartData,
      regressions: regs,
      allCrossings: crossingsList,
      defaultXMin: defXMin,
      defaultXMax: defXMax,
      defaultYMin: defYMin,
      defaultYMax: defYMax,
    };
  }, [
    eligibleMachines, scales, computeForScale, allScaleResults,
    refMachineId, ejeMm, desarrolloMm, gapEje,
  ]);

  const xMin = xMinInput !== '' ? parseFloat(xMinInput) : defaultXMin;
  const xMax = xMaxInput !== '' ? parseFloat(xMaxInput) : defaultXMax;
  const yMin = yMinInput !== '' ? parseFloat(yMinInput) : defaultYMin;
  const yMax = yMaxInput !== '' ? parseFloat(yMaxInput) : defaultYMax;

  const xDomain: [number | string, number | string] = [
    isFinite(xMin) ? xMin : 'auto',
    isFinite(xMax) ? xMax : 'auto',
  ];
  const yDomain: [number | string, number | string] = [
    isFinite(yMin) ? yMin : 'auto',
    isFinite(yMax) ? yMax : 'auto',
  ];

  // ── CORRECCIÓN 2: ZOOM CAPTIVO — refs para acceso sin stale closure ──
  // Almacenar los valores actuales de rango en refs para que el handler nativo
  // siempre lea los valores más recientes sin necesidad de re-registrar el listener
  const xMinRef = useRef(xMin);
  const xMaxRef = useRef(xMax);
  const yMinRef = useRef(yMin);
  const yMaxRef = useRef(yMax);
  const xLogScaleRef = useRef(xLogScale);
  const yLogScaleRef = useRef(yLogScale);

  // Sincronizar refs con estado en cada render
  xMinRef.current = xMin;
  xMaxRef.current = xMax;
  yMinRef.current = yMin;
  yMaxRef.current = yMax;
  xLogScaleRef.current = xLogScale;
  yLogScaleRef.current = yLogScale;

  // Helpers para convertir pixel → valor de eje (usando refs, sin stale closure)
  const getChartBounds = useCallback(() => {
    const el = chartContainerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const marginLeft = 55;
    const marginRight = 25;
    const marginTop = 15;
    const marginBottom = 35;
    return {
      left: rect.left + marginLeft,
      top: rect.top + marginTop,
      right: rect.right - marginRight,
      bottom: rect.bottom - marginBottom,
      width: rect.width - marginLeft - marginRight,
      height: rect.height - marginTop - marginBottom,
    };
  }, []);

  const pixelToValue = useCallback((px: number, py: number) => {
    const bounds = getChartBounds();
    if (!bounds) return null;
    const tx = (px - bounds.left) / bounds.width;
    const ty = 1 - (py - bounds.top) / bounds.height;
    const curXMin = xMinRef.current;
    const curXMax = xMaxRef.current;
    const curYMin = yMinRef.current;
    const curYMax = yMaxRef.current;
    let xVal: number, yVal: number;
    if (xLogScaleRef.current) {
      xVal = Math.pow(10, Math.log10(curXMin) + tx * (Math.log10(curXMax) - Math.log10(curXMin)));
    } else {
      xVal = curXMin + tx * (curXMax - curXMin);
    }
    if (yLogScaleRef.current) {
      yVal = Math.pow(10, Math.log10(curYMin) + ty * (Math.log10(curYMax) - Math.log10(curYMin)));
    } else {
      yVal = curYMin + ty * (curYMax - curYMin);
    }
    return { x: xVal, y: yVal };
  }, [getChartBounds]);

  // applyZoom usando refs para leer valores actuales (sin stale closure)
  const applyZoomFromRefs = useCallback((factor: number, cx?: number, cy?: number) => {
    const curXMin = xMinRef.current;
    const curXMax = xMaxRef.current;
    const curYMin = yMinRef.current;
    const curYMax = yMaxRef.current;
    let centerX = cx ?? (curXMin + curXMax) / 2;
    let centerY = cy ?? (curYMin + curYMax) / 2;

    if (xLogScaleRef.current) {
      const logCx = Math.log10(Math.max(centerX, 1e-6));
      const logMin2 = Math.log10(Math.max(curXMin, 1e-6));
      const logMax2 = Math.log10(Math.max(curXMax, 1e-6));
      const halfSpan = (logMax2 - logMin2) / 2 / factor;
      setXMinInput(String(Math.pow(10, logCx - halfSpan).toFixed(2)));
      setXMaxInput(String(Math.pow(10, logCx + halfSpan).toFixed(2)));
    } else {
      const halfSpan = (curXMax - curXMin) / 2 / factor;
      setXMinInput(String((centerX - halfSpan).toFixed(2)));
      setXMaxInput(String((centerX + halfSpan).toFixed(2)));
    }
    if (yLogScaleRef.current) {
      const logCy = Math.log10(Math.max(centerY, 1e-6));
      const logMin2 = Math.log10(Math.max(curYMin, 1e-6));
      const logMax2 = Math.log10(Math.max(curYMax, 1e-6));
      const halfSpan = (logMax2 - logMin2) / 2 / factor;
      setYMinInput(String(Math.pow(10, logCy - halfSpan).toFixed(2)));
      setYMaxInput(String(Math.pow(10, logCy + halfSpan).toFixed(2)));
    } else {
      const halfSpan = (curYMax - curYMin) / 2 / factor;
      setYMinInput(String((centerY - halfSpan).toFixed(2)));
      setYMaxInput(String((centerY + halfSpan).toFixed(2)));
    }
  }, []);

  // applyZoom para botones (usa estado actual via closure — OK porque se llama desde React)
  const applyZoom = useCallback((factor: number, cx?: number, cy?: number) => {
    applyZoomFromRefs(factor, cx, cy);
  }, [applyZoomFromRefs]);

  const handleResetZoom = useCallback(() => {
    setXMinInput('');
    setXMaxInput('');
    setYMinInput('');
    setYMaxInput('');
  }, []);

  const handleZoomToCrossovers = useCallback(() => {
    const visible = allCrossings.filter(c => !hiddenCurves.has(c.machine1) && !hiddenCurves.has(c.machine2));
    if (visible.length === 0) return;
    const xs = visible.map(c => c.xMetros);
    const ys = visible.map(c => c.y);
    const xMinC = Math.min(...xs);
    const xMaxC = Math.max(...xs);
    const yMinC = Math.min(...ys);
    const yMaxC = Math.max(...ys);
    const xPad = (xMaxC - xMinC) * 0.2 || xMinC * 0.2;
    const yPad = (yMaxC - yMinC) * 0.2 || yMinC * 0.2;
    setXMinInput(String(Math.max(xMinC - xPad, 1).toFixed(2)));
    setXMaxInput(String((xMaxC + xPad).toFixed(2)));
    setYMinInput(String(Math.max(yMinC - yPad, 1).toFixed(2)));
    setYMaxInput(String((yMaxC + yPad).toFixed(2)));
  }, [allCrossings, hiddenCurves]);

  // ── CORRECCIÓN 2: ZOOM CAPTIVO — listener nativo con passive:false ──
  // Registrado UNA SOLA VEZ. Lee valores actuales via refs (sin stale closure).
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      // CRÍTICO: preventDefault evita que la página haga scroll
      e.preventDefault();
      e.stopPropagation();

      const factor = e.deltaY < 0 ? 1.3 : 1 / 1.3;

      // Calcular posición del cursor en el área del gráfico
      const rect = el.getBoundingClientRect();
      const marginLeft = 55;
      const marginRight = 25;
      const marginTop = 15;
      const marginBottom = 35;
      const chartLeft = rect.left + marginLeft;
      const chartTop = rect.top + marginTop;
      const chartWidth = rect.width - marginLeft - marginRight;
      const chartHeight = rect.height - marginTop - marginBottom;

      if (chartWidth <= 0 || chartHeight <= 0) {
        applyZoomFromRefs(factor);
        return;
      }

      const tx = (e.clientX - chartLeft) / chartWidth;
      const ty = 1 - (e.clientY - chartTop) / chartHeight;

      // Leer valores actuales desde refs (siempre frescos, sin stale closure)
      const curXMin = xMinRef.current;
      const curXMax = xMaxRef.current;
      const curYMin = yMinRef.current;
      const curYMax = yMaxRef.current;

      let centerX: number, centerY: number;
      if (xLogScaleRef.current) {
        centerX = Math.pow(10, Math.log10(curXMin) + tx * (Math.log10(curXMax) - Math.log10(curXMin)));
      } else {
        centerX = curXMin + tx * (curXMax - curXMin);
      }
      if (yLogScaleRef.current) {
        centerY = Math.pow(10, Math.log10(curYMin) + ty * (Math.log10(curYMax) - Math.log10(curYMin)));
      } else {
        centerY = curYMin + ty * (curYMax - curYMin);
      }

      applyZoomFromRefs(factor, centerX, centerY);
    };

    // passive: false es NECESARIO para poder llamar preventDefault()
    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelNative);
  }, [applyZoomFromRefs]); // applyZoomFromRefs es estable (useCallback sin deps)

  // Pan (drag sin shift)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.shiftKey) {
      setIsShiftDrag(true);
      shiftBoxRef.current = { startX: e.clientX, startY: e.clientY };
      const containerRect = chartContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        setShiftBox({
          left: e.clientX - containerRect.left,
          top: e.clientY - containerRect.top,
          width: 0,
          height: 0,
        });
      }
    } else {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        xMin: xMinRef.current,
        xMax: xMaxRef.current,
        yMin: yMinRef.current,
        yMax: yMaxRef.current,
      };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isShiftDrag && shiftBoxRef.current) {
      const containerRect = chartContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return;
      const sx = shiftBoxRef.current.startX - containerRect.left;
      const sy = shiftBoxRef.current.startY - containerRect.top;
      const ex = e.clientX - containerRect.left;
      const ey = e.clientY - containerRect.top;
      setShiftBox({
        left: Math.min(sx, ex),
        top: Math.min(sy, ey),
        width: Math.abs(ex - sx),
        height: Math.abs(ey - sy),
      });
      return;
    }
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const bounds = getChartBounds();
    if (!bounds || bounds.width === 0 || bounds.height === 0) return;
    const { xMin: ox, xMax: ox2, yMin: oy, yMax: oy2 } = dragStartRef.current;
    if (xLogScaleRef.current) {
      const logSpan = Math.log10(ox2) - Math.log10(ox);
      const shift = -(dx / bounds.width) * logSpan;
      setXMinInput(String(Math.pow(10, Math.log10(ox) + shift).toFixed(2)));
      setXMaxInput(String(Math.pow(10, Math.log10(ox2) + shift).toFixed(2)));
    } else {
      const span = ox2 - ox;
      const shift = -(dx / bounds.width) * span;
      setXMinInput(String((ox + shift).toFixed(2)));
      setXMaxInput(String((ox2 + shift).toFixed(2)));
    }
    if (yLogScaleRef.current) {
      const logSpan = Math.log10(oy2) - Math.log10(oy);
      const shift = (dy / bounds.height) * logSpan;
      setYMinInput(String(Math.pow(10, Math.log10(oy) + shift).toFixed(2)));
      setYMaxInput(String(Math.pow(10, Math.log10(oy2) + shift).toFixed(2)));
    } else {
      const span = oy2 - oy;
      const shift = (dy / bounds.height) * span;
      setYMinInput(String((oy + shift).toFixed(2)));
      setYMaxInput(String((oy2 + shift).toFixed(2)));
    }
  }, [isDragging, isShiftDrag, getChartBounds]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isShiftDrag && shiftBoxRef.current && shiftBox) {
      const containerRect = chartContainerRef.current?.getBoundingClientRect();
      if (containerRect && shiftBox.width > 5 && shiftBox.height > 5) {
        let v1 = pixelToValue(containerRect.left + shiftBox.left, containerRect.top + shiftBox.top);
        let v2 = pixelToValue(containerRect.left + shiftBox.left + shiftBox.width, containerRect.top + shiftBox.top + shiftBox.height);
        if (v1 && v2) {
          setXMinInput(String(Math.min(v1.x, v2.x).toFixed(2)));
          setXMaxInput(String(Math.max(v1.x, v2.x).toFixed(2)));
          setYMinInput(String(Math.min(v1.y, v2.y).toFixed(2)));
          setYMaxInput(String(Math.max(v1.y, v2.y).toFixed(2)));
        }
      }
      setIsShiftDrag(false);
      setShiftBox(null);
      shiftBoxRef.current = null;
    }
    setIsDragging(false);
    dragStartRef.current = null;
  }, [isShiftDrag, shiftBox, pixelToValue]);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    if (isShiftDrag) {
      setIsShiftDrag(false);
      setShiftBox(null);
      shiftBoxRef.current = null;
    }
  }, [isShiftDrag]);

  const visibleXMin = isFinite(xMin) ? xMin : 0;
  const visibleXMax = isFinite(xMax) ? xMax : Infinity;

  const crossingsInRange = allCrossings.filter((c) => c.xMetros >= visibleXMin && c.xMetros <= visibleXMax);
  const crossingsOutOfRange = allCrossings.filter((c) => c.xMetros < visibleXMin || c.xMetros > visibleXMax);

  const userScalePoints = useMemo(() => {
    const pts: { machineId: string; x: number; y: number }[] = [];
    scales.forEach((s) => {
      const metrosRef = calcMetrosDigitalReferencia(refMachineId, s, ejeMm, desarrolloMm, gapEje, 3);
      if (metrosRef <= 0) return;
      const results = allScaleResults[s] || [];
      results.forEach((r) => {
        if (r.elegible && eligibleMachines.has(r.machine_id)) {
          const costoMxn = r.costo_millar_usd * GLOBAL.TC;
          if (costoMxn > 0 && isFinite(costoMxn)) {
            pts.push({ machineId: r.machine_id, x: metrosRef, y: costoMxn });
          }
        }
      });
    });
    return pts;
  }, [allScaleResults, scales, eligibleMachines, refMachineId, ejeMm, desarrolloMm, gapEje]);

  const activeMachines = MACHINE_ORDER.filter((id) => eligibleMachines.has(id));

  const handlePrint = () => { window.print(); };

  const validationText = useMemo(() => {
    if (scales.length === 0) return null;
    const firstScale = scales.find(s => s >= 1) || scales[0];
    const mb = calcMetrosDigitalReferencia(refMachineId, firstScale, ejeMm, desarrolloMm, gapEje, 3);
    return `Metros ${refMachineDisplay} a ${firstScale}k: ${mb.toFixed(3)} m`;
  }, [scales, refMachineId, ejeMm, desarrolloMm, gapEje, refMachineDisplay]);

  if (activeMachines.length === 0) {
    return (
      <div className="card-base flex flex-col items-center justify-center py-16 text-center">
        <TrendingUp size={32} className="text-slate-600 mb-3" />
        <p className="text-slate-400 font-medium">Sin máquinas elegibles</p>
        <p className="text-sm text-slate-600 mt-1">Configura el trabajo para ver las curvas de costo</p>
      </div>
    );
  }

  // ── CORRECCIÓN 2: Cursor zoom-in en reposo, grab durante pan, grabbing al arrastrar ──
  const cursorStyle = isShiftDrag
    ? 'crosshair'
    : isDragging
    ? 'grabbing' :'zoom-in';

  return (
    <div className="card-base flex flex-col gap-4" id="curves-chart-section">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
            <TrendingUp size={16} className="text-orange-400" />
            Curvas de Costo por Escala
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {nombreTrabajo
              ? `${nombreTrabajo} — Eje ${ejeMm}mm × Desarrollo ${desarrolloMm}mm`
              : `Eje ${ejeMm}mm × Desarrollo ${desarrolloMm}mm`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <Printer size={13} />
            Imprimir
          </button>
        </div>
      </div>

      {/* Axis scale controls */}
      <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700 flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-slate-400 font-semibold">Escala de ejes</span>
          {/* Botones de zoom manual */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyZoom(2)}
              title="Zoom in ×2"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 transition-all"
            >
              <ZoomIn size={12} />
              +
            </button>
            <button
              type="button"
              onClick={() => applyZoom(0.5)}
              title="Zoom out ×2"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 transition-all"
            >
              <ZoomOut size={12} />
              −
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset zoom"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 transition-all"
            >
              <Maximize2 size={12} />
              ↔
            </button>
            <button
              type="button"
              onClick={handleZoomToCrossovers}
              title="Zoom a puntos de cruce"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 border border-orange-600/30 transition-all"
            >
              <Target size={12} />
              ⊡ Cruces
            </button>
          </div>
        </div>
        <AxisControls
          label="Eje X"
          isLog={xLogScale}
          onToggleLog={setXLogScale}
          minVal={xMinInput}
          maxVal={xMaxInput}
          onMinChange={setXMinInput}
          onMaxChange={setXMaxInput}
        />
        <AxisControls
          label="Eje Y"
          isLog={yLogScale}
          onToggleLog={setYLogScale}
          minVal={yMinInput}
          maxVal={yMaxInput}
          onMinChange={setYMinInput}
          onMaxChange={setYMaxInput}
        />
        <p className="text-[10px] text-slate-500">
          💡 Scroll sobre la gráfica para zoom centrado en cursor · Arrastrar para pan · Shift+arrastrar para zoom por caja
        </p>
      </div>

      {/* Reference digital machine selector */}
      <div className="flex flex-col gap-1.5 bg-slate-800/60 rounded-lg p-3 border border-slate-700">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs text-slate-400 font-medium whitespace-nowrap">
            Máquina digital de referencia (eje X):
          </label>
          <select
            value={refMachineDisplay}
            onChange={(e) => setRefMachineDisplay(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            {DIGITAL_REFERENCE_MACHINES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            El eje X son los metros que corre esta máquina digital. Todas las curvas usan el mismo eje X.
          </span>
        </div>
        {validationText && (
          <p className="text-[11px] text-slate-500 font-mono">{validationText}</p>
        )}
      </div>

      {/* CAMBIO 3 — Legend with color pickers */}
      <div className="flex flex-wrap gap-2 items-center">
        {activeMachines.map((id) => {
          const hidden = hiddenCurves.has(id);
          const reg = regressions[id];
          const color = machineColors[id] || DEFAULT_MACHINE_COLORS[id] || '#94a3b8';
          const mName = machineName(id);
          return (
            <div
              key={id}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                hidden
                  ? 'border-slate-700 bg-slate-800/50 text-slate-600' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <div className="relative flex-shrink-0">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(id, e.target.value)}
                  className="w-4 h-4 rounded-full cursor-pointer border-0 bg-transparent p-0 opacity-0 absolute inset-0"
                  title={`Cambiar color de ${mName}`}
                />
                <span
                  className="w-3 h-3 rounded-full block"
                  style={{ backgroundColor: hidden ? '#475569' : color }}
                />
              </div>
              <button
                type="button"
                onClick={() => toggleCurve(id)}
                className="flex items-center gap-1"
              >
                <span style={{ color: hidden ? '#475569' : color }} className="font-semibold">
                  {mName}
                </span>
                {!hidden && reg && reg.A > 0 && (
                  <span className="text-slate-500 font-mono text-[10px]">
                    {reg.A.toLocaleString()}/x^{reg.alpha}+{reg.B.toLocaleString()}
                  </span>
                )}
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleResetColors}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 transition-all"
          title="Restaurar colores default"
        >
          <RotateCcw size={10} />
          Reset colores
        </button>
      </div>

      {/* CORRECCIÓN 2 — Chart con zoom captivo (scroll no mueve la página) */}
      <div
        ref={chartContainerRef}
        className="w-full relative select-none"
        style={{
          height: 380,
          cursor: cursorStyle,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curveData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="x"
              type="number"
              scale={xLogScale ? 'log' : 'auto'}
              domain={xDomain}
              allowDataOverflow
              tickFormatter={(v) => {
                if (xLogScale) return logTickFormatterX(v);
                return `${Number(v).toFixed(0)}m`;
              }}
              stroke="#475569"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{
                value: `Metros lineales (ref. ${refMachineDisplay})`,
                position: 'insideBottom',
                offset: -5,
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <YAxis
              scale={yLogScale ? 'log' : 'auto'}
              domain={yDomain}
              allowDataOverflow
              tickFormatter={(v) => {
                if (yLogScale) return logTickFormatterY(v);
                return `$${Number(v).toFixed(0)}`;
              }}
              stroke="#475569"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{
                value: 'Costo/Millar MXN',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            {activeMachines.map((id) => {
              if (hiddenCurves.has(id)) return null;
              const color = machineColors[id] || DEFAULT_MACHINE_COLORS[id] || '#94a3b8';
              return (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: color }}
                  name={machineName(id)}
                  connectNulls={false}
                />
              );
            })}
            {/* User scale points */}
            {userScalePoints
              .filter((pt) => !hiddenCurves.has(pt.machineId))
              .map((pt, i) => (
                <ReferenceDot
                  key={i}
                  x={pt.x}
                  y={pt.y}
                  r={5}
                  fill={machineColors[pt.machineId] || DEFAULT_MACHINE_COLORS[pt.machineId] || '#94a3b8'}
                  stroke="#0f172a"
                  strokeWidth={2}
                />
              ))}
            {/* Crossing points en posición matemáticamente exacta (sobre datos suavizados) */}
            {crossingsInRange
              .filter((c) => !hiddenCurves.has(c.machine1) && !hiddenCurves.has(c.machine2))
              .map((c, i) => {
                const m1Name = machineName(c.machine1);
                const m2Name = machineName(c.machine2);
                return (
                  <ReferenceDot
                    key={`cross-${i}`}
                    x={c.xMetros}
                    y={c.y}
                    r={7}
                    fill="transparent"
                    stroke={c.isDigitalAnalog ? '#22c55e' : '#f59e0b'}
                    strokeWidth={2}
                    label={{
                      value: `${m1Name}=${m2Name}`,
                      position: 'top',
                      fill: c.isDigitalAnalog ? '#22c55e' : '#f59e0b',
                      fontSize: 9,
                    }}
                  />
                );
              })}
          </LineChart>
        </ResponsiveContainer>

        {/* Shift+drag selection box */}
        {isShiftDrag && shiftBox && shiftBox.width > 2 && shiftBox.height > 2 && (
          <div
            className="absolute border-2 border-orange-400 bg-orange-400/10 pointer-events-none"
            style={{
              left: shiftBox.left,
              top: shiftBox.top,
              width: shiftBox.width,
              height: shiftBox.height,
            }}
          />
        )}
      </div>

      {/* Crossings summary badges */}
      {crossingsInRange.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {crossingsInRange
            .filter((c) => !hiddenCurves.has(c.machine1) && !hiddenCurves.has(c.machine2))
            .map((c, i) => {
              const m1Name = machineName(c.machine1);
              const m2Name = machineName(c.machine2);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${
                    c.isDigitalAnalog
                      ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full border-2 flex-shrink-0 ${
                      c.isDigitalAnalog ? 'border-green-400' : 'border-amber-400'
                    }`}
                  />
                  <span>
                    <span className="font-semibold">{m1Name}</span> y{' '}
                    <span className="font-semibold">{m2Name}</span> se igualan en{' '}
                    <span className="font-mono">{fmtInt(c.xMetros)}m</span> /{' '}
                    <span className="font-mono">{fmt2(c.xMillares)}k</span> /{' '}
                    <span className="font-mono">${fmt2(c.y)} MXN/millar</span>
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {/* Out of-range banner */}
      {crossingsOutOfRange.filter((c) => !hiddenCurves.has(c.machine1) && !hiddenCurves.has(c.machine2)).length > 0 && (
        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-300">
            <span className="font-semibold">
              Hay {crossingsOutOfRange.filter((c) => !hiddenCurves.has(c.machine1) && !hiddenCurves.has(c.machine2)).length} punto(s) de cruce fuera del rango visible.
            </span>
            {(() => {
              const visible = crossingsOutOfRange.filter((c) => !hiddenCurves.has(c.machine1) && !hiddenCurves.has(c.machine2));
              if (visible.length === 0) return null;
              const closest = visible.reduce((prev, curr) => {
                const prevDist = Math.min(Math.abs(prev.xMetros - visibleXMin), Math.abs(prev.xMetros - visibleXMax));
                const currDist = Math.min(Math.abs(curr.xMetros - visibleXMin), Math.abs(curr.xMetros - visibleXMax));
                return currDist < prevDist ? curr : prev;
              });
              return (
                <span className="ml-1">
                  El más cercano: <span className="font-semibold">{machineName(closest.machine1)}</span> supera a{' '}
                  <span className="font-semibold">{machineName(closest.machine2)}</span> en{' '}
                  <span className="font-mono">{fmtInt(closest.xMetros)} metros</span> /{' '}
                  <span className="font-mono">{fmt2(closest.xMillares)}k millares</span>.{' '}
                  ↗ Fuera del rango — haz zoom out para visualizarlo.
                </span>
              );
            })()}
          </div>
        </div>
      )}

      {/* Full crossings table */}
      <div className="mt-2">
        <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
          Puntos de cambio de tecnología
        </h4>
        {allCrossings.filter((c) => !hiddenCurves.has(c.machine1) && !hiddenCurves.has(c.machine2)).length === 0 ? (
          <p className="text-xs text-slate-500 italic px-1">
            No hay cruces calculados. Considera ampliar el rango o verificar los parámetros.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="text-left px-3 py-2 text-slate-400 font-medium">Máquina A</th>
                  <th className="text-left px-3 py-2 text-slate-400 font-medium">Máquina B</th>
                  <th className="text-right px-3 py-2 text-slate-400 font-medium">Metros cruce</th>
                  <th className="text-right px-3 py-2 text-slate-400 font-medium">Escala equiv. (k)</th>
                  <th className="text-right px-3 py-2 text-slate-400 font-medium">Costo/millar en cruce</th>
                  <th className="text-left px-3 py-2 text-slate-400 font-medium">Conviene A</th>
                  <th className="text-left px-3 py-2 text-slate-400 font-medium">Conviene B</th>
                  <th className="text-center px-3 py-2 text-slate-400 font-medium">En rango</th>
                </tr>
              </thead>
              <tbody>
                {allCrossings
                  .filter((c) => !hiddenCurves.has(c.machine1) && !hiddenCurves.has(c.machine2))
                  .map((c, i) => {
                    const m1Name = machineName(c.machine1);
                    const m2Name = machineName(c.machine2);
                    const pts1 = (curveData as Record<string, number>[]).map(d => ({ x: d.x, y: d[c.machine1] })).filter(p => p.y > 0 && isFinite(p.y));
                    const pts2 = (curveData as Record<string, number>[]).map(d => ({ x: d.x, y: d[c.machine2] })).filter(p => p.y > 0 && isFinite(p.y));
                    let belowConviene = m1Name;
                    let aboveConviene = m2Name;
                    if (pts1.length > 0 && pts2.length > 0) {
                      const xTest = c.xMetros * 0.5;
                      const p1Near = pts1.reduce((a, b) => Math.abs(b.x - xTest) < Math.abs(a.x - xTest) ? b : a);
                      const p2Near = pts2.reduce((a, b) => Math.abs(b.x - xTest) < Math.abs(a.x - xTest) ? b : a);
                      belowConviene = p1Near.y <= p2Near.y ? m1Name : m2Name;
                      aboveConviene = belowConviene === m1Name ? m2Name : m1Name;
                    }
                    const inRange = c.xMetros >= visibleXMin && c.xMetros <= visibleXMax;
                    return (
                      <tr
                        key={i}
                        className={`border-b border-slate-700/50 transition-colors ${
                          !inRange
                            ? 'bg-slate-700/40 opacity-75'
                            : c.isDigitalAnalog
                            ? 'bg-green-500/5 hover:bg-green-500/10' : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="px-3 py-2">
                          <span
                            className="font-semibold"
                            style={{ color: machineColors[c.machine1] || DEFAULT_MACHINE_COLORS[c.machine1] || '#94a3b8' }}
                          >
                            {m1Name}
                          </span>
                          {c.isDigitalAnalog && (
                            <span className="ml-1.5 text-[10px] text-green-400 font-medium">★</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="font-semibold"
                            style={{ color: machineColors[c.machine2] || DEFAULT_MACHINE_COLORS[c.machine2] || '#94a3b8' }}
                          >
                            {m2Name}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-200">
                          {fmtInt(c.xMetros)} m
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-200">
                          {fmt2(c.xMillares)}k
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-orange-300 font-semibold">
                          ${fmt2(c.y)} MXN
                        </td>
                        <td className="px-3 py-2 text-slate-300">{belowConviene}</td>
                        <td className="px-3 py-2 text-slate-300">{aboveConviene}</td>
                        <td className="px-3 py-2 text-center">
                          {inRange ? (
                            <span className="text-green-400 font-medium">✓</span>
                          ) : (
                            <span className="text-amber-400 text-[10px] font-medium flex items-center justify-center gap-0.5">
                              ↗ <span className="hidden sm:inline">Fuera del rango</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center gap-4 px-3 py-1.5 bg-slate-800/50 border-t border-slate-700">
              {allCrossings.some((c) => c.isDigitalAnalog) && (
                <p className="text-[10px] text-green-400">
                  ★ Cruce digital ↔ analógico — punto clave para decisión de tecnología
                </p>
              )}
              {crossingsOutOfRange.length > 0 && (
                <p className="text-[10px] text-amber-400">
                  ↗ Fuera del rango visible — amplía el Eje X para visualizarlo
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Print-only table */}
      <div className="hidden print:block mt-6">
        <h4 className="font-bold text-black text-sm mb-3">Resumen por escala</h4>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-1 pr-3">Máquina</th>
              <th className="text-left py-1 pr-3">Ecuación f(x)</th>
              {scales.map((s) => (
                <th key={s} className="text-right py-1 px-2">{s}k</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeMachines.map((id) => {
              const reg = regressions[id];
              const mName = machineName(id);
              return (
                <tr key={id} className="border-b border-gray-300">
                  <td className="py-1 pr-3 font-semibold">{mName}</td>
                  <td className="py-1 pr-3 font-mono text-[10px]">
                    {reg && reg.A > 0 ? `${reg.A.toLocaleString()}/x^${reg.alpha} + ${reg.B.toLocaleString()}` : '—'}
                  </td>
                  {scales.map((s) => {
                    const r = (allScaleResults[s] || []).find((res) => res.machine_id === id);
                    return (
                      <td key={s} className="text-right py-1 px-2 font-mono">
                        {r?.elegible ? `$${fmt2(r.costo_millar_usd)}` : '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}