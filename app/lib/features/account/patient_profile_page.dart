import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../locations/ibge_localities.dart';
import 'account_locality_fields.dart';
import 'account_validation.dart';

class PatientProfilePage extends StatefulWidget {
  final ApiClient api;
  final IbgeLocalities? localities;
  final VoidCallback? onSaved;
  const PatientProfilePage({
    super.key,
    required this.api,
    this.localities,
    this.onSaved,
  });
  @override
  State<PatientProfilePage> createState() => _PatientProfilePageState();
}

class _PatientProfilePageState extends State<PatientProfilePage> {
  final form = GlobalKey<FormState>();
  final phone = TextEditingController(), weight = TextEditingController();
  Map<String, dynamic>? profile;
  String state = '', city = '';
  String? feedback, loadError;
  bool loading = true, busy = false;
  int loadVersion = 0;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final version = ++loadVersion;
    setState(() {
      loading = true;
      loadError = null;
    });
    try {
      final response = await widget.api.request('/paciente/perfil');
      if (!mounted || version != loadVersion) return;
      final data = Map<String, dynamic>.from(response as Map);
      phone.text = data['phone']?.toString() ?? '';
      weight.text = data['weight']?.toString() ?? '';
      state = '';
      city = '';
      setState(() {
        profile = data;
        loading = false;
      });
    } catch (error) {
      if (mounted && version == loadVersion) {
        setState(() {
          loading = false;
          loadError = error.toString();
        });
      }
    }
  }

  Future<void> save() async {
    if (busy || !form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      feedback = null;
    });
    try {
      final response = await widget.api.request(
        '/paciente/perfil',
        method: 'PATCH',
        body: {
          'telefone': onlyDigits(phone.text),
          'pesoKg': double.parse(weight.text.trim().replaceAll(',', '.')),
          'estado': state,
          'cidade': city,
        },
      );
      if (!mounted) return;
      setState(() {
        profile = Map<String, dynamic>.from(response as Map);
        feedback = 'Alterações salvas.';
      });
      widget.onSaved?.call();
    } catch (error) {
      if (mounted) setState(() => feedback = error.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    loadVersion++;
    phone.dispose();
    weight.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => loading
      ? const Center(
          child: CircularProgressIndicator(semanticsLabel: 'Carregando perfil'),
        )
      : loadError != null
      ? Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Semantics(liveRegion: true, child: Text(loadError!)),
                TextButton(
                  onPressed: load,
                  child: const Text('Tentar novamente'),
                ),
              ],
            ),
          ),
        )
      : SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Form(
                key: form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Meu perfil',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Revise seus dados de contato e acompanhamento.',
                    ),
                    const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              profile!['name']?.toString() ?? '',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            Text(profile!['email']?.toString() ?? ''),
                            if ((profile!['cpf']?.toString().length ?? 0) >= 2)
                              Text(
                                'CPF: ***.***.***-${profile!['cpf'].toString().substring(profile!['cpf'].toString().length - 2)}',
                              ),
                            const SizedBox(height: 8),
                            Text(
                              'Tipo sanguíneo: ${profile!['bloodType'] ?? 'Aguardando validação profissional'}',
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      key: const ValueKey('profile-phone'),
                      controller: phone,
                      enabled: !busy,
                      keyboardType: TextInputType.phone,
                      maxLength: 20,
                      decoration: const InputDecoration(
                        labelText: 'Telefone com DDD',
                      ),
                      validator: validatePhone,
                    ),
                    const SizedBox(height: 18),
                    TextFormField(
                      key: const ValueKey('profile-weight'),
                      controller: weight,
                      enabled: !busy,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(labelText: 'Peso (kg)'),
                      validator: validateWeight,
                    ),
                    const SizedBox(height: 18),
                    AccountLocalityFields(
                      key: ValueKey('profile-locality-$loadVersion'),
                      localities: widget.localities,
                      enabled: !busy,
                      initialState: profile!['state']?.toString() ?? '',
                      initialCity: profile!['city']?.toString() ?? '',
                      onChanged: (uf, municipality) {
                        state = uf;
                        city = municipality;
                      },
                    ),
                    if (feedback != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        child: Semantics(
                          liveRegion: true,
                          child: Text(feedback!),
                        ),
                      ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: busy ? null : save,
                      child: Text(busy ? 'Salvando…' : 'Salvar alterações'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
}
