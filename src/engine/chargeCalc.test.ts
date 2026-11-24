import { describe, expect, it } from "vitest";
import {
  analyzeRerollOptions,
  buildBreakpointTable,
  calcChargeFrames60,
  doubleToLong,
  evaluateLoadout,
} from "./chargeCalc";

describe("NK.Spot exact charge speed engine", () => {
  it("matches C# CommonUtil.DoubleToLong rounding including negative half-up", () => {
    expect(doubleToLong(-4.5)).toBe(-5);
    expect(doubleToLong(-4.49)).toBe(-4);
    expect(doubleToLong(-17.4)).toBe(-17);
    expect(doubleToLong(-48.72)).toBe(-49);
    expect(doubleToLong(95.5)).toBe(96);
  });

  it("handles IEEE-754 0.033f multiples of 33 (C=33, 66, 99, 165, 198)", () => {
    // 1.00s base = 62f; C=99 still 62f; C=98 drops to 60f
    expect(calcChargeFrames60(100)).toBe(62);
    expect(calcChargeFrames60(99)).toBe(62);
    expect(calcChargeFrames60(98)).toBe(60);
    // C=66 still 42f; C=65 drops to 40f
    expect(calcChargeFrames60(66)).toBe(42);
    expect(calcChargeFrames60(65)).toBe(40);
    // 2.00s base = 122f; C=198 still 122f; C=197 drops to 120f
    expect(calcChargeFrames60(200)).toBe(122);
    expect(calcChargeFrames60(198)).toBe(122);
    expect(calcChargeFrames60(197)).toBe(120);
    // C=165 still 102f; C=164 drops to 100f
    expect(calcChargeFrames60(165)).toBe(102);
    expect(calcChargeFrames60(164)).toBe(100);
  });

  it("reproduces user example: 4.33 + 4.92 + 4.33 + 4.04 on 1.00s = 18% effective (-12f)", () => {
    const res = evaluateLoadout(
      {
        initC: 100,
        gearBps: [433, 492, 433, 404],
        cubeBp: 0,
        allyUserBp: 0,
        allyUserCasterC: 100,
        allyTargetBp: 0,
        immuneToClearableBuffs: false,
      },
      "standard_1s"
    );
    expect(res.totalReducedCs).toBe(18);
    expect(res.effSpeedStr).toBe("18%");
    expect(res.actualFrames60).toBe(50);
    expect(res.savedFrames60).toBe(12);
  });

  it("detects downgrade anomaly: 5.80×3 (17cs, 52f) vs 5.80×2 + 5.51 (18cs, 50f) on 1.00s", () => {
    const input = {
      initC: 100,
      gearBps: [580, 580, 580, 0] as [number, number, number, number],
      cubeBp: 0,
      allyUserBp: 0,
      allyUserCasterC: 100,
      allyTargetBp: 0,
      immuneToClearableBuffs: false,
    };
    const res = evaluateLoadout(input, "standard_1s");
    expect(res.totalReducedCs).toBe(17);
    expect(res.savedFrames60).toBe(10);

    const analysis = analyzeRerollOptions(input, "standard_1s");
    expect(analysis.downgradeAnomalies.some((a) => a.toBp === 551 && a.frameGain60 === 2)).toBe(true);
  });

  it("computes Vesti: Tactical Upgrade (2.00s) 4x T15 = 49cs (-30f) and +Lv7 cube = 53cs (-32f)", () => {
    const noCube = evaluateLoadout(
      {
        initC: 200,
        gearBps: [609, 609, 609, 609],
        cubeBp: 0,
        allyUserBp: 0,
        allyUserCasterC: 150,
        allyTargetBp: 0,
        immuneToClearableBuffs: false,
      },
      "vesti_tu"
    );
    expect(noCube.totalReducedCs).toBe(49);
    expect(noCube.savedFrames60).toBe(30);
    expect(noCube.actualFrames60).toBe(92);
    // nikke.top mistakenly computes ne(24)*2 = 28f (-2f off)
    expect(noCube.nikkeTop.savedFrames60).toBe(28);

    const withCube = evaluateLoadout(
      {
        initC: 200,
        gearBps: [609, 609, 609, 609],
        cubeBp: 212,
        allyUserBp: 0,
        allyUserCasterC: 150,
        allyTargetBp: 0,
        immuneToClearableBuffs: false,
      },
      "vesti_tu"
    );
    expect(withCube.totalReducedCs).toBe(53);
    expect(withCube.savedFrames60).toBe(32);
    expect(withCube.actualFrames60).toBe(90);
  });

  it("computes Liberalio (1.50s) immunity and exact 4x T14 + Lv7 cube = 38cs (-24f) vs nikke.top (-16f)", () => {
    const res = evaluateLoadout(
      {
        initC: 150,
        gearBps: [580, 580, 580, 580],
        cubeBp: 212,
        allyUserBp: 1274, // should be ignored due to Skill 2 immunity!
        allyUserCasterC: 150,
        allyTargetBp: 1000, // should be ignored!
        immuneToClearableBuffs: true,
      },
      "liberalio"
    );
    expect(res.totalReducedCs).toBe(38);
    expect(res.savedFrames60).toBe(24);
    expect(res.actualFrames60).toBe(68);
    // nikke.top computes 23 + 2 = 25 -> falls out of 21..24 patch -> ne(25) = 16 (-8f off!)
    expect(res.nikkeTop.savedFrames60).toBe(16);
    expect(res.nikkeTop.diffVsTrueFrames60).toBe(-8);
  });

  it("builds complete breakpoint tables for 1.00s, 1.50s, 2.00s", () => {
    const t200 = buildBreakpointTable(200, false);
    expect(t200[0]).toMatchObject({ savedFrames60: 0, minDc: 0, maxDc: 2 });
    expect(t200[1]).toMatchObject({ savedFrames60: 2, minDc: 3, maxDc: 5 });
    expect(t200[2]).toMatchObject({ savedFrames60: 4, minDc: 6, maxDc: 8 });

    const t150 = buildBreakpointTable(150, true);
    expect(t150[0]).toMatchObject({ savedFrames60: 0, minDc: 0, maxDc: 1 });
    expect(t150[1]).toMatchObject({ savedFrames60: 2, minDc: 2, maxDc: 4 });
  });
});
