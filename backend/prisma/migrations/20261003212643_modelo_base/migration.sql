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
