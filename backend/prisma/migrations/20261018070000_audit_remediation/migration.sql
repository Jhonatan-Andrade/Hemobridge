ALTER TABLE usuario
 ADD COLUMN is_first_access boolean NOT NULL DEFAULT true,
 ADD COLUMN tour_versao integer NOT NULL DEFAULT 0,
 ADD COLUMN tour_concluido_em timestamptz(3),
 ADD CONSTRAINT usuario_tour_conclusao_chk CHECK (is_first_access OR (tour_versao > 0 AND tour_concluido_em IS NOT NULL));

ALTER TABLE notificacao
 ADD COLUMN email_reserva_token uuid,
 ADD COLUMN email_reservado_ate timestamptz(3),
 ADD COLUMN email_proxima_tentativa_em timestamptz(3) NOT NULL DEFAULT now();
CREATE INDEX notificacao_fila_email_idx ON notificacao(email_proxima_tentativa_em)
 WHERE email_solicitado AND email_enviado_em IS NULL;

CREATE TABLE evento_necessidade_critica (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 hospital_id uuid NOT NULL REFERENCES hospital(id) ON DELETE RESTRICT,
 tipos text[] NOT NULL CHECK (cardinality(tipos) BETWEEN 1 AND 8),
 criado_em timestamptz(3) NOT NULL DEFAULT now(),
 processado_em timestamptz(3)
);
CREATE INDEX evento_necessidade_critica_processado_em_criado_em_idx ON evento_necessidade_critica(processado_em,criado_em);

CREATE TABLE identidade_retida (
 usuario_id uuid PRIMARY KEY REFERENCES usuario(id) ON DELETE RESTRICT,
 conteudo bytea NOT NULL,
 finalidade varchar(500) NOT NULL CHECK (length(trim(finalidade)) >= 20),
 reavaliar_em timestamptz(3) NOT NULL,
 criado_em timestamptz(3) NOT NULL DEFAULT now()
);

-- A gravação de um novo agendamento coordena-se com desativações de contas,
-- instituições e vínculos. O lock dura até o commit, inclusive entre réplicas.
CREATE FUNCTION consulta_validar_acesso_ativo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_hospital uuid; v_ativo boolean; v_status status_usuario;
BEGIN
 IF NEW.status <> 'AGENDADA' THEN RETURN NEW; END IF;
 SELECT COALESCE(d.hospital_id,m.hospital_id) INTO v_hospital
 FROM disponibilidade_medico d JOIN medico m ON m.usuario_id=d.medico_id
 WHERE d.id=NEW.disponibilidade_id;
 SELECT ativo INTO v_ativo FROM hospital WHERE id=v_hospital FOR SHARE;
 IF NOT COALESCE(v_ativo,false) THEN RAISE EXCEPTION 'Instituição indisponível' USING ERRCODE='23514'; END IF;
 PERFORM id FROM usuario WHERE id IN (NEW.paciente_id,NEW.medico_id) ORDER BY id FOR SHARE;
 IF EXISTS (SELECT 1 FROM usuario WHERE id IN (NEW.paciente_id,NEW.medico_id) AND status<>'ATIVO') THEN
   RAISE EXCEPTION 'Conta indisponível' USING ERRCODE='23514';
 END IF;
 PERFORM usuario_id FROM medico WHERE usuario_id=NEW.medico_id FOR SHARE;
 IF EXISTS (SELECT 1 FROM medico_hospital WHERE medico_id=NEW.medico_id) AND NOT EXISTS
   (SELECT 1 FROM medico_hospital WHERE medico_id=NEW.medico_id AND hospital_id=v_hospital AND ativo) THEN
   RAISE EXCEPTION 'Vínculo indisponível' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER consulta_validar_acesso_ativo BEFORE INSERT OR UPDATE OF status,disponibilidade_id ON consulta
 FOR EACH ROW EXECUTE FUNCTION consulta_validar_acesso_ativo();
