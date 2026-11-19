import { describe, it, expect } from "vitest";
import { DEFAULT_SIGNATURE, PRESET_SIGNATURES, signatureFor, signaturePresetId } from "./monsterSignatures";
import { MONSTER_STUDIO_PRESETS } from "../services/customMonsterMediaService";
import { composeBattleStory, toStoryFighter } from "../services/battleStoryService";
import { composeBattleVideoPrompt, MAX_BATTLE_PROMPT_CHARS } from "../services/battleVideoService";
import { createSeededRng, resolveBattle } from "../utils/arenaBattle";

describe("signature moves (one finisher + one defence per base monster)", () => {
  it("every preset has its own, distinct finisher and defence", () => {
    const ids = MONSTER_STUDIO_PRESETS.map((p) => p.id);
    expect(Object.keys(PRESET_SIGNATURES).sort()).toEqual([...ids].sort());
    const finishers = new Set(ids.map((id) => PRESET_SIGNATURES[id].finisherKo));
    const defences = new Set(ids.map((id) => PRESET_SIGNATURES[id].defenseKo));
    expect(finishers.size).toBe(6);
    expect(defences.size).toBe(6);
    for (const id of ids) {
      const s = PRESET_SIGNATURES[id];
      for (const v of Object.values(s)) expect(v.trim().length).toBeGreaterThan(1);
      expect(/^[\x20-\x7E]+$/.test(s.finisherActionEn + s.defenseActionEn)).toBe(true);
    }
  });

  it("the confirmed moves", () => {
    expect(PRESET_SIGNATURES.human_prometheus.finisherKo).toBe("에메랄드 레이저 눈빛");
    expect(PRESET_SIGNATURES.human_prometheus.defenseKo).toBe("탄성 신체");
    expect(PRESET_SIGNATURES.myth_frankenstein.defenseKo).toBe("초재생");
    expect(PRESET_SIGNATURES.alien_xenomorph.defenseKo).toBe("압전 반격");
    expect(PRESET_SIGNATURES.alien_void_slug.defenseKo).toBe("육각 세라믹 갑각");
  });

  it("finds the preset by signatureId, own id, then current or old names; unknown -> default", () => {
    expect(signaturePresetId({ signatureId: "myth_kraken", nameKo: "아무 이름" })).toBe("myth_kraken");
    expect(signaturePresetId({ id: "human_prometheus" })).toBe("human_prometheus");
    expect(signaturePresetId({ id: "custom_1", nameKo: "화염룡 드래곤 커스텀" })).toBe("myth_dragon");
    expect(signaturePresetId({ nameKo: "제노모프 바이오 타이탄 커스텀" })).toBe("alien_xenomorph");
    expect(signaturePresetId({ nameEn: "Void Abyss Leviathan Custom" })).toBe("alien_void_slug");
    expect(signatureFor({ nameKo: "이름 없는 괴수" })).toBe(DEFAULT_SIGNATURE);
    expect(signatureFor({ signatureId: "nope", nameKo: "?" })).toBe(DEFAULT_SIGNATURE);
  });
});

describe("the battle is won with the winner's finisher and the loser's defence holds once", () => {
  const dragon = { id: "custom_d", nameKo: "화염룡 드래곤 커스텀", nameEn: "Flame Dragon Custom", signatureId: "myth_dragon", colorHex: "#f97316" };
  const prom = { id: "custom_p", nameKo: "프로메 커스텀", nameEn: "Prom Custom", signatureId: "human_prometheus", colorHex: "#34d399" };

  it("story: act 2 ends with the loser's defence, act 3 is the winner's finisher (both languages)", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const battle = resolveBattle(dragon, prom, createSeededRng(seed));
      const story = composeBattleStory(toStoryFighter(dragon), toStoryFighter(prom), battle);
      const [w, l] = battle.winner === 1 ? ["myth_dragon", "human_prometheus"] : ["human_prometheus", "myth_dragon"];
      expect(story.storyKo.act3_finish).toContain(`필살기 「${PRESET_SIGNATURES[w].finisherKo}」`);
      expect(story.storyEn.act3_finish).toContain(PRESET_SIGNATURES[w].finisherEn);
      expect(story.storyKo.act2_clash.split("\n").pop()).toContain(`방어 특기 「${PRESET_SIGNATURES[l].defenseKo}」`);
      expect(story.storyEn.act2_clash).toContain(PRESET_SIGNATURES[l].defenseEn);
      expect(story.storyKo.act3_finish).not.toContain(PRESET_SIGNATURES[l].finisherKo);
    }
  });

  it("video: the winner's finisher is the biggest moment, the loser's defence holds once, all within budget", () => {
    const story = { act2_clash: "First strike: claws across the torso.", act3_finish: "Finisher — Emerald Laser Gaze! K.O.!" };
    const p = composeBattleVideoPrompt(dragon, prom, story, 2);
    expect(p).toContain("the toxic green right beast unleashes its finisher, Emerald Laser Gaze, firing twin searing emerald laser beams from its eyes");
    expect(p).toContain("the fiery orange left beast survives one blow with its defence, Obsidian Scale Shield");
    expect(p.indexOf("survives one blow")).toBeLessThan(p.indexOf("unleashes its finisher"));
    expect(p).toContain("held for two full seconds");
    expect(p.length).toBeLessThanOrEqual(MAX_BATTLE_PROMPT_CHARS);
    expect(p.endsWith("no text, no subtitles, no logos.")).toBe(true);
    const flipped = composeBattleVideoPrompt(dragon, prom, story, 1);
    expect(flipped).toContain("the fiery orange left beast unleashes its finisher, Lava Storm Breath");
    expect(flipped).toContain("the toxic green right beast survives one blow with its defence, Elastic Body");
  });
});
