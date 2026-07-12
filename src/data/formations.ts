import { FORMATION, FormationSlot, Role } from "../config";

export type FormationId = "221" | "311" | "131";

export interface FormationDef {
  id: FormationId;
  label: string;
  slots: FormationSlot[];
}

// All slots use the home-team convention: fx 0 = own goal line, 1 = opponent goal line.
// Each list is grouped by role (all DF together, then all MF, then all FW) so it can be
// zipped positionally against a same-sized, same-grouped list of starting players.
// 6-a-side (1 GK + 5 outfield) to keep the pitch readable.

const F_311: FormationSlot[] = [
  { role: "GK", fx: 0.05, fy: 0.5 },
  { role: "DF", fx: 0.2, fy: 0.2 },
  { role: "DF", fx: 0.18, fy: 0.5 },
  { role: "DF", fx: 0.2, fy: 0.8 },
  { role: "MF", fx: 0.52, fy: 0.5 },
  { role: "FW", fx: 0.78, fy: 0.5 },
];

const F_131: FormationSlot[] = [
  { role: "GK", fx: 0.05, fy: 0.5 },
  { role: "DF", fx: 0.2, fy: 0.5 },
  { role: "MF", fx: 0.48, fy: 0.2 },
  { role: "MF", fx: 0.45, fy: 0.5 },
  { role: "MF", fx: 0.48, fy: 0.8 },
  { role: "FW", fx: 0.78, fy: 0.5 },
];

export const FORMATIONS: Record<FormationId, FormationDef> = {
  "221": { id: "221", label: "2-2-1", slots: FORMATION },
  "311": { id: "311", label: "3-1-1", slots: F_311 },
  "131": { id: "131", label: "1-3-1", slots: F_131 },
};

export function roleCounts(slots: FormationSlot[]): Record<Role, number> {
  const counts: Record<Role, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
  slots.forEach((s) => {
    counts[s.role]++;
  });
  return counts;
}

/** The most of each role any single formation preset needs - a safe minimum squad depth. */
export function maxRoleCounts(): Record<Role, number> {
  const max: Record<Role, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
  (Object.values(FORMATIONS) as FormationDef[]).forEach((def) => {
    const counts = roleCounts(def.slots);
    (Object.keys(counts) as Role[]).forEach((role) => {
      max[role] = Math.max(max[role], counts[role]);
    });
  });
  return max;
}
