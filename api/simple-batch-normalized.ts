// Simplified batch endpoint for Google Apps Script with normalized database structure
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
    
    const { rows } = req.body
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: 'Invalid request format' })
    }

    let processed = 0
    let errors = 0
    const results = []

    for (const row of rows) {
      try {
        const data = row.data || {}
        
        // Get equipment tag components
        const area = data['Area'] || null
        const tipoEquipoTag = data['Tipo de Equipo Tag'] || null  
        const numeroEquipoTag = data['Numero del Equipo Tag'] || null

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
        if (area && tipoEquipoTag && numeroEquipoTag) {
          // Clean components
          const cleanArea = String(area).trim()
          const cleanTipo = String(tipoEquipoTag).trim() 
          const cleanNumero = String(numeroEquipoTag).trim()
          
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

        console.log(`📋 Tag resolution: Area="${area}" + Tipo="${tipoEquipoTag}" + Numero="${numeroEquipoTag}" = "${numero_equipo_tag}"`)

        // Find or create related entities
        let areaRecord = null
        if (area) {
          areaRecord = await prisma.area.findUnique({ where: { codigo: String(area) } })
          if (!areaRecord) {
            areaRecord = await prisma.area.create({
              data: {
                codigo: String(area),
                nombre: `Área ${area}`,
                descripcion: `Auto-created area for code ${area}`
              }
            })
          }
        }

        let tipoEquipoRecord = null
        if (tipoEquipoTag) {
          tipoEquipoRecord = await prisma.tipoEquipo.findUnique({ where: { codigo: String(tipoEquipoTag) } })
          if (!tipoEquipoRecord) {
            tipoEquipoRecord = await prisma.tipoEquipo.create({
              data: {
                codigo: String(tipoEquipoTag),
                nombre: data['Tipo de Equipo'] || `Tipo ${tipoEquipoTag}`,
                categoria: 'Auto-created'
              }
            })
          }
        }

        let ejecutorRecord = null
        const ejecutorNombre = data['Ejecutado por']
        if (ejecutorNombre && ejecutorNombre !== 'Otro') {
          ejecutorRecord = await prisma.ejecutor.findUnique({ where: { nombre: String(ejecutorNombre) } })
          if (!ejecutorRecord) {
            ejecutorRecord = await prisma.ejecutor.create({
              data: {
                nombre: String(ejecutorNombre)
              }
            })
          }
        }

        let clienteZonaRecord = null
        const zonaCliente = data['Zona - Cliente']
        if (zonaCliente) {
          clienteZonaRecord = await prisma.clienteZona.findUnique({ where: { nombre: String(zonaCliente) } })
          if (!clienteZonaRecord) {
            // Parse zona cliente string
            const parts = String(zonaCliente).split(' | ')
            clienteZonaRecord = await prisma.clienteZona.create({
              data: {
                nombre: String(zonaCliente),
                cliente: parts[1] || 'Unknown',
                zona: parts[0] || 'Unknown',
                ubicacion: parts[2] || 'Unknown',
                detalle: parts[3] || null
              }
            })
          }
        }

        // Create or update equipment
        let equipment = await prisma.equipment.findUnique({
          where: { numero_equipo_tag: numero_equipo_tag }
        })

        if (!equipment) {
          equipment = await prisma.equipment.create({
            data: {
              numero_equipo_tag: numero_equipo_tag,
              numero_del_equipo: numeroEquipoTag ? String(numeroEquipoTag) : null,
              area_id: areaRecord?.id,
              tipo_equipo_id: tipoEquipoRecord?.id,
              marca_modelo: (data['Marca - Modelo'] && data['Marca - Modelo'].trim()) || 
                           (data['Marca'] && data['Marca'].trim()) || null,
              sistema_sellado: (data['Sistema de Sellado'] && data['Sistema de Sellado'].trim()) || null,
              marca: (data['Marca'] && data['Marca'].trim()) || null,
              modelo: (data['Modelo'] && data['Modelo'].trim()) || null,
              plan_api: (data['Plan API'] && data['Plan API'].trim()) || null,
              regulador_flujo: (data['Regulador de flujo'] && data['Regulador de flujo'].trim()) || null,
              presion: (data['Presion'] && data['Presion'].trim()) || null,
              flujo: (data['Flujo'] && data['Flujo'].trim()) || null,
              temperatura: (data['Temperatura'] && data['Temperatura'].trim()) || null
            }
          })
        }

        // Create inspection record
        const inspeccion = await prisma.inspeccion.create({
          data: {
            equipment_id: equipment.id,
            ejecutor_id: ejecutorRecord?.id,
            cliente_zona_id: clienteZonaRecord?.id,
            form_id: data.form_id ? String(data.form_id) : null,
            form_name: data.form_name || null,
            user_name: data.user || null,
            created: data.created ? new Date(data.created) : null,
            sent: data.sent ? new Date(data.sent) : null,
            assigned_date: data.assigned_date ? new Date(data.assigned_date) : null,
            assigned_time: data.assigned_time || null,
            first_answer: data.first_answer ? new Date(data.first_answer) : null,
            last_answer: data.last_answer ? new Date(data.last_answer) : null,
            assigned_location: data.assigned_location || null,
            assigned_location_code: data.assigned_location_code || null,
            latitude: data.latitude ? parseFloat(data.latitude) : null,
            longitude: data.longitude ? parseFloat(data.longitude) : null,
            servicio: (data['Servicio'] && data['Servicio'].trim()) || null,
            minutes_to_perform: data.minutes_to_perform ? parseInt(data.minutes_to_perform) : null,
            otro_cliente: (data['Otro - Cliente'] && data['Otro - Cliente'].trim()) || null
          }
        })

        processed++
        const resultEntry: any = { 
          rowNumber: row.rowNumber, 
          equipmentId: equipment.id,
          inspeccionId: inspeccion.id,
          action: 'created',
          tag: numero_equipo_tag,
          components: { area, tipoEquipoTag, numeroEquipoTag }
        }

        // Process DataScope "Otro" fields and add TAG to list
        try {
          const dataScopeService = createDataScopeService()
          
          // Add the constructed TAG to DataScope list
          let tagProcessed = false
          if (numero_equipo_tag && !numero_equipo_tag.startsWith('AUTO-')) {
            try {
              console.log(`🏷️ Adding TAG to DataScope: ${numero_equipo_tag}`)
              const tagRequest = {
                metadata_type: 'L64_4829',
                newValue: numero_equipo_tag,
                fieldName: 'Equipment Tag',
                originalField: 'Equipment Tag (Auto-generated)',
                sourceData: data
              }
              tagProcessed = await dataScopeService.addToList(tagRequest)
              console.log(`${tagProcessed ? '✅' : '❌'} TAG add result: ${tagProcessed}`)
            } catch (error) {
              console.log(`❌ Error adding TAG to DataScope:`, error)
            }
          }
          
          // Process "Otro" fields
          const dataScopeResult = await dataScopeService.processOtherFields(data)
          
          console.log(`🔄 DataScope processing:`, JSON.stringify(dataScopeResult, null, 2))
          
          if (dataScopeResult.processed > 0 || tagProcessed) {
            console.log(`🔄 DataScope: ${dataScopeResult.successful}/${dataScopeResult.processed} fields processed, TAG: ${tagProcessed}`)
            
            // Add DataScope info to result
            resultEntry.datascope = {
              processed: dataScopeResult.processed + (tagProcessed ? 1 : 0),
              successful: dataScopeResult.successful + (tagProcessed ? 1 : 0),
              errors: dataScopeResult.errors,
              tagAdded: tagProcessed
            }
          }
        } catch (error) {
          console.error('DataScope processing error:', error)
          resultEntry.datascope = {
            processed: 0,
            successful: 0,
            errors: [`DataScope error: ${error instanceof Error ? error.message : 'Unknown error'}`]
          }
        }

        results.push(resultEntry)

      } catch (error) {
        errors++
        results.push({ 
          rowNumber: row.rowNumber, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
        console.error(`Error processing row ${row.rowNumber}:`, error)
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${results.length} rows`,
      summary: {
        total: results.length,
        processed,
        errors
      },
      results
    })

  } catch (error) {
    console.error('Batch processing error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}