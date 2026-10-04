// Normalizações para usar com @Transform() nos DTOs.
type Entrada = { value: unknown };

/** Remove espaços nas pontas e espaços repetidos. */
export const aparar = ({ value }: Entrada) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

/** Mantém só os dígitos (CPF, CNPJ, CEP, telefone). */
export const somenteDigitos = ({ value }: Entrada) =>
  typeof value === 'string' ? value.replace(/\D/g, '') : value;

export const maiusculas = ({ value }: Entrada) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export const emailNormalizado = ({ value }: Entrada) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** "true"/"false" da query string para boolean. */
export const booleano = ({ value }: Entrada) =>
  value === 'true' ? true : value === 'false' ? false : value;
