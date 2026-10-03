-- A imagem postgis/postgis já cria extensões no banco. Removemos todas para que
-- as migrations do Prisma sejam as únicas donas do schema (inclusive da postgis).
DROP EXTENSION IF EXISTS postgis_tiger_geocoder CASCADE;
DROP EXTENSION IF EXISTS postgis_topology CASCADE;
DROP EXTENSION IF EXISTS fuzzystrmatch CASCADE;
DROP EXTENSION IF EXISTS postgis CASCADE;
DROP SCHEMA IF EXISTS tiger CASCADE;
DROP SCHEMA IF EXISTS tiger_data CASCADE;
DROP SCHEMA IF EXISTS topology CASCADE;
