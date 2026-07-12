import { Role } from "../config";

export const CLUB_NAME = "우리 FC";
export const STARTING_BUDGET = 300;

export interface PlayerProfile {
  id: string;
  name: string;
  number: number;
  role: Role;
  rating: number;
}

// Fictional squad. Deep enough at every position (GK 2, DF 6, MF 6, FW 4) to fully staff
// whichever formation preset is selected on the tactics board, with players left over for
// the bench.
export const DEFAULT_SQUAD: PlayerProfile[] = [
  { id: "gk1", name: "강태민", number: 1, role: "GK", rating: 82 },
  { id: "gk2", name: "윤성호", number: 21, role: "GK", rating: 74 },

  { id: "df1", name: "오현우", number: 2, role: "DF", rating: 83 },
  { id: "df2", name: "배진혁", number: 3, role: "DF", rating: 80 },
  { id: "df3", name: "서준영", number: 4, role: "DF", rating: 81 },
  { id: "df4", name: "임재훈", number: 5, role: "DF", rating: 78 },
  { id: "df5", name: "노민석", number: 22, role: "DF", rating: 75 },
  { id: "df6", name: "표동건", number: 15, role: "DF", rating: 72 },

  { id: "mf1", name: "한지훈", number: 6, role: "MF", rating: 84 },
  { id: "mf2", name: "송재현", number: 7, role: "MF", rating: 85 },
  { id: "mf3", name: "문성민", number: 8, role: "MF", rating: 79 },
  { id: "mf4", name: "유경수", number: 10, role: "MF", rating: 82 },
  { id: "mf5", name: "백승우", number: 14, role: "MF", rating: 74 },
  { id: "mf6", name: "나건우", number: 17, role: "MF", rating: 76 },

  { id: "fw1", name: "최도현", number: 9, role: "FW", rating: 87 },
  { id: "fw2", name: "신우진", number: 11, role: "FW", rating: 83 },
  { id: "fw3", name: "장민호", number: 19, role: "FW", rating: 79 },
  { id: "fw4", name: "구자윤", number: 20, role: "FW", rating: 75 },
];
