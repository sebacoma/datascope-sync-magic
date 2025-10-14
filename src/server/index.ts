import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { createDataScopeService } from './services/datascope'

const app = express()
const prisma = new PrismaClient()
const dataScopeService = createDataScopeService()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Test DataScope service
app.post('/api/test-datascope', async (req, res) => {
  try {
    const { testData } = req.body
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

    res.json(response)
  } catch (error) {
    console.error('DataScope test error:', error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

// Get all equipment
app.get('/api/equipment', async (req, res) => {
  try {
    const equipment = await prisma.chestertonEquipment.findMany({
      orderBy: { created_at: 'desc' }
    })
    res.json(equipment)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    res.status(500).json({ error: 'Failed to fetch equipment' })
  }
})

// Receive equipment data (replacing Supabase function)
app.post('/api/equipment/batch', async (req, res) => {
  try {
    const { sheet, rows } = req.body
    
    console.log('Received batch:', {
      sheet,
      rowCount: rows?.length || 0
    })

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided in batch' })
    }

    const validEquipmentData = []
    const errors = []

    // Validate and transform rows
    for (const row of rows) {
      try {
        const rowData = row.data || {}
        
        // Log received fields for debugging (first row only)
        if (row.rowNumber === rows[0]?.rowNumber) {
          console.log('Received fields from Apps Script:', Object.keys(rowData))
          console.log('Row data sample:', rowData)
        }
        
        const numero_equipo_tag = validateString(
          rowData['Numero de Equipo (Tag)'] || 
          rowData['Numero del Equipo'] || 
          row.tag
        )
        
        if (!numero_equipo_tag) {
          errors.push({
            rowNumber: row.rowNumber,
            error: 'Missing required field: numero_equipo_tag'
          })
          continue
        }

        const equipmentData = {
          created: validateDate(rowData.created),
          sent: validateDate(rowData.sent),
          form_id: validateString(rowData.form_id),
          form_name: validateString(rowData.form_name),
          user_name: validateString(rowData.user),
          assigned_date: validateDate(rowData.assigned_date),
          assigned_time: validateString(rowData.assigned_time),
          assigned_location: validateString(rowData.assigned_location),
          assigned_location_code: validateString(rowData.assigned_location_code),
          first_answer: validateDate(rowData.first_answer),
          last_answer: validateDate(rowData.last_answer),
          minutes_to_perform: validateInteger(rowData.minutes_to_perform),
          latitude: validateNumber(rowData.latitude),
          longitude: validateNumber(rowData.longitude),
          zona_cliente: validateString(rowData['Zona - Cliente']),
          ejecutado_por: validateString(rowData['Ejecutado por']),
          tipo_equipo: validateString(rowData['Tipo de Equipo']),
          numero_equipo_tag,
          marca_modelo: validateString(rowData['Marca - Modelo'] || rowData['Marca']),
          otro_cliente: validateString(rowData['Otro - Cliente']),
          servicio: validateString(rowData['Servicio'])
        }

        validEquipmentData.push({
          rowNumber: row.rowNumber,
          data: equipmentData,
          originalRowData: rowData
        })
        
      } catch (rowError) {
        errors.push({
          rowNumber: row.rowNumber,
          error: rowError instanceof Error ? rowError.message : 'Unknown validation error'
        })
      }
    }

    // Batch upsert with Prisma
    let batchResults: Array<{ rowNumber: number; data: unknown; error?: string }> = []
    if (validEquipmentData.length > 0) {
      try {
        console.log(`Performing batch upsert for ${validEquipmentData.length} valid records`)
        
        const results = await Promise.allSettled(
          validEquipmentData.map(async (item) => {
            const data = item.data
            
            const existing = await prisma.chestertonEquipment.findFirst({
              where: {
                numero_equipo_tag: data.numero_equipo_tag,
                assigned_date: data.assigned_date
              }
            })

            if (existing) {
              return await prisma.chestertonEquipment.update({
                where: { id: existing.id },
                data
              })
            } else {
              return await prisma.chestertonEquipment.create({
                data
              })
            }
          })
        )

        batchResults = results.map((result, index) => ({
          rowNumber: validEquipmentData[index].rowNumber,
          data: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? 
            (result.reason instanceof Error ? result.reason.message : 'Unknown error') : 
            undefined
        }))

        console.log(`Successfully processed ${batchResults.filter(r => !r.error).length} records`)

        // Procesar campos "Otro" para actualizar listas de DataScope
        console.log('🔄 Processing "Otro" fields for DataScope lists...')
        let totalDataScopeUpdates = 0
        let successfulDataScopeUpdates = 0
        const dataScopeErrors: string[] = []

        for (const item of validEquipmentData) {
          try {
            const result = await dataScopeService.processOtherFields(item.originalRowData)
            totalDataScopeUpdates += result.processed
            successfulDataScopeUpdates += result.successful
            dataScopeErrors.push(...result.errors)
          } catch (error) {
            console.error('Error processing DataScope updates for row:', item.rowNumber, error)
            dataScopeErrors.push(`Row ${item.rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }

        console.log(`📊 DataScope updates: ${successfulDataScopeUpdates}/${totalDataScopeUpdates} successful`)
        if (dataScopeErrors.length > 0) {
          console.log('⚠️  DataScope errors:', dataScopeErrors)
        }

      } catch (batchError) {
        console.error('Batch upsert error:', batchError)
        return res.status(500).json({ 
          error: 'Database batch operation failed',
          details: batchError instanceof Error ? batchError.message : 'Unknown error'
        })
      }
    }

    const successCount = batchResults.filter(r => !r.error).length
    const errorCount = batchResults.filter(r => r.error).length + errors.length

    console.log(`Batch processed: ${successCount} success, ${errorCount} errors`)

    res.json({
      success: true,
      message: `Processed ${rows.length} rows`,
      processed: successCount,
      errors: errorCount,
      results: batchResults,
      errorDetails: [
        ...errors,
        ...batchResults.filter(r => r.error).map(r => ({ 
          rowNumber: r.rowNumber, 
          error: r.error 
        }))
      ]
    })

  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})

// Validation functions
function validateDate(dateString: string | undefined): Date | null {
  if (!dateString) return null
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

function validateNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(num) ? null : num
}

function validateInteger(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = typeof value === 'string' ? parseInt(value) : value
  return isNaN(num) ? null : num
}

function validateString(value: string | undefined): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`)
  console.log(`📊 API available at http://localhost:${port}/api`)
})

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})
