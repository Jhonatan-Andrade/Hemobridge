import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/api_client.dart';
import '../../core/app_theme.dart';

class RoleWorkspace extends StatefulWidget {
  final ApiClient api;
  final String role;
  final bool secondary;
  const RoleWorkspace({
    super.key,
    required this.api,
    required this.role,
    this.secondary = false,
  });
  @override
  State<RoleWorkspace> createState() => _RoleWorkspaceState();
}

class _RoleWorkspaceState extends State<RoleWorkspace> {
  late Future<dynamic> future;
  String? hospitalId;
  List<dynamic> hospitals = [];
  String get path => switch (widget.role) {
    'PACIENTE' => '/paciente/perfil',
    'MEDICO' =>
      widget.secondary
          ? '/medico/exames'
          : '/medico/agenda${hospitalId == null ? '' : '?hospitalId=$hospitalId'}',
    'REPRESENTANTE' =>
      widget.secondary
          ? '/representante/estoque'
          : '/representante/necessidades',
    _ =>
      widget.secondary ? '/comunidade/denuncias' : '/admin/mapa-necessidades',
  };
  @override
  void initState() {
    super.initState();
    future = load();
  }

  Future<dynamic> load() async {
    if (widget.role == 'MEDICO' && !widget.secondary) {
      hospitals = await widget.api.request('/medico/hospitais') as List;
      hospitalId ??= hospitals.isEmpty ? null : hospitals.first['id'] as String;
    }
    return widget.api.request(path);
  }

  Future<void> reload() async {
    setState(() {
      future = load();
    });
    await future;
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(
    future: future,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const Center(child: CircularProgressIndicator());
      }
      if (snapshot.hasError) {
        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(snapshot.error.toString()),
            OutlinedButton(
              onPressed: reload,
              child: const Text('Tentar novamente'),
            ),
          ],
        );
      }
      final data = snapshot.data;
      return RefreshIndicator(
        onRefresh: reload,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(switch (widget.role) {
              'PACIENTE' => 'Meu painel',
              'MEDICO' => widget.secondary ? 'Meus exames' : 'Minha agenda',
              'REPRESENTANTE' =>
                widget.secondary
                    ? 'Estoque de bolsas'
                    : 'Necessidades da instituição',
              _ => widget.secondary ? 'Moderação' : 'Mapa de necessidades',
            }, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 20),
            ...content(context, data),
          ],
        ),
      );
    },
  );
  List<Widget> content(BuildContext context, dynamic data) {
    if (widget.role == 'PACIENTE') {
      return [
        info(context, 'Sua situação', statusLabel(data['status'] as String)),
        if (data['bloodType'] != null)
          info(context, 'Tipo sanguíneo validado', data['bloodType'] as String),
        const Text(
          'Consulte sua agenda, exames e orientações nos canais privados de acompanhamento. A aprovação depende de avaliação profissional.',
        ),
      ];
    }
    if (widget.role == 'MEDICO') {
      final rows = data as List;
      return [
        if (!widget.secondary) ...[
          DropdownButtonFormField<String>(
            key: ValueKey(hospitalId),
            initialValue: hospitalId,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Instituição'),
            items: hospitals
                .map(
                  (h) => DropdownMenuItem<String>(
                    value: h['id'] as String,
                    child: Text(
                      h['nome'] as String,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                )
                .toList(),
            onChanged: (value) {
              setState(() {
                hospitalId = value;
                future = load();
              });
            },
          ),
          const SizedBox(height: 16),
        ],
        if (rows.isEmpty) const Text('Nenhum registro para esta seleção.'),
        for (final row in rows)
          info(
            context,
            widget.secondary
                ? row['consulta']['paciente']['usuario']['nome'] as String
                : formatDate(row['inicio'] as String),
            widget.secondary
                ? row['descricao'] as String
                : (row['consultas'] as List).isEmpty
                ? 'Horário disponível'
                : (row['consultas'] as List)
                      .map((c) => c['paciente']['usuario']['nome'])
                      .join(', '),
          ),
      ];
    }
    if (widget.role == 'REPRESENTANTE') {
      if (widget.secondary) {
        return [
          if ((data as List).isEmpty) const Text('Nenhuma bolsa registrada.'),
          for (final bag in data)
            info(
              context,
              '${bag['codigo']} · ${bag['tipoSanguineo']['sigla']}',
              '${statusLabel(bag['status'] as String)}\nValidade: ${formatDate(bag['validadeEm'] as String)}',
            ),
        ];
      }
      return [
        Text(data['hospital']['nome'] as String),
        for (final need in data['necessidades'] as List)
          info(
            context,
            need['tipo'] as String,
            statusLabel(need['nivel'] as String),
          ),
      ];
    }
    if (widget.secondary) {
      return [
        if ((data as List).isEmpty) const Text('Nenhuma denúncia recebida.'),
        for (final report in data)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(report['motivo'] as String),
                  OutlinedButton(
                    onPressed: () async {
                      try {
                        await widget.api.request(
                          '/comunidade/publicacoes/${report['publicacaoId']}',
                          method: 'PATCH',
                          body: {'status': 'OCULTO'},
                        );
                        await reload();
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(
                            context,
                          ).showSnackBar(SnackBar(content: Text(e.toString())));
                        }
                      }
                    },
                    child: const Text('Ocultar publicação'),
                  ),
                ],
              ),
            ),
          ),
      ];
    }
    return [
      const BrazilMap(),
      const SizedBox(height: 20),
      Text(
        '${data['instituicoesVerificadas']} instituições verificadas. Necessidades declaradas nas últimas ${data['janelaHoras']} horas.',
      ),
      if ((data['itens'] as List).isEmpty)
        const Text('Sem informação atualizada na seleção.'),
      for (final row in data['itens'] as List)
        info(
          context,
          '${row['estado']} · ${row['tipo']}',
          '${statusLabel(row['nivel'] as String)} · ${row['unidades']} unidade(s)',
        ),
      const Text(
        'A cobertura corresponde às instituições participantes. O mapa não representa todo o estoque nacional.',
      ),
    ];
  }

  Widget info(BuildContext context, String title, String text) => Card(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          Text(text),
        ],
      ),
    ),
  );
}

String statusLabel(String value) => switch (value) {
  'PRE_CADASTRADO' => 'Pré-cadastrado',
  'CONSULTA_AGENDADA' => 'Consulta agendada',
  'AGUARDANDO_EXAME' => 'Aguardando exame',
  'EM_ANALISE' => 'Em análise',
  'APROVADO' => 'Aprovado',
  'REPROVADO' => 'Não aprovado',
  'CRITICO' => 'Crítico',
  'BAIXO' => 'Baixo',
  'ESTAVEL' => 'Estável',
  'ADEQUADO' => 'Adequado',
  'QUARENTENA' => 'Quarentena',
  'DISPONIVEL' => 'Disponível',
  'RESERVADA' => 'Reservada',
  'UTILIZADA' => 'Utilizada',
  'DESCARTADA' => 'Descartada',
  _ => 'Não informado',
};
String formatDate(String value) {
  final date = DateTime.parse(value).toLocal();
  return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
}

class BrazilMap extends StatefulWidget {
  const BrazilMap({super.key});
  @override
  State<BrazilMap> createState() => _BrazilMapState();
}

class _BrazilMapState extends State<BrazilMap> {
  late final Future<List<dynamic>> geometry;
  @override
  void initState() {
    super.initState();
    geometry = rootBundle
        .loadString('assets/maps/brazil-regions-ibge.json')
        .then((text) => (jsonDecode(text) as Map)['features'] as List);
  }

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Limites das cinco regiões do Brasil, cartografia do IBGE',
    child: ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: AspectRatio(
        aspectRatio: 6 / 5,
        child: FutureBuilder<List<dynamic>>(
          future: geometry,
          builder: (context, s) => s.hasData
              ? CustomPaint(painter: _BrazilPainter(s.data!))
              : const Center(child: CircularProgressIndicator()),
        ),
      ),
    ),
  );
}

class _BrazilPainter extends CustomPainter {
  final List<dynamic> features;
  _BrazilPainter(this.features);
  List<List<dynamic>> polygons(dynamic feature) {
    final g = feature['geometry'];
    return g['type'] == 'Polygon'
        ? [g['coordinates'] as List]
        : (g['coordinates'] as List).cast<List<dynamic>>();
  }

  double mercator(num lat) =>
      math.log(math.tan(math.pi / 4 + lat * math.pi / 360)) * 180 / math.pi;
  @override
  void paint(Canvas drawing, Size size) {
    drawing.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = const LinearGradient(
          colors: [petrol, Color(0xff49283f)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ).createShader(Offset.zero & size),
    );
    final points = [
      for (final feature in features)
        for (final polygon in polygons(feature))
          for (final ring in polygon)
            for (final point in ring as List)
              [(point[0] as num).toDouble(), mercator(point[1] as num)],
    ];
    final minX = points.map((p) => p[0]).reduce(math.min),
        maxX = points.map((p) => p[0]).reduce(math.max),
        minY = points.map((p) => p[1]).reduce(math.min),
        maxY = points.map((p) => p[1]).reduce(math.max);
    final scale = math.min(
      (size.width - 32) / (maxX - minX),
      (size.height - 32) / (maxY - minY),
    );
    final x = (size.width - (maxX - minX) * scale) / 2,
        y = (size.height - (maxY - minY) * scale) / 2;
    for (final feature in features) {
      final path = Path()..fillType = PathFillType.evenOdd;
      for (final polygon in polygons(feature)) {
        for (final ring in polygon) {
          var first = true;
          for (final point in ring as List) {
            final px = x + ((point[0] as num) - minX) * scale,
                py = y + (maxY - mercator(point[1] as num)) * scale;
            if (first) {
              path.moveTo(px, py);
              first = false;
            } else {
              path.lineTo(px, py);
            }
          }
          path.close();
        }
      }
      drawing.drawPath(
        path,
        Paint()..color = Colors.white.withValues(alpha: .12),
      );
      drawing.drawPath(
        path,
        Paint()
          ..color = Colors.white.withValues(alpha: .75)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.2,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _BrazilPainter oldDelegate) =>
      oldDelegate.features != features;
}
