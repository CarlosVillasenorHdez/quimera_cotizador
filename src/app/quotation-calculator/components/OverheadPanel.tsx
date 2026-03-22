'use client';
import React, { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, ChevronUp, RotateCcw, AlertTriangle } from 'lucide-react';
import { ANALOG_MACHINES, DIGITAL_MACHINES, GlobalParams } from '../../../config/machines';
import { AnalogCostResult } from '../../../calculators/analogico';
import { DigitalCostResult } from '../../../calculators/digital';

type CostResult = AnalogCostResult | DigitalCostResult;

export interface MachineOverride {
  overheadIndividual: number; // USD/hr added to this machine only
  overrideTotal?: number; // if set, replaces all cost/hr
  useOverride: boolean;
}

export interface OverheadState {
  // Level 1 — base params
  diasMes: number;
  horasDia: number;
  factorEficiencia: number;
  tipoCambio: number;
  // Level 2 — global overhead
  overheadGlobalUsdHr: number;
  overheadGlobalUsdM: number;
  overheadGlobalMode: 'hr' | 'm';
  // Level 3 — per machine
  perMachine: Record<string, MachineOverride>;
}

export const defaultOverheadState: OverheadState = {
  diasMes: 20,
  horasDia: 12,
  factorEficiencia: 0.85,
  tipoCambio: 22,
  overheadGlobalUsdHr: 0,
  overheadGlobalUsdM: 0,
  overheadGlobalMode: 'hr',
  perMachine: {},
};

interface OverheadPanelProps {
  overhead: OverheadState;
  onChange: (state: OverheadState) => void;
  globalParams: GlobalParams;
  scales: number[];
  computeForScale: (scale: number, overheadState?: OverheadState) => CostResult[];
}

function fmt2(n: number) {
  return isFinite(n) && !isNaN(n) ? n.toFixed(2) : '—';
}

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
            className="w-16 text-right text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
          />
          {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-slate-700 accent-orange-500"
      />
    </div>
  );
}

// Calculate base cost/hr for a machine given overhead params
function calcBaseHr(depreciacionMxn: number, params: OverheadState): number {
  return (
    depreciacionMxn /
    120 / // meses_depreciacion
    params.diasMes /
    params.horasDia /
    params.factorEficiencia /
    params.tipoCambio
  );
}

const ALL_MACHINES = [
  ...ANALOG_MACHINES.map((m) => ({ id: m.id, name: m.name, type: 'analog' as const, depreciacion: m.depreciacion_mxn })),
  ...DIGITAL_MACHINES.map((m) => ({ id: m.id, name: m.name, type: 'digital' as const, depreciacion: m.depreciacion_mxn })),
];

export default function OverheadPanel({
  overhead,
  onChange,
  globalParams,
  scales,
  computeForScale,
}: OverheadPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedMachines, setExpandedMachines] = useState(false);

  // Inverse calculator state
  const [invMachineId, setInvMachineId] = useState(ALL_MACHINES[0]?.id || '');
  const [invScale, setInvScale] = useState(scales[0] || 1);
  const [invPrecioObjetivo, setInvPrecioObjetivo] = useState(0);

  const update = useCallback(
    (partial: Partial<OverheadState>) => onChange({ ...overhead, ...partial }),
    [overhead, onChange]
  );

  const updateMachine = useCallback(
    (machineId: string, partial: Partial<MachineOverride>) => {
      const current = overhead.perMachine[machineId] || {
        overheadIndividual: 0,
        useOverride: false,
      };
      onChange({
        ...overhead,
        perMachine: {
          ...overhead.perMachine,
          [machineId]: { ...current, ...partial },
        },
      });
    },
    [overhead, onChange]
  );

  const handleReset = () => {
    onChange({
      ...defaultOverheadState,
      tipoCambio: overhead.tipoCambio,
    });
  };

  // Mini-table: cost/hr per machine
  const machineHrTable = useMemo(() => {
    return ALL_MACHINES.map((m) => {
      const baseHr = calcBaseHr(m.depreciacion, overhead);
      const globalAdd =
        overhead.overheadGlobalMode === 'hr' ? overhead.overheadGlobalUsdHr : 0;
      const perM = overhead.perMachine[m.id];
      const indAdd = perM?.overheadIndividual || 0;
      const totalHr = perM?.useOverride && perM.overrideTotal !== undefined
        ? perM.overrideTotal
        : baseHr + globalAdd + indAdd;
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        depHr: baseHr,
        overheadHr: globalAdd + indAdd,
        totalHr,
        totalMxn: totalHr * overhead.tipoCambio,
      };
    });
  }, [overhead]);

  // Inverse calculator
  const inverseResult = useMemo(() => {
    if (!invMachineId || invScale <= 0 || invPrecioObjetivo <= 0) return null;

    const results = computeForScale(invScale);
    const r = results.find((res) => res.machine_id === invMachineId);
    if (!r || !r.elegible) return null;

    // Cost without machine time overhead
    const costoSinMaquina =
      r.type === 'analog'
        ? (r as AnalogCostResult).costo_material_usd +
          (r as AnalogCostResult).costo_herramientas_usd +
          (r as AnalogCostResult).costo_acabados_usd +
          (r as AnalogCostResult).gasto_adicional_usd
        : (r as DigitalCostResult).costo_material_usd +
          (r as DigitalCostResult).costo_tinta_usd +
          (r as DigitalCostResult).costo_acabados_usd;

    const costoMaterialPorMillar = costoSinMaquina / invScale;
    const precioObjetivoTotal = invPrecioObjetivo * invScale;

    if (invPrecioObjetivo < costoMaterialPorMillar) {
      return {
        imposible: true,
        costoMaterialPorMillar,
        overheadRequerido: 0,
        overheadRequeridoM: 0,
      };
    }

    const tiempoHrs = r.tiempo_hrs_real || r.tiempo_hrs;
    if (tiempoHrs <= 0) return null;

    const costoHoraBase = r.overhead_usd_hr || 0;
    // precio_objetivo * escala = costoSinMaquina + tiempo_hrs * (costoHoraBase + overhead)
    // overhead = (precio_objetivo * escala - costoSinMaquina) / tiempo_hrs - costoHoraBase
    const overheadRequerido =
      (precioObjetivoTotal - costoSinMaquina) / tiempoHrs - costoHoraBase;

    const velocidad = r.velocidad_efectiva || 1;
    const overheadRequeridoM = overheadRequerido / (velocidad * 60);

    return {
      imposible: false,
      costoMaterialPorMillar,
      overheadRequerido,
      overheadRequeridoM,
      tiempoHrs,
    };
  }, [invMachineId, invScale, invPrecioObjetivo, computeForScale]);

  // Mini-chart for inverse calculator
  const inverseChartData = useMemo(() => {
    if (!invMachineId || invScale <= 0) return [];
    const results = computeForScale(invScale);
    const r = results.find((res) => res.machine_id === invMachineId);
    if (!r || !r.elegible) return [];

    const costoSinMaquina =
      r.type === 'analog'
        ? (r as AnalogCostResult).costo_material_usd +
          (r as AnalogCostResult).costo_herramientas_usd +
          (r as AnalogCostResult).costo_acabados_usd +
          (r as AnalogCostResult).gasto_adicional_usd
        : (r as DigitalCostResult).costo_material_usd +
          (r as DigitalCostResult).costo_tinta_usd +
          (r as DigitalCostResult).costo_acabados_usd;

    const tiempoHrs = r.tiempo_hrs_real || r.tiempo_hrs;
    if (tiempoHrs <= 0) return [];

    const costoHoraBase = r.overhead_usd_hr || 0;
    const pts = [];
    for (let oh = 0; oh <= 50; oh += 1) {
      const costo = (costoSinMaquina + tiempoHrs * (costoHoraBase + oh)) / invScale;
      pts.push({ overhead: oh, costo });
    }
    return pts;
  }, [invMachineId, invScale, computeForScale]);

  return (
    <div className="card-base flex flex-col gap-0">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-5 py-4 w-full text-left hover:bg-slate-800/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100 text-sm">Análisis de Overhead</span>
          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
            {overhead.overheadGlobalUsdHr > 0 || overhead.overheadGlobalUsdM > 0
              ? 'Activo' :'Base'}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 flex flex-col gap-6 border-t border-slate-700/60 pt-5">
          {/* Level 1 — Base params */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Nivel 1 — Parámetros Base
              </h4>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-orange-400 transition-colors"
              >
                <RotateCcw size={11} />
                Resetear
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SliderInput
                label="Días de trabajo por mes"
                value={overhead.diasMes}
                min={1}
                max={31}
                step={1}
                onChange={(v) => update({ diasMes: v })}
              />
              <SliderInput
                label="Horas de trabajo por día"
                value={overhead.horasDia}
                min={1}
                max={24}
                step={1}
                onChange={(v) => update({ horasDia: v })}
              />
              <SliderInput
                label="Factor de eficiencia"
                value={overhead.factorEficiencia}
                min={0.5}
                max={1.0}
                step={0.01}
                onChange={(v) => update({ factorEficiencia: v })}
              />
              <SliderInput
                label="Tipo de cambio MXN/USD"
                value={overhead.tipoCambio}
                min={10}
                max={50}
                step={0.5}
                onChange={(v) => update({ tipoCambio: v })}
                suffix="MXN"
              />
            </div>

            {/* Mini-table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 pr-3 text-slate-500">Máquina</th>
                    <th className="text-right py-2 px-2 text-slate-500">Deprec./hr</th>
                    <th className="text-right py-2 px-2 text-slate-500">Overhead/hr</th>
                    <th className="text-right py-2 px-2 text-slate-500">Total USD/hr</th>
                    <th className="text-right py-2 pl-2 text-slate-500">Total MXN/hr</th>
                  </tr>
                </thead>
                <tbody>
                  {machineHrTable.map((m) => (
                    <tr key={m.id} className="border-b border-slate-800">
                      <td className="py-1.5 pr-3">
                        <span className="font-medium text-slate-200">{m.name}</span>
                        <span
                          className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                            m.type === 'analog' ?'bg-purple-500/20 text-purple-400' :'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {m.type === 'analog' ? 'A' : 'D'}
                        </span>
                      </td>
                      <td className="text-right py-1.5 px-2 font-mono text-slate-400">
                        ${fmt2(m.depHr)}
                      </td>
                      <td className="text-right py-1.5 px-2 font-mono text-slate-400">
                        ${fmt2(m.overheadHr)}
                      </td>
                      <td className="text-right py-1.5 px-2 font-mono font-semibold text-slate-200">
                        ${fmt2(m.totalHr)}
                      </td>
                      <td className="text-right py-1.5 pl-2 font-mono text-slate-400">
                        ${fmt2(m.totalMxn)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Level 2 — Global overhead */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Nivel 2 — Overhead Global
            </h4>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
                <button
                  type="button"
                  onClick={() => update({ overheadGlobalMode: 'hr' })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    overhead.overheadGlobalMode === 'hr' ?'bg-slate-600 text-slate-100' :'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  USD/hr
                </button>
                <button
                  type="button"
                  onClick={() => update({ overheadGlobalMode: 'm' })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    overhead.overheadGlobalMode === 'm' ?'bg-slate-600 text-slate-100' :'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  USD/m
                </button>
              </div>
              <span className="text-xs text-slate-500">Se suma a TODAS las máquinas</span>
            </div>
            {overhead.overheadGlobalMode === 'hr' ? (
              <SliderInput
                label="Overhead adicional global"
                value={overhead.overheadGlobalUsdHr}
                min={0}
                max={100}
                step={0.5}
                onChange={(v) => update({ overheadGlobalUsdHr: v })}
                suffix="USD/hr"
              />
            ) : (
              <SliderInput
                label="Overhead adicional global"
                value={overhead.overheadGlobalUsdM}
                min={0}
                max={10}
                step={0.01}
                onChange={(v) => update({ overheadGlobalUsdM: v })}
                suffix="USD/m"
              />
            )}
          </div>

          {/* Level 3 — Per machine */}
          <div>
            <button
              type="button"
              onClick={() => setExpandedMachines(!expandedMachines)}
              className="flex items-center justify-between w-full mb-3"
            >
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Nivel 3 — Overhead por Máquina
              </h4>
              {expandedMachines ? (
                <ChevronUp size={14} className="text-slate-500" />
              ) : (
                <ChevronDown size={14} className="text-slate-500" />
              )}
            </button>
            {expandedMachines && (
              <div className="flex flex-col gap-3">
                {ALL_MACHINES.map((m) => {
                  const perM = overhead.perMachine[m.id] || {
                    overheadIndividual: 0,
                    useOverride: false,
                  };
                  const baseHr = calcBaseHr(m.depreciacion, overhead);
                  const globalAdd =
                    overhead.overheadGlobalMode === 'hr' ? overhead.overheadGlobalUsdHr : 0;
                  const effectiveHr = perM.useOverride && perM.overrideTotal !== undefined
                    ? perM.overrideTotal
                    : baseHr + globalAdd + (perM.overheadIndividual || 0);

                  return (
                    <div
                      key={m.id}
                      className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-sm">{m.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              m.type === 'analog' ?'bg-purple-500/20 text-purple-400' :'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {m.type === 'analog' ? 'Analógico' : 'Digital'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          Efectivo:{' '}
                          <span className="text-orange-400 font-semibold">${fmt2(effectiveHr)} USD/hr</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">
                            Overhead individual (USD/hr)
                          </label>
                          <input
                            type="number"
                            value={perM.overheadIndividual || 0}
                            min={0}
                            step={0.5}
                            disabled={perM.useOverride}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) updateMachine(m.id, { overheadIndividual: v });
                            }}
                            className="w-full text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200 font-mono disabled:opacity-40"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs text-slate-500">Override total (USD/hr)</label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={perM.useOverride || false}
                                onChange={(e) =>
                                  updateMachine(m.id, { useOverride: e.target.checked })
                                }
                                className="w-3 h-3 accent-orange-500"
                              />
                              <span className="text-xs text-slate-400">Usar override</span>
                            </label>
                          </div>
                          <input
                            type="number"
                            value={perM.overrideTotal ?? ''}
                            min={0}
                            step={0.5}
                            disabled={!perM.useOverride}
                            placeholder="—"
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) updateMachine(m.id, { overrideTotal: v });
                            }}
                            className="w-full text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200 font-mono disabled:opacity-40"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inverse calculator */}
          <div className="border-t border-slate-700 pt-5">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Calculadora Inversa de Overhead
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              ¿Qué overhead necesito para un precio objetivo?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Máquina</label>
                <select
                  value={invMachineId}
                  onChange={(e) => setInvMachineId(e.target.value)}
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                >
                  {ALL_MACHINES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Escala (millares)</label>
                <select
                  value={invScale}
                  onChange={(e) => setInvScale(Number(e.target.value))}
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                >
                  {scales.map((s) => (
                    <option key={s} value={s}>
                      {s}k
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Precio objetivo (USD/millar)</label>
                <input
                  type="number"
                  value={invPrecioObjetivo || ''}
                  min={0}
                  step={0.1}
                  placeholder="0.00"
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setInvPrecioObjetivo(isNaN(v) ? 0 : v);
                  }}
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 font-mono"
                />
              </div>
            </div>

            {inverseResult && (
              <div className="flex flex-col gap-3">
                {inverseResult.imposible ? (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-300">
                      Imposible: el costo de material solo es{' '}
                      <span className="font-mono font-bold">
                        ${fmt2(inverseResult.costoMaterialPorMillar)}/millar
                      </span>
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Overhead requerido</p>
                        <p className="font-mono font-bold text-orange-400 text-base">
                          ${fmt2(inverseResult.overheadRequerido)} USD/hr
                        </p>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Equivalente en metros</p>
                        <p className="font-mono font-bold text-orange-400 text-base">
                          ${fmt2(inverseResult.overheadRequeridoM)} USD/m
                        </p>
                      </div>
                    </div>

                    {/* Slider visual */}
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Overhead requerido</span>
                        <span className="text-xs font-mono text-orange-400">
                          ${fmt2(inverseResult.overheadRequerido)} USD/hr
                        </span>
                      </div>
                      <div className="relative h-2 bg-slate-700 rounded-full">
                        <div
                          className="absolute left-0 top-0 h-full bg-orange-500 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, (inverseResult.overheadRequerido / 50) * 100))}%`,
                          }}
                        />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-orange-400 rounded-full border-2 border-slate-900"
                          style={{
                            left: `${Math.min(100, Math.max(0, (inverseResult.overheadRequerido / 50) * 100))}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                        <span>$0</span>
                        <span>$50 USD/hr</span>
                      </div>
                    </div>

                    {/* Mini chart */}
                    {inverseChartData.length > 0 && (
                      <div style={{ height: 160 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={inverseChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                              dataKey="overhead"
                              tick={{ fill: '#64748b', fontSize: 10 }}
                              tickFormatter={(v) => `$${v}`}
                            />
                            <YAxis
                              tick={{ fill: '#64748b', fontSize: 10 }}
                              tickFormatter={(v) => `$${Number(v).toFixed(1)}`}
                            />
                            <Tooltip
                              formatter={(v: number) => [`$${fmt2(v)}/millar`, 'Costo']}
                              labelFormatter={(l) => `Overhead: $${l} USD/hr`}
                              contentStyle={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: 8,
                                fontSize: 11,
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="costo"
                              stroke="#f97316"
                              strokeWidth={2}
                              dot={false}
                            />
                            {invPrecioObjetivo > 0 && (
                              <ReferenceLine
                                y={invPrecioObjetivo}
                                stroke="#22c55e"
                                strokeDasharray="4 4"
                                label={{
                                  value: `Objetivo $${fmt2(invPrecioObjetivo)}`,
                                  fill: '#22c55e',
                                  fontSize: 10,
                                  position: 'right',
                                }}
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
