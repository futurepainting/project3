"use strict";

/**
 * 기지 관련 설정값. 하드코딩 방지를 위해 상수로 관리한다.
 */
const BASE_CONFIG = {
  WIDTH: 80,
  HEIGHT: 140,
  MAX_HP: 1000,
  ALLY_COLOR: "#2b6cb0",
  ENEMY_COLOR: "#c0392b",
  DESTROYED_COLOR: "#4a4a4a",
  CAPTURED_COLOR: "#327a4a",
  MARGIN_FROM_EDGE: 40, // 화면 가장자리로부터 떨어진 거리
  HEALTH_BAR_WIDTH: 92,
  HEALTH_BAR_HEIGHT: 9,
  HEALTH_BAR_OFFSET_Y: 16,
  SPRITE_WIDTH: 150,
  SPRITE_HEIGHT: 139,
};

/**
 * 아군/적 기지를 표현하는 클래스. Entity를 상속한다.
 * 기지는 자신의 HP와 파괴 상태를 관리하고, 전투 종료 판단은 Game이 담당한다.
 */
class Base extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {"ally"|"enemy"} team
   */
  constructor(x, y, team, role = team === "ally" ? "hq" : "outpost") {
    super(x, y);
    this.team = team;
    this.role = role; // hq | outpost
    this.visualKey = role === "hq" ? "hq" : "outpost";
    this.visualMeta = getVisualMetadata(this.visualKey);
    this.footprint = this.visualMeta?.footprint || null;
    this.entrance = this.visualMeta?.entrance || null;
    this.workPoints = this.visualMeta?.workPoints || [];
    this.width = BASE_CONFIG.WIDTH;
    this.height = BASE_CONFIG.HEIGHT;
    this.color =
      team === "ally" ? BASE_CONFIG.ALLY_COLOR : BASE_CONFIG.ENEMY_COLOR;

    this.maxHp = BASE_CONFIG.MAX_HP;
    this.hp = this.maxHp;
    this.isDestroyed = false;
    this.isCaptured = false;
    this.capturedBy = null;
    this.level = 1;
  }

  update(deltaTime) {
    // 현재 단계에서는 지속적으로 갱신할 기지 로직이 없다.
    // 이후 파괴 애니메이션이나 재생 효과가 추가되면 이곳에서 처리한다.
  }

  /**
   * 기지에 데미지를 적용한다.
   * 이미 파괴된 기지와 유효하지 않은 데미지는 무시한다.
   * @param {number} damage
   * @returns {boolean} 실제로 데미지가 적용되었는지 여부
   */
  takeDamage(damage) {
    if (this.isDestroyed) return false;
    if (!Number.isFinite(damage) || damage <= 0) return false;

    this.hp = Math.max(0, this.hp - damage);

    if (this.hp <= 0) {
      this.destroy();
    }

    return true;
  }

  /**
   * 기지를 파괴 상태로 전환한다. 중복 호출되어도 안전하다.
   */
  destroy() {
    if (this.isDestroyed) return;

    this.hp = 0;
    this.isDestroyed = true;
  }

  /**
   * 파괴된 적 기지를 점령 거점으로 전환한다.
   * 이후 지역별 점령 시스템에서도 재사용할 수 있도록 Base가 자신의
   * 시각적/소유 상태만 관리하고, 잠금 해제 판단은 Game이 담당한다.
   */
  capture(team) {
    if (this.isCaptured) return false;
    if (!this.isDestroyed) return false;

    this.isCaptured = true;
    this.capturedBy = team;
    this.team = team;
    return true;
  }

  render(ctx) {
    ctx.save();

    if (this.role === "hq" && this.visualStyle === "camp") {
      this._renderTemporaryCamp(ctx);
      ctx.restore();
      return;
    }

    if (this.role === "hq" && this.visualStyle === "settlement") {
      this._renderSettlementHeadquarters(ctx);
      ctx.restore();
      return;
    }

    const sprite = this._getSprite();

    if (sprite) {
      ctx.globalAlpha = this.isDestroyed && !this.isCaptured ? 0.48 : 1;
      if (this.isDestroyed && !this.isCaptured) {
        ctx.filter = "grayscale(1) brightness(0.55)";
      }
      ctx.drawImage(
        sprite,
        this.x - BASE_CONFIG.SPRITE_WIDTH / 2,
        this.y - BASE_CONFIG.SPRITE_HEIGHT / 2,
        BASE_CONFIG.SPRITE_WIDTH,
        BASE_CONFIG.SPRITE_HEIGHT
      );
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    } else {
      // 자산 로딩 실패 시 기존 도형을 안전한 fallback으로 사용한다.
      ctx.fillStyle = this.isCaptured
        ? BASE_CONFIG.CAPTURED_COLOR
        : this.isDestroyed
          ? BASE_CONFIG.DESTROYED_COLOR
          : this.color;
      ctx.fillRect(
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      );
    }

    if (this.isCaptured) {
      this._renderCapturedFlag(ctx);
    } else if (this.isDestroyed) {
      this._renderDestroyedMark(ctx);
    }

    this._renderHealthBar(ctx);
    ctx.restore();
  }


  _renderTemporaryCamp(ctx) {
    const x = this.x;
    const y = this.y;

    ctx.save();
    ctx.translate(x, y);

    // 아직 건물이 없는 임시 야영지: 깃발, 모닥불, 보급 상자만 둔다.
    ctx.fillStyle = "rgba(132, 104, 65, 0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 50, 31, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#8b6237";
    ctx.strokeStyle = "#5a3b22";
    ctx.lineWidth = 2;
    ctx.fillRect(-31, 9, 22, 17);
    ctx.strokeRect(-31, 9, 22, 17);
    ctx.beginPath();
    ctx.moveTo(-31, 9);
    ctx.lineTo(-9, 26);
    ctx.moveTo(-9, 9);
    ctx.lineTo(-31, 26);
    ctx.stroke();

    // 모닥불
    ctx.strokeStyle = "#6f4b2b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(5, 26);
    ctx.lineTo(28, 13);
    ctx.moveTo(8, 13);
    ctx.lineTo(30, 27);
    ctx.stroke();
    ctx.fillStyle = "#e9a23b";
    ctx.beginPath();
    ctx.moveTo(18, 14);
    ctx.quadraticCurveTo(8, 2, 18, -7);
    ctx.quadraticCurveTo(31, 3, 22, 15);
    ctx.closePath();
    ctx.fill();

    // 임시 표식 깃발
    ctx.strokeStyle = "#e8edf2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-2, 8);
    ctx.lineTo(-2, -48);
    ctx.stroke();
    ctx.fillStyle = "#3f7fc0";
    ctx.beginPath();
    ctx.moveTo(-2, -47);
    ctx.lineTo(27, -39);
    ctx.lineTo(-2, -28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(10, 22, 30, 0.78)";
    ctx.font = "bold 12px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("임시 야영지", 0, 61);
    ctx.restore();
  }


  _renderSettlementHeadquarters(ctx) {
    // 초기 본부는 완성된 성곽이 아니라 천막·보급 상자·깃발로 구성된
    // 작은 정착 거점이다. 이후 본부 확장 시스템에서만 성곽으로 전환한다.
    const x = this.x;
    const y = this.y;

    ctx.save();
    ctx.translate(x, y);

    // 생활권 바닥
    ctx.fillStyle = "rgba(154, 125, 77, 0.38)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 82, 57, 0, 0, Math.PI * 2);
    ctx.fill();

    // 중앙 지휘 천막
    ctx.fillStyle = "#315f89";
    ctx.strokeStyle = "#18354f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-34, 12);
    ctx.lineTo(0, -30);
    ctx.lineTo(34, 12);
    ctx.lineTo(29, 43);
    ctx.lineTo(-29, 43);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#244a6b";
    ctx.fillRect(-8, 13, 16, 30);

    // 작은 보조 천막
    const drawTent = (tx, ty, scale = 1) => {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);
      ctx.fillStyle = "#497aa4";
      ctx.strokeStyle = "#23455f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-20, 10);
      ctx.lineTo(0, -15);
      ctx.lineTo(20, 10);
      ctx.lineTo(17, 27);
      ctx.lineTo(-17, 27);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    drawTent(-55, 23, 0.82);
    drawTent(56, 25, 0.78);

    // 보급 상자
    ctx.fillStyle = "#9f733e";
    ctx.strokeStyle = "#624323";
    ctx.lineWidth = 2;
    ctx.fillRect(40, -5, 23, 18);
    ctx.strokeRect(40, -5, 23, 18);
    ctx.beginPath();
    ctx.moveTo(40, -5);
    ctx.lineTo(63, 13);
    ctx.moveTo(63, -5);
    ctx.lineTo(40, 13);
    ctx.stroke();

    // 깃발
    ctx.strokeStyle = "#e8edf2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-7, -26);
    ctx.lineTo(-7, -72);
    ctx.stroke();
    ctx.fillStyle = "#3f7fc0";
    ctx.beginPath();
    ctx.moveTo(-7, -71);
    ctx.lineTo(28, -62);
    ctx.lineTo(-7, -50);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(10, 22, 30, 0.78)";
    ctx.font = "bold 13px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("정착 본부", 0, 72);
    ctx.restore();
  }


  _getSprite() {
    if (typeof GameAssets === "undefined") return null;

    if (this.isCaptured && this.capturedBy === "ally") {
      return GameAssets.get("ALLY_OUTPOST");
    }

    if (this.team === "ally") {
      return GameAssets.get(this.role === "hq" ? "ALLY_HQ" : "ALLY_OUTPOST");
    }

    return GameAssets.get("ENEMY_BASE");
  }

  /**
   * 기지 위에 HP바를 표시한다.
   * @param {CanvasRenderingContext2D} ctx
   */
  _renderHealthBar(ctx) {
    if (this.isCaptured) return;

    const width = BASE_CONFIG.HEALTH_BAR_WIDTH;
    const height = BASE_CONFIG.HEALTH_BAR_HEIGHT;
    const x = this.x - width / 2;
    const y =
      this.y - this.height / 2 - BASE_CONFIG.HEALTH_BAR_OFFSET_Y - height;
    const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 0;

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(x - 1, y - 1, width + 2, height + 2);

    ctx.fillStyle = "#5a1f1f";
    ctx.fillRect(x, y, width, height);

    if (hpRatio > 0) {
      ctx.fillStyle = hpRatio > 0.35 ? "#35c759" : "#ff453a";
      ctx.fillRect(x, y, width * hpRatio, height);
    }
  }

  /**
   * 초기 파괴 표현. 별도 이펙트 시스템이 추가되기 전까지 최소한의 표시만 한다.
   * @param {CanvasRenderingContext2D} ctx
   */
  _renderCapturedFlag(ctx) {
    const poleX = this.x;
    const poleTop = this.y - this.height / 2 - 34;

    ctx.strokeStyle = "#e8edf2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(poleX, this.y - this.height / 2 + 8);
    ctx.lineTo(poleX, poleTop);
    ctx.stroke();

    ctx.fillStyle = "#4dbd74";
    ctx.beginPath();
    ctx.moveTo(poleX, poleTop);
    ctx.lineTo(poleX + 30, poleTop + 9);
    ctx.lineTo(poleX, poleTop + 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 13px Malgun Gothic, sans-serif";
    ctx.fillText("점령", this.x, this.y + 5);
  }

  _renderDestroyedMark(ctx) {
    const halfWidth = this.width * 0.32;
    const halfHeight = this.height * 0.32;

    ctx.strokeStyle = "rgba(20, 20, 20, 0.9)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(this.x - halfWidth, this.y - halfHeight);
    ctx.lineTo(this.x + halfWidth, this.y + halfHeight);
    ctx.moveTo(this.x + halfWidth, this.y - halfHeight);
    ctx.lineTo(this.x - halfWidth, this.y + halfHeight);
    ctx.stroke();
  }
}
