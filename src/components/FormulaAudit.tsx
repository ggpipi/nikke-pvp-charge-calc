import { Bug, Cpu, ShieldCheck } from "lucide-react";

export function FormulaAudit() {
  return (
    <div className="stack-md">
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Cpu size={16} color="var(--accent-cyan)" />
            <span>一、 客户端解包公式实锤（NK.Runtime.dll · v23.4 Build 150941）</span>
          </div>
          <span className="badge badge-cyan">先 Round 减厘秒 · 再 Floor 算逻辑帧</span>
        </div>
        <div className="panel-body stack-md">
          <div className="formula-block">
            <div>// 1. FunctionContext.AddFunction：同档位词条因 Function.Id 相同合并层数 k；不同档位/魔方独立存放</div>
            <div>// 2. SpotFunctionLogic.GetStatValue (FunctionStandardType.User 分支)：逐组独立四舍五入后相加</div>
            <div style={{ color: "var(--accent-gold)", marginTop: 6 }}>
              dC = Σ RoundHalfUp( C0 × v_i × k_i / 10000 ) &nbsp;&nbsp;// v_i 为万分比 (如 6.09% = 609)，k_i 为同值条数
            </div>
            <div style={{ color: "var(--accent-cyan)" }}>
              C = C0 - dC &nbsp;&nbsp;// 剩余蓄力厘秒 (0.01s 刻度)
            </div>
            <div style={{ color: "var(--accent-green)", marginTop: 6 }}>
              30Hz 逻辑帧 F_logic = floor(10 × C / 33) + 1 &nbsp;&nbsp;(当 C ≥ 1)
            </div>
            <div style={{ color: "var(--accent-orange)" }}>
              60fps 等效帧 F_60 = F_logic × 2 ，蓄力耗时 = F_logic × 0.033s
            </div>
          </div>

          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            <strong>为什么恰好整除 3.3 的点（C = 33, 66, 99, 132, 165, 198）会多耗 1 逻辑帧（+2 帧）？</strong>
            <br />
            在 <code className="mono">SpotSimulationRunner</code> 与{" "}
            <code className="mono">SpotManagement.UpdateSpot</code> 中，每帧步长{" "}
            <code className="mono">1f / 30f</code> 被{" "}
            <code className="mono">Math.Round(..., 3)</code> 截断为单精度浮点{" "}
            <code className="mono">0.033f</code>（IEEE-754 真值约为{" "}
            <code className="mono">0.03299999982f</code>）。当累加{" "}
            <code className="mono">k = C / 3.3</code> 次时，单精度累加和比{" "}
            <code className="mono">(float)C * 0.01f</code> 严格小 1～2 个 ULP（例如{" "}
            <code className="mono">C = 198</code> 时 60 次累加为{" "}
            <code className="mono">1.9799997f &lt; 1.9799999f</code>），导致满蓄判定为{" "}
            <code className="mono">False</code>，必须等到下一帧补齐——因此恒等于{" "}
            <code className="mono">floor(10C / 33) + 1</code>，而非直观的{" "}
            <code className="mono">ceil</code>。
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Bug size={16} color="var(--accent-red)" />
            <span>二、 本站 vs nikke.top 原版公式误差逐项对比</span>
          </div>
          <span className="badge badge-red">修正战贝 &amp; 莉贝雷里奥核心错误</span>
        </div>
        <div className="panel-body stack-md">
          <div className="table-scroll">
            <table className="tactical-table">
              <thead>
                <tr>
                  <th>测试角色与配装</th>
                  <th className="num-col">真实源码减帧 (60fps)</th>
                  <th className="num-col">nikke.top 减帧</th>
                  <th className="num-col">偏差</th>
                  <th>错误根因</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>战贝 (2.00s) · 单带 Lv7 魔方 (2.12%)</td>
                  <td className="num-col" style={{ color: "var(--accent-green)" }}>-2 帧 (4 cs)</td>
                  <td className="num-col" style={{ color: "var(--accent-red)" }}>-4 帧</td>
                  <td className="num-col" style={{ color: "var(--accent-red)" }}>高估 2 帧</td>
                  <td>按 1s 表 ne(2)=2 再 ×2，丢失 2/6/10... 奇数倍逻辑帧</td>
                </tr>
                <tr>
                  <td>战贝 (2.00s) · 单条 T10 (4.63%)</td>
                  <td className="num-col" style={{ color: "var(--accent-green)" }}>-6 帧 (9 cs)</td>
                  <td className="num-col" style={{ color: "var(--accent-red)" }}>-8 帧</td>
                  <td className="num-col" style={{ color: "var(--accent-red)" }}>高估 2 帧</td>
                  <td>按 1s 取整成 5 → ne(5)×2 = 8 帧</td>
                </tr>
                <tr>
                  <td>战贝 (2.00s) · 4 条黑底 (6.09%×4)</td>
                  <td className="num-col" style={{ color: "var(--accent-green)" }}>-30 帧 (49 cs)</td>
                  <td className="num-col" style={{ color: "var(--accent-red)" }}>-28 帧</td>
                  <td className="num-col" style={{ color: "var(--accent-red)" }}>低估 2 帧</td>
                  <td>未按 200×24.36%=48.72→49 进位，ne(24)×2 错失 49cs 档</td>
                </tr>
                <tr>
                  <td>莉贝雷里奥 (1.50s) · 3 条 T14 (5.80%×3)</td>
                  <td className="num-col" style={{ color: "var(--accent-green)" }}>-16 帧 (26 cs)</td>
                  <td className="num-col" style={{ color: "var(--accent-red)" }}>-10 帧</td>
                  <td className="num-col" style={{ color: "var(--accent-red)" }}>低估 6 帧</td>
                  <td>17% 未命中补丁，退回 1s 查表 ne(17)=10</td>
                </tr>
                <tr>
                  <td>莉贝雷里奥 (1.50s) · 4 条黑底 (6.09%×4)</td>
                  <td className="num-col" style={{ color: "var(--accent-green)" }}>-22 帧 (37 cs)</td>
                  <td className="num-col" style={{ color: "var(--accent-red)" }}>-16 帧</td>
                  <td className="num-col" style={{ color: "var(--accent-red)" }}>低估 6 帧</td>
                  <td>硬编码 21~24% 补丁写死减 16 帧，严重偏低</td>
                </tr>
                <tr>
                  <td>莉贝雷里奥 (1.50s) · 4×T14 + Lv7 魔方</td>
                  <td className="num-col" style={{ color: "var(--accent-green)" }}>-24 帧 (38 cs)</td>
                  <td className="num-col" style={{ color: "var(--accent-red)" }}>-16 帧</td>
                  <td className="num-col" style={{ color: "var(--accent-red)" }}>低估 8 帧</td>
                  <td>总和 25 掉出 21~24 补丁区间，退回 ne(25)=16</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <ShieldCheck size={16} color="var(--accent-green)" />
            <span>三、 莉贝雷里奥（水母）免疫机制与连射时序说明</span>
          </div>
        </div>
        <div className="panel-body" style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              <strong>为什么蓄速词条与魔方对莉贝雷里奥生效？</strong>
              2 技能赋予的 <code className="mono">DurationBuffCheckImmune</code> 在{" "}
              <code className="mono">SpotFunctionLogic.IsAvoidImmuneByFunctionValue</code> 中明确放行{" "}
              <code className="mono">BuffRemoveType != Clear</code> 的不可驱散效果（国服{" "}
              <code className="mono">Locale_Skill.lss</code> 亦写明“装备改造选项、模拟室增益、调和魔方不会触发免疫”）。
            </li>
            <li>
              <strong>为什么 PvP 全程是 1.50s 而非 1.00s？</strong>
              2 技能「缓流（固定蓄力 1 秒）」仅在命中非指定目标的<strong>莱彻</strong>时触发，PvP 敌方均为妮姬，无法触发缓流。
            </li>
            <li>
              <strong>自动击发（<code className="mono">InputType.DOWN_Charge</code>）时序：</strong>
              首枪在蓄满后的下 1 逻辑帧（60fps 下 +2 帧）开火，且开火同帧立即重置蓄力并推进下一枪第 1 逻辑帧，因此连射单发间隔严格等于蓄力帧数（无常规松手收枪前后摇）。
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
