# Apresentação do HemoBridge

[Abrir o PowerPoint editável](hemobridge-apresentacao.pptx).

Material preparado em 22/10/2026 para revisão da equipe. Os dez slides apresentam o problema, a proposta, os perfis, a jornada, as interfaces, a arquitetura, a proteção dos dados, os resultados de testes e as etapas restantes. Textos e diagrama de arquitetura permanecem editáveis. As notas de cada slide identificam suas fontes no repositório e os limites das evidências.

Os resultados locais de API e web são de 21/10; os resultados de integração e Flutter são da CI de 19/10. A homologação física citada pertence à base anterior `609b4cb7` e tem cobertura parcial. Essas contagens não atribuem aceite aos 23 casos formais. O [registro de execução](../testes/execucao-pt01-pt23-2026-10-21.md) informa a origem e o que ainda precisa de evidência própria.

Após a preparação dos slides, a rodada de 22/10 passou com 226 unitários e cinco novos cenários integrados da API. A correção do conflito de reservas é acompanhada em HEM-79/commit `f8f1f457`. O slide 8 preserva os números e as datas da rodada anterior explicitamente citada; para o ensaio final, atualizar os números com a CI da versão efetivamente escolhida. As 47 capturas web em três resoluções estão no [registro de responsividade](../testes/responsividade-web-2026-10-21.md).

As imagens do site são capturas reais revisadas em [Início](../tcc/imagens/inicio-web.jpg) e [Locais](../tcc/imagens/locais-web.jpg). A imagem do aplicativo identifica expressamente o **protótipo do Figma**. Nenhuma captura bruta do aparelho, credencial, chave SSH, exame real ou dump de banco acompanha esta apresentação.

## Abertura e conferência

1. Abra o `.pptx` no PowerPoint ou em outro editor compatível.
2. Para manter a identidade visual, confira a disponibilidade de [Poppins](../../assets/fonts/) e de [Fraunces](../../frontend/public/hemobridge/fonts/fraunces-italic.ttf) no computador de apresentação. O arquivo referencia essas famílias e não inclui instalação automática de fontes.
3. Compare a apresentação com as prévias abaixo. As prévias foram renderizadas com as fontes do projeto. A inspeção técnica não incluiu abertura no PowerPoint instalado.
4. Leia o [roteiro de apresentação](../roteiro-apresentacao.md), prepare o ambiente local e realize o ensaio coletivo. Atualize os slides de limites e próximos passos se novas interfaces tiverem sido integradas na versão escolhida para a apresentação.

| Slide | Prévia |
| --- | --- |
| 1 | [Capa](previews/slide-01.png) |
| 2 | [Problema e proposta](previews/slide-02.png) |
| 3 | [Perfis e responsabilidades](previews/slide-03.png) |
| 4 | [Jornada de acompanhamento](previews/slide-04.png) |
| 5 | [Interfaces web e aplicativo](previews/slide-05.png) |
| 6 | [Arquitetura do produto](previews/slide-06.png) |
| 7 | [Persistência e proteção dos dados](previews/slide-07.png) |
| 8 | [Testes e evidências disponíveis](previews/slide-08.png) |
| 9 | [Limites da entrega atual](previews/slide-09.png) |
| 10 | [Próximos passos](previews/slide-10.png) |

A entrega deste material não registra ensaio humano realizado, conclusão de tarefa no Jira, merge ou publicação na AWS. A equipe ainda precisa ensaiar a apresentação, executar a homologação formal e conferir o fluxo completo da versão de entrega.
