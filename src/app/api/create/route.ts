import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

export async function POST(req: NextRequest) {
  const { title, storage_path } = await req.json();
  if (!storage_path) {
    return NextResponse.json({ error: 'Missing storage_path' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('audio_clips')
    .insert([{ title, storage_path }])
    .select('id')
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });
  }
  const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/c/${data.id}`;
  return NextResponse.json({ url });
} 