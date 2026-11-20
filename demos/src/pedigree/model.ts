// Pedigree model: generate a random pedigree under a hidden mode of inheritance, and
// decide whether a mode is CONSISTENT with the phenotypes by enumerating genotypes.
//
// Assumptions (stated in the demo): one gene, two alleles, full penetrance, no new
// mutations. Founders (people with no parents in the pedigree) may have any genotype,
// so an unaffected founder may be a carrier.
//
// A genotype is the NUMBER OF DISEASE ALLELES: 0, 1, 2 for autosomes and for X-linked
// females; 0 or 1 for X-linked males (hemizygous).
import { rng } from "../lib/ui";

export type Mode = "AR" | "AD" | "XR" | "XD";
export const MODES: Mode[] = ["AR", "AD", "XR", "XD"];
export const MODE_NAME: Record<Mode, string> = {
  AR: "autosomal recessive", AD: "autosomal dominant", XR: "X-linked recessive", XD: "X-linked dominant",
};

export type Sex = "M" | "F";
export interface Person {
  id: number; sex: Sex; gen: number;
  father: number; mother: number;   // -1 for a founder
  g: number;                        // true genotype (number of disease alleles)
  aff: boolean;                     // phenotype
  dead: boolean;
  x: number;                        // layout position, in slot units
  label: string;                    // "II-3"
}
export interface Couple { a: number; b: number; consang: boolean; kids: number[] }
export interface Pedigree { mode: Mode; people: Person[]; couples: Couple[]; gens: number; width: number; proband: number }

const isX = (m: Mode) => m === "XR" || m === "XD";

export function maxG(m: Mode, s: Sex): number { return isX(m) && s === "M" ? 1 : 2; }

export function affected(m: Mode, s: Sex, g: number): boolean {
  switch (m) {
    case "AR": return g === 2;
    case "AD": return g >= 1;
    case "XR": return s === "M" ? g === 1 : g === 2;
    case "XD": return g >= 1;
  }
}

/** Genotypes allowed by a person's phenotype under mode m. */
export function domain(m: Mode, p: { sex: Sex; aff: boolean }): number[] {
  const out: number[] = [];
  for (let g = 0; g <= maxG(m, p.sex); g++) if (affected(m, p.sex, g) === p.aff) out.push(g);
  return out;
}

/** Alleles (0 = normal, 1 = disease) a parent with genotype g can pass on (autosome or mother's X). */
const alleles = (g: number): number[] => (g === 0 ? [0] : g === 2 ? [1] : [0, 1]);

/** Child genotypes possible from parents with genotypes gf, gm. */
export function childGenos(m: Mode, sex: Sex, gf: number, gm: number): number[] {
  const set = new Set<number>();
  for (const am of alleles(gm)) {
    if (!isX(m)) for (const af of alleles(gf)) set.add(af + am);
    else if (sex === "M") set.add(am);          // a son gets his mother's X and his father's Y
    else set.add(gf + am);                      // a daughter gets her father's only X
  }
  return [...set];
}

// ---------------------------------------------------------------- consistency

/**
 * Backtracking search over genotypes, in id order (parents always have smaller ids than
 * their children). `fixed` pins some people to one genotype. Returns one full assignment,
 * or null if no assignment fits every phenotype and every transmission.
 */
export function solve(ped: Pedigree, m: Mode, fixed: Map<number, number> = new Map()): number[] | null {
  const P = ped.people, n = P.length;
  const dom = P.map(p => (fixed.has(p.id) ? domain(m, p).filter(g => g === fixed.get(p.id)) : domain(m, p)));
  const asg = new Array<number>(n).fill(-1);
  let steps = 0;
  const rec = (i: number): boolean => {
    if (i === n) return true;
    if (++steps > 2e6) return false;
    const p = P[i];
    let opts = dom[i];
    if (p.father >= 0) {
      const ok = childGenos(m, p.sex, asg[p.father], asg[p.mother]);
      opts = opts.filter(g => ok.includes(g));
    }
    for (const g of opts) { asg[i] = g; if (rec(i + 1)) return true; }
    asg[i] = -1;
    return false;
  };
  return rec(0) ? asg : null;
}

/** For each person, the set of genotypes that occur in at least one consistent assignment. */
export function possibleGenotypes(ped: Pedigree, m: Mode): number[][] | null {
  if (!solve(ped, m)) return null;
  return ped.people.map(p => domain(m, p).filter(g => solve(ped, m, new Map([[p.id, g]])) !== null));
}

export interface Conflict { father: number; mother: number; child: number; why: string }

/** Parent–child trios that are impossible under m, judged from phenotypes alone. */
export function conflicts(ped: Pedigree, m: Mode): Conflict[] {
  const P = ped.people, out: Conflict[] = [];
  for (const c of P) {
    if (c.father < 0) continue;
    const F = P[c.father], M = P[c.mother];
    let ok = false;
    for (const gf of domain(m, F)) for (const gm of domain(m, M))
      if (childGenos(m, c.sex, gf, gm).some(g => domain(m, c).includes(g))) ok = true;
    if (!ok) out.push({ father: F.id, mother: M.id, child: c.id, why: reason(m, F, M, c) });
  }
  return out;
}

function reason(m: Mode, F: Person, M: Person, C: Person): string {
  const son = C.sex === "M", kid = son ? "son" : "daughter";
  switch (m) {
    case "AD":
      return `${F.label} and ${M.label} are both unaffected (aa × aa), but their ${kid} ${C.label} is affected. Under autosomal dominant every affected child has an affected parent.`;
    case "AR":
      return `${F.label} and ${M.label} are both affected (aa × aa), so every child must be aa, but their ${kid} ${C.label} is unaffected.`;
    case "XR":
      if (son) return `${M.label} is an affected woman (XᵃXᵃ), so every son gets Xᵃ, but her son ${C.label} is unaffected.`;
      if (C.aff) return `${C.label} is an affected daughter, so she needs Xᵃ from her father, but her father ${F.label} is unaffected (XᴬY).`;
      return `${F.label} and ${M.label} are both affected, so their daughter ${C.label} gets Xᵃ from each parent, but she is unaffected.`;
    case "XD":
      if (!son) {
        if (!C.aff) return `${F.label} is an affected father: every daughter gets his Xᴬ, but his daughter ${C.label} is unaffected.`;
        return `${C.label} is an affected daughter of two unaffected parents (XᵃY × XᵃXᵃ).`;
      }
      if (F.aff) return `Male-to-male transmission: ${C.label} is affected like his father ${F.label}, but a son gets his father's Y, not his X. His mother ${M.label} is unaffected, so she has no Xᴬ to give.`;
      return `${C.label} is an affected son, so he needs Xᴬ from his mother, but ${M.label} is unaffected.`;
  }
}

// ---------------------------------------------------------------- generation

type R = ReturnType<typeof rng>;
const ROMAN = ["I", "II", "III", "IV"];

function pick<T>(r: R, a: T[]): T { return a[Math.floor(r.unif() * a.length)]; }
function int(r: R, lo: number, hi: number): number { return lo + Math.floor(r.unif() * (hi - lo + 1)); }

/** One attempt: build the family structure and genotypes. May be rejected by the caller. */
function attempt(m: Mode, r: R): Pedigree {
  const people: Person[] = [], couples: Couple[] = [];
  const add = (sex: Sex, gen: number, father = -1, mother = -1): number => {
    people.push({ id: people.length, sex, gen, father, mother, g: 0, aff: false, dead: false, x: 0, label: "" });
    return people.length - 1;
  };
  const sexR = (): Sex => (r.unif() < 0.5 ? "M" : "F");
  const marry = (a: number, b: number, consang = false): Couple => {
    const c = { a, b, consang, kids: [] as number[] };
    couples.push(c);
    return c;
  };
  const haveKids = (c: Couple, k: number, gen: number) => {
    const [f, mo] = people[c.a].sex === "M" ? [c.a, c.b] : [c.b, c.a];
    for (let i = 0; i < k; i++) c.kids.push(add(sexR(), gen, f, mo));
  };
  const gens = r.unif() < 0.5 ? 3 : 4;

  // I: the founding couple
  const root = marry(add("M", 1), add("F", 1));
  haveKids(root, int(r, 2, 4), 2);
  // II: most children marry in a spouse and have a family
  const famII: Couple[] = [];
  for (const k of [...root.kids]) {
    if (r.unif() < 0.8 || famII.length === 0) {
      const c = marry(k, add(people[k].sex === "M" ? "F" : "M", 2));
      haveKids(c, int(r, 1, 4), 3);
      famII.push(c);
    }
  }
  // IV: a cousin marriage (more often under AR, but not only), and/or an ordinary one
  if (gens === 4) {
    const married = new Set<number>();
    if (famII.length >= 2 && r.unif() < (m === "AR" ? 0.55 : 0.2)) {
      const j = int(r, 0, famII.length - 2), L = famII[j].kids, Rk = famII[j + 1].kids;
      const a = pick(r, L), opp = Rk.filter(k => people[k].sex !== people[a].sex);
      if (opp.length) {
        const b = pick(r, opp);
        // put the cousins next to each other: a last in its sibship, b first in its own
        L.splice(L.indexOf(a), 1); L.push(a);
        Rk.splice(Rk.indexOf(b), 1); Rk.unshift(b);
        haveKids(marry(a, b, true), int(r, 1, 2), 4);
        married.add(a); married.add(b);
      }
    }
    const pool = famII.flatMap(c => c.kids).filter(k => !married.has(k));
    const nOut = married.size ? int(r, 0, 1) : int(r, 1, 2);
    for (let i = 0; i < nOut && pool.length; i++) {
      const k = pool.splice(Math.floor(r.unif() * pool.length), 1)[0];
      const c = marry(k, add(people[k].sex === "M" ? "F" : "M", 3));
      haveKids(c, int(r, 1, 3), 4);
    }
  }

  // genotypes: founders by role, then Mendelian transmission in id order
  const [i1, i2] = [root.a, root.b];
  // the founding couple (I-1 male, I-2 female): one of a few typical starts per mode
  const u = r.unif(), v = r.unif();
  let g0: [number, number];
  switch (m) {
    case "AD": g0 = u < 0.5 ? [1, 0] : [0, 1]; break;
    case "AR": g0 = u < 0.45 ? [1, 1] : u < 0.7 ? (v < 0.5 ? [2, 0] : [0, 2]) : (v < 0.5 ? [1, 0] : [0, 1]); break;
    case "XR": g0 = u < 0.8 ? [0, 1] : [1, 0]; break;   // usually a carrier grandmother
    case "XD": g0 = u < 0.5 ? [1, 0] : [0, 1]; break;
  }
  const founderG = (p: Person): number => {
    if (p.id === i1) return g0[0];
    if (p.id === i2) return g0[1];
    // married-in spouses: usually homozygous normal; carriers sometimes for recessives
    if (m === "AR") return r.unif() < 0.2 ? 1 : 0;
    if (m === "XR" && p.sex === "F") return r.unif() < 0.05 ? 1 : 0;
    return 0;
  };
  for (const p of people) {
    if (p.father < 0) p.g = founderG(p);
    else {
      const gf = people[p.father].g, gm = people[p.mother].g;
      const draw = (g: number) => (g === 1 ? (r.unif() < 0.5 ? 1 : 0) : g / 2);
      p.g = isX(m) ? (p.sex === "M" ? draw(gm) : gf + draw(gm)) : draw(gf) + draw(gm);
    }
    p.aff = affected(m, p.sex, p.g);
  }
  if (r.unif() < 0.5) { people[i1].dead = true; people[i2].dead = r.unif() < 0.6; }

  const ped: Pedigree = { mode: m, people, couples, gens, width: 0, proband: -1 };
  layout(ped);
  return ped;
}

/** Place people in slots: each family is as wide as its children (or the couple). */
function layout(ped: Pedigree): void {
  const P = ped.people;
  const coupleOf = new Map<number, Couple>();       // blood relative -> their marriage
  for (const c of ped.couples) {
    if (c.consang) continue;
    coupleOf.set(c.a, c);                          // marry(blood relative, spouse)
  }
  const width = (id: number): number => {
    const c = coupleOf.get(id);
    if (!c) return 1;
    return Math.max(2, c.kids.reduce((s, k) => s + width(k), 0));
  };
  // spouseLeft: the first child of a sibship has the spouse on the outside (left), so the
  // sibship line does not run over a spouse
  const place = (id: number, left: number, spouseLeft = false): void => {
    const c = coupleOf.get(id), w = width(id);
    if (!c) { P[id].x = left + 0.5; return; }
    const sum = c.kids.reduce((s, k) => s + width(k), 0);
    let x = left + (w - sum) / 2;
    c.kids.forEach((k, i) => { place(k, x, i === 0 && c.kids.length > 1); x += width(k); });
    let mid = c.kids.length ? (P[c.kids[0]].x + P[c.kids[c.kids.length - 1]].x) / 2 : left + w / 2;
    mid = Math.min(left + w - 1, Math.max(left + 1, mid));
    const other = c.a === id ? c.b : c.a;
    P[id].x = mid + (spouseLeft ? 0.5 : -0.5); P[other].x = mid + (spouseLeft ? -0.5 : 0.5);
  };
  place(ped.couples[0].a, 0);
  ped.width = width(ped.couples[0].a);
  for (const c of ped.couples) if (c.consang) {
    const mid = (P[c.a].x + P[c.b].x) / 2, k = c.kids.length;
    c.kids.forEach((id, i) => { P[id].x = mid + (i - (k - 1) / 2); });
  }
  // labels: generation in roman numerals, then left to right
  for (let g = 1; g <= ped.gens; g++)
    P.filter(p => p.gen === g).sort((a, b) => a.x - b.x).forEach((p, i) => { p.label = `${ROMAN[g - 1]}-${i + 1}`; });
}

/** A seeded pedigree under mode m. Rejects dull or crowded families. */
export function generate(m: Mode, seed: number): Pedigree {
  const r = rng(seed * 7919 + 13);
  let best: Pedigree | null = null;
  for (let t = 0; t < 400; t++) {
    const ped = attempt(m, r);
    const n = ped.people.length, na = ped.people.filter(p => p.aff).length;
    if (ped.width > 13 || n > 28 || na < 2 || na > 0.5 * n) continue;
    if (ped.people.filter(p => p.aff && p.gen >= 2).length < 2) continue;
    // keep some pedigrees where every mode fits, but not too many
    const nConsistent = MODES.filter(mm => solve(ped, mm)).length;
    if (nConsistent === 4 && r.unif() < 0.6) { best = best ?? ped; continue; }
    best = ped;
    break;
  }
  const ped = best!;
  // proband: an affected person in the youngest generation that has one
  const aff = ped.people.filter(p => p.aff);
  const lastGen = Math.max(...aff.map(p => p.gen));
  const cand = aff.filter(p => p.gen === lastGen);
  ped.proband = cand[Math.floor(rng(seed).unif() * cand.length)].id;
  return ped;
}
