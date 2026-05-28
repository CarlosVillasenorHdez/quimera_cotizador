'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FileUp, Settings, ChevronRight, AlertTriangle, CheckCircle2,
         RefreshCw, Save, Cpu, Layers, ArrowRight, Info } from 'lucide-react';
import Link from 'next/link';
import { getConfigCruces, getMaquinasDigital, getMaquinasAnalog,
         updateConfigCruces, updateMaquinaDigital, updateMaquinaAnalog,
         ConfigCruces, MaquinaDigital, MaquinaAnalog } from '@/lib/supabase';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface RFQData {
  eje_mm: number;
  des_mm: number;
  pm_usd: number;
  tintas_dig: number;
  tintas_offset: number;
  tintas_flexo: number;
  laminado: 'brillante' | 'mate' | 'ninguno';
  cantidades: number[];
  title: string;
  customer: string;
  winding: number;
}

interface CrossoverResult {
  k_6mil_to_v12: number | null;
  k_digital_to_analog: number | null;
  metros_at_crossover: { '6mil_v12': number; 'dig_ana': number };
}

interface MachineRecommendation {
  id: string;
  nombre: string;
  tipo: 'digital' | 'analog';
  viable: boolean;
  razon?: string;
  rango_desde_k: number;
  rango_hasta_k: number | null;
  cav_e?: number;
  cav_d?: number;
  metros_1k: number;
  cpm_ref?: number;
}

interface AnalisisResult {
  crossover: CrossoverResult;
  recomendaciones: MachineRecommendation[];
  mapa_cantidades: Array<{ cantidad: number; maquina: string; tipo: 'digital' | 'analog' }>;
  advertencias: string[];
}

// ─── CONSTANTES FALLBACK (si Supabase no disponible) ─────────────────────────

const FALLBACK_DIG: MaquinaDigital[] = [
  { id: '6MIL', nombre: 'HP Indigo 6K',  planilla_mm: 317, frame_cm: 97,  setup_m: 5,
    click_usd: 0.0242, tinta_m2_usd: null, hp_hr_usd: 74.167, cobro_min_min: 10,
    ancho_mat_m: 0.320, velocidades: {1:42,2:42,3:42,4:31,5:25,6:21,7:18,8:15,9:13,10:12}, activo: true },
  { id: 'V12',  nombre: 'HP Indigo V12', planilla_mm: 313, frame_cm: 100, setup_m: 100,
    click_usd: 0.022,  tinta_m2_usd: null, hp_hr_usd: 194.097, cobro_min_min: 10,
    ancho_mat_m: 0.320, velocidades: {1:120,2:120,3:120,4:120,5:120,6:120,7:60,8:60,9:60,10:60}, activo: true },
  { id: '20MIL', nombre: 'HP Indigo 20K', planilla_mm: 714, frame_cm: 110, setup_m: 10,
    click_usd: 0.0715, tinta_m2_usd: null, hp_hr_usd: 74.167, cobro_min_min: 10,
    ancho_mat_m: 0.714, velocidades: {1:42,2:42,3:42,4:31,5:25,6:21,7:18,8:15,9:13,10:12}, activo: true },
];

const FALLBACK_ANA: MaquinaAnalog[] = [
  { id: 'MO',   nombre: 'MO Fusion',  ancho_max_mm: 406, costo_hr_usd: 87.066, vel_std: 70,
    vel_screen: 40, vel_hs: 35, vel_cupon: 0, cabezas_offset: 5, cabezas_flexo: 4,
    cabezas_screen: 2, cold_foil: true, hot_stamping: true, embossing: false, puede_cupon: false, activo: true },
  { id: 'FA10', nombre: 'FA10',       ancho_max_mm: 355, costo_hr_usd: 34.980, vel_std: 80,
    vel_screen: 0, vel_hs: 0, vel_cupon: 45, cabezas_offset: 0, cabezas_flexo: 10,
    cabezas_screen: 0, cold_foil: true, hot_stamping: false, embossing: false, puede_cupon: true, activo: true },
  { id: 'FA6',  nombre: 'FA6',        ancho_max_mm: 330, costo_hr_usd: 20.503, vel_std: 80,
    vel_screen: 0, vel_hs: 0, vel_cupon: 0, cabezas_offset: 0, cabezas_flexo: 6,
    cabezas_screen: 0, cold_foil: true, hot_stamping: false, embossing: false, puede_cupon: false, activo: true },
];

const FALLBACK_CFG: ConfigCruces = {
  id: 'default', metros_6mil_v12: 1200, metros_digital_analog: 5000,
  factor_v12: 3.9, gap_eje_mm: 3, gap_des_mm: 3
};

// ─── MOTOR DE CÁLCULO ─────────────────────────────────────────────────────────

function calcDigMetros(m: MaquinaDigital, eje_mm: number, des_mm: number, n: number, cfg: ConfigCruces): { metros: number; cav_e: number; cav_d: number } | null {
  const ge = cfg.gap_eje_mm / 10;
  const gd = cfg.gap_des_mm / 10;
  const cav_e = Math.floor(m.planilla_mm / 10 / (eje_mm / 10 + ge));
  const cav_d = Math.floor(m.frame_cm / (des_mm / 10 + gd * 2));
  if (cav_e < 1 || cav_d < 1) return null;
  const ani = m.frame_cm - (des_mm / 10 + gd) * cav_d;
  const fr = Math.ceil(n / (cav_e * cav_d));
  const metros = fr * (m.frame_cm - ani) / 100 + m.setup_m;
  return { metros, cav_e, cav_d };
}

function calcAnaMetros(m: MaquinaAnalog, eje_mm: number, des_mm: number, n: number): { metros: number; cav_e: number; cav_d: number } | null {
  const gap_e = 3;
  const cav_e = Math.floor((m.ancho_max_mm - 18) / (eje_mm + gap_e));
  if (cav_e < 1) return null;
  // Simplified: use best cylinder estimate
  const puntada = (m.cabezas_offset > 0 ? 133 : 0) || (m.cabezas_flexo > 0 ? 60 : 0) || 60;
  const cav_d = Math.floor(puntada / (des_mm + 3));
  if (cav_d < 1) return null;
  const fr = Math.ceil(n / (cav_e * cav_d));
  const metros = fr * des_mm / 1000 + 20;
  return { metros, cav_e, cav_d };
}

function findCrossover(m: MaquinaDigital, eje: number, des: number, metrosTarget: number, cfg: ConfigCruces): number | null {
  let lo = 100, hi = 20_000_000, best: number | null = null;
  for (let i = 0; i < 64; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const r = calcDigMetros(m, eje, des, mid, cfg);
    if (!r) break;
    if (r.metros <= metrosTarget) { best = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return best ? Math.ceil(best / 1000) : null;
}

function runAnalisis(rfq: RFQData, maqDig: MaquinaDigital[], maqAna: MaquinaAnalog[], cfg: ConfigCruces): AnalisisResult {
  const { eje_mm, des_mm } = rfq;
  const advertencias: string[] = [];

  // Verificar si 20K es necesaria por tamaño
  const maq6k = maqDig.find(m => m.id === '6MIL');
  const maqV12 = maqDig.find(m => m.id === 'V12');
  const maq20k = maqDig.find(m => m.id === '20MIL');

  const r6k = maq6k ? calcDigMetros(maq6k, eje_mm, des_mm, 1000, cfg) : null;
  const rV12 = maqV12 ? calcDigMetros(maqV12, eje_mm, des_mm, 1000, cfg) : null;
  const r20k = maq20k ? calcDigMetros(maq20k, eje_mm, des_mm, 1000, cfg) : null;

  // Solo 20K es viable para esta etiqueta?
  const solo20k = !r6k && !rV12 && !!r20k;
  if (solo20k) {
    advertencias.push('Las dimensiones no caben en 6K ni V12 — solo HP Indigo 20K es viable en digital.');
  }

  // Calcular cruces
  const k_6mil_to_v12 = maq6k && !solo20k
    ? findCrossover(maq6k, eje_mm, des_mm, cfg.metros_6mil_v12, cfg)
    : null;

  const maqCruce = solo20k ? maq20k : (maqV12 ?? maq6k);
  const k_dig_to_ana = maqCruce
    ? findCrossover(maqCruce, eje_mm, des_mm, cfg.metros_digital_analog, cfg)
    : null;

  // Construir recomendaciones
  const recomendaciones: MachineRecommendation[] = [];

  if (!solo20k) {
    if (r6k && maq6k) {
      recomendaciones.push({
        id: '6MIL', nombre: 'HP Indigo 6K', tipo: 'digital', viable: true,
        rango_desde_k: 0, rango_hasta_k: k_6mil_to_v12,
        cav_e: r6k.cav_e, cav_d: r6k.cav_d, metros_1k: Math.round(r6k.metros),
      });
    }
    if (rV12 && maqV12) {
      recomendaciones.push({
        id: 'V12', nombre: 'HP Indigo V12', tipo: 'digital', viable: true,
        rango_desde_k: k_6mil_to_v12 ?? 0, rango_hasta_k: k_dig_to_ana,
        cav_e: rV12.cav_e, cav_d: rV12.cav_d, metros_1k: Math.round(rV12.metros),
      });
    }
    if (!r6k && maq6k) {
      recomendaciones.push({
        id: '6MIL', nombre: 'HP Indigo 6K', tipo: 'digital', viable: false,
        razon: 'La etiqueta no cabe en la planilla de 317mm',
        rango_desde_k: 0, rango_hasta_k: null, metros_1k: 0,
      });
    }
  } else if (r20k && maq20k) {
    recomendaciones.push({
      id: '20MIL', nombre: 'HP Indigo 20K', tipo: 'digital', viable: true,
      rango_desde_k: 0, rango_hasta_k: k_dig_to_ana,
      cav_e: r20k.cav_e, cav_d: r20k.cav_d, metros_1k: Math.round(r20k.metros),
    });
  }

  // Analógicas
  for (const m of maqAna) {
    const r = calcAnaMetros(m, eje_mm, des_mm, 1000);
    if (!r) {
      recomendaciones.push({
        id: m.id, nombre: m.nombre, tipo: 'analog', viable: false,
        razon: `Etiqueta no cabe en ancho máximo de ${m.ancho_max_mm}mm`,
        rango_desde_k: 0, rango_hasta_k: null, metros_1k: 0,
      });
      continue;
    }
    // Check offset capability
    if (rfq.tintas_offset > 0 && m.cabezas_offset === 0 && m.cabezas_flexo < rfq.tintas_offset) {
      recomendaciones.push({
        id: m.id, nombre: m.nombre, tipo: 'analog', viable: false,
        razon: `Requiere ${rfq.tintas_offset} tintas offset, máquina no tiene offset`,
        rango_desde_k: 0, rango_hasta_k: null, metros_1k: 0,
      });
      continue;
    }
    recomendaciones.push({
      id: m.id, nombre: m.nombre, tipo: 'analog', viable: true,
      rango_desde_k: k_dig_to_ana ?? 0, rango_hasta_k: null,
      cav_e: r.cav_e, cav_d: r.cav_d, metros_1k: Math.round(r.metros),
    });
  }

  // Mapa de cantidades del RFQ
  const viableAna = recomendaciones.filter(r => r.tipo === 'analog' && r.viable)[0];
  const mapa_cantidades = rfq.cantidades.filter(q => q > 0).map(q => {
    const k = q / 1000;
    if (k_dig_to_ana && k > k_dig_to_ana && viableAna) {
      return { cantidad: q, maquina: viableAna.nombre, tipo: 'analog' as const };
    }
    if (k_6mil_to_v12 && k > k_6mil_to_v12 && !solo20k) {
      return { cantidad: q, maquina: 'HP Indigo V12', tipo: 'digital' as const };
    }
    if (solo20k) return { cantidad: q, maquina: 'HP Indigo 20K', tipo: 'digital' as const };
    return { cantidad: q, maquina: 'HP Indigo 6K', tipo: 'digital' as const };
  });

  return {
    crossover: {
      k_6mil_to_v12,
      k_digital_to_analog: k_dig_to_ana,
      metros_at_crossover: {
        '6mil_v12': cfg.metros_6mil_v12,
        'dig_ana': cfg.metros_digital_analog,
      }
    },
    recomendaciones,
    mapa_cantidades,
    advertencias,
  };
}

// ─── PARSER RFQ ──────────────────────────────────────────────────────────────

function parseRFQ(html: string): RFQData | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  function caption(text: string): string {
    for (const el of Array.from(doc.querySelectorAll('.caption'))) {
      if (el.textContent?.toLowerCase().includes(text.toLowerCase()))
        return el.nextElementSibling?.textContent?.trim() ?? '';
    }
    return '';
  }
  const eje = parseFloat(caption('Label size across')) || 0;
  const des = parseFloat(caption('Label size around')) || 0;
  if (!eje || !des) return null;

  const qtys: number[] = [];
  const bq = parseInt(caption('Basic quantity').replace(/,/g, ''));
  if (bq > 0) qtys.push(bq);
  doc.querySelectorAll('.caption').forEach(el => {
    if (el.textContent?.toLowerCase().includes('alternative quantities')) {
      const v = parseInt((el.nextElementSibling?.textContent ?? '0').replace(/,/g, ''));
      if (v > 0) qtys.push(v);
    }
  });

  const hdr = (doc.querySelector('.header_left')?.textContent ?? '')
    .split('\n').map(s => s.trim()).filter(Boolean);

  // Detect inks from embedded script
  let tintas_dig = 4;
  doc.querySelectorAll('script').forEach(sc => {
    const m = sc.textContent?.match(/TINTAS[_\s]*(?:DIG\w*)[_\s]*[=:]\s*(\d+)/i);
    if (m) tintas_dig = parseInt(m[1]);
  });

  return {
    eje_mm: eje, des_mm: des, pm_usd: 0.92,
    tintas_dig, tintas_offset: 3, tintas_flexo: 0,
    laminado: 'brillante',
    cantidades: [...new Set(qtys)].sort((a, b) => a - b),
    title: hdr[0] ?? '', customer: hdr[1] ?? '', winding: 3,
  };
}

// ─── COMPONENTES UI ───────────────────────────────────────────────────────────

function Tag({ color, children }: { color: 'blue' | 'teal' | 'amber' | 'red' | 'gray'; children: React.ReactNode }) {
  const cls = {
    blue:  'bg-blue-900/40 text-blue-300 border-blue-700/40',
    teal:  'bg-teal-900/40 text-teal-300 border-teal-700/40',
    amber: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
    red:   'bg-red-900/40  text-red-300  border-red-700/40',
    gray:  'bg-slate-800   text-slate-400 border-slate-700',
  }[color];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {children}
    </span>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function SecHead({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className="text-slate-500" />
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}

function MachCard({ rec, isBest }: { rec: MachineRecommendation; isBest?: boolean }) {
  if (!rec.viable) return (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 opacity-50">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle size={13} className="text-red-400" />
        <span className="text-sm font-medium text-slate-400">{rec.nombre}</span>
      </div>
      <p className="text-xs text-slate-500">{rec.razon}</p>
    </div>
  );

  const color = rec.tipo === 'digital' ? 'border-blue-700/40' : 'border-teal-700/40';
  const accent = rec.tipo === 'digital' ? 'text-blue-300' : 'text-teal-300';

  const rangeLabel = rec.rango_hasta_k
    ? `${rec.rango_desde_k > 0 ? rec.rango_desde_k.toLocaleString() + 'k' : '0'} → ${rec.rango_hasta_k.toLocaleString()}k pzas`
    : rec.rango_desde_k > 0
    ? `A partir de ${rec.rango_desde_k.toLocaleString()}k pzas`
    : 'Cualquier escala';

  return (
    <div className={`border rounded-xl p-4 ${isBest ? 'border-orange-500/50 bg-orange-950/10' : `${color} bg-slate-800/40`}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">{rec.nombre}</span>
            {isBest && <span className="text-xs bg-orange-900/60 text-orange-300 border border-orange-700/40 rounded-full px-2 py-0.5">Recomendada</span>}
          </div>
          {rec.cav_e != null && (
            <div className="text-xs text-slate-500 mt-0.5">{rec.cav_e} × {rec.cav_d} cav · {rec.metros_1k} m/millar</div>
          )}
        </div>
        <Tag color={rec.tipo === 'digital' ? 'blue' : 'teal'}>
          {rec.tipo === 'digital' ? 'Digital' : 'Analógica'}
        </Tag>
      </div>
      <div className="text-xs text-slate-400 mb-1">Rango recomendado</div>
      <div className={`text-base font-semibold ${accent}`}>{rangeLabel}</div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

type Tab = 'upload' | 'analisis' | 'config';

export default function AnalisisPage() {
  const [tab, setTab] = useState<Tab>('upload');
  const [rfq, setRfq] = useState<RFQData | null>(null);
  const [resultado, setResultado] = useState<AnalisisResult | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ok' | 'fallback'>('loading');

  // Config from Supabase (or fallback)
  const [maqDig, setMaqDig] = useState<MaquinaDigital[]>(FALLBACK_DIG);
  const [maqAna, setMaqAna] = useState<MaquinaAnalog[]>(FALLBACK_ANA);
  const [cfg, setCfg] = useState<ConfigCruces>(FALLBACK_CFG);

  const fileRef = useRef<HTMLInputElement>(null);

  // Manual entry state
  const [manual, setManual] = useState<{eje:number;des:number;pm:number;td:number;to:number;tf:number;q1:number;q2:number;q3:number;q4:number;title:string;customer:string;laminado:'brillante'|'mate'|'ninguno'}>({ eje: 50, des: 50, pm: 0.63, td: 7, to: 3, tf: 0,
    q1: 1000, q2: 5000, q3: 10000, q4: 50000, title: '', customer: '', laminado: 'brillante' });

  // Load config from Supabase
  useEffect(() => {
    async function load() {
      try {
        const [dig, ana, c] = await Promise.all([getMaquinasDigital(), getMaquinasAnalog(), getConfigCruces()]);
        if (dig.length) setMaqDig(dig);
        if (ana.length) setMaqAna(ana);
        if (c) setCfg(c);
        setDbStatus('ok');
      } catch {
        setDbStatus('fallback');
      }
    }
    load();
  }, []);

  const doAnalisis = useCallback((data: RFQData) => {
    setLoading(true);
    setTimeout(() => {
      const res = runAnalisis(data, maqDig, maqAna, cfg);
      setRfq(data); setResultado(res); setError(null); setTab('analisis');
      setLoading(false);
    }, 300);
  }, [maqDig, maqAna, cfg]);

  const loadFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = e => {
      try {
        const p = parseRFQ(e.target?.result as string);
        if (!p) throw new Error('No se encontraron dimensiones de etiqueta en el HTML.');
        doAnalisis(p);
      } catch (ex) { setError((ex as Error).message); }
    };
    r.readAsText(file);
  }, [doAnalisis]);

  const tabs = [
    { id: 'upload' as Tab,   icon: FileUp,         label: 'Cargar RFQ' },
    { id: 'analisis' as Tab, icon: CheckCircle2,   label: 'Análisis', disabled: !resultado },
    { id: 'config' as Tab,   icon: Settings,       label: 'Configuración' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-slate-950/95 border-b border-slate-800 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">Q</span>
            </div>
            <span className="font-bold text-sm hidden sm:block">
              Quimera <span className="text-orange-400">Cotizador</span>
            </span>
            <span className="text-slate-700 hidden md:block">|</span>
            <span className="text-slate-400 text-sm hidden md:block">Análisis de RFQ</span>
            {dbStatus === 'ok' && <span className="text-xs text-teal-500 hidden lg:block">● DB conectada</span>}
            {dbStatus === 'fallback' && <span className="text-xs text-amber-500 hidden lg:block">● Usando defaults</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
              {tabs.map(t => (
                <button key={t.id} disabled={t.disabled} onClick={() => !t.disabled && setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${t.disabled ? 'opacity-30 cursor-not-allowed text-slate-500' :
                      tab === t.id ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  <t.icon size={12} />{t.label}
                </button>
              ))}
            </div>
            <Link href="/quotation-calculator"
              className="px-3 py-1.5 rounded-md text-xs bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              Cotizador →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* ── UPLOAD TAB ── */}
        {tab === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); loadFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                ${drag ? 'border-orange-500 bg-orange-950/20' : 'border-slate-700 hover:border-slate-600 bg-slate-900/30'}`}>
              <FileUp size={40} className={`mx-auto mb-4 ${drag ? 'text-orange-400' : 'text-slate-600'}`} />
              <p className="text-base font-semibold text-slate-300 mb-1">Arrastra el RFQ de CERM aquí</p>
              <p className="text-sm text-slate-600">formato .html exportado de CERM · o ingresa manualmente</p>
              <input ref={fileRef} type="file" accept=".html" className="hidden" onChange={e => loadFile(e.target.files?.[0])} />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-4 bg-red-950/30 border border-red-800/50 rounded-xl text-sm text-red-400">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}
              </div>
            )}

            {/* Manual entry */}
            <Card>
              <SecHead icon={Settings} label="Entrada manual" />
              <ManualForm v={manual} setV={setManual} onRun={() => doAnalisis({
                eje_mm: manual.eje, des_mm: manual.des, pm_usd: manual.pm,
                tintas_dig: manual.td, tintas_offset: manual.to, tintas_flexo: manual.tf,
                laminado: manual.laminado,
                cantidades: [manual.q1, manual.q2, manual.q3, manual.q4].filter(q => q > 0),
                title: manual.title, customer: manual.customer, winding: 3,
              })} loading={loading} />
            </Card>
          </div>
        )}

        {/* ── ANALISIS TAB ── */}
        {tab === 'analisis' && rfq && resultado && (
          <div className="max-w-2xl mx-auto space-y-5">
            <ResultPanel rfq={rfq} res={resultado} cfg={cfg} />
          </div>
        )}

        {/* ── CONFIG TAB ── */}
        {tab === 'config' && (
          <ConfigPanel cfg={cfg} setCfg={setCfg} maqDig={maqDig} maqAna={maqAna}
            setMaqDig={setMaqDig} setMaqAna={setMaqAna} dbStatus={dbStatus} />
        )}
      </main>
    </div>
  );
}

// ─── RESULT PANEL ─────────────────────────────────────────────────────────────

function ResultPanel({ rfq, res, cfg }: { rfq: RFQData; res: AnalisisResult; cfg: ConfigCruces }) {
  const viableRecs = res.recomendaciones.filter(r => r.viable);
  const viableDig  = viableRecs.filter(r => r.tipo === 'digital');
  const viableAna  = viableRecs.filter(r => r.tipo === 'analog');
  const allDig     = res.recomendaciones.filter(r => r.tipo === 'digital');
  const allAna     = res.recomendaciones.filter(r => r.tipo === 'analog');

  return (
    <>
      {/* Header */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            {rfq.customer && <p className="text-xs text-slate-500 mb-1">{rfq.customer}</p>}
            <h1 className="text-2xl font-bold text-slate-100">{rfq.eje_mm} × {rfq.des_mm} mm</h1>
            {rfq.title && <p className="text-sm text-slate-400 mt-0.5">{rfq.title}</p>}
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <Tag color="gray">{rfq.pm_usd} USD/m²</Tag>
            {rfq.tintas_dig > 0 && <Tag color="blue">{rfq.tintas_dig} dig</Tag>}
            {rfq.tintas_offset > 0 && <Tag color="gray">{rfq.tintas_offset} off</Tag>}
            {rfq.tintas_flexo > 0 && <Tag color="gray">{rfq.tintas_flexo} flex</Tag>}
            {rfq.laminado !== 'ninguno' && <Tag color="gray">Lam {rfq.laminado}</Tag>}
          </div>
        </div>
        {rfq.cantidades.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            <span className="text-xs text-slate-500 mr-1">Escalas RFQ:</span>
            {rfq.cantidades.map(q => <Tag key={q} color="teal">{q >= 1000 ? (q/1000).toFixed(0)+'k' : q} pzas</Tag>)}
          </div>
        )}
      </Card>

      {/* Advertencias */}
      {res.advertencias.map((a, i) => (
        <div key={i} className="flex items-start gap-2 p-3 bg-amber-950/30 border border-amber-700/40 rounded-xl text-sm text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />{a}
        </div>
      ))}

      {/* Puntos de cruce */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-4">
          <div className="text-xs text-blue-400 uppercase tracking-wider mb-1">6K → V12</div>
          <div className="text-xl font-bold text-blue-300">
            {res.crossover.k_6mil_to_v12 ? `${res.crossover.k_6mil_to_v12.toLocaleString()}k pzas` : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">≈ {cfg.metros_6mil_v12.toLocaleString()} m lineales</div>
        </div>
        <div className="bg-teal-950/30 border border-teal-800/30 rounded-xl p-4">
          <div className="text-xs text-teal-400 uppercase tracking-wider mb-1">Digital → Analógica</div>
          <div className="text-xl font-bold text-teal-300">
            {res.crossover.k_digital_to_analog ? `${res.crossover.k_digital_to_analog.toLocaleString()}k pzas` : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">≈ {cfg.metros_digital_analog.toLocaleString()} m lineales</div>
        </div>
      </div>

      {/* Digital */}
      <Card>
        <SecHead icon={Cpu} label="Tecnología digital" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allDig.map((r, i) => <MachCard key={r.id} rec={r} isBest={i === 0 && r.viable} />)}
        </div>
        {viableDig.length === 0 && (
          <p className="text-sm text-slate-500">Ninguna máquina digital compatible con estas dimensiones.</p>
        )}
      </Card>

      {/* Analógica */}
      <Card>
        <SecHead icon={Layers} label="Tecnología analógica" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allAna.map((r, i) => <MachCard key={r.id} rec={r} isBest={i === 0 && r.viable} />)}
        </div>
        {viableAna.length === 0 && (
          <p className="text-sm text-slate-500">Ninguna máquina analógica compatible.</p>
        )}
      </Card>

      {/* Mapa de cantidades RFQ */}
      {res.mapa_cantidades.length > 0 && (
        <Card>
          <SecHead icon={ArrowRight} label="Qué meter en CERM por escala" />
          <div className="space-y-2">
            {res.mapa_cantidades.map(m => (
              <div key={m.cantidad} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-4 py-2.5">
                <span className="text-sm font-semibold">{m.cantidad.toLocaleString()} pzas</span>
                <div className="flex items-center gap-2">
                  <Tag color={m.tipo === 'digital' ? 'blue' : 'teal'}>{m.maquina}</Tag>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3">
            El ingeniero decide qué escalas y máquinas ingresar finalmente a CERM.
          </p>
        </Card>
      )}
    </>
  );
}

// ─── MANUAL FORM ──────────────────────────────────────────────────────────────

function ManualForm({ v, setV, onRun, loading }: {
  v: { eje:number; des:number; pm:number; td:number; to:number; tf:number;
       q1:number; q2:number; q3:number; q4:number; title:string; customer:string; laminado: 'brillante' | 'mate' | 'ninguno' };
  setV: React.Dispatch<React.SetStateAction<{ eje:number; des:number; pm:number; td:number; to:number; tf:number;
       q1:number; q2:number; q3:number; q4:number; title:string; customer:string; laminado: 'brillante' | 'mate' | 'ninguno' }>>;
  onRun: () => void;
  loading: boolean;
}) {
  const inp = (k: keyof typeof v, label: string, type = 'number') => (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <input type={type} value={(v as Record<string, unknown>)[k] as string}
        onChange={e => setV(x => ({ ...x, [k]: type === 'number' ? parseFloat(e.target.value)||0 : e.target.value }))}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 w-full focus:outline-none focus:border-orange-500/60" />
    </label>
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {inp('eje', 'Eje (mm)')} {inp('des', 'Desarrollo (mm)')}
        {inp('pm', 'Material (USD/m²)')}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Laminado</span>
          <select value={v.laminado} onChange={e => setV(x => ({ ...x, laminado: e.target.value as 'brillante' }))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500/60">
            <option value="brillante">Brillante</option>
            <option value="mate">Mate</option>
            <option value="ninguno">Ninguno</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {inp('td', 'Tintas digital')} {inp('to', 'Tintas offset')} {inp('tf', 'Tintas flexo')}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {inp('q1', 'Escala 1 (pzas)')} {inp('q2', 'Escala 2')} {inp('q3', 'Escala 3')} {inp('q4', 'Escala 4')}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {inp('title', 'Descripción', 'text')} {inp('customer', 'Cliente', 'text')}
      </div>
      <button onClick={onRun} disabled={loading}
        className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
        {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        {loading ? 'Calculando...' : 'Analizar →'}
      </button>
    </div>
  );
}

// ─── CONFIG PANEL ─────────────────────────────────────────────────────────────

function ConfigPanel({ cfg, setCfg, maqDig, maqAna, setMaqDig, setMaqAna, dbStatus }: {
  cfg: ConfigCruces; setCfg: (c: ConfigCruces) => void;
  maqDig: MaquinaDigital[]; maqAna: MaquinaAnalog[];
  setMaqDig: (m: MaquinaDigital[]) => void;
  setMaqAna: (m: MaquinaAnalog[]) => void;
  dbStatus: 'loading' | 'ok' | 'fallback';
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveCfg() {
    setSaving(true);
    try {
      await updateConfigCruces(cfg);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { /* fallback: only local */ }
    setSaving(false);
  }

  function slider(key: keyof ConfigCruces, label: string, min: number, max: number, step: number, unit = 'm') {
    const val = cfg[key] as number;
    return (
      <div className="mb-5">
        <div className="flex justify-between mb-2">
          <label className="text-sm text-slate-300">{label}</label>
          <span className="text-sm font-mono font-semibold text-orange-300">
            {typeof val === 'number' && key === 'factor_v12' ? val.toFixed(1) : val.toLocaleString()} {unit}
          </span>
        </div>
        <input type="range" min={min} max={max} step={step} value={val}
          onChange={e => setCfg({ ...cfg, [key]: parseFloat(e.target.value) })}
          className="w-full accent-orange-500" />
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>{min.toLocaleString()}</span><span>{max.toLocaleString()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {dbStatus === 'fallback' && (
        <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-700/40 rounded-xl text-xs text-amber-300">
          <Info size={13} />
          Base de datos no disponible — cambios solo locales (esta sesión).
        </div>
      )}

      <Card>
        <SecHead icon={Settings} label="Puntos de cruce" />
        {slider('metros_6mil_v12', '6K → V12 (metros lineales)', 300, 3000, 50)}
        {slider('metros_digital_analog', 'Digital → Analógica (metros lineales)', 1000, 12000, 200)}
        {slider('factor_v12', 'Factor de distribución V12', 1, 8, 0.1, '')}
        {slider('gap_eje_mm', 'Gap al eje (mm)', 1, 6, 0.5, 'mm')}
        {slider('gap_des_mm', 'Gap al desarrollo (mm)', 1, 6, 0.5, 'mm')}
        <button onClick={saveCfg} disabled={saving}
          className="mt-2 flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">
          {saved ? <CheckCircle2 size={14} className="text-teal-400" /> : <Save size={14} />}
          {saved ? 'Guardado' : saving ? 'Guardando...' : 'Guardar en DB'}
        </button>
      </Card>

      <Card>
        <SecHead icon={Cpu} label="Máquinas digitales" />
        <div className="space-y-3">
          {maqDig.map(m => (
            <MaqDigRow key={m.id} m={m}
              onChange={async patch => {
                const updated = maqDig.map(x => x.id === m.id ? { ...x, ...patch } : x);
                setMaqDig(updated);
                try { await updateMaquinaDigital(m.id, patch); } catch {}
              }} />
          ))}
        </div>
      </Card>

      <Card>
        <SecHead icon={Layers} label="Máquinas analógicas" />
        <div className="space-y-3">
          {maqAna.map(m => (
            <MaqAnaRow key={m.id} m={m}
              onChange={async patch => {
                const updated = maqAna.map(x => x.id === m.id ? { ...x, ...patch } : x);
                setMaqAna(updated);
                try { await updateMaquinaAnalog(m.id, patch); } catch {}
              }} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function MaqDigRow({ m, onChange }: { m: MaquinaDigital; onChange: (p: Partial<MaquinaDigital>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-slate-800/50 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-semibold text-slate-200">{m.nombre}</span>
        <ChevronRight size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {([['hp_hr_usd','HP USD/hr','number'],['click_usd','Click USD','number'],
             ['setup_m','Setup (m)','number'],['planilla_mm','Planilla (mm)','number'],
             ['frame_cm','Frame (cm)','number']] as [keyof MaquinaDigital, string, string][]).map(([k, lbl]) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">{lbl}</span>
              <input type="number" defaultValue={(m[k] as number) ?? ''}
                onBlur={e => onChange({ [k]: parseFloat(e.target.value)||0 } as Partial<MaquinaDigital>)}
                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-orange-500/60" />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function MaqAnaRow({ m, onChange }: { m: MaquinaAnalog; onChange: (p: Partial<MaquinaAnalog>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-slate-800/50 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-semibold text-slate-200">{m.nombre}</span>
        <ChevronRight size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {([['costo_hr_usd','Costo HR (USD)'],['vel_std','Vel std (m/min)'],
             ['vel_screen','Vel screen'],['vel_hs','Vel HS'],
             ['ancho_max_mm','Ancho máx (mm)']] as [keyof MaquinaAnalog, string][]).map(([k, lbl]) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">{lbl}</span>
              <input type="number" defaultValue={(m[k] as number) ?? ''}
                onBlur={e => onChange({ [k]: parseFloat(e.target.value)||0 } as Partial<MaquinaAnalog>)}
                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-orange-500/60" />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
