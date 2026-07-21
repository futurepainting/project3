"use strict";

let LUMBER_WORKER_SEQUENCE = 0;

class LumberWorker extends Entity {
  constructor(x, y, camp) {
    super(x, y);
    this.id = `lumber-worker-${++LUMBER_WORKER_SEQUENCE}`;
    this.visualKey = "lumber_worker";
    this.visualMeta = getVisualMetadata(this.visualKey);
    this.camp = camp;
    this.state = "seeking";
    this.targetTree = null;
    this.speed = 72;
    this.carryCapacity = 1; // 벌목소 레벨에 따라 한 그루에서 얻는 목재가 배수로 증가
    this.carriedWood = 0;
    this.chopDuration = 3;
    this.chopTimer = 0;
    this.radius = 9;
    this.facingX = -1;
    this.facingY = 0;
  }

  _moveToward(targetX, targetY, deltaTime) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 1) return true;
    const nx = dx / distance;
    const ny = dy / distance;
    this.facingX = nx;
    this.facingY = ny;
    const step = Math.min(distance, this.speed * deltaTime);
    this.x += nx * step;
    this.y += ny * step;
    return distance <= 8;
  }

  _releaseTree() {
    if (this.targetTree?.assignedWorkerId === this.id) {
      this.targetTree.assignedWorkerId = null;
    }
    this.targetTree = null;
  }

  update(deltaTime, game) {
    if (!this.isActive || !this.camp?.isActive || !this.camp.isBuilt) return;

    if (this.state === "waiting_storage") {
      // 저장량 제한이 없어 이전 버전의 대기 상태가 남아 있어도 즉시 작업을 재개한다.
      this.state = this.carriedWood > 0 ? "returning" : "seeking";
    }

    if (this.state === "seeking") {
      const tree = game.findTreeForWorker(this);
      if (!tree) {
        this.state = "waiting_tree";
        return;
      }
      this.targetTree = tree;
      tree.assignedWorkerId = this.id;
      this.state = "to_tree";
    }

    if (this.state === "waiting_tree") {
      const tree = game.findTreeForWorker(this);
      if (tree) {
        this.targetTree = tree;
        tree.assignedWorkerId = this.id;
        this.state = "to_tree";
      }
      return;
    }

    if (this.state === "to_tree") {
      if (!this.targetTree || this.targetTree.amount <= 0) {
        this._releaseTree();
        this.state = "seeking";
        return;
      }
      if (this._moveToward(this.targetTree.x, this.targetTree.y, deltaTime)) {
        this.state = "chopping";
        this.chopTimer = 0;
      }
      return;
    }

    if (this.state === "chopping") {
      if (!this.targetTree || this.targetTree.amount <= 0) {
        this._releaseTree();
        this.state = "seeking";
        return;
      }
      this.facingX = this.targetTree.x >= this.x ? 1 : -1;
      this.facingY = 0;
      this.chopTimer += deltaTime;
      if (this.chopTimer < this.chopDuration) return;

      this.chopTimer = 0;
      const harvestedTree = Math.min(1, this.targetTree.amount);
      this.targetTree.amount -= harvestedTree;
      this.carriedWood += harvestedTree * this.carryCapacity;
      game.syncWoodlandAmount();
      this._releaseTree();
      this.state = "returning";
      return;
    }

    if (this.state === "returning") {
      const depositPoint = game.getVisualInteractionPoint(this.camp, "work", 0);
      const depositX = depositPoint.x;
      const depositY = depositPoint.y;
      if (!this._moveToward(depositX, depositY, deltaTime)) return;

      const delivered = game.depositLumber(this.carriedWood, this);
      this.carriedWood -= delivered;
      if (this.carriedWood > 0) {
        this.state = "waiting_storage";
      } else {
        this.state = "seeking";
      }
    }
  }

  render(ctx, cameraZoom = 1) {
    if (!this.isActive) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d69a55";
    ctx.fillRect(-5, -1, 10, 13);
    ctx.fillStyle = "#f0c99b";
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#724b2d";
    ctx.fillRect(-6, -11, 12, 4);

    if (this.state === "chopping") {
      const swing = Math.sin(this.chopTimer * 8) * 0.75;
      ctx.save();
      ctx.rotate(swing);
      ctx.strokeStyle = "#6b452a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(3, 0);
      ctx.lineTo(12, -10);
      ctx.stroke();
      ctx.fillStyle = "#b9c1c7";
      ctx.fillRect(9, -13, 8, 5);
      ctx.restore();
    }

    if (this.carriedWood > 0) {
      ctx.fillStyle = "#6f4325";
      for (let i = 0; i < this.carriedWood; i += 1) {
        ctx.fillRect(-10 + i * 6, 11, 13, 4);
      }
    }

    if (cameraZoom > 0.7) {
      ctx.textAlign = "center";
      ctx.font = "bold 10px Malgun Gothic, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      const label = this.state === "chopping"
        ? "벌목 중"
        : this.state === "returning"
          ? "운반 중"
          : this.state === "waiting_storage"
            ? "저장 대기"
            : "이동 중";
      ctx.fillText(label, 0, -17);
    }

    ctx.restore();
  }
}

let CONSTRUCTION_WORKER_SEQUENCE = 0;

class ConstructionWorker extends Entity {
  constructor(x, y, sourceBuilding, project) {
    super(x, y);
    this.id = `construction-worker-${++CONSTRUCTION_WORKER_SEQUENCE}`;
    this.visualKey = "construction_worker";
    this.visualMeta = getVisualMetadata(this.visualKey);
    this.sourceBuilding = sourceBuilding;
    this.project = project;
    this.state = "to_material";
    this.speed = 66;
    this.radius = 9;
    this.carryingWood = false;
    this.materialBundle = 3;
    this.facingX = 1;
    this.facingY = 0;
    this.hammerTime = 0;
  }

  _moveToward(targetX, targetY, deltaTime) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 1) return true;
    const nx = dx / distance;
    const ny = dy / distance;
    this.facingX = nx;
    this.facingY = ny;
    const step = Math.min(distance, this.speed * deltaTime);
    this.x += nx * step;
    this.y += ny * step;
    return distance <= 8;
  }

  update(deltaTime, game) {
    if (!this.isActive || !this.project || this.project.completed) {
      this.state = "idle";
      return;
    }

    const project = this.project;
    const source = this.sourceBuilding || game.lumberCamp || game.hqBase;

    if (project.deliveredWood < project.requiredWood) {
      if (this.state === "building" || this.state === "idle") {
        this.state = "to_material";
      }

      if (this.state === "to_material") {
        const sourcePoint = game.getVisualInteractionPoint(source, "work", 0);
        const sourceX = sourcePoint.x;
        const sourceY = sourcePoint.y;
        if (!this._moveToward(sourceX, sourceY, deltaTime)) return;
        this.carryingWood = true;
        this.state = "to_site";
        return;
      }

      if (this.state === "to_site") {
        const deliveryX = project.x - project.width / 2 + 14;
        const deliveryY = project.y + project.height / 2 + 10;
        if (!this._moveToward(deliveryX, deliveryY, deltaTime)) return;
        if (this.carryingWood) {
          this.carryingWood = false;
          project.deliveredWood = Math.min(project.requiredWood, project.deliveredWood + this.materialBundle);
          if (typeof game.onConstructionMaterialDelivered === "function") {
            game.onConstructionMaterialDelivered(project, this);
          }
        }
        this.state = project.deliveredWood >= project.requiredWood ? "building" : "to_material";
        return;
      }
    }

    if (project.deliveredWood >= project.requiredWood) {
      this.state = "building";
      const workX = project.x + project.width / 2 - 16;
      const workY = project.y + project.height / 2 + 6;
      if (!this._moveToward(workX, workY, deltaTime)) return;
      this.hammerTime += deltaTime;
      game.advanceConstructionProject(project, deltaTime);
    }
  }

  render(ctx, cameraZoom = 1) {
    if (!this.isActive) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d7a052";
    ctx.fillRect(-5, -1, 10, 13);
    ctx.fillStyle = "#f0c99b";
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d7b23d";
    ctx.beginPath();
    ctx.arc(0, -7, 6, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-6, -8, 12, 3);

    if (this.carryingWood) {
      ctx.fillStyle = "#74451f";
      ctx.fillRect(-10, 10, 20, 5);
      ctx.fillStyle = "#c48b4b";
      ctx.beginPath();
      ctx.arc(-8, 12.5, 2.5, 0, Math.PI * 2);
      ctx.arc(8, 12.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.state === "building") {
      const swing = Math.sin(this.hammerTime * 10) * 0.7;
      ctx.save();
      ctx.rotate(swing);
      ctx.strokeStyle = "#62452b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(3, 0);
      ctx.lineTo(12, -10);
      ctx.stroke();
      ctx.fillStyle = "#aeb7bc";
      ctx.fillRect(8, -14, 9, 5);
      ctx.restore();
    }

    if (cameraZoom > 0.72 && this.state !== "idle") {
      ctx.textAlign = "center";
      ctx.font = "bold 10px Malgun Gothic, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      const label = this.state === "building"
        ? "건설 중"
        : this.state === "to_site"
          ? "자재 운반"
          : "자재 준비";
      ctx.fillText(label, 0, -18);
    }

    ctx.restore();
  }
}


let SETTLEMENT_RESIDENT_SEQUENCE = 0;

class SettlementResident extends Entity {
  constructor(x, y, anchor = null) {
    super(x, y);
    this.id = `settlement-resident-${++SETTLEMENT_RESIDENT_SEQUENCE}`;
    this.visualKey = "resident";
    this.visualMeta = getVisualMetadata(this.visualKey);
    this.anchor = anchor;
    this.speed = 34 + (SETTLEMENT_RESIDENT_SEQUENCE % 3) * 4;
    this.radius = 8;
    this.facingX = 1;
    this.facingY = 0;
    this.targetX = x;
    this.targetY = y;
    this.waitTimer = 0.2 + (SETTLEMENT_RESIDENT_SEQUENCE % 4) * 0.15;
    this.styleIndex = SETTLEMENT_RESIDENT_SEQUENCE % 4;
    this.mode = "idle";
    this.travelTargetX = x;
    this.travelTargetY = y;
    this.travelComplete = false;
  }

  beginTravel(targetX, targetY, mode = "transfer") {
    this.anchor = null;
    this.mode = mode;
    this.travelTargetX = targetX;
    this.travelTargetY = targetY;
    this.travelComplete = false;
    this.waitTimer = 0;
  }

  finishTravel(anchor = null) {
    this.mode = "idle";
    this.travelComplete = false;
    if (anchor) this.anchor = anchor;
  }

  setAnchor(anchor, slotIndex = 0, totalCount = 1) {
    this.anchor = anchor;
    if (!anchor) return;
    const cols = Math.max(2, Math.ceil(Math.sqrt(Math.max(1, totalCount))));
    const spacing = 18;
    const row = Math.floor(slotIndex / cols);
    const col = slotIndex % cols;
    const offsetX = -((cols - 1) * spacing) / 2 + col * spacing;
    const offsetY = 28 + row * 16;
    this.homeX = anchor.x + offsetX;
    this.homeY = anchor.y + anchor.height / 2 + offsetY;
    if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) {
      this.x = this.homeX;
      this.y = this.homeY;
    }
    if (!Number.isFinite(this.targetX) || !Number.isFinite(this.targetY)) {
      this.targetX = this.homeX;
      this.targetY = this.homeY;
    }
  }

  _chooseTarget() {
    if (!this.anchor) return;
    const r = Math.random();
    if (r < 0.65) {
      this.targetX = this.homeX + (Math.random() * 26 - 13);
      this.targetY = this.homeY + (Math.random() * 18 - 9);
    } else if (r < 0.9) {
      this.targetX = this.anchor.x + (Math.random() * 70 - 35);
      this.targetY = this.anchor.y + this.anchor.height / 2 + 18 + Math.random() * 30;
    } else {
      this.targetX = this.homeX;
      this.targetY = this.homeY;
    }
    this.waitTimer = 0;
  }

  _moveToward(targetX, targetY, deltaTime) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 1) return true;
    const nx = dx / distance;
    const ny = dy / distance;
    this.facingX = nx;
    this.facingY = ny;
    const step = Math.min(distance, this.speed * deltaTime);
    this.x += nx * step;
    this.y += ny * step;
    return distance <= 5;
  }

  update(deltaTime) {
    if (!this.isActive) return;

    if (this.mode !== "idle") {
      if (this._moveToward(this.travelTargetX, this.travelTargetY, deltaTime)) {
        this.travelComplete = true;
      }
      return;
    }

    if (!this.anchor) return;
    if (!Number.isFinite(this.homeX) || !Number.isFinite(this.homeY)) {
      this.setAnchor(this.anchor, 0, 1);
    }

    if (this.waitTimer > 0) {
      this.waitTimer -= deltaTime;
      if (this.waitTimer <= 0) this._chooseTarget();
      return;
    }

    if (this._moveToward(this.targetX, this.targetY, deltaTime)) {
      this.waitTimer = 0.6 + Math.random() * 1.8;
    }
  }

  render(ctx, cameraZoom = 1) {
    if (!this.isActive) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyColors = ['#c98556', '#7c9f5c', '#6d8fc7', '#b77aa7'];
    const hatColors = ['#7b4d28', '#556b39', '#465f8c', '#7d4d74'];
    ctx.fillStyle = bodyColors[this.styleIndex];
    ctx.fillRect(-4.5, -1, 9, 12);
    ctx.fillStyle = '#f0c99b';
    ctx.beginPath();
    ctx.arc(0, -6, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hatColors[this.styleIndex];
    ctx.fillRect(-5.5, -10, 11, 3.5);

    if (this.mode === "incoming") {
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(-9, 2, 5, 7);
      ctx.strokeStyle = "#5c3b21";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, 1);
      ctx.lineTo(-1, -2);
      ctx.stroke();
    }

    if (cameraZoom > 1.0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, 11);
      ctx.lineTo(this.facingX * 3, 14);
      ctx.stroke();
    }

    ctx.restore();
  }
}
