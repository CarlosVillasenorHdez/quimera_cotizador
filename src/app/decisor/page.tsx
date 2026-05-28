'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  FileUp, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Settings, Printer, BookOpen, RefreshCw, Lock,
  Ruler, Package, Palette, Sparkles, ArrowRight, Info, Layers
} from 'lucide-react';
import { DatosEtiqueta, MATERIALES, MAQUINAS_ANALOG,
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

// ── ATOMS ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-700 flex items-center justify-center shadow-lg shadow-orange-900/40">
          <span className="text-white font-black text-base">C</span>
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-teal-400 border-2 border-slate-950" />
      </div>
      <div className="leading-none">
        <div className="text-base font-black tracking-tight text-slate-100">CERBERO</div>
        <div className="text-[10px] font-bold tracking-[0.2em] text-orange-400 uppercase">Pensador</div>
      </div>
    </div>
  );
}

function Chip({ color = 'gray', children, size = 'sm' }: {
  color?: 'green'|'red'|'amber'|'blue'|'teal'|'gray'|'purple'|'orange';
  children: React.ReactNode; size?: 'xs'|'sm';
}) {
  const map: Record<string, string> = {
    green:  'bg-green-950/60  text-green-300  border-green-800/50',
    red:    'bg-red-950/60    text-red-300    border-red-800/50',
    amber:  'bg-amber-950/60  text-amber-300  border-amber-800/50',
    blue:   'bg-blue-950/60   text-blue-300   border-blue-800/50',
    teal:   'bg-teal-950/60   text-teal-300   border-teal-800/50',
    gray:   'bg-slate-800/80  text-slate-400  border-slate-700/50',
    purple: 'bg-purple-950/60 text-purple-300 border-purple-800/50',
    orange: 'bg-orange-950/60 text-orange-300 border-orange-800/50',
  };
  const p = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';
  return <span className={`inline-flex items-center rounded-full border font-medium ${p} ${map[color]}`}>{children}</span>;
}

function Sec({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={12} className="text-slate-500" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>
      {children}
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

// ── RFQ REFERENCE PANEL ────────────────────────────────────────────────────────

function RFQPanel({ etiqueta, onEditar }: { etiqueta: DatosEtiqueta; onEditar: () => void }) {
  const chips = [
    etiqueta.tintas_proceso > 0 ? { label: `${etiqueta.tintas_proceso} tintas`, color: 'gray' as const } : null,
    etiqueta.tiene_blanco    ? { label: 'Blanco',       color: 'gray'   as const } : null,
    etiqueta.tiene_plata     ? { label: 'Plata',        color: 'gray'   as const } : null,
    etiqueta.tiene_hot_stamping ? { label: 'Hot Stamp', color: 'amber'  as const } : null,
    etiqueta.tiene_cold_foil    ? { label: 'Cold Foil', color: 'amber'  as const } : null,
    etiqueta.tiene_embossing    ? { label: 'Embossing', color: 'amber'  as const } : null,
    etiqueta.tiene_screen       ? { label: 'Screen',    color: 'purple' as const } : null,
    etiqueta.tiene_cupon        ? { label: 'Cupón',     color: 'purple' as const } : null,
  ].filter(Boolean) as { label: string; color: 'gray'|'amber'|'purple' }[];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">RFQ · Referencia</span>
        <button type="button" onClick={onEditar} className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors font-semibold">Editar →</button>
      </div>
      <div className="p-4 space-y-4">
        {(etiqueta.cliente || etiqueta.nombre) && (
          <div>
            {etiqueta.cliente && <div className="text-xs text-slate-500">{etiqueta.cliente}</div>}
            {etiqueta.nombre  && <div className="text-sm font-semibold text-slate-200 truncate">{etiqueta.nombre}</div>}
          </div>
        )}
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-slate-100 tabular-nums">
            {etiqueta.eje_mm} <span className="text-slate-500 text-lg font-normal">×</span> {etiqueta.des_mm}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">mm · eje × desarrollo</div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Package size={11} className="text-slate-500 shrink-0" />
          {etiqueta.material_nombre}
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map(c => <Chip key={c.label} color={c.color} size="xs">{c.label}</Chip>)}
          </div>
        )}
        {etiqueta.cantidades.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Escalas</div>
            <div className="flex flex-wrap gap-1.5">
              {etiqueta.cantidades.map(q => (
                <div key={q} className="bg-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-teal-300">
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

// ── CAVITY DIAGRAM ─────────────────────────────────────────────────────────────

function Diagrama({ eje_mm, des_mm, cav_eje, cav_des, gap_eje_mm, gap_des_mm, ancho_mm, tipo, nombre }: {
  eje_mm: number; des_mm: number; cav_eje: number; cav_des: number;
  gap_eje_mm: number; gap_des_mm: number; ancho_mm: number;
  tipo: 'digital'|'analog'; nombre: string;
}) {
  const W = 560, H = 300, PAD = 40;
  const pw_r = tipo === 'digital' ? ancho_mm : (eje_mm * cav_eje + gap_eje_mm * (cav_eje + 1));
  const ph_r = (des_mm + gap_des_mm) * cav_des + gap_des_mm;
  const sc   = Math.min((W - PAD*2) / pw_r, (H - PAD*2) / ph_r);
  const pw = pw_r*sc, ph = ph_r*sc;
  const ox = (W-pw)/2, oy = (H-ph)/2;
  const ew = eje_mm*sc, eh = des_mm*sc, ge = gap_eje_mm*sc, gd = gap_des_mm*sc;
  const col = tipo === 'digital' ? '#3B82F6' : '#14B8A6';
  const rects: {x:number;y:number}[] = [];
  for (let r=0;r<cav_des;r++) for (let c=0;c<cav_eje;c++) rects.push({x:ox+ge+c*(ew+ge),y:oy+gd+r*(eh+gd)});

  return (
    <div>
      <div className="flex justify-between items-center mb-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-400">{nombre}</span>
        <span className="font-mono">
          {cav_eje}×{cav_des} = <strong className="text-slate-200">{cav_eje*cav_des}</strong> etiq/frame
          {' · '}papel {pw_r.toFixed(0)}×{ph_r.toFixed(0)} mm
          {' · '}gap eje <strong className="text-amber-300">{gap_eje_mm}mm</strong>
          {' · '}gap des <strong className="text-amber-300">{gap_des_mm.toFixed(2)}mm</strong>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-slate-700/40 bg-slate-900/80">
        <rect x={ox} y={oy} width={pw} height={ph} fill={tipo==='digital'?'#1a2540':'#0f2027'} stroke="#334155" strokeWidth={1} rx={3}/>
        <line x1={ox} y1={oy-16} x2={ox+pw} y2={oy-16} stroke="#475569" strokeWidth={0.8}/>
        <line x1={ox} y1={oy-20} x2={ox} y2={oy-12} stroke="#475569" strokeWidth={0.8}/>
        <line x1={ox+pw} y1={oy-20} x2={ox+pw} y2={oy-12} stroke="#475569" strokeWidth={0.8}/>
        <text x={(ox+ox+pw)/2} y={oy-19} fill="#64748b" fontSize={8} textAnchor="middle">
          {pw_r.toFixed(0)} mm {tipo==='digital'?'(planilla)':'(bobina exacta)'}
        </text>
        {rects.map(({x,y},i) => (
          <g key={i}>
            <rect x={x} y={y} width={ew} height={eh} fill={col+'1a'} stroke={col} strokeWidth={1.2} rx={2}/>
            {i===0 && ew>22 && eh>14 && (
              <text x={x+ew/2} y={y+eh/2} fill={col} fontSize={Math.min(9,ew/5,eh/3)}
                textAnchor="middle" dominantBaseline="middle" fontWeight="600" opacity={0.9}>
                {eje_mm}×{des_mm}
              </text>
            )}
          </g>
        ))}
        {cav_eje>1 && rects.length>=2 && ge>5 && (
          <g>
            <line x1={rects[0].x+ew} y1={rects[0].y+eh/2} x2={rects[1].x} y2={rects[1].y+eh/2} stroke="#F59E0B" strokeWidth={1} strokeDasharray="2,1.5" opacity={0.8}/>
            <text x={(rects[0].x+ew+rects[1].x)/2} y={rects[0].y+eh/2-5} fill="#F59E0B" fontSize={7} textAnchor="middle" opacity={0.9}>{gap_eje_mm}mm</text>
          </g>
        )}
        {cav_des>1 && rects.length>cav_eje && gd>5 && (
          <g>
            <line x1={rects[0].x+ew/2} y1={rects[0].y+eh} x2={rects[cav_eje].x+ew/2} y2={rects[cav_eje].y} stroke="#F59E0B" strokeWidth={1} strokeDasharray="2,1.5" opacity={0.8}/>
            <text x={rects[0].x+ew/2+5} y={(rects[0].y+eh+rects[cav_eje].y)/2} fill="#F59E0B" fontSize={7} dominantBaseline="middle" opacity={0.9}>{gap_des_mm.toFixed(2)}mm</text>
          </g>
        )}
        <rect x={W-84} y={H-22} width={76} height={16} rx={4} fill={col+'25'} stroke={col+'50'}/>
        <text x={W-46} y={H-11} fill={col} fontSize={8.5} textAnchor="middle" fontWeight="700">{cav_eje*cav_des} etiq/frame</text>
      </svg>
    </div>
  );
}

// ── METROS EXPLANATION ─────────────────────────────────────────────────────────

function ExplMetros({ exp, label }: { exp: NonNullable<ResultadoAnalisis['explicacion_metros']>; label: string }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
      <div className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
        <Info size={14} className="text-teal-400"/>
        ¿Por qué el cambio ocurre en {exp.millares_resultado.toLocaleString()}k piezas?
      </div>
      <div className="space-y-2 text-xs text-slate-400">
        {([
          <>En <strong className="text-slate-200">{exp.maquina_ref}</strong> caben <strong className="text-orange-300">{exp.cav_eje} × {exp.cav_des} = {exp.cav_total} etiquetas por frame</strong>.</>,
          <>Para {exp.millares_resultado.toLocaleString()}k pzas se necesitan <strong className="text-orange-300">≈ {exp.frames_aprox.toLocaleString()} frames</strong>.</>,
          <>Cada frame consume <strong className="text-orange-300">{exp.metros_por_frame.toFixed(4)} m</strong> de papel.</>,
          <>{exp.frames_aprox.toLocaleString()} × {exp.metros_por_frame.toFixed(4)} = <strong className="text-teal-300">{exp.umbral_metros.toLocaleString()} m</strong> = umbral de {label} (ajustable en Parámetros).</>,
        ] as React.ReactNode[]).map((txt,i) => (
          <div key={i} className="flex gap-2.5">
            <span className="shrink-0 w-4 h-4 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center text-[9px] font-bold mt-0.5">{i+1}</span>
            <span className="leading-relaxed">{txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MACHINE CARD ───────────────────────────────────────────────────────────────

function MachCard({ r }: { r: ResultadoMaquina }) {
  if (!r.viable) return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3.5 opacity-60">
      <div className="flex items-center gap-2 mb-2">
        <XCircle size={13} className="text-red-400 shrink-0"/>
        <span className="text-sm font-semibold text-slate-400">{r.nombre}</span>
        <Chip color="gray" size="xs">{r.tipo}</Chip>
      </div>
      <div className="space-y-1">
        {r.razones_no_viable.map(x=>(
          <div key={x.codigo} className="flex items-start gap-1.5 text-xs text-red-400/80">
            <span className="shrink-0">✗</span><span>{x.descripcion}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const isFlexo = r.advertencias.some(a=>a.codigo==='OFFSET_A_FLEXO');
  const rangeLabel = r.rango_hasta_k
    ? `${r.rango_desde_k!>0?r.rango_desde_k!.toLocaleString()+'k':'0'} → ${r.rango_hasta_k.toLocaleString()}k pzas`
    : r.rango_desde_k!>0 ? `A partir de ${r.rango_desde_k!.toLocaleString()}k pzas` : 'Todos los volúmenes';
  const accent = r.tipo==='digital'?'border-blue-800/40 bg-blue-950/10':'border-teal-800/40 bg-teal-950/10';
  const rColor = r.tipo==='digital'?'text-blue-200':'text-teal-200';

  return (
    <div className={`rounded-xl border p-4 ${accent}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckCircle size={13} className="text-green-400 shrink-0"/>
          <span className="text-sm font-bold text-slate-100">{r.nombre}</span>
          {isFlexo && <Chip color="amber" size="xs">flexo alt.</Chip>}
        </div>
        <Chip color={r.tipo==='digital'?'blue':'teal'} size="xs">{r.tipo}</Chip>
      </div>
      <div className={`text-lg font-black mb-3 ${rColor}`}>{rangeLabel}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs mb-2">
        {r.cav_eje!=null&&<><span className="text-slate-500">Cav. eje×des</span><span className="text-slate-300 font-mono text-right">{r.cav_eje}×{r.cav_des}</span></>}
        {r.metros_1k!=null&&<><span className="text-slate-500">Metros/millar</span><span className="text-slate-300 font-mono text-right">{r.metros_1k} m</span></>}
        {r.cilindro_dientes!=null&&<><span className="text-slate-500">Cilindro</span><span className="text-slate-300 font-mono text-right">d{r.cilindro_dientes} · {r.gap_des_mm?.toFixed(2)}mm</span></>}
      </div>
      {r.advertencias.length>0&&(
        <div className="space-y-1 pt-2 border-t border-slate-700/30">
          {r.advertencias.map(w=>(
            <div key={w.codigo} className="flex items-start gap-1.5 text-xs text-amber-400/90">
              <AlertTriangle size={10} className="shrink-0 mt-0.5"/><span>{w.descripcion}</span>
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
  const noViable  = resultado.no_viable
  const bestDig = resultado.viable_digital[0];
  const bestAna = resultado.viable_analog[0];

  return (
    <div className="space-y-5" id="resultado-panel">

      {/* Recomendación */}
      <div className="rounded-2xl border-l-4 border-orange-500 bg-slate-900/70 p-5">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Recomendación del Pensador</div>
        <p className="text-lg font-bold text-orange-300 leading-snug">{resultado.recomendacion_principal}</p>
        <p className="text-xs text-slate-500 mt-1.5">{resultado.resumen}</p>
      </div>

      {/* Cruces */}
      {(resultado.cruce_6mil_v12||resultado.cruce_digital_analog)&&(
        <div className="grid grid-cols-2 gap-3">
          {resultado.cruce_6mil_v12&&(
            <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">6K → V12</div>
              <div className="text-2xl font-black text-blue-100 tabular-nums">
                {resultado.cruce_6mil_v12.toLocaleString()}<span className="text-sm font-normal text-blue-400 ml-1">k pzas</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">≈ {UMBRALES.metros_6mil_to_v12.toLocaleString()} m lineales</div>
            </div>
          )}
          {resultado.cruce_digital_analog&&(
            <div className="rounded-xl border border-teal-900/50 bg-teal-950/20 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-1">Digital → Analógica</div>
              <div className="text-2xl font-black text-teal-100 tabular-nums">
                {resultado.cruce_digital_analog.toLocaleString()}<span className="text-sm font-normal text-teal-400 ml-1">k pzas</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">≈ {UMBRALES.metros_digital_to_analog.toLocaleString()} m lineales</div>
            </div>
          )}
        </div>
      )}

      {resultado.explicacion_metros&&<ExplMetros exp={resultado.explicacion_metros} label="cambio a analógica"/>}

      {/* Máquinas */}
      {allViable.length>0&&(
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={13} className="text-green-400"/>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Máquinas recomendadas</span>
            <Chip color="green" size="xs">{allViable.length}</Chip>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {allViable.map(r=><MachCard key={r.id} r={r}/>)}
          </div>
        </div>
      )}

      {/* Diagramas */}
      {(bestDig?.cav_eje||bestAna?.cav_eje)&&(
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Ruler size={13} className="text-slate-500"/>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Distribución en papel</span>
          </div>
          {/* Full-width diagram row — each takes half on md+, full on mobile */}
          <div className={`grid gap-4 ${(bestDig?.cav_eje && bestAna?.cav_eje) ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {bestDig?.cav_eje&&(
              <Diagrama eje_mm={etiqueta.eje_mm} des_mm={etiqueta.des_mm}
                cav_eje={bestDig.cav_eje!} cav_des={bestDig.cav_des!}
                gap_eje_mm={3} gap_des_mm={3}
                ancho_mm={bestDig.id==='20MIL'?714:bestDig.id==='V12'?313:317}
                tipo="digital" nombre={bestDig.nombre}/>
            )}
            {bestAna?.cav_eje&&(
              <Diagrama eje_mm={etiqueta.eje_mm} des_mm={etiqueta.des_mm}
                cav_eje={bestAna.cav_eje!} cav_des={bestAna.cav_des!}
                gap_eje_mm={3} gap_des_mm={bestAna.gap_des_mm??3}
                ancho_mm={etiqueta.eje_mm*bestAna.cav_eje!+3*(bestAna.cav_eje!+1)}
                tipo="analog" nombre={bestAna.nombre}/>
            )}
          </div>
        </div>
      )}

      {noViable.length>0&&(
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer list-none text-xs text-slate-500 hover:text-slate-400 py-2">
            <AlertTriangle size={12} className="text-amber-500"/>
            <span>Restricciones técnicas relevantes ({noViable.length})</span>
            <ChevronRight size={12} className="ml-auto group-open:rotate-90 transition-transform"/>
          </summary>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
            {noViable.map(r=><MachCard key={r.id} r={r}/>)}
          </div>
        </details>
      )}
    </div>
  );
}

// ── FORMULARIO ─────────────────────────────────────────────────────────────────

function Formulario({ initial, onAnalizar }: { initial: DatosEtiqueta; onAnalizar: (e:DatosEtiqueta)=>void }) {
  const [v, setV] = useState<DatosEtiqueta>({...initial});
  useEffect(()=>{setV({...initial});},[initial]);
  const s = <K extends keyof DatosEtiqueta>(k:K, val:DatosEtiqueta[K]) => setV(x=>({...x,[k]:val}));
  const ni = (label:string, key:keyof DatosEtiqueta, step=1) => (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      <input type="number" step={step} value={v[key] as number}
        onChange={e=>s(key, parseFloat(e.target.value)||0 as DatosEtiqueta[typeof key])}
        className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/60"/>
    </label>
  );
  const tr = (label:string, key:keyof DatosEtiqueta) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-300">{label}</span>
      <Tog on={v[key] as boolean} onToggle={()=>s(key, !v[key] as DatosEtiqueta[typeof key])}/>
    </div>
  );

  return (
    <div className="space-y-6">
      <Sec label="Dimensiones" icon={Ruler}>
        <div className="grid grid-cols-2 gap-3">
          {ni('Eje (mm)','eje_mm')} {ni('Desarrollo (mm)','des_mm')}
        </div>
      </Sec>
      <Sec label="Material" icon={Package}>
        <select value={v.material_id} onChange={e=>{const m=MATERIALES.find(x=>x.id===e.target.value);setV(x=>({...x,material_id:e.target.value,material_nombre:m?.nombre??e.target.value}));}}
          className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/60">
          {(['BOPP','PE','PAPEL','ESPECIAL','VINO'] as const).map(cat => {
            const items = MATERIALES.filter(m => m.categoria === cat);
            if (!items.length) return null;
            return (
              <optgroup key={cat} label={`── ${cat} ──`}>
                {items.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </optgroup>
            );
          })}
        </select>
      </Sec>
      <Sec label="Tintas digitales" icon={Palette}>
        <div className="space-y-3">
          {ni('Tintas de proceso (CMYK + especiales)','tintas_proceso')}
          <div className="divide-y divide-slate-800">
            {tr('Tinta blanca','tiene_blanco')}
            {tr('Tinta plata / metálica','tiene_plata')}
            {tr('Tinta invisible (UV)','tiene_invisible')}
            {tr('Barniz UV','tiene_barniz_uv')}
          </div>
        </div>
      </Sec>
      <Sec label="Tintas analógicas" icon={Layers}>
        <div className="space-y-2 text-xs text-slate-500 mb-2">Si el trabajo lleva offset/flexo/screen, ingrésalos aquí.</div>
        <div className="grid grid-cols-3 gap-2">
          {ni('Offset','tintas_offset')}
          {ni('Flexo','tintas_flexo')}
          {ni('Screen','tintas_screen')}
        </div>
      </Sec>
      <Sec label="Acabados especiales" icon={Sparkles}>
        <div className="divide-y divide-slate-800">
          {tr('Hot Stamping','tiene_hot_stamping')}
          {tr('Cold Foil','tiene_cold_foil')}
          {tr('Embossing','tiene_embossing')}
          {tr('Serigrafía (screen)','tiene_screen')}
          {tr('Cupón','tiene_cupon')}
        </div>
      </Sec>
      <Sec label="Escalas del RFQ" icon={ArrowRight}>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500">Cantidades separadas por coma (en piezas)</span>
          <input type="text" defaultValue={v.cantidades.map(q=>q.toLocaleString()).join(', ')}
            onBlur={e=>{const qs=e.target.value.split(',').map(x=>parseInt(x.replace(/\D/g,''))||0).filter(q=>q>0);s('cantidades',qs);}}
            className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/60"/>
        </label>
      </Sec>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500">Descripción / SKU</span>
          <input type="text" value={v.nombre} onChange={e=>s('nombre',e.target.value)} placeholder="Opcional"
            className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/60"/>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500">Cliente</span>
          <input type="text" value={v.cliente} onChange={e=>s('cliente',e.target.value)} placeholder="Opcional"
            className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/60"/>
        </label>
      </div>
      <button type="button" onClick={()=>onAnalizar({...v,modo:'ingenieria'})}
        className="w-full bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30">
        <BookOpen size={16}/>Analizar con el Pensador →
      </button>
    </div>
  );
}

// ── CONFIG ─────────────────────────────────────────────────────────────────────

function ConfigPanel({ umbrales, setUmbrales }: { umbrales: typeof UMBRALES; setUmbrales: (u:typeof UMBRALES)=>void }) {
  const sl = (key: keyof typeof UMBRALES, label: string, min: number, max: number, step: number) => (
    <div className="mb-5">
      <div className="flex justify-between mb-2">
        <label className="text-sm text-slate-300">{label}</label>
        <span className="text-sm font-mono font-bold text-orange-300">{umbrales[key].toLocaleString()} m</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={umbrales[key]}
        onChange={e=>setUmbrales({...umbrales,[key]:parseInt(e.target.value)})} className="w-full accent-orange-500"/>
      <div className="flex justify-between text-xs text-slate-600 mt-1"><span>{min.toLocaleString()} m</span><span>{max.toLocaleString()} m</span></div>
    </div>
  );
  const [cilOpen, setCilOpen] = useState(false);
  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-800/30 rounded-xl">
        <Lock size={12} className="text-amber-400 shrink-0"/>
        <p className="text-xs text-amber-300/90">Parámetros de ingeniería — solo personal autorizado.</p>
      </div>
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Umbrales de cambio de tecnología</div>
        {sl('metros_6mil_to_v12','6K → V12',300,3000,50)}
        {sl('metros_digital_to_analog','Digital → Analógica',1000,12000,200)}
      </div>
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <button type="button" onClick={()=>setCilOpen(!cilOpen)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-800/40">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Inventario de cilindros</span>
          {cilOpen?<ChevronDown size={13} className="text-slate-500"/>:<ChevronRight size={13} className="text-slate-500"/>}
        </button>
        {cilOpen&&(
          <div className="px-5 pb-5 space-y-4">
            {Object.entries(CILINDROS).map(([mid,inv])=>{
              const m=MAQUINAS_ANALOG.find(x=>x.id===mid);
              return (
                <div key={mid}>
                  <div className="text-xs font-semibold text-slate-300 mb-2">{m?.nombre??mid}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(inv).map(([d,qty])=>(
                      <div key={d} className="bg-slate-800 rounded-lg px-2 py-1 text-center border border-slate-700/40">
                        <div className="text-xs font-mono font-bold text-slate-200">d{d}</div>
                        <div className="text-[9px] text-slate-500">{(Number(d)*PASO_DIENTE_MM).toFixed(1)}mm</div>
                        <div className="text-[9px] text-slate-600">×{qty}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
      <h2 className="text-2xl font-black text-slate-100 mb-2">CERBERO Pensador</h2>
      <p className="text-slate-400 max-w-sm leading-relaxed mb-8">
        Herramienta exclusiva del departamento de ingeniería. Para cotizaciones, use{' '}
        <strong className="text-slate-300">Quick Quote</strong> o contacte a ingeniería.
      </p>
      <div className="flex gap-3">
        <a href="#" className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors">Abrir Quick Quote</a>
        <a href="mailto:ingenieria@quimera.mx" className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-orange-900/30">Contactar Ingeniería</a>
      </div>
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────────

export default function PensadorPage() {
  const [etiqueta, setEtiqueta] = useState<DatosEtiqueta>(DEFAULT_ETIQUETA);
  const [resultado, setResultado] = useState<ResultadoAnalisis|null>(null);
  const [modo, setModo]     = useState<'ingenieria'|'vendedor'>('ingenieria');
  const [vista, setVista]   = useState<'form'|'resultado'|'config'>('form');
  const [drag, setDrag]     = useState(false);
  const [error, setError]   = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [umbrales, setUmbrales] = useState({...UMBRALES});
  const [isWide, setIsWide] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    const mq=window.matchMedia('(min-width:1280px)');
    setIsWide(mq.matches);
    const h=(e:MediaQueryListEvent)=>setIsWide(e.matches);
    mq.addEventListener('change',h);
    return ()=>mq.removeEventListener('change',h);
  },[]);

  const analizar = useCallback((datos: DatosEtiqueta) => {
    setLoading(true);
    setTimeout(()=>{
      const r = analizarEtiqueta(datos,umbrales);
      setEtiqueta(datos); setResultado(r); setError(null); setVista('resultado'); setLoading(false);
    },150);
  },[umbrales]);

  const cargarRFQ = useCallback((file:File|null|undefined)=>{
    if(!file) return;
    const rd=new FileReader();
    rd.onload=e=>{
      try {
        const p=parseRFQHtml(e.target?.result as string);
        if(!p?.eje_mm||!p?.des_mm) throw new Error('No se encontraron dimensiones en el archivo.');
        analizar({...DEFAULT_ETIQUETA,...p});
        setError(null);
      } catch(ex){setError((ex as Error).message);}
    };
    rd.readAsText(file);
  },[analizar]);

  const wideWithResult = isWide && !!resultado && vista==='resultado';

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-slate-100 print:bg-white">

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-800/70 backdrop-blur-md bg-[rgba(11,15,26,0.92)] print:hidden">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Logo/>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex bg-slate-800/80 rounded-lg p-0.5 gap-0.5">
              {(['ingenieria','vendedor'] as const).map(m=>(
                <button key={m} type="button" onClick={()=>setModo(m)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    modo===m?'bg-slate-600/80 text-white':'text-slate-500 hover:text-slate-300'}`}>
                  {m==='ingenieria'?'Ingeniería':'Vendedor'}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-800/80 rounded-lg p-0.5 gap-0.5">
              {([
                {id:'form'     as const, label:'Entrada',     icon:FileUp,   dis:false},
                {id:'resultado'as const, label:'Análisis',    icon:BookOpen, dis:!resultado},
                {id:'config'   as const, label:'Parámetros',  icon:Settings, dis:false},
              ]).map(t=>(
                <button key={t.id} type="button" disabled={t.dis}
                  onClick={()=>!t.dis&&setVista(t.id as typeof vista)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    t.dis?'opacity-25 cursor-not-allowed text-slate-600':
                    vista===t.id?'bg-orange-600 text-white':'text-slate-500 hover:text-slate-300'}`}>
                  <t.icon size={12}/>{t.label}
                </button>
              ))}
            </div>
            {resultado&&(
              <button type="button" onClick={()=>window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors">
                <Printer size={12}/>PDF
              </button>
            )}
          </div>
        </div>
      </header>

      {/* BODY */}
      <main className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-6">
        {modo==='vendedor' ? <Vendedor/> : (

          wideWithResult ? (
            /* ─ WIDE 3-COLUMN LAYOUT ─ */
            <div className="grid gap-6 items-start" style={{gridTemplateColumns:'340px 1fr 360px'}}>

              {/* Left: form */}
              <aside className="sticky top-20">
                <div className="rounded-2xl border border-slate-800 bg-[#161D2E] overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Datos de la etiqueta</span>
                  </div>
                  <div className="p-4 overflow-y-auto" style={{maxHeight:'calc(100vh - 120px)'}}>
                    <Formulario initial={etiqueta} onAnalizar={analizar}/>
                  </div>
                </div>
              </aside>

              {/* Center: result */}
              <div>
                {loading
                  ? <div className="flex justify-center py-32"><RefreshCw size={22} className="text-orange-400 animate-spin"/></div>
                  : <ResultadoPanel resultado={resultado!} etiqueta={etiqueta}/>}
              </div>

              {/* Right: RFQ reference */}
              <aside className="sticky top-20">
                <RFQPanel etiqueta={etiqueta} onEditar={()=>setVista('form')}/>
              </aside>
            </div>

          ) : (
            /* ─ NORMAL LAYOUT ─ */
            <div className="max-w-2xl mx-auto">
              {vista==='form'&&(
                <div className="space-y-5">
                  <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
                    onDrop={e=>{e.preventDefault();setDrag(false);cargarRFQ(e.dataTransfer.files[0]);}}
                    onClick={()=>fileRef.current?.click()}
                    className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
                      drag?'border-orange-500 bg-orange-950/20':'border-slate-700 hover:border-slate-600 bg-slate-900/30'}`}>
                    <FileUp size={36} className={`mx-auto mb-3 ${drag?'text-orange-400':'text-slate-600'}`}/>
                    <p className="text-base font-bold text-slate-300 mb-1">Arrastra el RFQ de CERM aquí</p>
                    <p className="text-xs text-slate-600">formato .html · dimensiones y cantidades se extraen automáticamente</p>
                    <input ref={fileRef} type="file" accept=".html" className="hidden" onChange={e=>cargarRFQ(e.target.files?.[0])}/>
                  </div>
                  {error&&(
                    <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-sm text-red-400">
                      <AlertTriangle size={14} className="shrink-0"/>{error}
                    </div>
                  )}
                  <div className="rounded-2xl border border-slate-800 bg-[#161D2E] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">O ingresa los datos manualmente</span>
                    </div>
                    <div className="p-5"><Formulario initial={etiqueta} onAnalizar={analizar}/></div>
                  </div>
                </div>
              )}
              {vista==='resultado'&&resultado&&(
                <div>
                  <div className="mb-5"><RFQPanel etiqueta={etiqueta} onEditar={()=>setVista('form')}/></div>
                  {loading
                    ? <div className="flex justify-center py-20"><RefreshCw size={20} className="text-orange-400 animate-spin"/></div>
                    : <ResultadoPanel resultado={resultado} etiqueta={etiqueta}/>}
                </div>
              )}
              {vista==='config'&&<ConfigPanel umbrales={umbrales} setUmbrales={setUmbrales}/>}
            </div>
          )
        )}
      </main>

      <style jsx global>{`
        @media print { header { display:none!important; } body { background:white!important; color:black!important; } }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#334155; border-radius:3px; }
      `}</style>
    </div>
  );
}
