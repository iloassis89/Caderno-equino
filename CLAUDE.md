# IAS Horse (antigo Caderno Equino) — instruções para o Claude

Leia primeiro o briefing do projeto: https://claude.ai/artifact/SbPDCQx8XRp5ky7wtCjXyH
e o `LEIA-ME.md` desta pasta.

## Contexto
- Dono: Ilo (Belmonte-BA). Responda em português, linguagem simples.
- Produto: app de manejo de cavalos vendido por assinatura, com cupons de influenciadores (afiliado vitalício, 50/50 da receita líquida; o desconto sai da parte do influenciador).
- Regras do app: nunca presumir dados ausentes; nunca recomendar medicamento; separar Realizado / Planejado / A confirmar / Avaliação veterinária.

## Infraestrutura
- Supabase: projeto `pdeztncayjsdjelbpxrp` (sa-east-1). NÃO mexer nos projetos "Triagem CIN" e "Affiliate Engine".
- Stripe: conta de testes "IAS Horse" (`acct_1Ufm5pKXfdro2IpW`). Produtos `ce_<plano>`, cupons `ce_afiliado_10..50`, portal `bpc_1UgDftKXfdro2IpWMtTMil8q`, webhook `we_1UgDorKXfdro2IpWXQ3SfmgB`.
- App web: endereço novo https://iashorse.pages.dev/ (Cloudflare Pages lendo a branch `site`, build na raiz). O endereço antigo https://iloassis89.github.io/Caderno-equino/ (branch `gh-pages`) deve virar só um redirecionamento para o novo quando o Cloudflare estiver no ar.
- Link curto do Android: https://iashorse.pages.dev/android (arquivo `app/public/_redirects`).
- Código: `app/` (Expo SDK 58, React Native, web), `supabase/functions/` (Deno).

## Como trabalhar
- Modo de teste até o Ilo autorizar produção.
- Nunca pedir chaves secretas no chat; usar conectores ou segredos do Supabase.
- Ao fim de cada sessão, anotar o progresso no briefing.
- Publicar a web: `cd app && npx expo export --platform web --output-dir dist`, depois enviar todo o conteúdo de `dist` para a branch `site` (o Cloudflare publica sozinho).
- Android: o GitHub Actions (`.github/workflows/android.yml`) gera o APK a cada push em `app/` e publica em Releases → `android-teste`.
- Navegação: o app usa uma pilha própria em `App.tsx` (não usa Expo Router); manter assim para não refazer as telas.
- Plano grátis: 1 animal, anotações, foto e registro do animal, tarefas, últimos 30 dias. Pago (a partir de R$ 9,90): PDF/WhatsApp, dieta, estoque, fotos nas anotações, histórico completo, resumo semanal. Regras no banco: `plano_pago()` e RLS de `anexos`, `dieta_itens`, `stock_*`.
- Administração: área "Administração" aparece para e-mails na tabela `admin_emails` (com e-mail confirmado). Libera acesso grátis (`conceder_cortesia`), anúncios (`anuncios`) e dicas (`dicas`).
- Assistente com IA: função `assistente` (Anthropic). Precisa do segredo `ANTHROPIC_API_KEY` no Supabase. Limite: grátis 3/dia, pago 30/dia, teto geral `ASSISTENTE_LIMITE_DIA` (padrão 500). Histórico guardado no servidor (`assistente_mensagens`).
- Suporte: aba "Suporte e atendimento" (Mais) + função `suporte`. IA faz a triagem com ferramentas (vagas/reserva de anúncio, problema, sugestão, pedido de autorização, chamar atendente). Tabelas `suporte_conversas`, `suporte_mensagens`, `anuncio_pedidos` (reserva + fila de espera), `pedidos_autorizacao` (afiliado/venda), `configuracoes` (e-mail de avisos, vagas e preços de anúncio — editáveis em Administração → Configurações). Cota própria da IA do suporte: `usar_suporte_ia` (`SUPORTE_LIMITE_PESSOA` 40/dia, `SUPORTE_LIMITE_DIA` 1000).
- E-mail de avisos: segredos `BREVO_API_KEY` (ou `RESEND_API_KEY`) e `EMAIL_REMETENTE` no Supabase. Sem eles, os avisos ficam só na Administração. Link de pagamento de anúncio: enviado à mão pelo Ilo (automatizar depois com Stripe Payment Links).
