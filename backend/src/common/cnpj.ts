/** Valida o CNPJ numérico pelos dígitos verificadores. Aceita com ou sem máscara. */
export function isCnpjValido(cnpj: string): boolean {
  const digitos = cnpj.replace(/\D/g, '');
  if (!/^\d{14}$/.test(digitos) || /^(\d)\1{13}$/.test(digitos)) return false;

  const calcularDv = (base: string): number => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return (
    calcularDv(digitos.slice(0, 12)) === Number(digitos[12]) &&
    calcularDv(digitos.slice(0, 13)) === Number(digitos[13])
  );
}
