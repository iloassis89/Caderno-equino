import React, { useState } from "react";
import { Text, View } from "react-native";
import { supabase, mensagemErro } from "../supabase";
import { carregarPlano, useCarga } from "../dados";
import { Aviso, Botao, Cabecalho, Campo, Carregando, Cartao, Escolha, Icone, Tela, Vazio, useNav } from "../ui";
import { Anexos, FotoAnimal } from "../anexos";
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
    <Tela titulo="Animais" subtitulo={`${ativos} de ${plano?.max_animais ?? 1} animal(is) no seu plano`}>
      {noLimite && <Aviso texto="Seu plano está completo. Para cadastrar mais animais, mude de plano." />}
      <Botao titulo={noLimite ? "Ver planos" : "Cadastrar animal"} icone={noLimite ? "star-outline" : "plus-circle"}
        onPress={() => nav.ir(noLimite ? "Planos" : "NovoAnimal")} />
      <View style={{ height: 14 }} />
      {animais.length === 0 ? <Vazio texto="Nenhum animal cadastrado ainda." /> : animais.map((a: any) => (
        <Cartao key={a.id} onPress={() => nav.ir("Ficha", { id: a.id })} style={!a.ativo ? { opacity: 0.6 } : undefined}>
          <View style={[est.linha, { gap: 14 }]}>
            <FotoAnimal animalId={a.id} tamanho={72} />
            <View style={{ flex: 1 }}>
              <Text style={[est.texto, { fontSize: 22, fontWeight: "700" }]}>{a.nome}</Text>
              <Text style={est.textoSuave}>{a.ativo ? "Toque para abrir a ficha" : "Inativo"}</Text>
            </View>
            <Icone nome="chevron-right" tamanho={30} cor={cor.tintaSuave} />
          </View>
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
      <Campo rotulo="Raça" value={raca} onChangeText={setRaca} placeholder="Ex.: Mangalarga" />
      <Campo rotulo="Pelagem (cor)" value={pelagem} onChangeText={setPelagem} placeholder="Ex.: Tordilho" />
      <Campo rotulo="Nascimento" value={nasc} onChangeText={(t) => setNasc(mascaraData(t))} placeholder="dia/mês/ano" keyboardType="number-pad" />
      <Campo rotulo="Observações" value={obs} onChangeText={setObs} multiline />
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
