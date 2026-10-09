# Notificações (HEM-36, HEM-37, HEM-38)

Serviço central para avisar usuários na plataforma e, quando necessário, por e-mail
(Seção 9.2.3). O registro in-app é independente do e-mail: se o envio falhar, a
notificação continua visível e o e-mail fica pendente para nova tentativa.

## Como notificar a partir de outro módulo

```ts
import { NotificacoesService } from '../notificacoes/notificacoes.service.js';

await this.notificacoes.notificar({
  usuarioId: paciente.usuarioId,
  titulo: 'Exame solicitado',
  mensagem: 'O(a) médico(a) solicitou exames. Envie o resultado em "Meus exames".',
  link: '/meus-exames',   // rota do frontend da funcionalidade relacionada
  email: true,            // opcional: também por e-mail
});
```

Dentro de uma transação, registre com `registrarEm(tx, ...)` e chame
`despacharEmails(ids)` **depois** do commit, para não mandar e-mail de uma operação desfeita.

Casos previstos no projeto: consulta cancelada, exame solicitado, resultado da avaliação
médica, desativação de médico/hospital e necessidade crítica.

## Reenvio de e-mails

A cada `NOTIFICACOES_REENVIO_MINUTOS` (padrão 10; `0` desliga) a API tenta de novo os e-mails
que falharam, até 5 tentativas. Os campos `email_tentativas` e `email_ultimo_erro` mostram o
histórico de cada notificação.

## Rotas do usuário (UC12)

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/notificacoes?somenteNaoLidas=&pagina=&tamanhoPagina=` | Lista da mais recente, com `naoLidas` |
| GET | `/notificacoes/nao-lidas` | Contador do ícone |
| GET | `/notificacoes/:id` | Conteúdo completo; marca como lida |
| POST | `/notificacoes/marcar-todas-lidas` | FA01 |

Cada usuário só acessa as próprias notificações; o id de outra pessoa responde 404.

## Necessidade crítica (UC19)

Quando o representante muda um tipo para CRITICO (`PUT /representante/necessidades`), a API
avisa os doadores aprovados e ativos do mesmo estado, com tipo compatível (RN05) e elegíveis
pela estimativa da RN17 (peso do cadastro), excluindo quem já recebeu aviso desse banco nos
últimos 7 dias (RN20). Cada doador recebe **uma** notificação por banco, listando todos os tipos
críticos que pode suprir, com o endereço do banco e por e-mail. A resposta traz
`doadoresNotificados`. Sem doador apto, a ocorrência fica no `log_auditoria`
(`NOTIFICACAO_CRITICA_SEM_DESTINATARIOS`).
