-- HemoBridge: estrutura completa para um banco PostgreSQL vazio.
-- Em atualizações, utilize a cadeia versionada de migrações.
-- Não contém pessoas, hospitais, credenciais ou massa de teste.
BEGIN;

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "perfil" AS ENUM ('PACIENTE', 'MEDICO', 'REPRESENTANTE', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "status_usuario" AS ENUM ('ATIVO', 'INATIVO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "sexo" AS ENUM ('MASCULINO', 'FEMININO');

-- CreateEnum
CREATE TYPE "situacao_paciente" AS ENUM ('PRE_CADASTRADO', 'CONSULTA_AGENDADA', 'AGUARDANDO_EXAME', 'EM_ANALISE', 'APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "grupo_abo" AS ENUM ('A', 'B', 'AB', 'O');

-- CreateEnum
CREATE TYPE "fator_rh" AS ENUM ('POSITIVO', 'NEGATIVO');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "cpf" CHAR(11) NOT NULL,
    "telefone" VARCHAR(20),
    "senha_hash" TEXT NOT NULL,
    "senha_provisoria" BOOLEAN NOT NULL DEFAULT false,
    "senha_provisoria_expira_em" TIMESTAMPTZ(3),
    "senha_reset_token_hash" TEXT,
    "senha_reset_expira_em" TIMESTAMPTZ(3),
    "senha_reset_usado_em" TIMESTAMPTZ(3),
    "perfil" "perfil" NOT NULL,
    "status" "status_usuario" NOT NULL DEFAULT 'ATIVO',
    "tentativas_login" SMALLINT NOT NULL DEFAULT 0,
    "bloqueado_ate" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paciente" (
    "usuario_id" UUID NOT NULL,
    "data_nascimento" DATE NOT NULL,
    "sexo" "sexo" NOT NULL,
    "peso_kg" DECIMAL(5,2) NOT NULL,
    "cidade" VARCHAR(100) NOT NULL,
    "estado" CHAR(2) NOT NULL,
    "situacao" "situacao_paciente" NOT NULL DEFAULT 'PRE_CADASTRADO',
    "tipo_sanguineo_id" SMALLINT,
    "medico_validador_id" UUID,
    "validado_em" TIMESTAMPTZ(3),

    CONSTRAINT "paciente_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "medico" (
    "usuario_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "crm" VARCHAR(10) NOT NULL,
    "uf_crm" CHAR(2) NOT NULL,

    CONSTRAINT "medico_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "representante_hospital" (
    "usuario_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "cargo" VARCHAR(100),

    CONSTRAINT "representante_hospital_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "tipo_sanguineo" (
    "id" SMALLSERIAL NOT NULL,
    "sigla" VARCHAR(3) NOT NULL,
    "grupo_abo" "grupo_abo" NOT NULL,
    "fator_rh" "fator_rh" NOT NULL,

    CONSTRAINT "tipo_sanguineo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compatibilidade_sanguinea" (
    "tipo_doador_id" SMALLINT NOT NULL,
    "tipo_receptor_id" SMALLINT NOT NULL,

    CONSTRAINT "compatibilidade_sanguinea_pkey" PRIMARY KEY ("tipo_doador_id","tipo_receptor_id")
);

-- CreateTable
CREATE TABLE "hospital" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(150) NOT NULL,
    "cnpj" CHAR(14) NOT NULL,
    "endereco" VARCHAR(255) NOT NULL,
    "cidade" VARCHAR(100) NOT NULL,
    "estado" CHAR(2) NOT NULL,
    "cep" CHAR(8) NOT NULL,
    "telefone" VARCHAR(20),
    "horario_funcionamento" VARCHAR(255),
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "localizacao" geography(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("longitude"::double precision, "latitude"::double precision), 4326)::geography) STORED,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hospital_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_cpf_key" ON "usuario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_senha_reset_token_hash_key" ON "usuario"("senha_reset_token_hash");

-- CreateIndex
CREATE INDEX "usuario_perfil_status_idx" ON "usuario"("perfil", "status");

-- CreateIndex
CREATE INDEX "paciente_situacao_estado_idx" ON "paciente"("situacao", "estado");

-- CreateIndex
CREATE INDEX "paciente_tipo_sanguineo_id_idx" ON "paciente"("tipo_sanguineo_id");

-- CreateIndex
CREATE INDEX "paciente_medico_validador_id_idx" ON "paciente"("medico_validador_id");

-- CreateIndex
CREATE INDEX "medico_hospital_id_idx" ON "medico"("hospital_id");

-- CreateIndex
CREATE UNIQUE INDEX "medico_crm_uf_crm_key" ON "medico"("crm", "uf_crm");

-- CreateIndex
CREATE INDEX "representante_hospital_hospital_id_idx" ON "representante_hospital"("hospital_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_sanguineo_sigla_key" ON "tipo_sanguineo"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_sanguineo_grupo_abo_fator_rh_key" ON "tipo_sanguineo"("grupo_abo", "fator_rh");

-- CreateIndex
CREATE INDEX "compatibilidade_sanguinea_tipo_receptor_id_idx" ON "compatibilidade_sanguinea"("tipo_receptor_id");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_cnpj_key" ON "hospital"("cnpj");

-- CreateIndex
CREATE INDEX "hospital_ativo_estado_idx" ON "hospital"("ativo", "estado");

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_tipo_sanguineo_id_fkey" FOREIGN KEY ("tipo_sanguineo_id") REFERENCES "tipo_sanguineo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_medico_validador_id_fkey" FOREIGN KEY ("medico_validador_id") REFERENCES "medico"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medico" ADD CONSTRAINT "medico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medico" ADD CONSTRAINT "medico_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representante_hospital" ADD CONSTRAINT "representante_hospital_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representante_hospital" ADD CONSTRAINT "representante_hospital_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibilidade_sanguinea" ADD CONSTRAINT "compatibilidade_sanguinea_tipo_doador_id_fkey" FOREIGN KEY ("tipo_doador_id") REFERENCES "tipo_sanguineo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibilidade_sanguinea" ADD CONSTRAINT "compatibilidade_sanguinea_tipo_receptor_id_fkey" FOREIGN KEY ("tipo_receptor_id") REFERENCES "tipo_sanguineo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Regras que o Prisma não expressa no schema (Quadro 38 do projeto lógico)
-- ---------------------------------------------------------------------------

-- RF22: busca e ordenação por proximidade
CREATE INDEX "hospital_localizacao_idx" ON "hospital" USING GIST ("localizacao");

-- RN06: CPF com 11 dígitos (dígitos verificadores são validados na aplicação)
ALTER TABLE "usuario"
    ADD CONSTRAINT "usuario_cpf_formato_chk" CHECK ("cpf" ~ '^[0-9]{11}$'),
    ADD CONSTRAINT "usuario_email_minusculo_chk" CHECK ("email" = lower("email")),
    ADD CONSTRAINT "usuario_tentativas_login_chk" CHECK ("tentativas_login" >= 0);

-- RN01/RN10: paciente APROVADO exige tipagem validada por médico
ALTER TABLE "paciente"
    ADD CONSTRAINT "paciente_aprovado_validado_chk" CHECK (
        "situacao" <> 'APROVADO'
        OR ("tipo_sanguineo_id" IS NOT NULL AND "medico_validador_id" IS NOT NULL AND "validado_em" IS NOT NULL)
    ),
    ADD CONSTRAINT "paciente_peso_chk" CHECK ("peso_kg" > 0),
    ADD CONSTRAINT "paciente_estado_chk" CHECK ("estado" ~ '^[A-Z]{2}$');

ALTER TABLE "medico"
    ADD CONSTRAINT "medico_uf_crm_chk" CHECK ("uf_crm" ~ '^[A-Z]{2}$');

ALTER TABLE "hospital"
    ADD CONSTRAINT "hospital_cnpj_formato_chk" CHECK ("cnpj" ~ '^[0-9]{14}$'),
    ADD CONSTRAINT "hospital_cep_formato_chk" CHECK ("cep" ~ '^[0-9]{8}$'),
    ADD CONSTRAINT "hospital_estado_chk" CHECK ("estado" ~ '^[A-Z]{2}$'),
    ADD CONSTRAINT "hospital_latitude_chk" CHECK ("latitude" BETWEEN -90 AND 90),
    ADD CONSTRAINT "hospital_longitude_chk" CHECK ("longitude" BETWEEN -180 AND 180);


-- CreateTable
CREATE TABLE "consentimento_lgpd" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "versao_termo" VARCHAR(20) NOT NULL,
    "finalidade" VARCHAR(255) NOT NULL,
    "aceito_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_origem" INET,
    "revogado_em" TIMESTAMPTZ(3),

    CONSTRAINT "consentimento_lgpd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consentimento_lgpd_usuario_id_idx" ON "consentimento_lgpd"("usuario_id");

-- AddForeignKey
ALTER TABLE "consentimento_lgpd" ADD CONSTRAINT "consentimento_lgpd_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "versao_sessao" INTEGER NOT NULL DEFAULT 0;


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


/*
  Warnings:

  - Added the required column `crm_conferido_por` to the `medico` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "medico" ADD COLUMN     "crm_conferido_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "crm_conferido_por" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "medico" ADD CONSTRAINT "medico_crm_conferido_por_fkey" FOREIGN KEY ("crm_conferido_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


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


-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- CreateEnum
CREATE TYPE "situacao_consulta" AS ENUM ('AGENDADA', 'REALIZADA', 'NAO_COMPARECEU', 'CANCELADA');

-- CreateEnum
CREATE TYPE "situacao_exame" AS ENUM ('AGUARDANDO_RESULTADO', 'EM_ANALISE', 'REPROVADO', 'VALIDADO');

-- CreateEnum
CREATE TYPE "resultado_pre_triagem" AS ENUM ('APTO_CRITERIOS_BASICOS', 'AGUARDAR_INTERVALO', 'REQUER_CONFIRMACAO');

-- CreateEnum
CREATE TYPE "status_solicitacao_exclusao" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'RECUSADA');

-- CreateTable
CREATE TABLE "solicitacao_exclusao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "status" "status_solicitacao_exclusao" NOT NULL DEFAULT 'PENDENTE',
    "solicitado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendido_por" UUID,
    "concluido_em" TIMESTAMPTZ(3),
    "justificativa" VARCHAR(1000),

    CONSTRAINT "solicitacao_exclusao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" UUID,
    "acao" VARCHAR(60) NOT NULL,
    "entidade" VARCHAR(60) NOT NULL,
    "entidade_id" VARCHAR(64),
    "ip_origem" INET,
    "detalhes" JSONB,
    "ocorrido_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_triagem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paciente_id" UUID NOT NULL,
    "resultado" "resultado_pre_triagem" NOT NULL,
    "respondida_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proxima_data_possivel" DATE,

    CONSTRAINT "pre_triagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resposta_pre_triagem" (
    "id" BIGSERIAL NOT NULL,
    "pre_triagem_id" UUID NOT NULL,
    "pergunta" VARCHAR(255) NOT NULL,
    "resposta" VARCHAR(255) NOT NULL,

    CONSTRAINT "resposta_pre_triagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilidade_medico" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medico_id" UUID NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fim" TIMESTAMPTZ(3) NOT NULL,
    "link_videochamada" VARCHAR(500) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disponibilidade_medico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consulta" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paciente_id" UUID NOT NULL,
    "medico_id" UUID NOT NULL,
    "disponibilidade_id" UUID NOT NULL,
    "consulta_origem_id" UUID,
    "status" "situacao_consulta" NOT NULL DEFAULT 'AGENDADA',
    "link_videochamada" VARCHAR(500) NOT NULL,
    "termo_telemedicina_aceito_em" TIMESTAMPTZ(3) NOT NULL,
    "observacoes" TEXT,
    "motivo_cancelamento" VARCHAR(500),
    "cancelada_por" UUID,
    "cancelada_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacao_exame" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "consulta_id" UUID NOT NULL,
    "descricao" VARCHAR(1000) NOT NULL,
    "orientacoes" VARCHAR(2000),
    "solicitado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitacao_exame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exame" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_exame_id" UUID NOT NULL,
    "situacao" "situacao_exame" NOT NULL DEFAULT 'EM_ANALISE',
    "chave_armazenamento" VARCHAR(255) NOT NULL,
    "nome_original" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "hash_sha256" CHAR(64) NOT NULL,
    "enviado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "medico_avaliador_id" UUID,
    "motivo_reprovacao" VARCHAR(1000),
    "avaliado_em" TIMESTAMPTZ(3),

    CONSTRAINT "exame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "paciente_id" UUID,
    "tipo_sanguineo_id" SMALLINT NOT NULL,
    "data_coleta" DATE NOT NULL,
    "peso_aferido" DECIMAL(5,2),
    "registrado_por" UUID NOT NULL,
    "registrada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "necessidade_id" UUID,
    "titulo" VARCHAR(150) NOT NULL,
    "mensagem" VARCHAR(2000) NOT NULL,
    "link" VARCHAR(255),
    "enviada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lida_em" TIMESTAMPTZ(3),
    "email_solicitado" BOOLEAN NOT NULL DEFAULT false,
    "email_enviado_em" TIMESTAMPTZ(3),
    "email_tentativas" SMALLINT NOT NULL DEFAULT 0,
    "email_ultimo_erro" VARCHAR(500),

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitacao_exclusao_usuario_id_idx" ON "solicitacao_exclusao"("usuario_id");

-- CreateIndex
CREATE INDEX "solicitacao_exclusao_status_solicitado_em_idx" ON "solicitacao_exclusao"("status", "solicitado_em");

-- CreateIndex
CREATE INDEX "log_auditoria_usuario_id_ocorrido_em_idx" ON "log_auditoria"("usuario_id", "ocorrido_em");

-- CreateIndex
CREATE INDEX "log_auditoria_entidade_entidade_id_idx" ON "log_auditoria"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "log_auditoria_ocorrido_em_idx" ON "log_auditoria"("ocorrido_em");

-- CreateIndex
CREATE INDEX "pre_triagem_paciente_id_respondida_em_idx" ON "pre_triagem"("paciente_id", "respondida_em");

-- CreateIndex
CREATE INDEX "resposta_pre_triagem_pre_triagem_id_idx" ON "resposta_pre_triagem"("pre_triagem_id");

-- CreateIndex
CREATE INDEX "disponibilidade_medico_inicio_idx" ON "disponibilidade_medico"("inicio");

-- CreateIndex
CREATE UNIQUE INDEX "disponibilidade_medico_medico_id_inicio_fim_key" ON "disponibilidade_medico"("medico_id", "inicio", "fim");

-- CreateIndex
CREATE INDEX "consulta_paciente_id_status_idx" ON "consulta"("paciente_id", "status");

-- CreateIndex
CREATE INDEX "consulta_medico_id_status_idx" ON "consulta"("medico_id", "status");

-- CreateIndex
CREATE INDEX "consulta_disponibilidade_id_idx" ON "consulta"("disponibilidade_id");

-- CreateIndex
CREATE INDEX "solicitacao_exame_consulta_id_idx" ON "solicitacao_exame"("consulta_id");

-- CreateIndex
CREATE UNIQUE INDEX "exame_chave_armazenamento_key" ON "exame"("chave_armazenamento");

-- CreateIndex
CREATE INDEX "exame_solicitacao_exame_id_enviado_em_idx" ON "exame"("solicitacao_exame_id", "enviado_em");

-- CreateIndex
CREATE INDEX "exame_situacao_idx" ON "exame"("situacao");

-- CreateIndex
CREATE INDEX "doacao_hospital_id_data_coleta_idx" ON "doacao"("hospital_id", "data_coleta");

-- CreateIndex
CREATE INDEX "doacao_paciente_id_data_coleta_idx" ON "doacao"("paciente_id", "data_coleta");

-- CreateIndex
CREATE INDEX "doacao_tipo_sanguineo_id_idx" ON "doacao"("tipo_sanguineo_id");

-- CreateIndex
CREATE INDEX "doacao_data_coleta_idx" ON "doacao"("data_coleta");

-- CreateIndex
CREATE INDEX "notificacao_usuario_id_enviada_em_idx" ON "notificacao"("usuario_id", "enviada_em");

-- CreateIndex
CREATE INDEX "notificacao_usuario_id_lida_em_idx" ON "notificacao"("usuario_id", "lida_em");

-- CreateIndex
CREATE INDEX "notificacao_necessidade_id_enviada_em_idx" ON "notificacao"("necessidade_id", "enviada_em");

-- AddForeignKey
ALTER TABLE "solicitacao_exclusao" ADD CONSTRAINT "solicitacao_exclusao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_exclusao" ADD CONSTRAINT "solicitacao_exclusao_atendido_por_fkey" FOREIGN KEY ("atendido_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_triagem" ADD CONSTRAINT "pre_triagem_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resposta_pre_triagem" ADD CONSTRAINT "resposta_pre_triagem_pre_triagem_id_fkey" FOREIGN KEY ("pre_triagem_id") REFERENCES "pre_triagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilidade_medico" ADD CONSTRAINT "disponibilidade_medico_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "medico"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta" ADD CONSTRAINT "consulta_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta" ADD CONSTRAINT "consulta_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "medico"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta" ADD CONSTRAINT "consulta_disponibilidade_id_fkey" FOREIGN KEY ("disponibilidade_id") REFERENCES "disponibilidade_medico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta" ADD CONSTRAINT "consulta_consulta_origem_id_fkey" FOREIGN KEY ("consulta_origem_id") REFERENCES "consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta" ADD CONSTRAINT "consulta_cancelada_por_fkey" FOREIGN KEY ("cancelada_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_exame" ADD CONSTRAINT "solicitacao_exame_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exame" ADD CONSTRAINT "exame_solicitacao_exame_id_fkey" FOREIGN KEY ("solicitacao_exame_id") REFERENCES "solicitacao_exame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exame" ADD CONSTRAINT "exame_medico_avaliador_id_fkey" FOREIGN KEY ("medico_avaliador_id") REFERENCES "medico"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doacao" ADD CONSTRAINT "doacao_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doacao" ADD CONSTRAINT "doacao_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doacao" ADD CONSTRAINT "doacao_tipo_sanguineo_id_fkey" FOREIGN KEY ("tipo_sanguineo_id") REFERENCES "tipo_sanguineo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doacao" ADD CONSTRAINT "doacao_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_necessidade_id_fkey" FOREIGN KEY ("necessidade_id") REFERENCES "necessidade_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Regras que o Prisma não expressa no schema (Quadro 38 do projeto lógico).
-- Unicidades condicionais usam EXCLUDE para não aparecerem como drift no
-- `prisma migrate dev`.
-- ---------------------------------------------------------------------------

-- RNF05: log de auditoria somente inclusão.
CREATE FUNCTION "log_auditoria_somente_inclusao"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'log_auditoria é somente inclusão (RNF05)'
        USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "log_auditoria_bloquear_alteracao"
    BEFORE UPDATE OR DELETE ON "log_auditoria"
    FOR EACH ROW EXECUTE FUNCTION "log_auditoria_somente_inclusao"();

CREATE TRIGGER "log_auditoria_bloquear_truncate"
    BEFORE TRUNCATE ON "log_auditoria"
    FOR EACH STATEMENT EXECUTE FUNCTION "log_auditoria_somente_inclusao"();

ALTER TABLE "log_auditoria"
    ADD CONSTRAINT "log_auditoria_acao_chk" CHECK (length(trim("acao")) > 0),
    ADD CONSTRAINT "log_auditoria_entidade_chk" CHECK (length(trim("entidade")) > 0);

-- RN13: pedido concluído ou recusado tem responsável e data.
ALTER TABLE "solicitacao_exclusao"
    ADD CONSTRAINT "solicitacao_exclusao_atendida_chk" CHECK (
        "status" IN ('PENDENTE', 'EM_ANDAMENTO')
        OR ("atendido_por" IS NOT NULL AND "concluido_em" IS NOT NULL)
    ),
    ADD CONSTRAINT "solicitacao_exclusao_recusa_justificada_chk" CHECK (
        "status" <> 'RECUSADA' OR length(trim(coalesce("justificativa", ''))) > 0
    );

-- RF28: "Aguardar intervalo" informa a próxima data estimada.
ALTER TABLE "pre_triagem"
    ADD CONSTRAINT "pre_triagem_proxima_data_chk" CHECK (
        "resultado" <> 'AGUARDAR_INTERVALO' OR "proxima_data_possivel" IS NOT NULL
    );

-- UC13 FE01 / FE03 / RN18: intervalo válido, link https e sem sobreposição
-- entre horários do mesmo médico.
ALTER TABLE "disponibilidade_medico"
    ADD CONSTRAINT "disponibilidade_intervalo_chk" CHECK ("fim" > "inicio"),
    ADD CONSTRAINT "disponibilidade_link_https_chk" CHECK ("link_videochamada" ~* '^https://[^[:space:]]+$'),
    ADD CONSTRAINT "disponibilidade_sem_sobreposicao" EXCLUDE USING gist (
        "medico_id" WITH =,
        tstzrange("inicio", "fim", '[)') WITH &&
    );

-- RN18: cada horário comporta uma única consulta ativa e o paciente tem no
-- máximo uma consulta futura agendada. Canceladas ficam no histórico.
ALTER TABLE "consulta"
    ADD CONSTRAINT "consulta_disponibilidade_ativa_excl" EXCLUDE USING btree (
        "disponibilidade_id" WITH =
    ) WHERE ("status" = 'AGENDADA'),
    ADD CONSTRAINT "consulta_paciente_agendada_excl" EXCLUDE USING btree (
        "paciente_id" WITH =
    ) WHERE ("status" = 'AGENDADA'),
    ADD CONSTRAINT "consulta_link_https_chk" CHECK ("link_videochamada" ~* '^https://[^[:space:]]+$'),
    ADD CONSTRAINT "consulta_cancelada_chk" CHECK (
        "status" <> 'CANCELADA' OR "cancelada_em" IS NOT NULL
    ),
    ADD CONSTRAINT "consulta_origem_diferente_chk" CHECK ("consulta_origem_id" IS DISTINCT FROM "id");

-- A consulta pertence ao mesmo médico do horário reservado.
CREATE FUNCTION "validar_consulta_medico"() RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "disponibilidade_medico" d
         WHERE d."id" = NEW."disponibilidade_id" AND d."medico_id" = NEW."medico_id"
    ) THEN
        RAISE EXCEPTION 'A disponibilidade informada não pertence ao médico da consulta'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "consulta_validar_medico"
    BEFORE INSERT OR UPDATE OF "disponibilidade_id", "medico_id" ON "consulta"
    FOR EACH ROW EXECUTE FUNCTION "validar_consulta_medico"();

-- UC15 FE01: ao menos um exame informado.
ALTER TABLE "solicitacao_exame"
    ADD CONSTRAINT "solicitacao_exame_descricao_chk" CHECK (length(trim("descricao")) > 0);

-- RN19 / UC16: formato, tamanho, hash e avaliação coerente.
ALTER TABLE "exame"
    ADD CONSTRAINT "exame_mime_type_chk" CHECK ("mime_type" IN ('application/pdf', 'image/jpeg', 'image/png')),
    ADD CONSTRAINT "exame_tamanho_chk" CHECK ("tamanho_bytes" BETWEEN 1 AND 5242880),
    ADD CONSTRAINT "exame_hash_chk" CHECK ("hash_sha256" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "exame_situacao_envio_chk" CHECK ("situacao" <> 'AGUARDANDO_RESULTADO'),
    ADD CONSTRAINT "exame_avaliado_chk" CHECK (
        "situacao" NOT IN ('REPROVADO', 'VALIDADO')
        OR ("medico_avaliador_id" IS NOT NULL AND "avaliado_em" IS NOT NULL)
    ),
    ADD CONSTRAINT "exame_reprovado_motivo_chk" CHECK (
        "situacao" <> 'REPROVADO' OR length(trim(coalesce("motivo_reprovacao", ''))) > 0
    );

-- UC20 / UC21: doação vinculada exige peso aferido.
ALTER TABLE "doacao"
    ADD CONSTRAINT "doacao_peso_chk" CHECK ("peso_aferido" IS NULL OR "peso_aferido" > 0),
    ADD CONSTRAINT "doacao_vinculada_peso_chk" CHECK ("paciente_id" IS NULL OR "peso_aferido" IS NOT NULL);

-- Quadro 38 / UC20: data não futura, doação vinculada só de Paciente APROVADO
-- com o mesmo tipo validado, e registrada por representante do próprio hospital.
CREATE FUNCTION "validar_doacao"() RETURNS trigger AS $$
DECLARE
    v_situacao "situacao_paciente";
    v_tipo SMALLINT;
BEGIN
    IF NEW."data_coleta" > (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
        RAISE EXCEPTION 'A data da coleta não pode ser futura' USING ERRCODE = 'check_violation';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "representante_hospital" r
         WHERE r."usuario_id" = NEW."registrado_por" AND r."hospital_id" = NEW."hospital_id"
    ) THEN
        RAISE EXCEPTION 'A doação deve ser registrada por representante do próprio hospital'
            USING ERRCODE = 'check_violation';
    END IF;

    IF NEW."paciente_id" IS NOT NULL THEN
        SELECT p."situacao", p."tipo_sanguineo_id" INTO v_situacao, v_tipo
          FROM "paciente" p WHERE p."usuario_id" = NEW."paciente_id";
        IF v_situacao IS DISTINCT FROM 'APROVADO' THEN
            RAISE EXCEPTION 'Doação vinculada exige Paciente APROVADO' USING ERRCODE = 'check_violation';
        END IF;
        IF v_tipo IS DISTINCT FROM NEW."tipo_sanguineo_id" THEN
            RAISE EXCEPTION 'O tipo sanguíneo da doação difere do tipo validado do doador'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "doacao_validar"
    BEFORE INSERT OR UPDATE ON "doacao"
    FOR EACH ROW EXECUTE FUNCTION "validar_doacao"();

-- UC19 FE02: e-mail só consta como enviado se foi solicitado.
ALTER TABLE "notificacao"
    ADD CONSTRAINT "notificacao_email_chk" CHECK ("email_enviado_em" IS NULL OR "email_solicitado"),
    ADD CONSTRAINT "notificacao_tentativas_chk" CHECK ("email_tentativas" >= 0);


--  / RNF08 / Seção 9.2.4: índices das consultas públicas e dos filtros.
-- Índices de expressão e parciais ficam só no SQL (o Prisma não os representa).

-- unaccent() não é IMMUTABLE e não pode ser usado em índice; este invólucro
-- fixa o dicionário e pode.
CREATE OR REPLACE FUNCTION "f_unaccent"(text) RETURNS text AS $$
    SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- UC03: filtro por estado e cidade, sem acento e sem diferenciar maiúsculas.
CREATE INDEX "hospital_ativo_estado_cidade_idx"
    ON "hospital" ("estado", "f_unaccent"(lower("cidade")))
    WHERE "ativo";

-- UC17/UC19: doadores aprovados por estado e tipo sanguíneo.
CREATE INDEX "paciente_aprovado_estado_tipo_idx"
    ON "paciente" ("estado", "tipo_sanguineo_id")
    WHERE "situacao" = 'APROVADO';

-- UC12: contador de notificações não lidas.
CREATE INDEX "notificacao_nao_lidas_idx"
    ON "notificacao" ("usuario_id")
    WHERE "lida_em" IS NULL;

-- UC09/UC10: horários por médico já usam o índice único (medico_id, inicio, fim).


-- CreateEnum
CREATE TYPE "tipo_publicacao" AS ENUM ('COMUM', 'AVISO_CRITICO');

-- CreateEnum
CREATE TYPE "tema_comunidade" AS ENUM ('DOACAO', 'SAUDE', 'AVISO_INSTITUCIONAL');

-- CreateEnum
CREATE TYPE "status_conteudo" AS ENUM ('PUBLICADO', 'OCULTO');

-- CreateEnum
CREATE TYPE "status_bolsa" AS ENUM ('QUARENTENA', 'DISPONIVEL', 'RESERVADA', 'UTILIZADA', 'DESCARTADA');

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "normas_comunidade_aceitas_em" TIMESTAMPTZ(3),
ADD COLUMN     "normas_comunidade_versao" VARCHAR(20);

-- AlterTable
ALTER TABLE "disponibilidade_medico" ADD COLUMN     "hospital_id" UUID;

-- AlterTable
ALTER TABLE "hospital" ADD COLUMN     "fonte_verificacao" VARCHAR(500),
ADD COLUMN     "verificado_em" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "publicacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "autor_id" UUID NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "texto" VARCHAR(2000) NOT NULL,
    "tema" "tema_comunidade" NOT NULL,
    "tipo" "tipo_publicacao" NOT NULL DEFAULT 'COMUM',
    "status" "status_conteudo" NOT NULL DEFAULT 'PUBLICADO',
    "fixada_ate" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "publicacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publicacao_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "texto" VARCHAR(2000) NOT NULL,
    "status" "status_conteudo" NOT NULL DEFAULT 'PUBLICADO',
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reacao_publicacao" (
    "publicacao_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reacao_publicacao_pkey" PRIMARY KEY ("publicacao_id","usuario_id")
);

-- CreateTable
CREATE TABLE "denuncia_publicacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publicacao_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "motivo" VARCHAR(500) NOT NULL,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "denuncia_publicacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medico_hospital" (
    "medico_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "medico_hospital_pkey" PRIMARY KEY ("medico_id","hospital_id")
);

-- CreateTable
CREATE TABLE "bolsa_sangue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "tipo_sanguineo_id" SMALLINT NOT NULL,
    "codigo" VARCHAR(100) NOT NULL,
    "componente" VARCHAR(80) NOT NULL,
    "coletada_em" TIMESTAMPTZ(3) NOT NULL,
    "validade_em" TIMESTAMPTZ(3) NOT NULL,
    "status" "status_bolsa" NOT NULL DEFAULT 'QUARENTENA',
    "liberacao_referencia" VARCHAR(200),
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizada_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bolsa_sangue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimento_estoque" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bolsa_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "anterior" "status_bolsa",
    "atual" "status_bolsa" NOT NULL,
    "motivo" VARCHAR(500) NOT NULL,
    "ocorrido_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimento_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimativa_etapa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "etapa" VARCHAR(40) NOT NULL,
    "minutos" INTEGER NOT NULL,
    "fonte" VARCHAR(500) NOT NULL,
    "atualizada_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "estimativa_etapa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publicacao_status_criado_em_id_idx" ON "publicacao"("status", "criado_em", "id");

-- CreateIndex
CREATE INDEX "publicacao_autor_id_idx" ON "publicacao"("autor_id");

-- CreateIndex
CREATE INDEX "comentario_publicacao_id_status_criado_em_id_idx" ON "comentario"("publicacao_id", "status", "criado_em", "id");

-- CreateIndex
CREATE INDEX "comentario_autor_id_idx" ON "comentario"("autor_id");

-- CreateIndex
CREATE INDEX "reacao_publicacao_usuario_id_idx" ON "reacao_publicacao"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "denuncia_publicacao_publicacao_id_usuario_id_key" ON "denuncia_publicacao"("publicacao_id", "usuario_id");

-- CreateIndex
CREATE INDEX "medico_hospital_hospital_id_ativo_idx" ON "medico_hospital"("hospital_id", "ativo");

-- CreateIndex
CREATE INDEX "bolsa_sangue_hospital_id_status_tipo_sanguineo_id_validade__idx" ON "bolsa_sangue"("hospital_id", "status", "tipo_sanguineo_id", "validade_em");

-- CreateIndex
CREATE UNIQUE INDEX "bolsa_sangue_hospital_id_codigo_key" ON "bolsa_sangue"("hospital_id", "codigo");

-- CreateIndex
CREATE INDEX "movimento_estoque_bolsa_id_ocorrido_em_idx" ON "movimento_estoque"("bolsa_id", "ocorrido_em");

-- CreateIndex
CREATE UNIQUE INDEX "estimativa_etapa_hospital_id_etapa_key" ON "estimativa_etapa"("hospital_id", "etapa");

-- AddForeignKey
ALTER TABLE "disponibilidade_medico" ADD CONSTRAINT "disponibilidade_medico_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacao" ADD CONSTRAINT "publicacao_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentario" ADD CONSTRAINT "comentario_publicacao_id_fkey" FOREIGN KEY ("publicacao_id") REFERENCES "publicacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentario" ADD CONSTRAINT "comentario_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reacao_publicacao" ADD CONSTRAINT "reacao_publicacao_publicacao_id_fkey" FOREIGN KEY ("publicacao_id") REFERENCES "publicacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reacao_publicacao" ADD CONSTRAINT "reacao_publicacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denuncia_publicacao" ADD CONSTRAINT "denuncia_publicacao_publicacao_id_fkey" FOREIGN KEY ("publicacao_id") REFERENCES "publicacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denuncia_publicacao" ADD CONSTRAINT "denuncia_publicacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medico_hospital" ADD CONSTRAINT "medico_hospital_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "medico"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medico_hospital" ADD CONSTRAINT "medico_hospital_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolsa_sangue" ADD CONSTRAINT "bolsa_sangue_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolsa_sangue" ADD CONSTRAINT "bolsa_sangue_tipo_sanguineo_id_fkey" FOREIGN KEY ("tipo_sanguineo_id") REFERENCES "tipo_sanguineo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_bolsa_id_fkey" FOREIGN KEY ("bolsa_id") REFERENCES "bolsa_sangue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimativa_etapa" ADD CONSTRAINT "estimativa_etapa_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE publicacao ADD CONSTRAINT publicacao_texto_valido CHECK (length(trim(titulo)) BETWEEN 8 AND 120 AND length(trim(texto)) BETWEEN 20 AND 2000),
  ADD CONSTRAINT publicacao_fixacao_valida CHECK ((tipo='COMUM' AND fixada_ate IS NULL) OR (tipo='AVISO_CRITICO' AND tema='AVISO_INSTITUCIONAL' AND fixada_ate IS NOT NULL AND fixada_ate>criado_em AND fixada_ate<=criado_em+interval '7 days'));
ALTER TABLE comentario ADD CONSTRAINT comentario_texto_valido CHECK (length(trim(texto)) BETWEEN 1 AND 2000);
ALTER TABLE hospital ADD CONSTRAINT hospital_verificacao_completa CHECK ((verificado_em IS NULL AND fonte_verificacao IS NULL) OR (verificado_em IS NOT NULL AND length(trim(fonte_verificacao))>=10));
ALTER TABLE estimativa_etapa ADD CONSTRAINT estimativa_minutos_positivos CHECK (minutos>0 AND minutos<=100000);
ALTER TABLE bolsa_sangue ADD CONSTRAINT bolsa_datas_validas CHECK (validade_em>coletada_em),
  ADD CONSTRAINT bolsa_liberacao_obrigatoria CHECK (status IN ('QUARENTENA','DESCARTADA') OR length(trim(coalesce(liberacao_referencia,'')))>=3);

INSERT INTO medico_hospital(medico_id,hospital_id,ativo) SELECT usuario_id,hospital_id,true FROM medico ON CONFLICT DO NOTHING;
UPDATE disponibilidade_medico d SET hospital_id=m.hospital_id FROM medico m WHERE d.medico_id=m.usuario_id AND d.hospital_id IS NULL;

CREATE FUNCTION validar_publicacao_critica() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo='AVISO_CRITICO' AND NOT EXISTS(SELECT 1 FROM usuario u JOIN representante_hospital r ON r.usuario_id=u.id JOIN hospital h ON h.id=r.hospital_id WHERE u.id=NEW.autor_id AND u.perfil='REPRESENTANTE' AND u.status='ATIVO' AND h.ativo AND h.verificado_em IS NOT NULL) THEN
    RAISE EXCEPTION 'Avisos críticos exigem uma instituição verificada e um representante ativo' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM usuario u WHERE u.id=NEW.autor_id AND u.normas_comunidade_aceitas_em IS NOT NULL AND u.normas_comunidade_versao='2026-10') THEN
    RAISE EXCEPTION 'Aceite as normas da comunidade antes de publicar' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER publicacao_validar BEFORE INSERT OR UPDATE OF tipo,autor_id ON publicacao FOR EACH ROW EXECUTE FUNCTION validar_publicacao_critica();

CREATE FUNCTION validar_vinculo_horario() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.hospital_id IS NULL THEN SELECT hospital_id INTO NEW.hospital_id FROM medico WHERE usuario_id=NEW.medico_id; END IF;
  IF NEW.hospital_id IS NULL OR NOT EXISTS(SELECT 1 FROM hospital h WHERE h.id=NEW.hospital_id AND h.ativo AND (EXISTS(SELECT 1 FROM medico m WHERE m.usuario_id=NEW.medico_id AND m.hospital_id=h.id) OR EXISTS(SELECT 1 FROM medico_hospital v WHERE v.medico_id=NEW.medico_id AND v.hospital_id=h.id AND v.ativo))) THEN
    RAISE EXCEPTION 'Horário exige vínculo médico ativo com a instituição' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER disponibilidade_validar_vinculo BEFORE INSERT OR UPDATE OF medico_id,hospital_id ON disponibilidade_medico FOR EACH ROW EXECUTE FUNCTION validar_vinculo_horario();

CREATE FUNCTION movimento_somente_inclusao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Movimentações de estoque são imutáveis' USING ERRCODE='23514'; END;$$;
CREATE TRIGGER movimento_bloquear_alteracao BEFORE UPDATE OR DELETE ON movimento_estoque FOR EACH ROW EXECUTE FUNCTION movimento_somente_inclusao();
CREATE TRIGGER movimento_bloquear_truncate BEFORE TRUNCATE ON movimento_estoque FOR EACH STATEMENT EXECUTE FUNCTION movimento_somente_inclusao();

CREATE FUNCTION validar_transicao_bolsa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.coletada_em>now() THEN RAISE EXCEPTION 'A coleta não pode estar no futuro' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND NEW.status<>OLD.status AND NOT (
    (OLD.status='QUARENTENA' AND NEW.status IN ('DISPONIVEL','DESCARTADA')) OR
    (OLD.status='DISPONIVEL' AND NEW.status IN ('RESERVADA','DESCARTADA')) OR
    (OLD.status='RESERVADA' AND NEW.status IN ('DISPONIVEL','UTILIZADA','DESCARTADA'))
  ) THEN RAISE EXCEPTION 'Transição de estoque inválida' USING ERRCODE='23514'; END IF;
  IF NEW.status IN ('DISPONIVEL','RESERVADA','UTILIZADA') AND NEW.validade_em<=now() THEN RAISE EXCEPTION 'Bolsa vencida não pode ser liberada, reservada ou utilizada' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER bolsa_validar_transicao BEFORE INSERT OR UPDATE ON bolsa_sangue FOR EACH ROW EXECUTE FUNCTION validar_transicao_bolsa();
CREATE INDEX publicacao_avisos_ativos_idx ON publicacao(criado_em DESC,id DESC) WHERE tipo='AVISO_CRITICO' AND status='PUBLICADO';


ALTER TABLE usuario
 ADD COLUMN is_first_access boolean NOT NULL DEFAULT true,
 ADD COLUMN tour_versao integer NOT NULL DEFAULT 0,
 ADD COLUMN tour_concluido_em timestamptz(3),
 ADD CONSTRAINT usuario_tour_conclusao_chk CHECK (is_first_access OR (tour_versao > 0 AND tour_concluido_em IS NOT NULL));

ALTER TABLE notificacao
 ADD COLUMN email_reserva_token uuid,
 ADD COLUMN email_reservado_ate timestamptz(3),
 ADD COLUMN email_proxima_tentativa_em timestamptz(3) NOT NULL DEFAULT now();
CREATE INDEX notificacao_fila_email_idx ON notificacao(email_proxima_tentativa_em)
 WHERE email_solicitado AND email_enviado_em IS NULL;

CREATE TABLE evento_necessidade_critica (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 hospital_id uuid NOT NULL REFERENCES hospital(id) ON DELETE RESTRICT,
 tipos text[] NOT NULL CHECK (cardinality(tipos) BETWEEN 1 AND 8),
 criado_em timestamptz(3) NOT NULL DEFAULT now(),
 processado_em timestamptz(3)
);
CREATE INDEX evento_necessidade_critica_processado_em_criado_em_idx ON evento_necessidade_critica(processado_em,criado_em);

CREATE TABLE identidade_retida (
 usuario_id uuid PRIMARY KEY REFERENCES usuario(id) ON DELETE RESTRICT,
 conteudo bytea NOT NULL,
 finalidade varchar(500) NOT NULL CHECK (length(trim(finalidade)) >= 20),
 reavaliar_em timestamptz(3) NOT NULL,
 criado_em timestamptz(3) NOT NULL DEFAULT now()
);

-- A gravação de um novo agendamento coordena-se com desativações de contas,
-- instituições e vínculos. O lock dura até o commit, inclusive entre réplicas.
CREATE FUNCTION consulta_validar_acesso_ativo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_hospital uuid; v_ativo boolean; v_status status_usuario;
BEGIN
 IF NEW.status <> 'AGENDADA' THEN RETURN NEW; END IF;
 SELECT COALESCE(d.hospital_id,m.hospital_id) INTO v_hospital
 FROM disponibilidade_medico d JOIN medico m ON m.usuario_id=d.medico_id
 WHERE d.id=NEW.disponibilidade_id;
 SELECT ativo INTO v_ativo FROM hospital WHERE id=v_hospital FOR SHARE;
 IF NOT COALESCE(v_ativo,false) THEN RAISE EXCEPTION 'Instituição indisponível' USING ERRCODE='23514'; END IF;
 PERFORM id FROM usuario WHERE id IN (NEW.paciente_id,NEW.medico_id) ORDER BY id FOR SHARE;
 IF EXISTS (SELECT 1 FROM usuario WHERE id IN (NEW.paciente_id,NEW.medico_id) AND status<>'ATIVO') THEN
   RAISE EXCEPTION 'Conta indisponível' USING ERRCODE='23514';
 END IF;
 PERFORM usuario_id FROM medico WHERE usuario_id=NEW.medico_id FOR SHARE;
 IF EXISTS (SELECT 1 FROM medico_hospital WHERE medico_id=NEW.medico_id) AND NOT EXISTS
   (SELECT 1 FROM medico_hospital WHERE medico_id=NEW.medico_id AND hospital_id=v_hospital AND ativo) THEN
   RAISE EXCEPTION 'Vínculo indisponível' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER consulta_validar_acesso_ativo BEFORE INSERT OR UPDATE OF status,disponibilidade_id ON consulta
 FOR EACH ROW EXECUTE FUNCTION consulta_validar_acesso_ativo();


-- Vínculos explícitos prevalecem sobre o hospital legado do médico.
CREATE OR REPLACE FUNCTION validar_vinculo_horario() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_principal uuid; v_ativo boolean;
BEGIN
 SELECT hospital_id INTO v_principal FROM medico WHERE usuario_id=NEW.medico_id FOR SHARE;
 IF NEW.hospital_id IS NULL THEN NEW.hospital_id:=v_principal; END IF;
 SELECT ativo INTO v_ativo FROM hospital WHERE id=NEW.hospital_id FOR SHARE;
 IF NOT COALESCE(v_ativo,false) OR
   (EXISTS(SELECT 1 FROM medico_hospital WHERE medico_id=NEW.medico_id) AND NOT EXISTS
     (SELECT 1 FROM medico_hospital WHERE medico_id=NEW.medico_id AND hospital_id=NEW.hospital_id AND ativo)) OR
   (NOT EXISTS(SELECT 1 FROM medico_hospital WHERE medico_id=NEW.medico_id) AND NEW.hospital_id<>v_principal) THEN
   RAISE EXCEPTION 'Horário exige vínculo médico ativo com a instituição' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;

ALTER TABLE evento_necessidade_critica DROP CONSTRAINT evento_necessidade_critica_hospital_id_fkey;
ALTER TABLE evento_necessidade_critica ADD CONSTRAINT evento_necessidade_critica_hospital_id_fkey
 FOREIGN KEY(hospital_id) REFERENCES hospital(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE identidade_retida DROP CONSTRAINT identidade_retida_usuario_id_fkey;
ALTER TABLE identidade_retida ADD CONSTRAINT identidade_retida_usuario_id_fkey
 FOREIGN KEY(usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT ON UPDATE CASCADE;


-- O encerramento não pode ser desfeito por uma ativação concorrente ou por um
-- fluxo administrativo antigo. A revisão de retenção não reabre a conta.
CREATE FUNCTION usuario_proteger_encerramento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status='ENCERRADO' AND (
   NEW.status<>'ENCERRADO' OR NEW.nome IS DISTINCT FROM OLD.nome OR
   NEW.email IS DISTINCT FROM OLD.email OR NEW.cpf IS DISTINCT FROM OLD.cpf OR
   NEW.telefone IS DISTINCT FROM OLD.telefone OR NEW.senha_hash IS DISTINCT FROM OLD.senha_hash
 ) THEN RAISE EXCEPTION 'Conta encerrada não pode ser reativada nem ter identidade restaurada' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER usuario_proteger_encerramento BEFORE UPDATE ON usuario
 FOR EACH ROW EXECUTE FUNCTION usuario_proteger_encerramento();


-- Tipagem conferida por resultado: preserva a evidência e impede aprovação com tipos divergentes.
ALTER TABLE exame ADD COLUMN tipo_sanguineo_id SMALLINT;
ALTER TABLE exame ADD CONSTRAINT exame_tipo_sanguineo_id_fkey
  FOREIGN KEY (tipo_sanguineo_id) REFERENCES tipo_sanguineo(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Resultados históricos permanecem íntegros; novas validações devem identificar a tipagem.
CREATE FUNCTION exigir_tipagem_exame_validado() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.situacao = 'VALIDADO' AND NEW.tipo_sanguineo_id IS NULL THEN
    RAISE EXCEPTION 'Resultado validado exige tipo sanguíneo conferido' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER exame_validado_tipagem_trg BEFORE INSERT OR UPDATE OF situacao, tipo_sanguineo_id
  ON exame FOR EACH ROW EXECUTE FUNCTION exigir_tipagem_exame_validado();


-- Alteração aditiva: dados legados não recebem respostas ou versões retroativas.
ALTER TABLE pre_triagem ADD COLUMN versao_questionario VARCHAR(30);
ALTER TABLE disponibilidade_medico ADD COLUMN cancelada_em TIMESTAMPTZ(3);
ALTER TABLE consulta ADD COLUMN pre_triagem_id UUID;
ALTER TABLE consulta ADD COLUMN motivo_reprovacao VARCHAR(2000);
CREATE INDEX consulta_pre_triagem_id_idx ON consulta(pre_triagem_id);
ALTER TABLE consulta ADD CONSTRAINT consulta_pre_triagem_id_fkey
  FOREIGN KEY (pre_triagem_id) REFERENCES pre_triagem(id) ON DELETE RESTRICT ON UPDATE CASCADE;
-- O vínculo também deve preservar a titularidade, mesmo em uma escrita fora da API.
ALTER TABLE pre_triagem ADD CONSTRAINT pre_triagem_id_paciente_key UNIQUE(id, paciente_id);
ALTER TABLE consulta ADD CONSTRAINT consulta_pre_triagem_titular_fkey
  FOREIGN KEY (pre_triagem_id, paciente_id) REFERENCES pre_triagem(id, paciente_id)
  ON DELETE RESTRICT ON UPDATE CASCADE;


-- Um horário retirado pelo médico continua no histórico, mas não ocupa a agenda.
ALTER TABLE disponibilidade_medico DROP CONSTRAINT disponibilidade_sem_sobreposicao;
DROP INDEX disponibilidade_medico_medico_id_inicio_fim_key;
CREATE INDEX disponibilidade_medico_medico_id_inicio_fim_idx ON disponibilidade_medico(medico_id, inicio, fim);
CREATE UNIQUE INDEX disponibilidade_medico_periodo_ativo_key
  ON disponibilidade_medico(medico_id, inicio, fim) WHERE cancelada_em IS NULL;
ALTER TABLE disponibilidade_medico ADD CONSTRAINT disponibilidade_sem_sobreposicao
  EXCLUDE USING gist (medico_id WITH =, tstzrange(inicio, fim, '[)') WITH &&)
  WHERE (cancelada_em IS NULL);


-- Sem preenchimento retroativo: registros existentes permanecem NULL.
ALTER TABLE doacao ADD COLUMN doou_antes_dos60_confirmado BOOLEAN;
ALTER TABLE doacao ADD CONSTRAINT doacao_confirmacao_pre_60_vinculada_chk
  CHECK (paciente_id IS NOT NULL OR doou_antes_dos60_confirmado IS NULL);

COMMIT;
