import { Platform, StyleSheet } from "react-native";

// Paleta: mata, couro, papel, palha. Contraste alto para leitura no sol.
export const cor = {
  papel: "#F3ECDC",
  cartao: "#FFFDF7",
  tinta: "#1F1B16",
  tintaSuave: "#4F473D",
  mata: "#2F4B2C",
  mataClara: "#DCE6D3",
  couro: "#7A4A20",
  couroClaro: "#F0E0CC",
  palha: "#D9B26F",
  barro: "#9A3A22",
  barroClaro: "#F6DCD3",
  ouro: "#6B5414",
  ouroClaro: "#F1E7C4",
  linha: "#E3D8BF", // só divisórias e borda de cartão
  borda: "#8A7853", // campos e opções (contraste 4,3:1 no branco)
  placeholder: "#6E6556",
  branco: "#FFFFFF",
};

export const fonteTitulo = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia, 'Times New Roman', serif" });

// Tamanhos pensados para quem tem pouca prática com celular
export const tam = { texto: 19, pequeno: 17, mini: 15, titulo: 30, subtitulo: 22, toque: 60 };

export const est = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.papel },
  conteudo: { padding: 16, paddingBottom: 56, maxWidth: 720, width: "100%", alignSelf: "center" },
  titulo: { fontFamily: fonteTitulo, fontSize: tam.titulo, color: cor.tinta, marginBottom: 4 },
  subtitulo: { fontFamily: fonteTitulo, fontSize: tam.subtitulo, fontWeight: "700", color: cor.tinta, marginTop: 26, marginBottom: 10 },
  texto: { fontSize: tam.texto, color: cor.tinta, lineHeight: 27 },
  textoSuave: { fontSize: tam.pequeno, color: cor.tintaSuave, lineHeight: 24 },
  cartao: {
    backgroundColor: cor.cartao, borderRadius: 16, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: cor.linha,
    ...Platform.select({ web: { boxShadow: "0 1px 3px rgba(60,40,10,0.10)" } as any, android: { elevation: 1 }, default: {} }),
  },
  linha: { flexDirection: "row", alignItems: "center" },
  entre: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
