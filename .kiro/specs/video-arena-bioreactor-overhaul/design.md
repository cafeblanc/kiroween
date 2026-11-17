# Technical Design: Monster Vault DB, Arena Combat & Bioreactor Overhaul

## 1. Role Distribution Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KIROWEEN MEDIA ENGINE                           │
└────────────────────────────────────────────────────────────────────────┘
          │                                              │
          ▼                                              ▼
┌───────────────────────────────┐              ┌─────────────────────────┐
│     BIOREACTOR INCUBATOR      │              │       CLASH ARENA       │
└───────────────────────────────┘              └─────────────────────────┘
          │                                              │
 ┌────────┴────────┐                          ┌──────────┴──────────┐
 │                 │                          │                     │
 ▼                 ▼                          ▼                     ▼
[6 Curated]     [Custom Monster]        [3 Pre-made Mock]     [All Other Battles]
Standard 6-stage Custom 15s video       Only for:             ★ Dual Confrontation
growth reference (from Vault DB or      - Dragon vs Kraken      Stage (f1 vs f2)
specimens       Studio generation)      - Cerberus vs Hydra   ★ Live Lunge / Strike
                                        - Xeno vs Frank       ★ Optional AI Clash Video
```

---

## 2. Monster Vault DB (IndexedDB Storage Service)

### 2.1 Why IndexedDB over localStorage
- `localStorage` has a hard 5MB limit per origin and blocks the main thread.
- Video files (WebM/MP4) typically weigh 2MB–10MB, and high-res images weigh ~1MB.
- `IndexedDB` is asynchronous, stores raw `Blob` objects natively without Base64 overhead, and supports 500MB+ storage comfortably on all modern browsers.

### 2.2 Storage Schema & API (`src/services/monsterVaultService.ts`)
```typescript
export interface StoredCustomMonster {
  id: string; // e.g. "custom_1731650000000"
  nameKo: string;
  nameEn: string;
  createdAt: number;
  parts: MonsterBodyParts;
  stats: MonsterCombatStats;
  promptKo: string;
  promptEn: string;
  themeHex: string;
  imageBlob?: Blob;
  imageDataUrl?: string;
  videoBlob?: Blob;
  videoMime?: string;
}

export interface MonsterVaultService {
  saveMonster(monster: ComicMonster, extra?: { imageBlob?: Blob; videoBlob?: Blob }): Promise<void>;
  getAllMonsters(): Promise<ComicMonster[]>;
  getMonsterById(id: string): Promise<ComicMonster | null>;
  deleteMonster(id: string): Promise<void>;
  clearVault(): Promise<void>;
}
```

### 2.3 Blob URL Lifecycle & Hydration
- When saving: If `monster.videoSrc` is a `blob:` URL, `fetch(monster.videoSrc).then(r => r.blob())` stores the raw video `Blob` in IndexedDB.
- When loading on app startup:
  - IndexedDB iterates all records.
  - For each monster, `URL.createObjectURL(record.videoBlob)` recreates an active, zero-latency local blob URL for `videoSrc`.
  - Reconstructed `ComicMonster` objects are returned directly into React state (`customArenaRoster`).

---

## 3. Clash Arena Overhaul

### 3.1 Resolving Pre-made vs Dynamic Battles
```typescript
export function selectBattleVideoOrDynamic(
  f1: ComicMonster,
  f2: ComicMonster,
  premadeBattles: ReadonlyArray<readonly [string, string]>,
): string | null {
  // If either fighter is a custom monster, NEVER use a pre-made clash video.
  if (f1.id.startsWith("custom_") || f2.id.startsWith("custom_")) {
    return null;
  }
  const a = toShortName(f1.id);
  const b = toShortName(f2.id);
  const hit = premadeBattles.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return hit ? `/videos/battles/battle_${hit[0]}_vs_${hit[1]}.mp4` : null;
}
```

### 3.2 Dynamic Dual Confrontation Stage
When the return value is `null`, `activeClashVideoUrl` is `null`.
- **Fighter 1 (Left Panel)**: Renders `arenaFighter1.videoSrc` with a pulsing bio-energy aura (`box-shadow` in `arenaFighter1.colorHex`).
- **Fighter 2 (Right Panel)**: Renders `arenaFighter2.videoSrc`.
- **Event Timeline**: Driven by `arenaBattle.ts` (Round 1: 350ms, Round 2: 1500ms, Round 3: 2750ms, Round 4: 5400ms).
  - `f1_strike`: Left panel lunges forward (+60px, scale 1.15), emitting attack particles. Right panel recoils with red flash.
  - `f2_strike`: Right panel counters forward (+60px, scale 1.15). Left panel recoils.
  - `clash`: Screen shockwave pulse.
  - `ko`: Defeated monster fades; winner expands to center stage with victory roar audio.
