/**
 * Aeroportos do Brasil com voos regulares (lista fixa, sem API). Coordenadas aproximadas: servem para achar
 * o mais próximo de uma cidade ou estalagem e montar a busca de voos com o código IATA.
 */
export type Aeroporto = { iata: string; nome: string; cidade: string; uf: string; lat: number; lng: number };

export const AEROPORTOS: Aeroporto[] = [
  { iata: "GRU", nome: "Guarulhos", cidade: "São Paulo", uf: "SP", lat: -23.4356, lng: -46.4731 },
  { iata: "CGH", nome: "Congonhas", cidade: "São Paulo", uf: "SP", lat: -23.6261, lng: -46.6564 },
  { iata: "VCP", nome: "Viracopos", cidade: "Campinas", uf: "SP", lat: -23.0074, lng: -47.1345 },
  { iata: "RAO", nome: "Leite Lopes", cidade: "Ribeirão Preto", uf: "SP", lat: -21.1364, lng: -47.7767 },
  {
    iata: "SJP",
    nome: "Prof. Eribelto Manoel Reino",
    cidade: "São José do Rio Preto",
    uf: "SP",
    lat: -20.8166,
    lng: -49.4065,
  },
  { iata: "GIG", nome: "Galeão", cidade: "Rio de Janeiro", uf: "RJ", lat: -22.809, lng: -43.2506 },
  { iata: "SDU", nome: "Santos Dumont", cidade: "Rio de Janeiro", uf: "RJ", lat: -22.9105, lng: -43.1631 },
  { iata: "CFB", nome: "Cabo Frio", cidade: "Cabo Frio", uf: "RJ", lat: -22.9217, lng: -42.0743 },
  { iata: "CNF", nome: "Confins", cidade: "Belo Horizonte", uf: "MG", lat: -19.6244, lng: -43.9719 },
  { iata: "PLU", nome: "Pampulha", cidade: "Belo Horizonte", uf: "MG", lat: -19.8512, lng: -43.9506 },
  { iata: "UDI", nome: "Uberlândia", cidade: "Uberlândia", uf: "MG", lat: -18.8836, lng: -48.2253 },
  { iata: "MOC", nome: "Montes Claros", cidade: "Montes Claros", uf: "MG", lat: -16.7069, lng: -43.8189 },
  { iata: "VIX", nome: "Eurico de Aguiar Salles", cidade: "Vitória", uf: "ES", lat: -20.2581, lng: -40.2864 },
  { iata: "CWB", nome: "Afonso Pena", cidade: "Curitiba", uf: "PR", lat: -25.5285, lng: -49.1758 },
  { iata: "LDB", nome: "Londrina", cidade: "Londrina", uf: "PR", lat: -23.3336, lng: -51.1301 },
  { iata: "MGF", nome: "Maringá", cidade: "Maringá", uf: "PR", lat: -23.4794, lng: -52.0122 },
  { iata: "IGU", nome: "Cataratas", cidade: "Foz do Iguaçu", uf: "PR", lat: -25.6003, lng: -54.485 },
  { iata: "CAC", nome: "Cascavel", cidade: "Cascavel", uf: "PR", lat: -25.0003, lng: -53.5008 },
  { iata: "FLN", nome: "Hercílio Luz", cidade: "Florianópolis", uf: "SC", lat: -27.6703, lng: -48.5525 },
  { iata: "NVT", nome: "Navegantes", cidade: "Navegantes", uf: "SC", lat: -26.88, lng: -48.6514 },
  { iata: "JOI", nome: "Joinville", cidade: "Joinville", uf: "SC", lat: -26.2245, lng: -48.7974 },
  { iata: "XAP", nome: "Chapecó", cidade: "Chapecó", uf: "SC", lat: -27.1342, lng: -52.6566 },
  { iata: "POA", nome: "Salgado Filho", cidade: "Porto Alegre", uf: "RS", lat: -29.9939, lng: -51.1714 },
  { iata: "CXJ", nome: "Caxias do Sul", cidade: "Caxias do Sul", uf: "RS", lat: -29.1971, lng: -51.1875 },
  { iata: "BSB", nome: "Juscelino Kubitschek", cidade: "Brasília", uf: "DF", lat: -15.8711, lng: -47.9186 },
  { iata: "GYN", nome: "Santa Genoveva", cidade: "Goiânia", uf: "GO", lat: -16.632, lng: -49.2207 },
  { iata: "CGB", nome: "Marechal Rondon", cidade: "Cuiabá", uf: "MT", lat: -15.6529, lng: -56.1167 },
  { iata: "CGR", nome: "Campo Grande", cidade: "Campo Grande", uf: "MS", lat: -20.4687, lng: -54.6725 },
  { iata: "PMW", nome: "Palmas", cidade: "Palmas", uf: "TO", lat: -10.2915, lng: -48.357 },
  { iata: "SSA", nome: "Dep. Luís Eduardo Magalhães", cidade: "Salvador", uf: "BA", lat: -12.9086, lng: -38.3225 },
  { iata: "BPS", nome: "Porto Seguro", cidade: "Porto Seguro", uf: "BA", lat: -16.4386, lng: -39.0809 },
  { iata: "IOS", nome: "Jorge Amado", cidade: "Ilhéus", uf: "BA", lat: -14.816, lng: -39.0333 },
  { iata: "VDC", nome: "Glauber Rocha", cidade: "Vitória da Conquista", uf: "BA", lat: -14.907, lng: -40.915 },
  { iata: "AJU", nome: "Santa Maria", cidade: "Aracaju", uf: "SE", lat: -10.984, lng: -37.0703 },
  { iata: "MCZ", nome: "Zumbi dos Palmares", cidade: "Maceió", uf: "AL", lat: -9.5108, lng: -35.7917 },
  { iata: "REC", nome: "Guararapes", cidade: "Recife", uf: "PE", lat: -8.1265, lng: -34.9236 },
  { iata: "PNZ", nome: "Senador Nilo Coelho", cidade: "Petrolina", uf: "PE", lat: -9.3624, lng: -40.5691 },
  { iata: "FEN", nome: "Fernando de Noronha", cidade: "Fernando de Noronha", uf: "PE", lat: -3.8549, lng: -32.4233 },
  { iata: "JPA", nome: "Castro Pinto", cidade: "João Pessoa", uf: "PB", lat: -7.1484, lng: -34.9505 },
  { iata: "NAT", nome: "São Gonçalo do Amarante", cidade: "Natal", uf: "RN", lat: -5.7681, lng: -35.3761 },
  { iata: "FOR", nome: "Pinto Martins", cidade: "Fortaleza", uf: "CE", lat: -3.7763, lng: -38.5326 },
  { iata: "JJD", nome: "Jericoacoara", cidade: "Cruz", uf: "CE", lat: -2.9067, lng: -40.358 },
  { iata: "JDO", nome: "Orlando Bezerra", cidade: "Juazeiro do Norte", uf: "CE", lat: -7.219, lng: -39.2701 },
  { iata: "THE", nome: "Senador Petrônio Portella", cidade: "Teresina", uf: "PI", lat: -5.0599, lng: -42.8235 },
  { iata: "SLZ", nome: "Marechal Cunha Machado", cidade: "São Luís", uf: "MA", lat: -2.5854, lng: -44.2341 },
  { iata: "IMP", nome: "Imperatriz", cidade: "Imperatriz", uf: "MA", lat: -5.5313, lng: -47.46 },
  { iata: "BEL", nome: "Val de Cans", cidade: "Belém", uf: "PA", lat: -1.3792, lng: -48.4763 },
  { iata: "STM", nome: "Santarém", cidade: "Santarém", uf: "PA", lat: -2.4247, lng: -54.7858 },
  { iata: "MAO", nome: "Eduardo Gomes", cidade: "Manaus", uf: "AM", lat: -3.0386, lng: -60.0497 },
  { iata: "MCP", nome: "Alberto Alcolumbre", cidade: "Macapá", uf: "AP", lat: 0.0507, lng: -51.0722 },
  { iata: "BVB", nome: "Atlas Brasil Cantanhede", cidade: "Boa Vista", uf: "RR", lat: 2.8463, lng: -60.6922 },
  { iata: "PVH", nome: "Governador Jorge Teixeira", cidade: "Porto Velho", uf: "RO", lat: -8.7093, lng: -63.9023 },
  { iata: "RBR", nome: "Plácido de Castro", cidade: "Rio Branco", uf: "AC", lat: -9.8689, lng: -67.8981 },
];

type Ponto = { lat: number; lng: number };

/** Distância em linha reta (km), pela fórmula de Haversine. */
export function distanciaKm(a: Ponto, b: Ponto): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export type AeroportoProximo = Aeroporto & { km: number };

/** Os aeroportos mais próximos de um ponto, do mais perto para o mais longe. */
export function aeroportosProximos(ponto: Ponto, quantos = 3): AeroportoProximo[] {
  return AEROPORTOS.map((a) => ({ ...a, km: distanciaKm(ponto, a) }))
    .sort((x, y) => x.km - y.km)
    .slice(0, quantos);
}

export function aeroportoPorIata(iata: string): Aeroporto | undefined {
  return AEROPORTOS.find((a) => a.iata === iata.toUpperCase());
}
