'use client';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AnalogMachineParams, DigitalMachineParams, DigitalSpeedTable, ClickValueRow, SustratoDigital, BarnizParams, LaminadoParams, EstampadoParams, OverheadConcepto, DEFAULT_ANALOG_MACHINE_PARAMS, DEFAULT_DIGITAL_MACHINE_PARAMS, DEFAULT_DIGITAL_SPEED_TABLE, DEFAULT_CLICK_VALUES, DEFAULT_SUSTRATOS_DIGITALES, DEFAULT_BARNICES, DEFAULT_LAMINADOS, DEFAULT_ESTAMPADOS, DEFAULT_OVERHEAD_CONCEPTOS, GlobalParams,  } from '../../../config/machines';



// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParametersState {
  analogMachines: AnalogMachineParams[];
  digitalMachines: DigitalMachineParams[];
  speedTable: DigitalSpeedTable;
  clickValues: ClickValueRow[];
  sustratos: SustratoDigital[];
  barnices: BarnizParams[];
  laminados: LaminadoParams[];
  estampados: EstampadoParams[];
  overheadConceptos: OverheadConcepto[];
}

export const defaultParametersState: ParametersState = {
  analogMachines: DEFAULT_ANALOG_MACHINE_PARAMS,
  digitalMachines: DEFAULT_DIGITAL_MACHINE_PARAMS,
  speedTable: DEFAULT_DIGITAL_SPEED_TABLE,
  clickValues: DEFAULT_CLICK_VALUES,
  sustratos: DEFAULT_SUSTRATOS_DIGITALES,
  barnices: DEFAULT_BARNICES,
  laminados: DEFAULT_LAMINADOS,
  estampados: DEFAULT_ESTAMPADOS,
  overheadConceptos: DEFAULT_OVERHEAD_CONCEPTOS,
};

interface Props {
  params: ParametersState;
  onChange: (p: ParametersState) => void;
  globalParams: GlobalParams;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function NumCell({
  value,
  onChange,
  step = 1,
  min,
  className = '',
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={`w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-orange-500 text-right ${className}`}
    />
  );
}

function BoolCell({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
        value ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
      }`}
    >
      {value ? 'SÍ' : 'NO'}
    </button>
  );
}

// ─── Sub-tab: Máquinas Analógicas ─────────────────────────────────────────────

function TabAnalogicas({ params, onChange, globalParams }: Props) {
  const { analogMachines } = params;

  const update = (idx: number, field: keyof AnalogMachineParams, val: unknown) => {
    const updated = analogMachines.map((m, i) => i === idx ? { ...m, [field]: val } : m);
    onChange({ ...params, analogMachines: updated });
  };

  const dias = globalParams.dias_mes;
  const horas = globalParams.horas_dia;
  const efic = globalParams.eficiencia;

  const calcCostoHora = (m: AnalogMachineParams) => {
    const dep = (m.costo_usd / m.meses_depreciacion) / dias / horas / efic;
    const mtto = m.poliza_usd_mes / dias / horas;
    return dep + mtto;
  };

  const calcCostoMetro = (m: AnalogMachineParams) => {
    const ch = calcCostoHora(m);
    return m.vel_std > 0 ? ch / (m.vel_std * 60) : 0;
  };

  const fields: Array<{ key: keyof AnalogMachineParams; label: string; type: 'num' | 'bool'; step?: number }> = [
    { key: 'costo_usd', label: 'Costo USD', type: 'num', step: 1000 },
    { key: 'meses_depreciacion', label: 'Meses dep.', type: 'num' },
    { key: 'poliza_usd_mes', label: 'Póliza USD/mes', type: 'num', step: 10 },
    { key: 'ancho_max_mm', label: 'Ancho máx (mm)', type: 'num' },
    { key: 'area_m2', label: 'Área m²', type: 'num' },
    { key: 'cabezas_offset', label: 'Cabezas Offset', type: 'num' },
    { key: 'cabezas_flexo', label: 'Cabezas Flexo', type: 'num' },
    { key: 'cabezas_screen', label: 'Cabezas Screen', type: 'num' },
    { key: 'cold_foil', label: 'Cold Foil', type: 'bool' },
    { key: 'hot_stamping', label: 'Hot Stamping', type: 'bool' },
    { key: 'embossing', label: 'Embossing', type: 'bool' },
    { key: 'cupon', label: 'Cupón', type: 'bool' },
    { key: 'vel_std', label: 'Vel. std (m/min)', type: 'num' },
    { key: 'vel_screen', label: 'Vel. Screen (m/min)', type: 'num' },
    { key: 'vel_cupon', label: 'Vel. Cupón (m/min)', type: 'num' },
  ];

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800">
              <th className="text-left px-3 py-2 text-slate-400 font-medium border border-slate-700 sticky left-0 bg-slate-800 z-10">Campo</th>
              {analogMachines.map(m => (
                <th key={m.id} className="px-3 py-2 text-orange-400 font-semibold border border-slate-700 text-center min-w-[120px]">{m.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map(f => (
              <tr key={f.key} className="hover:bg-slate-800/50">
                <td className="px-3 py-1.5 text-slate-400 border border-slate-700 sticky left-0 bg-slate-900 z-10 whitespace-nowrap">{f.label}</td>
                {analogMachines.map((m, i) => (
                  <td key={m.id} className="px-2 py-1 border border-slate-700 text-center">
                    {f.type === 'bool' ? (
                      <BoolCell
                        value={m[f.key] as boolean}
                        onChange={(v) => update(i, f.key, v)}
                      />
                    ) : (
                      <NumCell
                        value={m[f.key] as number}
                        onChange={(v) => update(i, f.key, v)}
                        step={f.step}
                        min={0}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Real-time calculated costs */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-xs font-semibold text-slate-300 mb-3">Costos calculados en tiempo real</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="text-left px-3 py-2 text-slate-400 border border-slate-700">Métrica</th>
                {analogMachines.map(m => (
                  <th key={m.id} className="px-3 py-2 text-orange-400 border border-slate-700 text-center">{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 text-slate-400 border border-slate-700">Costo hora-máquina (USD/hr)</td>
                {analogMachines.map(m => (
                  <td key={m.id} className="px-3 py-2 text-emerald-400 border border-slate-700 text-right font-mono">
                    ${calcCostoHora(m).toFixed(4)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-400 border border-slate-700">Costo metro (USD/m)</td>
                {analogMachines.map(m => (
                  <td key={m.id} className="px-3 py-2 text-cyan-400 border border-slate-700 text-right font-mono">
                    ${calcCostoMetro(m).toFixed(5)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Parámetros base: {dias} días/mes · {horas} hr/día · {(efic * 100).toFixed(0)}% eficiencia
        </p>
      </div>
    </div>
  );
}

// ─── Sub-tab: Máquinas Digitales ──────────────────────────────────────────────

function TabDigitales({ params, onChange, globalParams }: Props) {
  const { digitalMachines, speedTable, clickValues } = params;

  const updateMachine = (idx: number, field: keyof DigitalMachineParams, val: unknown) => {
    const updated = digitalMachines.map((m, i) => i === idx ? { ...m, [field]: val } : m);
    onChange({ ...params, digitalMachines: updated });
  };

  const updateSpeed = (machineId: string, tintas: number, val: number) => {
    onChange({
      ...params,
      speedTable: {
        ...speedTable,
        [machineId]: { ...speedTable[machineId], [tintas]: val },
      },
    });
  };

  const updateClick = (idx: number, field: keyof ClickValueRow, val: number) => {
    const updated = clickValues.map((c, i) => i === idx ? { ...c, [field]: val } : c);
    onChange({ ...params, clickValues: updated });
  };

  const dias = globalParams.dias_mes;
  const horas = globalParams.horas_dia;
  const efic = globalParams.eficiencia;
  const tc = globalParams.tipo_cambio;

  const calcDepHr = (m: DigitalMachineParams) => {
    return (m.costo_usd / m.meses_depreciacion) / dias / horas / efic;
  };

  const machineFields: Array<{ key: keyof DigitalMachineParams; label: string; type: 'num' | 'bool'; step?: number }> = [
    { key: 'costo_usd', label: 'Costo USD', type: 'num', step: 1000 },
    { key: 'meses_depreciacion', label: 'Meses dep.', type: 'num' },
    { key: 'division_costo', label: 'División costo', type: 'num' },
    { key: 'ancho_13_mm', label: 'Ancho 13" (mm)', type: 'num' },
    { key: 'ancho_30_mm', label: 'Ancho 30" (mm)', type: 'num' },
    { key: 'frame_largo_cm', label: 'Frame largo (cm)', type: 'num' },
    { key: 'setup_metros', label: 'Set up metros', type: 'num' },
    { key: 'tintas_max', label: 'Tintas máx', type: 'num' },
    { key: 'tiene_plata', label: 'Tiene plata', type: 'bool' },
    { key: 'tiene_reinsercion', label: 'Tiene reinserción', type: 'bool' },
    { key: 'tiene_invisible', label: 'Tiene invisible', type: 'bool' },
    { key: 'camas_blanco_max', label: 'Camas blanco máx', type: 'num' },
    { key: 'doble_hit', label: 'Doble hit', type: 'bool' },
  ];

  const tintasRange = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="space-y-6">
      {/* Machine parameters table */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Parámetros de máquinas digitales</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="text-left px-3 py-2 text-slate-400 border border-slate-700 sticky left-0 bg-slate-800 z-10">Campo</th>
                {digitalMachines.map(m => (
                  <th key={m.id} className="px-3 py-2 text-orange-400 font-semibold border border-slate-700 text-center min-w-[110px]">{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {machineFields.map(f => (
                <tr key={f.key} className="hover:bg-slate-800/50">
                  <td className="px-3 py-1.5 text-slate-400 border border-slate-700 sticky left-0 bg-slate-900 z-10 whitespace-nowrap">{f.label}</td>
                  {digitalMachines.map((m, i) => (
                    <td key={m.id} className="px-2 py-1 border border-slate-700 text-center">
                      {f.type === 'bool' ? (
                        <BoolCell value={m[f.key] as boolean} onChange={(v) => updateMachine(i, f.key, v)} />
                      ) : (
                        <NumCell value={m[f.key] as number} onChange={(v) => updateMachine(i, f.key, v)} step={f.step} min={0} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-slate-800/30">
                <td className="px-3 py-2 text-emerald-400 border border-slate-700 font-medium">Dep/hr (USD)</td>
                {digitalMachines.map(m => (
                  <td key={m.id} className="px-3 py-2 text-emerald-400 border border-slate-700 text-right font-mono">
                    ${calcDepHr(m).toFixed(4)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Speed table */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Velocidades por número de tintas (m/min)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">Tintas</th>
                {digitalMachines.map(m => (
                  <th key={m.id} className="px-3 py-2 text-orange-400 font-semibold border border-slate-700 text-center min-w-[90px]">{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tintasRange.map(t => (
                <tr key={t} className="hover:bg-slate-800/50">
                  <td className="px-3 py-1.5 text-slate-300 border border-slate-700 text-center font-mono">{t}</td>
                  {digitalMachines.map(m => (
                    <td key={m.id} className="px-2 py-1 border border-slate-700">
                      <NumCell
                        value={speedTable[m.id]?.[t] ?? 0}
                        onChange={(v) => updateSpeed(m.id, t, v)}
                        min={0}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Click value table */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Valor del click</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-left">Máquina</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">Click base (USD)</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">Margen (%)</th>
                <th className="px-3 py-2 text-emerald-400 border border-slate-700 text-center">Con margen (USD)</th>
              </tr>
            </thead>
            <tbody>
              {clickValues.map((cv, i) => (
                <tr key={cv.machine_id} className="hover:bg-slate-800/50">
                  <td className="px-3 py-1.5 text-slate-300 border border-slate-700 font-medium">{cv.machine_name}</td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={cv.valor_click_base_usd} onChange={(v) => updateClick(i, 'valor_click_base_usd', v)} step={0.001} min={0} />
                  </td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={cv.margen_click * 100} onChange={(v) => updateClick(i, 'margen_click', v / 100)} step={1} min={0} />
                  </td>
                  <td className="px-3 py-1.5 text-emerald-400 border border-slate-700 text-right font-mono">
                    {cv.machine_id === 'INK_JET' ? '—' : `$${(cv.valor_click_base_usd * (1 + cv.margen_click)).toFixed(5)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tab: Materiales e Insumos ────────────────────────────────────────────

function TabMateriales({ params, onChange, globalParams }: Props) {
  const { sustratos, barnices, laminados, estampados, overheadConceptos } = params;

  const updateSustrato = (idx: number, field: keyof SustratoDigital, val: unknown) => {
    const updated = sustratos.map((s, i) => i === idx ? { ...s, [field]: val } : s);
    onChange({ ...params, sustratos: updated });
  };

  const updateBarniz = (idx: number, field: keyof BarnizParams, val: number) => {
    const updated = barnices.map((b, i) => i === idx ? { ...b, [field]: val } : b);
    onChange({ ...params, barnices: updated });
  };

  const updateLaminado = (idx: number, field: keyof LaminadoParams, val: number) => {
    const updated = laminados.map((l, i) => i === idx ? { ...l, [field]: val } : l);
    onChange({ ...params, laminados: updated });
  };

  const updateEstampado = (idx: number, field: keyof EstampadoParams, val: number) => {
    const updated = estampados.map((e, i) => i === idx ? { ...e, [field]: val } : e);
    onChange({ ...params, estampados: updated });
  };

  const updateOverhead = (idx: number, field: keyof OverheadConcepto, val: number) => {
    const updated = overheadConceptos.map((o, i) => i === idx ? { ...o, [field]: val } : o);
    onChange({ ...params, overheadConceptos: updated });
  };

  // Update ALL rows at once for nro_maquinas (digital) or nro_maquinas_analog
  const updateAllNroMaquinas = (field: 'nro_maquinas' | 'nro_maquinas_analog', val: number) => {
    const updated = overheadConceptos.map(o => ({ ...o, [field]: val }));
    onChange({ ...params, overheadConceptos: updated });
  };

  // Update ALL rows at once for division_costo_digital on digitalMachines
  const updateDivisionCosto = (val: number) => {
    const updated = params.digitalMachines.map(m => ({ ...m, division_costo: val }));
    onChange({ ...params, digitalMachines: updated });
  };

  const dias = globalParams.dias_mes;
  const horas = globalParams.horas_dia;
  const efic = globalParams.eficiencia;

  const horas_disponibles = dias * horas * efic;

  // Current global values (all rows should have same nro_maquinas)
  const nroMaquinasDigital = overheadConceptos[0]?.nro_maquinas ?? 14;
  const nroMaquinasAnalog = overheadConceptos[0]?.nro_maquinas_analog ?? 7;
  const divisionCostoDigital = params.digitalMachines[0]?.division_costo ?? 6;

  const calcFeeM2 = (o: OverheadConcepto) => {
    const gasto_div = o.gasto_mensual_usd * o.pct_digital;
    return o.m2_mensuales > 0 ? gasto_div / o.m2_mensuales : 0;
  };

  const calcFeeHrDigital = (o: OverheadConcepto) => {
    const gasto_div = o.gasto_mensual_usd * o.pct_digital;
    return o.nro_maquinas > 0 && horas_disponibles > 0
      ? gasto_div / o.nro_maquinas / horas_disponibles
      : 0;
  };

  const calcFeeHrAnalog = (o: OverheadConcepto) => {
    const pct_analog = 1 - o.pct_digital;
    const gasto_div = o.gasto_mensual_usd * pct_analog;
    const nro_analog = o.nro_maquinas_analog ?? 7;
    return nro_analog > 0 && horas_disponibles > 0
      ? gasto_div / nro_analog / horas_disponibles
      : 0;
  };

  const totalGasto = overheadConceptos.reduce((s, o) => s + o.gasto_mensual_usd, 0);
  const totalGastoDiv = overheadConceptos.reduce((s, o) => s + o.gasto_mensual_usd * o.pct_digital, 0);
  const totalFeeM2 = overheadConceptos.reduce((s, o) => s + calcFeeM2(o), 0);
  const totalFeeHrDigital = overheadConceptos.reduce((s, o) => s + calcFeeHrDigital(o), 0);
  const totalFeeHrAnalog = overheadConceptos.reduce((s, o) => s + calcFeeHrAnalog(o), 0);

  return (
    <div className="space-y-6">
      {/* Sustratos digitales */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Sustratos digitales</h4>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-800">
                <th className="text-left px-3 py-2 text-slate-400 border border-slate-700">Nombre</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">USD/m²</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">Ancho 13" (mm)</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">Ancho 30" (mm)</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">Compra std</th>
              </tr>
            </thead>
            <tbody>
              {sustratos.map((s, i) => (
                <tr key={i} className="hover:bg-slate-800/50">
                  <td className="px-3 py-1.5 text-slate-300 border border-slate-700">{s.nombre}</td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={s.precio_usd_m2} onChange={(v) => updateSustrato(i, 'precio_usd_m2', v)} step={0.01} min={0} />
                  </td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={s.ancho_std_13_mm} onChange={(v) => updateSustrato(i, 'ancho_std_13_mm', v)} min={0} />
                  </td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={s.ancho_std_30_mm} onChange={(v) => updateSustrato(i, 'ancho_std_30_mm', v)} min={0} />
                  </td>
                  <td className="px-2 py-1 border border-slate-700 text-center">
                    <BoolCell value={s.compra_estandar} onChange={(v) => updateSustrato(i, 'compra_estandar', v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barnices */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Barnices</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="text-left px-3 py-2 text-slate-400 border border-slate-700">Nombre</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">USD/kg</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">Depósito g/m²</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">Set up metros</th>
                <th className="px-3 py-2 text-emerald-400 border border-slate-700 text-center">USD/m² calc.</th>
              </tr>
            </thead>
            <tbody>
              {barnices.map((b, i) => (
                <tr key={i} className="hover:bg-slate-800/50">
                  <td className="px-3 py-1.5 text-slate-300 border border-slate-700">{b.nombre}</td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={b.precio_usd_kg} onChange={(v) => updateBarniz(i, 'precio_usd_kg', v)} step={0.5} min={0} />
                  </td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={b.deposito_g_m2} onChange={(v) => updateBarniz(i, 'deposito_g_m2', v)} step={0.5} min={0} />
                  </td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={b.setup_metros} onChange={(v) => updateBarniz(i, 'setup_metros', v)} min={0} />
                  </td>
                  <td className="px-3 py-1.5 text-emerald-400 border border-slate-700 text-right font-mono">
                    ${(b.precio_usd_kg * b.deposito_g_m2 / 1000).toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Laminados */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Laminados</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="text-left px-3 py-2 text-slate-400 border border-slate-700">Nombre</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">USD/m²</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">Set up metros</th>
              </tr>
            </thead>
            <tbody>
              {laminados.map((l, i) => (
                <tr key={i} className="hover:bg-slate-800/50">
                  <td className="px-3 py-1.5 text-slate-300 border border-slate-700">{l.nombre}</td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={l.precio_usd_m2} onChange={(v) => updateLaminado(i, 'precio_usd_m2', v)} step={0.01} min={0} />
                  </td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={l.setup_metros} onChange={(v) => updateLaminado(i, 'setup_metros', v)} min={0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estampados */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Estampados</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="text-left px-3 py-2 text-slate-400 border border-slate-700">Nombre</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">USD/m²</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">HS MX/cm²</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">Embosado MX/cm²</th>
              </tr>
            </thead>
            <tbody>
              {estampados.map((e, i) => (
                <tr key={i} className="hover:bg-slate-800/50">
                  <td className="px-3 py-1.5 text-slate-300 border border-slate-700">{e.nombre}</td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={e.precio_usd_m2} onChange={(v) => updateEstampado(i, 'precio_usd_m2', v)} step={0.01} min={0} />
                  </td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={e.precio_hs_mx_cm2} onChange={(v) => updateEstampado(i, 'precio_hs_mx_cm2', v)} step={0.01} min={0} />
                  </td>
                  <td className="px-2 py-1 border border-slate-700">
                    <NumCell value={e.precio_embosado_mx_cm2} onChange={(v) => updateEstampado(i, 'precio_embosado_mx_cm2', v)} step={0.01} min={0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overhead digital */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Parámetros de overhead</h4>

        {/* ── SENSITIVE PARAMETERS ── */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
          <h5 className="text-xs font-semibold text-orange-400 mb-3">⚙️ Parámetros sensibles del modelo</h5>
          <p className="text-xs text-slate-400 mb-3">
            Estos tres valores son los más sensibles del modelo. Cambiarlos recalcula el fee/hr y overhead total en tiempo real.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Nº máquinas DIGITALES en la división
              </label>
              <p className="text-xs text-slate-500 mb-2">Afecta el prorrateo del overhead digital</p>
              <NumCell
                value={nroMaquinasDigital}
                onChange={(v) => updateAllNroMaquinas('nro_maquinas', Math.max(1, Math.round(v)))}
                step={1}
                min={1}
              />
              <p className="text-xs text-orange-400 mt-1 font-mono">
                Fee/hr digital: ${totalFeeHrDigital.toFixed(2)} USD/hr/máq
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Nº máquinas ANALÓGICAS en la división
              </label>
              <p className="text-xs text-slate-500 mb-2">Afecta el prorrateo del overhead analógico</p>
              <NumCell
                value={nroMaquinasAnalog}
                onChange={(v) => updateAllNroMaquinas('nro_maquinas_analog', Math.max(1, Math.round(v)))}
                step={1}
                min={1}
              />
              <p className="text-xs text-cyan-400 mt-1 font-mono">
                Fee/hr analógico: ${totalFeeHrAnalog.toFixed(2)} USD/hr/máq
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <label className="text-xs text-slate-300 font-medium block mb-1">
                División del costo de máquina digital
              </label>
              <p className="text-xs text-slate-500 mb-2">
                El costo de cada máquina digital se divide entre este factor (parametros!C118)
              </p>
              <NumCell
                value={divisionCostoDigital}
                onChange={(v) => updateDivisionCosto(Math.max(1, v))}
                step={1}
                min={1}
              />
              <p className="text-xs text-slate-400 mt-1 text-xs">
                Afecta la depreciación de todas las máquinas digitales
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-2">
          Horas disponibles/máq = {dias} días × {horas} hr × {(efic * 100).toFixed(0)}% = <span className="text-orange-400 font-mono">{horas_disponibles.toFixed(1)} hr/mes</span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="text-left px-3 py-2 text-slate-400 border border-slate-700">Concepto</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">Gasto mensual USD</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">% Digital</th>
                <th className="px-3 py-2 text-emerald-400 border border-slate-700 text-center">Gasto div. USD/mes</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">m² mensuales</th>
                <th className="px-3 py-2 text-emerald-400 border border-slate-700 text-center">Fee/m²</th>
                <th className="px-3 py-2 text-orange-400 border border-slate-700 text-center">Fee/hr Digital</th>
                <th className="px-3 py-2 text-cyan-400 border border-slate-700 text-center">Fee/hr Analógico</th>
              </tr>
            </thead>
            <tbody>
              {overheadConceptos.map((o, i) => {
                const gasto_div = o.gasto_mensual_usd * o.pct_digital;
                const fee_m2 = calcFeeM2(o);
                const fee_hr_dig = calcFeeHrDigital(o);
                const fee_hr_ana = calcFeeHrAnalog(o);
                return (
                  <tr key={i} className="hover:bg-slate-800/50">
                    <td className="px-3 py-2 text-slate-300 border border-slate-700 whitespace-nowrap">{o.concepto}</td>
                    <td className="px-2 py-1 border border-slate-700">
                      <NumCell value={o.gasto_mensual_usd} onChange={(v) => updateOverhead(i, 'gasto_mensual_usd', v)} step={100} min={0} />
                    </td>
                    <td className="px-2 py-1 border border-slate-700">
                      <NumCell value={o.pct_digital * 100} onChange={(v) => updateOverhead(i, 'pct_digital', v / 100)} step={1} min={0} />
                    </td>
                    <td className="px-3 py-2 text-emerald-400 border border-slate-700 text-right font-mono">
                      ${gasto_div.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-2 py-1 border border-slate-700">
                      <NumCell value={o.m2_mensuales} onChange={(v) => updateOverhead(i, 'm2_mensuales', v)} step={1000} min={0} />
                    </td>
                    <td className="px-3 py-2 text-emerald-400 border border-slate-700 text-right font-mono">
                      ${fee_m2.toFixed(5)}
                    </td>
                    <td className="px-3 py-2 text-orange-400 border border-slate-700 text-right font-mono">
                      ${fee_hr_dig.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-cyan-400 border border-slate-700 text-right font-mono">
                      ${fee_hr_ana.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
              {/* TOTAL row */}
              <tr className="bg-slate-800 font-semibold">
                <td className="px-3 py-2 text-slate-200 border border-slate-700">TOTAL</td>
                <td className="px-3 py-2 text-slate-200 border border-slate-700 text-right font-mono">
                  ${totalGasto.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2 text-slate-500 border border-slate-700 text-center">—</td>
                <td className="px-3 py-2 text-emerald-400 border border-slate-700 text-right font-mono">
                  ${totalGastoDiv.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2 text-slate-500 border border-slate-700 text-center">—</td>
                <td className="px-3 py-2 text-emerald-400 border border-slate-700 text-right font-mono">
                  ${totalFeeM2.toFixed(5)}
                </td>
                <td className="px-3 py-2 text-orange-400 border border-slate-700 text-right font-mono">
                  ${totalFeeHrDigital.toFixed(4)}
                </td>
                <td className="px-3 py-2 text-cyan-400 border border-slate-700 text-right font-mono">
                  ${totalFeeHrAnalog.toFixed(4)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400">Overhead digital USD/hr/máq</p>
            <p className="text-lg font-bold text-orange-400 font-mono">${totalFeeHrDigital.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400">Overhead analógico USD/hr/máq</p>
            <p className="text-lg font-bold text-cyan-400 font-mono">${totalFeeHrAnalog.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400">Overhead total USD/m²</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">${totalFeeM2.toFixed(5)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400">División costo digital</p>
            <p className="text-lg font-bold text-slate-200 font-mono">÷ {divisionCostoDigital}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Verificador de cálculo ───────────────────────────────────────────────────

interface VerificadorState {
  maquina: string;
  tipo: 'analog' | 'digital';
  escala: number;
  eje_mm: number;
  desarrollo_mm: number;
  material_precio: number;
  tintas: number;
  // Expected values
  exp_metros: number;
  exp_costo_material: number;
  exp_costo_maquina: number;
  exp_total: number;
}

function Verificador({ params, globalParams }: { params: ParametersState; globalParams: GlobalParams }) {
  const [v, setV] = useState<VerificadorState>({
    maquina: '6MIL',
    tipo: 'digital',
    escala: 10,
    eje_mm: 50,
    desarrollo_mm: 80,
    material_precio: 0.92,
    tintas: 4,
    exp_metros: 0,
    exp_costo_material: 0,
    exp_costo_maquina: 0,
    exp_total: 0,
  });

  const update = (field: keyof VerificadorState, val: unknown) => setV(prev => ({ ...prev, [field]: val }));

  // Calculate using current params
  const calc = useCallback(() => {
    if (v.tipo === 'digital') {
      const mp = params.digitalMachines.find(m => m.id === v.maquina);
      if (!mp) return null;
      const gap_mm = 3;
      const cav = Math.floor(mp.ancho_13_mm / (v.eje_mm + gap_mm));
      const setup_frames = Math.ceil(mp.setup_metros / (v.desarrollo_mm / 10 / 100));
      const frames_tiro = Math.ceil(v.escala * 1000 / Math.max(cav, 1));
      const frames = frames_tiro + setup_frames;
      const metros = frames * (v.desarrollo_mm / 1000);
      const ancho_m = mp.ancho_13_mm / 1000;
      const m2 = metros * ancho_m;
      const costo_mat = m2 * v.material_precio;

      const speedMap = params.speedTable[v.maquina] ?? {};
      const vel = speedMap[Math.min(v.tintas, 7)] ?? 20;
      const dep_hr = (mp.costo_usd / mp.meses_depreciacion) / globalParams.dias_mes / globalParams.horas_dia / globalParams.eficiencia;
      const tiempo = vel > 0 ? (metros / vel / 60) * (1 + (1 - globalParams.eficiencia)) : 0;
      const costo_maq = tiempo * dep_hr;

      const cv_row = params.clickValues.find(c => c.machine_id === v.maquina);
      const click_val = cv_row ? cv_row.valor_click_base_usd * (1 + cv_row.margen_click) : 0;
      const clicks = frames_tiro * v.tintas;
      const costo_clicks = clicks * click_val;

      const total = costo_mat + costo_clicks + costo_maq;
      return { metros, costo_material: costo_mat, costo_maquina: costo_maq + costo_clicks, total };
    } else {
      const mp = params.analogMachines.find(m => m.id === v.maquina);
      if (!mp) return null;
      const cav = Math.max(1, Math.floor((mp.ancho_max_mm - globalParams.sobre_ancho_papel) / (v.eje_mm + globalParams.gap_eje_std + globalParams.orillas_minimas)));
      const metros_netos = (v.escala * 1000 * v.desarrollo_mm / 1000) / cav;
      const metros = metros_netos * 1.05; // default 5% merma
      const ancho_m = mp.ancho_max_mm / 1000;
      const area = metros * ancho_m;
      const costo_mat = area * v.material_precio;
      const dep_hr = (mp.costo_usd / mp.meses_depreciacion) / globalParams.dias_mes / globalParams.horas_dia / globalParams.eficiencia;
      const tiempo = mp.vel_std > 0 ? metros / mp.vel_std / 60 : 0;
      const costo_maq = tiempo * dep_hr;
      const total = costo_mat + costo_maq;
      return { metros, costo_material: costo_mat, costo_maquina: costo_maq, total };
    }
  }, [v, params, globalParams]);

  const result = calc();

  const diffPct = (calc: number, exp: number) => {
    if (exp === 0) return null;
    return ((calc - exp) / exp) * 100;
  };

  const DiffCell = ({ calc, exp }: { calc: number; exp: number }) => {
    const d = diffPct(calc, exp);
    if (exp === 0) return <span className="text-slate-500">—</span>;
    const bad = Math.abs(d ?? 0) > 1;
    return (
      <span className={bad ? 'text-red-400 font-bold' : 'text-emerald-400'}>
        {d !== null ? `${d > 0 ? '+' : ''}${d.toFixed(2)}%` : '—'}
      </span>
    );
  };

  const allMachines = [
    ...params.analogMachines.map(m => ({ id: m.id, name: m.name, tipo: 'analog' as const })),
    ...params.digitalMachines.map(m => ({ id: m.id, name: m.name, tipo: 'digital' as const })),
  ];

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h4 className="text-xs font-semibold text-slate-300 mb-3">Inputs del cálculo conocido</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Máquina</label>
            <select
              value={v.maquina}
              onChange={(e) => {
                const m = allMachines.find(m => m.id === e.target.value);
                update('maquina', e.target.value);
                if (m) update('tipo', m.tipo);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
            >
              {allMachines.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          {[
            { label: 'Escala (millares)', field: 'escala' as const, step: 1 },
            { label: 'Eje (mm)', field: 'eje_mm' as const, step: 1 },
            { label: 'Desarrollo (mm)', field: 'desarrollo_mm' as const, step: 1 },
            { label: 'Material USD/m²', field: 'material_precio' as const, step: 0.01 },
            { label: 'Tintas', field: 'tintas' as const, step: 1 },
          ].map(f => (
            <div key={f.field}>
              <label className="text-xs text-slate-400 block mb-1">{f.label}</label>
              <NumCell value={v[f.field] as number} onChange={(val) => update(f.field, val)} step={f.step} min={0} />
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Metros esperados</label>
            <NumCell value={v.exp_metros} onChange={(val) => update('exp_metros', val)} step={1} min={0} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Costo material esperado (USD)</label>
            <NumCell value={v.exp_costo_material} onChange={(val) => update('exp_costo_material', val)} step={0.01} min={0} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Costo máquina esperado (USD)</label>
            <NumCell value={v.exp_costo_maquina} onChange={(val) => update('exp_costo_maquina', val)} step={0.01} min={0} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Total esperado (USD)</label>
            <NumCell value={v.exp_total} onChange={(val) => update('exp_total', val)} step={0.01} min={0} />
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h4 className="text-xs font-semibold text-slate-300 mb-3">Comparación calculado vs esperado</h4>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="text-left px-3 py-2 text-slate-400 border border-slate-700">Métrica</th>
                <th className="px-3 py-2 text-orange-400 border border-slate-700 text-right">Calculado</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-right">Esperado</th>
                <th className="px-3 py-2 text-slate-400 border border-slate-700 text-center">Delta</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Metros lineales', calc: result.metros, exp: v.exp_metros, fmt: (n: number) => n.toFixed(2) + ' m' },
                { label: 'Costo material (USD)', calc: result.costo_material, exp: v.exp_costo_material, fmt: (n: number) => '$' + n.toFixed(4) },
                { label: 'Costo máquina (USD)', calc: result.costo_maquina, exp: v.exp_costo_maquina, fmt: (n: number) => '$' + n.toFixed(4) },
                { label: 'Total (USD)', calc: result.total, exp: v.exp_total, fmt: (n: number) => '$' + n.toFixed(4) },
              ].map(row => (
                <tr key={row.label} className="hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-slate-300 border border-slate-700">{row.label}</td>
                  <td className="px-3 py-2 text-orange-300 border border-slate-700 text-right font-mono">{row.fmt(row.calc)}</td>
                  <td className="px-3 py-2 text-slate-400 border border-slate-700 text-right font-mono">
                    {row.exp > 0 ? row.fmt(row.exp) : '—'}
                  </td>
                  <td className="px-3 py-2 border border-slate-700 text-center">
                    <DiffCell calc={row.calc} exp={row.exp} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2">
            Diferencias &gt; 1% se marcan en rojo. Ingresa los valores esperados del Excel para detectar discrepancias.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Checklist de Validación Automática ──────────────────────────────────────

// Casos de prueba del Excel original
// Test: eje=75, des=100, laminado brillante, mat=$0.40, 4 tintas, 1 paso Omega
// Máquina de referencia: 6 MIL (eje=75mm, des=100mm, ancho planilla=317mm)
// cav = floor(317 / (75+3)) = floor(317/78) = 4

interface ValidationCase {
  escala: number;
  ref_6K: number;
  ref_V12: number;
  ref_INKJET: number;
  ref_MO: number;
  ref_FA6: number;
}

const VALIDATION_CASES: ValidationCase[] = [
  { escala: 1,   ref_6K: 1021.88, ref_V12: 1882.10, ref_INKJET: 955.62,  ref_MO: 14963.22, ref_FA6: 11869.53 },
  { escala: 10,  ref_6K: 295.78,  ref_V12: 356.09,  ref_INKJET: 241.10,  ref_MO: 1629.83,  ref_FA6: 1304.31  },
  { escala: 100, ref_6K: 249.89,  ref_V12: 221.57,  ref_INKJET: 188.40,  ref_MO: 297.12,   ref_FA6: 248.42   },
  { escala: 500, ref_6K: 247.05,  ref_V12: 214.15,  ref_INKJET: 185.27,  ref_MO: 179.15,   ref_FA6: 154.91   },
];

// Desglose de referencia para 500k, eje=120mm, des=100mm, mat=$1.20, laminado brillante, 4 tintas, 1 Omega
// VERIFICADO contra Excel original (PARTE 6 del spec)
const DESGLOSE_REF_500K_EJE120: DesgloseLine[] = [
  { label: 'SUSTRATO',              valor: 9897.68,  color: 'text-blue-300' },
  { label: 'TINTA / CLICKS',        valor: 2688.91,  color: 'text-orange-300' },
  { label: 'ACABADOS (LAMINADO)',   valor: 2424.02,  color: 'text-yellow-300' },
  { label: 'HP + PREPRENSA',        valor: 1358.18,  color: 'text-purple-300' },
  { label: 'MO (CEI rebobinado)',   valor: 714.00,   color: 'text-pink-300' },
  { label: 'OMEGA',                 valor: 294.69,   color: 'text-cyan-300' },
  { label: 'GTOS GRALES + SISTEMAS',valor: 1915.20,  color: 'text-emerald-300' },
  { label: 'GTOS DIRECCIÓN',        valor: 546.00,   color: 'text-teal-300' },
  { label: 'ENVÍOS',                valor: 39.82,    color: 'text-slate-300' },
  { label: 'TOTAL',                 valor: 19905.34, color: 'text-white font-bold' },
];

// Desglose de referencia MO analógica 500k, eje=120mm, des=100mm
// VERIFICADO contra Excel original (PARTE 6 del spec)
const DESGLOSE_REF_MO_500K: DesgloseLine[] = [
  { label: 'Metros lineales',       valor: 19481.58, color: 'text-slate-400' },
  { label: 'M2 cobrar',             valor: 7695.22,  color: 'text-slate-400' },
  { label: 'Tiempo máquina (hrs)',  valor: 8.172,    color: 'text-slate-400' },
  { label: 'Costo máquina',         valor: 711.53,   color: 'text-pink-300' },
  { label: 'Revisadora CEI',        valor: 15.03,    color: 'text-cyan-300' },
  { label: 'MO operadores',         valor: 392.46,   color: 'text-emerald-300' },
  { label: 'Gtos post-producción',  valor: 951.13,   color: 'text-teal-300' },
  { label: 'Gtos dirección',        valor: 401.69,   color: 'text-indigo-300' },
  { label: 'TOTAL',                 valor: 14066.63, color: 'text-white font-bold' },
];

// Parámetros fijos para la validación
// Condiciones: eje=75mm, des=100mm, laminado brillante, mat=$0.40 USD/m², 4 tintas CMYK, 1 paso Omega
// Modo POR_METRO (default del Excel)
const VALIDATION_JOB_DIGITAL = {
  eje_mm: 75,
  desarrollo_mm: 100,
  sustrato_precio_usd_m2: 0.40,
  ancho_material_mm: 320,
  ancho_material_20mil_mm: 750,
  num_tintas: 4,
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
  pasos_omega: 1,
  pasos_estampador: 0,
  pasos_jtfix: 0,
  reinsercion_digital: false,
  flete_externo: false,
  flete_monto_mxn: 0,
  margen_pct: 0,
  modo_costo: 'metro' as const,
  desperdicio_pct: 0,
};

// ... existing code ...

const ParametersTab: React.FC = () => {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.warn('Placeholder: ParametersTab is not implemented yet.');
  }, []);
  return (
    <div>
      {/* ParametersTab placeholder */}
    </div>
  );
};

export default ParametersTab;