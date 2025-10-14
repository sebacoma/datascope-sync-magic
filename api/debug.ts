// Simple test endpoint to debug Vercel deployment
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Test environment variables
    const hasDbUrl = !!process.env.DATABASE_URL
    const hasDataScopeKey = !!process.env.DATASCOPE_API_KEY
    
    return res.status(200).json({
      status: 'debug-ok',
      env: {
        DATABASE_URL: hasDbUrl ? 'present' : 'missing',
        DATASCOPE_API_KEY: hasDataScopeKey ? 'present' : 'missing',
        DATASCOPE_BASE_URL: process.env.DATASCOPE_BASE_URL || 'missing'
      },
      method: req.method,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return res.status(500).json({
      error: 'debug-error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}