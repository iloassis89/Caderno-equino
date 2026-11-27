// Suporte: chat privado (só a pessoa e o administrador veem). A IA faz a triagem; o atendente responde em até 48h.
import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { chamarFuncao, mensagemErro, supabase } from "../supabase";
import { ok, useCarga } from "../dados";
import { Aviso, Botao, BotaoConfirmar, Cabecalho, Campo, Carregando, Cartao, ErroCarga, Escolha, Icone, Tela, Vazio, useNav } from "../ui";
import { br } from "../datas";
import { reais } from "../constantes";
import { cor, est, tam } from "../tema";

export const ASSUNTOS = [
  { valor: "duvida", rotulo: "Tirar uma dúvida", icone: "help-circle-outline" },
  { valor: "problema", rotulo: "Problema no app", icone: "alert-circle-outline" },
  { valor: "anuncio", rotulo: "Quero anunciar", icone: "bullhorn-outline" },
  { valor: "sugestao", rotulo: "Dar uma sugestão", icone: "lightbulb-on-outline" },
  { valor: "afiliado", rotulo: "Quero ser parceiro", icone: "handshake-outline" },
  { valor: "venda", rotulo: "Compra ou venda", icone: "cart-outline" },
  { valor: "outro", rotulo: "Outro assunto", icone: "chat-outline" },
];
// mesma saudação do servidor, mostrada antes de a conversa existir
const BOAS_VINDAS: Record<string, string> = {
  duvida: "Olá! Qual é a sua dúvida? Pode perguntar sobre o app ou sobre os cuidados do dia a dia com o cavalo.",
  problema: "Sinto muito pelo problema. Conte o que aconteceu: em qual tela estava, o que tocou e o que apareceu.",
  anuncio: "Que bom que quer anunciar! Posso ver as vagas e os preços para você. É para qual empresa ou produto?",
  sugestao: "Adoramos sugestões! Escreva a sua ideia para melhorar o app.",
  afiliado: "Que bom que quer ser parceiro! Vou anotar seus dados para o dono do app avaliar. Qual é o seu nome e onde você divulga (Instagram, YouTube, loja…)?",
  venda: "Certo! Conte o que você quer comprar ou vender, e eu anoto para o dono do app avaliar.",
  outro: "Olá! Conte como posso ajudar.",
};
const nomeAssunto = (a: string) => ASSUNTOS.find((x) => x.valor === a)?.rotulo ?? "Outro assunto";

const SITUACAO: Record<string, { t: string; c: string }> = {
  ia: { t: "Com o assistente", c: cor.mata },
  aguardando_atendente: { t: "Aguardando resposta", c: cor.barro },
  respondida: { t: "Respondida", c: cor.mata },
  encerrada: { t: "Encerrada", c: cor.tintaSuave },
};

const dataHora = (iso: string) => {
  const d = new Date(iso);
  return `${br(iso.slice(0, 10))} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Etiqueta({ status }: { status: string }) {
  const s = SITUACAO[status] ?? SITUACAO.encerrada;
  return <Text style={{ color: s.c, fontWeight: "700", fontSize: 15 }}>{s.t}</Text>;
}

function Ponto() {
  return <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: cor.couro }} />;
}

// ---------- Lista de atendimentos da pessoa ----------
export function Suporte() {
  const nav = useNav();
  const lista = useCarga(async () => {
    const { data: u } = await supabase.auth.getUser();
    return ok(await supabase.from("suporte_conversas").select("id,protocolo,assunto,status,nao_lida_usuario,updated_at")
      .eq("user_id", u.user?.id ?? "").order("updated_at", { ascending: false }).limit(30)) ?? [];
  });

  return (
    <Tela titulo="Suporte" voltar subtitulo="Conversa particular: só você e o atendimento do IAS Horse veem.">
      <Cabecalho texto="Sobre o que você quer falar?" />
      {ASSUNTOS.map((a) => (
        <Cartao key={a.valor} onPress={() => nav.ir("SuporteConversa", { assunto: a.valor })}>
          <View style={[est.linha, { gap: 12 }]}>
            <Icone nome={a.icone} tamanho={30} cor={cor.mata} />
            <Text style={[est.texto, { flex: 1, fontWeight: "700" }]}>{a.rotulo}</Text>
            <Icone nome="chevron-right" tamanho={28} cor={cor.tintaSuave} />
          </View>
        </Cartao>
      ))}
      <Text style={[est.textoSuave, { marginVertical: 6 }]}>
        Primeiro um assistente tenta resolver na hora. Se precisar, ele passa para uma pessoa, que responde aqui em até 48 horas.
      </Text>

      <Cabecalho texto="Seus atendimentos" />
      <ErroCarga erro={lista.erro} tentar={lista.recarregar} />
      {lista.carregando && !lista.dados ? <Carregando /> : (lista.dados ?? []).length === 0 ? <Vazio texto="Você ainda não abriu nenhum atendimento." /> :
        (lista.dados ?? []).map((c: any) => (
          <Cartao key={c.id} onPress={() => nav.ir("SuporteConversa", { id: c.id })}>
            <View style={[est.linha, { gap: 10 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[est.texto, { fontWeight: "700" }]}>{nomeAssunto(c.assunto)}</Text>
                <Text style={est.textoSuave}>Protocolo {c.protocolo} · {dataHora(c.updated_at)}</Text>
                <Etiqueta status={c.status} />
              </View>
              {c.nao_lida_usuario && <Ponto />}
              <Icone nome="chevron-right" tamanho={28} cor={cor.tintaSuave} />
            </View>
          </Cartao>
        ))}
    </Tela>
  );
}

// ---------- Mensagens (balões) ----------
const AUTOR: Record<string, { nome: string; icone: string }> = {
  ia: { nome: "Assistente", icone: "horse-variant" },
  atendente: { nome: "Atendimento IAS Horse", icone: "account-tie" },
  sistema: { nome: "Aviso", icone: "information-outline" },
};

function Baloes({ msgs, lado }: { msgs: any[]; lado: "usuario" | "admin" }) {
  return (
    <>
      {msgs.map((m) => {
        const minha = lado === "usuario" ? m.autor === "usuario" : m.autor === "atendente";
        const sistema = m.autor === "sistema";
        const autor = lado === "admin" && m.autor === "usuario" ? { nome: "Cliente", icone: "account" } : AUTOR[m.autor];
        return (
          <View key={m.id} style={{
            alignSelf: sistema ? "stretch" : minha ? "flex-end" : "flex-start", maxWidth: sistema ? "100%" : "90%", marginVertical: 6,
            backgroundColor: sistema ? "#FFF6E0" : minha ? cor.mata : cor.cartao, borderRadius: 14, padding: 12,
            borderWidth: minha ? 0 : 1, borderColor: cor.linha,
          }}>
            {!minha && autor && (
              <View style={[est.linha, { gap: 6, marginBottom: 4 }]}>
                <Icone nome={autor.icone} tamanho={18} cor={cor.mata} />
                <Text style={{ color: cor.mata, fontWeight: "700", fontSize: 14 }}>{autor.nome}</Text>
              </View>
            )}
            <Text style={{ color: minha ? cor.branco : cor.tinta, fontSize: tam.texto, lineHeight: 26 }}>{m.texto}</Text>
            <Text style={{ color: minha ? "#DDE6D6" : cor.tintaSuave, fontSize: 12, marginTop: 4 }}>{dataHora(m.created_at)}</Text>
          </View>
        );
      })}
    </>
  );
}

function useConversa(id: string | null, lado: "usuario" | "admin") {
  const [conv, setConv] = useState<any | null>(null);
  const [naoAchou, setNaoAchou] = useState(false);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const pedido = useRef(0);
  async function carregar() {
    if (!id) return;
    const n = ++pedido.current;
    const [c, m] = await Promise.all([
      supabase.from("suporte_conversas").select("*").eq("id", id).maybeSingle(),
      supabase.from("suporte_mensagens").select("id,autor,texto,created_at").eq("conversa_id", id).order("id").limit(200),
    ]);
    if (n !== pedido.current) return;
    if (c.error || m.error) return setErro(mensagemErro(c.error ?? m.error));
    setErro(null);
    setNaoAchou(!c.data);
    setConv(c.data);
    setMsgs(m.data ?? []);
    if (c.data && (lado === "usuario" ? c.data.nao_lida_usuario : c.data.nao_lida_admin)) {
      supabase.rpc("marcar_suporte_lido", { p_conversa: id }).then(() => {});
    }
  }
  useEffect(() => {
    if (!id) return;
    carregar();
    const t = setInterval(carregar, 20000); // procura respostas novas enquanto a tela está aberta
    return () => clearInterval(t);
  }, [id]);
  return { conv, msgs, erro, carregar, naoAchou };
}

// ---------- Conversa da pessoa ----------
// Sem id: rascunho. A conversa só é criada quando a pessoa manda a primeira mensagem.
export function SuporteConversa({ id: idInicial, assunto }: { id?: string; assunto?: string }) {
  const [id, setId] = useState<string | null>(idInicial ?? null);
  const { conv, msgs, erro, carregar, naoAchou } = useConversa(id, "usuario");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pendente, setPendente] = useState<string | null>(null);
  const [falha, setFalha] = useState<string | null>(null);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setFalha(null);
    setEnviando(true);
    setPendente(t);
    setTexto("");
    const corpo = id ? { conversa_id: id, texto: t } : { acao: "abrir", assunto: assunto ?? "outro", texto: t };
    const { data, erro: e } = await chamarFuncao<{ conversa_id?: string }>("suporte", corpo);
    setEnviando(false);
    setPendente(null);
    if (e) { setTexto(t); setFalha(e); return; }
    if (!id && data?.conversa_id) setId(data.conversa_id); else carregar();
  }

  async function atendente() {
    if (enviando || !id) return;
    setFalha(null);
    setEnviando(true);
    const { erro: e } = await chamarFuncao("suporte", { conversa_id: id, acao: "atendente" });
    setEnviando(false);
    if (e) setFalha(e);
    carregar();
  }

  if (id && !conv) {
    return (
      <Tela titulo="Suporte" voltar>
        {naoAchou ? <Vazio texto="Conversa não encontrada." /> : erro ? <ErroCarga erro={erro} tentar={carregar} /> : <Carregando />}
      </Tela>
    );
  }
  const assuntoAtual = conv?.assunto ?? assunto ?? "outro";
  const status = conv?.status ?? "ia";
  const lista = conv ? msgs : [{ id: 0, autor: "ia", texto: BOAS_VINDAS[assuntoAtual] ?? BOAS_VINDAS.outro, created_at: new Date().toISOString() }];
  const mostrar = pendente ? [...lista, { id: -1, autor: "usuario", texto: pendente, created_at: new Date().toISOString() }] : lista;
  return (
    <Tela titulo={nomeAssunto(assuntoAtual)} voltar rolarFim={mostrar.length + (enviando ? 1 : 0)} subtitulo={conv ? `Protocolo ${conv.protocolo}` : "Conversa particular"}>
      {status === "aguardando_atendente" && (
        <Aviso texto={`Sua conversa está com o atendimento. A resposta chega aqui${conv?.prazo_resposta ? ` até ${dataHora(conv.prazo_resposta)}` : " em até 48 horas"}. Pode fechar o app; quando chegar, aparece um aviso no Início.`} />
      )}
      {assuntoAtual === "duvida" && status === "ia" && <Aviso texto="Em caso de urgência (cólica, sangramento, animal caído), ligue para o veterinário agora." />}
      <Baloes msgs={mostrar} lado="usuario" />
      {enviando && <Text style={[est.textoSuave, { marginVertical: 8 }]}>{status === "ia" ? "O assistente está escrevendo…" : "Enviando…"}</Text>}
      <Aviso texto={falha} tipo="erro" />
      <Campo rotulo="Sua mensagem" value={texto} onChangeText={setTexto} multiline placeholder="Escreva aqui" />
      <Botao titulo="Enviar" icone="send" onPress={enviar} carregando={enviando} desativado={!texto.trim()} />
      {id && status === "ia" && <Botao titulo="Falar com uma pessoa (até 48h)" tipo="leve" icone="account-tie" onPress={atendente} desativado={enviando} />}
      <Text style={[est.textoSuave, { marginTop: 8, fontSize: 13 }]}>
        O assistente usa inteligência artificial e pode errar. Nada aqui é público. O assistente não dá diagnóstico nem indica remédio.
      </Text>
    </Tela>
  );
}

// =================== Administração ===================

export function AdminSuporte() {
  const nav = useNav();
  const [filtro, setFiltro] = useState<string | null>("abertas");
  const lista = useCarga(async () => {
    let q = supabase.from("suporte_conversas").select("id,protocolo,assunto,status,resumo,nao_lida_admin,prazo_resposta,updated_at").order("updated_at", { ascending: false }).limit(60);
    if (filtro === "abertas") q = q.in("status", ["aguardando_atendente"]);
    return ok(await q) ?? [];
  }, [filtro]);
  return (
    <Tela titulo="Suporte" voltar subtitulo="Conversas dos clientes. Sua resposta aparece no chat deles.">
      <Escolha rotulo="Mostrar" valor={filtro} aoEscolher={setFiltro} colunas={2}
        opcoes={[{ valor: "abertas", rotulo: "Esperando você" }, { valor: "todas", rotulo: "Todas" }]} />
      <ErroCarga erro={lista.erro} tentar={lista.recarregar} />
      {lista.carregando && !lista.dados ? <Carregando /> : (lista.dados ?? []).length === 0 ? <Vazio texto={filtro === "abertas" ? "Nada esperando resposta." : "Nenhuma conversa ainda."} /> :
        (lista.dados ?? []).map((c: any) => {
          const atrasada = c.status === "aguardando_atendente" && c.prazo_resposta && new Date(c.prazo_resposta) < new Date();
          return (
            <Cartao key={c.id} onPress={() => nav.ir("AdminConversa", { id: c.id })}>
              <View style={[est.linha, { gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[est.texto, { fontWeight: "700" }]}>{nomeAssunto(c.assunto)}</Text>
                  <Text style={est.textoSuave}>{c.protocolo} · {dataHora(c.updated_at)}</Text>
                  {!!c.resumo && <Text style={est.textoSuave} numberOfLines={2}>{c.resumo}</Text>}
                  <Etiqueta status={c.status} />
                  {atrasada && <Text style={{ color: cor.barro, fontWeight: "700" }}>Passou das 48 horas</Text>}
                </View>
                {c.nao_lida_admin && <Ponto />}
                <Icone nome="chevron-right" tamanho={28} cor={cor.tintaSuave} />
              </View>
            </Cartao>
          );
        })}
    </Tela>
  );
}

export function AdminConversa({ id }: { id: string }) {
  const { conv, msgs, erro, carregar, naoAchou } = useConversa(id, "admin");
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tipo: "ok" | "erro" } | null>(null);
  const extras = useCarga(async () => {
    const [a, p, u] = await Promise.all([
      supabase.from("anuncio_pedidos").select("*").eq("conversa_id", id),
      supabase.from("pedidos_autorizacao").select("*").eq("conversa_id", id),
      supabase.rpc("email_do_cliente", { p_conversa: id }),
    ]);
    return { anuncios: a.data ?? [], pedidos: p.data ?? [], email: (u.data as string | null) ?? null };
  }, [id]);

  async function responder(encerrar: boolean) {
    if (ocupado) return;
    setMsg(null);
    if (!texto.trim() && !encerrar) return setMsg({ t: "Escreva a resposta.", tipo: "erro" });
    setOcupado(true);
    const { error } = await supabase.rpc("responder_suporte", { p_conversa: id, p_texto: texto.trim() || "Atendimento encerrado. Se precisar, é só escrever de novo.", p_encerrar: encerrar });
    setOcupado(false);
    if (error) return setMsg({ t: mensagemErro(error), tipo: "erro" });
    setTexto("");
    setMsg({ t: "Resposta enviada para o chat do cliente.", tipo: "ok" });
    carregar();
  }

  if (!conv) return <Tela titulo="Conversa" voltar>{naoAchou ? <Vazio texto="Conversa não encontrada." /> : erro ? <ErroCarga erro={erro} tentar={carregar} /> : <Carregando />}</Tela>;
  return (
    <Tela titulo={nomeAssunto(conv.assunto)} voltar rolarFim={msgs.length} subtitulo={`${conv.protocolo}${extras.dados?.email ? ` · ${extras.dados.email}` : ""}`}>
      {(extras.dados?.anuncios ?? []).map((a: any) => <CartaoPedidoAnuncio key={a.id} p={a} aoMudar={() => { extras.recarregar(); carregar(); }} />)}
      {(extras.dados?.pedidos ?? []).map((p: any) => <CartaoPedidoAutorizacao key={p.id} p={p} aoMudar={() => { extras.recarregar(); carregar(); }} />)}
      <Baloes msgs={msgs} lado="admin" />
      <Campo rotulo="Sua resposta" value={texto} onChangeText={setTexto} multiline placeholder="Escreva aqui. O cliente vê no chat." />
      <Aviso texto={msg?.t} tipo={msg?.tipo} />
      <Botao titulo="Enviar resposta" icone="send" onPress={() => responder(false)} carregando={ocupado} />
      {conv.status !== "encerrada" && <Botao titulo="Responder e encerrar" tipo="leve" icone="check-circle-outline" onPress={() => responder(true)} desativado={ocupado} />}
    </Tela>
  );
}

// ---------- Pedidos que precisam da sua autorização (parceiro e vendas) ----------
function CartaoPedidoAutorizacao({ p, aoMudar }: { p: any; aoMudar: () => void }) {
  const [resposta, setResposta] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function decidir(aprovar: boolean) {
    if (ocupado) return;
    setOcupado(true);
    setMsg(null);
    const { error } = await supabase.rpc("decidir_pedido", { p_id: p.id, p_aprovar: aprovar, p_resposta: resposta });
    setOcupado(false);
    if (error) return setMsg(mensagemErro(error));
    aoMudar();
  }
  return (
    <Cartao>
      <Text style={[est.texto, { fontWeight: "700" }]}>{p.tipo === "afiliado" ? "Pedido de parceria" : "Pedido de compra/venda"}</Text>
      <Text style={est.texto}>{p.dados?.nome} · {p.dados?.contato}</Text>
      {!!p.dados?.detalhes && <Text style={est.textoSuave}>{p.dados.detalhes}</Text>}
      <Text style={est.textoSuave}>Conta: {p.dados?.email_conta ?? "—"} · {dataHora(p.created_at)}</Text>
      {p.status === "pendente" ? (
        <>
          <Campo rotulo="Mensagem para a pessoa (opcional)" value={resposta} onChangeText={setResposta} multiline />
          <Aviso texto={msg} tipo="erro" />
          <Botao titulo="Aprovar" icone="check" onPress={() => decidir(true)} carregando={ocupado} />
          <Botao titulo="Recusar" tipo="leve" icone="close" onPress={() => decidir(false)} desativado={ocupado} />
          {p.tipo === "afiliado" && <Text style={est.textoSuave}>Depois de aprovar, cadastre o cupom do parceiro (veja o LEIA-ME).</Text>}
        </>
      ) : (
        <Text style={{ fontWeight: "700", color: p.status === "aprovado" ? cor.mata : cor.tintaSuave }}>
          {p.status === "aprovado" ? "Aprovado" : "Recusado"}{p.resposta ? ` — ${p.resposta}` : ""}
        </Text>
      )}
    </Cartao>
  );
}

export function AdminPedidos() {
  const lista = useCarga(async () => ok(await supabase.from("pedidos_autorizacao").select("*").order("created_at", { ascending: false }).limit(60)) ?? []);
  const pendentes = (lista.dados ?? []).filter((p: any) => p.status === "pendente");
  const outros = (lista.dados ?? []).filter((p: any) => p.status !== "pendente");
  return (
    <Tela titulo="Pedidos para autorizar" voltar subtitulo="Parcerias (afiliados) e compras/vendas só valem com o seu sim.">
      <ErroCarga erro={lista.erro} tentar={lista.recarregar} />
      {lista.carregando && !lista.dados ? <Carregando /> : (
        <>
          {pendentes.length === 0 ? <Vazio texto="Nenhum pedido esperando." /> : pendentes.map((p: any) => <CartaoPedidoAutorizacao key={p.id} p={p} aoMudar={lista.recarregar} />)}
          {outros.length > 0 && <Cabecalho texto="Já decididos" />}
          {outros.map((p: any) => <CartaoPedidoAutorizacao key={p.id} p={p} aoMudar={lista.recarregar} />)}
        </>
      )}
    </Tela>
  );
}

// ---------- Pedidos de anúncio e fila de espera ----------
const STATUS_ANUNCIO: Record<string, string> = {
  reservado: "Vaga reservada (vence em 7 dias)", fila: "Fila de espera", aguardando_pagamento: "Link de pagamento enviado",
  pago: "Pago — falta criar o anúncio", publicado: "No ar", cancelado: "Encerrado",
};
const PROXIMO: Record<string, { status: string; titulo: string; msg: string }[]> = {
  reservado: [{ status: "aguardando_pagamento", titulo: "Já enviei o link de pagamento", msg: "Enviamos o link de pagamento para o seu e-mail. Assim que pagar, avise aqui." }],
  aguardando_pagamento: [{ status: "pago", titulo: "Pagamento recebido", msg: "Pagamento recebido, obrigado! Agora mande aqui a imagem (ou o texto) e o link do anúncio." }],
};

function CartaoPedidoAnuncio({ p, aoMudar }: { p: any; aoMudar: () => void }) {
  const nav = useNav();
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function mudar(status: string, texto: string) {
    if (ocupado) return;
    setOcupado(true);
    setMsg(null);
    const { error } = await supabase.rpc("atualizar_pedido_anuncio", { p_id: p.id, p_status: status, p_mensagem: texto });
    setOcupado(false);
    if (error) return setMsg(mensagemErro(error));
    aoMudar();
  }
  return (
    <Cartao>
      <Text style={[est.texto, { fontWeight: "700" }]}>{p.anunciante}</Text>
      <Text style={est.texto}>{STATUS_ANUNCIO[p.status]}{p.observacao ? ` (${p.observacao})` : ""} · {reais(p.valor_centavos)}</Text>
      <Text style={est.textoSuave}>
        {p.quantidade} {p.periodo === "mes" ? (p.quantidade > 1 ? "meses" : "mês") : (p.quantidade > 1 ? "semanas" : "semana")} · {p.responsavel}{p.documento ? ` (${p.documento})` : ""}
      </Text>
      <Text style={est.textoSuave}>{p.telefone} · {p.email}{p.cidade ? ` · ${p.cidade}` : ""}</Text>
      <Text style={est.textoSuave}>Pedido em {dataHora(p.created_at)}</Text>
      <Aviso texto={msg} tipo="erro" />
      {(PROXIMO[p.status] ?? []).map((a) => <Botao key={a.status} titulo={a.titulo} icone="arrow-right" onPress={() => mudar(a.status, a.msg)} carregando={ocupado} />)}
      {p.status === "pago" && <Botao titulo="Criar o anúncio" icone="bullhorn-outline" onPress={() => nav.ir("AdminAnuncios", { pedido: p })} />}
      {p.status === "publicado" && <Text style={est.textoSuave}>Quando o anúncio passar da data final (ou for pausado), a vaga se libera e o próximo da fila é avisado.</Text>}
      {p.status === "fila" && <Text style={est.textoSuave}>Quando uma vaga for liberada, o primeiro da fila vira "reservado" sozinho e recebe aviso no chat.</Text>}
      {["reservado", "fila", "aguardando_pagamento", "pago"].includes(p.status) && (
        <BotaoConfirmar titulo="Cancelar pedido" icone="close-circle-outline" carregando={ocupado}
          onConfirmar={() => mudar("cancelado", "Seu pedido de anúncio foi cancelado. Se quiser, é só escrever aqui de novo.")} />
      )}
    </Cartao>
  );
}

export function AdminPedidosAnuncio() {
  const nav = useNav();
  const [filtro, setFiltro] = useState<string | null>("andamento");
  const vagas = useCarga(async () => {
    await supabase.rpc("arrumar_vagas_anuncio"); // sobe a fila e vence reservas paradas
    return (ok(await supabase.rpc("situacao_vagas_anuncio")) as any[])?.[0] ?? null;
  });
  const lista = useCarga(async () => {
    let q = supabase.from("anuncio_pedidos").select("*").order("created_at").limit(100);
    if (filtro === "andamento") q = q.in("status", ["reservado", "fila", "aguardando_pagamento", "pago", "publicado"]);
    return ok(await q) ?? [];
  }, [filtro]);
  const v = vagas.dados;
  return (
    <Tela titulo="Vendas de anúncio" voltar subtitulo="Pedidos feitos pelo chat do suporte. O link de pagamento você envia por e-mail.">
      {v && (
        <Cartao>
          <Text style={[est.texto, { fontWeight: "700" }]}>Vagas: {v.livres} livre(s) de {v.vagas}</Text>
          <Text style={est.textoSuave}>Na fila de espera: {v.na_fila} · {reais(v.preco_semana)}/semana · {reais(v.preco_mes)}/mês</Text>
          <Text style={est.textoSuave}>Preços e número de vagas: Administração → Configurações.</Text>
        </Cartao>
      )}
      <Escolha rotulo="Mostrar" valor={filtro} aoEscolher={setFiltro} colunas={2}
        opcoes={[{ valor: "andamento", rotulo: "Em andamento" }, { valor: "todos", rotulo: "Todos" }]} />
      <ErroCarga erro={lista.erro} tentar={lista.recarregar} />
      {lista.carregando && !lista.dados ? <Carregando /> : (lista.dados ?? []).length === 0 ? <Vazio texto="Nenhum pedido de anúncio." /> :
        (lista.dados ?? []).map((p: any) => (
          <View key={p.id}>
            <CartaoPedidoAnuncio p={p} aoMudar={() => { lista.recarregar(); vagas.recarregar(); }} />
            {p.conversa_id && <Botao titulo="Abrir a conversa" tipo="leve" icone="chat-outline" onPress={() => nav.ir("AdminConversa", { id: p.conversa_id })} />}
          </View>
        ))}
    </Tela>
  );
}

// ---------- Configurações: e-mail de avisos, administradores, preços ----------
export function AdminConfig() {
  const [email, setEmail] = useState("");
  const [vagas, setVagas] = useState("");
  const [semana, setSemana] = useState("");
  const [mes, setMes] = useState("");
  const [novoAdmin, setNovoAdmin] = useState("");
  const [msg, setMsg] = useState<{ t: string; tipo: "ok" | "erro" } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const cfg = useCarga(async () => {
    const linhas = ok(await supabase.from("configuracoes").select("chave,valor")) ?? [];
    const m: Record<string, any> = {};
    for (const l of linhas as any[]) m[l.chave] = l.valor;
    return m;
  });
  const admins = useCarga(async () => (ok(await supabase.rpc("listar_admins")) as any[] ?? []).map((a) => a.email as string));
  useEffect(() => {
    const c = cfg.dados;
    if (!c) return;
    setEmail(c.email_avisos ?? "");
    setVagas(String(c.anuncio_vagas ?? 3));
    setSemana(((c.anuncio_preco_semana_centavos ?? 4900) / 100).toFixed(2).replace(".", ","));
    setMes(((c.anuncio_preco_mes_centavos ?? 14900) / 100).toFixed(2).replace(".", ","));
  }, [cfg.dados]);

  const emailValido = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());
  // aceita "49", "49,00", "49.00", "1.490,00" e "1,490.00"
  const centavos = (t: string) => {
    let v = t.trim().replace(/\s|R\$/g, "");
    const m = v.match(/^(.*)[.,](\d{1,2})$/);
    v = m ? `${m[1].replace(/[.,]/g, "")}.${m[2]}` : v.replace(/[.,]/g, "");
    const n = Number(v);
    return v !== "" && Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
  };

  async function salvar() {
    if (ocupado) return;
    setMsg(null);
    if (!emailValido(email)) return setMsg({ t: "E-mail de avisos inválido.", tipo: "erro" });
    const nv = Number(vagas);
    if (!vagas.trim() || !Number.isInteger(nv) || nv < 0 || nv > 20) return setMsg({ t: "Número de vagas deve ser de 0 a 20.", tipo: "erro" });
    const cs = centavos(semana), cm = centavos(mes);
    if (!cs || !cm) return setMsg({ t: "Preencha os preços (ex.: 49,00).", tipo: "erro" });
    setOcupado(true);
    const { error } = await supabase.rpc("salvar_configuracoes", { p_email: email.trim(), p_vagas: nv, p_semana: cs, p_mes: cm });
    setOcupado(false);
    if (error) return setMsg({ t: mensagemErro(error), tipo: "erro" });
    setMsg({ t: `Guardado: ${nv} vaga(s), ${reais(cs)} por semana e ${reais(cm)} por mês. Avisos para ${email.trim().toLowerCase()}.`, tipo: "ok" });
    cfg.recarregar();
  }

  async function adicionarAdmin() {
    setMsg(null);
    if (!emailValido(novoAdmin)) return setMsg({ t: "E-mail inválido.", tipo: "erro" });
    const { error } = await supabase.rpc("adicionar_admin", { p_email: novoAdmin.trim() });
    if (error) return setMsg({ t: mensagemErro(error), tipo: "erro" });
    setNovoAdmin("");
    setMsg({ t: "Administrador adicionado. Ele precisa ter conta com esse e-mail confirmado.", tipo: "ok" });
    admins.recarregar();
  }

  if (cfg.carregando && !cfg.dados) return <Tela titulo="Configurações" voltar><Carregando /></Tela>;
  return (
    <Tela titulo="Configurações" voltar>
      <ErroCarga erro={cfg.erro} tentar={cfg.recarregar} />
      <Cabecalho texto="Onde chegam os avisos" />
      <Campo rotulo="E-mail de avisos" dica="Mensagens do suporte, pedidos e anúncios chegam aqui." value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Cabecalho texto="Anúncios" />
      <Campo rotulo="Vagas ao mesmo tempo" value={vagas} onChangeText={setVagas} keyboardType="number-pad" />
      <Campo rotulo="Preço por semana (R$)" value={semana} onChangeText={setSemana} keyboardType="decimal-pad" />
      <Campo rotulo="Preço por mês (R$)" value={mes} onChangeText={setMes} keyboardType="decimal-pad" />
      <Aviso texto={msg?.t} tipo={msg?.tipo} />
      <Botao titulo="Guardar configurações" icone="content-save-outline" onPress={salvar} carregando={ocupado} />

      <Cabecalho texto="Quem pode entrar na Administração" />
      <ErroCarga erro={admins.erro} tentar={admins.recarregar} />
      {(admins.dados ?? []).map((e) => (
        <Cartao key={e}>
          <Text style={[est.texto, { fontWeight: "700" }]}>{e}</Text>
          {(admins.dados ?? []).length > 1 && (
            <BotaoConfirmar titulo="Tirar da administração" icone="account-remove-outline" onConfirmar={async () => {
              const { error } = await supabase.rpc("remover_admin", { p_email: e });
              if (error) return setMsg({ t: mensagemErro(error), tipo: "erro" });
              admins.recarregar();
            }} />
          )}
        </Cartao>
      ))}
      <Campo rotulo="Adicionar administrador (e-mail)" value={novoAdmin} onChangeText={setNovoAdmin} keyboardType="email-address" autoCapitalize="none" />
      <Botao titulo="Adicionar" tipo="secundario" icone="account-plus-outline" onPress={adicionarAdmin} />
    </Tela>
  );
}
