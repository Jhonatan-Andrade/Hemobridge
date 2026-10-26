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
