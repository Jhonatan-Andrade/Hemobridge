import fs from 'node:fs'
import path from 'node:path'
const root=new URL('../src/',import.meta.url)
const bad=fs.readdirSync(root,{recursive:true}).filter(file=>!file.split(/[\\/]/).every(part=>/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+)?$/.test(part)))
if(bad.length){console.error('Nomes fora de kebab-case:',bad.map(name=>path.normalize(name)));process.exit(1)}
console.log('Nomenclatura do frontend validada.')
