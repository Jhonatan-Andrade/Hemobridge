import fs from 'node:fs'
const root=new URL('../backend/prisma/migrations/',import.meta.url)
const migrations=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort()
const sections=migrations.map(name=>fs.readFileSync(new URL(`${name}/migration.sql`,root),'utf8').replace(/\bHEM[- ]?\d+\b/g,'').replace(/\b[AMPHT]\d{2}\b/g,''))
fs.writeFileSync(new URL('./schema.sql',import.meta.url),'-- HemoBridge: estrutura completa para um banco PostgreSQL vazio.\n-- Em atualizações, utilize a cadeia versionada de migrações.\n-- Não contém pessoas, hospitais, credenciais ou massa de teste.\nBEGIN;\n\n'+sections.join('\n\n')+'\nCOMMIT;\n')
console.log(`Schema consolidado a partir de ${migrations.length} migrações.`)
