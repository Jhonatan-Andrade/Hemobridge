import { useState } from 'react'
import type { HospitalAdminResumo } from '../../api/types'
import { DataTable } from '../../components/DataTable'
import { PageTitle } from '../../components/layout/AppShell'
import { EmptyState, ErrorState, Loading, Message, Pagination, Panel, SelectField, TextField } from '../../components/ui'
import { UFS } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { hospitaisAdminService } from '../../services/admin'
import { AdminLayout } from './AdminLayout'
import { HospitalForm } from './HospitalForm'
import { HospitalPainel } from './HospitalPainel'
import { focarPainel } from './painel'

const TAMANHO = 10
const opcoesUf = UFS.map((uf) => ({ value: uf, label: uf }))
const opcoesSituacao = [
  { value: 'true', label: 'Ativo' },
  { value: 'false', label: 'Inativo' },
]

// Figma: Web desktop / Administrador / Instituições e representantes (101:3111).
export function InstituicoesPage() {
  const [filtros, setFiltros] = useState({ estado: '', situacao: '', busca: '' })
  const [pagina, setPagina] = useState(1)
  const [versao, setVersao] = useState(0)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')

  const busca = filtros.busca.trim()
  const lista = useAsync(
    () =>
      hospitaisAdminService.listar({
        estado: filtros.estado || undefined,
        ativo: filtros.situacao ? filtros.situacao === 'true' : undefined,
        busca: busca || undefined,
        pagina,
        tamanhoPagina: TAMANHO,
      }),
    [filtros.estado, filtros.situacao, busca, pagina, versao],
  )

  const filtrar = (campo: keyof typeof filtros, valor: string) => {
    setFiltros({ ...filtros, [campo]: valor })
    setPagina(1)
  }

  const selecionar = (id: string | null) => {
    setSelecionado(id)
    setAviso('')
    focarPainel()
  }

  const aoAlterar = (mensagem: string, id?: string) => {
    setAviso(mensagem)
    setVersao((v) => v + 1)
    if (id) setSelecionado(id)
  }

  return (
    <AdminLayout>
      <PageTitle titulo="Instituições · Hospitais e representantes" descricao="Gerencie hospitais cadastrados, sua localização e representantes vinculados." />

      <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField label="Estado" hint="Estados do Brasil" placeholder="Todos os estados" options={opcoesUf} value={filtros.estado} onChange={(e) => filtrar('estado', e.target.value)} />
        <SelectField label="Situação" hint="Ativos ou inativos" placeholder="Todas" options={opcoesSituacao} value={filtros.situacao} onChange={(e) => filtrar('situacao', e.target.value)} />
        <TextField label="Buscar" type="search" hint="Nome, cidade ou CNPJ" value={filtros.busca} onChange={(e) => filtrar('busca', e.target.value)} />
      </div>

      {aviso && (
        <Message tone="success">
          <p>{aviso}</p>
        </Message>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <h2 className="text-section font-semibold text-ink">Registros</h2>
          {lista.carregando ? (
            <Loading texto="Carregando hospitais…" />
          ) : lista.erro || !lista.dados ? (
            <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar os hospitais.']} onRetry={lista.recarregar} />
          ) : !lista.dados.itens.length ? (
            <EmptyState title="Nenhum hospital encontrado">Ajuste os filtros ou cadastre um novo hospital.</EmptyState>
          ) : (
            <>
              <DataTable<HospitalAdminResumo>
                legenda="Hospitais cadastrados"
                itens={lista.dados.itens}
                chave={(h) => h.id}
                colunas={[
                  { titulo: 'Hospital', largura: 'w-2/5', celula: (h) => h.nome },
                  { titulo: 'Localização', celula: (h) => `${h.cidade} / ${h.estado}` },
                  {
                    titulo: 'Situação',
                    celula: (h) => <span className={h.ativo ? 'text-success' : 'text-error'}>{h.ativo ? 'Ativo' : 'Inativo'}</span>,
                  },
                  {
                    titulo: 'Ação',
                    celula: (h) => (
                      <button
                        type="button"
                        onClick={() => selecionar(h.id)}
                        aria-pressed={selecionado === h.id}
                        className="rounded font-medium text-brand hover:underline"
                      >
                        Detalhes<span className="sr-only"> de {h.nome}</span>
                      </button>
                    ),
                  },
                ]}
              />
              <Pagination pagina={pagina} total={lista.dados.total} tamanhoPagina={TAMANHO} onChange={setPagina} />
            </>
          )}
          <p className="text-small text-muted">Cadastros autorizados para este perfil. Dados clínicos permanecem na área privada.</p>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-3">
            <h2 id="painel-admin" tabIndex={-1} className="text-section font-semibold text-ink outline-none">
              {selecionado ? 'Editar hospital' : 'Cadastrar hospital'}
            </h2>
            {selecionado && (
              <button type="button" onClick={() => selecionar(null)} className="shrink-0 rounded text-small font-medium text-brand hover:underline">
                Novo cadastro
              </button>
            )}
          </div>
          {selecionado ? (
            <HospitalPainel key={selecionado} id={selecionado} onAlterado={aoAlterar} />
          ) : (
            <HospitalForm key={versao} onSalvo={aoAlterar} />
          )}
        </Panel>
      </div>
    </AdminLayout>
  )
}
