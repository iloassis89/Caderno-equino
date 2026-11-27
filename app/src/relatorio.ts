// Relatório do animal em PDF e mensagem para WhatsApp, para enviar ao veterinário ou especialista
import { Linking, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { supabase } from "./supabase";
import { linkTemporario } from "./anexos";
import { NOME_APP, infoStatus, numBR, rotuloCategoria } from "./constantes";
import { br, hojeISO, somarDias } from "./datas";
import { calcularDieta, infoTipoDieta, REFERENCIAS } from "./nutricao";

const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export async function dadosDoAnimal(animalId: string, dias = 30) {
  const desde = somarDias(hojeISO(), -dias);
  const [a, r, med, an, di, cuid, cons] = await Promise.all([
    supabase.from("animals").select("*").eq("id", animalId).single(),
    supabase.from("records").select("*").eq("animal_id", animalId).gte("data", desde).order("data", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("records").select("data,peso_kg,escore_corporal,medidas").eq("animal_id", animalId).eq("status", "realizado")
      .or("peso_kg.not.is.null,escore_corporal.not.is.null").order("data", { ascending: false }).limit(6),
    supabase.from("anexos").select("tipo,caminho,nome,mime").eq("animal_id", animalId).in("tipo", ["registro", "foto_animal"]).order("created_at", { ascending: false }),
    supabase.from("dieta_itens").select("*").eq("animal_id", animalId).eq("ativo", true).order("created_at"),
    // último cuidado de cada tipo, mesmo fora do período (o que o veterinário mais pergunta)
    supabase.from("records").select("data,categoria,descricao,status,responsavel").eq("animal_id", animalId).eq("status", "realizado")
      .in("categoria", ["cascos", "dentes", "exames", "medicamento_suplemento", "reproducao", "ocorrencia", "sinal_avaliacao_profissional"])
      .order("data", { ascending: false }).limit(60),
    // respostas da IA que a pessoa decidiu guardar para este animal
    supabase.from("consultas_salvas").select("pergunta,resposta,created_at").eq("animal_id", animalId).order("created_at", { ascending: false }).limit(5),
  ]);
  const ultimos: any[] = [];
  for (const c of cuid.data ?? []) if (!ultimos.some((u) => u.categoria === c.categoria)) ultimos.push(c);
  if (a.error || !a.data) throw new Error("Animal não encontrado ou sem internet. Tente de novo.");
  const ultimoPeso = (med.data ?? []).find((m: any) => m.peso_kg != null)?.peso_kg ?? null;
  return {
    animal: a.data, registros: r.data ?? [], medidas: med.data ?? [], anexos: an.data ?? [], dieta: di.data ?? [],
    pesoKg: ultimoPeso != null ? Number(ultimoPeso) : null, dias, ultimos, consultas: cons.data ?? [],
  };
}

function montarHtml(d: Awaited<ReturnType<typeof dadosDoAnimal>>, fotoUrl: string | null) {
  const a = d.animal;
  const pend = d.registros.filter((r: any) => r.status === "avaliacao_veterinaria" || r.status === "a_confirmar");
  const ultimo = d.registros[0];
  const registro = d.anexos.filter((x: any) => x.tipo === "registro");
  const dieta = calcularDieta(d.dieta.map((i: any) => ({ ...i, quantidade: Number(i.quantidade) })), d.pesoKg);
  const sexo = a.sexo === "femea" ? "Fêmea" : a.sexo === "macho" ? "Macho" : a.sexo === "macho_castrado" ? "Macho castrado" : null;
  const linhaReg = (r: any) => `<tr><td>${br(r.data)}</td><td>${esc(rotuloCategoria(r.categoria))}</td><td>${esc(infoStatus(r.status).rotulo)}</td>
    <td>${esc(r.descricao)}${r.peso_kg != null ? `<br><b>Peso:</b> ${numBR(Number(r.peso_kg))} kg${r.medidas?.peso_estimado_fita ? " (estimado pela fita)" : ""}` : ""}${r.escore_corporal != null ? `<br><b>Escore:</b> ${numBR(Number(r.escore_corporal))}` : ""}
    ${r.decisao_necessaria ? `<br><b>Decisão:</b> ${esc(r.decisao_necessaria)}` : ""}${r.proximo_passo ? `<br><b>Próximo passo:</b> ${esc(r.proximo_passo)}` : ""}</td></tr>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(a.nome)} — ${NOME_APP}</title>
<style>
 body{font-family:Georgia,serif;color:#1F1B16;margin:28px;font-size:13px}
 h1{font-size:22px;margin:0} h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #2F4B2C;color:#2F4B2C}
 .topo{display:flex;gap:16px;align-items:center} img{width:110px;height:110px;object-fit:cover;border-radius:10px}
 table{width:100%;border-collapse:collapse} td,th{border:1px solid #CDBF9F;padding:5px;vertical-align:top;text-align:left}
 th{background:#F3ECDC} .alerta{background:#F6DCD3;padding:8px;border-left:4px solid #9A3A22}
 .rodape{margin-top:20px;font-size:10px;color:#4F473D}
</style></head><body>
<div class="topo">${fotoUrl ? `<img src="${esc(fotoUrl)}">` : ""}<div>
<h1>${esc(a.nome)}</h1>
<div>${[a.raca, a.pelagem, sexo, a.data_nascimento ? `nasc. ${br(a.data_nascimento)}` : null].filter(Boolean).map(esc).join(" · ")}</div>
<div>Relatório de manejo gerado em ${br(hojeISO())} pelo ${NOME_APP}. Período: últimos ${d.dias} dias.</div>
<div>Documento de registro: ${registro.length ? `${registro.length} arquivo(s) guardado(s) no app` : "não anexado"}</div>
</div></div>
${a.observacoes ? `<p><b>Observações:</b> ${esc(a.observacoes)}</p>` : ""}

<h2>Última atualização</h2>
${ultimo ? `<table>${linhaReg(ultimo)}</table>` : "<p>Sem anotações no período.</p>"}

<h2>Últimos cuidados (ferrador, dentista, exames, vacina/vermífugo, reprodução)</h2>
${d.ultimos.length ? `<table><tr><th>Assunto</th><th>Data</th><th>O que foi</th></tr>${d.ultimos.map((u: any) => `<tr><td>${esc(rotuloCategoria(u.categoria))}</td><td>${br(u.data)}</td><td>${esc(u.descricao)}${u.responsavel ? ` (${esc(u.responsavel)})` : ""}</td></tr>`).join("")}</table>` : "<p>Nada anotado.</p>"}

<h2>Pendências</h2>
${pend.length ? `<div class="alerta">${pend.map((p: any) => `${br(p.data)} — <b>${esc(infoStatus(p.status).rotulo)}</b>: ${esc(rotuloCategoria(p.categoria))}. ${esc(p.descricao)}`).join("<br>")}</div>` : "<p>Nenhuma.</p>"}

<h2>Peso e corpo</h2>
${d.medidas.length ? `<table><tr><th>Data</th><th>Peso (kg)</th><th>Escore corporal (1–9)</th></tr>${d.medidas.map((m: any) => `<tr><td>${br(m.data)}</td><td>${m.peso_kg != null ? numBR(Number(m.peso_kg)) + (m.medidas?.peso_estimado_fita ? " (fita)" : "") : "—"}</td><td>${m.escore_corporal != null ? numBR(Number(m.escore_corporal)) : "—"}</td></tr>`).join("")}</table>` : "<p>Sem medições registradas.</p>"}

<h2>Alimentação atual (por dia)</h2>
${d.dieta.length ? `<table><tr><th>Alimento</th><th>Tipo</th><th>Quantidade/dia</th><th>Vezes ao dia</th></tr>
${d.dieta.map((i: any) => `<tr><td>${esc(i.nome)}</td><td>${esc(infoTipoDieta(i.tipo).rotulo)}</td><td>${numBR(Number(i.quantidade), 3)} ${esc(i.unidade)}</td><td>${esc(i.refeicoes)}</td></tr>`).join("")}</table>
<p>Total como fornecido: ${numBR(dieta.naturalKg, 2)} kg/dia. Matéria seca estimada: ${numBR(dieta.msKg, 2)} kg/dia${dieta.msPctPV != null ? ` (${numBR(dieta.msPctPV, 2)}% do peso)` : ""}.
Volumoso em matéria seca: ${numBR(dieta.volumosoMsKg, 2)} kg/dia${dieta.volumosoPctPV != null ? ` (${numBR(dieta.volumosoPctPV, 2)}% do peso)` : ""}.
Maior refeição de concentrado: ${numBR(dieta.concentradoMaiorRefeicaoKg, 2)} kg. Sal comum: ${numBR(dieta.salComumG, 0)} g/dia. Sal mineral: ${numBR(dieta.salMineralG, 0)} g/dia.</p>` : "<p>Dieta não cadastrada.</p>"}

<h2>Anotações dos últimos ${d.dias} dias (${d.registros.length})</h2>
${d.registros.length ? `<table><tr><th>Data</th><th>O quê</th><th>Situação</th><th>Detalhes</th></tr>${d.registros.map(linhaReg).join("")}</table>` : "<p>Nenhuma.</p>"}

${d.consultas.length ? `<h2>Dúvidas guardadas (respostas gerais de IA, não são orientação veterinária)</h2>
${d.consultas.map((c: any) => `<p><b>${br(String(c.created_at).slice(0, 10))} — ${esc(c.pergunta)}</b><br>${esc(c.resposta)}</p>`).join("")}` : ""}

<p class="rodape">Informações registradas pelo responsável pelo animal. O ${NOME_APP} não faz diagnóstico nem recomenda medicamentos.
Faixas de referência de alimentação: ${esc(REFERENCIAS.fontes.join(" "))}</p>
</body></html>`;
}

// Gera o PDF e abre o compartilhamento (WhatsApp, e-mail, salvar…)
export async function enviarPdf(animalId: string, janelaWeb?: any) {
  const d = await dadosDoAnimal(animalId);
  const foto = d.anexos.find((x: any) => x.tipo === "foto_animal");
  const fotoUrl = foto ? await linkTemporario(foto.caminho, 3600) : null;
  const html = montarHtml(d, fotoUrl);
  if (Platform.OS === "web") {
    const w = janelaWeb ?? window.open("", "_blank");
    if (!w) throw new Error("O navegador bloqueou a janela. Permita janelas para este site e tente de novo.");
    w.document.open();
    w.document.write(html);
    w.document.close();
    // imprime quando a página (e a foto) terminar de carregar
    let feito = false;
    const imprimir = () => { if (feito) return; feito = true; try { w.focus(); w.print(); } catch {} };
    w.onload = imprimir;
    setTimeout(imprimir, 2500);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: `Relatório de ${d.animal.nome}` });
  } else {
    await Print.printAsync({ uri });
  }
}

// Mensagem curta com a última atualização, para mandar pelo WhatsApp
export async function enviarWhatsApp(animalId: string, janelaWeb?: any) {
  const d = await dadosDoAnimal(animalId, 30);
  const u = d.registros[0];
  const pend = d.registros.filter((r: any) => r.status === "avaliacao_veterinaria");
  const linhas = [
    `*${d.animal.nome}* — atualização (${NOME_APP})`,
    u ? `Última anotação (${br(u.data)}): ${rotuloCategoria(u.categoria)} — ${infoStatus(u.status).rotulo}. ${u.descricao}` : "Sem anotações recentes.",
    u?.proximo_passo ? `Próximo passo: ${u.proximo_passo}` : null,
    d.pesoKg ? `Último peso registrado: ${numBR(d.pesoKg)} kg` : null,
    pend.length ? `Para avaliação veterinária: ${pend.map((p: any) => `${br(p.data)} ${p.descricao}`).join("; ")}` : null,
  ].filter(Boolean).join("\n");
  const url = `https://wa.me/?text=${encodeURIComponent(linhas)}`;
  if (Platform.OS === "web") {
    // @ts-ignore
    if (janelaWeb) janelaWeb.location.href = url; else window.location.href = url;
  } else {
    await Linking.openURL(url);
  }
}
