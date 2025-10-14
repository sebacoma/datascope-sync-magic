import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface VercelRequest {
  method: string
  body: any
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'GET') {
      // Get all equipment
      const equipment = await prisma.chestertonEquipment.findMany({
        orderBy: { created_at: 'desc' }
      })
      
      return res.status(200).json(equipment)
    }

    return res.status(405).json({ error: 'Method not allowed' })
    
  } catch (error) {
    console.error('Equipment API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma.$disconnect()
  }
}