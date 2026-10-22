-- HEM-34 / RNF08 / Seção 9.2.4: índices das consultas públicas e dos filtros.
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
