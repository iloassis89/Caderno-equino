import React, { createContext, useContext, useEffect, useState } from "react";
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
export const PlanoContexto = createContext<{ pago: boolean; admin: boolean; recarregar: () => void }>({ pago: false, admin: false, recarregar: () => {} });
export const usePlano = () => useContext(PlanoContexto);

export function Icone({ nome, tamanho = 24, cor: c = cor.tinta }: { nome: string; tamanho?: number; cor?: string }) {
  return <MaterialCommunityIcons name={nome as any} size={tamanho} color={c} />;
}

// ---------- Estrutura da tela ----------
export function Tela({ titulo, subtitulo, voltar, children, acao, rolarFim }: {
  titulo: string; subtitulo?: string; voltar?: boolean; children: React.ReactNode; acao?: React.ReactNode;
  rolarFim?: number; // conversas: número de mensagens; quando muda, desce até a última
}) {
  const nav = useNav();
  const rolagem = React.useRef<React.ComponentRef<typeof ScrollView>>(null);
  React.useEffect(() => {
    if (!rolarFim) return;
    const t = setTimeout(() => rolagem.current?.scrollToEnd({ animated: false }), 80);
    return () => clearTimeout(t);
  }, [rolarFim]);
  return (
    <ScrollView ref={rolagem} style={est.tela} contentContainerStyle={est.conteudo} keyboardShouldPersistTaps="handled"
>
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
        backgroundColor: fundo, minHeight: tam.toque, paddingHorizontal: 16, borderRadius: 14, alignItems: "center",
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
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: cor.branco, borderWidth: 2, borderColor: cor.borda, borderRadius: 14 }}>
        <TextInput
          placeholderTextColor={cor.placeholder}
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
                minHeight: 56, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 2,
                flexDirection: "row", alignItems: "center", gap: 8,
                width: colunas === 2 ? "48.5%" : colunas === 1 ? "100%" : undefined,
                borderColor: ativo ? cor.mata : cor.borda, backgroundColor: ativo ? cor.mata : cor.branco,
              }}
            >
              {ativo ? <Icone nome="check-bold" tamanho={22} cor={cor.branco} /> : o.icone ? <Icone nome={o.icone} tamanho={24} cor={cor.mata} /> : null}
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
      <Text style={{ color: s.texto, fontSize: tam.mini, fontWeight: "700" }}>{s.rotulo}</Text>
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

// Mostra o erro de carregamento com botão para tentar de novo
export function ErroCarga({ erro, tentar }: { erro?: string | null; tentar: () => void }) {
  if (!erro) return null;
  return (
    <View>
      <Aviso texto={erro} tipo="erro" />
      <Botao titulo="Tentar de novo" icone="refresh" tipo="leve" onPress={tentar} />
    </View>
  );
}

// Botão que pede um segundo toque antes de apagar (evita apagar sem querer)
export function BotaoConfirmar({ titulo, onConfirmar, icone = "trash-can-outline", carregando }: {
  titulo: string; onConfirmar: () => void; icone?: string; carregando?: boolean;
}) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 6000);
    return () => clearTimeout(t);
  }, [armado]);
  return (
    <Botao
      titulo={armado ? "Toque de novo para confirmar" : titulo}
      icone={icone}
      tipo={armado ? "perigo" : "leve"}
      carregando={carregando}
      style={armado ? undefined : { borderColor: cor.barro }}
      onPress={() => { if (armado) { setArmado(false); onConfirmar(); } else setArmado(true); }}
    />
  );
}

// Marcar várias opções (toque para ligar/desligar)
export function EscolhaVarias({ rotulo, opcoes, valores, aoMudar, colunas }: {
  rotulo?: string; opcoes: Opcao[]; valores: string[]; aoMudar: (v: string[]) => void; colunas?: 1 | 2;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      {rotulo ? <Text style={{ fontSize: tam.pequeno, color: cor.tintaSuave, marginBottom: 8, fontWeight: "700" }}>{rotulo}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {opcoes.map((o) => {
          const ativo = valores.includes(o.valor);
          return (
            <Pressable key={o.valor} accessibilityRole="checkbox" accessibilityState={{ checked: ativo }}
              onPress={() => aoMudar(ativo ? valores.filter((v) => v !== o.valor) : [...valores, o.valor])}
              style={{
                minHeight: 56, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 2,
                flexDirection: "row", alignItems: "center", gap: 8,
                width: colunas === 2 ? "48.5%" : colunas === 1 ? "100%" : undefined,
                borderColor: ativo ? cor.mata : cor.borda, backgroundColor: ativo ? cor.mataClara : cor.branco,
              }}>
              <Icone nome={ativo ? "checkbox-marked" : "checkbox-blank-outline"} tamanho={24} cor={cor.mata} />
              <Text style={{ color: cor.tinta, fontSize: tam.pequeno, fontWeight: "600", flexShrink: 1 }}>{o.rotulo}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Escolher horários tocando (e, se quiser, digitar outro)
export function Horarios({ rotulo, prontos, valores, aoMudar, maximo = 8 }: {
  rotulo: string; prontos: string[]; valores: string[]; aoMudar: (v: string[]) => void; maximo?: number;
}) {
  const [outro, setOutro] = useState("");
  const todos = [...new Set([...prontos, ...valores])].sort();
  function addOutro() {
    const m = outro.trim().replace(/[^0-9]/g, "");
    const t = m.length >= 3 ? `${m.slice(0, m.length - 2).padStart(2, "0")}:${m.slice(-2)}` : "";
    if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(t) || valores.includes(t) || valores.length >= maximo) return;
    aoMudar([...valores, t].sort());
    setOutro("");
  }
  return (
    <View>
      <EscolhaVarias rotulo={rotulo} opcoes={todos.map((h) => ({ valor: h, rotulo: h }))} valores={valores}
        aoMudar={(v) => aoMudar(v.slice(0, maximo).sort())} />
      <View style={[{ flexDirection: "row", alignItems: "flex-end", gap: 8 }]}>
        <View style={{ flex: 1 }}>
          <Campo rotulo="Outro horário (ex.: 0930)" value={outro} onChangeText={setOutro} keyboardType="number-pad" maxLength={5} />
        </View>
        <View style={{ marginBottom: 14 }}><Botao titulo="Pôr" tipo="leve" onPress={addOutro} /></View>
      </View>
    </View>
  );
}
