# Migracao do Supabase para MariaDB

Este projeto agora possui um script dedicado para copiar os dados operacionais do Supabase antigo para o MariaDB da VPS.

Arquivo:

- [scripts/migrate-supabase-to-mariadb.ts](/C:/Users/Wallace/Documents/LOJA/scripts/migrate-supabase-to-mariadb.ts)

## O que ele migra

- `store_settings`
- `categories`
- `products`
- `banners`
- `instagram_posts`
- `home_sections`
- `home_cards`
- `raffles`
- `contact_messages`
- `newsletter_subscribers`
- `stripe_checkout_orders`
- `stripe_webhook_logs`

Opcional:

- `payment_gateway_credentials`

## Variaveis obrigatorias

No ambiente onde o script for rodado:

```env
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"

MARIADB_HOST="127.0.0.1"
MARIADB_PORT="3306"
MARIADB_DATABASE="zenv_loja"
MARIADB_USER="zenv_wallace"
MARIADB_PASSWORD="sua_senha"
```

## Importante antes de rodar

Para evitar que um banco novo seja preenchido de novo com os defaults antigos do projeto, deixe isto no `.env` da VPS:

```env
STORE_SKIP_DEFAULT_SEED="true"
```

## Comandos

### 1. Simulacao segura

Nao grava nada no MariaDB. Apenas le o Supabase e mostra quantos registros existem por tabela.

```bash
npm run migrate:supabase:mariadb:dry
```

### 2. Migracao real substituindo os dados atuais

Esse comando apaga os registros atuais dessas tabelas no MariaDB e importa o conteudo do Supabase.

```bash
npm run migrate:supabase:mariadb
```

### 3. Migracao real incluindo credenciais Stripe salvas

Use apenas se a VPS estiver com a mesma `APP_SECRETS_ENCRYPTION_KEY` do ambiente antigo. Caso contrario, prefira recadastrar as chaves Stripe pelo painel admin.

```bash
npx tsx scripts/migrate-supabase-to-mariadb.ts --execute --replace-target --include-credentials
```

### 4. Migrar somente algumas tabelas

Exemplo:

```bash
npx tsx scripts/migrate-supabase-to-mariadb.ts --execute --replace-target --tables=store_settings,banners,home_cards
```

## Fluxo recomendado para a VPS

1. confirmar que o `.env` da VPS tem `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `MARIADB_*`
2. definir `STORE_SKIP_DEFAULT_SEED="true"`
3. rodar o dry-run
4. validar as contagens
5. rodar a migracao real
6. reiniciar a API com PM2
7. validar o site

## Validacoes depois da importacao

### API

```bash
curl https://zenvapparel.com/api/health
curl https://zenvapparel.com/api/store/health
```

### Banco

Exemplos uteis:

```bash
mysql -h 127.0.0.1 -u SEU_USUARIO -p -D SEU_BANCO -e "SELECT store_name, site_title, support_email FROM store_settings;"
mysql -h 127.0.0.1 -u SEU_USUARIO -p -D SEU_BANCO -e "SELECT COUNT(*) AS total FROM products;"
mysql -h 127.0.0.1 -u SEU_USUARIO -p -D SEU_BANCO -e "SELECT COUNT(*) AS total FROM banners;"
```

## Observacao sobre clientes e pedidos novos

As tabelas novas da arquitetura de producao, como `customers`, `customer_addresses`, `orders`, `order_items`, `carts` e `customer_sessions`, nao existem no schema antigo do Supabase que estamos lendo aqui.

Ou seja:

- essa migracao traz o conteudo real da loja antiga
- mas nao inventa historico novo que nunca existiu no Supabase

Se depois quisermos importar tambem clientes/pedidos de outra fonte, fazemos uma segunda migracao especifica.
