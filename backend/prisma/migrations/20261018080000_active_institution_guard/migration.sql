-- Vínculos explícitos prevalecem sobre o hospital legado do médico.
CREATE OR REPLACE FUNCTION validar_vinculo_horario() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_principal uuid; v_ativo boolean;
BEGIN
 SELECT hospital_id INTO v_principal FROM medico WHERE usuario_id=NEW.medico_id FOR SHARE;
 IF NEW.hospital_id IS NULL THEN NEW.hospital_id:=v_principal; END IF;
 SELECT ativo INTO v_ativo FROM hospital WHERE id=NEW.hospital_id FOR SHARE;
 IF NOT COALESCE(v_ativo,false) OR
   (EXISTS(SELECT 1 FROM medico_hospital WHERE medico_id=NEW.medico_id) AND NOT EXISTS
     (SELECT 1 FROM medico_hospital WHERE medico_id=NEW.medico_id AND hospital_id=NEW.hospital_id AND ativo)) OR
   (NOT EXISTS(SELECT 1 FROM medico_hospital WHERE medico_id=NEW.medico_id) AND NEW.hospital_id<>v_principal) THEN
   RAISE EXCEPTION 'Horário exige vínculo médico ativo com a instituição' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;

ALTER TABLE evento_necessidade_critica DROP CONSTRAINT evento_necessidade_critica_hospital_id_fkey;
ALTER TABLE evento_necessidade_critica ADD CONSTRAINT evento_necessidade_critica_hospital_id_fkey
 FOREIGN KEY(hospital_id) REFERENCES hospital(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE identidade_retida DROP CONSTRAINT identidade_retida_usuario_id_fkey;
ALTER TABLE identidade_retida ADD CONSTRAINT identidade_retida_usuario_id_fkey
 FOREIGN KEY(usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT ON UPDATE CASCADE;
