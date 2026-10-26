import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/session_controller.dart';
import '../account/registration_page.dart';

class LoginPage extends StatefulWidget {
  final SessionController session;
  final bool firstPassword;
  const LoginPage({
    super.key,
    required this.session,
    this.firstPassword = false,
  });
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final form = GlobalKey<FormState>(),
      email = TextEditingController(),
      password = TextEditingController(),
      confirmation = TextEditingController();
  bool busy = false, consent = false;
  String? feedback;
  Map<String, dynamic>? term;
  @override
  void initState() {
    super.initState();
    if (widget.firstPassword) loadTerm();
  }

  @override
  void didUpdateWidget(covariant LoginPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.firstPassword && !oldWidget.firstPassword) loadTerm();
  }

  Future<void> loadTerm() async {
    try {
      final value = await widget.session.api.request(
        '/auth/primeiro-acesso/termo',
      );
      if (mounted) setState(() => term = Map<String, dynamic>.from(value));
    } catch (e) {
      if (mounted) setState(() => feedback = e.toString());
    }
  }

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    confirmation.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!form.currentState!.validate() || busy) return;
    if (widget.firstPassword && (!consent || term == null)) {
      setState(() => feedback = 'Leia e aceite o termo de responsabilidade.');
      return;
    }
    setState(() => busy = true);
    try {
      if (widget.firstPassword) {
        await widget.session.firstPassword(
          password.text,
          consent,
          term!['versao'] as String,
        );
      } else {
        await widget.session.login(email.text, password.text);
      }
    } catch (e) {
      if (mounted) setState(() => feedback = e.toString());
    } finally {
      if (mounted) {
        password.clear();
        setState(() => busy = false);
      }
    }
  }

  Future<void> recover() async {
    if (!email.text.contains('@')) {
      setState(() => feedback = 'Informe seu e-mail para recuperar a senha.');
      return;
    }
    try {
      await widget.session.api.request(
        '/auth/recuperar-senha',
        method: 'POST',
        body: {'email': email.text},
      );
      if (mounted) {
        setState(
          () => feedback =
              'Se houver uma conta para este e-mail, enviaremos as orientações.',
        );
      }
    } catch (e) {
      if (mounted) setState(() => feedback = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const BrandTitle()),
    body: SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Form(
              key: form,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (widget.firstPassword)
                    Text(
                      'Primeiro acesso',
                      style: Theme.of(context).textTheme.headlineMedium,
                    )
                  else
                    Text.rich(
                      TextSpan(
                        children: [
                          const TextSpan(
                            text: 'A ponte que\n',
                            style: TextStyle(
                              fontFamily: 'Fraunces',
                              fontStyle: FontStyle.italic,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                          const TextSpan(text: 'conecta vidas.'),
                        ],
                      ),
                      style: Theme.of(context).textTheme.headlineMedium
                          ?.copyWith(fontWeight: FontWeight.w700, height: 1.2),
                    ),
                  const SizedBox(height: 16),
                  Text(
                    widget.firstPassword
                        ? 'Defina sua senha pessoal e aceite o compromisso de sigilo.'
                        : 'Entre para acompanhar sua jornada e participar da comunidade.',
                  ),
                  const SizedBox(height: 28),
                  if (!widget.firstPassword) ...[
                    TextFormField(
                      controller: email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.username],
                      decoration: const InputDecoration(labelText: 'E-mail'),
                      validator: (v) => v?.contains('@') == true
                          ? null
                          : 'Informe seu e-mail.',
                    ),
                    const SizedBox(height: 18),
                  ],
                  TextFormField(
                    controller: password,
                    obscureText: true,
                    autofillHints: [
                      widget.firstPassword
                          ? AutofillHints.newPassword
                          : AutofillHints.password,
                    ],
                    decoration: InputDecoration(
                      labelText: widget.firstPassword ? 'Nova senha' : 'Senha',
                    ),
                    validator: (v) => (v?.length ?? 0) >= 8
                        ? null
                        : 'Informe uma senha com pelo menos oito caracteres.',
                  ),
                  if (widget.firstPassword) ...[
                    const SizedBox(height: 18),
                    TextFormField(
                      controller: confirmation,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Confirmar senha',
                      ),
                      validator: (v) => v == password.text
                          ? null
                          : 'As senhas devem ser iguais.',
                    ),
                    if (term == null)
                      TextButton(
                        onPressed: loadTerm,
                        child: const Text('Carregar termo de responsabilidade'),
                      )
                    else
                      ExpansionTile(
                        title: Text(
                          'Ler termo completo · versão ${term!['versao']}',
                        ),
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text(term!['texto'] as String),
                          ),
                        ],
                      ),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: consent,
                      onChanged: term == null
                          ? null
                          : (v) => setState(() => consent = v ?? false),
                      title: const Text(
                        'Aceito o termo de responsabilidade e sigilo.',
                      ),
                      subtitle: const Text(
                        'Acesse apenas dados necessários ao atendimento autorizado. Preserve o sigilo e registre suas ações na plataforma.',
                      ),
                    ),
                  ],
                  if (feedback != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Text(feedback!),
                    ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: busy || (widget.firstPassword && term == null)
                        ? null
                        : submit,
                    child: Text(
                      busy
                          ? 'Aguarde…'
                          : widget.firstPassword
                          ? 'Salvar senha'
                          : 'Entrar',
                    ),
                  ),
                  if (!widget.firstPassword)
                    TextButton(
                      onPressed: busy ? null : recover,
                      child: const Text('Esqueci minha senha'),
                    ),
                  if (!widget.firstPassword)
                    OutlinedButton(
                      onPressed: busy
                          ? null
                          : () async {
                              final registered = await Navigator.of(context)
                                  .push<String>(
                                    MaterialPageRoute(
                                      builder: (_) => RegistrationPage(
                                        api: widget.session.api,
                                      ),
                                    ),
                                  );
                              if (mounted && registered != null) {
                                setState(() {
                                  email.text = registered;
                                  feedback =
                                      'Pré-cadastro concluído. Entre com sua senha para continuar.';
                                });
                              }
                            },
                      child: const Text('Quero me cadastrar'),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
