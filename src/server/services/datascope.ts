// DataScope API Integration
// This service handles communication with DataScope API to update lists

export interface DataScopeConfig {
  baseUrl: string
  apiKey: string
}

export interface DataScopeListItem {
  id?: string
  name: string
  description?: string
  code?: string
  attribute1?: string
  attribute2?: string
}

export interface DataScopeUpdateRequest {
  metadata_type: string // código de la lista en DataScope
  newValue: string
  fieldName: string
  originalField: string
  sourceData: Record<string, unknown>
}

export class DataScopeService {
  private config: DataScopeConfig

  constructor(config: DataScopeConfig) {
    this.config = config
  }

  /**
   * Detecta campos "Otro" en los datos recibidos
   * Busca campos que tengan valor "Otro" y su correspondiente campo "Otro - [Campo]"
   */
  detectOtherFields(data: Record<string, unknown>): DataScopeUpdateRequest[] {
    const otherFields: DataScopeUpdateRequest[] = []
    
    // Configuración de campos que pueden tener "Otro"
    const fieldConfigs = [
      {
        mainField: 'Ejecutado por',
        otherField: 'Otro - Ejecutado por',
        metadata_type: 'Ejecutadorpor_9519a06c'
      },
      {
        mainField: 'Tipo de Equipo',
        otherField: 'Otro - Tipo de Equipo', 
        metadata_type: 'L27_1a17'
      }
      // Se pueden agregar más campos aquí
    ]

    // Detectar campos normales con "Otro"
    for (const config of fieldConfigs) {
      const mainValue = data[config.mainField]
      const otherValue = data[config.otherField]
      
      // Si el campo principal tiene valor "Otro" y existe un valor en el campo "Otro - ..."
      if (mainValue === 'Otro' && otherValue && typeof otherValue === 'string' && otherValue.trim() !== '') {
        otherFields.push({
          metadata_type: config.metadata_type,
          newValue: otherValue.trim(),
          fieldName: config.mainField,
          originalField: config.otherField,
          sourceData: data
        })
      }
    }

    // Caso especial: Numero de Equipo (Tag)
    const tagValue = data['Numero de Equipo (Tag)']
    if (tagValue && typeof tagValue === 'string' && tagValue.trim() !== '') {
      // El tag siempre se agrega a la lista de tags (no requiere campo "Otro")
      otherFields.push({
        metadata_type: 'L64_4829',
        newValue: tagValue.trim(),
        fieldName: 'Numero de Equipo (Tag)',
        originalField: 'Numero de Equipo (Tag)',
        sourceData: data
      })
    }

    return otherFields
  }

  /**
   * Verifica si un elemento ya existe en la lista
   */
  async checkIfExists(metadata_type: string, value: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/api/external/metadata_objects?metadata_type=${metadata_type}`,
        {
          headers: {
            'Authorization': this.config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        console.error(`Failed to check existing items in list ${metadata_type}:`, response.statusText)
        return false
      }

      const items: DataScopeListItem[] = await response.json()
      
      // Buscar si ya existe un elemento con ese nombre
      return items.some(item => 
        item.name?.toLowerCase() === value.toLowerCase() ||
        item.code?.toLowerCase() === value.toLowerCase()
      )
    } catch (error) {
      console.error(`Error checking if "${value}" exists in DataScope list:`, error)
      return false
    }
  }

  /**
   * Añade un nuevo elemento a una lista en DataScope
   */
  async addToList(request: DataScopeUpdateRequest): Promise<boolean> {
    try {
      console.log(`Adding "${request.newValue}" to DataScope list: ${request.metadata_type}`)
      
      // Verificar si ya existe
      const exists = await this.checkIfExists(request.metadata_type, request.newValue)
      if (exists) {
        console.log(`⚠️  "${request.newValue}" already exists in ${request.fieldName} list, skipping`)
        return true
      }

      // Crear nuevo elemento
      const listObject = {
        name: request.newValue,
        description: `Auto-added from form: ${request.newValue}`,
        code: this.generateCode(request.newValue),
        attribute1: '', // Opcional
        attribute2: ''  // Opcional
      }

      const response = await fetch(
        `${this.config.baseUrl}/api/external/metadata_object?metadata_type=${request.metadata_type}`,
        {
          method: 'POST',
          headers: {
            'Authorization': this.config.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ list_object: listObject })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`DataScope API error (${response.status}):`, errorText)
        return false
      }

      const result = await response.json()
      console.log(`✅ Successfully added "${request.newValue}" to ${request.fieldName} list:`, result)
      return true
      
    } catch (error) {
      console.error(`❌ Failed to add "${request.newValue}" to DataScope list:`, error)
      return false
    }
  }

  /**
   * Genera un código único basado en el nombre
   */
  private generateCode(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 20) + '_' + Date.now().toString().slice(-4)
  }

  /**
   * Procesa todos los campos "Otro" detectados
   */
  async processOtherFields(data: Record<string, unknown>): Promise<{
    processed: number
    successful: number
    errors: string[]
  }> {
    console.log('🔍 Processing data for "Otro" fields:', data)
    const otherFields = this.detectOtherFields(data)
    const errors: string[] = []
    let successful = 0

    console.log(`🔍 Found ${otherFields.length} "Otro" fields to process:`, otherFields)

    for (let i = 0; i < otherFields.length; i++) {
      const field = otherFields[i]
      
      try {
        // Agregar delay entre llamadas para evitar rate limiting
        if (i > 0) {
          console.log(`⏱️  Waiting 2 seconds to avoid rate limiting...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        const success = await this.addToList(field)
        if (success) {
          successful++
        } else {
          errors.push(`Failed to add "${field.newValue}" to ${field.fieldName}`)
        }
      } catch (error) {
        const errorMsg = `Error processing "${field.newValue}": ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    return {
      processed: otherFields.length,
      successful,
      errors
    }
  }
}

// Configuración por defecto (se puede sobrescribir con variables de entorno)
export const createDataScopeService = (): DataScopeService => {
  const config: DataScopeConfig = {
    baseUrl: process.env.DATASCOPE_BASE_URL || 'https://www.mydatascope.com',
    apiKey: process.env.DATASCOPE_API_KEY || ''
  }

  return new DataScopeService(config)
}