-- Um horário retirado pelo médico continua no histórico, mas não ocupa a agenda.
ALTER TABLE disponibilidade_medico DROP CONSTRAINT disponibilidade_sem_sobreposicao;
DROP INDEX disponibilidade_medico_medico_id_inicio_fim_key;
CREATE INDEX disponibilidade_medico_medico_id_inicio_fim_idx ON disponibilidade_medico(medico_id, inicio, fim);
CREATE UNIQUE INDEX disponibilidade_medico_periodo_ativo_key
  ON disponibilidade_medico(medico_id, inicio, fim) WHERE cancelada_em IS NULL;
ALTER TABLE disponibilidade_medico ADD CONSTRAINT disponibilidade_sem_sobreposicao
  EXCLUDE USING gist (medico_id WITH =, tstzrange(inicio, fim, '[)') WITH &&)
  WHERE (cancelada_em IS NULL);
