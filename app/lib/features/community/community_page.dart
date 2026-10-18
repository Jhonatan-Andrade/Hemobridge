import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/app_theme.dart';

class CommunityPage extends StatefulWidget {
  final ApiClient api;
  final String role;
  const CommunityPage({super.key, required this.api, required this.role});
  @override
  State<CommunityPage> createState() => _CommunityPageState();
}

class _CommunityPageState extends State<CommunityPage> {
  List<dynamic> posts = [];
  int page = 0;
  bool loading = true, hasMore = true;
  bool fetching = false;
  String? error;
  @override
  void initState() {
    super.initState();
    load(reset: true);
  }

  Future<void> load({bool reset = false}) async {
    if (fetching) return;
    fetching = true;
    if (mounted) setState(() => loading = true);
    try {
      final data = await widget.api.request(
        '/comunidade/publicacoes?pagina=${reset ? 1 : page + 1}',
      );
      if (mounted) {
        setState(() {
          posts = reset
              ? data['items'] as List
              : [
                  ...posts,
                  ...(data['items'] as List).where(
                    (p) => !posts.any((old) => old['id'] == p['id']),
                  ),
                ];
          page = reset ? 1 : page + 1;
          hasMore = data['hasMore'] as bool;
          loading = false;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = e.toString();
          loading = false;
        });
      }
    } finally {
      fetching = false;
    }
  }

  Future<void> compose() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => ComposeDialog(api: widget.api, role: widget.role),
    );
    if (result == true) load(reset: true);
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: () => load(reset: true),
    child: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text('Comunidade', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        const Text(
          'Saúde e doação em uma conversa responsável. Avisos críticos ativos aparecem primeiro; as demais publicações seguem a ordem cronológica.',
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: compose,
          icon: const Icon(Icons.edit_outlined),
          label: const Text('Criar publicação'),
        ),
        if (loading)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: CircularProgressIndicator()),
          ),
        if (error != null) ...[
          Text(error!),
          TextButton(
            onPressed: () => load(reset: true),
            child: const Text('Tentar novamente'),
          ),
        ],
        if (!loading && posts.isEmpty && error == null)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Text('As publicações aparecerão neste espaço.'),
          ),
        for (final post in posts)
          PostCard(
            post: Map<String, dynamic>.from(post),
            onOpen: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) =>
                    CommentsPage(api: widget.api, id: post['id'] as String),
              ),
            ),
          ),
        if (hasMore && !loading)
          OutlinedButton(
            onPressed: () => load(),
            child: const Text('Carregar mais publicações'),
          ),
      ],
    ),
  );
}

class PostCard extends StatelessWidget {
  final Map<String, dynamic> post;
  final VoidCallback onOpen;
  const PostCard({super.key, required this.post, required this.onOpen});
  @override
  Widget build(BuildContext context) => Card(
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
      side: BorderSide(
        color: post['verified'] == true || post['pinned'] == true
            ? brand
            : const Color(0xffdedbd6),
        width: post['verified'] == true ? 2 : 1,
      ),
    ),
    child: InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onOpen,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (post['pinned'] == true)
              const Chip(label: Text('Aviso crítico · fixado')),
            Text(
              post['author'] as String,
              style: Theme.of(context).textTheme.titleSmall,
            ),
            if (post['verified'] == true)
              const Chip(
                avatar: Icon(Icons.verified_outlined, size: 16),
                label: Text('Perfil Verificado'),
              ),
            const SizedBox(height: 12),
            Text(
              post['title'] as String,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Text(post['content'] as String),
            const SizedBox(height: 16),
            Text(
              '${post['likes']} curtidas · ${post['commentsTotal']} comentários',
            ),
            const SizedBox(height: 8),
            const Text(
              'Ler conversa →',
              style: TextStyle(color: brand, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    ),
  );
}

class ComposeDialog extends StatefulWidget {
  final ApiClient api;
  final String role;
  const ComposeDialog({super.key, required this.api, required this.role});
  @override
  State<ComposeDialog> createState() => _ComposeDialogState();
}

class _ComposeDialogState extends State<ComposeDialog> {
  final form = GlobalKey<FormState>(),
      title = TextEditingController(),
      content = TextEditingController();
  bool consent = false, critical = false, busy = false;
  String topic = 'DOACAO';
  String? error;
  @override
  void dispose() {
    title.dispose();
    content.dispose();
    super.dispose();
  }

  Future<void> send() async {
    if (!consent || !form.currentState!.validate() || busy) return;
    setState(() => busy = true);
    try {
      await widget.api.request(
        '/comunidade/publicacoes',
        method: 'POST',
        body: {
          'titulo': title.text,
          'texto': content.text,
          'tema': critical ? 'AVISO_INSTITUCIONAL' : topic,
          'tipo': critical ? 'AVISO_CRITICO' : 'COMUM',
          if (critical)
            'fixadaAte': DateTime.now()
                .add(const Duration(hours: 24))
                .toUtc()
                .toIso8601String(),
          'aceiteNormas': consent,
          'versaoNormas': '2026-10',
        },
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Criar publicação'),
    content: SingleChildScrollView(
      child: Form(
        key: form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: title,
              maxLength: 120,
              decoration: const InputDecoration(labelText: 'Título'),
              validator: (v) => (v?.trim().length ?? 0) >= 8
                  ? null
                  : 'Use ao menos oito caracteres.',
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: content,
              maxLength: 2000,
              maxLines: 5,
              decoration: const InputDecoration(labelText: 'Texto'),
              validator: (v) => (v?.trim().length ?? 0) >= 20
                  ? null
                  : 'Use ao menos 20 caracteres.',
            ),
            DropdownButtonFormField<String>(
              initialValue: topic,
              items: const [
                DropdownMenuItem(
                  value: 'DOACAO',
                  child: Text('Doação de sangue'),
                ),
                DropdownMenuItem(value: 'SAUDE', child: Text('Saúde')),
                DropdownMenuItem(
                  value: 'AVISO_INSTITUCIONAL',
                  child: Text('Aviso institucional'),
                ),
              ],
              onChanged: (v) => setState(() => topic = v ?? 'DOACAO'),
            ),
            if (widget.role == 'REPRESENTANTE')
              CheckboxListTile(
                value: critical,
                onChanged: (v) => setState(() => critical = v ?? false),
                title: const Text('Aviso crítico por 24 horas'),
                subtitle: const Text('Exclusivo de instituição verificada.'),
              ),
            CheckboxListTile(
              value: consent,
              onChanged: (v) => setState(() => consent = v ?? false),
              title: const Text('Concordo com as normas da comunidade.'),
              subtitle: const Text(
                'Apenas saúde e doação, sem dados pessoais, diagnósticos individuais, discriminação ou publicidade enganosa.',
              ),
            ),
            if (error != null) Text(error!),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: busy ? null : () => Navigator.pop(context),
        child: const Text('Cancelar'),
      ),
      FilledButton(
        onPressed: busy || !consent ? null : send,
        child: Text(busy ? 'Publicando…' : 'Publicar'),
      ),
    ],
  );
}

class CommentsPage extends StatefulWidget {
  final ApiClient api;
  final String id;
  const CommentsPage({super.key, required this.api, required this.id});
  @override
  State<CommentsPage> createState() => _CommentsPageState();
}

class _CommentsPageState extends State<CommentsPage> {
  final text = TextEditingController();
  Map<String, dynamic>? post;
  String? error;
  bool consent = false, busy = false;
  int page = 1;
  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    text.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final value = await widget.api.request(
        '/comunidade/publicacoes/${widget.id}',
      );
      if (mounted) setState(() => post = Map<String, dynamic>.from(value));
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  Future<void> more() async {
    try {
      final data = await widget.api.request(
        '/comunidade/publicacoes/${widget.id}/comentarios?pagina=${page + 1}',
      );
      if (mounted) {
        setState(() {
          post!['comments'] = [
            ...post!['comments'] as List,
            ...data['items'] as List,
          ];
          page++;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  Future<void> send() async {
    if (!consent || text.text.trim().isEmpty || busy) return;
    setState(() => busy = true);
    try {
      await widget.api.request(
        '/comunidade/publicacoes/${widget.id}/comentarios',
        method: 'POST',
        body: {
          'texto': text.text.trim(),
          'aceiteNormas': consent,
          'versaoNormas': '2026-10',
        },
      );
      text.clear();
      if (mounted) setState(() => consent = false);
      await load();
      page = 1;
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Conversa')),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (error != null) Text(error!),
          if (post == null)
            const Center(child: CircularProgressIndicator())
          else ...[
            PostCard(post: post!, onOpen: () {}),
            Text(
              'Comentários (${post!['commentsTotal']})',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            for (final c in post!['comments'] as List)
              Card(
                child: ListTile(
                  title: Text(c['author'] as String),
                  subtitle: Text(c['text'] as String),
                ),
              ),
            if ((post!['comments'] as List).length <
                (post!['commentsTotal'] as num))
              OutlinedButton(
                onPressed: more,
                child: const Text('Mostrar mais comentários'),
              ),
            TextField(
              controller: text,
              maxLines: 4,
              maxLength: 2000,
              decoration: const InputDecoration(
                labelText: 'Escrever um comentário',
              ),
            ),
            CheckboxListTile(
              value: consent,
              onChanged: (v) => setState(() => consent = v ?? false),
              title: const Text(
                'Concordo com as normas da comunidade e preservo a privacidade.',
              ),
              subtitle: const Text(
                'Converse apenas sobre saúde e doação, sem dados pessoais ou avaliação individual.',
              ),
            ),
            FilledButton(
              onPressed: busy || !consent ? null : send,
              child: Text(busy ? 'Enviando…' : 'Enviar comentário'),
            ),
          ],
        ],
      ),
    ),
  );
}
