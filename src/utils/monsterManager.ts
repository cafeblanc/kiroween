/**
 * Monster management helpers (pure, no React, no IndexedDB): names, duplicate detection and cleanup plans, and a
 * small ZIP writer for exporting the vault (stored entries, no compression: images and videos are compressed already).
 */

export const MAX_MONSTER_NAME_CHARS = 40;

/** Trimmed, single-spaced name; null when empty or too long. */
export function validateMonsterName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name || name.length > MAX_MONSTER_NAME_CHARS) return null;
  return name;
}

/** Key for "the same name": case and spacing do not matter ("드래곤 2" is a different name, see uniqueName). */
export function nameKey(name: string): string {
  return name.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

export interface ManagedMonster {
  id: string;
  name: string;
  savedAt: number;
  hasImage: boolean;
  hasVideo: boolean;
}

/** Groups of two or more monsters with the same name key, largest group first. */
export function findDuplicateGroups<T extends ManagedMonster>(monsters: readonly T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const m of monsters) {
    const k = nameKey(m.name);
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), m]);
  }
  return [...groups.values()].filter((g) => g.length > 1).sort((a, b) => b.length - a.length);
}

/** The one to keep in a group: one with an entrance video (it cost money), then one with an image, then the newest. */
export function pickKeeper<T extends ManagedMonster>(group: readonly T[]): T {
  return [...group].sort(
    (a, b) => Number(b.hasVideo) - Number(a.hasVideo) || Number(b.hasImage) - Number(a.hasImage) || b.savedAt - a.savedAt,
  )[0];
}

/** Cleanup plan: per group keep one (pickKeeper) and remove the others. */
export function planDuplicateCleanup<T extends ManagedMonster>(monsters: readonly T[]): { keep: T[]; remove: T[] } {
  const keep: T[] = [];
  const remove: T[] = [];
  for (const g of findDuplicateGroups(monsters)) {
    const k = pickKeeper(g);
    keep.push(k);
    remove.push(...g.filter((m) => m.id !== k.id));
  }
  return { keep, remove };
}

/**
 * Non-destructive cleanup: in every group the keeper keeps its name and the others get "이름 2", "이름 3", ...
 * (unique against all names, including ones assigned earlier in the plan).
 */
export function planDuplicateRenames<T extends ManagedMonster>(monsters: readonly T[]): { id: string; from: string; to: string }[] {
  const taken = monsters.map((m) => m.name);
  const out: { id: string; from: string; to: string }[] = [];
  for (const g of findDuplicateGroups(monsters)) {
    const k = pickKeeper(g);
    for (const m of g) {
      if (m.id === k.id) continue;
      const to = uniqueName(k.name, taken);
      taken.push(to);
      out.push({ id: m.id, from: m.name, to });
    }
  }
  return out;
}

/** A name not used by anyone else: "이름", then "이름 2", "이름 3", ... (compared by name key). */
export function uniqueName(base: string, taken: readonly string[]): string {
  const keys = new Set(taken.map(nameKey));
  const clean = base.replace(/\s+/g, " ").trim() || "괴수";
  if (!keys.has(nameKey(clean))) return clean;
  for (let i = 2; i < 10000; i++) {
    const candidate = `${clean} ${i}`;
    if (!keys.has(nameKey(candidate))) return candidate;
  }
  return `${clean} ${Date.now()}`;
}

/** File or folder name safe on Windows, macOS and Linux (Korean is kept). */
export function safeFileName(name: string, fallback = "monster"): string {
  const s = name
    .replace(/[\\/:*?"<>|\x00-\x1f]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 60);
  return s || fallback;
}

/** File extension for a MIME type (image/png -> png, video/mp4 -> mp4). */
export function extensionFor(mime: string, fallback: string): string {
  const sub = (mime.split("/")[1] ?? "").split(";")[0].trim().toLowerCase();
  if (sub === "jpeg") return "jpg";
  if (sub === "quicktime") return "mov";
  return /^[a-z0-9]{2,5}$/.test(sub) ? sub : fallback;
}

// ---------------------------------------------------------------------------
// ZIP writer (PKZIP "stored" entries, UTF-8 names)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** DOS date/time fields for a JS date (ZIP stores local time with 2-second precision). */
function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/** Builds a ZIP archive. Names must be unique; folders are implied by "/" in names. Up to 4 GB / 65535 entries. */
export function buildZip(entries: readonly ZipEntry[], when: Date = new Date()): Uint8Array {
  const enc = new TextEncoder();
  const { time, date } = dosDateTime(when);
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    const size = e.data.length;
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // UTF-8 names
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true); // local header offset
    central.set(name, 46);

    locals.push(local, e.data);
    centrals.push(central);
    offset += local.length + size;
  }
  const centralSize = centrals.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + end.length);
  let p = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, p);
    p += part.length;
  }
  return out;
}
