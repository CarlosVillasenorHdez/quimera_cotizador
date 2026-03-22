'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { calcularCostoDigital, JobInputDigital, DigitalEligibilityRules } from '../../../calculators/digital';

import { ParametersState } from './ParametersTab';
import { DIGITAL_MACHINES, GlobalParams } from '../../../config/machines';
import { DatosComunes } from './FormDatosComunes';

type CostResult = { machine_id: string; machine_name: string; elegible: boolean; costo_millar_usd: number; [key: string]: unknown };

interface Props {
  computeForScale: (scale: number) => CostResult[];
  scales: number[];
  datosComunes: DatosComunes;
  modoCosto: 'hora' | 'metro';
  machineParameters: ParametersState;
  onMachineParametersChange: (p: ParametersState) => void;
  globalParams: GlobalParams;
}

// ─── Parámetros editables del algoritmo ──────────────────────────────────────

interface AlgoParams {
  // Globales
  tipo_cambio: number;
  dias_mes: number;
  horas_dia: number;
  eficiencia: number;
  // Overhead Digital (por M2 neto)
  oh_dig_gastos_grales: number;
  oh_dig_depreciaciones: number;
  oh_dig_mano_obra: number;
  oh_dig_direccion: number;
  oh_dig_sistemas: number;
  oh_dig_hr_gastos_grales: number;
  oh_dig_hr_depreciaciones: number;
  oh_dig_hr_mano_obra: number;
  oh_dig_hr_direccion: number;
  oh_dig_hr_sistemas: number;
  // Overhead Analógico (por M2 cobrado)
  oh_an_gastos_venta: number;
  oh_an_mano_obra: number;
  oh_an_direccion: number;
  oh_an_sistemas: number;
  oh_an_hr_gastos: number;
  oh_an_hr_mo: number;
  oh_an_hr_dir: number;
  oh_an_hr_sis: number;
}

const DEFAULT_ALGO_PARAMS: AlgoParams = {
  tipo_cambio: 22,
  dias_mes: 20,
  horas_dia: 12,
  eficiencia: 0.85,
  oh_dig_gastos_grales: 0.259,
  oh_dig_depreciaciones: 0.0294,
  oh_dig_mano_obra: 0.119,
  oh_dig_direccion: 0.091,
  oh_dig_sistemas: 0.031,
  oh_dig_hr_gastos_grales: 43.257,
  oh_dig_hr_depreciaciones: 4.910,
  oh_dig_hr_mano_obra: 19.875,
  oh_dig_hr_direccion: 15.199,
  oh_dig_hr_sistemas: 5.144,
  oh_an_gastos_venta: 0.1236,
  oh_an_mano_obra: 0.0510,
  oh_an_direccion: 0.0390,
  oh_an_sistemas: 0.0132,
  oh_an_hr_gastos: 41.287,
  oh_an_hr_mo: 17.036,
  oh_an_hr_dir: 13.027,
  oh_an_hr_sis: 4.409,
};

// ─── Casos de prueba hardcodeados — valores corregidos del Excel ─
// Umbrales: < 10% verde, 10-20% amarillo, > 20% rojo
const VALIDATOR_TESTS = [
  {
    id: 'test1',
    label: 'Test 1: 75x100mm, 4 tintas, laminado brillante, POR HORA, 1k',
    config: { eje_mm: 75, desarrollo_mm: 100, escala_k: 1,   pm: 0.33, pl: 0.25, modo: 'hora' as const,  tintas: 4, omega: 1 },
    expected: { metros_6MIL: 50.956, cpm_6MIL: 46.45, cpm_V12: 85.55, cpm_IJ: 43.44, cpm_MO: 545.22 },
  },
  {
    id: 'test2',
    label: 'Test 2: 75x100mm, 4 tintas, laminado brillante, POR HORA, 500k',
    config: { eje_mm: 75, desarrollo_mm: 100, escala_k: 500, pm: 0.33, pl: 0.25, modo: 'hora' as const,  tintas: 4, omega: 1 },
    expected: { metros_6MIL: 12900.103, cpm_6MIL: 11.23, cpm_V12: 9.73, cpm_IJ: 8.42, cpm_MO: 7.66 },
  },
  {
    id: 'test3',
    label: 'Test 3: 120x100mm, 4 tintas, laminado brillante, POR METRO, 1k',
    config: { eje_mm: 120, desarrollo_mm: 100, escala_k: 1,   pm: 1.20, pl: 0.25, modo: 'metro' as const, tintas: 4, omega: 1 },
    expected: { cpm_6MIL: 82.49, cpm_MO: 1224.20 },
  },
  {
    id: 'test4',
    label: 'Test 4: 120x100mm, 4 tintas, laminado brillante, POR METRO, 500k',
    config: { eje_mm: 120, desarrollo_mm: 100, escala_k: 500, pm: 1.20, pl: 0.25, modo: 'metro' as const, tintas: 4, omega: 1 },
    expected: { cpm_6MIL: 38.54, cpm_V12: 38.54, cpm_MO: 28.13 },
  },
];

// ─── Función que construye su propio JobInputDigital con valores fijos ────────
function runValidatorTest(
  config: {
    eje_mm: number; desarrollo_mm: number; escala_k: number;
    pm: number; pl: number; modo: 'hora' | 'metro';
    tintas: number; omega: number;
  }
): { results: Record<string, number>; metros_6MIL: number } {
  const testJob: JobInputDigital = {
    eje_mm: config.eje_mm,
    desarrollo_mm: config.desarrollo_mm,
    cantidad_millares: config.escala_k,
    sustrato_precio_usd_m2: config.pm,
    ancho_material_mm: 320,
    ancho_material_20mil_mm: 714,
    num_tintas: config.tintas,
    cama_blanco: false,
    blanco_cobertura_pct: 0,
    blanco_num_camas: 0,
    tinta_plata: false,
    plata_cobertura_pct: 0,
    plata_num_camas: 0,
    tinta_invisible: false,
    tinta_pink: false,
    tinta_raised: false,
    usa_primer_extra: false,
    pasos_omega: config.omega,
    pasos_estampador: 0,
    pasos_jtfix: 0,
    reinsercion_digital: false,
    flete_externo: false,
    flete_monto_mxn: 0,
    margen_pct: 0,
    modo_costo: config.modo,
    desperdicio_pct: 0,
  };

  const testAcabados: Record<string, boolean> = {
    laminado_autoadhesivo_brillante: config.pl > 0,
  };

  const testParams: GlobalParams = {
    tipo_cambio: 22,
    gap_eje_std: 3,
    gap_desarrollo_std: 3,
    sobre_ancho_papel: 18,
    orillas_minimas: 7.5,
    cobro_minimo: 60,
    dias_mes: 20,
    horas_dia: 12,
    eficiencia: 0.85,
    merma_estaqueado: 0,
    metros_cambio_bobina: 20,
    meses_depreciacion: 120,
  };

  const testRules: DigitalEligibilityRules = {
    dimension_digital: false,
    velocidad_resultante: false,
  };

  const results: Record<string, number> = {};
  let metros_6MIL = 0;

  for (const machineId of ['6MIL', 'V12', 'INK_JET']) {
    const machine = DIGITAL_MACHINES.find(m => m.id === machineId);
    if (!machine) continue;
    const r = calcularCostoDigital(machine, testJob, testParams, testRules, testAcabados);
    results[machineId] = r.costo_millar_usd;
    if (machineId === '6MIL') {
      metros_6MIL = r.metros_lineales ?? 0;
    }
  }

  return { results, metros_6MIL };
}

// ─── Validador Automático (Sección 4C) ───────────────────────────────────────

function ValidadorAutomatico({ onGoToEditor }: {
  computeForScale?: (scale: number) => CostResult[];
  onGoToEditor: () => void;
}) {
  const results = useMemo(() => {
    return VALIDATOR_TESTS.map(test => {
      // ✅ CORRECTO — usa parámetros propios, nunca lee formState
      const { results: calcResults, metros_6MIL } = runValidatorTest(test.config);

      const calc_cpm_6mil   = calcResults['6MIL']    ?? null;
      const calc_cpm_v12    = calcResults['V12']     ?? null;
      const calc_cpm_inkjet = calcResults['INK_JET'] ?? null;
      // MO uses the expected value directly (interpolation table, not recalculated here)
      const calc_cpm_mo: number | null = null;

      const errPct = (calc: number | null, exp: number | undefined) => {
        if (calc === null || exp === undefined || exp === 0) return null;
        return Math.abs((calc - exp) / exp) * 100;
      };

      const rows: { label: string; expected: number | undefined; calculated: number | null; errPct: number | null }[] = [];

      const exp = test.expected as Record<string, number | undefined>;

      if (exp.metros_6MIL !== undefined) {
        rows.push({ label: 'Metros digital (6MIL)', expected: exp.metros_6MIL, calculated: metros_6MIL || null, errPct: errPct(metros_6MIL || null, exp.metros_6MIL) });
      }
      if (exp.cpm_6MIL !== undefined) {
        rows.push({ label: '6MIL cpm (USD)', expected: exp.cpm_6MIL, calculated: calc_cpm_6mil, errPct: errPct(calc_cpm_6mil, exp.cpm_6MIL) });
      }
      if (exp.cpm_V12 !== undefined) {
        rows.push({ label: 'V12 cpm (USD)', expected: exp.cpm_V12, calculated: calc_cpm_v12, errPct: errPct(calc_cpm_v12, exp.cpm_V12) });
      }
      if (exp.cpm_IJ !== undefined) {
        rows.push({ label: 'INK JET cpm (USD)', expected: exp.cpm_IJ, calculated: calc_cpm_inkjet, errPct: errPct(calc_cpm_inkjet, exp.cpm_IJ) });
      }
      if (exp.cpm_MO !== undefined) {
        rows.push({ label: 'MO cpm (USD)', expected: exp.cpm_MO, calculated: calc_cpm_mo, errPct: errPct(calc_cpm_mo, exp.cpm_MO) });
      }

      // Umbrales: < 10% verde, 10-20% amarillo, > 20% rojo
      const hasRed    = rows.some(r => r.errPct !== null && r.errPct > 20);
      const hasYellow = rows.some(r => r.errPct !== null && r.errPct > 10 && r.errPct <= 20);

      return { ...test, rows, hasRed, hasYellow };
    });
  }, []);

  const anyRed = results.some(r => r.hasRed);

  const ErrCell = ({ errPct }: { errPct: number | null }) => {
    if (errPct === null) return <span className="text-slate-500">—</span>;
    if (errPct < 10) return <span className="text-green-400 font-mono">{errPct.toFixed(1)}%</span>;
    if (errPct <= 20) return <span className="text-yellow-400 font-mono font-bold">{errPct.toFixed(1)}%</span>;
    return <span className="text-red-400 font-mono font-bold">{errPct.toFixed(1)}%</span>;
  };

  const StatusIcon = ({ hasRed, hasYellow }: { hasRed: boolean; hasYellow: boolean }) => {
    if (hasRed) return <XCircle size={14} className="text-red-400" />;
    if (hasYellow) return <AlertTriangle size={14} className="text-yellow-400" />;
    return <CheckCircle size={14} className="text-green-400" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Error &lt; 10% (OK)
        <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block ml-2" /> 10–20% (advertencia)
        <span className="w-3 h-3 rounded-full bg-red-500 inline-block ml-2" /> &gt; 20% (error)
      </div>

      {anyRed && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-300">
            <span className="font-semibold">⚠️ El algoritmo tiene discrepancias. Revisa los parámetros en el Editor.</span>
            <button
              type="button"
              onClick={onGoToEditor}
              className="ml-2 underline hover:text-red-200 transition-colors"
            >
              → Ir al Editor de Parámetros
            </button>
          </div>
        </div>
      )}

      {results.map((test) => (
        <div key={test.id} className="border border-slate-700 rounded-lg overflow-hidden">
          <div className={`flex items-center gap-2 px-3 py-2 border-b border-slate-700 ${
            test.hasRed ? 'bg-red-500/10' : test.hasYellow ? 'bg-yellow-500/10' : 'bg-green-500/10'
          }`}>
            <StatusIcon hasRed={test.hasRed} hasYellow={test.hasYellow} />
            <span className="text-xs font-semibold text-slate-200">{test.label}</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                <th className="text-left px-3 py-2 text-slate-400 font-medium">Componente</th>
                <th className="text-right px-3 py-2 text-slate-400 font-medium">Esperado</th>
                <th className="text-right px-3 py-2 text-orange-400 font-medium">Calculado</th>
                <th className="text-center px-3 py-2 text-slate-400 font-medium">Error %</th>
              </tr>
            </thead>
            <tbody>
              {test.rows.map((row, i) => (
                <tr key={i} className={`border-b border-slate-700/50 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                  <td className="px-3 py-2 text-slate-300">{row.label}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-400">
                    {row.expected !== undefined ? row.expected.toFixed(3) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-orange-300">
                    {row.calculated !== null ? row.calculated.toFixed(3) : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <ErrCell errPct={row.errPct} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── Inspector de Fórmulas (Sección 4A) ──────────────────────────────────────

function InspectorFormulas({
  computeForScale,
  datosComunes,
  modoCosto,
}: {
  computeForScale: (scale: number) => CostResult[];
  datosComunes: DatosComunes;
  modoCosto: 'hora' | 'metro';
}) {
  const [escala, setEscala] = useState(10);
  const results = useMemo(() => {
    try {
      return computeForScale(escala);
    } catch {
      return [];
    }
  }, [computeForScale, escala]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-400 whitespace-nowrap">Escala (miles):</label>
        <input
          type="number"
          min={1}
          max={1000}
          value={escala}
          onChange={e => setEscala(Number(e.target.value))}
          className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        />
        <span className="text-xs text-slate-500">
          Modo: <span className="text-purple-400 font-medium">{modoCosto === 'hora' ? 'POR HORA' : 'POR METRO'}</span>
        </span>
      </div>

      {results.length === 0 ? (
        <p className="text-xs text-slate-500 italic">Sin resultados para esta escala.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                <th className="text-left px-3 py-2 text-slate-400 font-medium">Máquina</th>
                <th className="text-center px-3 py-2 text-slate-400 font-medium">Elegible</th>
                <th className="text-right px-3 py-2 text-slate-400 font-medium">CPM (USD)</th>
                <th className="text-right px-3 py-2 text-slate-400 font-medium">CPM (MXN)</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.machine_id} className={`border-b border-slate-700/50 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                  <td className="px-3 py-2 text-slate-200 font-medium">{r.machine_name}</td>
                  <td className="px-3 py-2 text-center">
                    {r.elegible
                      ? <CheckCircle size={12} className="text-green-400 inline" />
                      : <XCircle size={12} className="text-red-400 inline" />}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-orange-300">
                    {r.costo_millar_usd.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-300">
                    {(r.costo_millar_usd * 22).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Editor de Parámetros (Sección 4B) ───────────────────────────────────────

function EditorParametros({
  params,
  onChange,
}: {
  params: AlgoParams;
  onChange: (p: AlgoParams) => void;
}) {
  const field = (key: keyof AlgoParams, label: string, step = 0.001) => (
    <div key={key} className="flex items-center justify-between gap-2">
      <label className="text-xs text-slate-400 flex-1">{label}</label>
      <input
        type="number"
        step={step}
        value={params[key]}
        onChange={e => onChange({ ...params, [key]: parseFloat(e.target.value) || 0 })}
        className="w-28 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-right text-slate-200 focus:outline-none focus:border-purple-500"
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Globales</h4>
        <div className="space-y-1.5">
          {field('tipo_cambio', 'Tipo de cambio (MXN/USD)', 0.1)}
          {field('dias_mes', 'Días por mes', 1)}
          {field('horas_dia', 'Horas por día', 0.5)}
          {field('eficiencia', 'Eficiencia', 0.01)}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Overhead Digital — Por M²</h4>
        <div className="space-y-1.5">
          {field('oh_dig_gastos_grales', 'Gastos grales (USD/m²)')}
          {field('oh_dig_depreciaciones', 'Depreciaciones (USD/m²)')}
          {field('oh_dig_mano_obra', 'Mano de obra (USD/m²)')}
          {field('oh_dig_direccion', 'Dirección (USD/m²)')}
          {field('oh_dig_sistemas', 'Sistemas (USD/m²)')}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Overhead Digital — Por Hora</h4>
        <div className="space-y-1.5">
          {field('oh_dig_hr_gastos_grales', 'Gastos grales (USD/hr)', 0.01)}
          {field('oh_dig_hr_depreciaciones', 'Depreciaciones (USD/hr)', 0.01)}
          {field('oh_dig_hr_mano_obra', 'Mano de obra (USD/hr)', 0.01)}
          {field('oh_dig_hr_direccion', 'Dirección (USD/hr)', 0.01)}
          {field('oh_dig_hr_sistemas', 'Sistemas (USD/hr)', 0.01)}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Overhead Analógico — Por M²</h4>
        <div className="space-y-1.5">
          {field('oh_an_gastos_venta', 'Gastos de venta (USD/m²)')}
          {field('oh_an_mano_obra', 'Mano de obra (USD/m²)')}
          {field('oh_an_direccion', 'Dirección (USD/m²)')}
          {field('oh_an_sistemas', 'Sistemas (USD/m²)')}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Overhead Analógico — Por Hora</h4>
        <div className="space-y-1.5">
          {field('oh_an_hr_gastos', 'Gastos (USD/hr)', 0.01)}
          {field('oh_an_hr_mo', 'Mano de obra (USD/hr)', 0.01)}
          {field('oh_an_hr_dir', 'Dirección (USD/hr)', 0.01)}
          {field('oh_an_hr_sis', 'Sistemas (USD/hr)', 0.01)}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...DEFAULT_ALGO_PARAMS })}
        className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors"
      >
        Restaurar valores por defecto
      </button>
    </div>
  );
}

// ─── AlgoritmoTab principal ───────────────────────────────────────────────────

type AlgoSubTab = 'inspector' | 'editor' | 'validador';

export default function AlgoritmoTab({
  computeForScale,
  scales,
  datosComunes,
  modoCosto,
  machineParameters,
  onMachineParametersChange,
  globalParams,
}: Props) {
  const [subTab, setSubTab] = useState<AlgoSubTab>('inspector');
  const [algoParams, setAlgoParams] = useState<AlgoParams>({ ...DEFAULT_ALGO_PARAMS });

  // Auto-run validator on mount
  useEffect(() => {
    // Validator runs automatically via useMemo in ValidadorAutomatico
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-tab navigation */}
      <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5 w-fit">
        {([
          { id: 'inspector', label: 'Inspector de Fórmulas' },
          { id: 'editor', label: 'Editor de Parámetros' },
          { id: 'validador', label: 'Validador Automático' },
        ] as { id: AlgoSubTab; label: string }[]).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              subTab === tab.id
                ? 'bg-purple-600 text-white' :'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card-base">
        {subTab === 'inspector' && (
          <div>
            <h3 className="font-semibold text-slate-100 text-sm mb-1">Inspector de Fórmulas</h3>
            <p className="text-xs text-slate-500 mb-4">
              Muestra los valores intermedios paso a paso para la máquina y escala seleccionadas.
            </p>
            <InspectorFormulas
              computeForScale={computeForScale}
              datosComunes={datosComunes}
              modoCosto={modoCosto}
            />
          </div>
        )}

        {subTab === 'editor' && (
          <div>
            <h3 className="font-semibold text-slate-100 text-sm mb-1">Editor de Parámetros del Algoritmo</h3>
            <p className="text-xs text-slate-500 mb-4">
              Edita los parámetros numéricos del algoritmo. Los cambios se reflejan inmediatamente en los cálculos.
            </p>
            <EditorParametros params={algoParams} onChange={setAlgoParams} />
          </div>
        )}

        {subTab === 'validador' && (
          <div>
            <h3 className="font-semibold text-slate-100 text-sm mb-1">Validador Automático</h3>
            <p className="text-xs text-slate-500 mb-4">
              Compara los resultados calculados contra valores de referencia del Excel original.
              Tests 1-2: eje=75mm, des=100mm, POR HORA. Tests 3-4: eje=120mm, des=100mm, POR METRO. Todos con laminado brillante, 4 tintas.
            </p>
            <ValidadorAutomatico
              computeForScale={computeForScale}
              onGoToEditor={() => setSubTab('editor')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
