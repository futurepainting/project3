"use strict";

/**
 * 동일한 월드 Y축을 기준으로 건물과 캐릭터의 앞뒤 순서를 정렬한다.
 * 종류별 렌더 순서를 하드코딩하지 않고, 모든 새 요소가 같은 규칙을 사용한다.
 */
class VisualRenderSystem {
  constructor(game) {
    this.game = game;
    this.debugEnabled = false;
    this._entrySequence = 0;
  }

  toggleDebug() {
    this.debugEnabled = !this.debugEnabled;
    return this.debugEnabled;
  }

  beginFrame() {
    this._entrySequence = 0;
  }

  createEntry(entity, render, kind = "entity", visualKey = null, layer = 0) {
    if (!entity || typeof render !== "function") return null;
    const meta = entity.visualMeta || getVisualMetadata(visualKey || kind) || null;
    return {
      entity,
      render,
      kind,
      visualKey,
      meta,
      layer,
      order: this._entrySequence++,
      sortY: this.getSortY(entity, meta),
    };
  }

  createCustomEntry(x, y, render, kind = "effect", visualKey = null, layer = 0) {
    const entity = { x, y, width: 0, height: 0, isActive: true };
    return this.createEntry(entity, render, kind, visualKey, layer);
  }

  getBounds(entity, meta) {
    const bounds = meta?.visualBounds;
    return {
      width: bounds?.width || entity.width || 20,
      height: bounds?.height || entity.height || 20,
    };
  }

  getAnchorPoint(entity, meta = entity?.visualMeta || null) {
    const bounds = this.getBounds(entity, meta);
    const anchor = meta?.anchor || { x: 0.5, y: 1 };
    return {
      x: entity.x + (anchor.x - 0.5) * bounds.width + (anchor.offsetX || 0),
      y: entity.y + (anchor.y - 0.5) * bounds.height + (anchor.offsetY || 0),
    };
  }

  getSortY(entity, meta = entity?.visualMeta || null) {
    if (Number.isFinite(meta?.sortOffsetY)) return entity.y + meta.sortOffsetY;
    return this.getAnchorPoint(entity, meta).y;
  }

  getRelativePoint(entity, point, meta = entity?.visualMeta || null) {
    const bounds = this.getBounds(entity, meta);
    return {
      x: entity.x + ((point?.x ?? 0.5) - 0.5) * bounds.width + (point?.offsetX || 0),
      y: entity.y + ((point?.y ?? 0.5) - 0.5) * bounds.height + (point?.offsetY || 0),
    };
  }

  renderEntries(ctx, entries) {
    const activeEntries = entries
      .filter(Boolean)
      .filter((entry) => entry.entity?.isActive !== false)
      .sort((a, b) => a.layer - b.layer || a.sortY - b.sortY || a.order - b.order);

    for (const entry of activeEntries) entry.render(ctx);
    return activeEntries;
  }

  renderDebugWorld(ctx, entries, cameraZoom = 1) {
    if (!this.debugEnabled) return;
    const zoom = Math.max(cameraZoom, 0.28);

    ctx.save();
    ctx.lineWidth = 1.5 / zoom;
    ctx.font = `bold ${11 / zoom}px Malgun Gothic, sans-serif`;
    ctx.textAlign = "center";

    for (const entry of entries) {
      const { entity, meta } = entry;
      if (!entity || entity.isActive === false) continue;

      if (meta?.footprint) {
        const width = meta.footprint.columns * VISUAL_STYLE.gridSize;
        const height = meta.footprint.rows * VISUAL_STYLE.gridSize;
        ctx.fillStyle = "rgba(63, 189, 255, 0.07)";
        ctx.strokeStyle = "rgba(63, 189, 255, 0.85)";
        ctx.fillRect(entity.x - width / 2, entity.y - height / 2, width, height);
        ctx.strokeRect(entity.x - width / 2, entity.y - height / 2, width, height);
      }

      const anchor = this.getAnchorPoint(entity, meta);
      ctx.strokeStyle = "rgba(255, 91, 91, 0.95)";
      ctx.beginPath();
      ctx.moveTo(anchor.x - 7 / zoom, anchor.y);
      ctx.lineTo(anchor.x + 7 / zoom, anchor.y);
      ctx.moveTo(anchor.x, anchor.y - 7 / zoom);
      ctx.lineTo(anchor.x, anchor.y + 7 / zoom);
      ctx.stroke();

      if (meta?.entrance) {
        const entrance = this.getRelativePoint(entity, meta.entrance, meta);
        ctx.fillStyle = "rgba(255, 221, 87, 0.95)";
        ctx.beginPath();
        ctx.arc(entrance.x, entrance.y, 4.5 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const point of meta?.workPoints || []) {
        const workPoint = this.getRelativePoint(entity, point, meta);
        ctx.fillStyle = "rgba(117, 255, 151, 0.95)";
        ctx.beginPath();
        ctx.arc(workPoint.x, workPoint.y, 3.8 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(`${entry.visualKey || entry.kind} · Y ${Math.round(entry.sortY)}`, anchor.x, anchor.y + 18 / zoom);
    }

    ctx.restore();
  }

  renderDebugHud(ctx) {
    if (!this.debugEnabled) return;
    ctx.save();
    ctx.fillStyle = "rgba(8, 16, 24, 0.88)";
    ctx.fillRect(16, 16, 285, 76);
    ctx.strokeStyle = "rgba(93, 210, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 285, 76);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Malgun Gothic, sans-serif";
    ctx.fillText("F3 시점 디버그 ON", 30, 42);
    ctx.font = "12px Malgun Gothic, sans-serif";
    ctx.fillStyle = "#d7eef9";
    ctx.fillText("파랑: 점유 격자 · 빨강: 기준점", 30, 63);
    ctx.fillStyle = "#fff0a8";
    ctx.fillText("노랑: 출입구 · 초록: 작업 위치", 30, 81);
    ctx.restore();
  }
}
