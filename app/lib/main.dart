import 'package:flutter/material.dart';
import 'core/api_client.dart';
import 'core/app_theme.dart';
import 'core/session_controller.dart';
import 'features/auth/login_page.dart';
import 'features/navigation/app_shell.dart';
import 'features/home/public_home_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final session = SessionController(ApiClient());
  runApp(HemoBridgeApp(session: session));
  session.initialize();
}

class HemoBridgeApp extends StatelessWidget {
  final SessionController session;
  const HemoBridgeApp({super.key, required this.session});
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: session,
    builder: (context, _) => MaterialApp(
      key: ValueKey(
        '${session.user?['id']}:${session.user?['perfil']}:${session.user?['senhaProvisoria'] == true}',
      ),
      title: 'HemoBridge',
      debugShowCheckedModeBanner: false,
      theme: hemobridgeTheme(),
      home: !session.ready
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : session.user == null
          ? PublicHomeShell(session: session)
          : session.user!['senhaProvisoria'] == true
          ? LoginPage(session: session, firstPassword: true)
          : AppShell(session: session),
    ),
  );
}
