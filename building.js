"use strict";

const BUILDING_TYPES = {
  BARRACKS: "barracks",
  LUMBER_CAMP: "lumber_camp",
  CONSTRUCTION_WORKSHOP: "construction_workshop",
  TRAINING_CENTER: "training_center",
};


const BUILDING_CONFIG = {
  [BUILDING_TYPES.BARRACKS]: {
    name: "병영",
    width: 86,
    height: 58,
    cost: 100,
    color: "#536b42",
    roofColor: "#2f3f2b",
  },
  [BUILDING_TYPES.LUMBER_CAMP]: {
    name: "벌목소",
    width: 92,
    height: 60,
    cost: 5,
    color: "#8a5a32",
    roofColor: "#5c3923",
  },
  [BUILDING_TYPES.CONSTRUCTION_WORKSHOP]: {
    name: "건설 작업소",
    width: 112,
    height: 72,
    cost: 12,
    color: "#947047",
    roofColor: "#5f4730",
  },
  [BUILDING_TYPES.TRAINING_CENTER]: {
    name: "훈련소",
    width: 112,
    height: 74,
    cost: 18,
    color: "#8c6b47",
    roofColor: "#56402e",
  },
};

/**
 * 점령 지역에 건설되는 시설의 공통 기반 클래스.
 * 현재는 병영 하나만 사용하지만, 이후 연구소/보급창고/군수공장도
 * 같은 구조로 추가할 수 있도록 건물 종류와 설정 데이터를 분리한다.
 */
class Building extends Entity {
  constructor(x, y, type, team = TEAM.FRIENDLY) {
    super(x, y);

    const config = BUILDING_CONFIG[type];
    if (!config) {
      throw new Error(`알 수 없는 건물 종류입니다: ${type}`);
    }

    this.type = type;
    this.team = team;
    this.visualKey = type;
    this.visualMeta = getVisualMetadata(type);
    this.footprint = this.visualMeta?.footprint || null;
    this.entrance = this.visualMeta?.entrance || null;
    this.workPoints = this.visualMeta?.workPoints || [];
    this.name = config.name;
    this.baseWidth = config.width;
    this.baseHeight = config.height;
    this.width = config.width;
    this.height = config.height;
    this.color = config.color;
    this.roofColor = config.roofColor;
    this.isBuilt = true;
    this.level = 1;

    // 벌목소의 실제 보유 목재를 시각적으로 표현하기 위한 값이다.
    // displayedStoredAmount는 즉시 바뀌지 않고 목표값을 따라가며,
    // 목재가 들어올 때 통나무가 하나씩 쌓이는 느낌을 만든다.
    this.storedAmount = 0;
    this.displayedStoredAmount = 0;
    this._previousStoredAmount = 0;
    this.stackPulse = 0;
  }


  syncLevelVisuals() {
    this.width = this.baseWidth;
    this.height = this.baseHeight;
  }

  setStoredAmount(amount) {
    const normalized = Math.max(0, Math.floor(Number(amount) || 0));
    if (normalized > this._previousStoredAmount) {
      this.stackPulse = 1;
    }
    this.storedAmount = normalized;
    this._previousStoredAmount = normalized;
  }

  update(deltaTime) {
    if (this.type !== BUILDING_TYPES.LUMBER_CAMP) return;

    const difference = this.storedAmount - this.displayedStoredAmount;
    if (Math.abs(difference) < 0.01) {
      this.displayedStoredAmount = this.storedAmount;
    } else {
      const direction = Math.sign(difference);
      const speed = direction > 0 ? 7 : 16;
      this.displayedStoredAmount += direction * Math.min(Math.abs(difference), speed * deltaTime);
    }

    this.stackPulse = Math.max(0, this.stackPulse - deltaTime * 2.8);
  }

  _getVisibleLogCount() {
    const amount = Math.max(0, Math.floor(this.displayedStoredAmount));
    if (amount <= 24) return amount;

    // 저장량은 무제한이지만 화면을 가리지 않도록, 큰 수량일수록
    // 더 조밀하고 높은 더미로 압축해서 표현한다.
    return Math.min(40, 24 + Math.floor(Math.sqrt(amount - 24) * 2));
  }

  _renderLumberPile(ctx, left, top) {
    const logCount = this._getVisibleLogCount();
    if (logCount <= 0) return;

    const logWidth = 22;
    const logHeight = 6;
    const logsPerRow = 5;
    const pileCenterX = this.x + this.width * 0.34;
    const baseY = top + this.height + 2;
    const pulseLift = Math.sin(this.stackPulse * Math.PI) * 5;

    for (let i = 0; i < logCount; i += 1) {
      const row = Math.floor(i / logsPerRow);
      const col = i % logsPerRow;
      const rowCount = Math.min(logsPerRow, logCount - row * logsPerRow);
      const rowWidth = rowCount * 8 + logWidth - 8;
      const x = pileCenterX - rowWidth / 2 + col * 8;
      let y = baseY - row * 6;

      // 방금 들어온 목재는 더미 위에 살짝 떨어지는 듯 움직인다.
      if (i === logCount - 1 && this.stackPulse > 0) {
        y -= pulseLift;
      }

      ctx.fillStyle = row % 2 === 0 ? "#7b4b25" : "#86552b";
      ctx.fillRect(x, y - logHeight, logWidth, logHeight);
      ctx.strokeStyle = "rgba(59,34,18,0.65)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y - logHeight, logWidth, logHeight);

      ctx.fillStyle = "#c99a60";
      ctx.beginPath();
      ctx.arc(x + 2, y - logHeight / 2, logHeight / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(89,52,26,0.6)";
      ctx.stroke();
    }
  }

  render(ctx) {
    if (!this.isActive || !this.isBuilt) return;
    this.syncLevelVisuals();

    const left = this.x - this.width / 2;
    const top = this.y - this.height / 2;

    ctx.save();

    if (this.type === BUILDING_TYPES.LUMBER_CAMP) {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(this.x, top + this.height + 7, this.width * 0.55, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.color;
      ctx.fillRect(left, top + 10, this.width, this.height - 10);
      ctx.strokeStyle = "rgba(62,36,19,0.65)";
      ctx.lineWidth = 3;
      for (let y = top + 18; y < top + this.height; y += 11) {
        ctx.beginPath();
        ctx.moveTo(left + 3, y);
        ctx.lineTo(left + this.width - 3, y);
        ctx.stroke();
      }

      ctx.fillStyle = this.roofColor;
      ctx.beginPath();
      ctx.moveTo(left - 7, top + 12);
      ctx.lineTo(this.x, top - 18);
      ctx.lineTo(left + this.width + 7, top + 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#3e2718";
      ctx.fillRect(this.x - 11, top + 29, 22, 31);

      this._renderLumberPile(ctx, left, top);
    } else if (this.type === BUILDING_TYPES.CONSTRUCTION_WORKSHOP) {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(this.x, top + this.height + 7, this.width * 0.58, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // 열린 작업장 본체
      ctx.fillStyle = this.color;
      ctx.fillRect(left, top + 12, this.width, this.height - 12);
      ctx.strokeStyle = "rgba(76,54,34,0.72)";
      ctx.lineWidth = 3;
      ctx.strokeRect(left, top + 12, this.width, this.height - 12);

      ctx.fillStyle = this.roofColor;
      ctx.beginPath();
      ctx.moveTo(left - 7, top + 14);
      ctx.lineTo(this.x, top - 16);
      ctx.lineTo(left + this.width + 7, top + 14);
      ctx.closePath();
      ctx.fill();

      // 열린 출입구와 작업대
      ctx.fillStyle = "#44311f";
      ctx.fillRect(this.x - 18, top + 29, 36, 43);
      ctx.fillStyle = "#b78850";
      ctx.fillRect(left + 9, top + 43, 31, 8);
      ctx.fillRect(left + 13, top + 51, 4, 17);
      ctx.fillRect(left + 34, top + 51, 4, 17);

      // 망치와 목재 자재
      ctx.strokeStyle = "#4f3825";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(left + 23, top + 39);
      ctx.lineTo(left + 34, top + 28);
      ctx.stroke();
      ctx.fillStyle = "#aeb7bc";
      ctx.fillRect(left + 30, top + 24, 12, 6);
      ctx.fillStyle = "#73461f";
      ctx.fillRect(left + this.width - 37, top + 50, 30, 6);
      ctx.fillRect(left + this.width - 33, top + 43, 26, 6);
    } else if (this.type === BUILDING_TYPES.TRAINING_CENTER) {
      ctx.fillStyle = "rgba(0,0,0,0.24)";
      ctx.beginPath();
      ctx.ellipse(this.x, top + this.height + 8, this.width * 0.58, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // 훈련소 본체와 야외 훈련 표식
      ctx.fillStyle = this.color;
      ctx.fillRect(left, top + 13, this.width, this.height - 13);
      ctx.strokeStyle = "rgba(71,49,31,0.78)";
      ctx.lineWidth = 3;
      ctx.strokeRect(left, top + 13, this.width, this.height - 13);

      ctx.fillStyle = this.roofColor;
      ctx.beginPath();
      ctx.moveTo(left - 7, top + 15);
      ctx.lineTo(this.x, top - 15);
      ctx.lineTo(left + this.width + 7, top + 15);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#38291f";
      ctx.fillRect(this.x - 14, top + 36, 28, 38);
      ctx.fillStyle = "#d0b784";
      ctx.fillRect(left + 15, top + 35, 18, 13);
      ctx.strokeStyle = "rgba(73,51,31,0.72)";
      ctx.strokeRect(left + 15, top + 35, 18, 13);

      // 표적판과 훈련 깃발로 생산 건물임을 구분한다.
      ctx.strokeStyle = "#e5dbc1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(left + this.width - 25, top + 48, 11, 0, Math.PI * 2);
      ctx.moveTo(left + this.width - 36, top + 48);
      ctx.lineTo(left + this.width - 14, top + 48);
      ctx.moveTo(left + this.width - 25, top + 37);
      ctx.lineTo(left + this.width - 25, top + 59);
      ctx.stroke();

      ctx.strokeStyle = "#ece6d4";
      ctx.beginPath();
      ctx.moveTo(left + 16, top + 12);
      ctx.lineTo(left + 16, top - 20);
      ctx.stroke();
      ctx.fillStyle = "#d5934f";
      ctx.beginPath();
      ctx.moveTo(left + 17, top - 19);
      ctx.lineTo(left + 42, top - 11);
      ctx.lineTo(left + 17, top - 4);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(left, top, this.width, this.height);

      ctx.fillStyle = this.roofColor;
      ctx.beginPath();
      ctx.moveTo(left - 5, top + 4);
      ctx.lineTo(this.x, top - 20);
      ctx.lineTo(left + this.width + 5, top + 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#26331f";
      ctx.fillRect(this.x - 11, top + 24, 22, 34);
    }

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 13px Malgun Gothic, sans-serif";
    ctx.fillText(`${this.name} Lv.${this.level || 1}`, this.x, top - 27);
    ctx.restore();
  }
}
