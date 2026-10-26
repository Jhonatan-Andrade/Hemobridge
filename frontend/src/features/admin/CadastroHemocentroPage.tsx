import { useNavigate } from 'react-router-dom'
import { PageTitle } from '../../components/layout/AppShell'
import { ButtonLink, Panel } from '../../components/ui'
import { AdminLayout } from './AdminLayout'
import { HemocentroForm } from './HemocentroForm'

export type AvisoHemocentros = { aviso: string; selecionado: string }

// RF15 – cadastro do hemocentro com o Admin inicial, em tela própria. Usa o formulário do frame
// "Cadastrar ou editar hospital" (102:3161) e, ao salvar, volta para a lista com o hemocentro aberto.
export function CadastroHemocentroPage() {
  const navigate = useNavigate()

  return (
    <AdminLayout>
      <PageTitle
        titulo="Cadastrar hemocentro"
        descricao="Cadastre o hemocentro e o primeiro administrador, que recebe uma senha provisória por e-mail."
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <HemocentroForm
            largo
            onSalvo={(aviso, selecionado) => navigate('/admin', { state: { aviso, selecionado } satisfies AvisoHemocentros })}
          />
        </Panel>

        <Panel>
          <h2 className="text-section font-semibold text-ink">Antes de cadastrar</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-body text-muted">
            <li>CNPJ, CPF e e-mail não podem estar em uso por outro cadastro.</li>
            <li>O Admin do hemocentro troca a senha provisória no primeiro acesso.</li>
            <li>Depois ele cria os horários e as vagas, informa as necessidades e cadastra os médicos.</li>
          </ul>
          <ButtonLink to="/admin" kind="secondary">
            Voltar para Hemocentros
          </ButtonLink>
        </Panel>
      </div>
    </AdminLayout>
  )
}
