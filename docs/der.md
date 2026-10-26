# Diagrama Entidade-Relacionamento (DER)

Modelo de dados do Hemobridge após a refatoração para o agendamento de doação. A fonte da verdade é [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma); regras que o Prisma não expressa (CHECKs e índices únicos parciais) estão nas migrations.

```mermaid
erDiagram
    USUARIO ||--o| PACIENTE : "é (perfil PACIENTE)"
    USUARIO ||--o| EQUIPE_HEMOCENTRO : "é (perfil EQUIPE)"
    USUARIO ||--o{ CONSENTIMENTO_LGPD : aceita
    USUARIO ||--o{ AUDITORIA : "gera"
    USUARIO ||--o{ NECESSIDADE : "atualiza"

    HEMOCENTRO ||--o{ EQUIPE_HEMOCENTRO : "tem"
    HEMOCENTRO ||--o{ HORARIO : "oferece"
    HEMOCENTRO ||--o{ NECESSIDADE : "informa"
    HEMOCENTRO ||--o{ DOACAO : "registra"
    HEMOCENTRO |o--o{ AUDITORIA : "contexto"

    HORARIO ||--o{ AGENDAMENTO : "recebe"
    PACIENTE ||--o{ AGENDAMENTO : "faz"
    AGENDAMENTO ||--o| DOACAO : "resulta em"
    PACIENTE ||--o{ DOACAO : "doa"
    EQUIPE_HEMOCENTRO ||--o{ DOACAO : "registra (médico)"
    EQUIPE_HEMOCENTRO |o--o{ PACIENTE : "ativa (admin)"

    TIPO_SANGUINEO |o--o{ PACIENTE : "tem"
    TIPO_SANGUINEO ||--o{ NECESSIDADE : "de"
    TIPO_SANGUINEO |o--o{ DOACAO : "tipado"

    USUARIO {
        uuid id PK
        varchar nome
        varchar email UK
        char cpf UK "nulo após exclusão (RF16)"
        varchar telefone
        text senha_hash "Argon2id"
        perfil perfil "PACIENTE | EQUIPE | ADMIN_PLATAFORMA"
        status_usuario status "ATIVO | INATIVO | ENCERRADO"
        boolean senha_provisoria
        int versao_sessao
        timestamptz criado_em
    }
    PACIENTE {
        uuid usuario_id PK, FK
        date data_nascimento
        situacao_paciente situacao "PENDENTE | ATIVA"
        smallint tipo_sanguineo_id FK "gravado só na ativação"
        uuid ativado_por FK
        timestamptz ativado_em
    }
    EQUIPE_HEMOCENTRO {
        uuid usuario_id PK, FK
        uuid hemocentro_id FK
        papel_equipe papel "MEDICO | ADMIN_HEMOCENTRO"
    }
    HEMOCENTRO {
        uuid id PK
        varchar nome
        char cnpj UK
        varchar endereco
        varchar cidade
        char estado
        char cep
        varchar telefone
        boolean ativo
    }
    HORARIO {
        uuid id PK
        uuid hemocentro_id FK
        date data
        time hora_inicio
        time hora_fim
        smallint vagas_total "1 a 500"
        boolean ativo
    }
    AGENDAMENTO {
        uuid id PK
        uuid paciente_id FK
        uuid horario_id FK
        status_agendamento status "AGENDADO | CANCELADO | CONCLUIDO | AUSENTE"
        timestamptz criado_em
        timestamptz cancelado_em
    }
    DOACAO {
        uuid id PK
        uuid agendamento_id FK, UK
        uuid paciente_id FK
        uuid hemocentro_id FK
        uuid medico_id FK
        boolean compareceu
        boolean doou
        smallint tipo_sanguineo_id FK
        varchar motivo_nao_doacao
        varchar observacoes
        timestamptz registrado_em
    }
    NECESSIDADE {
        uuid id PK
        uuid hemocentro_id FK
        smallint tipo_sanguineo_id FK
        nivel_necessidade nivel "URGENTE | NECESSARIO | ESTAVEL"
        timestamptz atualizado_em
        uuid atualizado_por FK
    }
    TIPO_SANGUINEO {
        smallint id PK
        varchar sigla UK
        grupo_abo grupo_abo
        fator_rh fator_rh
    }
    CONSENTIMENTO_LGPD {
        uuid id PK
        uuid usuario_id FK
        varchar versao_termo
        varchar finalidade
        timestamptz aceito_em
        inet ip_origem
        timestamptz revogado_em
    }
    AUDITORIA {
        bigint id PK
        uuid usuario_id FK
        varchar acao
        varchar entidade
        uuid entidade_id
        uuid hemocentro_id FK
        timestamptz criado_em
    }
```

## Regras no banco

| Regra | Onde |
|---|---|
| Um nível por hemocentro e tipo | `UNIQUE (hemocentro_id, tipo_sanguineo_id)` em `necessidade` |
| Um horário por hemocentro, dia e hora de início | `UNIQUE (hemocentro_id, data, hora_inicio)` em `horario` |
| Um agendamento ativo por paciente e horário (RF09) | índice único parcial `(paciente_id, horario_id) WHERE status = 'AGENDADO'` |
| Uma doação por agendamento | `UNIQUE (agendamento_id)` em `doacao` |
| Vagas entre 1 e 500; fim depois do início | CHECKs em `horario` |
| Só doa quem compareceu; quem compareceu e não doou tem motivo | CHECKs em `doacao` |
| Conta ATIVA tem tipo sanguíneo e quem ativou | CHECK em `paciente` |
| Sem overbooking (RNF06) | `SELECT … FOR UPDATE` na linha de `horario` durante o agendamento (aplicação) |

## Índices de consulta

`horario (hemocentro_id, data)`, `agendamento (horario_id, status)`, `agendamento (paciente_id, status)`, `doacao (paciente_id, registrado_em)`, `doacao (hemocentro_id, registrado_em)`, `auditoria (usuario_id, criado_em)` e `auditoria (entidade, entidade_id)`.
