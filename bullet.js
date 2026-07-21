"use strict";

/**
 * 총알 관련 설정값. 충돌 판정과 HP 적용은 Game이 담당한다.
 */
const BULLET_CONFIG = {
  SPEED: 320, // 초당 이동 거리 (px/s)
  LIFETIME: 2, // 최대 생존 시간(초) - 초과하면 자동 삭제
  RADIUS: 3,
};

/**
 * 팀별 총알 색상.
 */
const BULLET_COLORS = {
  [TEAM.FRIENDLY]: "#f4d03f", // 노란색
  [TEAM.ENEMY]: "#e67e22", // 주황색
};

/**
 * 병사가 바라보는 방향으로 직선 이동하는 총알 클래스. Entity를 상속한다.
 * 포물선/중력/회전은 없으며, 아무것과도 충돌하지 않고 통과한다.
 * Canvas 밖으로 나가거나 lifeTime을 초과하면 비활성화(isActive=false)되며,
 * 실제 배열에서 제거하는 것은 Game이 담당한다.
 */
class Bullet extends Entity {
  /**
   * @param {number} x - 발사 시작 x 좌표
   * @param {number} y - 발사 시작 y 좌표
   * @param {number} dirX - 정규화된 이동 방향 x
   * @param {number} dirY - 정규화된 이동 방향 y
   * @param {string} team - TEAM.FRIENDLY | TEAM.ENEMY
   * @param {Soldier} owner - 이 총알을 발사한 병사
   * @param {number} damage - 명중 시 Game이 적용할 데미지
   */
  constructor(x, y, dirX, dirY, team, owner, damage) {
    super(x, y);

    this.direction = { x: 0, y: 0 };
    this.reset(x, y, dirX, dirY, team, owner, damage);
  }

  reset(x, y, dirX, dirY, team, owner, damage) {
    this.x = x;
    this.y = y;
    this.previousX = x;
    this.previousY = y;
    this.direction.x = dirX;
    this.direction.y = dirY;
    this.speed = BULLET_CONFIG.SPEED;
    this.team = team;
    this.radius = BULLET_CONFIG.RADIUS;
    this.color = BULLET_COLORS[team];
    this.owner = owner;
    this.damage = Number.isFinite(damage) && damage >= 0 ? damage : 0;
    this.lifeTime = 0;
    this.hasHit = false;
    this.isActive = true;
    this.frontId = owner?.frontId || null;
    return this;
  }

  /**
   * @param {number} deltaTime - 이전 프레임과의 시간 차이(초)
   * @param {HTMLCanvasElement} canvas - 화면 밖 판정을 위한 캔버스
   */
  update(deltaTime, canvas) {
    if (!this.isActive) return;

    this.previousX = this.x;
    this.previousY = this.y;
    this.x += this.direction.x * this.speed * deltaTime;
    this.y += this.direction.y * this.speed * deltaTime;

    this.lifeTime += deltaTime;

    if (this._isOutOfBounds(canvas) || this.lifeTime >= BULLET_CONFIG.LIFETIME) {
      this.isActive = false;
    }
  }


  /**
   * 최초 명중 시에만 true를 반환하고 총알을 즉시 비활성화한다.
   * Game은 이 반환값을 이용해 한 총알이 한 번만 데미지를 주도록 보장한다.
   */
  markHit() {
    if (!this.isActive || this.hasHit) return false;

    this.hasHit = true;
    this.isActive = false;
    return true;
  }

  /**
   * 총알이 Canvas 영역을 완전히 벗어났는지 확인한다.
   */
  _isOutOfBounds(canvas) {
    return (
      this.x < -this.radius ||
      this.x > canvas.width + this.radius ||
      this.y < -this.radius ||
      this.y > canvas.height + this.radius
    );
  }

  render(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
