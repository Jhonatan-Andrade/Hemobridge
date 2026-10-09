# VM de dados do Hemobridge (AWS EC2)

Banco compartilhado da equipe para desenvolvimento, testes (PT20/RNF08) e apresentação.
Roda numa EC2 do **AWS Academy Learner Lab**.

| Item | Valor |
| --- | --- |
| Região | us-east-1 |
| Instância | `hemobridge-db` (t2.medium, 2 vCPU, 4 GB + 2 GB de swap) |
| Sistema | Ubuntu Server 26.04 LTS, disco gp3 de 20 GB |
| IP (Elastic IP) | `44.194.55.230` |
| Usuários SSH | `ubuntu` (administração) e `equipe` (desenvolvimento: só túnel, sem sudo e sem Docker); somente chave |
| Security Group | entrada só na porta 22 (SSH), para IPs liberados |

## O que roda na VM

Tudo em Docker (`/opt/hemobridge/infra/docker-compose.yml`). **Nenhuma porta de
serviço fica exposta na internet**: todas escutam em `127.0.0.1` e são acessadas
por túnel SSH.

| Serviço | Container | Porta na VM | Uso |
| --- | --- | --- | --- |
| PostgreSQL 17 + PostGIS 3.5 | `hemobridge-postgres` | 5432 | Banco `hemobridge` (compartilhado) e `hemobridge_dev` (testes) |
| SeaweedFS (API S3) | `hemobridge-s3` | 8333 | Arquivos de exame (bucket `hemobridge-exames`), HEM-17 |
| Mailpit | `hemobridge-mailpit` | 1025 (SMTP) / 8025 (web) | Caixa de e-mails de teste |

> O MinIO deixou de publicar imagens Docker em 2025; o SeaweedFS oferece a
> mesma API S3 (qualquer SDK S3 funciona) com licença Apache-2.0.

## Como conectar (túnel SSH)

1. Peça a chave da equipe (`hemobridge-equipe`) ao Gean e salve em `~/.ssh/` (permissão 600).
   O Security Group precisa liberar a porta 22 para o seu IP (ou para qualquer IP, já que só entra com chave).
2. Adicione ao `~/.ssh/config`:

   ```
   Host hemobridge
       HostName 44.194.55.230
       User equipe
       IdentityFile ~/.ssh/hemobridge-equipe
       IdentitiesOnly yes
       ServerAliveInterval 30
   ```

3. Abra o túnel e deixe o terminal aberto enquanto trabalha:

   ```bash
   ssh -N -L 5434:127.0.0.1:5432 -L 8333:127.0.0.1:8333 -L 1025:127.0.0.1:1025 -L 8025:127.0.0.1:8025 hemobridge
   ```

4. No `backend/.env`, use as mesmas portas do desenvolvimento local
   (o `docker compose` local **não** precisa estar rodando):

   ```dotenv
   DATABASE_URL=postgresql://hemobridge:<senha>@localhost:5434/hemobridge
   SMTP_HOST=localhost
   SMTP_PORTA=1025
   S3_ENDPOINT=http://localhost:8333
   ```

   As senhas ficam só na VM: `ssh hemobridge cat LEIA-ME.txt` (usuário `equipe`).
   Nunca as coloque no repositório (RNF07).

5. E-mails de teste: <http://localhost:8025>.

## Rotina

| Tarefa | Comando |
| --- | --- |
| Aplicar migrations novas da `main` | `ssh hemobridge /opt/hemobridge/infra/migrar.sh` |
| Primeira carga (tipos, compatibilidade, admin) | `ssh hemobridge /opt/hemobridge/infra/migrar.sh --seed` |
| Ver containers | `ssh hemobridge 'cd /opt/hemobridge/infra && docker compose ps'` |
| psql | `ssh -t hemobridge 'docker exec -it hemobridge-postgres psql -U hemobridge -d hemobridge'` |
| Backup manual | `ssh hemobridge /opt/hemobridge/infra/backup.sh` |
| Baixar backups para o seu PC | `infra/vm/baixar-backups.sh` |

A senha provisória do administrador inicial (RN16) está em
`/opt/hemobridge/infra/admin-inicial.env`; ela é trocada no primeiro acesso.

## Backup e restauração

- `hemobridge-backup.timer` roda `backup.sh` todo dia às 03:00. Como a VM do Lab
  fica desligada fora das sessões, `Persistent=true` executa o backup atrasado
  logo depois que a VM liga.
- Guarda os 14 últimos `pg_dump` (formato custom) e `tar.gz` do S3 em
  `/var/backups/hemobridge` (permissão 600).
- **A conta do Learner Lab é apagada no fim da disciplina.** Rode
  `baixar-backups.sh` periodicamente para ter cópia fora da AWS.

Restaurar um dump:

```bash
scp db-AAAAMMDD-HHMMSS.dump hemobridge:/tmp/
ssh hemobridge 'docker exec -i hemobridge-postgres pg_restore -U hemobridge -d hemobridge --clean --if-exists < /tmp/db-AAAAMMDD-HHMMSS.dump'
```

## Segurança aplicada

- Login SSH só por chave; `root` e senha desativados; fail2ban (5 tentativas → 1 h de bloqueio).
- ufw: só a porta 22 aceita conexões; Security Group restringe a origem.
- Serviços de dados presos em `127.0.0.1`; segredos em `.env` com permissão 600.
- PostgreSQL com `scram-sha-256`; atualizações de segurança automáticas (unattended-upgrades).
- Bucket de exames privado (acesso anônimo negado), atendendo RNF02/RNF07.

## Particularidades do Learner Lab

- A VM **desliga quando a sessão do Lab termina** (~4 h) e volta com *Start Lab*.
  Os containers sobem sozinhos (`restart: unless-stopped`).
- O Elastic IP mantém o endereço entre sessões.
- Se o seu IP mudar e o SSH parar de responder, edite a regra do Security Group
  (`hemobridge-db-sg`/`launch-wizard-2`) para **Meu IP** de novo.

## Recriar a VM do zero

```bash
scp -r infra/vm hemobridge:/tmp/hemobridge-vm
ssh hemobridge 'sudo bash /tmp/hemobridge-vm/provisionar.sh'
ssh hemobridge /opt/hemobridge/infra/migrar.sh --seed
```
