# Encerramento e retenção de dados

O titular solicita o encerramento em sua área privada, confirmando a senha. A API coordena pedidos simultâneos para devolver o mesmo protocolo aberto. A solicitação não encerra a conta imediatamente. O atendimento fica em **Área administrativa → Privacidade**, acessível somente ao perfil Administrador.

O responsável confere a identidade por procedimento proporcional, registra fundamentação com pelo menos 20 caracteres e confirma a análise. Pode concluir ou recusar justificadamente. A recusa gera resposta na área privada e e-mail genérico. A conclusão não pode ser feita pelo próprio solicitante; exige outro administrador. Uma decisão concluída não pode ser repetida ou sobrescrita.

## Efeitos da conclusão

Uma única transação encerra a conta, incrementa a versão de sessão, inutiliza a senha, elimina tokens de recuperação e contatos, substitui nome/CPF/e-mail por identificadores técnicos, revoga consentimentos abertos, cancela consultas futuras e notifica os demais participantes. Publicações e comentários do titular são retirados do acesso público e seu texto é removido. Reações e notificações pessoais sem vínculo com a janela anti-spam são eliminadas. A auditoria permanece imutável e registra a decisão sem copiar nome, CPF ou conteúdo clínico.

Contas de pacientes sem consultas, doações, exames ou validação clínica têm também sua pré-triagem e perfil removidos. Registros sujeitos a guarda não são excluídos por este fluxo. O vínculo mínimo de identificação é cifrado com AES-256-GCM, IV aleatório e chave derivada com separação de contexto da chave da aplicação. O conteúdo inclui a conta de origem para conferência de integridade da associação. O endpoint administrativo não devolve esse conteúdo nem permite baixar exames.

**Não se trata de anonimização irreversível.** Há pseudonimização e retenção limitada aos vínculos preservados. Registros de autoria profissional, auditoria, doações e outros relacionamentos podem continuar identificáveis sob acesso controlado. A fundamentação e a data futura de revisão são obrigatórias quando há retenção. Essa data não ordena destruição automática nem representa o prazo final de um prontuário.

## Fundamento e operação

A [LGPD, arts. 15, 16 e 18](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) prevê término do tratamento, direitos do titular e hipóteses de conservação. A [Lei 13.787/2018, art. 6º](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13787.htm) estabelece o prazo mínimo de vinte anos a partir do último registro para eliminação dos prontuários abrangidos. Esse prazo não é aplicado indiscriminadamente a toda informação da conta.

Antes de receber dados reais, o controlador deve aprovar a tabela de temporalidade por categoria, responsáveis por atender direitos, fundamento da conservação e recuperação restrita da identificação. A rotação e a restauração de chaves devem preservar a possibilidade de ler os registros legalmente retidos; recuperar identidade exige procedimento individual autorizado, conferência da conta contida na cifra e auditoria. Não existe uma tela administrativa de descriptografia geral.

Backups, objetos clínicos, logs operacionais e fornecedores devem seguir a mesma política. O código não apaga backups automaticamente nem comprova que uma infraestrutura externa os eliminou. Regras de restauração precisam impedir a reativação de contas encerradas e a republicação de conteúdo removido. Os exames e a trilha de auditoria não devem ser eliminados por scripts genéricos de limpeza.

Testes locais descartáveis cobrem autorização, confirmação, duplicidade de protocolos, decisão repetida, revogação, ausência de histórico e retenção cifrada. O ensaio operacional de restauração, gestão das chaves e o aceite jurídico permanecem requisitos de homologação.
