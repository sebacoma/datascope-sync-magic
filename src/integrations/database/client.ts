// API client to replace Supabase integration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export interface Equipment {
  id: number
  created?: Date | string | null
  sent?: Date | string | null
  form_id?: string | null
  form_name?: string | null
  user_name?: string | null
  assigned_date?: Date | string | null
  assigned_time?: string | null
  assigned_location?: string | null
  assigned_location_code?: string | null
  first_answer?: Date | string | null
  last_answer?: Date | string | null
  minutes_to_perform?: number | null
  latitude?: number | null
  longitude?: number | null
  zona_cliente?: string | null
  ejecutado_por?: string | null
  tipo_equipo?: string | null
  numero_equipo_tag?: string | null
  marca_modelo?: string | null
  otro_cliente?: string | null
  servicio?: string | null
  created_at: Date | string
  updated_at: Date | string
}

export interface BatchResponse {
  success: boolean
  message: string
  processed: number
  errors: number
  results: Array<{
    rowNumber: number
    data: Equipment | null
    error?: string
  }>
  errorDetails: Array<{
    rowNumber: number
    error: string
  }>
}

export const apiClient = {
  async getEquipment(): Promise<Equipment[]> {
    const response = await fetch(`${API_BASE_URL}/api/equipment`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data || []
  },

  async createEquipmentBatch(data: { 
    sheet: string; 
    rows: Array<{
      rowNumber: number
      data: Record<string, unknown>
      tag?: string
    }>
  }): Promise<BatchResponse> {
    const response = await fetch(`${API_BASE_URL}/api/equipment/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  },

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL}/api/health`)
    if (!response.ok) {
      throw new Error(`Health check failed! status: ${response.status}`)
    }
    return response.json()
  }
}