import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { criarAdapterPg } from '../src/prisma/adapter.js';

const url = process.env['DATABASE_URL'] ?? 'postgresql://invalid/blocked';
if (process.env['NODE_ENV'] === 'production' || !/_(test|teste|validation)$/.test(new URL(url).pathname)) {
  throw new Error('A comunidade de testes exige um banco local de testes identificado pelo sufixo.');
}
const db = new PrismaClient({ adapter: criarAdapterPg(url) });

async function main() {
  const emails = ['representante.teste@hemobridge.local', 'medico.teste@hemobridge.local', 'paciente.teste@hemobridge.local', 'admin.teste@hemobridge.local'];
  const usuarios = await Promise.all(emails.map(email => db.usuario.findUnique({ where: { email }, include: { representante: true, medico: true } })));
  if (usuarios.some(u => !u)) throw new Error('Execute primeiro db:seed:teste neste banco de testes.');
  const autores = usuarios.map(u => u!);
  if (await db.publicacao.findFirst({ where: { autorId: autores[0].id, titulo: 'Doação: acompanhe os avisos da unidade' } })) {
    console.log('A comunidade de testes já foi carregada.');
    return;
  }
  await db.$transaction(async tx => {
    const agora = new Date();
    for (const usuario of autores) {
      await tx.usuario.update({ where: { id: usuario.id }, data: { normasComunidadeVersao: '2026-10', normasComunidadeAceitasEm: agora } });
    }
    const hospitalId = autores[0].representante!.hospitalId;
    await tx.hospital.update({ where: { id: hospitalId }, data: { verificadoEm: agora, fonteVerificacao: 'Cadastro reservado ao ambiente local de testes' } });
    const tipos = await tx.tipoSanguineo.findMany({ orderBy: { sigla: 'asc' } });
    await tx.necessidadeEstoque.updateMany({ where: { hospitalId, tipoSanguineoId: tipos[0].id }, data: { nivel: 'CRITICO', atualizadoPorId: autores[0].id, atualizadoEm: agora } });
    await tx.necessidadeEstoque.updateMany({ where: { hospitalId, tipoSanguineoId: tipos[1].id }, data: { nivel: 'BAIXO', atualizadoPorId: autores[0].id, atualizadoEm: agora } });
    const assuntos = [
      ['Doação: acompanhe os avisos da unidade', 'Acompanhe os canais da instituição para conhecer os tipos sanguíneos necessários e os horários de atendimento. Confirme as orientações antes de se deslocar.'],
      ['Avaliação antes da doação', 'A elegibilidade depende da entrevista e da avaliação da equipe de hemoterapia. Procure orientação individual na unidade e preserve informações de saúde fora dos comentários públicos.'],
      ['Como organizar a primeira visita', 'Confira endereço e horários, leve os documentos solicitados pelo serviço e siga as orientações recebidas. Você pode compartilhar dúvidas gerais sobre o processo neste espaço.'],
      ['Convivência na comunidade', 'Compartilhe informações sobre doação de sangue e saúde com respeito. Não publique laudos, telefones, documentos ou dados de outras pessoas.'],
    ];
    const comentarios = [
      'Onde posso conferir os horários da unidade?',
      'Consulte a área de locais e confirme o horário diretamente com a instituição.',
      'A avaliação da equipe é importante antes de cada doação.',
      'Obrigada pelas orientações. Vou acompanhar os avisos.',
      'As orientações específicas para cada pessoa devem ser conversadas em atendimento privado.',
      'A informação atualizada ajuda a organizar a visita.',
      'Podemos compartilhar apenas dúvidas gerais, preservando a privacidade.',
      'Vou conferir os documentos solicitados antes de sair.',
    ];
    for (let i = 0; i < 30; i++) {
      const autor = autores[i % autores.length];
      const [titulo, texto] = assuntos[i % assuntos.length];
      const criadoEm = new Date(agora.getTime() - i * 3_600_000);
      const post = await tx.publicacao.create({ data: { autorId: autor.id, titulo: i < 4 ? titulo : `${titulo} · conversa ${i + 1}`, texto, tema: i % 4 === 0 ? 'AVISO_INSTITUCIONAL' : i % 4 === 1 ? 'SAUDE' : 'DOACAO', tipo: i === 0 ? 'AVISO_CRITICO' : 'COMUM', fixadaAte: i === 0 ? new Date(agora.getTime() + 86_400_000) : null, criadoEm } });
      await tx.comentario.createMany({ data: comentarios.map((texto, j) => ({ publicacaoId: post.id, autorId: autores[j % autores.length].id, texto, criadoEm: new Date(criadoEm.getTime() + (j + 1) * 60_000) })) });
    }
  }, { timeout: 60_000 });
  console.log('Comunidade de testes: 30 publicações, 240 comentários e um aviso institucional fixado.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Falha na carga de testes.'); process.exitCode = 1; }).finally(() => db.$disconnect());
