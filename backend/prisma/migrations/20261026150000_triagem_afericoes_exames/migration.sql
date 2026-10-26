-- Triagem clínica, aferições do dia, dados da coleta, aptidão do doador e exames da amostra.
-- Registros anteriores ficam com os campos novos nulos.

-- CreateEnum
CREATE TYPE "aptidao" AS ENUM ('APTO', 'INAPTO_TEMPORARIO', 'INAPTO_DEFINITIVO');

-- CreateEnum
CREATE TYPE "resultado_sorologia" AS ENUM ('NAO_REAGENTE', 'REAGENTE', 'INCONCLUSIVO');

-- CreateEnum
CREATE TYPE "pesquisa_anticorpos" AS ENUM ('NEGATIVA', 'POSITIVA');

-- AlterTable
ALTER TABLE "doacao" ADD COLUMN     "altura_cm" SMALLINT,
ADD COLUMN     "aptidao" "aptidao",
ADD COLUMN     "apto_a_partir_de" DATE,
ADD COLUMN     "hematocrito" DECIMAL(3,1),
ADD COLUMN     "hemoglobina" DECIMAL(3,1),
ADD COLUMN     "numero_bolsa" VARCHAR(30),
ADD COLUMN     "peso_kg" DECIMAL(5,2),
ADD COLUMN     "pressao_diastolica" SMALLINT,
ADD COLUMN     "pressao_sistolica" SMALLINT,
ADD COLUMN     "pulso" SMALLINT,
ADD COLUMN     "reacoes" VARCHAR(1000),
ADD COLUMN     "temperatura" DECIMAL(3,1),
ADD COLUMN     "volume_ml" SMALLINT;

-- CreateTable
CREATE TABLE "triagem_clinica" (
    "doacao_id" UUID NOT NULL,
    "doencas" VARCHAR(1000),
    "cirurgias" VARCHAR(1000),
    "transfusao_anterior" BOOLEAN NOT NULL,
    "alergias" VARCHAR(1000),
    "gestacoes" VARCHAR(500),
    "medicamentos" VARCHAR(1000),
    "vacinas_recentes" VARCHAR(500),
    "tatuagem_ou_piercing_recente" BOOLEAN NOT NULL,
    "uso_de_drogas" BOOLEAN NOT NULL,
    "comportamento_sexual_de_risco" BOOLEAN NOT NULL,
    "viagem_area_de_risco" VARCHAR(500),
    "observacoes" VARCHAR(2000),

    CONSTRAINT "triagem_clinica_pkey" PRIMARY KEY ("doacao_id")
);

-- CreateTable
CREATE TABLE "exame_doacao" (
    "doacao_id" UUID NOT NULL,
    "pesquisa_anticorpos" "pesquisa_anticorpos" NOT NULL,
    "hiv" "resultado_sorologia" NOT NULL,
    "hepatite_b" "resultado_sorologia" NOT NULL,
    "hepatite_c" "resultado_sorologia" NOT NULL,
    "sifilis" "resultado_sorologia" NOT NULL,
    "chagas" "resultado_sorologia" NOT NULL,
    "htlv" "resultado_sorologia" NOT NULL,
    "malaria" "resultado_sorologia",
    "observacoes" VARCHAR(2000),
    "registrado_por" UUID NOT NULL,
    "registrado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exame_doacao_pkey" PRIMARY KEY ("doacao_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doacao_hemocentro_id_numero_bolsa_key" ON "doacao"("hemocentro_id", "numero_bolsa");

-- AddForeignKey
ALTER TABLE "triagem_clinica" ADD CONSTRAINT "triagem_clinica_doacao_id_fkey" FOREIGN KEY ("doacao_id") REFERENCES "doacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exame_doacao" ADD CONSTRAINT "exame_doacao_doacao_id_fkey" FOREIGN KEY ("doacao_id") REFERENCES "doacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exame_doacao" ADD CONSTRAINT "exame_doacao_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "equipe_hemocentro"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Inapto temporário sempre tem a data a partir da qual volta a ser apto; os outros, não.
ALTER TABLE "doacao" ADD CONSTRAINT "doacao_apto_a_partir_de_chk"
    CHECK (("aptidao" = 'INAPTO_TEMPORARIO') = ("apto_a_partir_de" IS NOT NULL));
-- Quem doou foi considerado apto.
ALTER TABLE "doacao" ADD CONSTRAINT "doacao_doou_apto_chk"
    CHECK (NOT "doou" OR "aptidao" IS NULL OR "aptidao" = 'APTO');
-- Faixas fisiológicas das aferições.
ALTER TABLE "doacao" ADD CONSTRAINT "doacao_afericoes_chk" CHECK (
    ("peso_kg" IS NULL OR "peso_kg" BETWEEN 30 AND 300)
    AND ("altura_cm" IS NULL OR "altura_cm" BETWEEN 100 AND 250)
    AND ("pressao_sistolica" IS NULL OR "pressao_sistolica" BETWEEN 60 AND 260)
    AND ("pressao_diastolica" IS NULL OR "pressao_diastolica" BETWEEN 30 AND 160)
    AND ("pulso" IS NULL OR "pulso" BETWEEN 30 AND 220)
    AND ("temperatura" IS NULL OR "temperatura" BETWEEN 33 AND 43)
    AND ("hemoglobina" IS NULL OR "hemoglobina" BETWEEN 3 AND 25)
    AND ("hematocrito" IS NULL OR "hematocrito" BETWEEN 10 AND 75)
    AND ("volume_ml" IS NULL OR "volume_ml" BETWEEN 50 AND 600)
);
