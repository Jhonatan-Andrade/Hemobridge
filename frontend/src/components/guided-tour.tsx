import { useEffect, useRef, useState } from 'react'
import type { SessionUser } from '../types/domain'
import { useResource } from '../services/use-resource'
type Step = { title: string; text: string; time: string }
type Estimate = {
  etapa: string
  minutos: number
  fonte: string
  hospital: { id: string; nome: string }
}
export function GuidedTour({
  user,
  mandatory,
  onComplete,
  onClose,
}: {
  user: SessionUser | null
  mandatory: boolean
  onComplete: () => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null),
    headingRef = useRef<HTMLHeadingElement>(null),
    opener = useRef<HTMLElement | null>(null)
  const [index, setIndex] = useState(0)
  const estimates = useResource<Estimate[]>('/jornada/estimativas')
  function duration(stage: string, fallback: string) {
    const values = estimates.data?.filter((v) => v.etapa === stage)
    return values?.length
      ? values.map((v) => `${v.hospital.nome}: cerca de ${v.minutos} min`).join(' · ')
      : fallback
  }
  const patient: Step[] = [
    {
      title: 'Da intenção de doar ao acompanhamento',
      text: 'Meu painel reúne sua situação e o próximo passo. A aprovação depende de avaliação profissional; o pré-cadastro inicia a jornada.',
      time: duration('TRIAGEM', 'A duração da avaliação é informada pela equipe responsável.'),
    },
    {
      title: 'Consultas e exames',
      text: 'Em Consultas, escolha um horário e acompanhe o atendimento. Em Exames, veja solicitações, envie os arquivos pedidos e acompanhe a análise.',
      time: duration(
        'EXAMES',
        'O prazo de análise aparece nas orientações da unidade; ele varia conforme o exame.',
      ),
    },
    {
      title: 'Encontre onde doar',
      text: 'Locais ajuda a encontrar serviços da sua região. Confirme endereço, funcionamento e orientações antes da visita. A triagem presencial define a possibilidade de doação.',
      time: duration(
        'DOACAO',
        'O Ministério da Saúde estima cerca de 40 minutos para o procedimento completo no local; filas e condições individuais podem alterar a duração.',
      ),
    },
    {
      title: 'Depois da doação',
      text: 'O status é atualizado pela equipe após o registro e a validação. Notificações reúnem novos avisos. Perfil permite revisar seus dados e solicitar o encerramento da conta.',
      time: duration(
        'ATUALIZACAO_STATUS',
        'O prazo de atualização é informado pela instituição; o HemoBridge não garante liberação imediata.',
      ),
    },
    {
      title: 'Uma comunidade com responsabilidade',
      text: 'Na Comunidade, pacientes, médicos e instituições compartilham informações gerais. Perfis verificados têm identificação. Avisos críticos de instituições verificadas ficam no topo enquanto estão ativos.',
      time: 'Não publique exames, diagnósticos ou dados pessoais na conversa pública.',
    },
  ]
  const doctor: Step[] = [
    {
      title: 'Seu trabalho em cada instituição',
      text: 'Selecione o hospital antes de consultar a agenda. Os vínculos e permissões do servidor determinam quais instituições você pode acessar.',
      time: 'O calendário utiliza os períodos de atendimento publicados por você.',
    },
    {
      title: 'Agenda, atendimento e exames',
      text: 'Agenda organiza os horários; Atendimento reúne consultas atribuídas a você; Exames apresenta solicitações e arquivos com acesso restrito. Cada decisão deve ser registrada na área privada.',
      time: duration(
        'TRIAGEM',
        'O tempo previsto acompanha o horário publicado e as orientações da unidade.',
      ),
    },
    {
      title: 'Informação profissional na comunidade',
      text: 'Publique orientações gerais de saúde e doação. A identificação de perfil verificado depende da conferência do registro profissional. Preserve o sigilo dos pacientes.',
      time: duration('EXAMES', 'Informe os prazos de análise nas orientações de cada solicitação.'),
    },
  ]
  const representative: Step[] = [
    {
      title: 'Uma visão da instituição',
      text: 'Necessidades organiza os níveis por tipo sanguíneo. Estoque acompanha bolsas, validade e movimentações. Cada mudança fica associada ao seu usuário e à sua unidade.',
      time: 'Atualize as informações quando houver mudança confirmada na instituição.',
    },
    {
      title: 'Da coleta ao registro',
      text: 'Registre a doação e mantenha a bolsa em quarentena até a liberação técnica. Estoque, solicitação de doadores e aprovação clínica são processos distintos.',
      time: duration(
        'ATUALIZACAO_STATUS',
        'O prazo de processamento segue a validação técnica da unidade.',
      ),
    },
    {
      title: 'Avisos e comunidade',
      text: 'Publique informações institucionais. Instituições verificadas podem emitir aviso crítico com data de expiração; o aviso permanece fixado enquanto estiver ativo.',
      time: 'Validade máxima de um aviso crítico: sete dias. Revise antes de renovar.',
    },
  ]
  const admin: Step[] = [
    {
      title: 'Gestão com acesso proporcional',
      text: 'O painel administrativo apresenta indicadores agregados. A administração de usuários, vínculos e instituições segue permissões próprias e registros de auditoria.',
      time: 'A verificação institucional exige uma fonte de conferência registrada.',
    },
    {
      title: 'Mapa e qualidade da informação',
      text: 'O mapa usa os limites regionais do IBGE. A leitura de necessidade depende das instituições participantes, da atualização e da cobertura dos dados.',
      time: 'Consulte sempre a data de atualização; ausência de informação não equivale a estoque adequado.',
    },
    {
      title: 'Comunidade e moderação',
      text: 'Acompanhe denúncias e modere conteúdo que viole as normas. Informações clínicas individuais permanecem fora do feed público.',
      time: 'A moderação deve seguir a política operacional de atendimento às denúncias.',
    },
  ]
  const visitor: Step[] = [
    {
      title: 'A ponte que conecta vidas',
      text: 'O HemoBridge aproxima pessoas interessadas em doar sangue das instituições de saúde. Faça o pré-cadastro para acompanhar sua jornada ou explore a comunidade.',
      time: 'Ao entrar pela primeira vez, você conhecerá o percurso do seu perfil.',
    },
  ]
  const steps = !user
    ? visitor
    : user.perfil === 'PACIENTE'
      ? patient
      : user.perfil === 'MEDICO'
        ? doctor
        : user.perfil === 'REPRESENTANTE'
          ? representative
          : admin
  const step = steps[Math.min(index, steps.length - 1)]
  useEffect(() => {
    const dialog = dialogRef.current
    opener.current = document.activeElement as HTMLElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      opener.current?.focus()
    }
  }, [])
  useEffect(() => {
    headingRef.current?.focus()
  }, [index])
  return (
    <dialog
      ref={dialogRef}
      className="onboarding-dialog"
      aria-labelledby="tour-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!mandatory) onClose()
      }}
    >
      <div className="onboarding-brand">
        <img src="/hemobridge/simbolo-1024.png" width="40" height="40" alt="" />
        <strong>Bem-vindo ao HemoBridge</strong>
      </div>
      <p>
        Etapa {index + 1} de {steps.length}
      </p>
      <progress value={index + 1} max={steps.length} aria-label="Progresso da orientação" />
      <h2 ref={headingRef} tabIndex={-1} id="tour-title">
        {step.title}
      </h2>
      <p>{step.text}</p>
      <div className="onboarding-time">
        <strong>Tempo e acompanhamento</strong>
        <p>{step.time}</p>
      </div>
      <div className="actions">
        {index > 0 && (
          <button className="button secondary" onClick={() => setIndex((v) => v - 1)}>
            Voltar
          </button>
        )}
        {index === steps.length - 1 ? (
          <button className="button" onClick={onComplete}>
            Concluir e acessar
          </button>
        ) : (
          <button className="button" onClick={() => setIndex((v) => v + 1)}>
            Continuar
          </button>
        )}
        {!mandatory && (
          <button className="text-button" onClick={onClose}>
            Fechar orientação
          </button>
        )}
      </div>
      {mandatory && (
        <p className="help">
          Conclua esta apresentação para acessar sua área. Você poderá revê-la pelo menu.
        </p>
      )}
    </dialog>
  )
}
