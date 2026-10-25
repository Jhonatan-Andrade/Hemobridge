import { useState } from 'react'
import type { Perfil, StatusUsuario, UsuarioAdminResumo } from '../../api/types'
import { DataTable } from '../../components/DataTable'
import { PageTitle } from '../../components/layout/AppShell'
import { EmptyState, ErrorState, Loading, Message, Pagination, Panel, SelectField, TextField } from '../../components/ui'
import { PAPEIS, PERFIS, STATUS_USUARIO } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { usuariosAdminService } from '../../services/admin'
import { AdminLayout } from './AdminLayout'
import { NovoAdministradorForm } from './NovoAdministradorForm'
import { focarPainel } from './painel'
import { UsuarioPainel } from './UsuarioPainel'

const TAMANHO = 10
const opcoesPerfil = Object.entries(PERFIS).map(([value, label]) => ({ value, label }))
const opcoesStatus = Object.entries(STATUS_USUARIO).map(([value, label]) => ({ value, label }))

// Figma: Web desktop / Administrador / Usuários e solicitações (101:3112).
export function UsuariosPage() {
  const [filtros, setFiltros] = useState({ perfil: '', status: '', busca: '' })
  const [pagina, setPagina] = useState(1)
  const [versao, setVersao] = useState(0)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')

  // O backend exige ao menos 2 caracteres na busca.
  const busca = filtros.busca.trim().length >= 2 ? filtros.busca.trim() : ''
  const lista = useAsync(
    () =>
      usuariosAdminService.listar({
        perfil: (filtros.perfil || undefined) as Perfil | undefined,
        status: (filtros.status || undefined) as StatusUsuario | undefined,
        busca: busca || undefined,
        pagina,
        tamanhoPagina: TAMANHO,
      }),
    [filtros.perfil, filtros.status, busca, pagina, versao],
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
      <PageTitle titulo="Usuários" descricao="Filtre por perfil e situação, consulte cadastros e gerencie acessos administrativos." />

      <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField label="Perfil" hint="Selecione para filtrar" placeholder="Todos os perfis" options={opcoesPerfil} value={filtros.perfil} onChange={(e) => filtrar('perfil', e.target.value)} />
        <SelectField label="Situação" hint="Selecione para filtrar" placeholder="Todas" options={opcoesStatus} value={filtros.status} onChange={(e) => filtrar('status', e.target.value)} />
        <TextField label="Buscar" type="search" hint="Nome, e-mail ou CPF (mínimo de 2 caracteres)" value={filtros.busca} onChange={(e) => filtrar('busca', e.target.value)} />
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
            <Loading texto="Carregando usuários…" />
          ) : lista.erro || !lista.dados ? (
            <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar os usuários.']} onRetry={lista.recarregar} />
          ) : !lista.dados.itens.length ? (
            <EmptyState title="Nenhum usuário encontrado">Ajuste os filtros para ampliar a busca.</EmptyState>
          ) : (
            <>
              <DataTable<UsuarioAdminResumo>
                legenda="Usuários cadastrados"
                itens={lista.dados.itens}
                chave={(u) => u.id}
                colunas={[
                  {
                    titulo: 'Usuário',
                    largura: 'w-2/5',
                    celula: (u) => (
                      <span className="flex flex-col">
                        <span>{u.nome}</span>
                        <span className="font-normal text-muted">{u.email}</span>
                      </span>
                    ),
                  },
                  { titulo: 'Perfil', celula: (u) => (u.hospital ? `${PAPEIS[u.papel]} · ${u.hospital}` : PAPEIS[u.papel]) },
                  {
                    titulo: 'Situação',
                    celula: (u) => (
                      <span className={u.status === 'ATIVO' ? 'text-success' : 'text-error'}>
                        {u.primeiroAcessoPendente && u.status === 'ATIVO' ? 'Pendente' : STATUS_USUARIO[u.status]}
                      </span>
                    ),
                  },
                  {
                    titulo: 'Ação',
                    celula: (u) => (
                      <button
                        type="button"
                        onClick={() => selecionar(u.id)}
                        aria-pressed={selecionado === u.id}
                        className="rounded font-medium text-brand hover:underline"
                      >
                        Detalhes<span className="sr-only"> de {u.nome}</span>
                      </button>
                    ),
                  },
                ]}
              />
              <Pagination pagina={pagina} total={lista.dados.total} tamanhoPagina={TAMANHO} onChange={setPagina} />
            </>
          )}
          <p className="text-small text-muted">Pendente = conta criada que ainda não fez o primeiro acesso. Dados clínicos permanecem na área privada.</p>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-3">
            <h2 id="painel-admin" tabIndex={-1} className="text-section font-semibold text-ink outline-none">
              {selecionado ? 'Detalhes do usuário' : 'Novo administrador'}
            </h2>
            {selecionado && (
              <button type="button" onClick={() => selecionar(null)} className="shrink-0 rounded text-small font-medium text-brand hover:underline">
                Novo administrador
              </button>
            )}
          </div>
          {selecionado ? (
            <UsuarioPainel key={selecionado} id={selecionado} onAlterado={aoAlterar} />
          ) : (
            <NovoAdministradorForm onCriado={aoAlterar} />
          )}
        </Panel>
      </div>
    </AdminLayout>
  )
}
