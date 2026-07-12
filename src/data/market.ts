import { PlayerProfile } from "./squad";

export interface MarketPlayer extends PlayerProfile {
  price: number;
}

// A rotating pool of signable fictional players. Prices roughly track rating so stronger
// players cost more of the club's transfer budget.
export const MARKET_POOL: MarketPlayer[] = [
  { id: "mkt_gk1", name: "조성빈", number: 31, role: "GK", rating: 79, price: 100 },
  { id: "mkt_df1", name: "안현빈", number: 23, role: "DF", rating: 85, price: 170 },
  { id: "mkt_df2", name: "류재원", number: 24, role: "DF", rating: 77, price: 90 },
  { id: "mkt_mf1", name: "천도현", number: 16, role: "MF", rating: 86, price: 180 },
  { id: "mkt_mf2", name: "오승빈", number: 18, role: "MF", rating: 80, price: 120 },
  { id: "mkt_fw1", name: "강두준", number: 30, role: "FW", rating: 88, price: 200 },
  { id: "mkt_fw2", name: "윤상혁", number: 27, role: "FW", rating: 81, price: 130 },
  { id: "mkt_fw3", name: "임태양", number: 29, role: "FW", rating: 77, price: 95 },
];
