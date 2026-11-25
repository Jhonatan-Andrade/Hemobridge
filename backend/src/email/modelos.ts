import { readFileSync } from 'node:fs';
import type { ImagemEmail } from './email.service.js';

// Fora de src/ para valer o mesmo caminho relativo em src/email e em dist/email.
const PASTA = new URL('../../assets/email/', import.meta.url);

const CID_LOGO = 'logo-hemobridge';
const MODELO_REDEFINIR_SENHA = readFileSync(new URL('redefinir-senha.html', PASTA), 'utf8');
const MODELO_CONTA_CRIADA = readFileSync(new URL('conta-criada.html', PASTA), 'utf8');

/** Logo embutido na mensagem: os leitores de e-mail não alcançam o endereço local do frontend. */
export const LOGO_EMAIL: ImagemEmail = {
  nome: 'logo-hemobridge.png',
  cid: CID_LOGO,
  conteudo: readFileSync(new URL('logo-hemobridge.png', PASTA)),
};

/** HTML do e-mail de redefinição de senha. Envie junto com LOGO_EMAIL. */
export function htmlRedefinirSenha(dados: { nome: string; link: string; minutos: number }): string {
  return preencher(MODELO_REDEFINIR_SENHA, { ...dados, logo_cid: CID_LOGO });
}

/** HTML do e-mail com a senha provisória de uma conta criada por terceiros. Envie junto com LOGO_EMAIL. */
export function htmlContaCriada(dados: {
  nome: string;
  perfil: string;
  email: string;
  senha: string;
  horas: number;
  link: string;
}): string {
  return preencher(MODELO_CONTA_CRIADA, { ...dados, logo_cid: CID_LOGO });
}

/** Troca cada {{campo}} pelo valor, escapado para HTML. */
function preencher(modelo: string, campos: Record<string, string | number>): string {
  return modelo.replace(/\{\{(\w+)\}\}/g, (_, campo: string) => {
    if (!(campo in campos)) throw new Error(`Campo sem valor no modelo de e-mail: ${campo}`);
    return escaparHtml(String(campos[campo]));
  });
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
