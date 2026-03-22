'use client';
import React from 'react';
import { FileText } from 'lucide-react';
import SectionAccordion from './SectionAccordion';
import ScalePills from './ScalePills';
import { SUSTRATOS } from '../../../config/machines';

export interface DatosComunes {
  nombre_trabajo: string;
  eje_mm: number;
  desarrollo_mm: number;
  escalas: number[];
  sustrato: string;
  sustrato_precio_usd_m2: number;
  tamanio_bobina_m: number;
  margen_pct: number;
  tipo_cambio: number;
}

interface Props {
  data: DatosComunes;
  onChange: (d: DatosComunes) => void;
}

export default function FormDatosComunes({ data, onChange }: Props) {
  const set = <K extends keyof DatosComunes>(k: K, v: DatosComunes[K]) =>
    onChange({ ...data, [k]: v });

  const sustratoActual = SUSTRATOS.find((s) => s.label === data.sustrato);
  const esOtro = data.sustrato === 'OTRO';

  const handleSustratoChange = (label: string) => {
    const found = SUSTRATOS.find((s) => s.label === label);
    set('sustrato', label);
    if (found && found.precio_usd_m2 > 0) {
      set('sustrato_precio_usd_m2', found.precio_usd_m2);
    }
  };

  return (
    <SectionAccordion
      title="Datos Comunes"
      subtitle="Aplican a todas las tecnologías"
      icon={<FileText size={16} />}
      defaultOpen={true}
      badge="Paso 1"
    >
      <div className="flex flex-col gap-4 mt-3">
        {/* Nombre trabajo */}
        <div>
          <label className="block text-xs text-slate-400 mb-1 font-medium">
            Nombre / Referencia del trabajo
          </label>
          <input
            type="text"
            value={data.nombre_trabajo}
            onChange={(e) => set('nombre_trabajo', e.target.value)}
            placeholder="Ej: Etiqueta shampoo 500ml — Cliente XYZ"
            className="input-base"
          />
        </div>

        {/* Eje y Desarrollo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Eje (mm) *
            </label>
            <input
              type="number"
              value={data.eje_mm || ''}
              onChange={(e) => set('eje_mm', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="input-base font-mono-num"
            />
            <p className="text-xs text-slate-600 mt-1">Dimensión transversal de la etiqueta</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Desarrollo (mm) *
            </label>
            <input
              type="number"
              value={data.desarrollo_mm || ''}
              onChange={(e) => set('desarrollo_mm', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="input-base font-mono-num"
            />
            <p className="text-xs text-slate-600 mt-1">Dimensión en dirección de impresión</p>
          </div>
        </div>

        {/* Escalas */}
        <div>
          <label className="block text-xs text-slate-400 mb-2 font-medium">
            Escalas a cotizar (millares) — máx. 20
          </label>
          <ScalePills scales={data.escalas} onChange={(s) => set('escalas', s)} maxScales={20} />
        </div>

        {/* Sustrato */}
        <div>
          <label className="block text-xs text-slate-400 mb-1 font-medium">
            Sustrato
          </label>
          <select
            value={data.sustrato}
            onChange={(e) => handleSustratoChange(e.target.value)}
            className="input-base"
          >
            {SUSTRATOS.map((s) => (
              <option key={s.label} value={s.label}>
                {s.label}
                {s.precio_usd_m2 > 0 ? ` — $${s.precio_usd_m2} USD/m²` : ''}
              </option>
            ))}
          </select>
          {esOtro && (
            <div className="mt-2">
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Precio sustrato (USD/m²)
              </label>
              <input
                type="number"
                step="0.01"
                value={data.sustrato_precio_usd_m2 || ''}
                onChange={(e) =>
                  set('sustrato_precio_usd_m2', parseFloat(e.target.value) || 0)
                }
                className="input-base font-mono-num"
                placeholder="0.00"
              />
            </div>
          )}
          {!esOtro && sustratoActual && (
            <p className="text-xs text-slate-600 mt-1">
              Precio referencia: <span className="font-mono-num text-slate-400">${sustratoActual.precio_usd_m2} USD/m²</span>
            </p>
          )}
        </div>

        {/* Bobina, Margen, TC */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Bobina (m)
            </label>
            <input
              type="number"
              value={data.tamanio_bobina_m || ''}
              onChange={(e) => set('tamanio_bobina_m', parseFloat(e.target.value) || 0)}
              className="input-base font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Margen (%)
            </label>
            <input
              type="number"
              step="0.5"
              value={data.margen_pct ?? ''}
              onChange={(e) => set('margen_pct', parseFloat(e.target.value) || 0)}
              className="input-base font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              TC MXN/USD
            </label>
            <input
              type="number"
              step="0.5"
              value={data.tipo_cambio || ''}
              onChange={(e) => set('tipo_cambio', parseFloat(e.target.value) || 22)}
              className="input-base font-mono-num"
            />
          </div>
        </div>
      </div>
    </SectionAccordion>
  );
}