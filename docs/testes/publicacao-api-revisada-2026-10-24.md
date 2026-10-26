# Publicação da API revisada — 24/10/2026

Esta publicação foi autorizada depois da rodada local de alinhamento aos requisitos. O commit `be3430c72f54856944d35d01dbdaae7eb3c00171` foi enviado à branch `review/hem-18-19-2026-10-14` do [pull request 3](https://github.com/Jhonatan-Andrade/Hemobridge/pull/3), preservando o histórico. O merge permanece com Jhonatan.

O [relatório dos testes locais](alinhamento-requisitos-2026-10-24.md) conserva o escopo da execução anterior à autorização de publicação. Sua menção a ausência de push pertence àquela rodada e não descreve esta ação posterior.

## Verificação inicial no GitHub

A [execução de pull request 40140307201](https://github.com/Jhonatan-Andrade/Hemobridge/actions/runs/40140307201) aprovou web e aplicativo, incluindo os testes Flutter e a compilação do APK. Na API, instalação, aplicação das migrações, lint, compilação, 292 testes unitários e 100 de integração passaram. A execução da API foi reprovada somente na auditoria das dependências de produção.

Os avisos de alta severidade envolveram dependências transitivas de processamento de requisições e upload: [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828) e [Multer](https://github.com/advisories/GHSA-q7qp-rjg7-q26m). A correção preserva a auditoria e a versão do NestJS, sem downgrade ou uso de `npm audit fix --force`.

## Atualização compatível das dependências

| Pacote | Versão anterior | Versão aplicada | Tratamento |
| --- | --- | --- | --- |
| body-parser | 2.3.0 | 2.4.0 | Atualização transitiva no intervalo aceito pelo Express. |
| multer | 2.4.0 | 2.5.0 | Override limitado à dependência de `@nestjs/platform-express`, mantendo a versão principal 2. |
| fast-uri | 3.1.8 | 3.1.9 | Atualização corretiva transitiva. |
| nodemailer | 10.0.14 | 10.1.4 | Versão mínima atualizada na dependência direta, mantendo a versão principal 10. |
| qs | 6.16.0 | 6.16.1 | Atualização transitiva exigida pelo novo body-parser. |

Os avisos de [fast-uri](https://github.com/advisories/GHSA-w74x-v6f9-j3xg) e [Nodemailer](https://github.com/advisories/GHSA-8c8m-p3m8-cjg8) também foram tratados. NestJS core/platform-express 12.1.2 e Express 5.2.1 foram mantidos.

A auditoria local das dependências de produção, com o mesmo critério da CI (`npm audit --omit=dev --audit-level=high`), não apontou vulnerabilidades após a atualização. Isso registra o resultado do catálogo consultado em 24/10, sem equivaler a uma certificação integral de segurança.

## Regressões após a atualização

Lint e compilação da API passaram. A nova execução dos testes unitários aprovou 292 testes em 35 arquivos, às 19:59:50, com duração de 20,13 segundos. A integração aprovou 100 testes em 15 arquivos, às 19:59:38, com duração de 40,29 segundos, usando as 16 migrações e serviços locais exclusivos. Os logs `ci-dependencias-unitarios.log`, `ci-dependencias-integracao.log`, `ci-dependencias-lint.log`, `ci-dependencias-build.log` e `ci-dependencias-audit-producao.json` ficam em `work/alinhamento-requisitos-2026-10-24/`, fora do pacote de código.

A instalação limpa foi repetida com a configuração de teste, aprovando `npm ci`, a geração do Prisma Client 7.10.1 e a árvore de dependências. A auditoria foi repetida depois dessa instalação e retornou código zero, sem vulnerabilidades de produção. Evidências: `ci-dependencias-ci-install-com-ambiente.log`, `ci-dependencias-arvore.log` e `ci-dependencias-audit-producao-final.json`. A primeira tentativa local de instalação havia falhado por ausência de `DATABASE_URL` no processo; o log foi preservado, e não foi contado como instalação aprovada.

## Escopo da publicação

Esta etapa publica a API revisada e seus clientes compatíveis. Não altera a jornada de apresentação, os pontos iniciais ou as conexões do Figma. A nova abertura pública pela página do visitante e a reformulação do tour precisam primeiro de uma tabela de proposta e aprovação explícita. Os testes físicos do aplicativo dependem do Android conectado; a CI e o APK compilado são evidências distintas da homologação em aparelho.

Nenhuma atualização foi aplicada à VM, ao banco operacional ou à infraestrutura AWS. Não houve merge ou publicação em loja.
