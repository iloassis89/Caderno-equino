import React, { useState } from "react";
import { Image, Platform, Text, View } from "react-native";
import { supabase, mensagemErro } from "../supabase";
import { Aviso, Botao, Campo, Escolha, Tela } from "../ui";
import { cor, est } from "../tema";

export default function Entrar() {
  const [modo, setModo] = useState<"entrar" | "criar" | "esqueci">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<{ t: string; tipo: "erro" | "ok" } | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setMsg(null);
    if (!email.includes("@")) return setMsg({ t: "Informe um e-mail válido.", tipo: "erro" });
    setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) throw error;
      } else if (modo === "criar") {
        if (!nome.trim()) throw new Error("Informe seu nome.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password: senha,
          options: {
            data: { nome: nome.trim() },
            // @ts-ignore - na web, o link de confirmação volta para o próprio app
            emailRedirectTo: typeof window !== "undefined" && window.location ? `${window.location.origin}${window.location.pathname}` : undefined,
          },
        });
        if (error) throw error;
        if (!data.session) setMsg({ t: "Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.", tipo: "ok" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setMsg({ t: "Enviamos um link para redefinir a senha.", tipo: "ok" });
      }
    } catch (e: any) {
      setMsg({ t: mensagemErro(e), tipo: "erro" });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Tela titulo="IAS Horse" subtitulo="O caderno do seu cavalo no celular. Tudo anotado, nada esquecido.">
      <View style={{ alignItems: "center", marginVertical: 8 }}>
        <Image source={Platform.OS === "web" ? { uri: "icon-192.png" } : require("../../assets/icon.png")} style={{ width: 96, height: 96, borderRadius: 20 }} />
      </View>
      <Escolha
        opcoes={[{ valor: "entrar", rotulo: "Entrar" }, { valor: "criar", rotulo: "Criar conta" }, { valor: "esqueci", rotulo: "Esqueci a senha" }]}
        valor={modo}
        aoEscolher={(v) => { setModo((v as any) ?? "entrar"); setMsg(null); }}
      />
      {modo === "criar" && <Campo rotulo="Seu nome" value={nome} onChangeText={setNome} autoComplete="name" />}
      <Campo rotulo="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      {modo !== "esqueci" && (
        <Campo rotulo="Senha" value={senha} onChangeText={setSenha} senha autoComplete={modo === "criar" ? "new-password" : "current-password"}
          dica={modo === "criar" ? "Mínimo de 6 caracteres." : undefined} />
      )}
      <Aviso texto={msg?.t} tipo={msg?.tipo} />
      <Botao titulo={{ entrar: "Entrar", criar: "Criar minha conta", esqueci: "Enviar link" }[modo]} onPress={enviar} carregando={carregando} />
      <Text style={[est.textoSuave, { marginTop: 18, textAlign: "center" }]}>
        1 animal grátis. Sem cartão para começar.
      </Text>
      <Text style={[est.textoSuave, { marginTop: 6, textAlign: "center", color: cor.tintaSuave, fontSize: 12 }]}>
        O app registra e organiza. Não substitui o médico-veterinário.
      </Text>
    </Tela>
  );
}
