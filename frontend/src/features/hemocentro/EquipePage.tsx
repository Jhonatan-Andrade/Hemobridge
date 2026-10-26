import { useState } from 'react'
import type { MembroEquipe, StatusUsuario } from '../../api/types'
import { DataTable } from '../../components/DataTable'
import { PageTitle } from '../../components/layout/AppShell'
import { EmptyState, ErrorState, Loading, Message, Pagination, Panel, SelectField, TextField } from '../../components/ui'
import { PAPEIS, STATUS_USUARIO } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { equipeService } from '../../services/equipe'
import { focarPainel } from '../admin/painel'
import { HemocentroLayout } from './HemocentroLayout'
import { MembroPainel } from './MembroPainel'
import { NovoMedicoForm } from './NovoMedicoForm'

const TAMANHO = 10
const opcoesStatus = (['ATIVO', 'INATIVO'] as const).map((s) => ({ value: s, label: STATUS_USUARIO[s] }))

// RF14 – equipe do hemocentro. Figma: Representante de Hospital / Equipe médica (101:3113).
export function EquipePage() {
  const [filtros, setFiltros] = useState({ status: '', busca: '' })
  const [pagina, setPagina] = useState(1)
  const [versao, setVersao] = useState(0)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')

  // O backend exige ao menos 2 caracteres na busca.
  const busca = filtros.busca.trim().length >= 2 ? filtros.busca.trim() : ''
  const lista = useAsync(
    () =>
      equipeService.listar({
        status: (filtros.status || undefined) as StatusUsuario | undefined,
        busca: busca || undefined,
        pagina,
        tamanhoPagina: TAMANHO,
      }),
    [filtros.status, busca, pagina, versao],
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
    <HemocentroLayout>
      <PageTitle titulo="Equipe" descricao="Cadastre os médicos do hemocentro. Cada um recebe uma senha provisória por e-mail." />

      <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField label="Situação" hint="Selecione para filtrar" placeholder="Todas" options={opcoesStatus} value={filtros.status} onChange={(e) => filtrar('status', e.target.value)} />
        <TextField label="Buscar" type="search" hint="Nome ou e-mail (mínimo de 2 caracteres)" value={filtros.busca} onChange={(e) => filtrar('busca', e.target.value)} />
      </div>

      {aviso && (
        <Message tone="success">
          <p>{aviso}</p>
        </Message>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <h2 className="text-section font-semibold text-ink">Membros</h2>
          {lista.carregando ? (
            <Loading texto="Carregando a equipe…" />
          ) : lista.erro || !lista.dados ? (
            <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar a equipe.']} onRetry={lista.recarregar} />
          ) : !lista.dados.itens.length ? (
            <EmptyState title="Ninguém encontrado">
              {busca || filtros.status ? 'Ajuste os filtros para ampliar a busca.' : 'Cadastre o primeiro médico no formulário ao lado.'}
            </EmptyState>
          ) : (
            <>
              <DataTable<MembroEquipe>
                legenda="Equipe do hemocentro"
                itens={lista.dados.itens}
                chave={(m) => m.id}
                colunas={[
                  {
                    titulo: 'Nome',
                    largura: 'w-2/5',
                    celula: (m) => (
                      <span className="flex flex-col">
                        <span>{m.nome}</span>
                        <span className="font-normal text-muted">{m.email}</span>
                      </span>
                    ),
                  },
                  { titulo: 'Papel', celula: (m) => PAPEIS[m.papel] },
                  {
                    titulo: 'Situação',
                    celula: (m) => (
                      <span className={m.status === 'ATIVO' ? 'text-success' : 'text-error'}>
                        {m.primeiroAcessoPendente && m.status === 'ATIVO' ? 'Pendente' : STATUS_USUARIO[m.status]}
                      </span>
                    ),
                  },
                  {
                    titulo: 'Ação',
                    celula: (m) =>
                      m.papel === 'MEDICO' ? (
                        <button
                          type="button"
                          onClick={() => selecionar(m.id)}
                          aria-pressed={selecionado === m.id}
                          className="rounded font-medium text-brand hover:underline"
                        >
                          Detalhes<span className="sr-only"> de {m.nome}</span>
                        </button>
                      ) : (
                        <span className="text-muted">Gerido pela plataforma</span>
                      ),
                  },
                ]}
              />
              <Pagination pagina={pagina} total={lista.dados.total} tamanhoPagina={TAMANHO} onChange={setPagina} />
            </>
          )}
          <p className="text-small text-muted">Pendente = ainda não fez o primeiro acesso.</p>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-3">
            <h2 id="painel-admin" tabIndex={-1} className="text-section font-semibold text-ink outline-none">
              {selecionado ? 'Editar médico' : 'Cadastrar médico'}
            </h2>
            {selecionado && (
              <button type="button" onClick={() => selecionar(null)} className="shrink-0 rounded text-small font-medium text-brand hover:underline">
                Novo médico
              </button>
            )}
          </div>
          {selecionado ? (
            <MembroPainel key={selecionado} id={selecionado} onAlterado={aoAlterar} />
          ) : (
            <NovoMedicoForm
              onCriado={(mensagem, id) => {
                aoAlterar(mensagem)
                setSelecionado(id)
              }}
            />
          )}
        </Panel>
      </div>
    </HemocentroLayout>
  )
}
