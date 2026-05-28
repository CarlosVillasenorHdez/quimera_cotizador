'use client';
import React, { useState, useCallback, useRef } from 'react';
import { FileUp, Settings, ChevronRight, AlertTriangle, CheckCircle2, Info, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface RFQData {
  eje_mm: number;
  des_mm: number;
  tintas_dig: number;
  tintas_offset: number;
  tintas_flexo: number;
  quantities: number[];
  title: string;
  customer: string;
}

interface AnalyzerConfig {
  metros_6mil_v12: number;        // 6K → V12 crossover (metros lineales)
  metros_digital_analog: number;  // Digital → Analógica crossover (metros lineales)
  factor_v12: number;             // Factor de distribución V12 (base: 3.9)
  gap_eje_mm: number;
  gap_des_mm: number;
}

interface MachineResult {
  id: string;
  label: string;
  viable: boolean;
  razon?: string;
  cav_e?: number;
  cav_d?: number;
  metros_1k?: number;
  desde_k?: number;
  hasta_k?: number;
}

interface AnalysisResult {
  mils_6k_to_v12: number | null;
  mils_digital_to_analog: number | null;
  digital: MachineResult[];
  analog: MachineResult[];
}

// ─── MACHINE CONSTANTS (from Excel QUIMERA_MAS_HYDRA) ────────────────────────

const DIG_MACHINES = {
  '6MIL': { label: 'HP Indigo 6K',  planilla: 31.7, frame: 97.0,  setup: 5,   click: 0.0242, hp_hr: 74.167,  ancho: 0.320,
    vel: { 1:42,2:42,3:42,4:31,5:25,6:21,7:18,8:15,9:13,10:12,11:10,12:10,13:9,14:8 } },
  'V12':  { label: 'HP Indigo V12', planilla: 31.3, frame: 100.0, setup: 100, click: 0.022,  hp_hr: 194.097, ancho: 0.320,
    vel: { 1:120,2:120,3:120,4:120,5:120,6:120,7:60,8:60,9:60,10:60,11:60,12:60,13:30,14:30 } },
} as const;

const ANA_MACHINES = {
  'MO':   { label: 'MO Fusion',  ancho_max: 406.4, gap_max: 6.0,  puntada_off: 133, puntada_flex: 60  },
  'FA10': { label: 'FA10',       ancho_max: 355.6, gap_max: 6.0,  puntada_off: 0,   puntada_flex: 80  },
  'FA6':  { label: 'FA6',        ancho_max: 330.2, gap_max: 16.0, puntada_off: 0,   puntada_flex: 80  },
  'GAL1': { label: 'Galería 1',  ancho_max: 254.0, gap_max: 13.0, puntada_off: 0,   puntada_flex: 100 },
} as const;

const DEFAULT_CONFIG: AnalyzerConfig = {
  metros_6mil_v12: 1200,
  metros_digital_analog: 5000,
  factor_v12: 3.9,
  gap_eje_mm: 3,
  gap_des_mm: 3,
};

// ─── CALCULATION ENGINE ───────────────────────────────────────────────────────

function calcDigMetros(id: keyof typeof DIG_MACHINES, eje: number, des: number, n: number, cfg: AnalyzerConfig) {
  const m = DIG_MACHINES[id];
  const ge = cfg.gap_eje_mm / 10;
  const gd = cfg.gap_des_mm / 10;
  const cav_e = Math.floor(m.planilla / (eje / 10 + ge));
  const cav_d = Math.floor(m.frame / (des / 10 + gd * 2));
  if (cav_e < 1 || cav_d < 1) return null;
  const ani = m.frame - (des / 10 + gd) * cav_d;
  const frames = Math.ceil(n / (cav_e * cav_d));
  const metros = frames * (m.frame - ani) / 100 + m.setup;
  return { metros, cav_e, cav_d, frames };
}

function calcAnaMetros(id: keyof typeof ANA_MACHINES, eje: number, des: number, n: number) {
  const m = ANA_MACHINES[id];
  const gap_e = m.gap_max / 2;
  const cav_e = Math.floor((m.ancho_max - 15) / (eje + gap_e));
  if (cav_e < 1) return null;
  const puntada = Math.max(m.puntada_off, m.puntada_flex) || 60;
  const cav_d = Math.floor(puntada / (des + m.gap_max));
  if (cav_d < 1) return null;
  const frames = Math.ceil(n / (cav_e * cav_d));
  const metros = frames * des / 1000 + 20;
  return { metros, cav_e, cav_d, puntada };
}

/** Binary search: find the largest cantidad where metros <= target */
function piezasEnMetros(id: keyof typeof DIG_MACHINES, eje: number, des: number, metrosTarget: number, cfg: AnalyzerConfig): number | null {
  let lo = 100, hi = 20_000_000, best: number | null = null;
  for (let i = 0; i < 64; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const r = calcDigMetros(id, eje, des, mid, cfg);
    if (!r) break;
    if (r.metros <= metrosTarget) { best = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return best;
}

function runAnalysis(rfq: RFQData, cfg: AnalyzerConfig): AnalysisResult {
  const { eje_mm, des_mm } = rfq;

  // ── Crossover points ──────────────────────────────────────────────────────
  const raw_6k_v12  = piezasEnMetros('6MIL', eje_mm, des_mm, cfg.metros_6mil_v12, cfg);
  const raw_dig_ana = piezasEnMetros('V12',  eje_mm, des_mm, cfg.metros_digital_analog, cfg)
    ?? piezasEnMetros('6MIL', eje_mm, des_mm, cfg.metros_digital_analog, cfg);

  const mils_6k_to_v12       = raw_6k_v12   ? Math.ceil(raw_6k_v12  / 1000)  : null;
  const mils_digital_to_analog = raw_dig_ana ? Math.ceil(raw_dig_ana / 1000) : null;

  // ── Digital machines ──────────────────────────────────────────────────────
  const digital: MachineResult[] = Object.entries(DIG_MACHINES).map(([id]) => {
    const machId = id as keyof typeof DIG_MACHINES;
    const m = DIG_MACHINES[machId];
    const r1 = calcDigMetros(machId, eje_mm, des_mm, 1000, cfg);
    if (!r1) return { id, label: m.label, viable: false, razon: 'La etiqueta no cabe en el ancho de planilla.' };

    const desde_k = machId === 'V12' ? (mils_6k_to_v12 ?? 0) : 0;
    const hasta_k = machId === '6MIL' ? mils_6k_to_v12 : mils_digital_to_analog;

    return { id, label: m.label, viable: true, cav_e: r1.cav_e, cav_d: r1.cav_d,
      metros_1k: Math.round(r1.metros), desde_k, hasta_k };
  });

  // ── Analog machines ───────────────────────────────────────────────────────
  const analog: MachineResult[] = Object.entries(ANA_MACHINES).map(([id]) => {
    const machId = id as keyof typeof ANA_MACHINES;
    const m = ANA_MACHINES[machId];
    const r = calcAnaMetros(machId, eje_mm, des_mm, 1000);
    if (!r) return { id, label: m.label, viable: false, razon: 'La etiqueta no cabe en el ancho de la máquina.' };
    return { id, label: m.label, viable: true, cav_e: r.cav_e, cav_d: r.cav_d,
      metros_1k: Math.round(r.metros), desde_k: mils_digital_to_analog ?? undefined };
  });

  return { mils_6k_to_v12, mils_digital_to_analog, digital, analog };
}

// ─── RFQ HTML PARSER ─────────────────────────────────────────────────────────

function parseRFQHtml(html: string): RFQData | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  function findCaption(text: string): string {
    for (const el of Array.from(doc.querySelectorAll('.caption'))) {
      if (el.textContent?.toLowerCase().includes(text.toLowerCase())) {
        return el.nextElementSibling?.textContent?.trim() ?? '';
      }
    }
    return '';
  }

  const eje  = parseFloat(findCaption('Label size across')) || 0;
  const des  = parseFloat(findCaption('Label size around')) || 0;
  if (!eje || !des) return null;

  const qtys: number[] = [];
  const bq = parseInt(findCaption('Basic quantity').replace(/,/g, ''));
  if (bq > 0) qtys.push(bq);
  doc.querySelectorAll('.caption').forEach(el => {
    if (el.textContent?.toLowerCase().includes('alternative quantities')) {
      const v = parseInt((el.nextElementSibling?.textContent ?? '0').replace(/,/g, ''));
      if (v > 0) qtys.push(v);
    }
  });

  const hdrLines = (doc.querySelector('.header_left')?.textContent ?? '')
    .split('\n').map(s => s.trim()).filter(Boolean);

  // Try to detect tinta counts from embedded scripts or summary tables
  let tintas_dig = 4;
  doc.querySelectorAll('script').forEach(sc => {
    const m = sc.textContent?.match(/TINTAS[_\s]*(?:DIG(?:ITALES)?)[_\s]*[=:]\s*(\d+)/i);
    if (m) tintas_dig = parseInt(m[1]);
  });

  return {
    eje_mm: eje, des_mm: des,
    tintas_dig, tintas_offset: 3, tintas_flexo: 3,
    quantities: [...new Set(qtys)].sort((a, b) => a - b),
    title: hdrLines[0] ?? '', customer: hdrLines[1] ?? '',
  };
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Pill({ color, children }: { color: 'blue' | 'teal' | 'amber' | 'gray'; children: React.ReactNode }) {
  const cls = {
    blue:  'bg-blue-900/40 text-blue-300 border-blue-700/50',
    teal:  'bg-teal-900/40 text-teal-300 border-teal-700/50',
    amber: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
    gray:  'bg-slate-800 text-slate-400 border-slate-700',
  }[color];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{children}</span>;
}

function SectionHead({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={15} className="text-slate-500" />
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}

function MachCard({ m, highlight }: { m: MachineResult; highlight?: boolean }) {
  if (!m.viable) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 opacity-50">
        <div className="text-sm font-medium text-slate-300 mb-1">{m.label}</div>
        <div className="text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle size={11} />{m.razon}
        </div>
      </div>
    );
  }
  const rangeText = m.desde_k !== undefined && m.hasta_k
    ? `${m.desde_k > 0 ? m.desde_k.toLocaleString() + 'k' : '0'} – ${m.hasta_k.toLocaleString()}k pzas`
    : m.desde_k !== undefined && m.desde_k! > 0
    ? `A partir de ${m.desde_k.toLocaleString()}k pzas`
    : m.hasta_k ? `Hasta ${m.hasta_k.toLocaleString()}k pzas` : '—';

  return (
    <div className={`border rounded-xl p-4 ${highlight ? 'border-orange-500/50 bg-orange-950/20' : 'border-slate-700/60 bg-slate-800/50'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-slate-200">{m.label}</div>
          <div className="text-xs text-slate-500">{m.cav_e} × {m.cav_d} cav · {m.metros_1k} m/millar</div>
        </div>
        {highlight && <Pill color="amber">Recomendado</Pill>}
      </div>
      <div className="text-xs text-slate-400 mb-1">Rango</div>
      <div className="text-base font-semibold text-orange-300">{rangeText}</div>
    </div>
  );
}

function ResultView({ rfq, result, cfg }: { rfq: RFQData; result: AnalysisResult; cfg: AnalyzerConfig }) {
  const viableAnalog = result.analog.filter(m => m.viable);
  const bestAnalog = viableAnalog[0];

  function techForQty(q: number): { label: string; color: 'blue' | 'teal' } {
    const k = q / 1000;
    if (result.mils_digital_to_analog && k > result.mils_digital_to_analog)
      return { label: bestAnalog?.label ?? 'Analógica', color: 'teal' };
    if (result.mils_6k_to_v12 && k > result.mils_6k_to_v12)
      return { label: 'HP Indigo V12', color: 'blue' };
    return { label: 'HP Indigo 6K', color: 'blue' };
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
        <div className="text-xs text-slate-500 mb-1">
          {rfq.customer && <span className="mr-2">{rfq.customer}</span>}{rfq.title}
        </div>
        <div className="text-2xl font-bold text-slate-100 mb-3">{rfq.eje_mm} × {rfq.des_mm} mm</div>
        <div className="flex flex-wrap gap-2">
          {rfq.tintas_dig > 0 && <Pill color="blue">{rfq.tintas_dig} tintas digitales</Pill>}
          {rfq.tintas_offset > 0 && <Pill color="gray">{rfq.tintas_offset} offset</Pill>}
          {rfq.tintas_flexo > 0 && <Pill color="gray">{rfq.tintas_flexo} flexo</Pill>}
          {rfq.quantities.length > 0 &&
            <Pill color="teal">RFQ: {rfq.quantities.map(q => q >= 1000 ? (q/1000).toFixed(0)+'k' : String(q)).join(', ')} pzas</Pill>}
        </div>
      </div>

      {/* ── Crossover summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4">
          <div className="text-xs text-blue-400 uppercase tracking-wider mb-1">6K → V12</div>
          <div className="text-xl font-bold text-blue-300">
            {result.mils_6k_to_v12 ? `${result.mils_6k_to_v12.toLocaleString()}k pzas` : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">≈ {cfg.metros_6mil_v12.toLocaleString()} metros lineales</div>
        </div>
        <div className="bg-teal-950/30 border border-teal-800/40 rounded-xl p-4">
          <div className="text-xs text-teal-400 uppercase tracking-wider mb-1">Digital → Analógica</div>
          <div className="text-xl font-bold text-teal-300">
            {result.mils_digital_to_analog ? `${result.mils_digital_to_analog.toLocaleString()}k pzas` : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">≈ {cfg.metros_digital_analog.toLocaleString()} metros lineales</div>
        </div>
      </div>

      {/* ── Digital machines ── */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5">
        <SectionHead icon={Info} label="Tecnología digital" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {result.digital.map(m => <MachCard key={m.id} m={m} />)}
        </div>
      </div>

      {/* ── Analog machines ── */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5">
        <SectionHead icon={Info} label="Tecnología analógica" />
        {viableAnalog.length === 0
          ? <p className="text-sm text-slate-500">Ninguna máquina analógica compatible con estas dimensiones.</p>
          : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.analog.map((m, i) => <MachCard key={m.id} m={m} highlight={i === 0 && m.viable} />)}
            </div>}
      </div>

      {/* ── RFQ quantities mapped ── */}
      {rfq.quantities.filter(q => q > 0).length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5">
          <SectionHead icon={ChevronRight} label="Escalas del RFQ → tecnología recomendada" />
          <div className="flex flex-col gap-2">
            {rfq.quantities.filter(q => q > 0).map(q => {
              const t = techForQty(q);
              return (
                <div key={q} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-4 py-2.5">
                  <span className="text-sm font-semibold text-slate-200">{q.toLocaleString()} pzas</span>
                  <Pill color={t.color}>{t.label}</Pill>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-600 mt-3">
            El ingeniero puede ajustar los puntos de cambio en Configuración antes de ingresar escalas a CERM.
          </p>
        </div>
      )}
    </div>
  );
}

function ConfigView({ cfg, setCfg }: { cfg: AnalyzerConfig; setCfg: (c: AnalyzerConfig) => void }) {
  function slider(key: keyof AnalyzerConfig, label: string, min: number, max: number, step: number, unit = 'm') {
    return (
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-slate-300">{label}</label>
          <span className="text-sm font-mono font-semibold text-orange-300">
            {typeof cfg[key] === 'number' && key === 'factor_v12'
              ? (cfg[key] as number).toFixed(1)
              : (cfg[key] as number).toLocaleString()} {unit}
          </span>
        </div>
        <input type="range" min={min} max={max} step={step} value={cfg[key] as number}
          onChange={e => setCfg({ ...cfg, [key]: parseFloat(e.target.value) })}
          className="w-full accent-orange-500" />
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>{min.toLocaleString()} {unit}</span><span>{max.toLocaleString()} {unit}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5">
        <SectionHead icon={SlidersHorizontal} label="Puntos de cruce (metros lineales)" />
        {slider('metros_6mil_v12', '6K → V12', 300, 3000, 100)}
        {slider('metros_digital_analog', 'Digital → Analógica', 1000, 12000, 200)}
      </div>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5">
        <SectionHead icon={SlidersHorizontal} label="Factor V12" />
        {slider('factor_v12', 'Factor de distribución V12', 1, 8, 0.1, '')}
        <p className="text-xs text-slate-500">
          Valor base del Excel: 3.9. Ajusta el cruce real entre 6K y V12.
        </p>
      </div>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5">
        <SectionHead icon={SlidersHorizontal} label="Gaps estándar" />
        {slider('gap_eje_mm', 'Gap al eje (mm)', 1, 6, 0.5, 'mm')}
        {slider('gap_des_mm', 'Gap al desarrollo (mm)', 1, 6, 0.5, 'mm')}
      </div>

      {/* Machine reference tables */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5">
        <SectionHead icon={Info} label="Referencia — máquinas digitales" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(DIG_MACHINES).map(([id, m]) => (
            <div key={id} className="bg-slate-800/60 rounded-xl p-3">
              <div className="text-sm font-semibold text-slate-200 mb-2">{m.label}</div>
              {([['Planilla (cm)', m.planilla], ['Frame (cm)', m.frame], ['Setup (m)', m.setup],
                ['Click (USD)', m.click.toFixed(4)], ['HP/hr (USD)', m.hp_hr.toFixed(1)]] as [string, string|number][]).map(([l, v]) => (
                <div key={l} className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-mono text-slate-300">{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5">
        <SectionHead icon={Info} label="Referencia — máquinas analógicas" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(ANA_MACHINES).map(([id, m]) => (
            <div key={id} className="bg-slate-800/60 rounded-xl p-3">
              <div className="text-sm font-semibold text-slate-200 mb-2">{m.label}</div>
              {([['Ancho max (mm)', m.ancho_max], ['Gap max (mm)', m.gap_max],
                ...(m.puntada_off ? [['Puntada offset (mm)', m.puntada_off]] : []),
                ...(m.puntada_flex ? [['Puntada flexo (mm)', m.puntada_flex]] : [])] as [string, number][]).map(([l, v]) => (
                <div key={l} className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-500">{l}</span>
                  <span className="font-mono text-slate-300">{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ManualEntry({ onAnalyze }: { onAnalyze: (r: RFQData) => void }) {
  const [v, setV] = useState<RFQData & { q1: number; q2: number; q3: number; q4: number }>({
    eje_mm: 120, des_mm: 100, tintas_dig: 4, tintas_offset: 3, tintas_flexo: 3,
    quantities: [], title: '', customer: '', q1: 1000, q2: 5000, q3: 10000, q4: 50000,
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV(x => ({ ...x, [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }));

  const numField = (key: string, label: string) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <input type="number" value={(v as any)[key]} onChange={set(key)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 w-full focus:outline-none focus:border-orange-500/60" />
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {numField('eje_mm', 'Eje (mm)')}
        {numField('des_mm', 'Desarrollo (mm)')}
        {numField('tintas_dig', 'Tintas digitales')}
        {numField('tintas_offset', 'Tintas offset')}
        {numField('tintas_flexo', 'Tintas flexo')}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {numField('q1', 'Escala 1 (pzas)')}
        {numField('q2', 'Escala 2 (pzas)')}
        {numField('q3', 'Escala 3 (pzas)')}
        {numField('q4', 'Escala 4 (pzas)')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Descripción</span>
          <input type="text" value={v.title} onChange={set('title')} placeholder="Opcional"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500/60" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Cliente</span>
          <input type="text" value={v.customer} onChange={set('customer')} placeholder="Opcional"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500/60" />
        </label>
      </div>
      <button onClick={() => onAnalyze({ ...v, quantities: [v.q1, v.q2, v.q3, v.q4].filter(q => q > 0) })}
        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
        Calcular puntos de cambio →
      </button>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

type Tab = 'upload' | 'result' | 'config';

export default function RFQAnalyzerPage() {
  const [tab, setTab] = useState<Tab>('upload');
  const [rfq, setRfq] = useState<RFQData | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [cfg, setCfg] = useState<AnalyzerConfig>(DEFAULT_CONFIG);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const doAnalyze = useCallback((parsed: RFQData) => {
    const r = runAnalysis(parsed, cfg);
    setRfq(parsed); setResult(r); setError(null); setTab('result');
  }, [cfg]);

  const loadFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseRFQHtml(e.target?.result as string);
        if (!parsed) throw new Error('No se encontraron dimensiones de etiqueta en el archivo HTML.');
        doAnalyze(parsed);
      } catch (ex) { setError((ex as Error).message); }
    };
    reader.readAsText(file);
  }, [doAnalyze]);

  const tabs: { id: Tab; label: string; icon: React.ElementType; disabled?: boolean }[] = [
    { id: 'upload', label: 'Cargar RFQ', icon: FileUp },
    { id: 'result', label: 'Resultado', icon: CheckCircle2, disabled: !result },
    { id: 'config', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 bg-slate-950/95 border-b border-slate-800 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">Q</span>
            </div>
            <span className="font-bold text-slate-100 text-sm hidden sm:block">
              Quimera <span className="text-orange-400">Cotizador</span>
            </span>
            <span className="text-slate-700 hidden md:block">|</span>
            <span className="text-slate-400 text-sm hidden md:block">Analizador de RFQ</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
              {tabs.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} disabled={t.disabled} onClick={() => !t.disabled && setTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                      ${t.disabled ? 'opacity-30 cursor-not-allowed text-slate-500' :
                        tab === t.id ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                    <Icon size={12} />{t.label}
                  </button>
                );
              })}
            </div>
            <Link href="/quotation-calculator"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              Cotizador →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Upload tab */}
        {tab === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                ${dragging ? 'border-orange-500 bg-orange-950/20' : 'border-slate-700 hover:border-slate-600 bg-slate-900/30'}`}
            >
              <FileUp size={40} className={`mx-auto mb-4 ${dragging ? 'text-orange-400' : 'text-slate-600'}`} />
              <p className="text-base font-semibold text-slate-300 mb-1">Arrastra el archivo RFQ aquí</p>
              <p className="text-sm text-slate-600">o haz clic para seleccionar · formato .html exportado de CERM</p>
              <input ref={fileRef} type="file" accept=".html" className="hidden"
                onChange={e => loadFile(e.target.files?.[0])} />
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-950/30 border border-red-800/50 rounded-xl text-sm text-red-400">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Manual entry fallback */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
              <SectionHead icon={SlidersHorizontal} label="O ingresa los datos manualmente" />
              <ManualEntry onAnalyze={doAnalyze} />
            </div>
          </div>
        )}

        {/* Result tab */}
        {tab === 'result' && rfq && result && (
          <div className="max-w-2xl mx-auto">
            <ResultView rfq={rfq} result={result} cfg={cfg} />
          </div>
        )}

        {/* Config tab */}
        {tab === 'config' && (
          <div className="max-w-2xl mx-auto">
            <ConfigView cfg={cfg} setCfg={setCfg} />
          </div>
        )}
      </main>
    </div>
  );
}
