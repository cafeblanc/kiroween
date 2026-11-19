import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteMonster,
  getAllMonsters,
  getChronicles,
  renameMonster,
  revokeObjectUrls,
  type BattleChronicle,
  type VaultMonster,
} from "../../services/monsterVaultService";
import {
  buildZip,
  extensionFor,
  findDuplicateGroups,
  nameKey,
  planDuplicateCleanup,
  planDuplicateRenames,
  safeFileName,
  validateMonsterName,
  MAX_MONSTER_NAME_CHARS,
  type ManagedMonster,
  type ZipEntry,
} from "../../utils/monsterManager";

interface Row extends ManagedMonster {
  imageUrl: string | null;
  videoUrl: string | null;
  meta: Record<string, unknown>;
}

interface MonsterManagerProps {
  isKo: boolean;
  onClose: () => void;
  /** Monsters removed from the vault: the caller drops them from the arena roster. */
  onDeleted: (ids: string[]) => void;
  /** A monster renamed in the vault: the caller updates the roster entry. */
  onRenamed: (id: string, name: string) => void;
}

const toRow = (r: VaultMonster): Row => ({
  id: r.id,
  name: typeof r.meta.nameKo === "string" && r.meta.nameKo ? r.meta.nameKo : r.id,
  savedAt: r.savedAt,
  hasImage: Boolean(r.imageUrl),
  hasVideo: Boolean(r.videoUrl),
  imageUrl: r.imageUrl,
  videoUrl: r.videoUrl,
  meta: r.meta,
});

const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

async function urlBytes(url: string | null | undefined): Promise<{ data: Uint8Array; type: string } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const b = await res.blob();
    return { data: new Uint8Array(await b.arrayBuffer()), type: b.type };
  } catch {
    return null;
  }
}

/**
 * Monster management: lists the monsters saved in this browser (vault), and lets the user rename, delete,
 * clean up duplicate names and export everything (images, entrance videos, battle videos and stories) as a ZIP.
 */
export const MonsterManager: React.FC<MonsterManagerProps> = ({ isKo, onClose, onDeleted, onRenamed }) => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [chronicles, setChronicles] = useState<BattleChronicle[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [showDupes, setShowDupes] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getAllMonsters(), getChronicles()]).then(([records, chrons]) => {
      const urls = records.flatMap((r) => [r.imageUrl, r.videoUrl]).filter((u): u is string => Boolean(u));
      if (cancelled) {
        revokeObjectUrls(urls);
        return;
      }
      urlsRef.current.push(...urls);
      setRows(records.map(toRow));
      setChronicles(chrons);
    });
    return () => {
      cancelled = true;
      revokeObjectUrls(urlsRef.current);
      urlsRef.current = [];
    };
  }, []);

  const list = rows ?? [];
  const dupGroups = useMemo(() => findDuplicateGroups(list), [list]);
  const dupKeys = useMemo(() => new Set(dupGroups.map((g) => nameKey(g[0].name))), [dupGroups]);
  const dupCount = dupGroups.reduce((a, g) => a + g.length - 1, 0);

  const removeRows = async (ids: string[]) => {
    const done: string[] = [];
    for (const id of ids) if (await deleteMonster(id)) done.push(id);
    if (done.length) {
      const gone = new Set(done);
      setRows((rs) => {
        revokeObjectUrls((rs ?? []).filter((r) => gone.has(r.id)).flatMap((r) => [r.imageUrl, r.videoUrl]));
        return (rs ?? []).filter((r) => !gone.has(r.id));
      });
      setSelected((s) => new Set([...s].filter((id) => !gone.has(id))));
      onDeleted(done);
    }
    return done.length;
  };

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0 || busy) return;
    const names = list.filter((r) => ids.includes(r.id)).map((r) => r.name);
    const ok = window.confirm(
      isKo
        ? `${ids.length}마리를 삭제할까요? 이미지와 영상도 함께 지워지며 되돌릴 수 없습니다.\n\n${names.slice(0, 8).join("\n")}${names.length > 8 ? "\n…" : ""}\n\n(필요하면 먼저 [전체 내보내기]로 백업하세요)`
        : `Delete ${ids.length} monster(s)? Their images and videos are removed too and this cannot be undone.`,
    );
    if (!ok) return;
    setBusy("delete");
    const n = await removeRows(ids);
    setBusy(null);
    setMessage(isKo ? `🗑 ${n}마리를 삭제했습니다.` : `🗑 Deleted ${n}.`);
  };

  const handleRename = async () => {
    if (!editing || busy) return;
    const name = validateMonsterName(editing.value);
    if (!name) {
      setMessage(isKo ? `이름은 1~${MAX_MONSTER_NAME_CHARS}자로 입력하세요.` : `Use 1-${MAX_MONSTER_NAME_CHARS} characters.`);
      return;
    }
    setBusy("rename");
    const ok = await renameMonster(editing.id, name);
    setBusy(null);
    if (!ok) {
      setMessage(isKo ? "이름을 바꾸지 못했습니다." : "Rename failed.");
      return;
    }
    setRows((rs) => (rs ?? []).map((r) => (r.id === editing.id ? { ...r, name } : r)));
    onRenamed(editing.id, name);
    setEditing(null);
    setMessage(isKo ? `✏️ 「${name}」으로 바꿨습니다.` : `✏️ Renamed to "${name}".`);
  };

  const handleRenameDuplicates = async () => {
    if (busy) return;
    const plan = planDuplicateRenames(list);
    if (plan.length === 0) return;
    setBusy("dupes");
    let n = 0;
    for (const p of plan) {
      if (await renameMonster(p.id, p.to)) {
        n++;
        onRenamed(p.id, p.to);
      }
    }
    const to = new Map(plan.map((p) => [p.id, p.to]));
    setRows((rs) => (rs ?? []).map((r) => (to.has(r.id) ? { ...r, name: to.get(r.id)! } : r)));
    setBusy(null);
    setShowDupes(false);
    setMessage(isKo ? `🏷️ ${n}마리에 번호를 붙여 이름을 구분했습니다.` : `🏷️ Numbered ${n} duplicate names.`);
  };

  const handleDeleteDuplicates = async () => {
    const { remove } = planDuplicateCleanup(list);
    await handleDelete(remove.map((r) => r.id));
    setShowDupes(false);
  };

  const handleExport = async () => {
    if (busy || list.length === 0) return;
    setBusy("export");
    setMessage(isKo ? "📦 내보낼 파일을 모으는 중..." : "📦 Collecting files...");
    try {
      const enc = new TextEncoder();
      const entries: ZipEntry[] = [];
      const index: Record<string, unknown>[] = [];
      const nameOf = new Map(list.map((r) => [r.id, r.name]));
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        const dir = `monsters/${pad(i + 1)}_${safeFileName(r.name)}`;
        const img = await urlBytes(r.imageUrl);
        const vid = await urlBytes(r.videoUrl);
        if (img) entries.push({ name: `${dir}/image.${extensionFor(img.type, "jpg")}`, data: img.data });
        if (vid) entries.push({ name: `${dir}/entrance.${extensionFor(vid.type, "mp4")}`, data: vid.data });
        const meta = { id: r.id, savedAt: new Date(r.savedAt).toISOString(), ...r.meta };
        entries.push({ name: `${dir}/meta.json`, data: enc.encode(JSON.stringify(meta, null, 2)) });
        index.push({ folder: dir, id: r.id, name: r.name, image: Boolean(img), entranceVideo: Boolean(vid) });
      }
      for (let i = 0; i < chronicles.length; i++) {
        const c = chronicles[i];
        const vs = `${safeFileName(nameOf.get(c.fighter1Id) ?? c.fighter1Id)}_vs_${safeFileName(nameOf.get(c.fighter2Id) ?? c.fighter2Id)}`;
        const dir = `battles/${pad(i + 1)}_${vs}`;
        entries.push({ name: `${dir}/story_ko.txt`, data: enc.encode(c.storyKo ?? "") });
        entries.push({ name: `${dir}/story_en.txt`, data: enc.encode(c.storyEn ?? "") });
        if (c.aiBattleVideo) {
          const data = new Uint8Array(await c.aiBattleVideo.arrayBuffer());
          entries.push({ name: `${dir}/battle.${extensionFor(c.aiBattleVideo.type, "mp4")}`, data });
        }
        index.push({ folder: dir, battle: c.id, winnerId: c.winnerId, video: Boolean(c.aiBattleVideo), date: new Date(c.timestamp).toISOString() });
      }
      entries.push({ name: "index.json", data: enc.encode(JSON.stringify(index, null, 2)) });
      const zip = buildZip(entries);
      const url = URL.createObjectURL(new Blob([zip], { type: "application/zip" }));
      const d = new Date();
      const a = document.createElement("a");
      a.href = url;
      a.download = `kiroween-monsters-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      const mb = (zip.length / 1048576).toFixed(1);
      setMessage(
        isKo
          ? `📦 괴수 ${list.length}마리와 결투 ${chronicles.length}편을 내보냈습니다 (${mb} MB).`
          : `📦 Exported ${list.length} monsters and ${chronicles.length} battles (${mb} MB).`,
      );
    } catch {
      setMessage(isKo ? "내보내기에 실패했습니다." : "Export failed.");
    } finally {
      setBusy(null);
    }
  };

  const allSelected = list.length > 0 && selected.size === list.length;
  const btn = "text-[11px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={isKo ? "괴수 관리" : "Monster manager"}
        className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-950 shrink-0">
          <h2 className="text-sm font-black text-amber-300">
            🗂️ {isKo ? "괴수 관리" : "Monster Manager"}{" "}
            <span className="text-slate-400 font-mono text-xs">({list.length})</span>
          </h2>
          <button type="button" onClick={onClose} className={`${btn} bg-slate-800 hover:bg-slate-700 border-slate-600`}>
            ✕ {isKo ? "닫기" : "Close"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-slate-800 shrink-0">
          <button type="button" disabled={!!busy || list.length === 0} onClick={() => void handleExport()} className={`${btn} bg-emerald-900/60 hover:bg-emerald-800 border-emerald-500/50 text-emerald-200`}>
            📦 {isKo ? "전체 내보내기 (ZIP)" : "Export all (ZIP)"}
          </button>
          <button type="button" disabled={!!busy || dupCount === 0} onClick={() => setShowDupes((v) => !v)} className={`${btn} bg-amber-900/50 hover:bg-amber-800 border-amber-500/50 text-amber-200`}>
            🧹 {isKo ? `중복 정리 (${dupCount})` : `Duplicates (${dupCount})`}
          </button>
          <button type="button" disabled={!!busy || selected.size === 0} onClick={() => void handleDelete([...selected])} className={`${btn} bg-rose-900/50 hover:bg-rose-800 border-rose-500/50 text-rose-200`}>
            🗑 {isKo ? `선택 삭제 (${selected.size})` : `Delete selected (${selected.size})`}
          </button>
          <label className="ml-auto flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(list.map((r) => r.id)))} />
            {isKo ? "전체 선택" : "Select all"}
          </label>
        </div>

        {showDupes && dupCount > 0 && (
          <div className="px-4 py-2.5 border-b border-amber-500/30 bg-amber-950/30 text-[11px] text-amber-100 flex flex-col gap-1.5 shrink-0">
            <p>
              {isKo
                ? `같은 이름이 ${dupGroups.length}종류, 겹치는 괴수가 ${dupCount}마리 있습니다. 이름마다 등장 영상이 있는 것, 그다음 최신 것을 남깁니다.`
                : `${dupGroups.length} names are used more than once (${dupCount} extra monsters). Per name, the one with an entrance video (then the newest) is kept.`}
            </p>
            <ul className="text-amber-200/80 list-disc pl-4">
              {dupGroups.slice(0, 5).map((g) => (
                <li key={g[0].id}>
                  「{g[0].name}」 × {g.length}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" disabled={!!busy} onClick={() => void handleRenameDuplicates()} className={`${btn} bg-slate-800 hover:bg-slate-700 border-amber-400/60`}>
                🏷️ {isKo ? "번호 붙여 구분하기 (지우지 않음)" : "Number them (keep all)"}
              </button>
              <button type="button" disabled={!!busy} onClick={() => void handleDeleteDuplicates()} className={`${btn} bg-rose-900/60 hover:bg-rose-800 border-rose-500/60 text-rose-100`}>
                🗑 {isKo ? `하나만 남기고 삭제 (${dupCount})` : `Keep one, delete ${dupCount}`}
              </button>
            </div>
          </div>
        )}

        {message && <div className="px-4 py-1.5 text-[11px] text-cyan-200 bg-slate-950/60 shrink-0">{message}</div>}

        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-2">
          {rows === null ? (
            <p className="text-xs text-slate-400 p-4">{isKo ? "불러오는 중..." : "Loading..."}</p>
          ) : list.length === 0 ? (
            <p className="text-xs text-slate-400 p-4">{isKo ? "저장된 괴수가 없습니다. 괴수 설계실에서 만들어 보세요." : "No saved monsters yet."}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {list.map((r) => {
                const isDup = dupKeys.has(nameKey(r.name));
                const isEditing = editing?.id === r.id;
                return (
                  <li key={r.id} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${isDup ? "border-amber-500/40 bg-amber-950/20" : "border-slate-800 bg-slate-950/60"}`}>
                    <input
                      type="checkbox"
                      aria-label={r.name}
                      checked={selected.has(r.id)}
                      onChange={() =>
                        setSelected((s) => {
                          const n = new Set(s);
                          if (n.has(r.id)) n.delete(r.id);
                          else n.add(r.id);
                          return n;
                        })
                      }
                    />
                    {r.imageUrl ? (
                      <img src={r.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-700 bg-black shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border border-slate-700 bg-slate-800 shrink-0 flex items-center justify-center text-slate-500 text-lg">?</div>
                    )}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editing.value}
                          maxLength={MAX_MONSTER_NAME_CHARS}
                          onChange={(e) => setEditing({ id: r.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleRename();
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="w-full bg-slate-950 border border-cyan-500 rounded-md px-2 py-1 text-xs text-white outline-none"
                        />
                      ) : (
                        <p className="text-xs font-bold text-white truncate">{r.name}</p>
                      )}
                      <p className="text-[10px] text-slate-400 font-mono flex flex-wrap gap-x-2">
                        <span>{fmtDate(r.savedAt)}</span>
                        {r.hasVideo && <span className="text-purple-300">🎬 {isKo ? "등장 영상" : "video"}</span>}
                        {isDup && <span className="text-amber-300">{isKo ? "이름 중복" : "duplicate"}</span>}
                      </p>
                    </div>
                    {isEditing ? (
                      <>
                        <button type="button" disabled={!!busy} onClick={() => void handleRename()} className={`${btn} bg-cyan-800 hover:bg-cyan-700 border-cyan-500`}>
                          {isKo ? "저장" : "Save"}
                        </button>
                        <button type="button" onClick={() => setEditing(null)} className={`${btn} bg-slate-800 hover:bg-slate-700 border-slate-600`}>
                          {isKo ? "취소" : "Cancel"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" disabled={!!busy} aria-label={isKo ? "이름 바꾸기" : "Rename"} title={isKo ? "이름 바꾸기" : "Rename"} onClick={() => setEditing({ id: r.id, value: r.name })} className={`${btn} bg-slate-800 hover:bg-slate-700 border-slate-600`}>
                          ✏️
                        </button>
                        <button type="button" disabled={!!busy} aria-label={isKo ? "삭제" : "Delete"} title={isKo ? "삭제" : "Delete"} onClick={() => void handleDelete([r.id])} className={`${btn} bg-rose-950 hover:bg-rose-900 border-rose-500/50`}>
                          🗑
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonsterManager;
