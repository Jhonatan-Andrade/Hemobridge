import { useNavigate } from 'react-router-dom'
import { PageTitle } from '../../components/layout/AppShell'
import { ButtonLink, Panel } from '../../components/ui'
import { AdminLayout } from './AdminLayout'
import { HospitalForm } from './HospitalForm'

export type AvisoInstituicoes = { aviso: string; selecionado: string }

// Cadastro de instituição em tela própria (UC25 passos 4–7). Usa o mesmo formulário do frame
// "Cadastrar ou editar hospital" (102:3161) e, ao salvar, volta para Instituições com o hospital aberto.
export function CadastroInstituicaoPage() {
  const navigate = useNavigate()

  return (
    <AdminLayout>
      <PageTitle
        titulo="Cadastrar instituição"
        descricao="Cadastre o hospital, sua localização e o primeiro representante, que recebe uma senha provisória por e-mail."
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <HospitalForm
            largo
            onSalvo={(aviso, selecionado) =>
              navigate('/admin/instituicoes', { state: { aviso, selecionado } satisfies AvisoInstituicoes })
            }
          />
        </Panel>

        <Panel>
          <h2 className="text-section font-semibold text-ink">Antes de cadastrar</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-body text-muted">
            <li>CNPJ, CPF e e-mail não podem estar em uso por outro cadastro.</li>
            <li>A latitude e a longitude definem a distância mostrada aos doadores na consulta pública.</li>
            <li>O representante troca a senha provisória no primeiro acesso e passa a atualizar as necessidades do hospital.</li>
          </ul>
          <ButtonLink to="/admin/instituicoes" kind="secondary">
            Voltar para Instituições
          </ButtonLink>
        </Panel>
      </div>
    </AdminLayout>
  )
}
