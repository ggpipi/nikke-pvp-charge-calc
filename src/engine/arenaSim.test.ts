import { describe, expect, it } from "vitest";
import { createEmptySlot, simulateArena5v5 } from "./arenaSim";

describe("5v5 Arena simulation engine (Vesti TU & Liberalio fixed)", () => {
  it("applies exact 2f stepping for Vesti: Tactical Upgrade (unlike nikke.top's 4f jumps)", () => {
    const def = [
      createEmptySlot("noah"),
      createEmptySlot("noise"),
      createEmptySlot("biscuit"),
      createEmptySlot("anis"),
      createEmptySlot("jackal"),
    ];

    const v0 = createEmptySlot("vesti_tu");
    const vCube = { ...createEmptySlot("vesti_tu"), cubeKind: "adjutant" as const, cubeBp: 212 };
    const v4T15 = {
      ...createEmptySlot("vesti_tu"),
      gearBps: [609, 609, 609, 609] as [number, number, number, number],
    };

    const sim0 = simulateArena5v5([v0, ...def.slice(1)], def, "global", "champion");
    const simCube = simulateArena5v5([vCube, ...def.slice(1)], def, "global", "champion");
    const sim4T15 = simulateArena5v5([v4T15, ...def.slice(1)], def, "global", "champion");

    const hit0 = sim0.attacker.events.find((e) => e.charId === "vesti_tu")!.frame;
    const hitCube = simCube.attacker.events.find((e) => e.charId === "vesti_tu")!.frame;
    const hit4T15 = sim4T15.attacker.events.find((e) => e.charId === "vesti_tu")!.frame;

    // Lv7 cube (2.12%) on C0=200 -> 4 cs -> EXACTLY -2f (NOT -4f like nikke.top!)
    expect(hit0 - hitCube).toBe(2);
    // 4x T15 (6.09%×4) -> 49 cs -> EXACTLY -30f (NOT -28f like nikke.top!)
    expect(hit0 - hit4T15).toBe(30);
  });

  it("applies exact 1.50s breakpoints for Liberalio (4x T14 + Lv7 cube = -24f per shot)", () => {
    const def = [
      createEmptySlot("moran"),
      createEmptySlot("noah"),
      createEmptySlot("biscuit"),
      createEmptySlot("anis"),
      createEmptySlot("jackal"),
    ];

    const l0 = createEmptySlot("liberalio");
    const lMax = {
      ...createEmptySlot("liberalio"),
      gearBps: [580, 580, 580, 580] as [number, number, number, number],
      cubeKind: "adjutant" as const,
      cubeBp: 212,
    };

    const sim0 = simulateArena5v5([l0, ...def.slice(1)], def, "global", "champion");
    const simMax = simulateArena5v5([lMax, ...def.slice(1)], def, "global", "champion");

    const l0MainShots = sim0.attacker.events.filter(
      (e) => e.charId === "liberalio" && e.label.includes("主命中")
    );
    const lMaxMainShots = simMax.attacker.events.filter(
      (e) => e.charId === "liberalio" && e.label.includes("主命中")
    );

    // Shot 1: 92 vs 68 (-24f); Shot 2: 184 vs 136 (-48f!)
    expect(l0MainShots[0].frame).toBe(92);
    expect(lMaxMainShots[0].frame).toBe(68);
    expect(l0MainShots[1].frame - lMaxMainShots[1].frame).toBe(48);
  });

  it("distinguishes CN 16f vs Global 14f turnaround for standard 1.00s RL", () => {
    const team = [
      createEmptySlot("centi"),
      createEmptySlot("anis"),
      createEmptySlot("noah"),
      createEmptySlot("noise"),
      createEmptySlot("jackal"),
    ];
    const gSim = simulateArena5v5(team, team, "global", "champion");
    const cnSim = simulateArena5v5(team, team, "cn", "champion");

    const gCenti = gSim.attacker.events.filter((e) => e.charId === "centi");
    const cnCenti = cnSim.attacker.events.filter((e) => e.charId === "centi");

    // Shot 2 - Shot 1 should be 74f (Global) vs 76f (CN)
    expect(gCenti[1].frame - gCenti[0].frame).toBe(74);
    expect(cnCenti[1].frame - cnCenti[0].frame).toBe(76);
  });

  it("triggers Jackal 10-hit counter charge against enemy MG/SMG", () => {
    const atk = [
      createEmptySlot("modernia"),
      createEmptySlot("liter"),
      createEmptySlot("siren"),
      createEmptySlot("crown"),
      createEmptySlot("scarlet"),
    ];
    const def = [
      createEmptySlot("noah"),
      createEmptySlot("biscuit"),
      createEmptySlot("anis"),
      createEmptySlot("noise"),
      createEmptySlot("jackal"),
    ];
    const sim = simulateArena5v5(atk, def, "cn", "normal_special");
    const jackalCounters = sim.defender.events.filter((e) => e.isCounter && e.charId === "jackal");
    expect(jackalCounters.length).toBeGreaterThan(5);
  });
});
