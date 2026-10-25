import { ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/** Informa exatamente qual dado de uma nova conta (ou hemocentro) já está cadastrado. */
export async function verificarConflitos(
  prisma: PrismaService,
  { cnpj, cpf, email }: { cnpj?: string; cpf?: string; email?: string },
) {
  const [hemocentro, usuarios] = await Promise.all([
    cnpj ? prisma.hemocentro.findUnique({ where: { cnpj }, select: { id: true } }) : null,
    cpf || email
      ? prisma.usuario.findMany({
          where: { OR: [...(cpf ? [{ cpf }] : []), ...(email ? [{ email }] : [])] },
          select: { cpf: true, email: true },
        })
      : [],
  ]);

  const conflitos: string[] = [];
  if (hemocentro) conflitos.push('Já existe um hemocentro com este CNPJ.');
  if (cpf && usuarios.some((u) => u.cpf === cpf)) conflitos.push('Já existe um usuário com este CPF.');
  if (email && usuarios.some((u) => u.email === email)) conflitos.push('Já existe um usuário com este e-mail.');
  if (conflitos.length) throw new ConflictException(conflitos);
}

/** Cobre a corrida entre a verificação de conflitos e a gravação. */
export async function comConflitoTratado<T>(operacao: () => Promise<T>): Promise<T> {
  try {
    return await operacao();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('CNPJ, CPF ou e-mail já cadastrado.');
    }
    throw e;
  }
}
