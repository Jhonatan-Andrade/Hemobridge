/** Remove tudo que não for dígito ("123.456.789-09" -> "12345678909"). */
export function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/** Valida o CPF pelos dígitos verificadores (RN06). Aceita com ou sem máscara. */
export function isCpfValido(cpf: string): boolean {
  const digitos = normalizarCpf(cpf);
  if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false;

  const calcularDv = (base: string): number => {
    const soma = base.split('').reduce(
      (acc, d, i) => acc + Number(d) * (base.length + 1 - i),
      0,
    );
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const dv1 = calcularDv(digitos.slice(0, 9));
  const dv2 = calcularDv(digitos.slice(0, 10));
  return dv1 === Number(digitos[9]) && dv2 === Number(digitos[10]);
}
