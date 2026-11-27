import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { supabase, mensagemErro } from "../supabase";
import { carregarPlano, ok, useCarga } from "../dados";
import { Aviso, Botao, Cabecalho, Campo, Carregando, Cartao, ErroCarga, Escolha, Icone, Tela, Vazio, useNav } from "../ui";
import { Anexos, FotoAnimal } from "../anexos";
import { br, mascaraData, paraISO } from "../datas";
import { cor, est, tam } from "../tema";

export function Animais() {
  const nav = useNav();
  const { dados, carregando, erro, recarregar } = useCarga(async () => {
    const [animais, plano] = await Promise.all([
      supabase.from("animals").select("*").order("ativo", { ascending: false }).order("nome"),
      carregarPlano(),
    ]);
    return { animais: ok(animais) ?? [], plano };
  });
  if (erro && !dados) return <Tela titulo="Animais"><ErroCarga erro={erro} tentar={recarregar} /></Tela>;
  if (carregando && !dados) return <Tela titulo="Animais"><Carregando /></Tela>;
  const { animais, plano } = dados!;
  const ativos = animais.filter((a: any) => a.ativo).length;
  const noLimite = plano ? ativos >= plano.max_animais : false;

  return (
    <Tela titulo="Animais">
      {!noLimite && <Botao titulo="Cadastrar animal" icone="plus-circle" onPress={() => nav.ir("NovoAnimal")} />}
      <View style={{ height: 14 }} />
      {animais.length === 0 ? <Vazio texto="Nenhum animal cadastrado ainda." /> : animais.map((a: any) => (
        <Cartao key={a.id} onPress={() => nav.ir("Ficha", { id: a.id })} style={!a.ativo ? { opacity: 0.6 } : undefined}>
          <View style={[est.linha, { gap: 14 }]}>
            <FotoAnimal animalId={a.id} tamanho={72} />
            <View style={{ flex: 1 }}>
              <Text style={[est.texto, { fontSize: 22, fontWeight: "700" }]}>{a.nome}</Text>
              <Text style={est.textoSuave}>{a.ativo ? [a.raca, a.pelagem].filter(Boolean).join(" · ") || "Abrir a ficha" : "Não está mais com você"}</Text>
            </View>
            <Icone nome="chevron-right" tamanho={30} cor={cor.tintaSuave} />
          </View>
        </Cartao>
      ))}
      {noLimite && (
        <Pressable onPress={() => nav.ir("Planos")} style={{ minHeight: 48, justifyContent: "center", marginTop: 8 }} accessibilityRole="button">
          <Text style={{ color: cor.couro, fontSize: tam.texto, fontWeight: "700" }}>Quer cadastrar mais animais? Conheça os planos →</Text>
        </Pressable>
      )}
    </Tela>
  );
}

const RACAS = ["Mangalarga Marchador", "Quarto de Milha", "Crioulo", "Campolina", "Pantaneiro", "Árabe", "Puro-sangue inglês", "Paint Horse", "Sem raça definida"];
const PELAGENS = ["Alazão", "Castanho", "Tordilho", "Baio", "Preto", "Rosilho", "Pampa", "Lobuno"];

export function NovoAnimal({ animal }: { animal?: any }) {
  const nav = useNav();
  const [nome, setNome] = useState(animal?.nome ?? "");
  const [sexo, setSexo] = useState<string | null>(animal?.sexo ?? null);
  const [raca, setRaca] = useState(animal?.raca ?? "");
  const [pelagem, setPelagem] = useState(animal?.pelagem ?? "");
  const [nasc, setNasc] = useState(animal?.data_nascimento ? br(animal.data_nascimento) : "");
  const [obs, setObs] = useState(animal?.observacoes ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [novoId, setNovoId] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    if (!nome.trim()) return setErro("Escreva o nome do animal.");
    const nascISO = nasc ? paraISO(nasc) : null;
    if (nasc && !nascISO) return setErro("Data de nascimento inválida. Use dia/mês/ano, ou deixe em branco.");
    setSalvando(true);
    const linha = {
      nome: nome.trim(), sexo, raca: raca.trim() || null, pelagem: pelagem.trim() || null,
      data_nascimento: nascISO, observacoes: obs.trim() || null,
    };
    const res = animal
      ? await supabase.from("animals").update(linha).eq("id", animal.id).select("id").single()
      : await supabase.from("animals").insert(linha).select("id").single();
    setSalvando(false);
    if (res.error) return setErro(mensagemErro(res.error));
    if (animal) return nav.voltar();
    setNovoId(res.data.id);
  }

  // Logo depois de cadastrar: foto e documento de registro
  if (novoId) {
    return (
      <Tela titulo={`${nome.trim()} cadastrado`} subtitulo="Agora, se quiser, guarde a foto e o documento de registro. Pode fazer isso depois também.">
        <Cabecalho texto="Foto do animal" />
        <Anexos animalId={novoId} tipo="foto_animal" vazio="Sem foto ainda." />
        <Cabecalho texto="Documento de registro" />
        <Anexos animalId={novoId} tipo="registro" vazio="Nenhum documento ainda." />
        <Botao titulo="Concluir" icone="check" onPress={nav.voltar} style={{ marginTop: 24 }} />
      </Tela>
    );
  }

  return (
    <Tela titulo={animal ? "Editar animal" : "Novo animal"} voltar subtitulo="Só o nome é obrigatório. O resto, preencha se souber.">
      <Campo rotulo="Nome do animal" value={nome} onChangeText={setNome} placeholder="Ex.: Sabrina" />
      <Escolha rotulo="Sexo" permitirVazio valor={sexo} aoEscolher={setSexo}
        opcoes={[{ valor: "femea", rotulo: "Fêmea" }, { valor: "macho", rotulo: "Macho" }, { valor: "macho_castrado", rotulo: "Castrado" }]} />
      <Escolha rotulo="Raça" permitirVazio valor={RACAS.includes(raca) ? raca : null} aoEscolher={(v) => setRaca(v ?? "")}
        opcoes={RACAS.map((r) => ({ valor: r, rotulo: r }))} />
      {!RACAS.includes(raca) && <Campo rotulo="Outra raça (opcional)" value={raca} onChangeText={setRaca} />}
      <Escolha rotulo="Pelagem (cor)" permitirVazio valor={PELAGENS.includes(pelagem) ? pelagem : null} aoEscolher={(v) => setPelagem(v ?? "")}
        opcoes={PELAGENS.map((r) => ({ valor: r, rotulo: r }))} />
      {!PELAGENS.includes(pelagem) && <Campo rotulo="Outra pelagem (opcional)" value={pelagem} onChangeText={setPelagem} />}
      <Campo rotulo="Nascimento" value={nasc} onChangeText={(t) => setNasc(mascaraData(t))} placeholder="dia/mês/ano" keyboardType="number-pad" />
      <Campo rotulo="Observações (opcional)" value={obs} onChangeText={setObs} multiline />
      <Aviso texto={erro} tipo="erro" />
      {erro?.includes("Limite do plano") && <Botao titulo="Ver planos" tipo="secundario" onPress={() => nav.ir("Planos")} />}
      <Botao titulo="Guardar" icone="check" onPress={salvar} carregando={salvando} />
      {animal && (
        <Botao titulo={animal.ativo ? "Não tenho mais este animal" : "Voltar a usar este animal"} tipo="leve"
          onPress={async () => {
            const { error } = await supabase.from("animals").update({ ativo: !animal.ativo }).eq("id", animal.id);
            if (error) return setErro(mensagemErro(error));
            nav.voltar();
          }} />
      )}
      {animal && <Text style={[est.textoSuave, { marginTop: 10 }]}>Animal que saiu (vendido, emprestado) não conta no plano e o histórico fica guardado.</Text>}
    </Tela>
  );
}
