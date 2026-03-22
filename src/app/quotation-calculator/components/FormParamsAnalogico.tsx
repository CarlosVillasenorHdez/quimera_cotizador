'use client';
import React from 'react';
import Toggle from './Toggle';

export interface ParamsAnalogico {
  colores_offset: number;
  cabezas_flexo: number;
  cabezas_screen: number;
  mallas_blancas: number;
  mallas_otro_color: number;
  cobertura_blanco_pct: number;
  cobertura_otro_pct: number;
  mallas_cobradas_fuera: boolean;
  ancho_material_mm: number;
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
}

interface Props {
  data: ParamsAnalogico;
  onChange: (d: ParamsAnalogico) => void;
}

export const defaultParamsAnalogico: ParamsAnalogico = {
  colores_offset: 0,
  cabezas_flexo: 4,
  cabezas_screen: 0,
  mallas_blancas: 0,
  mallas_otro_color: 0,
  cobertura_blanco_pct: 80,
  cobertura_otro_pct: 60,
  mallas_cobradas_fuera: false,
  ancho_material_mm: 330,
  suaje_existe: true,
  suaje_precio_usd: 0,
  suaje_prorratear: false,
  suaje_entradas: 1,
  herramienta_existe: true,
  herramienta_precio_usd: 0,
  herramienta_prorratear: false,
  herramienta_entradas: 1,
  desperdicio_pct: 5,
  gasto_adicional_mxn: 0,
};

export default function FormParamsAnalogico({ data, onChange }: Props) {
  const set = <K extends keyof ParamsAnalogico>(k: K, v: ParamsAnalogico[K]) =>
    onChange({ ...data, [k]: v });

  const numField = (
    k: keyof ParamsAnalogico,
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
        onChange={(e) => set(k, (parseFloat(e.target.value) || 0) as ParamsAnalogico[typeof k])}
        className="input-base font-mono-num"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {numField('colores_offset', 'Colores Offset', 0, 5)}
        {numField('cabezas_flexo', 'Cabezas Flexo', 0, 10)}
      </div>

      {/* Screen */}
      <div>
        <label className="block text-xs text-slate-400 mb-1 font-medium">
          Cabezas Serigrafía
        </label>
        <input
          type="number"
          min={0}
          max={2}
          value={data.cabezas_screen ?? ''}
          onChange={(e) => set('cabezas_screen', parseInt(e.target.value) || 0)}
          className="input-base font-mono-num"
        />
      </div>
      {data.cabezas_screen > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 grid grid-cols-2 gap-3">
          {numField('mallas_blancas', 'Mallas blancas', 0, 10)}
          {numField('mallas_otro_color', 'Mallas otro color', 0, 10)}
          {numField('cobertura_blanco_pct', 'Cobertura blanco (%)', 0, 100)}
          {numField('cobertura_otro_pct', 'Cobertura otro (%)', 0, 100)}
        </div>
      )}

      <div className="flex items-center justify-between py-1.5 border-t border-slate-700/40">
        <span className="text-sm text-slate-300">Mallas cobradas por fuera</span>
        <Toggle
          checked={data.mallas_cobradas_fuera}
          onChange={(v) => set('mallas_cobradas_fuera', v)}
          size="sm"
        />
      </div>

      {numField('ancho_material_mm', 'Ancho material analógico (mm)', 0)}

      {/* Suaje */}
      <div className="border-t border-slate-700/40 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">¿Existe el suaje?</span>
          <Toggle
            checked={data.suaje_existe}
            onChange={(v) => set('suaje_existe', v)}
            size="sm"
          />
        </div>
        {!data.suaje_existe && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 grid grid-cols-2 gap-3">
            {numField('suaje_precio_usd', 'Precio suaje (USD)', 0, undefined, 0.01)}
            {numField('suaje_entradas', 'Entradas', 1)}
            <div className="col-span-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">¿Prorratear?</span>
              <Toggle
                checked={data.suaje_prorratear}
                onChange={(v) => set('suaje_prorratear', v)}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Herramienta */}
      <div className="border-t border-slate-700/40 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">¿Existe herramienta?</span>
          <Toggle
            checked={data.herramienta_existe}
            onChange={(v) => set('herramienta_existe', v)}
            size="sm"
          />
        </div>
        {!data.herramienta_existe && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 grid grid-cols-2 gap-3">
            {numField('herramienta_precio_usd', 'Precio herramienta (USD)', 0, undefined, 0.01)}
            {numField('herramienta_entradas', 'Entradas', 1)}
            <div className="col-span-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">¿Prorratear?</span>
              <Toggle
                checked={data.herramienta_prorratear}
                onChange={(v) => set('herramienta_prorratear', v)}
                size="sm"
              />
            </div>
          </div>
        )}
      </div>

      {numField('desperdicio_pct', 'Desperdicio en corrida (%)', 0, 100, 0.5)}
      {numField('gasto_adicional_mxn', 'Gasto adicional (MXN)', 0)}
    </div>
  );
}