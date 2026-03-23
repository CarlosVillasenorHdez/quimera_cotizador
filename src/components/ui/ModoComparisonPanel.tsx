'use client';
import React, { useMemo, useState } from 'react';
import { BarChart2, X, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { AnalogCostResult } from '../../calculators/analogico';
import { DigitalCostResult } from '../../calculators/digital';

type CostResult = AnalogCostResult | DigitalCostResult;

interface Props {
  scales: number[];
  computeForScale: (scale: number) => CostResult[];
  // computeForScale devuelve resultados con el modo actual.
  // necesitamos poder llamar con modo forzado:
  computeForScaleConModo: (scale: number, modo: 'hora' | 'metro') => CostResult[];
  modoCostoActual: 'hora' | 'metro';
}

export default function ModoComparisonPanel({
  scales,
  computeForScaleConModo,
  modoCostoActual,
}: Props) {
  const [open, setOpen] = useState(false);

  // Calcular diferencias para todas las escalas y máquinas
  const comparacion = useMemo(() => {
    return scales.map(scale => {
      const res_hora  = computeForScaleConModo(scale, 'hora');
      const res_metro = computeForScaleConModo(scale, 'metro');

      // Máquinas elegibles (unión de ambos modos)
      const maquinas = [...new Set([
        ...res_hora.filter(r => r.elegible).map(r => r.machine_id),
        ...res_metro.filter(r => r.elegible).map(r => r.machine_id),
      ])];

      const filas = maquinas.map(mid => {
        const rh = res_hora.find(r => r.machine_id === mid);
        const rm = res_metro.find(r => r.machine_id === mid);
        const cpm_hora  = rh?.elegible ? rh.costo_millar_usd : null;
        const cpm_metro = rm?.elegible ? rm.costo_millar_usd : null;
        // diferencia = hora - metro (negativo = hora más barato)
        const diff = cpm_hora != null && cpm_metro != null
          ? cpm_hora - cpm_metro
          : null;
        return {
          machine_id: mid,
          machine_name: rh?.machine_name ?? rm?.machine_name ?? mid,
          type: rh?.type ?? rm?.type,
          cpm_hora,
          cpm_metro,
          diff,
        // USD/millar: negativo = hora más barato
          diff_pct: diff != null && cpm_metro != null && cpm_metro > 0
            ? (diff / cpm_metro) * 100
            : null,
        };
      });
      return { scale, filas };
    });
  }, [scales, computeForScaleConModo]);

  // Máquinas únicas para las columnas
  const allMachines = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string; type: string }[] = [];
    comparacion.forEach(({ filas }) => filas.forEach(f => {
      if (!seen.has(f.machine_id)) {
        seen.add(f.machine_id);
        result.push({ id: f.machine_id, name: f.machine_name, type: f.type ?? '' });
      }
    }));
    return result;
  }, [comparacion]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-all"
      >
        <BarChart2 size={13} />
        Comparar métodos (HR vs M²)
      </button>
    );
  }

  return (
    <div className="card-base overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <BarChart2 size={15} className="text-purple-400" />
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Comparación POR HORA vs POR M²
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Diferencia = POR HORA − POR M² · Negativo (verde) = Hora más barato
            </p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Modo activo */}
      <div className="px-5 py-2 bg-slate-800/60 border-b border-slate-700/50 flex items-center gap-2">
        <span className="text-xs text-slate-400">Modo activo en la app:</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          modoCostoActual === 'hora' ?'bg-orange-500/20 text-orange-400' :'bg-cyan-500/20 text-cyan-400'
        }`}>
          POR {modoCostoActual === 'hora' ? 'HORA' : 'M²'}
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="text-left px-4 py-2.5 text-slate-400 font-medium sticky left-0 bg-slate-800 z-10">
                Escala
              </th>
              {allMachines.map(m => (
                <th key={m.id} className="px-3 py-2.5 text-center font-medium min-w-[110px]">
                  <span className={m.type === 'analog' ? 'text-purple-300' : 'text-blue-300'}>
                    {m.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparacion.map(({ scale, filas }) => (
              <tr key={scale} className="border-b border-slate-700/40 hover:bg-slate-800/30">
                <td className="px-4 py-2.5 font-semibold text-slate-200 sticky left-0 bg-slate-900/80 z-10">
                  {scale.toLocaleString()}k
                </td>
                {allMachines.map(m => {
                  const fila = filas.find(f => f.machine_id === m.id);
                  if (!fila || fila.diff == null) {
                    return (
                      <td key={m.id} className="px-3 py-2.5 text-center text-slate-600">—</td>
                    );
                  }
                  const isBarato = fila.diff < -0.01;  // hora más barato
                  const isCaro   = fila.diff >  0.01;  // hora más caro
                  const pct = fila.diff_pct;
                  return (
                    <td key={m.id} className={`px-3 py-2.5 text-center font-mono ${
                      isBarato ? 'text-green-400 bg-green-500/5' : isCaro ?'text-red-400 bg-red-500/5' :'text-slate-500'
                    }`}>
                      <div className="flex items-center justify-center gap-1">
                        {isBarato ? <TrendingDown size={10} />
                          : isCaro ? <TrendingUp size={10} />
                          : <Minus size={10} />}
                        <span>
                          {fila.diff > 0 ? '+' : ''}{fila.diff.toFixed(2)}
                          {pct != null && (
                            <span className="text-[10px] ml-0.5 opacity-70">
                              ({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="px-5 py-2.5 bg-slate-800/40 border-t border-slate-700/50 flex flex-wrap items-center gap-4 text-[11px]">
        <div className="flex items-center gap-1.5 text-green-400">
          <TrendingDown size={11} />
          <span>Negativo = POR HORA más barato (ahorra vs M²)</span>
        </div>
        <div className="flex items-center gap-1.5 text-red-400">
          <TrendingUp size={11} />
          <span>Positivo = POR HORA más caro (cuesta más vs M²)</span>
        </div>
        <div className="text-slate-500">Valores en USD/millar</div>
      </div>
    </div>
  );
}
