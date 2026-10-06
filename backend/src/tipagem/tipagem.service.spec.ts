import { PrismaService } from '../prisma/prisma.service.js';
import { AVISO_COMPATIBILIDADE, TipagemService } from './tipagem.service.js';

describe('TipagemService.compatibilidade', () => {
  it('monta doação e recepção por tipo, na ordem dos tipos, com o aviso', async () => {
    const t = (id: number, sigla: string) => ({ id, sigla });
    const prisma = {
      tipoSanguineo: {
        findMany: vi.fn().mockResolvedValue([
          {
            sigla: 'O-',
            doaPara: [t(8, 'O-'), t(1, 'A+')].map((tipoReceptor) => ({ tipoReceptor })),
            recebeDe: [t(8, 'O-')].map((tipoDoador) => ({ tipoDoador })),
          },
        ]),
      },
    };

    const r = await new TipagemService(prisma as unknown as PrismaService).compatibilidade();

    expect(r).toEqual({
      aviso: AVISO_COMPATIBILIDADE,
      tipos: [{ sigla: 'O-', podeDoarPara: ['A+', 'O-'], podeReceberDe: ['O-'] }],
    });
  });
});
