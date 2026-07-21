"use strict";

const WORLD_CONFIG = {
  GROUND_COLOR: "#355a3b",
  ROAD_COLOR: "rgba(187, 168, 125, 0.34)",
  ROAD_EDGE_COLOR: "rgba(235, 220, 178, 0.16)",
  ENEMY_SPAWN_INTERVAL: 4,
  TUTORIAL_MAX_ENEMY_SPAWNS: 3,
  REGION_2_ENEMY_SPAWNS: 8,
  REGION_2_ENEMY_HP_MULTIPLIER: 2.5,
  RIFLEMAN_COST: 20,
  STARTING_FUNDS: 0,
  FIRST_CAPTURE_REWARD: 500,
  REGION_2_CAPTURE_REWARD: 5000,
  ENEMY_KILL_REWARD: 10,
  CAPTURE_NOTICE_DURATION: 3,
  TAX_COLLECTION_INTERVAL: 5,
  HQ_POPULATION: 10,
  REGION_1_POPULATION: 50,
  REGION_2_POPULATION: 500,
  REWARD_TEXT_DURATION: 1.2,
  BARRACKS_COST: 100,
  BARRACKS_WOOD_COST: 20,
  BARRACKS_PRODUCTION_INTERVAL: 8,
  BARRACKS_UNIT_COST: 20,
  CAMERA_MIN_ZOOM: 0.2,
  CAMERA_MAX_ZOOM: 2.5,
  CAMERA_ZOOM_STEP: 0.15,
  CAMERA_SMOOTHING: 10,
  STRATEGIC_VIEW_ZOOM: 0.44,
  FRONTLINE_VIEW_ZOOM: 0.82,
  MAX_FRAME_DELTA: 0.05,
  HQ_WOOD_COST: 3,
  LUMBER_CAMP_WOOD_COST: 5,
  LUMBER_STORAGE_CAPACITY: Infinity, // 벌목소 저장량 제한 없음
  LUMBER_MAX_WORKERS: 2,
  LUMBER_WORKER_HIRE_WOOD_COST: 10,
  BUILD_GRID_SIZE: VISUAL_STYLE.gridSize,
  BUILD_ZONE_COLUMNS: 14,
  BUILD_ZONE_ROWS: 11,
  CONSTRUCTION_WORKSHOP_WOOD_COST: 12,
  CONSTRUCTION_WORKSHOP_BUILD_TIME: 7,
  HQ_MAX_LEVEL: 6,
  HQ_RESIDENT_BASE_CAPACITY: 4,
  RESIDENT_ARRIVAL_BASE_INTERVAL: 24,
  RESIDENT_ARRIVAL_MIN_INTERVAL: 2.5,
  RESIDENT_ARRIVAL_ROAD_DISTANCE: 260,
  HQ_UPGRADE_WOOD_COST: 20,
  LUMBER_MAX_LEVEL: 6,
  LUMBER_UPGRADE_WOOD_COST: 15,
  WORKSHOP_MAX_LEVEL: 6,
  WORKSHOP_WORKER_HIRE_WOOD_COST: 12,
  WORKSHOP_UPGRADE_WOOD_COST: 18,
  TRAINING_CENTER_WOOD_COST: 18,
  TRAINING_CENTER_BUILD_TIME: 8,
  TRAINING_CENTER_MAX_LEVEL: 6,
  TRAINING_CENTER_UPGRADE_WOOD_COST: 24,
  GROWTH_MULTIPLIER_PER_LEVEL: 2,
  // 훈련소는 레벨이 오를수록 회차당 인원만 완만하게 증가한다.
  // 생산 시간까지 동시에 줄이면 병력 증가율이 복리처럼 폭발하므로 8초로 고정한다.
  TRAINING_BATCH_BY_LEVEL: [1, 2, 3, 4, 6, 8],
  TRAINING_TIME_BY_LEVEL: [8, 8, 8, 8, 8, 8],
  TRAINING_MIN_TIME: 8,
  MAX_VISIBLE_RESIDENTS: 48,
  RIFLEMAN_TRAINING_WOOD_COST: 4,
  RIFLEMAN_TRAINING_TIME: 8,
  SOLDIER_SPATIAL_CELL_SIZE: 160,
  SOLDIER_QUERY_RADIUS: 300,
  TERRITORY_SECURITY_INTERVAL: 0.5,
  RESIZE_DEBOUNCE_MS: 120,
};

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this._resizeCanvas();

    this.worldWidth = this.canvas.width * 3;
    this.worldHeight = this.canvas.height * 3;
    this.worldBounds = { width: this.worldWidth, height: this.worldHeight };
    this.worldCenter = { x: this.worldWidth / 2, y: this.worldHeight / 2 };

    this.bases = [];
    this.soldiers = [];
    this.bullets = [];
    this.buildings = [];
    this._bulletPool = [];
    this._soldierSpatialIndex = null;

    this.lastTimestamp = 0;
    this._running = false;
    this._rafId = null;
    this._resizeTimer = null;
    this.cameraZoom = 1;
    this.cameraTargetZoom = 1;
    this.cameraX = 0;
    this.cameraY = 0;
    this.cameraTargetX = 0;
    this.cameraTargetY = 0;
    this.cameraZoomAnchor = null;
    this.onCameraChanged = null;
    this._lastCameraStateKey = "";

    this.activeFront = "east";
    this.hoveredFrontId = null;
    this.onRegionChanged = null;

    this.funds = WORLD_CONFIG.STARTING_FUNDS;
    this.onFundsChanged = null;
    this.resources = { wood: 0 };
    this.warUnlocked = false;
    this.resourceNodes = [];
    this.hoveredResourceNodeId = null;
    this.hoveredConstructionSiteId = null;
    this.onResourcesChanged = null;
    this.hqBuilt = false;
    this.lumberCamp = null;
    this.lumberWorkers = [];
    this.settlementResidents = [];
    this.incomingResident = null;
    this.residentTransfers = [];
    this.residentArrivalTimer = 0;
    this._residentArrivalUiTimer = 0;
    this.onLumberStateChanged = null;
    this.constructionWorkshop = null;
    this.trainingCenter = null;
    this.soldierTraining = {
      active: false,
      progress: 0,
      batchSize: 1,
    };
    this.trainingAutoEnabled = true;
    this._trainingUiTimer = 0;
    this.constructionWorkers = [];
    this.constructionProjects = [];
    this.constructionPlacement = null;
    this.constructionPreview = null;
    this.constructionSystemUnlocked = false;
    this.onConstructionChanged = null;
    this.selectedBuildingKey = null;
    this.onBuildingSelectionChanged = null;
    this.rallyCommandOpen = false;
    this.rallySelectedFrontId = "east";
    this.hoveredRallyPoint = false;
    this.hoveredRallyFrontId = null;
    this.onRallyChanged = null;
    this.settlementPopulation = 3;
    this.hqLevel = 1;
    this.tutorial = {
      active: true,
      completed: false,
      step: "gather_hq_wood",
      woodGoal: WORLD_CONFIG.HQ_WOOD_COST,
    };
    this.onTutorialChanged = null;
    this.taxPolicy = "normal";
    this.publicSupport = 70;
    this.taxCollectionTimer = 0;
    this._territorySecurityTimer = 0;
    this.onTerritoryStateChanged = null;
    this.rewardTexts = [];
    this.visualRenderSystem = new VisualRenderSystem(this);

    this.onCaptureTransitionReady = null;
    this.onBarracksStateChanged = null;
    this.onReserveChanged = null;

    this._createContinuousWorld();
    this._createResourceNodes();
    this._applyTutorialWorldVisibility();
    this._syncSettlementResidents();
    this._createTerritories();
    this.strategicWorld = new StrategicWorldSystem(this);
    this.waveDefense = new WaveDefenseSystem(this);
    this._defenseAnchors = [];
    this._syncLegacyAliases();
    this.focusHeadquarters(true);

    this._boundResize = () => this._scheduleResize();
    this._boundVisibilityChange = () => {
      this.lastTimestamp = 0;
    };
    window.addEventListener("resize", this._boundResize, { passive: true });
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this._boundVisibilityChange);
    }
  }

  _resizeCanvas() {
    const parent = this.canvas.parentElement;
    const width = Math.max(1, Math.floor(parent?.clientWidth || this.canvas.clientWidth || this.canvas.width || 1));
    const height = Math.max(1, Math.floor(parent?.clientHeight || this.canvas.clientHeight || this.canvas.height || 1));
    if (this.canvas.width === width && this.canvas.height === height) return false;
    this.canvas.width = width;
    this.canvas.height = height;
    return true;
  }

  _scheduleResize() {
    if (this._resizeTimer) window.clearTimeout(this._resizeTimer);
    this._resizeTimer = window.setTimeout(() => {
      this._resizeTimer = null;
      if (!this._resizeCanvas()) return;
      this.cameraZoomAnchor = null;
      this._clampCameraTarget();
      this._clampCameraCurrent();
      if (this.strategicWorld) this.strategicWorld.refreshViewport();
      this._emitCameraChanged(true);
      this.waveDefense?._emit?.(true);
    }, WORLD_CONFIG.RESIZE_DEBOUNCE_MS);
  }

  _createFrontState(id, label, dirX, dirY, region1Name, region2Name, color) {
    const c = this.worldCenter;
    const span = Math.abs(dirX) > 0 ? this.canvas.width : this.canvas.height;
    const region1Distance = span * 0.64;
    const region2Distance = span * 1.18;

    const region1Base = new Base(
      c.x + dirX * region1Distance,
      c.y + dirY * region1Distance,
      "enemy",
      "outpost"
    );
    region1Base.frontId = id;
    region1Base.regionId = 1;

    const region2Base = new Base(
      c.x + dirX * region2Distance,
      c.y + dirY * region2Distance,
      "enemy",
      "outpost"
    );
    region2Base.frontId = id;
    region2Base.regionId = 2;
    region2Base.isActive = false;

    this.bases.push(region1Base, region2Base);

    return {
      id,
      label,
      dirX,
      dirY,
      perpX: -dirY,
      perpY: dirX,
      color,
      region1Name,
      region2Name,
      region1Base,
      region2Base,
      currentRegion: 1,
      region2Unlocked: false,
      region2Started: false,
      region2Cleared: false,
      outpostState: "active",
      captureReward: 0,
      captureRewardGranted: false,
      captureTransitionReady: false,
      captureTransitionAcknowledged: false,
      enemySpawnTimer: 0,
      enemySpawnCount: 0,
      enemySpawnLimit: id === "north" ? 4 : WORLD_CONFIG.TUTORIAL_MAX_ENEMY_SPAWNS,
      // 벌목 단계가 끝났다고 적 성곽이 즉시 나타나지 않는다.
      // 플레이어가 해당 전선을 직접 선택하거나 병력을 배치했을 때 처음 발견된다.
      discovered: false,
      engaged: false,
      barracks: null,
      autoProductionEnabled: true,
      barracksProductionTimer: 0,
    };
  }

  _createContinuousWorld() {
    this.hqBase = new Base(this.worldCenter.x, this.worldCenter.y, "ally", "hq");
    // 시작 시에는 완성된 본부가 아니라 깃발과 보급품만 있는 임시 야영지다.
    // 플레이어가 직접 목재를 모아 정착 본부를 건설하면 settlement 외형으로 전환된다.
    this.hqBase.visualStyle = "camp";
    this.hqBase.frontId = "hq";
    this.bases.push(this.hqBase);

    this.fronts = {
      east: this._createFrontState(
        "east",
        "동부 전선",
        1,
        0,
        "동부 전초기지",
        "동부 요새",
        "#4da3ff"
      ),
      north: this._createFrontState(
        "north",
        "북부 전선",
        0,
        -1,
        "북부 전초기지",
        "북부 요새",
        "#8ca7ff"
      ),
    };
  }

  _createResourceNodes() {
    const c = this.worldCenter;
    this.resourceNodes = [
      {
        id: "woodland-hq",
        type: "wood",
        label: "벌목지",
        x: c.x - 265,
        y: c.y + 190,
        radius: 72,
        amount: 6,
        maxAmount: 6,
        regenInterval: 4.8,
        regenTimer: 0,
        harvestCooldown: 0,
        pulse: 0,
        unlocked: true,
        trees: [
          { id: "tree-1", x: c.x - 300, y: c.y + 174, amount: 1, maxAmount: 1, regenTimer: 0, assignedWorkerId: null },
          { id: "tree-2", x: c.x - 267, y: c.y + 148, amount: 1, maxAmount: 1, regenTimer: 0, assignedWorkerId: null },
          { id: "tree-3", x: c.x - 231, y: c.y + 169, amount: 1, maxAmount: 1, regenTimer: 0, assignedWorkerId: null },
          { id: "tree-4", x: c.x - 304, y: c.y + 214, amount: 1, maxAmount: 1, regenTimer: 0, assignedWorkerId: null },
          { id: "tree-5", x: c.x - 266, y: c.y + 222, amount: 1, maxAmount: 1, regenTimer: 0, assignedWorkerId: null },
          { id: "tree-6", x: c.x - 227, y: c.y + 207, amount: 1, maxAmount: 1, regenTimer: 0, assignedWorkerId: null },
        ],
      },
    ];
  }

  _applyTutorialWorldVisibility() {
    // v0.53: 3×3 지역 및 적 전초기지는 사용하지 않는다.
    // 적군은 라운드 시작 시 하나의 연속 월드 가장자리에서 등장한다.
    for (const front of Object.values(this.fronts)) {
      front.region1Base.isActive = false;
      front.region2Base.isActive = false;
      front.engaged = false;
      front.discovered = false;
    }
  }

  getStageState() {
    const settlementReady = Boolean(this.constructionWorkshop?.isBuilt);
    return {
      id: this.warUnlocked
        ? "wave_defense_active"
        : settlementReady
          ? "settlement_construction_ready"
          : "settlement_foundation",
      lumberOnly: !this.warUnlocked,
      warUnlocked: this.warUnlocked,
      constructionSystemUnlocked: this.constructionSystemUnlocked,
      constructionWorkshopBuilt: settlementReady,
      trainingCenterBuilt: Boolean(this.trainingCenter?.isBuilt),
    };
  }

  getTutorialState() {
    const step = this.tutorial.step;

    if (step === "gather_hq_wood") {
      const goal = WORLD_CONFIG.HQ_WOOD_COST;
      const current = Math.min(this.resources.wood, goal);
      return {
        active: true,
        completed: false,
        step,
        current,
        goal,
        progressLabel: `목재 ${current} / ${goal}`,
        buildSiteVisible: true,
        buildSiteReady: current >= goal,
        title: "정착 본부 준비",
        message: current >= goal
          ? "임시 야영지에 표시된 정착 본부 예정지를 클릭하세요."
          : `나무를 눌러 정착 본부에 필요한 목재 ${goal}개를 모으세요.`,
      };
    }

    if (step === "gather_lumber_wood") {
      const goal = WORLD_CONFIG.LUMBER_CAMP_WOOD_COST;
      const current = Math.min(this.resources.wood, goal);
      return {
        active: true,
        completed: false,
        step,
        current,
        goal,
        progressLabel: `목재 ${current} / ${goal}`,
        buildSiteVisible: true,
        buildSiteReady: current >= goal,
        title: "벌목소 준비",
        message: current >= goal
          ? "정착 본부 옆에 표시된 벌목소 예정지를 클릭하세요."
          : `벌목소 건설에 필요한 목재 ${goal}개를 더 모으세요.`,
      };
    }


    if (step === "place_workshop") {
      const cost = WORLD_CONFIG.CONSTRUCTION_WORKSHOP_WOOD_COST;
      return {
        active: true,
        completed: false,
        step,
        current: Math.min(this.resources.wood, cost),
        goal: cost,
        progressLabel: `목재 ${Math.min(this.resources.wood, cost)} / ${cost}`,
        buildSiteVisible: false,
        buildSiteReady: this.resources.wood >= cost,
        title: "건설 작업소 배치",
        message: "건설 메뉴에서 작업소를 선택한 뒤 정착지 안에 배치하세요.",
      };
    }

    if (step === "build_workshop") {
      const project = this.constructionProjects.find((item) => !item.completed);
      const progress = project
        ? project.deliveredWood < project.requiredWood
          ? project.deliveredWood / project.requiredWood
          : project.buildProgress
        : 0;
      return {
        active: true,
        completed: false,
        step,
        current: Math.round(progress * 100),
        goal: 100,
        progressLabel: project?.deliveredWood < project?.requiredWood
          ? `자재 ${project.deliveredWood} / ${project.requiredWood}`
          : `건설 ${Math.round((project?.buildProgress || 0) * 100)}%`,
        buildSiteVisible: false,
        buildSiteReady: false,
        title: "건설 작업소 건설",
        message: "건설공이 벌목소에서 자재를 운반해 작업소를 짓고 있습니다.",
      };
    }

    return {
      active: false,
      completed: true,
      step: "completed",
      current: 1,
      goal: 1,
      progressLabel: "건설 기반 완성",
      buildSiteVisible: false,
      buildSiteReady: false,
      title: "건설 기반 완성",
      message: "이제 새로운 시설을 격자 안에 배치할 수 있습니다.",
    };
  }

  _emitTutorialChanged(reason = "") {
    if (typeof this.onTutorialChanged === "function") {
      this.onTutorialChanged(this.getTutorialState(), { reason });
    }
  }

  _emitLumberStateChanged(reason = "") {
    if (typeof this.onLumberStateChanged === "function") {
      this.onLumberStateChanged(this.getLumberState(), { reason });
    }
  }

  _getLumberCampLocation() {
    return {
      x: this.worldCenter.x - 145,
      y: this.worldCenter.y + 55,
    };
  }

  _getHeadquartersConstructionSite() {
    if (this.hqBuilt || !this.tutorial.active || this.tutorial.step !== "gather_hq_wood") {
      return null;
    }

    return {
      id: "headquarters-site",
      kind: "headquarters",
      label: "정착 본부 예정지",
      actionLabel: "클릭하여 정착 본부 건설",
      waitingLabel: "정착 본부 예정지",
      x: this.hqBase.x,
      y: this.hqBase.y,
      width: 158,
      height: 112,
      cost: WORLD_CONFIG.HQ_WOOD_COST,
      ready: this.resources.wood >= WORLD_CONFIG.HQ_WOOD_COST,
    };
  }

  _getLumberConstructionSite() {
    if (!this.hqBuilt || this.lumberCamp || !this.tutorial.active || this.tutorial.step !== "gather_lumber_wood") {
      return null;
    }

    const location = this._getLumberCampLocation();
    return {
      id: "lumber-camp-site",
      kind: "lumber",
      label: "벌목소 예정지",
      actionLabel: "클릭하여 벌목소 건설",
      waitingLabel: "본부 옆 벌목소 예정지",
      x: location.x,
      y: location.y,
      width: 112,
      height: 78,
      cost: WORLD_CONFIG.LUMBER_CAMP_WOOD_COST,
      ready: this.resources.wood >= WORLD_CONFIG.LUMBER_CAMP_WOOD_COST,
    };
  }

  _getActiveConstructionSite() {
    return this._getHeadquartersConstructionSite() || this._getLumberConstructionSite();
  }

  getConstructionSiteAtScreen(screenX, screenY) {
    const site = this._getActiveConstructionSite();
    if (!site) return null;

    const world = this.screenToWorld(screenX, screenY);
    const zoom = Math.max(this.cameraZoom, 0.28);
    const padding = 18 / zoom;
    const labelTop = site.y - site.height / 2 - 88 / zoom;
    const labelBottom = site.y - site.height / 2 - 24 / zoom;
    const labelHalfWidth = 92 / zoom;

    const insideFootprint =
      world.x >= site.x - site.width / 2 - padding &&
      world.x <= site.x + site.width / 2 + padding &&
      world.y >= site.y - site.height / 2 - padding &&
      world.y <= site.y + site.height / 2 + padding;

    const insideLabel =
      world.x >= site.x - labelHalfWidth &&
      world.x <= site.x + labelHalfWidth &&
      world.y >= labelTop &&
      world.y <= labelBottom;

    return insideFootprint || insideLabel ? site : null;
  }

  setHoveredConstructionSite(siteId) {
    this.hoveredConstructionSiteId = siteId || null;
  }

  buildConstructionAtScreen(screenX, screenY) {
    const site = this.getConstructionSiteAtScreen(screenX, screenY);
    if (!site) return false;

    if (!site.ready) {
      this.showFundsNotice(`🪵 ${this.resources.wood}/${site.cost}`, site.x, site.y - site.height / 2 - 25);
      return true;
    }

    return site.kind === "headquarters"
      ? this.buildHeadquarters()
      : this.buildLumberCamp();
  }

  buildHeadquarters() {
    if (this.hqBuilt || this.tutorial.step !== "gather_hq_wood") return false;
    if (!this._spendResources({ wood: WORLD_CONFIG.HQ_WOOD_COST }, "정착 본부 건설")) return false;

    this.hqBuilt = true;
    this.hqBase.visualStyle = "settlement";
    this.tutorial.step = "gather_lumber_wood";
    this.tutorial.woodGoal = WORLD_CONFIG.LUMBER_CAMP_WOOD_COST;
    this._emitTutorialChanged("정착 본부 건설");
    this._emitResourcesChanged("정착 본부 건설");
    return true;
  }

  buildLumberCamp() {
    if (!this.hqBuilt || this.lumberCamp || this.tutorial.step !== "gather_lumber_wood") return false;
    if (!this._spendResources({ wood: WORLD_CONFIG.LUMBER_CAMP_WOOD_COST }, "벌목소 건설")) return false;

    const location = this._getLumberCampLocation();
    this.lumberCamp = new Building(location.x, location.y, BUILDING_TYPES.LUMBER_CAMP, TEAM.FRIENDLY);
    this.lumberCamp.storageCapacity = Infinity;
    if (typeof this.lumberCamp.setStoredAmount === "function") {
      this.lumberCamp.setStoredAmount(this.resources.wood);
      this.lumberCamp.displayedStoredAmount = this.resources.wood;
    }
    this.buildings.push(this.lumberCamp);

    this.hireLumberWorker(true);

    // v0.58: 자동 벌목량을 기다리는 중간 관문을 제거한다.
    // 벌목소가 완성되는 즉시 건설 작업소 배치 단계가 열리고,
    // 첫 벌목꾼은 뒤에서 계속 목재를 생산한다.
    this._unlockWorkshopTutorialStep("벌목소 완성 · 건설 작업소 해금");
    this.showFundsNotice(
      "벌목 자동화 시작 · 작업소 해금",
      this.lumberCamp.x,
      this.lumberCamp.y - this.lumberCamp.height / 2 - 34,
      1.25
    );
    return true;
  }

  _unlockWorkshopTutorialStep(reason = "건설 작업소 단계 개방") {
    if (!this.tutorial.active) return false;

    this.constructionSystemUnlocked = true;
    this.tutorial.step = "place_workshop";
    this._emitTutorialChanged(reason);
    this._emitResourcesChanged(reason);
    this._emitLumberStateChanged(reason);
    this._emitConstructionChanged(reason);
    return true;
  }

  completeTutorial() {
    // 구버전 호출 호환용: 더 이상 자동 벌목 목표량을 검사하지 않는다.
    if (!this.tutorial.active) return false;
    if (this.tutorial.step !== "auto_logging") return false;
    return this._unlockWorkshopTutorialStep("자동 벌목 대기 단계 제거");
  }

  _emitConstructionChanged(reason = "") {
    if (typeof this.onConstructionChanged === "function") {
      this.onConstructionChanged(this.getConstructionState(), { reason });
    }
  }

  _getBuildZone() {
    const size = WORLD_CONFIG.BUILD_GRID_SIZE;
    const width = WORLD_CONFIG.BUILD_ZONE_COLUMNS * size;
    const height = WORLD_CONFIG.BUILD_ZONE_ROWS * size;
    return {
      x: this.worldCenter.x - width / 2,
      y: this.worldCenter.y - height / 2,
      width,
      height,
      columns: WORLD_CONFIG.BUILD_ZONE_COLUMNS,
      rows: WORLD_CONFIG.BUILD_ZONE_ROWS,
      cellSize: size,
    };
  }

  _getBuildingFootprint(type) {
    const footprint = getVisualMetadata(type)?.footprint;
    if (footprint) {
      return { columns: footprint.columns, rows: footprint.rows };
    }
    return { columns: 2, rows: 2 };
  }

  _getPlacementFromWorld(worldX, worldY, type) {
    const zone = this._getBuildZone();
    const footprint = this._getBuildingFootprint(type);
    let column = Math.floor((worldX - zone.x) / zone.cellSize - footprint.columns / 2);
    let row = Math.floor((worldY - zone.y) / zone.cellSize - footprint.rows / 2);
    column = Math.max(0, Math.min(zone.columns - footprint.columns, column));
    row = Math.max(0, Math.min(zone.rows - footprint.rows, row));
    const width = footprint.columns * zone.cellSize;
    const height = footprint.rows * zone.cellSize;
    return {
      type,
      column,
      row,
      columns: footprint.columns,
      rows: footprint.rows,
      x: zone.x + column * zone.cellSize + width / 2,
      y: zone.y + row * zone.cellSize + height / 2,
      width,
      height,
    };
  }

  _rectanglesOverlap(a, b, padding = 0) {
    return !(
      a.x + a.width / 2 + padding <= b.x - b.width / 2 ||
      a.x - a.width / 2 - padding >= b.x + b.width / 2 ||
      a.y + a.height / 2 + padding <= b.y - b.height / 2 ||
      a.y - a.height / 2 - padding >= b.y + b.height / 2
    );
  }

  _isPlacementValid(placement) {
    if (!placement) return false;
    const zone = this._getBuildZone();
    const inside =
      placement.x - placement.width / 2 >= zone.x &&
      placement.x + placement.width / 2 <= zone.x + zone.width &&
      placement.y - placement.height / 2 >= zone.y &&
      placement.y + placement.height / 2 <= zone.y + zone.height;
    if (!inside) return false;

    const obstacles = [
      { x: this.hqBase.x, y: this.hqBase.y, width: 188, height: 142 },
    ];

    if (this.lumberCamp?.isBuilt) {
      obstacles.push({
        x: this.lumberCamp.x,
        y: this.lumberCamp.y,
        width: this.lumberCamp.width + 36,
        height: this.lumberCamp.height + 32,
      });
    }

    for (const building of this.buildings) {
      if (!building.isActive || building === this.lumberCamp) continue;
      obstacles.push({
        x: building.x,
        y: building.y,
        width: building.width + 24,
        height: building.height + 24,
      });
    }

    for (const project of this.constructionProjects) {
      if (project.completed) continue;
      obstacles.push({ x: project.x, y: project.y, width: project.width + 16, height: project.height + 16 });
    }

    if (obstacles.some((obstacle) => this._rectanglesOverlap(placement, obstacle, 4))) {
      return false;
    }

    // 숲과 벌목 동선 위에는 건물을 놓지 않는다.
    for (const node of this.resourceNodes) {
      if (node.unlocked === false) continue;
      const closestX = Math.max(
        placement.x - placement.width / 2,
        Math.min(node.x, placement.x + placement.width / 2)
      );
      const closestY = Math.max(
        placement.y - placement.height / 2,
        Math.min(node.y, placement.y + placement.height / 2)
      );
      if (Math.hypot(node.x - closestX, node.y - closestY) < node.radius + 24) {
        return false;
      }
    }

    if (this.lumberCamp) {
      const woodNode = this.resourceNodes.find((node) => node.type === "wood");
      if (woodNode) {
        const distanceToRoute = this._distancePointToSegment(
          placement.x,
          placement.y,
          this.lumberCamp.x,
          this.lumberCamp.y,
          woodNode.x,
          woodNode.y
        );
        if (distanceToRoute < Math.max(placement.width, placement.height) * 0.48) {
          return false;
        }
      }
    }

    return true;
  }

  _getConstructionCost(type) {
    if (type === BUILDING_TYPES.CONSTRUCTION_WORKSHOP) {
      return WORLD_CONFIG.CONSTRUCTION_WORKSHOP_WOOD_COST;
    }
    if (type === BUILDING_TYPES.TRAINING_CENTER) {
      return WORLD_CONFIG.TRAINING_CENTER_WOOD_COST;
    }
    return Infinity;
  }

  _getConstructionBuildTime(type) {
    if (type === BUILDING_TYPES.TRAINING_CENTER) return WORLD_CONFIG.TRAINING_CENTER_BUILD_TIME;
    return WORLD_CONFIG.CONSTRUCTION_WORKSHOP_BUILD_TIME;
  }

  _getConstructionLabel(type) {
    if (type === BUILDING_TYPES.TRAINING_CENTER) return "훈련소";
    return "건설 작업소";
  }

  _canConstructType(type) {
    if (!this.constructionSystemUnlocked) return false;
    if (this.constructionProjects.some((item) => !item.completed)) return false;
    if (type === BUILDING_TYPES.CONSTRUCTION_WORKSHOP) return !this.constructionWorkshop;
    if (type === BUILDING_TYPES.TRAINING_CENTER) {
      return Boolean(this.constructionWorkshop?.isBuilt) && !this.trainingCenter;
    }
    return false;
  }

  getConstructionState() {
    const project = this.constructionProjects.find((item) => !item.completed) || null;
    const workshopCost = WORLD_CONFIG.CONSTRUCTION_WORKSHOP_WOOD_COST;
    const trainingCenterCost = WORLD_CONFIG.TRAINING_CENTER_WOOD_COST;
    return {
      unlocked: this.constructionSystemUnlocked,
      workshopBuilt: Boolean(this.constructionWorkshop?.isBuilt),
      trainingCenterBuilt: Boolean(this.trainingCenter?.isBuilt),
      militaryBuildingsReady: Boolean(this.trainingCenter?.isBuilt),
      placementActive: Boolean(this.constructionPlacement),
      placementType: this.constructionPlacement?.type || null,
      previewValid: Boolean(this.constructionPreview?.valid),
      workshopCost,
      trainingCenterCost,
      canAffordWorkshop: this.resources.wood >= workshopCost,
      canAffordTrainingCenter: this.resources.wood >= trainingCenterCost,
      canPlaceWorkshop: this._canConstructType(BUILDING_TYPES.CONSTRUCTION_WORKSHOP),
      canPlaceTrainingCenter: this._canConstructType(BUILDING_TYPES.TRAINING_CENTER),
      project: project
        ? {
            type: project.type,
            label: this._getConstructionLabel(project.type),
            deliveredWood: project.deliveredWood,
            requiredWood: project.requiredWood,
            buildProgress: project.buildProgress,
          }
        : null,
    };
  }

  isConstructionPlacementActive() {
    return Boolean(this.constructionPlacement);
  }

  startConstructionPlacement(type = BUILDING_TYPES.CONSTRUCTION_WORKSHOP) {
    if (!this._canConstructType(type)) return false;
    const cost = this._getConstructionCost(type);
    if (!this._canAffordResources({ wood: cost })) {
      this.showFundsNotice(`🪵 ${this.resources.wood}/${cost}`, this.hqBase.x, this.hqBase.y - 95);
      return false;
    }

    this.constructionPlacement = { type };
    const recommendedOffset = type === BUILDING_TYPES.TRAINING_CENTER
      ? { x: 10, y: -155 }
      : { x: 180, y: 95 };
    const recommended = this._getPlacementFromWorld(
      this.worldCenter.x + recommendedOffset.x,
      this.worldCenter.y + recommendedOffset.y,
      type
    );
    recommended.valid = this._isPlacementValid(recommended);
    this.constructionPreview = recommended;
    this.focusHeadquarters(false);
    this._emitConstructionChanged(`${this._getConstructionLabel(type)} 배치 시작`);
    return true;
  }

  cancelConstructionPlacement() {
    if (!this.constructionPlacement) return false;
    this.constructionPlacement = null;
    this.constructionPreview = null;
    this._emitConstructionChanged("건설 배치 취소");
    return true;
  }

  updateConstructionPlacementAtScreen(screenX, screenY) {
    if (!this.constructionPlacement) return null;
    const world = this.screenToWorld(screenX, screenY);
    const placement = this._getPlacementFromWorld(world.x, world.y, this.constructionPlacement.type);
    placement.valid = this._isPlacementValid(placement);
    this.constructionPreview = placement;
    return placement;
  }

  confirmConstructionPlacementAtScreen(screenX, screenY) {
    if (!this.constructionPlacement) return false;
    const placement = this.updateConstructionPlacementAtScreen(screenX, screenY);
    if (!placement?.valid) {
      this.showFundsNotice("건설 불가", placement?.x || this.hqBase.x, (placement?.y || this.hqBase.y) - 45);
      return true;
    }

    const type = this.constructionPlacement.type;
    const cost = this._getConstructionCost(type);
    const idleWorkers = this._getActiveConstructionWorkers().filter((worker) => !worker.project);
    if (type !== BUILDING_TYPES.CONSTRUCTION_WORKSHOP && idleWorkers.length === 0) {
      this.showFundsNotice("대기 중인 건설공이 없습니다", this.constructionWorkshop.x, this.constructionWorkshop.y - 75);
      return true;
    }
    if (!this._spendResources({ wood: cost }, `${this._getConstructionLabel(type)} 자재 확보`)) return true;

    const project = {
      id: `construction-project-${Date.now()}`,
      type,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      column: placement.column,
      row: placement.row,
      requiredWood: cost,
      deliveredWood: 0,
      buildProgress: 0,
      lastReportedProgress: 0,
      completed: false,
    };
    this.constructionProjects.push(project);

    if (type === BUILDING_TYPES.CONSTRUCTION_WORKSHOP) {
      const source = this.lumberCamp || this.hqBase;
      const sourcePoint = this.getVisualInteractionPoint(source, "work", 0);
      const worker = new ConstructionWorker(
        sourcePoint.x,
        sourcePoint.y,
        source,
        project
      );
      this.constructionWorkers.push(worker);
      this.tutorial.step = "build_workshop";
    } else {
      for (const worker of idleWorkers) {
        worker.sourceBuilding = this.lumberCamp || this.constructionWorkshop;
        worker.project = project;
        worker.state = "to_material";
      }
    }

    this.constructionPlacement = null;
    this.constructionPreview = null;
    this._emitResourcesChanged(`${this._getConstructionLabel(type)} 자재 확보`);
    this._emitTutorialChanged(`${this._getConstructionLabel(type)} 착공`);
    this._emitConstructionChanged(`${this._getConstructionLabel(type)} 착공`);
    return true;
  }

  onConstructionMaterialDelivered(project) {
    if (!project || project.completed) return;
    this._emitTutorialChanged("건설 자재 운반");
    this._emitConstructionChanged("건설 자재 운반");
  }

  advanceConstructionProject(project, deltaTime) {
    if (!project || project.completed || project.deliveredWood < project.requiredWood) return;
    const buildTime = this._getConstructionBuildTime(project.type);
    project.buildProgress = Math.min(
      1,
      project.buildProgress + (deltaTime * this._getGrowthMultiplier(this._getWorkshopLevel())) / buildTime
    );
    if (project.buildProgress - project.lastReportedProgress >= 0.05) {
      project.lastReportedProgress = project.buildProgress;
      this._emitTutorialChanged("건설 진행");
      this._emitConstructionChanged("건설 진행");
    }
    if (project.buildProgress >= 1) {
      this._completeConstructionProject(project);
    }
  }

  _completeConstructionProject(project) {
    if (!project || project.completed) return false;
    project.completed = true;
    const building = new Building(project.x, project.y, project.type, TEAM.FRIENDLY);
    building.gridColumn = project.column;
    building.gridRow = project.row;
    this.buildings.push(building);

    if (project.type === BUILDING_TYPES.CONSTRUCTION_WORKSHOP) {
      this.constructionWorkshop = building;
    } else if (project.type === BUILDING_TYPES.TRAINING_CENTER) {
      this.trainingCenter = building;
    }

    for (const worker of this.constructionWorkers) {
      if (worker.project !== project) continue;
      worker.project = null;
      worker.sourceBuilding = this.constructionWorkshop || building;
      worker.state = "idle";
      const idlePoint = this.getVisualInteractionPoint(worker.sourceBuilding, "work", 0);
      worker.x = idlePoint.x;
      worker.y = idlePoint.y;
    }

    if (project.type === BUILDING_TYPES.CONSTRUCTION_WORKSHOP) {
      this.tutorial.active = false;
      this.tutorial.completed = true;
      this.tutorial.step = "completed";
      this.warUnlocked = false;
      this._applyTutorialWorldVisibility();
    }

    this._emitTutorialChanged(`${this._getConstructionLabel(project.type)} 완성`);
    this._emitConstructionChanged(`${this._getConstructionLabel(project.type)} 완성`);
    this._emitResourcesChanged(`${this._getConstructionLabel(project.type)} 완성`);
    this._emitLumberStateChanged(`${this._getConstructionLabel(project.type)} 완성`);
    this._emitBuildingSelectionChanged("건물 완성");
    return true;
  }

  _getResidentArrivalInterval() {
    const levelMultiplier = Math.pow(1.45, Math.max(0, this.hqLevel - 1));
    const supportMultiplier = 1 + Math.max(0, this.publicSupport - 50) * 0.006;
    const hqTerritory = this.territories?.find((item) => item.id === "hq");
    const security = hqTerritory?.security ?? 100;
    const securityPenalty = 1 + Math.max(0, 80 - security) * 0.012;
    return Math.max(
      WORLD_CONFIG.RESIDENT_ARRIVAL_MIN_INTERVAL,
      (WORLD_CONFIG.RESIDENT_ARRIVAL_BASE_INTERVAL / (levelMultiplier * supportMultiplier)) * securityPenalty
    );
  }

  getResidentArrivalState() {
    const capacity = this._getResidentCapacity();
    const vacant = Math.max(0, capacity - this.settlementPopulation - (this.incomingResident ? 1 : 0));
    const interval = this._getResidentArrivalInterval();
    return {
      population: this.settlementPopulation,
      capacity,
      vacant,
      incoming: Boolean(this.incomingResident),
      nextIn: this.incomingResident
        ? 0
        : Math.max(0, interval - this.residentArrivalTimer),
      interval,
    };
  }

  _startIncomingResident() {
    if (this.incomingResident || !this.hqBuilt) return false;
    if (this.settlementPopulation >= this._getResidentCapacity()) return false;

    const entrance = this.getVisualInteractionPoint(this.hqBase, "entrance", 0);
    const resident = new SettlementResident(
      this.hqBase.x - WORLD_CONFIG.RESIDENT_ARRIVAL_ROAD_DISTANCE,
      entrance.y + 8,
      null
    );
    resident.beginTravel(entrance.x, entrance.y + 18, "incoming");
    this.incomingResident = resident;
    this.showFundsNotice("새 주민이 오고 있습니다", resident.x, resident.y - 24, 0.9);
    this._emitBuildingSelectionChanged("주민 유입 시작");
    return true;
  }

  _completeIncomingResident() {
    const resident = this.incomingResident;
    if (!resident) return false;

    resident.finishTravel(this.hqBase);
    this.incomingResident = null;
    this.settlementResidents.push(resident);
    this.settlementPopulation += 1;
    const territory = this.territories?.find((item) => item.id === "hq");
    if (territory) territory.population = this.settlementPopulation;
    this._syncSettlementResidents();
    this.showFundsNotice("새 주민 도착", this.hqBase.x, this.hqBase.y - 92, 0.9);
    if (typeof this.onTerritoryStateChanged === "function") {
      this.onTerritoryStateChanged(this.getTerritoryState());
    }
    this._emitBuildingSelectionChanged("새 주민 도착");
    this._emitLumberStateChanged("새 주민 도착");
    return true;
  }

  _updateResidentArrival(deltaTime) {
    if (!this.hqBuilt) return;

    if (this.incomingResident) {
      this.incomingResident.update(deltaTime, this);
      if (this.incomingResident.travelComplete) this._completeIncomingResident();
    } else if (this.settlementPopulation < this._getResidentCapacity()) {
      this.residentArrivalTimer += deltaTime;
      if (this.residentArrivalTimer >= this._getResidentArrivalInterval()) {
        this.residentArrivalTimer = 0;
        this._startIncomingResident();
      }
    } else {
      this.residentArrivalTimer = 0;
    }

    this._residentArrivalUiTimer += deltaTime;
    if (this._residentArrivalUiTimer >= 0.25) {
      this._residentArrivalUiTimer = 0;
      if (this.selectedBuildingKey === "hq") {
        this._emitBuildingSelectionChanged("주민 유입 진행");
      }
    }
  }

  _getPendingTransferCount(role) {
    return this.residentTransfers.filter((transfer) => transfer.role === role).length;
  }

  _beginResidentTransfer(role, targetBuilding) {
    if (!targetBuilding || this.getAvailableResidentCount() <= 0) return false;

    const entrance = this.getVisualInteractionPoint(targetBuilding, "entrance", 0);
    const resident = this.settlementResidents.pop() || new SettlementResident(
      this.hqBase.x,
      this.hqBase.y + this.hqBase.height / 2 + 24,
      null
    );
    resident.beginTravel(entrance.x, entrance.y + 12, "transfer");
    this.residentTransfers.push({ resident, role, targetBuilding });
    this._syncSettlementResidents();
    this._emitBuildingSelectionChanged("주민 배치 이동");
    this._emitLumberStateChanged("주민 배치 이동");
    return true;
  }

  _finishResidentTransfer(transfer) {
    if (!transfer) return false;
    const { resident, role, targetBuilding } = transfer;
    const entrance = this.getVisualInteractionPoint(targetBuilding, "entrance", 0);

    if (role === "lumber") {
      const index = this.lumberWorkers.length;
      const spawnPoint = this.getVisualInteractionPoint(this.lumberCamp, "work", index % 2);
      const worker = new LumberWorker(spawnPoint.x, spawnPoint.y, this.lumberCamp);
      this.lumberWorkers.push(worker);
      this._applyLumberUpgradeEffects();
      this.showFundsNotice("벌목꾼 배치", entrance.x, entrance.y - 24, 0.75);
      this._emitLumberStateChanged("벌목꾼 배치");
    } else if (role === "construction") {
      const index = this.constructionWorkers.length;
      const spawnPoint = this.getVisualInteractionPoint(this.constructionWorkshop, "work", index % 2);
      const worker = new ConstructionWorker(
        spawnPoint.x,
        spawnPoint.y,
        this.constructionWorkshop,
        null
      );
      worker.state = "idle";
      this.constructionWorkers.push(worker);
      this._applyWorkshopUpgradeEffects();
      this.showFundsNotice("건설공 배치", entrance.x, entrance.y - 24, 0.75);
      this._emitConstructionChanged("건설공 배치");
    }

    resident.isActive = false;
    const index = this.residentTransfers.indexOf(transfer);
    if (index >= 0) this.residentTransfers.splice(index, 1);
    this._syncSettlementResidents();
    this._emitBuildingSelectionChanged("직업 배치 완료");
    return true;
  }

  _updateResidentTransfers(deltaTime) {
    for (const transfer of [...this.residentTransfers]) {
      transfer.resident.update(deltaTime, this);
      if (transfer.resident.travelComplete) this._finishResidentTransfer(transfer);
    }
  }

  _syncSettlementResidents() {
    // 주민 수치는 크게 성장하되 본부 화면에는 대표 인원만 표시해 성능을 유지한다.
    const desiredCount = Math.min(this.getAvailableResidentCount(), WORLD_CONFIG.MAX_VISIBLE_RESIDENTS);

    while (this.settlementResidents.length < desiredCount) {
      const resident = new SettlementResident(
        this.hqBase.x,
        this.hqBase.y + this.hqBase.height / 2 + 24,
        this.hqBase
      );
      this.settlementResidents.push(resident);
    }

    while (this.settlementResidents.length > desiredCount) {
      this.settlementResidents.pop();
    }

    const total = Math.max(1, this.settlementResidents.length);
    for (let i = 0; i < this.settlementResidents.length; i += 1) {
      this.settlementResidents[i].finishTravel(this.hqBase);
      this.settlementResidents[i].setAnchor(this.hqBase, i, total);
    }
  }

  _updateSettlementResidents(deltaTime) {
    this._syncSettlementResidents();
    for (const resident of this.settlementResidents) {
      if (resident.isActive) resident.update(deltaTime, this);
    }
  }

  _updateConstructionWorkers(deltaTime) {
    for (const worker of this.constructionWorkers) {
      if (worker.isActive) worker.update(deltaTime, this);
    }
  }


  getResourceState() {
    return {
      wood: this.resources.wood,
      nodes: this.resourceNodes.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        amount: Math.floor(node.amount),
        maxAmount: node.maxAmount,
        unlocked: node.unlocked !== false,
      })),
      barracksWoodCost: WORLD_CONFIG.BARRACKS_WOOD_COST,
    };
  }

  _emitResourcesChanged(reason = "") {
    if (typeof this.onResourcesChanged === "function") {
      this.onResourcesChanged(this.getResourceState(), { reason });
    }
    this._emitBuildingSelectionChanged(reason);
  }

  _canAffordResources(requirements = {}) {
    return Object.entries(requirements).every(([type, amount]) => {
      return (this.resources[type] || 0) >= Math.max(0, Math.floor(amount || 0));
    });
  }

  _spendResources(requirements = {}, reason = "자원 사용") {
    if (!this._canAffordResources(requirements)) return false;
    for (const [type, amount] of Object.entries(requirements)) {
      this.resources[type] = Math.max(0, (this.resources[type] || 0) - Math.max(0, Math.floor(amount || 0)));
    }
    this._emitResourcesChanged(reason);
    this._emitLumberStateChanged(reason);
    return true;
  }

  _getGrowthMultiplier(level = 1) {
    return Math.pow(WORLD_CONFIG.GROWTH_MULTIPLIER_PER_LEVEL, Math.max(0, Math.floor(level) - 1));
  }

  _getGeometricUpgradeCost(baseCost, level) {
    return Math.max(1, Math.round(baseCost * this._getGrowthMultiplier(level)));
  }

  _getLumberLevel() {
    return Math.max(1, this.lumberCamp?.level || 1);
  }

  _getLumberMaxWorkers() {
    return 2 * this._getLumberLevel();
  }

  _getWorkshopLevel() {
    return Math.max(1, this.constructionWorkshop?.level || 1);
  }

  _getWorkshopMaxWorkers() {
    return 2 * this._getWorkshopLevel();
  }

  _getTrainingCenterLevel() {
    return Math.max(1, this.trainingCenter?.level || 1);
  }

  _getTrainingBatchSize() {
    const level = this._getTrainingCenterLevel();
    const table = WORLD_CONFIG.TRAINING_BATCH_BY_LEVEL || [1];
    const index = Math.max(0, Math.min(table.length - 1, level - 1));
    return Math.max(1, Math.floor(table[index] || 1));
  }

  _getTrainingCycleCost(batchSize = this._getTrainingBatchSize()) {
    return WORLD_CONFIG.RIFLEMAN_TRAINING_WOOD_COST * Math.max(1, Math.floor(batchSize));
  }

  _getAvailableTrainingBatchSize() {
    return this._getTrainingBatchSize();
  }

  // 막사와 병력 수용 한도를 제거했다. 병력은 생산 비용과 회차당 훈련 인원으로 성장한다.
  getMilitaryCapacity() {
    return null;
  }

  getFriendlyMilitaryComposition() {
    const composition = { rifle: 0, machineGun: 0, shield: 0 };
    for (const soldier of this.soldiers) {
      if (soldier.team !== TEAM.FRIENDLY || !soldier.isActive || soldier.isDead) continue;
      const unitType = Object.prototype.hasOwnProperty.call(composition, soldier.unitType)
        ? soldier.unitType
        : "rifle";
      composition[unitType] += 1;
    }

    const abstract = this.strategicWorld?.getPlayerAbstractMilitaryComposition?.();
    if (abstract) {
      for (const unitType of Object.keys(composition)) {
        composition[unitType] += Math.max(0, Math.floor(abstract[unitType] || 0));
      }
    }
    return composition;
  }

  getFriendlyMilitaryCount(includeTraining = false) {
    const activeSoldiers = this.soldiers.filter(
      (soldier) => soldier.team === TEAM.FRIENDLY && soldier.isActive && !soldier.isDead
    ).length;
    const abstractSoldiers = this.strategicWorld?.getPlayerAbstractMilitaryCount?.() || 0;
    const trainingCount = includeTraining && this.soldierTraining.active
      ? Math.max(1, this.soldierTraining.batchSize || 1)
      : 0;
    return activeSoldiers + abstractSoldiers + trainingCount;
  }

  isMilitaryCapacityFull() {
    return false;
  }

  _getRiflemanTrainingDuration() {
    const level = this._getTrainingCenterLevel();
    const table = WORLD_CONFIG.TRAINING_TIME_BY_LEVEL || [WORLD_CONFIG.RIFLEMAN_TRAINING_TIME];
    const index = Math.max(0, Math.min(table.length - 1, level - 1));
    return Math.max(
      WORLD_CONFIG.TRAINING_MIN_TIME,
      Number(table[index]) || WORLD_CONFIG.RIFLEMAN_TRAINING_TIME
    );
  }

  _getActiveConstructionWorkers() {
    return this.constructionWorkers.filter((worker) => worker.isActive);
  }

  _getAssignedWorkerCount() {
    const lumberCount = this.lumberWorkers.filter((worker) => worker.isActive).length;
    const constructionCount = this._getActiveConstructionWorkers().length;
    const transferCount = this.residentTransfers.length;
    // 병사는 주민 인원 한도와 완전히 분리된다.
    return lumberCount + constructionCount + transferCount;
  }

  _getResidentCapacity() {
    return WORLD_CONFIG.HQ_RESIDENT_BASE_CAPACITY * this._getGrowthMultiplier(this.hqLevel);
  }

  getAvailableResidentCount() {
    return Math.max(0, this.settlementPopulation - this._getAssignedWorkerCount());
  }

  _applyLumberUpgradeEffects() {
    const level = this._getLumberLevel();
    const growth = this._getGrowthMultiplier(level);
    const speedMultiplier = 1 + (level - 1) * 0.12;
    const chopMultiplier = Math.pow(1.22, level - 1);
    for (const worker of this.lumberWorkers) {
      worker.speed = 72 * speedMultiplier;
      worker.chopDuration = Math.max(0.55, 3 / chopMultiplier);
      worker.carryCapacity = growth;
    }
  }

  _applyWorkshopUpgradeEffects() {
    const level = this._getWorkshopLevel();
    const speedMultiplier = Math.pow(1.28, level - 1);
    for (const worker of this.constructionWorkers) {
      worker.speed = 66 * speedMultiplier;
      worker.materialBundle = this._getGrowthMultiplier(level);
    }
  }

  _emitBuildingSelectionChanged(reason = "") {
    if (typeof this.onBuildingSelectionChanged === "function") {
      this.onBuildingSelectionChanged(this.getSelectedBuildingState(), { reason });
    }
  }

  getBuildingAtScreen(screenX, screenY) {
    if (this.isConstructionPlacementActive()) return null;
    const world = this.screenToWorld(screenX, screenY);
    const candidates = [];

    if (this.hqBuilt) {
      candidates.push({
        key: "hq",
        x: this.hqBase.x,
        y: this.hqBase.y,
        width: 156,
        height: 130,
      });
    }
    if (this.lumberCamp?.isBuilt) {
      candidates.push({
        key: "lumber",
        x: this.lumberCamp.x,
        y: this.lumberCamp.y,
        width: this.lumberCamp.width + 24,
        height: this.lumberCamp.height + 34,
      });
    }
    if (this.constructionWorkshop?.isBuilt) {
      candidates.push({
        key: "workshop",
        x: this.constructionWorkshop.x,
        y: this.constructionWorkshop.y,
        width: this.constructionWorkshop.width + 24,
        height: this.constructionWorkshop.height + 34,
      });
    }
    if (this.trainingCenter?.isBuilt) {
      candidates.push({
        key: "training_center",
        x: this.trainingCenter.x,
        y: this.trainingCenter.y,
        width: this.trainingCenter.width + 24,
        height: this.trainingCenter.height + 34,
      });
    }

    return candidates.find((item) => (
      world.x >= item.x - item.width / 2 &&
      world.x <= item.x + item.width / 2 &&
      world.y >= item.y - item.height / 2 &&
      world.y <= item.y + item.height / 2
    )) || null;
  }

  selectBuildingAtScreen(screenX, screenY) {
    const target = this.getBuildingAtScreen(screenX, screenY);
    if (!target) return false;
    this.selectedBuildingKey = target.key;
    this._emitBuildingSelectionChanged("건물 선택");
    return true;
  }

  clearBuildingSelection() {
    if (!this.selectedBuildingKey) return false;
    this.selectedBuildingKey = null;
    this._emitBuildingSelectionChanged("선택 해제");
    return true;
  }

  getSelectedBuildingState() {
    const key = this.selectedBuildingKey;
    if (!key) return { selected: false };

    const availableResidents = this.getAvailableResidentCount();
    if (key === "hq" && this.hqBuilt) {
      const maxLevel = WORLD_CONFIG.HQ_MAX_LEVEL;
      const level = this.hqLevel;
      const arrival = this.getResidentArrivalState();
      const upgradeCost = level < maxLevel ? this._getGeometricUpgradeCost(WORLD_CONFIG.HQ_UPGRADE_WOOD_COST, level) : null;
      const arrivalText = arrival.incoming
        ? "새 주민이 정착지로 이동 중입니다."
        : arrival.vacant <= 0
          ? "수용 공간이 가득 찼습니다. 본부를 업그레이드하세요."
          : `빈자리가 있어 약 ${Math.max(1, Math.ceil(arrival.nextIn))}초 후 새 주민이 찾아옵니다.`;
      return {
        selected: true,
        key,
        title: "정착 본부",
        level,
        maxLevel,
        description: "주민 수용 공간과 정착지 유입을 관리합니다.",
        workerLabel: "전체 주민",
        workerCount: this.settlementPopulation,
        workerMax: arrival.capacity,
        availableResidents,
        showHireAction: false,
        hireLabel: "주민 자동 유입",
        hireCost: null,
        canHire: false,
        hireReason: arrivalText,
        upgradeCost,
        canUpgrade: level < maxLevel && this.resources.wood >= upgradeCost,
        effectText: `유휴 주민 ${availableResidents}명 · 빈자리 ${arrival.vacant}명 · 수용 ${this.settlementPopulation}/${arrival.capacity}`,
      };
    }

    if (key === "lumber" && this.lumberCamp?.isBuilt) {
      const workers = this.lumberWorkers.filter((worker) => worker.isActive);
      const pendingWorkers = this._getPendingTransferCount("lumber");
      const level = this._getLumberLevel();
      const maxLevel = WORLD_CONFIG.LUMBER_MAX_LEVEL;
      const maxWorkers = this._getLumberMaxWorkers();
      const hireCost = WORLD_CONFIG.LUMBER_WORKER_HIRE_WOOD_COST;
      const upgradeCost = level < maxLevel ? this._getGeometricUpgradeCost(WORLD_CONFIG.LUMBER_UPGRADE_WOOD_COST, level) : null;
      return {
        selected: true,
        key,
        title: "벌목소",
        level,
        maxLevel,
        description: "벌목꾼을 배치하고 벌목 속도를 강화합니다.",
        workerLabel: "벌목꾼",
        workerCount: workers.length + pendingWorkers,
        workerMax: maxWorkers,
        availableResidents,
        hireLabel: "벌목꾼 배치",
        hireCost,
        canHire: !this.tutorial.active && workers.length + pendingWorkers < maxWorkers && availableResidents > 0 && this.resources.wood >= hireCost,
        hireReason: workers.length + pendingWorkers >= maxWorkers
          ? "현재 레벨의 작업 인원이 가득 찼습니다."
          : availableResidents <= 0
            ? "본부의 빈자리에 새 주민이 도착할 때까지 기다리세요."
            : this.tutorial.active
              ? "건설 기반 튜토리얼을 완료하세요."
              : "",
        upgradeCost,
        canUpgrade: level < maxLevel && this.resources.wood >= upgradeCost,
        effectText: `한 그루당 목재 ×${this._getGrowthMultiplier(level)} · 최대 벌목꾼 ${maxWorkers}명${pendingWorkers ? ` · 배치 이동 중 ${pendingWorkers}명` : ""}`,
      };
    }

    if (key === "workshop" && this.constructionWorkshop?.isBuilt) {
      const workers = this._getActiveConstructionWorkers();
      const pendingWorkers = this._getPendingTransferCount("construction");
      const level = this._getWorkshopLevel();
      const maxLevel = WORLD_CONFIG.WORKSHOP_MAX_LEVEL;
      const maxWorkers = this._getWorkshopMaxWorkers();
      const hireCost = WORLD_CONFIG.WORKSHOP_WORKER_HIRE_WOOD_COST;
      const upgradeCost = level < maxLevel ? this._getGeometricUpgradeCost(WORLD_CONFIG.WORKSHOP_UPGRADE_WOOD_COST, level) : null;
      return {
        selected: true,
        key,
        title: "건설 작업소",
        level,
        maxLevel,
        description: "건설공 수와 향후 건물 건설 속도를 관리합니다.",
        workerLabel: "건설공",
        workerCount: workers.length + pendingWorkers,
        workerMax: maxWorkers,
        availableResidents,
        hireLabel: "건설공 배치",
        hireCost,
        canHire: workers.length + pendingWorkers < maxWorkers && availableResidents > 0 && this.resources.wood >= hireCost,
        hireReason: workers.length + pendingWorkers >= maxWorkers
          ? "현재 레벨의 건설공 정원이 가득 찼습니다."
          : availableResidents <= 0
            ? "본부의 빈자리에 새 주민이 도착할 때까지 기다리세요."
            : "",
        upgradeCost,
        canUpgrade: level < maxLevel && this.resources.wood >= upgradeCost,
        effectText: `자재 운반량 ×${this._getGrowthMultiplier(level)} · 최대 건설공 ${maxWorkers}명${pendingWorkers ? ` · 배치 이동 중 ${pendingWorkers}명` : ""}`,
      };
    }

    if (key === "training_center" && this.trainingCenter?.isBuilt) {
      const level = this._getTrainingCenterLevel();
      const maxLevel = WORLD_CONFIG.TRAINING_CENTER_MAX_LEVEL;
      const batchSize = this._getTrainingBatchSize();
      const activeBatch = this.soldierTraining.active ? Math.max(1, this.soldierTraining.batchSize || 1) : 0;
      const hireCost = this._getTrainingCycleCost(batchSize);
      const upgradeCost = level < maxLevel
        ? this._getGeometricUpgradeCost(WORLD_CONFIG.TRAINING_CENTER_UPGRADE_WOOD_COST, level)
        : null;
      const duration = this._getRiflemanTrainingDuration();
      const progress = this.soldierTraining.active
        ? Math.min(100, Math.round((this.soldierTraining.progress / duration) * 100))
        : 0;
      let statusReason = "생산된 병사는 즉시 가장 가까운 적을 찾아 전투합니다.";
      if (this.soldierTraining.active) {
        statusReason = `소총병 ${activeBatch}명 자동 훈련 중 · ${Math.max(0, Math.ceil(duration - this.soldierTraining.progress))}초 남음`;
      } else if (!this.trainingAutoEnabled) {
        statusReason = "자동 생산이 꺼져 있습니다. 필요할 때 직접 훈련할 수 있습니다.";
      } else if (this.resources.wood < hireCost) {
        statusReason = `목재 대기 · ${this.resources.wood}/${hireCost}`;
      }
      return {
        selected: true,
        key,
        title: "훈련소",
        level,
        maxLevel,
        description: "병사를 생산하며, 훈련이 끝난 병사는 전장에 즉시 투입되어 가장 가까운 적을 자동 추적합니다.",
        workerLabel: "회차 생산량",
        workerCount: activeBatch || batchSize,
        workerMax: batchSize,
        availableResidents,
        hireLabel: this.soldierTraining.active ? `소총병 훈련 ${progress}%` : `소총병 ${batchSize}명 즉시 훈련`,
        hireCost,
        canHire: !this.soldierTraining.active && this.resources.wood >= hireCost,
        hireReason: statusReason,
        showAutoAction: true,
        autoEnabled: this.trainingAutoEnabled,
        upgradeCost,
        canUpgrade: level < maxLevel && this.resources.wood >= upgradeCost,
        effectText: `자동 생산 ${this.trainingAutoEnabled ? "ON" : "OFF"} · 회차당 ${batchSize}명 · ${duration.toFixed(1)}초 · 목재 ${hireCost}`,
      };
    }

    return { selected: false };
  }

  hireSelectedBuildingWorker() {
    const state = this.getSelectedBuildingState();
    if (!state.selected || !state.canHire) return false;

    if (state.key === "lumber") {
      if (!this.hireLumberWorker(false)) return false;
    } else if (state.key === "workshop") {
      if (!this._spendResources({ wood: state.hireCost }, "건설공 배치")) return false;
      if (!this._beginResidentTransfer("construction", this.constructionWorkshop)) {
        this.resources.wood += state.hireCost;
        this._emitResourcesChanged("건설공 배치 취소");
        return false;
      }
      this.showFundsNotice("주민이 작업소로 이동", this.hqBase.x, this.hqBase.y - 78, 0.75);
    } else if (state.key === "training_center") {
      return this.startRiflemanTraining();
    } else {
      return false;
    }

    this._emitBuildingSelectionChanged("인력 배치");
    this._emitLumberStateChanged("인력 배치");
    this._emitConstructionChanged("인력 배치");
    return true;
  }

  upgradeSelectedBuilding() {
    const state = this.getSelectedBuildingState();
    if (!state.selected || !state.canUpgrade || !Number.isFinite(state.upgradeCost)) return false;
    if (!this._spendResources({ wood: state.upgradeCost }, `${state.title} 업그레이드`)) return false;

    if (state.key === "hq") {
      this.hqLevel += 1;
      this.hqBase.level = this.hqLevel;
    } else if (state.key === "lumber") {
      this.lumberCamp.level = this._getLumberLevel() + 1;
      this._applyLumberUpgradeEffects();
    } else if (state.key === "workshop") {
      this.constructionWorkshop.level = this._getWorkshopLevel() + 1;
      this._applyWorkshopUpgradeEffects();
    } else if (state.key === "training_center") {
      this.trainingCenter.level = this._getTrainingCenterLevel() + 1;
    }

    const selectedBuilding = state.key === "hq"
      ? this.hqBase
      : state.key === "lumber"
        ? this.lumberCamp
        : state.key === "training_center"
          ? this.trainingCenter
          : this.constructionWorkshop;
    this.showFundsNotice(`${state.title} Lv.${state.level + 1}`, 
      selectedBuilding.x,
      selectedBuilding.y - (state.key === "hq" ? 94 : 78),
      0.9
    );
    this._emitBuildingSelectionChanged("건물 업그레이드");
    this._emitLumberStateChanged("건물 업그레이드");
    this._emitConstructionChanged("건물 업그레이드");
    return true;
  }

  getLumberState() {
    const workers = this.lumberWorkers.filter((worker) => worker.isActive);
    const pendingWorkers = this._getPendingTransferCount("lumber");
    const workingCount = workers.filter((worker) => worker.state !== "waiting_storage" && worker.state !== "waiting_tree").length;
    return {
      built: Boolean(this.lumberCamp?.isBuilt),
      workerCount: workers.length + pendingWorkers,
      maxWorkers: this._getLumberMaxWorkers(),
      workingCount,
      storedWood: this.resources.wood,
      storageCapacity: null,
      storageUnlimited: true,
      storageFull: false,
      hireCost: WORLD_CONFIG.LUMBER_WORKER_HIRE_WOOD_COST,
      canHire:
        Boolean(this.lumberCamp?.isBuilt) &&
        !this.tutorial.active &&
        workers.length + pendingWorkers < this._getLumberMaxWorkers() &&
        this.getAvailableResidentCount() > 0 &&
        this.resources.wood >= WORLD_CONFIG.LUMBER_WORKER_HIRE_WOOD_COST,
      tutorialLocked: this.tutorial.active,
      pendingWorkers,
    };
  }

  hireLumberWorker(free = false) {
    if (!this.lumberCamp?.isBuilt) return false;
    const occupied = this.lumberWorkers.filter((worker) => worker.isActive).length + this._getPendingTransferCount("lumber");
    if (occupied >= this._getLumberMaxWorkers()) return false;

    if (!free) {
      if (this.tutorial.active || this.getAvailableResidentCount() <= 0) return false;
      if (!this._spendResources({ wood: WORLD_CONFIG.LUMBER_WORKER_HIRE_WOOD_COST }, "벌목꾼 배치")) return false;
      if (!this._beginResidentTransfer("lumber", this.lumberCamp)) {
        this.resources.wood += WORLD_CONFIG.LUMBER_WORKER_HIRE_WOOD_COST;
        this._emitResourcesChanged("벌목꾼 배치 취소");
        return false;
      }
      this.showFundsNotice("주민이 벌목소로 이동", this.hqBase.x, this.hqBase.y - 78, 0.75);
      this._emitLumberStateChanged("벌목꾼 배치 이동");
      return true;
    }

    const index = this.lumberWorkers.length;
    const spawnPoint = this.getVisualInteractionPoint(this.lumberCamp, "work", index % 2);
    const worker = new LumberWorker(spawnPoint.x, spawnPoint.y, this.lumberCamp);
    this.lumberWorkers.push(worker);
    this._applyLumberUpgradeEffects();
    this._emitLumberStateChanged("첫 벌목꾼 합류");
    return true;
  }

  findTreeForWorker(worker) {
    const node = this.resourceNodes.find((item) => item.type === "wood" && item.unlocked !== false);
    if (!node?.trees) return null;
    const candidates = node.trees.filter(
      (tree) => tree.amount > 0 && (!tree.assignedWorkerId || tree.assignedWorkerId === worker.id)
    );
    if (!candidates.length) return null;
    return candidates.reduce((nearest, tree) => {
      const distance = Math.hypot(worker.x - tree.x, worker.y - tree.y);
      return !nearest || distance < nearest.distance ? { tree, distance } : nearest;
    }, null).tree;
  }

  syncWoodlandAmount() {
    const node = this.resourceNodes.find((item) => item.type === "wood");
    if (!node?.trees) return;
    node.amount = node.trees.reduce((sum, tree) => sum + Math.max(0, tree.amount), 0);
  }

  depositLumber(amount, worker = null) {
    const requested = Math.max(0, Math.floor(amount || 0));
    if (!requested || !this.lumberCamp?.isBuilt) return 0;
    const delivered = requested;
    this.resources.wood += delivered;

    // 목재 입고 피드백은 상시 아이콘이 아니라 입고 순간에만 짧게 한 번 표시한다.
    for (let i = this.rewardTexts.length - 1; i >= 0; i -= 1) {
      if (this.rewardTexts[i].kind === "lumber_delivery") this.rewardTexts.splice(i, 1);
    }
    this.rewardTexts.push({
      amount: 0,
      reason: "+🪵",
      x: this.lumberCamp.x,
      y: this.lumberCamp.y - this.lumberCamp.height / 2 - 20,
      timer: 0.62,
      duration: 0.62,
      kind: "lumber_delivery",
    });
    this._emitResourcesChanged("벌목꾼 운반");
    this._emitLumberStateChanged("벌목꾼 운반");

    return delivered;
  }

  _updateLumberWorkers(deltaTime) {
    for (const worker of this.lumberWorkers) {
      if (worker.isActive) worker.update(deltaTime, this);
    }
  }

  getResourceNodeAtScreen(screenX, screenY) {
    const world = this.screenToWorld(screenX, screenY);
    let best = null;
    for (const node of this.resourceNodes) {
      if (node.unlocked === false) continue;
      const distance = Math.hypot(world.x - node.x, world.y - node.y);
      const threshold = node.radius + 16 / Math.max(this.cameraZoom, 0.28);
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { ...node, distance };
      }
    }
    return best;
  }

  setHoveredResourceNode(nodeId) {
    this.hoveredResourceNodeId = nodeId || null;
  }

  harvestResourceAtScreen(screenX, screenY) {
    const hit = this.getResourceNodeAtScreen(screenX, screenY);
    if (!hit) return false;
    const node = this.resourceNodes.find((item) => item.id === hit.id);
    if (!node || node.unlocked === false) return false;
    if (node.harvestCooldown > 0) return true;

    if (node.type === "wood" && this.lumberCamp?.isBuilt) {
      node.harvestCooldown = 0.35;
      return true;
    }

    if (node.amount < 1) {
      this.showFundsNotice(`${node.label} 재생 중`, node.x, node.y - node.radius - 30);
      node.harvestCooldown = 0.25;
      return true;
    }

    if (node.type === "wood" && node.trees) {
      const tree = node.trees.find((item) => item.amount > 0);
      if (!tree) return true;
      tree.amount -= 1;
      this.syncWoodlandAmount();
    } else {
      node.amount -= 1;
    }

    node.harvestCooldown = 0.13;
    node.pulse = 1;
    this.resources[node.type] = (this.resources[node.type] || 0) + 1;
    const resourceLabel = "목재";
    this._emitResourcesChanged(`${resourceLabel} 채집`);
    this._emitLumberStateChanged(`${resourceLabel} 채집`);
    if (this.tutorial.active && node.type === "wood") {
      this._emitTutorialChanged("목재 채집");
    }
    return true;
  }

  _updateResourceNodes(deltaTime) {
    for (const node of this.resourceNodes) {
      if (node.unlocked === false) continue;
      node.harvestCooldown = Math.max(0, node.harvestCooldown - deltaTime);
      node.pulse = Math.max(0, node.pulse - deltaTime * 3.5);

      if (node.type === "wood" && node.trees) {
        let changed = false;
        for (const tree of node.trees) {
          if (tree.amount >= tree.maxAmount) {
            tree.amount = tree.maxAmount;
            tree.regenTimer = 0;
            continue;
          }
          tree.regenTimer += deltaTime;
          if (tree.regenTimer >= node.regenInterval) {
            tree.regenTimer -= node.regenInterval;
            tree.amount += 1;
            changed = true;
          }
        }
        if (changed) this.syncWoodlandAmount();
        continue;
      }

      if (node.amount >= node.maxAmount) {
        node.amount = node.maxAmount;
        node.regenTimer = 0;
        continue;
      }
      node.regenTimer += deltaTime;
      while (node.regenTimer >= node.regenInterval && node.amount < node.maxAmount) {
        node.regenTimer -= node.regenInterval;
        node.amount += 1;
      }
    }
  }

  _createTerritories() {
    this.territories = [
      { id: "hq", name: "중앙 본부", population: this.settlementPopulation, controlled: true, security: 100 },
      { id: "east-1", name: "동부 전초기지", population: WORLD_CONFIG.REGION_1_POPULATION, controlled: false, security: 0 },
      { id: "east-2", name: "동부 요새", population: WORLD_CONFIG.REGION_2_POPULATION, controlled: false, security: 0 },
      { id: "north-1", name: "북부 전초기지", population: WORLD_CONFIG.REGION_1_POPULATION, controlled: false, security: 0 },
      { id: "north-2", name: "북부 요새", population: WORLD_CONFIG.REGION_2_POPULATION, controlled: false, security: 0 },
    ];
  }

  _syncLegacyAliases() {
    const front = this.fronts[this.activeFront];
    this.allyBase = this.hqBase;
    this.firstOutpost = front.region1Base;
    this.region2Base = front.region2Base;
    this.enemyBase = this._getActiveEnemyBase(front);
    this.barracks = front.barracks;
    this.currentRegion = front.currentRegion;
    this.nextRegionUnlocked = front.region2Unlocked;
    this.region2Started = front.region2Started;
    this.region2Cleared = front.region2Cleared;
  }

  get outpostState() {
    return this.fronts[this.activeFront].outpostState;
  }

  _getActiveEnemyBase(front) {
    return front.region2Started && !front.region2Cleared
      ? front.region2Base
      : front.region1Base;
  }

  _revealFront(front) {
    if (!front || !this.warUnlocked) return false;
    if (front.discovered) return true;

    front.discovered = true;
    front.region1Base.isActive = true;
    front.region2Base.isActive = front.region2Started;
    this.showFundsNotice(`${front.label} 정찰 완료`, front.region1Base.x, front.region1Base.y - 90);
    return true;
  }

  _setActiveFront(frontId, engage = true) {
    const front = this.fronts[frontId];
    if (!front) return false;
    const changed = this.activeFront !== frontId;
    this.activeFront = frontId;
    if (engage) {
      this._revealFront(front);
      front.engaged = true;
    }
    this._syncLegacyAliases();

    if (changed && front.captureTransitionReady && !front.captureTransitionAcknowledged) {
      queueMicrotask(() => {
        if (typeof this.onCaptureTransitionReady === "function") {
          this.onCaptureTransitionReady({
            reward: front.captureReward,
            nextRegionUnlocked: front.region2Unlocked,
          });
        }
      });
    }

    if (typeof this.onRegionChanged === "function") this.onRegionChanged(this.getRegionState());
    if (typeof this.onBarracksStateChanged === "function") this.onBarracksStateChanged(this.getBarracksState());
    if (typeof this.onTerritoryStateChanged === "function") this.onTerritoryStateChanged(this.getTerritoryState());
    this._emitReserveChanged();
    return true;
  }

  startRiflemanTraining({ automatic = false } = {}) {
    if (!this.trainingCenter?.isBuilt || this.soldierTraining.active) return false;

    const batchSize = this._getAvailableTrainingBatchSize();
    const cost = this._getTrainingCycleCost(batchSize);
    if (!this._spendResources({ wood: cost }, automatic ? "훈련소 자동 생산" : "소총병 훈련 장비")) {
      if (!automatic) this.showFundsNotice(`🪵 ${this.resources.wood}/${cost}`, this.trainingCenter.x, this.trainingCenter.y - 82);
      return false;
    }

    this.soldierTraining.active = true;
    this.soldierTraining.progress = 0;
    this.soldierTraining.batchSize = batchSize;
    this._trainingUiTimer = 0;
    if (!automatic) {
      const entrance = this.getVisualInteractionPoint(this.trainingCenter, "entrance", 0);
      this.showFundsNotice(`소총병 ${batchSize}명 훈련 시작`, entrance.x, entrance.y - 28, 0.75);
    }
    this._emitBuildingSelectionChanged(automatic ? "자동 훈련 시작" : "소총병 훈련 시작");
    return true;
  }

  toggleTrainingAutoProduction() {
    if (!this.trainingCenter?.isBuilt) return false;
    this.trainingAutoEnabled = !this.trainingAutoEnabled;
    this._emitBuildingSelectionChanged("훈련소 자동 생산 전환");
    return true;
  }

  _updateSoldierTraining(deltaTime) {
    if (!this.trainingCenter?.isBuilt) return;

    if (!this.soldierTraining.active) {
      if (this.trainingAutoEnabled) this.startRiflemanTraining({ automatic: true });
      return;
    }

    const duration = this._getRiflemanTrainingDuration();
    this.soldierTraining.progress = Math.min(duration, this.soldierTraining.progress + deltaTime);
    this._trainingUiTimer += deltaTime;
    if (this._trainingUiTimer >= 0.18) {
      this._trainingUiTimer = 0;
      if (this.selectedBuildingKey === "training_center") {
        this._emitBuildingSelectionChanged("훈련 진행");
      }
    }
    if (this.soldierTraining.progress < duration) return;

    const completedBatch = Math.max(1, this.soldierTraining.batchSize || 1);
    this.soldierTraining.active = false;
    this.soldierTraining.progress = 0;
    this.soldierTraining.batchSize = 1;

    let spawned = 0;
    for (let i = 0; i < completedBatch; i += 1) {
      const soldier = this.spawnCombatSoldier(i, completedBatch);
      if (!soldier) break;
      spawned += 1;
    }

    if (spawned > 0 && !this.warUnlocked) {
      this.warUnlocked = true;
      this._applyTutorialWorldVisibility();
      this._emitTutorialChanged("첫 병사 훈련 완료");
      if (typeof this.onRegionChanged === "function") this.onRegionChanged(this.getRegionState());
      this.waveDefense?._emit?.(true);
    }
    if (spawned > 0) {
      const entrance = this.getVisualInteractionPoint(this.trainingCenter, "entrance", 0);
      this.showFundsNotice(`소총병 +${spawned}`, entrance.x, entrance.y - 28, 0.75);
    }
    this._emitBuildingSelectionChanged("소총병 훈련 완료");
    this._emitReserveChanged();
  }

  getRiflemanCost() {
    return WORLD_CONFIG.RIFLEMAN_COST;
  }

  getRiflemanRequirements() {
    return { funds: WORLD_CONFIG.RIFLEMAN_COST };
  }

  canPurchaseRifleman() {
    return Boolean(this.warUnlocked && this.trainingCenter?.isBuilt && this.funds >= WORLD_CONFIG.RIFLEMAN_COST);
  }

  purchaseRifleman() {
    if (!this.warUnlocked || !this.trainingCenter?.isBuilt) return false;
    if (this.funds < WORLD_CONFIG.RIFLEMAN_COST) {
      this.showFundsNotice("골드 부족");
      return false;
    }
    this.spendFunds(WORLD_CONFIG.RIFLEMAN_COST, "소총병 생산");
    this.spawnCombatSoldier();
    return true;
  }

  _getRallyCenter() {
    return this.getVisualInteractionPoint(this.trainingCenter || this.hqBase, "entrance");
  }

  _getDefenseSlot(index) {
    // 총 병력 수가 바뀔 때마다 기존 대기 위치가 재계산되면 같은 칸이 겹칠 수 있다.
    // 인덱스만으로 항상 동일한 위치가 나오는 고정 동심원 슬롯을 사용한다.
    let ring = 0;
    let indexInRing = Math.max(0, Math.floor(index));
    let ringCapacity = 8;
    while (indexInRing >= ringCapacity) {
      indexInRing -= ringCapacity;
      ring += 1;
      ringCapacity = 8 + ring * 4;
    }
    const angle = -Math.PI / 2 + (indexInRing / ringCapacity) * Math.PI * 2;
    const radius = 115 + ring * 42;
    return {
      x: this.hqBase.x + Math.cos(angle) * radius,
      y: this.hqBase.y + Math.sin(angle) * radius,
    };
  }

  _getNextDefenseSlotIndex() {
    const used = new Set();
    for (const soldier of this.soldiers) {
      if (soldier.team !== TEAM.FRIENDLY || !soldier.isActive || soldier.isDead) continue;
      if (Number.isInteger(soldier.defenseSlotIndex) && soldier.defenseSlotIndex >= 0) {
        used.add(soldier.defenseSlotIndex);
      }
    }
    let index = 0;
    while (used.has(index)) index += 1;
    return index;
  }

  _createDefenseAnchor(slot) {
    const anchor = new Base(slot.x, slot.y, "enemy", "outpost");
    anchor.width = 0;
    anchor.height = 0;
    anchor.isActive = false;
    anchor.hp = 1;
    anchor.maxHp = 1;
    this._defenseAnchors.push(anchor);
    return anchor;
  }

  spawnCombatSoldier(batchIndex = 0, batchTotal = 1) {
    if (!this.trainingCenter?.isBuilt) return null;
    const entrance = this.getVisualInteractionPoint(this.trainingCenter, "entrance");
    const defenseSlotIndex = this._getNextDefenseSlotIndex();
    const slot = this._getDefenseSlot(defenseSlotIndex);
    const anchor = this._createDefenseAnchor(slot);
    const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, batchTotal))));
    const row = Math.floor(batchIndex / columns);
    const column = batchIndex % columns;
    const spawnX = entrance.x + (column - (columns - 1) / 2) * 12;
    const spawnY = entrance.y + row * 10;
    const soldier = new Soldier(
      spawnX,
      spawnY,
      TEAM.FRIENDLY,
      anchor,
      SOLDIER_CONFIG.RIFLEMAN,
      {
        frontId: "arena",
        homeBase: this.trainingCenter,
        laneOffset: 0,
        awaitingOrder: false,
        globalEnemySearch: true,
      }
    );
    soldier.defenseAnchor = anchor;
    soldier.defenseSlotIndex = defenseSlotIndex;
    soldier.strategicRegistered = true;
    this.soldiers.push(soldier);
    this.waveDefense?.applyUpgradesToSoldier?.(soldier);
    this._emitReserveChanged();
    return soldier;
  }

  // 구버전 호출 호환. 이제 대기 병력이 아니라 즉시 전투 병력을 생성한다.
  spawnReserveSoldier() {
    return this.spawnCombatSoldier();
  }

  activateAllSoldiersForDefense() {
    const friendlies = this.soldiers.filter((soldier) =>
      soldier.team === TEAM.FRIENDLY && soldier.isActive && !soldier.isDead
    );
    const usedSlots = new Set(friendlies
      .map((soldier) => soldier.defenseSlotIndex)
      .filter((index) => Number.isInteger(index) && index >= 0));
    friendlies.forEach((soldier) => {
      this.waveDefense?.applyUpgradesToSoldier?.(soldier);
      soldier.awaitingOrder = false;
      soldier.globalEnemySearch = true;
      soldier.frontId = "arena";
      soldier.homeBase = this.trainingCenter || this.hqBase;
      if (!soldier.defenseAnchor) {
        let index = 0;
        while (usedSlots.has(index)) index += 1;
        usedSlots.add(index);
        soldier.defenseSlotIndex = index;
        const anchor = this._createDefenseAnchor(this._getDefenseSlot(index));
        soldier.defenseAnchor = anchor;
        soldier.setTargetBase(anchor, soldier.homeBase);
      }
    });
    return friendlies.length;
  }

  spawnWaveEnemy(point, unitType = "rifle", strength = {}, boss = false) {
    if (!point || !this.hqBase || this.hqBase.isDestroyed) return null;
    const baseConfig = SOLDIER_TYPE_CONFIG[unitType] || SOLDIER_CONFIG.RIFLEMAN;
    const hpMultiplier = Math.max(0.1, Number(strength.hp) || 1) * (boss ? 2.8 : 1);
    const damageMultiplier = Math.max(0.1, Number(strength.damage) || 1) * (boss ? 1.75 : 1);
    const speedMultiplier = Math.max(0.5, Number(strength.speed) || 1) * (boss ? 0.9 : 1);
    const config = {
      ...baseConfig,
      MAX_HP: Math.round(baseConfig.MAX_HP * hpMultiplier),
      ATTACK_DAMAGE: Math.max(1, Math.round(baseConfig.ATTACK_DAMAGE * damageMultiplier)),
      SPEED: baseConfig.SPEED * speedMultiplier,
      MAX_AMMO: Math.max(baseConfig.MAX_AMMO, 120),
    };
    const soldier = new Soldier(
      point.x,
      point.y,
      TEAM.ENEMY,
      this.hqBase,
      config,
      {
        frontId: "arena",
        homeBase: null,
        laneOffset: (Math.random() * 2 - 1) * 110,
      }
    );
    soldier.waveEnemy = true;
    soldier.waveRound = this.waveDefense?.round || 1;
    soldier.spawnEdge = point.edge || "";
    soldier.isWaveBoss = Boolean(boss);
    if (boss) {
      soldier.size *= 1.25;
      soldier.radius *= 1.25;
    }
    this.soldiers.push(soldier);
    return soldier;
  }

  _getRallySoldiers() {
    return [];
  }

  _syncRallyFormation() {}

  _getRallyFormationMetrics() {
    const center = this._getRallyCenter();
    return { visualCenter: center, width: 0, height: 0 };
  }

  _getRallyFrontArrowPosition() {
    return null;
  }

  getRallyState() {
    return {
      count: 0,
      open: false,
      selectedFrontId: "arena",
      selectedFrontLabel: "자동 전투",
      canDeploy: false,
      rallyCenter: this._getRallyCenter(),
    };
  }

  getReserveState() {
    return this.getRallyState();
  }

  _emitReserveChanged() {
    const state = this.getRallyState();
    const callbacks = new Set([this.onReserveChanged, this.onRallyChanged]);
    for (const callback of callbacks) {
      if (typeof callback === "function") callback(state);
    }
  }

  setHoveredRallyPoint() {}

  setHoveredRallyFront() {}

  getRallyPointAtScreen() {
    return null;
  }

  getRallyFrontCommandAtScreen() {
    return null;
  }

  openRallyCommand() {
    return false;
  }

  closeRallyCommand() {
    return false;
  }

  toggleRallyCommand() {
    return false;
  }

  selectRallyFront() {
    return false;
  }

  deployRally() {
    return 0;
  }

  deployReserve() {
    return 0;
  }

  _getBaseHalfExtent(base, dirX, dirY) {
    return Math.abs(dirX) * base.width / 2 + Math.abs(dirY) * base.height / 2;
  }

  spawnSoldier(team, frontId = this.activeFront, spawnSource = null, unitType = "rifle") {
    const front = this.fronts[frontId];
    if (!front) return null;
    front.engaged = true;

    const friendly = team === TEAM.FRIENDLY;
    const activeEnemyBase = this._getActiveEnemyBase(front);
    const targetBase = friendly ? activeEnemyBase : this.hqBase;
    if (!targetBase || !targetBase.isActive || targetBase.isDestroyed) return null;

    // 아군은 중앙 본부/병영에서, 적군은 해당 전선의 실제 적 거점에서 생성한다.
    // 이전에는 적군의 targetBase(중앙 본부)를 생성 지점으로 재사용해
    // 게임 시작 직후 아군 본부에서 적군이 튀어나오는 문제가 있었다.
    const source = spawnSource || (friendly ? this.hqBase : activeEnemyBase);
    if (!source || !source.isActive || source.isDestroyed) return null;
    const travelX = friendly ? front.dirX : -front.dirX;
    const travelY = friendly ? front.dirY : -front.dirY;
    const perpX = -travelY;
    const perpY = travelX;
    const halfExtent = this._getBaseHalfExtent(source, travelX, travelY);
    const laneOffset = (Math.random() * 2 - 1) * 58;
    const spawnDistance = halfExtent + 28;
    const spawnX = source.x + travelX * spawnDistance + perpX * laneOffset;
    const spawnY = source.y + travelY * spawnDistance + perpY * laneOffset;

    const unitConfig = SOLDIER_TYPE_CONFIG[unitType] || SOLDIER_CONFIG.RIFLEMAN;
    const soldier = new Soldier(
      spawnX,
      spawnY,
      team,
      targetBase,
      unitConfig,
      { frontId, homeBase: source, laneOffset }
    );

    if (!friendly && front.id === "north") {
      soldier.maxHp = Math.round(soldier.maxHp * 1.18);
      soldier.hp = soldier.maxHp;
    }
    if (!friendly && front.region2Started) {
      soldier.maxHp = Math.round(soldier.maxHp * WORLD_CONFIG.REGION_2_ENEMY_HP_MULTIPLIER);
      soldier.hp = soldier.maxHp;
    }

    this.soldiers.push(soldier);
    return soldier;
  }

  spawnBullet(x, y, dirX, dirY, team, owner, damage) {
    const pooled = this._bulletPool.pop();
    const bullet = pooled
      ? pooled.reset(x, y, dirX, dirY, team, owner, damage)
      : new Bullet(x, y, dirX, dirY, team, owner, damage);
    bullet.frontId = owner?.frontId || this.activeFront;
    this.bullets.push(bullet);
    return bullet;
  }

  getBarracksCost() {
    return WORLD_CONFIG.BARRACKS_COST;
  }

  getBarracksRequirements() {
    return {
      funds: WORLD_CONFIG.BARRACKS_COST,
      wood: WORLD_CONFIG.BARRACKS_WOOD_COST,
    };
  }

  buildBarracks() {
    if (this.tutorial.active) return false;
    const front = this.fronts[this.activeFront];
    if (!front || front.outpostState !== "secured" || front.barracks) return false;
    if (this.funds < WORLD_CONFIG.BARRACKS_COST) {
      this.showFundsNotice("병영 건설 군자금 부족");
      return false;
    }
    if (!this._canAffordResources({ wood: WORLD_CONFIG.BARRACKS_WOOD_COST })) {
      this.showFundsNotice(`병영: 목재 ${WORLD_CONFIG.BARRACKS_WOOD_COST} 필요`);
      return false;
    }
    this.spendFunds(WORLD_CONFIG.BARRACKS_COST, "병영 건설");
    this._spendResources({ wood: WORLD_CONFIG.BARRACKS_WOOD_COST }, "병영 건설 자재");

    const base = front.region1Base;
    const x = base.x + front.perpX * 105 - front.dirX * 45;
    const y = base.y + front.perpY * 105 - front.dirY * 45;
    front.barracks = new Building(x, y, BUILDING_TYPES.BARRACKS, TEAM.FRIENDLY);
    front.barracks.frontId = front.id;
    this.buildings.push(front.barracks);
    this._syncLegacyAliases();
    if (typeof this.onBarracksStateChanged === "function") this.onBarracksStateChanged(this.getBarracksState());
    return true;
  }

  getBarracksState() {
    const front = this.fronts[this.activeFront];
    const built = Boolean(front?.barracks?.isBuilt);
    const interval = WORLD_CONFIG.BARRACKS_PRODUCTION_INTERVAL;
    const remaining = built ? Math.max(0, interval - front.barracksProductionTimer) : interval;
    return {
      built,
      cost: WORLD_CONFIG.BARRACKS_COST,
      woodCost: WORLD_CONFIG.BARRACKS_WOOD_COST,
      canBuild: Boolean(front && front.outpostState === "secured" && !front.barracks),
      autoProductionEnabled: front?.autoProductionEnabled ?? true,
      productionInterval: interval,
      unitCost: WORLD_CONFIG.BARRACKS_UNIT_COST,
      remaining,
      waitingForFunds: Boolean(
        built && front.autoProductionEnabled && front.barracksProductionTimer >= interval && this.funds < WORLD_CONFIG.BARRACKS_UNIT_COST
      ),
      waitingForCapacity: Boolean(
        built && front.autoProductionEnabled && front.barracksProductionTimer >= interval && this.isMilitaryCapacityFull()
      ),
      waitingForResources: false,
    };
  }

  toggleBarracksAutoProduction() {
    const front = this.fronts[this.activeFront];
    if (!front?.barracks?.isBuilt) return false;
    front.autoProductionEnabled = !front.autoProductionEnabled;
    if (typeof this.onBarracksStateChanged === "function") this.onBarracksStateChanged(this.getBarracksState());
    return true;
  }

  _updateBarracksProduction(deltaTime) {
    for (const front of Object.values(this.fronts)) {
      if (!front.barracks?.isBuilt || !front.autoProductionEnabled) continue;
      const interval = WORLD_CONFIG.BARRACKS_PRODUCTION_INTERVAL;
      front.barracksProductionTimer = Math.min(interval, front.barracksProductionTimer + deltaTime);
      if (front.barracksProductionTimer < interval) continue;
      if (this.isMilitaryCapacityFull()) continue;
      if (this.funds < WORLD_CONFIG.BARRACKS_UNIT_COST) continue;
      this.spendFunds(WORLD_CONFIG.BARRACKS_UNIT_COST, "병영 자동 생산");
      this.spawnSoldier(TEAM.FRIENDLY, front.id, front.barracks);
      front.barracksProductionTimer = 0;
    }
  }

  start() {
    if (this._running) return false;
    this._running = true;
    this.lastTimestamp = 0;
    this._rafId = requestAnimationFrame((timestamp) => this._loop(timestamp));
    return true;
  }

  stop() {
    if (!this._running) return false;
    this._running = false;
    if (this._rafId !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this._rafId);
    }
    this._rafId = null;
    return true;
  }

  destroy() {
    this.stop();
    if (this._resizeTimer) window.clearTimeout(this._resizeTimer);
    window.removeEventListener("resize", this._boundResize);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this._boundVisibilityChange);
    }
  }

  _loop(timestamp) {
    if (!this._running) return;
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const rawDeltaTime = Math.max(0, (timestamp - this.lastTimestamp) / 1000);
    const deltaTime = Math.min(rawDeltaTime, WORLD_CONFIG.MAX_FRAME_DELTA);
    this.lastTimestamp = timestamp;

    this._updateCamera(deltaTime);
    if (this.strategicWorld) this.strategicWorld.update(deltaTime, rawDeltaTime);
    this._updateResourceNodes(deltaTime);
    this._updateResidentArrival(deltaTime);
    this._updateResidentTransfers(deltaTime);
    this._updateSettlementResidents(deltaTime);
    this._updateLumberWorkers(deltaTime);
    this._updateConstructionWorkers(deltaTime);
    this._updateSoldierTraining(deltaTime);
    this._updateFloatingTexts(deltaTime);
    this.waveDefense?.update(deltaTime);
    this._updateBases(deltaTime);
    this._updateBuildings(deltaTime);
    this._updateSoldiers(deltaTime);
    this._resolveFriendlySpacing();
    this._updateBullets(deltaTime);
    this._checkBulletSoldierCollisions();
    this._checkBulletBaseCollisions();
    this._removeInactiveObjects();
    this._render();

    this._rafId = requestAnimationFrame((ts) => this._loop(ts));
  }

  _updateFrontSpawns(deltaTime) {
    for (const front of Object.values(this.fronts)) {
      if (this.strategicWorld && !this.strategicWorld.shouldRunPreciseFront(front.id)) continue;
      if (!front.engaged) continue;
      if (front.outpostState !== "active" && front.outpostState !== "region2_active") continue;
      const targetBase = this._getActiveEnemyBase(front);
      if (!targetBase?.isActive || targetBase.isDestroyed) continue;

      front.enemySpawnTimer += deltaTime;
      if (front.enemySpawnCount >= front.enemySpawnLimit) continue;
      if (front.enemySpawnTimer >= WORLD_CONFIG.ENEMY_SPAWN_INTERVAL) {
        front.enemySpawnTimer -= WORLD_CONFIG.ENEMY_SPAWN_INTERVAL;
        this.spawnSoldier(TEAM.ENEMY, front.id);
        front.enemySpawnCount += 1;
      }
    }
  }

  _updateBases(deltaTime) {
    for (const base of this.bases) if (base.isActive) base.update(deltaTime);
  }

  _updateBuildings(deltaTime) {
    if (this.lumberCamp && typeof this.lumberCamp.setStoredAmount === "function") {
      this.lumberCamp.setStoredAmount(this.resources.wood);
    }

    for (const building of this.buildings) {
      if (building.isActive) building.update(deltaTime);
    }
  }

  _shouldSimulateSoldier(soldier) {
    // 단일 연속 전장에서는 모든 실제 병사 객체가 같은 월드에서 계속 갱신된다.
    return Boolean(soldier?.isActive);
  }

  _getSoldierSpatialKey(frontId, cellX, cellY) {
    return `${frontId || "none"}|${cellX}|${cellY}`;
  }

  _buildSoldierSpatialIndex() {
    const cellSize = WORLD_CONFIG.SOLDIER_SPATIAL_CELL_SIZE;
    const cells = new Map();
    for (let index = 0; index < this.soldiers.length; index += 1) {
      const soldier = this.soldiers[index];
      if (!soldier.isActive || soldier.isDead || soldier.hp <= 0) continue;
      const cellX = Math.floor(soldier.x / cellSize);
      const cellY = Math.floor(soldier.y / cellSize);
      const key = this._getSoldierSpatialKey(soldier.frontId, cellX, cellY);
      let bucket = cells.get(key);
      if (!bucket) {
        bucket = [];
        cells.set(key, bucket);
      }
      bucket.push({ soldier, index });
    }
    this._soldierSpatialIndex = { cellSize, cells };
    return this._soldierSpatialIndex;
  }

  _querySoldierEntries(frontId, minX, minY, maxX, maxY) {
    const index = this._soldierSpatialIndex || this._buildSoldierSpatialIndex();
    const { cellSize, cells } = index;
    const startX = Math.floor(minX / cellSize);
    const endX = Math.floor(maxX / cellSize);
    const startY = Math.floor(minY / cellSize);
    const endY = Math.floor(maxY / cellSize);
    const matches = [];
    for (let cellY = startY; cellY <= endY; cellY += 1) {
      for (let cellX = startX; cellX <= endX; cellX += 1) {
        const bucket = cells.get(this._getSoldierSpatialKey(frontId, cellX, cellY));
        if (bucket) matches.push(...bucket);
      }
    }
    return matches;
  }

  _queryNearbySoldiers(soldier, radius = WORLD_CONFIG.SOLDIER_QUERY_RADIUS) {
    return this._querySoldierEntries(
      soldier.frontId,
      soldier.x - radius,
      soldier.y - radius,
      soldier.x + radius,
      soldier.y + radius
    ).map((entry) => entry.soldier);
  }

  _updateSoldiers(deltaTime) {
    this._buildSoldierSpatialIndex();
    const arenaSoldiers = this.soldiers.filter((soldier) =>
      soldier.isActive && !soldier.isDead && soldier.frontId === "arena"
    );
    for (const soldier of this.soldiers) {
      if (!this._shouldSimulateSoldier(soldier)) continue;
      const wasMarching = soldier.deploymentMarchActive;
      const nearbySoldiers = soldier.isDead
        ? []
        : soldier.globalEnemySearch
          ? arenaSoldiers
          : this._queryNearbySoldiers(soldier);
      soldier.update(deltaTime, nearbySoldiers, this.worldBounds, this);
      if (
        wasMarching &&
        !soldier.deploymentMarchActive &&
        soldier.team === TEAM.FRIENDLY &&
        soldier.strategicRegistered === false
      ) {
        // 실제 Soldier 객체를 제거하거나 분대 숫자로 교체하지 않는다.
        // 도착 정보만 전략 월드에 알리고 동일한 병사가 전선 전투를 계속한다.
        soldier.regionArrived = true;
        soldier.strategicRegistered = Boolean(this.strategicWorld?.registerFriendlyArrival?.(soldier));
      }
    }
    this._buildSoldierSpatialIndex();
  }

  _resolveFriendlySpacing() {
    const spacingRadius = SOLDIER_MOVEMENT_CONFIG.SEPARATION_RADIUS +
      SOLDIER_MOVEMENT_CONFIG.MIN_ALLY_GAP + 34;

    for (let index = 0; index < this.soldiers.length; index += 1) {
      const soldier = this.soldiers[index];
      if (!this._shouldSimulateSoldier(soldier) || soldier.isDead) continue;
      const nearby = this._querySoldierEntries(
        soldier.frontId,
        soldier.x - spacingRadius,
        soldier.y - spacingRadius,
        soldier.x + spacingRadius,
        soldier.y + spacingRadius
      );
      for (const entry of nearby) {
        if (entry.index <= index) continue;
        const other = entry.soldier;
        if (other.team !== soldier.team || !this._shouldSimulateSoldier(other)) continue;
        soldier.resolveSpacingAgainst(other, this.worldBounds);
      }
    }
    this._buildSoldierSpatialIndex();
  }

  _updateBullets(deltaTime) {
    for (const bullet of this.bullets) {
      if (!bullet.isActive) continue;
      if (this.strategicWorld && this.warUnlocked && !this.strategicWorld.shouldRunPreciseFront(bullet.frontId)) continue;
      bullet.update(deltaTime, this.worldBounds);
    }
  }

  _checkBulletSoldierCollisions() {
    const collisionPadding = 24;
    for (const bullet of this.bullets) {
      if (!bullet.isActive || bullet.hasHit) continue;
      if (this.strategicWorld && this.warUnlocked && !this.strategicWorld.shouldRunPreciseFront(bullet.frontId)) continue;

      const candidates = this._querySoldierEntries(
        bullet.frontId,
        Math.min(bullet.previousX, bullet.x) - collisionPadding,
        Math.min(bullet.previousY, bullet.y) - collisionPadding,
        Math.max(bullet.previousX, bullet.x) + collisionPadding,
        Math.max(bullet.previousY, bullet.y) + collisionPadding
      );

      for (const { soldier } of candidates) {
        if (!soldier.isActive || soldier.isDead || soldier.hp <= 0) continue;
        if (soldier.team === bullet.team || soldier === bullet.owner) continue;
        if (!this._isBulletCollidingWithCircle(bullet, soldier)) continue;
        if (!bullet.markHit()) break;
        const wasAlive = !soldier.isDead && soldier.hp > 0;
        soldier.takeDamage(bullet.damage, bullet.direction.x, bullet.direction.y);
        if (soldier.isDead) {
          this._clearTargetReferences(soldier);
          if (wasAlive && soldier.team === TEAM.ENEMY) {
            if (!this.waveDefense?.handleEnemyKilled?.(soldier)) {
              this.addFunds(WORLD_CONFIG.ENEMY_KILL_REWARD, "적 처치", soldier.x, soldier.y - 24);
            }
          } else if (wasAlive && soldier.team === TEAM.FRIENDLY) {
            // 병사 손실은 군사 인구만 줄어들며 본부 주민 수에는 영향을 주지 않는다.
            this._emitBuildingSelectionChanged("아군 전사");
            this._emitReserveChanged();
          }
        }
        break;
      }
    }
  }

  _checkBulletBaseCollisions() {
    for (const bullet of this.bullets) {
      if (!bullet.isActive || bullet.hasHit) continue;
      if (this.strategicWorld && this.warUnlocked && !this.strategicWorld.shouldRunPreciseFront(bullet.frontId)) continue;
      const targetBase = bullet.owner?.targetBase;
      if (!targetBase?.isActive || targetBase.isDestroyed || targetBase.hp <= 0) continue;
      if (!this._isBulletCollidingWithRect(bullet, targetBase)) continue;
      if (!bullet.markHit()) continue;
      targetBase.takeDamage(bullet.damage);
    }
  }

  _clearTargetReferences(target) {
    for (const soldier of this.soldiers) {
      if (!soldier.isActive || soldier.isDead || soldier === target) continue;
      soldier.clearTarget(target);
    }
  }

  _updateFrontCaptures() {
    for (const front of Object.values(this.fronts)) {
      if (front.outpostState === "active" && front.region1Base.isDestroyed) {
        front.outpostState = "clearing";
        front.enemySpawnTimer = 0;
      }

      if (front.outpostState === "clearing") {
        const enemiesRemain = this.soldiers.some(
          (s) => s.frontId === front.id && s.team === TEAM.ENEMY && s.isActive && !s.isDead && s.hp > 0
        );
        if (!enemiesRemain) this._captureRegion1(front);
      }

      if (front.outpostState === "region2_active" && front.region2Base.isDestroyed) {
        front.outpostState = "region2_clearing";
        front.enemySpawnTimer = 0;
      }

      if (front.outpostState === "region2_clearing") {
        const enemiesRemain = this.soldiers.some(
          (s) => s.frontId === front.id && s.team === TEAM.ENEMY && s.isActive && !s.isDead && s.hp > 0
        );
        if (!enemiesRemain) this._captureRegion2(front);
      }
    }
    this._syncLegacyAliases();
  }

  _captureRegion1(front) {
    front.region1Base.capture("ally");
    front.region2Unlocked = true;
    front.outpostState = "captured";
    front.captureTransitionReady = true;
    front.captureReward = WORLD_CONFIG.FIRST_CAPTURE_REWARD;
    if (!front.captureRewardGranted) {
      front.captureRewardGranted = true;
      this.addFunds(front.captureReward, `${front.label} 점령`, front.region1Base.x, front.region1Base.y - 90);
    }
    this._secureTerritory(`${front.id}-1`);
    this._clearFrontProjectilesAndTargets(front.id);

    if (front.id === this.activeFront && typeof this.onCaptureTransitionReady === "function") {
      this.onCaptureTransitionReady({ reward: front.captureReward, nextRegionUnlocked: true });
    }
    if (typeof this.onRegionChanged === "function") this.onRegionChanged(this.getRegionState());
  }

  _captureRegion2(front) {
    front.region2Base.capture("ally");
    front.region2Cleared = true;
    front.outpostState = "region2_secured";
    this.addFunds(WORLD_CONFIG.REGION_2_CAPTURE_REWARD, `${front.region2Name} 점령`, front.region2Base.x, front.region2Base.y - 90);
    this._secureTerritory(`${front.id}-2`);
    this._clearFrontProjectilesAndTargets(front.id);
    if (typeof this.onRegionChanged === "function") this.onRegionChanged(this.getRegionState());
  }

  _clearFrontProjectilesAndTargets(frontId) {
    for (const bullet of this.bullets) if (bullet.frontId === frontId) bullet.isActive = false;
    for (const soldier of this.soldiers) {
      if (soldier.frontId === frontId && soldier.isActive && !soldier.isDead) soldier.clearTarget();
    }
  }

  confirmCaptureTransition() {
    const front = this.fronts[this.activeFront];
    if (!front.captureTransitionReady || front.captureTransitionAcknowledged) return false;
    front.captureTransitionAcknowledged = true;
    front.outpostState = "secured";
    return true;
  }

  getCaptureTransitionState() {
    const front = this.fronts[this.activeFront];
    return {
      outpostState: front.outpostState,
      reward: front.captureReward,
      nextRegionUnlocked: front.region2Unlocked,
      ready: front.captureTransitionReady,
      acknowledged: front.captureTransitionAcknowledged,
    };
  }

  startRegion2() {
    if (this.tutorial.active) return false;
    const front = this.fronts[this.activeFront];
    if (!front.region2Unlocked || front.region2Started) return false;
    front.region2Started = true;
    front.currentRegion = 2;
    front.region2Base.isActive = true;
    front.enemySpawnTimer = 0;
    front.enemySpawnCount = 0;
    front.enemySpawnLimit = WORLD_CONFIG.REGION_2_ENEMY_SPAWNS;
    front.outpostState = "region2_active";
    front.engaged = true;

    for (const soldier of this.soldiers) {
      if (soldier.frontId === front.id && soldier.team === TEAM.FRIENDLY && soldier.isActive && !soldier.isDead) {
        soldier.setTargetBase(front.region2Base, this.hqBase);
      }
    }

    this._syncLegacyAliases();
    this.moveCameraToRegion(2, true);
    this.showFundsNotice(`${front.region2Name} 전선 개방`, front.region2Base.x, front.region2Base.y - 100);
    return true;
  }

  getRegionState() {
    const front = this.fronts[this.activeFront];
    return {
      activeFront: this.activeFront,
      frontLabel: front.label,
      currentRegion: front.currentRegion,
      region2Unlocked: front.region2Unlocked,
      region2Started: front.region2Started,
      region2Cleared: front.region2Cleared,
    };
  }

  getTaxPolicies() {
    return {
      low: { id: "low", label: "낮음", rate: 0.12, supportDelta: 1 },
      normal: { id: "normal", label: "보통", rate: 0.2, supportDelta: 0 },
      high: { id: "high", label: "높음", rate: 0.32, supportDelta: -2 },
    };
  }

  setTaxPolicy(policyId) {
    if (!this.getTaxPolicies()[policyId]) return false;
    this.taxPolicy = policyId;
    if (typeof this.onTerritoryStateChanged === "function") this.onTerritoryStateChanged(this.getTerritoryState());
    return true;
  }

  _updateEconomy(deltaTime) {
    this._territorySecurityTimer += deltaTime;
    if (this._territorySecurityTimer >= WORLD_CONFIG.TERRITORY_SECURITY_INTERVAL) {
      this._territorySecurityTimer %= WORLD_CONFIG.TERRITORY_SECURITY_INTERVAL;
      this._updateTerritorySecurity();
    }

    this.taxCollectionTimer += deltaTime;
    while (this.taxCollectionTimer >= WORLD_CONFIG.TAX_COLLECTION_INTERVAL) {
      this.taxCollectionTimer -= WORLD_CONFIG.TAX_COLLECTION_INTERVAL;
      this._collectTaxes();
    }
  }

  _updateFloatingTexts(deltaTime) {
    for (const text of this.rewardTexts) {
      text.timer = Math.max(0, text.timer - deltaTime);
      text.y -= 22 * deltaTime;
    }
    for (let i = this.rewardTexts.length - 1; i >= 0; i -= 1) {
      if (this.rewardTexts[i].timer <= 0) this.rewardTexts.splice(i, 1);
    }
  }

  _getTerritoryAnchor(territoryId) {
    if (territoryId === "hq") return this.hqBase;
    const [frontId, regionText] = territoryId.split("-");
    const front = this.fronts[frontId];
    return regionText === "2" ? front?.region2Base : front?.region1Base;
  }

  _updateTerritorySecurity() {
    let changed = false;
    for (const territory of this.territories) {
      if (!territory.controlled) continue;
      const anchor = this._getTerritoryAnchor(territory.id);
      if (!anchor) continue;
      let allies = 0;
      let enemies = 0;
      for (const soldier of this.soldiers) {
        if (!soldier.isActive || soldier.isDead || soldier.hp <= 0) continue;
        if (Math.hypot(soldier.x - anchor.x, soldier.y - anchor.y) > 320) continue;
        if (soldier.team === TEAM.FRIENDLY) allies += 1;
        else enemies += 1;
      }
      const baseSecurity = territory.id === "hq" ? 88 : 78;
      const nextSecurity = Math.max(25, Math.min(100, baseSecurity + allies * 3 - enemies * 14));
      if (Math.abs(nextSecurity - territory.security) >= 1) {
        territory.security = nextSecurity;
        changed = true;
      }
    }
    if (changed && typeof this.onTerritoryStateChanged === "function") this.onTerritoryStateChanged(this.getTerritoryState());
  }

  _estimateTerritoryTax(territory) {
    if (!territory.controlled) return 0;
    const policy = this.getTaxPolicies()[this.taxPolicy];
    return Math.max(1, Math.round(territory.population * policy.rate * (territory.security / 100) * (0.75 + this.publicSupport / 400)));
  }

  _collectTaxes() {
    const policy = this.getTaxPolicies()[this.taxPolicy];
    const total = this.territories.reduce((sum, territory) => sum + this._estimateTerritoryTax(territory), 0);
    this.publicSupport = Math.max(0, Math.min(100, this.publicSupport + policy.supportDelta));
    if (total > 0) this.addFunds(total, "세금 징수", this.hqBase.x, this.hqBase.y - 110);
    if (typeof this.onTerritoryStateChanged === "function") this.onTerritoryStateChanged(this.getTerritoryState());
  }

  getSettlementOverviewState() {
    const territory = this.getTerritoryState();
    const arrival = this.getResidentArrivalState();
    const lumber = this.getLumberState();
    const construction = this.getConstructionState();
    const tutorial = this.getTutorialState();
    const stage = this.getStageState();

    const pendingLumber = this._getPendingTransferCount("lumber");
    const pendingConstruction = this._getPendingTransferCount("construction");
    const activeLumberWorkers = this.lumberWorkers.filter((worker) => worker.isActive).length;
    const activeConstructionWorkers = this._getActiveConstructionWorkers().length;
    const activeFriendlySoldiers = this.soldiers.filter(
      (soldier) => soldier.team === TEAM.FRIENDLY && soldier.isActive && !soldier.isDead
    ).length;
    const totalFriendlyMilitary = this.getFriendlyMilitaryCount();
    const militaryComposition = this.getFriendlyMilitaryComposition();

    let residentArrivalStatus = "정착 본부 건설 후 시작";
    if (this.hqBuilt) {
      if (arrival.incoming) residentArrivalStatus = "새 주민이 정착지로 이동 중";
      else if (arrival.vacant <= 0) residentArrivalStatus = "수용 공간 가득 참";
      else residentArrivalStatus = `${Math.max(1, Math.ceil(arrival.nextIn))}초 후 새 주민 도착`;
    }

    let lumberStatus = "벌목소 미건설";
    if (lumber.built) {
      if (lumber.pendingWorkers > 0) lumberStatus = `주민 ${lumber.pendingWorkers}명 이동 중`;
      else if (lumber.workingCount > 0) lumberStatus = `벌목꾼 ${lumber.workingCount}명 작업 중`;
      else if (lumber.workerCount > 0) lumberStatus = "나무 재생 대기";
      else lumberStatus = "배치된 벌목꾼 없음";
    }

    let constructionStatus = "건설 시스템 미개방";
    if (construction.project) {
      constructionStatus = construction.project.deliveredWood < construction.project.requiredWood
        ? `${construction.project.label} 자재 ${construction.project.deliveredWood}/${construction.project.requiredWood}`
        : `${construction.project.label} ${Math.round(construction.project.buildProgress * 100)}%`;
    } else if (construction.placementActive) {
      constructionStatus = `${this._getConstructionLabel(construction.placementType)} 위치 선택 중`;
    } else if (construction.workshopBuilt) {
      if (!construction.trainingCenterBuilt) constructionStatus = "훈련소 건설 가능";
      else constructionStatus = "대기 중인 공사 없음";
    } else if (construction.unlocked) {
      constructionStatus = "건설 작업소 건설 가능";
    }

    let trainingStatus = "훈련소 미건설";
    if (this.trainingCenter?.isBuilt) {
      const batchSize = this._getTrainingBatchSize();
      const availableBatch = this.soldierTraining.active
        ? Math.max(1, this.soldierTraining.batchSize || 1)
        : this._getAvailableTrainingBatchSize();
      const cycleCost = this._getTrainingCycleCost(Math.max(1, availableBatch || batchSize));
      if (this.soldierTraining.active) {
        const duration = this._getRiflemanTrainingDuration();
        const progress = Math.min(100, Math.round((this.soldierTraining.progress / duration) * 100));
        trainingStatus = `자동 훈련 ${Math.max(1, this.soldierTraining.batchSize || batchSize)}명 · ${progress}%`;
      } else if (!this.trainingAutoEnabled) trainingStatus = "자동 생산 OFF";
      else if (this.resources.wood < cycleCost) trainingStatus = `목재 ${cycleCost} 대기`;
      else trainingStatus = `자동 생산 ON · 다음 ${availableBatch}명`;
    }

    const getFrontStatus = (front) => {
      if (!stage.warUnlocked) return "미개방";
      if (!front?.discovered) return "미정찰";
      if (front.region2Cleared || front.outpostState === "region2_secured") return "전 지역 확보";
      if (front.region2Started || front.outpostState === "region2_active" || front.outpostState === "region2_clearing") {
        return "지역 2 교전";
      }
      if (["secured", "captured", "clearing"].includes(front.outpostState)) return "지역 1 확보";
      if (front.engaged) return "지역 1 교전";
      return "출격 대기";
    };

    let objective = tutorial.active ? tutorial.message : "정착지를 확장하세요.";
    if (!tutorial.active) {
      if (!construction.workshopBuilt) objective = "건설 작업소를 배치하고 완성하세요.";
      else if (!construction.trainingCenterBuilt) objective = "병사를 생산할 훈련소를 건설하세요.";
      else if (this.soldierTraining.active) objective = "훈련소가 자동으로 병사를 생산하고 있습니다.";
      else if (!stage.warUnlocked) objective = "첫 병사가 완성되면 적의 라운드 공격이 시작됩니다.";
      else {
        const wave = this.waveDefense?.getState?.();
        if (wave?.phase === "countdown" || wave?.phase === "intermission") {
          objective = `라운드 ${wave.nextRound}까지 ${wave.countdown}초 · 병력과 건물을 강화하세요.`;
        } else if (wave?.phase === "spawning" || wave?.phase === "combat") {
          objective = `라운드 ${wave.round} 방어 중 · 남은 적 ${wave.remaining}명`;
        } else if (wave?.phase === "defeat") {
          objective = "본부가 파괴되었습니다. 게임을 다시 시작하세요.";
        } else {
          objective = "훈련소에서 첫 병사를 생산해 방어전을 시작하세요.";
        }
      }
    }

    return {
      funds: this.funds,
      wood: this.resources.wood,
      territory,
      population: {
        current: this.settlementPopulation,
        capacity: arrival.capacity,
        idle: this.getAvailableResidentCount(),
        incoming: arrival.incoming,
        arrivalStatus: residentArrivalStatus,
      },
      roles: {
        residents: this.getAvailableResidentCount(),
        lumber: activeLumberWorkers + pendingLumber,
        construction: activeConstructionWorkers + pendingConstruction,
        soldiers: totalFriendlyMilitary,
      },
      production: {
        lumberStatus,
        constructionStatus,
        trainingStatus,
      },
      military: {
        current: totalFriendlyMilitary,
        capacity: null,
        composition: militaryComposition,
        rallyCount: 0,
        eastStatus: getFrontStatus(this.fronts.east),
        northStatus: getFrontStatus(this.fronts.north),
      },
      objective,
    };
  }

  getTerritoryState() {
    const controlled = this.territories.filter((t) => t.controlled);
    const totalPopulation = controlled.reduce((sum, t) => sum + t.population, 0);
    const averageSecurity = controlled.length
      ? Math.round(controlled.reduce((sum, t) => sum + t.security, 0) / controlled.length)
      : 0;
    return {
      territories: this.territories.map((t) => ({ ...t, estimatedTax: this._estimateTerritoryTax(t) })),
      controlledCount: controlled.length,
      totalPopulation,
      averageSecurity,
      publicSupport: this.publicSupport,
      taxPolicy: this.taxPolicy,
      taxPolicies: this.getTaxPolicies(),
      estimatedTax: controlled.reduce((sum, t) => sum + this._estimateTerritoryTax(t), 0),
      nextTaxIn: Math.max(0, WORLD_CONFIG.TAX_COLLECTION_INTERVAL - this.taxCollectionTimer),
      interval: WORLD_CONFIG.TAX_COLLECTION_INTERVAL,
    };
  }

  _secureTerritory(id) {
    const territory = this.territories.find((t) => t.id === id);
    if (!territory || territory.controlled) return false;
    territory.controlled = true;
    territory.security = 78;
    if (typeof this.onTerritoryStateChanged === "function") this.onTerritoryStateChanged(this.getTerritoryState());
    return true;
  }

  addFunds(amount, reason = "골드", x = this.hqBase.x, y = this.hqBase.y - 90) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const value = Math.floor(amount);
    this.funds += value;
    this.rewardTexts.push({ amount: value, reason, x, y, timer: WORLD_CONFIG.REWARD_TEXT_DURATION, duration: WORLD_CONFIG.REWARD_TEXT_DURATION });
    if (typeof this.onFundsChanged === "function") this.onFundsChanged(this.funds, { amount: value, reason });
    return true;
  }

  spendFunds(amount, reason = "지출") {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const value = Math.floor(amount);
    if (this.funds < value) return false;
    this.funds -= value;
    if (typeof this.onFundsChanged === "function") this.onFundsChanged(this.funds, { amount: -value, reason });
    return true;
  }

  getFunds() {
    return this.funds;
  }

  showFundsNotice(
    reason,
    x = this.worldCenter.x,
    y = this.worldCenter.y - 100,
    duration = WORLD_CONFIG.REWARD_TEXT_DURATION
  ) {
    const safeDuration = Number.isFinite(duration) && duration > 0
      ? duration
      : WORLD_CONFIG.REWARD_TEXT_DURATION;
    this.rewardTexts.push({
      amount: 0,
      reason,
      x,
      y,
      timer: safeDuration,
      duration: safeDuration,
    });
  }

  _clampZoom(value) {
    return Math.max(WORLD_CONFIG.CAMERA_MIN_ZOOM, Math.min(WORLD_CONFIG.CAMERA_MAX_ZOOM, value));
  }

  _getCameraLimits(zoom = this.cameraTargetZoom) {
    const viewWidth = this.canvas.width / zoom;
    const viewHeight = this.canvas.height / zoom;
    const centerX = (this.worldWidth - viewWidth) / 2;
    const centerY = (this.worldHeight - viewHeight) / 2;
    return {
      minX: viewWidth >= this.worldWidth ? centerX : 0,
      maxX: viewWidth >= this.worldWidth ? centerX : this.worldWidth - viewWidth,
      minY: viewHeight >= this.worldHeight ? centerY : 0,
      maxY: viewHeight >= this.worldHeight ? centerY : this.worldHeight - viewHeight,
    };
  }

  _clampCameraTarget() {
    const limits = this._getCameraLimits(this.cameraTargetZoom);
    this.cameraTargetX = Math.max(limits.minX, Math.min(limits.maxX, this.cameraTargetX));
    this.cameraTargetY = Math.max(limits.minY, Math.min(limits.maxY, this.cameraTargetY));
  }

  _clampCameraCurrent() {
    const limits = this._getCameraLimits(this.cameraZoom);
    this.cameraX = Math.max(limits.minX, Math.min(limits.maxX, this.cameraX));
    this.cameraY = Math.max(limits.minY, Math.min(limits.maxY, this.cameraY));
  }

  screenToWorld(screenX, screenY) {
    return { x: this.cameraX + screenX / this.cameraZoom, y: this.cameraY + screenY / this.cameraZoom };
  }

  worldToScreen(worldX, worldY) {
    return { x: (worldX - this.cameraX) * this.cameraZoom, y: (worldY - this.cameraY) * this.cameraZoom };
  }

  setCameraZoom(nextZoom, anchorScreenX = this.canvas.width / 2, anchorScreenY = this.canvas.height / 2) {
    const zoom = this._clampZoom(nextZoom);
    const safeAnchorX = Number.isFinite(anchorScreenX) ? anchorScreenX : this.canvas.width / 2;
    const safeAnchorY = Number.isFinite(anchorScreenY) ? anchorScreenY : this.canvas.height / 2;

    // 현재 화면에서 커서 아래에 보이는 실제 월드 지점을 기준으로 잡는다.
    // 줌 애니메이션 중에도 이 월드 지점이 같은 화면 좌표에 유지되도록
    // 카메라 위치를 줌 값에서 매 프레임 역산한다.
    const worldAnchor = this.screenToWorld(safeAnchorX, safeAnchorY);
    this.cameraZoomAnchor = {
      worldX: worldAnchor.x,
      worldY: worldAnchor.y,
      screenX: safeAnchorX,
      screenY: safeAnchorY,
    };

    this.cameraTargetZoom = zoom;
    this.cameraTargetX = worldAnchor.x - safeAnchorX / zoom;
    this.cameraTargetY = worldAnchor.y - safeAnchorY / zoom;
    this._clampCameraTarget();
    this._emitCameraChanged(true);
    return zoom;
  }

  zoomCameraBy(delta, anchorScreenX, anchorScreenY) {
    return this.setCameraZoom(this.cameraTargetZoom + delta, anchorScreenX, anchorScreenY);
  }

  toggleVisualDebug() {
    return this.visualRenderSystem.toggleDebug();
  }

  isVisualDebugEnabled() {
    return this.visualRenderSystem.debugEnabled;
  }

  getVisualInteractionPoint(entity, pointType = "entrance", index = 0) {
    if (!entity) return { x: 0, y: 0 };
    const meta = entity.visualMeta || getVisualMetadata(entity.visualKey || entity.type || entity.role);
    if (!meta) return { x: entity.x, y: entity.y };

    if (pointType === "anchor") {
      return this.visualRenderSystem.getAnchorPoint(entity, meta);
    }

    if (pointType === "work") {
      const workPoint = meta.workPoints?.[index] || meta.workPoints?.[0] || meta.entrance;
      return workPoint
        ? this.visualRenderSystem.getRelativePoint(entity, workPoint, meta)
        : this.visualRenderSystem.getAnchorPoint(entity, meta);
    }

    const point = meta.entrance || meta.anchor;
    return point
      ? this.visualRenderSystem.getRelativePoint(entity, point, meta)
      : this.visualRenderSystem.getAnchorPoint(entity, meta);
  }

  panCameraByScreen(deltaScreenX, deltaScreenY, immediate = true) {
    this.cameraZoomAnchor = null;
    const zoom = Math.max(this.cameraZoom, 0.001);
    this.cameraTargetX -= deltaScreenX / zoom;
    this.cameraTargetY -= deltaScreenY / zoom;
    this._clampCameraTarget();
    if (immediate) {
      this.cameraX = this.cameraTargetX;
      this.cameraY = this.cameraTargetY;
      this._clampCameraCurrent();
      this._syncActiveFrontFromCamera();
      this._emitCameraChanged(true);
    }
  }

  getArenaBounds() {
    const width = Math.min(this.worldWidth - 120, Math.max(1100, this.canvas.width * 1.65));
    const height = Math.min(this.worldHeight - 120, Math.max(760, this.canvas.height * 1.65));
    return {
      left: this.worldCenter.x - width / 2,
      top: this.worldCenter.y - height / 2,
      right: this.worldCenter.x + width / 2,
      bottom: this.worldCenter.y + height / 2,
      width,
      height,
    };
  }

  focusWorldPoint(worldX, worldY, zoom = this.cameraTargetZoom) {
    this.cameraZoomAnchor = null;
    this.cameraTargetZoom = this._clampZoom(zoom);
    this.cameraTargetX = worldX - this.canvas.width / (2 * this.cameraTargetZoom);
    this.cameraTargetY = worldY - this.canvas.height / (2 * this.cameraTargetZoom);
    this._clampCameraTarget();
    this._emitCameraChanged(true);
    return true;
  }

  fitWholeWorld() {
    this.cameraZoomAnchor = null;
    const arena = this.getArenaBounds();
    const padding = 70;
    const zoom = this._clampZoom(Math.min(
      this.canvas.width / (arena.width + padding * 2),
      this.canvas.height / (arena.height + padding * 2)
    ));
    this.cameraTargetZoom = zoom;
    this.cameraTargetX = arena.left - padding;
    this.cameraTargetY = arena.top - padding;
    this._clampCameraTarget();
    this._emitCameraChanged(true);
  }

  focusHeadquarters(focusZoom = true) {
    this.cameraZoomAnchor = null;
    if (focusZoom) this.cameraTargetZoom = 1;
    const focusX = this.hqBase.x;
    const focusY = this.hqBase.y + 65;
    this.cameraTargetX = focusX - this.canvas.width / (2 * this.cameraTargetZoom);
    this.cameraTargetY = focusY - this.canvas.height / (2 * this.cameraTargetZoom);
    this._clampCameraTarget();
    this._emitCameraChanged(true);
    return true;
  }

  moveCameraToRegion(region, focusZoom = true) {
    this.cameraZoomAnchor = null;
    const front = this.fronts[this.activeFront];
    const normalized = Math.max(1, Math.min(2, region));
    if (normalized === 2 && !front.region2Unlocked) return false;
    front.currentRegion = normalized;
    if (focusZoom) this.cameraTargetZoom = 1;
    const base = normalized === 2 ? front.region2Base : front.region1Base;
    const previous = normalized === 2 ? front.region1Base : this.hqBase;
    const focusX = (previous.x + base.x) / 2;
    const focusY = (previous.y + base.y) / 2;
    this.cameraTargetX = focusX - this.canvas.width / (2 * this.cameraTargetZoom);
    this.cameraTargetY = focusY - this.canvas.height / (2 * this.cameraTargetZoom);
    this._clampCameraTarget();
    this._syncLegacyAliases();
    if (typeof this.onRegionChanged === "function") this.onRegionChanged(this.getRegionState());
    this._emitCameraChanged(true);
    return true;
  }

  focusCurrentRegion() {
    return this.focusHeadquarters(true);
  }

  _getViewMode(zoom = this.cameraTargetZoom) {
    if (this.strategicWorld) return this.strategicWorld.getViewMode(zoom);
    if (zoom <= WORLD_CONFIG.STRATEGIC_VIEW_ZOOM + 0.001) return "strategic";
    if (zoom <= WORLD_CONFIG.FRONTLINE_VIEW_ZOOM + 0.001) return "tactical";
    return "combat";
  }

  _smoothstep(edge0, edge1, x) {
    if (edge0 === edge1) return x < edge0 ? 0 : 1;
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  _getViewBlend(zoom = this.cameraZoom) {
    // 3×3 전략 지도가 제거된 단일 전장에서는 저배율에서도 실제 병사 자체를
    // 흐리게 만들 필요가 없다. 스프라이트는 항상 선명하게 유지하고,
    // 70% 이하에서만 팀 구분용 고정 크기 윤곽을 보조로 표시한다.
    const lowZoomMarkerAlpha = 1 - this._smoothstep(0.58, 0.78, zoom);
    return {
      combatAlpha: 1,
      frontlineAlpha: lowZoomMarkerAlpha,
      strategicAlpha: 0,
      bulletAlpha: 1,
      labelAlpha: 0,
    };
  }

  getCameraState() {
    const viewMode = this._getViewMode(this.cameraTargetZoom);
    const mode = viewMode === "strategic" ? "전략 시야" : viewMode === "tactical" ? "전술 시야" : "정밀 전투";
    return {
      x: this.cameraTargetX,
      y: this.cameraTargetY,
      zoom: this.cameraTargetZoom,
      zoomPercent: Math.round(this.cameraTargetZoom * 100),
      minZoom: WORLD_CONFIG.CAMERA_MIN_ZOOM,
      maxZoom: WORLD_CONFIG.CAMERA_MAX_ZOOM,
      canZoomOut: this.cameraTargetZoom > WORLD_CONFIG.CAMERA_MIN_ZOOM + 0.001,
      canZoomIn: this.cameraTargetZoom < WORLD_CONFIG.CAMERA_MAX_ZOOM - 0.001,
      mode,
      viewMode,
    };
  }

  _emitCameraChanged(force = false) {
    if (typeof this.onCameraChanged !== "function") return;
    const state = this.getCameraState();
    const key = `${state.zoomPercent}:${Math.round(state.x)}:${Math.round(state.y)}:${state.mode}`;
    if (!force && key === this._lastCameraStateKey) return;
    this._lastCameraStateKey = key;
    this.onCameraChanged(state);
  }

  _updateCamera(deltaTime) {
    const factor = 1 - Math.exp(-WORLD_CONFIG.CAMERA_SMOOTHING * deltaTime);
    this.cameraTargetZoom = this._clampZoom(this.cameraTargetZoom);
    this._clampCameraTarget();
    this.cameraZoom += (this.cameraTargetZoom - this.cameraZoom) * factor;

    if (Math.abs(this.cameraTargetZoom - this.cameraZoom) < 0.001) {
      this.cameraZoom = this.cameraTargetZoom;
    }

    if (this.cameraZoomAnchor) {
      const anchor = this.cameraZoomAnchor;
      this.cameraX = anchor.worldX - anchor.screenX / Math.max(this.cameraZoom, 0.001);
      this.cameraY = anchor.worldY - anchor.screenY / Math.max(this.cameraZoom, 0.001);
      this._clampCameraCurrent();

      if (this.cameraZoom === this.cameraTargetZoom) {
        this.cameraX = this.cameraTargetX;
        this.cameraY = this.cameraTargetY;
        this._clampCameraCurrent();
        this.cameraZoomAnchor = null;
      }
    } else {
      this.cameraX += (this.cameraTargetX - this.cameraX) * factor;
      this.cameraY += (this.cameraTargetY - this.cameraY) * factor;
      if (Math.abs(this.cameraTargetX - this.cameraX) < 0.1) this.cameraX = this.cameraTargetX;
      if (Math.abs(this.cameraTargetY - this.cameraY) < 0.1) this.cameraY = this.cameraTargetY;
      this._clampCameraCurrent();
    }

    this._emitCameraChanged();
  }

  _distancePointToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= 0.001) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  _syncActiveFrontFromCamera() {
    if (this.tutorial.active) return;
    if (this.cameraZoom <= WORLD_CONFIG.STRATEGIC_VIEW_ZOOM + 0.03) return;
    const centerX = this.cameraX + this.canvas.width / (2 * this.cameraZoom);
    const centerY = this.cameraY + this.canvas.height / (2 * this.cameraZoom);
    let best = null;
    for (const front of Object.values(this.fronts)) {
      const end = front.region2Started ? front.region2Base : front.region1Base;
      const distance = this._distancePointToSegment(centerX, centerY, this.hqBase.x, this.hqBase.y, end.x, end.y);
      if (!best || distance < best.distance) best = { front, distance };
    }
    if (best && best.distance < Math.max(this.canvas.width, this.canvas.height) * 0.38) {
      const front = best.front;
      const d1 = Math.hypot(centerX - front.region1Base.x, centerY - front.region1Base.y);
      const d2 = Math.hypot(centerX - front.region2Base.x, centerY - front.region2Base.y);
      front.currentRegion = front.region2Unlocked && d2 < d1 ? 2 : 1;
      this._setActiveFront(front.id, false);
    }
  }

  getEngagementAtScreen(screenX, screenY) {
    if (this.tutorial.active) return null;
    if (this._getViewMode(this.cameraTargetZoom) === "combat") return null;
    const world = this.screenToWorld(screenX, screenY);
    let best = null;
    for (const front of Object.values(this.fronts)) {
      const end = front.region2Started ? front.region2Base : front.region1Base;
      const distance = this._distancePointToSegment(world.x, world.y, this.hqBase.x, this.hqBase.y, end.x, end.y);
      const base1Distance = Math.hypot(world.x - front.region1Base.x, world.y - front.region1Base.y);
      const base2Distance = Math.hypot(world.x - front.region2Base.x, world.y - front.region2Base.y);
      const score = Math.min(distance, base1Distance, base2Distance);
      if (!best || score < best.score) best = { front, score, base1Distance, base2Distance };
    }
    const threshold = 180 / Math.max(this.cameraTargetZoom, 0.3);
    if (!best || best.score > threshold) return null;
    const region = best.front.region2Unlocked && best.base2Distance < best.base1Distance ? 2 : 1;
    return { type: "front", nodeId: best.front.id, frontId: best.front.id, region, label: best.front.label, status: this._getFrontStatus(best.front) };
  }

  setHoveredEngagement(regionId) {
    // 기존 main.js API 호환. 실제 강조는 frontId 기반으로 처리한다.
  }

  setHoveredStrategicNode(nodeId) {
    this.hoveredFrontId = nodeId || null;
  }

  focusEngagement(info) {
    const frontId = info?.frontId || info?.nodeId;
    if (!this.fronts[frontId]) return false;
    this._setActiveFront(frontId, true);
    const region = info.region || this.fronts[frontId].currentRegion || 1;
    return this.moveCameraToRegion(region, true);
  }

  _getFrontStatus(front) {
    if (!front.discovered) return "미확인 지역";
    if (front.region2Cleared) return "전선 확보";
    if (front.region2Started) return "지역 2 교전";
    if (front.region2Unlocked) return "지역 2 개방";
    if (front.outpostState === "clearing") return "잔여 병력 소탕";
    return front.engaged ? "지역 1 교전" : "대기 중";
  }

  _removeInactiveObjects() {
    let bulletWrite = 0;
    for (let read = 0; read < this.bullets.length; read += 1) {
      const bullet = this.bullets[read];
      if (bullet.isActive) {
        this.bullets[bulletWrite] = bullet;
        bulletWrite += 1;
      } else {
        bullet.owner = null;
        if (this._bulletPool.length < 512) this._bulletPool.push(bullet);
      }
    }
    this.bullets.length = bulletWrite;

    let rallyChanged = false;
    let soldierWrite = 0;
    for (let read = 0; read < this.soldiers.length; read += 1) {
      const soldier = this.soldiers[read];
      if (soldier.isActive) {
        this.soldiers[soldierWrite] = soldier;
        soldierWrite += 1;
      } else if (soldier.awaitingOrder) {
        rallyChanged = true;
      }
    }
    this.soldiers.length = soldierWrite;

    if (rallyChanged) {
      this._syncRallyFormation();
      this._emitReserveChanged();
    }
  }

  _getVisibleWorldRect(padding = 120) {
    const zoom = Math.max(this.cameraZoom, 0.001);
    return {
      left: this.cameraX - padding,
      top: this.cameraY - padding,
      right: this.cameraX + this.canvas.width / zoom + padding,
      bottom: this.cameraY + this.canvas.height / zoom + padding,
    };
  }

  _isWorldEntityVisible(entity, rect, padding = 0) {
    if (!entity || !rect) return false;
    const halfWidth = (entity.width || entity.radius * 2 || 24) / 2 + padding;
    const halfHeight = (entity.height || entity.radius * 2 || 24) / 2 + padding;
    return (
      entity.x + halfWidth >= rect.left &&
      entity.x - halfWidth <= rect.right &&
      entity.y + halfHeight >= rect.top &&
      entity.y - halfHeight <= rect.bottom
    );
  }

  _render() {
    const ctx = this.ctx;
    ctx.fillStyle = WORLD_CONFIG.GROUND_COLOR;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.setTransform(this.cameraZoom, 0, 0, this.cameraZoom, -this.cameraX * this.cameraZoom, -this.cameraY * this.cameraZoom);
    // 낮은 줌에서 작은 병사 PNG가 선형 보간으로 번져 보이지 않게 한다.
    ctx.imageSmoothingEnabled = this.cameraZoom > 0.68;
    this._renderWorld(ctx);
    if (this.strategicWorld) this.strategicWorld.renderMapOverlay(ctx);

    const blend = this._getViewBlend(this.cameraZoom);
    const strategicMode = this.strategicWorld ? this.strategicWorld.getViewMode(this.cameraZoom) : "combat";
    const renderDetailedWorld = strategicMode === "combat";
    const visibleRect = this._getVisibleWorldRect();

    if (renderDetailedWorld) {
      this._renderResourceNodes(ctx, blend);
      this._renderConstructionGrid(ctx);
      this._renderConstructionSites(ctx);
      this._renderConstructionProjects(ctx);
    }


    this.visualRenderSystem.beginFrame();
    const depthEntries = [];
    for (const base of this.bases) {
      if (!base.isActive || !this._isWorldEntityVisible(base, visibleRect, 80)) continue;
      depthEntries.push(this.visualRenderSystem.createEntry(
        base,
        (renderCtx) => base.render(renderCtx),
        "base",
        base.visualKey || (base.role === "hq" ? "hq" : "outpost")
      ));
    }
    if (renderDetailedWorld) {
      for (const building of this.buildings) {
        if (!building.isActive || !this._isWorldEntityVisible(building, visibleRect, 70)) continue;
        depthEntries.push(this.visualRenderSystem.createEntry(
          building,
          (renderCtx) => building.render(renderCtx),
          "building",
          building.visualKey || building.type
        ));
      }
      for (const resident of this.settlementResidents) {
        if (!resident.isActive || !this._isWorldEntityVisible(resident, visibleRect, 30)) continue;
        depthEntries.push(this.visualRenderSystem.createEntry(
          resident,
          (renderCtx) => resident.render(renderCtx, this.cameraZoom),
          "resident",
          resident.visualKey || "resident"
        ));
      }
      if (this.incomingResident?.isActive && this._isWorldEntityVisible(this.incomingResident, visibleRect, 30)) {
        depthEntries.push(this.visualRenderSystem.createEntry(
          this.incomingResident,
          (renderCtx) => this.incomingResident.render(renderCtx, this.cameraZoom),
          "incoming_resident",
          this.incomingResident.visualKey || "resident"
        ));
      }
      for (const transfer of this.residentTransfers) {
        if (!transfer.resident?.isActive || !this._isWorldEntityVisible(transfer.resident, visibleRect, 30)) continue;
        depthEntries.push(this.visualRenderSystem.createEntry(
          transfer.resident,
          (renderCtx) => transfer.resident.render(renderCtx, this.cameraZoom),
          "resident_transfer",
          transfer.resident.visualKey || "resident"
        ));
      }
      for (const worker of this.lumberWorkers) {
        if (!worker.isActive || !this._isWorldEntityVisible(worker, visibleRect, 35)) continue;
        depthEntries.push(this.visualRenderSystem.createEntry(
          worker,
          (renderCtx) => worker.render(renderCtx, this.cameraZoom),
          "lumber_worker",
          worker.visualKey || "lumber_worker"
        ));
      }
      for (const worker of this.constructionWorkers) {
        if (!worker.isActive || !this._isWorldEntityVisible(worker, visibleRect, 35)) continue;
        depthEntries.push(this.visualRenderSystem.createEntry(
          worker,
          (renderCtx) => worker.render(renderCtx, this.cameraZoom),
          "construction_worker",
          worker.visualKey || "construction_worker"
        ));
      }

    }


    for (const soldier of this.soldiers) {
      if (!soldier.isActive || !this._isWorldEntityVisible(soldier, visibleRect, 45)) continue;
      if (this.strategicWorld && !this.strategicWorld.shouldRenderLegacySoldier(soldier)) continue;
      depthEntries.push(this.visualRenderSystem.createEntry(
        soldier,
        (renderCtx) => this._renderBlendedSoldier(renderCtx, soldier, blend),
        "rifleman",
        soldier.visualKey || "rifleman",
        1
      ));
    }

    const trainingPosition = renderDetailedWorld ? this._getTrainingActivityPosition() : null;
    if (trainingPosition) {
      depthEntries.push(this.visualRenderSystem.createCustomEntry(
        trainingPosition.x,
        trainingPosition.y,
        (renderCtx) => this._renderTrainingActivity(renderCtx, trainingPosition),
        "trainee",
        "trainee"
      ));
    }

    const renderedDepthEntries = this.visualRenderSystem.renderEntries(ctx, depthEntries);
    if (renderDetailedWorld) this._renderSelectedBuilding(ctx);

    if (renderDetailedWorld && blend.bulletAlpha > 0.02) {
      ctx.save();
      ctx.globalAlpha = blend.bulletAlpha;
      for (const bullet of this.bullets) {
        if (bullet.isActive && this._isWorldEntityVisible(bullet, visibleRect, 8)) bullet.render(ctx);
      }
      ctx.restore();
    }

    this.visualRenderSystem.renderDebugWorld(ctx, renderedDepthEntries, this.cameraZoom);
    this._renderRewardTexts(ctx);
    ctx.restore();
    this.visualRenderSystem.renderDebugHud(ctx);
    if (this.strategicWorld) this.strategicWorld.renderScreenOverlay(ctx);
  }

  _getTrainingActivityPosition() {
    if (!this.soldierTraining.active || !this.trainingCenter?.isBuilt) return null;
    const phase = this.soldierTraining.progress * 3.2;
    const trainingPoint = this.getVisualInteractionPoint(this.trainingCenter, "work", 0);
    return {
      x: trainingPoint.x + Math.cos(phase) * 34,
      y: trainingPoint.y + Math.sin(phase * 2) * 4,
      phase: "training",
    };
  }

  _renderTrainingActivity(ctx, position = this._getTrainingActivityPosition()) {
    if (!position || !this.trainingCenter?.isBuilt) return;
    const duration = this._getRiflemanTrainingDuration();
    const progress = Math.max(0, Math.min(1, this.soldierTraining.progress / duration));
    const x = position.x;
    const y = position.y;
    const zoom = Math.max(this.cameraZoom, 0.28);

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#687c55";
    ctx.fillRect(x - 5, y - 1, 10, 13);
    ctx.fillStyle = "#efc59a";
    ctx.beginPath();
    ctx.arc(x, y - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d4d39";
    ctx.fillRect(x - 6, y - 11, 12, 4);

    const barWidth = 78 / zoom;
    const barHeight = 7 / zoom;
    const barX = this.trainingCenter.x - barWidth / 2;
    const barY = this.trainingCenter.y - this.trainingCenter.height / 2 - 20 / zoom;
    ctx.fillStyle = "rgba(10,18,20,0.82)";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = "#78c67e";
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    ctx.restore();
  }

  _renderSelectedBuilding(ctx) {
    if (!this.selectedBuildingKey) return;
    let target = null;
    if (this.selectedBuildingKey === "hq" && this.hqBuilt) target = this.hqBase;
    if (this.selectedBuildingKey === "lumber" && this.lumberCamp?.isBuilt) target = this.lumberCamp;
    if (this.selectedBuildingKey === "workshop" && this.constructionWorkshop?.isBuilt) target = this.constructionWorkshop;
    if (this.selectedBuildingKey === "training_center" && this.trainingCenter?.isBuilt) target = this.trainingCenter;
    if (!target) return;

    const width = (target.width || 110) * 0.72;
    const height = Math.max(18, (target.height || 80) * 0.16);
    ctx.save();
    ctx.strokeStyle = "rgba(255, 232, 138, 0.95)";
    ctx.lineWidth = 3 / this.cameraZoom;
    ctx.setLineDash([8 / this.cameraZoom, 5 / this.cameraZoom]);
    ctx.beginPath();
    ctx.ellipse(target.x, target.y + (target.height || 80) / 2 + 12, width, height, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _renderWorld(ctx) {
    ctx.save();
    if (this.strategicWorld) this.strategicWorld.renderTerrain(ctx);

    const arena = this.getArenaBounds();
    ctx.fillStyle = "rgba(24, 49, 31, 0.22)";
    ctx.fillRect(arena.left, arena.top, arena.width, arena.height);
    ctx.strokeStyle = this.warUnlocked ? "rgba(242, 201, 112, 0.62)" : "rgba(225, 234, 219, 0.24)";
    ctx.lineWidth = 4 / Math.max(this.cameraZoom, 0.2);
    ctx.setLineDash([18 / Math.max(this.cameraZoom, 0.2), 12 / Math.max(this.cameraZoom, 0.2)]);
    ctx.strokeRect(arena.left, arena.top, arena.width, arena.height);
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255,255,255,0.018)";
    const grid = 160;
    for (let x = 0; x <= this.worldWidth; x += grid) ctx.fillRect(x, 0, 1 / this.cameraZoom, this.worldHeight);
    for (let y = 0; y <= this.worldHeight; y += grid) ctx.fillRect(0, y, this.worldWidth, 1 / this.cameraZoom);

    // 본부 옆 벌목소와 숲을 잇는 운반로. 벌목꾼은 이 길을 따라
    // 숲에서 원목을 가져와 본부 생활권의 벌목소에 저장한다.
    const lumberLocation = this.lumberCamp
      ? { x: this.lumberCamp.x, y: this.lumberCamp.y }
      : null;
    const woodNode = this.resourceNodes.find((node) => node.type === "wood");
    if (lumberLocation && woodNode) {
      ctx.beginPath();
      ctx.moveTo(lumberLocation.x, lumberLocation.y + 24);
      ctx.quadraticCurveTo(
        (lumberLocation.x + woodNode.x) / 2 + 18,
        (lumberLocation.y + woodNode.y) / 2 - 12,
        woodNode.x + 28,
        woodNode.y - 18
      );
      ctx.strokeStyle = "rgba(79, 59, 37, 0.42)";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.strokeStyle = "rgba(173, 139, 91, 0.34)";
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.lineCap = "butt";
    }

    if (this.warUnlocked) {
      // 적은 전장 테두리 전체의 임의 위치에서 등장한다. 고정된 네 개 진입로 대신
      // 외곽선에 은은한 위험 표시만 남겨 실제 출현 지점을 예측하기 어렵게 한다.
      ctx.save();
      ctx.strokeStyle = "rgba(215, 92, 92, 0.18)";
      ctx.lineWidth = 12 / Math.max(this.cameraZoom, 0.2);
      ctx.setLineDash([28 / Math.max(this.cameraZoom, 0.2), 18 / Math.max(this.cameraZoom, 0.2)]);
      ctx.strokeRect(arena.left + 18, arena.top + 18, arena.width - 36, arena.height - 36);
      ctx.restore();
    }
    ctx.restore();
  }

  _renderConstructionGrid(ctx) {
    if (!this.constructionPlacement) return;
    const zone = this._getBuildZone();
    const zoom = Math.max(this.cameraZoom, 0.28);

    ctx.save();
    ctx.fillStyle = "rgba(108, 196, 133, 0.045)";
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    ctx.strokeStyle = "rgba(198, 238, 207, 0.26)";
    ctx.lineWidth = 1 / zoom;

    for (let column = 0; column <= zone.columns; column += 1) {
      const x = zone.x + column * zone.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, zone.y);
      ctx.lineTo(x, zone.y + zone.height);
      ctx.stroke();
    }
    for (let row = 0; row <= zone.rows; row += 1) {
      const y = zone.y + row * zone.cellSize;
      ctx.beginPath();
      ctx.moveTo(zone.x, y);
      ctx.lineTo(zone.x + zone.width, y);
      ctx.stroke();
    }

    ctx.setLineDash([8 / zoom, 6 / zoom]);
    ctx.strokeStyle = "rgba(224, 246, 229, 0.55)";
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    ctx.setLineDash([]);

    const preview = this.constructionPreview;
    if (preview) {
      const valid = preview.valid && this.resources.wood >= this._getConstructionCost(preview.type);
      const left = preview.x - preview.width / 2;
      const top = preview.y - preview.height / 2;
      ctx.fillStyle = valid ? "rgba(88, 219, 126, 0.24)" : "rgba(229, 91, 91, 0.22)";
      ctx.strokeStyle = valid ? "rgba(126, 255, 160, 0.95)" : "rgba(255, 132, 132, 0.95)";
      ctx.lineWidth = 3 / zoom;
      ctx.fillRect(left, top, preview.width, preview.height);
      ctx.strokeRect(left, top, preview.width, preview.height);

      // 건물의 대략적인 청사진
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = valid ? "#9ee0aa" : "#e69a9a";
      ctx.fillRect(preview.x - 40, preview.y - 15, 80, 40);
      ctx.beginPath();
      ctx.moveTo(preview.x - 48, preview.y - 15);
      ctx.lineTo(preview.x, preview.y - 43);
      ctx.lineTo(preview.x + 48, preview.y - 15);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.textAlign = "center";
      ctx.font = `bold ${13 / zoom}px Malgun Gothic, sans-serif`;
      ctx.fillStyle = valid ? "#d8ffe1" : "#ffd7d7";
      ctx.strokeStyle = "rgba(0,0,0,0.72)";
      ctx.lineWidth = 3 / zoom;
      const label = valid ? "클릭하여 배치" : "이곳에는 건설할 수 없음";
      ctx.strokeText(label, preview.x, top - 12 / zoom);
      ctx.fillText(label, preview.x, top - 12 / zoom);
    }

    ctx.restore();
  }

  _renderConstructionProjects(ctx) {
    const zoom = Math.max(this.cameraZoom, 0.28);
    for (const project of this.constructionProjects) {
      if (project.completed) continue;
      const left = project.x - project.width / 2;
      const top = project.y - project.height / 2;
      const materialRatio = project.requiredWood > 0
        ? project.deliveredWood / project.requiredWood
        : 1;
      const buildRatio = Math.max(0, Math.min(1, project.buildProgress));

      ctx.save();
      ctx.fillStyle = "rgba(82, 58, 34, 0.28)";
      ctx.fillRect(left + 8, top + project.height - 14, project.width - 16, 14);
      ctx.strokeStyle = "rgba(203, 164, 103, 0.72)";
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(left + 8, top + project.height - 14, project.width - 16, 14);

      // 운반된 목재 자재 더미
      const visibleLogs = Math.min(12, project.deliveredWood);
      for (let i = 0; i < visibleLogs; i += 1) {
        const row = Math.floor(i / 4);
        const col = i % 4;
        ctx.fillStyle = row % 2 ? "#805127" : "#70451f";
        ctx.fillRect(left + 8 + col * 10, top + project.height - 20 - row * 6, 22, 5);
      }

      if (materialRatio >= 1) {
        // 공사 진행에 따라 골조와 지붕이 단계적으로 나타난다.
        ctx.strokeStyle = "rgba(193, 145, 79, 0.95)";
        ctx.lineWidth = 5 / zoom;
        const frameHeight = 42 * buildRatio;
        for (const offset of [-38, 0, 38]) {
          ctx.beginPath();
          ctx.moveTo(project.x + offset, project.y + 28);
          ctx.lineTo(project.x + offset, project.y + 28 - frameHeight);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(project.x - 40, project.y + 28 - frameHeight);
        ctx.lineTo(project.x + 40, project.y + 28 - frameHeight);
        ctx.stroke();

        if (buildRatio > 0.58) {
          const roofAlpha = (buildRatio - 0.58) / 0.42;
          ctx.globalAlpha = Math.max(0, Math.min(1, roofAlpha));
          ctx.fillStyle = "#66503a";
          ctx.beginPath();
          ctx.moveTo(project.x - 50, project.y - 12);
          ctx.lineTo(project.x, project.y - 42);
          ctx.lineTo(project.x + 50, project.y - 12);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      const overall = materialRatio < 1 ? materialRatio * 0.5 : 0.5 + buildRatio * 0.5;
      const barWidth = 92 / zoom;
      const barHeight = 8 / zoom;
      const barX = project.x - barWidth / 2;
      const barY = top - 18 / zoom;
      ctx.fillStyle = "rgba(9, 18, 21, 0.8)";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = materialRatio < 1 ? "#c89b5f" : "#67cf83";
      ctx.fillRect(barX, barY, barWidth * overall, barHeight);
      ctx.restore();
    }
  }

  _renderConstructionSites(ctx) {
    const site = this._getActiveConstructionSite();
    if (!site) return;

    const zoom = Math.max(this.cameraZoom, 0.28);
    const hovered = this.hoveredConstructionSiteId === site.id;
    const ready = site.ready;
    const pulse = 0.5 + Math.sin(performance.now() / 320) * 0.5;
    const left = site.x - site.width / 2;
    const top = site.y - site.height / 2;

    ctx.save();

    ctx.fillStyle = ready
      ? `rgba(95, 212, 132, ${0.10 + pulse * 0.05})`
      : "rgba(220, 228, 232, 0.055)";
    ctx.strokeStyle = ready
      ? (hovered ? "rgba(144, 255, 176, 1)" : "rgba(104, 226, 141, 0.94)")
      : (hovered ? "rgba(238, 244, 246, 0.72)" : "rgba(220, 228, 232, 0.42)");
    ctx.lineWidth = (hovered ? 3.2 : 2.2) / zoom;
    ctx.setLineDash([10 / zoom, 7 / zoom]);
    ctx.fillRect(left, top, site.width, site.height);
    ctx.strokeRect(left, top, site.width, site.height);
    ctx.setLineDash([]);

    // 현재 단계에 맞는 건물 청사진을 땅 위에 희미하게 표시한다.
    ctx.globalAlpha = ready ? 0.46 : 0.23;
    ctx.fillStyle = ready ? "#91d9a7" : "#d2d9dc";
    if (site.kind === "headquarters") {
      ctx.beginPath();
      ctx.ellipse(site.x, site.y + 14, 58, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(site.x - 27, site.y - 2, 54, 34);
      ctx.beginPath();
      ctx.moveTo(site.x - 34, site.y - 2);
      ctx.lineTo(site.x, site.y - 37);
      ctx.lineTo(site.x + 34, site.y - 2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(site.x - 34, site.y - 8, 68, 32);
      ctx.beginPath();
      ctx.moveTo(site.x - 42, site.y - 8);
      ctx.lineTo(site.x, site.y - 35);
      ctx.lineTo(site.x + 42, site.y - 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const panelWidth = 184 / zoom;
    const panelHeight = 60 / zoom;
    const panelX = site.x - panelWidth / 2;
    const panelY = top - 82 / zoom;
    ctx.fillStyle = ready ? "rgba(27, 83, 48, 0.94)" : "rgba(24, 34, 39, 0.9)";
    ctx.strokeStyle = ready ? "rgba(117, 234, 151, 0.95)" : "rgba(212, 223, 228, 0.46)";
    ctx.lineWidth = 1.8 / zoom;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 10 / zoom);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${15 / zoom}px Malgun Gothic, sans-serif`;
    ctx.fillText(ready ? site.actionLabel : site.waitingLabel, site.x, panelY + 23 / zoom);
    ctx.font = `${12 / zoom}px Malgun Gothic, sans-serif`;
    ctx.fillStyle = ready ? "#c9ffd7" : "rgba(232, 238, 241, 0.82)";
    ctx.fillText(
      ready ? `목재 ${site.cost}개 사용` : `목재 ${Math.min(this.resources.wood, site.cost)} / ${site.cost}`,
      site.x,
      panelY + 44 / zoom
    );

    ctx.restore();
  }

  _renderResourceNodes(ctx, blend) {
    const zoom = this.cameraZoom;
    for (const node of this.resourceNodes) {
      if (node.unlocked === false) continue;
      const hovered = this.hoveredResourceNodeId === node.id;
      const depleted = node.amount < 1;
      const fullness = Math.max(0, Math.min(1, node.amount / node.maxAmount));
      const scale = 1 + node.pulse * 0.12 + (hovered ? 0.06 : 0);

      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.scale(scale, scale);

      if (hovered) {
        ctx.beginPath();
        ctx.arc(0, 0, node.radius + 12 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 230, 135, 0.12)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 230, 135, 0.9)";
        ctx.lineWidth = 3 / zoom;
        ctx.stroke();
      }

      if (node.type === "wood") {
        const trees = node.trees || [];
        for (const tree of trees) {
          const localX = tree.x - node.x;
          const localY = tree.y - node.y;
          const treeFullness = Math.max(0, Math.min(1, tree.amount / tree.maxAmount));
          const treeScale = tree.amount <= 0 ? 0.2 : 0.48 + treeFullness * 0.52;

          ctx.fillStyle = tree.amount <= 0 ? "#6b4b31" : "#5f3c25";
          ctx.fillRect(localX - 4, localY + 4, 8, tree.amount <= 0 ? 7 : 22 * treeScale);

          if (tree.amount > 0) {
            ctx.beginPath();
            ctx.arc(localX, localY, 19 * treeScale, 0, Math.PI * 2);
            ctx.fillStyle = treeFullness < 0.4 ? "#557a49" : "#2f7d45";
            ctx.fill();
            ctx.beginPath();
            ctx.arc(localX - 5 * treeScale, localY - 6 * treeScale, 11 * treeScale, 0, Math.PI * 2);
            ctx.fillStyle = treeFullness < 0.4 ? "#6f965f" : "#42955b";
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.ellipse(localX, localY + 7, 8, 4, 0, 0, Math.PI * 2);
            ctx.fillStyle = "#8b6543";
            ctx.fill();
          }

          if (tree.assignedWorkerId) {
            ctx.beginPath();
            ctx.arc(localX, localY, 24 / Math.max(zoom, 0.4), 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255,220,115,0.55)";
            ctx.lineWidth = 1.5 / zoom;
            ctx.stroke();
          }
        }
      } else {
        const rockScale = depleted ? 0.72 : 0.86 + fullness * 0.18;
        const rocks = [
          { x: -24, y: 13, r: 22 },
          { x: 3, y: -9, r: 27 },
          { x: 27, y: 15, r: 18 },
        ];
        for (const rock of rocks) {
          ctx.save();
          ctx.translate(rock.x, rock.y);
          ctx.scale(rockScale, rockScale);
          ctx.beginPath();
          ctx.moveTo(-rock.r, rock.r * 0.55);
          ctx.lineTo(-rock.r * 0.62, -rock.r * 0.55);
          ctx.lineTo(0, -rock.r);
          ctx.lineTo(rock.r * 0.78, -rock.r * 0.35);
          ctx.lineTo(rock.r, rock.r * 0.62);
          ctx.closePath();
          ctx.fillStyle = depleted ? "#676a6b" : "#777d83";
          ctx.fill();
          ctx.strokeStyle = depleted ? "#484b4d" : "#aab2ba";
          ctx.lineWidth = 2 / zoom;
          ctx.stroke();
          if (!depleted) {
            ctx.beginPath();
            ctx.moveTo(-rock.r * 0.35, rock.r * 0.1);
            ctx.lineTo(rock.r * 0.2, -rock.r * 0.45);
            ctx.lineTo(rock.r * 0.55, -rock.r * 0.2);
            ctx.strokeStyle = "rgba(150, 210, 235, 0.9)";
            ctx.lineWidth = 3 / zoom;
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      ctx.restore();

      const labelAlpha = Math.max(0.42, blend.combatAlpha * 0.9 + blend.frontlineAlpha * 0.7);
      ctx.save();
      ctx.globalAlpha = labelAlpha;
      ctx.textAlign = "center";
      const labelY = node.y - node.radius - 20 / zoom;
      const width = 118 / zoom;
      const height = 31 / zoom;
      ctx.fillStyle = "rgba(12, 20, 27, 0.82)";
      ctx.beginPath();
      ctx.roundRect(node.x - width / 2, labelY - height / 2, width, height, 8 / zoom);
      ctx.fill();
      ctx.strokeStyle = hovered ? "rgba(255,230,135,0.95)" : "rgba(255,255,255,0.16)";
      ctx.lineWidth = (hovered ? 2 : 1) / zoom;
      ctx.stroke();
      ctx.font = `bold ${13 / zoom}px Malgun Gothic, sans-serif`;
      ctx.fillStyle = depleted ? "#b9b9b9" : "#ffffff";
      ctx.fillText(`${node.label} ${Math.floor(node.amount)}/${node.maxAmount}`, node.x, labelY + 4 / zoom);

      const barWidth = 84 / zoom;
      const barHeight = 5 / zoom;
      const barY = labelY + 21 / zoom;
      ctx.fillStyle = "rgba(0,0,0,0.42)";
      ctx.fillRect(node.x - barWidth / 2, barY, barWidth, barHeight);
      ctx.fillStyle = node.type === "wood" ? "#68b873" : "#8dc8df";
      ctx.fillRect(node.x - barWidth / 2, barY, barWidth * fullness, barHeight);
      ctx.restore();
    }
  }

  _renderRallyPoint() {
    // 막사 및 대기 집결지는 제거되었다.
  }

  _renderRallySelection(ctx) {
    if (!this.rallyCommandOpen) return;
    const zoom = Math.max(this.cameraZoom, 0.28);
    ctx.save();
    ctx.strokeStyle = "rgba(255, 226, 117, 0.95)";
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([5 / zoom, 4 / zoom]);
    for (const soldier of this._getRallySoldiers()) {
      ctx.beginPath();
      ctx.ellipse(soldier.x, soldier.y + 8, 15 / zoom, 8 / zoom, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _renderRallyFrontCommands(ctx, blend) {
    if (!this.rallyCommandOpen || !this.warUnlocked) return;
    const zoom = Math.max(this.cameraZoom, 0.28);
    for (const frontId of ["east", "north"]) {
      const front = this.fronts[frontId];
      const point = this._getRallyFrontArrowPosition(frontId);
      if (!front || !point) continue;
      const selected = this.rallySelectedFrontId === frontId;
      const hovered = this.hoveredRallyFrontId === frontId;
      const radius = 26 / zoom;

      ctx.save();
      ctx.globalAlpha = Math.max(0.75, 1 - blend.strategicAlpha * 0.08);
      ctx.fillStyle = selected ? "rgba(255, 204, 82, 0.92)" : "rgba(22, 38, 50, 0.88)";
      ctx.strokeStyle = hovered || selected ? "#ffe285" : "rgba(142, 210, 247, 0.82)";
      ctx.lineWidth = (hovered || selected ? 3 : 2) / zoom;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const arrowLength = 15 / zoom;
      ctx.strokeStyle = selected ? "#2a2d24" : "#eef8ff";
      ctx.lineWidth = 4 / zoom;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(point.x - front.dirX * arrowLength * 0.65, point.y - front.dirY * arrowLength * 0.65);
      ctx.lineTo(point.x + front.dirX * arrowLength, point.y + front.dirY * arrowLength);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(point.x + front.dirX * arrowLength, point.y + front.dirY * arrowLength);
      ctx.lineTo(point.x + front.dirX * arrowLength * 0.35 + front.perpX * arrowLength * 0.55, point.y + front.dirY * arrowLength * 0.35 + front.perpY * arrowLength * 0.55);
      ctx.moveTo(point.x + front.dirX * arrowLength, point.y + front.dirY * arrowLength);
      ctx.lineTo(point.x + front.dirX * arrowLength * 0.35 - front.perpX * arrowLength * 0.55, point.y + front.dirY * arrowLength * 0.35 - front.perpY * arrowLength * 0.55);
      ctx.stroke();
      ctx.lineCap = "butt";

      ctx.textAlign = "center";
      ctx.font = `bold ${12 / zoom}px Malgun Gothic, sans-serif`;
      ctx.lineWidth = 3 / zoom;
      ctx.strokeStyle = "rgba(0,0,0,0.78)";
      ctx.fillStyle = "#ffffff";
      const labelY = point.y + 43 / zoom;
      ctx.strokeText(front.label, point.x, labelY);
      ctx.fillText(front.label, point.x, labelY);
      ctx.restore();
    }
  }

  _renderStrategicMarchGroups(ctx, blend) {
    if (blend.strategicAlpha <= 0.18) return;
    const groups = new Map();
    for (const soldier of this.soldiers) {
      if (!soldier.isActive || soldier.isDead) continue;
      let key;
      let state;
      if (soldier.awaitingOrder) {
        key = `reserve|${soldier.team}`;
        state = "reserve";
      } else if (soldier.deploymentMarchActive) {
        key = `march|${soldier.frontId}|${soldier.team}`;
        state = "march";
      } else {
        key = `front|${soldier.frontId}|${soldier.team}`;
        state = "front";
      }
      if (!groups.has(key)) groups.set(key, { members: [], state, frontId: soldier.frontId, team: soldier.team });
      groups.get(key).members.push(soldier);
    }

    const zoom = Math.max(this.cameraZoom, 0.28);
    for (const group of groups.values()) {
      const members = group.members;
      if (!members.length) continue;
      const x = members.reduce((sum, item) => sum + item.x, 0) / members.length;
      const y = members.reduce((sum, item) => sum + item.y, 0) / members.length;
      const front = group.state === "reserve" ? null : this.fronts[group.frontId];
      const composition = { rifle: 0, machineGun: 0, shield: 0 };
      for (const member of members) {
        const type = Object.prototype.hasOwnProperty.call(composition, member.unitType) ? member.unitType : "rifle";
        composition[type] += 1;
      }

      ctx.save();
      ctx.globalAlpha = blend.strategicAlpha;
      ctx.fillStyle = group.state === "reserve"
        ? "#e3b957"
        : group.team === TEAM.FRIENDLY
          ? "#70c5ff"
          : "#ff7777";
      ctx.strokeStyle = "rgba(7,15,22,0.9)";
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.arc(x, y, 15 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (front && group.state === "march") {
        ctx.strokeStyle = "#eefaff";
        ctx.lineWidth = 2.6 / zoom;
        ctx.beginPath();
        ctx.moveTo(x - front.dirX * 4 / zoom, y - front.dirY * 4 / zoom);
        ctx.lineTo(x + front.dirX * 13 / zoom, y + front.dirY * 13 / zoom);
        ctx.stroke();
      }

      ctx.textAlign = "center";
      ctx.font = `bold ${11 / zoom}px Malgun Gothic, sans-serif`;
      ctx.fillStyle = "#10202b";
      ctx.fillText(String(members.length), x, y + 4 / zoom);

      if (blend.strategicAlpha > 0.55) {
        const primary = composition.machineGun > 0 ? "기관" : composition.shield > 0 ? "방패" : "소총";
        const stateLabel = group.state === "march" ? "이동 중" : group.state === "reserve" ? "대기" : "전선";
        ctx.font = `bold ${9.5 / zoom}px Malgun Gothic, sans-serif`;
        ctx.lineWidth = 3 / zoom;
        ctx.strokeStyle = "rgba(0,0,0,0.78)";
        ctx.fillStyle = "#f7fbff";
        const label = `${primary} · ${stateLabel}`;
        ctx.strokeText(label, x, y + 30 / zoom);
        ctx.fillText(label, x, y + 30 / zoom);
      }
      ctx.restore();
    }
  }

  _renderBlendedSoldier(ctx, soldier, blend) {
    const { combatAlpha, frontlineAlpha } = blend;

    // 저배율 표식은 스프라이트 뒤에 먼저 그려 병사 이미지가 가려지지 않게 한다.
    if (!soldier.isDead && frontlineAlpha > 0.02) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.22 + frontlineAlpha * 0.78);
      this._renderOperationalSoldier(ctx, soldier, 0.9 + 0.18 * frontlineAlpha);
      ctx.restore();
    }

    if (combatAlpha > 0.02) {
      ctx.save();
      ctx.globalAlpha = combatAlpha;
      soldier.render(ctx);
      ctx.restore();
    }

  }

  _renderOperationalSoldier(ctx, soldier, scale = 1) {
    const zoom = Math.max(this.cameraZoom, 0.2);
    const radius = (11 * scale) / zoom;
    const teamColor = soldier.team === TEAM.FRIENDLY ? "#43b7ff" : "#ff4f5f";
    const teamFill = soldier.team === TEAM.FRIENDLY
      ? "rgba(35, 153, 232, 0.28)"
      : "rgba(232, 52, 68, 0.28)";
    ctx.save();
    ctx.translate(soldier.x, soldier.y + 3 / zoom);
    ctx.fillStyle = teamFill;
    ctx.strokeStyle = teamColor;
    ctx.lineWidth = 2.4 / zoom;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(5, 12, 18, 0.9)";
    ctx.lineWidth = 1.2 / zoom;
    ctx.beginPath();
    ctx.moveTo(soldier.facingX * 4 / zoom, soldier.facingY * 4 / zoom);
    ctx.lineTo(soldier.facingX * 13 / zoom, soldier.facingY * 13 / zoom);
    ctx.stroke();
    ctx.restore();
  }

  _renderStrategicSoldier(ctx, soldier, scale = 1) {
    const radius = (4.2 * scale) / this.cameraZoom;
    ctx.save();
    ctx.fillStyle = soldier.team === TEAM.FRIENDLY ? "#70c5ff" : "#ff7777";
    ctx.beginPath();
    ctx.arc(soldier.x, soldier.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _getFrontlinePoint(front) {
    const live = this.soldiers.filter((s) => s.frontId === front.id && s.isActive && !s.isDead && s.hp > 0);
    const friendly = live.filter((s) => s.team === TEAM.FRIENDLY);
    const enemy = live.filter((s) => s.team === TEAM.ENEMY);
    const project = (s) => (s.x - this.hqBase.x) * front.dirX + (s.y - this.hqBase.y) * front.dirY;
    const activeBase = this._getActiveEnemyBase(front);
    const defaultProjection = ((activeBase.x - this.hqBase.x) * front.dirX + (activeBase.y - this.hqBase.y) * front.dirY) * 0.55;
    const friendlyProjection = friendly.length ? Math.max(...friendly.map(project)) : defaultProjection * 0.55;
    const enemyProjection = enemy.length ? Math.min(...enemy.map(project)) : defaultProjection * 1.35;
    const projection = (friendlyProjection + enemyProjection) / 2;
    return {
      x: this.hqBase.x + front.dirX * projection,
      y: this.hqBase.y + front.dirY * projection,
      friendlyCount: friendly.length,
      enemyCount: enemy.length,
    };
  }

  _renderFrontlineOverlays(ctx, alpha = 1) {
    for (const front of Object.values(this.fronts)) {
      const point = this._getFrontlinePoint(front);
      const half = 120;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(point.x - front.perpX * half, point.y - front.perpY * half);
      ctx.lineTo(point.x + front.perpX * half, point.y + front.perpY * half);
      ctx.strokeStyle = this.hoveredFrontId === front.id ? "rgba(255,235,150,0.95)" : "rgba(255,244,214,0.88)";
      ctx.lineWidth = 4 / this.cameraZoom;
      ctx.stroke();

      const font = 14 / this.cameraZoom;
      ctx.font = `bold ${font}px Malgun Gothic, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(10,16,22,0.78)";
      ctx.fillRect(point.x - 70 / this.cameraZoom, point.y - 44 / this.cameraZoom, 140 / this.cameraZoom, 28 / this.cameraZoom);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${front.label} · 아군 ${point.friendlyCount} / 적 ${point.enemyCount}`, point.x, point.y - 24 / this.cameraZoom);
      ctx.restore();
    }
  }

  _renderStrategicLabels(ctx, alpha = 1) {
    const zoom = this.cameraZoom;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";

    const drawNodeLabel = (x, y, title, subtitle, active, color) => {
      const width = 142 / zoom;
      const height = 50 / zoom;
      ctx.fillStyle = active ? "rgba(12,25,38,0.82)" : "rgba(25,30,35,0.62)";
      ctx.strokeStyle = color;
      ctx.lineWidth = (active ? 2.5 : 1.4) / zoom;
      ctx.beginPath();
      ctx.roundRect(x - width / 2, y - height / 2, width, height, 10 / zoom);
      ctx.fill();
      ctx.stroke();
      ctx.font = `bold ${16 / zoom}px Malgun Gothic, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(title, x, y - 3 / zoom);
      ctx.font = `${12 / zoom}px Malgun Gothic, sans-serif`;
      ctx.fillStyle = "rgba(230,238,246,0.82)";
      ctx.fillText(subtitle, x, y + 17 / zoom);
    };

    drawNodeLabel(this.hqBase.x, this.hqBase.y - 120 / zoom, "중앙 본부", `아군 ${this.getFriendlyMilitaryCount()}명`, true, "rgba(113,220,151,0.8)");
    for (const front of Object.values(this.fronts)) {
      const base = front.region2Started ? front.region2Base : front.region1Base;
      drawNodeLabel(
        base.x,
        base.y - 115 / zoom,
        front.label,
        this._getFrontStatus(front),
        front.engaged,
        this.hoveredFrontId === front.id ? "rgba(255,228,126,0.95)" : front.color
      );
    }

    drawNodeLabel(this.worldCenter.x - this.canvas.width * 0.95, this.worldCenter.y, "서부 전선", "준비 중", false, "rgba(255,255,255,0.18)");
    drawNodeLabel(this.worldCenter.x, this.worldCenter.y + this.canvas.height * 0.95, "남부 전선", "준비 중", false, "rgba(255,255,255,0.18)");
    ctx.restore();
  }

  _renderRewardTexts(ctx) {
    for (const text of this.rewardTexts) {
      const alpha = Math.min(1, text.timer / 0.35);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.font = `bold ${15 / this.cameraZoom}px Malgun Gothic, sans-serif`;
      ctx.lineWidth = 3 / this.cameraZoom;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      const label = text.amount > 0 ? `+${text.amount} ${text.reason}` : text.reason;
      ctx.strokeText(label, text.x, text.y);
      ctx.fillStyle = "#ffd166";
      ctx.fillText(label, text.x, text.y);
      ctx.restore();
    }
  }

  _renderOutpostStatus(ctx) {
    if (!this.warUnlocked) return;
    const front = this.fronts[this.activeFront];
    let title = "";
    let subtitle = "";
    if (front.outpostState === "region2_active") {
      title = `${front.region2Name} 전투 중`;
      subtitle = "확대·축소해도 같은 세로/가로 전장이 유지됩니다";
    } else if (front.outpostState === "region2_clearing") {
      title = `${front.region2Name} 기지 파괴`;
      subtitle = "남은 적 병력을 소탕 중";
    } else if (front.outpostState === "region2_secured") {
      title = `${front.region2Name} 점령 완료`;
      subtitle = `점령 보상 +${WORLD_CONFIG.REGION_2_CAPTURE_REWARD}`;
    } else if (front.outpostState === "clearing") {
      title = `${front.region1Name} 파괴`;
      subtitle = "남은 적 병력을 소탕 중";
    } else if (front.outpostState === "captured") {
      title = `${front.region1Name} 점령`;
      subtitle = `점령 보상 +${front.captureReward} · 다음 지역 개방`;
    } else if (front.outpostState === "secured") {
      title = `${front.region1Name} 확보 완료`;
      subtitle = front.barracks ? "병영 건설 완료" : "점령지에 병영을 건설하세요";
    }
    if (!title) return;

    const width = Math.min(380, this.canvas.width - 32);
    const x = (this.canvas.width - width) / 2;
    const y = 24;
    ctx.save();
    ctx.fillStyle = "rgba(15,23,32,0.84)";
    ctx.fillRect(x, y, width, 72);
    ctx.strokeStyle = "#f0b84b";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, 72);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Malgun Gothic, sans-serif";
    ctx.fillText(title, this.canvas.width / 2, y + 29);
    ctx.fillStyle = "#d7e0e8";
    ctx.font = "14px Malgun Gothic, sans-serif";
    ctx.fillText(subtitle, this.canvas.width / 2, y + 53);
    ctx.restore();
  }

  _isBulletCollidingWithCircle(bullet, target) {
    const radius = bullet.radius + target.radius;
    if (Math.hypot(bullet.x - target.x, bullet.y - target.y) <= radius) return true;
    return this._isSegmentCircleColliding(
      Number.isFinite(bullet.previousX) ? bullet.previousX : bullet.x,
      Number.isFinite(bullet.previousY) ? bullet.previousY : bullet.y,
      bullet.x,
      bullet.y,
      target.x,
      target.y,
      radius
    );
  }

  _isSegmentCircleColliding(startX, startY, endX, endY, centerX, centerY, radius) {
    const dx = endX - startX;
    const dy = endY - startY;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= 0.0001) return Math.hypot(startX - centerX, startY - centerY) <= radius;
    const t = Math.max(0, Math.min(1, ((centerX - startX) * dx + (centerY - startY) * dy) / lengthSquared));
    const closestX = startX + dx * t;
    const closestY = startY + dy * t;
    return Math.hypot(closestX - centerX, closestY - centerY) <= radius;
  }

  _isBulletCollidingWithRect(bullet, target) {
    const halfW = target.width / 2 + bullet.radius;
    const halfH = target.height / 2 + bullet.radius;
    const minX = target.x - halfW;
    const maxX = target.x + halfW;
    const minY = target.y - halfH;
    const maxY = target.y + halfH;
    if (bullet.x >= minX && bullet.x <= maxX && bullet.y >= minY && bullet.y <= maxY) return true;
    return this._isSegmentRectColliding(
      Number.isFinite(bullet.previousX) ? bullet.previousX : bullet.x,
      Number.isFinite(bullet.previousY) ? bullet.previousY : bullet.y,
      bullet.x,
      bullet.y,
      minX,
      maxX,
      minY,
      maxY
    );
  }

  _isSegmentRectColliding(startX, startY, endX, endY, minX, maxX, minY, maxY) {
    const dx = endX - startX;
    const dy = endY - startY;
    let tMin = 0;
    let tMax = 1;
    const clip = (start, delta, min, max) => {
      if (Math.abs(delta) < 0.000001) return start >= min && start <= max;
      let a = (min - start) / delta;
      let b = (max - start) / delta;
      if (a > b) [a, b] = [b, a];
      tMin = Math.max(tMin, a);
      tMax = Math.min(tMax, b);
      return tMin <= tMax;
    };
    return clip(startX, dx, minX, maxX) && clip(startY, dy, minY, maxY);
  }
}
