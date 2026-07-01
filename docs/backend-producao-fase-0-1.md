# Backend de Producao - Fase 0 e 1

Este documento cobre a base que ja pode ser subida na VPS agora:

- fundacao do backend Express
- headers de seguranca
- rate limit inicial
- request id
- leitura de cookies para sessao server-side
- healthchecks
- schema MariaDB inicial para producao

## Arquivos principais

- `server/app.ts`
- `server/config.ts`
- `server/index.ts`
- `server/auth/session.ts`
- `server/http/*`
- `server/store/mariadb-schema.sql`
- `.env.api.example`

## O que esta pronto nesta fase

### Backend

- API Express centralizada em `server/app.ts`
- configuracao unificada por env
- `GET /api/health`
- `GET /api/ready`
- `X-Request-Id` em todas as respostas da API
- parsing de cookies para preparar autenticacao server-side
- rate limit basico por IP/metodo
- headers de seguranca
- shutdown gracioso para VPS

### Banco

O schema agora ja contempla:

- catalogo e configuracoes da loja
- newsletter
- credenciais Stripe
- trilha de pedidos Stripe atual
- clientes
- enderecos
- sessoes
- beneficios
- cupons
- carrinhos
- itens do carrinho
- pedidos
- itens do pedido
- logs de status do pedido
- logs de auditoria
- usuarios admin

## Como subir na VPS

### 1. Copiar o projeto

Suba o projeto para a VPS e entre na pasta dele.

### 2. Criar o arquivo de ambiente

Use `.env.api.example` como base e preencha os valores reais.

Sugestao:

- API em subdominio, por exemplo `api.seudominio.com`
- frontend em `seudominio.com`
- `STORE_API_CORS_ORIGIN` com os dominios reais
- `SESSION_COOKIE_DOMAIN` como `.seudominio.com`

### 3. Instalar dependencias

O driver MariaDB continua sendo carregado dinamicamente. Antes de rodar em producao, instale:

```bash
npm install mysql2
```

### 4. Criar o banco

No painel ou phpMyAdmin, crie o banco:

```text
loja
```

### 5. Executar o schema

Rode o arquivo:

- `server/store/mariadb-schema.sql`

Ele pode ser executado via phpMyAdmin, DBeaver ou terminal MySQL.

### 6. Subir a API

```bash
npm run api:start
```

Para producao na VPS, o ideal depois e rodar via PM2:

```bash
pm2 start npm --name loja-api -- run api:start
pm2 save
```

### 7. Validar

Teste:

- `/api/health`
- `/api/ready`
- `/api/store/health`

## Proximo passo natural

Com essa base no ar, a proxima etapa e a autenticacao real:

1. cadastro server-side
2. login por cookie HttpOnly
3. `GET /me`
4. enderecos no banco
5. remocao gradual do `localStorage` do cliente
