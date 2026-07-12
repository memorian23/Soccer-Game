import { AI_CLUBS, Fixture, generateRoundRobin, PLAYER_CLUB_ID } from "../data/league";
import { CLUB_NAME } from "../data/squad";
import { teamState } from "./teamState";

export interface StandingRow {
  id: string;
  name: string;
  isPlayer: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

function clubName(id: string): string {
  if (id === PLAYER_CLUB_ID) return CLUB_NAME;
  return AI_CLUBS.find((c) => c.id === id)?.name ?? id;
}

function clubStrength(id: string): number {
  if (id === PLAYER_CLUB_ID) {
    const xi = teamState.getStartingXI();
    if (xi.length === 0) return 75;
    return xi.reduce((sum, p) => sum + p.rating, 0) / xi.length;
  }
  return AI_CLUBS.find((c) => c.id === id)?.strength ?? 70;
}

/** Rough Poisson-ish goal count centered on `expected`, capped to a sane range. */
function randomGoals(expected: number): number {
  let goals = 0;
  let remaining = expected;
  while (remaining > 0) {
    if (Math.random() < Math.min(remaining, 1)) goals++;
    remaining -= 1;
  }
  return Math.max(0, Math.min(6, goals));
}

function simulateScore(homeStrength: number, awayStrength: number): [number, number] {
  const diff = homeStrength - awayStrength;
  const expectedHome = Math.max(0.3, 1.35 + diff / 18);
  const expectedAway = Math.max(0.3, 1.15 - diff / 18);
  return [randomGoals(expectedHome), randomGoals(expectedAway)];
}

/**
 * Single module-level season: a 6-club round robin (the player's club plus 5 AI clubs).
 * AI-vs-AI fixtures for a round are simulated instantly the moment that round is viewed;
 * the player's own fixture is left pending until they actually play it in MatchScene.
 */
class LeagueState {
  private clubIds: string[] = [PLAYER_CLUB_ID, ...AI_CLUBS.map((c) => c.id)];
  private fixtures: Fixture[] = generateRoundRobin(this.clubIds);
  private currentRound = 1;
  readonly totalRounds = this.clubIds.length - 1;

  private ensureAiFixturesSimulated(round: number) {
    this.fixtures
      .filter((f) => f.round === round && !f.played && f.homeId !== PLAYER_CLUB_ID && f.awayId !== PLAYER_CLUB_ID)
      .forEach((f) => {
        const [hs, as] = simulateScore(clubStrength(f.homeId), clubStrength(f.awayId));
        f.played = true;
        f.homeScore = hs;
        f.awayScore = as;
      });
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  isSeasonComplete(): boolean {
    return this.currentRound > this.totalRounds;
  }

  getCurrentRoundFixtures(): Fixture[] {
    if (this.isSeasonComplete()) return this.fixtures.filter((f) => f.round === this.totalRounds);
    this.ensureAiFixturesSimulated(this.currentRound);
    return this.fixtures.filter((f) => f.round === this.currentRound);
  }

  getPlayerFixtureThisRound(): Fixture | null {
    if (this.isSeasonComplete()) return null;
    this.ensureAiFixturesSimulated(this.currentRound);
    return this.fixtures.find((f) => f.round === this.currentRound && (f.homeId === PLAYER_CLUB_ID || f.awayId === PLAYER_CLUB_ID)) ?? null;
  }

  isPlayerHome(fixture: Fixture): boolean {
    return fixture.homeId === PLAYER_CLUB_ID;
  }

  getOpponentName(fixture: Fixture): string {
    const opponentId = fixture.homeId === PLAYER_CLUB_ID ? fixture.awayId : fixture.homeId;
    return clubName(opponentId);
  }

  getClubName(id: string): string {
    return clubName(id);
  }

  /** Records the human team's result (in MatchScene's own home/away terms) and advances the round. */
  recordPlayerResult(playerScore: number, opponentScore: number) {
    const fixture = this.fixtures.find(
      (f) => f.round === this.currentRound && !f.played && (f.homeId === PLAYER_CLUB_ID || f.awayId === PLAYER_CLUB_ID),
    );
    if (!fixture) return;

    fixture.played = true;
    if (fixture.homeId === PLAYER_CLUB_ID) {
      fixture.homeScore = playerScore;
      fixture.awayScore = opponentScore;
    } else {
      fixture.homeScore = opponentScore;
      fixture.awayScore = playerScore;
    }

    this.currentRound++;
  }

  getStandings(): StandingRow[] {
    const rows = new Map<string, StandingRow>();
    this.clubIds.forEach((id) => {
      rows.set(id, { id, name: clubName(id), isPlayer: id === PLAYER_CLUB_ID, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    });

    this.fixtures.forEach((f) => {
      if (!f.played || f.homeScore === null || f.awayScore === null) return;
      const home = rows.get(f.homeId)!;
      const away = rows.get(f.awayId)!;
      home.played++;
      away.played++;
      home.goalsFor += f.homeScore;
      home.goalsAgainst += f.awayScore;
      away.goalsFor += f.awayScore;
      away.goalsAgainst += f.homeScore;
      if (f.homeScore > f.awayScore) {
        home.won++;
        home.points += 3;
        away.lost++;
      } else if (f.homeScore < f.awayScore) {
        away.won++;
        away.points += 3;
        home.lost++;
      } else {
        home.drawn++;
        home.points += 1;
        away.drawn++;
        away.points += 1;
      }
    });

    return Array.from(rows.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      return b.goalsFor - a.goalsFor;
    });
  }

  resetSeason() {
    this.fixtures = generateRoundRobin(this.clubIds);
    this.currentRound = 1;
  }
}

export const leagueState = new LeagueState();
