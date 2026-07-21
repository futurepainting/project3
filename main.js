"use strict";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const game = new Game(canvas);
  window.__miniWarGame = game;

  const spawnBtn = document.getElementById("spawnRiflemanBtn");
  const uiLayer = document.getElementById("ui-layer");
  const tutorialPanel = document.getElementById("tutorialPanel");
  const tutorialTitle = document.getElementById("tutorialTitle");
  const tutorialText = document.getElementById("tutorialText");
  const tutorialProgressBar = document.getElementById("tutorialProgressBar");
  const tutorialProgressText = document.getElementById("tutorialProgressText");
  const tutorialCompleteBtn = document.getElementById("tutorialCompleteBtn");
  const lumberPanel = document.getElementById("lumberPanel");
  const lumberWorkerCount = document.getElementById("lumberWorkerCount");
  const lumberWorkStatus = document.getElementById("lumberWorkStatus");
  const lumberStorageText = document.getElementById("lumberStorageText");
  const lumberStorageBar = document.getElementById("lumberStorageBar");
  const hireLumberWorkerBtn = document.getElementById("hireLumberWorkerBtn");
  const lumberHint = document.getElementById("lumberHint");
  const constructionPanel = document.getElementById("constructionPanel");
  const constructionStatus = document.getElementById("constructionStatus");
  const placeWorkshopBtn = document.getElementById("placeWorkshopBtn");
  const placeTrainingCenterBtn = document.getElementById("placeTrainingCenterBtn");
  const cancelPlacementBtn = document.getElementById("cancelPlacementBtn");
  const constructionHint = document.getElementById("constructionHint");
  const buildingManagePanel = document.getElementById("buildingManagePanel");
  const buildingManageTitle = document.getElementById("buildingManageTitle");
  const buildingManageLevel = document.getElementById("buildingManageLevel");
  const buildingManageDescription = document.getElementById("buildingManageDescription");
  const buildingManageWorkerLabel = document.getElementById("buildingManageWorkerLabel");
  const buildingManageWorkerCount = document.getElementById("buildingManageWorkerCount");
  const buildingManageEffect = document.getElementById("buildingManageEffect");
  const buildingManageHireBtn = document.getElementById("buildingManageHireBtn");
  const buildingManageAutoBtn = document.getElementById("buildingManageAutoBtn");
  const buildingManageDeployBtn = document.getElementById("buildingManageDeployBtn");
  const buildingManageUpgradeBtn = document.getElementById("buildingManageUpgradeBtn");
  const buildingManageHint = document.getElementById("buildingManageHint");
  const buildingManageCloseBtn = document.getElementById("buildingManageCloseBtn");
  const transitionPanel = document.getElementById("captureTransitionPanel");
  const rewardText = document.getElementById("captureRewardText");
  const continueBtn = document.getElementById("captureContinueBtn");
  const fundsValue = document.getElementById("fundsValue");
  const woodValue = document.getElementById("woodValue");
  const fundsResourceItem = document.getElementById("fundsResourceItem");
  const woodResourceItem = document.getElementById("woodResourceItem");
  const resourceHint = document.getElementById("resourceHint");
  const barracksPanel = document.getElementById("barracksPanel");
  const buildBarracksBtn = document.getElementById("buildBarracksBtn");
  const barracksStatus = document.getElementById("barracksStatus");
  const autoProductionBtn = document.getElementById("autoProductionBtn");
  const productionProgress = document.getElementById("productionProgress");
  const productionProgressBar = document.getElementById("productionProgressBar");
  const regionHud = document.getElementById("regionHud");
  const regionControls = document.getElementById("regionControls");
  const region1Btn = document.getElementById("region1Btn");
  const region2Btn = document.getElementById("region2Btn");
  const advanceRegionBtn = document.getElementById("advanceRegionBtn");
  const territoryPanel = document.getElementById("territoryPanel");
  const territoryCount = document.getElementById("territoryCount");
  const populationValue = document.getElementById("populationValue");
  const securityValue = document.getElementById("securityValue");
  const supportValue = document.getElementById("supportValue");
  const taxEstimate = document.getElementById("taxEstimate");
  const taxCountdown = document.getElementById("taxCountdown");
  const territoryList = document.getElementById("territoryList");
  const overviewIdleResidents = document.getElementById("overviewIdleResidents");
  const overviewLumberWorkers = document.getElementById("overviewLumberWorkers");
  const overviewConstructionWorkers = document.getElementById("overviewConstructionWorkers");
  const overviewSoldiers = document.getElementById("overviewSoldiers");
  const overviewRifleSoldiers = document.getElementById("overviewRifleSoldiers");
  const overviewMachineGunSoldiers = document.getElementById("overviewMachineGunSoldiers");
  const overviewShieldSoldiers = document.getElementById("overviewShieldSoldiers");
  const overviewResidentArrival = document.getElementById("overviewResidentArrival");
  const overviewLumberStatus = document.getElementById("overviewLumberStatus");
  const overviewConstructionStatus = document.getElementById("overviewConstructionStatus");
  const overviewTrainingStatus = document.getElementById("overviewTrainingStatus");
  const overviewEastStatus = document.getElementById("overviewEastStatus");
  const overviewNorthStatus = document.getElementById("overviewNorthStatus");
  const overviewObjective = document.getElementById("overviewObjective");
  const taxPolicyButtons = [...document.querySelectorAll("[data-tax-policy]")];
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomValue = document.getElementById("zoomValue");
  const hqViewBtn = document.getElementById("hqViewBtn");
  const focusRegionBtn = document.getElementById("focusRegionBtn");
  const wholeWorldBtn = document.getElementById("wholeWorldBtn");
  const worldDeployPanel = document.getElementById("worldDeployPanel");
  const worldDeployReserveCount = document.getElementById("worldDeployReserveCount");
  const worldDeploySelectedCount = document.getElementById("worldDeploySelectedCount");
  const worldDeployHint = document.getElementById("worldDeployHint");
  const worldDeployOneBtn = document.getElementById("worldDeployOneBtn");
  const worldDeployHalfBtn = document.getElementById("worldDeployHalfBtn");
  const worldDeployAllBtn = document.getElementById("worldDeployAllBtn");
  const worldDeployCancelBtn = document.getElementById("worldDeployCancelBtn");
  const worldFriendlyCount = document.getElementById("worldFriendlyCount");
  const worldEnemyCount = document.getElementById("worldEnemyCount");
  const worldReserveCount = document.getElementById("worldReserveCount");
  const worldBattleCount = document.getElementById("worldBattleCount");
  const worldSupplyValue = document.getElementById("worldSupplyValue");
  const worldViewMode = document.getElementById("worldViewMode");
  const worldRegionPanel = document.getElementById("worldRegionPanel");
  const worldRegionName = document.getElementById("worldRegionName");
  const worldRegionOwner = document.getElementById("worldRegionOwner");
  const worldRegionTerrain = document.getElementById("worldRegionTerrain");
  const worldRegionSupply = document.getElementById("worldRegionSupply");
  const worldRegionFriendly = document.getElementById("worldRegionFriendly");
  const worldRegionEnemy = document.getElementById("worldRegionEnemy");
  const worldRegionBattle = document.getElementById("worldRegionBattle");
  const worldRegionDanger = document.getElementById("worldRegionDanger");
  const worldRegionPrecisionType = document.getElementById("worldRegionPrecisionType");
  const worldRegionDeployBtn = document.getElementById("worldRegionDeployBtn");
  const worldRegionFocusBtn = document.getElementById("worldRegionFocusBtn");
  const worldRegionEnterBtn = document.getElementById("worldRegionEnterBtn");
  const worldBackBtn = document.getElementById("worldBackBtn");
  const worldDebugPanel = document.getElementById("worldDebugPanel");
  const worldDebugText = document.getElementById("worldDebugText");
  const debugWorldBtn = document.getElementById("debugWorldBtn");
  const soldierUpgradePanel = document.getElementById("soldierUpgradePanel");
  const upgradeGoldValue = document.getElementById("upgradeGoldValue");
  const upgradeAttackBtn = document.getElementById("upgradeAttackBtn");
  const upgradeHealthBtn = document.getElementById("upgradeHealthBtn");
  const upgradeFireRateBtn = document.getElementById("upgradeFireRateBtn");
  const upgradeAttackCost = document.getElementById("upgradeAttackCost");
  const upgradeHealthCost = document.getElementById("upgradeHealthCost");
  const upgradeFireRateCost = document.getElementById("upgradeFireRateCost");
  const startNextWaveBtn = document.getElementById("startNextWaveBtn");

  const renderStrategicWorld = (state = game.waveDefense.getState()) => {
    worldFriendlyCount.textContent = state.round;
    worldEnemyCount.textContent = state.remaining;
    worldReserveCount.textContent = state.totalKills;
    worldBattleCount.textContent = game.getFunds().toLocaleString("ko-KR");
    worldSupplyValue.textContent = state.canStartNow ? `${state.countdown}초` : state.phaseLabel;
    worldViewMode.textContent = (state.phase === "spawning" || state.phase === "combat")
      ? `공세 강도 ${state.pressureLevel}`
      : state.phaseLabel;

    worldRegionPanel.hidden = true;
    worldDeployPanel.hidden = true;
    worldBackBtn.hidden = true;
    worldDebugPanel.hidden = true;
    regionHud.hidden = true;
    regionControls.hidden = true;
    focusRegionBtn.hidden = true;
    debugWorldBtn.hidden = true;

    const unlocked = Boolean(game.warUnlocked && game.trainingCenter?.isBuilt);
    const buildingPanelOpen = Boolean(game.getSelectedBuildingState().selected);
    soldierUpgradePanel.hidden = !unlocked || buildingPanelOpen;
    upgradeGoldValue.textContent = game.getFunds().toLocaleString("ko-KR");
    const updateUpgradeButton = (button, label, upgradeState) => {
      if (!button || !label || !upgradeState) return;
      label.textContent = `Lv.${upgradeState.level} · 골드 ${upgradeState.cost.toLocaleString("ko-KR")}`;
      button.disabled = !upgradeState.canAfford;
    };
    updateUpgradeButton(upgradeAttackBtn, upgradeAttackCost, state.upgrades.attack);
    updateUpgradeButton(upgradeHealthBtn, upgradeHealthCost, state.upgrades.health);
    updateUpgradeButton(upgradeFireRateBtn, upgradeFireRateCost, state.upgrades.fireRate);
    startNextWaveBtn.hidden = !state.canStartNow && state.phase !== "defeat";
    startNextWaveBtn.textContent = state.phase === "defeat"
      ? "처음부터 다시 시작"
      : state.phase === "intermission"
        ? `라운드 ${state.nextRound} 즉시 시작`
        : `라운드 ${state.nextRound} 바로 시작`;
  };

  game.waveDefense.onStateChanged = renderStrategicWorld;
  game.strategicWorld.onStateChanged = () => renderStrategicWorld();
  renderStrategicWorld();

  const renderBuildingManagement = (state = game.getSelectedBuildingState()) => {
    buildingManagePanel.hidden = !state.selected;
    if (!state.selected) return;

    buildingManageTitle.textContent = state.title;
    buildingManageLevel.textContent = `Lv.${state.level}`;
    buildingManageDescription.textContent = state.description;
    buildingManageWorkerLabel.textContent = state.workerLabel;
    buildingManageWorkerCount.textContent = `${state.workerCount} / ${state.workerMax}`;
    buildingManageEffect.textContent = state.effectText || "";
    const showHireAction = state.showHireAction !== false;
    buildingManageHireBtn.hidden = !showHireAction;
    const showAutoAction = state.showAutoAction === true;
    buildingManageAutoBtn.hidden = !showAutoAction;
    if (showAutoAction) {
      buildingManageAutoBtn.textContent = state.autoEnabled ? "자동 생산 ON" : "자동 생산 OFF";
      buildingManageAutoBtn.classList.toggle("is-off", !state.autoEnabled);
      buildingManageAutoBtn.setAttribute("aria-pressed", state.autoEnabled ? "true" : "false");
    }
    const showDeployAction = false;
    buildingManageDeployBtn.hidden = true;
    buildingManageDeployBtn.disabled = true;
    if (showHireAction) {
      buildingManageHireBtn.textContent = Number.isFinite(state.hireCost)
        ? `${state.hireLabel} · 목재 ${state.hireCost}`
        : state.hireLabel;
      buildingManageHireBtn.disabled = !state.canHire;
    }

    if (state.level >= state.maxLevel || !Number.isFinite(state.upgradeCost)) {
      buildingManageUpgradeBtn.textContent = "최대 레벨";
      buildingManageUpgradeBtn.disabled = true;
    } else {
      buildingManageUpgradeBtn.textContent = `Lv.${state.level + 1} 업그레이드 · 목재 ${state.upgradeCost}`;
      buildingManageUpgradeBtn.disabled = !state.canUpgrade;
    }

    buildingManageHint.textContent = state.hireReason || `배치 가능한 주민 ${state.availableResidents}명`;
  };

  const renderCamera = (state = game.getCameraState()) => {
    zoomValue.textContent = `${state.zoomPercent}% · ${state.mode}`;
    zoomOutBtn.disabled = !state.canZoomOut;
    zoomInBtn.disabled = !state.canZoomIn;
  };

  const canvasPoint = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const updateCanvasHover = (point) => {
    if (game.isConstructionPlacementActive()) {
      const preview = point ? game.updateConstructionPlacementAtScreen(point.x, point.y) : null;
      game.setHoveredConstructionSite(null);
      game.setHoveredResourceNode(null);
      game.setHoveredEngagement(null);
      game.setHoveredStrategicNode(null);
      canvas.style.cursor = preview?.valid ? "crosshair" : "not-allowed";
      return;
    }

    const deploymentActive = game.strategicWorld.isReserveDeploymentActive();
    const reserveMarkerTarget = point ? game.strategicWorld.getReserveMarkerAtScreen(point.x, point.y) : null;
    if (point && game.strategicWorld.setHoverAtScreen(point.x, point.y)) {
      game.setHoveredRallyFront(null);
      game.setHoveredRallyPoint(false);
      game.setHoveredConstructionSite(null);
      game.setHoveredResourceNode(null);
      game.setHoveredEngagement(null);
      game.setHoveredStrategicNode(null);
      canvas.style.cursor = "pointer";
      return;
    }
    game.strategicWorld.clearHover();

    const rallyPointTarget = null;
    const constructionTarget = !deploymentActive && !reserveMarkerTarget && !rallyPointTarget && point
      ? game.getConstructionSiteAtScreen(point.x, point.y)
      : null;
    const buildingTarget = !deploymentActive && !reserveMarkerTarget && !rallyPointTarget && !constructionTarget && point
      ? game.getBuildingAtScreen(point.x, point.y)
      : null;
    const resourceTarget = !deploymentActive && !reserveMarkerTarget && !rallyPointTarget && !constructionTarget && !buildingTarget && point
      ? game.getResourceNodeAtScreen(point.x, point.y)
      : null;
    const target = !deploymentActive && !reserveMarkerTarget && !rallyPointTarget && !constructionTarget && !buildingTarget && !resourceTarget && point
      ? game.getEngagementAtScreen(point.x, point.y)
      : null;
    game.setHoveredRallyFront(null);
    game.setHoveredRallyPoint(Boolean(rallyPointTarget));
    game.setHoveredConstructionSite(constructionTarget?.id ?? null);
    game.setHoveredResourceNode(resourceTarget?.id ?? null);
    game.setHoveredEngagement(target?.region ?? null);
    game.setHoveredStrategicNode(target?.nodeId ?? null);
    canvas.style.cursor = deploymentActive || reserveMarkerTarget || rallyPointTarget || constructionTarget || buildingTarget || resourceTarget || target
      ? "pointer"
      : "grab";
  };

  zoomOutBtn.addEventListener("click", () => {
    game.zoomCameraBy(-WORLD_CONFIG.CAMERA_ZOOM_STEP);
  });

  zoomInBtn.addEventListener("click", () => {
    game.zoomCameraBy(WORLD_CONFIG.CAMERA_ZOOM_STEP);
  });

  hqViewBtn.addEventListener("click", () => {
    game.focusHeadquarters(true);
  });

  focusRegionBtn.addEventListener("click", () => {
    game.focusCurrentRegion();
  });

  wholeWorldBtn.addEventListener("click", () => {
    game.fitWholeWorld();
  });

  worldRegionDeployBtn.addEventListener("click", () => {
    game.strategicWorld.beginReserveDeployment("all");
  });

  worldRegionFocusBtn.addEventListener("click", () => {
    game.strategicWorld.focusSelectedRegion(false);
  });

  worldRegionEnterBtn.addEventListener("click", () => {
    game.strategicWorld.focusSelectedRegion(true);
  });

  worldBackBtn.addEventListener("click", () => {
    game.strategicWorld.exitPrecisionToMap();
  });

  debugWorldBtn.addEventListener("click", () => {
    game.strategicWorld.toggleDebug();
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const point = canvasPoint(event.clientX, event.clientY);
    const direction = event.deltaY < 0 ? 1 : -1;
    game.zoomCameraBy(
      direction * WORLD_CONFIG.CAMERA_ZOOM_STEP,
      point.x,
      point.y
    );
  }, { passive: false });

  const activePointers = new Map();
  let dragPointerId = null;
  let previousDragPoint = null;
  let previousPinchDistance = null;
  let previousPinchCenter = null;
  let dragDistance = 0;
  let pointerDownPoint = null;

  const getPinchState = () => {
    const points = [...activePointers.values()];
    if (points.length < 2) return null;
    const [a, b] = points;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return {
      distance: Math.hypot(dx, dy),
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const point = canvasPoint(event.clientX, event.clientY);
    activePointers.set(event.pointerId, point);
    canvas.setPointerCapture(event.pointerId);

    if (activePointers.size === 1) {
      dragPointerId = event.pointerId;
      previousDragPoint = point;
      pointerDownPoint = point;
      dragDistance = 0;
      canvas.classList.add("is-dragging");
    } else {
      dragPointerId = null;
      previousDragPoint = null;
      const pinch = getPinchState();
      previousPinchDistance = pinch?.distance ?? null;
      previousPinchCenter = pinch?.center ?? null;
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!activePointers.has(event.pointerId)) return;
    const point = canvasPoint(event.clientX, event.clientY);
    activePointers.set(event.pointerId, point);

    if (activePointers.size >= 2) {
      const pinch = getPinchState();
      if (!pinch) return;

      if (previousPinchCenter) {
        game.panCameraByScreen(
          pinch.center.x - previousPinchCenter.x,
          pinch.center.y - previousPinchCenter.y
        );
      }
      if (previousPinchDistance && previousPinchDistance > 0) {
        const ratio = pinch.distance / previousPinchDistance;
        game.setCameraZoom(
          game.getCameraState().zoom * ratio,
          pinch.center.x,
          pinch.center.y
        );
      }

      previousPinchDistance = pinch.distance;
      previousPinchCenter = pinch.center;
      return;
    }

    if (event.pointerId === dragPointerId && previousDragPoint) {
      const dx = point.x - previousDragPoint.x;
      const dy = point.y - previousDragPoint.y;
      dragDistance += Math.hypot(dx, dy);
      game.panCameraByScreen(dx, dy);
      previousDragPoint = point;
    }
  });

  canvas.addEventListener("pointerleave", () => {
    if (activePointers.size === 0) updateCanvasHover(null);
  });

  canvas.addEventListener("mousemove", (event) => {
    if (activePointers.size > 0) return;
    updateCanvasHover(canvasPoint(event.clientX, event.clientY));
  });

  const endPointer = (event, allowClick = true) => {
    const releasePoint = canvasPoint(event.clientX, event.clientY);
    const wasClickCandidate = allowClick && activePointers.size === 1 && event.pointerId === dragPointerId && dragDistance < 8;

    activePointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    previousPinchDistance = null;
    previousPinchCenter = null;

    if (wasClickCandidate) {
      const placed = game.confirmConstructionPlacementAtScreen(releasePoint.x, releasePoint.y);
      const built = placed ? false : game.buildConstructionAtScreen(releasePoint.x, releasePoint.y);
      const selectedBuilding = placed || built ? false : game.selectBuildingAtScreen(releasePoint.x, releasePoint.y);
      const harvested = placed || built || selectedBuilding
        ? false
        : game.harvestResourceAtScreen(releasePoint.x, releasePoint.y);
      if (!placed && !built && !selectedBuilding && !harvested) {
        game.clearBuildingSelection();
      }
    }

    if (activePointers.size === 1) {
      const [[pointerId, point]] = activePointers.entries();
      dragPointerId = pointerId;
      previousDragPoint = point;
      pointerDownPoint = point;
      dragDistance = 0;
    } else {
      dragPointerId = null;
      previousDragPoint = null;
      pointerDownPoint = null;
      dragDistance = 0;
      canvas.classList.remove("is-dragging");
      updateCanvasHover(releasePoint);
    }
  };

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", (event) => endPointer(event, false));

  const resetPointerInteraction = () => {
    activePointers.clear();
    dragPointerId = null;
    previousDragPoint = null;
    previousPinchDistance = null;
    previousPinchCenter = null;
    pointerDownPoint = null;
    dragDistance = 0;
    canvas.classList.remove("is-dragging");
    updateCanvasHover(null);
  };
  window.addEventListener("blur", resetPointerInteraction);

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement) {
      return;
    }

    if (event.key === "F3") {
      event.preventDefault();
      game.toggleVisualDebug();
      game.strategicWorld.toggleDebug();
      return;
    }

    if (event.key === "Escape") {
      if (game.strategicWorld.activeRegionId) {
        game.strategicWorld.exitPrecisionToMap();
        updateCanvasHover(null);
        return;
      }
      if (game.getRallyState().open) {
        game.closeRallyCommand();
        updateCanvasHover(null);
        return;
      }
      if (game.isConstructionPlacementActive()) {
        game.cancelConstructionPlacement();
        updateCanvasHover(null);
        return;
      }
    }

    if (event.key === "+" || event.key === "=") {
      game.zoomCameraBy(WORLD_CONFIG.CAMERA_ZOOM_STEP);
    } else if (event.key === "-" || event.key === "_") {
      game.zoomCameraBy(-WORLD_CONFIG.CAMERA_ZOOM_STEP);
    } else if (event.key === "0") {
      game.focusHeadquarters(true);
    } else if (event.key.toLowerCase() === "m") {
      game.fitWholeWorld();
    } else {
      const panAmount = 80;
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") game.panCameraByScreen(panAmount, 0);
      if (key === "arrowright" || key === "d") game.panCameraByScreen(-panAmount, 0);
      if (key === "arrowup" || key === "w") game.panCameraByScreen(0, panAmount);
      if (key === "arrowdown" || key === "s") game.panCameraByScreen(0, -panAmount);
    }
  });

  game.onCameraChanged = (state) => {
    renderCamera(state);
    renderStrategicWorld();
    updateCanvasHover(null);
  };
  renderCamera();
  canvas.style.cursor = "grab";

  const renderTerritory = () => {
    const overview = game.getSettlementOverviewState();
    const state = overview.territory;

    territoryCount.textContent = "방어 거점";
    fundsValue.textContent = overview.funds.toLocaleString("ko-KR");
    woodValue.textContent = overview.wood.toLocaleString("ko-KR");
    populationValue.textContent = `${overview.population.current} / ${overview.population.capacity}`;
    securityValue.textContent = state.averageSecurity;
    supportValue.textContent = state.publicSupport;
    taxEstimate.textContent = `예상 세금 +${state.estimatedTax}`;
    taxCountdown.textContent = `${Math.ceil(state.nextTaxIn)}초 후 징수`;

    overviewIdleResidents.textContent = `${overview.roles.residents}명`;
    overviewLumberWorkers.textContent = `${overview.roles.lumber}명`;
    overviewConstructionWorkers.textContent = `${overview.roles.construction}명`;
    overviewSoldiers.textContent = `${overview.military.current}명`;
    overviewRifleSoldiers.textContent = `${overview.military.composition.rifle}명`;
    overviewMachineGunSoldiers.textContent = `${overview.military.composition.machineGun}명`;
    overviewShieldSoldiers.textContent = `${overview.military.composition.shield}명`;
    overviewResidentArrival.textContent = overview.population.arrivalStatus;
    overviewLumberStatus.textContent = overview.production.lumberStatus;
    overviewConstructionStatus.textContent = overview.production.constructionStatus;
    overviewTrainingStatus.textContent = overview.production.trainingStatus;
    const wave = game.waveDefense.getState();
    overviewEastStatus.textContent = wave.round > 0 ? `라운드 ${wave.round}` : "준비 중";
    overviewNorthStatus.textContent = wave.canStartNow
      ? `${wave.countdown}초 후 공격`
      : wave.phase === "spawning" || wave.phase === "combat"
        ? `남은 적 ${wave.remaining}명`
        : wave.phaseLabel;
    overviewObjective.textContent = overview.objective;

    for (const button of taxPolicyButtons) {
      const selected = button.dataset.taxPolicy === state.taxPolicy;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    }

    territoryList.innerHTML = state.territories
      .filter((territory) => territory.controlled)
      .map((territory) => `
        <div class="territory-row">
          <span>${territory.name}</span>
          <small>주민 ${territory.population} · 치안 ${territory.security} · 세금 +${territory.estimatedTax}</small>
        </div>
      `)
      .join("");
  };

  for (const button of taxPolicyButtons) {
    button.addEventListener("click", () => {
      game.setTaxPolicy(button.dataset.taxPolicy);
      renderTerritory();
    });
  }
  game.onTerritoryStateChanged = renderTerritory;
  renderTerritory();

  const riflemanCost = game.getRiflemanCost();
  const barracksCost = game.getBarracksCost();
  const barracksRequirements = game.getBarracksRequirements();

  const renderBarracks = () => {
    const state = game.getBarracksState();
    const resources = game.getResourceState();
    buildBarracksBtn.textContent = `병영 건설 · 군자금 ${barracksCost} / 목재 ${state.woodCost}`;
    buildBarracksBtn.hidden = state.built;
    buildBarracksBtn.disabled =
      !state.canBuild ||
      game.getFunds() < barracksCost ||
      resources.wood < state.woodCost;

    autoProductionBtn.hidden = !state.built;
    productionProgress.hidden = !state.built;

    if (!state.built) {
      if (game.getFunds() < barracksCost) {
        barracksStatus.textContent = "군자금이 부족합니다.";
      } else if (resources.wood < state.woodCost) {
        barracksStatus.textContent = `건설 자재 부족 · 목재 ${resources.wood}/${state.woodCost}`;
      } else {
        barracksStatus.textContent = "건설 가능한 자원이 준비되었습니다.";
      }
      productionProgressBar.style.width = "0%";
      return;
    }

    autoProductionBtn.textContent = state.autoProductionEnabled
      ? "자동 생산 ON"
      : "자동 생산 OFF";
    autoProductionBtn.classList.toggle(
      "is-off",
      !state.autoProductionEnabled
    );

    const elapsed = state.productionInterval - state.remaining;
    const progress = state.autoProductionEnabled
      ? Math.min(100, (elapsed / state.productionInterval) * 100)
      : 0;
    productionProgressBar.style.width = `${progress}%`;

    if (!state.autoProductionEnabled) {
      barracksStatus.textContent = "자동 생산이 중지되어 있습니다.";
    } else if (state.waitingForCapacity) {
      barracksStatus.textContent = "병력 생산이 대기 중입니다.";
    } else if (state.waitingForFunds) {
      barracksStatus.textContent = `군자금 ${state.unitCost} 필요 · 자금 대기 중`;
    } else {
      barracksStatus.textContent = `소총병 자동 생산까지 ${Math.ceil(state.remaining)}초 · 군자금 ${state.unitCost}`;
    }
  };

  const renderLumber = (state = game.getLumberState()) => {
    lumberPanel.hidden = true;
    if (!state.built) return;

    lumberWorkerCount.textContent = `벌목꾼 ${state.workerCount} / ${state.maxWorkers}`;
    lumberStorageText.textContent = `${state.storedWood} · 무제한`;
    lumberStorageBar.style.width = "100%";

    if (state.pendingWorkers > 0) {
      lumberWorkStatus.textContent = `${state.pendingWorkers}명 이동 중`;
      lumberHint.textContent = "유휴 주민이 벌목소까지 이동한 뒤 벌목꾼으로 배치됩니다.";
    } else if (state.workingCount > 0) {
      lumberWorkStatus.textContent = `${state.workingCount}명 작업 중`;
      lumberHint.textContent = "벌목꾼이 나무 한 그루를 베어 목재 1개씩 벌목소로 운반합니다.";
    } else {
      lumberWorkStatus.textContent = "나무 재생 대기";
      lumberHint.textContent = "나무가 자라면 벌목꾼이 자동으로 다시 출발합니다.";
    }

    hireLumberWorkerBtn.textContent = state.workerCount >= state.maxWorkers
      ? "벌목꾼 최대 인원"
      : `벌목꾼 배치 · 목재 ${state.hireCost}`;
    hireLumberWorkerBtn.disabled = !state.canHire;
    hireLumberWorkerBtn.hidden = state.tutorialLocked;
  };

  const renderConstruction = (state = game.getConstructionState()) => {
    constructionPanel.hidden = !state.unlocked;
    if (constructionPanel.hidden) return;

    cancelPlacementBtn.hidden = !state.placementActive;
    placeWorkshopBtn.hidden = true;
    placeTrainingCenterBtn.hidden = true;

    if (state.project) {
      constructionStatus.textContent = `${state.project.label} 공사 중`;
      if (state.project.deliveredWood < state.project.requiredWood) {
        constructionHint.textContent = `건설공이 자재를 운반하고 있습니다 · ${state.project.deliveredWood}/${state.project.requiredWood}`;
      } else {
        constructionHint.textContent = `건설 진행 ${Math.round(state.project.buildProgress * 100)}%`;
      }
      return;
    }

    if (state.placementActive) {
      constructionStatus.textContent = state.placementType === BUILDING_TYPES.TRAINING_CENTER
        ? "훈련소 위치 선택"
        : "작업소 위치 선택";
      constructionHint.textContent = "초록색 격자 위치를 클릭하세요. ESC로 취소할 수 있습니다.";
      return;
    }

    if (!state.workshopBuilt) {
      constructionStatus.textContent = "작업소 준비";
      placeWorkshopBtn.hidden = false;
      placeWorkshopBtn.disabled = !state.canAffordWorkshop || !state.canPlaceWorkshop;
      placeWorkshopBtn.textContent = `건설 작업소 · 목재 ${state.workshopCost}`;
      constructionHint.textContent = state.canAffordWorkshop
        ? "작업소를 지으면 이후 건물을 격자 안에 직접 배치할 수 있습니다."
        : `건설 작업소에 필요한 목재를 모으세요 · ${game.getResourceState().wood}/${state.workshopCost}`;
      return;
    }

    if (!state.trainingCenterBuilt) {
      constructionStatus.textContent = "훈련소 건설";
      placeTrainingCenterBtn.hidden = false;
      placeTrainingCenterBtn.disabled = !state.canAffordTrainingCenter || !state.canPlaceTrainingCenter;
      placeTrainingCenterBtn.textContent = `훈련소 · 목재 ${state.trainingCenterCost}`;
      constructionHint.textContent = "훈련 완료된 병사는 즉시 가장 가까운 적을 찾아 자동 전투합니다.";
      return;
    }

    constructionStatus.textContent = "정착 시설 가동 중";
    constructionHint.textContent = "건물을 클릭해 인력 배치와 업그레이드를 관리하세요.";
  };

  const renderProductionButtons = () => {
    spawnBtn.disabled = !game.canPurchaseRifleman();
    spawnBtn.textContent = `소총병 생산 · 군자금 ${riflemanCost}`;
  };

  const renderResources = (state = game.getResourceState()) => {
    woodValue.textContent = state.wood.toLocaleString("ko-KR");
    renderProductionButtons();
    renderBarracks();
    renderLumber();
    renderConstruction();
  };

  const renderFunds = (funds) => {
    fundsValue.textContent = funds.toLocaleString("ko-KR");
    renderProductionButtons();
    renderBarracks();
  };

  const renderTutorial = (state = game.getTutorialState()) => {
    const stage = game.getStageState();
    const militaryHidden = !stage.warUnlocked;

    if (tutorialPanel) tutorialPanel.hidden = true;

    regionHud.hidden = true;
    regionControls.hidden = true;
    territoryPanel.hidden = false;
    if (militaryHidden && worldDeployPanel) worldDeployPanel.hidden = true;
    // 병사는 훈련소에서 생산되는 즉시 자동 전투에 투입된다.
    uiLayer.hidden = true;
    focusRegionBtn.hidden = true;
    wholeWorldBtn.hidden = false;
    if (militaryHidden) {
      transitionPanel.hidden = true;
      barracksPanel.hidden = true;
    }
    fundsResourceItem.hidden = false;
    woodResourceItem.hidden = false;

    if (state.step === "gather_hq_wood") {
      resourceHint.textContent = state.current >= state.goal
        ? "임시 야영지의 정착 본부 예정지를 클릭하세요."
        : `정착 본부용 목재를 모으세요 · ${state.progressLabel}`;
    } else if (state.step === "gather_lumber_wood") {
      resourceHint.textContent = state.current >= state.goal
        ? "본부 옆 벌목소 예정지를 클릭하세요."
        : `벌목소용 목재를 모으세요 · ${state.progressLabel}`;
    } else if (state.step === "place_workshop") {
      resourceHint.textContent = state.current >= state.goal
        ? "건설 메뉴에서 작업소를 선택하고 위치를 정하세요."
        : `건설 작업소용 목재를 모으세요 · ${state.progressLabel}`;
    } else if (state.step === "build_workshop") {
      resourceHint.textContent = `건설 작업소 공사 중 · ${state.progressLabel}`;
    } else {
      const stageState = game.getStageState();
      if (!stageState.trainingCenterBuilt) {
        resourceHint.textContent = "건설 메뉴에서 병사를 생산할 훈련소를 준비하세요.";
      } else if (!stageState.warUnlocked) {
        resourceHint.textContent = "훈련소가 자동으로 첫 소총병을 생산합니다.";
      } else {
        resourceHint.textContent = "적의 라운드 공격을 막고 처치 골드로 병사를 강화하세요.";
      }
    }
    renderLumber();
    renderConstruction();
  };

  game.onFundsChanged = (funds) => {
    renderFunds(funds);
  };
  game.onResourcesChanged = (state) => {
    renderResources(state);
    renderTutorial();
  };
  game.onLumberStateChanged = (state) => {
    renderLumber(state);
    renderTutorial();
    renderBuildingManagement();
  };
  game.onBuildingSelectionChanged = (state) => {
    renderBuildingManagement(state);
    renderStrategicWorld();
  };
  game.onConstructionChanged = (state) => {
    renderConstruction(state);
    renderTutorial();
  };
  placeWorkshopBtn.addEventListener("click", () => {
    game.startConstructionPlacement(BUILDING_TYPES.CONSTRUCTION_WORKSHOP);
    renderConstruction();
    updateCanvasHover(null);
  });


  placeTrainingCenterBtn.addEventListener("click", () => {
    game.startConstructionPlacement(BUILDING_TYPES.TRAINING_CENTER);
    renderConstruction();
    updateCanvasHover(null);
  });

  cancelPlacementBtn.addEventListener("click", () => {
    game.cancelConstructionPlacement();
    renderConstruction();
    updateCanvasHover(null);
  });

  hireLumberWorkerBtn.addEventListener("click", () => {
    game.hireLumberWorker();
    renderLumber();
    renderResources();
  });

  buildingManageHireBtn.addEventListener("click", () => {
    game.hireSelectedBuildingWorker();
    renderBuildingManagement();
    renderResources();
  });

  buildingManageAutoBtn.addEventListener("click", () => {
    game.toggleTrainingAutoProduction();
    renderBuildingManagement();
    renderResources();
  });

  buildingManageDeployBtn.addEventListener("click", () => {});

  buildingManageUpgradeBtn.addEventListener("click", () => {
    game.upgradeSelectedBuilding();
    renderBuildingManagement();
    renderResources();
  });

  buildingManageCloseBtn.addEventListener("click", () => {
    game.clearBuildingSelection();
  });
  renderFunds(game.getFunds());
  renderResources();
  renderConstruction();
  renderBuildingManagement();

  spawnBtn.addEventListener("click", () => {
    game.purchaseRifleman();
  });

  if (tutorialCompleteBtn) {
    tutorialCompleteBtn.hidden = true;
  }

  // v0.53: 전초기지 점령 전환은 제거되었다. 남아 있는 호환 콜백은 화면을 열지 않는다.
  game.onCaptureTransitionReady = () => {
    transitionPanel.hidden = true;
    barracksPanel.hidden = true;
  };

  continueBtn.addEventListener("click", () => {
    if (!game.confirmCaptureTransition()) return;
    transitionPanel.hidden = true;
    barracksPanel.hidden = false;
    renderBarracks();
  });

  buildBarracksBtn.addEventListener("click", () => {
    game.buildBarracks();
    renderBarracks();
  });

  autoProductionBtn.addEventListener("click", () => {
    game.toggleBarracksAutoProduction();
    renderBarracks();
  });

  game.onBarracksStateChanged = () => {
    renderBarracks();
  };


  upgradeAttackBtn.addEventListener("click", () => game.waveDefense.purchaseUpgrade("attack"));
  upgradeHealthBtn.addEventListener("click", () => game.waveDefense.purchaseUpgrade("health"));
  upgradeFireRateBtn.addEventListener("click", () => game.waveDefense.purchaseUpgrade("fireRate"));
  startNextWaveBtn.addEventListener("click", () => {
    const state = game.waveDefense.getState();
    if (state.phase === "defeat") {
      window.location.reload();
      return;
    }
    game.waveDefense.startNextRoundNow();
  });

  worldDeployOneBtn.addEventListener("click", () => game.strategicWorld.setReserveDeploymentAmount("one"));
  worldDeployHalfBtn.addEventListener("click", () => game.strategicWorld.setReserveDeploymentAmount("half"));
  worldDeployAllBtn.addEventListener("click", () => game.strategicWorld.setReserveDeploymentAmount("all"));
  worldDeployCancelBtn.addEventListener("click", () => game.strategicWorld.cancelReserveDeployment());

  game.onRallyChanged = () => {
    renderStrategicWorld();
    renderBuildingManagement();
  };
  game.onReserveChanged = game.onRallyChanged;

  const syncFrontPanels = () => {
    transitionPanel.hidden = true;
    barracksPanel.hidden = true;
  };

  const renderRegion = () => {
    regionHud.hidden = true;
    regionControls.hidden = true;
    transitionPanel.hidden = true;
    barracksPanel.hidden = true;
    renderStrategicWorld();
  };

  region1Btn.addEventListener("click", () => game.moveCameraToRegion(1));
  region2Btn.addEventListener("click", () => game.moveCameraToRegion(2));
  advanceRegionBtn.addEventListener("click", () => {
    if (!game.startRegion2()) return;
    renderRegion();
    renderFunds(game.getFunds());
  });
  game.onRegionChanged = renderRegion;
  renderRegion();

  game.onTutorialChanged = (state) => {
    renderTutorial(state);
    if (!state.active) {
      renderResources();
      renderLumber();
    }
  };
  renderTutorial();

  const uiRefreshInterval = window.setInterval(() => {
    if (document.hidden) return;
    renderBarracks();
    renderTerritory();
    renderTutorial();
    renderLumber();
    renderConstruction();
    renderBuildingManagement();
    renderStrategicWorld();
  }, 250);

  window.addEventListener("pagehide", () => {
    window.clearInterval(uiRefreshInterval);
    window.removeEventListener("blur", resetPointerInteraction);
    game.destroy();
  }, { once: true });

  game.start();
});
