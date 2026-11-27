import React, { createContext, useContext, useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { cor, est, fonteTitulo, tam } from "./tema";
import { infoStatus, type Opcao } from "./constantes";

// ---------- Navegação simples (pilha) ----------
export type Rota = { nome: string; params?: any };
type Nav = { ir: (nome: string, params?: any) => void; voltar: () => void; aba: (nome: string) => void };
export const NavContexto = createContext<Nav>({ ir: () => {}, voltar: () => {}, aba: () => {} });
export const useNav = () => useContext(NavContexto);

// ---------- Plano do usuário (pago ou grátis) ----------
export const PlanoContexto = createContext<{ pago: boolean; recarregar: () => void }>({ pago: false, recarregar: () => {} });
export const usePlano = () => useContext(PlanoContexto);

export function Icone({ nome, tamanho = 24, cor: c = cor.tinta }: { nome: string; tamanho?: number; cor?: string }) {
  return <MaterialCommunityIcons name={nome as any} size={tamanho} color={c} />;
}

// ---------- Estrutura da tela ----------
export function Tela({ titulo, subtitulo, voltar, children, acao }: {
  titulo: string; subtitulo?: string; voltar?: boolean; children: React.ReactNode; acao?: React.ReactNode;
}) {
  const nav = useNav();
  return (
    <ScrollView style={est.tela} contentContainerStyle={est.conteudo} keyboardShouldPersistTaps="handled">
      {voltar && (
        <Pressable onPress={nav.voltar} accessibilityRole="button" accessibilityLabel="Voltar"
          style={{ flexDirection: "row", alignItems: "center", minHeight: 44, marginBottom: 2, alignSelf: "flex-start", paddingRight: 12 }}>
          <Icone nome="chevron-left" tamanho={30} cor={cor.couro} />
          <Text style={{ color: cor.couro, fontSize: tam.texto, fontWeight: "600" }}>Voltar</Text>
        </Pressable>
      )}
      <View style={est.entre}>
        <Text style={[est.titulo, { flex: 1 }]} accessibilityRole="header">{titulo}</Text>
        {acao}
      </View>
      {subtitulo ? <Text style={[est.textoSuave, { marginBottom: 14 }]}>{subtitulo}</Text> : <View style={{ height: 10 }} />}
      {children}
    </ScrollView>
  );
}

export function Cartao({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [est.cartao, style, pressed && { opacity: 0.8 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[est.cartao, style]}>{children}</View>;
}

export function Botao({ titulo, onPress, tipo = "principal", carregando, desativado, style, icone }: {
  titulo: string; onPress: () => void; tipo?: "principal" | "secundario" | "perigo" | "leve";
  carregando?: boolean; desativado?: boolean; style?: ViewStyle; icone?: string;
}) {
  const fundo = { principal: cor.mata, secundario: cor.couro, perigo: cor.barro, leve: cor.cartao }[tipo];
  const texto = tipo === "leve" ? cor.mata : cor.branco;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      disabled={desativado || carregando}
      onPress={onPress}
      style={({ pressed }) => [{
        backgroundColor: fundo, minHeight: tam.toque, paddingHorizontal: 16, borderRadius: 12, alignItems: "center",
        justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 10, opacity: desativado ? 0.5 : pressed ? 0.85 : 1,
        borderWidth: tipo === "leve" ? 2 : 0, borderColor: cor.mata,
      }, style]}
    >
      {carregando ? <ActivityIndicator color={texto} /> : (
        <>
          {icone ? <Icone nome={icone} cor={texto} tamanho={24} /> : null}
          <Text style={{ color: texto, fontSize: tam.texto, fontWeight: "700", textAlign: "center" }}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

// Campo de texto grande; "senha" mostra o olho para ver o que foi digitado
export function Campo({ rotulo, dica, senha, ...props }: TextInputProps & { rotulo: string; dica?: string; senha?: boolean }) {
  const [ver, setVer] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: tam.pequeno, color: cor.tintaSuave, marginBottom: 6, fontWeight: "700" }}>{rotulo}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: cor.branco, borderWidth: 2, borderColor: cor.linha, borderRadius: 12 }}>
        <TextInput
          placeholderTextColor="#8C8272"
          accessibilityLabel={rotulo}
          secureTextEntry={senha ? !ver : props.secureTextEntry}
          {...props}
          style={[{
            flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: tam.texto, color: cor.tinta,
            minHeight: props.multiline ? 110 : tam.toque, textAlignVertical: props.multiline ? "top" : "center",
          }, props.style as any]}
        />
        {senha && (
          <Pressable onPress={() => setVer((v) => !v)} accessibilityRole="button"
            accessibilityLabel={ver ? "Esconder senha" : "Mostrar senha"} style={{ padding: 14 }}>
            <Icone nome={ver ? "eye-off-outline" : "eye-outline"} tamanho={28} cor={cor.tintaSuave} />
          </Pressable>
        )}
      </View>
      {dica ? <Text style={[est.textoSuave, { marginTop: 4 }]}>{dica}</Text> : null}
    </View>
  );
}

// Escolha em botões grandes (com ícone quando houver). colunas=2 vira grade.
export function Escolha({ rotulo, opcoes, valor, aoEscolher, permitirVazio, colunas }: {
  rotulo?: string; opcoes: Opcao[]; valor: string | null;
  aoEscolher: (v: string | null) => void; permitirVazio?: boolean; colunas?: 1 | 2;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      {rotulo ? <Text style={{ fontSize: tam.pequeno, color: cor.tintaSuave, marginBottom: 8, fontWeight: "700" }}>{rotulo}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <Pressable
              key={o.valor}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              onPress={() => aoEscolher(ativo && permitirVazio ? null : o.valor)}
              style={{
                minHeight: 52, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 2,
                flexDirection: "row", alignItems: "center", gap: 8,
                width: colunas === 2 ? "48.5%" : colunas === 1 ? "100%" : undefined,
                borderColor: ativo ? cor.mata : cor.linha, backgroundColor: ativo ? cor.mata : cor.branco,
              }}
            >
              {o.icone ? <Icone nome={o.icone} tamanho={24} cor={ativo ? cor.branco : cor.mata} /> : null}
              <Text style={{ color: ativo ? cor.branco : cor.tinta, fontSize: tam.pequeno, fontWeight: "600", flexShrink: 1 }}>{o.rotulo}</Text>
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
    <View style={{ backgroundColor: s.fundo, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Icone nome={s.icone!} tamanho={16} cor={s.texto} />
      <Text style={{ color: s.texto, fontSize: 14, fontWeight: "700" }}>{s.rotulo}</Text>
    </View>
  );
}

export function Aviso({ texto, tipo = "info" }: { texto?: string | null; tipo?: "info" | "erro" | "ok" }) {
  if (!texto) return null;
  const c = { info: [cor.couroClaro, cor.couro], erro: [cor.barroClaro, cor.barro], ok: [cor.mataClara, cor.mata] }[tipo];
  return (
    <View accessibilityLiveRegion="polite" style={{ backgroundColor: c[0], borderLeftWidth: 5, borderLeftColor: c[1], padding: 12, borderRadius: 8, marginVertical: 8 }}>
      <Text style={{ color: cor.tinta, fontSize: tam.texto, lineHeight: 25 }}>{texto}</Text>
    </View>
  );
}

// Bloco mostrado no plano grátis no lugar das funções completas
export function Bloqueado({ titulo, texto }: { titulo: string; texto?: string }) {
  const nav = useNav();
  return (
    <Cartao style={{ backgroundColor: cor.couroClaro, borderColor: cor.palha }}>
      <View style={[est.linha, { gap: 8 }]}>
        <Icone nome="lock-outline" cor={cor.couro} />
        <Text style={[est.texto, { fontWeight: "700", flex: 1 }]}>{titulo}</Text>
      </View>
      <Text style={[est.textoSuave, { marginTop: 4 }]}>{texto ?? "Disponível nos planos pagos, a partir de R$ 9,90 por mês."}</Text>
      <Botao titulo="Ver planos" tipo="secundario" onPress={() => nav.ir("Planos")} />
    </Cartao>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <Text style={[est.textoSuave, { fontStyle: "italic", marginVertical: 8 }]}>{texto}</Text>;
}

export function Carregando() {
  return <ActivityIndicator color={cor.mata} size="large" style={{ marginVertical: 28 }} />;
}

export function Rotulado({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <Text style={[est.texto, { marginTop: 3 }]}>
      <Text style={{ fontWeight: "700", color: cor.tintaSuave }}>{rotulo}: </Text>{valor}
    </Text>
  );
}

export function Cabecalho({ texto }: { texto: string }) {
  return <Text style={est.subtitulo} accessibilityRole="header">{texto}</Text>;
}

export const tituloFonte = fonteTitulo;
