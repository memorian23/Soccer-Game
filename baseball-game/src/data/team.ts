export interface BatterProfile {
  id: string;
  name: string;
  number: number;
  position: string; // fielding position, display only for now
  contact: number; // 0-99, chance to put the ball in play rather than miss/take
  power: number; // 0-99, chance a ball in play goes for extra bases
}

export interface PitcherProfile {
  id: string;
  name: string;
  number: number;
  control: number; // 0-99, chance a thrown pitch lands where intended (used later)
  stamina: number; // 0-99
}

export interface Team {
  id: string;
  name: string;
  lineup: BatterProfile[];
  pitcher: PitcherProfile;
}

export const HOME_TEAM: Team = {
  id: "home",
  name: "서울 팰컨스",
  pitcher: { id: "h-p1", name: "박건우", number: 18, control: 62, stamina: 80 },
  lineup: [
    { id: "h1", name: "이도윤", number: 2, position: "SS", contact: 78, power: 55 },
    { id: "h2", name: "정민재", number: 24, position: "2B", contact: 74, power: 50 },
    { id: "h3", name: "김태양", number: 10, position: "CF", contact: 80, power: 68 },
    { id: "h4", name: "최우진", number: 33, position: "1B", contact: 70, power: 85 },
    { id: "h5", name: "한상혁", number: 27, position: "3B", contact: 68, power: 74 },
    { id: "h6", name: "오세훈", number: 7, position: "LF", contact: 72, power: 62 },
    { id: "h7", name: "배지훈", number: 44, position: "RF", contact: 65, power: 58 },
    { id: "h8", name: "윤성민", number: 12, position: "C", contact: 60, power: 45 },
    { id: "h9", name: "강도현", number: 5, position: "P", contact: 40, power: 30 },
  ],
};

export const AWAY_TEAM: Team = {
  id: "away",
  name: "인천 웨일즈",
  pitcher: { id: "a-p1", name: "서준혁", number: 21, control: 58, stamina: 78 },
  lineup: [
    { id: "a1", name: "장하준", number: 3, position: "2B", contact: 76, power: 52 },
    { id: "a2", name: "임재원", number: 8, position: "SS", contact: 73, power: 48 },
    { id: "a3", name: "송민혁", number: 25, position: "1B", contact: 71, power: 82 },
    { id: "a4", name: "황태석", number: 34, position: "CF", contact: 69, power: 79 },
    { id: "a5", name: "노경준", number: 19, position: "3B", contact: 66, power: 70 },
    { id: "a6", name: "권도영", number: 9, position: "RF", contact: 70, power: 60 },
    { id: "a7", name: "안현수", number: 15, position: "LF", contact: 64, power: 56 },
    { id: "a8", name: "문성재", number: 22, position: "C", contact: 58, power: 44 },
    { id: "a9", name: "조은성", number: 1, position: "P", contact: 38, power: 28 },
  ],
};
