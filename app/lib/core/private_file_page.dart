import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:pdfrx/pdfrx.dart';
import 'api_client.dart';

enum PrivateFileFormat { pdf, image, unsupported }

PrivateFileFormat privateFileFormat(List<int> bytes) {
  bool starts(List<int> signature) =>
      bytes.length >= signature.length &&
      List.generate(
        signature.length,
        (i) => bytes[i] == signature[i],
      ).every((v) => v);
  if (starts([37, 80, 68, 70, 45])) return PrivateFileFormat.pdf;
  if (starts([255, 216, 255]) || starts([137, 80, 78, 71, 13, 10, 26, 10])) {
    return PrivateFileFormat.image;
  }
  return PrivateFileFormat.unsupported;
}

class PrivateFilePage extends StatefulWidget {
  final ApiClient api;
  final String path, title;
  const PrivateFilePage({
    super.key,
    required this.api,
    required this.path,
    required this.title,
  });
  @override
  State<PrivateFilePage> createState() => _PrivateFilePageState();
}

class _PrivateFilePageState extends State<PrivateFilePage> {
  late Future<Uint8List> future;
  String sourceName = UniqueKey().toString();
  @override
  void initState() {
    super.initState();
    future = widget.api.getFile(widget.path);
  }

  void retry() => setState(() {
    sourceName = UniqueKey().toString();
    future = widget.api.getFile(widget.path);
  });

  Widget fileError(String message) => Center(
    child: SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Semantics(
            liveRegion: true,
            child: Text(message, textAlign: TextAlign.center),
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: retry,
            child: const Text('Tentar novamente'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).maybePop(),
            child: const Text('Voltar'),
          ),
        ],
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis),
    ),
    body: SafeArea(
      child: FutureBuilder<Uint8List>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return fileError(
              snapshot.error is ApiException
                  ? (snapshot.error as ApiException).message
                  : 'Não foi possível carregar o arquivo. Tente novamente.',
            );
          }
          final bytes = snapshot.data!;
          return switch (privateFileFormat(bytes)) {
            PrivateFileFormat.pdf => PdfViewer.data(
              bytes,
              key: ValueKey(sourceName),
              sourceName: sourceName,
              params: PdfViewerParams(
                errorBannerBuilder: (_, _, _, _) => fileError(
                  'Não foi possível abrir este PDF. O arquivo pode estar incompleto ou danificado. Tente novamente ou solicite um novo envio à equipe.',
                ),
              ),
            ),
            PrivateFileFormat.image => InteractiveViewer(
              maxScale: 5,
              child: Center(
                child: Image.memory(
                  bytes,
                  semanticLabel: 'Resultado de exame privado',
                  errorBuilder: (_, _, _) =>
                      const Text('Não foi possível exibir esta imagem.'),
                ),
              ),
            ),
            PrivateFileFormat.unsupported => const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'O arquivo não possui um formato compatível. Solicite um novo envio em PDF, JPG ou PNG.',
                ),
              ),
            ),
          };
        },
      ),
    ),
  );
}
