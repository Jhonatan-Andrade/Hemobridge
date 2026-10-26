const missing=['VITE_LEGAL_ENTITY_NAME','VITE_PRIVACY_CONTACT'].filter(name=>!process.env[name]?.trim())
if(missing.length){console.error(`Configuração de publicação ausente: ${missing.join(', ')}`);process.exit(1)}
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.VITE_PRIVACY_CONTACT)){console.error('O canal de privacidade deve ser um e-mail válido.');process.exit(1)}
if(process.env.VITE_API_URL&&!/^\/api$|^https:\/\//.test(process.env.VITE_API_URL)){console.error('Use uma API HTTPS ou o caminho /api.');process.exit(1)}
