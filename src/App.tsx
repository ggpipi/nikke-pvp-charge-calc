import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Crosshair,
  Link2,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Zap,
} from "lucide-react";
import {
  analyzeRerollOptions,
  CHARACTER_PRESETS,
  CharacterPresetId,
  CUBE_OPTIONS,
  evaluateLoadout,
  SLOT_NAMES,
  T10_TIERS,
} from "./engine/chargeCalc";
import { ArenaTeamBuilder } from "./components/ArenaTeamBuilder";
import { RerollAdvisor } from "./components/RerollAdvisor";
import { ReferenceTables } from "./components/ReferenceTables";
import { FormulaAudit } from "./components/FormulaAudit";

type ActiveTab = "arena" | "calc" | "tables" | "audit";

function parseInitialStateFromUrl(): {
  tab: ActiveTab;
  presetId: CharacterPresetId;
  customC0: number;
  gearBps: [number, number, number, number];
  cubeBp: number;
} {
  const params = new URLSearchParams(window.location.search);
  const rawTab = params.get("tab") as ActiveTab | null;
  const hasSingleParams = params.has("p") || params.has("g");
  const tab: ActiveTab =
    rawTab === "arena" || rawTab === "calc" || rawTab === "tables" || rawTab === "audit"
      ? rawTab
      : hasSingleParams
      ? "calc"
      : "arena";

  const rawPreset = params.get("p") as CharacterPresetId | null;
  const validPreset = CHARACTER_PRESETS.some((p) => p.id === rawPreset)
    ? (rawPreset as CharacterPresetId)
    : "vesti_tu";

  const rawC0 = parseInt(params.get("c0") || "", 10);
  const customC0 = Number.isFinite(rawC0) && rawC0 >= 20 && rawC0 <= 500 ? rawC0 : 120;

  const validBpSet = new Set(T10_TIERS.map((t) => t.bp));
  const rawGear = (params.get("g") || "").split(",").map((x) => parseInt(x, 10));
  const gearBps: [number, number, number, number] =
    rawGear.length === 4 && rawGear.every((x) => validBpSet.has(x))
      ? [rawGear[0], rawGear[1], rawGear[2], rawGear[3]]
      : [433, 492, 433, 404];

  const rawCube = parseInt(params.get("c") || "", 10);
  const cubeBp = CUBE_OPTIONS.some((c) => c.bp === rawCube) ? rawCube : 0;

  return { tab, presetId: validPreset, customC0, gearBps, cubeBp };
}

export default function App() {
  const initial = useMemo(() => parseInitialStateFromUrl(), []);

  const [activeTab, setActiveTab] = useState<ActiveTab>(initial.tab);
  const [presetId, setPresetId] = useState<CharacterPresetId>(initial.presetId);
  const [customC0, setCustomC0] = useState<number>(initial.customC0);
  const [gearBps, setGearBps] = useState<[number, number, number, number]>(initial.gearBps);
  const [cubeBp, setCubeBp] = useState<number>(initial.cubeBp);
  const [allyUserPct, setAllyUserPct] = useState<string>("0");
  const [allyUserCasterC, setAllyUserCasterC] = useState<string>("150");
  const [allyTargetPct, setAllyTargetPct] = useState<string>("0");
  const [tableC0, setTableC0] = useState<number>(
    CHARACTER_PRESETS.find((p) => p.id === initial.presetId)?.initC ?? 200
  );
  const [copied, setCopied] = useState(false);

  const preset = useMemo(
    () => CHARACTER_PRESETS.find((p) => p.id === presetId) ?? CHARACTER_PRESETS[0],
    [presetId]
  );

  const initC = presetId === "custom" ? Math.max(10, customC0) : preset.initC;

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (activeTab === "calc") {
      params.set("p", presetId);
      if (presetId === "custom") params.set("c0", String(initC));
      params.set("g", gearBps.join(","));
      if (cubeBp > 0) params.set("c", String(cubeBp));
    }
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }, [activeTab, presetId, initC, gearBps, cubeBp]);

  const loadoutInput = useMemo(
    () => ({
      initC,
      gearBps,
      cubeBp,
      allyUserBp: Math.round((parseFloat(allyUserPct) || 0) * 100),
      allyUserCasterC: Math.max(10, parseInt(allyUserCasterC, 10) || 150),
      allyTargetBp: Math.round((parseFloat(allyTargetPct) || 0) * 100),
      immuneToClearableBuffs: preset.immuneToClearableBuffs,
    }),
    [initC, gearBps, cubeBp, allyUserPct, allyUserCasterC, allyTargetPct, preset.immuneToClearableBuffs]
  );

  const result = useMemo(
    () => evaluateLoadout(loadoutInput, presetId),
    [loadoutInput, presetId]
  );

  const rerollAnalysis = useMemo(
    () => analyzeRerollOptions(loadoutInput, presetId),
    [loadoutInput, presetId]
  );

  const updateSlot = (idx: number, bp: number) => {
    setGearBps((prev) => {
      const next: [number, number, number, number] = [...prev];
      next[idx] = bp;
      return next;
    });
  };

  const nudgeSlot = (idx: number, delta: number) => {
    const curBp = gearBps[idx];
    const curTierIdx = T10_TIERS.findIndex((t) => t.bp === curBp);
    const nextIdx = Math.max(0, Math.min(T10_TIERS.length - 1, curTierIdx + delta));
    updateSlot(idx, T10_TIERS[nextIdx].bp);
  };

  const handleSelectPreset = (id: CharacterPresetId) => {
    setPresetId(id);
    const target = CHARACTER_PRESETS.find((p) => p.id === id);
    if (target && id !== "custom") {
      setTableC0(target.initC);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const showNikkeTopComparison =
    (presetId === "vesti_tu" || presetId === "liberalio" || presetId === "standard_1s") &&
    loadoutInput.allyTargetBp === 0 &&
    loadoutInput.allyUserBp === 0;

  return (
    <div className="app-shell">
      <header className="hud-header">
        <div>
          <div className="hud-eyebrow">
            <span className="hud-eyebrow-dot" />
            <span>ARK ARENA TOOLS V2.0 · NK.RUNTIME V23.4 源码解包校准</span>
          </div>
          <h1 className="hud-title">NIKKE PvP 5v5 充能排轴 &amp; 蓄速计算器</h1>
          <p className="hud-subtitle">
            独立开源实现 · 彻底修复 <strong>贝斯蒂：战术升级 (2.00s)</strong> 与{" "}
            <strong>莉贝雷里奥 (1.50s)</strong> 蓄速减帧错误 · 支持国服/国际服转身帧差与单件洗词条决策
          </p>
        </div>

        <div className="hud-actions">
          <button className="btn" onClick={handleCopyLink}>
            {copied ? <Check size={14} color="var(--accent-green)" /> : <Link2 size={14} />}
            <span>{copied ? "已复制页面链接" : "复制分享链接"}</span>
          </button>
          {activeTab === "calc" && (
            <button
              className="btn"
              onClick={() => {
                setGearBps([0, 0, 0, 0]);
                setCubeBp(0);
                setAllyUserPct("0");
                setAllyTargetPct("0");
              }}
            >
              <RotateCcw size={14} />
              <span>重置词条</span>
            </button>
          )}
        </div>
      </header>

      <nav className="nav-tabs" aria-label="功能导航">
        <button
          className={`nav-tab ${activeTab === "arena" ? "active" : ""}`}
          onClick={() => setActiveTab("arena")}
        >
          <span className="nav-tab-num">01</span>
          <span>5v5 竞技场排轴 &amp; 充能曲线</span>
        </button>
        <button
          className={`nav-tab ${activeTab === "calc" ? "active" : ""}`}
          onClick={() => setActiveTab("calc")}
        >
          <span className="nav-tab-num">02</span>
          <span>单角色蓄速 &amp; 洗词条助手</span>
        </button>
        <button
          className={`nav-tab ${activeTab === "tables" ? "active" : ""}`}
          onClick={() => setActiveTab("tables")}
        >
          <span className="nav-tab-num">03</span>
          <span>60fps 全档位表 &amp; T10 收益矩阵</span>
        </button>
        <button
          className={`nav-tab ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          <span className="nav-tab-num">04</span>
          <span>解包源码原理 &amp; nikke.top 误差对比</span>
        </button>
      </nav>

      {activeTab === "arena" && <ArenaTeamBuilder />}

      {activeTab === "calc" && (
        <div className="workspace-grid">
          <div className="stack-md">
            <section className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Crosshair size={16} color="var(--accent-orange)" />
                  <span>1. 选择妮姬 / 基础蓄力时长</span>
                </div>
                <span className="badge badge-cyan">C0 = {initC} cs</span>
              </div>
              <div className="panel-body">
                <div className="preset-grid">
                  {CHARACTER_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      className={`preset-btn ${presetId === p.id ? "active" : ""}`}
                      onClick={() => handleSelectPreset(p.id)}
                    >
                      <div className="preset-btn-name">
                        <span>{p.name}</span>
                        {p.immuneToClearableBuffs && (
                          <span className="badge badge-orange" style={{ fontSize: 10 }}>
                            蓄速免疫
                          </span>
                        )}
                      </div>
                      <span className="preset-btn-tag">{p.tag}</span>
                    </button>
                  ))}
                </div>

                {presetId === "custom" && (
                  <div style={{ marginTop: 12 }}>
                    <label className="field-label">
                      自定义武器基础蓄力厘秒 C0（100 = 1.00s，150 = 1.50s，200 = 2.00s）
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={500}
                      className="tactical-input"
                      value={customC0}
                      onChange={(e) => setCustomC0(Math.max(10, parseInt(e.target.value, 10) || 100))}
                    />
                  </div>
                )}

                <div className={`char-note ${preset.immuneToClearableBuffs ? "immune" : ""}`}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>
                    {preset.weaponLabel}
                  </div>
                  <div>{preset.summary}</div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Sliders size={16} color="var(--accent-cyan)" />
                  <span>2. T10 装备词条与调和魔方</span>
                </div>
                <span className="mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  面板 {result.panelGearCubePct.toFixed(2)}%
                </span>
              </div>
              <div className="panel-body">
                <div className="quick-presets">
                  <button
                    className="btn"
                    onClick={() => {
                      setGearBps([433, 492, 433, 404]);
                      setCubeBp(0);
                    }}
                  >
                    示例: 4.33×2+4.92+4.04
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setGearBps([580, 580, 580, 0]);
                      setCubeBp(0);
                    }}
                  >
                    降档反赚: 5.80×3
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setGearBps([580, 580, 580, 580]);
                      setCubeBp(212);
                    }}
                  >
                    4×T14 + Lv7魔方
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setGearBps([609, 609, 609, 609]);
                      setCubeBp(212);
                    }}
                  >
                    4黑底 + Lv7魔方
                  </button>
                </div>

                <div className="slots-grid">
                  {SLOT_NAMES.map((name, idx) => {
                    const bp = gearBps[idx];
                    const tierObj = T10_TIERS.find((t) => t.bp === bp) ?? T10_TIERS[0];
                    return (
                      <div key={name} className={`slot-card band-${tierObj.band}`}>
                        <div className="slot-top">
                          <span className="slot-label">{name}</span>
                          <span className="slot-band-badge">
                            {tierObj.tier === 0
                              ? "空"
                              : tierObj.tier === 15
                              ? "T15 黑底"
                              : `T${tierObj.tier}`}
                          </span>
                        </div>
                        <div className="slot-controls">
                          <button
                            className="nudge-btn"
                            title="降低 1 档"
                            disabled={tierObj.tier === 0}
                            onClick={() => nudgeSlot(idx, -1)}
                          >
                            −
                          </button>
                          <select
                            className="tactical-select"
                            aria-label={`${name}蓄速词条`}
                            value={bp}
                            onChange={(e) => updateSlot(idx, parseInt(e.target.value, 10) || 0)}
                          >
                            {T10_TIERS.map((t) => (
                              <option key={t.tier} value={t.bp}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <button
                            className="nudge-btn"
                            title="提高 1 档"
                            disabled={tierObj.tier === 15}
                            onClick={() => nudgeSlot(idx, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 14 }}>
                  <label className="field-label">调和魔方（遗迹促进魔方 · 独立取整）</label>
                  <select
                    className="tactical-select"
                    value={cubeBp}
                    onChange={(e) => setCubeBp(parseInt(e.target.value, 10) || 0)}
                  >
                    {CUBE_OPTIONS.map((c) => (
                      <option key={c.id} value={c.bp}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: "1px solid var(--border-subtle)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    <label className="field-label">
                      战中队友拐 [施法者基准 % / C0]
                      {preset.immuneToClearableBuffs && " (已免疫)"}
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="number"
                        step="0.01"
                        className="tactical-input"
                        disabled={preset.immuneToClearableBuffs}
                        value={allyUserPct}
                        onChange={(e) => setAllyUserPct(e.target.value)}
                        placeholder="如 12.74"
                      />
                      <input
                        type="number"
                        className="tactical-input"
                        style={{ width: 82 }}
                        disabled={preset.immuneToClearableBuffs}
                        value={allyUserCasterC}
                        onChange={(e) => setAllyUserCasterC(e.target.value)}
                        placeholder="150"
                        title="施法者基础蓄力厘秒（如莉贝雷里奥为 150）"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">
                      战中技能蓄速 [目标基准 %]
                      {preset.immuneToClearableBuffs && " (已免疫)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="tactical-input"
                      disabled={preset.immuneToClearableBuffs}
                      value={allyTargetPct}
                      onChange={(e) => setAllyTargetPct(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {preset.immuneToClearableBuffs && (
                  <div className="alert-box warn" style={{ marginTop: 10 }}>
                    <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      莉贝雷里奥 2 技能免疫战中可驱散蓄速 Buff/Debuff，但 T10 改造词条与蓄速魔方不可驱散，正常参与计算。
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="stack-md">
            <section className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Zap size={16} color="var(--accent-gold)" />
                  <span>实时 PvP 帧数遥测（60fps 等效帧）</span>
                </div>
                <span className="badge badge-green">
                  底层 {result.actualLogicTicks} 逻辑帧 (30Hz)
                </span>
              </div>
              <div className="panel-body stack-md">
                <div className="kpi-grid">
                  <div className="kpi-box tone-gold">
                    <span className="kpi-label">本质有效蓄速</span>
                    <span className="kpi-value">{result.effSpeedStr}</span>
                    <span className="kpi-sub">
                      减 {result.totalReducedCs} cs / 面板 {result.panelGearCubePct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="kpi-box tone-cyan">
                    <span className="kpi-label">60fps 蓄力帧</span>
                    <span className="kpi-value">{result.actualFrames60} 帧</span>
                    <span className="kpi-sub">基础 {result.baseFrames60} 帧</span>
                  </div>
                  <div className="kpi-box tone-green">
                    <span className="kpi-label">60fps 减少帧</span>
                    <span className="kpi-value">
                      {result.savedFrames60 === 0 ? "0 帧" : `-${result.savedFrames60} 帧`}
                    </span>
                    <span className="kpi-sub">
                      提速 {result.savedTimeSec.toFixed(3)}s
                    </span>
                  </div>
                  <div className="kpi-box tone-orange">
                    <span className="kpi-label">实际蓄力耗时</span>
                    <span className="kpi-value">{result.actualTimeSec.toFixed(3)}s</span>
                    <span className="kpi-sub">剩余 C = {result.finalC} cs</span>
                  </div>
                </div>

                <div className="tier-progress-wrap">
                  <div className="tier-progress-head">
                    {result.nextBreakpoint.reachable ? (
                      <>
                        <span>
                          下一档{" "}
                          <strong className="mono" style={{ color: "var(--accent-cyan)" }}>
                            {result.nextBreakpoint.nextFrames60} 帧 (-{result.nextBreakpoint.nextSavedFrames60}f)
                          </strong>{" "}
                          需本质蓄速{" "}
                          <strong className="mono" style={{ color: "var(--accent-gold)" }}>
                            ≥ {result.nextBreakpoint.neededEffPctStr}
                          </strong>{" "}
                          ({result.nextBreakpoint.neededDc} cs)
                        </span>
                        <span className="mono" style={{ color: "var(--accent-orange)", fontWeight: 600 }}>
                          还差 +{result.nextBreakpoint.diffEffPctStr} (+{result.nextBreakpoint.diffDc} cs)
                        </span>
                      </>
                    ) : (
                      <strong style={{ color: "var(--accent-green)" }}>已达 0 蓄力帧极限上限</strong>
                    )}
                  </div>
                  <div className="tier-progress-track">
                    <div
                      className="tier-progress-fill"
                      style={{ width: `${Math.round(result.nextBreakpoint.progressInTier * 100)}%` }}
                    />
                  </div>
                </div>

                {showNikkeTopComparison && result.nikkeTop.diffVsTrueFrames60 !== 0 && (
                  <div className="alert-box danger">
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>与 nikke.top 原版差异提醒：</strong>
                      该配装下 <code className="mono">nikke.top</code> 会误算为{" "}
                      <strong className="mono">-{result.nikkeTop.savedFrames60} 帧</strong>，而游戏真实源码结果是{" "}
                      <strong className="mono">-{result.savedFrames60} 帧</strong>（
                      {result.nikkeTop.diffVsTrueFrames60 > 0
                        ? `nikke.top 多算了 ${result.nikkeTop.diffVsTrueFrames60} 帧`
                        : `nikke.top 少算了 ${-result.nikkeTop.diffVsTrueFrames60} 帧`}
                      ）。
                    </div>
                  </div>
                )}

                {loadoutInput.allyTargetBp === 0 &&
                  loadoutInput.allyUserBp === 0 &&
                  result.naive.reducedCs !== result.totalReducedCs && (
                    <div className="alert-box info">
                      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong>分组取整差异：</strong>若按面板合计{" "}
                        <span className="mono">{result.panelGearCubePct.toFixed(2)}%</span>{" "}
                        直接四舍五入，会误算为本质{" "}
                        <span className="mono">{result.naive.effSpeedStr}</span>（
                        <span className="mono">{result.naive.frames60} 帧</span>），与真实分组取整（
                        <strong className="mono">{result.effSpeedStr}</strong> /{" "}
                        <strong className="mono">{result.actualFrames60} 帧</strong>）不同。
                      </div>
                    </div>
                  )}

                {result.groups.length > 0 && (
                  <div className="stack-sm">
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>
                      分组取证明细（同档位先合并乘条数 k，不同档位与魔方各自独立 Round）
                    </div>
                    <div className="table-scroll">
                      <table className="tactical-table">
                        <thead>
                          <tr>
                            <th>合并分组项</th>
                            <th className="num-col">面板合计</th>
                            <th className="num-col">未取整减厘秒</th>
                            <th className="num-col">Round 后减厘秒</th>
                            <th className="num-col">单项本质蓄速</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.groups.map((g) => (
                            <tr key={g.key}>
                              <td>{g.source}</td>
                              <td className="num-col">{g.rawPctSum.toFixed(2)}%</td>
                              <td className="num-col">{g.rawDeltaCs.toFixed(3)} cs</td>
                              <td className="num-col" style={{ color: "var(--accent-green)" }}>
                                -{g.roundedCs} cs
                              </td>
                              <td className="num-col" style={{ color: "var(--accent-gold)" }}>
                                {g.effPctStr}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <RerollAdvisor
              analysis={rerollAnalysis}
              onApplyTier={updateSlot}
              onEquipLv7Cube={() => setCubeBp(212)}
            />
          </div>
        </div>
      )}

      {activeTab === "tables" && (
        <ReferenceTables
          selectedC0={tableC0}
          onSelectC0={setTableC0}
          activeInitC={initC}
          activeFrames60={result.actualFrames60}
          immuneToClearableBuffs={preset.immuneToClearableBuffs}
        />
      )}

      {activeTab === "audit" && <FormulaAudit />}

      <footer className="footer">
        <span>
          独立开源实现 · 公式依据：客户端 <code className="mono">NK.Runtime.dll</code>（SpotFunctionLogic /
          FunctionContext / WeaponLogic / SpotSimulationRunner）解包验证
        </span>
        <span className="mono">30Hz 逻辑帧 × 0.033f → 60fps 折算 (×2)</span>
      </footer>
    </div>
  );
}
