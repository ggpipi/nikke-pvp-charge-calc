import { useMemo, useState } from "react";
import { ArenaSimResult, ServerRegion } from "../engine/arenaSim";

interface ChargeTimelineChartProps {
  sim: ArenaSimResult;
  server: ServerRegion;
}

export function ChargeTimelineChart({ sim, server }: ChargeTimelineChartProps) {
  const [hoverFrame, setHoverFrame] = useState<number | null>(null);

  const width = 920;
  const height = 270;
  const padL = 48;
  const padR = 20;
  const padT = 22;
  const padB = 34;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const maxY = 120; // cap display at 120% so 100% line has clear breathing room

  const xOf = (f: number) => padL + (f / sim.maxFrame) * plotW;
  const yOf = (pct: number) => padT + plotH - (Math.min(maxY, Math.max(0, pct)) / maxY) * plotH;

  const buildStepPath = (arr: number[]) => {
    if (arr.length === 0) return "";
    let d = `M ${xOf(0).toFixed(1)} ${yOf(arr[0]).toFixed(1)}`;
    for (let f = 1; f < arr.length; f++) {
      if (arr[f] !== arr[f - 1] || f === arr.length - 1) {
        d += ` L ${xOf(f).toFixed(1)} ${yOf(arr[f - 1]).toFixed(1)}`;
        d += ` L ${xOf(f).toFixed(1)} ${yOf(arr[f]).toFixed(1)}`;
      }
    }
    return d;
  };

  const atkPath = useMemo(() => buildStepPath(sim.attacker.cumulativeByFrame), [sim]);
  const defPath = useMemo(() => buildStepPath(sim.defender.cumulativeByFrame), [sim]);

  const rlMarks = useMemo(() => {
    const gap = server === "cn" ? 76 : 74;
    return [
      { label: "1RL", frame: 76 },
      { label: "2RL", frame: 76 + gap },
      { label: "3RL", frame: 76 + gap * 2 },
      { label: "4RL", frame: 76 + gap * 3 },
    ].filter((m) => m.frame <= sim.maxFrame);
  }, [server, sim.maxFrame]);

  const hoverDetails = useMemo(() => {
    if (hoverFrame === null) return null;
    const f = Math.max(0, Math.min(sim.maxFrame, hoverFrame));
    const atkPct = sim.attacker.cumulativeByFrame[f] ?? 0;
    const defPct = sim.defender.cumulativeByFrame[f] ?? 0;
    const nearAtk = sim.attacker.events.filter((e) => Math.abs(e.frame - f) <= 2);
    const nearDef = sim.defender.events.filter((e) => Math.abs(e.frame - f) <= 2);
    return { f, timeSec: ((f / 2) * 0.033).toFixed(3), atkPct, defPct, nearAtk, nearDef };
  }, [hoverFrame, sim]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const frac = (relX - padL) / plotW;
    if (frac < 0 || frac > 1) {
      setHoverFrame(null);
      return;
    }
    const f = Math.round((frac * sim.maxFrame) / 2) * 2; // snap to even 60fps frames (30Hz logic ticks)
    setHoverFrame(Math.max(0, Math.min(sim.maxFrame, f)));
  };

  return (
    <div className="stack-sm">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 3, background: "var(--accent-orange)", display: "inline-block" }} />
            进攻方充能 (%)
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 3, background: "var(--accent-cyan)", display: "inline-block" }} />
            防守方充能 (%)
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
            <span
              style={{
                width: 12,
                height: 0,
                borderTop: "1.5px dashed var(--accent-green)",
                display: "inline-block",
              }}
            />
            100% 满充线
          </span>
        </div>
        <span className="mono" style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
          移动鼠标查看任意帧攻防精确充能 · 基准 {server === "cn" ? "国服 16f 转身" : "国际服 14f 转身"}
        </span>
      </div>

      <div
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: "8px 6px 4px",
          position: "relative",
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverFrame(null)}
          role="img"
          aria-label="攻防双边 60fps 爆裂充能时间线图表"
        >
          {/* Y gridlines */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={padL}
                x2={width - padR}
                y1={yOf(v)}
                y2={yOf(v)}
                stroke={v === 100 ? "rgba(46, 229, 157, 0.55)" : "rgba(130, 156, 198, 0.12)"}
                strokeWidth={v === 100 ? 1.5 : 1}
                strokeDasharray={v === 100 ? "5 4" : undefined}
              />
              <text
                x={padL - 8}
                y={yOf(v) + 4}
                textAnchor="end"
                fontSize="10.5"
                fill={v === 100 ? "#2ee59d" : "#64748b"}
                fontFamily="JetBrains Mono, monospace"
              >
                {v}%
              </text>
            </g>
          ))}

          {/* X frame ticks every 30f (0.5s) */}
          {Array.from({ length: Math.floor(sim.maxFrame / 30) + 1 }, (_, i) => i * 30).map((f) => (
            <g key={f}>
              <line
                x1={xOf(f)}
                x2={xOf(f)}
                y1={padT}
                y2={height - padB}
                stroke="rgba(130, 156, 198, 0.08)"
              />
              <text
                x={xOf(f)}
                y={height - 12}
                textAnchor="middle"
                fontSize="10.5"
                fill="#64748b"
                fontFamily="JetBrains Mono, monospace"
              >
                {f}f
              </text>
            </g>
          ))}

          {/* RL vertical benchmark lines */}
          {rlMarks.map((m) => (
            <g key={m.label}>
              <line
                x1={xOf(m.frame)}
                x2={xOf(m.frame)}
                y1={padT}
                y2={height - padB}
                stroke="rgba(245, 196, 81, 0.25)"
                strokeDasharray="3 3"
              />
              <text
                x={xOf(m.frame)}
                y={padT - 6}
                textAnchor="middle"
                fontSize="10"
                fill="#f5c451"
                fontFamily="JetBrains Mono, monospace"
              >
                {m.label} ({m.frame}f)
              </text>
            </g>
          ))}

          {/* Attacker & Defender curves */}
          <path d={atkPath} fill="none" stroke="#ff7a1a" strokeWidth={2.3} />
          <path d={defPath} fill="none" stroke="#38d9ff" strokeWidth={2.3} />

          {/* Full charge markers */}
          {sim.attacker.fullChargeFrame !== null && (
            <g>
              <circle
                cx={xOf(sim.attacker.fullChargeFrame)}
                cy={yOf(100)}
                r={5.5}
                fill="#ff7a1a"
                stroke="#090b10"
                strokeWidth={2}
              />
              <text
                x={Math.min(width - 75, xOf(sim.attacker.fullChargeFrame) + 8)}
                y={yOf(100) - 8}
                fontSize="10.5"
                fontWeight="700"
                fill="#ff7a1a"
                fontFamily="JetBrains Mono, monospace"
              >
                攻满 {sim.attacker.fullChargeFrame}f
              </text>
            </g>
          )}

          {sim.defender.fullChargeFrame !== null && (
            <g>
              <circle
                cx={xOf(sim.defender.fullChargeFrame)}
                cy={yOf(100)}
                r={5.5}
                fill="#38d9ff"
                stroke="#090b10"
                strokeWidth={2}
              />
              <text
                x={Math.min(width - 75, xOf(sim.defender.fullChargeFrame) + 8)}
                y={yOf(100) + 15}
                fontSize="10.5"
                fontWeight="700"
                fill="#38d9ff"
                fontFamily="JetBrains Mono, monospace"
              >
                防满 {sim.defender.fullChargeFrame}f
              </text>
            </g>
          )}

          {/* Hover crosshair */}
          {hoverDetails && (
            <g>
              <line
                x1={xOf(hoverDetails.f)}
                x2={xOf(hoverDetails.f)}
                y1={padT}
                y2={height - padB}
                stroke="rgba(238, 242, 249, 0.45)"
                strokeWidth={1}
              />
              <circle
                cx={xOf(hoverDetails.f)}
                cy={yOf(hoverDetails.atkPct)}
                r={4}
                fill="#ff7a1a"
              />
              <circle
                cx={xOf(hoverDetails.f)}
                cy={yOf(hoverDetails.defPct)}
                r={4}
                fill="#38d9ff"
              />
            </g>
          )}
        </svg>

        {/* Live telemetry bar below SVG */}
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "8px 10px 4px",
            marginTop: 4,
            minHeight: 34,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            fontSize: 12,
          }}
        >
          {hoverDetails ? (
            <>
              <div className="mono" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  第 {hoverDetails.f} 帧 ({hoverDetails.timeSec}s)
                </span>
                <span style={{ color: "var(--accent-orange)" }}>
                  进攻: {hoverDetails.atkPct.toFixed(1)}%
                </span>
                <span style={{ color: "var(--accent-cyan)" }}>
                  防守: {hoverDetails.defPct.toFixed(1)}%
                </span>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 11.5 }}>
                {hoverDetails.nearAtk.length + hoverDetails.nearDef.length > 0 ? (
                  <>
                    附近事件：
                    {[...hoverDetails.nearAtk, ...hoverDetails.nearDef]
                      .slice(0, 3)
                      .map(
                        (e) =>
                          `${e.side === "attacker" ? "攻" : "防"}·${e.charName}(+${e.chargeGain.toFixed(1)}%)`
                      )
                      .join(" / ")}
                  </>
                ) : (
                  "该帧无命中事件"
                )}
              </div>
            </>
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
              提示：悬停图表可逐帧读取攻防双方的实时充能百分比与触发事件。
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
