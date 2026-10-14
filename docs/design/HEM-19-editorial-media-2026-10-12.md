# Mídia editorial candidata — HemoBridge

> **Estado posterior:** a foto continua no feed; o crédito visível saiu da interface a pedido da usuária, e sua origem permanece nesta nota. Veja o [adendo visual](HEM-18-19-adendo-visual-2026-10-13.md).

Verificação em 12/10/2026. Este registro documenta a origem e o uso. A imagem foi aplicada ao cabeçalho do feed React nas duas cópias locais; a situação do Figma consta do relatório de finalização desta rodada.

| Campo | Registro |
| --- | --- |
| Arquivo local | `hemobridge-ondas-ilustrativas-unsplash-960.jpg` |
| Página do item | [Abstract flowing waves of pink and red colors](https://unsplash.com/photos/abstract-flowing-waves-of-pink-and-red-colors-e01vA10bv4w) |
| Autor público | [remapstudio](https://unsplash.com/@remapstudio) |
| Licença | [Unsplash License](https://unsplash.com/license); a página do item indica “Free to use under the Unsplash License” |
| Crédito sugerido | “Imagem ilustrativa: remapstudio / Unsplash” com links para o autor e o item; a atribuição é apreciada, embora a licença não a exija |
| Arquivo verificado | JPEG, 960 × 540 px, 33.894 bytes, SHA-256 `EE4774F36C2BA09ECF17E00D8749F96BCD23620595957709F2BAC5965808FDC6` |
| Conferência de procedência | Comparação visual do arquivo local com a imagem exibida na página oficial: curvas, cores e enquadramento coincidem. A página identifica o autor, a data de publicação (07/02/2026) e a licença. |

## Decisão editorial

**Apta como peça ilustrativa**, sem pessoas, pacientes, marcas ou alegações clínicas. Ela foi colocada em um painel próprio no cabeçalho da comunidade, com texto e botões sobre superfície sólida, símbolo oficial preservado e recorte curto no mobile. Não a interpretar como evidência de doação, tratamento, banco de sangue ou campanha real. A mesma lógica deve ser reproduzida no Figma, sem substituir o logo por fotografia.

Rótulo visível recomendado perto da imagem: **“Imagem ilustrativa”**. Se a imagem for puramente decorativa e o contexto já estiver claro, usar `alt=""` na web para evitar anúncio redundante. Se aparecer como peça editorial independente, usar `alt="Formas abstratas em vermelho e rosa com curvas suaves"`; o texto alternativo não deve sugerir uma pessoa ou situação clínica. Não embutir texto importante na própria imagem.

Servir uma variante otimizada localmente, com dimensões explícitas e carregamento adequado à posição: imagem acima da dobra com prioridade moderada; outras ocorrências com `loading="lazy"`. Evitar requisitar a imagem diretamente do domínio da fonte durante o uso da aplicação. Conferir legibilidade e corte em 360, 390, 768 e 1440 px, alto zoom e tamanho de fonte ampliado antes de aprovar a composição.

A imagem é estática. Se receber entrada animada, usar movimento breve e discreto apenas onde houver suporte a `prefers-reduced-motion: no-preference`; oferecer o mesmo estado visual final sem animação em `reduce`. Vídeo externo não é necessário para esta peça. Caso se considere vídeo no futuro, exigir origem/licença próprias, pôster estático equivalente, controles e ausência de autoplay com som.

O arquivo não representa autorização de regras clínicas, API, termos jurídicos ou identidade de pessoas. Confirmar a decisão de inserção em web/Figma na revisão visual conjunta, sem alterar o crédito e a rastreabilidade.
