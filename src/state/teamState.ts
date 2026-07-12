import { FormationSlot, Role } from "../config";
import { DEFAULT_SQUAD, PlayerProfile } from "../data/squad";
import { FORMATIONS, FormationId, roleCounts } from "../data/formations";

const ROLES: Role[] = ["GK", "DF", "MF", "FW"];

function groupByRole(players: PlayerProfile[]): Record<Role, PlayerProfile[]> {
  const grouped: Record<Role, PlayerProfile[]> = { GK: [], DF: [], MF: [], FW: [] };
  players.forEach((p) => grouped[p.role].push(p));
  return grouped;
}

/**
 * Holds the human team's squad, chosen formation, and starting XI. A single module-level
 * instance so the menu, tactics board, squad screen, and match all share the same state -
 * choices made before kickoff persist until changed again.
 */
class TeamState {
  squad: PlayerProfile[] = DEFAULT_SQUAD;
  private formationId: FormationId = "442";
  private startingIds: string[] = [];

  constructor() {
    this.rebuildStarting();
  }

  private rebuildStarting() {
    const counts = roleCounts(FORMATIONS[this.formationId].slots);
    const prevStarting = new Set(this.startingIds);
    const byRole = groupByRole(this.squad);
    const next: string[] = [];

    ROLES.forEach((role) => {
      const need = counts[role] ?? 0;
      const pool = byRole[role].slice().sort((a, b) => {
        const aPrev = prevStarting.has(a.id) ? 1 : 0;
        const bPrev = prevStarting.has(b.id) ? 1 : 0;
        if (aPrev !== bPrev) return bPrev - aPrev; // keep existing starters when possible
        return b.rating - a.rating;
      });
      next.push(...pool.slice(0, need).map((p) => p.id));
    });

    this.startingIds = next;
  }

  getFormationId(): FormationId {
    return this.formationId;
  }

  setFormation(id: FormationId) {
    if (id === this.formationId) return;
    this.formationId = id;
    this.rebuildStarting();
  }

  getStartingXI(): PlayerProfile[] {
    return this.startingIds.map((id) => this.squad.find((p) => p.id === id)!);
  }

  getBench(): PlayerProfile[] {
    const startSet = new Set(this.startingIds);
    return this.squad.filter((p) => !startSet.has(p.id));
  }

  /** Swaps a bench player into the XI in place of a starting player. Both must share a role. */
  swapIntoStarting(benchId: string, startingId: string) {
    const bench = this.squad.find((p) => p.id === benchId);
    const starter = this.squad.find((p) => p.id === startingId);
    if (!bench || !starter || bench.role !== starter.role) return;
    const idx = this.startingIds.indexOf(startingId);
    if (idx === -1) return;
    this.startingIds[idx] = benchId;
  }

  /** Pairs each formation slot (grouped by role) with a starting player of that role. */
  getLineup(): { slot: FormationSlot; player: PlayerProfile }[] {
    const slots = FORMATIONS[this.formationId].slots;
    const byRole = groupByRole(this.getStartingXI());
    const cursor: Record<Role, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
    return slots.map((slot) => ({
      slot,
      player: byRole[slot.role][cursor[slot.role]++],
    }));
  }
}

export const teamState = new TeamState();
