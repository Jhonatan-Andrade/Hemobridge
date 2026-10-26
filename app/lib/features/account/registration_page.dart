import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/app_theme.dart';
import '../locations/ibge_localities.dart';
import 'account_locality_fields.dart';
import 'account_validation.dart';

class RegistrationPage extends StatefulWidget {
  final ApiClient api;
  final IbgeLocalities? localities;
  final ValueChanged<String>? onRegistered;
  const RegistrationPage({
    super.key,
    required this.api,
    this.localities,
    this.onRegistered,
  });

  @override
  State<RegistrationPage> createState() => _RegistrationPageState();
}

class _RegistrationPageState extends State<RegistrationPage> {
  final form = GlobalKey<FormState>();
  final controllers = <String, TextEditingController>{
    for (final key in [
      'nome',
      'cpf',
      'email',
      'telefone',
      'dataNascimento',
      'pesoKg',
      'senha',
      'confirmacaoSenha',
    ])
      key: TextEditingController(),
  };
  String? sex, feedback;
  String state = '', city = '';
  bool busy = false, consent = false, over60 = false, completed = false;
  Map<String, dynamic>? term;
  String? termError;
  String value(String key) => controllers[key]!.text;

  @override
  void initState() {
    super.initState();
    loadTerm();
  }

  Future<void> loadTerm() async {
    setState(() {
      term = null;
      consent = false;
      termError = null;
    });
    try {
      final response = await widget.api.request(
        '/pacientes/termo-consentimento',
      );
      if (response is! Map ||
          response['versao'] is! String ||
          (response['versao'] as String).isEmpty ||
          response['texto'] is! String ||
          (response['texto'] as String).isEmpty) {
        throw ApiException('O termo de consentimento está indisponível.', 0);
      }
      if (mounted) setState(() => term = Map<String, dynamic>.from(response));
    } catch (error) {
      if (mounted) setState(() => termError = error.toString());
    }
  }

  Future<void> pickBirth() async {
    final now = DateTime.now();
    final first = DateTime(now.year - 70, now.month, now.day + 1);
    final last = DateTime(now.year - 16, now.month, now.day);
    final entered = DateTime.tryParse(value('dataNascimento'));
    final initial =
        entered != null && !entered.isBefore(first) && !entered.isAfter(last)
        ? entered
        : DateTime(now.year - 25, now.month, now.day);
    final result = await showDatePicker(
      context: context,
      helpText: 'Data de nascimento',
      initialDate: initial,
      firstDate: first,
      lastDate: last,
    );
    if (result != null && mounted) {
      setState(() {
        controllers['dataNascimento']!.text = result
            .toIso8601String()
            .split('T')
            .first;
        over60 = false;
      });
    }
  }

  Future<void> submit() async {
    if (busy || !form.currentState!.validate()) return;
    final age = ageAt(value('dataNascimento'), DateTime.now());
    if (term == null || !consent) {
      setState(
        () =>
            feedback = 'Leia e aceite o termo de consentimento para continuar.',
      );
      return;
    }
    if (age != null && age > 60 && !over60) {
      setState(
        () => feedback =
            'Confirme a regra de doação para pessoas acima de 60 anos.',
      );
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      feedback = null;
    });
    try {
      await widget.api.request(
        '/pacientes',
        method: 'POST',
        body: {
          'nome': value('nome').trim(),
          'cpf': onlyDigits(value('cpf')),
          'email': value('email').trim().toLowerCase(),
          'telefone': onlyDigits(value('telefone')),
          'dataNascimento': value('dataNascimento').trim(),
          'sexo': sex,
          'pesoKg': double.parse(value('pesoKg').replaceAll(',', '.')),
          'cidade': city,
          'estado': state,
          'senha': value('senha'),
          'confirmacaoSenha': value('confirmacaoSenha'),
          'aceiteTermo': true,
          'versaoTermo': term!['versao'],
          'cienteRegraAcimaDe60': over60,
        },
      );
      if (mounted) setState(() => completed = true);
    } catch (error) {
      if (mounted) setState(() => feedback = error.toString());
      if (mounted &&
          error is ApiException &&
          error.status == 400 &&
          error.message.contains('termo')) {
        await loadTerm();
      }
    } finally {
      if (mounted) {
        controllers['senha']!.clear();
        controllers['confirmacaoSenha']!.clear();
        setState(() => busy = false);
      }
    }
  }

  @override
  void dispose() {
    for (final controller in controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Widget field(
    String key,
    String label, {
    TextInputType? keyboard,
    bool password = false,
    String? helper,
    String? Function(String?)? validator,
    int? maxLength,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 18),
    child: TextFormField(
      key: ValueKey('registration-$key'),
      controller: controllers[key],
      enabled: !busy,
      keyboardType: keyboard,
      obscureText: password,
      enableSuggestions: !password,
      autocorrect: !password,
      maxLength: maxLength,
      decoration: InputDecoration(
        labelText: label,
        helperText: helper,
        helperMaxLines: 3,
      ),
      validator: validator,
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const BrandTitle()),
    body: SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: completed
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Icon(
                        Icons.check_circle_outline,
                        color: brand,
                        size: 56,
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'Pré-cadastro concluído',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Entre com seu e-mail e senha para conhecer as próximas etapas. A aptidão para doar depende da avaliação profissional e da triagem do serviço de hemoterapia.',
                      ),
                      const SizedBox(height: 24),
                      FilledButton(
                        onPressed: () {
                          final email = value('email').trim().toLowerCase();
                          if (widget.onRegistered != null) {
                            widget.onRegistered!(email);
                          } else {
                            Navigator.of(context).pop(email);
                          }
                        },
                        child: const Text('Ir para entrar'),
                      ),
                    ],
                  )
                : Form(
                    key: form,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Comece sua jornada',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Crie sua conta de Paciente/Doador para acompanhar as orientações e participar da comunidade.',
                        ),
                        const SizedBox(height: 24),
                        field(
                          'nome',
                          'Nome completo',
                          maxLength: 150,
                          validator: (v) => (v?.trim().length ?? 0) >= 3
                              ? null
                              : 'Informe seu nome completo.',
                        ),
                        field(
                          'cpf',
                          'CPF',
                          keyboard: TextInputType.number,
                          maxLength: 14,
                          validator: (v) => validCpf(v ?? '')
                              ? null
                              : 'Informe um CPF válido.',
                        ),
                        field(
                          'email',
                          'E-mail',
                          keyboard: TextInputType.emailAddress,
                          maxLength: 254,
                          validator: (v) =>
                              RegExp(
                                r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                              ).hasMatch(v?.trim() ?? '')
                              ? null
                              : 'Informe um e-mail válido.',
                        ),
                        field(
                          'telefone',
                          'Telefone com DDD',
                          keyboard: TextInputType.phone,
                          maxLength: 20,
                          validator: validatePhone,
                        ),
                        Text(
                          'Dados para acompanhamento',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 18),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 18),
                          child: TextFormField(
                            key: const ValueKey('registration-dataNascimento'),
                            controller: controllers['dataNascimento'],
                            enabled: !busy,
                            keyboardType: TextInputType.datetime,
                            decoration: InputDecoration(
                              labelText: 'Data de nascimento',
                              hintText: 'AAAA-MM-DD',
                              suffixIcon: IconButton(
                                onPressed: busy ? null : pickBirth,
                                tooltip: 'Escolher data de nascimento',
                                icon: const Icon(Icons.calendar_today_outlined),
                              ),
                            ),
                            onChanged: (_) => setState(() => over60 = false),
                            validator: (v) {
                              final age = ageAt(
                                v?.trim() ?? '',
                                DateTime.now(),
                              );
                              return age != null && age >= 16 && age <= 69
                                  ? null
                                  : 'Informe uma data válida. O pré-cadastro aceita idade de 16 a 69 anos.';
                            },
                          ),
                        ),
                        DropdownButtonFormField<String>(
                          key: const ValueKey('registration-sexo'),
                          initialValue: sex,
                          decoration: const InputDecoration(
                            labelText: 'Sexo para critérios de doação',
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'FEMININO',
                              child: Text('Feminino'),
                            ),
                            DropdownMenuItem(
                              value: 'MASCULINO',
                              child: Text('Masculino'),
                            ),
                          ],
                          onChanged: busy
                              ? null
                              : (v) => setState(() => sex = v),
                          validator: (v) =>
                              v == null ? 'Selecione uma opção.' : null,
                        ),
                        const SizedBox(height: 18),
                        field(
                          'pesoKg',
                          'Peso (kg)',
                          keyboard: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          validator: (v) =>
                              validateWeight(v, registration: true),
                        ),
                        AccountLocalityFields(
                          localities: widget.localities,
                          enabled: !busy,
                          onChanged: (uf, municipality) {
                            state = uf;
                            city = municipality;
                          },
                        ),
                        const SizedBox(height: 24),
                        field(
                          'senha',
                          'Senha',
                          password: true,
                          validator: validateAccountPassword,
                          helper:
                              'Use 8 a 128 caracteres, com maiúscula, minúscula e número.',
                        ),
                        field(
                          'confirmacaoSenha',
                          'Confirmar senha',
                          password: true,
                          validator: (v) =>
                              v != null && v.isNotEmpty && v == value('senha')
                              ? null
                              : 'As senhas devem ser iguais.',
                        ),
                        if ((ageAt(value('dataNascimento'), DateTime.now()) ??
                                0) >
                            60)
                          CheckboxListTile(
                            contentPadding: EdgeInsets.zero,
                            value: over60,
                            onChanged: busy
                                ? null
                                : (v) => setState(() => over60 = v ?? false),
                            title: const Text(
                              'Estou ciente de que, acima de 60 anos, só pode doar quem já doou antes dessa idade.',
                            ),
                          ),
                        if (term == null) ...[
                          Text(
                            termError ?? 'Carregando termo de consentimento…',
                          ),
                          if (termError != null)
                            TextButton(
                              onPressed: loadTerm,
                              child: const Text(
                                'Recarregar termo de consentimento',
                              ),
                            ),
                        ] else
                          ExpansionTile(
                            title: Text(
                              'Termo de consentimento · versão ${term!['versao']}',
                            ),
                            children: [
                              Padding(
                                padding: const EdgeInsets.all(16),
                                child: SelectableText(term!['texto'] as String),
                              ),
                            ],
                          ),
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          value: consent,
                          onChanged: busy || term == null
                              ? null
                              : (v) => setState(() => consent = v ?? false),
                          title: const Text(
                            'Li e aceito o termo de consentimento para tratamento dos dados de saúde necessários à minha jornada.',
                          ),
                        ),
                        if (feedback != null)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            child: Semantics(
                              liveRegion: true,
                              child: Text(feedback!),
                            ),
                          ),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: busy || term == null ? null : submit,
                          child: Text(
                            busy
                                ? 'Criando pré-cadastro…'
                                : 'Criar pré-cadastro',
                          ),
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
