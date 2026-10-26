import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ProfessionalRole } from '../types/domain'
import { api, messageOf } from '../services/api-client'
import { useResource } from '../services/use-resource'
import { Alert, Intro, RouteLink } from '../components/ui'
import type { Navigate } from '../components/ui'
import { DoctorAttendanceForm } from '../components/doctor-attendance-form'
import { DonationRegistration } from '../components/donation-registration'
import { ExamReview } from '../components/exam-review'
import type { ReviewableExam } from '../components/exam-review'
import { BrazilRegionsMap } from './brazil-regions-map'
import type { RegionId } from './brazil-regions-map'
import '../styles/professional.css'
type Hospital = { id: string; nome: string; cidade: string; estado: string }
const when = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <Alert tone="error">
      {message}{' '}
      <button className="text-button" onClick={retry}>
        Tentar novamente
      </button>
    </Alert>
  )
}
function Doctor({ route }: { route: string }) {
  const hospitals = useResource<Hospital[]>('/medico/hospitais')
  const [hospitalId, setHospitalId] = useState('')
  const selected = hospitalId || hospitals.data?.[0]?.id || ''
  return (
    <>
      <section className="hb-pro-card hb-pro-workplace">
        <div>
          <h2>Instituição de trabalho</h2>
          <p>Selecione a instituição para consultar sua agenda e seus atendimentos.</p>
        </div>
        {hospitals.error ? (
          <Failure message={hospitals.error} retry={hospitals.reload} />
        ) : (
          <label>
            Hospital
            <select
              value={selected}
              onChange={(e) => setHospitalId(e.target.value)}
              disabled={!hospitals.data?.length}
            >
              <option value="">
                {hospitals.loading ? 'Carregando instituições…' : 'Selecione'}
              </option>
              {hospitals.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nome} · {h.cidade}/{h.estado}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>
      {selected &&
        (route.endsWith('/exams') ? (
          <DoctorExams />
        ) : (
          <DoctorAgenda
            key={selected}
            hospitalId={selected}
            attendance={route.endsWith('/attendance')}
          />
        ))}
      {!hospitals.loading && !hospitals.error && !hospitals.data?.length && (
        <p className="empty">Nenhuma instituição ativa vinculada ao seu cadastro.</p>
      )}
    </>
  )
}
type DoctorSlot = {
  id: string
  inicio: string
  fim: string
  linkVideochamada?: string | null
  consultas: { id: string; status: string; paciente: { usuario: { nome: string } } }[]
}
function DoctorAgenda({ hospitalId, attendance }: { hospitalId: string; attendance: boolean }) {
  const [period, setPeriod] = useState<'proximos' | 'historico'>('proximos')
  const [page, setPage] = useState(1)
  const query = new URLSearchParams({
    hospitalId,
    incluirRealizadas: 'true',
    periodo: period,
    pagina: String(page),
    tamanhoPagina: '30',
  })
  const resource = useResource<DoctorSlot[]>(`/medico/agenda?${query}`)
  const [feedback, setFeedback] = useState(''),
    [busy, setBusy] = useState(false)
  async function publish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const form = e.currentTarget,
      data = new FormData(form)
    setBusy(true)
    try {
      await api('/medico/agenda', {
        method: 'POST',
        body: {
          hospitalId,
          inicio: new Date(String(data.get('inicio'))).toISOString(),
          fim: new Date(String(data.get('fim'))).toISOString(),
          linkVideochamada: data.get('link'),
        },
      })
      form.reset()
      setPeriod('proximos')
      setPage(1)
      resource.reload()
      setFeedback('Horário publicado.')
    } catch (error) {
      setFeedback(messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="hb-pro-agenda-grid">
      <section className="hb-pro-card">
        <h2>{attendance ? 'Atendimentos atribuídos' : 'Minha agenda'}</h2>
        <label className="hb-pro-agenda-filter">
          Período da agenda
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value as 'proximos' | 'historico')
              setPage(1)
            }}
          >
            <option value="proximos">Próximos</option>
            <option value="historico">Histórico</option>
          </select>
        </label>
        {resource.loading ? (
          <p>Carregando agenda…</p>
        ) : resource.error ? (
          <Failure message={resource.error} retry={resource.reload} />
        ) : resource.data?.length ? (
          resource.data.map((s) => (
            <DoctorScheduleItem
              key={s.id}
              slot={s}
              attendance={attendance}
              onUpdated={resource.reload}
            />
          ))
        ) : (
          <p>
            {page > 1
              ? 'Nenhum horário nesta página. Volte à página anterior.'
              : period === 'proximos'
                ? 'Nenhum horário futuro nesta instituição.'
                : 'Nenhum horário no histórico desta instituição.'}
          </p>
        )}
        <nav className="actions" aria-label="Páginas da agenda">
          <button
            className="button secondary"
            disabled={resource.loading || page === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Anterior
          </button>
          <span role="status">Página {page}</span>
          <button
            className="button secondary"
            disabled={
              resource.loading || !!resource.error || resource.data?.length !== 30 || page >= 10000
            }
            onClick={() => setPage((value) => value + 1)}
          >
            Próxima
          </button>
        </nav>
      </section>
      {!attendance && (
        <section className="hb-pro-card">
          <h2>Publicar horário</h2>
          <form onSubmit={publish}>
            <label>
              Início
              <input type="datetime-local" name="inicio" required />
            </label>
            <label>
              Fim
              <input type="datetime-local" name="fim" required />
            </label>
            <label>
              Link de teleconsulta
              <input type="url" name="link" placeholder="https://" required />
            </label>
            <button className="button" disabled={busy}>
              {busy ? 'Publicando…' : 'Publicar horário'}
            </button>
          </form>
          {feedback && <p role="status">{feedback}</p>}
        </section>
      )}
    </div>
  )
}

function safeConsultationLink(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.host && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export function DoctorScheduleItem({
  slot,
  attendance,
  onUpdated,
}: {
  slot: DoctorSlot
  attendance: boolean
  onUpdated: () => void
}) {
  const [now] = useState(() => Date.now())
  const future = new Date(slot.inicio).getTime() > now
  const link = safeConsultationLink(slot.linkVideochamada)
  return (
    <article className="schedule-item">
      <h3>{when(slot.inicio)}</h3>
      <p>Até {when(slot.fim)}</p>
      {slot.consultas.length ? (
        slot.consultas.map((consultation) => (
          <div key={consultation.id}>
            <strong>{consultation.paciente.usuario.nome}</strong>
            <p>
              {consultation.status === 'REALIZADA'
                ? 'Realizada'
                : consultation.status === 'AGENDADA'
                  ? 'Agendada'
                  : 'Atendimento encerrado'}
            </p>
            {consultation.status === 'AGENDADA' && link && (
              <p>
                <a
                  className="button secondary"
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Entrar na consulta ↗
                </a>
              </p>
            )}
            {attendance && (
              <DoctorAttendanceForm
                id={consultation.id}
                onUpdated={onUpdated}
              />
            )}
          </div>
        ))
      ) : (
        <p>{future ? 'Horário disponível' : 'Sem consulta agendada'}</p>
      )}
    </article>
  )
}

type ClinicalExam = {
  id: string
  descricao: string
  consulta: { id: string; paciente: { usuario: { nome: string } } }
  exames: ReviewableExam[]
}
function DoctorExams() {
  const r = useResource<ClinicalExam[]>('/medico/exames')
  const types = useResource<{ id: number; sigla: string }[]>('/tipos-sanguineos')
  return (
    <section className="hb-pro-card">
      <h2>Exames dos seus atendimentos</h2>
      {r.loading ? (
        <p>Carregando solicitações…</p>
      ) : r.error ? (
        <Failure message={r.error} retry={r.reload} />
      ) : r.data?.length ? (
        r.data.map((item) => (
          <article className="schedule-item" key={item.id}>
            <h3>{item.consulta.paciente.usuario.nome}</h3>
            <p>{item.descricao}</p>
            <ul className="exam-review-list">
              {item.exames.map((exam) => (
                <li key={exam.id}>
                  <ExamReview exam={exam} bloodTypes={types.data ?? []} typesLoading={types.loading}
                    typesError={types.error} onRetryTypes={types.reload} onUpdated={r.reload} />
                </li>
              ))}
            </ul>
          </article>
        ))
      ) : (
        <p>Nenhuma solicitação de exame registrada.</p>
      )}
    </section>
  )
}
type Needs = {
  hospital: { nome: string }
  ultimaAtualizacao: string | null
  necessidades: { tipo: string; nivel: string; atualizadoEm: string | null }[]
}
function RepresentativeNeeds() {
  const resource = useResource<Needs>('/representante/necessidades')
  const [changes, setChanges] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState('')
  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/representante/necessidades', {
        method: 'PUT',
        body: { niveis: Object.entries(changes).map(([tipo, nivel]) => ({ tipo, nivel })) },
      })
      setChanges({})
      resource.reload()
      setFeedback('Necessidades atualizadas.')
    } catch (error) {
      setFeedback(messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="hb-pro-card hb-pro-needs">
      <h2>Necessidades da instituição</h2>
      {resource.loading ? (
        <p>Carregando necessidades…</p>
      ) : resource.error ? (
        <Failure message={resource.error} retry={resource.reload} />
      ) : (
        <>
          <p>{resource.data?.hospital.nome}</p>
          <form onSubmit={save}>
            <ul>
              {resource.data?.necessidades.map((n) => (
                <li key={n.tipo}>
                  <strong>{n.tipo}</strong>
                  <label>
                    Nível
                    <select
                      aria-label={`Nível de necessidade ${n.tipo}`}
                      value={changes[n.tipo] ?? n.nivel}
                      onChange={(e) => setChanges((v) => ({ ...v, [n.tipo]: e.target.value }))}
                    >
                      <option value="NAO_INFORMADO" disabled>
                        Não informado
                      </option>
                      {['CRITICO', 'BAIXO', 'ESTAVEL', 'ADEQUADO'].map((level) => (
                        <option key={level} value={level}>
                          {level.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
            <p>
              Confirme os níveis antes de salvar. Alterações críticas podem gerar avisos aos
              doadores elegíveis.
            </p>
            <button className="button" disabled={busy || !Object.keys(changes).length}>
              Confirmar atualização
            </button>
          </form>
        </>
      )}
      {feedback && <p role="status">{feedback}</p>}
    </section>
  )
}
type Bag = {
  id: string
  codigo: string
  componente: string
  validadeEm: string
  status: string
  tipoSanguineo: { sigla: string }
}
function Stock() {
  const types = useResource<{ id: number; sigla: string }[]>('/tipos-sanguineos')
  const resource = useResource<Bag[]>('/representante/estoque')
  const [feedback, setFeedback] = useState(''),
    [busy, setBusy] = useState(false)
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget,
      data = new FormData(form)
    setBusy(true)
    try {
      await api('/representante/estoque', {
        method: 'POST',
        body: {
          codigo: data.get('codigo'),
          componente: data.get('componente'),
          tipoSanguineoId: Number(data.get('tipo')),
          coletadaEm: new Date(String(data.get('coleta'))).toISOString(),
          validadeEm: new Date(String(data.get('validade'))).toISOString(),
        },
      })
      form.reset()
      resource.reload()
      setFeedback('Bolsa registrada em quarentena.')
    } catch (error) {
      setFeedback(messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <section className="hb-pro-card">
        <h2>Estoque de bolsas</h2>
        {resource.loading ? (
          <p>Carregando estoque…</p>
        ) : resource.error ? (
          <Failure message={resource.error} retry={resource.reload} />
        ) : resource.data?.length ? (
          resource.data.map((b) => (
            <article className="schedule-item" key={b.id}>
              <h3>
                {b.codigo} · {b.tipoSanguineo.sigla}
              </h3>
              <p>
                {b.componente} · {b.status} · Validade: {when(b.validadeEm)}
              </p>
              <StockMovement bag={b} onUpdated={resource.reload} />
            </article>
          ))
        ) : (
          <p>Nenhuma bolsa registrada.</p>
        )}
      </section>
      <section className="hb-pro-card">
        <h2>Registrar bolsa</h2>
        {types.error && <Failure message={types.error} retry={types.reload} />}
        <form onSubmit={create}>
          <div className="field-grid">
            <label>
              Código rastreável
              <input name="codigo" maxLength={100} required />
            </label>
            <label>
              Hemocomponente
              <input name="componente" maxLength={80} required />
            </label>
            <label>
              Tipo sanguíneo
              <select name="tipo" required>
                <option value="">{types.loading ? 'Carregando tipos…' : 'Selecione'}</option>
                {types.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.sigla}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Coleta
              <input type="datetime-local" name="coleta" required />
            </label>
            <label>
              Validade
              <input type="datetime-local" name="validade" required />
            </label>
          </div>
          <button className="button" disabled={busy || !types.data?.length}>
            Registrar em quarentena
          </button>
        </form>
        {feedback && <p role="status">{feedback}</p>}
      </section>
    </>
  )
}
function StockMovement({ bag, onUpdated }: { bag: Bag; onUpdated: () => void }) {
  const [feedback, setFeedback] = useState(''),
    [busy, setBusy] = useState(false)
  const transitions: Record<string, string[]> = {
    QUARENTENA: ['DISPONIVEL', 'DESCARTADA'],
    DISPONIVEL: ['RESERVADA', 'DESCARTADA'],
    RESERVADA: ['DISPONIVEL', 'UTILIZADA', 'DESCARTADA'],
  }
  async function move(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setBusy(true)
    try {
      await api(`/representante/estoque/${bag.id}`, {
        method: 'PATCH',
        body: {
          anterior: bag.status,
          status: data.get('status'),
          motivo: data.get('motivo'),
          ...(data.get('referencia') ? { liberacaoReferencia: data.get('referencia') } : {}),
        },
      })
      onUpdated()
    } catch (error) {
      setFeedback(messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  return transitions[bag.status] ? (
    <details>
      <summary>Movimentar bolsa</summary>
      <form onSubmit={move}>
        <label>
          Novo estado
          <select name="status">
            {transitions[bag.status].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Motivo
          <input name="motivo" minLength={5} maxLength={500} required />
        </label>
        {bag.status === 'QUARENTENA' && (
          <label>
            Referência da liberação técnica
            <input name="referencia" maxLength={200} />
          </label>
        )}
        <button className="button secondary" disabled={busy}>
          Confirmar movimentação
        </button>
      </form>
      {feedback && <p role="status">{feedback}</p>}
    </details>
  ) : null
}
const regionStates: Record<RegionId, string[]> = {
  north: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  northeast: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  centerwest: ['DF', 'GO', 'MT', 'MS'],
  southeast: ['ES', 'MG', 'RJ', 'SP'],
  south: ['PR', 'RS', 'SC'],
}
type RegionalData = {
  janelaHoras: number
  instituicoesVerificadas: number
  geradoEm: string
  itens: { estado: string; tipo: string; nivel: string; unidades: number; atualizadoEm: string }[]
}
function AdminMap() {
  const data = useResource<RegionalData>('/admin/mapa-necessidades')
  const [region, setRegion] = useState<RegionId | 'all'>('all'),
    [type, setType] = useState('Todos')
  const rows =
    data.data?.itens.filter(
      (r) =>
        (type === 'Todos' || r.tipo === type) &&
        (region === 'all' || regionStates[region].includes(r.estado)),
    ) ?? []
  return (
    <>
      <div className="hb-pro-map-filters">
        <div>
          <h2>Leitura por território</h2>
          <p>Necessidades declaradas nas últimas 24 horas por instituições verificadas.</p>
        </div>
        <label>
          Tipo sanguíneo
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {['Todos', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="hb-pro-map-layout">
        <section className="hb-pro-card">
          <h2>Brasil por região</h2>
          <BrazilRegionsMap selected={region} onSelect={setRegion} />
          <p className="help">
            Cartografia:{' '}
            <a href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3">IBGE</a>. A seleção
            destaca território, sem inferir urgência pela cor.
          </p>
        </section>
        <section className="hb-pro-card hb-pro-map-detail">
          <h2>Necessidades informadas</h2>
          <button className="text-button" onClick={() => setRegion('all')}>
            Todas as regiões
          </button>
          {data.loading ? (
            <p>Carregando dados…</p>
          ) : data.error ? (
            <Failure message={data.error} retry={data.reload} />
          ) : (
            <>
              <p>{data.data?.instituicoesVerificadas ?? 0} instituições verificadas na base.</p>
              {rows.length ? (
                <ul>
                  {rows.map((r) => (
                    <li key={`${r.estado}${r.tipo}${r.nivel}`}>
                      <strong>
                        {r.estado} · {r.tipo}
                      </strong>
                      : {r.nivel} · {r.unidades} unidade(s)
                      <br />
                      <small>Atualização: {when(r.atualizadoEm)}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Sem informação atualizada para esta seleção.</p>
              )}
              <p className="help">
                A cobertura corresponde às instituições participantes. Os registros não representam
                todo o estoque nacional e não estabelecem um ranking nacional de escassez.
              </p>
            </>
          )}
        </section>
      </div>
    </>
  )
}
function Moderation() {
  const r =
    useResource<{ id: string; publicacaoId: string; motivo: string }[]>('/comunidade/denuncias')
  const [feedback, setFeedback] = useState('')
  async function hide(id: string) {
    try {
      await api(`/comunidade/publicacoes/${id}`, { method: 'PATCH', body: { status: 'OCULTO' } })
      setFeedback('Publicação ocultada.')
      r.reload()
    } catch (error) {
      setFeedback(messageOf(error))
    }
  }
  return (
    <section className="hb-pro-card">
      <h2>Denúncias da comunidade</h2>
      {r.loading ? (
        <p>Carregando denúncias…</p>
      ) : r.error ? (
        <Failure message={r.error} retry={r.reload} />
      ) : r.data?.length ? (
        r.data.map((d) => (
          <article key={d.id}>
            <p>{d.motivo}</p>
            <a href={`#post/${d.publicacaoId}`}>Ler publicação</a>
            <button className="button destructive" onClick={() => void hide(d.publicacaoId)}>
              Ocultar publicação
            </button>
          </article>
        ))
      ) : (
        <p>Nenhuma denúncia recebida.</p>
      )}
      {feedback && <p role="status">{feedback}</p>}
    </section>
  )
}
export function ProfessionalPage({
  route,
  navigate,
  role,
}: {
  route: string
  navigate: Navigate
  role: ProfessionalRole
}) {
  return (
    <div className="hb-pro">
      <main className="hb-pro-main">
        <Intro
          title={
            role === 'doctor'
              ? route.endsWith('/exams')
                ? 'Exames'
                : route.endsWith('/attendance')
                  ? 'Atendimento'
                  : 'Minha agenda'
              : role === 'representative'
                ? route.endsWith('/donations')
                  ? 'Registrar doação'
                  : route.endsWith('/stock')
                  ? 'Estoque de bolsas'
                  : 'Necessidades da instituição'
                : route.endsWith('/moderation')
                  ? 'Moderação da comunidade'
                  : 'Mapa de necessidades'
          }
          description="Informações e ações disponíveis para o seu perfil de acesso."
        />
        <div className="actions">
          <RouteLink to="community" navigate={navigate}>
            Comunidade
          </RouteLink>
          {role === 'representative' && (
            <>
              <RouteLink to="professional/needs" navigate={navigate}>
                Necessidades
              </RouteLink>
              <RouteLink to="professional/stock" navigate={navigate}>
                Estoque
              </RouteLink>
              <RouteLink to="professional/donations" navigate={navigate}>Registrar doação</RouteLink>
            </>
          )}
          {role === 'administrator' && (
            <>
              <RouteLink to="professional/admin" navigate={navigate}>
                Mapa regional
              </RouteLink>
              <RouteLink to="professional/moderation" navigate={navigate}>
                Moderação
              </RouteLink>
            </>
          )}
        </div>
        {role === 'doctor' ? (
          <Doctor route={route} />
        ) : role === 'representative' ? (
          route.endsWith('/donations') ? (
            <DonationRegistration />
          ) : route.endsWith('/stock') ? (
            <Stock />
          ) : (
            <RepresentativeNeeds />
          )
        ) : route.endsWith('/moderation') ? (
          <Moderation />
        ) : (
          <AdminMap />
        )}
      </main>
    </div>
  )
}
