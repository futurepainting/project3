"use strict";

const WAVE_PHASE = Object.freeze({
  LOCKED: "locked",
  COUNTDOWN: "countdown",
  SPAWNING: "spawning",
  COMBAT: "combat",
  INTERMISSION: "intermission",
  DEFEAT: "defeat",
});

const WAVE_UPGRADE_CONFIG = Object.freeze({
  attack: {
    label: "화력 강화",
    description: "모든 아군 병사의 공격력이 증가합니다.",
    baseCost: 30,
    costGrowth: 1.9,
    multiplierPerLevel: 1.14,
  },
  health: {
    label: "방탄 장비",
    description: "모든 아군 병사의 최대 체력이 증가합니다.",
    baseCost: 36,
    costGrowth: 1.92,
    multiplierPerLevel: 1.17,
  },
  fireRate: {
    label: "사격 훈련",
    description: "모든 아군 병사의 연사와 재장전이 빨라집니다.",
    baseCost: 50,
    costGrowth: 1.96,
    multiplierPerLevel: 0.94,
  },
});

class WaveDefenseSystem {
  constructor(game) {
    this.game = game;
    this.phase = WAVE_PHASE.LOCKED;
    this.round = 0;
    this.countdown = 0;
    this.spawnTimer = 0;
    this.spawned = 0;
    this.totalToSpawn = 0;
    this.killedThisRound = 0;
    this.totalKills = 0;
    this.lastSpawnEdge = "";
    this.intermissionDuration = 6;
    this.firstWaveDelay = 6;
    this.armyAtRoundStart = 0;
    this.projectedArmy = 0;
    this.enemyResponseRatio = 0;
    this.wavePowerMultiplier = 1;
    this.spawnBurstSize = 1;
    this.eliteCount = 0;
    this.onStateChanged = null;
    this._uiTimer = 0;
    this._lastStateKey = "";
    this.upgrades = {
      attack: 0,
      health: 0,
      fireRate: 0,
    };
  }

  isReady() {
    return Boolean(
      this.game?.warUnlocked &&
      this.game?.trainingCenter?.isBuilt &&
      this.game?.getFriendlyMilitaryCount?.() > 0
    );
  }

  isWaveActive() {
    return this.phase === WAVE_PHASE.SPAWNING || this.phase === WAVE_PHASE.COMBAT;
  }

  update(deltaTime) {
    const dt = Math.max(0, Number(deltaTime) || 0);
    if (this.game?.hqBase?.isDestroyed) {
      if (this.phase !== WAVE_PHASE.DEFEAT) {
        this.phase = WAVE_PHASE.DEFEAT;
        this.countdown = 0;
        this.game.showFundsNotice("본부가 파괴되었습니다", this.game.hqBase.x, this.game.hqBase.y - 100, 2.4);
        this._emit(true);
      }
      return;
    }

    if (this.phase === WAVE_PHASE.LOCKED) {
      if (this.isReady()) {
        this.round = 0;
        this.phase = WAVE_PHASE.COUNTDOWN;
        this.countdown = this.firstWaveDelay;
        this.game.activateAllSoldiersForDefense?.();
        this.game.showFundsNotice("적의 첫 공격이 감지되었습니다", this.game.hqBase.x, this.game.hqBase.y - 100, 1.6);
        this._emit(true);
      }
      return;
    }

    if (this.phase === WAVE_PHASE.COUNTDOWN || this.phase === WAVE_PHASE.INTERMISSION) {
      this.countdown = Math.max(0, this.countdown - dt);
      if (this.countdown <= 0) this._beginRound();
      this._emitThrottled(dt);
      return;
    }

    if (this.phase === WAVE_PHASE.SPAWNING) {
      this.spawnTimer -= dt;
      const interval = this._getSpawnInterval();
      while (this.spawnTimer <= 0 && this.spawned < this.totalToSpawn) {
        this.spawnTimer += interval;
        const burstCount = Math.min(this.spawnBurstSize, this.totalToSpawn - this.spawned);
        for (let i = 0; i < burstCount; i += 1) this._spawnEnemy();
      }
      if (this.spawned >= this.totalToSpawn) this.phase = WAVE_PHASE.COMBAT;
    }

    if (this.phase === WAVE_PHASE.SPAWNING || this.phase === WAVE_PHASE.COMBAT) {
      if (this.spawned >= this.totalToSpawn && this.getAliveEnemyCount() <= 0) {
        this._completeRound();
      }
      this._emitThrottled(dt);
    }
  }

  _beginRound() {
    this.round += 1;
    this.phase = WAVE_PHASE.SPAWNING;
    this.spawned = 0;
    this.killedThisRound = 0;

    const plan = this._getRoundPlan(this.round);
    this.totalToSpawn = plan.enemyCount;
    this.armyAtRoundStart = plan.armyAtStart;
    this.projectedArmy = plan.projectedArmy;
    this.enemyResponseRatio = plan.responseRatio;
    this.wavePowerMultiplier = plan.powerMultiplier;
    this.spawnBurstSize = plan.burstSize;
    this.eliteCount = plan.eliteCount;
    this.spawnTimer = 0.25;

    this.game.activateAllSoldiersForDefense?.();
    const bossText = this.eliteCount > 0 ? ` · 정예 ${this.eliteCount}명` : "";
    const pressureText = this.round >= 4 ? ` · 적 ${this.totalToSpawn}명` : "";
    this.game.showFundsNotice(
      `라운드 ${this.round} 시작${bossText}${pressureText}`,
      this.game.hqBase.x,
      this.game.hqBase.y - 112,
      1.5
    );
    this._emit(true);
  }

  _completeRound() {
    const bonus = this._getClearBonus(this.round);
    this.game.addFunds(bonus, `라운드 ${this.round} 방어 보너스`, this.game.hqBase.x, this.game.hqBase.y - 110);
    this.phase = WAVE_PHASE.INTERMISSION;
    this.countdown = this.intermissionDuration;
    this.game.showFundsNotice(`라운드 ${this.round} 방어 성공 · 골드 +${bonus}`, this.game.hqBase.x, this.game.hqBase.y - 88, 1.9);
    this._emit(true);
  }

  startNextRoundNow() {
    if (this.phase !== WAVE_PHASE.COUNTDOWN && this.phase !== WAVE_PHASE.INTERMISSION) return false;
    this.countdown = 0;
    this._beginRound();
    return true;
  }

  _getRoundPlan(round) {
    const safeRound = Math.max(1, Math.floor(round || 1));
    const armyAtStart = Math.max(1, this.game?.getFriendlyMilitaryCount?.() || 1);
    const trainingLevel = Math.max(1, this.game?._getTrainingCenterLevel?.() || 1);
    const batchSize = Math.max(1, this.game?._getTrainingBatchSize?.() || 1);
    const trainingDuration = Math.max(0.75, this.game?._getRiflemanTrainingDuration?.() || 8);
    const productionPerSecond = batchSize / trainingDuration;

    // 자동 생산으로 이번 라운드 도중 늘어날 병력의 일부까지 예상한다.
    // 초반에는 적응 비중이 낮고, 중반 이후 현재 군세에 점차 대응한다.
    const expectedWaveDuration = Math.min(18, 7.5 + safeRound * 0.5);
    const productionWeight = Math.min(0.65, 0.15 + Math.max(0, safeRound - 1) * 0.08);
    const projectedArmy = armyAtStart + productionPerSecond * expectedWaveDuration * productionWeight;

    const baseCount = 2 + Math.floor(safeRound * 1.35 + Math.pow(safeRound, 1.25));
    const responseRatio = Math.min(1.75, 0.45 + Math.max(0, safeRound - 1) * 0.13);
    const responseCount = Math.ceil(projectedArmy * responseRatio);
    const eliteCount = safeRound % 5 === 0 ? Math.min(4, 1 + Math.floor(safeRound / 10)) : 0;
    const rawEnemyCount = Math.max(baseCount, responseCount) + eliteCount;

    // 화면 객체 수는 제한하고, 초과한 전력은 적 체력/공격력으로 압축한다.
    const enemyCountCap = 160;
    const enemyCount = Math.max(4, Math.min(enemyCountCap, rawEnemyCount));
    const overflow = Math.max(0, rawEnemyCount - enemyCountCap);
    const overflowPower = 1 + (overflow / enemyCountCap) * 0.65;
    const trainingPressure = 1 + Math.max(0, trainingLevel - 1) * 0.025;
    const powerMultiplier = overflowPower * trainingPressure;
    const burstSize = Math.min(
      6,
      1 + Math.floor(Math.max(0, safeRound - 1) / 3) + (eliteCount > 0 ? 1 : 0)
    );

    return {
      enemyCount,
      armyAtStart,
      projectedArmy,
      responseRatio,
      powerMultiplier,
      burstSize,
      eliteCount,
    };
  }

  _getEnemyCountForRound(round) {
    return this._getRoundPlan(round).enemyCount;
  }

  _getSpawnInterval() {
    // 한 명씩 길게 줄 세우지 않고 짧은 간격의 공세 단위로 동시에 밀어 넣는다.
    return Math.max(0.55, 1.35 * Math.pow(0.97, Math.max(0, this.round - 1)));
  }

  _getEnemyStrength(round = this.round) {
    const safeRound = Math.max(1, round || 1);
    const tier = Math.floor(Math.max(0, safeRound - 1) / 5);
    const upgradeLevels = Object.values(this.upgrades).reduce((sum, level) => sum + Math.max(0, level || 0), 0);
    const upgradeResponse = 1 + upgradeLevels * 0.025;
    const wavePower = Math.max(1, this.wavePowerMultiplier || 1);
    return {
      hp: Math.pow(1.13, Math.max(0, safeRound - 1)) * Math.pow(1.12, tier) * wavePower * upgradeResponse,
      damage: Math.pow(1.105, Math.max(0, safeRound - 1)) * Math.pow(1.08, tier) * Math.sqrt(wavePower) * Math.pow(upgradeResponse, 0.65),
      speed: Math.min(1.48, 1 + Math.max(0, safeRound - 1) * 0.014),
    };
  }

  _getEnemyType() {
    const safeRound = Math.max(1, this.round || 1);
    const machineGunChance = safeRound >= 3
      ? Math.min(0.42, 0.08 + Math.max(0, safeRound - 3) * 0.025)
      : 0;
    const shieldChance = safeRound >= 6
      ? Math.min(0.3, 0.05 + Math.max(0, safeRound - 6) * 0.018)
      : 0;
    const roll = Math.random();
    if (roll < shieldChance) return "shield";
    if (roll < shieldChance + machineGunChance) return "machineGun";
    return "rifle";
  }

  _getSpawnPoint() {
    const arena = this.game.getArenaBounds();
    const inset = 18;
    const width = Math.max(1, arena.width - inset * 2);
    const height = Math.max(1, arena.height - inset * 2);
    const perimeter = (width + height) * 2;
    let distance = Math.random() * perimeter;
    let x = arena.left + inset;
    let y = arena.top + inset;

    // 사각 전장의 테두리 전체를 하나의 연속된 출현선으로 사용한다.
    // 따라서 동·서·남·북 중앙의 네 지점이 아니라 화면 틀 어디에서든 등장한다.
    if (distance < width) {
      x += distance;
    } else if ((distance -= width) < height) {
      x += width;
      y += distance;
    } else if ((distance -= height) < width) {
      x += width - distance;
      y += height;
    } else {
      distance -= width;
      y += height - distance;
    }

    this.lastSpawnEdge = "perimeter";
    return { x, y, edge: "perimeter", label: "전장 외곽" };
  }

  _spawnEnemy() {
    const type = this._getEnemyType();
    const point = this._getSpawnPoint();
    const strength = this._getEnemyStrength();
    const remainingIncludingCurrent = this.totalToSpawn - this.spawned;
    const boss = this.eliteCount > 0 && remainingIncludingCurrent <= this.eliteCount;
    if (this.spawned === 0 || this.spawned % 6 === 0) {
      this.game.showFundsNotice(`${point.label}에서 적 접근`, this.game.hqBase.x, this.game.hqBase.y - 126, 1.1);
    }
    const soldier = this.game.spawnWaveEnemy?.(point, type, strength, boss);
    if (!soldier) return;
    this.spawned += 1;
    this._emit(true);
  }

  getAliveEnemyCount() {
    return this.game.soldiers.reduce((count, soldier) => (
      count + (soldier.waveEnemy && soldier.isActive && !soldier.isDead && soldier.hp > 0 ? 1 : 0)
    ), 0);
  }

  handleEnemyKilled(soldier) {
    if (!soldier?.waveEnemy || soldier.waveRewardGranted) return 0;
    soldier.waveRewardGranted = true;
    const typeFactor = soldier.unitType === "machineGun" ? 1.8 : soldier.unitType === "shield" ? 2.2 : 1;
    const bossFactor = soldier.isWaveBoss ? 5 : 1;
    const reward = Math.max(1, Math.round(4 * Math.pow(1.11, Math.max(0, this.round - 1)) * typeFactor * bossFactor));
    this.killedThisRound += 1;
    this.totalKills += 1;
    this.game.addFunds(reward, soldier.isWaveBoss ? "정예 적 처치" : "적 처치", soldier.x, soldier.y - 24);
    this._emit(true);
    return reward;
  }

  _getClearBonus(round) {
    return Math.max(8, Math.round(12 * Math.pow(1.14, Math.max(0, round - 1))));
  }

  getUpgradeCost(type) {
    const config = WAVE_UPGRADE_CONFIG[type];
    if (!config) return Infinity;
    const level = this.upgrades[type] || 0;
    return Math.max(1, Math.round(config.baseCost * Math.pow(config.costGrowth, level)));
  }

  purchaseUpgrade(type) {
    const config = WAVE_UPGRADE_CONFIG[type];
    if (!config) return false;
    const cost = this.getUpgradeCost(type);
    if (this.game.getFunds() < cost) {
      this.game.showFundsNotice(`골드 ${cost} 필요`, this.game.hqBase.x, this.game.hqBase.y - 96);
      return false;
    }
    this.game.spendFunds(cost, config.label);
    this.upgrades[type] += 1;
    for (const soldier of this.game.soldiers) {
      if (soldier.team === TEAM.FRIENDLY && soldier.isActive && !soldier.isDead) {
        this.applyUpgradesToSoldier(soldier);
      }
    }
    this.game.showFundsNotice(`${config.label} Lv.${this.upgrades[type]}`, this.game.hqBase.x, this.game.hqBase.y - 96, 1.1);
    this._emit(true);
    return true;
  }

  applyUpgradesToSoldier(soldier) {
    if (!soldier || soldier.team !== TEAM.FRIENDLY) return false;
    if (!Number.isFinite(soldier.baseAttackDamage)) soldier.baseAttackDamage = soldier.attackDamage;
    if (!Number.isFinite(soldier.baseMaxHp)) soldier.baseMaxHp = soldier.maxHp;
    if (!Number.isFinite(soldier.baseFireInterval)) soldier.baseFireInterval = soldier.fireInterval;
    if (!Number.isFinite(soldier.baseReloadDuration)) soldier.baseReloadDuration = soldier.reloadDuration;

    const hpRatio = soldier.maxHp > 0 ? Math.max(0, Math.min(1, soldier.hp / soldier.maxHp)) : 1;
    soldier.attackDamage = Math.round(
      soldier.baseAttackDamage * Math.pow(WAVE_UPGRADE_CONFIG.attack.multiplierPerLevel, this.upgrades.attack)
    );
    soldier.maxHp = Math.round(
      soldier.baseMaxHp * Math.pow(WAVE_UPGRADE_CONFIG.health.multiplierPerLevel, this.upgrades.health)
    );
    soldier.hp = Math.max(1, Math.round(soldier.maxHp * hpRatio));
    soldier.fireInterval = Math.max(
      0.08,
      soldier.baseFireInterval * Math.pow(WAVE_UPGRADE_CONFIG.fireRate.multiplierPerLevel, this.upgrades.fireRate)
    );
    soldier.reloadDuration = Math.max(
      0.45,
      soldier.baseReloadDuration * Math.pow(0.96, this.upgrades.fireRate)
    );
    return true;
  }

  getState() {
    const alive = this.getAliveEnemyCount();
    const remaining = Math.max(0, this.totalToSpawn - this.spawned + alive);
    const phaseLabels = {
      [WAVE_PHASE.LOCKED]: "훈련소와 첫 병사 대기",
      [WAVE_PHASE.COUNTDOWN]: "공격 준비",
      [WAVE_PHASE.SPAWNING]: "적 증원 중",
      [WAVE_PHASE.COMBAT]: "교전 중",
      [WAVE_PHASE.INTERMISSION]: "방어 성공",
      [WAVE_PHASE.DEFEAT]: "본부 파괴",
    };
    const nextRound = this.phase === WAVE_PHASE.INTERMISSION || this.phase === WAVE_PHASE.COUNTDOWN
      ? this.round + 1
      : this.round;
    return {
      phase: this.phase,
      phaseLabel: phaseLabels[this.phase] || this.phase,
      round: this.round,
      nextRound,
      countdown: Math.max(0, Math.ceil(this.countdown)),
      spawned: this.spawned,
      total: this.totalToSpawn,
      alive,
      remaining,
      killedThisRound: this.killedThisRound,
      totalKills: this.totalKills,
      lastSpawnEdge: this.lastSpawnEdge,
      armyAtRoundStart: this.armyAtRoundStart,
      projectedArmy: Math.round(this.projectedArmy),
      responseRatio: this.enemyResponseRatio,
      spawnBurstSize: this.spawnBurstSize,
      eliteCount: this.eliteCount,
      pressureLevel: Math.max(1, Math.ceil(this.round / 3)),
      canStartNow: this.phase === WAVE_PHASE.COUNTDOWN || this.phase === WAVE_PHASE.INTERMISSION,
      upgrades: Object.fromEntries(Object.keys(WAVE_UPGRADE_CONFIG).map((type) => {
        const config = WAVE_UPGRADE_CONFIG[type];
        return [type, {
          type,
          label: config.label,
          description: config.description,
          level: this.upgrades[type],
          cost: this.getUpgradeCost(type),
          canAfford: this.game.getFunds() >= this.getUpgradeCost(type),
        }];
      })),
    };
  }

  _emitThrottled(deltaTime) {
    this._uiTimer += Math.max(0, deltaTime);
    if (this._uiTimer < 0.16) return;
    this._uiTimer = 0;
    this._emit(false);
  }

  _emit(force = false) {
    const state = this.getState();
    const key = [
      state.phase,
      state.round,
      state.countdown,
      state.spawned,
      state.alive,
      state.remaining,
      state.killedThisRound,
      this.game.getFunds(),
      this.upgrades.attack,
      this.upgrades.health,
      this.upgrades.fireRate,
    ].join("|");
    if (!force && key === this._lastStateKey) return;
    this._lastStateKey = key;
    if (typeof this.onStateChanged === "function") this.onStateChanged(state);
  }
}
