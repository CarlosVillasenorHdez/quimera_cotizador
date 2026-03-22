'use client';
import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { GlobalParams, DEFAULT_GLOBAL_PARAMS } from '../../../config/machines';

interface ConfigModalProps {
  params: GlobalParams;
  onChange: (params: GlobalParams) => void;
  onClose: () => void;
}

export default function ConfigModal({ params, onChange, onClose }: ConfigModalProps) {
  const field = (
    key: keyof GlobalParams,
    label: string,
    unit: string,
    step = 1
  ) => (
    <div>
      <label className="block text-xs text-slate-400 mb-1 font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={step}
          value={params[key]}
          onChange={(e) =>
            onChange({ ...params, [key]: parseFloat(e.target.value) || 0 })
          }
          className="input-base font-mono-num"
        />
        <span className="text-xs text-slate-500 whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <div>
            <h2 className="font-semibold text-slate-100">Parámetros Globales</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configuración del motor de cálculo</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_GLOBAL_PARAMS })}
              className="btn-ghost flex items-center gap-1.5 text-xs"
            >
              <RotateCcw size={12} />
              Restaurar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="section-header mb-3">Financiero</p>
            <div className="grid grid-cols-2 gap-4">
              {field('tipo_cambio', 'Tipo de cambio', 'MXN/USD', 0.5)}
              {field('dias_mes', 'Días al mes', 'días')}
              {field('horas_dia', 'Horas por día', 'hrs')}
              {field('eficiencia', 'Eficiencia', '0–1', 0.01)}
              {field('meses_depreciacion', 'Meses depreciación', 'meses')}
            </div>
          </div>
          <div className="col-span-2">
            <p className="section-header mb-3 mt-2">Mecánico / Material</p>
            <div className="grid grid-cols-2 gap-4">
              {field('gap_eje_std', 'Gap eje estándar', 'mm')}
              {field('gap_desarrollo_std', 'Gap desarrollo', 'mm')}
              {field('sobre_ancho_papel', 'Sobre-ancho papel', 'mm')}
              {field('orillas_minimas', 'Orillas mínimas', 'mm', 0.5)}
              {field('metros_cambio_bobina', 'Metros cambio bobina', 'm')}
            </div>
          </div>
          <div className="col-span-2">
            <p className="section-header mb-3 mt-2">Proceso</p>
            <div className="grid grid-cols-2 gap-4">
              {field('merma_estaqueado', 'Merma estaqueado', '(0–1)', 0.01)}
              {field('cobro_minimo', 'Cobro mínimo', 'min')}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end">
          <button type="button" onClick={onClose} className="btn-primary">
            Guardar y cerrar
          </button>
        </div>
      </div>
    </div>
  );
}