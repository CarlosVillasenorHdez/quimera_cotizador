'use client';
import React, { useState, useMemo } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { DigitalCostResult } from '../../../calculators/digital';
import { AnalogCostResult, seleccionarCilindroOptimo } from '../../../calculators/analogico';
import { ParametersState } from './ParametersTab';
import { GlobalParams } from '../../../config/machines';
import { DatosComunes } from './FormDatosComunes';

type CostResult = DigitalCostResult | AnalogCostResult;

interface Props {
  computeForScale: (scale: number) => CostResult[];
  scales: number[];
  datosComunes: DatosComunes;
  modoCosto: 'hora' | 'metro';
  machineParameters: ParametersState;
  onMachineParametersChange: (p: ParametersState) => void;
  globalParams: GlobalParams;
}

function N(v: number | null | undefined, dec = 4) {
  if (v == null) return '—';
  return v.toFixed(dec);
}

function TableRow({ label, value, unit = '', hl = false }: {
  label: string; value: string | number; unit?: string; hl?: boolean;
}) {
  return (
    <tr className={`border-b border-slate-700/40 ${hl ? 'bg-orange-950/20' : ''}`}>
      <td className="px-3 py-1.5 text-xs text-slate-400">{label}</td>
      <td className="px-3 py-1.5 text-xs text-right font-mono text-slate-200">
        {value}{unit && <span className="text-slate-500 ml-1">{unit}</span>}
      </td>
    </tr>
  );
}

function Sec({ title, children, open: initOpen = true }: {
  title: string; children: React.ReactNode; open?: boolean;
}) {
  const [open, setOpen] = useState(initOpen);
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden mb-2">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-left">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{title}</span>
        {open ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
      </button>
      {open && <div className="bg-slate-900/40"><table className="w-full"><tbody>{children}</tbody></table></div>}
    </div>
  );
}

function DigBreakdown({ r }: { r: DigitalCostResult }) {
  return (
    <div className="space-y-1 py-2 px-2">
      <Sec title="Frames y metros">
        <TableRow label="Cavidades al eje" value={r.cavidades_usadas} />
        <TableRow label="Frames de tiro" value={r.frames_tiro} />
        <TableRow label="Metros impresión" value={N(r.metros_lineales - 20, 2)} unit="m" />
        <TableRow label="Metros total" value={N(r.metros_lineales, 2)} unit="m" />
        <TableRow label="M² totales" value={N(r.m2_totales, 4)} unit="m²" />
        <TableRow label="Velocidad efectiva" value={r.velocidad_efectiva} unit="m/min" />
        <TableRow label="Tiempo real impresión" value={N(r.tiempo_hrs_real * 60, 2)} unit="min" />
        <TableRow label="Tiempo cobrar" value={N(r.tiempo_hrs * 60, 2)} unit="min" />
        <TableRow label="Clicks totales" value={r.clicks_totales} />
        <TableRow label="Tintas totales" value={r.tintas_totales} />
      </Sec>
      <Sec title="Costos USD por componente">
        <TableRow label="Sustrato" value={`$${N(r.costo_sustrato_usd, 4)}`} hl />
        <TableRow label="Laminado" value={`$${N(r.costo_laminado_usd, 4)}`} hl />
        <TableRow label="Clicks" value={`$${N(r.costo_click_usd, 4)}`} hl />
        <TableRow label="HP (máquina)" value={`$${N(r.costo_hp_usd, 4)}`} hl />
        <TableRow label="CEI rebobinadora" value={`$${N(r.costo_cei_usd, 4)}`} />
        <TableRow label="Omega" value={`$${N(r.costo_omega_usd, 4)}`} />
        <TableRow label="Estampador GM" value={`$${N(r.costo_estampador_usd, 4)}`} />
        <TableRow label="Overhead gtos. grales" value={`$${N(r.costo_gtos_grales_usd, 4)}`} />
        <TableRow label="Overhead gtos. dirección" value={`$${N(r.costo_gtos_direccion_usd, 4)}`} />
        <TableRow label="Envíos/flete" value={`$${N(r.costo_envios_usd, 4)}`} />
        <TableRow label="Otros acabados" value={`$${N(r.costo_acabados_usd - r.costo_laminado_usd, 4)}`} />
      </Sec>
      <Sec title="Totales">
        <TableRow label="Costo fábrica" value={`$${N(r.costo_fabrica_usd, 4)}`} hl />
        <TableRow label="Costo/millar USD" value={`$${N(r.costo_millar_usd, 4)}`} hl />
        <TableRow label="Costo/millar MXN" value={`$${N(r.costo_millar_mxn, 2)}`} hl />
      </Sec>
    </div>
  );
}

function AnaBreakdown({ r }: { r: AnalogCostResult }) {
  return (
    <div className="space-y-1 py-2 px-2">
      <Sec title="Cilindro y cavidades">
        <TableRow label="Dientes cilindro" value={r.dientes_optimos} />
        <TableRow label="Des. máx." value={N(r.des_max_mm, 3)} unit="mm" />
        <TableRow label="Gap desarrollo" value={N(r.gap_desarrollo_mm, 3)} unit="mm" />
        <TableRow label="Cavidades eje" value={r.cavidades_eje} />
        <TableRow label="Cavidades desarrollo" value={r.cavidades_desarrollo} />
        <TableRow label="Metros lineales cobrar" value={N(r.metros_lineales, 2)} unit="m" />
        <TableRow label="Velocidad efectiva" value={r.velocidad_efectiva} unit="m/min" />
        <TableRow label="Tiempo cobrar" value={N(r.tiempo_hrs * 60, 2)} unit="min" />
      </Sec>
      <Sec title="Costos USD por componente">
        <TableRow label="Material (sust. + lam.)" value={`$${N(r.costo_material_usd, 4)}`} hl />
        <TableRow label="Tiempo máquina" value={`$${N(r.costo_maquina_usd, 4)}`} hl />
        <TableRow label="Herramientas / grabados" value={`$${N(r.costo_herramientas_usd, 4)}`} />
        <TableRow label="Acabados adicionales" value={`$${N(r.costo_acabados_usd, 4)}`} />
        <TableRow label="Gasto adicional" value={`$${N(r.gasto_adicional_usd, 4)}`} />
      </Sec>
      <Sec title="Totales">
        <TableRow label="Costo fábrica" value={`$${N(r.costo_fabrica_usd, 4)}`} hl />
        <TableRow label="Costo/millar USD" value={`$${N(r.costo_millar_usd, 4)}`} hl />
        <TableRow label="Costo/millar MXN" value={`$${N(r.costo_millar_mxn, 2)}`} hl />
      </Sec>
    </div>
  );
}

function InspectorTab({ computeForScale, scales }: {
  computeForScale: (s: number) => CostResult[]; scales: number[];
}) {
  const [escala, setEscala] = useState(scales[3] ?? 10);
  const [sel, setSel] = useState<string | null>(null);
  const results = useMemo(() => { try { return computeForScale(escala); } catch { return []; } }, [computeForScale, escala]);
  const selected = results.find(r => r.machine_id === sel) ?? results[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-slate-400">Escala:</label>
        <select value={escala} onChange={e => setEscala(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-orange-500">
          {scales.map(s => <option key={s} value={s}>{s.toLocaleString()}k pzas</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {results.map(r => (
            <button key={r.machine_id} type="button" onClick={() => setSel(r.machine_id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                (sel === r.machine_id || (!sel && r === results[0]))
                  ? 'bg-orange-600 text-white'
                  : r.elegible ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
              }`}>
              {r.machine_name}
              {r.elegible
                ? <CheckCircle size={10} className="inline ml-1 text-green-400" />
                : <XCircle size={10} className="inline ml-1 text-red-400" />}
            </button>
          ))}
        </div>
      </div>
      {selected && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-slate-200">{selected.machine_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              selected.type === 'digital' ? 'bg-blue-900/50 text-blue-300' : 'bg-teal-900/50 text-teal-300'
            }`}>{selected.type}</span>
            {!selected.elegible && selected.razones_falla.length > 0 && (
              <span className="text-xs text-red-400">{selected.razones_falla.join(' · ')}</span>
            )}
          </div>
          {selected.type === 'digital'
            ? <DigBreakdown r={selected as DigitalCostResult} />
            : <AnaBreakdown r={selected as AnalogCostResult} />}
        </div>
      )}
    </div>
  );
}

function CilindrosTab({ des_mm }: { des_mm: number }) {
  const maquinas = ['MO', 'FA10', 'FA6', 'GAL1'];
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Desarrollo actual: <span className="text-orange-300 font-mono">{des_mm} mm</span></p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {maquinas.map(m => {
          const r = seleccionarCilindroOptimo(m, des_mm);
          return (
            <div key={m} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-200">{m}</span>
                {r
                  ? <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={11} />Disponible</span>
                  : <span className="text-xs text-red-400 flex items-center gap-1"><XCircle size={11} />Sin cilindro</span>}
              </div>
              {r ? (
                <table className="w-full"><tbody>
                  <TableRow label="Dientes" value={r.dientes} />
                  <TableRow label="Des. máx." value={N(r.des_max_mm, 3)} unit="mm" />
                  <TableRow label="Gap real" value={N(r.gap_mm, 3)} unit="mm" />
                  <TableRow label="Cavidades des." value={r.cav_des} />
                  <TableRow label="Des + gap" value={N(r.des_con_gap_mm, 3)} unit="mm" />
                </tbody></table>
              ) : (
                <p className="text-xs text-slate-500 italic">Sin cilindro con gap válido para este desarrollo.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MaterialesTab({ params, onChange }: { params: ParametersState; onChange: (p: ParametersState) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Sustratos</h4>
        <table className="w-full text-xs">
          <thead><tr className="bg-slate-800 border-b border-slate-700">
            <th className="text-left px-3 py-2 text-slate-400">Material</th>
            <th className="text-right px-3 py-2 text-slate-400">USD/m²</th>
          </tr></thead>
          <tbody>
            {params.sustratos.map((s, i) => (
              <tr key={s.nombre ?? i} className={`border-b border-slate-700/40 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                <td className="px-3 py-1.5 text-slate-300">{s.nombre}</td>
                <td className="px-3 py-1 text-right">
                  <input type="number" step={0.001} value={s.precio_usd_m2}
                    onChange={e => onChange({ ...params, sustratos: params.sustratos.map((x, j) =>
                      j === i ? { ...x, precio_usd_m2: parseFloat(e.target.value) || 0 } : x) })}
                    className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-right text-slate-200 focus:outline-none focus:border-orange-500" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Laminados</h4>
        <table className="w-full text-xs">
          <thead><tr className="bg-slate-800 border-b border-slate-700">
            <th className="text-left px-3 py-2 text-slate-400">Tipo</th>
            <th className="text-right px-3 py-2 text-slate-400">USD/m²</th>
          </tr></thead>
          <tbody>
            {params.laminados.map((l, i) => (
              <tr key={l.nombre ?? i} className={`border-b border-slate-700/40 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                <td className="px-3 py-1.5 text-slate-300">{l.nombre}</td>
                <td className="px-3 py-1 text-right">
                  <input type="number" step={0.001} value={l.precio_usd_m2}
                    onChange={e => onChange({ ...params, laminados: params.laminados.map((x, j) =>
                      j === i ? { ...x, precio_usd_m2: parseFloat(e.target.value) || 0 } : x) })}
                    className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-right text-slate-200 focus:outline-none focus:border-orange-500" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MaquinasTab({ params, onChange }: { params: ParametersState; onChange: (p: ParametersState) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Velocidades digitales (m/min)</h4>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead><tr className="bg-slate-800 border-b border-slate-700">
              <th className="text-left px-3 py-2 text-slate-400 w-14">Tintas</th>
              {Object.keys(params.speedTable).map(m => (
                <th key={m} className="text-center px-2 py-2 text-slate-400">{m}</th>
              ))}
            </tr></thead>
            <tbody>
              {Array.from({ length: 14 }, (_, i) => i + 1).map(t => (
                <tr key={t} className={`border-b border-slate-700/40 ${t % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                  <td className="px-3 py-1 text-slate-400 font-mono">{t}</td>
                  {Object.keys(params.speedTable).map(m => (
                    <td key={m} className="px-1 py-1 text-center">
                      <input type="number" step={1} min={0} value={params.speedTable[m]?.[t] ?? 0}
                        onChange={e => onChange({ ...params, speedTable: {
                          ...params.speedTable, [m]: { ...params.speedTable[m], [t]: parseInt(e.target.value) || 0 }
                        }})}
                        className="w-14 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs text-center text-slate-200 focus:outline-none focus:border-orange-500" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Clicks (USD/click)</h4>
        <table className="w-full text-xs">
          <thead><tr className="bg-slate-800 border-b border-slate-700">
            <th className="text-left px-3 py-2 text-slate-400">Máquina</th>
            <th className="text-right px-3 py-2 text-slate-400">Base USD</th>
            <th className="text-right px-3 py-2 text-slate-400">Margen %</th>
            <th className="text-right px-3 py-2 text-orange-400">Efectivo</th>
          </tr></thead>
          <tbody>
            {params.clickValues.map((cv, i) => (
              <tr key={cv.machine_id} className={`border-b border-slate-700/40 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                <td className="px-3 py-1.5 text-slate-300">{cv.machine_name}</td>
                <td className="px-2 py-1 text-right">
                  <input type="number" step={0.0001} value={cv.valor_click_base_usd}
                    onChange={e => onChange({ ...params, clickValues: params.clickValues.map((x, j) =>
                      j === i ? { ...x, valor_click_base_usd: parseFloat(e.target.value) || 0 } : x) })}
                    className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-right text-slate-200 focus:outline-none focus:border-orange-500" />
                </td>
                <td className="px-2 py-1 text-right">
                  <input type="number" step={1} value={Math.round(cv.margen_click * 100)}
                    onChange={e => onChange({ ...params, clickValues: params.clickValues.map((x, j) =>
                      j === i ? { ...x, margen_click: (parseFloat(e.target.value) || 0) / 100 } : x) })}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-right text-slate-200 focus:outline-none focus:border-orange-500" />
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-orange-300">
                  {(cv.valor_click_base_usd * (1 + cv.margen_click)).toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Máquinas digitales — parámetros</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-slate-800 border-b border-slate-700">
              <th className="text-left px-3 py-2 text-slate-400">Máquina</th>
              <th className="text-right px-2 py-2 text-slate-400">Frame cm</th>
              <th className="text-right px-2 py-2 text-slate-400">Setup m</th>
              <th className="text-right px-2 py-2 text-slate-400">Planilla mm</th>
              <th className="text-right px-2 py-2 text-slate-400">Tintas max</th>
            </tr></thead>
            <tbody>
              {params.digitalMachines.map((m, i) => (
                <tr key={m.id} className={`border-b border-slate-700/40 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                  <td className="px-3 py-1.5 text-slate-300 font-medium">{m.name}</td>
                  {(['frame_largo_cm', 'setup_metros', 'ancho_13_mm', 'tintas_max'] as const).map(f => (
                    <td key={f} className="px-2 py-1 text-right">
                      <input type="number" step={f === 'tintas_max' ? 1 : 0.1}
                        value={(m as unknown as Record<string, unknown>)[f] as number}
                        onChange={e => onChange({ ...params, digitalMachines: params.digitalMachines.map((x, j) =>
                          j === i ? { ...x, [f]: parseFloat(e.target.value) || 0 } : x) })}
                        className="w-20 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs text-right text-slate-200 focus:outline-none focus:border-orange-500" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Máquinas analógicas — parámetros</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-slate-800 border-b border-slate-700">
              <th className="text-left px-3 py-2 text-slate-400">Máquina</th>
              <th className="text-right px-2 py-2 text-slate-400">Ancho max</th>
              <th className="text-right px-2 py-2 text-slate-400">Vel std</th>
              <th className="text-right px-2 py-2 text-slate-400">Vel screen</th>
              <th className="text-right px-2 py-2 text-slate-400">Vel HS</th>
              <th className="text-right px-2 py-2 text-slate-400">Cab. off</th>
              <th className="text-right px-2 py-2 text-slate-400">Cab. flex</th>
            </tr></thead>
            <tbody>
              {params.analogMachines.map((m, i) => (
                <tr key={m.id} className={`border-b border-slate-700/40 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                  <td className="px-3 py-1.5 text-slate-300 font-medium">{m.name}</td>
                  {(['ancho_max_mm', 'vel_std', 'vel_screen', 'vel_hs', 'cabezas_offset', 'cabezas_flexo'] as const).map(f => (
                    <td key={f} className="px-2 py-1 text-right">
                      <input type="number" step={1}
                        value={(m as unknown as Record<string, unknown>)[f] as number}
                        onChange={e => onChange({ ...params, analogMachines: params.analogMachines.map((x, j) =>
                          j === i ? { ...x, [f]: parseFloat(e.target.value) || 0 } : x) })}
                        className="w-20 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-xs text-right text-slate-200 focus:outline-none focus:border-orange-500" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const TESTS = [
  { id: 't1', label: '6MIL · 50×50mm · pm=0.63 · lam brillante · omega=2 · stamp=2',
    scales: [1, 5, 10, 50, 100, 220, 500, 6000],
    expected: { 1:1196.68, 5:362.63, 10:258.70, 50:182.49, 100:174.62, 220:170.54, 500:168.51, 6000:167.24 },
    machine: '6MIL' },
];

function ValidadorTab({ computeForScale, scales }: {
  computeForScale: (s: number) => CostResult[]; scales: number[];
}) {
  const results = useMemo(() => TESTS.map(test => {
    const rows = test.scales.map(k => {
      const res = computeForScale(k);
      const m = res.find(r => r.machine_id === test.machine);
      const calc = m ? m.costo_millar_usd * 22 : null;
      const exp = test.expected[k as keyof typeof test.expected];
      const err = calc != null && exp ? Math.abs((calc - exp) / exp) * 100 : null;
      return { k, calc, exp, err };
    });
    const maxErr = Math.max(0, ...rows.filter(r => r.err != null).map(r => r.err!));
    return { ...test, rows, maxErr };
  }), [computeForScale]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Verde &lt;1% · Amarillo &lt;3% · Rojo ≥3%</p>
      {results.map(test => (
        <div key={test.id} className="border border-slate-700 rounded-xl overflow-hidden">
          <div className={`flex items-center gap-2 px-3 py-2.5 border-b border-slate-700 ${
            test.maxErr >= 3 ? 'bg-red-950/30' : test.maxErr >= 1 ? 'bg-yellow-950/30' : 'bg-green-950/30'
          }`}>
            {test.maxErr >= 3
              ? <AlertTriangle size={13} className="text-red-400" />
              : test.maxErr >= 1
              ? <AlertTriangle size={13} className="text-yellow-400" />
              : <CheckCircle size={13} className="text-green-400" />}
            <span className="text-xs font-medium text-slate-200">{test.label}</span>
            <span className="text-xs text-slate-500 ml-auto">Max: {test.maxErr.toFixed(2)}%</span>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="bg-slate-800/50 border-b border-slate-700">
              <th className="text-right px-3 py-1.5 text-slate-400">Escala k</th>
              <th className="text-right px-3 py-1.5 text-slate-400">Excel MXN/k</th>
              <th className="text-right px-3 py-1.5 text-orange-400">Calc MXN/k</th>
              <th className="text-center px-3 py-1.5 text-slate-400">Error %</th>
            </tr></thead>
            <tbody>
              {test.rows.map(r => (
                <tr key={r.k} className="border-b border-slate-700/30 even:bg-slate-800/20">
                  <td className="px-3 py-1.5 text-right font-mono text-slate-400">{r.k}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-400">{r.exp?.toFixed(2) ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-orange-300">{r.calc?.toFixed(2) ?? '—'}</td>
                  <td className="px-3 py-1.5 text-center font-mono">
                    {r.err == null ? <span className="text-slate-500">—</span>
                      : r.err < 1 ? <span className="text-green-400">{r.err.toFixed(2)}%</span>
                      : r.err < 3 ? <span className="text-yellow-400">{r.err.toFixed(2)}%</span>
                      : <span className="text-red-400 font-bold">{r.err.toFixed(2)}%</span>}
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

type SubTab = 'inspector' | 'cilindros' | 'materiales' | 'maquinas' | 'validador';

export default function AlgoritmoTab({
  computeForScale, scales, datosComunes,
  machineParameters, onMachineParametersChange, globalParams: _globalParams,
}: Props) {
  const [sub, setSub] = useState<SubTab>('inspector');
  const TABS: { id: SubTab; label: string }[] = [
    { id: 'inspector',  label: 'Desglose paso a paso' },
    { id: 'cilindros',  label: 'Cilindros' },
    { id: 'materiales', label: 'Materiales y acabados' },
    { id: 'maquinas',   label: 'Parámetros de máquinas' },
    { id: 'validador',  label: 'Validador vs Excel' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap bg-slate-800 rounded-lg p-0.5 gap-0.5 w-fit">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setSub(t.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              sub === t.id ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}>{t.label}</button>
        ))}
      </div>
      <div className="card-base">
        {sub === 'inspector' && (
          <div>
            <h3 className="font-semibold text-slate-100 text-sm mb-1">Desglose paso a paso</h3>
            <p className="text-xs text-slate-500 mb-4">Todos los componentes del costo y los valores intermedios que llevaron al resultado.</p>
            <InspectorTab computeForScale={computeForScale} scales={scales} />
          </div>
        )}
        {sub === 'cilindros' && (
          <div>
            <h3 className="font-semibold text-slate-100 text-sm mb-1">Cilindros disponibles</h3>
            <p className="text-xs text-slate-500 mb-4">Cilindro óptimo según inventario para el desarrollo actual.</p>
            <CilindrosTab des_mm={datosComunes.desarrollo_mm} />
          </div>
        )}
        {sub === 'materiales' && (
          <div>
            <h3 className="font-semibold text-slate-100 text-sm mb-1">Materiales y acabados</h3>
            <p className="text-xs text-slate-500 mb-4">Edita precios de sustratos y laminados. Los cambios aplican inmediatamente.</p>
            <MaterialesTab params={machineParameters} onChange={onMachineParametersChange} />
          </div>
        )}
        {sub === 'maquinas' && (
          <div>
            <h3 className="font-semibold text-slate-100 text-sm mb-1">Parámetros de máquinas</h3>
            <p className="text-xs text-slate-500 mb-4">Velocidades, clicks, frames, setups. Edita cualquier valor y el cotizador recalcula en tiempo real.</p>
            <MaquinasTab params={machineParameters} onChange={onMachineParametersChange} />
          </div>
        )}
        {sub === 'validador' && (
          <div>
            <h3 className="font-semibold text-slate-100 text-sm mb-1">Validador vs Excel</h3>
            <p className="text-xs text-slate-500 mb-4">Compara resultados contra valores verificados del Excel de referencia. Nota: el validador usa los parámetros actuales del cotizador, incluyendo omega y stamp.</p>
            <ValidadorTab computeForScale={computeForScale} scales={scales} />
          </div>
        )}
      </div>
    </div>
  );
}
