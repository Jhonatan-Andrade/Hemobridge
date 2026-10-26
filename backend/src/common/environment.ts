export function validateEnvironment(env: Record<string, unknown>) {
  if (env.NODE_ENV !== 'production') return env;
  for (const key of [
    'DATABASE_URL',
    'JWT_SECRET',
    'FRONTEND_URL',
    'ARMAZENAMENTO_CHAVE',
    'S3_BUCKET',
    'S3_KMS_KEY_ID',
    'SMTP_HOST',
    'EMAIL_REMETENTE',
    'LEGAL_ENTITY_NAME',
    'PRIVACY_CONTACT',
  ]) {
    if (typeof env[key] !== 'string' || !env[key])
      throw new Error(`Configuração obrigatória ausente: ${key}`);
  }
  if (String(env.JWT_SECRET).length < 48)
    throw new Error(
      'JWT_SECRET precisa ter pelo menos 48 caracteres aleatórios.',
    );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(env.PRIVACY_CONTACT)))
    throw new Error('PRIVACY_CONTACT deve ser um e-mail operacional válido.');
  if (!String(env.FRONTEND_URL).startsWith('https://'))
    throw new Error('FRONTEND_URL precisa usar HTTPS.');
  if (
    String(env.CORS_ORIGENS ?? env.FRONTEND_URL)
      .split(',')
      .some((v) => !v.trim().startsWith('https://') || v.includes('*'))
  )
    throw new Error('CORS exige origens HTTPS explícitas.');
  if (!String(env.DATABASE_URL).includes('sslmode=verify-full'))
    throw new Error('DATABASE_URL exige sslmode=verify-full e CA do RDS.');
  if (env.S3_ACCESS_KEY || env.S3_SECRET_KEY || env.S3_ENDPOINT)
    throw new Error('Em produção, use S3 AWS com credenciais da task role.');
  if (Buffer.from(String(env.ARMAZENAMENTO_CHAVE), 'base64').length !== 32)
    throw new Error('ARMAZENAMENTO_CHAVE deve representar 32 bytes.');
  return env;
}
