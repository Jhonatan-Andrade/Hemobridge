/*
  Warnings:

  - Added the required column `crm_conferido_por` to the `medico` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "medico" ADD COLUMN     "crm_conferido_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "crm_conferido_por" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "medico" ADD CONSTRAINT "medico_crm_conferido_por_fkey" FOREIGN KEY ("crm_conferido_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
