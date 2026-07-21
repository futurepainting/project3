"use strict";

/**
 * v0.53부터 3×3 전략 지역은 제거되었다.
 * 기존 Game/Main의 호출 지점을 안전하게 유지하기 위한 경량 호환 계층이다.
 * 실제 전투와 병력은 하나의 연속 월드에서만 관리한다.
 */
class StrategicWorldSystem {
  constructor(game) {
    this.game = game;
    this.debugEnabled = false;
    this.activeRegionId = null;
    this.reserveDeployment = { active: false };
    this.onStateChanged = null;
  }

  refreshViewport() {}
  update() {}
  renderTerrain() {}
  renderMapOverlay() {}
  renderScreenOverlay() {}
  registerFriendlyArrival() { return false; }
  shouldRunPreciseFront() { return true; }
  shouldRenderLegacySoldier() { return true; }
  getViewMode() { return "combat"; }
  getPlayerAbstractMilitaryCount() { return 0; }
  getPlayerAbstractMilitaryComposition() { return { rifle: 0, machineGun: 0, shield: 0 }; }
  getWorldStatus() {
    const wave = this.game.waveDefense?.getState?.();
    return {
      friendly: this.game.getFriendlyMilitaryCount?.() || 0,
      enemy: wave?.alive || 0,
      reserve: this.game.getRallyState?.().count || 0,
      battles: wave?.phase === "spawning" || wave?.phase === "combat" ? 1 : 0,
      supply: 100,
      viewMode: "combat",
    };
  }
  getSelectedRegionState() { return { id: null, name: "단일 전장", ownerLabel: "아군", terrainLabel: "평야", supply: 100, friendly: 0, enemy: 0, battleLabel: "대기", dangerLabel: "낮음", precisionLabel: "연속 전장", canEnterPrecision: false }; }
  getDebugState() { return {}; }
  getReserveDeploymentState() { return { active: false, reserve: 0, amount: 0, amountMode: "all", message: "" }; }
  isReserveDeploymentActive() { return false; }
  beginReserveDeployment() { return false; }
  cancelReserveDeployment() { return false; }
  setReserveDeploymentAmount() { return false; }
  handleReserveDeploymentAtScreen() { return false; }
  getReserveMarkerAtScreen() { return null; }
  setHoverAtScreen() { return false; }
  clearHover() {}
  selectAtScreen() { return false; }
  focusRegion() { return false; }
  focusSelectedRegion() { return false; }
  exitPrecisionToMap() { return false; }
  toggleDebug() { this.debugEnabled = !this.debugEnabled; return this.debugEnabled; }
}
