import fs from 'node:fs'
const input=fs.readFileSync(new URL('./ecs-task-definition.template.json',import.meta.url),'utf8')
const names=[...new Set([...input.matchAll(/\$\{([A-Z_]+)\}/g)].map(m=>m[1]))]
const missing=names.filter(name=>!process.env[name]);if(missing.length)throw new Error(`Configuração ausente: ${missing.join(', ')}`)
if(!process.env.IMAGE_DIGEST.includes('@sha256:'))throw new Error('IMAGE_DIGEST deve usar uma imagem imutável por digest.')
if(!process.env.FRONTEND_URL.startsWith('https://'))throw new Error('FRONTEND_URL deve usar HTTPS.')
const rendered=input.replace(/\$\{([A-Z_]+)\}/g,(_,name)=>JSON.stringify(process.env[name]).slice(1,-1))
JSON.parse(rendered)
fs.writeFileSync(new URL('./ecs-task-definition.rendered.json',import.meta.url),rendered)
console.log('Task definition gerada. Revise os recursos e as permissões antes de registrar na AWS.')
