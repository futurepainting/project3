"use strict";

/**
 * 소속 팀 상수. Entity/Soldier 어디서든 참조할 수 있도록 전역으로 둔다.
 */
const TEAM = {
  FRIENDLY: "TEAM_FRIENDLY",
  ENEMY: "TEAM_ENEMY",
};

/**
 * 팀별 병사 색상.
 */
const TEAM_COLORS = {
  [TEAM.FRIENDLY]: "#3498db",
  [TEAM.ENEMY]: "#e74c3c",
};

/**
 * 병사 관련 설정값. 추후 유닛 종류가 늘어나면 이 객체를 확장하거나
 * 유닛 타입별 설정 테이블로 분리한다.
 */
const SOLDIER_CONFIG = {
  RIFLEMAN: {
    UNIT_TYPE: "rifle",
    SHAPE: "circle",
    SIZE: 12,
    SPEED: 60,
    MAX_HP: 100,
    ATTACK_DAMAGE: 20,
    ATTACK_RANGE: 80,
    FIRE_INTERVAL: 0.5,
    MAX_AMMO: 30,
    RELOAD_DURATION: 2.1,
    DEFENSE_MULTIPLIER: 1,
  },
  MACHINE_GUN: {
    UNIT_TYPE: "machineGun",
    SHAPE: "circle",
    SIZE: 14,
    SPEED: 48,
    MAX_HP: 130,
    ATTACK_DAMAGE: 12,
    ATTACK_RANGE: 100,
    FIRE_INTERVAL: 0.18,
    MAX_AMMO: 60,
    RELOAD_DURATION: 3.2,
    DEFENSE_MULTIPLIER: 0.92,
  },
  SHIELD: {
    UNIT_TYPE: "shield",
    SHAPE: "circle",
    SIZE: 15,
    SPEED: 42,
    MAX_HP: 260,
    ATTACK_DAMAGE: 4,
    ATTACK_RANGE: 44,
    FIRE_INTERVAL: 1.05,
    MAX_AMMO: 12,
    RELOAD_DURATION: 2.6,
    DEFENSE_MULTIPLIER: 0.45,
  },
};

const SOLDIER_TYPE_CONFIG = {
  rifle: SOLDIER_CONFIG.RIFLEMAN,
  machineGun: SOLDIER_CONFIG.MACHINE_GUN,
  shield: SOLDIER_CONFIG.SHIELD,
};

/**
 * 이동/정지/화면 제한/전선 관련 설정값.
 */
const SOLDIER_MOVEMENT_CONFIG = {
  SEPARATION_RADIUS: 26, // 이 거리 안의 같은 팀 병사를 서로 밀어냄
  SEPARATION_STRENGTH: 0.6, // separation 벡터를 기본 이동 방향에 반영하는 비율
  STOP_DISTANCE: 6, // 적 기지 경계 앞에 남겨둘 여유 간격
  CANVAS_PADDING: 12, // 화면 위/아래/왼쪽/오른쪽 가장자리 여백
  FRONT_LINE_DISTANCE: 6, // Target이 없을 때, 이 거리(표면 기준) 안에 적이 있으면 멈춘다
  MIN_ALLY_GAP: 4, // 같은 진영 병사 표면 사이에 유지할 최소 간격
  SPACING_CORRECTION: 0.55, // 겹침 해소 시 한 프레임에 적용할 보정 비율
  MAX_SEPARATION_INFLUENCE: 0.72, // 밀어내기가 전진 방향을 완전히 상쇄하지 않도록 제한
  MIN_FORWARD_COMPONENT: 0.28, // 혼잡한 상황에서도 목표 쪽 전진 성분을 최소한 유지
  STUCK_CHECK_DISTANCE: 0.18, // 이동 예정 프레임에서 이 거리보다 적게 움직이면 정체로 판단
  STUCK_RECOVERY_TIME: 0.85, // 이 시간 이상 정체되면 옆으로 빠져나오는 보정 실행
  STUCK_NUDGE_DISTANCE: 10, // 정체 해소 시 적용하는 최소 이동 거리
};

/**
 * Target 탐지/교전 관련 설정값. 아직 공격은 구현하지 않으며
 * Detection Range 안에서 Target을 찾고 Attack Range까지 접근하는 데에만 쓰인다.
 */
const SOLDIER_COMBAT_CONFIG = {
  DETECTION_RANGE: 250, // 이 거리(표면 기준) 안의 적을 Target 후보로 탐지
  ATTACK_RANGE: 80, // 이 거리(표면 기준) 안에 들어오면 AIMING 상태가 됨
  FIRE_INTERVAL: 0.5, // 연사 간격(초). setInterval 대신 deltaTime 누적 Timer로 처리
  TARGET_SEARCH_INTERVAL: 0.12, // Target이 없을 때 전체 탐색을 수행하는 최소 간격(초)
  TARGET_REEVALUATE_INTERVAL: 0.22, // 추격 중 가까운 위협을 빠르게 다시 확인한다.
  TARGET_SWITCH_RATIO: 0.88, // 새 적이 약 12% 이상 가까우면 표적을 교체한다.
  CLOSE_THREAT_RANGE_MULTIPLIER: 1.6, // 공격 사거리 주변을 지나가는 적은 즉시 위협으로 판단한다.
  CLOSE_THREAT_SWITCH_RATIO: 0.94, // 근거리에서는 작은 거리 차이만 있어도 더 가까운 적을 우선한다.
  TARGET_MEMORY_PADDING: 55, // 탐지 경계에서 표적이 반복 해제되어 사격이 끊기지 않도록 여유를 둔다.
  TARGET_SATURATION_PENALTY: 72, // 같은 적에게 아군이 과도하게 몰릴 때 다른 표적으로 분산한다.
  BASE_THREAT_WEIGHT: 0.72, // 본부에 가까운 적을 우선하여 기지 방어가 비지 않게 한다.
  INNER_GUARD_RADIUS: 360, // 일부 병력은 본부 주변을 벗어나지 않는 상시 방어대로 유지한다.
};

/**
 * 방향선(조준 방향 표시) 렌더링 설정값.
 */
const SOLDIER_RENDER_CONFIG = {
  FACING_LINE_LENGTH: 16,
  FACING_LINE_WIDTH: 2,
  FACING_LINE_COLOR: "#1a1a1a",

  // 새 5방향 PNG는 원본 비율을 유지한 채 동일한 높이로 표시한다.
  DIRECTIONAL_SPRITE_HEIGHT: 54,
  DIRECTIONAL_SPRITE_MAX_WIDTH: 42,
  DIRECTIONAL_SPRITE_OFFSET_Y: 0,

  // 기존 단일 스프라이트 fallback 렌더링 크기/원본 방향.
  SPRITE_WIDTH: 40,
  SPRITE_HEIGHT: 41,
  SPRITE_SOURCE_ANGLE: Math.PI / 4,
};

/**
 * 체력바 렌더링 관련 설정값.
 */
const SOLDIER_HP_BAR_CONFIG = {
  WIDTH: 32,
  HEIGHT: 5,
  OFFSET_Y: 10, // 병사 몸체(radius) 위쪽으로 추가로 띄우는 여백
  BACKGROUND_COLOR: "#1a1a1a",
  FILL_COLOR: "#2ecc71",
  BORDER_COLOR: "#000000",
};


/**
 * 병사 피격 피드백 설정값. 전선이 과하게 흔들리지 않도록 매우 짧고 약하게 적용한다.
 */
const SOLDIER_HIT_FEEDBACK_CONFIG = {
  FLASH_DURATION: 0.08, // 피격 시 밝게 보이는 시간(초)
  KNOCKBACK_SPEED: 42, // 최초 넉백 속도(px/s)
  KNOCKBACK_DAMPING: 18, // 초당 감쇠 강도
  IMPACT_DURATION: 0.12, // 작은 충격 원 표시 시간(초)
  IMPACT_MAX_RADIUS: 7,
  HP_BAR_PULSE_DURATION: 0.14,
  HP_BAR_PULSE_SCALE: 1.12,
};

/**
 * 병사 사망 처리 관련 설정값.
 * 사망 직후 바로 배열에서 제거하지 않고 잠시 시체를 남긴 뒤,
 * Soldier가 isActive=false로 전환되면 Game이 안전하게 제거한다.
 */
const SOLDIER_DEATH_CONFIG = {
  CORPSE_DURATION: 0.5, // 시체 유지 시간(초)
  CORPSE_ALPHA: 0.55,
  CORPSE_HEIGHT_SCALE: 0.45,
};

/**
 * 병사의 이동 상태값. 복잡한 상태 머신 없이 단순 문자열로 관리한다.
 * 우선순위: ARRIVED > AIMING > BLOCKED > MOVING
 */
const SOLDIER_STATE = {
  MOVING: "moving", // 목표(적 기지 또는 Target)를 향해 이동 중
  BLOCKED: "blocked", // Target 없이 가까운 적과 마주쳐 멈춤 (전선 형성)
  AIMING: "aiming", // Target이 Attack Range 안에 들어와 멈추고 조준 중
  ARRIVED: "arrived", // 적 기지 앞에 도착해 정지
  RESERVE: "reserve", // 병영 앞 집결지에서 명령을 기다리는 병력
  RESUPPLYING: "resupplying", // 탄약이 소진되어 소속 기지로 복귀/보급 중
  DEAD: "dead", // 사망하여 이동/공격/탐색을 모두 중지한 상태
};

/**
 * 자동으로 목표 기지를 향해 이동하는 병사 클래스. Entity를 상속한다.
 * 이동, 같은 팀끼리의 separation, 적 기지 앞 정지, Target 탐지/추격/조준,
 * 적군과 마주쳤을 때의 전선 형성(BLOCKED), 화면 경계 처리를 담당한다.
 * 체력과 사망 상태도 함께 관리하며, 실제 배열 제거는 Game이 담당한다.
 */
class Soldier extends Entity {
  /**
   * @param {number} x - 생성 x 좌표
   * @param {number} y - 생성 y 좌표 (이동 라인으로 유지됨)
   * @param {string} team - TEAM.FRIENDLY | TEAM.ENEMY
   * @param {Base} targetBase - 목표(상대) 기지 인스턴스
   * @param {object} config - SOLDIER_CONFIG의 유닛별 설정
   */
  constructor(x, y, team, targetBase, config = SOLDIER_CONFIG.RIFLEMAN, options = {}) {
    super(x, y);

    this.team = team;
    this.unitType = config.UNIT_TYPE || "rifle";
    this.visualKey = "rifleman";
    this.visualMeta = getVisualMetadata(this.visualKey);
    this.shape = config.SHAPE;
    this.size = config.SIZE;
    this.speed = config.SPEED;
    this.color = TEAM_COLORS[team];

    // 충돌/정지/경계 판정에 쓰이는 반지름 (사각형은 절반 크기로 근사)
    this.radius = this.shape === "circle" ? this.size : this.size / 2;

    // 체력. Game의 총알 충돌 판정에서 takeDamage()가 호출된다.
    this.maxHp = config.MAX_HP;
    this.hp = this.maxHp;

    // 사망 상태와 시체 유지 시간. 사망 직후에는 isActive를 유지하여
    // CORPSE_DURATION 동안 렌더링하고, 시간이 끝난 뒤 비활성화한다.
    this.isDead = false;
    this.deathTimer = 0;

    // 피격 피드백 상태. 실제 데미지 계산은 Game이 담당하고, Soldier는
    // 전달받은 피격 방향을 짧은 시각 효과와 미세 넉백에만 사용한다.
    this.hitFlashTimer = 0;
    this.hitImpactTimer = 0;
    this.hpBarPulseTimer = 0;
    this.knockbackVelocityX = 0;
    this.knockbackVelocityY = 0;
    this.lastHitDirectionX = 0;
    this.lastHitDirectionY = 0;

    // 총알 한 발당 데미지. Soldier는 이 값을 Game에 전달만 하고,
    // 실제 Bullet 생성과 damage 저장은 Game/Bullet이 담당한다.
    this.attackDamage = config.ATTACK_DAMAGE;
    this.attackRange = config.ATTACK_RANGE || 80;
    this.fireInterval = config.FIRE_INTERVAL || SOLDIER_COMBAT_CONFIG.FIRE_INTERVAL;
    this.defenseMultiplier = Number.isFinite(config.DEFENSE_MULTIPLIER) ? config.DEFENSE_MULTIPLIER : 1;
    this.maxAmmo = Number.isFinite(config.MAX_AMMO) ? config.MAX_AMMO : 30;
    this.ammo = this.maxAmmo;
    this.reloadDuration = Number.isFinite(config.RELOAD_DURATION) ? config.RELOAD_DURATION : 2;
    this.reloadTimer = 0;
    this.isReloading = false;
    this.isResupplying = false;
    this.resupplyAtBase = false;

    // 하나의 거대한 2D 월드에서 전선별 병력이 섞이지 않도록 소속 전선을 보관한다.
    this.frontId = options.frontId || "east";
    this.homeBase = options.homeBase || null;
    this.laneOffset = Number.isFinite(options.laneOffset) ? options.laneOffset : 0;
    this.awaitingOrder = Boolean(options.awaitingOrder);
    this.rallyTarget = options.rallyTarget ? { ...options.rallyTarget } : null;
    this.rallyArrived = !this.rallyTarget;
    this.marchWaypoints = [];
    this.marchWaypointIndex = 0;
    this.deploymentMarchActive = false;
    // 병력 객체는 줌 단계와 관계없이 계속 유지된다. false이면 전선으로 실제 이동 중이다.
    this.regionArrived = !this.awaitingOrder;
    // 훈련소에서 나온 아군은 전장 전체에서 가장 가까운 적을 찾는다.
    // 적이 없을 때는 자신의 방어 대기 위치로 이동한다.
    this.globalEnemySearch = Boolean(options.globalEnemySearch);
    this.defenseCenter = options.defenseCenter ? { ...options.defenseCenter } : null;
    this.innerGuard = Boolean(options.innerGuard);

    // 기존 가로 전용 directionSign 대신 실제 이동 방향 벡터를 사용한다.
    this.routeX = 1;
    this.routeY = 0;
    this.perpX = 0;
    this.perpY = 1;
    this.directionSign = team === TEAM.FRIENDLY ? 1 : -1; // 구버전 fallback용
    this.laneY = y;

    // 목표 기지는 적 병사가 없을 때 공격할 후순위 Target이다.
    this.targetBase = targetBase;
    this.stopX = targetBase.x;
    this.stopY = targetBase.y;
    this._recalculateRoute();

    this.state = this.awaitingOrder ? SOLDIER_STATE.RESERVE : SOLDIER_STATE.MOVING;

    // 현재 추적 중인 적 병사 (없으면 null).
    this.target = null;

    // 병사가 많아졌을 때 모든 병사가 매 프레임 전체 배열을 탐색하지 않도록
    // Target이 없을 때만 짧은 간격으로 재탐색한다. 생성 시점을 분산해 한 프레임에
    // 탐색이 몰리는 현상도 줄인다.
    this.targetSearchTimer =
      Math.random() * SOLDIER_COMBAT_CONFIG.TARGET_SEARCH_INTERVAL;

    // 조준/이동 방향을 나타내는 정규화된 벡터. 기본값은 진행 방향(전방)이다.
    this.facingX = this.routeX;
    this.facingY = this.routeY;

    // AIMING 상태에서의 연사 Timer 누적 시간(초).
    this.fireTimer = 0;

    // 병력 밀집이나 월드 경계 때문에 이동이 막혔는지 감지하기 위한 상태다.
    this._lastMovementX = this.x;
    this._lastMovementY = this.y;
    this._movementExpectedLastFrame = false;
    this._stuckTimer = 0;
    this._unstickSide = Math.random() < 0.5 ? -1 : 1;
  }


  _recalculateRoute() {
    if (!this.targetBase) return;
    const origin = this.homeBase || { x: this.x, y: this.y };
    let dx = this.targetBase.x - origin.x;
    let dy = this.targetBase.y - origin.y;
    let length = Math.hypot(dx, dy);
    if (length < 0.001) {
      dx = this.targetBase.x - this.x;
      dy = this.targetBase.y - this.y;
      length = Math.hypot(dx, dy) || 1;
    }

    this.routeX = dx / length;
    this.routeY = dy / length;
    this.perpX = -this.routeY;
    this.perpY = this.routeX;
    this.directionSign = Math.abs(this.routeX) >= Math.abs(this.routeY)
      ? (this.routeX >= 0 ? 1 : -1)
      : (this.routeY >= 0 ? 1 : -1);

    const halfExtent =
      Math.abs(this.routeX) * this.targetBase.width / 2 +
      Math.abs(this.routeY) * this.targetBase.height / 2;
    const stopDistance = halfExtent + this.radius + SOLDIER_MOVEMENT_CONFIG.STOP_DISTANCE;
    this.stopX = this.targetBase.x - this.routeX * stopDistance + this.perpX * this.laneOffset;
    this.stopY = this.targetBase.y - this.routeY * stopDistance + this.perpY * this.laneOffset;
  }

  setRallyTarget(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
    this.rallyTarget = { x: point.x, y: point.y };
    this.rallyArrived = Math.hypot(this.x - point.x, this.y - point.y) <= 2;
    return true;
  }

  assignOrder(
    frontId,
    targetBase,
    homeBase = this.homeBase,
    laneOffset = this.laneOffset,
    marchWaypoints = []
  ) {
    if (!frontId || !targetBase) return false;
    this.awaitingOrder = false;
    this.frontId = frontId;
    this.laneOffset = Number.isFinite(laneOffset) ? laneOffset : 0;
    this.target = null;
    this.targetSearchTimer = SOLDIER_COMBAT_CONFIG.TARGET_SEARCH_INTERVAL;
    this.fireTimer = 0;
    this.marchWaypoints = Array.isArray(marchWaypoints)
      ? marchWaypoints
          .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
          .map((point) => ({ x: point.x, y: point.y }))
      : [];
    this.marchWaypointIndex = 0;
    this.deploymentMarchActive = this.marchWaypoints.length > 0;
    this.regionArrived = !this.deploymentMarchActive;
    this.setTargetBase(targetBase, homeBase);
    this.state = SOLDIER_STATE.MOVING;
    return true;
  }

  /** 다음 전선이 열릴 때 목표 기지를 안전하게 교체한다. */
  setTargetBase(targetBase, homeBase = this.homeBase) {
    if (!targetBase) return false;
    this.targetBase = targetBase;
    this.homeBase = homeBase || this.homeBase;
    this._recalculateRoute();
    this.clearTarget();
    if (!this.isDead) this.state = SOLDIER_STATE.MOVING;
    return true;
  }

  /**
   * @param {number} deltaTime - 이전 프레임과의 시간 차이(초)
   * @param {Soldier[]} soldiers - Target/separation/전선 계산을 위한 전체 병사 목록
   * @param {HTMLCanvasElement} canvas - 화면 경계 계산을 위한 캔버스
   * @param {Game} game - 총알 생성을 요청하기 위한 Game 인스턴스
   */
  update(deltaTime, soldiers, canvas, game) {
    this._beginMovementFrame(deltaTime, soldiers, canvas);

    if (this.isDead) {
      this._updateDeath(deltaTime);
      return;
    }

    this._updateHitFeedback(deltaTime, canvas);

    if (this.isResupplying && !this.awaitingOrder) {
      this._updateResupply(deltaTime, soldiers, canvas);
      return;
    }

    this._updateAmmoState(deltaTime);

    if (this.awaitingOrder) {
      this.target = null;
      this.fireTimer = 0;
      this.state = SOLDIER_STATE.RESERVE;

      if (this.rallyTarget) {
        const remaining = Math.hypot(this.rallyTarget.x - this.x, this.rallyTarget.y - this.y);
        if (remaining > 1.5) {
          // 구버전 대기 명령 호환: 지정된 칸으로 곧장 이동한다.
          // 현재 자동 전투 병사는 이 상태를 사용하지 않는다.
          const dx = this.rallyTarget.x - this.x;
          const dy = this.rallyTarget.y - this.y;
          const distance = Math.hypot(dx, dy) || 1;
          const moveDir = { x: dx / distance, y: dy / distance };
          this._updateFacingToward(this.x + moveDir.x, this.y + moveDir.y);
          const moveDistance = Math.min(this.speed * 0.82 * deltaTime, remaining);
          this._markMovementExpected(moveDistance);
          this.x += moveDir.x * moveDistance;
          this.y += moveDir.y * moveDistance;
          this._applyBoundaries(canvas);
          this.rallyArrived = false;
        } else {
          this.x = this.rallyTarget.x;
          this.y = this.rallyTarget.y;
          this.facingX = 0;
          this.facingY = 1;
          this.rallyArrived = true;
        }
      }
      return;
    }

    if (this.marchWaypointIndex < this.marchWaypoints.length) {
      const waypoint = this.marchWaypoints[this.marchWaypointIndex];
      const remaining = Math.hypot(waypoint.x - this.x, waypoint.y - this.y);
      this.target = null;
      this.fireTimer = 0;
      this.state = SOLDIER_STATE.MOVING;

      if (remaining <= 4) {
        this.x = waypoint.x;
        this.y = waypoint.y;
        this.marchWaypointIndex += 1;
        if (this.marchWaypointIndex >= this.marchWaypoints.length) {
          this.deploymentMarchActive = false;
          this.regionArrived = true;
        }
      } else {
        const moveDir = this._calculateMoveDirection(waypoint.x, waypoint.y, soldiers);
        this._updateFacingToward(this.x + moveDir.x, this.y + moveDir.y);
        const moveDistance = Math.min(this.speed * deltaTime, remaining);
        this._markMovementExpected(moveDistance);
        this.x += moveDir.x * moveDistance;
        this.y += moveDir.y * moveDistance;
        this._applyBoundaries(canvas);
      }
      return;
    }

    this.deploymentMarchActive = false;

    // 기지 정지선에 도착했더라도 전투 로직은 계속 수행해야 한다.
    // ARRIVED는 이동만 막는 상태이며, 타겟 탐색과 공격을 중단하는 상태가 아니다.
    const isAtBaseStop = this.state === SOLDIER_STATE.ARRIVED;
    const wasAiming = this.state === SOLDIER_STATE.AIMING;

    this._updateTarget(deltaTime, soldiers);

    if (this.target) {
      this._updateFacingToward(this.target.x, this.target.y);
      const distanceToTarget = this._surfaceDistanceTo(this.target);

      if (distanceToTarget <= this.attackRange) {
        // Attack Range 안 - 멈추고 조준한다. 공격(피격)은 아직 구현하지 않는다.
        // 사거리 경계에서 AIMING/MOVING이 짧게 바뀌더라도 연사 누적값을 유지한다.
        // 그래야 다시 조준할 때 매번 처음부터 기다리며 공격이 끊겨 보이지 않는다.
        this.state = SOLDIER_STATE.AIMING;
        this._updateFireTimer(deltaTime, game);
        return;
      }

      // 일반 전선 병사는 정지선을 유지하지만, 자동 전투 병사는 대기 위치에
      // 도착한 뒤에도 먼 적을 발견하면 즉시 그 적을 향해 다시 이동한다.
      if (isAtBaseStop && !this.globalEnemySearch) {
        this.state = SOLDIER_STATE.ARRIVED;
        return;
      }

      // Attack Range까지 Target을 향해 계속 접근한다 (Front Line처럼 멈추지 않음).
      this.state = SOLDIER_STATE.MOVING;
      const moveDir = this._calculateMoveDirection(
        this.target.x,
        this.target.y,
        soldiers
      );

      // 한 프레임 이동량이 남은 교전 거리보다 커도 적을 지나치거나
      // 공격 사거리 안쪽으로 깊게 파고들지 않도록 이동량을 제한한다.
      const desiredAdvance = Math.max(
        0,
        distanceToTarget - this.attackRange
      );
      const moveDistance = Math.min(this.speed * deltaTime, desiredAdvance);
      this._markMovementExpected(moveDistance);
      this.x += moveDir.x * moveDistance;
      this.y += moveDir.y * moveDistance;

      this._applyBoundaries(canvas);
      this._checkArrival();
      return;
    }

    // 기지 도착 후에도 적 탐색은 계속하지만, 적이 없으면 정지한다.
    if (isAtBaseStop) {
      this.state = SOLDIER_STATE.ARRIVED;
      return;
    }

    // Target이 없으면 전선 방향의 실제 2D 정지 지점으로 이동한다.
    this.state = SOLDIER_STATE.MOVING;
    const moveDir = this._calculateMoveDirection(this.stopX, this.stopY, soldiers);
    this._updateFacingToward(this.x + moveDir.x, this.y + moveDir.y);
    const remaining = Math.hypot(this.stopX - this.x, this.stopY - this.y);
    const moveDistance = Math.min(this.speed * deltaTime, remaining);
    this._markMovementExpected(moveDistance);
    this.x += moveDir.x * moveDistance;
    this.y += moveDir.y * moveDistance;

    this._applyBoundaries(canvas);
    this._checkArrival();
  }

  /**
   * AIMING 상태에서 연사 Timer를 누적하고, 간격(FIRE_INTERVAL)에 도달하면
   * 총알 발사를 요청한다. setInterval을 사용하지 않고 deltaTime을 누적한다.
   */
  _updateFireTimer(deltaTime, game) {
    if (!this._isValidTarget(this.target)) {
      this.clearTarget(this.target);
      return;
    }

    if (this.isReloading || this.ammo <= 0) {
      this.isReloading = true;
      this.fireTimer = 0;
      return;
    }

    this.fireTimer += deltaTime;

    if (this.fireTimer >= this.fireInterval) {
      this.fireTimer -= this.fireInterval;
      this._requestFireBullet(game);
    }
  }

  /**
   * 총알 생성을 Game에 요청한다. Soldier는 Bullet을 직접 생성하지 않고
   * Game.spawnBullet(...)만 호출하며, 자신의 공격력(attackDamage)만 전달한다.
   * 실제 damage 저장과 판정 결과 처리는 Bullet/Game이 담당한다.
   */
  _requestFireBullet(game) {
    if (!game || typeof game.spawnBullet !== "function") return;
    if (!this._isValidTarget(this.target)) {
      this.clearTarget(this.target);
      return;
    }

    // 발사 직전 실제 Target 위치를 다시 바라보게 하여 이동 중인 적에게
    // 이전 프레임 방향으로 허공 사격하는 현상을 줄인다.
    this._updateFacingToward(this.target.x, this.target.y);

    const muzzleX = this.x + this.facingX * this.radius;
    const muzzleY = this.y + this.facingY * this.radius;

    this.ammo = Math.max(0, this.ammo - 1);
    if (this.ammo <= 0) {
      this.isReloading = true;
      // 전투 도중 탄약이 떨어졌다고 기지까지 집단 복귀하면 방어선이 한꺼번에 비게 된다.
      // 양 진영 모두 현재 위치에서 재장전하도록 통일한다.
      this.isResupplying = false;
      this.resupplyAtBase = false;
      this.reloadTimer = 0;
    }

    game.spawnBullet(
      muzzleX,
      muzzleY,
      this.facingX,
      this.facingY,
      this.team,
      this,
      this.attackDamage
    );
  }

  /**
   * 현재 Target은 매 프레임 유효성을 검사하고, 추격 중에도 가까운 적을 주기적으로
   * 재평가한다. 근거리 위협은 즉시, 일반 표적은 일정 거리 이득이 있을 때 교체한다.
   */
  _updateTarget(deltaTime, entities) {
    if (this.target && !this._isValidTarget(this.target, entities, true)) {
      this.clearTarget(this.target);
    }

    // 살아 있는 적 병사는 항상 기지보다 우선한다. 공격 사거리보다 조금 넓은
    // 근거리 위협권을 별도로 두어, 바로 옆을 지나가는 적을 무시한 채 먼 적만
    // 계속 쫓는 현상을 막는다.
    const searchRange = this.globalEnemySearch
      ? Infinity
      : SOLDIER_COMBAT_CONFIG.DETECTION_RANGE;
    const closeThreatRange = this.attackRange *
      SOLDIER_COMBAT_CONFIG.CLOSE_THREAT_RANGE_MULTIPLIER;
    const immediateTarget = this._findNearestEnemy(
      entities,
      closeThreatRange
    );

    if (immediateTarget && immediateTarget !== this.target) {
      const currentDistance = this._isValidTarget(this.target)
        ? this._surfaceDistanceTo(this.target)
        : Infinity;
      const immediateDistance = this._surfaceDistanceTo(immediateTarget);
      const currentIsClose = currentDistance <= closeThreatRange;
      const shouldSwitchCloseThreat =
        !currentIsClose ||
        immediateDistance < currentDistance * SOLDIER_COMBAT_CONFIG.CLOSE_THREAT_SWITCH_RATIO;

      if (shouldSwitchCloseThreat) {
        this.target = immediateTarget;
        this.targetSearchTimer = 0;
        return;
      }
    }

    if (this.target instanceof Base) {
      const nearbySoldier = this._findNearestEnemy(
        entities,
        searchRange
      );
      if (nearbySoldier) {
        this.target = nearbySoldier;
        this.targetSearchTimer = 0;
        return;
      }
    }

    if (this.target instanceof Soldier) {
      this.targetSearchTimer += Math.max(0, deltaTime);
      if (this.targetSearchTimer >= SOLDIER_COMBAT_CONFIG.TARGET_REEVALUATE_INTERVAL) {
        this.targetSearchTimer %= SOLDIER_COMBAT_CONFIG.TARGET_REEVALUATE_INTERVAL;
        const nearer = this._findNearestEnemy(entities, searchRange);
        if (nearer && nearer !== this.target) {
          const currentDistance = this._surfaceDistanceTo(this.target);
          const nearerDistance = this._surfaceDistanceTo(nearer);
          if (nearerDistance < currentDistance * SOLDIER_COMBAT_CONFIG.TARGET_SWITCH_RATIO) {
            this.target = nearer;
          }
        }
      }
      return;
    }

    if (this.target) {
      this.targetSearchTimer = 0;
      return;
    }

    this.targetSearchTimer += Math.max(0, deltaTime);
    if (
      this.targetSearchTimer < SOLDIER_COMBAT_CONFIG.TARGET_SEARCH_INTERVAL
    ) {
      return;
    }

    this.targetSearchTimer %= SOLDIER_COMBAT_CONFIG.TARGET_SEARCH_INTERVAL;
    this.target = this._findNearestEnemy(
      entities,
      searchRange
    );

    // 탐지 범위 안에 살아 있는 적 병사가 없고 기지가 공격 사거리 안이면
    // 기지를 후순위 Target으로 선택한다. 멀리서 기지를 선점하지 않으므로
    // 이동 중에는 기존 전선/병사 탐색 로직이 그대로 유지된다.
    if (
      !this.target &&
      this._isValidTarget(this.targetBase) &&
      this._surfaceDistanceTo(this.targetBase) <=
        this.attackRange
    ) {
      this.target = this.targetBase;
      this.fireTimer = 0;
    }
  }

  /**
   * Target으로 사용할 수 있는 살아 있는 적인지 확인한다.
   * requireDetectionRange=true이면 현재 soldiers 배열 포함 여부와 탐지 범위도 검사한다.
   */
  _isValidTarget(target, entities = null, requireDetectionRange = false) {
    if (target instanceof Soldier) {
      if (!target.isActive || target.isDead || target.hp <= 0) return false;
      if (target.team === this.team || target === this) return false;
      if (target.frontId !== this.frontId) return false;
      if (entities && !entities.includes(target)) return false;

      if (
        requireDetectionRange &&
        !this.globalEnemySearch &&
        this._surfaceDistanceTo(target) >
          SOLDIER_COMBAT_CONFIG.DETECTION_RANGE + SOLDIER_COMBAT_CONFIG.TARGET_MEMORY_PADDING
      ) {
        return false;
      }

      return true;
    }

    if (target instanceof Base) {
      if (!target.isActive || target.isDestroyed || target.hp <= 0) return false;
      return this._isEnemyBase(target);
    }

    return false;
  }

  /**
   * Base의 문자열 진영(ally/enemy)을 Soldier의 TEAM 값과 비교한다.
   */
  _isEnemyBase(base) {
    const ownBaseTeam =
      this.team === TEAM.FRIENDLY ? "ally" : "enemy";
    return base.team !== ownBaseTeam;
  }

  /**
   * 지정한 Target을 현재 추적 중일 때만 안전하게 해제한다.
   * Game이 적 사망 직후 다른 병사들의 참조를 정리할 때도 사용한다.
   */
  clearTarget(target = this.target) {
    if (!this.target || this.target !== target) return;

    this.target = null;
    this.targetSearchTimer = 0;
    this.fireTimer = 0;
    this.targetSearchTimer = SOLDIER_COMBAT_CONFIG.TARGET_SEARCH_INTERVAL;

    if (!this.isDead && this.state === SOLDIER_STATE.AIMING) {
      this.state = SOLDIER_STATE.MOVING;
    }
  }

  /**
   * Detection Range 안에서 가장 가까운 적 병사를 찾는다. 없으면 null.
   */
  _findNearestEnemy(entities, maxRange) {
    let nearest = null;
    let bestScore = Infinity;

    for (const other of entities) {
      if (
        !(other instanceof Soldier) ||
        !other.isActive ||
        other.isDead ||
        other.team === this.team ||
        other.frontId !== this.frontId
      ) {
        continue;
      }

      const distance = this._surfaceDistanceTo(other);
      if (distance > maxRange) continue;

      let score = distance;
      if (this.defenseCenter && this.frontId === "arena") {
        const baseDistance = Math.hypot(
          other.x - this.defenseCenter.x,
          other.y - this.defenseCenter.y
        );

        // 3명 중 약 1명은 본부 주변 상시 방어대로 남는다. 먼 적을 쫓아 전 병력이
        // 한쪽으로 몰리는 대신, 적이 방어권 안에 들어오면 즉시 요격한다.
        if (this.innerGuard && baseDistance > SOLDIER_COMBAT_CONFIG.INNER_GUARD_RADIUS) {
          continue;
        }

        const assignedAttackers = Number.isFinite(other.assignedAttackerCount)
          ? other.assignedAttackerCount
          : 0;

        score += baseDistance * SOLDIER_COMBAT_CONFIG.BASE_THREAT_WEIGHT;
        score += assignedAttackers * SOLDIER_COMBAT_CONFIG.TARGET_SATURATION_PENALTY;
      }

      if (score < bestScore) {
        bestScore = score;
        nearest = other;
      }
    }

    return nearest;
  }

  /**
   * 다른 엔티티와의 표면(반지름을 제외한) 거리를 계산한다.
   */
  _surfaceDistanceTo(other) {
    if (other instanceof Base) {
      const halfWidth = other.width / 2;
      const halfHeight = other.height / 2;
      const closestX = Math.max(
        other.x - halfWidth,
        Math.min(this.x, other.x + halfWidth)
      );
      const closestY = Math.max(
        other.y - halfHeight,
        Math.min(this.y, other.y + halfHeight)
      );
      return Math.max(
        0,
        Math.hypot(this.x - closestX, this.y - closestY) - this.radius
      );
    }

    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.hypot(dx, dy) - (this.radius + other.radius);
  }

  /**
   * 모든 엔티티 중 적 팀 병사와의 표면 간 최단 거리를 계산한다.
   * 적이 없으면 Infinity를 반환한다.
   */
  _findNearestEnemyDistance(entities) {
    let minDistance = Infinity;

    for (const other of entities) {
      if (
        !(other instanceof Soldier) ||
        !other.isActive ||
        other.isDead ||
        other.team === this.team ||
        other.frontId !== this.frontId
      ) {
        continue;
      }

      const distance = this._surfaceDistanceTo(other);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance;
  }

  /**
   * 목표 지점(정지선/이동 라인, 또는 Target 위치)과 separation 벡터를 합성하여
   * 정규화된 최종 이동 방향을 계산한다. Target 추격/기본 이동 모두 이 함수를 재사용한다.
   */
  _beginMovementFrame(deltaTime, entities, canvas) {
    const moved = Math.hypot(this.x - this._lastMovementX, this.y - this._lastMovementY);
    if (this._movementExpectedLastFrame && moved < SOLDIER_MOVEMENT_CONFIG.STUCK_CHECK_DISTANCE) {
      this._stuckTimer += Math.max(0, deltaTime);
    } else if (moved >= SOLDIER_MOVEMENT_CONFIG.STUCK_CHECK_DISTANCE) {
      this._stuckTimer = Math.max(0, this._stuckTimer - Math.max(0, deltaTime) * 2.5);
    } else {
      this._stuckTimer = 0;
    }

    if (this._stuckTimer >= SOLDIER_MOVEMENT_CONFIG.STUCK_RECOVERY_TIME) {
      this._recoverFromStuck(entities, canvas);
      this._stuckTimer = 0;
      this._unstickSide *= -1;
    }

    this._lastMovementX = this.x;
    this._lastMovementY = this.y;
    this._movementExpectedLastFrame = false;
  }

  _markMovementExpected(moveDistance) {
    if (moveDistance > SOLDIER_MOVEMENT_CONFIG.STUCK_CHECK_DISTANCE) {
      this._movementExpectedLastFrame = true;
    }
  }

  _recoverFromStuck(entities, canvas) {
    if (this.isDead || this.state === SOLDIER_STATE.AIMING) return;

    let destination = this.target && this._isValidTarget(this.target)
      ? this.target
      : { x: this.stopX, y: this.stopY };
    if (this.isResupplying && this.homeBase?.isActive && !this.homeBase?.isDestroyed) {
      destination = this.homeBase;
    }

    const dx = destination.x - this.x;
    const dy = destination.y - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    const forwardX = dx / distance;
    const forwardY = dy / distance;
    const sideX = -forwardY * this._unstickSide;
    const sideY = forwardX * this._unstickSide;
    const nudge = Math.max(SOLDIER_MOVEMENT_CONFIG.STUCK_NUDGE_DISTANCE, this.radius * 0.8);

    this.x += (forwardX * 0.45 + sideX * 0.9) * nudge;
    this.y += (forwardY * 0.45 + sideY * 0.9) * nudge;
    this._applyBoundaries(canvas);
    this.targetSearchTimer = SOLDIER_COMBAT_CONFIG.TARGET_SEARCH_INTERVAL;
    if (this.target && !this._isValidTarget(this.target, entities, false)) this.clearTarget(this.target);
    if (!this.isResupplying) this.state = SOLDIER_STATE.MOVING;
  }

  _calculateMoveDirection(targetX, targetY, entities) {
    const baseDx = targetX - this.x;
    const baseDy = targetY - this.y;
    const baseDist = Math.hypot(baseDx, baseDy);
    if (baseDist < 0.001) return { x: 0, y: 0 };

    const baseX = baseDx / baseDist;
    const baseY = baseDy / baseDist;
    let dirX = baseX;
    let dirY = baseY;

    const separation = this._calculateSeparation(entities);
    const separationLength = Math.hypot(separation.x, separation.y);
    if (separationLength > 0.001) {
      const cappedInfluence = Math.min(
        SOLDIER_MOVEMENT_CONFIG.MAX_SEPARATION_INFLUENCE,
        separationLength * SOLDIER_MOVEMENT_CONFIG.SEPARATION_STRENGTH
      );
      dirX += (separation.x / separationLength) * cappedInfluence;
      dirY += (separation.y / separationLength) * cappedInfluence;
    }

    const forwardComponent = dirX * baseX + dirY * baseY;
    if (forwardComponent < SOLDIER_MOVEMENT_CONFIG.MIN_FORWARD_COMPONENT) {
      const correction = SOLDIER_MOVEMENT_CONFIG.MIN_FORWARD_COMPONENT - forwardComponent;
      dirX += baseX * correction;
      dirY += baseY * correction;
    }

    const finalDist = Math.hypot(dirX, dirY);
    if (finalDist < 0.001) return { x: baseX, y: baseY };
    return { x: dirX / finalDist, y: dirY / finalDist };
  }

  /**
   * 같은 팀 병사와의 거리를 확인하여 약한 밀어내기 벡터를 계산한다.
   * 적군과는 separation 하지 않는다 (같은 팀끼리만).
   */
  _calculateSeparation(entities) {
    let pushX = 0;
    let pushY = 0;
    const sepRadius = SOLDIER_MOVEMENT_CONFIG.SEPARATION_RADIUS;

    for (const other of entities) {
      if (other === this || !(other instanceof Soldier)) continue;
      if (!other.isActive || other.isDead) continue;
      if (other.team !== this.team) continue;

      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < sepRadius) {
        const weight = (sepRadius - dist) / sepRadius; // 가까울수록 강하게
        pushX += (dx / dist) * weight;
        pushY += (dy / dist) * weight;
      }
    }

    return { x: pushX, y: pushY };
  }

  /**
   * facingX/Y(조준·진행 방향)를 목표 지점을 바라보도록 정규화하여 갱신한다.
   */
  _updateFacingToward(targetX, targetY) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0) {
      this.facingX = dx / dist;
      this.facingY = dy / dist;
    }
  }

  /**
   * 화면 위/아래/좌/우 밖으로 나가지 않도록, 그리고 목표 기지의 정지선을
   * 넘지 않도록 위치를 제한한다.
   */
  _applyBoundaries(canvas) {
    const padding = SOLDIER_MOVEMENT_CONFIG.CANVAS_PADDING;
    const minY = padding + this.radius;
    const maxY = canvas.height - padding - this.radius;
    const minX = padding + this.radius;
    const maxX = canvas.width - padding - this.radius;
    this.y = Math.min(Math.max(this.y, minY), maxY);
    this.x = Math.min(Math.max(this.x, minX), maxX);
  }

  /** 목표 기지 앞의 2D 정지 지점에 도달했는지 확인한다. */
  _checkArrival() {
    const remaining = Math.hypot(this.stopX - this.x, this.stopY - this.y);
    if (remaining <= 1.5) {
      this.x = this.stopX;
      this.y = this.stopY;
      this.state = SOLDIER_STATE.ARRIVED;
    }
  }

  /**
   * Game의 프레임 후처리에서 같은 진영 병사와의 실제 겹침을 해소한다.
   * 이동 방향 계산의 separation만으로 남을 수 있는 겹침을 위치 보정으로 정리한다.
   */
  resolveSpacingAgainst(other, canvas) {
    if (!(other instanceof Soldier) || other === this) return;
    if (!this.isActive || this.isDead || !other.isActive || other.isDead) return;
    if (other.team !== this.team) return;
    if (this.awaitingOrder || other.awaitingOrder) return;

    let dx = this.x - other.x;
    let dy = this.y - other.y;
    let distance = Math.hypot(dx, dy);
    const minDistance =
      this.radius + other.radius + SOLDIER_MOVEMENT_CONFIG.MIN_ALLY_GAP;

    if (distance >= minDistance) return;

    // 완전히 같은 위치일 때도 안정적으로 서로 반대 방향으로 분리한다.
    if (distance < 0.001) {
      dx = this.perpX || 1;
      dy = this.perpY || (this.laneOffset <= other.laneOffset ? -1 : 1);
      distance = Math.hypot(dx, dy);
    }

    const overlap = minDistance - distance;
    const correction =
      overlap * SOLDIER_MOVEMENT_CONFIG.SPACING_CORRECTION * 0.5;
    const nx = dx / distance;
    const ny = dy / distance;

    this.x += nx * correction;
    this.y += ny * correction;
    other.x -= nx * correction;
    other.y -= ny * correction;

    this._applyBoundaries(canvas);
    other._applyBoundaries(canvas);
  }

  _updateResupply(deltaTime, soldiers, canvas) {
    const base = this.homeBase;
    if (!base?.isActive || base.isDestroyed) {
      this.isResupplying = false;
      this.resupplyAtBase = false;
      return;
    }

    this.target = null;
    this.fireTimer = 0;
    this.state = SOLDIER_STATE.RESUPPLYING;

    const dx = base.x - this.x;
    const dy = base.y - this.y;
    const distance = Math.hypot(dx, dy);
    const baseRadius = Math.max(base.width || 0, base.height || 0) * 0.5;
    const arrivalDistance = baseRadius + this.radius + 10;

    if (distance > arrivalDistance) {
      this.resupplyAtBase = false;
      const moveDir = this._calculateMoveDirection(base.x, base.y, soldiers);
      this._updateFacingToward(this.x + moveDir.x, this.y + moveDir.y);
      const moveDistance = Math.min(this.speed * 0.92 * deltaTime, distance - arrivalDistance);
      this._markMovementExpected(moveDistance);
      this.x += moveDir.x * moveDistance;
      this.y += moveDir.y * moveDistance;
      this._applyBoundaries(canvas);
      return;
    }

    this.resupplyAtBase = true;
    this.reloadTimer += Math.max(0, deltaTime);
    if (this.reloadTimer >= this.reloadDuration) {
      this.ammo = this.maxAmmo;
      this.reloadTimer = 0;
      this.isReloading = false;
      this.isResupplying = false;
      this.resupplyAtBase = false;
      this.targetSearchTimer = SOLDIER_COMBAT_CONFIG.TARGET_SEARCH_INTERVAL;
      this.state = SOLDIER_STATE.MOVING;
    }
  }

  _updateAmmoState(deltaTime) {
    if (!this.isReloading || this.isResupplying) return;
    this.reloadTimer += Math.max(0, deltaTime);
    if (this.reloadTimer >= this.reloadDuration) {
      this.ammo = this.maxAmmo;
      this.reloadTimer = 0;
      this.isReloading = false;
    }
  }

  getAmmoRatio() {
    if (!this.maxAmmo) return 0;
    return Math.max(0, Math.min(1, this.ammo / this.maxAmmo));
  }

  /**
   * amount만큼 체력을 감소시킨다. hp가 0 이하가 되면 die()를 호출한다.
   * 이미 죽었거나 비활성화된 병사는 추가 데미지를 받지 않는다.
   */
  takeDamage(amount, hitDirectionX = 0, hitDirectionY = 0) {
    if (this.isDead || !this.isActive) return;

    if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
      return;
    }

    const appliedDamage = Math.max(0, amount * this.defenseMultiplier);
    this.hp = Math.max(0, this.hp - appliedDamage);
    this._startHitFeedback(hitDirectionX, hitDirectionY);

    if (this.hp <= 0) {
      this.die();
    }
  }

  /**
   * 총알 진행 방향을 기준으로 짧은 피격 플래시와 미세 넉백을 시작한다.
   * 방향값이 유효하지 않아도 플래시와 HP바 반응은 정상 작동한다.
   */
  _startHitFeedback(hitDirectionX, hitDirectionY) {
    this.hitFlashTimer = SOLDIER_HIT_FEEDBACK_CONFIG.FLASH_DURATION;
    this.hitImpactTimer = SOLDIER_HIT_FEEDBACK_CONFIG.IMPACT_DURATION;
    this.hpBarPulseTimer = SOLDIER_HIT_FEEDBACK_CONFIG.HP_BAR_PULSE_DURATION;

    const dx = Number.isFinite(hitDirectionX) ? hitDirectionX : 0;
    const dy = Number.isFinite(hitDirectionY) ? hitDirectionY : 0;
    const length = Math.hypot(dx, dy);

    if (length > 0) {
      this.lastHitDirectionX = dx / length;
      this.lastHitDirectionY = dy / length;
      this.knockbackVelocityX =
        this.lastHitDirectionX * SOLDIER_HIT_FEEDBACK_CONFIG.KNOCKBACK_SPEED;
      this.knockbackVelocityY =
        this.lastHitDirectionY * SOLDIER_HIT_FEEDBACK_CONFIG.KNOCKBACK_SPEED;
    }
  }

  /**
   * 피격 타이머와 넉백 속도를 갱신한다. 넉백은 지수 감쇠하고 기존 화면/기지
   * 경계를 그대로 적용하여 병사가 전선을 크게 이탈하지 않게 한다.
   */
  _updateHitFeedback(deltaTime, canvas) {
    const dt = Math.max(0, deltaTime);
    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    this.hitImpactTimer = Math.max(0, this.hitImpactTimer - dt);
    this.hpBarPulseTimer = Math.max(0, this.hpBarPulseTimer - dt);

    if (this.knockbackVelocityX !== 0 || this.knockbackVelocityY !== 0) {
      this.x += this.knockbackVelocityX * dt;
      this.y += this.knockbackVelocityY * dt;

      const damping = Math.exp(
        -SOLDIER_HIT_FEEDBACK_CONFIG.KNOCKBACK_DAMPING * dt
      );
      this.knockbackVelocityX *= damping;
      this.knockbackVelocityY *= damping;

      if (Math.hypot(this.knockbackVelocityX, this.knockbackVelocityY) < 0.5) {
        this.knockbackVelocityX = 0;
        this.knockbackVelocityY = 0;
      }

      this._applyBoundaries(canvas);
    }
  }

  /**
   * 병사를 사망 상태로 전환한다. 여러 번 호출되어도 최초 한 번만 처리한다.
   * 사망 즉시 이동/공격/Target 탐색을 멈추되, 시체 렌더링을 위해 잠시 활성 상태를 유지한다.
   */
  die() {
    if (this.isDead) return;

    this.hp = 0;
    this.isDead = true;
    this.deathTimer = 0;
    this.state = SOLDIER_STATE.DEAD;
    this.target = null;
    this.targetSearchTimer = 0;
    this.fireTimer = 0;
    this.hitFlashTimer = 0;
    this.hitImpactTimer = 0;
    this.hpBarPulseTimer = 0;
    this.knockbackVelocityX = 0;
    this.knockbackVelocityY = 0;
  }

  /**
   * 시체 유지 시간을 누적하고, 시간이 끝나면 Game 제거 대상이 되도록 비활성화한다.
   */
  _updateDeath(deltaTime) {
    this.deathTimer += Math.max(0, deltaTime);

    if (this.deathTimer >= SOLDIER_DEATH_CONFIG.CORPSE_DURATION) {
      this.isActive = false;
    }
  }

  /**
   * amount만큼 체력을 회복시킨다. maxHp를 초과하지 않는다.
   * 잘못된 값은 안전하게 무시한다. 실제 회복 기능/UI는 아직 없다.
   */
  heal(amount) {
    if (this.isDead || !this.isActive) return;

    if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
      return;
    }
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /**
   * 0~1 범위로 안전하게 제한된 체력 비율을 반환한다.
   * maxHp가 0 이하인 비정상 상태에서도 NaN이 되지 않도록 방어한다.
   */
  getHpRatio() {
    if (!this.maxHp || this.maxHp <= 0) return 0;
    const ratio = this.hp / this.maxHp;
    return Math.min(1, Math.max(0, ratio));
  }

  /**
   * 체력이 0인지 여부를 반환한다.
   */
  isHpEmpty() {
    return this.hp <= 0;
  }

  render(ctx) {
    if (this.isDead) {
      this._renderCorpse(ctx);
      return;
    }

    const spriteRendered = this._renderBody(ctx);
    this._renderHitImpact(ctx);
    if (!spriteRendered) {
      this._renderFacingLine(ctx);
    }
    this._renderUnitBadge(ctx);
    this._renderHealthBar(ctx);
    this._renderAmmoBar(ctx);
  }

  /**
   * 병사 몸체(원 또는 사각형)를 그린다.
   */
  _renderBody(ctx) {
    const directionalSprite = this._getDirectionalSprite();

    if (directionalSprite) {
      const size = this._getDirectionalSpriteSize(directionalSprite.image);

      ctx.save();
      ctx.translate(
        this.x,
        this.y + SOLDIER_RENDER_CONFIG.DIRECTIONAL_SPRITE_OFFSET_Y
      );
      ctx.scale(directionalSprite.flipX ? -1 : 1, 1);
      if (this.hitFlashTimer > 0) {
        ctx.filter = "brightness(2.4) saturate(0.35)";
      }
      ctx.drawImage(
        directionalSprite.image,
        -size.width / 2,
        -size.height / 2,
        size.width,
        size.height
      );
      ctx.restore();
      return true;
    }

    const sprite = this._getSprite();

    if (sprite) {
      const facingAngle = Math.atan2(this.facingY, this.facingX);
      const rotation = facingAngle - SOLDIER_RENDER_CONFIG.SPRITE_SOURCE_ANGLE;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(rotation);
      if (this.hitFlashTimer > 0) {
        ctx.filter = "brightness(2.4) saturate(0.35)";
      }
      ctx.drawImage(
        sprite,
        -SOLDIER_RENDER_CONFIG.SPRITE_WIDTH / 2,
        -SOLDIER_RENDER_CONFIG.SPRITE_HEIGHT / 2,
        SOLDIER_RENDER_CONFIG.SPRITE_WIDTH,
        SOLDIER_RENDER_CONFIG.SPRITE_HEIGHT
      );
      ctx.restore();
      return true;
    }

    // 이미지가 아직 로딩되지 않았거나 누락되면 기존 도형으로 표시한다.
    ctx.save();
    ctx.fillStyle = this.hitFlashTimer > 0 ? "#ffffff" : this.color;

    if (this.shape === "circle") {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(
        this.x - this.size / 2,
        this.y - this.size / 2,
        this.size,
        this.size
      );
    }

    ctx.restore();
    return false;
  }

  _renderUnitBadge(ctx) {
    if (this.unitType === "rifle") return;
    const label = this.unitType === "machineGun" ? "MG" : "S";
    const color = this.unitType === "machineGun" ? "#ffd166" : "#9fe4ff";
    const badgeY = this.y - this._getHudTopOffset() + 7;
    ctx.save();
    ctx.fillStyle = "rgba(7, 15, 22, 0.9)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x + 13, badgeY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "bold 7px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, this.x + 13, badgeY + 2.5);
    ctx.restore();
  }

  _renderAmmoBar(ctx) {
    const width = SOLDIER_HP_BAR_CONFIG.WIDTH;
    const height = 3;
    const x = this.x - width / 2;
    const y = this.y - this._getHudTopOffset() + 2;
    ctx.save();
    ctx.fillStyle = "rgba(10, 14, 18, 0.82)";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = this.isResupplying ? "#d8bd67" : this.isReloading ? "#f2b35f" : "#72b9e6";
    const ratio = this.isReloading
      ? Math.max(0, Math.min(1, this.reloadTimer / Math.max(0.001, this.reloadDuration)))
      : this.getAmmoRatio();
    ctx.fillRect(x, y, width * ratio, height);
    ctx.restore();
  }

  /**
   * 현재 facing 벡터를 가장 가까운 8방향으로 양자화한다.
   * 원본은 N/NE/E/SE/S 다섯 장만 사용하고 W 계열은 좌우 반전한다.
   */
  _getDirectionalSprite() {
    if (this.team !== TEAM.FRIENDLY || typeof GameAssets === "undefined") {
      return null;
    }

    const angle = Math.atan2(this.facingY, this.facingX);
    const octant = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
    const directions = [
      { key: "ALLY_SOLDIER_E", flipX: false },  // E
      { key: "ALLY_SOLDIER_SE", flipX: false }, // SE
      { key: "ALLY_SOLDIER_S", flipX: false },  // S
      { key: "ALLY_SOLDIER_SE", flipX: true },  // SW
      { key: "ALLY_SOLDIER_E", flipX: true },   // W
      { key: "ALLY_SOLDIER_NE", flipX: true },  // NW
      { key: "ALLY_SOLDIER_N", flipX: false },  // N
      { key: "ALLY_SOLDIER_NE", flipX: false }, // NE
    ];

    const direction = directions[octant];
    const image = GameAssets.get(direction.key);
    return image ? { image, flipX: direction.flipX } : null;
  }

  /** 원본 이미지 비율을 유지하면서 게임용 표시 크기를 계산한다. */
  _getDirectionalSpriteSize(image) {
    const height = SOLDIER_RENDER_CONFIG.DIRECTIONAL_SPRITE_HEIGHT;
    const sourceWidth = image.naturalWidth || image.width || 1;
    const sourceHeight = image.naturalHeight || image.height || 1;
    const width = Math.min(
      SOLDIER_RENDER_CONFIG.DIRECTIONAL_SPRITE_MAX_WIDTH,
      height * (sourceWidth / sourceHeight)
    );
    return { width, height };
  }

  /** 체력/탄약 UI가 큰 방향 스프라이트 머리 위에 표시되도록 높이를 보정한다. */
  _getHudTopOffset() {
    if (this._getDirectionalSprite()) {
      return SOLDIER_RENDER_CONFIG.DIRECTIONAL_SPRITE_HEIGHT / 2 + 8;
    }
    return this.radius + SOLDIER_HP_BAR_CONFIG.OFFSET_Y;
  }

  _getSprite() {
    if (typeof GameAssets === "undefined") return null;
    return GameAssets.get(
      this.team === TEAM.FRIENDLY ? "ALLY_SOLDIER" : "ENEMY_SOLDIER"
    );
  }

  /**
   * 피격 순간 병사 뒤쪽에 작게 퍼지는 충격 원을 그린다.
   */
  _renderHitImpact(ctx) {
    if (this.hitImpactTimer <= 0) return;

    const duration = SOLDIER_HIT_FEEDBACK_CONFIG.IMPACT_DURATION;
    const progress = 1 - this.hitImpactTimer / duration;
    const radius = 2 + progress * SOLDIER_HIT_FEEDBACK_CONFIG.IMPACT_MAX_RADIUS;

    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      this.x - this.lastHitDirectionX * this.radius,
      this.y - this.lastHitDirectionY * this.radius,
      radius,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 쓰러진 병사를 납작하고 반투명한 형태로 그린다.
   * 별도 시체 엔티티를 만들지 않아 현재 구조를 유지하면서도 이후 애니메이션 확장이 쉽다.
   */
  _renderCorpse(ctx) {
    const directionalSprite = this._getDirectionalSprite();
    const sprite = this._getSprite();

    ctx.save();
    ctx.globalAlpha = SOLDIER_DEATH_CONFIG.CORPSE_ALPHA;
    ctx.translate(this.x, this.y);

    if (directionalSprite) {
      const size = this._getDirectionalSpriteSize(directionalSprite.image);
      ctx.rotate(Math.PI / 2);
      ctx.scale(directionalSprite.flipX ? -1 : 1, SOLDIER_DEATH_CONFIG.CORPSE_HEIGHT_SCALE);
      ctx.filter = "grayscale(0.55) brightness(0.7)";
      ctx.drawImage(
        directionalSprite.image,
        -size.width / 2,
        -size.height / 2,
        size.width,
        size.height
      );
      ctx.restore();
      return;
    }

    if (sprite) {
      const facingAngle = Math.atan2(this.facingY, this.facingX);
      ctx.rotate(
        facingAngle - SOLDIER_RENDER_CONFIG.SPRITE_SOURCE_ANGLE + Math.PI / 2
      );
      ctx.scale(1, SOLDIER_DEATH_CONFIG.CORPSE_HEIGHT_SCALE);
      ctx.filter = "grayscale(0.55) brightness(0.7)";
      ctx.drawImage(
        sprite,
        -SOLDIER_RENDER_CONFIG.SPRITE_WIDTH / 2,
        -SOLDIER_RENDER_CONFIG.SPRITE_HEIGHT / 2,
        SOLDIER_RENDER_CONFIG.SPRITE_WIDTH,
        SOLDIER_RENDER_CONFIG.SPRITE_HEIGHT
      );
      ctx.restore();
      return;
    }

    ctx.fillStyle = this.color;
    if (this.shape === "circle") {
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        this.size,
        this.size * SOLDIER_DEATH_CONFIG.CORPSE_HEIGHT_SCALE,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else {
      ctx.fillRect(
        -this.size / 2,
        -(this.size * SOLDIER_DEATH_CONFIG.CORPSE_HEIGHT_SCALE) / 2,
        this.size,
        this.size * SOLDIER_DEATH_CONFIG.CORPSE_HEIGHT_SCALE
      );
    }

    ctx.restore();
  }

  /**
   * Target(또는 진행) 방향을 나타내는 짧은 방향선을 그린다.
   * Canvas 회전 없이 몸체 중심에서 facing 벡터 방향으로 선만 그리는 단순한 방식.
   */
  _renderFacingLine(ctx) {
    const length = SOLDIER_RENDER_CONFIG.FACING_LINE_LENGTH;
    const startX = this.x + this.facingX * this.radius;
    const startY = this.y + this.facingY * this.radius;
    const endX = this.x + this.facingX * (this.radius + length);
    const endY = this.y + this.facingY * (this.radius + length);

    ctx.save();
    ctx.strokeStyle = SOLDIER_RENDER_CONFIG.FACING_LINE_COLOR;
    ctx.lineWidth = SOLDIER_RENDER_CONFIG.FACING_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 병사 머리 위에 체력바(배경 + 현재 체력 비율)를 그린다.
   * 팀별 색상 구분 없이 공통 색상을 사용한다.
   */
  _renderHealthBar(ctx) {
    const width = SOLDIER_HP_BAR_CONFIG.WIDTH;
    const height = SOLDIER_HP_BAR_CONFIG.HEIGHT;
    const x = this.x - width / 2;
    const y = this.y - this._getHudTopOffset() - height;
    const ratio = this.getHpRatio();

    ctx.save();

    // 배경 바
    ctx.fillStyle = SOLDIER_HP_BAR_CONFIG.BACKGROUND_COLOR;
    ctx.fillRect(x, y, width, height);

    // 현재 체력 비율 바
    ctx.fillStyle = SOLDIER_HP_BAR_CONFIG.FILL_COLOR;
    ctx.fillRect(x, y, width * ratio, height);

    // 테두리
    ctx.strokeStyle = SOLDIER_HP_BAR_CONFIG.BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    ctx.restore();
  }
}
