import { Platform, StyleSheet } from "react-native";

// Paleta: mata, couro, papel, palha
export const cor = {
  papel: "#F3ECDC",
  papelEscuro: "#E8DEC6",
  cartao: "#FBF7EE",
  tinta: "#2B2620",
  tintaSuave: "#5E554A",
  mata: "#3E5B3A",
  mataClara: "#DCE6D3",
  couro: "#8A5A2E",
  couroClaro: "#F0E0CC",
  palha: "#D9B26F",
  barro: "#A4462E",
  barroClaro: "#F6DCD3",
  linha: "#D6CBB2",
  branco: "#FFFFFF",
};

export const fonteTitulo = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia, 'Times New Roman', serif" });

export const est = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.papel },
  conteudo: { padding: 16, paddingBottom: 48, maxWidth: 720, width: "100%", alignSelf: "center" },
  titulo: { fontFamily: fonteTitulo, fontSize: 26, color: cor.tinta, marginBottom: 4 },
  subtitulo: { fontFamily: fonteTitulo, fontSize: 19, color: cor.tinta, marginTop: 18, marginBottom: 8 },
  texto: { fontSize: 16, color: cor.tinta, lineHeight: 22 },
  textoSuave: { fontSize: 14, color: cor.tintaSuave, lineHeight: 20 },
  cartao: {
    backgroundColor: cor.cartao, borderRadius: 10, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: cor.linha,
  },
  linha: { flexDirection: "row", alignItems: "center" },
  entre: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
