import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get data from Google Apps Script
    const requestData = await req.json()
    
    console.log('Received data from Google Apps Script:', requestData)

    // Transform data to match database schema
    const equipmentData = {
      created: requestData.created ? new Date(requestData.created) : null,
      sent: requestData.sent ? new Date(requestData.sent) : null,
      form_id: requestData.form_id,
      form_name: requestData.form_name,
      user_name: requestData.user,
      assigned_date: requestData.assigned_date ? new Date(requestData.assigned_date) : null,
      assigned_time: requestData.assigned_time || null,
      assigned_location: requestData.assigned_location,
      assigned_location_code: requestData.assigned_location_code,
      first_answer: requestData.first_answer ? new Date(requestData.first_answer) : null,
      last_answer: requestData.last_answer ? new Date(requestData.last_answer) : null,
      minutes_to_perform: requestData.minutes_to_perform ? parseInt(requestData.minutes_to_perform) : null,
      latitude: requestData.latitude ? parseFloat(requestData.latitude) : null,
      longitude: requestData.longitude ? parseFloat(requestData.longitude) : null,
      zona_cliente: requestData['Zona - Pole'],
      ejecutado_por: requestData['Ejecutado por'],
      tipo_equipo: requestData['Tipo - Equipo'],
      numero_equipo_tag: requestData['Numero - Equipo (Tag)'] || requestData.tag,
      marca_modelo: requestData['Marca - Modelo'],
      otro_cliente: requestData['Otro - Cliente'],
      servicio: requestData.servicio,
    }

    console.log('Transformed data:', equipmentData)

    // Insert or update in the database (upsert on tag + date)
    const { data, error } = await supabaseClient
      .from('chesterton_equipment')
      .upsert(equipmentData, {
        onConflict: 'numero_equipo_tag,assigned_date'
      })
      .select()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Data saved successfully:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Equipment data received and saved',
        data: data
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
