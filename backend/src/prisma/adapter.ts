import { PrismaPg } from '@prisma/adapter-pg';

// A sessão usa UTC: o adapter envia os instantes sem offset, então um fuso
// diferente no servidor deslocaria todos os TIMESTAMPTZ gravados pela aplicação.
export function criarAdapterPg(connectionString: string): PrismaPg {
  return new PrismaPg({ connectionString, options: '-c timezone=UTC' });
}
