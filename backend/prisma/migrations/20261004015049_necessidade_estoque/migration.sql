-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateEnum
CREATE TYPE "nivel_necessidade" AS ENUM ('CRITICO', 'BAIXO', 'ESTAVEL', 'ADEQUADO', 'NAO_INFORMADO');

-- CreateTable
CREATE TABLE "necessidade_estoque" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "tipo_sanguineo_id" SMALLINT NOT NULL,
    "nivel" "nivel_necessidade" NOT NULL DEFAULT 'NAO_INFORMADO',
    "atualizado_por" UUID,
    "atualizado_em" TIMESTAMPTZ(3),

    CONSTRAINT "necessidade_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "necessidade_estoque_tipo_sanguineo_id_nivel_idx" ON "necessidade_estoque"("tipo_sanguineo_id", "nivel");

-- CreateIndex
CREATE UNIQUE INDEX "necessidade_estoque_hospital_id_tipo_sanguineo_id_key" ON "necessidade_estoque"("hospital_id", "tipo_sanguineo_id");

-- AddForeignKey
ALTER TABLE "necessidade_estoque" ADD CONSTRAINT "necessidade_estoque_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "necessidade_estoque" ADD CONSTRAINT "necessidade_estoque_tipo_sanguineo_id_fkey" FOREIGN KEY ("tipo_sanguineo_id") REFERENCES "tipo_sanguineo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "necessidade_estoque" ADD CONSTRAINT "necessidade_estoque_atualizado_por_fkey" FOREIGN KEY ("atualizado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Todo hospital tem exatamente um nível por tipo sanguíneo (RN02).
-- Ao cadastrar um hospital, os oito níveis nascem como NAO_INFORMADO.
-- ---------------------------------------------------------------------------
CREATE FUNCTION "criar_necessidades_hospital"() RETURNS trigger AS $$
BEGIN
    INSERT INTO "necessidade_estoque" ("hospital_id", "tipo_sanguineo_id")
    SELECT NEW."id", t."id" FROM "tipo_sanguineo" t
    ON CONFLICT ("hospital_id", "tipo_sanguineo_id") DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "hospital_criar_necessidades"
    AFTER INSERT ON "hospital"
    FOR EACH ROW EXECUTE FUNCTION "criar_necessidades_hospital"();

-- Hospitais já existentes
INSERT INTO "necessidade_estoque" ("hospital_id", "tipo_sanguineo_id")
SELECT h."id", t."id" FROM "hospital" h CROSS JOIN "tipo_sanguineo" t
ON CONFLICT ("hospital_id", "tipo_sanguineo_id") DO NOTHING;

-- Nível só é considerado informado com responsável e data.
ALTER TABLE "necessidade_estoque"
    ADD CONSTRAINT "necessidade_informada_chk" CHECK (
        "nivel" = 'NAO_INFORMADO'
        OR ("atualizado_por" IS NOT NULL AND "atualizado_em" IS NOT NULL)
    );
