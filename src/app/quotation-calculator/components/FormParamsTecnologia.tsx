'use client';
import React from 'react';
import { Cpu, Zap } from 'lucide-react';
import SectionAccordion from './SectionAccordion';
import FormParamsAnalogico, { ParamsAnalogico } from './FormParamsAnalogico';
import FormParamsDigital, { ParamsDigital } from './FormParamsDigital';

interface Props {
  analogico: ParamsAnalogico;
  digital: ParamsDigital;
  onAnalogicoChange: (d: ParamsAnalogico) => void;
  onDigitalChange: (d: ParamsDigital) => void;
}

export default function FormParamsTecnologia({
  analogico,
  digital,
  onAnalogicoChange,
  onDigitalChange,
}: Props) {
  return (
    <SectionAccordion
      title="Parámetros por Tecnología"
      subtitle="Configuración específica de analógico y digital"
      icon={<Cpu size={16} />}
      defaultOpen={true}
      badge="Paso 3"
    >
      <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Analógico */}
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Zap size={14} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-300">Analógico</p>
              <p className="text-xs text-slate-500">Flexo rotativo</p>
            </div>
          </div>
          <FormParamsAnalogico data={analogico} onChange={onAnalogicoChange} />
        </div>

        {/* Digital */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Cpu size={14} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-300">Digital</p>
              <p className="text-xs text-slate-500">HP Indigo</p>
            </div>
          </div>
          <FormParamsDigital data={digital} onChange={onDigitalChange} />
        </div>
      </div>
    </SectionAccordion>
  );
}