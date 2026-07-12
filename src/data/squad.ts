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

// Fictional squad for 6-a-side play. Deep enough at every position (GK 2, DF 4, MF 4, FW 2)
// to fully staff whichever formation preset is selected on the tactics board, with a couple
// of players left over for the bench.
export const DEFAULT_SQUAD: PlayerProfile[] = [
  { id: "gk1", name: "강태민", number: 1, role: "GK", rating: 82 },
  { id: "gk2", name: "윤성호", number: 21, role: "GK", rating: 74 },

  { id: "df1", name: "오현우", number: 2, role: "DF", rating: 83 },
  { id: "df2", name: "배진혁", number: 3, role: "DF", rating: 80 },
  { id: "df3", name: "서준영", number: 4, role: "DF", rating: 81 },
  { id: "df4", name: "임재훈", number: 5, role: "DF", rating: 78 },

  { id: "mf1", name: "한지훈", number: 6, role: "MF", rating: 84 },
  { id: "mf2", name: "송재현", number: 7, role: "MF", rating: 85 },
  { id: "mf3", name: "문성민", number: 8, role: "MF", rating: 79 },
  { id: "mf4", name: "유경수", number: 10, role: "MF", rating: 82 },

  { id: "fw1", name: "최도현", number: 9, role: "FW", rating: 87 },
  { id: "fw2", name: "신우진", number: 11, role: "FW", rating: 83 },
];
