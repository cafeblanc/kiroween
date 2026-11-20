# Next implementation plan: arena engagement loop

Status: planned (not started). Agreed on 2026-11-17 after the 12 s story battle video release.
Start only after the user has reviewed the current build (story battle video, full-screen home).

## 1. Cheap to repeat, expensive to keep
- Players fight as often as they like on the free real-time dual stage.
- Only a won fight or a close fight ("명승부") can be turned into an AI battle video (LTX, ~$1.56 per 12 s).
- Open question: how to define a close fight (e.g. final HP gap, number of lead changes).

## 2. Moments of choice
- 2-3 decisions during a fight, e.g. "tail strike vs mouth flame cannon".
- The choices change the outcome (resolveBattle input) and the battle story, so the video follows what the player chose.
- Open question: time limit per choice, and what happens when the player does not choose.

## 3. Battles against friends' monsters
- Share a monster by link; a friend fights it with their own monster.
- Needs server storage: today monsters live only in each browser's IndexedDB (Monster Vault).
- Open questions: storage service and its free tier, image/video size limits, abuse and moderation of shared designs.

## 4. Evolution and battle record
- Winning monsters upgrade a body part or a stat.
- Battle chronicles add up to a per-monster record (wins, losses, signature moves).
- Open question: upgrade rules so stats stay balanced.

## Notes
- Keep the hackathon scope rules in AGENTS.md (no marketplace or trading features in the public repo).
- Cost guard: per-IP daily cap is 5 LTX creates today; revisit once videos are tied to wins.
