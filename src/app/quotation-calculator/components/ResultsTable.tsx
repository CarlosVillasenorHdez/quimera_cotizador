'use client';
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Table2,
  List,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';
import { AnalogCostResult } from '../../../calculators/analogico';
import { DigitalCostResult } from '../../../calculators/digital';

type CostResult = AnalogCostResult | DigitalCostResult;

interface ResultsTableProps {
  results: CostResult[];
  scales: number[];
  allScaleResults: Record<number, CostResult[]>;
  activeScale: number;
  onScaleChange: (scale: number) => void;
  simulationActive: boolean;
  disabledRulesCount: number;
}

function fmt(n: number, dec = 2) {
  if (!isFinite(n) || isNaN(n)) return '—';
  return n.toFixed(dec);
}

function fmtK(n: number) {
  if (!isFinite(n) || isNaN(n)) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toFixed(0);
}

function CostBreakdown({ result }: { result: CostResult }) {
  if (result.type === 'analog') {
    const r = result as AnalogCostResult;
    const rows = [
      { label: 'Material', value: r.costo_material_usd },
      { label: 'Máquina', value: r.costo_maquina_usd },
      { label: 'Herramientas', value: r.costo_herramientas_usd },
      { label: 'Acabados', value: r.costo_acabados_usd },
      { label: 'Gasto adicional', value: r.gasto_adicional_usd },
      { label: 'Total fábrica', value: r.costo_fabrica_usd, highlight: true },
      { label: 'Total completo (c/margen)', value: r.costo_total_usd, strong: true },
    ];
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <div className="col-span-2 md:col-span-4 flex items-center gap-2 mb-1">
          <span className="section-header">Desglose de costo — {r.machine_name}</span>
          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">Analógico</span>
          {r.cobro_minimo_activo && (
            <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
              <Clock size={10} />
              Cobro mínimo aplicado
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400">
          Cavidades al eje: <span className="text-slate-200 font-mono-num font-medium">{r.cavidades_eje}</span>
        </div>
        <div className="text-xs text-slate-400">
          Metros lineales: <span className="text-slate-200 font-mono-num font-medium">{fmt(r.metros_lineales, 1)} m</span>
        </div>
        <div className="text-xs text-slate-400">
          Tiempo real: <span className="text-slate-200 font-mono-num font-medium">{fmt(r.tiempo_hrs_real ?? r.tiempo_hrs, 2)} hrs</span>
        </div>
        <div className="text-xs text-slate-400">
          Tiempo cobrado: <span className={`font-mono-num font-medium ${r.cobro_minimo_activo ? 'text-amber-400' : 'text-slate-200'}`}>{fmt(r.tiempo_hrs, 2)} hrs</span>
        </div>
        <div className="text-xs text-slate-400">
          Costo/hr máquina: <span className="text-slate-200 font-mono-num font-medium">${fmt(r.costo_hora_usd, 3)}</span>
        </div>
        <div className="col-span-2 md:col-span-4 mt-2 border-t border-slate-700 pt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className={`rounded-lg p-2.5 ${
                  row.strong
                    ? 'bg-orange-500/15 border border-orange-500/30'
                    : row.highlight
                    ? 'bg-slate-700/60' :'bg-slate-800'
                }`}
              >
                <p className="text-xs text-slate-500 mb-1">{row.label}</p>
                <p className={`font-mono-num font-semibold ${row.strong ? 'text-orange-400 text-base' : 'text-slate-200 text-sm'}`}>
                  ${fmt(row.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  } else {
    const r = result as DigitalCostResult;
    const rows = [
      { label: 'Material', value: r.costo_material_usd },
      { label: 'Tinta/Clicks', value: r.costo_tinta_usd },
      { label: 'Acabados', value: r.costo_acabados_usd },
      { label: 'Total fábrica', value: r.costo_fabrica_usd, highlight: true },
      { label: 'Total completo (c/margen)', value: r.costo_total_usd, strong: true },
    ];
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <div className="col-span-2 md:col-span-4 flex items-center gap-2 mb-1">
          <span className="section-header">Desglose de costo — {r.machine_name}</span>
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Digital</span>
          {r.cobro_minimo_activo && (
            <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
              <Clock size={10} />
              Cobro mínimo aplicado
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400">
          Planilla: <span className="text-slate-200 font-medium">{r.planilla_usada}</span>
        </div>
        <div className="text-xs text-slate-400">
          Cavidades: <span className="text-slate-200 font-mono-num font-medium">{r.cavidades_usadas}</span>
        </div>
        <div className="text-xs text-slate-400">
          Metros lineales: <span className="text-slate-200 font-mono-num font-medium">{fmt(r.metros_lineales, 1)} m</span>
        </div>
        <div className="text-xs text-slate-400">
          Clicks totales: <span className="text-slate-200 font-mono-num font-medium">{fmtK(r.clicks_totales)}</span>
        </div>
        <div className="text-xs text-slate-400">
          Tintas totales: <span className="text-slate-200 font-mono-num font-medium">{r.tintas_totales}</span>
        </div>
        <div className="text-xs text-slate-400">
          Vel. efectiva: <span className="text-slate-200 font-mono-num font-medium">{r.velocidad_efectiva} m/min</span>
        </div>
        <div className="text-xs text-slate-400">
          Tiempo real: <span className="text-slate-200 font-mono-num font-medium">{fmt(r.tiempo_hrs_real ?? r.tiempo_hrs, 2)} hrs</span>
        </div>
        <div className="text-xs text-slate-400">
          Tiempo cobrado: <span className={`font-mono-num font-medium ${r.cobro_minimo_activo ? 'text-amber-400' : 'text-slate-200'}`}>{fmt(r.tiempo_hrs, 2)} hrs</span>
        </div>
        <div className="col-span-2 md:col-span-4 mt-2 border-t border-slate-700 pt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className={`rounded-lg p-2.5 ${
                  row.strong
                    ? 'bg-orange-500/15 border border-orange-500/30'
                    : row.highlight
                    ? 'bg-slate-700/60' :'bg-slate-800'
                }`}
              >
                <p className="text-xs text-slate-500 mb-1">{row.label}</p>
                <p className={`font-mono-num font-semibold ${row.strong ? 'text-orange-400 text-base' : 'text-slate-200 text-sm'}`}>
                  ${fmt(row.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default function ResultsTable({
  results,
  scales,
  allScaleResults,
  activeScale,
  onScaleChange,
  simulationActive,
  disabledRulesCount,
}: ResultsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'pivot'>('single');
  const [techFilter, setTechFilter] = useState<'all' | 'digital' | 'analog'>('all');
  const [hiddenMachines, setHiddenMachines] = useState<Set<string>>(new Set());

  const toggleMachine = (id: string) => {
    setHiddenMachines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allMachines = results.filter(
    (r) => techFilter === 'all' || r.type === techFilter
  );

  const eligible = allMachines
    .filter((r) => r.elegible && !hiddenMachines.has(r.machine_id))
    .sort((a, b) => a.costo_millar_usd - b.costo_millar_usd);
  const ineligible = allMachines.filter(
    (r) => !r.elegible && !hiddenMachines.has(r.machine_id)
  );
  const sorted = [...eligible, ...ineligible];

  const bestId = eligible[0]?.machine_id;

  // All unique machines across all results for the toggle chips
  const allUniqueMachines = results.filter(
    (r) => techFilter === 'all' || r.type === techFilter
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Simulation banner */}
      {simulationActive && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-300">
            <span className="font-semibold">MODO SIMULACIÓN:</span>{' '}
            {disabledRulesCount} regla{disabledRulesCount > 1 ? 's' : ''} desactivada
            {disabledRulesCount > 1 ? 's' : ''} — los resultados pueden incluir máquinas normalmente no elegibles.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Scale tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500 mr-1">Escala:</span>
            {scales.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onScaleChange(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono-num font-semibold transition-all duration-150 ${
                  activeScale === s
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                }`}
              >
                {s.toLocaleString()}k
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'single' ? 'bg-slate-600 text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <List size={12} />
              Por escala
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pivot')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'pivot' ? 'bg-slate-600 text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Table2 size={12} />
              Todas las escalas
            </button>
          </div>
        </div>

        {/* Technology filter + machine toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tech filter buttons */}
          <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
            {(['all', 'digital', 'analog'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTechFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  techFilter === f
                    ? f === 'digital' ?'bg-blue-500/30 text-blue-300'
                      : f === 'analog' ?'bg-purple-500/30 text-purple-300' :'bg-slate-600 text-slate-100' :'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f === 'all' ? 'Todas' : f === 'digital' ? 'Digital' : 'Flexo'}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-700" />

          {/* Individual machine toggles */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500">Máquinas:</span>
            {allUniqueMachines.map((r) => {
              const hidden = hiddenMachines.has(r.machine_id);
              return (
                <button
                  key={r.machine_id}
                  type="button"
                  onClick={() => toggleMachine(r.machine_id)}
                  title={hidden ? `Mostrar ${r.machine_name}` : `Ocultar ${r.machine_name}`}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                    hidden
                      ? 'border-slate-700 bg-slate-800/50 text-slate-600 line-through'
                      : r.type === 'digital' ?'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20' :'border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                  }`}
                >
                  {hidden ? <EyeOff size={10} /> : <Eye size={10} />}
                  {r.machine_name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {viewMode === 'single' ? (
        /* Single-scale table */
        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60">
                  <th className="text-left px-4 py-3 section-header w-8">#</th>
                  <th className="text-left px-4 py-3 section-header">Máquina</th>
                  <th className="text-left px-3 py-3 section-header">Tecnología</th>
                  <th className="text-center px-3 py-3 section-header">¿Corre?</th>
                  <th className="text-right px-3 py-3 section-header">Vel. m/min</th>
                  <th className="text-right px-3 py-3 section-header">Metros Lin.</th>
                  <th className="text-right px-3 py-3 section-header">Tiempo hrs</th>
                  <th className="text-right px-4 py-3 section-header">Costo/Millar USD</th>
                  <th className="text-right px-4 py-3 section-header">Precio/Millar USD</th>
                  <th className="text-right px-3 py-3 section-header">Costo/Millar MXN</th>
                  <th className="text-left px-4 py-3 section-header">Nota</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, idx) => {
                  const isBest = r.machine_id === bestId && r.elegible;
                  const isExpanded = expandedRow === r.machine_id;
                  const rowBg = !r.elegible
                    ? 'bg-red-500/5 hover:bg-red-500/10'
                    : isBest
                    ? 'bg-green-500/8 hover:bg-green-500/12' :'hover:bg-slate-700/30';

                  return (
                    <React.Fragment key={r.machine_id}>
                      <tr
                        className={`border-b border-slate-700/30 cursor-pointer transition-colors ${rowBg}`}
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : r.machine_id)
                        }
                      >
                        <td className="px-4 py-3 text-slate-500 font-mono-num text-xs">
                          {r.elegible ? idx + 1 : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">{r.machine_name}</span>
                            {isBest && (
                              <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">
                                <Star size={10} />
                                MEJOR OPCIÓN
                              </span>
                            )}
                            {r.simulacion_activa && (
                              <span title="Corre solo en modo simulación" className="text-yellow-400">
                                <AlertTriangle size={12} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              r.type === 'analog' ?'bg-purple-500/20 text-purple-300' :'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {r.type === 'analog' ? 'Analógico' : 'Digital'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.elegible ? (
                            <CheckCircle size={16} className="text-green-400 mx-auto" />
                          ) : (
                            <XCircle size={16} className="text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono-num text-slate-300">
                          {r.velocidad_efectiva}
                        </td>
                        <td className="px-3 py-3 text-right font-mono-num text-slate-300">
                          {fmt(r.metros_lineales, 1)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono-num text-slate-300">
                          {fmt(r.tiempo_hrs, 2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-mono-num font-bold text-base ${
                              !r.elegible
                                ? 'text-slate-600'
                                : isBest
                                ? 'text-green-400' :'text-slate-100'
                            }`}
                          >
                            {r.elegible ? `$${fmt(r.costo_millar_usd)}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono-num text-slate-400 text-sm">
                          {r.elegible ? `$${fmt(r.precio_millar_usd)}` : '—'}
                        </td>
                        <td className="px-3 py-3 text-right font-mono-num text-slate-400 text-sm">
                          {r.elegible ? `$${fmt(r.costo_millar_mxn, 0)}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {r.cobro_minimo_activo && (
                              <span title="Cobro mínimo aplicado" className="text-amber-400 flex-shrink-0">
                                <Clock size={12} />
                              </span>
                            )}
                            {r.razones_falla.length > 0 && (
                              <span className="text-xs text-red-400 max-w-[200px] truncate" title={r.razones_falla.join('; ')}>
                                {r.razones_falla[0]}
                                {r.razones_falla.length > 1 && ` +${r.razones_falla.length - 1}`}
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp size={14} className="text-slate-500 flex-shrink-0 ml-auto" />
                            ) : (
                              <ChevronDown size={14} className="text-slate-500 flex-shrink-0 ml-auto" />
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-slate-700/30">
                          <td colSpan={11} className="px-4 py-3 row-expand">
                            <CostBreakdown result={r} />
                            {r.razones_falla.length > 1 && (
                              <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                                <p className="text-xs font-semibold text-red-400 mb-2">Razones por las que no corre:</p>
                                <ul className="flex flex-col gap-1">
                                  {r.razones_falla.map((reason, i) => (
                                    <li key={i} className="text-xs text-red-300 flex items-start gap-1.5">
                                      <XCircle size={10} className="mt-0.5 flex-shrink-0" />
                                      {reason}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mb-3">
                <Table2 size={20} className="text-slate-500" />
              </div>
              <p className="text-slate-400 font-medium">Sin resultados aún</p>
              <p className="text-sm text-slate-600 mt-1">Completa los datos del trabajo para ver la comparación de máquinas</p>
            </div>
          )}
        </div>
      ) : (
        /* Pivot table */
        <div className="card-base overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/60">
            <p className="text-sm font-semibold text-slate-200">Vista multi-escala — Costo/Millar USD</p>
            <p className="text-xs text-slate-500 mt-0.5">Celda en verde = opción más económica para esa escala</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60">
                  <th className="text-left px-4 py-3 section-header sticky left-0 bg-slate-800/80">Máquina</th>
                  <th className="text-left px-3 py-3 section-header">Tipo</th>
                  {scales.map((s) => (
                    <th key={s} className="text-right px-4 py-3 section-header">
                      {s.toLocaleString()}k
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  // Find min cost per scale
                  return (
                    <tr
                      key={r.machine_id}
                      className={`border-b border-slate-700/30 ${
                        !r.elegible ? 'opacity-50' : 'hover:bg-slate-700/20'
                      }`}
                    >
                      <td className="px-4 py-3 sticky left-0 bg-slate-900/80">
                        <span className="font-semibold text-slate-200">{r.machine_name}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            r.type === 'analog' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {r.type === 'analog' ? 'A' : 'D'}
                        </span>
                      </td>
                      {scales.map((s) => {
                        const scaleResults = (allScaleResults[s] || []).filter(
                          (sr) =>
                            !hiddenMachines.has(sr.machine_id) &&
                            (techFilter === 'all' || sr.type === techFilter)
                        );
                        const thisResult = (allScaleResults[s] || []).find(
                          (sr) => sr.machine_id === r.machine_id
                        );
                        const eligibleResults = scaleResults.filter((sr) => sr.elegible);
                        const minCost =
                          eligibleResults.length > 0
                            ? Math.min(...eligibleResults.map((sr) => sr.costo_millar_usd))
                            : Infinity;
                        const isBestCell =
                          thisResult?.elegible &&
                          thisResult.costo_millar_usd === minCost &&
                          isFinite(minCost);

                        return (
                          <td
                            key={s}
                            className={`px-4 py-3 text-right font-mono-num ${
                              isBestCell
                                ? 'bg-green-500/15 text-green-400 font-bold'
                                : !thisResult?.elegible
                                ? 'text-slate-700' :'text-slate-300'
                            }`}
                          >
                            {thisResult?.elegible
                              ? `$${fmt(thisResult.costo_millar_usd)}`
                              : '—'}
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
      )}
    </div>
  );
}