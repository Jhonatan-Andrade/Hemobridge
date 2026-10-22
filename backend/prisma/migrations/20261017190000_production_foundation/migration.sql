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
