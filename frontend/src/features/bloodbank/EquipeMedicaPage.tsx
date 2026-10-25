import { useState } from 'react'
import type { Medico, StatusUsuario } from '../../api/types'
import { DataTable } from '../../components/DataTable'
import { PageTitle } from '../../components/layout/AppShell'
import { EmptyState, ErrorState, Loading, Message, Pagination, Panel, SelectField, TextField } from '../../components/ui'
import { STATUS_USUARIO } from '../../lib/formato'
import { useAsync } from '../../lib/useAsync'
import { medicosService } from '../../services/medicos'
import { focarPainel } from '../admin/painel'
import { BloodBankLayout } from './BloodBankLayout'
import { MedicoPainel } from './MedicoPainel'
import { NovoMedicoForm } from './NovoMedicoForm'

const TAMANHO = 10
const opcoesStatus = Object.entries(STATUS_USUARIO).map(([value, label]) => ({ value, label }))

// Figma: Web desktop / Representante de Hospital / Equipe médica (101:3113).
export function EquipeMedicaPage() {
  const [filtros, setFiltros] = useState({ status: '', busca: '' })
  const [pagina, setPagina] = useState(1)
  const [versao, setVersao] = useState(0)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')

  // O backend exige ao menos 2 caracteres na busca.
  const busca = filtros.busca.trim().length >= 2 ? filtros.busca.trim() : ''
  const lista = useAsync(
    () =>
      medicosService.listar({
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
    <BloodBankLayout>
      <PageTitle titulo="Equipe médica · Médicos" descricao="Cadastre e gerencie médicos da instituição após conferir CRM e UF." />

      <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField label="Situação" hint="Selecione para filtrar" placeholder="Todas" options={opcoesStatus} value={filtros.status} onChange={(e) => filtrar('status', e.target.value)} />
        <TextField label="Buscar" type="search" hint="Nome, e-mail ou CRM (mínimo de 2 caracteres)" value={filtros.busca} onChange={(e) => filtrar('busca', e.target.value)} />
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
            <Loading texto="Carregando médicos…" />
          ) : lista.erro || !lista.dados ? (
            <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar os médicos.']} onRetry={lista.recarregar} />
          ) : !lista.dados.itens.length ? (
            <EmptyState title="Nenhum médico encontrado">
              {busca || filtros.status ? 'Ajuste os filtros para ampliar a busca.' : 'Cadastre o primeiro médico da equipe no formulário ao lado.'}
            </EmptyState>
          ) : (
            <>
              <DataTable<Medico>
                legenda="Médicos da instituição"
                itens={lista.dados.itens}
                chave={(m) => m.id}
                colunas={[
                  {
                    titulo: 'Médico',
                    largura: 'w-2/5',
                    celula: (m) => (
                      <span className="flex flex-col">
                        <span>{m.nome}</span>
                        <span className="font-normal text-muted">{m.email}</span>
                      </span>
                    ),
                  },
                  { titulo: 'CRM/UF', celula: (m) => `${m.crm}/${m.ufCrm}` },
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
                    celula: (m) => (
                      <button
                        type="button"
                        onClick={() => selecionar(m.id)}
                        aria-pressed={selecionado === m.id}
                        className="rounded font-medium text-brand hover:underline"
                      >
                        Detalhes<span className="sr-only"> de {m.nome}</span>
                      </button>
                    ),
                  },
                ]}
              />
              <Pagination pagina={pagina} total={lista.dados.total} tamanhoPagina={TAMANHO} onChange={setPagina} />
            </>
          )}
          <p className="text-small text-muted">Cadastros autorizados para este perfil. Pendente = médico que ainda não fez o primeiro acesso.</p>
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
            <MedicoPainel key={selecionado} id={selecionado} onAlterado={aoAlterar} />
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
    </BloodBankLayout>
  )
}
