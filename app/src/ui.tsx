import React, { createContext, useContext } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type ViewStyle,
} from "react-native";
import { cor, est, fonteTitulo } from "./tema";
import { infoStatus } from "./constantes";

// ---------- Navegação simples (pilha) ----------
export type Rota = { nome: string; params?: any };
type Nav = { ir: (nome: string, params?: any) => void; voltar: () => void; aba: (nome: string) => void };
export const NavContexto = createContext<Nav>({ ir: () => {}, voltar: () => {}, aba: () => {} });
export const useNav = () => useContext(NavContexto);

// ---------- Componentes ----------
export function Tela({ titulo, subtitulo, voltar, children, acao }: {
  titulo: string; subtitulo?: string; voltar?: boolean; children: React.ReactNode; acao?: React.ReactNode;
}) {
  const nav = useNav();
  return (
    <ScrollView style={est.tela} contentContainerStyle={est.conteudo} keyboardShouldPersistTaps="handled">
      {voltar && (
        <Pressable onPress={nav.voltar} accessibilityRole="button" style={{ paddingVertical: 6, marginBottom: 4 }}>
          <Text style={{ color: cor.couro, fontSize: 16 }}>‹ Voltar</Text>
        </Pressable>
      )}
      <View style={est.entre}>
        <Text style={[est.titulo, { flex: 1 }]}>{titulo}</Text>
        {acao}
      </View>
      {subtitulo ? <Text style={[est.textoSuave, { marginBottom: 12 }]}>{subtitulo}</Text> : <View style={{ height: 8 }} />}
      {children}
    </ScrollView>
  );
}

export function Cartao({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [est.cartao, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[est.cartao, style]}>{children}</View>;
}

export function Botao({ titulo, onPress, tipo = "principal", carregando, desativado, style }: {
  titulo: string; onPress: () => void; tipo?: "principal" | "secundario" | "perigo" | "leve";
  carregando?: boolean; desativado?: boolean; style?: ViewStyle;
}) {
  const fundo = { principal: cor.mata, secundario: cor.couro, perigo: cor.barro, leve: "transparent" }[tipo];
  const texto = tipo === "leve" ? cor.mata : cor.branco;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={desativado || carregando}
      onPress={onPress}
      style={({ pressed }) => [{
        backgroundColor: fundo, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 8, alignItems: "center",
        marginTop: 8, opacity: desativado ? 0.5 : pressed ? 0.85 : 1,
        borderWidth: tipo === "leve" ? 1 : 0, borderColor: cor.mata,
      }, style]}
    >
      {carregando ? <ActivityIndicator color={texto} /> : (
        <Text style={{ color: texto, fontSize: 16, fontWeight: "600" }}>{titulo}</Text>
      )}
    </Pressable>
  );
}

export function Campo({ rotulo, dica, ...props }: TextInputProps & { rotulo: string; dica?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 14, color: cor.tintaSuave, marginBottom: 4, fontWeight: "600" }}>{rotulo}</Text>
      <TextInput
        placeholderTextColor="#A69C8C"
        {...props}
        style={[{
          backgroundColor: cor.branco, borderWidth: 1, borderColor: cor.linha, borderRadius: 8,
          paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: cor.tinta,
          minHeight: props.multiline ? 80 : undefined, textAlignVertical: props.multiline ? "top" : "center",
        }, props.style as any]}
      />
      {dica ? <Text style={[est.textoSuave, { fontSize: 13, marginTop: 3 }]}>{dica}</Text> : null}
    </View>
  );
}

export function Escolha({ rotulo, opcoes, valor, aoEscolher, permitirVazio }: {
  rotulo?: string; opcoes: { valor: string; rotulo: string }[]; valor: string | null;
  aoEscolher: (v: string | null) => void; permitirVazio?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      {rotulo ? <Text style={{ fontSize: 14, color: cor.tintaSuave, marginBottom: 6, fontWeight: "600" }}>{rotulo}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <Pressable
              key={o.valor}
              onPress={() => aoEscolher(ativo && permitirVazio ? null : o.valor)}
              style={{
                paddingVertical: 7, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1,
                borderColor: ativo ? cor.mata : cor.linha, backgroundColor: ativo ? cor.mata : cor.branco,
              }}
            >
              <Text style={{ color: ativo ? cor.branco : cor.tinta, fontSize: 14 }}>{o.rotulo}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Selo({ status }: { status: string }) {
  const s = infoStatus(status);
  return (
    <View style={{ backgroundColor: s.fundo, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: "flex-start" }}>
      <Text style={{ color: s.texto, fontSize: 12, fontWeight: "700" }}>{s.rotulo}</Text>
    </View>
  );
}

export function Aviso({ texto, tipo = "info" }: { texto?: string | null; tipo?: "info" | "erro" | "ok" }) {
  if (!texto) return null;
  const c = { info: [cor.couroClaro, cor.couro], erro: [cor.barroClaro, cor.barro], ok: [cor.mataClara, cor.mata] }[tipo];
  return (
    <View style={{ backgroundColor: c[0], borderLeftWidth: 4, borderLeftColor: c[1], padding: 10, borderRadius: 6, marginVertical: 8 }}>
      <Text style={{ color: cor.tinta, fontSize: 15 }}>{texto}</Text>
    </View>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <Text style={[est.textoSuave, { fontStyle: "italic", marginVertical: 8 }]}>{texto}</Text>;
}

export function Carregando() {
  return <ActivityIndicator color={cor.mata} style={{ marginVertical: 24 }} />;
}

export function Rotulado({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <Text style={[est.texto, { fontSize: 15, marginTop: 2 }]}>
      <Text style={{ fontWeight: "700", color: cor.tintaSuave }}>{rotulo}: </Text>{valor}
    </Text>
  );
}

export function Cabecalho({ texto }: { texto: string }) {
  return <Text style={est.subtitulo}>{texto}</Text>;
}

export const tituloFonte = fonteTitulo;
