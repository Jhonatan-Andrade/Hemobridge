import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

/** A consulta mais recente delimita a avaliação atual; o histórico segue acessível. */
export async function exigirCicloAtual(tx: Pick<Prisma.TransactionClient, 'consulta'>, pacienteId: string, consultaId: string) {
  const ultima = await tx.consulta.findFirst({
    where: { pacienteId }, orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], select: { id: true },
  });
  if (ultima?.id !== consultaId)
    throw new ConflictException('Este atendimento pertence a um ciclo anterior. Abra a consulta atual.');
}

export async function travarPacienteAtivo(tx: Prisma.TransactionClient, pacienteId: string) {
  // Mesma ordem do encerramento de conta: usuário antes de paciente.
  const usuarios = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM usuario WHERE id=${pacienteId}::uuid FOR UPDATE`;
  if (usuarios[0]?.status !== 'ATIVO') throw new ConflictException('Cadastro indisponível para atualização.');
  const pacientes = await tx.$queryRaw<{ usuario_id: string }[]>`SELECT usuario_id FROM paciente WHERE usuario_id=${pacienteId}::uuid FOR UPDATE`;
  if (!pacientes.length) throw new ConflictException('Cadastro indisponível para atualização.');
}
