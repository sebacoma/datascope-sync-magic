-- Migration to transfer data from legacy chesterton_equipment to normalized tables
-- Run this after the new structure is deployed

-- Insert unique areas from existing data
INSERT INTO areas (codigo, nombre, descripcion, created_at, updated_at)
SELECT DISTINCT 
    SPLIT_PART(numero_equipo_tag, '-', 1) as codigo,
    'Área ' || SPLIT_PART(numero_equipo_tag, '-', 1) as nombre,
    'Auto-migrated from legacy data' as descripcion,
    NOW() as created_at,
    NOW() as updated_at
FROM chesterton_equipment 
WHERE numero_equipo_tag IS NOT NULL 
    AND numero_equipo_tag LIKE '%-%-%'
    AND SPLIT_PART(numero_equipo_tag, '-', 1) != ''
    AND NOT EXISTS (
        SELECT 1 FROM areas 
        WHERE codigo = SPLIT_PART(numero_equipo_tag, '-', 1)
    );

-- Insert unique tipos_equipo from existing data
INSERT INTO tipos_equipo (codigo, nombre, categoria, created_at, updated_at)
SELECT DISTINCT 
    SPLIT_PART(numero_equipo_tag, '-', 2) as codigo,
    COALESCE(tipo_equipo, 'Tipo ' || SPLIT_PART(numero_equipo_tag, '-', 2)) as nombre,
    'Auto-migrated' as categoria,
    NOW() as created_at,
    NOW() as updated_at
FROM chesterton_equipment 
WHERE numero_equipo_tag IS NOT NULL 
    AND numero_equipo_tag LIKE '%-%-%'
    AND SPLIT_PART(numero_equipo_tag, '-', 2) != ''
    AND NOT EXISTS (
        SELECT 1 FROM tipos_equipo 
        WHERE codigo = SPLIT_PART(numero_equipo_tag, '-', 2)
    );

-- Insert unique ejecutores from existing data
INSERT INTO ejecutores (nombre, created_at, updated_at)
SELECT DISTINCT 
    ejecutado_por as nombre,
    NOW() as created_at,
    NOW() as updated_at
FROM chesterton_equipment 
WHERE ejecutado_por IS NOT NULL 
    AND ejecutado_por != ''
    AND ejecutado_por != 'Otro'
    AND NOT EXISTS (
        SELECT 1 FROM ejecutores 
        WHERE nombre = ejecutado_por
    );

-- Insert unique clientes_zonas from existing data
INSERT INTO clientes_zonas (nombre, cliente, zona, ubicacion, detalle, created_at, updated_at)
SELECT DISTINCT 
    zona_cliente as nombre,
    SPLIT_PART(zona_cliente, ' | ', 2) as cliente,
    SPLIT_PART(zona_cliente, ' | ', 1) as zona,
    SPLIT_PART(zona_cliente, ' | ', 3) as ubicacion,
    SPLIT_PART(zona_cliente, ' | ', 4) as detalle,
    NOW() as created_at,
    NOW() as updated_at
FROM chesterton_equipment 
WHERE zona_cliente IS NOT NULL 
    AND zona_cliente != ''
    AND zona_cliente LIKE '%|%'
    AND NOT EXISTS (
        SELECT 1 FROM clientes_zonas 
        WHERE nombre = zona_cliente
    );

-- Insert equipments from existing data
INSERT INTO equipments (
    numero_equipo_tag, 
    numero_del_equipo,
    area_id, 
    tipo_equipo_id, 
    marca_modelo,
    created_at, 
    updated_at
)
SELECT DISTINCT ON (ce.numero_equipo_tag)
    ce.numero_equipo_tag,
    SPLIT_PART(ce.numero_equipo_tag, '-', 3) as numero_del_equipo,
    a.id as area_id,
    te.id as tipo_equipo_id,
    ce.marca_modelo,
    ce.created_at,
    NOW() as updated_at
FROM chesterton_equipment ce
LEFT JOIN areas a ON a.codigo = SPLIT_PART(ce.numero_equipo_tag, '-', 1)
LEFT JOIN tipos_equipo te ON te.codigo = SPLIT_PART(ce.numero_equipo_tag, '-', 2)
WHERE ce.numero_equipo_tag IS NOT NULL 
    AND ce.numero_equipo_tag != ''
    AND NOT EXISTS (
        SELECT 1 FROM equipments 
        WHERE numero_equipo_tag = ce.numero_equipo_tag
    );

-- Insert inspecciones from existing data
INSERT INTO inspecciones (
    equipment_id,
    ejecutor_id,
    cliente_zona_id,
    form_id,
    form_name,
    user_name,
    created,
    sent,
    assigned_date,
    assigned_time,
    first_answer,
    last_answer,
    assigned_location,
    assigned_location_code,
    latitude,
    longitude,
    servicio,
    minutes_to_perform,
    otro_cliente,
    created_at,
    updated_at
)
SELECT 
    e.id as equipment_id,
    ej.id as ejecutor_id,
    cz.id as cliente_zona_id,
    ce.form_id,
    ce.form_name,
    ce.user_name,
    ce.created,
    ce.sent,
    ce.assigned_date,
    ce.assigned_time,
    ce.first_answer,
    ce.last_answer,
    ce.assigned_location,
    ce.assigned_location_code,
    ce.latitude,
    ce.longitude,
    ce.servicio,
    ce.minutes_to_perform,
    ce.otro_cliente,
    ce.created_at,
    NOW() as updated_at
FROM chesterton_equipment ce
JOIN equipments e ON e.numero_equipo_tag = ce.numero_equipo_tag
LEFT JOIN ejecutores ej ON ej.nombre = ce.ejecutado_por
LEFT JOIN clientes_zonas cz ON cz.nombre = ce.zona_cliente
WHERE ce.id IS NOT NULL;