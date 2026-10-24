-- Sem preenchimento retroativo: registros existentes permanecem NULL.
ALTER TABLE doacao ADD COLUMN doou_antes_dos60_confirmado BOOLEAN;
ALTER TABLE doacao ADD CONSTRAINT doacao_confirmacao_pre_60_vinculada_chk
  CHECK (paciente_id IS NOT NULL OR doou_antes_dos60_confirmado IS NULL);
