# Deploy em produção

As alterações mescladas na branch `main` são validadas pelo CI e, após o push em `main`, o workflow de produção publica automaticamente no Cloudflare Workers.

O deploy utiliza as secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` configuradas no repositório.