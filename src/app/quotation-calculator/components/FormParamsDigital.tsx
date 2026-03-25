'use client';
import React from 'react';
import Toggle from './Toggle';

export interface ParamsDigital {
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
  ancho_material_mm: number;
  ancho_material_20mil_mm: number;
  usa_primer_extra: boolean;
  pasos_omega: number;
  pasos_estampador: number;
  pasos_jtfix: number;
  reinsercion_digital: boolean;
  flete_externo: boolean;
  flete_monto_mxn: number;
  desperdicio_pct: number;
}

interface Props {
  data: ParamsDigital;
  onChange: (d: ParamsDigital) => void;
}

export const defaultParamsDigital: ParamsDigital = {
  num_tintas: 4,
  cama_blanco: false,
  blanco_cobertura_pct: 80,
  blanco_num_camas: 1,
  tinta_plata: false,
  plata_cobertura_pct: 30,
  plata_num_camas: 1,
  tinta_invisible: false,
  tinta_pink: false,
  tinta_raised: false,
  ancho_material_mm: 320,
  ancho_material_20mil_mm: 750,
  usa_primer_extra: false,
  pasos_omega: 1,
  pasos_estampador: 0,
  pasos_jtfix: 0,
  reinsercion_digital: false,
  flete_externo: false,
  flete_monto_mxn: 0,
  desperdicio_pct: 3,
};

export default function FormParamsDigital({ data, onChange }: Props) {
  const set = <K extends keyof ParamsDigital>(k: K, v: ParamsDigital[K]) =>
    onChange({ ...data, [k]: v });

  const numField = (
    k: keyof ParamsDigital,
    label: string,
    min = 0,
    max?: number,
    step = 1
  ) => (
    <div>
      <label className="block text-xs text-slate-400 mb-1 font-medium">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={(data[k] as number) ?? ''}
        onChange={(e) => set(k, (parseFloat(e.target.value) || 0) as ParamsDigital[typeof k])}
        className="input-base font-mono-num"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Tintas */}
      <div>
        <label className="block text-xs text-slate-400 mb-1 font-medium">
          Número de tintas (clicks) — 1 a 7
        </label>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set('num_tintas', n)}
              className={`flex-1 py-2 rounded-lg text-sm font-mono-num font-semibold transition-all ${
                data.num_tintas === n
                  ? 'bg-orange-500 text-white' :'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Cama de blanco */}
      <div className="border-t border-slate-700/40 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">¿Cama de blanco?</span>
          <Toggle checked={data.cama_blanco} onChange={(v) => set('cama_blanco', v)} size="sm" />
        </div>
        {data.cama_blanco && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 grid grid-cols-2 gap-3">
            {numField('blanco_cobertura_pct', 'Cobertura blanco (%)', 0, 100)}
            {numField('blanco_num_camas', 'Número de camas', 1, 4)}
          </div>
        )}
      </div>

      {/* Tinta plata */}
      <div className="border-t border-slate-700/40 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">¿Tinta plata?</span>
          <Toggle checked={data.tinta_plata} onChange={(v) => set('tinta_plata', v)} size="sm" />
        </div>
        {data.tinta_plata && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 grid grid-cols-2 gap-3">
            {numField('plata_cobertura_pct', 'Cobertura plata (%)', 0, 100)}
            {numField('plata_num_camas', 'Número de camas', 1, 4)}
          </div>
        )}
      </div>

      {/* Tintas especiales */}
      <div className="bg-slate-800/40 rounded-lg px-3 divide-y divide-slate-700/40">
        {[
          { key: 'tinta_invisible' as const, label: '¿Tinta invisible?' },
          { key: 'tinta_pink' as const, label: '¿Tinta pink?' },
          { key: 'tinta_raised' as const, label: '¿Tinta raised?' },
          { key: 'usa_primer_extra' as const, label: '¿Usa primer extra?' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-slate-300">{label}</span>
            <Toggle checked={data[key]} onChange={(v) => set(key, v)} size="sm" />
          </div>
        ))}
      </div>

      {/* Anchos */}
      <div className="grid grid-cols-2 gap-3">
        {numField('ancho_material_mm', 'Ancho material (mm)', 0)}
        {numField('ancho_material_20mil_mm', 'Ancho 20 MIL (mm)', 0)}
      </div>

      {/* Pasos */}
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">
        Pasos adicionales
      </p>
      <div className="grid grid-cols-3 gap-3">
        {numField('pasos_omega', 'Omega', 0, 3)}
        {numField('pasos_estampador', 'Estampador', 0, 3)}
        {numField('pasos_jtfix', 'JTFIX', 0, 3)}
      </div>

      {numField('desperdicio_pct', 'Desperdicio (%)', 0, 100, 0.5)}

      {/* Reinserción digital */}
      <div className="flex items-center justify-between py-1.5 border-t border-slate-700/40">
        <span className="text-sm text-slate-300">¿Reinserción digital?</span>
        <Toggle
          checked={data.reinsercion_digital}
          onChange={(v) => set('reinsercion_digital', v)}
          size="sm"
        />
      </div>

      {/* Flete */}
      <div className="border-t border-slate-700/40 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">Flete externo</span>
          <Toggle
            checked={data.flete_externo}
            onChange={(v) => set('flete_externo', v)}
            size="sm"
          />
        </div>
        {data.flete_externo && (
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Monto flete (MXN)
            </label>
            <input
              type="number"
              value={data.flete_monto_mxn || ''}
              onChange={(e) => set('flete_monto_mxn', parseFloat(e.target.value) || 0)}
              className="input-base font-mono-num"
            />
          </div>
        )}
      </div>
    </div>
  );
}