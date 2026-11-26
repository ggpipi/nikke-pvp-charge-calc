import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Flame,
  RotateCcw,
  Search,
  Settings,
  Swords,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import {
  ArenaMode,
  createEmptySlot,
  evaluateSlotChargeSpeed,
  ServerRegion,
  SideType,
  simulateArena5v5,
  SlotConfig,
} from "../engine/arenaSim";
import {
  BurstStage,
  ELEMENT_META,
  ElementType,
  findRosterChar,
  PVP_ROSTER,
  WEAPON_META,
  WeaponType,
} from "../engine/roster";
import { ChargeTimelineChart } from "./ChargeTimelineChart";
import { SlotConfigModal } from "./SlotConfigModal";

interface SavedMatchup {
  id: string;
  name: string;
  attacker: SlotConfig[];
  defender: SlotConfig[];
}

const STORAGE_KEY = "nikke_pvp_saved_matchups_v2";

function makeDefaultMatchup(): { attacker: SlotConfig[]; defender: SlotConfig[] } {
  return {
    attacker: [
      { ...createEmptySlot("vesti_tu"), gearBps: [609, 609, 609, 609], cubeKind: "adjutant", cubeBp: 212 },
      { ...createEmptySlot("trina"), cubeKind: "quantum", cubeBp: 466 },
      { ...createEmptySlot("emilia"), gearBps: [492, 492, 433, 0], cubeKind: "quantum", cubeBp: 466 },
      { ...createEmptySlot("noise"), cubeKind: "quantum", cubeBp: 466 },
      { ...createEmptySlot("jackal"), cubeKind: "quantum", cubeBp: 466 },
    ],
    defender: [
      { ...createEmptySlot("noah"), cubeKind: "quantum", cubeBp: 466 },
      { ...createEmptySlot("biscuit"), cubeKind: "quantum", cubeBp: 466 },
      { ...createEmptySlot("liberalio"), gearBps: [580, 580, 580, 580], cubeKind: "adjutant", cubeBp: 212 },
      { ...createEmptySlot("helm_t"), gearBps: [580, 580, 551, 492], cubeKind: "quantum", cubeBp: 466 },
      { ...createEmptySlot("centi"), cubeKind: "quantum", cubeBp: 466 },
    ],
  };
}

const BUILTIN_SCENARIOS: { name: string; build: () => { attacker: SlotConfig[]; defender: SlotConfig[] } }[] = [
  {
    name: "战贝4黑底 vs 满速莉贝雷里奥",
    build: makeDefaultMatchup,
  },
  {
    name: "红豺2RL速充 vs 牡丹白兔防核",
    build: () => ({
      attacker: [
        { ...createEmptySlot("scarlet"), scarletCounterEnabled: true },
        { ...createEmptySlot("trina"), cubeKind: "quantum", cubeBp: 466 },
        { ...createEmptySlot("centi"), gearBps: [551, 492, 433, 0], cubeKind: "quantum", cubeBp: 466 },
        { ...createEmptySlot("anis"), cubeKind: "quantum", cubeBp: 466 },
        { ...createEmptySlot("jackal"), cubeKind: "quantum", cubeBp: 466 },
      ],
      defender: [
        { ...createEmptySlot("moran") },
        { ...createEmptySlot("blanc") },
        { ...createEmptySlot("cinderella"), cubeKind: "quantum", cubeBp: 466 },
        { ...createEmptySlot("helm_t"), gearBps: [580, 580, 551, 492], cubeKind: "quantum", cubeBp: 466 },
        { ...createEmptySlot("rumani"), cubeKind: "quantum", cubeBp: 466 },
      ],
    }),
  },
  {
    name: "水母+21速海伦 vs 珍藏拉普EMT",
    build: () => ({
      attacker: [
        { ...createEmptySlot("noah"), cubeKind: "quantum", cubeBp: 466 },
        { ...createEmptySlot("noise"), cubeKind: "quantum", cubeBp: 466 },
        { ...createEmptySlot("biscuit"), cubeKind: "quantum", cubeBp: 466 },
        { ...createEmptySlot("liberalio"), gearBps: [580, 580, 551, 0], cubeKind: "adjutant", cubeBp: 212 },
        { ...createEmptySlot("helm_t"), gearBps: [580, 580, 551, 492], cubeKind: "quantum", cubeBp: 466 },
      ],
      defender: [
        { ...createEmptySlot("bay"), cubeKind: "quantum", cubeBp: 466 },
        { ...createEmptySlot("emilia"), gearBps: [492, 463, 433, 0], cubeKind: "quantum", cubeBp: 466 },
        { ...createEmptySlot("laplace_t"), gearBps: [551, 492, 0, 0], cubeKind: "quantum", cubeBp: 466 },
        { ...createEmptySlot("rumani"), cubeKind: "quantum", cubeBp: 466 },
        { ...createEmptySlot("jackal"), cubeKind: "quantum", cubeBp: 466 },
      ],
    }),
  },
];

export function ArenaTeamBuilder() {
  const initial = useMemo(() => makeDefaultMatchup(), []);
  const [server, setServer] = useState<ServerRegion>("cn");
  const [arenaMode, setArenaMode] = useState<ArenaMode>("normal_special");
  const [attacker, setAttacker] = useState<SlotConfig[]>(initial.attacker);
  const [defender, setDefender] = useState<SlotConfig[]>(initial.defender);

  // Active slot for clicking a character from roster to assign
  const [activeTarget, setActiveTarget] = useState<{ side: SideType; index: number }>({
    side: "attacker",
    index: 0,
  });

  // Modal state for character config
  const [editingSlot, setEditingSlot] = useState<{ side: SideType; index: number } | null>(null);

  // Roster filters
  const [query, setQuery] = useState("");
  const [filterBurst, setFilterBurst] = useState<BurstStage | "all">("all");
  const [filterWeapon, setFilterWeapon] = useState<WeaponType | "all">("all");
  const [filterElement, setFilterElement] = useState<ElementType | "all">("all");

  // Event log filter
  const [logFilter, setLogFilter] = useState<"all" | "attacker" | "defender">("all");

  // Saved matchups in localStorage
  const [savedList, setSavedList] = useState<SavedMatchup[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [saveName, setSaveName] = useState("");

  const sim = useMemo(
    () => simulateArena5v5(attacker, defender, server, arenaMode, 300),
    [attacker, defender, server, arenaMode]
  );

  const filteredRoster = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PVP_ROSTER.filter((c) => {
      if (filterBurst !== "all" && c.burst !== filterBurst) return false;
      if (filterWeapon !== "all" && c.weapon !== filterWeapon) return false;
      if (filterElement !== "all" && c.element !== filterElement) return false;
      if (q) {
        const hay = [c.name, c.id, ...(c.aliases ?? []), c.pvpRoleNote].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, filterBurst, filterWeapon, filterElement]);

  const setSideSlots = (side: SideType, updater: (prev: SlotConfig[]) => SlotConfig[]) => {
    if (side === "attacker") setAttacker(updater);
    else setDefender(updater);
  };

  const assignCharToActiveSlot = (charId: string) => {
    const { side, index } = activeTarget;
    setSideSlots(side, (prev) => {
      const next = [...prev];
      // Prevent duplicate character on same side (except universal custom)
      if (charId !== "universal") {
        const dupIdx = next.findIndex((s, i) => i !== index && s.charId === charId);
        if (dupIdx !== -1) {
          next[dupIdx] = createEmptySlot(null);
        }
      }
      next[index] = createEmptySlot(charId);
      return next;
    });
    // Advance active target to next slot on same side
    setActiveTarget({ side, index: (index + 1) % 5 });
  };

  const moveSlot = (side: SideType, index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target > 4) return;
    setSideSlots(side, (prev) => {
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  };

  const swapTeams = () => {
    setAttacker(defender);
    setDefender(attacker);
  };

  const saveCurrentMatchup = () => {
    const title = saveName.trim() || `配队 ${savedList.length + 1}`;
    const item: SavedMatchup = {
      id: String(Date.now()),
      name: title,
      attacker,
      defender,
    };
    const next = [item, ...savedList].slice(0, 10);
    setSavedList(next);
    setSaveName("");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  };

  const deleteSaved = (id: string) => {
    const next = savedList.filter((s) => s.id !== id);
    setSavedList(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const mergedEvents = useMemo(() => {
    const list =
      logFilter === "attacker"
        ? sim.attacker.events
        : logFilter === "defender"
        ? sim.defender.events
        : [...sim.attacker.events, ...sim.defender.events].sort((a, b) => a.frame - b.frame);
    return list;
  }, [sim, logFilter]);

  const renderTeamRow = (side: SideType, slots: SlotConfig[], title: string) => {
    const summary = side === "attacker" ? sim.attacker : sim.defender;
    const isAtk = side === "attacker";
    return (
      <section className="panel">
        <div className="panel-header" style={{ flexWrap: "wrap" }}>
          <div className="panel-title">
            <span
              className="badge"
              style={{
                background: isAtk ? "var(--accent-orange-dim)" : "var(--accent-cyan-dim)",
                color: isAtk ? "var(--accent-orange)" : "var(--accent-cyan)",
              }}
            >
              {isAtk ? "ATK" : "DEF"}
            </span>
            <span>{title}</span>
            <span className="badge badge-green mono">{summary.rlRating}</span>
            {summary.fullChargeFrame !== null && (
              <span className="mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                满充 {summary.fullChargeFrame}f ({summary.fullChargeTimeSec?.toFixed(3)}s)
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {summary.burst1Frame !== null && (
              <span className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                B1:{summary.burst1Frame}f · B2:{summary.burst2Frame}f · B3:{summary.burst3Frame}f
              </span>
            )}
            <button
              className="btn"
              style={{ padding: "4px 8px", fontSize: 11 }}
              onClick={() => setSideSlots(side, () => Array.from({ length: 5 }, () => createEmptySlot(null)))}
            >
              清空
            </button>
          </div>
        </div>
        <div className="panel-body">
          <div className="arena-slots-5">
            {slots.map((slot, idx) => {
              const char = findRosterChar(slot.charId);
              const isSelected = activeTarget.side === side && activeTarget.index === idx;
              const stat = summary.slotStats.find((s) => s.slotIndex === idx);
              const cs = char ? evaluateSlotChargeSpeed(char, slot) : null;
              return (
                <div
                  key={idx}
                  className={`arena-slot-card ${isSelected ? "selected" : ""} ${
                    char ? "filled" : "empty"
                  }`}
                  style={{
                    borderTopColor: char ? ELEMENT_META[char.element].color : undefined,
                  }}
                  onClick={() => setActiveTarget({ side, index: idx })}
                >
                  <div className="arena-slot-head">
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>
                      P{idx + 1}
                    </span>
                    {char ? (
                      <span
                        className="badge"
                        style={{
                          fontSize: 10,
                          padding: "1px 5px",
                          background: "rgba(255,255,255,0.06)",
                          color: ELEMENT_META[char.element].color,
                        }}
                      >
                        B{char.burst} · {WEAPON_META[char.weapon].short}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>点击下方选人</span>
                    )}
                  </div>

                  {char ? (
                    <>
                      <div className="arena-slot-name">
                        {char.name}
                        {char.fixedHighlight && (
                          <span className="badge badge-orange" style={{ fontSize: 9.5, marginLeft: 4 }}>
                            已修正
                          </span>
                        )}
                      </div>
                      <div className="arena-slot-meta mono">
                        {char.initC > 0 && cs ? (
                          <span style={{ color: cs.savedFrames60 > 0 ? "var(--accent-green)" : "var(--text-secondary)" }}>
                            蓄速 {cs.effSpeedStr} ({cs.savedFrames60 > 0 ? `-${cs.savedFrames60}f` : "0f"})
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>非蓄力武器</span>
                        )}
                        {slot.cubeKind === "quantum" && (
                          <span style={{ color: "var(--accent-cyan)" }}>
                            量子 +{(slot.cubeBp / 100).toFixed(2)}%
                          </span>
                        )}
                        {slot.cubeKind === "adjutant" && (
                          <span style={{ color: "var(--accent-gold)" }}>
                            促进 +{(slot.cubeBp / 100).toFixed(2)}%
                          </span>
                        )}
                        {stat && (
                          <span style={{ color: "var(--text-primary)" }}>
                            贡献 +{stat.totalCharge.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className="arena-slot-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="mini-icon-btn"
                          title="左移一位"
                          disabled={idx === 0}
                          onClick={() => moveSlot(side, idx, -1)}
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <button
                          className="mini-icon-btn accent"
                          title="配置词条与魔方"
                          onClick={() => setEditingSlot({ side, index: idx })}
                        >
                          <Settings size={13} />
                        </button>
                        <button
                          className="mini-icon-btn"
                          title="右移一位"
                          disabled={idx === 4}
                          onClick={() => moveSlot(side, idx, 1)}
                        >
                          <ChevronRight size={13} />
                        </button>
                        <button
                          className="mini-icon-btn danger"
                          title="移除角色"
                          onClick={() =>
                            setSideSlots(side, (prev) => {
                              const next = [...prev];
                              next[idx] = createEmptySlot(null);
                              return next;
                            })
                          }
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-muted)",
                        fontSize: 12,
                        minHeight: 54,
                      }}
                    >
                      {isSelected ? "已选中 · 请在下方选角色" : "+ 空位"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  const modalChar =
    editingSlot !== null
      ? findRosterChar((editingSlot.side === "attacker" ? attacker : defender)[editingSlot.index].charId)
      : null;

  return (
    <div className="stack-md">
      {/* Control Bar */}
      <div className="panel">
        <div className="panel-body" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div className="seg-group">
              <button
                className={`btn ${server === "cn" ? "btn-primary" : ""}`}
                onClick={() => setServer("cn")}
              >
                国服 · 新的希望 (转身16f)
              </button>
              <button
                className={`btn ${server === "global" ? "btn-primary" : ""}`}
                onClick={() => setServer("global")}
              >
                国际服 (转身14f)
              </button>
            </div>

            <div className="seg-group">
              <button
                className={`btn ${arenaMode === "normal_special" ? "btn-primary" : ""}`}
                onClick={() => setArenaMode("normal_special")}
              >
                新 / 特竞技场
              </button>
              <button
                className={`btn ${arenaMode === "champion" ? "btn-primary" : ""}`}
                onClick={() => setArenaMode("champion")}
              >
                冠军竞技场
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {BUILTIN_SCENARIOS.map((sc) => (
              <button
                key={sc.name}
                className="btn"
                onClick={() => {
                  const m = sc.build();
                  setAttacker(m.attacker);
                  setDefender(m.defender);
                }}
              >
                <Flame size={12} color="var(--accent-orange)" />
                {sc.name}
              </button>
            ))}
            <button className="btn" onClick={swapTeams}>
              <ArrowLeftRight size={13} /> 交换攻防
            </button>
            <button
              className="btn"
              onClick={() => {
                setAttacker(Array.from({ length: 5 }, () => createEmptySlot(null)));
                setDefender(Array.from({ length: 5 }, () => createEmptySlot(null)));
              }}
            >
              <RotateCcw size={13} /> 全部清空
            </button>
          </div>
        </div>
      </div>

      {/* Attacker & Defender 5-slot rows */}
      {renderTeamRow("attacker", attacker, "进攻队伍（P1 → P5）")}
      {renderTeamRow("defender", defender, "防守队伍（P1 → P5）")}

      {/* Battle Outcome & Charge Timeline Chart */}
      <section className="panel">
        <div className="panel-header" style={{ flexWrap: "wrap" }}>
          <div className="panel-title">
            <Swords size={16} color="var(--accent-gold)" />
            <span>战局爆裂先手分析 &amp; 60fps 充能时间线</span>
          </div>
          {sim.winnerSide && (
            <span
              className={`badge ${
                sim.winnerSide === "attacker"
                  ? "badge-orange"
                  : sim.winnerSide === "defender"
                  ? "badge-cyan"
                  : "badge-muted"
              }`}
            >
              <Trophy size={12} />
              {sim.winnerSide === "tie"
                ? "双方同帧满充"
                : `${sim.winnerSide === "attacker" ? "进攻方" : "防守方"}先手满充${
                    sim.leadFrames60 > 0
                      ? ` 领先 ${sim.leadFrames60} 帧 (${((sim.leadFrames60 / 2) * 0.033).toFixed(3)}s)`
                      : ""
                  }`}
            </span>
          )}
        </div>
        <div className="panel-body stack-md">
          <div className="kpi-grid">
            <div className="kpi-box tone-orange">
              <span className="kpi-label">进攻方满充 / 评级</span>
              <span className="kpi-value">
                {sim.attacker.fullChargeFrame !== null ? `${sim.attacker.fullChargeFrame} 帧` : "未满"}
              </span>
              <span className="kpi-sub">
                {sim.attacker.rlRating} ·{" "}
                {sim.attacker.fullChargeTimeSec !== null
                  ? `${sim.attacker.fullChargeTimeSec.toFixed(3)}s`
                  : ">5.0s"}
              </span>
            </div>
            <div className="kpi-box tone-cyan">
              <span className="kpi-label">防守方满充 / 评级</span>
              <span className="kpi-value">
                {sim.defender.fullChargeFrame !== null ? `${sim.defender.fullChargeFrame} 帧` : "未满"}
              </span>
              <span className="kpi-sub">
                {sim.defender.rlRating} ·{" "}
                {sim.defender.fullChargeTimeSec !== null
                  ? `${sim.defender.fullChargeTimeSec.toFixed(3)}s`
                  : ">5.0s"}
              </span>
            </div>
            <div className="kpi-box tone-gold">
              <span className="kpi-label">进攻爆裂 III 开启</span>
              <span className="kpi-value">
                {sim.attacker.burst3Frame !== null ? `${sim.attacker.burst3Frame} 帧` : "—"}
              </span>
              <span className="kpi-sub">
                {sim.attacker.burst3Frame !== null
                  ? `${((sim.attacker.burst3Frame / 2) * 0.033).toFixed(3)}s (B1:${sim.attacker.burst1Frame}f)`
                  : "未触发"}
              </span>
            </div>
            <div className="kpi-box tone-green">
              <span className="kpi-label">防守爆裂 III 开启</span>
              <span className="kpi-value">
                {sim.defender.burst3Frame !== null ? `${sim.defender.burst3Frame} 帧` : "—"}
              </span>
              <span className="kpi-sub">
                {sim.defender.burst3Frame !== null
                  ? `${((sim.defender.burst3Frame / 2) * 0.033).toFixed(3)}s (B1:${sim.defender.burst1Frame}f)`
                  : "未触发"}
              </span>
            </div>
          </div>

          <ChargeTimelineChart sim={sim} server={server} />
        </div>
      </section>

      {/* Roster Picker + Saved Teams */}
      <div className="tables-two-col">
        <section className="panel">
          <div className="panel-header" style={{ flexWrap: "wrap" }}>
            <div className="panel-title">
              <span>角色库（点击放入当前高亮槽位：</span>
              <span
                className="badge"
                style={{
                  background:
                    activeTarget.side === "attacker"
                      ? "var(--accent-orange-dim)"
                      : "var(--accent-cyan-dim)",
                  color:
                    activeTarget.side === "attacker" ? "var(--accent-orange)" : "var(--accent-cyan)",
                }}
              >
                {activeTarget.side === "attacker" ? "进攻" : "防守"} P{activeTarget.index + 1}
              </span>
              <span>）</span>
            </div>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              共 {filteredRoster.length} / {PVP_ROSTER.length} 名
            </span>
          </div>
          <div className="panel-body stack-sm">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 180px" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 9,
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  className="tactical-input"
                  style={{ paddingLeft: 30 }}
                  placeholder="搜索角色名/外号（如 战贝、水母、黑莲、豺狼）"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select
                className="tactical-select"
                style={{ width: "auto" }}
                value={filterBurst}
                onChange={(e) =>
                  setFilterBurst(e.target.value === "all" ? "all" : (Number(e.target.value) as BurstStage))
                }
              >
                <option value="all">全部爆裂</option>
                <option value="1">爆裂 I</option>
                <option value="2">爆裂 II</option>
                <option value="3">爆裂 III</option>
              </select>
              <select
                className="tactical-select"
                style={{ width: "auto" }}
                value={filterWeapon}
                onChange={(e) => setFilterWeapon(e.target.value as WeaponType | "all")}
              >
                <option value="all">全部武器</option>
                {(Object.keys(WEAPON_META) as WeaponType[]).map((w) => (
                  <option key={w} value={w}>
                    {WEAPON_META[w].label}
                  </option>
                ))}
              </select>
              <select
                className="tactical-select"
                style={{ width: "auto" }}
                value={filterElement}
                onChange={(e) => setFilterElement(e.target.value as ElementType | "all")}
              >
                <option value="all">全部代码</option>
                {(Object.keys(ELEMENT_META) as ElementType[]).map((el) => (
                  <option key={el} value={el}>
                    {ELEMENT_META[el].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="roster-grid">
              {filteredRoster.map((c) => (
                <button
                  key={c.id}
                  className={`roster-chip ${c.fixedHighlight ? "highlight" : ""}`}
                  style={{ borderLeftColor: ELEMENT_META[c.element].color }}
                  onClick={() => assignCharToActiveSlot(c.id)}
                  title={c.pvpRoleNote}
                >
                  <div className="roster-chip-top">
                    <span className="roster-chip-name">{c.name}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--text-secondary)" }}>
                      B{c.burst}
                    </span>
                  </div>
                  <div className="roster-chip-sub mono">
                    <span>
                      {WEAPON_META[c.weapon].short}
                      {c.initC > 0 ? ` ${(c.initC / 100).toFixed(1)}s` : ""}
                    </span>
                    {c.fixedHighlight && (
                      <span style={{ color: "var(--accent-orange)", fontWeight: 600 }}>源码修正</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right: Event log + Saved teams */}
        <div className="stack-md">
          <section className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <Bookmark size={15} color="var(--accent-orange)" />
                <span>保存 / 读取本地配队</span>
              </div>
            </div>
            <div className="panel-body stack-sm">
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  className="tactical-input"
                  placeholder="输入配队名称（如 冠军场进攻1队）"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
                <button className="btn btn-primary" onClick={saveCurrentMatchup} style={{ flexShrink: 0 }}>
                  保存当前5v5
                </button>
              </div>
              {savedList.length > 0 ? (
                <div className="stack-sm">
                  {savedList.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <button
                        className="btn"
                        style={{ border: "none", background: "transparent", padding: 0, flex: 1, justifyContent: "flex-start" }}
                        onClick={() => {
                          setAttacker(item.attacker);
                          setDefender(item.defender);
                        }}
                      >
                        {item.name}
                      </button>
                      <button className="mini-icon-btn danger" onClick={() => deleteSaved(item.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  尚无已保存配队，配队数据仅保存在你的浏览器本地。
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header" style={{ flexWrap: "wrap" }}>
              <div className="panel-title">
                <span>逐帧充能事件流</span>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {(["all", "attacker", "defender"] as const).map((f) => (
                  <button
                    key={f}
                    className={`btn ${logFilter === f ? "btn-primary" : ""}`}
                    style={{ padding: "3px 8px", fontSize: 11 }}
                    onClick={() => setLogFilter(f)}
                  >
                    {f === "all" ? "全部" : f === "attacker" ? "仅进攻" : "仅防守"}
                  </button>
                ))}
              </div>
            </div>
            <div className="panel-body">
              <div className="table-scroll" style={{ maxHeight: 360, overflowY: "auto" }}>
                <table className="tactical-table">
                  <thead>
                    <tr>
                      <th className="num-col">60fps帧</th>
                      <th>阵营·角色</th>
                      <th>事件</th>
                      <th className="num-col">充能</th>
                      <th className="num-col">累计</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedEvents.slice(0, 120).map((e) => {
                      const cum =
                        e.side === "attacker"
                          ? sim.attacker.cumulativeByFrame[e.frame]
                          : sim.defender.cumulativeByFrame[e.frame];
                      return (
                        <tr key={e.id}>
                          <td className="num-col">{e.frame}f</td>
                          <td>
                            <span
                              style={{
                                color:
                                  e.side === "attacker"
                                    ? "var(--accent-orange)"
                                    : "var(--accent-cyan)",
                                fontWeight: 600,
                              }}
                            >
                              {e.side === "attacker" ? "攻" : "防"}·P{e.slotIndex + 1}
                            </span>{" "}
                            {e.charName}
                          </td>
                          <td style={{ color: "var(--text-secondary)", fontSize: 11.5 }}>{e.label}</td>
                          <td className="num-col" style={{ color: "var(--accent-green)" }}>
                            +{e.chargeGain.toFixed(2)}%
                          </td>
                          <td className="num-col">{cum?.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Slot Config Modal */}
      {editingSlot && modalChar && (
        <SlotConfigModal
          side={editingSlot.side}
          slotIndex={editingSlot.index}
          char={modalChar}
          slot={(editingSlot.side === "attacker" ? attacker : defender)[editingSlot.index]}
          onChange={(nextSlot) =>
            setSideSlots(editingSlot.side, (prev) => {
              const next = [...prev];
              next[editingSlot.index] = nextSlot;
              return next;
            })
          }
          onClose={() => setEditingSlot(null)}
        />
      )}
    </div>
  );
}
