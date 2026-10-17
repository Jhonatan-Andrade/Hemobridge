import { communitySessionAuthors, demoPatient, exampleFormValues, exampleProfile, initialPublications, patientStatuses } from '../data/fixtures'
import type { Comment, CommunityParticipantRole, DemoProfile, DemoResponse, PatientStatus, Publication } from '../data/fixtures'
import type { FormKind, Values } from '../pages/formModel'

// Every operation here is local to the demo app. These are replaceable UI contracts,
// not declarations of existing backend routes or security guarantees.
export class DemoServiceError extends Error {}

export interface DemoSubmission {
  kind: FormKind
  fields: Readonly<Values>
  consent?: boolean
}

export interface DemoService {
  initialPublications(): Publication[]
  initialProfile(): DemoProfile
  exampleFormValues(): Values
  patientScenario(status: PatientStatus): typeof patientStatuses[PatientStatus]
  patientDisplay(): typeof demoPatient
  submit(request: DemoSubmission, response: DemoResponse): Promise<void>
  retryLoad(response: DemoResponse): Promise<void>
  sendComment(publicationId: string, text: string, role: CommunityParticipantRole, response: DemoResponse): Promise<Comment>
  createPublication(title: string, content: string, role: CommunityParticipantRole, response: DemoResponse): Promise<Publication>
  toggleLike(publication: Publication): Publication
}

const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 450))

export const demoService: DemoService = {
  initialPublications: () => initialPublications.map((post) => ({ ...post, comments: post.comments.map((comment) => ({ ...comment })) })),
  initialProfile: () => ({ ...exampleProfile }),
  exampleFormValues: () => ({ ...exampleFormValues }),
  patientScenario: (status) => patientStatuses[status],
  patientDisplay: () => demoPatient,
  async submit({ kind }, response) {
    await pause()
    if (response === 'network') throw new DemoServiceError('Não foi possível concluir. Tente novamente.')
    if (kind === 'register' && response === 'duplicate') throw new DemoServiceError('CPF ou e-mail já cadastrado. Entre ou recupere sua senha.')
    if (kind === 'login' && response === 'invalid') throw new DemoServiceError('E-mail ou senha incorretos.')
    if (kind === 'login' && response === 'blocked') throw new DemoServiceError('Acesso bloqueado. O prazo de desbloqueio depende da configuração do serviço.')
    if (kind === 'login' && response === 'inactive') throw new DemoServiceError('Conta inativa. Canal de suporte a confirmar.')
    if (kind === 'change' && response === 'invalid') throw new DemoServiceError('Senha atual incorreta.')
    if ((kind === 'reset' || kind === 'first') && response === 'expired') throw new DemoServiceError(kind === 'reset' ? 'Link expirado ou já utilizado. Solicite outro link.' : 'Senha provisória expirada. Contate o responsável pelo cadastro.')
  },
  async retryLoad(response) {
    await pause()
    if (response === 'loadError') throw new DemoServiceError('Os dados continuam indisponíveis. Verifique o estado selecionado nos controles de revisão.')
  },
  async sendComment(_publicationId, text, role, response) {
    await pause()
    if (response === 'network') throw new DemoServiceError('Não foi possível enviar. Seu texto foi preservado. Tente novamente.')
    const cleanText = text.trim()
    if (!cleanText || cleanText.length > 2000) throw new DemoServiceError('Escreva um comentário de até 2.000 caracteres.')
    return { id: `comment-${crypto.randomUUID()}`, author: communitySessionAuthors[role], date: new Date().toISOString().slice(0, 10), text: cleanText, role }
  },
  async createPublication(title, content, role, response) {
    await pause()
    if (response === 'network') throw new DemoServiceError('Não foi possível publicar. Seu texto foi preservado. Tente novamente.')
    const cleanTitle = title.trim()
    const cleanContent = content.trim()
    if (cleanTitle.length < 8 || cleanTitle.length > 120) throw new DemoServiceError('O título deve ter entre 8 e 120 caracteres.')
    if (cleanContent.length < 20 || cleanContent.length > 2000) throw new DemoServiceError('O texto deve ter entre 20 e 2.000 caracteres.')
    return {
      id: `post-${crypto.randomUUID()}`, author: communitySessionAuthors[role],
      date: new Date().toISOString().slice(0, 10), title: cleanTitle, content: cleanContent,
      likes: 0, liked: false, comments: [], role,
    }
  },
  toggleLike(publication) {
    const liked = !publication.liked
    return { ...publication, liked, likes: publication.likes + (liked ? 1 : -1) }
  },
}
