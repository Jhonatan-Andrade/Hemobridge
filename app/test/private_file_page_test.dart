import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:pdfrx/pdfrx.dart';
import 'package:hemobridge/core/api_client.dart';
import 'package:hemobridge/core/private_file_page.dart';

class FailingPdfEngine extends Fake implements PdfrxEntryFunctions {
  int attempts = 0;

  @override
  Future<void> init() async {}

  @override
  Future<PdfDocument> openData(
    Uint8List data, {
    PdfPasswordProvider? passwordProvider,
    bool firstAttemptByEmptyPassword = true,
    String? sourceName,
    bool allowDataOwnershipTransfer = false,
    bool useProgressiveLoading = false,
    void Function()? onDispose,
  }) async {
    attempts++;
    Error.throwWithStackTrace(
      StateError('PdfException: FPDF_ERR_FORMAT (3)'),
      StackTrace.fromString('native/private-exam-path/renderer.dart:123'),
    );
  }
}

void main() {
  testWidgets(
    'falha do leitor PDF não expõe detalhes técnicos e permite repetir e voltar',
    (tester) async {
      final engine = FailingPdfEngine();
      final originalEngine = PdfrxEntryFunctions.instance;
      final originalCachePath = Pdfrx.cacheDirectoryPath;
      PdfrxEntryFunctions.instance = engine;
      Pdfrx.cacheDirectoryPath = 'unused-widget-test-cache';
      addTearDown(() {
        PdfrxEntryFunctions.instance = originalEngine;
        Pdfrx.cacheDirectoryPath = originalCachePath;
      });
      await tester.binding.setSurfaceSize(const Size(360, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      var requests = 0;
      final api = ApiClient(
        baseUrl: 'https://api.example.invalid',
        client: MockClient((request) async {
          requests++;
          expect(request.url.path, '/paciente/exames/envios/1/arquivo');
          expect(request.headers['Authorization'], 'Bearer token-de-teste');
          return http.Response.bytes(
            utf8.encode('%PDF-1.4\n% Documento incompleto de teste\n%%EOF\n'),
            200,
          );
        }),
      )..token = 'token-de-teste';
      addTearDown(api.close);
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => PrivateFilePage(
                      api: api,
                      path: '/paciente/exames/envios/1/arquivo',
                      title: 'laudo-tipagem.pdf',
                    ),
                  ),
                ),
                child: const Text('Abrir resultado'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Abrir resultado'));
      await tester.pumpAndSettle();

      void expectSafeError() {
        expect(
          find.textContaining('Não foi possível abrir este PDF.'),
          findsOneWidget,
        );
        for (final detail in [
          'PdfException',
          'FPDF_ERR',
          'renderer.dart',
          'private-exam-path',
        ]) {
          expect(find.textContaining(detail, findRichText: true), findsNothing);
        }
        expect(tester.takeException(), isNull);
      }

      expectSafeError();
      final firstSource = tester
          .widget<PdfViewer>(find.byType(PdfViewer))
          .documentRef
          .key;
      expect(requests, 1);
      expect(engine.attempts, 1);

      await tester.tap(find.text('Tentar novamente'));
      await tester.pumpAndSettle();
      expectSafeError();
      expect(requests, 2);
      expect(engine.attempts, 2);
      expect(
        tester.widget<PdfViewer>(find.byType(PdfViewer)).documentRef.key,
        isNot(firstSource),
      );

      await tester.tap(find.text('Voltar'));
      await tester.pumpAndSettle();
      expect(find.text('Abrir resultado'), findsOneWidget);
      expect(find.byType(PrivateFilePage), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
