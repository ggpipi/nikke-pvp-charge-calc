import { AlertCircle, Plus, Trash2, X } from "lucide-react";
import {
  analyzeRerollOptions,
  CUBE_OPTIONS,
  evaluateLoadout,
  SLOT_NAMES,
  T10_TIERS,
} from "../engine/chargeCalc";
import { CubeKind, evaluateSlotChargeSpeed, SideType, SlotConfig } from "../engine/arenaSim";
import { ELEMENT_META, RosterCharacter, WEAPON_META } from "../engine/roster";

const QUANTUM_OPTIONS = [
  { bp: 233, label: "Lv1–2 · +2.33%" },
  { bp: 350, label: "Lv3–6 · +3.50%" },
  { bp: 466, label: "Lv7–15 · +4.66%" },
];

interface SlotConfigModalProps {
  side: SideType;
  slotIndex: number;
  char: RosterCharacter;
  slot: SlotConfig;
  onChange: (next: SlotConfig) => void;
  onClose: () => void;
}

export function SlotConfigModal({
  side,
  slotIndex,
  char,
  slot,
  onChange,
  onClose,
}: SlotConfigModalProps) {
  const isChargeWeapon = char.initC > 0;
  const cs = evaluateSlotChargeSpeed(char, slot);

  // Full loadout eval for nikke.top bug comparison & reroll quick hint
  const fullEval =
    isChargeWeapon && slot.chargeSpeedMode === "per_gear"
      ? evaluateLoadout(
          {
            initC: char.initC,
            gearBps: slot.gearBps,
            cubeBp: slot.cubeKind === "adjutant" ? slot.cubeBp : 0,
            allyUserBp: 0,
            allyUserCasterC: char.initC,
            allyTargetBp: 0,
            immuneToClearableBuffs: Boolean(char.immuneToClearableBuffs),
          },
          char.id === "vesti_tu"
            ? "vesti_tu"
            : char.id === "liberalio"
            ? "liberalio"
            : "standard_1s"
        )
      : null;

  const rerollQuick =
    fullEval && isChargeWeapon
      ? analyzeRerollOptions(
          {
            initC: char.initC,
            gearBps: slot.gearBps,
            cubeBp: slot.cubeKind === "adjutant" ? slot.cubeBp : 0,
            allyUserBp: 0,
            allyUserCasterC: char.initC,
            allyTargetBp: 0,
            immuneToClearableBuffs: Boolean(char.immuneToClearableBuffs),
          },
          char.id === "vesti_tu"
            ? "vesti_tu"
            : char.id === "liberalio"
            ? "liberalio"
            : "standard_1s"
        )
      : null;

  const setGearSlot = (idx: number, bp: number) => {
    const next: [number, number, number, number] = [...slot.gearBps];
    next[idx] = bp;
    onChange({ ...slot, gearBps: next });
  };

  const setCubeKind = (kind: CubeKind) => {
    if (kind === "none") onChange({ ...slot, cubeKind: "none", cubeBp: 0 });
    else if (kind === "adjutant") onChange({ ...slot, cubeKind: "adjutant", cubeBp: 212 });
    else onChange({ ...slot, cubeKind: "quantum", cubeBp: 466 });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div className="panel-title">
            <span
              className="badge"
              style={{
                background: side === "attacker" ? "var(--accent-orange-dim)" : "var(--accent-cyan-dim)",
                color: side === "attacker" ? "var(--accent-orange)" : "var(--accent-cyan)",
              }}
            >
              {side === "attacker" ? "进攻" : "防守"} P{slotIndex + 1}
            </span>
            <span>{char.name}</span>
            <span
              className="badge badge-muted"
              style={{ color: ELEMENT_META[char.element].color }}
            >
              B{char.burst} · {WEAPON_META[char.weapon].short}
              {char.initC > 0 ? ` ${(char.initC / 100).toFixed(1)}s` : ""}
            </span>
          </div>
          <button className="btn" onClick={onClose} aria-label="关闭弹窗">
            <X size={14} />
          </button>
        </div>

        <div className="panel-body stack-md" style={{ maxHeight: "78vh", overflowY: "auto" }}>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {char.pvpRoleNote}
          </div>

          {/* Charge Speed Config for RL/SR */}
          {isChargeWeapon && char.special !== "universal" && (
            <div className="stack-sm">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>蓄力速度词条配置</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className={`btn ${slot.chargeSpeedMode === "per_gear" ? "btn-primary" : ""}`}
                    onClick={() => onChange({ ...slot, chargeSpeedMode: "per_gear" })}
                  >
                    逐件 T10（精确分组）
                  </button>
                  <button
                    className={`btn ${slot.chargeSpeedMode === "direct_total" ? "btn-primary" : ""}`}
                    onClick={() => onChange({ ...slot, chargeSpeedMode: "direct_total" })}
                  >
                    总数直输
                  </button>
                </div>
              </div>

              {slot.chargeSpeedMode === "per_gear" ? (
                <>
                  <div className="quick-presets" style={{ marginBottom: 4 }}>
                    <button
                      className="btn"
                      onClick={() => onChange({ ...slot, gearBps: [492, 492, 492, 492] })}
                    >
                      4×T11 (4.92%)
                    </button>
                    <button
                      className="btn"
                      onClick={() => onChange({ ...slot, gearBps: [580, 580, 580, 580] })}
                    >
                      4×T14 (5.80%)
                    </button>
                    <button
                      className="btn"
                      onClick={() => onChange({ ...slot, gearBps: [609, 609, 609, 609] })}
                    >
                      4×黑底 (6.09%)
                    </button>
                    <button
                      className="btn"
                      onClick={() => onChange({ ...slot, gearBps: [0, 0, 0, 0] })}
                    >
                      清空词条
                    </button>
                  </div>
                  <div className="slots-grid">
                    {SLOT_NAMES.map((name, i) => (
                      <div key={name}>
                        <label className="field-label">{name}</label>
                        <select
                          className="tactical-select"
                          value={slot.gearBps[i]}
                          onChange={(e) => setGearSlot(i, parseInt(e.target.value, 10) || 0)}
                        >
                          {T10_TIERS.map((t) => (
                            <option key={t.tier} value={t.bp}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div>
                  <label className="field-label">
                    直接输入目标装备总蓄速 %（0 ~ 25%，不含蓄速魔方）
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={30}
                    className="tactical-input"
                    value={slot.directTotalPct}
                    onChange={(e) =>
                      onChange({
                        ...slot,
                        directTotalPct: Math.max(0, Math.min(30, parseFloat(e.target.value) || 0)),
                      })
                    }
                  />
                </div>
              )}

              {/* Live charge telemetry summary */}
              <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                <div className="kpi-box tone-gold" style={{ padding: 10 }}>
                  <span className="kpi-label">本质有效蓄速</span>
                  <span className="kpi-value" style={{ fontSize: 20 }}>
                    {cs.effSpeedStr}
                  </span>
                  <span className="kpi-sub">减 {cs.totalReducedCs} cs</span>
                </div>
                <div className="kpi-box tone-green" style={{ padding: 10 }}>
                  <span className="kpi-label">60fps 减帧</span>
                  <span className="kpi-value" style={{ fontSize: 20 }}>
                    -{cs.savedFrames60} 帧
                  </span>
                  <span className="kpi-sub">精确源码引擎</span>
                </div>
                <div className="kpi-box tone-cyan" style={{ padding: 10 }}>
                  <span className="kpi-label">当前蓄力帧</span>
                  <span className="kpi-value" style={{ fontSize: 20 }}>
                    {cs.actualChargeFrames60} 帧
                  </span>
                  <span className="kpi-sub">基础 {char.attackInterval60} 帧</span>
                </div>
              </div>

              {fullEval &&
                (char.id === "vesti_tu" || char.id === "liberalio") &&
                fullEval.nikkeTop.diffVsTrueFrames60 !== 0 && (
                  <div className="alert-box danger">
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>已自动修复 nikke.top 偏差：</strong>
                      nikke.top 原版此处会误算为 <span className="mono">-{fullEval.nikkeTop.savedFrames60}f</span>，本站按客户端源码精确算为{" "}
                      <strong className="mono">-{fullEval.savedFrames60}f</strong>！
                    </span>
                  </div>
                )}

              {rerollQuick && rerollQuick.cubeUpgradeAdvice?.canBreakWithLv7Cube && (
                <div className="alert-box success">
                  <span>
                    快捷建议：切换 <strong>遗迹促进魔方 Lv7+ (2.12%)</strong> 可直接多减{" "}
                    <strong className="mono">{rerollQuick.cubeUpgradeAdvice.frameGain60} 帧</strong>！
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Harmony Cube Config */}
          <div className="stack-sm">
            <span style={{ fontSize: 13, fontWeight: 600 }}>调和魔方</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                className={`btn ${slot.cubeKind === "none" ? "btn-primary" : ""}`}
                onClick={() => setCubeKind("none")}
              >
                无魔方
              </button>
              <button
                className={`btn ${slot.cubeKind === "quantum" ? "btn-primary" : ""}`}
                onClick={() => setCubeKind("quantum")}
              >
                遗迹量子魔方（充能+）
              </button>
              {isChargeWeapon && (
                <button
                  className={`btn ${slot.cubeKind === "adjutant" ? "btn-primary" : ""}`}
                  onClick={() => setCubeKind("adjutant")}
                >
                  遗迹促进魔方（蓄速+）
                </button>
              )}
            </div>

            {slot.cubeKind === "quantum" && (
              <select
                className="tactical-select"
                value={slot.cubeBp}
                onChange={(e) => onChange({ ...slot, cubeBp: parseInt(e.target.value, 10) || 466 })}
              >
                {QUANTUM_OPTIONS.map((q) => (
                  <option key={q.bp} value={q.bp}>
                    遗迹量子魔方 {q.label}
                  </option>
                ))}
              </select>
            )}

            {slot.cubeKind === "adjutant" && (
              <select
                className="tactical-select"
                value={slot.cubeBp}
                onChange={(e) => onChange({ ...slot, cubeBp: parseInt(e.target.value, 10) || 212 })}
              >
                {CUBE_OPTIONS.slice(1).map((c) => (
                  <option key={c.bp} value={c.bp}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Character-specific toggles */}
          {char.special === "red_hood" && (
            <div className="stack-sm">
              <span style={{ fontSize: 13, fontWeight: 600 }}>小红帽额外穿透命中次数</span>
              <div style={{ display: "flex", gap: 6 }}>
                {([0, 1, 2] as const).map((n) => (
                  <button
                    key={n}
                    className={`btn ${slot.redHoodPierce === n ? "btn-primary" : ""}`}
                    onClick={() => onChange({ ...slot, redHoodPierce: n })}
                  >
                    穿透 +{n} 次
                  </button>
                ))}
              </div>
            </div>
          )}

          {char.special === "jackal" && (
            <div className="stack-sm">
              <span style={{ fontSize: 13, fontWeight: 600 }}>豺狼分伤链接人数（用于统计敌方命中反充）</span>
              <div style={{ display: "flex", gap: 6 }}>
                {([2, 3] as const).map((n) => (
                  <button
                    key={n}
                    className={`btn ${slot.jackalLinkCount === n ? "btn-primary" : ""}`}
                    onClick={() => onChange({ ...slot, jackalLinkCount: n })}
                  >
                    链接 {n} 人（含豺狼自身）
                  </button>
                ))}
              </div>
            </div>
          )}

          {char.special === "scarlet" && (
            <div className="stack-sm">
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={slot.scarletCounterEnabled}
                  onChange={(e) => onChange({ ...slot, scarletCounterEnabled: e.target.checked })}
                />
                <span>计入红莲受击反伤充能（按 30% 触发期望估算）</span>
              </label>
            </div>
          )}

          {char.special === "universal" && (
            <div className="stack-sm">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>自定义充能事件（60fps 帧数 & 充能 %）</span>
                <button
                  className="btn"
                  onClick={() =>
                    onChange({
                      ...slot,
                      universalEvents: [...slot.universalEvents, { frame: 100, charge: 10 }],
                    })
                  }
                >
                  <Plus size={13} /> 添加时间点
                </button>
              </div>
              {slot.universalEvents.map((ev, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    className="tactical-input"
                    value={ev.frame}
                    onChange={(e) => {
                      const next = [...slot.universalEvents];
                      next[idx] = { ...ev, frame: parseInt(e.target.value, 10) || 1 };
                      onChange({ ...slot, universalEvents: next });
                    }}
                    placeholder="帧 (1-300)"
                  />
                  <input
                    type="number"
                    step="0.1"
                    className="tactical-input"
                    value={ev.charge}
                    onChange={(e) => {
                      const next = [...slot.universalEvents];
                      next[idx] = { ...ev, charge: parseFloat(e.target.value) || 0 };
                      onChange({ ...slot, universalEvents: next });
                    }}
                    placeholder="充能 %"
                  />
                  <button
                    className="btn"
                    onClick={() =>
                      onChange({
                        ...slot,
                        universalEvents: slot.universalEvents.filter((_, i) => i !== idx),
                      })
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
