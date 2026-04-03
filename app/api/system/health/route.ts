import { NextResponse } from 'next/server';
import { getRuntimeHealth } from '@/lib/health';

export async function GET() {
  const health = await getRuntimeHealth();
  return NextResponse.json({ ok: true, ...health });
}
