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
