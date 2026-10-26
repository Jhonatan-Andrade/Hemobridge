-- Novo escopo: agendamento de doação em hemocentros com vagas por horário.
-- Remove teleconsulta, exames, compatibilidade, geolocalização e o perfil de
-- representante. Os dados que continuam fazendo sentido são migrados:
--   hospital              -> hemocentro
--   medico                -> equipe_hemocentro (papel MEDICO)
--   representante_hosp.   -> equipe_hemocentro (papel ADMIN_HEMOCENTRO)
--   paciente APROVADO     -> ATIVA (demais -> PENDENTE)
--   necessidade_estoque   -> necessidade (CRITICO -> URGENTE, BAIXO -> NECESSARIO,
--                            ESTAVEL/ADEQUADO -> ESTAVEL; NAO_INFORMADO some)

-- ---------------------------------------------------------------------------
-- 1. Teleconsulta e exames
-- ---------------------------------------------------------------------------
DROP TABLE "exame";
DROP TABLE "solicitacao_exame";
DROP TABLE "consulta";
DROP TABLE "disponibilidade_medico";
DROP TYPE "situacao_exame";
DROP TYPE "situacao_consulta";

-- ---------------------------------------------------------------------------
-- 2. Compatibilidade e histórico de necessidades
-- ---------------------------------------------------------------------------
DROP TABLE "compatibilidade_sanguinea";

DROP TRIGGER "necessidade_registrar_historico" ON "necessidade_estoque";
DROP FUNCTION "registrar_historico_necessidade"();
DROP TABLE "historico_necessidade";

DROP TRIGGER "hospital_criar_necessidades" ON "hospital";
DROP FUNCTION "criar_necessidades_hospital"();

-- ---------------------------------------------------------------------------
-- 3. hospital -> hemocentro, sem geolocalização
-- ---------------------------------------------------------------------------
DROP INDEX "hospital_localizacao_idx";
ALTER TABLE "hospital"
    DROP CONSTRAINT "hospital_latitude_chk",
    DROP CONSTRAINT "hospital_longitude_chk",
    DROP COLUMN "localizacao",
    DROP COLUMN "latitude",
    DROP COLUMN "longitude";
-- A imagem postgis/postgis também cria estas extensões, que dependem do postgis.
DROP EXTENSION IF EXISTS "postgis_tiger_geocoder";
DROP EXTENSION IF EXISTS "postgis_topology";
DROP EXTENSION IF EXISTS "postgis";

ALTER TABLE "hospital" RENAME TO "hemocentro";
ALTER TABLE "hemocentro" RENAME CONSTRAINT "hospital_pkey" TO "hemocentro_pkey";
ALTER TABLE "hemocentro" RENAME CONSTRAINT "hospital_cnpj_formato_chk" TO "hemocentro_cnpj_formato_chk";
ALTER TABLE "hemocentro" RENAME CONSTRAINT "hospital_cep_formato_chk" TO "hemocentro_cep_formato_chk";
ALTER TABLE "hemocentro" RENAME CONSTRAINT "hospital_estado_chk" TO "hemocentro_estado_chk";
ALTER INDEX "hospital_cnpj_key" RENAME TO "hemocentro_cnpj_key";
ALTER INDEX "hospital_ativo_estado_idx" RENAME TO "hemocentro_ativo_estado_idx";

-- ---------------------------------------------------------------------------
-- 4. Equipe do hemocentro (substitui medico e representante_hospital)
-- ---------------------------------------------------------------------------
CREATE TYPE "papel_equipe" AS ENUM ('MEDICO', 'ADMIN_HEMOCENTRO');

CREATE TABLE "equipe_hemocentro" (
    "usuario_id" UUID NOT NULL,
    "hemocentro_id" UUID NOT NULL,
    "papel" "papel_equipe" NOT NULL,

    CONSTRAINT "equipe_hemocentro_pkey" PRIMARY KEY ("usuario_id")
);

CREATE INDEX "equipe_hemocentro_hemocentro_id_papel_idx" ON "equipe_hemocentro"("hemocentro_id", "papel");

ALTER TABLE "equipe_hemocentro" ADD CONSTRAINT "equipe_hemocentro_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipe_hemocentro" ADD CONSTRAINT "equipe_hemocentro_hemocentro_id_fkey" FOREIGN KEY ("hemocentro_id") REFERENCES "hemocentro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "equipe_hemocentro" ("usuario_id", "hemocentro_id", "papel")
SELECT "usuario_id", "hospital_id", 'MEDICO' FROM "medico";
INSERT INTO "equipe_hemocentro" ("usuario_id", "hemocentro_id", "papel")
SELECT "usuario_id", "hospital_id", 'ADMIN_HEMOCENTRO' FROM "representante_hospital";

-- ---------------------------------------------------------------------------
-- 5. Perfis: PACIENTE | EQUIPE | ADMIN_PLATAFORMA
-- ---------------------------------------------------------------------------
ALTER TYPE "perfil" RENAME TO "perfil_antigo";
CREATE TYPE "perfil" AS ENUM ('PACIENTE', 'EQUIPE', 'ADMIN_PLATAFORMA');
ALTER TABLE "usuario" ALTER COLUMN "perfil" TYPE "perfil" USING (
    CASE "perfil"::text
        WHEN 'PACIENTE' THEN 'PACIENTE'
        WHEN 'ADMINISTRADOR' THEN 'ADMIN_PLATAFORMA'
        ELSE 'EQUIPE'
    END
)::"perfil";
DROP TYPE "perfil_antigo";

-- RF16: depois da exclusão de dados o CPF é apagado.
ALTER TABLE "usuario" ALTER COLUMN "cpf" DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. Paciente: status da conta PENDENTE | ATIVA, sem dados de elegibilidade
-- ---------------------------------------------------------------------------
ALTER TABLE "paciente"
    ADD COLUMN "ativado_por" UUID,
    ADD COLUMN "ativado_em" TIMESTAMPTZ(3);
UPDATE "paciente"
   SET "ativado_por" = "medico_validador_id", "ativado_em" = "validado_em"
 WHERE "situacao" = 'APROVADO';

ALTER TABLE "paciente"
    DROP CONSTRAINT "paciente_aprovado_validado_chk",
    DROP CONSTRAINT "paciente_peso_chk",
    DROP CONSTRAINT "paciente_estado_chk";
DROP INDEX "paciente_situacao_estado_idx";
DROP INDEX "paciente_tipo_sanguineo_id_idx";
DROP INDEX "paciente_medico_validador_id_idx";

ALTER TYPE "situacao_paciente" RENAME TO "situacao_paciente_antiga";
CREATE TYPE "situacao_paciente" AS ENUM ('PENDENTE', 'ATIVA');
ALTER TABLE "paciente" ALTER COLUMN "situacao" DROP DEFAULT;
ALTER TABLE "paciente" ALTER COLUMN "situacao" TYPE "situacao_paciente" USING (
    CASE "situacao"::text WHEN 'APROVADO' THEN 'ATIVA' ELSE 'PENDENTE' END
)::"situacao_paciente";
ALTER TABLE "paciente" ALTER COLUMN "situacao" SET DEFAULT 'PENDENTE';
DROP TYPE "situacao_paciente_antiga";

ALTER TABLE "paciente"
    DROP COLUMN "medico_validador_id",
    DROP COLUMN "validado_em",
    DROP COLUMN "sexo",
    DROP COLUMN "peso_kg",
    DROP COLUMN "cidade",
    DROP COLUMN "estado",
    ALTER COLUMN "data_nascimento" DROP NOT NULL;
DROP TYPE "sexo";

CREATE INDEX "paciente_situacao_idx" ON "paciente"("situacao");
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_ativado_por_fkey" FOREIGN KEY ("ativado_por") REFERENCES "equipe_hemocentro"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Conta ATIVA exige tipo sanguíneo e o registro de quem ativou.
ALTER TABLE "paciente"
    ADD CONSTRAINT "paciente_ativa_chk" CHECK (
        "situacao" <> 'ATIVA'
        OR ("tipo_sanguineo_id" IS NOT NULL AND "ativado_por" IS NOT NULL AND "ativado_em" IS NOT NULL)
    );

DROP TABLE "medico";
DROP TABLE "representante_hospital";

-- ---------------------------------------------------------------------------
-- 7. Necessidades: URGENTE | NECESSARIO | ESTAVEL, só tipos informados
-- ---------------------------------------------------------------------------
ALTER TABLE "necessidade_estoque" DROP CONSTRAINT "necessidade_informada_chk";
DELETE FROM "necessidade_estoque" WHERE "nivel" = 'NAO_INFORMADO' OR "atualizado_por" IS NULL OR "atualizado_em" IS NULL;

ALTER TYPE "nivel_necessidade" RENAME TO "nivel_necessidade_antigo";
CREATE TYPE "nivel_necessidade" AS ENUM ('URGENTE', 'NECESSARIO', 'ESTAVEL');
ALTER TABLE "necessidade_estoque" ALTER COLUMN "nivel" DROP DEFAULT;
ALTER TABLE "necessidade_estoque" ALTER COLUMN "nivel" TYPE "nivel_necessidade" USING (
    CASE "nivel"::text
        WHEN 'CRITICO' THEN 'URGENTE'
        WHEN 'BAIXO' THEN 'NECESSARIO'
        ELSE 'ESTAVEL'
    END
)::"nivel_necessidade";
DROP TYPE "nivel_necessidade_antigo";

ALTER TABLE "necessidade_estoque" RENAME TO "necessidade";
ALTER TABLE "necessidade" RENAME COLUMN "hospital_id" TO "hemocentro_id";
ALTER TABLE "necessidade"
    ALTER COLUMN "atualizado_por" SET NOT NULL,
    ALTER COLUMN "atualizado_em" SET NOT NULL;
ALTER TABLE "necessidade" RENAME CONSTRAINT "necessidade_estoque_pkey" TO "necessidade_pkey";
ALTER TABLE "necessidade" RENAME CONSTRAINT "necessidade_estoque_hospital_id_fkey" TO "necessidade_hemocentro_id_fkey";
ALTER TABLE "necessidade" RENAME CONSTRAINT "necessidade_estoque_tipo_sanguineo_id_fkey" TO "necessidade_tipo_sanguineo_id_fkey";
ALTER TABLE "necessidade" RENAME CONSTRAINT "necessidade_estoque_atualizado_por_fkey" TO "necessidade_atualizado_por_fkey";
ALTER INDEX "necessidade_estoque_hospital_id_tipo_sanguineo_id_key" RENAME TO "necessidade_hemocentro_id_tipo_sanguineo_id_key";
ALTER INDEX "necessidade_estoque_tipo_sanguineo_id_nivel_idx" RENAME TO "necessidade_tipo_sanguineo_id_nivel_idx";

-- ---------------------------------------------------------------------------
-- 8. Horários com vagas, agendamentos e doações
-- ---------------------------------------------------------------------------
CREATE TYPE "status_agendamento" AS ENUM ('AGENDADO', 'CANCELADO', 'CONCLUIDO', 'AUSENTE');

CREATE TABLE "horario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hemocentro_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "hora_inicio" TIME(0) NOT NULL,
    "hora_fim" TIME(0) NOT NULL,
    "vagas_total" SMALLINT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "horario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agendamento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paciente_id" UUID NOT NULL,
    "horario_id" UUID NOT NULL,
    "status" "status_agendamento" NOT NULL DEFAULT 'AGENDADO',
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelado_em" TIMESTAMPTZ(3),
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "agendamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "doacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agendamento_id" UUID NOT NULL,
    "paciente_id" UUID NOT NULL,
    "hemocentro_id" UUID NOT NULL,
    "medico_id" UUID NOT NULL,
    "compareceu" BOOLEAN NOT NULL,
    "doou" BOOLEAN NOT NULL,
    "tipo_sanguineo_id" SMALLINT,
    "motivo_nao_doacao" VARCHAR(500),
    "observacoes" VARCHAR(2000),
    "registrado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auditoria" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" UUID NOT NULL,
    "acao" VARCHAR(50) NOT NULL,
    "entidade" VARCHAR(50) NOT NULL,
    "entidade_id" UUID,
    "hemocentro_id" UUID,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "horario_hemocentro_id_data_hora_inicio_key" ON "horario"("hemocentro_id", "data", "hora_inicio");
CREATE INDEX "horario_hemocentro_id_data_idx" ON "horario"("hemocentro_id", "data");
CREATE INDEX "agendamento_horario_id_status_idx" ON "agendamento"("horario_id", "status");
CREATE INDEX "agendamento_paciente_id_status_idx" ON "agendamento"("paciente_id", "status");
CREATE UNIQUE INDEX "doacao_agendamento_id_key" ON "doacao"("agendamento_id");
CREATE INDEX "doacao_paciente_id_registrado_em_idx" ON "doacao"("paciente_id", "registrado_em");
CREATE INDEX "doacao_hemocentro_id_registrado_em_idx" ON "doacao"("hemocentro_id", "registrado_em");
CREATE INDEX "auditoria_usuario_id_criado_em_idx" ON "auditoria"("usuario_id", "criado_em");
CREATE INDEX "auditoria_entidade_entidade_id_idx" ON "auditoria"("entidade", "entidade_id");

ALTER TABLE "horario" ADD CONSTRAINT "horario_hemocentro_id_fkey" FOREIGN KEY ("hemocentro_id") REFERENCES "hemocentro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_horario_id_fkey" FOREIGN KEY ("horario_id") REFERENCES "horario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doacao" ADD CONSTRAINT "doacao_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doacao" ADD CONSTRAINT "doacao_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doacao" ADD CONSTRAINT "doacao_hemocentro_id_fkey" FOREIGN KEY ("hemocentro_id") REFERENCES "hemocentro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doacao" ADD CONSTRAINT "doacao_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "equipe_hemocentro"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doacao" ADD CONSTRAINT "doacao_tipo_sanguineo_id_fkey" FOREIGN KEY ("tipo_sanguineo_id") REFERENCES "tipo_sanguineo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_hemocentro_id_fkey" FOREIGN KEY ("hemocentro_id") REFERENCES "hemocentro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RF08/RF09
ALTER TABLE "horario"
    ADD CONSTRAINT "horario_vagas_chk" CHECK ("vagas_total" BETWEEN 1 AND 500),
    ADD CONSTRAINT "horario_periodo_chk" CHECK ("hora_fim" > "hora_inicio");

-- RF09: um paciente não tem dois agendamentos ativos no mesmo horário.
CREATE UNIQUE INDEX "agendamento_paciente_horario_ativo_key"
    ON "agendamento"("paciente_id", "horario_id") WHERE "status" = 'AGENDADO';

-- RF11: só doa quem compareceu; quem não doou informa o motivo.
ALTER TABLE "doacao"
    ADD CONSTRAINT "doacao_doou_compareceu_chk" CHECK (NOT "doou" OR "compareceu"),
    ADD CONSTRAINT "doacao_motivo_chk" CHECK ("doou" OR NOT "compareceu" OR "motivo_nao_doacao" IS NOT NULL);
