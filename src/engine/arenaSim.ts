import { evaluateLoadout } from "./chargeCalc";
import { findRosterChar, RosterCharacter, WeaponType } from "./roster";

export type ServerRegion = "cn" | "global";
export type ArenaMode = "normal_special" | "champion";
export type SideType = "attacker" | "defender";

export type CubeKind = "none" | "adjutant" | "quantum";

export interface UniversalCustomEvent {
  frame: number;
  charge: number;
}

export interface SlotConfig {
  charId: string | null;
  chargeSpeedMode: "per_gear" | "direct_total";
  gearBps: [number, number, number, number];
  directTotalPct: number; // 0..24 integer or float when direct_total mode
  cubeKind: CubeKind;
  cubeBp: number; // adjutant: 106/159/212; quantum: 233/350/466
  redHoodPierce: 0 | 1 | 2;
  jackalLinkCount: 2 | 3; // number of linked allies receiving hits (default 3 = Jackal + 2 highest ATK)
  scarletCounterEnabled: boolean;
  universalEvents: UniversalCustomEvent[];
}

export function createEmptySlot(charId: string | null = null): SlotConfig {
  return {
    charId,
    chargeSpeedMode: "per_gear",
    gearBps: [0, 0, 0, 0],
    directTotalPct: 0,
    cubeKind: "none",
    cubeBp: 0,
    redHoodPierce: 0,
    jackalLinkCount: 3,
    scarletCounterEnabled: false,
    universalEvents: [
      { frame: 74, charge: 12 },
      { frame: 148, charge: 12 },
    ],
  };
}

export interface ChargeHitEvent {
  id: string;
  frame: number; // 60fps frame
  timeSec: number;
  side: SideType;
  slotIndex: number; // 0..4 (P1..P5)
  charId: string;
  charName: string;
  weapon: WeaponType;
  chargeGain: number;
  targetSlots: number[]; // enemy slot indices 0..4 hit by this attack (for Jackal/Scarlet reflection)
  hitUnits: number; // total hits registered on enemy targets (including cover)
  label: string;
  isCounter?: boolean;
}

export interface TeamSimSummary {
  side: SideType;
  events: ChargeHitEvent[];
  cumulativeByFrame: number[]; // length = maxFrame + 1, cumulative charge at each 60fps frame
  fullChargeFrame: number | null; // first frame reaching >= 100%
  fullChargeTimeSec: number | null;
  rlRating: string;
  burst1Frame: number | null;
  burst2Frame: number | null;
  burst3Frame: number | null;
  slotStats: {
    slotIndex: number;
    charId: string;
    charName: string;
    totalCharge: number;
    effSpeedStr: string;
    savedFrames60: number;
    actualChargeFrames60: number;
  }[];
}

export interface ArenaSimResult {
  maxFrame: number;
  attacker: TeamSimSummary;
  defender: TeamSimSummary;
  winnerSide: SideType | "tie" | null;
  leadFrames60: number;
}

/**
 * Compute RL projectile travel time in 60fps frames based on server, arena mode, side, slot, and projectile class.
 * Based on empirical PvP projectile flight time measurements (0.200s=12f, 0.233s=14f, 0.267s=16f, Laplace=6f/4f).
 */
export function getProjectileFlightFrames60(
  char: RosterCharacter,
  side: SideType,
  slotIndex: number, // 0=P1 .. 4=P5
  server: ServerRegion,
  arenaMode: ArenaMode
): number {
  if (char.weapon !== "RL") return 0;

  if (char.special === "laplace" || char.special === "laplace_t") {
    return server === "cn" && slotIndex === 4 ? 4 : 6;
  }

  if (char.fastProjectile) {
    // Fast/rapid RL (Vesti TU, Centi, etc.)
    if (arenaMode === "champion") {
      if (side === "attacker") return slotIndex <= 2 ? 14 : 12;
      return slotIndex <= 1 ? 14 : 12;
    } else {
      if (side === "attacker") {
        if (slotIndex === 4 && server === "cn") return 10;
        return slotIndex <= 1 ? 14 : 12;
      } else {
        if (slotIndex === 4 && server === "cn") return 10;
        return slotIndex <= 1 ? 14 : 12;
      }
    }
  }

  // Standard RL
  if (arenaMode === "champion") {
    if (side === "attacker") return slotIndex <= 2 ? 16 : 14;
    return slotIndex <= 2 ? 16 : 14;
  } else {
    if (side === "attacker") {
      if (slotIndex === 4) return server === "cn" ? 12 : 14;
      return 16;
    } else {
      if (slotIndex === 4) return 12;
      if (slotIndex >= 2) return 14;
      return 16;
    }
  }
}

/**
 * Evaluate effective charge speed & 60fps frame reduction for a single Arena slot
 * using our decompiled NK.Runtime engine (exact FunctionStandardType.User grouping + 0.033f logic ticks).
 */
export function evaluateSlotChargeSpeed(char: RosterCharacter, slot: SlotConfig) {
  if (char.initC <= 0) {
    return {
      effSpeedStr: "—",
      savedFrames60: 0,
      actualChargeFrames60: char.attackInterval60,
      totalReducedCs: 0,
    };
  }

  const adjCubeBp = slot.cubeKind === "adjutant" ? slot.cubeBp : 0;

  if (slot.chargeSpeedMode === "direct_total") {
    // Direct total mode: treat entered % as target effective % on C0 (rounded to cs) + independent cube
    const enteredBp = Math.max(0, Math.min(3500, Math.round(slot.directTotalPct * 100)));
    const res = evaluateLoadout(
      {
        initC: char.initC,
        gearBps: [enteredBp, 0, 0, 0],
        cubeBp: adjCubeBp,
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
    );
    return {
      effSpeedStr: res.effSpeedStr,
      savedFrames60: res.savedFrames60,
      actualChargeFrames60: res.actualFrames60,
      totalReducedCs: res.totalReducedCs,
    };
  }

  const res = evaluateLoadout(
    {
      initC: char.initC,
      gearBps: slot.gearBps,
      cubeBp: adjCubeBp,
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
  );

  return {
    effSpeedStr: res.effSpeedStr,
    savedFrames60: res.savedFrames60,
    actualChargeFrames60: res.actualFrames60,
    totalReducedCs: res.totalReducedCs,
  };
}

function getTargetSlotsForWeapon(
  char: RosterCharacter,
  enemyAliveIndices: number[]
): number[] {
  if (enemyAliveIndices.length === 0) return [0];
  if (char.weapon === "SR") {
    // SR targets furthest slot (P5 -> P1) or P1 depending on arena targeting; typically P5
    const last = enemyAliveIndices[enemyAliveIndices.length - 1];
    return [last];
  }
  const primary = enemyAliveIndices[0];
  if (char.weapon === "RL") {
    if (char.splashTargets >= 3) {
      return enemyAliveIndices.filter((idx) => Math.abs(idx - primary) <= 2);
    }
    if (char.splashTargets === 2) {
      return enemyAliveIndices.filter((idx) => Math.abs(idx - primary) <= 1);
    }
    return [primary];
  }
  return [primary];
}

function generateCharAttackEvents(
  char: RosterCharacter,
  slot: SlotConfig,
  slotIndex: number,
  side: SideType,
  enemyAliveIndices: number[],
  server: ServerRegion,
  arenaMode: ArenaMode,
  maxFrame: number
): ChargeHitEvent[] {
  const events: ChargeHitEvent[] = [];
  const quantumMult = slot.cubeKind === "quantum" ? 1 + slot.cubeBp / 10000 : 1;
  const turnaround60 = server === "cn" ? 16 : 14;
  const flight60 = getProjectileFlightFrames60(char, side, slotIndex, server, arenaMode);
  const cs = evaluateSlotChargeSpeed(char, slot);
  const targets = getTargetSlotsForWeapon(char, enemyAliveIndices);

  const pushEvt = (
    frame: number,
    chargeGain: number,
    hitUnits: number,
    label: string,
    targetOverride?: number[]
  ) => {
    if (frame <= 0 || frame > maxFrame) return;
    events.push({
      id: `${side}-${slotIndex}-${frame}-${events.length}`,
      frame,
      timeSec: Number(((frame / 2) * 0.033).toFixed(3)),
      side,
      slotIndex,
      charId: char.id,
      charName: char.name,
      weapon: char.weapon,
      chargeGain: Number(chargeGain.toFixed(4)),
      targetSlots: targetOverride ?? targets,
      hitUnits,
      label,
    });
  };

  // 1. Universal Custom Nikke
  if (char.special === "universal") {
    for (const ue of slot.universalEvents) {
      if (ue.frame >= 1 && ue.frame <= maxFrame && ue.charge !== 0) {
        pushEvt(ue.frame, ue.charge * quantumMult, 1, "自定义充能");
      }
    }
    return events;
  }

  // 2. Vesti: Tactical Upgrade (2.00s RL, EXACT C0=200 formula!)
  if (char.special === "vesti_tu") {
    // First shot charges (122 - savedFrames60), then Missile Guide gives 3 instant missiles spaced 22f apart
    // After 4 missiles, starts next 2.00s charge cycle (or reloads after 8 missiles)
    const firstCharge = Math.max(2, 122 - cs.savedFrames60);
    const rapidGap = 22;
    const targetCount = Math.max(1, targets.length);
    // Each target hit registers body + cover (~2 units * 2 = 4 per target? Wait: nikke.top & empirical = 0.65 * 4 * 3 = 7.8% per missile)
    const perMissileCharge = 0.65 * 4 * targetCount * quantumMult;
    let cycleStart = 0;
    let totalShots = 0;

    while (cycleStart <= maxFrame) {
      const fire1 = cycleStart + firstCharge;
      if (fire1 > maxFrame) break;
      for (let m = 0; m < 4; m++) {
        const hitFrame = fire1 + m * rapidGap + flight60;
        if (hitFrame > maxFrame) break;
        totalShots++;
        pushEvt(
          hitFrame,
          perMissileCharge,
          targetCount * 2,
          m === 0 ? `第${totalShots}发 (2.0s全蓄)` : `第${totalShots}发 (导弹引导瞬发)`
        );
      }
      cycleStart = fire1 + 3 * rapidGap + (totalShots % 8 === 0 ? char.reloadFrames60 : 0);
    }
    return events;
  }

  // 3. Liberalio (1.50s DOWN_Charge SR, EXACT C0=150 formula + S1 5 extra hits!)
  if (char.special === "liberalio") {
    // Consecutive cycle strictly equals (92 - savedFrames60) frames; no turnaround hide/re-aim!
    const cycleFrames = Math.max(2, 92 - cs.savedFrames60);
    const hitCharge = 2.8 * quantumMult;
    let shotNum = 0;
    let t = 0;
    while (t <= maxFrame) {
      const fireFrame = t + cycleFrames;
      if (fireFrame > maxFrame) break;
      shotNum++;
      // Main full-charge shot hit
      pushEvt(fireFrame, hitCharge, 1, `第${shotNum}枪主命中`);
      // Skill 1: 5 additional damage hits over ~0.333s (4f each -> +4,+8,+12,+16,+20f)
      for (let extra = 1; extra <= 5; extra++) {
        pushEvt(fireFrame + extra * 4, hitCharge, 1, `第${shotNum}枪追伤#${extra}`);
      }
      t = fireFrame + (shotNum % char.magSize === 0 ? char.reloadFrames60 : 0);
    }
    return events;
  }

  // 4. A2 (wide 3-target RL with long swing recovery)
  if (char.special === "a2") {
    const chargeDur = Math.max(2, 60 - cs.savedFrames60);
    const swingRecovery = 44;
    const targetCount = Math.max(1, targets.length);
    const shotCharge = char.baseChargeRate * 2 * targetCount * quantumMult;
    let fireFrame = chargeDur + 28; // initial windup
    let shot = 0;
    while (fireFrame <= maxFrame) {
      shot++;
      pushEvt(fireFrame, shotCharge, targetCount * 2, `第${shot}次挥砍`);
      fireFrame += chargeDur + swingRecovery;
    }
    return events;
  }

  // 5. Cinderella (1.00s RL, single target + multi-hit glass slippers)
  if (char.special === "cinderella") {
    const chargeDur = Math.max(2, 60 - cs.savedFrames60);
    const perShotCharge = char.baseChargeRate * char.hitsPerShot * quantumMult;
    let fireFrame = chargeDur;
    let shot = 0;
    while (fireFrame <= maxFrame) {
      shot++;
      pushEvt(fireFrame + flight60, perShotCharge, 4, `第${shot}发玻璃鞋`);
      fireFrame += turnaround60 + chargeDur;
    }
    return events;
  }

  // 6. Standard RL & SR (InputType.UP: 1.00s / 1.50s / 2.00s)
  if (char.weapon === "RL" || char.weapon === "SR") {
    // Timestamp delta from start-of-charge to shot fire:
    // For C0=100: 60f (1.000s); C0=150: 90f; C0=200: 120f -> minus exact savedFrames60!
    const baseDelta60 = Math.round((char.initC / 100) * 60);
    const chargeDur = Math.max(2, baseDelta60 - cs.savedFrames60);
    const targetCount = Math.max(1, targets.length);

    let perShotCharge: number;
    let hitUnits: number;
    if (char.weapon === "RL") {
      // RL hits body + cover for each target in splash radius
      hitUnits = targetCount * 2;
      perShotCharge = char.baseChargeRate * hitUnits * quantumMult;
    } else {
      const pierceBonus = char.special === "red_hood" ? slot.redHoodPierce : 0;
      hitUnits = 1 + pierceBonus;
      perShotCharge = char.baseChargeRate * hitUnits * quantumMult;
    }

    let fireFrame = chargeDur;
    let shot = 0;
    while (fireFrame <= maxFrame) {
      shot++;
      const hitFrame = fireFrame + flight60;
      pushEvt(
        hitFrame,
        perShotCharge,
        hitUnits,
        char.weapon === "RL"
          ? `第${shot}发 (命中${targetCount}人)`
          : `第${shot}枪${char.special === "red_hood" && slot.redHoodPierce > 0 ? ` (+${slot.redHoodPierce}穿透)` : ""}`
      );
      if (shot % char.magSize === 0) {
        fireFrame += char.reloadFrames60 + chargeDur;
      } else {
        fireFrame += turnaround60 + chargeDur;
      }
    }
    return events;
  }

  // 7. MG (spin-up ramp curve matching empirical 2.100s full speed)
  if (char.weapon === "MG") {
    const rampSteps = [24, 14, 12, 8, 8, 6, 6, 6];
    const midSteps = 9;
    let frame = 6;
    let shot = 0;
    const perBullet = char.baseChargeRate * quantumMult;
    while (frame <= maxFrame) {
      pushEvt(frame, perBullet, 1, `MG #${shot + 1}`);
      const step = shot < rampSteps.length ? rampSteps[shot] : shot < rampSteps.length + midSteps ? 4 : 2;
      frame += step;
      shot++;
    }
    return events;
  }

  // 8. SG / AR / SMG
  const interval = Math.max(2, char.attackInterval60);
  const firstShotFrame = char.weapon === "SG" ? 6 : 6;
  const perShot = char.baseChargeRate * char.hitsPerShot * quantumMult;
  let frame = firstShotFrame;
  let shot = 0;
  while (frame <= maxFrame) {
    shot++;
    pushEvt(
      frame,
      perShot,
      char.weapon === "SG" ? char.hitsPerShot : 1,
      `${char.weapon} 第${shot}发`
    );
    if (shot % char.magSize === 0) {
      frame += char.reloadFrames60;
    } else {
      frame += interval;
    }
  }
  return events;
}

function addJackalAndScarletCounters(
  receivingSide: SideType,
  receivingSlots: readonly SlotConfig[],
  incomingEnemyEvents: readonly ChargeHitEvent[],
  maxFrame: number
): ChargeHitEvent[] {
  const counterEvents: ChargeHitEvent[] = [];

  // Find Jackal on receiving side
  const jackalIdx = receivingSlots.findIndex((s) => s.charId === "jackal");
  if (jackalIdx !== -1) {
    const jackalSlot = receivingSlots[jackalIdx];
    const quantumMult = jackalSlot.cubeKind === "quantum" ? 1 + jackalSlot.cubeBp / 10000 : 1;
    // Linked positions: Jackal itself + P1 (index 0) + P5/P2 up to jackalLinkCount
    const activeIndices = receivingSlots
      .map((s, i) => (s.charId ? i : -1))
      .filter((i) => i >= 0);
    const linkedSet = new Set<number>([jackalIdx]);
    for (const idx of [0, 4, 1, 2, 3]) {
      if (linkedSet.size >= jackalSlot.jackalLinkCount) break;
      if (activeIndices.includes(idx)) linkedSet.add(idx);
    }

    const sortedIncoming = [...incomingEnemyEvents].sort((a, b) => a.frame - b.frame);
    let accHits = 0;
    for (const evt of sortedIncoming) {
      // Count hits on any linked unit
      let matched = 0;
      for (const t of evt.targetSlots) {
        if (linkedSet.has(t)) {
          // For SG/AR/SMG/MG, hitUnits reflects pellets/bullets; for RL splash, distribute per target
          matched +=
            evt.weapon === "RL"
              ? Math.max(1, Math.round(evt.hitUnits / Math.max(1, evt.targetSlots.length)))
              : evt.hitUnits;
        }
      }
      if (matched > 0) {
        const prev = accHits;
        accHits += matched;
        const triggers = Math.floor(accHits / 10) - Math.floor(prev / 10);
        if (triggers > 0 && evt.frame <= maxFrame) {
          counterEvents.push({
            id: `${receivingSide}-jackal-counter-${evt.frame}-${counterEvents.length}`,
            frame: evt.frame,
            timeSec: Number(((evt.frame / 2) * 0.033).toFixed(3)),
            side: receivingSide,
            slotIndex: jackalIdx,
            charId: "jackal",
            charName: "豺狼",
            weapon: "RL",
            chargeGain: Number((3.55 * triggers * quantumMult).toFixed(4)),
            targetSlots: [],
            hitUnits: triggers,
            label: `豺狼受击反充 (×${triggers})`,
            isCounter: true,
          });
        }
      }
    }
  }

  // Optional Scarlet counterattack (expected 30% trigger on hits to Scarlet)
  const scarletIdx = receivingSlots.findIndex(
    (s) => s.charId === "scarlet" && s.scarletCounterEnabled
  );
  if (scarletIdx !== -1) {
    const sSlot = receivingSlots[scarletIdx];
    const quantumMult = sSlot.cubeKind === "quantum" ? 1 + sSlot.cubeBp / 10000 : 1;
    let counterAcc = 0;
    for (const evt of incomingEnemyEvents) {
      if (evt.targetSlots.includes(scarletIdx)) {
        counterAcc += 0.3;
        if (counterAcc >= 1) {
          const n = Math.floor(counterAcc);
          counterAcc -= n;
          counterEvents.push({
            id: `${receivingSide}-scarlet-counter-${evt.frame}-${counterEvents.length}`,
            frame: evt.frame,
            timeSec: Number(((evt.frame / 2) * 0.033).toFixed(3)),
            side: receivingSide,
            slotIndex: scarletIdx,
            charId: "scarlet",
            charName: "红莲",
            weapon: "AR",
            chargeGain: Number((1.2 * n * quantumMult).toFixed(4)),
            targetSlots: [],
            hitUnits: n,
            label: `红莲反伤充能 (期望×${n})`,
            isCounter: true,
          });
        }
      }
    }
  }

  return counterEvents;
}

function classifyRlSpeed(frame: number | null, server: ServerRegion): string {
  if (frame === null) return "未满充 (>5s)";
  const rl1 = 76;
  const rl2 = server === "cn" ? 152 : 150;
  const rl3 = server === "cn" ? 228 : 224;
  const rl4 = server === "cn" ? 304 : 298;
  if (frame <= rl1) return "1RL";
  if (frame <= rl2) return frame <= rl2 - 14 ? "1.5RL" : "2RL";
  if (frame <= rl3) return frame <= rl3 - 26 ? "2.5RL" : "3RL";
  if (frame <= rl4) return frame <= rl4 - 26 ? "3.5RL" : "4RL";
  return "4.5RL+";
}

function summarizeTeam(
  side: SideType,
  slots: readonly SlotConfig[],
  allEvents: ChargeHitEvent[],
  maxFrame: number,
  server: ServerRegion,
  arenaMode: ArenaMode
): TeamSimSummary {
  const sorted = [...allEvents].sort((a, b) => a.frame - b.frame || a.slotIndex - b.slotIndex);
  const byFrame = new Array<number>(maxFrame + 1).fill(0);
  const perSlotCharge = new Array<number>(5).fill(0);

  for (const e of sorted) {
    if (e.frame >= 0 && e.frame <= maxFrame) {
      byFrame[e.frame] += e.chargeGain;
      perSlotCharge[e.slotIndex] += e.chargeGain;
    }
  }

  const cumulativeByFrame = new Array<number>(maxFrame + 1).fill(0);
  let acc = 0;
  let fullChargeFrame: number | null = null;
  for (let f = 0; f <= maxFrame; f++) {
    acc += byFrame[f];
    cumulativeByFrame[f] = Number(acc.toFixed(3));
    if (fullChargeFrame === null && acc >= 99.999) {
      fullChargeFrame = f;
    }
  }

  // Burst I delay: 0.433s (26f) default; Global normal/special arena 0.400s (24f)
  const b1Delay = server === "global" && arenaMode === "normal_special" ? 24 : 26;
  const b2Delay = 32; // 0.533s
  const b3Delay = 32; // 0.533s

  const burst1Frame = fullChargeFrame !== null ? fullChargeFrame + b1Delay : null;
  const burst2Frame = burst1Frame !== null ? burst1Frame + b2Delay : null;
  const burst3Frame = burst2Frame !== null ? burst2Frame + b3Delay : null;

  const slotStats: TeamSimSummary["slotStats"] = [];
  for (let i = 0; i < 5; i++) {
    const c = findRosterChar(slots[i].charId);
    if (!c) continue;
    const cs = evaluateSlotChargeSpeed(c, slots[i]);
    slotStats.push({
      slotIndex: i,
      charId: c.id,
      charName: c.name,
      totalCharge: Number(perSlotCharge[i].toFixed(2)),
      effSpeedStr: cs.effSpeedStr,
      savedFrames60: cs.savedFrames60,
      actualChargeFrames60: cs.actualChargeFrames60,
    });
  }

  return {
    side,
    events: sorted,
    cumulativeByFrame,
    fullChargeFrame,
    fullChargeTimeSec:
      fullChargeFrame !== null ? Number(((fullChargeFrame / 2) * 0.033).toFixed(3)) : null,
    rlRating: classifyRlSpeed(fullChargeFrame, server),
    burst1Frame,
    burst2Frame,
    burst3Frame,
    slotStats,
  };
}

export function simulateArena5v5(
  attackerSlots: readonly SlotConfig[],
  defenderSlots: readonly SlotConfig[],
  server: ServerRegion,
  arenaMode: ArenaMode,
  maxFrame = 300
): ArenaSimResult {
  const atkAlive = attackerSlots.map((s, i) => (s.charId ? i : -1)).filter((i) => i >= 0);
  const defAlive = defenderSlots.map((s, i) => (s.charId ? i : -1)).filter((i) => i >= 0);

  const atkBaseEvents: ChargeHitEvent[] = [];
  attackerSlots.forEach((slot, idx) => {
    const c = findRosterChar(slot.charId);
    if (!c) return;
    atkBaseEvents.push(
      ...generateCharAttackEvents(c, slot, idx, "attacker", defAlive, server, arenaMode, maxFrame)
    );
  });

  const defBaseEvents: ChargeHitEvent[] = [];
  defenderSlots.forEach((slot, idx) => {
    const c = findRosterChar(slot.charId);
    if (!c) return;
    defBaseEvents.push(
      ...generateCharAttackEvents(c, slot, idx, "defender", atkAlive, server, arenaMode, maxFrame)
    );
  });

  // Counter-hit energy generation (Jackal / Scarlet)
  const atkCounters = addJackalAndScarletCounters("attacker", attackerSlots, defBaseEvents, maxFrame);
  const defCounters = addJackalAndScarletCounters("defender", defenderSlots, atkBaseEvents, maxFrame);

  const attacker = summarizeTeam(
    "attacker",
    attackerSlots,
    [...atkBaseEvents, ...atkCounters],
    maxFrame,
    server,
    arenaMode
  );
  const defender = summarizeTeam(
    "defender",
    defenderSlots,
    [...defBaseEvents, ...defCounters],
    maxFrame,
    server,
    arenaMode
  );

  let winnerSide: ArenaSimResult["winnerSide"] = null;
  let leadFrames60 = 0;
  if (attacker.fullChargeFrame !== null && defender.fullChargeFrame !== null) {
    if (attacker.fullChargeFrame < defender.fullChargeFrame) {
      winnerSide = "attacker";
      leadFrames60 = defender.fullChargeFrame - attacker.fullChargeFrame;
    } else if (defender.fullChargeFrame < attacker.fullChargeFrame) {
      winnerSide = "defender";
      leadFrames60 = attacker.fullChargeFrame - defender.fullChargeFrame;
    } else {
      winnerSide = "tie";
    }
  } else if (attacker.fullChargeFrame !== null) {
    winnerSide = "attacker";
  } else if (defender.fullChargeFrame !== null) {
    winnerSide = "defender";
  }

  return { maxFrame, attacker, defender, winnerSide, leadFrames60 };
}
