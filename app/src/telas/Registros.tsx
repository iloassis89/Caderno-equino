import React, { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { supabase, mensagemErro } from "../supabase";
import { carregarAnimais, DIAS_HISTORICO_GRATIS, useCarga } from "../dados";
import {
  Aviso, Bloqueado, Botao, Cabecalho, Campo, Carregando, Cartao, Escolha, Icone, Rotulado, Selo, Tela, Vazio, useNav, usePlano,
} from "../ui";
import { CATEGORIAS, STATUS, iconeCategoria, lerNumero, numBR, rotuloCategoria } from "../constantes";
import { br, hojeISO, mascaraData, paraISO, somarDias } from "../datas";
import { pesoPelaFita } from "../nutricao";
import { Anexos, FotoAnimal } from "../anexos";
import { enviarPdf, enviarWhatsApp } from "../relatorio";
import { cor, est, tam } from "../tema";

// ---------- Item de anotação ----------
export function ItemRegistro({ r, mostrarAnimal = true }: { r: any; mostrarAnimal?: boolean }) {
  const nav = useNav();
  return (
    <Cartao onPress={() => nav.ir("NovoRegistro", { registro: r })}>
      <View style={[est.linha, { gap: 10, alignItems: "flex-start" }]}>
        <Icone nome={iconeCategoria(r.categoria)} tamanho={30} cor={cor.mata} />
        <View style={{ flex: 1 }}>
          <Text style={[est.texto, { fontWeight: "700" }]}>
            {mostrarAnimal && r.animals?.nome ? `${r.animals.nome} · ` : ""}{rotuloCategoria(r.categoria)}
          </Text>
          <Text style={est.textoSuave}>{br(r.data)}{r.responsavel ? ` · ${r.responsavel}` : ""}</Text>
          <View style={{ marginVertical: 6 }}><Selo status={r.status} /></View>
          <Text style={est.texto}>{r.descricao}</Text>
          {r.peso_kg != null && <Rotulado rotulo="Peso" valor={`${numBR(Number(r.peso_kg))} kg`} />}
          {r.escore_corporal != null && <Rotulado rotulo="Escore corporal" valor={numBR(Number(r.escore_corporal))} />}
          <Rotulado rotulo="Próximo passo" valor={r.proximo_passo} />
        </View>
      </View>
    </Cartao>
  );
}

// ---------- Histórico com filtros ----------
export function Historico() {
  const { pago } = usePlano();
  const [animal, setAnimal] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<string | null>("30");
  const [status, setStatus] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [maisFiltros, setMaisFiltros] = useState(false);
  const periodos = pago
    ? [{ valor: "7", rotulo: "7 dias" }, { valor: "30", rotulo: "30 dias" }, { valor: "90", rotulo: "3 meses" }, { valor: "tudo", rotulo: "Tudo" }]
    : [{ valor: "7", rotulo: "7 dias" }, { valor: "30", rotulo: "30 dias" }];

  const animais = useCarga(() => carregarAnimais(false));
  const { dados, carregando } = useCarga(async () => {
    let q = supabase.from("records").select("*, animals(nome)").order("data", { ascending: false }).order("created_at", { ascending: false }).limit(300);
    if (animal) q = q.eq("animal_id", animal);
    if (categoria) q = q.eq("categoria", categoria);
    if (status) q = q.eq("status", status);
    const dias = !pago ? Math.min(Number(periodo ?? DIAS_HISTORICO_GRATIS), DIAS_HISTORICO_GRATIS) : periodo === "tudo" ? null : Number(periodo);
    if (dias) q = q.gte("data", somarDias(hojeISO(), -dias));
    const { data } = await q;
    return data ?? [];
  }, [animal, periodo, categoria, status, pago]);

  return (
    <Tela titulo="Histórico" subtitulo="Tudo o que foi anotado. Toque numa anotação para ver ou corrigir.">
      <Escolha rotulo="Animal" permitirVazio valor={animal} aoEscolher={setAnimal}
        opcoes={(animais.dados ?? []).map((a: any) => ({ valor: a.id, rotulo: a.nome, icone: "horse-variant" }))} />
      <Escolha rotulo="Período" valor={periodo} aoEscolher={setPeriodo} opcoes={periodos} />
      {!pago && <Text style={[est.textoSuave, { marginTop: -6, marginBottom: 10 }]}>No plano grátis aparecem os últimos 30 dias.</Text>}
      <Pressable onPress={() => setMaisFiltros((v) => !v)} style={{ minHeight: 44, justifyContent: "center" }} accessibilityRole="button">
        <Text style={{ color: cor.couro, fontSize: tam.texto, fontWeight: "700" }}>{maisFiltros ? "− Menos filtros" : "+ Filtrar por situação ou assunto"}</Text>
      </Pressable>
      {maisFiltros && (
        <>
          <Escolha rotulo="Situação" permitirVazio valor={status} aoEscolher={setStatus} opcoes={STATUS} />
          <Escolha rotulo="Assunto" permitirVazio valor={categoria} aoEscolher={setCategoria} opcoes={CATEGORIAS} colunas={2} />
        </>
      )}
      <Cabecalho texto={carregando ? "Carregando…" : `${dados?.length ?? 0} anotação(ões)`} />
      {carregando && !dados ? <Carregando /> : (dados ?? []).length === 0 ? <Vazio texto="Nenhuma anotação com esses filtros." /> :
        (dados ?? []).map((r: any) => <ItemRegistro key={r.id} r={r} />)}
    </Tela>
  );
}

// ---------- Enviar ao veterinário (PDF e WhatsApp) ----------
export function EnviarEspecialista({ animalId }: { animalId: string }) {
  const { pago } = usePlano();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  if (!pago) return <Bloqueado titulo="Enviar relatório em PDF ao veterinário" texto="O relatório em PDF e o envio pelo WhatsApp fazem parte dos planos pagos, a partir de R$ 9,90 por mês." />;
  async function pdf() {
    setErro(null); setOcupado("pdf");
    // na web, abre a janela antes de carregar, para o navegador não bloquear
    // @ts-ignore
    const janela = Platform.OS === "web" ? window.open("", "_blank") : undefined;
    try { await enviarPdf(animalId, janela); } catch (e: any) { setErro(mensagemErro(e)); } finally { setOcupado(null); }
  }
  async function zap() {
    setErro(null); setOcupado("zap");
    try { await enviarWhatsApp(animalId); } catch (e: any) { setErro(mensagemErro(e)); } finally { setOcupado(null); }
  }
  return (
    <View>
      <Botao titulo="Enviar relatório em PDF" icone="file-pdf-box" onPress={pdf} carregando={ocupado === "pdf"} />
      <Botao titulo="Mandar pelo WhatsApp" icone="whatsapp" tipo="secundario" onPress={zap} carregando={ocupado === "zap"} />
      <Aviso texto={erro} tipo="erro" />
    </View>
  );
}

// ---------- Nova anotação / editar ----------
export function NovoRegistro({ registro, animalId }: { registro?: any; animalId?: string }) {
  const nav = useNav();
  const { pago } = usePlano();
  const animais = useCarga(() => carregarAnimais(true));
  const [animal, setAnimal] = useState<string | null>(registro?.animal_id ?? animalId ?? null);
  const [data, setData] = useState(registro ? br(registro.data) : br(hojeISO()));
  const [categoria, setCategoria] = useState<string | null>(registro?.categoria ?? null);
  const [status, setStatus] = useState<string | null>(registro?.status ?? null);
  const [descricao, setDescricao] = useState(registro?.descricao ?? "");
  const [responsavel, setResponsavel] = useState(registro?.responsavel ?? "");
  const [evidencia, setEvidencia] = useState(registro?.evidencia ?? "");
  const [decisao, setDecisao] = useState(registro?.decisao_necessaria ?? "");
  const [proximo, setProximo] = useState(registro?.proximo_passo ?? "");
  const [peso, setPeso] = useState(registro?.peso_kg != null ? String(registro.peso_kg).replace(".", ",") : "");
  const [escore, setEscore] = useState(registro?.escore_corporal != null ? String(registro.escore_corporal).replace(".", ",") : "");
  const [perimetro, setPerimetro] = useState(registro?.medidas?.perimetro_toracico_cm ? String(registro.medidas.perimetro_toracico_cm) : "");
  const [comprimento, setComprimento] = useState(registro?.medidas?.comprimento_corpo_cm ? String(registro.medidas.comprimento_corpo_cm) : "");
  const [detalhes, setDetalhes] = useState(!!registro && !!(registro.responsavel || registro.evidencia || registro.decisao_necessaria || registro.proximo_passo));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<{ id: string; animalId: string } | null>(null);

  const ehPeso = categoria === "escore_peso_medidas";
  const listaAnimais = animais.dados ?? [];
  // com um animal só, ele já vem escolhido
  useEffect(() => {
    if (!animal && listaAnimais.length === 1) setAnimal(listaAnimais[0].id);
  }, [animal, listaAnimais]);

  function calcularFita() {
    const p = lerNumero(perimetro), c = lerNumero(comprimento);
    const kg = p && c ? pesoPelaFita(p, c) : null;
    if (!kg) return setErro("Informe o perímetro do peito e o comprimento do corpo, em centímetros.");
    setErro(null);
    setPeso(String(kg));
  }

  async function salvar() {
    setErro(null);
    if (!animal) return setErro("Escolha o animal.");
    if (!categoria) return setErro("Escolha o assunto (o que foi).");
    if (!status) return setErro("Escolha a situação: Feito, Vou fazer, Confirmar depois ou Chamar veterinário.");
    const dataISO = paraISO(data);
    if (!dataISO) return setErro("Data inválida. Use dia/mês/ano, por exemplo 05/12/2026.");
    if (!descricao.trim()) return setErro("Escreva em poucas palavras o que aconteceu ou o que foi feito.");
    const p = lerNumero(peso), e = lerNumero(escore);
    if (Number.isNaN(p) || (p != null && (p < 30 || p > 1500))) return setErro("Peso fora do normal. Confira o número (em kg).");
    if (Number.isNaN(e) || (e != null && (e < 1 || e > 9))) return setErro("O escore corporal vai de 1 a 9.");
    const pc = lerNumero(perimetro), cc = lerNumero(comprimento);
    const medidas = pc || cc ? { perimetro_toracico_cm: pc || null, comprimento_corpo_cm: cc || null } : null;

    setSalvando(true);
    const linha = {
      animal_id: animal, data: dataISO, categoria, status, descricao: descricao.trim(),
      responsavel: responsavel.trim() || null, evidencia: evidencia.trim() || null,
      decisao_necessaria: decisao.trim() || null, proximo_passo: proximo.trim() || null,
      peso_kg: p, escore_corporal: e, medidas,
    };
    const res = registro
      ? await supabase.from("records").update(linha).eq("id", registro.id).select("id").single()
      : await supabase.from("records").insert(linha).select("id").single();
    setSalvando(false);
    if (res.error) return setErro(mensagemErro(res.error));
    setSalvo({ id: res.data.id, animalId: animal });
  }

  // Depois de salvar: fotos da anotação e envio ao especialista
  if (salvo) {
    return (
      <Tela titulo="Anotação guardada" subtitulo="Se quiser, junte fotos ou envie a atualização para o veterinário.">
        <Cartao style={{ backgroundColor: cor.mataClara }}>
          <View style={[est.linha, { gap: 10 }]}>
            <Icone nome="check-circle-outline" tamanho={36} cor={cor.mata} />
            <Text style={[est.texto, { flex: 1, fontWeight: "700" }]}>Pronto. A anotação foi guardada.</Text>
          </View>
        </Cartao>
        <Cabecalho texto="Fotos desta anotação" />
        {pago ? <Anexos animalId={salvo.animalId} recordId={salvo.id} tipo="evidencia" vazio="Nenhuma foto. Use os botões abaixo." />
          : <Bloqueado titulo="Fotos nas anotações" />}
        <Cabecalho texto="Enviar ao veterinário" />
        <EnviarEspecialista animalId={salvo.animalId} />
        <Botao titulo="Concluir" tipo="leve" icone="check" onPress={nav.voltar} style={{ marginTop: 24 }} />
      </Tela>
    );
  }

  return (
    <Tela titulo={registro ? "Corrigir anotação" : "Anotar"} voltar={!!registro || !!animalId}
      subtitulo="Anote só o que viu ou fez. O que não sabe, deixe em branco.">
      <Escolha rotulo="1. Qual animal?" valor={animal} aoEscolher={setAnimal}
        opcoes={listaAnimais.map((a: any) => ({ valor: a.id, rotulo: a.nome, icone: "horse-variant" }))} />
      {animais.dados && listaAnimais.length === 0 && (
        <Cartao><Text style={est.texto}>Primeiro cadastre um animal.</Text><Botao titulo="Cadastrar animal" icone="plus-circle" onPress={() => nav.ir("NovoAnimal")} /></Cartao>
      )}
      <Escolha rotulo="2. Sobre o quê?" valor={categoria} aoEscolher={setCategoria} opcoes={CATEGORIAS} colunas={2} />
      <Escolha rotulo="3. Situação" valor={status} aoEscolher={setStatus} opcoes={STATUS} colunas={2} />
      {categoria === "sinal_avaliacao_profissional" && (
        <Aviso texto="Descreva o que viu. O app não dá diagnóstico nem indica remédio. Se for urgente, ligue para o veterinário agora." />
      )}
      {categoria === "medicamento_suplemento" && (
        <Aviso texto="Anote só o que já foi dado, com o nome e a dose que estão na receita ou na embalagem." />
      )}
      <Campo rotulo="4. O que aconteceu ou foi feito?" value={descricao} onChangeText={setDescricao} multiline
        placeholder="Ex.: comeu toda a ração da manhã" />
      <Campo rotulo="Dia" value={data} onChangeText={(t) => setData(mascaraData(t))} keyboardType="number-pad" placeholder="dia/mês/ano" />

      {ehPeso && (
        <Cartao>
          <Text style={[est.texto, { fontWeight: "700" }]}>Peso e corpo</Text>
          <Campo rotulo="Peso (kg)" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" placeholder="Se pesou na balança" />
          <Text style={[est.textoSuave, { marginBottom: 8 }]}>Sem balança? Meça com fita métrica e toque em Calcular:</Text>
          <Campo rotulo="Volta do peito (cm)" value={perimetro} onChangeText={setPerimetro} keyboardType="decimal-pad"
            dica="Passe a fita logo atrás da cernelha e dos cotovelos, ao redor do peito." />
          <Campo rotulo="Comprimento do corpo (cm)" value={comprimento} onChangeText={setComprimento} keyboardType="decimal-pad"
            dica="Da ponta do ombro até a ponta da nádega." />
          <Botao titulo="Calcular peso pela fita" tipo="secundario" icone="scale-bathroom" onPress={calcularFita} />
          <Text style={[est.textoSuave, { marginTop: 6 }]}>A fita dá uma estimativa. A balança é mais precisa.</Text>
          <Campo rotulo="Escore corporal (1 a 9)" value={escore} onChangeText={setEscore} keyboardType="decimal-pad"
            dica="1 = muito magro · 5 = ideal · 9 = muito gordo" style={{ marginTop: 0 }} />
        </Cartao>
      )}

      <Pressable onPress={() => setDetalhes((v) => !v)} style={{ minHeight: 48, justifyContent: "center" }} accessibilityRole="button">
        <Text style={{ color: cor.couro, fontSize: tam.texto, fontWeight: "700" }}>{detalhes ? "− Esconder detalhes" : "+ Mais detalhes (quem fez, próximo passo…)"}</Text>
      </Pressable>
      {detalhes && (
        <>
          <Campo rotulo="Quem fez ou viu" value={responsavel} onChangeText={setResponsavel} />
          <Campo rotulo="Prova (foto, nota, receita)" value={evidencia} onChangeText={setEvidencia} placeholder="Ex.: foto no celular, receita do veterinário" />
          <Campo rotulo="O que precisa ser decidido" value={decisao} onChangeText={setDecisao} />
          <Campo rotulo="Próximo passo" value={proximo} onChangeText={setProximo} />
        </>
      )}
      <Aviso texto={erro} tipo="erro" />
      <Botao titulo="Guardar anotação" icone="check" onPress={salvar} carregando={salvando} />
      {registro && (
        <Botao titulo="Apagar esta anotação" tipo="leve" icone="trash-can-outline" style={{ borderColor: cor.barro, marginTop: 20 }} onPress={async () => {
          const { error } = await supabase.from("records").delete().eq("id", registro.id);
          if (error) return setErro(mensagemErro(error));
          nav.voltar();
        }} />
      )}
    </Tela>
  );
}

// ---------- Ficha do animal ----------
export function Ficha({ id }: { id: string }) {
  const nav = useNav();
  const { pago } = usePlano();
  const { dados, carregando } = useCarga(async () => {
    let q = supabase.from("records").select("*").eq("animal_id", id).order("data", { ascending: false }).order("created_at", { ascending: false }).limit(300);
    if (!pago) q = q.gte("data", somarDias(hojeISO(), -DIAS_HISTORICO_GRATIS));
    const [a, r, ult] = await Promise.all([
      supabase.from("animals").select("*").eq("id", id).single(),
      q,
      supabase.from("records").select("*").eq("animal_id", id).order("data", { ascending: false }).order("created_at", { ascending: false }).limit(1),
    ]);
    return { animal: a.data, registros: r.data ?? [], ultima: ult.data?.[0] ?? null };
  }, [id, pago]);

  if (carregando && !dados) return <Tela titulo="Ficha" voltar><Carregando /></Tela>;
  const { animal, registros, ultima } = dados!;
  if (!animal) return <Tela titulo="Ficha" voltar><Vazio texto="Animal não encontrado." /></Tela>;
  const medidas = registros.filter((r: any) => r.peso_kg != null || r.escore_corporal != null);
  const sexo = animal.sexo === "femea" ? "Fêmea" : animal.sexo === "macho" ? "Macho" : animal.sexo === "macho_castrado" ? "Macho castrado" : null;

  return (
    <Tela titulo={animal.nome} voltar
      acao={<Botao titulo="Editar" tipo="leve" icone="pencil-outline" style={{ marginTop: 0, minHeight: 48 }} onPress={() => nav.ir("NovoAnimal", { animal })} />}>
      <View style={[est.linha, { gap: 14, marginBottom: 8 }]}>
        <FotoAnimal animalId={animal.id} tamanho={110} />
        <View style={{ flex: 1 }}>
          <Text style={est.texto}>{[animal.raca, animal.pelagem, sexo].filter(Boolean).join(" · ") || "Sem dados de raça e pelagem"}</Text>
          {animal.data_nascimento ? <Text style={est.textoSuave}>Nascimento: {br(animal.data_nascimento)}</Text> : null}
        </View>
      </View>
      <Botao titulo="Anotar para este animal" icone="plus-circle" onPress={() => nav.ir("NovoRegistro", { animalId: animal.id })} />

      <Cabecalho texto="Última atualização" />
      {ultima ? <ItemRegistro r={ultima} mostrarAnimal={false} /> : <Vazio texto="Nenhuma anotação ainda." />}
      <EnviarEspecialista animalId={animal.id} />

      <Cabecalho texto="Alimentação" />
      <Cartao onPress={() => nav.ir("Dieta", { animalId: animal.id, nome: animal.nome })}>
        <View style={[est.linha, { gap: 10 }]}>
          <Icone nome="barley" tamanho={30} cor={cor.mata} />
          <Text style={[est.texto, { flex: 1 }]}>O que ele come por dia e o cálculo da dieta</Text>
          <Icone nome="chevron-right" cor={cor.tintaSuave} />
        </View>
      </Cartao>

      <Cabecalho texto="Documentos e fotos" />
      <Cartao onPress={() => nav.ir("Documentos", { animalId: animal.id, nome: animal.nome })}>
        <View style={[est.linha, { gap: 10 }]}>
          <Icone nome="file-document-outline" tamanho={30} cor={cor.mata} />
          <Text style={[est.texto, { flex: 1 }]}>Registro do animal, foto e outros documentos</Text>
          <Icone nome="chevron-right" cor={cor.tintaSuave} />
        </View>
      </Cartao>

      <Cabecalho texto="Peso e corpo" />
      {medidas.length === 0 ? <Vazio texto="Sem pesagens anotadas. Use Anotar → Peso e corpo." /> : (
        <Cartao>
          {medidas.slice(0, pago ? 12 : 1).map((m: any, i: number) => {
            const ant = medidas[i + 1];
            const dp = pago && ant && m.peso_kg != null && ant.peso_kg != null ? Number(m.peso_kg) - Number(ant.peso_kg) : null;
            return (
              <View key={m.id} style={[est.entre, { paddingVertical: 8, borderBottomWidth: 1, borderColor: cor.linha }]}>
                <Text style={est.texto}>{br(m.data)}</Text>
                <Text style={[est.texto, { fontWeight: "700" }]}>
                  {m.peso_kg != null ? `${numBR(Number(m.peso_kg))} kg` : "—"}
                  {dp != null ? <Text style={{ color: cor.tintaSuave, fontWeight: "400" }}> ({dp > 0 ? "+" : ""}{numBR(dp)})</Text> : null}
                </Text>
                <Text style={est.texto}>{m.escore_corporal != null ? `Escore ${numBR(Number(m.escore_corporal))}` : ""}</Text>
              </View>
            );
          })}
          {!pago && medidas.length > 1 && <Text style={[est.textoSuave, { marginTop: 8 }]}>A evolução completa do peso fica nos planos pagos.</Text>}
        </Cartao>
      )}

      <Cabecalho texto={pago ? `Histórico (${registros.length})` : `Últimos ${DIAS_HISTORICO_GRATIS} dias (${registros.length})`} />
      {registros.length === 0 ? <Vazio texto="Nenhuma anotação." /> : registros.slice(0, 50).map((r: any) => <ItemRegistro key={r.id} r={r} mostrarAnimal={false} />)}
    </Tela>
  );
}

// ---------- Documentos e fotos do animal ----------
export function Documentos({ animalId, nome }: { animalId: string; nome: string }) {
  return (
    <Tela titulo="Documentos e fotos" voltar subtitulo={nome}>
      <Cabecalho texto="Foto do animal" />
      <Anexos animalId={animalId} tipo="foto_animal" vazio="Sem foto. Tire uma foto ou escolha da galeria." />
      <Cabecalho texto="Registro do animal" />
      <Text style={[est.textoSuave, { marginBottom: 8 }]}>Certificado de registro da associação, GTA, exames ou qualquer papel do animal. Fotografe o papel ou anexe o arquivo PDF.</Text>
      <Anexos animalId={animalId} tipo="registro" vazio="Nenhum documento guardado." />
    </Tela>
  );
}
