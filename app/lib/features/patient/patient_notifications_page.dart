import 'package:flutter/material.dart';
import '../../core/api_client.dart';

String? notificationDestination(String? link) {
  const routes = {
    '/meus-exames': 'exams',
    '/locais-recomendados': 'locations',
    '/minhas-consultas': 'appointments',
    '/exames-para-avaliar': 'doctor-exams',
    '/#profile': 'profile',
    '/#professional': 'agenda',
    '/#external-consultations': 'appointments',
    '/#external-exams': 'exams',
    '/#external-locations': 'locations',
  };
  if (link != null &&
      RegExp(r'^/bancos-de-sangue/[a-zA-Z0-9-]+$').hasMatch(link)) {
    return 'locations';
  }
  return routes[link];
}

class PatientNotificationsPage extends StatefulWidget {
  final ApiClient api;
  final Widget? Function(String destination) destinationBuilder;
  const PatientNotificationsPage({
    super.key,
    required this.api,
    required this.destinationBuilder,
  });
  @override
  State<PatientNotificationsPage> createState() =>
      _PatientNotificationsPageState();
}

class _PatientNotificationsPageState extends State<PatientNotificationsPage> {
  int page = 1;
  bool busy = false;
  String? error;
  late Future<dynamic> notices = fetch();
  Future<dynamic> fetch() =>
      widget.api.request('/notificacoes?pagina=$page&tamanhoPagina=20');
  void reload() {
    final next = fetch();
    setState(() { notices = next; });
  }
  Future<void> action(String? id, [String? link]) async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.api.request(
        id == null
            ? '/notificacoes/marcar-todas-lidas'
            : '/notificacoes/${Uri.encodeComponent(id)}',
        method: id == null ? 'POST' : 'GET',
      );
      if (!mounted) return;
      reload();
      final destination = notificationDestination(link);
      final target = destination == null
          ? null
          : widget.destinationBuilder(destination);
      if (target != null && mounted) {
        await Navigator.push(
          context,
          MaterialPageRoute<void>(builder: (_) => target),
        );
      }
    } catch (failure) {
      if (mounted) setState(() => error = failure.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Notificações')),
    body: FutureBuilder<dynamic>(
      future: notices,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(snapshot.error.toString()),
                OutlinedButton(
                  onPressed: reload,
                  child: const Text('Tentar novamente'),
                ),
              ],
            ),
          );
        }
        final data = snapshot.data;
        final rows = data['itens'] as List;
        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text('${data['naoLidas']} não lidas'),
            if (error != null) Text(error!),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: busy || data['naoLidas'] == 0
                  ? null
                  : () => action(null),
              child: const Text('Marcar todas como lidas'),
            ),
            if (rows.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Text('Nenhuma notificação.'),
              ),
            for (final item in rows)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item['titulo'] as String,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(item['mensagem'] as String),
                      const SizedBox(height: 12),
                      if (notificationDestination(item['link'] as String?)
                          case final destination?
                          when widget.destinationBuilder(destination) != null)
                        OutlinedButton(
                          onPressed: busy
                              ? null
                              : () => action(
                                  item['id'] as String,
                                  item['link'] as String?,
                                ),
                          child: const Text('Ver detalhes'),
                        ),
                      if (item['lida'] != true)
                        TextButton(
                          onPressed: busy
                              ? null
                              : () => action(item['id'] as String),
                          child: const Text('Marcar como lida'),
                        ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              children: [
                OutlinedButton(
                  onPressed: busy || page == 1
                      ? null
                      : () {
                          page--;
                          reload();
                        },
                  child: const Text('Anterior'),
                ),
                OutlinedButton(
                  onPressed: busy || page * 20 >= (data['total'] as int)
                      ? null
                      : () {
                          page++;
                          reload();
                        },
                  child: const Text('Próxima'),
                ),
              ],
            ),
          ],
        );
      },
    ),
  );
}
