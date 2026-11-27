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
- Plano grátis: 1 animal, anotações, foto e registro do animal, agenda/lembretes, alimentação, IA 1 pergunta/dia, últimos 30 dias. Pago (a partir de R$ 9,90): PDF/WhatsApp, estoque + previsão de reposição, fotos nas anotações, histórico completo, resumo semanal, IA 5/dia. Regras no banco: `plano_pago()` e RLS de `anexos`, `stock_*` (dieta_itens liberada para todos desde 27/11/2026).
- Navegação (abas): Início (Para fazer hoje), Animais, Anotar (tudo por toques: `OPCOES_ANOTACAO` em constantes.ts), Agenda (lembretes + tarefas + comprar de novo), Mais (Estoque, Todas as anotações, Minha IA, Ajuda, Meu plano).
- Lembretes/despertadores: tabela `lembretes` + `lembrete_feitos`, RPC `marcar_lembrete_feito` (anota no caderno e avança tarefa), `previsao_estoque()`. No celular: `app/src/lembretes.ts` (expo-notifications, avisos locais, máx. 60). Na web não toca.
- IA: módulo `supabase/functions/_shared/ia.ts` (Gemini, OpenAI ou Anthropic). Cada pessoa pode vincular a própria chave em Mais → Minha IA (função `ia-conta`, chave no Vault via `salvar_chave_ia`/`chave_ia`, só service_role). Sem chave própria usa a IA do app: `GEMINI_API_KEY` (plano GRÁTIS do Google, modelo Flash-Lite, ~500/dia por projeto; o Ilo não paga nada) e só usa `ANTHROPIC_API_KEY` se não houver Gemini (`contaDoApp`). Avaliação da alimentação: função `avaliar-dieta` + referência `_shared/nutricao_ref.ts` (pesquisa com fontes em `docs/nutricao_referencia.md`).
- Diagnóstico das chaves: Administração → Diagnóstico (função `diagnostico`).
- Administração: área "Administração" aparece para e-mails na tabela `admin_emails` (com e-mail confirmado). Libera acesso grátis (`conceder_cortesia`), anúncios (`anuncios`) e dicas (`dicas`).
- IA "Pergunte à IA" (função `assistente`) e avaliação da alimentação (`avaliar-dieta`) dividem a cota `usar_assistente`: grátis 1/dia, pago 5/dia, teto geral `ASSISTENTE_LIMITE_DIA` (padrão 400, cabe no grátis do Gemini). SEM memória: cada pergunta é avulsa, nada é salvo sozinho. A pessoa toca em "Guardar" → `consultas_salvas` (pode ligar a um animal; entra no relatório PDF) e `dieta_avaliacoes`. Os relatórios guardam histórico; o chat não. `assistente_mensagens` não é mais usada.
- Preços escalonados: preço por animal cai com a quantidade (1=9,90; 2=18,90; 3=26,90; 4=34,90; 5=39,90; 15=89,90; 40=179,90) e o desconto por período cresce com o pacote (1 animal 6/8/16%; 2–4: 7/10/18%; 5: 8/12/20%; 15–40: 10/14/22%). Recalcular `planos_periodos` com `select public.recalcular_planos_periodos()` após mudar `plans`. Preços mensais do Stripe = `default_price` do produto `ce_<plano>`.
- Suporte: aba "Suporte e atendimento" (Mais) + função `suporte`. IA faz a triagem com ferramentas (vagas/reserva de anúncio, problema, sugestão, pedido de autorização, chamar atendente). Tabelas `suporte_conversas`, `suporte_mensagens`, `anuncio_pedidos` (reserva + fila de espera), `pedidos_autorizacao` (afiliado/venda), `configuracoes` (e-mail de avisos, vagas e preços de anúncio — editáveis em Administração → Configurações). Cota própria da IA do suporte: `usar_suporte_ia` (`SUPORTE_LIMITE_PESSOA` 40/dia, `SUPORTE_LIMITE_DIA` 1000).
- Pagamento Pix / à vista (InfinitePay, cai direto na conta do Ilo): função `infinitepay` (criar link, confirmar, `?webhook=1`). Preços por período em `planos_periodos` (1/3/6/12 meses; básico 1 animal: 9,90 / 27,90 / 54,90 / 99,90). Tabela `pagamentos` (id = order_nsu). Liberação só depois de conferir no `/payment_check` → RPC `ativar_pagamento` (cria assinatura `fonte='manual'`, `id_externo='infinitepay:<id>'`, soma meses na renovação, registra comissão do parceiro). Tolerância de 5 dias após vencer (`plano_do_usuario`). InfiniteTag em Administração → Configurações (`configuracoes.infinitepay_handle`); chave opcional `INFINITEPAY_API_KEY` (liga Pix explicitamente e deixa os juros do parcelamento com o cliente: `assured_installments: 1`). Mensal com renovação automática no cartão continua pelo Stripe.
- E-mail de avisos: segredos `BREVO_API_KEY` (ou `RESEND_API_KEY`) e `EMAIL_REMETENTE` no Supabase. Sem eles, os avisos ficam só na Administração. Link de pagamento de anúncio: enviado à mão pelo Ilo (automatizar depois com Stripe Payment Links).
