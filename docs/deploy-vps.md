# Deploy automatizado na VPS

Este projeto agora possui um script de deploy para a estrutura atual da VPS:

- codigo fonte em `/home/loja`
- frontend publicado em `/home/zenvapparel.com/public_html`
- backend Node/Express gerenciado pelo PM2 como `loja-api`
- dominio principal `zenvapparel.com`

## Arquivo

Script: [scripts/deploy-vps.sh](/C:/Users/Wallace/Documents/LOJA/scripts/deploy-vps.sh)

## Primeira execucao

Na VPS:

```bash
cd /home/loja
chmod +x scripts/deploy-vps.sh
./scripts/deploy-vps.sh
```

## O que o script faz

1. entra em `/home/loja`
2. carrega o `.env`
3. roda `npm install`
4. valida `mysql2`
5. roda `npm run lint`
6. roda `npm run build`
7. publica `dist/` no `public_html` com `rsync`
8. preserva `.well-known`
9. reinicia o PM2
10. executa smoke tests em:
   - `http://127.0.0.1:4000/api/health`
   - `https://zenvapparel.com/api/health`
   - `https://zenvapparel.com/api/store/health`
   - `https://zenvapparel.com/admin`

## Comandos uteis

Deploy padrao:

```bash
cd /home/loja
./scripts/deploy-vps.sh
```

Deploy puxando alteracoes do git antes:

```bash
cd /home/loja
DEPLOY_GIT_PULL=1 ./scripts/deploy-vps.sh
```

Deploy sincronizando schema MariaDB tambem:

```bash
cd /home/loja
DEPLOY_RUN_SCHEMA_SYNC=1 ./scripts/deploy-vps.sh
```

Deploy completo:

```bash
cd /home/loja
DEPLOY_GIT_PULL=1 DEPLOY_RUN_SCHEMA_SYNC=1 ./scripts/deploy-vps.sh
```

Se a senha do banco tiver caracteres especiais ou voce quiser usar outra credencial apenas para importacao do schema:

```bash
cd /home/loja
DEPLOY_RUN_SCHEMA_SYNC=1 \
DEPLOY_SCHEMA_USER="seu_usuario_mysql" \
DEPLOY_SCHEMA_PASSWORD='sua_senha_mysql' \
./scripts/deploy-vps.sh
```

## Variaveis opcionais

O script aceita override por env var:

- `DEPLOY_APP_DIR`
- `DEPLOY_WEB_ROOT`
- `DEPLOY_PM2_APP_NAME`
- `DEPLOY_DOMAIN`
- `DEPLOY_GIT_PULL`
- `DEPLOY_RUN_NPM_INSTALL`
- `DEPLOY_RUN_LINT`
- `DEPLOY_RUN_BUILD`
- `DEPLOY_RUN_SCHEMA_SYNC`
- `DEPLOY_SCHEMA_HOST`
- `DEPLOY_SCHEMA_PORT`
- `DEPLOY_SCHEMA_DATABASE`
- `DEPLOY_SCHEMA_USER`
- `DEPLOY_SCHEMA_PASSWORD`

## Observacoes

- O script usa `rsync --exclude '.well-known'` para nao apagar os arquivos de validacao SSL.
- O script espera que o `.env` da VPS ja exista em `/home/loja/.env`.
- O `.env` eh carregado pelo parser do `dotenv`, evitando problemas comuns de senha com `$`, `#` e outros caracteres especiais.
- `mysql2` agora faz parte do `package.json`, para evitar dependencia instalada manualmente e esquecida no proximo deploy.
