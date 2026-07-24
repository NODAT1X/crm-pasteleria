-- CreateEnum
CREATE TYPE "origen_pedido" AS ENUM ('manual', 'whatsapp');

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "origen_pedido" "origen_pedido" NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE INDEX "pedidos_pasteleria_id_origen_pedido_estado_pedido_idx" ON "pedidos"("pasteleria_id", "origen_pedido", "estado_pedido");
