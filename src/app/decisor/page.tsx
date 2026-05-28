'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  FileUp, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Settings, Printer, BookOpen, RefreshCw, Lock, Layers,
  Ruler, Package, Palette, Sparkles, Info
} from 'lucide-react';
import { DatosEtiqueta, MATERIALES, MAQUINAS_ANALOG, MAQUINAS_DIGITAL,
         UMBRALES, CILINDROS, PASO_DIENTE_MM } from '../../engine/knowledge';
import { analizarEtiqueta, ResultadoAnalisis, ResultadoMaquina } from '../../engine/decisor';
import { parseRFQHtml } from '../../engine/parser';

const DEFAULT_ETIQUETA: DatosEtiqueta = {
  eje_mm: 50, des_mm: 50,
  material_id: 'bopp_blanco', material_nombre: 'BOPP Blanco',
  tintas_proceso: 4,
  tiene_blanco: false, tiene_plata: false, tiene_invisible: false, tiene_barniz_uv: false,
  tintas_offset: 0, tintas_flexo: 0, tintas_screen: 0,
  tiene_hot_stamping: false, tiene_cold_foil: false, tiene_embossing: false,
  tiene_screen: false, tiene_cupon: false,
  cantidades: [1000, 5000, 10000, 50000],
  nombre: '', cliente: '', modo: 'ingenieria',
};

const BG   = '#0B0F1A';
const CARD  = '#111827';
const CARD2 = '#161D2E';

// ── ATOMS ──────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-700 flex items-center justify-center shadow-lg shadow-orange-900/40">
          <span className="text-white font-black text-base">C</span>
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-teal-400 border-2 border-[#0B0F1A]" />
      </div>
      <div className="leading-none">
        <div className="text-base font-black tracking-tight text-slate-100">CERBERO</div>
        <div className="text-[10px] font-bold tracking-[0.2em] text-orange-400 uppercase">Pensador</div>
      </div>
    </div>
  );
}

function Chip({ color = 'gray', children, size = 'sm' }: {
  color?: 'green'|'red'|'amber'|'blue'|'teal'|'gray'|'purple';
  children: React.ReactNode; size?: 'xs'|'sm';
}) {
  const m: Record<string,string> = {
    green:  'bg-green-950/70 text-green-300 border-green-800/50',
    red:    'bg-red-950/70   text-red-300   border-red-800/50',
    amber:  'bg-amber-950/70 text-amber-300 border-amber-800/50',
    blue:   'bg-blue-950/70  text-blue-300  border-blue-800/50',
    teal:   'bg-teal-950/70  text-teal-300  border-teal-800/50',
    gray:   'bg-slate-800    text-slate-400 border-slate-700/60',
    purple: 'bg-purple-950/70 text-purple-300 border-purple-800/50',
  };
  const p = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';
  return <span className={`inline-flex items-center rounded-full border font-semibold ${p} ${m[color]}`}>{children}</span>;
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">{label}</span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

function Tog({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${on ? 'bg-orange-500' : 'bg-slate-700'}`}>
      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

// ── RFQ PANEL ──────────────────────────────────────────────────────────────────

function RFQPanel({ etiqueta, onEditar }: { etiqueta: DatosEtiqueta; onEditar: () => void }) {
  const hasAnalog = etiqueta.tintas_offset > 0 || etiqueta.tintas_flexo > 0 || etiqueta.tintas_screen > 0;
  return (
    <div className="rounded-2xl border border-slate-800 overflow-hidden" style={{background: CARD}}>
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">RFQ · Referencia</span>
        <button type="button" onClick={onEditar} className="text-[10px] text-orange-400 hover:text-orange-300 font-bold transition-colors">
          Editar →
        </button>
      </div>
      <div className="p-4 space-y-3">
        {(etiqueta.cliente || etiqueta.nombre) && (
          <div>
            {etiqueta.cliente && <div className="text-[11px] text-slate-500">{etiqueta.cliente}</div>}
            {etiqueta.nombre  && <div className="text-sm font-bold text-slate-200 truncate">{etiqueta.nombre}</div>}
          </div>
        )}
        <div className="rounded-xl border border-slate-700/50 p-3 text-center" style={{background: CARD2}}>
          <div className="text-3xl font-black text-slate-100 tabular-nums leading-none">
            {etiqueta.eje_mm}<span className="text-slate-600 text-xl font-normal mx-1">×</span>{etiqueta.des_mm}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">mm · eje × desarrollo</div>
        </div>
        <div className="flex items-center gap-2">
          <Package size={11} className="text-slate-600 shrink-0" />
          <span className="text-sm text-slate-300 font-medium">{etiqueta.material_nombre}</span>
        </div>
        <div className="space-y-1 text-xs">
          {etiqueta.tintas_proceso > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Digital (proceso)</span>
              <span className="text-blue-300 font-mono font-bold">{etiqueta.tintas_proceso} tintas</span>
            </div>
          )}
          {etiqueta.tiene_blanco && <div className="flex justify-between"><span className="text-slate-500">Blanco</span><span className="text-slate-300">✓</span></div>}
          {etiqueta.tiene_plata  && <div className="flex justify-between"><span className="text-slate-500">Plata</span><span className="text-slate-300">✓</span></div>}
          {hasAnalog && <div className="h-px bg-slate-800 my-1"/>}
          {etiqueta.tintas_offset > 0 && <div className="flex justify-between"><span className="text-slate-500">Offset</span><span className="text-amber-300 font-mono font-bold">{etiqueta.tintas_offset} tintas</span></div>}
          {etiqueta.tintas_flexo > 0  && <div className="flex justify-between"><span className="text-slate-500">Flexo</span><span className="text-amber-300 font-mono font-bold">{etiqueta.tintas_flexo} tintas</span></div>}
          {etiqueta.tintas_screen > 0 && <div className="flex justify-between"><span className="text-slate-500">Screen</span><span className="text-amber-300 font-mono font-bold">{etiqueta.tintas_screen} tintas</span></div>}
        </div>
        {(etiqueta.tiene_hot_stamping || etiqueta.tiene_cold_foil || etiqueta.tiene_embossing || etiqueta.tiene_cupon) && (
          <div className="flex flex-wrap gap-1">
            {etiqueta.tiene_hot_stamping && <Chip color="amber" size="xs">Hot Stamp</Chip>}
            {etiqueta.tiene_cold_foil    && <Chip color="amber" size="xs">Cold Foil</Chip>}
            {etiqueta.tiene_embossing    && <Chip color="amber" size="xs">Embossing</Chip>}
            {etiqueta.tiene_cupon        && <Chip color="purple" size="xs">Cupón</Chip>}
          </div>
        )}
        {etiqueta.cantidades.length > 0 && (
          <div>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1.5">Escalas RFQ</div>
            <div className="flex flex-wrap gap-1.5">
              {etiqueta.cantidades.map(q => (
                <div key={q} className="rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-teal-300 border border-teal-900/60" style={{background:'#0a1e1b'}}>
                  {q >= 1000 ? (q/1000).toFixed(0)+'k' : q}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DIAGRAM — full width, large ────────────────────────────────────────────────

function Diagrama({ eje_mm, des_mm, cav_eje, cav_des, gap_eje_mm, gap_des_mm, ancho_mm, tipo, nombre }: {
  eje_mm: number; des_mm: number; cav_eje: number; cav_des: number;
  gap_eje_mm: number; gap_des_mm: number; ancho_mm: number;
  tipo: 'digital'|'analog'; nombre: string;
}) {
  const W = 760, H = 360, PAD = 52;
  const pw_r = tipo === 'digital' ? ancho_mm : (eje_mm * cav_eje + gap_eje_mm * (cav_eje + 1));
  const ph_r = (des_mm + gap_des_mm) * cav_des + gap_des_mm;
  const sc   = Math.min((W - PAD*2) / pw_r, (H - PAD*2) / ph_r);
  const pw = pw_r*sc, ph = ph_r*sc;
  const ox = (W-pw)/2, oy = (H-ph)/2;
  const ew = eje_mm*sc, eh = des_mm*sc, ge = gap_eje_mm*sc, gd = gap_des_mm*sc;
  const col     = tipo === 'digital' ? '#3B82F6' : '#14B8A6';
  const paperBg = tipo === 'digital' ? '#0d1628'  : '#0a1e1b';

  const rects: {x:number;y:number}[] = [];
  for (let r=0; r<cav_des; r++) for (let c=0; c<cav_eje; c++)
    rects.push({ x: ox+ge+c*(ew+ge), y: oy+gd+r*(eh+gd) });

  return (
    <div className="rounded-2xl border border-slate-700/40 overflow-hidden" style={{background: CARD2}}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{background: col}}/>
          <span className="text-sm font-black text-slate-100">{nombre}</span>
          <Chip color={tipo==='digital'?'blue':'teal'} size="xs">{tipo}</Chip>
        </div>
        <span className="text-sm font-mono text-slate-400">
          <span className="text-slate-200 font-bold">{cav_eje}×{cav_des}</span>
          <span className="text-slate-600 mx-1.5">=</span>
          <span className="font-black" style={{color: col}}>{cav_eje*cav_des} etiq/frame</span>
        </span>
      </div>

      {/* SVG */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{display:'block',width:'100%'}}>
        {/* Paper */}
        <rect x={ox} y={oy} width={pw} height={ph} fill={paperBg} stroke="#334155" strokeWidth={1.5} rx={4}/>
        {/* Width arrow */}
        <line x1={ox} y1={oy-22} x2={ox+pw} y2={oy-22} stroke="#475569" strokeWidth={1}/>
        <line x1={ox}    y1={oy-28} x2={ox}    y2={oy-16} stroke="#475569" strokeWidth={1}/>
        <line x1={ox+pw} y1={oy-28} x2={ox+pw} y2={oy-16} stroke="#475569" strokeWidth={1}/>
        <text x={(ox+ox+pw)/2} y={oy-26} fill="#64748b" fontSize={11} textAnchor="middle" fontWeight="600">
          {pw_r.toFixed(0)} mm {tipo==='digital'?'(planilla)':'(bobina)'}
        </text>
        {/* Height arrow */}
        <line x1={ox+pw+20} y1={oy} x2={ox+pw+20} y2={oy+ph} stroke="#475569" strokeWidth={1}/>
        <line x1={ox+pw+14} y1={oy}    x2={ox+pw+26} y2={oy}    stroke="#475569" strokeWidth={1}/>
        <line x1={ox+pw+14} y1={oy+ph} x2={ox+pw+26} y2={oy+ph} stroke="#475569" strokeWidth={1}/>
        <text x={ox+pw+36} y={(oy+oy+ph)/2} fill="#64748b" fontSize={11} textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(90,${ox+pw+36},${(oy+oy+ph)/2})`}>
          {ph_r.toFixed(0)} mm
        </text>
        {/* Labels */}
        {rects.map(({x,y},i) => (
          <g key={i}>
            <rect x={x} y={y} width={ew} height={eh} fill={col+'22'} stroke={col} strokeWidth={1.5} rx={3}/>
            {ew > 28 && eh > 16 && (
              <text x={x+ew/2} y={y+eh/2} fill={col} fontSize={Math.min(12, ew/4, eh/2.5)}
                textAnchor="middle" dominantBaseline="middle" fontWeight="700" opacity={0.85}>
                {eje_mm}×{des_mm}
              </text>
            )}
          </g>
        ))}
        {/* Gap eje */}
        {cav_eje > 1 && rects.length >= 2 && ge > 6 && (
          <g>
            <line x1={rects[0].x+ew} y1={oy+gd/2} x2={rects[1].x} y2={oy+gd/2}
              stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="3,2" opacity={0.9}/>
            <text x={(rects[0].x+ew+rects[1].x)/2} y={oy+gd/2-8}
              fill="#F59E0B" fontSize={10} textAnchor="middle" fontWeight="700">{gap_eje_mm}mm</text>
          </g>
        )}
        {/* Gap des */}
        {cav_des > 1 && rects.length > cav_eje && gd > 6 && (
          <g>
            <line x1={ox+ge/2} y1={rects[0].y+eh} x2={ox+ge/2} y2={rects[cav_eje].y}
              stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="3,2" opacity={0.9}/>
            <text x={ox+ge/2+3} y={(rects[0].y+eh+rects[cav_eje].y)/2}
              fill="#F59E0B" fontSize={10} dominantBaseline="middle" fontWeight="700">{gap_des_mm.toFixed(2)}mm</text>
          </g>
        )}
      </svg>

      {/* Footer — suaje reference */}
      <div className="px-5 py-3 border-t border-slate-800 grid grid-cols-4 gap-4 text-xs">
        <div><div className="text-slate-600 mb-0.5">Ancho papel</div><div className="font-mono font-bold text-slate-200">{pw_r.toFixed(0)} mm</div></div>
        <div><div className="text-slate-600 mb-0.5">Alto papel</div><div className="font-mono font-bold text-slate-200">{ph_r.toFixed(0)} mm</div></div>
        <div><div className="text-slate-600 mb-0.5">Gap eje (suaje)</div><div className="font-mono font-bold text-amber-300">{gap_eje_mm} mm</div></div>
        <div><div className="text-slate-600 mb-0.5">Gap des (suaje)</div><div className="font-mono font-bold text-amber-300">{gap_des_mm.toFixed(2)} mm</div></div>
      </div>
    </div>
  );
}

// ── MACHINE CARD ───────────────────────────────────────────────────────────────

function MachCard({ r }: { r: ResultadoMaquina }) {
  if (!r.viable) return (
    <div className="rounded-xl border border-slate-800/80 p-4 opacity-50" style={{background: CARD2}}>
      <div className="flex items-center gap-2 mb-2.5">
        <XCircle size={14} className="text-red-400 shrink-0"/>
        <span className="text-sm font-bold text-slate-400">{r.nombre}</span>
        <Chip color="gray" size="xs">{r.tipo}</Chip>
      </div>
      <div className="space-y-1.5">
        {r.razones_no_viable.map(x=>(
          <div key={x.codigo} className="flex items-start gap-2 text-xs text-red-400/80">
            <span className="shrink-0 mt-0.5">✗</span>
            <span className="leading-relaxed">{x.descripcion}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const isFlexo    = r.advertencias.some(a => a.codigo === 'OFFSET_A_FLEXO');
  const isSetupAlto = r.advertencias.some(a => a.codigo === 'SETUP_ALTO');
  const rangeLabel = r.rango_hasta_k
    ? `${r.rango_desde_k! > 0 ? r.rango_desde_k!.toLocaleString()+'k' : '0'} → ${r.rango_hasta_k.toLocaleString()}k pzas`
    : r.rango_desde_k! > 0 ? `A partir de ${r.rango_desde_k!.toLocaleString()}k pzas` : 'Todos los volúmenes';

  const borderCol  = r.tipo==='digital' ? 'border-blue-800/50'  : 'border-teal-800/50';
  const headerBg   = r.tipo==='digital' ? '#0d1628'             : '#0a1e1b';
  const bodyBg     = r.tipo==='digital' ? '#0a1120'             : '#071815';
  const rColor     = r.tipo==='digital' ? 'text-blue-200'       : 'text-teal-200';
  const divColor   = r.tipo==='digital' ? '#1e3a5f'             : '#134040';

  return (
    <div className={`rounded-xl border ${borderCol} overflow-hidden`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{background: headerBg, borderBottom:`1px solid ${divColor}`}}>
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-green-400"/>
          <span className="text-sm font-black text-slate-100">{r.nombre}</span>
          {isFlexo     && <Chip color="amber" size="xs">flexo alt.</Chip>}
          {isSetupAlto && <Chip color="gray"  size="xs">setup alto</Chip>}
        </div>
        <Chip color={r.tipo==='digital'?'blue':'teal'} size="xs">{r.tipo}</Chip>
      </div>

      {/* Range — hero text */}
      <div className="px-4 py-3.5" style={{background: bodyBg}}>
        <div className={`text-2xl font-black leading-none ${rColor}`}>{rangeLabel}</div>
      </div>

      {/* Data grid */}
      <div className="px-4 pb-3 pt-0.5 grid grid-cols-3 gap-3 text-xs" style={{background: bodyBg}}>
        {r.cav_eje != null && (
          <div>
            <div className="text-slate-600 mb-0.5">Cavidades</div>
            <div className="font-mono font-bold text-slate-200">{r.cav_eje}×{r.cav_des} = {r.cav_eje!*r.cav_des!}</div>
          </div>
        )}
        {r.metros_1k != null && (
          <div>
            <div className="text-slate-600 mb-0.5">Metros/millar</div>
            <div className="font-mono font-bold text-slate-200">{r.metros_1k} m</div>
          </div>
        )}
        {r.cilindro_dientes != null && (
          <div>
            <div className="text-slate-600 mb-0.5">Cilindro</div>
            <div className="font-mono font-bold text-slate-200">d{r.cilindro_dientes} · {r.gap_des_mm?.toFixed(2)}mm</div>
          </div>
        )}
      </div>

      {/* Warnings (excluding setup alto — shown as chip) */}
      {r.advertencias.filter(w => w.codigo !== 'SETUP_ALTO').length > 0 && (
        <div className="px-4 pb-3 space-y-1" style={{background: bodyBg}}>
          <div className="h-px mb-2" style={{background: divColor}}/>
          {r.advertencias.filter(w => w.codigo !== 'SETUP_ALTO').map(w => (
            <div key={w.codigo} className="flex items-start gap-1.5 text-xs text-amber-400/80">
              <AlertTriangle size={10} className="shrink-0 mt-0.5"/>
              <span>{w.descripcion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RESULTADO PANEL ────────────────────────────────────────────────────────────

function ResultadoPanel({ resultado, etiqueta }: { resultado: ResultadoAnalisis; etiqueta: DatosEtiqueta }) {
  const allViable = [...resultado.viable_digital, ...resultado.viable_analog];
  const noViable  = resultado.no_viable;
  const bestDig   = resultado.viable_digital[0];
  const bestAna   = resultado.viable_analog[0];

  return (
    <div className="space-y-6" id="resultado-panel">

      {/* Recomendación */}
      <div className="rounded-r-2xl border-l-[5px] border-orange-500 p-5" style={{background: CARD}}>
        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-600 mb-2">Recomendación del Pensador</div>
        <p className="text-xl font-black text-orange-200 leading-snug">{resultado.recomendacion_principal}</p>
        {resultado.resumen !== resultado.recomendacion_principal && (
          <p className="text-xs text-slate-500 mt-2">{resultado.resumen}</p>
        )}
      </div>

      {/* Puntos de cruce */}
      {(resultado.cruce_6mil_v12 || resultado.cruce_digital_analog) && (
        <div className="grid grid-cols-2 gap-3">
          {resultado.cruce_6mil_v12 && (
            <div className="rounded-xl border border-blue-900/60 p-4" style={{background:'#0d1628'}}>
              <div className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-2">Cambio 6K → V12</div>
              <div className="text-3xl font-black text-blue-100 tabular-nums leading-none">
                {resultado.cruce_6mil_v12.toLocaleString()}
                <span className="text-base font-normal text-blue-500 ml-1.5">k pzas</span>
              </div>
              <div className="text-[10px] text-slate-600 mt-1.5">{UMBRALES.metros_6mil_to_v12.toLocaleString()} m lineales</div>
            </div>
          )}
          {resultado.cruce_digital_analog && (
            <div className="rounded-xl border border-teal-900/60 p-4" style={{background:'#0a1e1b'}}>
              <div className="text-[9px] font-black uppercase tracking-widest text-teal-500 mb-2">Digital → Analógica</div>
              <div className="text-3xl font-black text-teal-100 tabular-nums leading-none">
                {resultado.cruce_digital_analog.toLocaleString()}
                <span className="text-base font-normal text-teal-500 ml-1.5">k pzas</span>
              </div>
              <div className="text-[10px] text-slate-600 mt-1.5">{UMBRALES.metros_digital_to_analog.toLocaleString()} m lineales</div>
            </div>
          )}
        </div>
      )}

      {/* Por qué ese cruce — colapsable */}
      {resultado.explicacion_metros && (
        <details className="group rounded-xl border border-slate-800 overflow-hidden" style={{background: CARD}}>
          <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none hover:bg-slate-800/40 transition-colors">
            <Info size={13} className="text-teal-400 shrink-0"/>
            <span className="text-xs font-semibold text-slate-400">
              ¿Por qué el cambio en {resultado.explicacion_metros.millares_resultado.toLocaleString()}k piezas?
            </span>
            <ChevronRight size={12} className="ml-auto text-slate-600 group-open:rotate-90 transition-transform"/>
          </summary>
          <div className="px-4 pb-4 pt-1 space-y-1.5 text-xs text-slate-400">
            {([
              <>En <strong className="text-slate-200">{resultado.explicacion_metros.maquina_ref}</strong> caben <strong className="text-orange-300">{resultado.explicacion_metros.cav_eje}×{resultado.explicacion_metros.cav_des} = {resultado.explicacion_metros.cav_total}</strong> etiq/frame.</>,
              <>Para {resultado.explicacion_metros.millares_resultado.toLocaleString()}k pzas → <strong className="text-orange-300">≈ {resultado.explicacion_metros.frames_aprox.toLocaleString()} frames</strong>.</>,
              <>Cada frame consume <strong className="text-orange-300">{resultado.explicacion_metros.metros_por_frame.toFixed(4)} m</strong>.</>,
              <>{resultado.explicacion_metros.frames_aprox.toLocaleString()} × {resultado.explicacion_metros.metros_por_frame.toFixed(4)} = <strong className="text-teal-300">{resultado.explicacion_metros.umbral_metros.toLocaleString()} m</strong> → umbral configurado.</>,
            ] as React.ReactNode[]).map((txt,i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 text-slate-700 font-mono">{i+1}.</span>
                <span className="leading-relaxed">{txt}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Máquinas */}
      {allViable.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={13} className="text-green-400"/>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Máquinas recomendadas</span>
            <Chip color="green" size="xs">{allViable.length}</Chip>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {allViable.map(r => <MachCard key={r.id} r={r}/>)}
          </div>
        </div>
      )}

      {/* Distribución en papel — full width, GRANDE */}
      {(bestDig?.cav_eje || bestAna?.cav_eje) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Ruler size={13} className="text-slate-600"/>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Distribución en papel</span>
            <span className="text-[10px] text-slate-700 ml-1">— gaps en amarillo para referencia del suaje</span>
          </div>
          <div className="space-y-4">
            {bestDig?.cav_eje && (
              <Diagrama
                eje_mm={etiqueta.eje_mm} des_mm={etiqueta.des_mm}
                cav_eje={bestDig.cav_eje!} cav_des={bestDig.cav_des!}
                gap_eje_mm={bestDig.gap_eje_mm ?? 3}
                gap_des_mm={bestDig.gap_des_mm ?? 3}
                ancho_mm={bestDig.id==='20MIL' ? 714 : bestDig.id==='V12' ? 313 : 317}
                tipo="digital" nombre={bestDig.nombre}
              />
            )}
            {bestAna?.cav_eje && (
              <Diagrama
                eje_mm={etiqueta.eje_mm} des_mm={etiqueta.des_mm}
                cav_eje={bestAna.cav_eje!} cav_des={bestAna.cav_des!}
                gap_eje_mm={bestAna.gap_eje_mm ?? 3}
                gap_des_mm={bestAna.gap_des_mm ?? 3}
                ancho_mm={bestAna.ancho_papel_mm ?? (etiqueta.eje_mm * bestAna.cav_eje! + 3*(bestAna.cav_eje!+1))}
                tipo="analog" nombre={bestAna.nombre}
              />
            )}
          </div>
        </div>
      )}

      {/* No viables */}
      {noViable.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer list-none text-xs text-slate-600 hover:text-slate-400 py-1.5 transition-colors">
            <AlertTriangle size={12} className="text-amber-600"/>
            <span>Restricciones técnicas relevantes ({noViable.length})</span>
            <ChevronRight size={11} className="ml-auto group-open:rotate-90 transition-transform"/>
          </summary>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
            {noViable.map(r => <MachCard key={r.id} r={r}/>)}
          </div>
        </details>
      )}
    </div>
  );
}

// ── FORMULARIO ─────────────────────────────────────────────────────────────────

function Formulario({ initial, onAnalizar }: { initial: DatosEtiqueta; onAnalizar: (e: DatosEtiqueta) => void }) {
  const [v, setV] = useState<DatosEtiqueta>({...initial});
  useEffect(() => { setV({...initial}); }, [initial]);
  const s = <K extends keyof DatosEtiqueta>(k: K, val: DatosEtiqueta[K]) => setV(x => ({...x, [k]: val}));

  const ni = (label: string, key: keyof DatosEtiqueta, step = 1) => (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{label}</span>
      <input type="number" step={step} value={v[key] as number}
        onChange={e => s(key, (parseFloat(e.target.value) || 0) as DatosEtiqueta[typeof key])}
        className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-orange-500/60"/>
    </label>
  );

  const tr = (label: string, key: keyof DatosEtiqueta) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-300">{label}</span>
      <Tog on={v[key] as boolean} onToggle={() => s(key, !v[key] as DatosEtiqueta[typeof key])}/>
    </div>
  );

  return (
    <div className="space-y-5">
      <Divider label="Dimensiones"/>
      <div className="grid grid-cols-2 gap-3">
        {ni('Eje (mm)', 'eje_mm')} {ni('Desarrollo (mm)', 'des_mm')}
      </div>

      <Divider label="Material"/>
      <select value={v.material_id}
        onChange={e => { const m = MATERIALES.find(x => x.id===e.target.value); setV(x=>({...x, material_id:e.target.value, material_nombre:m?.nombre??e.target.value})); }}
        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/60">
        {(['BOPP','PE','PAPEL','ESPECIAL','VINO'] as const).map(cat => {
          const items = MATERIALES.filter(m => m.categoria === cat);
          if (!items.length) return null;
          return <optgroup key={cat} label={`── ${cat} ──`}>{items.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</optgroup>;
        })}
      </select>

      <Divider label="Tintas digitales"/>
      {ni('Tintas de proceso (CMYK + especiales)', 'tintas_proceso')}
      <div className="divide-y divide-slate-800/80">
        {tr('Tinta blanca', 'tiene_blanco')}
        {tr('Tinta plata / metálica', 'tiene_plata')}
        {tr('Tinta invisible (UV)', 'tiene_invisible')}
        {tr('Barniz UV', 'tiene_barniz_uv')}
      </div>

      <Divider label="Tintas analógicas"/>
      <p className="text-[10px] text-slate-600">Offset / Flexo / Screen solicitados por el cliente</p>
      <div className="grid grid-cols-3 gap-2">
        {ni('Offset', 'tintas_offset')} {ni('Flexo', 'tintas_flexo')} {ni('Screen', 'tintas_screen')}
      </div>

      <Divider label="Acabados especiales"/>
      <div className="divide-y divide-slate-800/80">
        {tr('Hot Stamping', 'tiene_hot_stamping')}
        {tr('Cold Foil', 'tiene_cold_foil')}
        {tr('Embossing', 'tiene_embossing')}
        {tr('Serigrafía (screen)', 'tiene_screen')}
        {tr('Cupón', 'tiene_cupon')}
      </div>

      <Divider label="Escalas del RFQ"/>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-600">Separadas por coma (en piezas)</span>
        <input type="text" defaultValue={v.cantidades.map(q => q.toLocaleString()).join(', ')}
          onBlur={e => { const qs = e.target.value.split(',').map(x => parseInt(x.replace(/\D/g,''))||0).filter(q=>q>0); s('cantidades', qs); }}
          className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-orange-500/60"/>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-600">Descripción / SKU</span>
          <input type="text" value={v.nombre} onChange={e => s('nombre', e.target.value)} placeholder="Opcional"
            className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/60"/>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-600">Cliente</span>
          <input type="text" value={v.cliente} onChange={e => s('cliente', e.target.value)} placeholder="Opcional"
            className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/60"/>
        </label>
      </div>

      <button type="button" onClick={() => onAnalizar({...v, modo:'ingenieria'})}
        className="w-full bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-black py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30">
        <BookOpen size={15}/> Analizar →
      </button>
    </div>
  );
}

// ── CONFIG PANEL — con re-análisis real ────────────────────────────────────────

function ConfigPanel({ umbrales, setUmbrales, etiqueta, onReanalizar }: {
  umbrales: typeof UMBRALES;
  setUmbrales: (u: typeof UMBRALES) => void;
  etiqueta: DatosEtiqueta | null;
  onReanalizar: (u: typeof UMBRALES) => void;
}) {
  const [local, setLocal] = useState({...umbrales});
  useEffect(() => { setLocal({...umbrales}); }, [umbrales]);
  const dirty = local.metros_6mil_to_v12 !== umbrales.metros_6mil_to_v12
    || local.metros_digital_to_analog !== umbrales.metros_digital_to_analog;

  const sl = (key: keyof typeof UMBRALES, label: string, min: number, max: number, step: number) => (
    <div className="mb-5">
      <div className="flex justify-between mb-2">
        <label className="text-sm text-slate-300">{label}</label>
        <span className="text-sm font-mono font-bold text-orange-300">{local[key].toLocaleString()} m</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={local[key]}
        onChange={e => setLocal(x => ({...x, [key]: parseInt(e.target.value)}))}
        className="w-full accent-orange-500"/>
      <div className="flex justify-between text-[10px] text-slate-700 mt-1">
        <span>{min.toLocaleString()} m</span><span>{max.toLocaleString()} m</span>
      </div>
    </div>
  );

  const [cilOpen, setCilOpen] = useState(false);

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-800/30 rounded-xl">
        <Lock size={12} className="text-amber-400 shrink-0"/>
        <p className="text-xs text-amber-300/80">Parámetros de ingeniería — solo personal autorizado.</p>
      </div>

      <div className="rounded-xl border border-slate-700/50 p-5" style={{background: CARD}}>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-4">Umbrales de cambio de tecnología</div>
        {sl('metros_6mil_to_v12', '6K → V12 (metros lineales)', 300, 3000, 50)}
        {sl('metros_digital_to_analog', 'Digital → Analógica (metros lineales)', 500, 12000, 200)}
        <div className="flex gap-3 mt-2">
          <button type="button"
            disabled={!dirty}
            onClick={() => { setUmbrales(local); if (etiqueta) onReanalizar(local); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
              dirty ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}>
            {dirty ? 'Aplicar y recalcular →' : 'Sin cambios pendientes'}
          </button>
          {dirty && (
            <button type="button" onClick={() => setLocal({...umbrales})}
              className="px-4 py-2.5 rounded-lg text-sm text-slate-500 hover:text-slate-300 border border-slate-700 transition-colors">
              Descartar
            </button>
          )}
        </div>
        {dirty && etiqueta && (
          <p className="text-[10px] text-amber-400/60 mt-2">
            ⚠ El análisis actual usa los valores anteriores. Presiona "Aplicar" para recalcular.
          </p>
        )}
      </div>

      {/* Cilindros */}
      <div className="rounded-xl border border-slate-700/50 overflow-hidden" style={{background: CARD}}>
        <button type="button" onClick={() => setCilOpen(!cilOpen)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/40 transition-colors">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inventario de cilindros</span>
          {cilOpen ? <ChevronDown size={13} className="text-slate-600"/> : <ChevronRight size={13} className="text-slate-600"/>}
        </button>
        {cilOpen && (
          <div className="px-5 pb-5 space-y-5">
            {Object.entries(CILINDROS).map(([mid, inv]) => {
              const m = MAQUINAS_ANALOG.find(x => x.id === mid);
              return (
                <div key={mid}>
                  <div className="text-xs font-bold text-slate-300 mb-2">{m?.nombre ?? mid}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(inv).map(([d, qty]) => (
                      <div key={d} className="rounded-lg px-2 py-1.5 text-center border border-slate-700/50" style={{background: CARD2}}>
                        <div className="text-xs font-mono font-black text-slate-200">d{d}</div>
                        <div className="text-[9px] text-slate-600 mt-0.5">{(Number(d)*PASO_DIENTE_MM).toFixed(1)}mm</div>
                        <div className="text-[9px] text-slate-700">×{qty}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Máquinas configuradas — referencia rápida */}
      <div className="rounded-xl border border-slate-700/50 overflow-hidden" style={{background: CARD}}>
        <div className="px-5 py-3.5 border-b border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Máquinas activas</span>
        </div>
        <div className="p-4 space-y-2">
          {[...MAQUINAS_DIGITAL.filter(m => m.id !== '20MIL'), ...MAQUINAS_ANALOG].map(m => (
            <div key={m.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${'planilla_mm' in m ? 'bg-blue-400' : 'bg-teal-400'}`}/>
                <span className="text-slate-300 font-medium">{m.nombre}</span>
              </div>
              <span className="text-slate-700 font-mono text-[10px]">
                {'planilla_mm' in m
                  ? `${m.planilla_mm}mm · ${m.frame_cm*10}mm frame`
                  : `${m.ancho_max_mm}mm ancho`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── VENDEDOR ───────────────────────────────────────────────────────────────────

function Vendedor() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-700/20 border border-orange-800/30 flex items-center justify-center mb-6">
        <span className="text-3xl font-black text-orange-400">C</span>
      </div>
      <h2 className="text-2xl font-black text-slate-100 mb-3">CERBERO Pensador</h2>
      <p className="text-slate-400 max-w-sm leading-relaxed mb-8">
        Herramienta exclusiva del departamento de ingeniería.<br/>
        Para cotizaciones use <strong className="text-slate-300">Quick Quote</strong> o contacte a ingeniería.
      </p>
      <div className="flex gap-3">
        <a href="#" className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors">Abrir Quick Quote</a>
        <a href="mailto:ingenieria@quimera.mx" className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-colors">Contactar Ingeniería</a>
      </div>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────────────────────

export default function PensadorPage() {
  const [etiqueta, setEtiqueta]   = useState<DatosEtiqueta>(DEFAULT_ETIQUETA);
  const [resultado, setResultado] = useState<ResultadoAnalisis|null>(null);
  const [modo, setModo]           = useState<'ingenieria'|'vendedor'>('ingenieria');
  const [vista, setVista]         = useState<'form'|'resultado'|'config'>('form');
  const [drag, setDrag]           = useState(false);
  const [error, setError]         = useState<string|null>(null);
  const [loading, setLoading]     = useState(false);
  const [umbrales, setUmbrales]   = useState({...UMBRALES});
  const [isWide, setIsWide]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width:1280px)');
    setIsWide(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // Analizar — u = umbrales a usar (permite pasar nuevos umbrales sin esperar setState)
  const analizar = useCallback((datos: DatosEtiqueta, u = umbrales) => {
    setLoading(true);
    setTimeout(() => {
      const r = analizarEtiqueta(datos, u);
      setEtiqueta(datos); setResultado(r); setError(null);
      setVista('resultado'); setLoading(false);
    }, 150);
  }, [umbrales]);

  // Re-analizar con nuevos umbrales desde ConfigPanel
  const reanalizar = useCallback((u: typeof UMBRALES) => {
    if (!etiqueta) return;
    setLoading(true);
    setTimeout(() => {
      const r = analizarEtiqueta(etiqueta, u);
      setResultado(r); setLoading(false);
      setVista('resultado');
    }, 150);
  }, [etiqueta]);

  const cargarRFQ = useCallback((file: File|null|undefined) => {
    if (!file) return;
    const rd = new FileReader();
    rd.onload = e => {
      try {
        const p = parseRFQHtml(e.target?.result as string);
        if (!p?.eje_mm || !p?.des_mm) throw new Error('No se encontraron dimensiones en el archivo.');
        analizar({...DEFAULT_ETIQUETA, ...p});
        setError(null);
      } catch(ex) { setError((ex as Error).message); }
    };
    rd.readAsText(file);
  }, [analizar]);

  const showWide = isWide && !!resultado && vista === 'resultado';

  return (
    <div className="min-h-screen text-slate-100 print:bg-white" style={{background: BG}}>

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-800/70 backdrop-blur-md print:hidden"
        style={{background:'rgba(11,15,26,0.94)'}}>
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Logo/>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex rounded-lg p-0.5 gap-0.5" style={{background: CARD}}>
              {(['ingenieria','vendedor'] as const).map(m => (
                <button key={m} type="button" onClick={() => setModo(m)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${modo===m ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  {m === 'ingenieria' ? 'Ingeniería' : 'Vendedor'}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg p-0.5 gap-0.5" style={{background: CARD}}>
              {([
                {id:'form'      as const, label:'Entrada',    icon:FileUp,   dis:false},
                {id:'resultado' as const, label:'Análisis',   icon:BookOpen, dis:!resultado},
                {id:'config'    as const, label:'Parámetros', icon:Settings, dis:false},
              ]).map(t => (
                <button key={t.id} type="button" disabled={t.dis}
                  onClick={() => !t.dis && setVista(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    t.dis ? 'opacity-20 cursor-not-allowed text-slate-600' :
                    vista===t.id ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  <t.icon size={12}/>{t.label}
                </button>
              ))}
            </div>
            {resultado && (
              <button type="button" onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
                style={{background: CARD}}>
                <Printer size={12}/>PDF
              </button>
            )}
          </div>
        </div>
      </header>

      {/* BODY */}
      <main className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-6">
        {modo === 'vendedor' ? <Vendedor/> : (
          showWide ? (
            // 3-COL LAYOUT (pantalla ancha + resultado listo)
            <div className="grid gap-6 items-start" style={{gridTemplateColumns:'320px 1fr 340px'}}>

              <aside className="sticky top-20">
                <div className="rounded-2xl border border-slate-800 overflow-hidden" style={{background: CARD2}}>
                  <div className="px-4 py-3 border-b border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Datos de la etiqueta</span>
                  </div>
                  <div className="p-4 overflow-y-auto" style={{maxHeight:'calc(100vh - 120px)'}}>
                    <Formulario initial={etiqueta} onAnalizar={datos => analizar(datos, umbrales)}/>
                  </div>
                </div>
              </aside>

              <div>
                {loading
                  ? <div className="flex justify-center py-32"><RefreshCw size={24} className="text-orange-400 animate-spin"/></div>
                  : resultado && <ResultadoPanel resultado={resultado} etiqueta={etiqueta}/>}
              </div>

              <aside className="sticky top-20">
                <RFQPanel etiqueta={etiqueta} onEditar={() => setVista('form')}/>
              </aside>
            </div>

          ) : (
            // NORMAL LAYOUT
            <div className="max-w-2xl mx-auto">
              {vista === 'form' && (
                <div className="space-y-5">
                  <div
                    onDragOver={e => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={e => { e.preventDefault(); setDrag(false); cargarRFQ(e.dataTransfer.files[0]); }}
                    onClick={() => fileRef.current?.click()}
                    className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
                      drag ? 'border-orange-500 bg-orange-950/20' : 'border-slate-800 hover:border-slate-700 bg-slate-900/20'}`}>
                    <FileUp size={32} className={`mx-auto mb-3 ${drag ? 'text-orange-400' : 'text-slate-700'}`}/>
                    <p className="text-base font-bold text-slate-400 mb-1">Arrastra el RFQ de CERM aquí</p>
                    <p className="text-xs text-slate-700">formato .html — dimensiones y cantidades se extraen automáticamente</p>
                    <input ref={fileRef} type="file" accept=".html" className="hidden" onChange={e => cargarRFQ(e.target.files?.[0])}/>
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-sm text-red-400">
                      <AlertTriangle size={14} className="shrink-0"/>{error}
                    </div>
                  )}
                  <div className="rounded-2xl border border-slate-800 overflow-hidden" style={{background: CARD2}}>
                    <div className="px-5 py-3.5 border-b border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">O ingresa los datos manualmente</span>
                    </div>
                    <div className="p-5">
                      <Formulario initial={etiqueta} onAnalizar={datos => analizar(datos, umbrales)}/>
                    </div>
                  </div>
                </div>
              )}

              {vista === 'resultado' && resultado && (
                <div>
                  <div className="mb-5"><RFQPanel etiqueta={etiqueta} onEditar={() => setVista('form')}/></div>
                  {loading
                    ? <div className="flex justify-center py-20"><RefreshCw size={20} className="text-orange-400 animate-spin"/></div>
                    : <ResultadoPanel resultado={resultado} etiqueta={etiqueta}/>}
                </div>
              )}

              {vista === 'config' && (
                <ConfigPanel
                  umbrales={umbrales}
                  setUmbrales={setUmbrales}
                  etiqueta={etiqueta}
                  onReanalizar={reanalizar}
                />
              )}
            </div>
          )
        )}
      </main>

      <style jsx global>{`
        @media print {
          header { display: none !important; }
          body { background: white !important; color: black !important; }
          #resultado-panel { font-size: 11px; }
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1F2937; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #374151; }
      `}</style>
    </div>
  );
}
