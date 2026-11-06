import * as THREE from "three";

/** 땅에 남는 발자국 */
export class Footprints {
  private meshes: THREE.Mesh[] = [];
  private life: number[] = [];
  private next = 0;
  private dist = 0;
  private side = 1;
  private readonly LIFE = 3.5;

  constructor(scene: THREE.Scene, count = 90) {
    const geo = new THREE.CircleGeometry(1, 14);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x1b1030,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(0.13, 0.24, 1);
      m.visible = false;
      scene.add(m);
      this.meshes.push(m);
      this.life.push(0);
    }
  }

  /** 걸어간 거리만큼 발자국을 찍는다 */
  track(moved: number, x: number, y: number, z: number, facing: number): void {
    this.dist += moved;
    if (this.dist < 0.7) return;
    this.dist = 0;
    this.side *= -1;
    const rx = Math.cos(facing) * 0.17 * this.side;
    const rz = -Math.sin(facing) * 0.17 * this.side;
    const m = this.meshes[this.next];
    m.position.set(x + rx, y + 0.02, z + rz);
    m.rotation.set(-Math.PI / 2, 0, facing);
    m.visible = true;
    this.life[this.next] = this.LIFE;
    this.next = (this.next + 1) % this.meshes.length;
  }

  update(dt: number): void {
    for (let i = 0; i < this.meshes.length; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const m = this.meshes[i];
      if (this.life[i] <= 0) m.visible = false;
      else (m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, this.life[i] / 1.2) * 0.75;
    }
  }

  clear(): void {
    this.life.fill(0);
    this.meshes.forEach((m) => (m.visible = false));
  }
}

export type TrailStyle = "rainbow" | "fire" | "star";

/** 앞으로 가면 뒤에 따라 나오는 꼬리 */
export class Trail {
  private meshes: THREE.Mesh[] = [];
  private life: number[] = [];
  private vel: THREE.Vector3[] = [];
  private next = 0;
  private timer = 0;
  private hue = 0;
  private readonly LIFE = 0.8;

  constructor(scene: THREE.Scene, count = 120) {
    const sphere = new THREE.SphereGeometry(0.22, 10, 8);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const m = new THREE.Mesh(sphere, mat);
      m.visible = false;
      scene.add(m);
      this.meshes.push(m);
      this.life.push(0);
      this.vel.push(new THREE.Vector3());
    }
  }

  emit(dt: number, style: TrailStyle, x: number, y: number, z: number): void {
    this.timer -= dt;
    while (this.timer <= 0) {
      this.timer += 0.02;
      const i = this.next;
      this.next = (this.next + 1) % this.meshes.length;
      const m = this.meshes[i];
      const mat = m.material as THREE.MeshBasicMaterial;
      m.visible = true;
      m.position.set(x + (Math.random() - 0.5) * 0.15, y + (Math.random() - 0.5) * 0.15, z + (Math.random() - 0.5) * 0.15);
      this.life[i] = this.LIFE;
      this.vel[i].set(0, 0, 0);
      if (style === "rainbow") {
        this.hue = (this.hue + 0.012) % 1;
        mat.color.setHSL(this.hue, 1, 0.6);
      } else if (style === "fire") {
        mat.color.setHSL(0.02 + Math.random() * 0.12, 1, 0.55);
        this.vel[i].set(0, 1.2 + Math.random(), 0);
      } else {
        mat.color.setHSL(0.13 + Math.random() * 0.5, 0.6, 0.85);
        this.vel[i].set((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5);
      }
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.meshes.length; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const m = this.meshes[i];
      if (this.life[i] <= 0) {
        m.visible = false;
        continue;
      }
      const t = this.life[i] / this.LIFE;
      m.position.addScaledVector(this.vel[i], dt);
      m.scale.setScalar(0.3 + t * 0.9);
      (m.material as THREE.MeshBasicMaterial).opacity = t * 0.9;
    }
  }

  resetTimer(): void {
    this.timer = 0;
  }

  clear(): void {
    this.life.fill(0);
    this.meshes.forEach((m) => (m.visible = false));
  }
}
