-- CreateEnum
CREATE TYPE "origen_cliente" AS ENUM ('manual', 'whatsapp');

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "origen_cliente" "origen_cliente" NOT NULL DEFAULT 'manual',
ADD COLUMN     "revision_pendiente" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "clientes_pasteleria_id_whatsapp_idx" ON "clientes"("pasteleria_id", "whatsapp");

-- CreateIndex
CREATE INDEX "clientes_pasteleria_id_telefono_idx" ON "clientes"("pasteleria_id", "telefono");
