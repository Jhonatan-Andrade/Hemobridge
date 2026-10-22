# Geolocalização no site e no aplicativo

O site utiliza seletores encadeados de Estado e Município no cadastro, na edição do perfil e na busca de locais. O aplicativo utiliza a mesma busca manual na aba Locais. Não é necessário digitar siglas ou nomes de municípios.

## Localidades do IBGE

As duas versões consultam a [API oficial de localidades do IBGE](https://servicodados.ibge.gov.br/api/docs/localidades), sem chave de acesso:

- Estados: `GET https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome`.
- Municípios da UF: `GET https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios?orderBy=nome`.

O valor do Estado é a sigla, e o do Município é o nome oficial, preservando os contratos existentes da API. A escolha de outra UF limpa o município anterior. O campo Município fica desabilitado até a lista correspondente estar disponível; respostas atrasadas de outra UF são ignoradas. Carregamento, lista vazia e falha têm mensagens distintas. Falhas permitem tentar novamente, com prazo de 15 segundos por requisição. As respostas são validadas antes de criar opções; os acentos são preservados.

No React, o componente compartilhado está em `frontend/src/components/location-selects.tsx`, e o acesso ao IBGE em `frontend/src/services/ibge-localities.ts`. No Flutter, a tela está em `app/lib/features/locations/locations_page.dart`, e o serviço tipado em `app/lib/features/locations/ibge_localities.dart`.

## GPS no aplicativo

O botão **Usar minha localização** verifica o serviço de localização, consulta a permissão e solicita autorização do sistema quando necessário. Uma única ação no app inicia esse fluxo; a confirmação nativa continua sendo uma escolha do usuário. Com autorização, o [geolocator](https://pub.dev/packages/geolocator) obtém uma posição atual com `getCurrentPosition`, precisão média e limite de 15 segundos. Não há assinatura contínua nem localização em segundo plano.

Se a localização estiver desligada, a tela oferece as configurações de localização. Para permissão negada permanentemente, oferece as configurações do app. Recusa, demora ou indisponibilidade mantêm a busca manual. A seleção manual prevalece sobre uma leitura de GPS que termine depois dela. Sair da tela impede novas etapas de permissão ou leitura após o retorno de uma operação pendente; uma leitura já iniciada permanece limitada ao prazo configurado e seu resultado é descartado pela tela encerrada.

A posição fica somente na memória da tela e pode ser limpa. Ao abrir uma busca no Google Maps, apenas coordenadas arredondadas a duas casas decimais ou a cidade/UF escolhida compõem o link. Abrir o Maps é uma ação separada do usuário. O IBGE não recebe as coordenadas. Android possui permissões de localização aproximada/precisa no manifesto; iOS apresenta uma justificativa de uso durante a utilização do aplicativo.

## Validação

No site, execute `npm test`, `npm run lint`, `npm run check:naming` e `npm run build` dentro de `frontend`. No app, execute `flutter analyze` e `flutter test` dentro de `app`.

Os testes automatizados cobrem respostas inválidas e falhas do IBGE, recuperação, acentos, seleção encadeada e resposta antiga após troca de UF. No app, cobrem a captura única após permissão, recusa, bloqueio permanente, serviço desligado, timeout, preferência da seleção manual, saída da tela durante a permissão e layout de 360 pixels com fonte ampliada. O GPS é controlado nos testes; nenhuma localização real do notebook é consultada.

Para validar em Android e iOS com aparelho físico:

1. Abrir Locais sem autorizar GPS e escolher Estado e Município; trocar a UF e conferir a limpeza da seleção.
2. Tocar em Usar minha localização e autorizar somente durante o uso; conferir o sucesso e abrir uma busca no Maps.
3. Recusar a permissão; repetir com bloqueio permanente e com o serviço do celular desligado. Conferir as orientações e os atalhos de configurações.
4. Restaurar a permissão, voltar ao app e tocar novamente no botão; escolher manualmente outra localidade e conferir a região usada pelo Maps.

A análise estática e os testes com plataforma controlada não substituem essa homologação física. O ambiente Windows atual não possui SDK Android para gerar e executar um APK; iOS exige macOS/Xcode e assinatura da equipe.
