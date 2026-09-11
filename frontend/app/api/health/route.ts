// frontend/app/api/health/route.ts
// Simple health check endpoint for Uptime Monitors

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.env.NODE_ENV === 'production' ? 'Live' : 'Dev',
    version: '1.0.0'
  });
}
