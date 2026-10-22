String onlyDigits(String value) => value.replaceAll(RegExp(r'\D'), '');

bool validCpf(String value) {
  final digits = onlyDigits(value);
  if (digits.length != 11 || RegExp(r'^(\d)\1{10}$').hasMatch(digits)) {
    return false;
  }
  final numbers = digits.split('').map(int.parse).toList();
  for (var length = 9; length <= 10; length++) {
    var total = 0;
    for (var index = 0; index < length; index++) {
      total += numbers[index] * (length + 1 - index);
    }
    final remainder = total % 11;
    if (numbers[length] != (remainder < 2 ? 0 : 11 - remainder)) return false;
  }
  return true;
}

String? validateAccountPassword(String? value) {
  final candidate = value ?? '';
  if (candidate.length < 8 ||
      candidate.length > 128 ||
      !RegExp(r'\p{Lu}', unicode: true).hasMatch(candidate) ||
      !RegExp(r'\p{Ll}', unicode: true).hasMatch(candidate) ||
      !RegExp(r'\d').hasMatch(candidate)) {
    return 'Use 8 a 128 caracteres, com maiúscula, minúscula e número.';
  }
  return null;
}

String? validatePhone(String? value) =>
    RegExp(r'^\d{10,11}$').hasMatch(onlyDigits(value ?? ''))
    ? null
    : 'Informe o telefone com DDD e 10 ou 11 dígitos.';

String? validateWeight(String? value, {bool registration = false}) {
  final text = (value ?? '').trim().replaceAll(',', '.');
  final weight = double.tryParse(text);
  if (!RegExp(r'^\d+(\.\d{1,2})?$').hasMatch(text) ||
      weight == null ||
      !weight.isFinite ||
      weight < (registration ? 50 : 1) ||
      weight > 400) {
    return registration
        ? 'Informe um peso entre 50 e 400 kg, com até duas casas decimais.'
        : 'Informe um peso entre 1 e 400 kg, com até duas casas decimais.';
  }
  return null;
}

int? ageAt(String value, DateTime now) {
  if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) return null;
  final date = DateTime.tryParse(value);
  if (date == null || date.toIso8601String().split('T').first != value) {
    return null;
  }
  var age = now.year - date.year;
  if (now.month < date.month ||
      (now.month == date.month && now.day < date.day)) {
    age--;
  }
  return age;
}
