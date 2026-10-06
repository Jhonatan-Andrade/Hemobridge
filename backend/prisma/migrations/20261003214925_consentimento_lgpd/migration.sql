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
