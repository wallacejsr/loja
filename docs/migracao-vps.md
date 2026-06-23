# Migracao da Loja para VPS

## Status atual

Ja deixamos o projeto pronto para sair do Supabase sem reescrever o frontend.

Hoje a loja pode trabalhar em tres modos:

- `supabase`
- `rest`
- `local`

Quando voce usar `VITE_STORE_BACKEND="rest"`, o frontend para de falar com o Supabase e passa a consumir a API propria.

## O que foi implementado

### Frontend

- seletor de backend em `src/lib/storeApi.ts`
- cliente REST em `src/lib/storeApiRest.ts`
- provider original do Supabase preservado em `src/lib/storeApiSupabase.ts`

### Backend proprio

Foi adicionada uma API Express no projeto:

- `server/index.ts`
- `server/store/registerStoreRoutes.ts`
- `server/shipping/registerShippingRoute.ts`

Essa API atende:

- catalogo
- categorias
- banners
- secoes da home
- cards da home
- sorteios
- configuracoes
- mensagens de contato
- upload de imagem de produto
- frete em `/api/shipping/quote`

### Persistencia

O backend agora suporta dois drivers:

- `file`: grava em `storage/store-data.json`
- `mariadb`: usa MariaDB/MySQL da sua VPS

## Banco da sua VPS

Pelo seu painel e pelo phpMyAdmin, sua VPS ja esta usando:

- `MariaDB 10.11.x`

Entao a recomendacao tecnica agora e seguir com `MariaDB`, nao PostgreSQL.

## Variaveis principais

```env
VITE_STORE_BACKEND="rest"
VITE_API_BASE_URL="http://127.0.0.1:4000/api/store"

STORE_DATA_DRIVER="file"
STORE_DATA_FILE_PATH="./storage/store-data.json"
STORE_API_PORT="4000"
STORE_API_CORS_ORIGIN="http://127.0.0.1:3000"

MARIADB_HOST="127.0.0.1"
MARIADB_PORT="3306"
MARIADB_DATABASE="loja"
MARIADB_USER="root"
MARIADB_PASSWORD=""
MARIADB_CONNECTION_LIMIT="10"
```

## Como rodar localmente

### Frontend

```bash
npm run dev
```

### API propria

```bash
npm run api:dev
```

O Vite agora faz proxy automatico de:

- `/api/store`
- `/api/shipping`
- `/uploads`

para `http://127.0.0.1:4000`.

## Como subir primeiro sem banco

Se quiser validar tudo antes da migracao real:

1. use `STORE_DATA_DRIVER="file"`
2. suba a API
3. troque o frontend para `VITE_STORE_BACKEND="rest"`
4. valide a loja inteira usando a API propria

Assim a gente corta a dependencia direta do Supabase antes mesmo de migrar o banco.

## Como ativar MariaDB depois

1. criar o banco `loja` na VPS
2. executar o schema em `server/store/mariadb-schema.sql` se quiser fazer manualmente
3. configurar as variaveis `MARIADB_*`
4. mudar:

```env
STORE_DATA_DRIVER="mariadb"
```

Observacao: para usar o driver MariaDB em runtime, ainda sera necessario instalar o pacote `mysql2` no ambiente com `npm install mysql2`.

## Contrato REST usado pelo frontend

Base:

```text
/api/store
```

Rotas:

- `GET /products?onlyActive=true`
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`
- `POST /uploads/product-image`
- `GET /categories`
- `POST /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`
- `GET /banners?onlyActive=true`
- `POST /banners`
- `DELETE /banners/:id`
- `PUT /banners/reorder`
- `GET /home-sections?onlyActive=true`
- `PUT /home-sections/:id`
- `GET /home-cards?onlyActive=true`
- `POST /home-cards`
- `PUT /home-cards/:id`
- `DELETE /home-cards/:id`
- `GET /raffles?onlyActive=true`
- `POST /raffles`
- `PUT /raffles/:id`
- `DELETE /raffles/:id`
- `GET /instagram-feed`
- `GET /settings`
- `PUT /settings`
- `GET /contact-messages`
- `POST /contact-messages`
- `PUT /contact-messages/:id`

## Proximo passo recomendado

O passo natural agora e este:

1. ligar o frontend em `rest`
2. validar tudo com `STORE_DATA_DRIVER="file"`
3. importar seus dados reais para MariaDB
4. trocar o driver para `mariadb`
5. desligar o Supabase da operacao
