interface VercelRequest {
  method: string
}

interface VercelResponse {
  setHeader: (name: string, value: string) => void
  status: (code: number) => VercelResponse
  json: (data: any) => void
  end: () => void
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: 'Vercel'
  })
}