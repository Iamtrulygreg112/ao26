export const TITLE = "Alpha Omicron PC '26";

export type Member = { id: string; name: string };

const NAMES = [
  "Alex",
  "Sebastian",
  "Adrian",
  "Ishaan",
  "Husam",
  "Garrett",
  "Will",
  "Aja",
  "Landon",
  "Matheus",
  "Martin",
  "Kaden",
  "Kyle",
  "Hayden",
  "Declan",
  "Tucker",
  "Micah",
  "Wyatt",
  "Jett",
  "Aden",
  "James",
  "Tristan",
  "Xander",
  "Emilio",
  "Kyan",
  "Berk",
  "Gabe",
  "Luca",
  "Chase",
] as const;

export const MEMBERS: Member[] = NAMES.map((name) => ({
  id: name.toLowerCase(),
  name,
}));

export const MEMBER_IDS: string[] = MEMBERS.map((m) => m.id);

export function memberName(id: string): string {
  return MEMBERS.find((m) => m.id === id)?.name ?? id;
}

export const POSITIONS = ["Door", "Roam", "Bar", "Fire Alarm"] as const;
export type Position = (typeof POSITIONS)[number];

export const WEIGHTS = { 1: "Chill", 2: "Normal", 3: "Rough" } as const;
export type Weight = keyof typeof WEIGHTS;

export const TZ = "America/Los_Angeles";
