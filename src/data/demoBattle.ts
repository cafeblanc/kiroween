/**
 * Free demo battles for judges and first-time visitors: battle videos made earlier with the LTX API, served as
 * static files so replaying them costs nothing. The first entry is the 16 s showcase (demoBattle.json and
 * public/videos/battles/demo_battle.mp4, written by scripts/gen-demo-battle.mjs); the others are 12 s battles
 * made in the app and exported from the Monster Manager.
 */
import type { BattleChronicle } from "../services/monsterVaultService";
import demo from "./demoBattle.json";

export interface DemoBattle {
  record: BattleChronicle;
  videoUrl: string;
  title: { ko: string; en: string };
  seconds: number;
}

const showcase: DemoBattle = {
  record: {
    id: "demo_battle",
    fighter1Id: demo.fighter1,
    fighter2Id: demo.fighter2,
    winnerId: demo.winner,
    storyKo: demo.storyKo,
    storyEn: demo.storyEn,
    timestamp: Date.parse(demo.date),
  },
  videoUrl: "/videos/battles/demo_battle.mp4",
  title: { ko: demo.titleKo, en: demo.titleEn },
  seconds: 16,
};

const leviathanVsDragon: DemoBattle = {
  record: {
    id: "demo_battle_leviathan_vs_dragon",
    fighter1Id: "demo_void_leviathan",
    fighter2Id: "demo_fire_dragon",
    winnerId: "demo_void_leviathan",
    storyKo: [
      "🔵 보이드 어비스 레비아탄 (바다뱀 머리 · 반투명한 꼬리지느러미 꼬리) VS 🔴 화염룡 드래곤 (용의 머리 · 묵직한 비늘 꼬리) — 두 괴수가 서로를 노려본다.",
      "⚡ 선공: 화염룡 드래곤이 굵은 발톱을 휘두르지만 보이드 어비스 레비아탄이 긴 지느러미 다리로 박차 올라 피한다!",
      "↩ 반격: 보이드 어비스 레비아탄이 꼬리지느러미 꼬리를 채찍처럼 휘둘러 화염룡 드래곤의 머리를 내리친다 — ⚡ 고전압 스파크 반격!",
      "💥 정면 충돌: 두 괴수가 동시에 입에서 화염포를 쏘고, 레이저가 엇갈리며 충격파가 터진다!",
      "💀 보이드 어비스 레비아탄이 뛰어올라 꼬리로 화염룡 드래곤의 몸통을 감아 내리꽂는다 — K.O.!",
      "🏆 보이드 어비스 레비아탄이 바다뱀 머리를 치켜들고 하늘로 화염포를 뿜으며 포효한다!",
    ].join("\n"),
    storyEn: [
      "🔵 Void Abyss Leviathan (sea-serpent head · translucent fin tail) VS 🔴 Fire Dragon (dragon head · heavy scaled tail) — the two beasts glare at each other.",
      "⚡ First strike: the Dragon swings its thick claws, but the Leviathan kicks off its long fin legs and dodges!",
      "↩ Counter: the Leviathan whips its fin tail into the Dragon's head — ⚡ high-voltage spark counter!",
      "💥 Head-on clash: both fire flame cannons from their jaws as laser beams cross and a shockwave erupts!",
      "💀 The Leviathan leaps, coils its tail around the Dragon's torso and slams it down — K.O.!",
      "🏆 The Leviathan raises its sea-serpent head and blasts a flame cannon into the sky!",
    ].join("\n"),
    timestamp: Date.parse("2026-11-19T06:40:12.726Z"),
  },
  videoUrl: "/videos/battles/demo_battle_leviathan_vs_dragon.mp4",
  title: { ko: "보이드 어비스 레비아탄 vs 화염룡 드래곤", en: "Void Abyss Leviathan vs Fire Dragon" },
  seconds: 12,
};

const prometheusVsXenomorph: DemoBattle = {
  record: {
    id: "demo_battle_prometheus_vs_xenomorph",
    fighter1Id: "demo_prometheus",
    fighter2Id: "demo_xenomorph",
    winnerId: "demo_xenomorph",
    storyKo: [
      "🔵 합성 인간 호모 프로메테우스 (강화 인간 전사 · 에메랄드색 줄 꼬리) VS 🔴 제노모프 바이오 타이탄 (작은 안쪽 턱 · 마디진 검은 꼬리) — 두 괴수가 서로를 노려본다.",
      "⚡ 선공: 제노모프 바이오 타이탄이 가늘고 긴 팔을 휘둘러 프로메테우스의 가슴을 찢는다!",
      "↩ 반격: 프로메테우스가 에메랄드색 꼬리를 채찍처럼 휘둘러 제노모프의 턱을 내리친다!",
      "💥 정면 충돌: 두 괴수가 동시에 화염포를 쏘고, 레이저가 엇갈리며 충격파가 터진다!",
      "💀 제노모프가 날렵한 다리로 뛰어올라 마디진 꼬리로 프로메테우스의 가슴을 감아 내리꽂는다 — K.O.!",
      "🏆 제노모프 바이오 타이탄이 하늘로 화염포를 뿜으며 포효한다!",
    ].join("\n"),
    storyEn: [
      "🔵 Homo Prometheus (augmented warrior · emerald striped tail) VS 🔴 Xenomorph Bio-Titan (inner jaw · segmented black tail) — the two beasts glare at each other.",
      "⚡ First strike: the Xenomorph slashes its long claws across Prometheus' chest!",
      "↩ Counter: Prometheus whips his emerald tail into the Xenomorph's jaw!",
      "💥 Head-on clash: both fire flame cannons as laser beams cross and a shockwave erupts!",
      "💀 The Xenomorph leaps, coils its segmented tail around Prometheus and slams him down — K.O.!",
      "🏆 The Xenomorph Bio-Titan blasts a flame cannon into the sky with a victory roar!",
    ].join("\n"),
    timestamp: Date.parse("2026-11-18T12:10:27.189Z"),
  },
  videoUrl: "/videos/battles/demo_battle_prometheus_vs_xenomorph.mp4",
  title: { ko: "호모 프로메테우스 vs 제노모프 바이오 타이탄", en: "Homo Prometheus vs Xenomorph Bio-Titan" },
  seconds: 12,
};

/** Shown in this order in the demo menu; the 16 s showcase is always first and is the default. */
export const DEMO_BATTLES: readonly DemoBattle[] = [showcase, leviathanVsDragon, prometheusVsXenomorph];

// The showcase, kept under the old names for the battle-story panel.
export const DEMO_BATTLE = showcase.record;
export const DEMO_BATTLE_VIDEO_URL = showcase.videoUrl;
export const DEMO_BATTLE_TITLE = showcase.title;
