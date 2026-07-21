"use strict";

/**
 * 게임 전체의 시점과 그래픽 기준을 한곳에서 관리한다.
 * 앞으로 추가되는 건물·주민·병사는 이 규칙을 따라야 한다.
 */
const VISUAL_STYLE = Object.freeze({
  perspective: "fixed-three-quarter-top",
  worldProjection: "orthographic-top-down",
  frontDirection: "screen-bottom",
  visibleFaces: Object.freeze(["roof", "front", "right"]),
  gridSize: 40,
  anchorConvention: "bottom-center",
  characterAnchorConvention: "feet-center",
  shadowDirection: "bottom-right",
  shadowOffsetX: 8,
  shadowOffsetY: 8,
  depthAxis: "world-y",
});

const VISUAL_METADATA = Object.freeze({
  hq: Object.freeze({
    kind: "building",
    footprint: Object.freeze({ columns: 4, rows: 3 }),
    visualBounds: Object.freeze({ width: 188, height: 142 }),
    anchor: Object.freeze({ x: 0.5, y: 1 }),
    entrance: Object.freeze({ x: 0.5, y: 1, offsetY: 10 }),
    workPoints: Object.freeze([
      Object.freeze({ x: 0.28, y: 1, offsetY: 16 }),
      Object.freeze({ x: 0.72, y: 1, offsetY: 16 }),
    ]),
    sortOffsetY: 71,
  }),
  outpost: Object.freeze({
    kind: "building",
    footprint: Object.freeze({ columns: 3, rows: 3 }),
    visualBounds: Object.freeze({ width: 150, height: 139 }),
    anchor: Object.freeze({ x: 0.5, y: 1 }),
    entrance: Object.freeze({ x: 0.5, y: 1, offsetY: 8 }),
    workPoints: Object.freeze([]),
    sortOffsetY: 69.5,
  }),
  barracks: Object.freeze({
    kind: "building",
    footprint: Object.freeze({ columns: 3, rows: 2 }),
    anchor: Object.freeze({ x: 0.5, y: 1 }),
    entrance: Object.freeze({ x: 0.5, y: 1, offsetY: 8 }),
    workPoints: Object.freeze([{ x: 0.74, y: 1, offsetY: 12 }]),
  }),
  lumber_camp: Object.freeze({
    kind: "building",
    footprint: Object.freeze({ columns: 2, rows: 2 }),
    anchor: Object.freeze({ x: 0.5, y: 1 }),
    entrance: Object.freeze({ x: 0.5, y: 1, offsetY: 10 }),
    workPoints: Object.freeze([
      Object.freeze({ x: 0.34, y: 1, offsetY: 14 }),
      Object.freeze({ x: 0.76, y: 1, offsetY: 14 }),
    ]),
  }),
  construction_workshop: Object.freeze({
    kind: "building",
    footprint: Object.freeze({ columns: 3, rows: 2 }),
    anchor: Object.freeze({ x: 0.5, y: 1 }),
    entrance: Object.freeze({ x: 0.5, y: 1, offsetY: 10 }),
    workPoints: Object.freeze([
      Object.freeze({ x: 0.25, y: 1, offsetY: 13 }),
      Object.freeze({ x: 0.75, y: 1, offsetY: 13 }),
    ]),
  }),
  training_center: Object.freeze({
    kind: "building",
    footprint: Object.freeze({ columns: 3, rows: 2 }),
    anchor: Object.freeze({ x: 0.5, y: 1 }),
    entrance: Object.freeze({ x: 0.5, y: 1, offsetY: 10 }),
    workPoints: Object.freeze([
      Object.freeze({ x: 0.24, y: 1, offsetY: 18 }),
      Object.freeze({ x: 0.76, y: 1, offsetY: 18 }),
    ]),
  }),
  resident: Object.freeze({
    kind: "character",
    visualBounds: Object.freeze({ width: 18, height: 25 }),
    anchor: Object.freeze({ x: 0.5, y: 1 }),
    sortOffsetY: 8,
  }),
  lumber_worker: Object.freeze({
    kind: "character",
    visualBounds: Object.freeze({ width: 20, height: 27 }),
    anchor: Object.freeze({ x: 0.5, y: 1 }),
    sortOffsetY: 8,
  }),
  construction_worker: Object.freeze({
    kind: "character",
    visualBounds: Object.freeze({ width: 20, height: 27 }),
    anchor: Object.freeze({ x: 0.5, y: 1 }),
    sortOffsetY: 8,
  }),
  trainee: Object.freeze({
    kind: "character",
    visualBounds: Object.freeze({ width: 20, height: 27 }),
    anchor: Object.freeze({ x: 0.5, y: 1 }),
    sortOffsetY: 8,
  }),
  rifleman: Object.freeze({
    kind: "character",
    visualBounds: Object.freeze({ width: 40, height: 41 }),
    anchor: Object.freeze({ x: 0.5, y: 1 }),
    sortOffsetY: 12,
  }),
});

function getVisualMetadata(key) {
  return VISUAL_METADATA[key] || null;
}
