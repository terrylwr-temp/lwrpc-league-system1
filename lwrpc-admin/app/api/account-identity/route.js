import { NextResponse } from 'next/server';
import { reconcileSignedInAccount } from '../../lib/accountIdentity.js';

export const runtime = 'nodejs';
export async function POST(request) {
  const result = await reconcileSignedInAccount(request);
  return NextResponse.json({ status: result.status }, {
    status: result.httpStatus,
    headers: { 'Cache-Control': 'no-store' },
  });
}
