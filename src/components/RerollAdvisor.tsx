import { AlertTriangle, Sparkles, TrendingDown, Wrench } from "lucide-react";
import { RerollAnalysis } from "../engine/chargeCalc";

interface RerollAdvisorProps {
  analysis: RerollAnalysis;
  onApplyTier: (slotIndex: number, bp: number) => void;
  onEquipLv7Cube: () => void;
}

export function RerollAdvisor({
  analysis,
  onApplyTier,
  onEquipLv7Cube,
}: RerollAdvisorProps) {
  const sortedSlots = [...analysis.slotRecommendations].sort((a, b) => {
    if (a.minTierToImprove === null && b.minTierToImprove === null) return 0;
    if (a.minTierToImprove === null) return 1;
    if (b.minTierToImprove === null) return -1;
    if (b.hitProbabilityPct !== a.hitProbabilityPct) {
      return b.hitProbabilityPct - a.hitProbabilityPct;
    }
    return a.minTierToImprove - b.minTierToImprove;
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <Wrench size={16} color="var(--accent-orange)" />
          <span>洗词条决策助手（单件最优进档路径）</span>
        </div>
        <span className="badge badge-orange">自动穷举 T1–T15</span>
      </div>
      <div className="panel-body stack-md">
        {analysis.cubeUpgradeAdvice?.canBreakWithLv7Cube && (
          <div className="alert-box success">
            <Sparkles size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <strong>零石头白嫖方案：</strong>
              直接换戴 <strong>Lv7+ 遗迹促进魔方 (2.12%)</strong> 即可立刻多减{" "}
              <strong className="mono">{analysis.cubeUpgradeAdvice.frameGain60} 帧</strong>（进入{" "}
              <span className="mono">{analysis.cubeUpgradeAdvice.newFrames60} 帧</span>，本质蓄速{" "}
              <span className="mono">{analysis.cubeUpgradeAdvice.newEffPctStr}</span>），无需洗装备！
            </div>
            <button className="btn" onClick={onEquipLv7Cube}>
              一键换戴
            </button>
          </div>
        )}

        {analysis.downgradeAnomalies.length > 0 && (
          <div className="alert-box info">
            <TrendingDown size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>发现“降档反赚”奇异点！</strong>
              因同数值词条合并吞掉了小数进位，将{" "}
              <strong>{analysis.downgradeAnomalies[0].slotName}</strong> 从{" "}
              <span className="mono">
                T{analysis.downgradeAnomalies[0].fromTier} (
                {(analysis.downgradeAnomalies[0].fromBp / 100).toFixed(2)}%)
              </span>{" "}
              拆分成更低档的{" "}
              <span className="mono">
                T{analysis.downgradeAnomalies[0].toTier} (
                {(analysis.downgradeAnomalies[0].toBp / 100).toFixed(2)}%)
              </span>{" "}
              反而多减{" "}
              <strong className="mono">
                {analysis.downgradeAnomalies[0].frameGain60} 帧
              </strong>
              （本质蓄速升至 {analysis.downgradeAnomalies[0].newEffPctStr}）！
            </div>
          </div>
        )}

        <div className="reroll-grid">
          {sortedSlots.map((slot) => {
            const bestOption = slot.qualifyingTiers[0] ?? null;
            return (
              <div
                key={slot.slotIndex}
                className={`reroll-card ${bestOption ? "can-improve" : ""}`}
              >
                <div className="reroll-card-top">
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {slot.slotName}{" "}
                    <span className="mono" style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
                      {slot.currentBp === 0
                        ? "(空)"
                        : `T${slot.currentTier} · ${(slot.currentBp / 100).toFixed(2)}%`}
                    </span>
                  </div>
                  {bestOption ? (
                    <span className="badge badge-green">
                      出货率 {slot.hitProbabilityPct}%
                    </span>
                  ) : (
                    <span className="badge badge-muted">单件无法进档</span>
                  )}
                </div>

                {bestOption ? (
                  <>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      最低洗到{" "}
                      <strong className="mono" style={{ color: "var(--text-primary)" }}>
                        T{bestOption.tier} ({(bestOption.bp / 100).toFixed(2)}%)
                      </strong>{" "}
                      → 进档{" "}
                      <strong className="mono" style={{ color: "var(--accent-green)" }}>
                        -{bestOption.frameGain60} 帧
                      </strong>{" "}
                      （{bestOption.newFrames60} 帧 / 本质 {bestOption.newEffPctStr}）
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
                      {slot.qualifyingTiers.slice(0, 6).map((opt) => (
                        <button
                          key={opt.tier}
                          className="btn"
                          style={{ padding: "3px 7px", fontSize: 11 }}
                          title={`点击试算：${slot.slotName} 改为 T${opt.tier} (${(opt.bp / 100).toFixed(2)}%)`}
                          onClick={() => onApplyTier(slot.slotIndex, opt.bp)}
                        >
                          <span className="mono">
                            T{opt.tier} {(opt.bp / 100).toFixed(2)}%
                          </span>
                          <span style={{ color: "var(--accent-green)" }}>
                            -{opt.frameGain60}f
                          </span>
                        </button>
                      ))}
                      {slot.qualifyingTiers.length > 6 && (
                        <span
                          className="mono"
                          style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}
                        >
                          +{slot.qualifyingTiers.length - 6} 档
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    仅靠重洗该部位（即使洗到 T15 6.09%）也无法再减帧，建议改洗其他空位/低档位或配合魔方。
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {analysis.upgradeTraps.length > 0 && (
          <div className="alert-box warn">
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>防坑预警（洗高反亏）：</strong>
              当前配装存在同值合并碰撞陷阱——例如把{" "}
              <strong>{analysis.upgradeTraps[0].slotName}</strong> 从{" "}
              <span className="mono">
                T{analysis.upgradeTraps[0].fromTier} (
                {(analysis.upgradeTraps[0].fromBp / 100).toFixed(2)}%)
              </span>{" "}
              洗高到{" "}
              <span className="mono">
                T{analysis.upgradeTraps[0].toTier} (
                {(analysis.upgradeTraps[0].toBp / 100).toFixed(2)}%)
              </span>
              ，会与另一件装备同值合并，导致总减厘秒{" "}
              <strong className="mono">{analysis.upgradeTraps[0].dcDiff} cs</strong>
              {analysis.upgradeTraps[0].frameLoss60 > 0
                ? `（实战反而慢 ${analysis.upgradeTraps[0].frameLoss60} 帧！）`
                : "（有效收益倒退）"}
              。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
