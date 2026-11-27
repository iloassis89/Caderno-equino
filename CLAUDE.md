# Caderno Equino — instruções para o Claude

Leia primeiro o briefing do projeto: https://claude.ai/artifact/SbPDCQx8XRp5ky7wtCjXyH
e o `LEIA-ME.md` desta pasta.

## Contexto
- Dono: Ilo (Belmonte-BA). Responda em português, linguagem simples.
- Produto: app de manejo de cavalos vendido por assinatura, com cupons de influenciadores (afiliado vitalício, 50/50 da receita líquida; o desconto sai da parte do influenciador).
- Regras do app: nunca presumir dados ausentes; nunca recomendar medicamento; separar Realizado / Planejado / A confirmar / Avaliação veterinária.

## Infraestrutura
- Supabase: projeto `pdeztncayjsdjelbpxrp` (sa-east-1). NÃO mexer nos projetos "Triagem CIN" e "Affiliate Engine".
- Stripe: conta de testes "IAS Horse" (`acct_1Ufm5pKXfdro2IpW`). Produtos `ce_<plano>`, cupons `ce_afiliado_10..50`, portal `bpc_1UgDftKXfdro2IpWMtTMil8q`, webhook `we_1UgDorKXfdro2IpWXQ3SfmgB`.
- App web publicado no GitHub Pages: https://iloassis89.github.io/Caderno-equino/ (branch `gh-pages`, gerado de `app/dist`).
- Código: `app/` (Expo SDK 58, React Native, web), `supabase/functions/` (Deno).

## Como trabalhar
- Modo de teste até o Ilo autorizar produção.
- Nunca pedir chaves secretas no chat; usar conectores ou segredos do Supabase.
- Ao fim de cada sessão, anotar o progresso no briefing.
- Publicar a web: `cd app && npx expo export --platform web --output-dir dist && touch dist/.nojekyll`, depois enviar `dist` para a branch `gh-pages`.
