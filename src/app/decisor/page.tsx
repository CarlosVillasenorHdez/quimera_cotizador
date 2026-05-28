'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  FileUp, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Settings, Download, Info, Printer, Layers, Cpu, ArrowRight,
  BookOpen, RefreshCw, Lock
} from 'lucide-react';
import { DatosEtiqueta, MATERIALES, MAQUINAS_DIGITAL, MAQUINAS_ANALOG,
         UMBRALES, CILINDROS, seleccionarCilindro, PASO_DIENTE_MM } from '../../engine/knowledge';
import { analizarEtiqueta, ResultadoAnalisis, ResultadoMaquina } from '../../engine/decisor';
import { parseRFQHtml } from '../../engine/parser';

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────

const DEFAULT_ETIQUETA: DatosEtiqueta = {
  eje_mm: 50, des_mm: 50,
  material_id: 'bopp_blanco', material_nombre: 'BOPP Blanco',
  tintas_proceso: 4,
  tiene_blanco: false, tiene_plata: false, tiene_invisible: false, tiene_barniz_uv: false,
  tiene_hot_stamping: false, tiene_cold_foil: false, tiene_embossing: false,
  tiene_screen: false, tiene_cupon: false,
  cantidades: [1000, 5000, 10000, 50000],
  nombre: '', cliente: '',
  modo: 'ingenieria',
};

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-sm">Q</span>
      </div>
      <div>
        <span className="font-bold text-slate-100 text-sm">Quimera</span>
        <span className="text-orange-400 font-bold text-sm ml-1">Decisor</span>
      </div>
    </div>
  );
}

function Tag({ color, children, size = 'sm' }: {
  color: 'green' | 'red' | 'amber' | 'blue' | 'teal' | 'gray' | 'purple';
  children: React.ReactNode;
  size?: 'xs' | 'sm';
}) {
  const colors = {
    green:  'bg-green-900/40 text-green-300 border-green-700/50',
    red:    'bg-red-900/40   text-red-300   border-red-700/50',
    amber:  'bg-amber-900/40 text-amber-300 border-amber-700/50',
    blue:   'bg-blue-900/40  text-blue-300  border-blue-700/50',
    teal:   'bg-teal-900/40  text-teal-300  border-teal-700/50',
    gray:   'bg-slate-800    text-slate-400 border-slate-700',
    purple: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  }[color];
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${colors} ${pad}`}>
      {children}
    </span>
  );
}

function Collapsible({ title, icon: Icon, defaultOpen = true, badge, children }: {
  title: string; icon: React.ElementType; defaultOpen?: boolean;
  badge?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700/60 rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-800/60 hover:bg-slate-800 transition-colors">
        <div className="flex items-center gap-2.5">
          <Icon size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-200">{title}</span>
          {badge}
        </div>
        {open ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
      </button>
      {open && <div className="p-5 bg-slate-900/50">{children}</div>}
    </div>
  );
}

// ─── MACHINE RESULT CARD ──────────────────────────────────────────────────────

function MachineCard({ r }: { r: ResultadoMaquina }) {
  const [showRejections, setShowRejections] = useState(false);

  if (!r.viable) {
    return (
      <div className="border border-slate-700/30 rounded-xl p-4 bg-slate-800/20 opacity-70">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-sm font-semibold text-slate-400">{r.nombre}</span>
          </div>
          <Tag color={r.tipo === 'digital' ? 'blue' : 'teal'} size="xs">{r.tipo}</Tag>
        </div>
        <div className="space-y-1.5 mt-2">
          {r.rechazos.filter(x => x.critico).map(x => (
            <div key={x.codigo} className="flex items-start gap-2 text-xs text-red-400">
              <span className="shrink-0 mt-0.5">✗</span>
              <span>{x.descripcion}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const rangeLabel = r.rango_hasta_k
    ? `${r.rango_desde_k! > 0 ? r.rango_desde_k!.toLocaleString() + 'k' : '0'} – ${r.rango_hasta_k.toLocaleString()}k pzas`
    : r.rango_desde_k! > 0
    ? `A partir de ${r.rango_desde_k!.toLocaleString()}k pzas`
    : 'Todos los volúmenes';

  const borderColor = r.tipo === 'digital' ? 'border-blue-700/40' : 'border-teal-700/40';

  return (
    <div className={`border ${borderColor} rounded-xl p-4 bg-slate-800/50`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={15} className="text-green-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-200">{r.nombre}</span>
        </div>
        <Tag color={r.tipo === 'digital' ? 'blue' : 'teal'} size="xs">{r.tipo}</Tag>
      </div>

      {/* Range */}
      <div className="mb-3">
        <div className="text-xs text-slate-500 mb-0.5">Rango recomendado</div>
        <div className={`text-base font-bold ${r.tipo === 'digital' ? 'text-blue-300' : 'text-teal-300'}`}>
          {rangeLabel}
        </div>
      </div>

      {/* Technical data */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
        {r.cav_eje != null && (
          <>
            <span className="text-slate-500">Cavidades eje</span>
            <span className="text-slate-300 font-mono text-right">{r.cav_eje}</span>
            <span className="text-slate-500">Cavidades desarrollo</span>
            <span className="text-slate-300 font-mono text-right">{r.cav_des}</span>
          </>
        )}
        {r.metros_1k != null && (
          <>
            <span className="text-slate-500">Metros / millar</span>
            <span className="text-slate-300 font-mono text-right">{r.metros_1k} m</span>
          </>
        )}
        {r.cilindro_dientes != null && (
          <>
            <span className="text-slate-500">Cilindro</span>
            <span className="text-slate-300 font-mono text-right">d{r.cilindro_dientes} · gap {r.cilindro_gap_mm?.toFixed(2)}mm</span>
          </>
        )}
      </div>

      {/* Warnings */}
      {r.advertencias.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-slate-700/40">
          {r.advertencias.map(w => (
            <div key={w.codigo} className="flex items-start gap-1.5 text-xs text-amber-400">
              <AlertTriangle size={11} className="shrink-0 mt-0.5" />
              <span>{w.descripcion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DIAGRAMA DE CAVIDADES (SVG) ─────────────────────────────────────────────

function DiagramaCavidades({
  eje_mm, des_mm, cav_eje, cav_des, gap_eje_mm, gap_des_mm,
  ancho_papel_mm, tipo, nombre,
}: {
  eje_mm: number; des_mm: number; cav_eje: number; cav_des: number;
  gap_eje_mm: number; gap_des_mm: number;
  ancho_papel_mm: number;   // ancho total del rollo
  tipo: 'digital' | 'analog';
  nombre: string;
}) {
  // SVG canvas dimensions
  const W = 480, H = 260;
  const PAD = 28;

  // Scale: fit the paper width into the SVG
  const papel_w_real = tipo === 'digital' ? ancho_papel_mm : (eje_mm * cav_eje + gap_eje_mm * (cav_eje + 1));
  const papel_h_real = (des_mm + gap_des_mm) * cav_des + gap_des_mm;

  const scaleX = (W - PAD * 2) / papel_w_real;
  const scaleY = (H - PAD * 2) / papel_h_real;
  const scale  = Math.min(scaleX, scaleY);

  const pw = papel_w_real * scale;
  const ph = papel_h_real * scale;
  const ox = (W - pw) / 2;
  const oy = (H - ph) / 2;

  const ew = eje_mm * scale;
  const eh = des_mm * scale;
  const ge = gap_eje_mm * scale;
  const gd = gap_des_mm * scale;

  const digitColor  = '#3B82F6';
  const analogColor = '#14B8A6';
  const color = tipo === 'digital' ? digitColor : analogColor;

  // Generate label rects
  const labels: { x: number; y: number }[] = [];
  for (let row = 0; row < cav_des; row++) {
    for (let col = 0; col < cav_eje; col++) {
      const x = ox + ge + col * (ew + ge);
      const y = oy + gd + row * (eh + gd);
      labels.push({ x, y });
    }
  }

  return (
    <div>
      <div className="text-xs text-slate-500 mb-2 flex items-center justify-between">
        <span>{nombre} · {cav_eje} × {cav_des} = {cav_eje * cav_des} cavidades / frame</span>
        <span className="font-mono">Papel: {ancho_papel_mm}mm × {papel_h_real.toFixed(1)}mm</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-slate-700/50 bg-slate-900/60">
        {/* Paper background */}
        <rect x={ox} y={oy} width={pw} height={ph}
          fill={tipo === 'digital' ? '#1e293b' : '#0f2027'} stroke="#475569" strokeWidth={1} rx={2} />

        {/* Dimension arrows — paper width */}
        <line x1={ox} y1={oy - 14} x2={ox + pw} y2={oy - 14} stroke="#64748b" strokeWidth={1} />
        <line x1={ox} y1={oy - 19} x2={ox} y2={oy - 9} stroke="#64748b" strokeWidth={1} />
        <line x1={ox + pw} y1={oy - 19} x2={ox + pw} y2={oy - 9} stroke="#64748b" strokeWidth={1} />
        <text x={(ox + ox + pw) / 2} y={oy - 18} fill="#94a3b8" fontSize={9} textAnchor="middle">
          {papel_w_real.toFixed(1)} mm {tipo === 'digital' ? '(planilla)' : '(bobina)'}
        </text>

        {/* Dimension arrows — paper height */}
        <line x1={ox + pw + 14} y1={oy} x2={ox + pw + 14} y2={oy + ph} stroke="#64748b" strokeWidth={1} />
        <line x1={ox + pw + 9} y1={oy} x2={ox + pw + 19} y2={oy} stroke="#64748b" strokeWidth={1} />
        <line x1={ox + pw + 9} y1={oy + ph} x2={ox + pw + 19} y2={oy + ph} stroke="#64748b" strokeWidth={1} />
        <text x={ox + pw + 22} y={(oy + oy + ph) / 2} fill="#94a3b8" fontSize={9}
          textAnchor="start" dominantBaseline="middle" transform={`rotate(90,${ox+pw+22},${(oy+oy+ph)/2})`}>
          {papel_h_real.toFixed(1)} mm
        </text>

        {/* Labels */}
        {labels.map(({ x, y }, i) => (
          <g key={i}>
            <rect x={x} y={y} width={ew} height={eh}
              fill={color + '26'} stroke={color} strokeWidth={1.2} rx={2} />
            {i === 0 && (
              <>
                {/* Eje dimension */}
                <line x1={x} y1={y + eh + 6} x2={x + ew} y2={y + eh + 6} stroke={color} strokeWidth={0.8} opacity={0.6} />
                <text x={x + ew / 2} y={y + eh + 15} fill={color} fontSize={8} textAnchor="middle" opacity={0.9}>
                  {eje_mm}mm
                </text>
                {/* Des dimension */}
                <line x1={x - 6} y1={y} x2={x - 6} y2={y + eh} stroke={color} strokeWidth={0.8} opacity={0.6} />
                <text x={x - 9} y={y + eh / 2} fill={color} fontSize={8}
                  textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(-90,${x-9},${y+eh/2})`} opacity={0.9}>
                  {des_mm}mm
                </text>
              </>
            )}
          </g>
        ))}

        {/* Gap indicators — first row, between first two labels if cav_eje > 1 */}
        {cav_eje > 1 && labels.length >= 2 && (
          <>
            <line x1={labels[0].x + ew} y1={labels[0].y + eh / 2}
              x2={labels[1].x} y2={labels[1].y + eh / 2}
              stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" opacity={0.7} />
            <text x={(labels[0].x + ew + labels[1].x) / 2}
              y={labels[0].y + eh / 2 - 4}
              fill="#f59e0b" fontSize={7.5} textAnchor="middle" opacity={0.85}>
              {gap_eje_mm}mm
            </text>
          </>
        )}
        {cav_des > 1 && labels.length >= cav_eje + 1 && (
          <>
            <line x1={labels[0].x + ew / 2} y1={labels[0].y + eh}
              x2={labels[cav_eje].x + ew / 2} y2={labels[cav_eje].y}
              stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" opacity={0.7} />
            <text x={labels[0].x + ew / 2 + 5}
              y={(labels[0].y + eh + labels[cav_eje].y) / 2}
              fill="#f59e0b" fontSize={7.5} textAnchor="start" dominantBaseline="middle" opacity={0.85}>
              {gap_des_mm}mm
            </text>
          </>
        )}

        {/* Label count badge */}
        <rect x={W - 90} y={H - 24} width={82} height={18} rx={4}
          fill={color + '20'} stroke={color + '50'} />
        <text x={W - 49} y={H - 12} fill={color} fontSize={9} textAnchor="middle" fontWeight="600">
          {cav_eje * cav_des} etiq/frame
        </text>
      </svg>
    </div>
  );
}

// ─── EXPLICACIÓN METROS → MILLARES ───────────────────────────────────────────

function ExplicacionMetros({ exp, umbral_label }: {
  exp: NonNullable<ResultadoAnalisis['explicacion_metros']>;
  umbral_label: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 text-xs space-y-3">
      <div className="text-slate-300 font-semibold text-sm mb-1">
        ¿Por qué el cambio ocurre en {exp.millares_resultado.toLocaleString()}k piezas?
      </div>

      <div className="space-y-1.5 text-slate-400">
        <div className="flex gap-2">
          <span className="text-slate-500 shrink-0">1.</span>
          <span>
            En <strong className="text-slate-200">{exp.maquina_ref}</strong> con esta etiqueta caben{' '}
            <strong className="text-orange-300">{exp.cav_eje} × {exp.cav_des} = {exp.cav_total} etiquetas por frame</strong>.
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-500 shrink-0">2.</span>
          <span>
            Para producir <strong className="text-slate-200">{exp.millares_resultado.toLocaleString()}k piezas</strong> se necesitan{' '}
            ≈ <strong className="text-orange-300">{exp.frames_aprox.toLocaleString()} frames</strong>.
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-500 shrink-0">3.</span>
          <span>
            Cada frame avanza <strong className="text-orange-300">{exp.metros_por_frame.toFixed(4)} m</strong> de papel.
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-500 shrink-0">4.</span>
          <span>
            Total: {exp.frames_aprox.toLocaleString()} frames × {exp.metros_por_frame.toFixed(4)} m
            {' '}≈ <strong className="text-teal-300">{exp.umbral_metros.toLocaleString()} metros lineales</strong>{' '}
            → umbral configurado para {umbral_label}.
          </span>
        </div>
      </div>

      <div className="bg-slate-900/60 rounded-lg px-3 py-2 text-slate-400 leading-relaxed">
        El umbral de <strong className="text-teal-300">{exp.umbral_metros.toLocaleString()} metros</strong> es el punto
        donde el volumen de producción hace más eficiente cambiar de tecnología.
        Este valor es ajustable en <strong className="text-slate-300">Parámetros</strong>.
      </div>
    </div>
  );
}

// ─── RESULTADO COMPLETO ───────────────────────────────────────────────────────

function ResultPanel({ resultado, etiqueta }: { resultado: ResultadoAnalisis; etiqueta: DatosEtiqueta }) {
  // Viable = machines that can do the job (including offset→flexo options)
  const allViable = [...resultado.viable_digital, ...resultado.viable_analog];

  // No viable = truly blocked machines
  // Only show analog no-viable if the reason is NO_CYLINDER (interesting for engineering)
  // Hide if it's just a capability mismatch the engineer already knows
  const noViableMostrar = resultado.no_viable.filter(r => {
    const codes = r.rechazos.map(x => x.codigo);
    // Always show if no cylinder — that's useful info
    if (codes.includes('SIN_CILINDRO')) return true;
    // Show digital if dimension mismatch
    if (r.tipo === 'digital' && codes.some(c => ['EJE_FUERA','DES_FUERA','SIN_PLATA'].includes(c))) return true;
    // Hide pure capability rejections (no screen, no HS, etc.) — engineer knows
    return false;
  });

  // Best digital machine for diagram
  const bestDig = resultado.viable_digital[0];
  const bestAna = resultado.viable_analog[0];

  return (
    <div className="space-y-5" id="resultado-panel">

      {/* Resumen ejecutivo */}
      <div className="border-l-4 border-orange-500 bg-slate-800/60 rounded-r-2xl p-5">
        <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">
          {etiqueta.cliente && <span>{etiqueta.cliente} · </span>}{etiqueta.nombre}
        </div>
        <div className="text-xl font-bold text-slate-100 mb-2">
          {etiqueta.eje_mm} × {etiqueta.des_mm} mm
          <span className="text-sm font-normal text-slate-400 ml-3">{etiqueta.material_nombre}</span>
        </div>
        <p className="text-sm text-orange-300 font-medium">{resultado.recomendacion_principal}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {etiqueta.tintas_proceso > 0 && <Tag color="gray">{etiqueta.tintas_proceso} tintas</Tag>}
          {etiqueta.tiene_blanco && <Tag color="gray">+ blanco</Tag>}
          {etiqueta.tiene_plata && <Tag color="gray">+ plata</Tag>}
          {etiqueta.tiene_hot_stamping && <Tag color="amber">Hot Stamping</Tag>}
          {etiqueta.tiene_cold_foil && <Tag color="amber">Cold Foil</Tag>}
          {etiqueta.tiene_embossing && <Tag color="amber">Embossing</Tag>}
          {etiqueta.tiene_screen && <Tag color="purple">Screen</Tag>}
          {etiqueta.tiene_cupon && <Tag color="purple">Cupón</Tag>}
          {etiqueta.cantidades.length > 0 && (
            <Tag color="teal">
              RFQ: {etiqueta.cantidades.map(q => q >= 1000 ? (q/1000).toFixed(0)+'k' : q).join(', ')} pzas
            </Tag>
          )}
        </div>
      </div>

      {/* Puntos de cruce */}
      {(resultado.cruce_6mil_v12 || resultado.cruce_digital_analog) && (
        <div className="grid grid-cols-2 gap-3">
          {resultado.cruce_6mil_v12 && (
            <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-4">
              <div className="text-xs text-blue-400 uppercase tracking-wider mb-1">Cambio 6K → V12</div>
              <div className="text-xl font-bold text-blue-200">{resultado.cruce_6mil_v12.toLocaleString()}k pzas</div>
              <div className="text-xs text-slate-500 mt-1">≈ {UMBRALES.metros_6mil_to_v12.toLocaleString()} metros lineales</div>
            </div>
          )}
          {resultado.cruce_digital_analog && (
            <div className="bg-teal-950/30 border border-teal-800/30 rounded-xl p-4">
              <div className="text-xs text-teal-400 uppercase tracking-wider mb-1">Cambio Digital → Analógica</div>
              <div className="text-xl font-bold text-teal-200">{resultado.cruce_digital_analog.toLocaleString()}k pzas</div>
              <div className="text-xs text-slate-500 mt-1">≈ {UMBRALES.metros_digital_to_analog.toLocaleString()} metros lineales</div>
            </div>
          )}
        </div>
      )}

      {/* Explicación del cálculo de metros */}
      {resultado.explicacion_metros && (
        <ExplicacionMetros
          exp={resultado.explicacion_metros}
          umbral_label="el cambio a analógica"
        />
      )}

      {/* Máquinas viables */}
      {allViable.length > 0 && (
        <Collapsible title="Máquinas recomendadas" icon={CheckCircle}
          badge={<Tag color="green">{allViable.length}</Tag>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {allViable.map(r => <MachineCard key={r.id} r={r} />)}
          </div>

          {/* Diagramas de cavidades */}
          <div className="space-y-4">
            {bestDig?.cav_eje && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Distribución en planilla — {bestDig.nombre}
                </div>
                <DiagramaCavidades
                  eje_mm={etiqueta.eje_mm} des_mm={etiqueta.des_mm}
                  cav_eje={bestDig.cav_eje!} cav_des={bestDig.cav_des!}
                  gap_eje_mm={3} gap_des_mm={3}
                  ancho_papel_mm={
                    bestDig.id === '20MIL' ? 714 :
                    bestDig.id === 'V12'   ? 313 : 317
                  }
                  tipo="digital" nombre={bestDig.nombre}
                />
              </div>
            )}
            {bestAna?.cav_eje && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Distribución en bobina — {bestAna.nombre}
                </div>
                <DiagramaCavidades
                  eje_mm={etiqueta.eje_mm} des_mm={etiqueta.des_mm}
                  cav_eje={bestAna.cav_eje!} cav_des={bestAna.cav_des!}
                  gap_eje_mm={3} gap_des_mm={bestAna.cilindro_gap_mm ?? 3}
                  ancho_papel_mm={etiqueta.eje_mm * bestAna.cav_eje! + 3 * (bestAna.cav_eje! + 1)}
                  tipo="analog" nombre={bestAna.nombre}
                />
              </div>
            )}
          </div>
        </Collapsible>
      )}

      {/* No viables — solo casos técnicamente interesantes */}
      {noViableMostrar.length > 0 && (
        <Collapsible title="Restricciones técnicas relevantes" icon={AlertTriangle} defaultOpen={false}
          badge={<Tag color="amber">{noViableMostrar.length}</Tag>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {noViableMostrar.map(r => <MachineCard key={r.id} r={r} />)}
          </div>
        </Collapsible>
      )}
    </div>
  );
}

// ─── PANEL CONFIGURACIÓN (solo ingeniería) ────────────────────────────────────

function ConfigPanel({ umbrales, setUmbrales }: {
  umbrales: typeof UMBRALES;
  setUmbrales: (u: typeof UMBRALES) => void;
}) {
  function slider(key: keyof typeof UMBRALES, label: string, min: number, max: number, step: number) {
    return (
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <label className="text-xs text-slate-400">{label}</label>
          <span className="text-xs font-mono font-semibold text-orange-300">
            {umbrales[key].toLocaleString()} m
          </span>
        </div>
        <input type="range" min={min} max={max} step={step} value={umbrales[key]}
          onChange={e => setUmbrales({ ...umbrales, [key]: parseInt(e.target.value) })}
          className="w-full accent-orange-500" />
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>{min.toLocaleString()} m</span><span>{max.toLocaleString()} m</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-700/30 rounded-xl">
        <Lock size={13} className="text-amber-400 shrink-0" />
        <p className="text-xs text-amber-300">Parámetros de ingeniería — solo personal autorizado.</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Umbrales de cambio de tecnología
        </h4>
        {slider('metros_6mil_to_v12',      '6K → V12 (metros lineales)',      300,  3000,  50)}
        {slider('metros_digital_to_analog', 'Digital → Analógica (metros lin.)', 1000, 12000, 200)}
      </div>

      {/* Inventario de cilindros — solo lectura expandible */}
      <CilindrosTable />
    </div>
  );
}

function CilindrosTable() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Inventario de cilindros
        </span>
        {open ? <ChevronDown size={13} className="text-slate-500" /> : <ChevronRight size={13} className="text-slate-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4">
          {Object.entries(CILINDROS).map(([maq, inv]) => {
            const m = MAQUINAS_ANALOG.find(x => x.id === maq);
            return (
              <div key={maq}>
                <h5 className="text-xs font-semibold text-slate-300 mb-2">{m?.nombre ?? maq}</h5>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(inv).map(([d, qty]) => (
                    <div key={d} className="bg-slate-700/60 rounded-lg px-2 py-1 text-center">
                      <div className="text-xs font-mono text-slate-200">d{d}</div>
                      <div className="text-[10px] text-slate-500">×{qty}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {(Number(d) * PASO_DIENTE_MM).toFixed(1)}mm
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── FORMULARIO MANUAL ────────────────────────────────────────────────────────

function FormularioManual({ onAnalizar }: { onAnalizar: (e: DatosEtiqueta) => void }) {
  const [v, setV] = useState<DatosEtiqueta>({ ...DEFAULT_ETIQUETA });
  const set = <K extends keyof DatosEtiqueta>(key: K, val: DatosEtiqueta[K]) =>
    setV(x => ({ ...x, [key]: val }));

  const numIn = (key: keyof DatosEtiqueta, label: string, step = 1) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <input type="number" step={step} value={v[key] as number}
        onChange={e => set(key, parseFloat(e.target.value) || 0 as DatosEtiqueta[typeof key])}
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/70" />
    </label>
  );

  const toggle = (key: keyof DatosEtiqueta, label: string) => (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <button type="button" onClick={() => set(key, !v[key] as DatosEtiqueta[typeof key])}
        className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
          v[key] ? 'bg-orange-500' : 'bg-slate-700'
        }`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${
          v[key] ? 'left-5' : 'left-0.5'
        }`} />
      </button>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );

  const scalesStr = v.cantidades.map(q => q.toLocaleString()).join(', ');

  return (
    <div className="space-y-6">
      {/* Dimensiones */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dimensiones</h4>
        <div className="grid grid-cols-2 gap-3">
          {numIn('eje_mm', 'Eje (mm)')}
          {numIn('des_mm', 'Desarrollo (mm)')}
        </div>
      </div>

      {/* Material */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Material</h4>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-500">Sustrato</span>
          <select value={v.material_id}
            onChange={e => {
              const m = MATERIALES.find(x => x.id === e.target.value);
              setV(x => ({ ...x, material_id: e.target.value, material_nombre: m?.nombre ?? e.target.value }));
            }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/70">
            {MATERIALES.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Tintas */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tintas</h4>
        <div className="space-y-3">
          {numIn('tintas_proceso', 'Tintas de proceso (CMYK etc.)')}
          <div className="space-y-2.5 pt-1">
            {toggle('tiene_blanco', 'Tinta blanca')}
            {toggle('tiene_plata', 'Tinta plata / metálica')}
            {toggle('tiene_invisible', 'Tinta invisible (UV)')}
            {toggle('tiene_barniz_uv', 'Barniz UV')}
          </div>
        </div>
      </div>

      {/* Acabados especiales */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Acabados especiales</h4>
        <div className="space-y-2.5">
          {toggle('tiene_hot_stamping', 'Hot Stamping')}
          {toggle('tiene_cold_foil', 'Cold Foil')}
          {toggle('tiene_embossing', 'Embossing')}
          {toggle('tiene_screen', 'Serigrafía (screen)')}
          {toggle('tiene_cupon', 'Cupón')}
        </div>
      </div>

      {/* Cantidades */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cantidades del RFQ</h4>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-500">Escalas separadas por coma (en piezas)</span>
          <input type="text" defaultValue={scalesStr}
            onBlur={e => {
              const qs = e.target.value.split(',')
                .map(s => parseInt(s.replace(/\D/g, '')) || 0)
                .filter(q => q > 0);
              set('cantidades', qs);
            }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/70" />
        </label>
      </div>

      {/* Referencia */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-500">Descripción / SKU</span>
          <input type="text" value={v.nombre}
            onChange={e => set('nombre', e.target.value)}
            placeholder="Opcional"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/70" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-500">Cliente</span>
          <input type="text" value={v.cliente}
            onChange={e => set('cliente', e.target.value)}
            placeholder="Opcional"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/70" />
        </label>
      </div>

      <button type="button" onClick={() => onAnalizar(v)}
        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
        <CheckCircle size={15} />
        Analizar tecnología →
      </button>
    </div>
  );
}

// ─── MODO VENDEDOR ────────────────────────────────────────────────────────────

function ModoVendedor() {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <Info size={28} className="text-orange-400" />
      </div>
      <h2 className="text-xl font-bold text-slate-100 mb-3">
        Herramienta de Ingeniería
      </h2>
      <p className="text-slate-400 text-sm leading-relaxed mb-6">
        Esta herramienta es para uso interno del departamento de ingeniería.
        Para cotizaciones, utilice <strong className="text-slate-300">Quick Quote</strong> o
        envíe el RFQ al área de ingeniería.
      </p>
      <div className="flex gap-3 justify-center">
        <a href="#" className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">
          Abrir Quick Quote
        </a>
        <a href="mailto:ingenieria@quimera.mx"
          className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-medium transition-colors">
          Contactar Ingeniería
        </a>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

type Tab = 'entrada' | 'resultado' | 'config';

export default function DecisorPage() {
  const [tab, setTab] = useState<Tab>('entrada');
  const [etiqueta, setEtiqueta] = useState<DatosEtiqueta | null>(null);
  const [resultado, setResultado] = useState<ResultadoAnalisis | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<'ingenieria' | 'vendedor'>('ingenieria');
  const [umbrales, setUmbrales] = useState({ ...UMBRALES });
  const fileRef = useRef<HTMLInputElement>(null);

  const analizar = useCallback((datos: DatosEtiqueta) => {
    setLoading(true);
    setTimeout(() => {
      const r = analizarEtiqueta(datos, umbrales);
      setEtiqueta(datos); setResultado(r); setError(null); setTab('resultado');
      setLoading(false);
    }, 200);
  }, [umbrales]);

  const cargarRFQ = useCallback((file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parcial = parseRFQHtml(e.target?.result as string);
        if (!parcial || !parcial.eje_mm || !parcial.des_mm)
          throw new Error('No se encontraron dimensiones en el archivo.');
        // Merge con defaults, abre formulario pre-llenado
        const datos: DatosEtiqueta = { ...DEFAULT_ETIQUETA, ...parcial };
        setEtiqueta(datos);
        // Auto-analizar si tiene suficientes datos
        analizar(datos);
        setError(null);
      } catch (ex) { setError((ex as Error).message); }
    };
    reader.readAsText(file);
  }, [analizar]);

  const handlePrint = () => window.print();

  const tabs: { id: Tab; label: string; icon: React.ElementType; disabled?: boolean }[] = [
    { id: 'entrada',  label: 'Entrada',     icon: FileUp },
    { id: 'resultado',label: 'Análisis',    icon: BookOpen, disabled: !resultado },
    { id: 'config',   label: 'Parámetros',  icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 print:bg-white print:text-black">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-950/95 border-b border-slate-800 backdrop-blur-sm print:hidden">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-2">
            {/* Modo toggle */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
              {(['ingenieria', 'vendedor'] as const).map(m => (
                <button key={m} type="button" onClick={() => setModo(m)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    modo === m ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}>
                  {m === 'ingenieria' ? 'Ingeniería' : 'Vendedor'}
                </button>
              ))}
            </div>
            {/* Tabs */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
              {tabs.map(t => (
                <button key={t.id} disabled={t.disabled} type="button" onClick={() => !t.disabled && setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    t.disabled ? 'opacity-30 cursor-not-allowed text-slate-500' :
                    tab === t.id ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}>
                  <t.icon size={12} />{t.label}
                </button>
              ))}
            </div>
            {resultado && (
              <button type="button" onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors">
                <Printer size={13} />PDF
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 print:px-0 print:py-4">
        {modo === 'vendedor' ? (
          <ModoVendedor />
        ) : (
          <>
            {/* ENTRADA */}
            {tab === 'entrada' && (
              <div className="max-w-2xl mx-auto space-y-5">
                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={e => { e.preventDefault(); setDrag(false); cargarRFQ(e.dataTransfer.files[0]); }}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                    drag ? 'border-orange-500 bg-orange-950/20' : 'border-slate-700 hover:border-slate-600 bg-slate-900/30'
                  }`}>
                  <FileUp size={36} className={`mx-auto mb-3 ${drag ? 'text-orange-400' : 'text-slate-600'}`} />
                  <p className="text-base font-semibold text-slate-300 mb-1">Arrastra el RFQ de CERM aquí</p>
                  <p className="text-xs text-slate-600">formato .html · el sistema extraerá las dimensiones y cantidades</p>
                  <input ref={fileRef} type="file" accept=".html" className="hidden"
                    onChange={e => cargarRFQ(e.target.files?.[0])} />
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-sm text-red-400">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />{error}
                  </div>
                )}

                {/* O entrada manual */}
                <Collapsible title="O ingresa los datos manualmente" icon={Settings} defaultOpen>
                  <FormularioManual onAnalizar={e => analizar({ ...e, modo: 'ingenieria' })} />
                </Collapsible>
              </div>
            )}

            {/* RESULTADO */}
            {tab === 'resultado' && etiqueta && resultado && (
              <div className="max-w-2xl mx-auto">
                {loading
                  ? <div className="flex items-center justify-center py-20">
                      <RefreshCw size={20} className="text-orange-400 animate-spin" />
                    </div>
                  : <ResultPanel resultado={resultado} etiqueta={etiqueta} />}
              </div>
            )}

            {/* CONFIG */}
            {tab === 'config' && (
              <div className="max-w-2xl mx-auto">
                <ConfigPanel umbrales={umbrales} setUmbrales={setUmbrales} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          header, .print\\:hidden { display: none !important; }
          body { background: white !important; color: black !important; }
          #resultado-panel { font-size: 11px; }
        }
      `}</style>
    </div>
  );
}
