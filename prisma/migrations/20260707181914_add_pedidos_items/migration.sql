-- CreateEnum
CREATE TYPE "estado_pedido" AS ENUM ('cotizacion', 'confirmado', 'en_preparacion', 'listo_para_entregar', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "tipo_entrega" AS ENUM ('recoger', 'domicilio');

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "pasteleria_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "estado_pedido" "estado_pedido" NOT NULL DEFAULT 'cotizacion',
    "fecha_entrega" TIMESTAMP(3) NOT NULL,
    "hora_entrega" TEXT NOT NULL,
    "tipo_entrega" "tipo_entrega" NOT NULL,
    "direccion_entrega" TEXT,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notas_internas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_items" (
    "id" TEXT NOT NULL,
    "pasteleria_id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "producto_id" TEXT,
    "nombre_snapshot" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "pedido_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pedidos_pasteleria_id_idx" ON "pedidos"("pasteleria_id");

-- CreateIndex
CREATE INDEX "pedidos_pasteleria_id_cliente_id_idx" ON "pedidos"("pasteleria_id", "cliente_id");

-- CreateIndex
CREATE INDEX "pedidos_pasteleria_id_estado_pedido_idx" ON "pedidos"("pasteleria_id", "estado_pedido");

-- CreateIndex
CREATE INDEX "pedidos_pasteleria_id_fecha_entrega_idx" ON "pedidos"("pasteleria_id", "fecha_entrega");

-- CreateIndex
CREATE INDEX "pedidos_pasteleria_id_estado_pedido_fecha_entrega_idx" ON "pedidos"("pasteleria_id", "estado_pedido", "fecha_entrega");

-- CreateIndex
CREATE INDEX "pedido_items_pasteleria_id_idx" ON "pedido_items"("pasteleria_id");

-- CreateIndex
CREATE INDEX "pedido_items_pedido_id_idx" ON "pedido_items"("pedido_id");

-- CreateIndex
CREATE INDEX "pedido_items_pasteleria_id_pedido_id_idx" ON "pedido_items"("pasteleria_id", "pedido_id");

-- CreateIndex
CREATE INDEX "pedido_items_producto_id_idx" ON "pedido_items"("producto_id");

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_pasteleria_id_fkey" FOREIGN KEY ("pasteleria_id") REFERENCES "pastelerias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_pasteleria_id_fkey" FOREIGN KEY ("pasteleria_id") REFERENCES "pastelerias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
