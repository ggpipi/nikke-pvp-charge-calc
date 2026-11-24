export interface T10Tier {
  tier: number;
  bp: number; // basis points (e.g. 609 = 6.09%)
  pct: number;
  band: "none" | "common" | "uncommon" | "rare" | "black";
  rollWeightPct: number; // probability of hitting this exact tier given a Charge Speed line (T1-5: 12%, T6-10: 7%, T11-15: 1%)
  label: string;
}

export const T10_TIERS: readonly T10Tier[] = [
  { tier: 0, bp: 0, pct: 0, band: "none", rollWeightPct: 0, label: "无词条 (0%)" },
  { tier: 1, bp: 198, pct: 1.98, band: "common", rollWeightPct: 12, label: "T1 · 1.98%" },
  { tier: 2, bp: 228, pct: 2.28, band: "common", rollWeightPct: 12, label: "T2 · 2.28%" },
  { tier: 3, bp: 257, pct: 2.57, band: "common", rollWeightPct: 12, label: "T3 · 2.57%" },
  { tier: 4, bp: 286, pct: 2.86, band: "common", rollWeightPct: 12, label: "T4 · 2.86%" },
  { tier: 5, bp: 316, pct: 3.16, band: "common", rollWeightPct: 12, label: "T5 · 3.16%" },
  { tier: 6, bp: 345, pct: 3.45, band: "uncommon", rollWeightPct: 7, label: "T6 · 3.45%" },
  { tier: 7, bp: 375, pct: 3.75, band: "uncommon", rollWeightPct: 7, label: "T7 · 3.75%" },
  { tier: 8, bp: 404, pct: 4.04, band: "uncommon", rollWeightPct: 7, label: "T8 · 4.04%" },
  { tier: 9, bp: 433, pct: 4.33, band: "uncommon", rollWeightPct: 7, label: "T9 · 4.33%" },
  { tier: 10, bp: 463, pct: 4.63, band: "uncommon", rollWeightPct: 7, label: "T10 · 4.63%" },
  { tier: 11, bp: 492, pct: 4.92, band: "rare", rollWeightPct: 1, label: "T11 · 4.92% (初洗)" },
  { tier: 12, bp: 521, pct: 5.21, band: "rare", rollWeightPct: 1, label: "T12 · 5.21%" },
  { tier: 13, bp: 551, pct: 5.51, band: "rare", rollWeightPct: 1, label: "T13 · 5.51%" },
  { tier: 14, bp: 580, pct: 5.8, band: "rare", rollWeightPct: 1, label: "T14 · 5.80%" },
  { tier: 15, bp: 609, pct: 6.09, band: "black", rollWeightPct: 1, label: "T15 · 6.09% (黑底)" },
] as const;

export interface CubeOption {
  id: string;
  bp: number;
  label: string;
  shortLabel: string;
}

export const CUBE_OPTIONS: readonly CubeOption[] = [
  { id: "0", bp: 0, label: "不带蓄速魔方 (0%)", shortLabel: "无魔方" },
  { id: "106", bp: 106, label: "遗迹促进魔方 Lv1–2 (1.06%)", shortLabel: "Lv1–2 · 1.06%" },
  { id: "159", bp: 159, label: "遗迹促进魔方 Lv3–6 (1.59%)", shortLabel: "Lv3–6 · 1.59%" },
  { id: "212", bp: 212, label: "遗迹促进魔方 Lv7–15 (2.12%)", shortLabel: "Lv7+ · 2.12%" },
] as const;

export type CharacterPresetId =
  | "vesti_tu"
  | "liberalio"
  | "standard_1s"
  | "other_1_5s"
  | "other_2s"
  | "custom";

export interface CharacterPreset {
  id: CharacterPresetId;
  name: string;
  tag: string;
  weaponLabel: string;
  initC: number; // centiseconds (100 = 1.00s)
  immuneToClearableBuffs: boolean;
  inputType: "UP" | "DOWN_Charge";
  summary: string;
  nikkeTopBugNote: string;
}

export const CHARACTER_PRESETS: readonly CharacterPreset[] = [
  {
    id: "vesti_tu",
    name: "贝斯蒂：战术升级",
    tag: "2.00s RL · C0=200",
    weaponLabel: "发射器 RL (2.00s / 8发)",
    initC: 200,
    immuneToClearableBuffs: false,
    inputType: "UP",
    summary:
      "第 1 发与第 5 发走基础 2.00s（60fps 下 122 帧）蓄力，吃满 T10 词条、魔方与队友蓄速拐；第 2～4 发受 1 技能「导弹引导」+100% 蓄速瞬发。",
    nikkeTopBugNote:
      "nikke.top 对战贝直接套 1s 词条取整再把减帧 ×2，导致丢失全部 2/6/10/14/18/22/26/30 帧档位，且在 4 黑底、单条 T1/T10 等处偏差 ±2 帧。",
  },
  {
    id: "liberalio",
    name: "莉贝雷里奥",
    tag: "1.50s SR · C0=150",
    weaponLabel: "狙击枪 SR (1.50s / 6发 · 自动击发)",
    initC: 150,
    immuneToClearableBuffs: true,
    inputType: "DOWN_Charge",
    summary:
      "PvP 全程 1.50s（60fps 下 92 帧）蓄力（2 技能缓流仅对莱彻生效）。2 技能免疫战中可驱散蓄速 Buff/Debuff，但 T10 词条与魔方不可驱散，100% 生效。",
    nikkeTopBugNote:
      "nikke.top 未实现 1.5s 公式，仅硬编码了 10%/18~20%/21~24% 三段补丁，其余全部退回 1s 减帧表，4 词条+魔方最高低估 8 帧（实际 -24 帧，误算 -16 帧）。",
  },
  {
    id: "standard_1s",
    name: "标准 1.00s 发射器/狙击枪",
    tag: "1.00s RL/SR · C0=100",
    weaponLabel: "常规 1.00s RL / SR（豺狼、桑迪、红莲暗影、海伦等）",
    initC: 100,
    immuneToClearableBuffs: false,
    inputType: "UP",
    summary:
      "常规 1.00s（60fps 下 62 帧）蓄力武器。每 1 厘秒恰好等于 1% 本质蓄速，同值词条先合并取整、不同值分别取整后相加。",
    nikkeTopBugNote:
      "nikke.top 对 1.00s 武器的减帧表与源码一致（仅弹窗把基础帧显示为 60 而非 62）。",
  },
  {
    id: "other_1_5s",
    name: "其他 1.50s 蓄力角色",
    tag: "1.50s · 可吃拐 · C0=150",
    weaponLabel: "爱丽丝、杨、安妮、尤妮、贝洛塔等",
    initC: 150,
    immuneToClearableBuffs: false,
    inputType: "UP",
    summary:
      "基础 1.50s（60fps 下 92 帧），无蓄速免疫，可同时享受 T10 词条、魔方与战中蓄速拐（如麦斯威尔、爱丽丝自身爆裂等）。",
    nikkeTopBugNote:
      "多数社区工具对 1.5s 角色仍套用 1s 查表，实际每条词条应按 ROUND(C0 × % × 同值条数) 即 ×1.5 计算。",
  },
  {
    id: "other_2s",
    name: "其他 2.00s 重型蓄力角色",
    tag: "2.00s · C0=200",
    weaponLabel: "白雪公主、哈兰等",
    initC: 200,
    immuneToClearableBuffs: false,
    inputType: "UP",
    summary:
      "基础 2.00s（60fps 下 122 帧），每 1% 蓄速带来 2 cs 缩减，按同值合并后 ROUND(200 × % × k) 计算。",
    nikkeTopBugNote: "与战贝相同，应按 ROUND(词条 × 2) 算减厘秒再换算 30Hz 逻辑帧。",
  },
  {
    id: "custom",
    name: "自定义基础蓄力时长",
    tag: "自定义 C0",
    weaponLabel: "自由输入基础厘秒 C0（如 120 = 1.20s）",
    initC: 120,
    immuneToClearableBuffs: false,
    inputType: "UP",
    summary: "适用于任何特殊蓄力时长武器或未来新角色，输入基础蓄力厘秒 C0 即可精确结算。",
    nikkeTopBugNote: "通用源码公式自动适配任意 C0，无需手写特判表。",
  },
] as const;

export const SLOT_NAMES = ["头盔", "胸甲", "护手", "腿甲"] as const;

/**
 * Exact C# NK.Spot.Util.CommonUtil.DoubleToLong(double n, int digit = 5)
 * Uses banker's rounding at 5th decimal digit (Math.Round(n, 5)), then adds ±0.5 and truncates toward zero.
 * For negative values (charge time reduction), this is exact Half-Up rounding on |n|.
 */
export function doubleToLong(n: number): number {
  const rounded5 = Math.round(n * 1e5) / 1e5;
  const shifted = rounded5 + (n > 0 ? 0.5 : -0.5);
  return Math.trunc(shifted);
}

/**
 * Exact 30Hz PvP logic ticks (SpotSimulationRunner 1f/30f -> SpotManagement.UpdateSpot 0.033f).
 * Verified 0-error against C# IEEE-754 float32 simulation for C in [1, 300].
 */
export function calcChargeLogicTicks(c: number): number {
  if (c <= 0) return 0;
  return Math.floor((c * 10) / 33) + 1;
}

/**
 * 60fps equivalent frames (2 frames per 30Hz logic tick).
 */
export function calcChargeFrames60(c: number): number {
  return calcChargeLogicTicks(c) * 2;
}

export function formatEffPct(dc: number, initC: number): string {
  const pct = (dc / initC) * 100;
  if (Number.isInteger(pct)) return `${pct}%`;
  const r1 = Math.round(pct * 10) / 10;
  if (Math.abs(pct - r1) < 1e-6) return `${r1}%`;
  return `${pct.toFixed(2)}%`;
}

export interface GroupedEntry {
  key: string;
  source: string;
  bp: number;
  count: number;
  rawPctSum: number;
  rawDeltaCs: number;
  roundedCs: number;
  effPctStr: string;
  kind: "gear" | "cube" | "ally_user";
}

export interface LoadoutInput {
  initC: number;
  gearBps: [number, number, number, number];
  cubeBp: number;
  allyUserBp: number;
  allyUserCasterC: number;
  allyTargetBp: number;
  immuneToClearableBuffs: boolean;
}

export interface LoadoutResult {
  initC: number;
  finalC: number;
  totalReducedCs: number;
  panelGearCubePct: number;
  effSpeedPct: number;
  effSpeedStr: string;
  baseLogicTicks: number;
  actualLogicTicks: number;
  baseFrames60: number;
  actualFrames60: number;
  savedFrames60: number;
  baseTimeSec: number;
  actualTimeSec: number;
  savedTimeSec: number;
  groups: GroupedEntry[];
  // Progress to next breakpoint (-2f)
  nextBreakpoint: {
    reachable: boolean;
    nextFrames60: number;
    nextSavedFrames60: number;
    neededDc: number;
    diffDc: number;
    neededEffPctStr: string;
    diffEffPctStr: string;
    progressInTier: number; // 0..1 within current frame bucket
  };
  // Comparison with naive sum-all-then-round
  naive: {
    reducedCs: number;
    effSpeedStr: string;
    frames60: number;
    savedFrames60: number;
  };
  // Comparison with nikke.top's formula (for presets where applicable)
  nikkeTop: {
    effective1sInt: number;
    savedFrames60: number;
    diffVsTrueFrames60: number; // nikkeTop - true
  };
}

// Replica of nikke.top's exact _t lookup table and ne/la/ja functions
const NIKKE_TOP_TABLE: Record<number, number> = {
  0: 0, 1: 0, 2: 2, 3: 2, 4: 2, 5: 4, 6: 4, 7: 4, 8: 6, 9: 6, 10: 6,
  11: 8, 12: 8, 13: 8, 14: 8, 15: 10, 16: 10, 17: 10, 18: 12, 19: 12, 20: 12,
  21: 14, 22: 14, 23: 14, 24: 14, 25: 16, 26: 16, 27: 16, 28: 18, 29: 18, 30: 18,
  31: 20, 32: 20, 33: 20, 34: 20, 35: 22, 36: 22, 37: 22, 38: 24, 39: 24, 40: 24,
  41: 26, 42: 26, 43: 26, 44: 28, 45: 28, 46: 28,
};

export function simulateNikkeTopSavedFrames(
  presetId: CharacterPresetId,
  gearBps: readonly number[],
  cubeBp: number
): { effective1sInt: number; savedFrames60: number } {
  const vals = [...gearBps, cubeBp].filter((x) => x > 0).map((x) => x / 100);
  const map = new Map<number, number>();
  for (const v of vals) {
    map.set(v, (map.get(v) ?? 0) + v);
  }
  const effective1sInt = Array.from(map.values())
    .map((v) => Math.round(v))
    .reduce((a, b) => a + b, 0);

  const ne = (x: number) => NIKKE_TOP_TABLE[Math.max(0, Math.min(46, Math.floor(x)))] ?? 0;

  if (presetId === "vesti_tu") {
    return { effective1sInt, savedFrames60: ne(effective1sInt) * 2 };
  }
  if (presetId === "liberalio") {
    const la = (x: number) =>
      x === 10 ? 8 : x >= 18 && x <= 20 ? 14 : x >= 21 && x <= 24 ? 16 : ne(x);
    return { effective1sInt, savedFrames60: la(effective1sInt) };
  }
  return { effective1sInt, savedFrames60: ne(effective1sInt) };
}

export function evaluateLoadout(
  input: LoadoutInput,
  presetId: CharacterPresetId = "standard_1s"
): LoadoutResult {
  const initC = Math.max(1, Math.round(input.initC));
  const counts = new Map<number, number>();
  for (const bp of input.gearBps) {
    if (bp > 0) counts.set(bp, (counts.get(bp) ?? 0) + 1);
  }

  const groups: GroupedEntry[] = [];
  let sumNum = 0;

  for (const bp of Array.from(counts.keys()).sort((a, b) => b - a)) {
    const count = counts.get(bp)!;
    const rawDelta = initC * -bp * count * 0.0001;
    const rounded = doubleToLong(rawDelta);
    const roundedCs = -rounded;
    sumNum += rounded;
    groups.push({
      key: `gear-${bp}`,
      source: `T10 ${(bp / 100).toFixed(2)}% × ${count}`,
      bp,
      count,
      rawPctSum: (bp * count) / 100,
      rawDeltaCs: -rawDelta,
      roundedCs,
      effPctStr: formatEffPct(roundedCs, initC),
      kind: "gear",
    });
  }

  if (input.cubeBp > 0) {
    const rawDelta = initC * -input.cubeBp * 0.0001;
    const rounded = doubleToLong(rawDelta);
    const roundedCs = -rounded;
    sumNum += rounded;
    groups.push({
      key: `cube-${input.cubeBp}`,
      source: `蓄速魔方 ${(input.cubeBp / 100).toFixed(2)}%`,
      bp: input.cubeBp,
      count: 1,
      rawPctSum: input.cubeBp / 100,
      rawDeltaCs: -rawDelta,
      roundedCs,
      effPctStr: formatEffPct(roundedCs, initC),
      kind: "cube",
    });
  }

  const effAllyUserBp = input.immuneToClearableBuffs ? 0 : input.allyUserBp;
  const effAllyTargetBp = input.immuneToClearableBuffs ? 0 : input.allyTargetBp;

  if (effAllyUserBp > 0) {
    const casterC = Math.max(1, Math.round(input.allyUserCasterC));
    const rawDelta = casterC * -effAllyUserBp * 0.0001;
    const rounded = doubleToLong(rawDelta);
    const roundedCs = -rounded;
    sumNum += rounded;
    groups.push({
      key: `ally-user-${effAllyUserBp}-${casterC}`,
      source: `队友拐 [施法者基准] ${(effAllyUserBp / 100).toFixed(2)}% (C=${casterC})`,
      bp: effAllyUserBp,
      count: 1,
      rawPctSum: (effAllyUserBp * casterC) / (100 * initC),
      rawDeltaCs: -rawDelta,
      roundedCs,
      effPctStr: formatEffPct(roundedCs, initC),
      kind: "ally_user",
    });
  }

  const num2 = -effAllyTargetBp;
  const finalCRaw = doubleToLong(initC + sumNum + initC * num2 * 0.0001);
  const finalC = Math.max(0, finalCRaw);
  const totalReducedCs = initC - finalCRaw;

  const baseLogicTicks = calcChargeLogicTicks(initC);
  const actualLogicTicks = calcChargeLogicTicks(finalCRaw);
  const baseFrames60 = baseLogicTicks * 2;
  const actualFrames60 = actualLogicTicks * 2;
  const savedFrames60 = baseFrames60 - actualFrames60;

  // Next breakpoint calculation
  let nextBreakpoint: LoadoutResult["nextBreakpoint"];
  if (actualLogicTicks === 0) {
    nextBreakpoint = {
      reachable: false,
      nextFrames60: 0,
      nextSavedFrames60: savedFrames60,
      neededDc: initC,
      diffDc: 0,
      neededEffPctStr: "100%",
      diffEffPctStr: "0%",
      progressInTier: 1,
    };
  } else {
    const curMinC = Math.floor((33 * (actualLogicTicks - 1)) / 10) + (actualLogicTicks > 1 ? 0 : 1);
    const nextMaxC =
      actualLogicTicks === 1 ? 0 : Math.floor((33 * (actualLogicTicks - 1) - 1) / 10);
    const neededDc = initC - nextMaxC;
    const diffDc = Math.max(0, neededDc - totalReducedCs);

    // Compute current tier min dC to display bar progress cleanly
    const curMaxC = Math.min(initC, Math.floor((33 * actualLogicTicks - 1) / 10));
    const curMinDc = Math.max(0, initC - curMaxC);
    const span = Math.max(1, neededDc - curMinDc);
    const progressInTier = Math.max(0, Math.min(1, (totalReducedCs - curMinDc) / span));
    void curMinC;

    nextBreakpoint = {
      reachable: true,
      nextFrames60: actualFrames60 - 2,
      nextSavedFrames60: savedFrames60 + 2,
      neededDc,
      diffDc,
      neededEffPctStr: formatEffPct(neededDc, initC),
      diffEffPctStr: formatEffPct(diffDc, initC),
      progressInTier,
    };
  }

  // Naive comparison (directly summing gear + cube % then rounding once)
  const totalGearCubeBp = input.gearBps.reduce((a, b) => a + b, 0) + input.cubeBp;
  const naiveReducedCs = -doubleToLong(initC * -totalGearCubeBp * 0.0001);
  const naiveFrames60 = calcChargeFrames60(initC - naiveReducedCs);

  // nikke.top comparison
  const nt = simulateNikkeTopSavedFrames(presetId, input.gearBps, input.cubeBp);

  return {
    initC,
    finalC,
    totalReducedCs,
    panelGearCubePct: totalGearCubeBp / 100,
    effSpeedPct: (totalReducedCs / initC) * 100,
    effSpeedStr: formatEffPct(totalReducedCs, initC),
    baseLogicTicks,
    actualLogicTicks,
    baseFrames60,
    actualFrames60,
    savedFrames60,
    baseTimeSec: baseLogicTicks * 0.033,
    actualTimeSec: actualLogicTicks * 0.033,
    savedTimeSec: (baseLogicTicks - actualLogicTicks) * 0.033,
    groups,
    nextBreakpoint,
    naive: {
      reducedCs: naiveReducedCs,
      effSpeedStr: formatEffPct(naiveReducedCs, initC),
      frames60: naiveFrames60,
      savedFrames60: baseFrames60 - naiveFrames60,
    },
    nikkeTop: {
      effective1sInt: nt.effective1sInt,
      savedFrames60: nt.savedFrames60,
      diffVsTrueFrames60: nt.savedFrames60 - savedFrames60,
    },
  };
}

export interface BreakpointRow {
  savedFrames60: number;
  frames60: number;
  minDc: number;
  maxDc: number;
  minC: number;
  maxC: number;
  effPctRange: string;
  effPctMin: string;
  timeSec: string;
  reachability: "base" | "gear" | "cube" | "ally";
  reachabilityLabel: string;
}

export function buildBreakpointTable(
  initC: number,
  immuneToClearableBuffs: boolean
): BreakpointRow[] {
  const baseFrames60 = calcChargeFrames60(initC);
  const maxEquipDc = -doubleToLong(initC * -609 * 4 * 0.0001);
  const maxCubeDc = -doubleToLong(initC * -212 * 0.0001);
  const maxEquipPlusCube = maxEquipDc + maxCubeDc;

  const map = new Map<number, { minDc: number; maxDc: number }>();
  const upperDc = Math.min(
    initC,
    immuneToClearableBuffs ? maxEquipPlusCube : maxEquipPlusCube + Math.round(initC * 0.1)
  );

  for (let dc = 0; dc <= upperDc; dc++) {
    const f60 = calcChargeFrames60(initC - dc);
    const saved60 = baseFrames60 - f60;
    const cur = map.get(saved60);
    if (!cur) map.set(saved60, { minDc: dc, maxDc: dc });
    else cur.maxDc = dc;
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([saved60, range]) => {
      const f60 = baseFrames60 - saved60;
      let reachability: BreakpointRow["reachability"] = "gear";
      let reachabilityLabel = "4 词条内可达";
      if (range.minDc === 0) {
        reachability = "base";
        reachabilityLabel = "零蓄速基础";
      } else if (range.minDc > maxEquipPlusCube) {
        reachability = "ally";
        reachabilityLabel = "需队友蓄速拐";
      } else if (range.minDc > maxEquipDc) {
        reachability = "cube";
        reachabilityLabel = "需配蓄速魔方";
      }

      const minPct = formatEffPct(range.minDc, initC);
      const maxPct = formatEffPct(range.maxDc, initC);

      return {
        savedFrames60: saved60,
        frames60: f60,
        minDc: range.minDc,
        maxDc: range.maxDc,
        minC: initC - range.maxDc,
        maxC: initC - range.minDc,
        effPctMin: minPct,
        effPctRange: range.minDc === range.maxDc ? minPct : `${minPct} ~ ${maxPct}`,
        timeSec: `${((f60 / 2) * 0.033).toFixed(3)}s`,
        reachability,
        reachabilityLabel,
      };
    });
}

export interface RerollSlotRecommendation {
  slotIndex: number;
  slotName: string;
  currentBp: number;
  currentTier: number;
  qualifyingTiers: {
    tier: number;
    bp: number;
    frameGain60: number; // positive means faster by N frames (e.g. +2, +4)
    newFrames60: number;
    newDc: number;
    newEffPctStr: string;
    isDowngradeGain: boolean;
  }[];
  minTierToImprove: number | null;
  minBpToImprove: number | null;
  bestFrameGain60: number;
  hitProbabilityPct: number; // probability among 15 tiers of hitting a tier that improves frames
  hasDowngradeGain: boolean;
}

export interface RerollTrap {
  slotIndex: number;
  slotName: string;
  fromTier: number;
  fromBp: number;
  toTier: number;
  toBp: number;
  dcDiff: number; // negative!
  frameLoss60: number; // positive means SLOWER by N frames!
}

export interface RerollAnalysis {
  cubeUpgradeAdvice: {
    canBreakWithLv7Cube: boolean;
    frameGain60: number;
    newFrames60: number;
    newDc: number;
    newEffPctStr: string;
  } | null;
  slotRecommendations: RerollSlotRecommendation[];
  downgradeAnomalies: {
    slotIndex: number;
    slotName: string;
    fromTier: number;
    fromBp: number;
    toTier: number;
    toBp: number;
    frameGain60: number;
    newDc: number;
    newEffPctStr: string;
  }[];
  upgradeTraps: RerollTrap[];
}

export function analyzeRerollOptions(
  input: LoadoutInput,
  presetId: CharacterPresetId
): RerollAnalysis {
  const current = evaluateLoadout(input, presetId);

  // Check if switching/upgrading to Lv7 Adjutant Cube (2.12%) breaks next tier
  let cubeUpgradeAdvice: RerollAnalysis["cubeUpgradeAdvice"] = null;
  if (input.cubeBp < 212) {
    const withLv7 = evaluateLoadout({ ...input, cubeBp: 212 }, presetId);
    const gain = current.actualFrames60 - withLv7.actualFrames60;
    cubeUpgradeAdvice = {
      canBreakWithLv7Cube: gain > 0,
      frameGain60: gain,
      newFrames60: withLv7.actualFrames60,
      newDc: withLv7.totalReducedCs,
      newEffPctStr: withLv7.effSpeedStr,
    };
  }

  const slotRecommendations: RerollSlotRecommendation[] = [];
  const downgradeAnomalies: RerollAnalysis["downgradeAnomalies"] = [];
  const upgradeTraps: RerollTrap[] = [];

  for (let slotIndex = 0; slotIndex < 4; slotIndex++) {
    const currentBp = input.gearBps[slotIndex];
    const currentTierObj = T10_TIERS.find((t) => t.bp === currentBp) ?? T10_TIERS[0];
    const qualifyingTiers: RerollSlotRecommendation["qualifyingTiers"] = [];
    let hitProb = 0;
    let bestGain = 0;

    for (const candidate of T10_TIERS.slice(1)) {
      if (candidate.bp === currentBp) continue;
      const nextBps: [number, number, number, number] = [...input.gearBps];
      nextBps[slotIndex] = candidate.bp;
      const nextEval = evaluateLoadout({ ...input, gearBps: nextBps }, presetId);
      const frameGain = current.actualFrames60 - nextEval.actualFrames60;

      if (frameGain > 0) {
        const isDowngradeGain = candidate.bp < currentBp;
        qualifyingTiers.push({
          tier: candidate.tier,
          bp: candidate.bp,
          frameGain60: frameGain,
          newFrames60: nextEval.actualFrames60,
          newDc: nextEval.totalReducedCs,
          newEffPctStr: nextEval.effSpeedStr,
          isDowngradeGain,
        });
        hitProb += candidate.rollWeightPct;
        if (frameGain > bestGain) bestGain = frameGain;

        if (isDowngradeGain) {
          downgradeAnomalies.push({
            slotIndex,
            slotName: SLOT_NAMES[slotIndex],
            fromTier: currentTierObj.tier,
            fromBp: currentBp,
            toTier: candidate.tier,
            toBp: candidate.bp,
            frameGain60: frameGain,
            newDc: nextEval.totalReducedCs,
            newEffPctStr: nextEval.effSpeedStr,
          });
        }
      } else if (
        candidate.bp > currentBp &&
        (nextEval.totalReducedCs < current.totalReducedCs || frameGain < 0)
      ) {
        upgradeTraps.push({
          slotIndex,
          slotName: SLOT_NAMES[slotIndex],
          fromTier: currentTierObj.tier,
          fromBp: currentBp,
          toTier: candidate.tier,
          toBp: candidate.bp,
          dcDiff: nextEval.totalReducedCs - current.totalReducedCs,
          frameLoss60: Math.max(0, -frameGain),
        });
      }
    }

    const sortedByTier = [...qualifyingTiers].sort((a, b) => a.tier - b.tier);
    const first = sortedByTier[0] ?? null;

    slotRecommendations.push({
      slotIndex,
      slotName: SLOT_NAMES[slotIndex],
      currentBp,
      currentTier: currentTierObj.tier,
      qualifyingTiers: sortedByTier,
      minTierToImprove: first ? first.tier : null,
      minBpToImprove: first ? first.bp : null,
      bestFrameGain60: bestGain,
      hitProbabilityPct: hitProb,
      hasDowngradeGain: qualifyingTiers.some((q) => q.isDowngradeGain),
    });
  }

  return {
    cubeUpgradeAdvice,
    slotRecommendations,
    downgradeAnomalies,
    upgradeTraps,
  };
}
