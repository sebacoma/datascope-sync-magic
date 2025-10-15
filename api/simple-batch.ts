// Simplified batch endpoint for Google Apps Script with DataScope integration
import { PrismaClient } from '@prisma/client'
import { createDataScopeService } from '../lib/datascope.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let prisma: PrismaClient | null = null

  try {
    prisma = new PrismaClient()
    const { sheet, rows } = req.body

    console.log('Received batch from Apps Script:', { sheet, rowCount: rows?.length })

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided' })
    }

    let processed = 0
    let errors = 0
    const results = []

    for (const row of rows) {
      try {
        const data = row.data || {}
        
        // Get equipment tag components
        const area = data['Area'] || null
        const tipoEquipo = data['Tipo de Equipo'] || null  
        const numeroEquipo = data['Numero del Equipo'] || null

        let numero_equipo_tag = null

        // First try to get from existing tag field (if manually provided)
        numero_equipo_tag = data['Numero de Equipo (Tag)'] || 
                           data['Tag'] ||
                           row.tag

        // Clean empty strings
        if (typeof numero_equipo_tag === 'string') {
          numero_equipo_tag = numero_equipo_tag.trim() || null
        }

        // Build tag from components if available (priority over manual tag)
        if (area && tipoEquipo && numeroEquipo) {
          // Clean components
          const cleanArea = String(area).trim()
          const cleanTipo = String(tipoEquipo).trim() 
          const cleanNumero = String(numeroEquipo).trim()
          
          if (cleanArea && cleanTipo && cleanNumero) {
            numero_equipo_tag = `${cleanArea}-${cleanTipo}-${cleanNumero}`
            console.log(`🏗️ Built tag from components: ${numero_equipo_tag}`)
          }
        }
        // Fallback to manual tag if component construction failed
        else if (!numero_equipo_tag) {
          // Keep the manual tag that was already retrieved above
        }
        
        // Generate fallback tag if still missing
        if (!numero_equipo_tag) {
          const timestamp = new Date().getTime()
          numero_equipo_tag = `AUTO-${row.rowNumber || timestamp}`
          console.log(`🆔 Generated fallback tag: ${numero_equipo_tag}`)
        }

        console.log(`📋 Tag resolution: Area="${area}" + Tipo="${tipoEquipo}" + Numero="${numeroEquipo}" = "${numero_equipo_tag}"`)
        console.log(`📦 Raw data received:`, JSON.stringify(data, null, 2))

        // Prepare equipment data
        const equipmentData = {
          created: data.created ? new Date(data.created) : null,
          sent: data.sent ? new Date(data.sent) : null,
          form_id: data.form_id ? String(data.form_id) : null,
          form_name: data.form_name || null,
          user_name: data.user || null,
          assigned_date: data.assigned_date ? new Date(data.assigned_date) : null,
          assigned_time: data.assigned_time || null,
          assigned_location: data.assigned_location || null,
          assigned_location_code: data.assigned_location_code || null,
          first_answer: data.first_answer ? new Date(data.first_answer) : null,
          last_answer: data.last_answer ? new Date(data.last_answer) : null,
          minutes_to_perform: data.minutes_to_perform ? parseInt(data.minutes_to_perform) : null,
          latitude: data.latitude ? parseFloat(data.latitude) : null,
          longitude: data.longitude ? parseFloat(data.longitude) : null,
          zona_cliente: (data['Zona - Cliente'] && data['Zona - Cliente'].trim()) || null,
          ejecutado_por: (data['Ejecutado por'] && data['Ejecutado por'].trim()) || null,
          tipo_equipo: tipoEquipo,
          numero_equipo_tag: numero_equipo_tag.toString().trim(),
          marca_modelo: (data['Marca - Modelo'] && data['Marca - Modelo'].trim()) || 
                       (data['Marca'] && data['Marca'].trim()) || null,
          otro_cliente: (data['Otro - Cliente'] && data['Otro - Cliente'].trim()) || null,
          servicio: (data['Servicio'] && data['Servicio'].trim()) || null
        }

        // Upsert in database - only look for existing if we have both tag and date
        let existing = null
        if (equipmentData.numero_equipo_tag && equipmentData.assigned_date) {
          existing = await prisma.chestertonEquipment.findFirst({
            where: {
              numero_equipo_tag: equipmentData.numero_equipo_tag,
              assigned_date: equipmentData.assigned_date
            }
          })
        }

        let result
        if (existing) {
          result = await prisma.chestertonEquipment.update({
            where: { id: existing.id },
            data: equipmentData
          })
        } else {
          result = await prisma.chestertonEquipment.create({
            data: equipmentData
          })
        }

        processed++
        const resultEntry: any = { 
          rowNumber: row.rowNumber, 
          id: result.id,
          action: existing ? 'updated' : 'created',
          tag: numero_equipo_tag,
          components: { area, tipoEquipo, numeroEquipo },
          savedData: {
            zona_cliente: equipmentData.zona_cliente,
            ejecutado_por: equipmentData.ejecutado_por,
            tipo_equipo: equipmentData.tipo_equipo,
            servicio: equipmentData.servicio,
            marca_modelo: equipmentData.marca_modelo
          }
        }

        // Process DataScope "Otro" fields
        try {
          const dataScopeService = createDataScopeService()
          const dataScopeResult = await dataScopeService.processOtherFields(data)
          
          if (dataScopeResult.processed > 0) {
            console.log(`🔄 DataScope: ${dataScopeResult.successful}/${dataScopeResult.processed} fields processed`)
            
            // Add DataScope info to result
            resultEntry.datascope = {
              processed: dataScopeResult.processed,
              successful: dataScopeResult.successful,
              errors: dataScopeResult.errors
            }
          }
        } catch (dataScopeError) {
          console.error('DataScope processing error:', dataScopeError)
          // Don't fail the main operation if DataScope fails
          resultEntry.datascope_error = 'Failed to process DataScope fields'
        }

        results.push(resultEntry)

      } catch (rowError) {
        errors++
        results.push({ 
          rowNumber: row.rowNumber, 
          error: rowError instanceof Error ? rowError.message : 'Unknown error' 
        })
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${rows.length} rows`,
      summary: {
        total: rows.length,
        processed,
        errors
      },
      results
    })

  } catch (error) {
    console.error('Batch processing error:', error)
    return res.status(500).json({ 
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}