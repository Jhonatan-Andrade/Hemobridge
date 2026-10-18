import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../backend/.env', import.meta.url));
if (existsSync(target)) {
  console.error('O backend/.env já existe. Nenhuma configuração foi sobrescrita. Use o guia de testes para ajustar um ambiente separado.');
  process.exit(1);
}
let content = readFileSync(new URL('../backend/.env.example', import.meta.url), 'utf8');
const values = {
  POSTGRES_PASSWORD: randomBytes(24).toString('hex'),
  POSTGRES_DB: 'hemobridge_teste', POSTGRES_PORT: '5436',
  JWT_SECRET: randomBytes(48).toString('base64'),
  ARMAZENAMENTO_CHAVE: randomBytes(32).toString('base64'),
  ADMIN_NOME: '', ADMIN_EMAIL: '', ADMIN_CPF: '', ADMIN_SENHA_INICIAL: '',
  SMTP_PORTA: '1027', S3_ENDPOINT: 'http://localhost:8335',
};
values.DATABASE_URL = `postgresql://hemobridge:${values.POSTGRES_PASSWORD}@localhost:5436/hemobridge_teste`;
for (const [key, value] of Object.entries(values)) content = content.replace(new RegExp(`^${key}=.*$`, 'm'), () => `${key}=${value}`);
content += '\nNODE_ENV=development\nS3_PORTA=8335\nMAILPIT_SMTP_PORT=1027\nMAILPIT_UI_PORT=8027\nSEED_TESTE_ESCALA=0.04\n';
writeFileSync(target, content, { flag: 'wx', mode: 0o600 });
console.log('Configuração local criada. Os segredos gerados ficam somente no backend/.env e não devem ser compartilhados. Continue em docs/guia-de-testes.md.');
