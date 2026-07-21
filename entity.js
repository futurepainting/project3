"use strict";

/**
 * 모든 게임 오브젝트의 최상위 부모 클래스.
 * 이후 병사, 기지, 그리고 앞으로 추가될 다른 엔티티들이 이 클래스를 상속한다.
 * update / render 를 분리하여 로직과 표현을 독립적으로 확장할 수 있게 한다.
 */
class Entity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.visualMeta = null;

    // 이 엔티티가 다음 프레임에도 살아있어야 하는지 여부.
    // 지금 단계에서는 항상 true 이며, 추후 제거 로직에서 사용될 예정.
    this.isActive = true;
  }

  /**
   * 매 프레임 상태를 갱신한다. 하위 클래스에서 오버라이드한다.
   * @param {number} deltaTime - 이전 프레임과의 시간 차이(초)
   */
  update(deltaTime) {
    // 기본 Entity는 별도 동작이 없다.
  }

  /**
   * 매 프레임 화면에 그린다. 하위 클래스에서 오버라이드한다.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    // 기본 Entity는 그릴 것이 없다.
  }
}
