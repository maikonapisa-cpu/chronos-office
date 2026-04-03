import { NextResponse } from 'next/server';
import { readReceipts } from '@/lib/logging';

export async function GET() {
  const receipts = await readReceipts(20);
  return NextResponse.json({ receipts });
}
