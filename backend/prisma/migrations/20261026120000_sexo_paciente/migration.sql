-- Sexo do paciente, usado no intervalo mínimo e no limite anual de doações.
-- Nulo nas contas já existentes e nas anonimizadas (RF16).
CREATE TYPE "sexo" AS ENUM ('MASCULINO', 'FEMININO');

ALTER TABLE "paciente" ADD COLUMN "sexo" "sexo";
