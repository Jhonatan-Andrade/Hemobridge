import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { HemocentroGestaoResumo } from '../../api/types'
import { DataTable } from '../../components/DataTable'
import { PageTitle } from '../../components/layout/AppShell'
import { ButtonLink, EmptyState, ErrorState, Loading, Message, Pagination, Panel, SelectField, TextField } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { gestaoHemocentrosService } from '../../services/admin'
import { AdminLayout } from './AdminLayout'
import type { AvisoHemocentros } from './CadastroHemocentroPage'
import { HemocentroPainel } from './HemocentroPainel'
import { focarPainel } from './painel'

const TAMANHO = 10
const opcoesSituacao = [
  { value: 'true', label: 'Ativo' },
  { value: 'false', label: 'Inativo' },
]

// RF15 – lista simples de hemocentros. Figma: Administrador / Instituições e representantes (101:3111).
export function HemocentrosPage() {
  // Ao voltar do cadastro, abre o hemocentro recém-criado com a mensagem de sucesso.
  const vindoDoCadastro = useLocation().state as AvisoHemocentros | null
  const [filtros, setFiltros] = useState({ situacao: '', busca: '' })
  const [pagina, setPagina] = useState(1)
  const [versao, setVersao] = useState(0)
  const [selecionado, setSelecionado] = useState<string | null>(vindoDoCadastro?.selecionado ?? null)
  const [aviso, setAviso] = useState(vindoDoCadastro?.aviso ?? '')

  const busca = filtros.busca.trim()
  const lista = useAsync(
    () =>
      gestaoHemocentrosService.listar({
        ativo: filtros.situacao ? filtros.situacao === 'true' : undefined,
        busca: busca || undefined,
        pagina,
        tamanhoPagina: TAMANHO,
      }),
    [filtros.situacao, busca, pagina, versao],
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

  const aoAlterar = (mensagem: string) => {
    setAviso(mensagem)
    setVersao((v) => v + 1)
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle titulo="Hemocentros" descricao="Cadastre e desative hemocentros e crie o Admin de cada um." />
        <ButtonLink to="/admin/hemocentros/novo" className="shrink-0">
          Cadastrar hemocentro
        </ButtonLink>
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <Loading texto="Carregando hemocentros…" />
          ) : lista.erro || !lista.dados ? (
            <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar os hemocentros.']} onRetry={lista.recarregar} />
          ) : !lista.dados.itens.length ? (
            <EmptyState title="Nenhum hemocentro encontrado">Ajuste os filtros ou cadastre um novo hemocentro.</EmptyState>
          ) : (
            <>
              <DataTable<HemocentroGestaoResumo>
                legenda="Hemocentros cadastrados"
                itens={lista.dados.itens}
                chave={(h) => h.id}
                colunas={[
                  { titulo: 'Hemocentro', largura: 'w-2/5', celula: (h) => h.nome },
                  { titulo: 'Localização', celula: (h) => `${h.cidade} / ${h.estado}` },
                  { titulo: 'Equipe', celula: (h) => `${h.totalAdmins} admin · ${h.totalMedicos} médico(s)` },
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
          <p className="text-small text-muted">Dados de pacientes e doações não aparecem nesta área.</p>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-3">
            <h2 id="painel-admin" tabIndex={-1} className="text-section font-semibold text-ink outline-none">
              {selecionado ? 'Editar hemocentro' : 'Detalhes do hemocentro'}
            </h2>
            {selecionado && (
              <button type="button" onClick={() => selecionar(null)} className="shrink-0 rounded text-small font-medium text-brand hover:underline">
                Fechar
              </button>
            )}
          </div>
          {selecionado ? (
            <HemocentroPainel key={selecionado} id={selecionado} onAlterado={aoAlterar} />
          ) : (
            <>
              <p className="text-body text-muted">Escolha "Detalhes" em um hemocentro da lista para editar os dados, desativar ou adicionar administradores.</p>
              <ButtonLink to="/admin/hemocentros/novo" kind="secondary">
                Cadastrar hemocentro
              </ButtonLink>
            </>
          )}
        </Panel>
      </div>
    </AdminLayout>
  )
}
