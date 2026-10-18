import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:hemobridge/core/app_theme.dart';
import 'package:hemobridge/features/locations/ibge_localities.dart';
import 'package:hemobridge/features/locations/locations_page.dart';

http.Response jsonResponse(Object value) =>
    http.Response.bytes(utf8.encode(jsonEncode(value)), 200);
const states = [
  {'id': 41, 'sigla': 'PR', 'nome': 'Paraná'},
  {'id': 35, 'sigla': 'SP', 'nome': 'São Paulo'},
];

IbgeLocalities testLocalities([
  Future<http.Response> Function(http.Request)? handler,
]) {
  final service = IbgeLocalities(
    client: MockClient(
      handler ??
          (request) async => jsonResponse(
            request.url.path.endsWith('/estados')
                ? states
                : [
                    {'id': 1, 'nome': 'Curitiba'},
                  ],
          ),
    ),
  );
  addTearDown(service.close);
  return service;
}

Future<void> selectState(WidgetTester tester, String name) async {
  await tester.tap(find.byType(DropdownButtonFormField<String>).first);
  await tester.pumpAndSettle();
  await tester.tap(find.text(name).last);
  await tester.pumpAndSettle();
}

class TestGeolocator extends GeolocatorPlatform {
  bool enabled = true;
  LocationPermission permission = LocationPermission.denied;
  LocationPermission requested = LocationPermission.whileInUse;
  int requests = 0, readings = 0, appSettings = 0, deviceSettings = 0;
  LocationSettings? settings;
  Future<LocationPermission>? permissionResult;
  Future<Position>? positionResult;
  Object? positionError;

  @override
  Future<bool> isLocationServiceEnabled() async => enabled;
  @override
  Future<LocationPermission> checkPermission() async =>
      permissionResult ?? permission;
  @override
  Future<LocationPermission> requestPermission() async {
    requests++;
    return requested;
  }

  @override
  Future<bool> openAppSettings() async {
    appSettings++;
    return true;
  }

  @override
  Future<bool> openLocationSettings() async {
    deviceSettings++;
    return true;
  }

  @override
  Future<Position> getCurrentPosition({
    LocationSettings? locationSettings,
  }) async {
    readings++;
    settings = locationSettings;
    if (positionError != null) throw positionError!;
    if (positionResult != null) return positionResult!;
    return Position(
      latitude: -25.4284,
      longitude: -49.2733,
      timestamp: DateTime(2026),
      accuracy: 80,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );
  }
}

void main() {
  late TestGeolocator gps;
  setUp(() {
    final previous = GeolocatorPlatform.instance;
    gps = TestGeolocator();
    GeolocatorPlatform.instance = gps;
    addTearDown(() => GeolocatorPlatform.instance = previous);
  });

  Future<void> showLocations(WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: hemobridgeTheme(),
        home: Scaffold(body: LocationsPage(localities: testLocalities())),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets(
    'trocar UF limpa o município e ignora a resposta anterior atrasada',
    (tester) async {
      final oldRequest = Completer<http.Response>();
      final changes = <String>[];
      final service = testLocalities((request) async {
        if (request.url.path.endsWith('/estados')) return jsonResponse(states);
        if (request.url.path.contains('/PR/')) return oldRequest.future;
        return jsonResponse([
          {'id': 3550308, 'nome': 'São Paulo'},
        ]);
      });
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LocalityPicker(
              localities: service,
              onChanged: (uf, city) => changes.add('$uf:$city'),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await selectState(tester, 'Paraná (PR)');
      expect(
        tester
            .widget<DropdownButtonFormField<String>>(
              find.byType(DropdownButtonFormField<String>).last,
            )
            .onChanged,
        isNull,
      );
      await selectState(tester, 'São Paulo (SP)');
      oldRequest.complete(
        jsonResponse([
          {'id': 4106902, 'nome': 'Curitiba'},
        ]),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byType(DropdownButtonFormField<String>).last);
      await tester.pumpAndSettle();
      expect(find.text('Curitiba'), findsNothing);
      await tester.tap(find.text('São Paulo').last);
      await tester.pumpAndSettle();
      expect(changes, ['PR:', 'SP:', 'SP:São Paulo']);
      await selectState(tester, 'Paraná (PR)');
      expect(changes.last, 'PR:');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'falha do IBGE permite repetir e distingue erro de carregamento',
    (tester) async {
      var calls = 0;
      final service = testLocalities(
        (request) async =>
            ++calls == 1 ? http.Response('', 503) : jsonResponse(states),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LocalityPicker(localities: service, onChanged: (_, _) {}),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('Estados indisponíveis. Tente novamente.'),
        findsOneWidget,
      );
      expect(find.text('Carregando estados…'), findsNothing);
      await tester.tap(find.text('Tentar novamente'));
      await tester.pumpAndSettle();
      expect(
        find.text('Estados indisponíveis. Tente novamente.'),
        findsNothing,
      );
      expect(
        tester
            .widget<DropdownButtonFormField<String>>(
              find.byType(DropdownButtonFormField<String>).first,
            )
            .onChanged,
        isNotNull,
      );
    },
  );

  testWidgets(
    'um toque pede permissão e captura somente uma posição com prazo',
    (tester) async {
      await showLocations(tester);
      expect(gps.readings, 0);
      expect(gps.requests, 0);
      await tester.tap(find.text('Usar minha localização'));
      await tester.pumpAndSettle();
      expect(gps.requests, 1);
      expect(gps.readings, 1);
      expect(gps.settings?.timeLimit, const Duration(seconds: 15));
      expect(
        find.text(
          'Localização obtida. As buscas usarão sua região aproximada.',
        ),
        findsOneWidget,
      );
      await tester.pump(const Duration(minutes: 1));
      expect(gps.readings, 1);
      await selectState(tester, 'Paraná (PR)');
      expect(find.text('Selecione um município para buscar.'), findsOneWidget);
      await tester.tap(find.text('Limpar localização'));
      await tester.pumpAndSettle();
      expect(find.text('Limpar localização'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('a busca manual prevalece quando o GPS responde atrasado', (
    tester,
  ) async {
    final pendingPosition = Completer<Position>();
    gps.positionResult = pendingPosition.future;
    await showLocations(tester);
    await tester.tap(find.text('Usar minha localização'));
    await tester.pump();
    await selectState(tester, 'Paraná (PR)');
    await tester.tap(find.byType(DropdownButtonFormField<String>).last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Curitiba').last);
    await tester.pumpAndSettle();
    pendingPosition.complete(
      Position(
        latitude: -23.55,
        longitude: -46.63,
        timestamp: DateTime(2026),
        accuracy: 80,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        headingAccuracy: 0,
        speed: 0,
        speedAccuracy: 0,
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Busca em Curitiba (PR).'), findsOneWidget);
    expect(find.text('Limpar localização'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('seletores cabem em 360 px com fonte ampliada', (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: hemobridgeTheme(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(2)),
          child: child!,
        ),
        home: Scaffold(body: LocationsPage(localities: testLocalities())),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.byType(LocalityPicker), 200);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('negar permissão mantém a busca manual disponível', (
    tester,
  ) async {
    gps.requested = LocationPermission.denied;
    await showLocations(tester);
    await tester.tap(find.text('Usar minha localização'));
    await tester.pumpAndSettle();
    expect(gps.readings, 0);
    expect(
      find.text(
        'Localização não autorizada. A busca manual continua disponível.',
      ),
      findsOneWidget,
    );
    await selectState(tester, 'Paraná (PR)');
    expect(
      tester
          .widget<DropdownButtonFormField<String>>(
            find.byType(DropdownButtonFormField<String>).last,
          )
          .onChanged,
      isNotNull,
    );
  });

  testWidgets('permissão permanente negada oferece configurações do app', (
    tester,
  ) async {
    gps.permission = LocationPermission.deniedForever;
    await showLocations(tester);
    await tester.tap(find.text('Usar minha localização'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Abrir configurações'));
    await tester.pumpAndSettle();
    expect(gps.appSettings, 1);
    expect(gps.requests, 0);
    expect(gps.readings, 0);
  });

  testWidgets('GPS desligado oferece configurações de localização', (
    tester,
  ) async {
    gps.enabled = false;
    await showLocations(tester);
    await tester.tap(find.text('Usar minha localização'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Abrir configurações'));
    await tester.pumpAndSettle();
    expect(gps.deviceSettings, 1);
    expect(gps.readings, 0);
  });

  testWidgets('timeout libera o botão para tentar novamente', (tester) async {
    gps.positionError = TimeoutException('GPS');
    await showLocations(tester);
    await tester.tap(find.text('Usar minha localização'));
    await tester.pumpAndSettle();
    expect(
      find.text(
        'A localização demorou para responder. Tente novamente ou use a busca manual.',
      ),
      findsOneWidget,
    );
    gps.positionError = null;
    await tester.tap(find.text('Usar minha localização'));
    await tester.pumpAndSettle();
    expect(gps.readings, 2);
    expect(
      find.text('Localização obtida. As buscas usarão sua região aproximada.'),
      findsOneWidget,
    );
  });

  testWidgets(
    'sair da tela durante a permissão impede iniciar a leitura de GPS',
    (tester) async {
      final pendingPermission = Completer<LocationPermission>();
      gps.permissionResult = pendingPermission.future;
      await showLocations(tester);
      await tester.tap(find.text('Usar minha localização'));
      await tester.pump();
      await tester.pumpWidget(const MaterialApp(home: SizedBox()));
      pendingPermission.complete(LocationPermission.whileInUse);
      await tester.pumpAndSettle();
      expect(gps.readings, 0);
      expect(tester.takeException(), isNull);
    },
  );
}
