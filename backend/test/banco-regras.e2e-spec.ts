import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { criarAdapterPg } from '../src/prisma/adapter.js';

// Regras de integridade do banco (Quadro 38). Cada teste roda numa transação
// desfeita ao final, então pode ser executado contra o banco de desenvolvimento.
// Uso: npx vitest run --config ./vitest.config.e2e.ts test/banco-regras.e2e-spec.ts

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

const prisma = new PrismaClient({ adapter: criarAdapterPg(process.env['DATABASE_URL']!) });
const DESFAZER = Symbol('desfazer');

async function emTransacao(fn: (tx: Tx) => Promise<void>) {
  await prisma
    .$transaction(async (tx) => {
      await fn(tx);
      throw DESFAZER;
    })
    .catch((e) => {
      if (e !== DESFAZER) throw e;
    });
}

const ID = {
  admin: '00000000-0000-4000-8000-000000000001',
  rep: '00000000-0000-4000-8000-000000000002',
  medico: '00000000-0000-4000-8000-000000000003',
  paciente: '00000000-0000-4000-8000-000000000004',
  paciente2: '00000000-0000-4000-8000-000000000005',
  hospital: '00000000-0000-4000-8000-0000000000a1',
  hospital2: '00000000-0000-4000-8000-0000000000a2',
  disp: '00000000-0000-4000-8000-0000000000d1',
};

/** Hospital, representante, médico, dois pacientes e um horário amanhã. */
async function cenario(tx: Tx) {
  await tx.$executeRaw`
    INSERT INTO usuario (id, nome, email, cpf, senha_hash, perfil, atualizado_em) VALUES
      (${ID.admin}::uuid, 'Admin', 'admin.teste@x.local', '90000000001', 'x', 'ADMINISTRADOR', now()),
      (${ID.rep}::uuid, 'Rep', 'rep.teste@x.local', '90000000002', 'x', 'REPRESENTANTE', now()),
      (${ID.medico}::uuid, 'Med', 'med.teste@x.local', '90000000003', 'x', 'MEDICO', now()),
      (${ID.paciente}::uuid, 'Pac', 'pac.teste@x.local', '90000000004', 'x', 'PACIENTE', now()),
      (${ID.paciente2}::uuid, 'Pac2', 'pac2.teste@x.local', '90000000005', 'x', 'PACIENTE', now())`;
  await tx.$executeRaw`
    INSERT INTO hospital (id, nome, cnpj, endereco, cidade, estado, cep, latitude, longitude, atualizado_em) VALUES
      (${ID.hospital}::uuid, 'H1', '90000000000001', 'R', 'Curitiba', 'PR', '80000000', -25.4, -49.2, now()),
      (${ID.hospital2}::uuid, 'H2', '90000000000002', 'R', 'Curitiba', 'PR', '80000000', -25.4, -49.2, now())`;
  await tx.$executeRaw`
    INSERT INTO representante_hospital (usuario_id, hospital_id) VALUES (${ID.rep}::uuid, ${ID.hospital}::uuid)`;
  await tx.$executeRaw`
    INSERT INTO medico (usuario_id, hospital_id, crm, uf_crm, crm_conferido_por)
    VALUES (${ID.medico}::uuid, ${ID.hospital}::uuid, '999999', 'PR', ${ID.rep}::uuid)`;
  await tx.$executeRaw`
    INSERT INTO paciente (usuario_id, data_nascimento, sexo, peso_kg, cidade, estado) VALUES
      (${ID.paciente}::uuid, '1990-01-01', 'MASCULINO', 80, 'Curitiba', 'PR'),
      (${ID.paciente2}::uuid, '1992-01-01', 'FEMININO', 60, 'Curitiba', 'PR')`;
  await tx.$executeRaw`
    INSERT INTO disponibilidade_medico (id, medico_id, inicio, fim, link_videochamada)
    VALUES (${ID.disp}::uuid, ${ID.medico}::uuid, now() + interval '1 day', now() + interval '1 day 30 min',
            'https://meet.exemplo.com/sala')`;
}

const tipoId = async (tx: Tx, sigla: string) =>
  (await tx.$queryRaw<[{ id: number }]>`SELECT id FROM tipo_sanguineo WHERE sigla = ${sigla}`)[0].id;

const agendar = (tx: Tx, pacienteId: string, status = 'AGENDADA') => tx.$executeRaw`
  INSERT INTO consulta (paciente_id, medico_id, disponibilidade_id, status, link_videochamada,
                        termo_telemedicina_aceito_em, cancelada_em, atualizado_em)
  VALUES (${pacienteId}::uuid, ${ID.medico}::uuid, ${ID.disp}::uuid, ${status}::situacao_consulta,
          'https://meet.exemplo.com/sala', now(),
          CASE WHEN ${status} = 'CANCELADA' THEN now() END, now())`;

afterAll(() => prisma.$disconnect());

describe('log_auditoria (RNF05)', () => {
  it('aceita inclusão e bloqueia alteração e exclusão', async () => {
    await emTransacao(async (tx) => {
      await tx.$executeRaw`INSERT INTO log_auditoria (acao, entidade) VALUES ('TESTE', 'teste')`;
      await expect(tx.$executeRaw`UPDATE log_auditoria SET acao = 'X' WHERE acao = 'TESTE'`).rejects.toThrow(
        /somente inclusão/,
      );
    });
    await emTransacao(async (tx) => {
      await tx.$executeRaw`INSERT INTO log_auditoria (acao, entidade) VALUES ('TESTE', 'teste')`;
      await expect(tx.$executeRaw`DELETE FROM log_auditoria WHERE acao = 'TESTE'`).rejects.toThrow(
        /somente inclusão/,
      );
    });
  });
});

describe('agenda e consulta (RN18)', () => {
  it('impede horários sobrepostos do mesmo médico (UC13 FE01)', async () => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      await expect(tx.$executeRaw`
        INSERT INTO disponibilidade_medico (medico_id, inicio, fim, link_videochamada)
        VALUES (${ID.medico}::uuid, now() + interval '1 day 15 min', now() + interval '1 day 45 min',
                'https://meet.exemplo.com/sala')`).rejects.toThrow(/disponibilidade_sem_sobreposicao/);
    });
  });

  it('aceita horário encostado no anterior e recusa link sem https', async () => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      await tx.$executeRaw`
        INSERT INTO disponibilidade_medico (medico_id, inicio, fim, link_videochamada)
        VALUES (${ID.medico}::uuid, now() + interval '1 day 30 min', now() + interval '1 day 60 min',
                'https://meet.exemplo.com/sala')`;
      await expect(tx.$executeRaw`
        INSERT INTO disponibilidade_medico (medico_id, inicio, fim, link_videochamada)
        VALUES (${ID.medico}::uuid, now() + interval '2 day', now() + interval '2 day 30 min',
                'http://meet.exemplo.com/sala')`).rejects.toThrow(/disponibilidade_link_https_chk/);
    });
  });

  it('cria uma única consulta ativa por horário (PT04)', async () => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      await agendar(tx, ID.paciente);
      await expect(agendar(tx, ID.paciente2)).rejects.toThrow(/consulta_disponibilidade_ativa_excl/);
    });
  });

  it('libera o horário de consulta cancelada para nova reserva', async () => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      await agendar(tx, ID.paciente, 'CANCELADA');
      await agendar(tx, ID.paciente2);
    });
  });

  it('permite só uma consulta agendada por paciente', async () => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      await agendar(tx, ID.paciente);
      await tx.$executeRaw`
        INSERT INTO disponibilidade_medico (id, medico_id, inicio, fim, link_videochamada)
        VALUES ('00000000-0000-4000-8000-0000000000d2', ${ID.medico}::uuid, now() + interval '3 day',
                now() + interval '3 day 30 min', 'https://meet.exemplo.com/sala')`;
      await expect(tx.$executeRaw`
        INSERT INTO consulta (paciente_id, medico_id, disponibilidade_id, link_videochamada,
                              termo_telemedicina_aceito_em, atualizado_em)
        VALUES (${ID.paciente}::uuid, ${ID.medico}::uuid, '00000000-0000-4000-8000-0000000000d2',
                'https://meet.exemplo.com/sala', now(), now())`).rejects.toThrow(/consulta_paciente_agendada_excl/);
    });
  });
});

describe('exame (RN19)', () => {
  const inserirExame = (tx: Tx, mime: string, tamanho: number) => tx.$executeRaw`
    WITH c AS (
      INSERT INTO consulta (paciente_id, medico_id, disponibilidade_id, status, link_videochamada,
                            termo_telemedicina_aceito_em, atualizado_em)
      VALUES (${ID.paciente}::uuid, ${ID.medico}::uuid, ${ID.disp}::uuid, 'REALIZADA',
              'https://meet.exemplo.com/sala', now(), now()) RETURNING id),
    s AS (INSERT INTO solicitacao_exame (consulta_id, descricao) SELECT id, 'Tipagem ABO/Rh' FROM c RETURNING id)
    INSERT INTO exame (solicitacao_exame_id, chave_armazenamento, nome_original, mime_type, tamanho_bytes, hash_sha256)
    SELECT id, gen_random_uuid()::text, 'exame', ${mime}, ${tamanho}::int, repeat('a', 64) FROM s`;

  it('aceita PDF de até 5 MB', async () => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      await inserirExame(tx, 'application/pdf', 5 * 1024 * 1024);
    });
  });

  it.each([
    ['formato não aceito', 'application/zip', 1000, /exame_mime_type_chk/],
    ['arquivo acima de 5 MB', 'image/png', 5 * 1024 * 1024 + 1, /exame_tamanho_chk/],
  ])('recusa %s (PT07)', async (_, mime, tamanho, erro) => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      await expect(inserirExame(tx, mime, tamanho)).rejects.toThrow(erro);
    });
  });
});

describe('doacao (UC20, RN11)', () => {
  const doar = (tx: Tx, opcoes: { paciente?: string; tipo: number; data?: string; por?: string; hospital?: string }) =>
    tx.$executeRaw`
      INSERT INTO doacao (hospital_id, paciente_id, tipo_sanguineo_id, data_coleta, peso_aferido, registrado_por)
      VALUES (${opcoes.hospital ?? ID.hospital}::uuid, ${opcoes.paciente ?? null}::uuid, ${opcoes.tipo}::smallint,
              ${opcoes.data ?? '2026-01-10'}::date, ${opcoes.paciente ? 80 : null}::numeric, ${opcoes.por ?? ID.rep}::uuid)`;

  it('registra doação avulsa sem paciente (PT14)', async () => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      await doar(tx, { tipo: await tipoId(tx, 'O-') });
    });
  });

  it('recusa doação vinculada de paciente não aprovado', async () => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      await expect(doar(tx, { paciente: ID.paciente, tipo: await tipoId(tx, 'O-') })).rejects.toThrow(
        /Paciente APROVADO/,
      );
    });
  });

  it('exige o mesmo tipo validado do doador aprovado', async () => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      const oNeg = await tipoId(tx, 'O-');
      await tx.$executeRaw`
        UPDATE paciente SET situacao = 'APROVADO', tipo_sanguineo_id = ${oNeg}::smallint,
               medico_validador_id = ${ID.medico}::uuid, validado_em = now()
         WHERE usuario_id = ${ID.paciente}::uuid`;
      await doar(tx, { paciente: ID.paciente, tipo: oNeg });
      await expect(doar(tx, { paciente: ID.paciente, tipo: await tipoId(tx, 'A+') })).rejects.toThrow(
        /difere do tipo validado/,
      );
    });
  });

  it('recusa data de coleta futura (UC20 FE03)', async () => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      await expect(doar(tx, { tipo: await tipoId(tx, 'O-'), data: '2999-01-01' })).rejects.toThrow(/futura/);
    });
  });

  it('recusa registro por representante de outro hospital (RN08)', async () => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      await expect(doar(tx, { tipo: await tipoId(tx, 'O-'), hospital: ID.hospital2 })).rejects.toThrow(
        /representante do próprio hospital/,
      );
    });
  });
});

describe('paciente (RN01, RN10)', () => {
  it('impede APROVADO sem tipagem validada (PT10)', async () => {
    await emTransacao(async (tx) => {
      await cenario(tx);
      await expect(
        tx.$executeRaw`UPDATE paciente SET situacao = 'APROVADO' WHERE usuario_id = ${ID.paciente}::uuid`,
      ).rejects.toThrow(/paciente_aprovado_validado_chk/);
    });
  });
});
