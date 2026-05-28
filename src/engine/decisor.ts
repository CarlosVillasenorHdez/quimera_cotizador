/**
 * MOTOR DE DECISIÓN TÉCNICA — CERBERO Pensador
 *
 * Evalúa cada máquina contra los requerimientos técnicos de la etiqueta.
 * NO calcula costos. Solo evalúa factibilidad técnica y metros.
 *
 * Reglas clave:
 * - 20K: solo si 6K y V12 no caben por dimensiones
 * - Tintas offset: bloqueo en FA6/FA10/GAL1 que no tienen offset
 *   (a menos que haya suficientes flexo para sustituir)
 * - Screen: solo MO y GAL1
 * - HS: solo MO y GAL1
 */

import {
  DatosEtiqueta, MaquinaDigital, MaquinaAnalog,
  MAQUINAS_DIGITAL, MAQUINAS_ANALOG,
  calcMetrosDigital, calcMetrosAnalog, buscarCruceDigital,
  seleccionarCilindro, UMBRALES,
} from './knowledge';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface Razon {
  codigo: string;
  descripcion: string;
}

export interface ResultadoMaquina {
  id: string;
  nombre: string;
  tipo: 'digital' | 'analog';
  viable: boolean;
  razones_no_viable: Razon[];   // por qué no puede
  advertencias: Razon[];        // puede, pero con condición

  // Si viable:
  cav_eje?: number;
  cav_des?: number;
  gap_eje_mm?: number;
  gap_des_mm?: number;          // gap real del cilindro (analógicas)
  metros_1k?: number;
  cilindro_dientes?: number;
  ancho_papel_mm?: number;      // ancho real de planilla/bobina

  rango_desde_k?: number;
  rango_hasta_k?: number | null;
}

export interface ResultadoAnalisis {
  viable_digital: ResultadoMaquina[];
  viable_analog: ResultadoMaquina[];
  no_viable: ResultadoMaquina[];

  cruce_6mil_v12: number | null;
  cruce_digital_analog: number | null;

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

  resumen: string;
  recomendacion_principal: string;
}

// ─── EVALUADOR DIGITAL ────────────────────────────────────────────────────────

function evaluarDigital(m: MaquinaDigital, e: DatosEtiqueta): ResultadoMaquina {
  const razones: Razon[] = [];
  const advertencias: Razon[] = [];

  // 1. Dimensiones al eje
  const cav_eje = Math.floor(m.planilla_mm / (e.eje_mm + m.gap_eje_mm));
  if (cav_eje < 1) {
    razones.push({
      codigo: 'EJE_FUERA',
      descripcion: `Eje ${e.eje_mm}mm + gap ${m.gap_eje_mm}mm = ${e.eje_mm + m.gap_eje_mm}mm — no cabe en planilla de ${m.planilla_mm}mm`,
    });
  }

  // 2. Dimensiones al desarrollo
  const cav_des_raw = Math.floor(m.frame_cm * 10 / (e.des_mm + m.gap_des_mm * 2));
  if (cav_des_raw < 1) {
    razones.push({
      codigo: 'DES_FUERA',
      descripcion: `Desarrollo ${e.des_mm}mm — no cabe en frame de ${m.frame_cm * 10}mm`,
    });
  }

  // 3. Tinta plata
  if (e.tiene_plata && !m.soporta_plata) {
    razones.push({
      codigo: 'SIN_PLATA',
      descripcion: `${m.nombre} no tiene estación de tinta plata`,
    });
  }

  // 4. Tintas offset — digitales no tienen offset
  if (e.tintas_offset > 0) {
    razones.push({
      codigo: 'SIN_OFFSET_DIGITAL',
      descripcion: `Requiere ${e.tintas_offset} tintas offset — las prensas digitales no tienen estaciones offset. Deben cotizarse en analógico o reformularse en CMYK digital.`,
    });
  }

  // 5. Screen — digitales no tienen serigrafía inline
  if (e.tintas_screen > 0 || e.tiene_screen) {
    razones.push({
      codigo: 'SIN_SCREEN',
      descripcion: `Requiere ${e.tintas_screen || 1} tinta(s) screen — las prensas digitales no tienen serigrafía inline`,
    });
  }

  // 6. Total de tintas digitales vs máximo
  const tintas_dig_total = e.tintas_proceso
    + (e.tiene_blanco ? 1 : 0)
    + (e.tiene_plata ? 1 : 0)
    + (e.tiene_invisible ? 1 : 0);
  if (tintas_dig_total > m.tintas_max) {
    razones.push({
      codigo: 'TINTAS_EXCEDEN',
      descripcion: `Requiere ${tintas_dig_total} tintas digitales — ${m.nombre} soporta máximo ${m.tintas_max}`,
    });
  }

  // 7. Embossing inline
  if (e.tiene_embossing) {
    advertencias.push({
      codigo: 'EMBOSSING_FUERA_LINEA',
      descripcion: 'Embossing se realiza fuera de línea (postproceso)',
    });
  }

  // 8. Hot stamping
  if (e.tiene_hot_stamping) {
    advertencias.push({
      codigo: 'HS_FUERA_LINEA',
      descripcion: 'Hot stamping se realiza fuera de línea (postproceso)',
    });
  }

  // 9. Setup alto V12
  if (m.id === 'V12' && m.setup_m >= 100) {
    advertencias.push({
      codigo: 'SETUP_ALTO',
      descripcion: `Setup de ${m.setup_m}m — no eficiente para tirajes menores a ~1,000k pzas aprox.`,
    });
  }

  if (razones.length > 0) {
    return { id: m.id, nombre: m.nombre, tipo: 'digital', viable: false,
      razones_no_viable: razones, advertencias };
  }

  const r1k = calcMetrosDigital(m, e.eje_mm, e.des_mm, 1000);
  return {
    id: m.id, nombre: m.nombre, tipo: 'digital', viable: true,
    razones_no_viable: [], advertencias,
    cav_eje: r1k?.cav_eje,
    cav_des: r1k?.cav_des,
    gap_eje_mm: m.gap_eje_mm,
    gap_des_mm: m.gap_des_mm,
    metros_1k: r1k ? Math.round(r1k.metros) : undefined,
    ancho_papel_mm: m.planilla_mm,
  };
}

// ─── EVALUADOR ANALÓGICO ──────────────────────────────────────────────────────

function evaluarAnalog(m: MaquinaAnalog, e: DatosEtiqueta): ResultadoMaquina {
  const razones: Razon[] = [];
  const advertencias: Razon[] = [];

  // 1. Dimensiones al eje
  const cav_eje = Math.floor((m.ancho_max_mm - 18) / (e.eje_mm + m.gap_eje_mm));
  if (cav_eje < 1) {
    razones.push({
      codigo: 'EJE_FUERA',
      descripcion: `Eje ${e.eje_mm}mm — no cabe en ancho máximo de ${m.ancho_max_mm}mm`,
    });
  }

  // 2. Cilindro para el desarrollo
  const cil = seleccionarCilindro(m.id, e.des_mm);
  if (!cil) {
    razones.push({
      codigo: 'SIN_CILINDRO',
      descripcion: `No hay cilindro en inventario para desarrollo ${e.des_mm}mm en ${m.nombre} (gap máx ${m.gap_des_max_mm}mm)`,
    });
  }

  // 3. Tintas offset
  const tintas_offset_req = e.tintas_offset;
  const tintas_flexo_req  = e.tintas_flexo;
  const tintas_screen_req = e.tintas_screen;

  if (tintas_offset_req > 0) {
    if (m.cabezas_offset === 0) {
      // No tiene offset — ¿puede sustituir con flexo?
      const flexo_disponible = m.cabezas_flexo - tintas_flexo_req;
      if (flexo_disponible >= tintas_offset_req) {
        advertencias.push({
          codigo: 'OFFSET_A_FLEXO',
          descripcion: `${tintas_offset_req} tinta(s) offset se realizarían en flexo (${m.nombre} no tiene offset). Confirmar calidad con ingeniería.`,
        });
      } else {
        razones.push({
          codigo: 'SIN_OFFSET',
          descripcion: `Requiere ${tintas_offset_req} offset — ${m.nombre} no tiene cabezas offset y no hay suficiente flexo disponible (${m.cabezas_flexo} flexo total, ${tintas_flexo_req} ya requeridas)`,
        });
      }
    } else if (tintas_offset_req > m.cabezas_offset) {
      razones.push({
        codigo: 'OFFSET_EXCEDE',
        descripcion: `Requiere ${tintas_offset_req} cabezas offset — ${m.nombre} tiene solo ${m.cabezas_offset}`,
      });
    }
  }

  // 4. Tintas flexo
  const total_flexo_needed = tintas_flexo_req
    + (m.cabezas_offset === 0 ? tintas_offset_req : 0); // si sustituye offset con flexo
  if (total_flexo_needed > m.cabezas_flexo) {
    // Solo agregar si no ya se capturó el error de offset
    if (!razones.some(r => r.codigo === 'SIN_OFFSET' || r.codigo === 'OFFSET_EXCEDE')) {
      razones.push({
        codigo: 'FLEXO_EXCEDE',
        descripcion: `Requiere ${total_flexo_needed} cabezas flexo — ${m.nombre} tiene solo ${m.cabezas_flexo}`,
      });
    }
  }

  // 5. Screen
  if (tintas_screen_req > 0 || e.tiene_screen) {
    const screen_req = Math.max(tintas_screen_req, e.tiene_screen ? 1 : 0);
    if (m.cabezas_screen === 0) {
      razones.push({
        codigo: 'SIN_SCREEN',
        descripcion: `Requiere ${screen_req} tinta(s) screen — ${m.nombre} no tiene estación de serigrafía`,
      });
    } else if (screen_req > m.cabezas_screen) {
      razones.push({
        codigo: 'SCREEN_EXCEDE',
        descripcion: `Requiere ${screen_req} screen — ${m.nombre} tiene solo ${m.cabezas_screen}`,
      });
    }
  }

  // 6. Hot stamping
  if (e.tiene_hot_stamping && !m.tiene_hot_stamping) {
    razones.push({
      codigo: 'SIN_HS',
      descripcion: `${m.nombre} no tiene estación de hot stamping`,
    });
  }

  // 7. Cold foil
  if (e.tiene_cold_foil && !m.tiene_cold_foil) {
    razones.push({
      codigo: 'SIN_CF',
      descripcion: `${m.nombre} no tiene cold foil`,
    });
  }

  // 8. Embossing
  if (e.tiene_embossing && !m.tiene_embossing) {
    razones.push({
      codigo: 'SIN_EMBOSSING',
      descripcion: `${m.nombre} no tiene estación de embossing`,
    });
  }

  // 9. Cupón
  if (e.tiene_cupon && !m.puede_cupon) {
    razones.push({
      codigo: 'SIN_CUPON',
      descripcion: `Solo FA10 puede hacer cupón`,
    });
  }

  if (razones.length > 0) {
    return { id: m.id, nombre: m.nombre, tipo: 'analog', viable: false,
      razones_no_viable: razones, advertencias };
  }

  const r1k = calcMetrosAnalog(m, e.eje_mm, e.des_mm, 1000);
  if (!r1k || !cil) {
    return { id: m.id, nombre: m.nombre, tipo: 'analog', viable: false,
      razones_no_viable: [{ codigo: 'CALC_ERROR', descripcion: 'Error al calcular metros' }],
      advertencias };
  }

  // Ancho bobina exacto = eje×cav + gap×(cav+1)
  const ancho_bobina = e.eje_mm * r1k.cav_eje + m.gap_eje_mm * (r1k.cav_eje + 1);

  return {
    id: m.id, nombre: m.nombre, tipo: 'analog', viable: true,
    razones_no_viable: [], advertencias,
    cav_eje: r1k.cav_eje,
    cav_des: r1k.cav_des,
    gap_eje_mm: m.gap_eje_mm,
    gap_des_mm: parseFloat(cil.gap_mm.toFixed(3)),
    metros_1k: Math.round(r1k.metros),
    cilindro_dientes: cil.dientes,
    ancho_papel_mm: Math.round(ancho_bobina),
  };
}

// ─── MOTOR PRINCIPAL ──────────────────────────────────────────────────────────

export function analizarEtiqueta(
  e: DatosEtiqueta,
  umbrales = UMBRALES
): ResultadoAnalisis {

  // Evaluar digitales
  // 20K: solo si 6K y V12 no caben
  const r6k  = evaluarDigital(MAQUINAS_DIGITAL.find(m => m.id === '6MIL')!, e);
  const rV12 = evaluarDigital(MAQUINAS_DIGITAL.find(m => m.id === 'V12')!, e);
  const caben_small = r6k.viable || rV12.viable;

  const resultados_dig: ResultadoMaquina[] = [r6k, rV12];
  if (!caben_small) {
    // Solo entonces evaluar 20K
    const r20k = evaluarDigital(MAQUINAS_DIGITAL.find(m => m.id === '20MIL')!, e);
    resultados_dig.push(r20k);
  }

  // Evaluar analógicas (todas)
  const resultados_ana = MAQUINAS_ANALOG.map(m => evaluarAnalog(m, e));

  const viable_digital = resultados_dig.filter(r => r.viable);
  const viable_analog  = resultados_ana.filter(r => r.viable);

  // No viables: solo los que son informativos para ingeniería
  // (SIN_CILINDRO, dimensión fuera, sin plata) — no mostrar rechazos obvios de capacidad
  const CODIGOS_MOSTRAR = ['SIN_CILINDRO', 'EJE_FUERA', 'DES_FUERA', 'SIN_PLATA', 'SIN_OFFSET_DIGITAL'];
  const no_viable = [...resultados_dig, ...resultados_ana].filter(r =>
    !r.viable && r.razones_no_viable.some(x => CODIGOS_MOSTRAR.includes(x.codigo))
  );

  // Puntos de cruce
  const m6k  = MAQUINAS_DIGITAL.find(m => m.id === '6MIL')!;
  const mV12 = MAQUINAS_DIGITAL.find(m => m.id === 'V12')!;
  const m20k = MAQUINAS_DIGITAL.find(m => m.id === '20MIL')!;

  // Cruce 6K→V12: solo si ambas son viables
  const cruce_6mil_v12 = (r6k.viable && rV12.viable)
    ? buscarCruceDigital(m6k, e.eje_mm, e.des_mm, umbrales.metros_6mil_to_v12)
    : null;

  // Cruce digital→analógica: usando la última digital viable
  const ultima_dig_viable = viable_digital[viable_digital.length - 1];
  const maq_cruce = ultima_dig_viable
    ? (ultima_dig_viable.id === '20MIL' ? m20k : ultima_dig_viable.id === 'V12' ? mV12 : m6k)
    : null;

  const cruce_digital_analog = (maq_cruce && viable_analog.length > 0)
    ? buscarCruceDigital(maq_cruce, e.eje_mm, e.des_mm, umbrales.metros_digital_to_analog)
    : null;

  // Rangos
  for (const r of viable_digital) {
    if (r.id === '6MIL') {
      r.rango_desde_k = 0;
      r.rango_hasta_k = cruce_6mil_v12;
    } else if (r.id === 'V12') {
      r.rango_desde_k = cruce_6mil_v12 ?? 0;
      r.rango_hasta_k = cruce_digital_analog;
    } else { // 20K
      r.rango_desde_k = 0;
      r.rango_hasta_k = cruce_digital_analog;
    }
  }
  for (const r of viable_analog) {
    r.rango_desde_k = cruce_digital_analog ?? 0;
    r.rango_hasta_k = null;
  }

  // Explicación del cruce
  let explicacion_metros = null;
  if (maq_cruce && cruce_digital_analog) {
    const r1k = calcMetrosDigital(maq_cruce, e.eje_mm, e.des_mm, 1000);
    if (r1k) {
      const ani = maq_cruce.frame_cm - (e.des_mm / 10 + maq_cruce.gap_des_mm / 10) * r1k.cav_des;
      const mpf = (maq_cruce.frame_cm - ani) / 100;
      explicacion_metros = {
        maquina_ref: maq_cruce.nombre,
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
    resumen: generarResumen(e, viable_digital, viable_analog, cruce_6mil_v12, cruce_digital_analog),
    recomendacion_principal: generarRecomendacion(e, viable_digital, viable_analog, cruce_digital_analog),
  };
}

function generarResumen(
  _e: DatosEtiqueta,
  dig: ResultadoMaquina[],
  ana: ResultadoMaquina[],
  c6v12: number | null,
  cda: number | null
): string {
  const partes: string[] = [];
  if (dig.length > 0) {
    const nombres = dig.map(r => r.nombre).join(' y ');
    partes.push(cda ? `Digital (${nombres}) hasta ${cda.toLocaleString()}k pzas` : `Digital (${nombres})`);
    if (c6v12 && dig.length >= 2) partes.push(`→ 6K a V12 en ${c6v12.toLocaleString()}k pzas`);
  }
  if (ana.length > 0) {
    const nombre = ana[0].nombre;
    partes.push(cda ? `Analógica (${nombre}) a partir de ${cda.toLocaleString()}k pzas` : `Analógica (${nombre})`);
  }
  return partes.length ? partes.join(' · ') : 'No hay máquinas viables para esta etiqueta.';
}

function generarRecomendacion(
  e: DatosEtiqueta,
  dig: ResultadoMaquina[],
  ana: ResultadoMaquina[],
  cda: number | null
): string {
  // Caso especial: trabajo con offset — no puede hacerse en digital
  if (e.tintas_offset > 0 && dig.length === 0 && ana.length > 0) {
    return `Este trabajo lleva ${e.tintas_offset} tinta(s) offset — solo se puede realizar en analógico. Máquinas viables: ${ana.map(r => r.nombre).join(', ')}.`;
  }
  if (dig.length === 0 && ana.length === 0)
    return 'Esta etiqueta no puede producirse con la configuración actual de máquinas. Revisar dimensiones y acabados.';
  if (dig.length === 0)
    return `Solo analógico: ${ana.map(r => r.nombre).join(' / ')}.`;
  if (ana.length === 0)
    return `Solo digital: ${dig.map(r => r.nombre).join(' / ')}.`;
  const texto_dig = dig.map(r => r.nombre).join(' y ');
  const texto_ana = ana[0].nombre;
  if (cda)
    return `Digital (${texto_dig}) hasta ${cda.toLocaleString()}k pzas — Analógica (${texto_ana}) a partir de ${cda.toLocaleString()}k pzas.`;
  return `Digital (${texto_dig}) o Analógica (${texto_ana}).`;
}
