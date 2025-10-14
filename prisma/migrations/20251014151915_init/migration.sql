-- CreateTable
CREATE TABLE "chesterton_equipment" (
    "id" SERIAL NOT NULL,
    "created" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "sent" TIMESTAMP(3),
    "form_id" TEXT,
    "form_name" TEXT,
    "user_name" TEXT,
    "assigned_date" TIMESTAMP(3),
    "assigned_time" TEXT,
    "assigned_location" TEXT,
    "assigned_location_code" TEXT,
    "first_answer" TIMESTAMP(3),
    "last_answer" TIMESTAMP(3),
    "minutes_to_perform" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "zona_cliente" TEXT,
    "ejecutado_por" TEXT,
    "tipo_equipo" TEXT,
    "numero_equipo_tag" TEXT,
    "marca_modelo" TEXT,
    "otro_cliente" TEXT,
    "servicio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chesterton_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chesterton_equipment_numero_equipo_tag_assigned_date_key" ON "chesterton_equipment"("numero_equipo_tag", "assigned_date");
