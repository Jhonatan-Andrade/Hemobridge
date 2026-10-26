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
