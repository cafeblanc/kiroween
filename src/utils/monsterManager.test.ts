import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  MAX_MONSTER_NAME_CHARS,
  buildZip,
  crc32,
  extensionFor,
  findDuplicateGroups,
  nameKey,
  pickKeeper,
  planDuplicateCleanup,
  planDuplicateRenames,
  safeFileName,
  uniqueName,
  validateMonsterName,
  type ManagedMonster,
} from "./monsterManager";

const m = (id: string, name: string, savedAt: number, hasVideo = false, hasImage = true): ManagedMonster => ({
  id,
  name,
  savedAt,
  hasVideo,
  hasImage,
});

describe("names", () => {
  it("validates and tidies a new name", () => {
    expect(validateMonsterName("  불꽃   드래곤 ")).toBe("불꽃 드래곤");
    expect(validateMonsterName("   ")).toBeNull();
    expect(validateMonsterName("가".repeat(MAX_MONSTER_NAME_CHARS + 1))).toBeNull();
  });
  it("treats case and spacing as the same name, a number suffix as a different one", () => {
    expect(nameKey("화염룡  드래곤 커스텀")).toBe(nameKey("화염룡 드래곤 커스텀 "));
    expect(nameKey("Dragon")).toBe(nameKey("dragon"));
    expect(nameKey("드래곤 2")).not.toBe(nameKey("드래곤"));
  });
  it("uniqueName adds the next free number", () => {
    expect(uniqueName("드래곤", ["보르닉스"])).toBe("드래곤");
    expect(uniqueName("드래곤", ["드래곤", "드래곤 2"])).toBe("드래곤 3");
  });
  it("safe file names keep Korean and drop path characters", () => {
    expect(safeFileName('화염룡: "커스텀"/1')).toBe("화염룡_ _커스텀_1");
    expect(safeFileName("...")).toBe("monster");
    expect(extensionFor("image/jpeg", "bin")).toBe("jpg");
    expect(extensionFor("video/mp4", "bin")).toBe("mp4");
    expect(extensionFor("", "png")).toBe("png");
  });
});

describe("duplicates", () => {
  const list = [
    m("a", "화염룡 드래곤 커스텀", 1),
    m("b", "화염룡 드래곤 커스텀", 3),
    m("c", "화염룡  드래곤 커스텀", 2, true),
    m("d", "보르닉스", 5),
    m("e", "Bornyx", 6),
  ];
  it("groups the same names only", () => {
    const g = findDuplicateGroups(list);
    expect(g).toHaveLength(1);
    expect(g[0].map((x) => x.id).sort()).toEqual(["a", "b", "c"]);
  });
  it("keeps the one with a video, then with an image, then the newest", () => {
    expect(pickKeeper(list.slice(0, 3)).id).toBe("c");
    expect(pickKeeper([m("x", "n", 1), m("y", "n", 9)]).id).toBe("y");
    expect(pickKeeper([m("x", "n", 9, false, false), m("y", "n", 1)]).id).toBe("y");
  });
  it("cleanup removes all but one per group and never touches unique names", () => {
    const { keep, remove } = planDuplicateCleanup(list);
    expect(keep.map((x) => x.id)).toEqual(["c"]);
    expect(remove.map((x) => x.id).sort()).toEqual(["a", "b"]);
  });
  it("renaming instead leaves every name unique and keeps the keeper's name", () => {
    const plan = planDuplicateRenames(list);
    expect(plan.map((p) => p.id).sort()).toEqual(["a", "b"]);
    const names = list.map((x) => plan.find((p) => p.id === x.id)?.to ?? x.name);
    expect(findDuplicateGroups(list.map((x, i) => ({ ...x, name: names[i] })))).toHaveLength(0);
    expect(names[2]).toBe("화염룡  드래곤 커스텀");
  });
  it("properties: cleanup and renames always end with no duplicates", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ name: fc.constantFrom("가", "나", "가 ", "다", "A", "a"), savedAt: fc.nat(), hasVideo: fc.boolean() }), { maxLength: 30 }),
        (rows) => {
          const ms = rows.map((r, i) => ({ id: `m${i}`, hasImage: true, ...r }));
          const { remove } = planDuplicateCleanup(ms);
          const left = ms.filter((x) => !remove.includes(x));
          expect(findDuplicateGroups(left)).toHaveLength(0);
          const ren = planDuplicateRenames(ms);
          const renamed = ms.map((x) => ({ ...x, name: ren.find((p) => p.id === x.id)?.to ?? x.name }));
          expect(findDuplicateGroups(renamed)).toHaveLength(0);
        },
      ),
    );
  });
});

describe("ZIP writer", () => {
  it("crc32 matches the standard value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("writes a valid archive: signatures, entry count, offsets and UTF-8 names", () => {
    const enc = new TextEncoder();
    const files = [
      { name: "01_화염룡/meta.json", data: enc.encode('{"a":1}') },
      { name: "01_화염룡/image.jpg", data: new Uint8Array([1, 2, 3, 4]) },
    ];
    const zip = buildZip(files, new Date(2026, 10, 20, 12, 30, 10));
    const v = new DataView(zip.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    const endAt = zip.length - 22;
    expect(v.getUint32(endAt, true)).toBe(0x06054b50);
    expect(v.getUint16(endAt + 10, true)).toBe(2);
    const cdOffset = v.getUint32(endAt + 16, true);
    const cdSize = v.getUint32(endAt + 12, true);
    expect(cdOffset + cdSize).toBe(endAt);
    expect(v.getUint32(cdOffset, true)).toBe(0x02014b50);
    // The second entry's local header is where the central directory says
    const nameLen1 = enc.encode(files[0].name).length;
    const secondCentral = cdOffset + 46 + nameLen1;
    const localOffset2 = v.getUint32(secondCentral + 42, true);
    expect(v.getUint32(localOffset2, true)).toBe(0x04034b50);
    expect(v.getUint16(6, true) & 0x0800).toBe(0x0800);
    expect(new TextDecoder().decode(zip.slice(30, 30 + nameLen1))).toBe("01_화염룡/meta.json");
    expect(v.getUint32(14, true)).toBe(crc32(files[0].data));
  });

  it("an empty archive is just the end record", () => {
    const zip = buildZip([]);
    expect(zip.length).toBe(22);
    expect(new DataView(zip.buffer).getUint32(0, true)).toBe(0x06054b50);
  });
});
