'use client';
import React from 'react';
import { Layers } from 'lucide-react';
import SectionAccordion from './SectionAccordion';
import Toggle from './Toggle';

export interface AcabadosState {
  barniz_brillante_uv: boolean;
  barniz_mate_uv: boolean;
  cast_and_cure: boolean;
  laminado_autoadhesivo_brillante: boolean;
  laminado_autoadhesivo_mate: boolean;
  laminado_uv: boolean;
  hot_stamping: boolean;
  hot_stamping_color: string;
  cold_foil: boolean;
  cold_foil_color: string;
  embossing: boolean;
  hs_embossing: boolean;
  estaqueo: boolean;
  cupon: boolean;
  impresion_adhesivo: boolean;
  reinsercion: boolean;
}

interface Props {
  data: AcabadosState;
  onChange: (d: AcabadosState) => void;
}

export const defaultAcabados: AcabadosState = {
  barniz_brillante_uv: false,
  barniz_mate_uv: false,
  cast_and_cure: false,
  laminado_autoadhesivo_brillante: false,
  laminado_autoadhesivo_mate: false,
  laminado_uv: false,
  hot_stamping: false,
  hot_stamping_color: '',
  cold_foil: false,
  cold_foil_color: '',
  embossing: false,
  hs_embossing: false,
  estaqueo: false,
  cupon: false,
  impresion_adhesivo: false,
  reinsercion: false,
};

export default function FormAcabados({ data, onChange }: Props) {
  const set = <K extends keyof AcabadosState>(k: K, v: AcabadosState[K]) =>
    onChange({ ...data, [k]: v });

  const activeCount = [
    data.barniz_brillante_uv,
    data.barniz_mate_uv,
    data.cast_and_cure,
    data.laminado_autoadhesivo_brillante,
    data.laminado_autoadhesivo_mate,
    data.laminado_uv,
    data.hot_stamping,
    data.cold_foil,
    data.embossing,
    data.hs_embossing,
    data.estaqueo,
    data.cupon,
    data.impresion_adhesivo,
    data.reinsercion,
  ].filter(Boolean).length;

  const handleHsEmbossing = (val: boolean) => {
    onChange({
      ...data,
      hs_embossing: val,
      hot_stamping: val ? false : data.hot_stamping,
      embossing: val ? false : data.embossing,
    });
  };

  const ToggleRow = ({
    fieldKey,
    label,
    disabled = false,
  }: {
    fieldKey: keyof AcabadosState;
    label: string;
    disabled?: boolean;
  }) => (
    <div className={`flex items-center justify-between py-2 ${disabled ? 'opacity-40' : ''}`}>
      <span className="text-sm text-slate-300">{label}</span>
      <Toggle
        checked={data[fieldKey] as boolean}
        onChange={(v) => set(fieldKey, v as AcabadosState[typeof fieldKey])}
        disabled={disabled}
        size="sm"
      />
    </div>
  );

  return (
    <SectionAccordion
      title="Acabados"
      subtitle="Activa los que aplican al trabajo"
      icon={<Layers size={16} />}
      defaultOpen={false}
      badge={activeCount > 0 ? `${activeCount} activo${activeCount > 1 ? 's' : ''}` : undefined}
    >
      <div className="mt-3 flex flex-col gap-1">
        {/* Barnices */}
        <p className="section-header mt-2 mb-1">Barnices</p>
        <div className="bg-slate-800/40 rounded-lg px-3 divide-y divide-slate-700/40">
          <ToggleRow fieldKey="barniz_brillante_uv" label="Barniz Brillante UV" />
          <ToggleRow fieldKey="barniz_mate_uv" label="Barniz Mate UV" />
          <ToggleRow fieldKey="cast_and_cure" label="Cast and Cure" />
        </div>

        {/* Laminados */}
        <p className="section-header mt-4 mb-1">Laminados</p>
        <div className="bg-slate-800/40 rounded-lg px-3 divide-y divide-slate-700/40">
          <ToggleRow fieldKey="laminado_autoadhesivo_brillante" label="Laminado Autoadhesivo Brillante" />
          <ToggleRow fieldKey="laminado_autoadhesivo_mate" label="Laminado Autoadhesivo Mate" />
          <ToggleRow fieldKey="laminado_uv" label="Laminado UV" />
        </div>

        {/* Efectos especiales */}
        <p className="section-header mt-4 mb-1">Efectos especiales</p>
        <div className="bg-slate-800/40 rounded-lg px-3 divide-y divide-slate-700/40">
          <div className="py-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${data.hs_embossing ? 'text-slate-500' : 'text-slate-300'}`}>Hot Stamping</span>
              <Toggle
                checked={data.hot_stamping}
                onChange={(v) => set('hot_stamping', v)}
                disabled={data.hs_embossing}
                size="sm"
              />
            </div>
            {data.hot_stamping && !data.hs_embossing && (
              <input
                type="text"
                value={data.hot_stamping_color}
                onChange={(e) => set('hot_stamping_color', e.target.value)}
                placeholder="Color / foil (ej: Oro 3M)"
                className="input-base mt-2 text-xs"
              />
            )}
          </div>
          <div className="py-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${data.hs_embossing ? 'text-slate-500' : 'text-slate-300'}`}>Cold Foil</span>
              <Toggle
                checked={data.cold_foil}
                onChange={(v) => set('cold_foil', v)}
                size="sm"
              />
            </div>
            {data.cold_foil && (
              <input
                type="text"
                value={data.cold_foil_color}
                onChange={(e) => set('cold_foil_color', e.target.value)}
                placeholder="Color (ej: Plata holográfico)"
                className="input-base mt-2 text-xs"
              />
            )}
          </div>
          <div className="py-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${data.hs_embossing ? 'text-slate-500' : 'text-slate-300'}`}>Embossing</span>
              <Toggle
                checked={data.embossing}
                onChange={(v) => set('embossing', v)}
                disabled={data.hs_embossing}
                size="sm"
              />
            </div>
          </div>
          <div className="py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300 font-medium">HS + Embossing combinado</span>
              <Toggle
                checked={data.hs_embossing}
                onChange={handleHsEmbossing}
                size="sm"
              />
            </div>
            {data.hs_embossing && (
              <p className="text-xs text-yellow-400/70 mt-1">Deshabilita Hot Stamping y Embossing individuales</p>
            )}
          </div>
        </div>

        {/* Otros procesos */}
        <p className="section-header mt-4 mb-1">Otros procesos</p>
        <div className="bg-slate-800/40 rounded-lg px-3 divide-y divide-slate-700/40">
          <ToggleRow fieldKey="estaqueo" label="Estaqueo" />
          <ToggleRow fieldKey="cupon" label="Cupón" />
          <ToggleRow fieldKey="impresion_adhesivo" label="Impresión en adhesivo" />
          <ToggleRow fieldKey="reinsercion" label="Reinserción" />
        </div>
      </div>
    </SectionAccordion>
  );
}