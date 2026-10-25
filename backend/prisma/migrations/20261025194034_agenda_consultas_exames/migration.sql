-- CreateEnum
CREATE TYPE "situacao_consulta" AS ENUM ('AGENDADA', 'REALIZADA', 'NAO_COMPARECEU', 'CANCELADA');

-- CreateEnum
CREATE TYPE "situacao_exame" AS ENUM ('AGUARDANDO_RESULTADO', 'EM_ANALISE', 'REPROVADO', 'VALIDADO');

-- CreateTable
CREATE TABLE "disponibilidade_medico" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medico_id" UUID NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fim" TIMESTAMPTZ(3) NOT NULL,
    "link_sala" VARCHAR(500) NOT NULL,
    "removido_em" TIMESTAMPTZ(3),
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
    "situacao" "situacao_consulta" NOT NULL DEFAULT 'AGENDADA',
    "versao_termo_telessaude" VARCHAR(20) NOT NULL,
    "termo_telessaude_aceito_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_origem" INET,
    "observacoes" TEXT,
    "motivo_reprovacao" VARCHAR(1000),
    "cancelada_por" "perfil",
    "motivo_cancelamento" VARCHAR(1000),
    "encerrada_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacao_exame" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "consulta_id" UUID NOT NULL,
    "paciente_id" UUID NOT NULL,
    "medico_id" UUID NOT NULL,
    "exames" VARCHAR(150)[],
    "orientacoes" VARCHAR(2000),
    "situacao" "situacao_exame" NOT NULL DEFAULT 'AGUARDANDO_RESULTADO',
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "solicitacao_exame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exame" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "situacao" "situacao_exame" NOT NULL DEFAULT 'EM_ANALISE',
    "nome_arquivo" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "hash_sha256" CHAR(64) NOT NULL,
    "chave_armazenamento" VARCHAR(255) NOT NULL,
    "enviado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avaliado_por" UUID,
    "avaliado_em" TIMESTAMPTZ(3),
    "motivo_reprovacao" VARCHAR(1000),

    CONSTRAINT "exame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "disponibilidade_medico_medico_id_inicio_idx" ON "disponibilidade_medico"("medico_id", "inicio");

-- CreateIndex
CREATE INDEX "disponibilidade_medico_inicio_idx" ON "disponibilidade_medico"("inicio");

-- CreateIndex
CREATE INDEX "consulta_paciente_id_situacao_idx" ON "consulta"("paciente_id", "situacao");

-- CreateIndex
CREATE INDEX "consulta_medico_id_situacao_idx" ON "consulta"("medico_id", "situacao");

-- CreateIndex
CREATE INDEX "consulta_disponibilidade_id_idx" ON "consulta"("disponibilidade_id");

-- CreateIndex
CREATE UNIQUE INDEX "solicitacao_exame_consulta_id_key" ON "solicitacao_exame"("consulta_id");

-- CreateIndex
CREATE INDEX "solicitacao_exame_paciente_id_situacao_idx" ON "solicitacao_exame"("paciente_id", "situacao");

-- CreateIndex
CREATE INDEX "solicitacao_exame_medico_id_situacao_idx" ON "solicitacao_exame"("medico_id", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "exame_chave_armazenamento_key" ON "exame"("chave_armazenamento");

-- CreateIndex
CREATE INDEX "exame_solicitacao_id_enviado_em_idx" ON "exame"("solicitacao_id", "enviado_em");

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
ALTER TABLE "solicitacao_exame" ADD CONSTRAINT "solicitacao_exame_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_exame" ADD CONSTRAINT "solicitacao_exame_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_exame" ADD CONSTRAINT "solicitacao_exame_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "medico"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exame" ADD CONSTRAINT "exame_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao_exame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exame" ADD CONSTRAINT "exame_avaliado_por_fkey" FOREIGN KEY ("avaliado_por") REFERENCES "medico"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Regras de integridade (cap. 9.1.4)
-- ---------------------------------------------------------------------------

-- UC13 / RN18: horário com fim depois do início e link https da sala.
ALTER TABLE "disponibilidade_medico"
    ADD CONSTRAINT "disponibilidade_medico_intervalo_chk" CHECK ("fim" > "inicio"),
    ADD CONSTRAINT "disponibilidade_medico_link_chk" CHECK ("link_sala" ~ '^https://');

-- RN18: no máximo uma consulta AGENDADA por horário e por paciente. Consultas
-- canceladas continuam no histórico, por isso a unicidade vale só para a ativa.
CREATE UNIQUE INDEX "consulta_disponibilidade_agendada_key"
    ON "consulta"("disponibilidade_id") WHERE "situacao" = 'AGENDADA';
CREATE UNIQUE INDEX "consulta_paciente_agendada_key"
    ON "consulta"("paciente_id") WHERE "situacao" = 'AGENDADA';

-- UC10 / UC14: cancelamento sempre registra quem cancelou.
ALTER TABLE "consulta"
    ADD CONSTRAINT "consulta_cancelada_por_chk" CHECK (
        ("situacao" = 'CANCELADA') = ("cancelada_por" IS NOT NULL)
    ),
    ADD CONSTRAINT "consulta_cancelada_por_perfil_chk" CHECK (
        "cancelada_por" IS NULL OR "cancelada_por" IN ('PACIENTE', 'MEDICO', 'REPRESENTANTE', 'ADMINISTRADOR')
    );

-- UC15 / FE01: ao menos um exame solicitado.
ALTER TABLE "solicitacao_exame"
    ADD CONSTRAINT "solicitacao_exame_exames_chk" CHECK (cardinality("exames") > 0);

-- RN19: PDF, JPG ou PNG com até 5 MB; reprovação exige motivo.
ALTER TABLE "exame"
    ADD CONSTRAINT "exame_mime_type_chk" CHECK ("mime_type" IN ('application/pdf', 'image/jpeg', 'image/png')),
    ADD CONSTRAINT "exame_tamanho_chk" CHECK ("tamanho_bytes" > 0 AND "tamanho_bytes" <= 5242880),
    ADD CONSTRAINT "exame_hash_chk" CHECK ("hash_sha256" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "exame_situacao_chk" CHECK ("situacao" IN ('EM_ANALISE', 'REPROVADO', 'VALIDADO')),
    ADD CONSTRAINT "exame_reprovado_motivo_chk" CHECK ("situacao" <> 'REPROVADO' OR "motivo_reprovacao" IS NOT NULL);
