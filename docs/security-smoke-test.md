# Security Smoke Test

Este projeto possui um smoke test de seguranca para validar o endurecimento basico da producao sem gerar carga agressiva no ambiente.

## Como rodar

No ambiente local:

```bash
npm run security:smoke -- https://zenvapparel.com
```

Na VPS:

```bash
cd /home/loja
npm run security:smoke -- https://zenvapparel.com
```

Tambem pode usar uma variavel de ambiente:

```bash
SECURITY_TEST_BASE_URL=https://zenvapparel.com npm run security:smoke
```

Se precisar diagnosticar uma cadeia SSL incompleta no servidor, existe um modo temporario:

```bash
SECURITY_TEST_INSECURE_TLS=1 npm run security:smoke -- https://zenvapparel.com
```

Use esse modo apenas para diagnostico. O ideal em producao e corrigir a cadeia do certificado.

## O que o script valida

- `GET /api/health` responde com headers de seguranca
- `GET /api/admin/session` continua publico, mas sem autenticar usuario
- `GET /api/admin/audit-logs` exige autenticacao
- `GET /api/integrations/stripe/status` exige autenticacao
- `GET /api/account/session` responde sem sessao autenticada
- `GET /api/ready` nao expone `uploadsRoot` nem `appBaseUrl` em producao
- `GET /api/integrations/stripe/session-status` rejeita requests incompletos
- `POST /api/integrations/stripe/webhook` rejeita requests sem assinatura valida
- `POST /api/integrations/stripe/checkout-session` rejeita requests invalidos
- headers `Cache-Control: no-store` e `X-RateLimit-*` nas rotas sensiveis

## Validacoes manuais recomendadas

### 1. Cookie de sessao admin

Fazer login no painel e validar no navegador:

- cookie com `HttpOnly`
- cookie com `Secure`
- cookie com `SameSite=Strict`

### 2. Logout seguro

- entrar no painel
- sair
- tentar abrir `/admin/security` ou outra rota administrativa diretamente
- confirmar redirecionamento para login

### 3. Sessao expirada

- reduzir temporariamente `ADMIN_SESSION_IDLE_TTL_SECONDS` em homologacao
- aguardar expirar
- tentar usar uma rota admin novamente
- validar `401` ou retorno para login

### 4. Forca bruta de admin

Somente em homologacao ou janela controlada:

- testar varias tentativas invalidas em `/api/admin/login`
- confirmar bloqueio/limitacao por rate limit
- nao fazer isso de forma agressiva em producao

### 5. Webhook Stripe

- enviar webhook assinado real pelo painel da Stripe
- confirmar `200`
- confirmar atualizacao do pedido e log interno

## O que este script nao faz

- nao executa brute force agressivo
- nao testa MFA automaticamente
- nao faz fuzzing de payload
- nao roda scanner externo

Ele existe para pegar regressao rapida de seguranca antes ou depois do deploy.
