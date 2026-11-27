# Caderno Equino — projeto completo

App de manejo de cavalos, vendido por assinatura, com cupons de influenciadores.
Um único código gera: **app instalável pelo navegador (PWA)**, **Android** e **iPhone**.

## O que tem aqui

| Pasta | Conteúdo |
| --- | --- |
| `app/` | App em React Native + Expo (Android, iOS e web) |
| `app/dist/` | Versão web pronta para publicar (PWA) |
| `supabase/functions/` | Funções de servidor: `stripe-checkout`, `stripe-portal`, `stripe-webhook`, `retorno` |

Já publicado e funcionando:

- **Supabase**: projeto "Caderno Equino" (`pdeztncayjsdjelbpxrp`, São Paulo). Banco, login, regras de acesso, limites de plano, cupons, comissões e as 4 funções de servidor.
- **Stripe (área de testes "IAS Horse")**: 7 planos mensais em BRL, cupons vitalícios `ce_afiliado_10` a `ce_afiliado_50`, código de teste `TESTE20`, portal do assinante e o webhook apontando para o Supabase.

## Pendências para funcionar de ponta a ponta

1. **Chaves no Supabase** (painel do Supabase > Edge Functions > Secrets):
   - `STRIPE_SECRET_KEY` = chave secreta de teste do Stripe (`sk_test_...`)
   - `STRIPE_WEBHOOK_SECRET` = segredo do webhook (`whsec_...`, no painel do Stripe > Webhooks)
2. **Endereço do app web** (depois de publicar a PWA):
   - Supabase > Edge Functions > Secrets: `APP_WEB_ORIGINS` = `https://seu-endereco` (para o retorno do pagamento).
   - Supabase > Authentication > URL Configuration: **Site URL** = `https://seu-endereco` (links de confirmação de e-mail).

## Publicar a versão web (PWA) — custo zero

A pasta `app/dist` é um site estático. Pode ser publicada de graça em Cloudflare Pages, Netlify ou GitHub Pages.
No celular, o cliente abre o endereço e escolhe **"Adicionar à tela inicial"**. O app ganha ícone e abre em tela cheia.

Vantagem: na web o pagamento é pelo Stripe, **sem os ~15% das lojas**.

Para gerar de novo depois de alterações:

```
cd app
npm install
npx expo export --platform web --output-dir dist
```

## Gerar os apps Android e iOS

Os apps nativos são compilados na nuvem pelo **Expo EAS** (conta grátis em expo.dev, não precisa de Mac):

```
cd app
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android   # gera .aab para o Google Play (ou --profile preview para .apk)
eas build --platform ios       # exige conta Apple Developer
eas submit --platform android  # envia para o Play Console
eas submit --platform ios      # envia para o App Store Connect
```

Identificadores já configurados em `app/app.json`: `app.cadernoequino` (Android e iOS) e o esquema de link `cadernoequino://`.

### Custos e regras das lojas (não há como evitar)

| Loja | Custo | Observação |
| --- | --- | --- |
| Google Play | US$ 25, uma vez | Conta pessoal nova: teste fechado com 12 testadores por 14 dias antes de publicar. Conta de empresa (com CNPJ e D-U-N-S) não tem essa exigência. |
| Apple App Store | US$ 99 por ano | Isenção só para ONG, instituição de ensino ou governo que **não vendem** nada no app. |

### Atenção: pagamento dentro dos apps das lojas

Hoje o app abre o pagamento do **Stripe**. Isso é permitido na versão web.
Nas lojas, assinatura de conteúdo digital precisa usar o sistema de compra da loja:

- **Google Play**: Google Play Faturamento.
- **App Store (Brasil)**: o Stripe pode aparecer como alternativa, mas **sempre ao lado** da compra pela Apple.

Antes de enviar às lojas: integrar as compras da Apple e do Google (recomendado: RevenueCat) e criar nelas os mesmos planos. O banco já aceita assinaturas com `fonte = apple | google`.

## Testar pagamento (modo de teste)

Cartão de teste do Stripe: `4242 4242 4242 4242`, qualquer data futura, qualquer CVC.

## Cadastrar um influenciador (por enquanto, no Supabase > SQL)

```sql
insert into affiliates (nome, email, chave_pix) values ('Nome', 'email@x.com', 'chave-pix') returning id;
insert into coupons (code, affiliate_id, desconto_pct) values ('CUPOM20', '<id acima>', 20); -- 0,10,20,30,40 ou 50
-- para ele ver o painel no app, ligue à conta dele:
update affiliates set user_id = (select id from auth.users where email = 'email@x.com') where email = 'email@x.com';
```

Regra da comissão: 50% da receita líquida (depois da taxa do Stripe/loja) para cada lado; o desconto do cupom sai da metade do influenciador. Vale enquanto o cliente pagar.

## Suporte e avisos por e-mail
O chat de suporte (Mais → Suporte e atendimento) é particular. A IA tenta resolver; se não der, passa para você, com prazo de 48 horas. Você responde em Administração → Suporte, e a resposta aparece no chat da pessoa.

Para receber os avisos no e-mail (grátis, 300 e-mails por dia no Brevo):
1. Crie conta em brevo.com com o seu e-mail e confirme o remetente (Senders → adicionar `iloassis88@gmail.com`).
2. Em SMTP & API → API Keys, gere uma chave.
3. No Supabase (projeto IAS Horse) → Edge Functions → Secrets, adicione `BREVO_API_KEY` (a chave) e `EMAIL_REMETENTE` (o e-mail confirmado).
Para trocar o e-mail que recebe os avisos: Administração → Configurações.
