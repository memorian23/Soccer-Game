import { FORMATION, FormationSlot, Role } from "../config";

export type FormationId = "442" | "433" | "352" | "4231" | "532";

export interface FormationDef {
  id: FormationId;
  label: string;
  slots: FormationSlot[];
}

// All slots use the home-team convention: fx 0 = own goal line, 1 = opponent goal line.
// Each list is grouped by role (all DF together, then all MF, then all FW) so it can be
// zipped positionally against a same-sized, same-grouped list of starting players.

const F_433: FormationSlot[] = [
  { role: "GK", fx: 0.05, fy: 0.5 },
  { role: "DF", fx: 0.18, fy: 0.14 },
  { role: "DF", fx: 0.15, fy: 0.37 },
  { role: "DF", fx: 0.15, fy: 0.63 },
  { role: "DF", fx: 0.18, fy: 0.86 },
  { role: "MF", fx: 0.42, fy: 0.3 },
  { role: "MF", fx: 0.4, fy: 0.5 },
  { role: "MF", fx: 0.42, fy: 0.7 },
  { role: "FW", fx: 0.72, fy: 0.2 },
  { role: "FW", fx: 0.78, fy: 0.5 },
  { role: "FW", fx: 0.72, fy: 0.8 },
];

const F_352: FormationSlot[] = [
  { role: "GK", fx: 0.05, fy: 0.5 },
  { role: "DF", fx: 0.16, fy: 0.25 },
  { role: "DF", fx: 0.14, fy: 0.5 },
  { role: "DF", fx: 0.16, fy: 0.75 },
  { role: "MF", fx: 0.45, fy: 0.1 },
  { role: "MF", fx: 0.42, fy: 0.32 },
  { role: "MF", fx: 0.4, fy: 0.5 },
  { role: "MF", fx: 0.42, fy: 0.68 },
  { role: "MF", fx: 0.45, fy: 0.9 },
  { role: "FW", fx: 0.75, fy: 0.4 },
  { role: "FW", fx: 0.75, fy: 0.6 },
];

const F_4231: FormationSlot[] = [
  { role: "GK", fx: 0.05, fy: 0.5 },
  { role: "DF", fx: 0.18, fy: 0.14 },
  { role: "DF", fx: 0.15, fy: 0.37 },
  { role: "DF", fx: 0.15, fy: 0.63 },
  { role: "DF", fx: 0.18, fy: 0.86 },
  { role: "MF", fx: 0.35, fy: 0.38 },
  { role: "MF", fx: 0.35, fy: 0.62 },
  { role: "MF", fx: 0.58, fy: 0.2 },
  { role: "MF", fx: 0.58, fy: 0.5 },
  { role: "MF", fx: 0.58, fy: 0.8 },
  { role: "FW", fx: 0.8, fy: 0.5 },
];

const F_532: FormationSlot[] = [
  { role: "GK", fx: 0.05, fy: 0.5 },
  { role: "DF", fx: 0.15, fy: 0.1 },
  { role: "DF", fx: 0.16, fy: 0.3 },
  { role: "DF", fx: 0.14, fy: 0.5 },
  { role: "DF", fx: 0.16, fy: 0.7 },
  { role: "DF", fx: 0.15, fy: 0.9 },
  { role: "MF", fx: 0.42, fy: 0.3 },
  { role: "MF", fx: 0.4, fy: 0.5 },
  { role: "MF", fx: 0.42, fy: 0.7 },
  { role: "FW", fx: 0.75, fy: 0.4 },
  { role: "FW", fx: 0.75, fy: 0.6 },
];

export const FORMATIONS: Record<FormationId, FormationDef> = {
  "442": { id: "442", label: "4-4-2", slots: FORMATION },
  "433": { id: "433", label: "4-3-3", slots: F_433 },
  "352": { id: "352", label: "3-5-2", slots: F_352 },
  "4231": { id: "4231", label: "4-2-3-1", slots: F_4231 },
  "532": { id: "532", label: "5-3-2", slots: F_532 },
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
