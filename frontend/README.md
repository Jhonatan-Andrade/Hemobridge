# HemoBridge — frontend

Interface React/TypeScript da HEM-18/19. A navegação mantém home pública, comunidade, jornada do paciente e áreas profissionais separadas. Os dados e as ações atuais são locais; integração com autenticação, API e agenda ainda é necessária antes de um lançamento funcional.

## Executar

```sh
npm install
npm run dev
```

Abra a URL local indicada pelo Vite. As rotas usam fragmentos de URL, por exemplo `#home`, `#community` e `#dashboard`.

## Verificar

```sh
npm run build
npm run lint
```

A identidade, os componentes e os testes visuais desta revisão estão em [HEM-18/19 — identidade e navegação](../docs/design/HEM-18-19-identidade-navegacao-2026-10-14.md). O arquivo Figma existente continua sendo a referência editável; consulte a seção de diferenças entre protótipo e web antes de alterar fluxos.
