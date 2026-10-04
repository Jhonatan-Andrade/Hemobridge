// RN01: os oito tipos ABO/Rh, na ordem de exibição.
export const SIGLAS_TIPOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export type SiglaTipo = (typeof SIGLAS_TIPOS)[number];
