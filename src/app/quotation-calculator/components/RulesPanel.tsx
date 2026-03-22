'use client';
import React from 'react';
import { Shield, ShieldOff, Zap, ToggleLeft, Info } from 'lucide-react';
import Toggle from './Toggle';
import { EligibilityRules } from '../../../calculators/analogico';
import { DigitalEligibilityRules } from '../../../calculators/digital';

export interface AllRules extends EligibilityRules, DigitalEligibilityRules {}

interface RulesPanelProps {
  rules: AllRules;
  onRulesChange: (rules: AllRules) => void;
  modoCosto: 'hora' | 'metro';
  onModoCostoChange: (m: 'hora' | 'metro') => void;
}

const RULE_DESCRIPTIONS: Record<keyof AllRules, { label: string; desc: string }> = {
  capacidad_estaciones: {
    label: 'Capacidad de estaciones',
    desc: 'Las cabezas requeridas caben en la máquina',
  },
  entra_eje: {
    label: 'Entra al eje',
    desc: 'Eje + gaps cabe en el ancho de la máquina',
  },
  entra_desarrollo: {
    label: 'Entra al desarrollo',
    desc: 'Desarrollo + gap no supera 635 mm',
  },
  puede_cupon: {
    label: 'Puede hacer cupón',
    desc: 'Solo FA10 puede hacer cupón',
  },
  velocidad_resultante: {
    label: 'Velocidad resultante',
    desc: 'Descarta si velocidad efectiva es 0',
  },
  dimension_digital: {
    label: 'Dimensión digital',
    desc: 'Material cabe en planilla 13" o 30"',
  },
};

export default function RulesPanel({
  rules,
  onRulesChange,
  modoCosto,
  onModoCostoChange,
}: RulesPanelProps) {
  const disabledCount = Object.values(rules).filter((v) => !v).length;

  const toggle = (key: keyof AllRules) => {
    onRulesChange({ ...rules, [key]: !rules[key] });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Modo de costo */}
      <div className="card-base p-4">
        <p className="section-header mb-3">Modo de costo</p>
        <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
          <button
            type="button"
            onClick={() => onModoCostoChange('hora')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all duration-150 ${
              modoCosto === 'hora' ?'bg-orange-500 text-white shadow-sm' :'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap size={14} />
            Por hora
          </button>
          <button
            type="button"
            onClick={() => onModoCostoChange('metro')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all duration-150 ${
              modoCosto === 'metro' ?'bg-orange-500 text-white shadow-sm' :'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ToggleLeft size={14} />
            Por metro
          </button>
        </div>
      </div>

      {/* Simulation warning */}
      {disabledCount > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
          <span className="text-yellow-400 mt-0.5 flex-shrink-0">⚠️</span>
          <p className="text-xs text-yellow-300">
            <span className="font-semibold">MODO SIMULACIÓN:</span>{' '}
            {disabledCount} regla{disabledCount > 1 ? 's' : ''} desactivada
            {disabledCount > 1 ? 's' : ''}. Los resultados pueden incluir
            máquinas normalmente no elegibles.
          </p>
        </div>
      )}

      {/* Rules */}
      <div className="card-base p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="section-header">Reglas de elegibilidad</p>
          {disabledCount > 0 ? (
            <ShieldOff size={14} className="text-yellow-400" />
          ) : (
            <Shield size={14} className="text-green-400" />
          )}
        </div>
        <div className="flex flex-col gap-3">
          {(Object.keys(rules) as Array<keyof AllRules>).map((key) => (
            <div key={key} className="flex items-start gap-3 group">
              <div className="mt-0.5">
                <Toggle
                  checked={rules[key]}
                  onChange={() => toggle(key)}
                  size="sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-tight ${rules[key] ? 'text-slate-200' : 'text-slate-500'}`}>
                  {RULE_DESCRIPTIONS[key].label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {RULE_DESCRIPTIONS[key].desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            onRulesChange({
              capacidad_estaciones: true,
              entra_eje: true,
              entra_desarrollo: true,
              puede_cupon: true,
              velocidad_resultante: true,
              dimension_digital: true,
            })
          }
          className="mt-3 w-full text-xs text-slate-500 hover:text-slate-300 border border-slate-700 rounded-lg py-1.5 transition-colors"
        >
          Activar todas las reglas
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 px-1">
        <Info size={12} className="text-slate-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Desactiva reglas para ver qué pasaría si una máquina pudiera procesar el trabajo fuera de sus especificaciones.
        </p>
      </div>
    </div>
  );
}