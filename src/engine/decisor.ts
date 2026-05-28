/**
 * MOTOR DE DECISIÓN TÉCNICA
 *
 * Evalúa cada máquina contra los requerimientos técnicos de una etiqueta
 * y produce un veredicto: viable o no viable, con razón técnica completa.
 *
 * Este módulo NO calcula costos. Solo evalúa factibilidad técnica y metros.
 */

import {
  DatosEtiqueta, MaquinaDigital, MaquinaAnalog,
  MAQUINAS_DIGITAL, MAQUINAS_ANALOG,
  calcMetrosDigital, calcMetrosAnalog, buscarCruceDigital,
  seleccionarCilindro, UMBRALES,
} from './knowledge';

// ─── TIPOS DE RESULTADO ───────────────────────────────────────────────────────

/** Una razón por la que una máquina NO puede hacer el trabajo */
export interface Rechazo {
  codigo: string;       // Identificador técnico
  descripcion: string;  // Texto para el ingeniero
  critico: boolean;     // false = advertencia, true = bloqueo total
}

/** Resultado del análisis para una máquina */
export interface ResultadoMaquina {
  id: string;
  nombre: string;
  tipo: 'digital' | 'analog';
  viable: boolean;
  rechazos: Rechazo[];
  advertencias: Rechazo[];

  // Si viable:
  cav_eje?: number;
  cav_des?: number;
  metros_1k?: number;         // metros para 1,000 piezas
  cilindro_dientes?: number;  // solo analógicas
  cilindro_gap_mm?: number;

  // Punto de cambio (metros → millares)
  rango_desde_k?: number;     // 0 para el primero
  rango_hasta_k?: number | null;  // null = sin límite superior
}

/** Resultado completo del análisis */
export interface ResultadoAnalisis {
  viable_digital: ResultadoMaquina[];
  viable_analog: ResultadoMaquina[];
  no_viable: ResultadoMaquina[];

  // Puntos de cruce (en millares)
  cruce_6mil_v12: number | null;
  cruce_digital_analog: number | null;

  // Explicación del cálculo de metros → millares
  explicacion_metros: {
    maquina_ref: string;
    umbral_metros: number;
    millares_resultado: number;
    cav_eje: number;
    cav_des: number;
    cav_total: number;
    frames_aprox: number;
    metros_por_frame: number;
  } | null;

  // Resumen ejecutivo
  resumen: string;
  recomendacion_principal: string;

  // Mapa de cantidades del RFQ
  mapa_cantidades: Array<{
    cantidad: number;
    maquina_id: string;
    maquina_nombre: string;
    tipo: 'digital' | 'analog';
    justificacion: string;
  }>;
}

// ─── EVALUADOR DIGITAL ────────────────────────────────────────────────────────

function evaluarDigital(m: MaquinaDigital, e: DatosEtiqueta): ResultadoMaquina {
  const rechazos: Rechazo[] = [];
  const advertencias: Rechazo[] = [];

  // 1. Dimensiones — ¿cabe en la planilla?
  const cav_eje = Math.floor(m.planilla_mm / (e.eje_mm + m.gap_eje_mm));
  if (cav_eje < 1) {
    rechazos.push({
      codigo: 'EJE_FUERA',
      descripcion: `Eje ${e.eje_mm}mm + gap ${m.gap_eje_mm}mm = ${e.eje_mm + m.gap_eje_mm}mm supera la planilla de ${m.planilla_mm}mm`,
      critico: true,
    });
  }

  // 2. Desarrollo — ¿cabe en el frame?
  const cav_des_raw = Math.floor(m.frame_cm * 10 / (e.des_mm + m.gap_des_mm * 2));
  if (cav_des_raw < 1) {
    rechazos.push({
      codigo: 'DES_FUERA',
      descripcion: `Desarrollo ${e.des_mm}mm supera el frame de ${m.frame_cm * 10}mm`,
      critico: true,
    });
  }

  // 3. Tinta plata
  if (e.tiene_plata && !m.soporta_plata) {
    rechazos.push({
      codigo: 'SIN_PLATA',
      descripcion: `${m.nombre} no tiene estación de tinta plata/metálica`,
      critico: true,
    });
  }

  // 4. Número de tintas
  const tintas_total = e.tintas_proceso
    + (e.tiene_blanco ? 1 : 0)
    + (e.tiene_plata ? 1 : 0)
    + (e.tiene_invisible ? 1 : 0);
  if (tintas_total > m.tintas_max) {
    rechazos.push({
      codigo: 'TINTAS_EXCEDEN',
      descripcion: `Requiere ${tintas_total} tintas, ${m.nombre} soporta máximo ${m.tintas_max}`,
      critico: true,
    });
  }

  // 5. Acabados que digitales no pueden hacer inline
  if (e.tiene_screen) {
    rechazos.push({
      codigo: 'SIN_SCREEN',
      descripcion: 'Las prensas digitales HP no tienen estación de serigrafía',
      critico: true,
    });
  }
  if (e.tiene_embossing) {
    rechazos.push({
      codigo: 'SIN_EMBOSSING',
      descripcion: 'Las prensas digitales HP no tienen embossing inline (requiere proceso aparte)',
      critico: false, // advertencia — se puede hacer fuera de línea
    });
  }
  if (e.tiene_hot_stamping) {
    advertencias.push({
      codigo: 'HS_FUERA_LINEA',
      descripcion: 'Hot stamping se realiza fuera de línea en prensas digitales (postproceso)',
      critico: false,
    });
  }

  // 6. Setup alto (V12) — advertir en volúmenes bajos
  if (m.id === 'V12' && m.setup_m >= 100) {
    advertencias.push({
      codigo: 'SETUP_ALTO',
      descripcion: `Setup de ${m.setup_m}m en V12 — no es eficiente para tirajes menores a ~${Math.ceil(m.setup_m / 0.1)}k pzas aprox.`,
      critico: false,
    });
  }

  if (rechazos.length > 0) {
    return { id: m.id, nombre: m.nombre, tipo: 'digital', viable: false, rechazos, advertencias };
  }

  // Calcular metros y cavidades para 1,000 pzas
  const r1k = calcMetrosDigital(m, e.eje_mm, e.des_mm, 1000);
  return {
    id: m.id, nombre: m.nombre, tipo: 'digital', viable: true,
    rechazos: [], advertencias,
    cav_eje: r1k?.cav_eje, cav_des: r1k?.cav_des,
    metros_1k: r1k ? Math.round(r1k.metros) : undefined,
  };
}

// ─── EVALUADOR ANALÓGICO ──────────────────────────────────────────────────────

function evaluarAnalog(m: MaquinaAnalog, e: DatosEtiqueta): ResultadoMaquina {
  const rechazos: Rechazo[] = [];
  const advertencias: Rechazo[] = [];

  // 1. Dimensiones — ¿cabe al eje?
  const cav_eje = Math.floor((m.ancho_max_mm - 18) / (e.eje_mm + m.gap_eje_mm));
  if (cav_eje < 1) {
    rechazos.push({
      codigo: 'EJE_FUERA',
      descripcion: `Eje ${e.eje_mm}mm + gap = ${e.eje_mm + m.gap_eje_mm}mm; ancho disponible ${m.ancho_max_mm - 18}mm insuficiente`,
      critico: true,
    });
  }

  // 2. Cilindros — ¿hay cilindro con gap válido para este desarrollo?
  const cil = seleccionarCilindro(m.id, e.des_mm);
  if (!cil) {
    rechazos.push({
      codigo: 'SIN_CILINDRO',
      descripcion: `No hay cilindro en inventario ${m.nombre} con gap válido (${m.gap_eje_mm}–${m.gap_des_max_mm}mm) para desarrollo ${e.des_mm}mm`,
      critico: true,
    });
  }

  // 3. Tintas offset — si la máquina no tiene offset pero sí tiene suficiente flexo,
  //    es viable como "opción con cambio" (no es bloqueo)
  if (e.tintas_proceso > 0 && m.cabezas_offset === 0) {
    if (m.cabezas_flexo >= e.tintas_proceso) {
      // VIABLE con nota: flexo puede sustituir offset
      advertencias.push({
        codigo: 'OFFSET_A_FLEXO',
        descripcion: `Las ${e.tintas_proceso} tintas de proceso se realizarían en flexo (la máquina no tiene offset). Confirmar calidad con ingeniería.`,
        critico: false,
      });
    } else {
      rechazos.push({
        codigo: 'SIN_OFFSET_NI_FLEXO',
        descripcion: `Requiere ${e.tintas_proceso} tintas — ${m.nombre} solo tiene ${m.cabezas_flexo} cabezas flexo (sin offset)`,
        critico: true,
      });
    }
  } else if (e.tintas_proceso > m.cabezas_offset + m.cabezas_flexo) {
    rechazos.push({
      codigo: 'TINTAS_EXCEDEN',
      descripcion: `Requiere ${e.tintas_proceso} tintas, ${m.nombre} tiene ${m.cabezas_offset} offset + ${m.cabezas_flexo} flexo = ${m.cabezas_offset + m.cabezas_flexo} total`,
      critico: true,
    });
  }

  // 4. Screen
  if (e.tiene_screen && m.cabezas_screen === 0) {
    rechazos.push({
      codigo: 'SIN_SCREEN',
      descripcion: `${m.nombre} no tiene estación de serigrafía`,
      critico: true,
    });
  }

  // 5. Hot stamping
  if (e.tiene_hot_stamping && !m.tiene_hot_stamping) {
    rechazos.push({
      codigo: 'SIN_HS',
      descripcion: `${m.nombre} no tiene estación de hot stamping`,
      critico: true,
    });
  }

  // 6. Cold foil
  if (e.tiene_cold_foil && !m.tiene_cold_foil) {
    rechazos.push({
      codigo: 'SIN_CF',
      descripcion: `${m.nombre} no tiene cold foil`,
      critico: true,
    });
  }

  // 7. Embossing
  if (e.tiene_embossing && !m.tiene_embossing) {
    rechazos.push({
      codigo: 'SIN_EMBOSSING',
      descripcion: `${m.nombre} no tiene estación de embossing`,
      critico: true,
    });
  }

  // 8. Cupón
  if (e.tiene_cupon && !m.puede_cupon) {
    rechazos.push({
      codigo: 'SIN_CUPON',
      descripcion: `${m.nombre} no puede hacer cupón (solo FA10 tiene esta capacidad)`,
      critico: true,
    });
  }

  if (rechazos.filter(r => r.critico).length > 0) {
    return { id: m.id, nombre: m.nombre, tipo: 'analog', viable: false, rechazos, advertencias };
  }

  const r1k = calcMetrosAnalog(m, e.eje_mm, e.des_mm, 1000);
  if (!r1k || !cil) {
    return { id: m.id, nombre: m.nombre, tipo: 'analog', viable: false,
      rechazos: [{ codigo: 'CALC_ERROR', descripcion: 'Error al calcular metros', critico: true }],
      advertencias };
  }

  return {
    id: m.id, nombre: m.nombre, tipo: 'analog', viable: true,
    rechazos: rechazos.filter(r => !r.critico), advertencias,
    cav_eje: r1k.cav_eje, cav_des: r1k.cav_des,
    cilindro_dientes: cil.dientes,
    cilindro_gap_mm: parseFloat(cil.gap_mm.toFixed(3)),
    metros_1k: Math.round(r1k.metros),
  };
}

// ─── MOTOR PRINCIPAL ──────────────────────────────────────────────────────────

export function analizarEtiqueta(
  e: DatosEtiqueta,
  umbrales = UMBRALES
): ResultadoAnalisis {

  // Evaluar todas las máquinas
  const resultados_dig = MAQUINAS_DIGITAL.map(m => evaluarDigital(m, e));
  const resultados_ana = MAQUINAS_ANALOG.map(m => evaluarAnalog(m, e));
  const todos = [...resultados_dig, ...resultados_ana];

  const viable_digital = resultados_dig.filter(r => r.viable);
  const viable_analog  = resultados_ana.filter(r => r.viable);
  const no_viable = todos.filter(r => !r.viable);

  // Calcular puntos de cruce
  const m6k  = MAQUINAS_DIGITAL.find(m => m.id === '6MIL');
  const mV12 = MAQUINAS_DIGITAL.find(m => m.id === 'V12');
  const mCruce = viable_digital.length > 0
    ? MAQUINAS_DIGITAL.find(m => m.id === viable_digital[viable_digital.length - 1].id)
    : null;

  const cruce_6mil_v12 = (m6k && viable_digital.find(r => r.id === '6MIL') && viable_digital.find(r => r.id === 'V12'))
    ? buscarCruceDigital(m6k, e.eje_mm, e.des_mm, umbrales.metros_6mil_to_v12)
    : null;

  const cruce_digital_analog = (mCruce && viable_analog.length > 0)
    ? buscarCruceDigital(mCruce, e.eje_mm, e.des_mm, umbrales.metros_digital_to_analog)
    : null;

  // Asignar rangos a las máquinas viables
  const solo20k = viable_digital.length === 1 && viable_digital[0].id === '20MIL';

  for (const r of viable_digital) {
    if (solo20k) {
      r.rango_desde_k = 0;
      r.rango_hasta_k = cruce_digital_analog;
    } else if (r.id === '6MIL') {
      r.rango_desde_k = 0;
      r.rango_hasta_k = cruce_6mil_v12;
    } else if (r.id === 'V12') {
      r.rango_desde_k = cruce_6mil_v12 ?? 0;
      r.rango_hasta_k = cruce_digital_analog;
    } else {
      r.rango_desde_k = 0;
      r.rango_hasta_k = cruce_digital_analog;
    }
  }
  for (const r of viable_analog) {
    r.rango_desde_k = cruce_digital_analog ?? 0;
    r.rango_hasta_k = null;
  }

  // Mapa de cantidades del RFQ
  const mapa_cantidades = e.cantidades.filter(q => q > 0).map(q => {
    const k = q / 1000;
    let maquina = viable_digital[0];
    let justificacion = 'Volumen bajo — digital más eficiente';

    if (cruce_digital_analog && k > cruce_digital_analog && viable_analog.length > 0) {
      maquina = viable_analog[0];
      justificacion = `${q.toLocaleString()} pzas = ${k.toLocaleString()}k > cruce digital→analógica (${cruce_digital_analog}k). Analógica más eficiente en volumen.`;
    } else if (cruce_6mil_v12 && k > cruce_6mil_v12 && viable_digital.find(r => r.id === 'V12')) {
      maquina = viable_digital.find(r => r.id === 'V12')!;
      justificacion = `${q.toLocaleString()} pzas = ${k.toLocaleString()}k > cruce 6K→V12 (${cruce_6mil_v12}k). V12 más eficiente a este volumen.`;
    } else if (maquina) {
      justificacion = `${q.toLocaleString()} pzas = ${k.toLocaleString()}k — dentro del rango digital.`;
    }

    return maquina ? {
      cantidad: q,
      maquina_id: maquina.id,
      maquina_nombre: maquina.nombre,
      tipo: maquina.tipo,
      justificacion,
    } : {
      cantidad: q,
      maquina_id: 'N/A',
      maquina_nombre: 'Sin máquina viable',
      tipo: 'digital' as const,
      justificacion: 'No hay máquinas viables para esta etiqueta',
    };
  });

  // Resumen ejecutivo
  const resumen = generarResumen(e, viable_digital, viable_analog, cruce_6mil_v12, cruce_digital_analog);
  const recomendacion = generarRecomendacion(e, viable_digital, viable_analog, cruce_digital_analog);

  // Calcular explicación del cruce digital→analógica
  let explicacion_metros = null;
  if (mCruce && cruce_digital_analog) {
    const r1k = calcMetrosDigital(mCruce, e.eje_mm, e.des_mm, 1000);
    if (r1k) {
      const metros_por_frame = (mCruce.frame_cm - (e.des_mm / 10 + mCruce.gap_des_mm / 10) * r1k.cav_des * 0) / 100;
      // Recalculate more precisely
      const ani = mCruce.frame_cm - (e.des_mm / 10 + mCruce.gap_des_mm / 10) * r1k.cav_des;
      const mpf = (mCruce.frame_cm - ani) / 100;
      explicacion_metros = {
        maquina_ref: mCruce.nombre,
        umbral_metros: umbrales.metros_digital_to_analog,
        millares_resultado: cruce_digital_analog,
        cav_eje: r1k.cav_eje,
        cav_des: r1k.cav_des,
        cav_total: r1k.cav_eje * r1k.cav_des,
        frames_aprox: Math.ceil(cruce_digital_analog * 1000 / (r1k.cav_eje * r1k.cav_des)),
        metros_por_frame: parseFloat(mpf.toFixed(4)),
      };
    }
  }

  return {
    viable_digital, viable_analog, no_viable,
    cruce_6mil_v12, cruce_digital_analog,
    explicacion_metros,
    resumen, recomendacion_principal: recomendacion,
    mapa_cantidades,
  };
}

function generarResumen(
  e: DatosEtiqueta,
  dig: ResultadoMaquina[],
  ana: ResultadoMaquina[],
  c_6v12: number | null,
  c_da: number | null
): string {
  const partes: string[] = [];
  if (dig.length > 0) {
    const nombres = dig.map(r => r.nombre).join(' y ');
    if (c_da) partes.push(`Digital (${nombres}) hasta ${c_da.toLocaleString()}k pzas`);
    else partes.push(`Digital (${nombres})`);
    if (c_6v12 && dig.length >= 2) {
      partes.push(`→ Cambio 6K a V12 en ${c_6v12.toLocaleString()}k pzas`);
    }
  }
  if (ana.length > 0) {
    const nombre = ana[0].nombre;
    if (c_da) partes.push(`Analógica (${nombre}) a partir de ${c_da.toLocaleString()}k pzas`);
    else partes.push(`Analógica (${nombre})`);
  }
  if (partes.length === 0) return 'No hay máquinas viables para esta etiqueta con los requerimientos indicados.';
  return partes.join(' · ');
}

function generarRecomendacion(
  e: DatosEtiqueta,
  dig: ResultadoMaquina[],
  ana: ResultadoMaquina[],
  c_da: number | null
): string {
  if (dig.length === 0 && ana.length === 0)
    return 'Esta etiqueta no puede producirse con la configuración actual de máquinas. Revisar dimensiones y acabados.';
  if (dig.length === 0)
    return `Tecnología: ANALÓGICA únicamente. Máquina recomendada: ${ana[0].nombre}.`;
  if (ana.length === 0)
    return `Tecnología: DIGITAL únicamente. ${dig.map(r => r.nombre).join(' / ')}.`;

  const texto_dig = dig.map(r => r.nombre).join(' y ');
  const texto_ana = ana[0].nombre;

  if (c_da)
    return `Digital (${texto_dig}) para tirajes hasta ${c_da.toLocaleString()}k pzas · Analógica (${texto_ana}) para tirajes mayores.`;

  return `Digital (${texto_dig}) o Analógica (${texto_ana}) — revisar umbrales de metros.`;
}
