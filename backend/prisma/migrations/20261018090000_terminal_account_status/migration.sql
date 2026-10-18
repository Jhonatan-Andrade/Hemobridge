-- O encerramento não pode ser desfeito por uma ativação concorrente ou por um
-- fluxo administrativo antigo. A revisão de retenção não reabre a conta.
CREATE FUNCTION usuario_proteger_encerramento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status='ENCERRADO' AND (
   NEW.status<>'ENCERRADO' OR NEW.nome IS DISTINCT FROM OLD.nome OR
   NEW.email IS DISTINCT FROM OLD.email OR NEW.cpf IS DISTINCT FROM OLD.cpf OR
   NEW.telefone IS DISTINCT FROM OLD.telefone OR NEW.senha_hash IS DISTINCT FROM OLD.senha_hash
 ) THEN RAISE EXCEPTION 'Conta encerrada não pode ser reativada nem ter identidade restaurada' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER usuario_proteger_encerramento BEFORE UPDATE ON usuario
 FOR EACH ROW EXECUTE FUNCTION usuario_proteger_encerramento();
