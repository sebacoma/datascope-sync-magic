-- CreateTable
CREATE TABLE "areas" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_equipo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ejecutores" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ejecutores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes_zonas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "detalle" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_zonas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipments" (
    "id" SERIAL NOT NULL,
    "numero_equipo_tag" TEXT NOT NULL,
    "numero_del_equipo" TEXT,
    "area_id" INTEGER,
    "tipo_equipo_id" INTEGER,
    "marca_modelo" TEXT,
    "sistema_sellado" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "plan_api" TEXT,
    "regulador_flujo" TEXT,
    "presion" TEXT,
    "flujo" TEXT,
    "temperatura" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspecciones" (
    "id" SERIAL NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "ejecutor_id" INTEGER,
    "cliente_zona_id" INTEGER,
    "form_id" TEXT,
    "form_name" TEXT,
    "user_name" TEXT,
    "created" TIMESTAMP(3),
    "sent" TIMESTAMP(3),
    "assigned_date" TIMESTAMP(3),
    "assigned_time" TEXT,
    "first_answer" TIMESTAMP(3),
    "last_answer" TIMESTAMP(3),
    "assigned_location" TEXT,
    "assigned_location_code" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "servicio" TEXT,
    "minutes_to_perform" INTEGER,
    "otro_cliente" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspecciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "areas_codigo_key" ON "areas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_equipo_codigo_key" ON "tipos_equipo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ejecutores_nombre_key" ON "ejecutores"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_zonas_nombre_key" ON "clientes_zonas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "equipments_numero_equipo_tag_key" ON "equipments"("numero_equipo_tag");

-- AddForeignKey
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_tipo_equipo_id_fkey" FOREIGN KEY ("tipo_equipo_id") REFERENCES "tipos_equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_ejecutor_id_fkey" FOREIGN KEY ("ejecutor_id") REFERENCES "ejecutores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_cliente_zona_id_fkey" FOREIGN KEY ("cliente_zona_id") REFERENCES "clientes_zonas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
