import { createDataScopeService } from '../lib/datascope.js'

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { testData } = req.body
    const dataScopeService = createDataScopeService()
    
    console.log('Testing DataScope with data:', testData)
    
    if (!Array.isArray(testData) || testData.length === 0) {
      return res.status(400).json({ error: 'testData must be a non-empty array' })
    }

    let totalProcessed = 0
    let totalSuccessful = 0
    const allErrors: string[] = []

    for (const data of testData) {
      try {
        const result = await dataScopeService.processOtherFields(data)
        totalProcessed += result.processed
        totalSuccessful += result.successful
        allErrors.push(...result.errors)
      } catch (error) {
        console.error('Error processing test data:', error)
        allErrors.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    const response = {
      processed: totalProcessed,
      successful: totalSuccessful,
      errors: allErrors
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error('DataScope test error:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
}