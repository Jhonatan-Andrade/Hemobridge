import { PageTitle } from '../../components/layout/AppShell'
import { EmptyState, ErrorState, Loading } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'
import { atendimentoService } from '../../services/medico'
import { ConsultaCard } from './AgendaPage'
import { MedicoLayout } from './MedicoLayout'

// Item "Atendimento" do menu (558:5767): consultas marcadas, da mais próxima para a mais distante.
export function AtendimentosPage() {
  const lista = useAsync(
    () =>
      atendimentoService
        .listar({ situacao: 'AGENDADA', tamanhoPagina: 50 })
        .then((r) => [...r.itens].sort((a, b) => a.inicio.localeCompare(b.inicio))),
    [],
  )

  return (
    <MedicoLayout>
      <PageTitle
        titulo="Atendimento"
        descricao="Consultas marcadas pelos pacientes. Abra a consulta para entrar na sala de teleconsulta e registrar o desfecho."
      />
      {lista.carregando ? (
        <Loading texto="Carregando consultas…" />
      ) : lista.erro || !lista.dados ? (
        <ErrorState mensagens={lista.erro ?? ['Não foi possível carregar as consultas.']} onRetry={lista.recarregar} />
      ) : !lista.dados.length ? (
        <EmptyState title="Nenhuma consulta marcada">
          Quando um paciente agendar um dos seus horários, a consulta aparece aqui. Atendimentos anteriores ficam no Histórico da agenda.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.dados.map((c) => (
            <ConsultaCard key={c.id} consulta={c} />
          ))}
        </ul>
      )}
    </MedicoLayout>
  )
}
