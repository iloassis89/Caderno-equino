// Referência técnica de nutrição equina usada pela IA (pesquisa com fontes; cópia em docs/nutricao_referencia.md).
// Atualize aqui se a pesquisa mudar.
export const REFERENCIA_NUTRICAO = `# Referência de nutrição equina (prompt do assistente IAS Horse)

Uso: comparar a dieta informada com estes valores e apontar **possíveis** excessos ou faltas. São valores de referência, não diagnóstico: quem confirma é o médico-veterinário ou o zootecnista/nutricionista. Nunca recomendar medicamento. Onde falta fonte confiável: "sem dado confiável".

**Siglas:** MS = matéria seca, PV = peso vivo, ED = energia digestível, PB = proteína bruta, CNE = carboidratos não estruturais (amido + açúcares).

**Conversão:** kg MS = kg natural × MS%/100. Compare nutrientes em base MS. Para passar g/kg a %, divida por 10.

## 1. Exigências diárias de um cavalo de 500 kg (NRC 2007) [1]

| Categoria | ED Mcal | PB g | Lisina g | Ca g | P g | Mg g | Na g | MS % PV* |
|---|---|---|---|---|---|---|---|---|
| Manutenção mínima | 15,2 | 540 | 23,2 | 20 | 14 | 7,5 | 10 | 2,0 |
| Manutenção média | 16,7 | 630 | 27,1 | 20 | 14 | 7,5 | 10 | 2,0 |
| Manutenção elevada | 18,2 | 720 | 31,0 | 20 | 14 | 7,5 | 10 | 2,0 |
| Trabalho leve | 20,0 | 699 | 30,1 | 30 | 18 | 9,5 | 13,9 | 2,0 |
| Trabalho moderado | 23,3 | 768 | 33,0 | 35 | 21 | 11,5 | 17,8 | 2,25 |
| Trabalho pesado | 26,6 | 862 | 37,1 | 40 | 29 | 15 | 25,5 | 2,5 |
| Trabalho muito pesado | 34,5 | 1004 | 43,2 | 40 | 29 | 15 | 41,0 | 2,5 |
| Gestação 9º mês (PV 534 kg) | 19,2 | 797 | 34,3 | 36 | 26,3 | 7,7 | 11 | 2,0 |
| Gestação 10º mês (PV 548 kg) | 20,2 | 841 | 36,2 | 36 | 26,3 | 7,7 | 11 | 2,0 |
| Gestação 11º mês (PV 566 kg) | 21,4 | 893 | 38,4 | 36 | 26,3 | 7,7 | 11 | 2,0 |
| Lactação 1º mês | 31,7 | 1535 | 84,8 | 59,1 | 38,3 | 11,2 | 12,8 | 2,5 |
| Lactação 3º mês | 30,6 | 1468 | 80,3 | 55,9 | 36,0 | 10,9 | 12,5 | 2,5 |
| Potro de 6 meses (PV 216 kg; ganho 0,72 kg/d) | 15,5 | 676 | 29,1 | 38,6 | 21,5 | 4,1 | 5,0 | 2,5 |
| Potro de 12 meses (PV 321 kg; ganho 0,45 kg/d) | 18,8 | 846 | 36,4 | 37,7 | 20,9 | 5,4 | 6,9 | 2,5 |
| Potro de 18 meses (PV 387 kg; ganho 0,29 kg/d) | 19,2 | 799 | 34,4 | 37,0 | 20,6 | 6,2 | 8,0 | 2,5 |

\\*Consumo de MS que o NRC assumiu para montar a tabela [1]. Não é um limite. O consumo habitual fica em 2–2,5% PV [3] e o máximo em cerca de 2,5–3% PV [2].

**Microminerais e vitaminas por dia** [1]

| Categoria | Cu mg | Zn mg | Se mg | Vit. E UI | Vit. A mil UI |
|---|---|---|---|---|---|
| Manutenção | 100 | 400 | 1,00 | 500 | 15 |
| Trabalho leve | 100 | 400 | 1,00 | 800 | 22,5 |
| Trabalho moderado | 112,5 | 450 | 1,13 | 900 | 22,5 |
| Trabalho pesado e muito pesado | 125 | 500 | 1,25 | 1000 | 22,5 |
| Gestação, 9º a 11º mês | 125 | 400 | 1,00 | 800 | 30 |
| Lactação, 1º a 3º mês | 125 | 500 | 1,25 | 1000 | 30 |
| Potros de 6 / 12 / 18 meses | 54 / 80 / 97 | 216 / 321 / 388 | 0,54 / 0,80 / 0,97 | 432 / 642 / 775 | 9,7 / 14,5 / 17,4 |

### Como ajustar para outros pesos

- **Energia de manutenção:** 30,3, 33,3 ou 36,3 kcal ED por kg PV (mínima, média, elevada) [1]. Por 100 kg, dá cerca de 3,0, 3,3 ou 3,6 Mcal.
- **Energia em trabalho:** multiplicar a manutenção por 1,2 (leve), 1,4 (moderado), 1,6 (pesado) ou 1,9 (muito pesado) [2][4].
- **Manutenção média por 100 kg PV** (cálculo: valores de 500 kg ÷ 5) [1]: PB 126 g, lisina 5,4 g, Ca 4 g, P 2,8 g, Mg 1,5 g, Na 2 g, Cu 20 mg, Zn 80 mg, Se 0,2 mg, vitamina E 100 UI. É uma aproximação linear. Use com cautela fora da faixa de 400 a 600 kg (pôneis, cavalos de tração).
- **Em base MS da dieta** [2]: Se 0,1 mg/kg, Zn 40 mg/kg, I 0,35 mg/kg.
- **PB como % da dieta** [2]: adulto 8–10%, final de gestação 10–11%, lactação 12–14%, crescimento 14–16%.
- Na gestação, ED, PB e lisina sobem cerca de 3–4% ao mês a partir do 5º mês [2].

### Nível de trabalho (NRC, Tab. 1-10) [1][4]

| Nível | Carga | Exemplos |
|---|---|---|
| Leve | 1–3 h/semana (40% passo, 50% trote, 10% galope) | Passeio |
| Moderado | 3–5 h/semana | Aulas, provas |
| Pesado | 4–5 h/semana, com galope rápido | Lida, laço, tambor, polo, enduro |
| Muito pesado | Corrida ou elite | Turfe |

## 2. Regras de segurança

| Tema | Regra | Fonte |
|---|---|---|
| Volumoso mínimo | 1,5–2% PV de MS/dia [2]. Outras fontes: no mínimo 1%, ideal 1,5–2,5% [5]; volumoso ≥ 50% da ingestão [3]. | [2][3][5] |
| Restrição para emagrecer | Nunca abaixo de 1,25% PV de MS/dia. Em obesos, não ficar abaixo de 1% por mais de 24 h (risco de hiperlipemia). | [2][3] |
| Concentrado por refeição | No máximo 0,5% PV (2,5 kg para 500 kg) [3][7]. Fonte mais conservadora: 0,3–0,4% PV de grãos [5]. **As fontes divergem.** | [3][5][7] |
| Intervalo entre refeições de concentrado | Pelo menos 4 h. Não dar mais de 0,25% PV menos de 1 h antes de esforço intenso ou transporte. | [3] |
| Amido por refeição | Menos de 1,1 g/kg PV (Vervuert 2008) [8], ou até 2 g/kg PV (AAEP) [7]. Acima de 2 g/kg PV, o risco de úlcera aumenta [9]. **As fontes divergem.** Use o valor menor em casos de úlcera ou resistência à insulina. | [7][8][9] |
| Proporção de concentrado na dieta | Mais de 50% da MS vinda de concentrado amiláceo se associa a laminite, cólica e úlcera. | [3] |
| Tempo sem volumoso | Mais de 4–6 h sem feno ou pasto é fator de risco para úlcera. | [9] |
| Relação Ca:P | Merck: acima de 1:1, ideal em torno de 1,5:1 (potros toleram até 3:1) [2]. UMN: 1:1 a 3:1, ideal 2:1 [5]. NRC (citado em TCC brasileiro): 1,2:1 a 2:1 [37]. UFMS: 1:1 a 4:1 [20]. **Alerta sempre que ficar abaixo de 1:1.** | [2][5][20][37] |
| Água | 5 L/100 kg PV em repouso; 21–29 L/dia para 500 kg em trabalho mínimo; égua em lactação, 12–14 L/100 kg [2]. Outra fonte: 38–45 L/dia para 450 kg e 45–60 L no calor com trabalho [5]. **As fontes divergem.** | [2][5] |
| Sal | Água e sal à vontade [3]. Na de manutenção: 10 g/dia, o que equivale a cerca de 25 g de sal (NaCl tem cerca de 39% de Na; cálculo) [1]. Outra fonte recomenda 100 mg/kg PV, cerca de 50 g/dia [11]. O consumo voluntário varia de 19 a 134 g/dia. O suor de 1–2 h de trabalho pesado pode levar mais de 30 g de NaCl [2]. | [1][2][3][11] |
| Troca de dieta | Substituir 25% a cada 2 dias, completando em cerca de 6 dias. Aumentar o grão em cerca de 0,2 kg/dia [13]. Pasto novo: adaptação de 10–14 dias [14]. | [13][14] |
| Selênio (teto) | Nível máximo tolerável de 2 mg/kg da dieta, cerca de 20 mg/dia para 500 kg. Faixa segura: 1–10 mg/dia. | [10] |
| Vitamina E | Teto: evitar mais de 5.000 UI/dia [2]. Para manutenção, o NRC indica 500 UI [1], mas o texto do Merck fala em "≈ 1.000 UI" [2]. **As fontes divergem.** | [1][2] |
| Zn, Cu e Mg | Relação Zn:Cu de 3:1 a 4:1. Zn acima de 1.000 ppm pode induzir falta de Cu. Mg no máximo 0,3% da MS. | [2] |
| Gordura | Dieta normal tem 3–4%. Até 10% é tolerado com adaptação de 3–4 semanas. Óleo: até cerca de 0,7 g/kg PV/dia, cerca de 500 mL para 500 kg. | [3] |

### Obeso ou com risco de laminite

Vale para cavalos com laminite prévia, resistência à insulina, mais de 15 anos ou escore corporal 7 ou mais.

- **Limite de CNE:** dieta ou volumoso com CNE de até 10–12% da MS [6]. É consenso de extensão, sem um número único validado.
- **Feno com CNE alto:** deixar de molho por 15–60 min [6].
- **Ração:** acima de 25% de CNE é de digestão rápida; acima de 30% causa pico alto de insulina [3].

### Peso e escore corporal (Henneke, 1 a 9)

**Metas de escore** [2][4]

| Situação | Escore ideal |
|---|---|
| Geral | 4 a 6 |
| Éguas de cria | 5 a 6 |
| Trabalho leve ou moderado | 5 a 6 |
| Trabalho pesado ou muito pesado | 4 a 5 |

- **Faixas:** 7 é sobrepeso; 8–9 é obesidade [2].
- **Emagrecer:** dar 1,5–2% PV de MS. Perda esperada de 0,5–1% do PV por semana [2].
- **Engordar:** dar 2–2,5% PV de MS e aumentar a energia em 15–25% [2].
  - Cada kg ganho exige 20–25 Mcal de ED acima da manutenção [12].
  - Um ponto de escore equivale a 16–20 kg (NRC) ou cerca de 34 kg (Quinn). **As fontes divergem** [12].
- **Reavaliação:** a cada 3–4 semanas [38].

## 3. Composição dos alimentos (base MS, exceto a coluna MS)

| Alimento | MS % (natural) | ED Mcal/kg MS | PB % | Ca % | P % | Amido / açúcar % | Observações |
|---|---|---|---|---|---|---|---|
| Feno de Tifton 85 | 89,5 [35]; 85,7 [36] | 1,87 (feno de bermuda "coastal") [1] | 9,1 (CQBAL) [35]; 12,9 [36]; 14,3 [39] | 0,37ᵃ [35] | 0,15ᵃ [35] | sem dado confiável | FDN 73–78% [35][36]. Digestibilidade da MS em cavalos: 51% [36]. |
| Tifton/Cynodon verde | 31,3 [24] | sem dado confiável | 9,8 [24] | 0,45 [24] | 0,22 [24] | sem dado confiável | Valor genérico de *Cynodon* |
| Feno de Coastcross | 88,9 [35] | 1,87 [1] | 8,6 [35] | 0,42ᵇ [24] | 0,19ᵇ [24] | sem dado confiável | FDN 78,6% [35] |
| *Brachiaria brizantha* verde | 29,6 [25] | sem dado confiável | 10,4 [25] | 0,46 [25] | 0,22 [25] | sem dado confiável | Ver seção 4 |
| *Brachiaria decumbens* verde | 26,8 [26] | sem dado confiável | 8,9 [26] | 0,36 [26] | 0,23 [26] | sem dado confiável | Ver seção 4 |
| *Brachiaria humidicola* | sem dado confiável | sem dado confiável | sem dado confiável | 0,41 [19] | 0,18 [19] | sem dado confiável | **Oxalato 1,80% da MS; relação Ca:oxalato 0,23** [19] |
| Capim-elefante (napiê) verde | 17,9 [27] | sem dado confiável | 9,7 [27] | 0,36 [27] | 0,29 [27] | sem dado confiável | Oxalato 1,95–3,23% da MS [27], acima do limiar de 0,5% [19] |
| Feno de alfafa | 89,4 [28] | 1,8–2,4ᶜ [34] | 18,2 [28] (15–22 [34]) | 1,68 [28] (0,9–1,5 [34]) | 0,26 [28] | sem dado confiável | Relação Ca:P em torno de 6:1. Ajuda a corrigir falta de Ca [20]. |
| Milho em grão | 86,7 [29] | 3,88 [1] | 9,2 [29] | 0,04 [29] | 0,33 [29] | **Amido 71,8** [29] | Risco de fumonisina |
| Aveia em grão | 87,9 [30] | 3,23–3,33 [1] | 11,0 [30]; 13,6 [1] | 0,11 [30] | 0,36 [30] | Amido 40,6 [30] | O grão mais seguro, por ter mais fibra [30] |
| Farelo de trigo | 87,0 [31] | 3,22 [1] | 17,3 [31] | 0,14 [31] | **1,11** [31] | Amido 23,1 [31] | **Relação Ca:P de 0,13:1**. Limite de cerca de 2 kg/dia [31]. |
| Farelo de soja (44–46%) | 87,7 [32] | 3,52 [1] | 49,5 [32] | 0,39 [32] | 0,71 [32] | Amido 0,9–6,8; açúcar 10,6 [32] | Usar como corretor de proteína |
| Polpa cítrica seca | 90,3 [33] | sem dado confiável | 7,0 [33] | 1,7 [33] | 0,10 [33] | Amido 6,6; **açúcar 24,4** [33] | Relação Ca:P alta |
| Ração comercial para equinos (rótulo) | sem dado confiável | 2,2–4,4ᵈ [37] | Manutenção 10–17 (média 13,2); trabalho 11–20 (média 14,9); crescimento 15–23 (média 18,7) [37] | Ver rótulo | Ver rótulo | Rótulo não declara | Fibra bruta 6–22%. Levantamento de 195 rações brasileiras [37]. |
| Sal mineral para equinos | — | — | — | Ver rótulo | Ver rótulo | — | Não há faixa típica confiável: usar os níveis de garantia do rótulo. **Sal mineral de bovino não serve**: tem muito P e pouco Ca [19]. |
| Sal comum (NaCl) | cerca de 100 | 0 | 0 | 0 | 0 | 0 | Cerca de 39% de Na (cálculo) |

**Notas da tabela**

- ᵃ Valores de Machado et al. (2010), citados em [35], em base natural.
- ᵇ Valor do feno de *Cynodon* em geral.
- ᶜ Conversão da faixa do UF/IFAS, que é 0,8–1,1 Mcal/lb em base natural.
- ᵈ O rótulo diz "Mcal/kg", mas os valores parecem estar em kcal/kg ÷ 1000 [37].
- Feno de bermuda em geral (base natural) [34]: PB 6–11%, Ca 0,3–0,5%, P 0,15–0,3%.
- PB-alvo do feno por categoria [34]:
  - Potros desmamados e éguas em lactação: acima de 14%.
  - Cavalos atletas e jovens: 12–16%.
  - Cavalos de lazer: 8–12%.
  - Obesos: 7–10%.

## 4. Erros comuns e riscos no Brasil

### Excesso de concentrado

- Sinais de excesso: refeição acima de 0,5% PV, amido acima de 1–2 g/kg PV por refeição, ou concentrado acima de 50% da MS.
- Riscos: cólica, laminite e úlcera [3][7][8][9].

### "Cara inchada" (hiperparatireoidismo nutricional secundário)

- **Causas:**
  - Excesso de P com pouco Ca, como em dietas com muito farelo ou grão. A relação Ca:P pode chegar a cerca de 1:3 [20][31].
  - Capins ricos em oxalato.
- **Lesões:** são irreversíveis, mas a doença pode ser controlada se detectada cedo [19].
- **Mais afetados:** potros, éguas gestantes e éguas em lactação [19].

### Braquiária e outros capins com oxalato

- **Limiar de risco** (as fontes divergem):
  - Oxalato acima de 0,5% da MS e relação Ca:oxalato abaixo de 0,5 [19][20].
  - Oxalato acima de 2,5% da MS [21].
  - Capim com cerca de 1% de oxalato já foi associado a sinais neuromusculares [20].
- ***B. humidicola*:** a Embrapa a considera "potencialmente tóxica para equinos" e recomenda preferir Coastcross ou outros capins [19].
- **Outros capins com oxalato:** *Panicum maximum* cv. Aruana, *Setaria*, buffel e quicuio [3][20][21].
- **Oxalato de *B. brizantha* e *B. decumbens* para cavalos:** sem dado confiável.

### Braquiária e saponinas (fígado e fotossensibilização)

- ***B. humidicola*:** cerca de 40 casos em equinos no Pará, alguns fatais [22].
- **Protodioscina:** 0,30–2,56% em pastos de *Brachiaria*. Os casos documentados são em ovinos [23]; a toxicidade é descrita em ruminantes [25][26].
- **Em equinos com *B. decumbens* ou *B. brizantha*:** sem dado confiável.

### Monensina e outros ionóforos (ração, sal ou suplemento de bovinos)

- **Dose letal (DL50):** 2–3 mg/kg PV em equinos, contra 20–80 mg/kg em bovinos [15].
- **Sinais:** cólica, sudorese, arritmia e morte súbita. Na forma crônica, insuficiência cardíaca [15].
- **Surto no Brasil:** suplemento à base de melaço para ruminantes, com 1.000 mg de monensina por kg. De 19 cavalos, 5 adoeceram e morreram [16].
- **Nunca dar ração ou sal de bovino a cavalo.**

### Milho mofado e leucoencefalomalácia (fumonisina)

- **Segurança:** não existe nível seguro para equinos; houve surtos com cerca de 1 ppm na dieta [17].
- **Onde aparece:** milho, ração, farelo, feno e aveia [17].
- **Época no Sul do Brasil:** de junho a setembro [17].
- **Limite do FDA:** 5 ppm no milho, com o milho limitado a 20% da dieta [18]. Isso dá cerca de 1 ppm na dieta total (cálculo).

### Outros erros

- **Sal insuficiente:** a exigência de Na vai de 10 g/dia (manutenção) a 41 g/dia (trabalho muito pesado) [1], e o consumo voluntário é muito variável [2][11].
- **Excesso de selênio:** somar ração, sal mineral e suplementos. Alertar se passar de 2 mg/kg MS ou de cerca de 20 mg/dia [10].
- **Troca brusca de dieta, pouco volumoso ou jejum longo:** ver a seção 2 [2][9][13].

## Fontes

1. NRC. *Nutrient Requirements of Horses*, 6ª ed., 2007. Tabelas 1-2, 1-10, 16-3 e 16-6. https://arquivos.ufrrj.br/arquivos/2023029093996c3814441fa06d569b53f/5._NRC_2007.pdf · https://webassets.nationalacademies.org/nrh/
2. Merck Vet Manual. Nutritional Requirements of Horses. https://www.merckvetmanual.com/management-and-nutrition/nutrition-horses/nutritional-requirements-of-horses-and-other-equids
3. Merck Vet Manual. Feeding Practices in Horses. https://www.merckvetmanual.com/management-and-nutrition/nutrition-horses/feeding-practices-in-horses-and-other-equids
4. Merck Vet Manual. Tabela de energia do trabalho e escore corporal. https://www.merckvetmanual.com/multimedia/table/estimated-energy-requirements-of-work-for-light-horses-and-desirable-body-condition-scores
5. UMN Extension. Ten things… feeding the mature horse. https://extension.umn.edu/horse-nutrition/ten-things-you-should-know-about-feeding-mature-horse
6. UMN Extension. Managing forage carbohydrate content. https://extension.umn.edu/horse-nutrition/managing-forage-carbohydrate-content
7. AAEP Proceedings 2020. How to Feed Performance Horses for Optimal Digestive Health. https://pubs.aaep.org/0A4370h/66thAnnCon2020/html/85.html
8. Vervuert et al. 2008, resumido em Horse Science News. https://www.horsesciencenews.com/horse-care/feed/guidelines-for-feeding-horses-starch.php
9. KER. EGUS: Dietary Management. https://ker.com/?p=19664
10. KER. Selênio. https://ker.com/?p=18115
11. KER. Ideal Salt Levels for Horses Examined. https://ker.com/?p=12406
12. KER. Assessing Energy Balance. https://ker.com/?p=4185
13. eXtension Horses. Changing the Diet of Horses. https://horses.extension.org/changing-the-diet-of-horses/
14. KER. Make Horse Feed Changes Gradually. https://ker.com/?p=13635
15. Manual MSD (PT). Uso de ionóforos em animais. https://www.msdvetmanual.com/pt/pharmacology/medicamentos-antibacterianos/uso-de-ion%C3%B3foros-em-animais
16. Sousa et al. Intoxicação por monensina em equinos (suplemento com melaço). Acta Sci. Vet. 47 supl. 1, 2019. https://bvs-vet.org.br/vetindex/periodicos/acta-scientiae-veterinariae/47-(2019)-suppl.1/surto-de-intoxicacao-por-monensina-sodica-em-equinos-associada-a-consu
17. Echenique et al. Leucoencefalomalácia por milho imaturo. Ciência Rural 49(3), 2019. https://www.scielo.br/j/cr/a/mbzmQPgtTymXDqZjB5FpDpS/
18. FDA. Fumonisin Levels in Human Foods and Animal Feeds. https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-fumonisin-levels-human-foods-and-animal-feeds
19. Nunes, Silva e Schenk. Problemas com cavalos em pastagens de Humidicola. Embrapa CT-37, 1990. https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/319852/1/COT37.pdf
20. Ávila et al. Hiperparatireoidismo nutricional secundário em equinos. Nota técnica UFMS 03/2023. https://ppgcivet.ufms.br/files/2023/04/Nota-tecnica-03-2023-Hiperparatireoidismo-nutricional-secundario-em-equinos.pdf
21. Fontes de minerais em cavalos com HNS. Arq. Bras. Med. Vet. Zootec., 2021. https://qa1.scielo.br/j/abmvz/a/mGRGDPjDdYtpfKQJsMW9WTh/?lang=en
22. Barbosa et al. Fotossensibilização em equinos por *B. humidicola*. Pesq. Vet. Bras. 26(3), 2006. https://repositorio.ufpa.br/bitstream/2011/2495/1/Artigo_FotossensibilizacaoHepatogenaEquinos.pdf
23. Mustafa et al. Intoxicação por *Brachiaria* em ovinos. Pesq. Vet. Bras. 32(12), 2012. https://repositorio.unb.br/bitstream/10482/28354/1/ARTIGO_IntoxicacaoNaturalBrachiaria.pdf
24. Feedipedia. Bermuda grass (capim verde e feno). https://www.feedipedia.org/node/471 · https://feedipedia.org/node/11847 · https://feedipedia.org/node/11850
25. Feedipedia. *B. brizantha*. https://www.feedipedia.org/node/490
26. Feedipedia. *B. decumbens*. https://www.feedipedia.org/node/489
27. Feedipedia. Capim-elefante. https://feedipedia.org/node/12365 · https://www.feedipedia.org/node/395
28. Feedipedia. Feno de alfafa. https://feedipedia.org/node/11743
29. Feedipedia. Milho, América Central e do Sul. https://feedipedia.review.fao.org/node/11664
30. Feedipedia. Aveia. https://www.feedipedia.org/node/231
31. Feedipedia. Farelo de trigo. https://www.feedipedia.org/node/726
32. Feedipedia. Farelo de soja 44–46. https://feedipedia.org/node/11682
33. Feedipedia. Polpa cítrica seca. https://feedipedia.org/node/11987
34. UF/IFAS Florida Equine Institute 2006. Selecting Hay. https://extadmin.ifas.ufl.edu/media/extadminifasufledu/cflag/image/docs/fl-equine-institute/2006/SelectingHay.pdf
35. Ferreira. Monografia UFU, 2023 (cita CQBAL 4.0 e Machado et al. 2010). https://repositorio.ufu.br/bitstream/123456789/38247/1/Composi%c3%a7%c3%a3oQu%c3%admicoBromatol%c3%b3gica.pdf
36. Brito. Dissertação UFC, 2016 (feno de Tifton em equídeos). https://repositorio.ufc.br/ri/bitstream/riufc/21548/3/2016_dis_jcbrito.pdf
37. Lima. Portfólio brasileiro de rações para equinos. TCC IFMG, 2026. https://repositorio.ifmg.edu.br/bitstreams/6ca5c344-7113-4471-a67e-193e1f97827b/download
38. MSU Extension. Body Condition Scoring. https://extension.msstate.edu/publications/body-condition-scoring-system-benefits-for-horses-and-owners
39. Rodrigues. Embrapa Clima Temperado, Documentos 270, 2009. https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/747548/1/documento270.pdf
`;
