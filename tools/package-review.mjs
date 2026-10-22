import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 100 * 1024 * 1024 })
const output = process.argv[2]
if (!output || !output.endsWith('.zip')) throw new Error('Informe o caminho de saída .zip fora do repositório.')
const destination = resolve(output)
if (destination.startsWith(resolve(root))) throw new Error('Salve o pacote fora do repositório para não incluir a própria entrega.')
if (existsSync(destination)) throw new Error('O destino já existe; preserve o pacote anterior ou escolha outro nome.')
if (git('status', '--porcelain').toString().trim()) throw new Error('Registre ou separe as alterações antes de empacotar um commit revisável.')
const commit = git('rev-parse', 'HEAD').toString().trim()
const files = git('ls-tree', '-r', '--name-only', '-z', commit).toString().split('\0').filter(Boolean)
const forbidden = files.filter(path =>
  (/(^|\/)\.env(?:\..*)?$/i.test(path) && !/(^|\/)\.env(?:\.production)?\.example$/i.test(path)) ||
  /\.(?:bundle|dump|backup|pem|key|p12|pfx|jks|keystore)$|(^|\/)(id_rsa|id_ed25519|hemobridge-equipe)$|(^|\/)\.aws\//i.test(path))
if (forbidden.length) throw new Error(`Arquivos operacionais não podem acompanhar o pacote: ${forbidden.join(', ')}`)
const markers = [
  new RegExp('-----BEGIN ' + '(?:RSA |OPENSSH |EC |DSA |ENCRYPTED )?PRIVATE KEY-----'),
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bASIA[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
]
const findings = []
for (const path of files) {
  const data = git('show', `${commit}:${path}`)
  if (data.includes(0)) continue
  if (markers.some(pattern => pattern.test(data.toString('utf8')))) findings.push(path)
}
if (findings.length) throw new Error(`Revise os possíveis segredos antes de compartilhar: ${findings.join(', ')}`)
mkdirSync(dirname(destination), { recursive: true })
git('archive', '--format=zip', '--prefix=HemoBridge/', `--output=${destination}`, commit)
const archive = readFileSync(destination)
const manifest = {
  project: 'HemoBridge', commit, createdAt: new Date().toISOString(), trackedFiles: files.length,
  bytes: archive.length, sha256: createHash('sha256').update(archive).digest('hex'),
  setup: 'HemoBridge/docs/guia-de-testes.md',
  scope: 'Código versionado; sem histórico Git, banco em execução, objetos clínicos ou arquivos locais não versionados.',
  verification: { forbiddenFilenames: forbidden.length, detectedCredentialMarkers: findings.length },
  note: 'As credenciais declaradas nas fixtures e no workflow são exclusivamente de teste. Configure segredos próprios; não use a carga de testes em produção.',
}
writeFileSync(`${destination}.manifest.json`, JSON.stringify(manifest,null,2)+'\n', { flag: 'wx' })
console.log(JSON.stringify({ destination, ...manifest },null,2))
