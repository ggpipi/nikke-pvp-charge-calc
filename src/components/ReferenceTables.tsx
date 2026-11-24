import { Table2 } from "lucide-react";
import {
  buildBreakpointTable,
  calcChargeFrames60,
  doubleToLong,
  formatEffPct,
  T10_TIERS,
} from "../engine/chargeCalc";

interface ReferenceTablesProps {
  selectedC0: number;
  onSelectC0: (c0: number) => void;
  activeInitC: number;
  activeFrames60: number;
  immuneToClearableBuffs: boolean;
}

const TABLE_TABS = [
  { c0: 200, label: "贝斯蒂：战术升级 (2.00s)" },
  { c0: 150, label: "莉贝雷里奥 / 1.50s 武器" },
  { c0: 100, label: "标准 1.00s 武器" },
  { c0: 120, label: "1.20s 武器" },
];

export function ReferenceTables({
  selectedC0,
  onSelectC0,
  activeInitC,
  activeFrames60,
  immuneToClearableBuffs,
}: ReferenceTablesProps) {
  const rows = buildBreakpointTable(
    selectedC0,
    selectedC0 === 150 ? immuneToClearableBuffs : false
  );
  const baseFrames60 = calcChargeFrames60(selectedC0);

  const fmtTierCell = (dc: number) =>
    selectedC0 === 100 ? `${dc}%` : `${formatEffPct(dc, selectedC0)} (${dc}cs)`;

  return (
    <div className="stack-md">
      <div className="panel">
        <div className="panel-header" style={{ flexWrap: "wrap" }}>
          <div className="panel-title">
            <Table2 size={16} color="var(--accent-cyan)" />
            <span>全档位对照表（60fps 帧数制 · 源码精确解包）</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TABLE_TABS.map((t) => (
              <button
                key={t.c0}
                className={`btn ${selectedC0 === t.c0 ? "btn-primary" : ""}`}
                onClick={() => onSelectC0(t.c0)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-body">
          <div className="tables-two-col">
            <div className="stack-sm">
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                1. 60fps 减帧档位与本质蓄速表（C0 = {selectedC0}，基础 {baseFrames60} 帧）
              </div>
              <div className="table-scroll tall">
                <table className="tactical-table">
                  <thead>
                    <tr>
                      <th>60fps 减帧</th>
                      <th className="num-col">蓄力帧</th>
                      <th className="num-col">本质蓄速 (词条等效%)</th>
                      <th className="num-col">减厘秒 dC (ROUND(词条×秒))</th>
                      <th className="num-col">耗时</th>
                      <th>达成条件</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const isCurrent =
                        selectedC0 === activeInitC && r.frames60 === activeFrames60;
                      return (
                        <tr
                          key={r.savedFrames60}
                          className={isCurrent ? "row-highlight" : undefined}
                        >
                          <td className="mono">
                            {r.savedFrames60 === 0 ? "0 帧" : `-${r.savedFrames60} 帧`}
                          </td>
                          <td className="num-col">{r.frames60} 帧</td>
                          <td className="num-col" style={{ color: "var(--accent-gold)" }}>
                            {r.effPctRange}
                          </td>
                          <td className="num-col">
                            {r.minDc} ~ {r.maxDc}
                          </td>
                          <td className="num-col">{r.timeSec}</td>
                          <td>
                            <span
                              className={`badge ${
                                r.reachability === "gear"
                                  ? "badge-green"
                                  : r.reachability === "cube"
                                  ? "badge-orange"
                                  : r.reachability === "ally"
                                  ? "badge-cyan"
                                  : "badge-muted"
                              }`}
                            >
                              {r.reachabilityLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="stack-sm">
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                2. T10 1～15 档同值合并有效蓄速表（C0 = {selectedC0}）
              </div>
              <div className="table-scroll tall">
                <table className="tactical-table">
                  <thead>
                    <tr>
                      <th>档位</th>
                      <th className="num-col">面板 %</th>
                      <th className="num-col">1 条</th>
                      <th className="num-col">2 条同值</th>
                      <th className="num-col">3 条同值</th>
                      <th className="num-col">4 条同值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {T10_TIERS.slice(1).map((t) => {
                      const d1 = -doubleToLong(selectedC0 * -t.bp * 1 * 0.0001);
                      const d2 = -doubleToLong(selectedC0 * -t.bp * 2 * 0.0001);
                      const d3 = -doubleToLong(selectedC0 * -t.bp * 3 * 0.0001);
                      const d4 = -doubleToLong(selectedC0 * -t.bp * 4 * 0.0001);
                      return (
                        <tr key={t.tier}>
                          <td className="mono">
                            <span
                              style={{
                                color:
                                  t.band === "black"
                                    ? "var(--accent-gold)"
                                    : t.band === "rare"
                                    ? "var(--accent-orange)"
                                    : undefined,
                                fontWeight: t.tier >= 11 ? 700 : 500,
                              }}
                            >
                              T{t.tier}
                            </span>
                          </td>
                          <td className="num-col">{t.pct.toFixed(2)}%</td>
                          <td className="num-col">{fmtTierCell(d1)}</td>
                          <td className="num-col">{fmtTierCell(d2)}</td>
                          <td className="num-col">{fmtTierCell(d3)}</td>
                          <td className="num-col">{fmtTierCell(d4)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                蓄速魔方（独立取整，不与装备词条合并）：Lv1–2 (1.06%) ={" "}
                <strong className="mono">
                  {fmtTierCell(-doubleToLong(selectedC0 * -106 * 0.0001))}
                </strong>
                ；Lv3–6 (1.59%) ={" "}
                <strong className="mono">
                  {fmtTierCell(-doubleToLong(selectedC0 * -159 * 0.0001))}
                </strong>
                ；Lv7+ (2.12%) ={" "}
                <strong className="mono">
                  {fmtTierCell(-doubleToLong(selectedC0 * -212 * 0.0001))}
                </strong>
                。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
