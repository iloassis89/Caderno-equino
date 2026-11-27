// Painel do dono do app: liberar acesso grátis, anúncios e dicas
import React, { useEffect, useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import { chamarFuncao, supabase, mensagemErro } from "../supabase";
import { ok, useCarga } from "../dados";
import { BotoesAnexar } from "../anexos";
import { Aviso, Botao, BotaoConfirmar, Cabecalho, Campo, Carregando, Cartao, ErroCarga, Escolha, Icone, Tela, Vazio, useNav } from "../ui";
import { br, mascaraData, paraISO } from "../datas";
import { cor, est, tam } from "../tema";

export function Admin() {
  const nav = useNav();
  const cont = useCarga(async () => (ok(await supabase.rpc("contadores_admin")) as any[])?.[0] ?? null);
  const numero: Record<string, number> = { AdminSuporte: cont.dados?.suporte ?? 0, AdminPedidos: cont.dados?.pedidos ?? 0, AdminPedidosAnuncio: cont.dados?.anuncios ?? 0 };
  const itens = [
    { t: "Suporte", d: "Responder os clientes", i: "lifebuoy", r: "AdminSuporte" },
    { t: "Pedidos para autorizar", d: "Parceiros (afiliados) e compras/vendas", i: "clipboard-check-outline", r: "AdminPedidos" },
    { t: "Vendas de anúncio", d: "Reservas e fila de espera", i: "cash-register", r: "AdminPedidosAnuncio" },
    { t: "Liberar acesso grátis", d: "Dar um plano pago de presente para alguém", i: "gift-outline", r: "AdminCortesias" },
    { t: "Anúncios", d: "Espaço publicitário que você vende", i: "bullhorn-outline", r: "AdminAnuncios" },
    { t: "Dicas", d: "Dicas que aparecem para todos", i: "lightbulb-on-outline", r: "AdminDicas" },
    { t: "Configurações", d: "E-mail de avisos, administradores e preços", i: "cog-outline", r: "AdminConfig" },
    { t: "Diagnóstico", d: "Ver se as chaves da IA e do e-mail funcionam", i: "stethoscope", r: "AdminDiagnostico" },
  ];
  return (
    <Tela titulo="Administração" voltar subtitulo="Só você vê esta área.">
      {itens.map((i) => (
        <Cartao key={i.r} onPress={() => nav.ir(i.r)}>
          <View style={[est.linha, { gap: 12 }]}>
            <Icone nome={i.i} tamanho={30} cor={cor.mata} />
            <View style={{ flex: 1 }}>
              <Text style={[est.texto, { fontWeight: "700" }]}>{i.t}</Text>
              <Text style={est.textoSuave}>{i.d}</Text>
            </View>
            {numero[i.r] > 0 && (
              <View style={{ minWidth: 30, height: 30, borderRadius: 15, backgroundColor: cor.couro, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                <Text style={{ color: cor.branco, fontWeight: "700", fontSize: 16 }}>{numero[i.r]}</Text>
              </View>
            )}
            <Icone nome="chevron-right" tamanho={28} cor={cor.tintaSuave} />
          </View>
        </Cartao>
      ))}
    </Tela>
  );
}

// ---------- Acesso grátis ----------
const PRAZOS = [
  { valor: "30", rotulo: "30 dias" }, { valor: "90", rotulo: "3 meses" },
  { valor: "365", rotulo: "1 ano" }, { valor: "sem", rotulo: "Sem prazo" },
];

export function AdminCortesias() {
  const [email, setEmail] = useState("");
  const [plano, setPlano] = useState<string | null>("pacote_5");
  const [prazo, setPrazo] = useState<string | null>("90");
  const [msg, setMsg] = useState<{ t: string; tipo: "ok" | "erro" } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const planos = useCarga(async () => ok(await supabase.from("plans").select("code,nome,preco_mensal_centavos").gt("preco_mensal_centavos", 0).order("ordem")) ?? []);
  const lista = useCarga(async () => ok(await supabase.rpc("listar_cortesias")) as any[] ?? []);

  async function liberar() {
    setMsg(null);
    if (!email.includes("@")) return setMsg({ t: "Escreva o e-mail da pessoa.", tipo: "erro" });
    if (!plano) return setMsg({ t: "Escolha o plano.", tipo: "erro" });
    setOcupado(true);
    const { data, error } = await supabase.rpc("conceder_cortesia", { p_email: email.trim(), p_plan: plano, p_dias: prazo === "sem" ? null : Number(prazo) });
    setOcupado(false);
    if (error) return setMsg({ t: mensagemErro(error), tipo: "erro" });
    setMsg({
      t: data === "liberado" ? "Acesso liberado. A pessoa já pode usar." : "Guardado. O acesso é liberado assim que a pessoa criar a conta com esse e-mail.",
      tipo: "ok",
    });
    setEmail("");
    lista.recarregar();
  }

  return (
    <Tela titulo="Liberar acesso grátis" voltar subtitulo="A pessoa usa o plano escolhido sem pagar. Não gera comissão de parceiro.">
      <Campo rotulo="E-mail da pessoa" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Escolha rotulo="Plano" valor={plano} aoEscolher={setPlano} colunas={2}
        opcoes={(planos.dados ?? []).map((p: any) => ({ valor: p.code, rotulo: p.nome }))} />
      <Escolha rotulo="Por quanto tempo" valor={prazo} aoEscolher={setPrazo} opcoes={PRAZOS} colunas={2} />
      <Aviso texto={msg?.t} tipo={msg?.tipo} />
      <Botao titulo="Liberar acesso" icone="gift-outline" onPress={liberar} carregando={ocupado} />

      <Cabecalho texto="Acessos liberados" />
      <ErroCarga erro={lista.erro} tentar={lista.recarregar} />
      {lista.carregando && !lista.dados ? <Carregando /> : (lista.dados ?? []).length === 0 ? <Vazio texto="Nenhum acesso liberado." /> :
        (lista.dados ?? []).map((c: any) => (
          <Cartao key={c.email + c.situacao}>
            <Text style={[est.texto, { fontWeight: "700" }]}>{c.email}</Text>
            <Text style={est.textoSuave}>{c.plano} · {c.situacao}{c.ate ? ` · até ${br(String(c.ate).slice(0, 10))}` : c.situacao === "ativa" ? " · sem prazo" : ""}</Text>
            <BotaoConfirmar titulo="Tirar o acesso" icone="close-circle-outline" onConfirmar={async () => {
              const { error } = await supabase.rpc("revogar_cortesia", { p_email: c.email });
              if (error) return setMsg({ t: mensagemErro(error), tipo: "erro" });
              lista.recarregar();
            }} />
          </Cartao>
        ))}
    </Tela>
  );
}

// ---------- Anúncios ----------
async function enviarImagemAnuncio(arq: { uri: string; nome: string; mime: string; file?: any }) {
  const ext = (arq.nome.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? "jpg").toLowerCase();
  const caminho = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const corpo = Platform.OS === "web" ? (arq.file ?? await (await fetch(arq.uri)).blob()) : await (await fetch(arq.uri)).arrayBuffer();
  const { error } = await supabase.storage.from("anuncios").upload(caminho, corpo, { contentType: arq.mime });
  if (error) throw error;
  return supabase.storage.from("anuncios").getPublicUrl(caminho).data.publicUrl;
}

export function AdminAnuncios({ pedido }: { pedido?: any }) {
  // vindo de "Vendas de anúncio": já abre o formulário preenchido e ligado ao pedido pago
  const [form, setForm] = useState<any | null>(() => pedido ? {
    anunciante: pedido.anunciante, titulo: "", texto: "", link_url: "", publico: "todos", imagem_url: null, pedido_id: pedido.id,
    fim: br(new Date(Date.now() + (pedido.periodo === "mes" ? 30 : 7) * pedido.quantidade * 86400000 - 86400000).toISOString().slice(0, 10)),
  } : null);
  const [msg, setMsg] = useState<{ t: string; tipo: "ok" | "erro" } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const { dados, carregando, erro, recarregar } = useCarga(async () => ok(await supabase.from("anuncios").select("*").order("created_at", { ascending: false })) ?? []);

  function novo() { setMsg(null); setForm({ anunciante: "", titulo: "", texto: "", link_url: "", publico: "todos", fim: "", imagem_url: null }); }
  function editar(a: any) { setMsg(null); setForm({ ...a, texto: a.texto ?? "", link_url: a.link_url ?? "", fim: a.fim ? br(a.fim) : "" }); }

  async function salvar() {
    setMsg(null);
    if (ocupado) return;
    if (!form.anunciante.trim() || !form.titulo.trim()) return setMsg({ t: "Preencha o anunciante e o título.", tipo: "erro" });
    let link = form.link_url.trim();
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
    if (link.startsWith("http://")) link = link.replace("http://", "https://");
    const fim = form.fim ? paraISO(form.fim) : null;
    if (form.fim && !fim) return setMsg({ t: "Data final inválida (dia/mês/ano).", tipo: "erro" });
    setOcupado(true);
    const linha = {
      anunciante: form.anunciante.trim(), titulo: form.titulo.trim(), texto: form.texto.trim() || null,
      link_url: link || null, publico: form.publico, fim, imagem_url: form.imagem_url,
      ...(form.pedido_id ? { pedido_id: form.pedido_id } : {}),
    };
    const res = form.id ? await supabase.from("anuncios").update(linha).eq("id", form.id) : await supabase.from("anuncios").insert(linha);
    setOcupado(false);
    if (res.error) return setMsg({ t: mensagemErro(res.error), tipo: "erro" });
    setForm(null);
    setMsg({ t: "Anúncio guardado.", tipo: "ok" });
    recarregar();
  }

  if (form) {
    return (
      <Tela titulo={form.id ? "Editar anúncio" : "Novo anúncio"}>
        <Campo rotulo="Anunciante (quem pagou)" value={form.anunciante} onChangeText={(t) => setForm({ ...form, anunciante: t })} placeholder="Ex.: Casa da Ração Belmonte" />
        <Campo rotulo="Título" value={form.titulo} onChangeText={(t) => setForm({ ...form, titulo: t })} placeholder="Ex.: Ração com 10% de desconto" />
        <Campo rotulo="Texto (opcional)" value={form.texto} onChangeText={(t) => setForm({ ...form, texto: t })} multiline />
        <Campo rotulo="Link (opcional)" value={form.link_url} onChangeText={(t) => setForm({ ...form, link_url: t })} autoCapitalize="none"
          placeholder="site ou wa.me/5573..." dica="Para WhatsApp, use wa.me/55 + DDD + número." />
        <Escolha rotulo="Quem vê" valor={form.publico} aoEscolher={(v) => setForm({ ...form, publico: v ?? "todos" })}
          opcoes={[{ valor: "todos", rotulo: "Todos" }, { valor: "gratis", rotulo: "Só plano grátis" }]} />
        <Campo rotulo="Mostrar até (opcional)" value={form.fim} onChangeText={(t) => setForm({ ...form, fim: mascaraData(t) })} keyboardType="number-pad" placeholder="dia/mês/ano" />
        <Text style={[est.texto, { fontWeight: "700", marginBottom: 6 }]}>Imagem (opcional, deitada)</Text>
        {form.imagem_url ? <Image source={{ uri: form.imagem_url }} style={{ width: "100%", aspectRatio: 2, borderRadius: 8, marginBottom: 8 }} /> : null}
        <BotoesAnexar arquivo={false} carregando={ocupado} aoEscolher={async (a) => {
          setOcupado(true);
          try { const url = await enviarImagemAnuncio(a); setForm((f: any) => ({ ...f, imagem_url: url })); }
          catch (e: any) { setMsg({ t: mensagemErro(e), tipo: "erro" }); }
          finally { setOcupado(false); }
        }} />
        <Aviso texto={msg?.t} tipo={msg?.tipo} />
        <Botao titulo="Guardar anúncio" icone="check" onPress={salvar} carregando={ocupado} />
        {form.id && <BotaoConfirmar titulo="Apagar anúncio" onConfirmar={async () => {
          const { error } = await supabase.from("anuncios").delete().eq("id", form.id);
          if (error) return setMsg({ t: mensagemErro(error), tipo: "erro" });
          setForm(null); recarregar();
        }} />}
        <Pressable onPress={() => setForm(null)} style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: cor.couro, fontSize: tam.texto, fontWeight: "700" }}>Cancelar</Text>
        </Pressable>
      </Tela>
    );
  }

  return (
    <Tela titulo="Anúncios" voltar subtitulo="Os anúncios aparecem no Início e nas Dicas. Os números ajudam a mostrar ao anunciante quantas vezes o anúncio foi visto.">
      <Botao titulo="Novo anúncio" icone="plus-circle" onPress={novo} />
      <Aviso texto={msg?.t} tipo={msg?.tipo} />
      <ErroCarga erro={erro} tentar={recarregar} />
      <View style={{ height: 10 }} />
      {carregando && !dados ? <Carregando /> : (dados ?? []).length === 0 ? <Vazio texto="Nenhum anúncio." /> :
        (dados ?? []).map((a: any) => (
          <Cartao key={a.id} onPress={() => editar(a)} style={!a.ativo ? { opacity: 0.6 } : undefined}>
            <Text style={[est.texto, { fontWeight: "700" }]}>{a.titulo}</Text>
            <Text style={est.textoSuave}>{a.anunciante} · {a.publico === "gratis" ? "só plano grátis" : "todos"}{a.fim ? ` · até ${br(a.fim)}` : ""}</Text>
            <Text style={est.texto}>Vezes visto: {a.impressoes} · Toques: {a.cliques}</Text>
            <Botao titulo={a.ativo ? "Pausar" : "Ativar"} tipo="leve" icone={a.ativo ? "pause-circle-outline" : "play-circle-outline"} onPress={async () => {
              const { error } = await supabase.from("anuncios").update({ ativo: !a.ativo }).eq("id", a.id);
              if (error) return setMsg({ t: mensagemErro(error), tipo: "erro" });
              recarregar();
            }} />
          </Cartao>
        ))}
    </Tela>
  );
}

// ---------- Dicas ----------
export function AdminDicas() {
  const [form, setForm] = useState<any | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tipo: "ok" | "erro" } | null>(null);
  const { dados, carregando, erro, recarregar } = useCarga(async () => ok(await supabase.from("dicas").select("*").order("ordem").order("created_at")) ?? []);

  async function salvar() {
    setMsg(null);
    if (!form.titulo.trim() || !form.texto.trim()) return setMsg({ t: "Preencha o título e o texto.", tipo: "erro" });
    if (ocupado) return;
    setOcupado(true);
    const linha = { titulo: form.titulo.trim(), texto: form.texto.trim(), fonte: form.fonte?.trim() || null };
    const res = form.id ? await supabase.from("dicas").update(linha).eq("id", form.id)
      : await supabase.from("dicas").insert({ ...linha, ordem: (dados?.length ?? 0) + 1 });
    setOcupado(false);
    if (res.error) return setMsg({ t: mensagemErro(res.error), tipo: "erro" });
    setForm(null); recarregar();
  }

  if (form) {
    return (
      <Tela titulo={form.id ? "Editar dica" : "Nova dica"}>
        <Campo rotulo="Título" value={form.titulo} onChangeText={(t) => setForm({ ...form, titulo: t })} />
        <Campo rotulo="Texto" value={form.texto} onChangeText={(t) => setForm({ ...form, texto: t })} multiline
          dica="Evite indicar remédio ou dose: isso é com o veterinário." />
        <Campo rotulo="Fonte (opcional)" value={form.fonte ?? ""} onChangeText={(t) => setForm({ ...form, fonte: t })} />
        <Aviso texto={msg?.t} tipo={msg?.tipo} />
        <Botao titulo="Guardar dica" icone="check" onPress={salvar} carregando={ocupado} />
        {form.id && <BotaoConfirmar titulo="Apagar dica" onConfirmar={async () => {
          const { error } = await supabase.from("dicas").delete().eq("id", form.id);
          if (error) return setMsg({ t: mensagemErro(error), tipo: "erro" });
          setForm(null); recarregar();
        }} />}
        <Pressable onPress={() => setForm(null)} style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: cor.couro, fontSize: tam.texto, fontWeight: "700" }}>Cancelar</Text>
        </Pressable>
      </Tela>
    );
  }

  return (
    <Tela titulo="Dicas" voltar subtitulo="Toque numa dica para editar.">
      <Botao titulo="Nova dica" icone="plus-circle" onPress={() => { setMsg(null); setForm({ titulo: "", texto: "", fonte: "" }); }} />
      <ErroCarga erro={erro} tentar={recarregar} />
      <View style={{ height: 10 }} />
      {carregando && !dados ? <Carregando /> : (dados ?? []).map((d: any) => (
        <Cartao key={d.id} onPress={() => { setMsg(null); setForm(d); }} style={!d.ativo ? { opacity: 0.6 } : undefined}>
          <Text style={[est.texto, { fontWeight: "700" }]}>{d.titulo}</Text>
          <Text style={est.textoSuave} numberOfLines={2}>{d.texto}</Text>
          <Botao titulo={d.ativo ? "Esconder" : "Mostrar"} tipo="leve" icone={d.ativo ? "eye-off-outline" : "eye-outline"} onPress={async () => {
            const { error } = await supabase.from("dicas").update({ ativo: !d.ativo }).eq("id", d.id);
            if (error) return setMsg({ t: mensagemErro(error), tipo: "erro" });
            recarregar();
          }} />
        </Cartao>
      ))}
      <Aviso texto={msg?.t} tipo={msg?.tipo} />
    </Tela>
  );
}

// ---------- Diagnóstico: chaves configuradas no servidor (sem mostrar as chaves) ----------
export function AdminDiagnostico() {
  const [r, setR] = useState<Record<string, any> | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  async function rodar(op: Record<string, boolean>, nome: string) {
    setOcupado(nome); setErro(null);
    const { data, erro: e } = await chamarFuncao<Record<string, any>>("diagnostico", op);
    setOcupado(null);
    if (e) return setErro(e);
    setR(data ?? null);
  }
  useEffect(() => { rodar({}, "ver"); }, []);
  const linha = (t: string, okv: any) => (
    <View key={t} style={[est.entre, { paddingVertical: 8, borderBottomWidth: 1, borderColor: cor.linha }]}>
      <Text style={[est.texto, { flex: 1 }]}>{t}</Text>
      <Icone nome={okv ? "check-circle" : "close-circle-outline"} cor={okv ? cor.mata : cor.barro} />
    </View>
  );
  return (
    <Tela titulo="Diagnóstico" voltar subtitulo="Mostra só se cada chave existe no Supabase. As chaves nunca aparecem aqui.">
      <Aviso texto={erro} tipo="erro" />
      {r && (
        <Cartao>
          {linha("IA do app (ANTHROPIC_API_KEY)", r.ia_do_app)}
          {linha("E-mail: chave do Brevo (BREVO_API_KEY)", r.email_brevo || r.email_resend)}
          {linha("E-mail remetente (EMAIL_REMETENTE)", r.email_remetente)}
          {linha("Pagamentos (STRIPE_SECRET_KEY)", r.stripe)}
          {linha("Aviso de pagamento (STRIPE_WEBHOOK_SECRET)", r.stripe_webhook)}
        </Cartao>
      )}
      {r?.teste_ia && <Aviso texto={`Teste da IA: ${r.teste_ia === "ok" ? "funcionou!" : r.teste_ia}`} tipo={r.teste_ia === "ok" ? "ok" : "erro"} />}
      {r?.teste_email && <Aviso texto={`Teste de e-mail: ${String(r.teste_email).startsWith("ok") ? `funcionou! ${r.teste_email.slice(3)}` : r.teste_email}`} tipo={String(r.teste_email).startsWith("ok") ? "ok" : "erro"} />}
      <Botao titulo="Testar a IA" icone="robot-outline" onPress={() => rodar({ testar_ia: true }, "ia")} carregando={ocupado === "ia"} />
      <Botao titulo="Mandar e-mail de teste" icone="email-fast-outline" tipo="leve" onPress={() => rodar({ testar_email: true }, "email")} carregando={ocupado === "email"} />
    </Tela>
  );
}
