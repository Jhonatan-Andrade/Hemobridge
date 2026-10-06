-- CreateTable
CREATE TABLE "historico_necessidade" (
    "id" BIGSERIAL NOT NULL,
    "necessidade_id" UUID NOT NULL,
    "nivel_anterior" "nivel_necessidade" NOT NULL,
    "nivel_novo" "nivel_necessidade" NOT NULL,
    "alterado_por" UUID NOT NULL,
    "alterado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "historico_necessidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historico_necessidade_necessidade_id_alterado_em_idx" ON "historico_necessidade"("necessidade_id", "alterado_em");

-- CreateIndex
CREATE INDEX "historico_necessidade_alterado_em_idx" ON "historico_necessidade"("alterado_em");

-- AddForeignKey
ALTER TABLE "historico_necessidade" ADD CONSTRAINT "historico_necessidade_necessidade_id_fkey" FOREIGN KEY ("necessidade_id") REFERENCES "necessidade_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_necessidade" ADD CONSTRAINT "historico_necessidade_alterado_por_fkey" FOREIGN KEY ("alterado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- RN03: toda alteração de nível é registrada com nível anterior, nível novo,
-- responsável e instante. Feito no banco para não depender de cada chamador.
-- ---------------------------------------------------------------------------
CREATE FUNCTION "registrar_historico_necessidade"() RETURNS trigger AS $$
BEGIN
    INSERT INTO "historico_necessidade"
        ("necessidade_id", "nivel_anterior", "nivel_novo", "alterado_por", "alterado_em")
    VALUES
        (NEW."id", OLD."nivel", NEW."nivel", NEW."atualizado_por", COALESCE(NEW."atualizado_em", now()));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "necessidade_registrar_historico"
    AFTER UPDATE OF "nivel" ON "necessidade_estoque"
    FOR EACH ROW
    WHEN (OLD."nivel" IS DISTINCT FROM NEW."nivel")
    EXECUTE FUNCTION "registrar_historico_necessidade"();
