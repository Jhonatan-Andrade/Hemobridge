# Log de auditoria (RNF05 / )

Toda operação sensível grava em `log_auditoria`: usuário, ação, entidade, id da entidade,
IP de origem e instante. A tabela é **somente inclusão**: o banco recusa UPDATE, DELETE e TRUNCATE.

## Como usar em um novo módulo

**1. Na rota (o mais comum):**

```ts
import { Auditar } from '../auditoria/auditar.decorator.js';

@Auditar({ acao: 'ENVIAR_EXAME', entidade: 'exame' })
@Post(':id/exames')
enviar(...) {}
```

O id da entidade vem do `:id` da rota, do campo `id` da resposta ou do usuário logado.
Com `registrarFalha: true`, tentativas que terminam em erro viram `ACAO_FALHA`.

**2. No serviço**, quando o registro precisa ser atômico com a alteração:

```ts
await this.prisma.$transaction(async (tx) => {
  // ... alterações
  await this.auditoria.registrarEm(tx, { usuarioId, acao: 'APROVAR_PACIENTE', entidade: 'paciente', entidadeId });
});
```

Fora de transação, use `auditoria.registrar(...)`, que nunca interrompe a operação.

**Nunca** coloque em `detalhes` senha, conteúdo de exame ou tipo sanguíneo.

Já auditadas: login (e falhas), logout, recuperação/redefinição de senha, primeiro acesso,
pré-cadastro, gestão de usuários, hospitais, representantes e médicos, e atualização de necessidades.
Perfil do paciente e encerramento de conta ainda não têm endpoint na API: ao criá-los, aplique `@Auditar`.
