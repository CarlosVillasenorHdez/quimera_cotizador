/**
 * /api/db — Route Handler unificado para todas las operaciones de Supabase.
 * Corre en el servidor de Vercel, no en el browser.
 * Esto resuelve la restricción de host del sb_publishable key:
 * las llamadas salen desde Vercel (sin Origin header), no desde el navegador.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

// ── GET /api/db?table=nombre&filter=... ──────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sb = getClient();
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');
    if (!table) return NextResponse.json({ error: 'table required' }, { status: 400 });

    let query = sb.from(table).select('*');
    if (searchParams.get('eq_id')) query = query.eq('id', searchParams.get('eq_id')!);
    if (searchParams.get('activo'))  query = query.eq('activo', true);
    if (searchParams.get('single'))  {
      const { data, error } = await query.single();
      if (error) throw error;
      return NextResponse.json(data);
    }
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST /api/db — insert / upsert ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const sb = getClient();
    const body = await req.json();
    const { table, data, upsert } = body as { table: string; data: unknown; upsert?: boolean };
    if (!table || !data) return NextResponse.json({ error: 'table and data required' }, { status: 400 });

    const q = upsert ? sb.from(table).upsert(data as Record<string, unknown>[]) : sb.from(table).insert(data as Record<string, unknown>[]);
    const { error } = await q;
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── PATCH /api/db — update ───────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const sb = getClient();
    const body = await req.json();
    const { table, id, data } = body as { table: string; id: string; data: Record<string, unknown> };
    if (!table || !id || !data) return NextResponse.json({ error: 'table, id and data required' }, { status: 400 });

    const { error } = await sb.from(table).update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
