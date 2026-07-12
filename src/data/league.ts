export interface ClubInfo {
  id: string;
  name: string;
  /** Abstract strength rating (roughly the same scale as player ratings) used only to weight AI-vs-AI results. */
  strength: number;
}

export const PLAYER_CLUB_ID = "us";

export const AI_CLUBS: ClubInfo[] = [
  { id: "seoul", name: "서울 유나이티드", strength: 80 },
  { id: "busan", name: "부산 다이나모", strength: 78 },
  { id: "incheon", name: "인천 스틸러스", strength: 76 },
  { id: "daegu", name: "대구 피닉스", strength: 74 },
  { id: "gwangju", name: "광주 레이온스", strength: 72 },
];

export interface Fixture {
  round: number;
  homeId: string;
  awayId: string;
  played: boolean;
  homeScore: number | null;
  awayScore: number | null;
}

/**
 * Standard "circle method" round-robin schedule: for n teams (n even) it produces n-1 rounds
 * of n/2 matches each, every team playing every other team exactly once.
 */
export function generateRoundRobin(teamIds: string[]): Fixture[] {
  const ids = teamIds.slice();
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const fixtures: Fixture[] = [];

  const arr = ids.slice();
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      const swap = (round + i) % 2 === 1;
      fixtures.push({
        round: round + 1,
        homeId: swap ? b : a,
        awayId: swap ? a : b,
        played: false,
        homeScore: null,
        awayScore: null,
      });
    }
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return fixtures;
}
