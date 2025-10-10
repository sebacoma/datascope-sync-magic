-- Tabla para almacenar los datos de equipos de Chesterton
CREATE TABLE IF NOT EXISTS public.chesterton_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Datos del formulario
  created TIMESTAMP WITH TIME ZONE,
  sent TIMESTAMP WITH TIME ZONE,
  form_id TEXT,
  form_name TEXT,
  user_name TEXT,
  
  -- Datos de asignación
  assigned_date DATE,
  assigned_time TIME,
  assigned_location TEXT,
  assigned_location_code TEXT,
  
  -- Datos de respuesta
  first_answer TIMESTAMP WITH TIME ZONE,
  last_answer TIMESTAMP WITH TIME ZONE,
  minutes_to_perform INTEGER,
  
  -- Geolocalización
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  
  -- Datos del equipo
  zona_cliente TEXT,
  ejecutado_por TEXT,
  tipo_equipo TEXT,
  numero_equipo_tag TEXT NOT NULL,
  marca_modelo TEXT,
  otro_cliente TEXT,
  servicio TEXT,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Identificador único: tag + fecha
  UNIQUE(numero_equipo_tag, assigned_date)
);

-- Índices para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_chesterton_equipment_tag ON public.chesterton_equipment(numero_equipo_tag);
CREATE INDEX IF NOT EXISTS idx_chesterton_equipment_date ON public.chesterton_equipment(assigned_date);
CREATE INDEX IF NOT EXISTS idx_chesterton_equipment_tipo ON public.chesterton_equipment(tipo_equipo);
CREATE INDEX IF NOT EXISTS idx_chesterton_equipment_cliente ON public.chesterton_equipment(zona_cliente);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_chesterton_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chesterton_equipment_updated_at
  BEFORE UPDATE ON public.chesterton_equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chesterton_equipment_updated_at();

-- RLS: Los datos son públicos para lectura (dashboard público)
ALTER TABLE public.chesterton_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura pública de equipos"
  ON public.chesterton_equipment
  FOR SELECT
  USING (true);