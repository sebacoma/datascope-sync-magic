import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DATASCOPE_API_URL = 'https://www.mydatascope.com/api/external'

// Mapeo de campos a sus listas en DataScope
const DATASCOPE_LISTS = {
  tags: 'chesterton_equipos',
  ejecutores: 'chesterton_ejecutores',
  zonas_clientes: 'chesterton_zonas_clientes',
  tipos_equipo: 'chesterton_tipos_equipo',
  marcas_modelos: 'chesterton_marcas_modelos',
  servicios: 'chesterton_servicios',
  areas: 'chesterton_areas',
  sistemas_sellado: 'chesterton_sistemas_sellado',
  planes_api: 'chesterton_planes_api'
}

// Función genérica para verificar si un valor existe en una lista de DataScope
async function checkValueInDataScope(value: string, metadataType: string, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${DATASCOPE_API_URL}/metadata_objects?metadata_type=${metadataType}`,
      {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        }
      }
    )
    
    if (!response.ok) {
      console.error(`Error checking DataScope list ${metadataType}:`, await response.text())
      return false
    }
    
    const data = await response.json()
    return data.some((item: any) => item.code === value || item.name === value)
  } catch (error) {
    console.error(`Exception checking DataScope list ${metadataType}:`, error)
    return false
  }
}

// Función genérica para crear un valor en una lista de DataScope
async function createValueInDataScope(
  value: string, 
  metadataType: string, 
  apiKey: string, 
  description?: string,
  attribute1?: string,
  attribute2?: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${DATASCOPE_API_URL}/metadata_object?metadata_type=${metadataType}`,
      {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          list_object: {
            code: value,
            name: value,
            description: description || value,
            attribute1: attribute1 || '',
            attribute2: attribute2 || ''
          }
        })
      }
    )
    
    if (!response.ok) {
      console.error(`Error creating in DataScope list ${metadataType}:`, await response.text())
      return false
    }
    
    console.log(`Value "${value}" created successfully in DataScope list ${metadataType}`)
    return true
  } catch (error) {
    console.error(`Exception creating in DataScope list ${metadataType}:`, error)
    return false
  }
}

// Función para sincronizar un campo con su lista correspondiente
async function syncFieldToDataScope(
  value: string | null | undefined,
  listType: string,
  apiKey: string,
  description?: string,
  attribute1?: string,
  attribute2?: string
): Promise<void> {
  if (!value || String(value).trim() === '') return
  
  const trimmedValue = String(value).trim()
  const exists = await checkValueInDataScope(trimmedValue, listType, apiKey)
  
  if (!exists) {
    console.log(`"${trimmedValue}" not found in ${listType}, creating...`)
    await createValueInDataScope(trimmedValue, listType, apiKey, description, attribute1, attribute2)
  } else {
    console.log(`"${trimmedValue}" already exists in ${listType}`)
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const datascopeApiKey = Deno.env.get('DATASCOPE_API_KEY')
    if (!datascopeApiKey) {
      console.warn('DATASCOPE_API_KEY not configured, skipping DataScope sync')
    }

    // Get batch data from Google Apps Script
    const requestData = await req.json()
    
    console.log('Received batch from Google Apps Script:', {
      sheet: requestData.sheet,
      rowCount: requestData.rows?.length || 0
    })

    // Process batch of rows
    const rows = requestData.rows || []
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No rows provided in batch' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const results = []
    const errors = []

    for (const row of rows) {
      try {
        const rowData = row.data || {}
        
        // Construct TAG from Area + Tipo de Equipo + Numero de Equipo
        const area = rowData['Area'] || ''
        const tipoEquipo = rowData['Tipo de Equipo'] || ''
        const numeroEquipo = rowData['Numero del Equipo'] || rowData['Numero de Equipo (Tag)'] || ''
        
        // Build the TAG: Area-TipoDeEquipo-NumeroDeEquipo
        const numero_equipo_tag = [area, tipoEquipo, numeroEquipo]
          .filter(part => part && String(part).trim() !== '')
          .join('-')
          .trim() || null
        
        // Validate required field
        if (!numero_equipo_tag || String(numero_equipo_tag).trim() === '') {
          console.warn(`Row ${row.rowNumber}: Missing required field 'numero_equipo_tag'`)
          errors.push({
            rowNumber: row.rowNumber,
            error: 'Missing required field: numero_equipo_tag (Tag del equipo)'
          })
          continue
        }
        
        // Transform data to match database schema
        const equipmentData = {
          created: rowData.created ? new Date(rowData.created) : null,
          sent: rowData.sent ? new Date(rowData.sent) : null,
          form_id: rowData.form_id,
          form_name: rowData.form_name,
          user_name: rowData.user,
          assigned_date: rowData.assigned_date ? new Date(rowData.assigned_date) : null,
          assigned_time: rowData.assigned_time || null,
          assigned_location: rowData.assigned_location,
          assigned_location_code: rowData.assigned_location_code,
          first_answer: rowData.first_answer ? new Date(rowData.first_answer) : null,
          last_answer: rowData.last_answer ? new Date(rowData.last_answer) : null,
          minutes_to_perform: rowData.minutes_to_perform ? parseInt(rowData.minutes_to_perform) : null,
          latitude: rowData.latitude ? parseFloat(rowData.latitude) : null,
          longitude: rowData.longitude ? parseFloat(rowData.longitude) : null,
          zona_cliente: rowData['Zona - Cliente'],
          ejecutado_por: rowData['Ejecutado por'],
          tipo_equipo: rowData['Tipo de Equipo'],
          numero_equipo_tag: String(numero_equipo_tag).trim(),
          marca_modelo: rowData['Marca - Modelo'] || rowData['Marca'],
          otro_cliente: rowData['Otro - Cliente'],
          servicio: rowData['Servicio'],
        }

        console.log(`Processing row ${row.rowNumber}:`, equipmentData)

        // Insert or update in the database
        const { data, error } = await supabaseClient
          .from('chesterton_equipment')
          .upsert(equipmentData, {
            onConflict: 'numero_equipo_tag,assigned_date'
          })
          .select()

        if (error) {
          console.error(`Error on row ${row.rowNumber}:`, error)
          errors.push({
            rowNumber: row.rowNumber,
            error: error.message
          })
        } else {
          // Sync with DataScope if API key is available
          if (datascopeApiKey) {
            // Sincronizar todos los campos dinámicos en paralelo
            const syncPromises = []
            
            // TAG principal
            if (numero_equipo_tag) {
              syncPromises.push(
                syncFieldToDataScope(
                  numero_equipo_tag,
                  DATASCOPE_LISTS.tags,
                  datascopeApiKey,
                  `Equipo: ${tipoEquipo} - ${numeroEquipo}`,
                  area,
                  tipoEquipo
                )
              )
            }
            
            // Ejecutado por
            if (rowData['Ejecutado por']) {
              syncPromises.push(
                syncFieldToDataScope(
                  rowData['Ejecutado por'],
                  DATASCOPE_LISTS.ejecutores,
                  datascopeApiKey
                )
              )
            }
            
            // Zona - Cliente
            if (rowData['Zona - Cliente']) {
              syncPromises.push(
                syncFieldToDataScope(
                  rowData['Zona - Cliente'],
                  DATASCOPE_LISTS.zonas_clientes,
                  datascopeApiKey
                )
              )
            }
            
            // Tipo de Equipo
            if (tipoEquipo) {
              syncPromises.push(
                syncFieldToDataScope(
                  tipoEquipo,
                  DATASCOPE_LISTS.tipos_equipo,
                  datascopeApiKey
                )
              )
            }
            
            // Marca - Modelo
            if (rowData['Marca - Modelo'] || rowData['Marca']) {
              const marca = rowData['Marca - Modelo'] || rowData['Marca']
              syncPromises.push(
                syncFieldToDataScope(
                  marca,
                  DATASCOPE_LISTS.marcas_modelos,
                  datascopeApiKey,
                  undefined,
                  rowData['Marca'],
                  rowData['Modelo']
                )
              )
            }
            
            // Servicio
            if (rowData['Servicio']) {
              syncPromises.push(
                syncFieldToDataScope(
                  rowData['Servicio'],
                  DATASCOPE_LISTS.servicios,
                  datascopeApiKey
                )
              )
            }
            
            // Area
            if (area) {
              syncPromises.push(
                syncFieldToDataScope(
                  area,
                  DATASCOPE_LISTS.areas,
                  datascopeApiKey
                )
              )
            }
            
            // Sistema de Sellado
            if (rowData['Sistema de Sellado']) {
              syncPromises.push(
                syncFieldToDataScope(
                  rowData['Sistema de Sellado'],
                  DATASCOPE_LISTS.sistemas_sellado,
                  datascopeApiKey
                )
              )
            }
            
            // Plan API
            if (rowData['Plan API']) {
              syncPromises.push(
                syncFieldToDataScope(
                  rowData['Plan API'],
                  DATASCOPE_LISTS.planes_api,
                  datascopeApiKey
                )
              )
            }
            
            // Ejecutar todas las sincronizaciones en paralelo
            await Promise.allSettled(syncPromises)
          }
          
          results.push({
            rowNumber: row.rowNumber,
            data: data
          })
        }
      } catch (rowError) {
        const errorMessage = rowError instanceof Error ? rowError.message : 'Unknown error'
        console.error(`Exception on row ${row.rowNumber}:`, rowError)
        errors.push({
          rowNumber: row.rowNumber,
          error: errorMessage
        })
      }
    }

    console.log(`Batch processed: ${results.length} success, ${errors.length} errors`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${rows.length} rows`,
        processed: results.length,
        errors: errors.length,
        results: results,
        errorDetails: errors
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
