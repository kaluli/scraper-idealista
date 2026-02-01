import { NextResponse } from 'next/server'

// GET - Health check simple sin base de datos
export async function GET() {
  return NextResponse.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'API is running',
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || '3000',
      hasDatabaseUrl: !!process.env.DATABASE_URL
    }
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json'
    }
  })
}


