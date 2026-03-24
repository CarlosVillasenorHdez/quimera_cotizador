'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Settings, Copy, CheckCheck, Menu, X, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Toaster, toast } from 'sonner';

import FormDatosComunes, { DatosComunes } from './components/FormDatosComunes';
import FormAcabados, { AcabadosState, defaultAcabados } from './components/FormAcabados';
import FormParamsTecnologia from './components/FormParamsTecnologia';
import FormParamsAnalogico, { ParamsAnalogico, defaultParamsAnalogico } from './components/FormParamsAnalogico';
import FormParamsDigital, { ParamsDigital, defaultParamsDigital } from './components/FormParamsDigital';
import RulesPanel, { AllRules } from './components/RulesPanel';
import ResultsTable from './components/ResultsTable';
import ConfigModal from './components/ConfigModal';
import CurvesChart from './components/CurvesChart';
import OverheadPanel, { OverheadState, defaultOverheadState, MachineOverride } from './components/OverheadPanel';
import ParametersTab, { ParametersState, defaultParametersState } from './components/ParametersTab';
import AlgoritmoTab from './components/AlgoritmoTab';
import ModoComparisonPanel from '../../components/ui/ModoComparisonPanel';

import { ANALOG_MACHINES, DIGITAL_MACHINES, DEFAULT_GLOBAL_PARAMS, GlobalParams } from '../../config/machines';
import { calcularCostoAnalogico, AnalogCostResult } from '../../calculators/analogico';
import { calcularCostoDigital, DigitalCostResult } from '../../calculators/digital';

type CostResult = AnalogCostResult | DigitalCostResult;
type MainTab = 'cotizador' | 'parametros' | 'algoritmo';

const defaultDatosComunes: DatosComunes = {
  nombre_trabajo: '',
  eje_mm: 50,
  desarrollo_mm: 80,
  escalas: [0.5, 1, 2, 3, 5, 8, 10, 20, 30, 60, 100, 250, 500, 750, 1000],
  sustrato: 'BOPP Blanco',
  sustrato_precio_usd_m2: 0.92,
  tamanio_bobina_m: 1500,
  margen_pct: 0,
  tipo_cambio: 22,
};

const defaultRules: AllRules = {
  capacidad_estaciones: true,
  entra_eje: true,
  entra_desarrollo: true,
  puede_cupon: true,
  velocidad_resultante: true,
  dimension_digital: true,
};

export default function QuotationCalculatorPage() {
  const [mainTab, setMainTab] = useState<MainTab>('cotizador');
  const [datosComunes, setDatosComunes] = useState<DatosComunes>(defaultDatosComunes);
  const [acabados, setAcabados] = useState<AcabadosState>(defaultAcabados);
  const [paramsAnalogico, setParamsAnalogico] = useState<ParamsAnalogico>(defaultParamsAnalogico);
  const [paramsDigital, setParamsDigital] = useState<ParamsDigital>(defaultParamsDigital);
  const [rules, setRules] = useState<AllRules>(defaultRules);
  const [modoCosto, setModoCosto] = useState<'hora' | 'metro'>('hora');
  const [globalParams, setGlobalParams] = useState<GlobalParams>(DEFAULT_GLOBAL_PARAMS);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeScale, setActiveScale] = useState<number>(datosComunes.escalas[3] || 10);
  const [allScaleResults, setAllScaleResults] = useState<Record<number, CostResult[]>>({});
  const [currentResults, setCurrentResults] = useState<CostResult[]>([]);
  const [mobileTab, setMobileTab] = useState<'form' | 'results'>('form');
  const [mobileRulesOpen, setMobileRulesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [overhead, setOverhead] = useState<OverheadState>(defaultOverheadState);
  const [machineParameters, setMachineParameters] = useState<ParametersState>(defaultParametersState);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Build acabados map
  const acabadosMap = useMemo<Record<string, boolean>>(() => ({
    barniz_brillante_uv: acabados.barniz_brillante_uv,
    barniz_mate_uv: acabados.barniz_mate_uv,
    cast_and_cure: acabados.cast_and_cure,
    laminado_autoadhesivo_brillante: acabados.laminado_autoadhesivo_brillante,
    laminado_autoadhesivo_mate: acabados.laminado_autoadhesivo_mate,
    laminado_uv: acabados.laminado_uv,
    hot_stamping: acabados.hot_stamping || acabados.hs_embossing,
    cold_foil: acabados.cold_foil,
    embossing: acabados.embossing || acabados.hs_embossing,
    hs_embossing: acabados.hs_embossing,
    estaqueo: acabados.estaqueo,
    cupon: acabados.cupon,
    impresion_adhesivo: acabados.impresion_adhesivo,
    reinsercion: acabados.reinsercion,
  }), [acabados]);

  // Build effective GlobalParams from overhead state
  const effectiveGlobalParams = useMemo<GlobalParams>(() => ({
    ...globalParams,
    tipo_cambio: datosComunes.tipo_cambio,
    dias_mes: overhead.diasMes,
    horas_dia: overhead.horasDia,
    eficiencia: overhead.factorEficiencia,
  }), [globalParams, datosComunes.tipo_cambio, overhead.diasMes, overhead.horasDia, overhead.factorEficiencia]);

  // ERROR 2 FIX: Compute overhead fee/hr from ParametersTab overheadConceptos.
  // The fee/hr is already prorrateado per machine: gasto_division / nro_maquinas / horas_disponibles
  // We must NOT divide again by nro_maquinas when applying it.
  // Separate totals for digital machines and analog machines.
  const overheadFeeHrDigital = useMemo(() => {
    const horas_disponibles = overhead.diasMes * overhead.horasDia * overhead.factorEficiencia;
    return machineParameters.overheadConceptos.reduce((sum, o) => {
      const gasto_div = o.gasto_mensual_usd * o.pct_digital;
      const fee_hr = (o.nro_maquinas > 0 && horas_disponibles > 0)
        ? gasto_div / o.nro_maquinas / horas_disponibles
        : 0;
      return sum + fee_hr;
    }, 0);
  }, [machineParameters.overheadConceptos, overhead.diasMes, overhead.horasDia, overhead.factorEficiencia]);

  const overheadFeeHrAnalog = useMemo(() => {
    const horas_disponibles = overhead.diasMes * overhead.horasDia * overhead.factorEficiencia;
    return machineParameters.overheadConceptos.reduce((sum, o) => {
      const pct_analog = 1 - o.pct_digital;
      const gasto_div = o.gasto_mensual_usd * pct_analog;
      // Use nro_maquinas_analog from the concepto if available, else derive from nro_maquinas
      const nro_analog = o.nro_maquinas_analog ?? Math.max(1, Math.round(o.nro_maquinas * (1 - o.pct_digital) / o.pct_digital));
      const fee_hr = (nro_analog > 0 && horas_disponibles > 0)
        ? gasto_div / nro_analog / horas_disponibles
        : 0;
      return sum + fee_hr;
    }, 0);
  }, [machineParameters.overheadConceptos, overhead.diasMes, overhead.horasDia, overhead.factorEficiencia]);

  // Get effective overhead for a machine
  const getMachineOverhead = useCallback((machineId: string, machineType: 'analog' | 'digital'): { overheadHr: number; overrideHr?: number } => {
    const perM: MachineOverride | undefined = overhead.perMachine[machineId];

    // ── ANALÓGICO ──────────────────────────────────────────────────────────
    // Para máquinas analógicas retornamos overheadHr=0 siempre.
    // calcularCostoAnalogico tiene su propio bloque de overhead que lee
    // job.modo_costo y aplica correctamente POR_METRO (sobre m2_cobrar)
    // o POR_HORA (sobre tiempo_cobrar_hrs) usando las constantes del Excel.
    // Si pasamos overheadUsdHr > 0, ese bloque interno queda bloqueado
    // por la guarda "if (overheadUsdHr === 0)" y el toggle no tiene efecto.
    if (machineType === 'analog') {
      if (perM?.useOverride && perM.overrideTotal !== undefined) {
        return { overheadHr: 0, overrideHr: perM.overrideTotal };
      }
      return { overheadHr: 0 };
    }

    // ── DIGITAL ────────────────────────────────────────────────────────────
    // Para digital sí pasamos el fee/hr calculado desde overheadConceptos.
    const baseOverheadFromParams = overheadFeeHrDigital;
    const globalAdd = overhead.overheadGlobalMode === 'hr' ? overhead.overheadGlobalUsdHr : 0;
    const indAdd = perM?.overheadIndividual || 0;
    const totalOverhead = baseOverheadFromParams + globalAdd + indAdd;

    if (perM?.useOverride && perM.overrideTotal !== undefined) {
      return { overheadHr: 0, overrideHr: perM.overrideTotal };
    }
    return { overheadHr: totalOverhead };
  }, [overhead, overheadFeeHrDigital]);

  const computeResultsForScale = useCallback(
    (scale: number): CostResult[] => {
      const params = effectiveGlobalParams;

      const analogResults: AnalogCostResult[] = ANALOG_MACHINES.map((machine) => {
        const { overheadHr, overrideHr } = getMachineOverhead(machine.id, 'analog');
        const machineP = machineParameters.analogMachines.find(m => m.id === machine.id);
        return calcularCostoAnalogico(
          machine,
          {
            eje_mm: datosComunes.eje_mm,
            desarrollo_mm: datosComunes.desarrollo_mm,
            cantidad_millares: scale,
            sustrato_precio_usd_m2: datosComunes.sustrato_precio_usd_m2,
            ancho_material_mm: paramsAnalogico.ancho_material_mm,
            colores_offset: paramsAnalogico.colores_offset,
            cabezas_flexo: paramsAnalogico.cabezas_flexo,
            cabezas_screen: paramsAnalogico.cabezas_screen,
            mallas_cobradas_fuera: paramsAnalogico.mallas_cobradas_fuera,
            suaje_existe: paramsAnalogico.suaje_existe,
            suaje_precio_usd: paramsAnalogico.suaje_precio_usd,
            suaje_prorratear: paramsAnalogico.suaje_prorratear,
            suaje_entradas: paramsAnalogico.suaje_entradas,
            herramienta_existe: paramsAnalogico.herramienta_existe,
            herramienta_precio_usd: paramsAnalogico.herramienta_precio_usd,
            herramienta_prorratear: paramsAnalogico.herramienta_prorratear,
            herramienta_entradas: paramsAnalogico.herramienta_entradas,
            desperdicio_pct: paramsAnalogico.desperdicio_pct,
            gasto_adicional_mxn: paramsAnalogico.gasto_adicional_mxn,
            necesita_cupon: acabados.cupon,
            necesita_cold_foil: acabados.cold_foil,
            necesita_hot_stamping: acabados.hot_stamping || acabados.hs_embossing,
            necesita_embossing: acabados.embossing || acabados.hs_embossing,
            necesita_screen: paramsAnalogico.cabezas_screen > 0,
            margen_pct: datosComunes.margen_pct,
            modo_costo: modoCosto,
            tamanio_bobina_m: datosComunes.tamanio_bobina_m,
          },
          params,
          rules,
          acabadosMap,
          overheadHr,
          overrideHr,
          machineP
        );
      });

      const digitalResults: DigitalCostResult[] = DIGITAL_MACHINES.map((machine) => {
        const { overheadHr, overrideHr } = getMachineOverhead(machine.id, 'digital');
        const machineP = machineParameters.digitalMachines.find(m => m.id === machine.id);
        return calcularCostoDigital(
          machine,
          {
            eje_mm: datosComunes.eje_mm,
            desarrollo_mm: datosComunes.desarrollo_mm,
            cantidad_millares: scale,
            sustrato_precio_usd_m2: datosComunes.sustrato_precio_usd_m2,
            ancho_material_mm: paramsDigital.ancho_material_mm,
            ancho_material_20mil_mm: paramsDigital.ancho_material_20mil_mm,
            num_tintas: paramsDigital.num_tintas,
            cama_blanco: paramsDigital.cama_blanco,
            blanco_cobertura_pct: paramsDigital.blanco_cobertura_pct,
            blanco_num_camas: paramsDigital.blanco_num_camas,
            tinta_plata: paramsDigital.tinta_plata,
            plata_cobertura_pct: paramsDigital.plata_cobertura_pct,
            plata_num_camas: paramsDigital.plata_num_camas,
            tinta_invisible: paramsDigital.tinta_invisible,
            tinta_pink: paramsDigital.tinta_pink,
            tinta_raised: paramsDigital.tinta_raised,
            usa_primer_extra: paramsDigital.usa_primer_extra,
            pasos_omega: paramsDigital.pasos_omega,
            pasos_estampador: paramsDigital.pasos_estampador,
            pasos_jtfix: paramsDigital.pasos_jtfix,
            reinsercion_digital: paramsDigital.reinsercion_digital,
            flete_externo: paramsDigital.flete_externo,
            flete_monto_mxn: paramsDigital.flete_monto_mxn,
            margen_pct: datosComunes.margen_pct,
            modo_costo: modoCosto,
            desperdicio_pct: paramsDigital.desperdicio_pct,
          },
          params,
          rules,
          acabadosMap,
          overheadHr,
          overrideHr,
          machineP,
          machineParameters.speedTable,
          machineParameters.clickValues
        );
      });

      return [...analogResults, ...digitalResults];
    },
    [datosComunes, acabados, acabadosMap, paramsAnalogico, paramsDigital, effectiveGlobalParams, rules, modoCosto, getMachineOverhead, machineParameters]
  );

  // Función auxiliar para comparar modos — siempre recalcula con el modo forzado
  const computeForScaleConModo = useCallback(
    (scale: number, modoForzado: 'hora' | 'metro'): CostResult[] => {
      const params = effectiveGlobalParams;

      const analogResults: AnalogCostResult[] = ANALOG_MACHINES.map((machine) => {
        const { overheadHr, overrideHr } = getMachineOverhead(machine.id, 'analog');
        const machineP = machineParameters.analogMachines.find(m => m.id === machine.id);
        return calcularCostoAnalogico(
          machine,
          {
            eje_mm: datosComunes.eje_mm,
            desarrollo_mm: datosComunes.desarrollo_mm,
            cantidad_millares: scale,
            sustrato_precio_usd_m2: datosComunes.sustrato_precio_usd_m2,
            ancho_material_mm: paramsAnalogico.ancho_material_mm,
            colores_offset: paramsAnalogico.colores_offset,
            cabezas_flexo: paramsAnalogico.cabezas_flexo,
            cabezas_screen: paramsAnalogico.cabezas_screen,
            mallas_cobradas_fuera: paramsAnalogico.mallas_cobradas_fuera,
            suaje_existe: paramsAnalogico.suaje_existe,
            suaje_precio_usd: paramsAnalogico.suaje_precio_usd,
            suaje_prorratear: paramsAnalogico.suaje_prorratear,
            suaje_entradas: paramsAnalogico.suaje_entradas,
            herramienta_existe: paramsAnalogico.herramienta_existe,
            herramienta_precio_usd: paramsAnalogico.herramienta_precio_usd,
            herramienta_prorratear: paramsAnalogico.herramienta_prorratear,
            herramienta_entradas: paramsAnalogico.herramienta_entradas,
            desperdicio_pct: paramsAnalogico.desperdicio_pct,
            gasto_adicional_mxn: paramsAnalogico.gasto_adicional_mxn,
            necesita_cupon: acabados.cupon,
            necesita_cold_foil: acabados.cold_foil,
            necesita_hot_stamping: acabados.hot_stamping || acabados.hs_embossing,
            necesita_embossing: acabados.embossing || acabados.hs_embossing,
            necesita_screen: paramsAnalogico.cabezas_screen > 0,
            margen_pct: datosComunes.margen_pct,
            modo_costo: modoForzado,
            tamanio_bobina_m: datosComunes.tamanio_bobina_m,
          },
          params,
          rules,
          acabadosMap,
          overheadHr,
          overrideHr,
          machineP
        );
      });

      const digitalResults: DigitalCostResult[] = DIGITAL_MACHINES.map((machine) => {
        const { overheadHr, overrideHr } = getMachineOverhead(machine.id, 'digital');
        const machineP = machineParameters.digitalMachines.find(m => m.id === machine.id);
        return calcularCostoDigital(
          machine,
          {
            eje_mm: datosComunes.eje_mm,
            desarrollo_mm: datosComunes.desarrollo_mm,
            cantidad_millares: scale,
            sustrato_precio_usd_m2: datosComunes.sustrato_precio_usd_m2,
            ancho_material_mm: paramsDigital.ancho_material_mm,
            ancho_material_20mil_mm: paramsDigital.ancho_material_20mil_mm,
            num_tintas: paramsDigital.num_tintas,
            cama_blanco: paramsDigital.cama_blanco,
            blanco_cobertura_pct: paramsDigital.blanco_cobertura_pct,
            blanco_num_camas: paramsDigital.blanco_num_camas,
            tinta_plata: paramsDigital.tinta_plata,
            plata_cobertura_pct: paramsDigital.plata_cobertura_pct,
            plata_num_camas: paramsDigital.plata_num_camas,
            tinta_invisible: paramsDigital.tinta_invisible,
            tinta_pink: paramsDigital.tinta_pink,
            tinta_raised: paramsDigital.tinta_raised,
            usa_primer_extra: paramsDigital.usa_primer_extra,
            pasos_omega: paramsDigital.pasos_omega,
            pasos_estampador: paramsDigital.pasos_estampador,
            pasos_jtfix: paramsDigital.pasos_jtfix,
            reinsercion_digital: paramsDigital.reinsercion_digital,
            flete_externo: paramsDigital.flete_externo,
            flete_monto_mxn: paramsDigital.flete_monto_mxn,
            margen_pct: datosComunes.margen_pct,
            modo_costo: modoForzado,
            desperdicio_pct: paramsDigital.desperdicio_pct,
          },
          params,
          rules,
          acabadosMap,
          overheadHr,
          overrideHr,
          machineP,
          machineParameters.speedTable,
          machineParameters.clickValues
        );
      });

      return [...analogResults, ...digitalResults];
    },
    // NOTE: NO incluir modoCosto — este siempre usa el parámetro modoForzado
    [datosComunes, acabados, acabadosMap, paramsAnalogico, paramsDigital, effectiveGlobalParams, rules, getMachineOverhead, machineParameters]
  );

  const runCalculations = useCallback(() => {
    const newAllResults: Record<number, CostResult[]> = {};
    datosComunes.escalas.forEach((scale) => {
      newAllResults[scale] = computeResultsForScale(scale);
    });
    setAllScaleResults(newAllResults);

    const currentScale = datosComunes.escalas.includes(activeScale)
      ? activeScale
      : datosComunes.escalas[0];
    if (currentScale !== activeScale) setActiveScale(currentScale);
    setCurrentResults(newAllResults[currentScale] || []);
  }, [computeResultsForScale, datosComunes.escalas, activeScale]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runCalculations();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [runCalculations]);

  useEffect(() => {
    if (allScaleResults[activeScale]) {
      setCurrentResults(allScaleResults[activeScale]);
    }
  }, [activeScale, allScaleResults]);

  const disabledRulesCount = Object.values(rules).filter((v) => !v).length;
  const simulationActive = disabledRulesCount > 0;

  const handleExport = () => {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════');
    lines.push('  QUIMERA COTIZADOR — Resumen de Cotización');
    lines.push('═══════════════════════════════════════════════');
    if (datosComunes.nombre_trabajo) {
      lines.push(`  Trabajo: ${datosComunes.nombre_trabajo}`);
    }
    lines.push(`  Eje: ${datosComunes.eje_mm} mm | Desarrollo: ${datosComunes.desarrollo_mm} mm`);
    lines.push(`  Sustrato: ${datosComunes.sustrato} @ $${datosComunes.sustrato_precio_usd_m2} USD/m²`);
    lines.push(`  Tipo de cambio: ${datosComunes.tipo_cambio} MXN/USD`);
    lines.push(`  Margen: ${datosComunes.margen_pct}%`);
    lines.push('');

    datosComunes.escalas.forEach((scale) => {
      const results = allScaleResults[scale] || [];
      const eligible = results
        .filter((r) => r.elegible)
        .sort((a, b) => a.costo_millar_usd - b.costo_millar_usd);

      lines.push(`  ── Escala: ${scale.toLocaleString()}k etiquetas ──`);
      if (eligible.length === 0) {
        lines.push('     Sin máquinas elegibles');
      } else {
        eligible.forEach((r, i) => {
          lines.push(
            `  ${i + 1}. ${r.machine_name.padEnd(10)} $${r.costo_millar_usd.toFixed(2)} USD/millar  ($${r.costo_millar_mxn.toFixed(0)} MXN)${r.cobro_minimo_activo ? ' ⏱ cobro mín.' : ''}`
          );
        });
      }
      lines.push('');
    });

    lines.push('═══════════════════════════════════════════════');
    lines.push(`  Generado: ${new Date().toLocaleString('es-MX')}`);
    lines.push('═══════════════════════════════════════════════');

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      toast.success('Cotización copiada al portapapeles');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <Toaster position="bottom-right" theme="dark" richColors />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <span className="font-bold text-slate-100 text-base tracking-tight hidden sm:block">
                Quimera <span className="text-orange-400">Cotizador</span>
              </span>
            </div>
            <span className="hidden md:block text-slate-700 text-lg">|</span>

            {/* Main tab navigation */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setMainTab('cotizador')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mainTab === 'cotizador'
                    ? 'bg-slate-600 text-slate-100' :'text-slate-500 hover:text-slate-300'
                }`}
              >
                Cotizador
              </button>
              <button
                type="button"
                onClick={() => setMainTab('parametros')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mainTab === 'parametros' ?'bg-orange-600 text-white' :'text-slate-500 hover:text-slate-300'
                }`}
              >
                <SlidersHorizontal size={12} />
                Parámetros
              </button>
              <button
                type="button"
                onClick={() => setMainTab('algoritmo')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mainTab === 'algoritmo' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Algoritmo
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mainTab === 'cotizador' && (
              <>
                <div className="flex lg:hidden bg-slate-800 rounded-lg p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setMobileTab('form')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      mobileTab === 'form'
                        ? 'bg-slate-600 text-slate-100' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Formulario
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileTab('results')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      mobileTab === 'results' ? 'bg-slate-600 text-slate-100' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Resultados
                    {currentResults.filter((r) => r.elegible).length > 0 && (
                      <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 font-mono-num">
                        {currentResults.filter((r) => r.elegible).length}
                      </span>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileRulesOpen(true)}
                  className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Reglas y modo de cálculo"
                >
                  <Menu size={18} />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100 border border-slate-700 transition-all"
            >
              {copied ? (
                <>
                  <CheckCheck size={14} className="text-green-400" />
                  <span className="hidden sm:inline text-green-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span className="hidden sm:inline">Exportar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-slate-800 transition-colors"
              title="Parámetros globales"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-4 lg:px-8 py-5">

        {/* ── PARAMETERS TAB ── */}
        {mainTab === 'parametros' && (
          <ParametersTab
            params={machineParameters}
            onChange={setMachineParameters}
            globalParams={effectiveGlobalParams}
          />
        )}

        {/* ── ALGORITMO TAB ── */}
        {mainTab === 'algoritmo' && (
          <AlgoritmoTab
            computeForScale={computeResultsForScale}
            scales={datosComunes.escalas}
            datosComunes={datosComunes}
            modoCosto={modoCosto}
            machineParameters={machineParameters}
            onMachineParametersChange={setMachineParameters}
            globalParams={effectiveGlobalParams}
          />
        )}

        {/* ── COTIZADOR TAB ── */}
        {mainTab === 'cotizador' && (
          <div className="flex gap-5 items-start">

            {/* ── LEFT: Form ── */}
            <div
              className={`flex-shrink-0 w-full lg:w-[420px] xl:w-[460px] flex flex-col gap-4 ${
                mobileTab === 'results' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <FormDatosComunes data={datosComunes} onChange={setDatosComunes} />
              <FormAcabados data={acabados} onChange={setAcabados} />
              <FormParamsTecnologia
                analogico={paramsAnalogico}
                digital={paramsDigital}
                onAnalogicoChange={setParamsAnalogico}
                onDigitalChange={setParamsDigital}
              />
            </div>

            {/* ── CENTER: Results + Charts + Overhead ── */}
            <div
              className={`flex-1 min-w-0 flex flex-col gap-4 ${
                mobileTab === 'form' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Results header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-100 text-base">
                    Comparativo de máquinas
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentResults.filter((r) => r.elegible).length} de{' '}
                    {currentResults.length} máquinas elegibles para esta escala
                  </p>
                </div>
                {datosComunes.nombre_trabajo && (
                  <div className="hidden sm:flex items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                    <ChevronRight size={12} className="text-orange-400" />
                    <span className="text-xs text-slate-300 max-w-[200px] truncate">
                      {datosComunes.nombre_trabajo}
                    </span>
                  </div>
                )}
              </div>

              <ResultsTable
                results={currentResults}
                scales={datosComunes.escalas}
                allScaleResults={allScaleResults}
                activeScale={activeScale}
                onScaleChange={(s) => {
                  setActiveScale(s);
                  setCurrentResults(allScaleResults[s] || []);
                }}
                simulationActive={simulationActive}
                disabledRulesCount={disabledRulesCount}
              />

              {/* Cost Curves Chart */}
              <CurvesChart
                allScaleResults={allScaleResults}
                scales={datosComunes.escalas}
                nombreTrabajo={datosComunes.nombre_trabajo}
                ejeMm={datosComunes.eje_mm}
                desarrolloMm={datosComunes.desarrollo_mm}
                computeForScale={computeResultsForScale}
                anchoMaterialMm={paramsAnalogico.ancho_material_mm}
                sobreAncho={effectiveGlobalParams.sobre_ancho_papel}
                gapEje={effectiveGlobalParams.gap_eje_std}
                orillas={effectiveGlobalParams.orillas_minimas}
                mermaAnalog={paramsAnalogico.desperdicio_pct}
                mermaDigital={paramsDigital.desperdicio_pct}
                anchoMaterial20milMm={paramsDigital.ancho_material_20mil_mm}
              />

              {/* Overhead Panel */}
              <OverheadPanel
                overhead={overhead}
                onChange={setOverhead}
                globalParams={effectiveGlobalParams}
                scales={datosComunes.escalas}
                computeForScale={computeResultsForScale}
              />

              {/* Modo Comparison Panel */}
              <ModoComparisonPanel
                scales={datosComunes.escalas}
                computeForScale={computeResultsForScale}
                computeForScaleConModo={computeForScaleConModo}
                modoCostoActual={modoCosto}
              />
            </div>

            {/* ── RIGHT: Rules Panel (desktop) ── */}
            <div className="hidden lg:block flex-shrink-0 w-[220px] xl:w-[240px] sticky top-20">
              <RulesPanel
                rules={rules}
                onRulesChange={setRules}
                modoCosto={modoCosto}
                onModoCostoChange={setModoCosto}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile rules drawer */}
      {mobileRulesOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileRulesOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-slate-900 border-l border-slate-700 p-5 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-100">Modo y Reglas</h3>
              <button
                type="button"
                onClick={() => setMobileRulesOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <RulesPanel
              rules={rules}
              onRulesChange={setRules}
              modoCosto={modoCosto}
              onModoCostoChange={setModoCosto}
            />
          </div>
        </div>
      )}

      {/* Config modal */}
      {showConfigModal && (
        <ConfigModal
          params={globalParams}
          onChange={setGlobalParams}
          onClose={() => setShowConfigModal(false)}
        />
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          header, .no-print { display: none !important; }
          #curves-chart-section { page-break-inside: avoid; }
          .recharts-wrapper svg { filter: none !important; }
        }
      `}</style>
    </div>
  );
}