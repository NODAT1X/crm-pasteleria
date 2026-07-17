-- CreateEnum
CREATE TYPE "metodo_pago" AS ENUM ('efectivo', 'transferencia');

-- CreateEnum
CREATE TYPE "tipo_movimiento_pago" AS ENUM ('pago', 'devolucion', 'retencion');

-- CreateEnum
CREATE TYPE "tipo_pago" AS ENUM ('anticipo', 'abono', 'liquidacion');

-- CreateEnum
CREATE TYPE "estado_movimiento_pago" AS ENUM ('aplicado', 'anulado');

-- CreateTable
CREATE TABLE "movimientos_financieros" (
    "id" TEXT NOT NULL,
    "pasteleria_id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "tipo_movimiento" "tipo_movimiento_pago" NOT NULL,
    "metodo_pago" "metodo_pago",
    "tipo_pago" "tipo_pago",
    "monto" DECIMAL(10,2) NOT NULL,
    "referencia" TEXT,
    "notas" TEXT,
    "estado" "estado_movimiento_pago" NOT NULL DEFAULT 'aplicado',
    "fecha_recepcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimientos_financieros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movimientos_financieros_pasteleria_id_idx" ON "movimientos_financieros"("pasteleria_id");

-- CreateIndex
CREATE INDEX "movimientos_financieros_pedido_id_idx" ON "movimientos_financieros"("pedido_id");

-- CreateIndex
CREATE INDEX "movimientos_financieros_pasteleria_id_pedido_id_idx" ON "movimientos_financieros"("pasteleria_id", "pedido_id");

-- CreateIndex
CREATE INDEX "movimientos_financieros_pasteleria_id_estado_idx" ON "movimientos_financieros"("pasteleria_id", "estado");

-- CreateIndex
CREATE INDEX "movimientos_financieros_pasteleria_id_tipo_movimiento_idx" ON "movimientos_financieros"("pasteleria_id", "tipo_movimiento");

-- CreateIndex
CREATE INDEX "movimientos_financieros_pasteleria_id_fecha_recepcion_idx" ON "movimientos_financieros"("pasteleria_id", "fecha_recepcion");

-- AddForeignKey
ALTER TABLE "movimientos_financieros" ADD CONSTRAINT "movimientos_financieros_pasteleria_id_fkey" FOREIGN KEY ("pasteleria_id") REFERENCES "pastelerias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_financieros" ADD CONSTRAINT "movimientos_financieros_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
