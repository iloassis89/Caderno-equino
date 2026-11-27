import React, { useState } from "react";
import { Text, View } from "react-native";
import { supabase, mensagemErro } from "../supabase";
import { carregarPlano, useCarga } from "../dados";
import { Aviso, Botao, Campo, Carregando, Cartao, Escolha, Tela, Vazio, useNav } from "../ui";
import { br, mascaraData, paraISO } from "../datas";
import { cor, est } from "../tema";

export function Animais() {
  const nav = useNav();
  const { dados, carregando } = useCarga(async () => {
    const [animais, plano] = await Promise.all([
      supabase.from("animals").select("*").order("ativo", { ascending: false }).order("nome"),
      carregarPlano(),
    ]);
    return { animais: animais.data ?? [], plano };
  });
  if (carregando && !dados) return <Tela titulo="Animais"><Carregando /></Tela>;
  const { animais, plano } = dados!;
  const ativos = animais.filter((a: any) => a.ativo).length;
  const noLimite = plano ? ativos >= plano.max_animais : false;

  return (
    <Tela titulo="Animais" subtitulo={`${ativos} de ${plano?.max_animais ?? 1} no plano ${plano?.nome ?? "Gratuito"}`}>
      {noLimite ? (
        <Aviso texto="Você chegou ao limite do seu plano. Para cadastrar mais animais, mude de plano." />
      ) : null}
      <Botao titulo={noLimite ? "Ver planos" : "+ Cadastrar animal"} onPress={() => nav.ir(noLimite ? "Planos" : "NovoAnimal")} />
      <View style={{ height: 12 }} />
      {animais.length === 0 ? <Vazio texto="Nenhum animal cadastrado ainda." /> : animais.map((a: any) => (
        <Cartao key={a.id} onPress={() => nav.ir("Ficha", { id: a.id })} style={!a.ativo ? { opacity: 0.6 } : undefined}>
          <View style={est.entre}>
            <Text style={[est.texto, { fontSize: 18, fontWeight: "700" }]}>{a.nome}</Text>
            {!a.ativo && <Text style={est.textoSuave}>Inativo</Text>}
          </View>
          <Text style={est.textoSuave}>
            {[a.raca, a.pelagem, a.sexo === "femea" ? "Fêmea" : a.sexo === "macho" ? "Macho" : a.sexo === "macho_castrado" ? "Macho castrado" : null]
              .filter(Boolean).join(" · ") || "Toque para ver a ficha"}
          </Text>
        </Cartao>
      ))}
    </Tela>
  );
}

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

  async function salvar() {
    setErro(null);
    if (!nome.trim()) return setErro("Informe o nome do animal.");
    const nascISO = nasc ? paraISO(nasc) : null;
    if (nasc && !nascISO) return setErro("Data de nascimento inválida. Use DD/MM/AAAA, ou deixe em branco.");
    setSalvando(true);
    const linha = {
      nome: nome.trim(), sexo, raca: raca.trim() || null, pelagem: pelagem.trim() || null,
      data_nascimento: nascISO, observacoes: obs.trim() || null,
    };
    const { error } = animal
      ? await supabase.from("animals").update(linha).eq("id", animal.id)
      : await supabase.from("animals").insert(linha);
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    nav.voltar();
  }

  return (
    <Tela titulo={animal ? "Editar animal" : "Novo animal"} voltar subtitulo="Preencha só o que você sabe. Campos vazios ficam vazios.">
      <Campo rotulo="Nome *" value={nome} onChangeText={setNome} />
      <Escolha rotulo="Sexo" permitirVazio valor={sexo} aoEscolher={setSexo}
        opcoes={[{ valor: "femea", rotulo: "Fêmea" }, { valor: "macho", rotulo: "Macho" }, { valor: "macho_castrado", rotulo: "Macho castrado" }]} />
      <Campo rotulo="Raça" value={raca} onChangeText={setRaca} />
      <Campo rotulo="Pelagem" value={pelagem} onChangeText={setPelagem} />
      <Campo rotulo="Nascimento" value={nasc} onChangeText={(t) => setNasc(mascaraData(t))} placeholder="DD/MM/AAAA" keyboardType="number-pad" />
      <Campo rotulo="Observações" value={obs} onChangeText={setObs} multiline />
      <Aviso texto={erro} tipo="erro" />
      {erro?.includes("Limite do plano") && <Botao titulo="Ver planos" tipo="secundario" onPress={() => nav.ir("Planos")} />}
      <Botao titulo="Salvar" onPress={salvar} carregando={salvando} />
      {animal && (
        <Botao titulo={animal.ativo ? "Marcar como inativo (vendido, emprestado…)" : "Reativar animal"} tipo="leve"
          onPress={async () => {
            const { error } = await supabase.from("animals").update({ ativo: !animal.ativo }).eq("id", animal.id);
            if (error) return setErro(mensagemErro(error));
            nav.voltar();
          }} />
      )}
      <Text style={[est.textoSuave, { marginTop: 10, color: cor.tintaSuave }]}>Animal inativo não conta no limite do plano e mantém o histórico.</Text>
    </Tela>
  );
}
