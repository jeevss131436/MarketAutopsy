import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_BASE = process.env.FASTAPI_URL ?? 'http://localhost:8000';

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } },
) {
  const { ticker } = params;

  try {
    const upstream = await fetch(`${FASTAPI_BASE}/api/predict/${ticker}`, {
      cache: 'no-store',
    });

    const payload = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(payload, { status: upstream.status });
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { detail: 'Could not reach the prediction server. Is FastAPI running on port 8000?' },
      { status: 503 },
    );
  }
}
