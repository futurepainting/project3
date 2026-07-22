"use strict";

/**
 * 게임에서 사용하는 이미지 자산을 한곳에서 관리한다.
 * 이미지 로딩이 끝나기 전이나 파일이 누락된 경우 각 Entity는 기존 도형 렌더를 사용한다.
 */
const GAME_ASSET_PATHS = {
  // 아군 병사의 5방향 원본. 서쪽 계열은 Soldier에서 좌우 반전하여 8방향으로 사용한다.
  ALLY_SOLDIER_N: "assets/111.png",
  ALLY_SOLDIER_NE: "assets/222.png",
  ALLY_SOLDIER_E: "assets/333.png",
  ALLY_SOLDIER_SE: "assets/444.png",
  ALLY_SOLDIER_S: "assets/555.png",

  // 방향 이미지 로딩 실패 시 사용하는 기존 단일 스프라이트 fallback.
  ALLY_SOLDIER: "assets/ally_soldier.png",
  ENEMY_SOLDIER: "assets/enemy_soldier.png",
  // 현재 본부와 아군 전초기지 그림이 완전히 같아 동일 파일을 공유한다.
  // 전초기지 전용 이미지가 생기면 ALLY_OUTPOST 경로만 교체하면 된다.
  ALLY_HQ: "assets/ally_hq.png",
  ALLY_OUTPOST: "assets/ally_hq.png",
};

const GameAssets = {
  images: {},
  sourceImages: new Map(),

  load(key, src) {
    const cached = this.sourceImages.get(src);
    if (cached) {
      this.images[key] = cached;
      return cached;
    }

    const image = new Image();
    image.decoding = "async";
    image.loaded = false;
    image.failed = false;

    image.addEventListener("load", () => {
      image.loaded = true;
    }, { once: true });

    image.addEventListener("error", () => {
      image.failed = true;
      console.warn(`이미지 자산을 불러오지 못했습니다: ${src}`);
    }, { once: true });

    image.src = src;
    this.sourceImages.set(src, image);
    this.images[key] = image;
    return image;
  },

  get(key) {
    const image = this.images[key];
    return image && image.loaded && !image.failed ? image : null;
  },
};

for (const [key, path] of Object.entries(GAME_ASSET_PATHS)) {
  GameAssets.load(key, path);
}
