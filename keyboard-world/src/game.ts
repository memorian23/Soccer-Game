import * as THREE from "three";
import type { KeyDef, LevelDef } from "./levels";
import { Footprints, Trail, type TrailStyle } from "./effects";
import { BASE_MOVE } from "./speed";

const KEY_THICK = 1;
const PLAYER_R = 0.35;
const PLAYER_H = 1.8;
const GRAVITY = 28;
const JUMP_VEL = 10;
const FALL_LIMIT = -14;

interface KeyBody {
  def: KeyDef;
  mesh: THREE.Mesh;
  base: THREE.Vector3; // 윗면 중심 (기본 위치)
  pos: THREE.Vector3; // 윗면 중심 (현재 위치)
  delta: THREE.Vector3;
  w: number;
  d: number;
  activated: boolean;
}

const textureCache = new Map<string, THREE.CanvasTexture>();

function labelTexture(label: string, w: number, d: number, bg: string, fg: string): THREE.CanvasTexture {
  const id = `${label}|${w}|${d}|${bg}|${fg}`;
  const cached = textureCache.get(id);
  if (cached) return cached;
  const cw = Math.min(1024, Math.round(128 * w));
  const ch = Math.min(1024, Math.round(128 * d));
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, cw, ch);
  // 키캡 안쪽 오목한 느낌
  const inset = Math.min(cw, ch) * 0.08;
  const grad = g.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0.12)");
  g.fillStyle = grad;
  g.beginPath();
  g.roundRect(inset, inset, cw - inset * 2, ch - inset * 2, inset * 1.5);
  g.fill();
  g.fillStyle = fg;
  const size = Math.min(ch * 0.5, (cw * 0.8) / Math.max(1, label.length * 0.62));
  g.font = `bold ${size}px "Segoe UI", "Malgun Gothic", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label, cw / 2, ch / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textureCache.set(id, tex);
  return tex;
}

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private sun: THREE.DirectionalLight;
  private levelGroup = new THREE.Group();
  private keys: KeyBody[] = [];
  private trophy: THREE.Object3D | null = null;

  private player = new THREE.Group();
  private model = new THREE.Group();
  private pos = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private grounded = false;
  private groundKey: KeyBody | null = null;
  private coyote = 0;
  private jumpBuffer = 0;
  private facing = 0;
  private respawnPoint = new THREE.Vector3();
  private time = 0;
  private moveSpeed = BASE_MOVE;

  private yaw = 0;
  private pitch = 0.38;
  private camDist = 9;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };

  private input = new Set<string>();
  private footprints: Footprints;
  private trail: Trail;
  private footprintsOn = false;
  private trailStyle: TrailStyle | null = null;

  paused = true;
  private finished = false;
  deaths = 0;
  onWin?: () => void;
  onDeath?: (deaths: number) => void;
  onCheckpoint?: () => void;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x1c1238);
    this.scene.fog = new THREE.Fog(0x1c1238, 40, 150);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);

    this.scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x3a2050, 1.1));
    this.sun = new THREE.DirectionalLight(0xffffff, 1.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -25;
    sc.right = sc.top = 25;
    sc.near = 1;
    sc.far = 80;
    this.scene.add(this.sun, this.sun.target);

    this.buildBackgroundKeyboard();
    this.buildPlayer();
    this.scene.add(this.levelGroup);

    this.footprints = new Footprints(this.scene);
    this.trail = new Trail(this.scene);

    this.bindInput();
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ---------- 세계 만들기 ----------

  /** 저 아래 깔려 있는 거대한 키보드 (떨어지면 리셋) */
  private buildBackgroundKeyboard(): void {
    const cols = 22;
    const rows = 14;
    const size = 7;
    const geo = new THREE.BoxGeometry(size * 0.86, 2, size * 0.86);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.6 });
    const inst = new THREE.InstancedMesh(geo, mat, cols * rows);
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - cols / 2) * size + (r % 2) * size * 0.3;
        const z = 30 - r * size;
        m.makeTranslation(x, -32 + Math.sin(c * 1.3 + r) * 0.6, z);
        inst.setMatrixAt(i, m);
        color.setHSL(0.72 + ((c + r) % 5) * 0.03, 0.45, 0.18 + ((c * 7 + r * 3) % 4) * 0.04);
        inst.setColorAt(i, color);
        i++;
      }
    }
    this.scene.add(inst);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(cols * size + 10, 2, rows * size + 10),
      new THREE.MeshStandardMaterial({ color: 0x0d0a1a }),
    );
    base.position.set(-size / 2, -34, 30 - (rows * size) / 2 + size / 2);
    this.scene.add(base);
  }

  private buildPlayer(): void {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x4a6cff, roughness: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x111122 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.6, 6, 14), accent);
    body.position.y = 0.66;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), bodyMat);
    head.position.y = 1.45;
    const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, dark);
    const eyeR = new THREE.Mesh(eyeGeo, dark);
    eyeL.position.set(-0.11, 1.5, -0.28);
    eyeR.position.set(0.11, 1.5, -0.28);
    // 머리 위 작은 키캡 모자
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.42), new THREE.MeshStandardMaterial({ color: 0xffd04a }));
    cap.position.y = 1.8;

    for (const part of [body, head, cap]) part.castShadow = true;
    this.model.add(body, head, eyeL, eyeR, cap);
    this.player.add(this.model);
    this.scene.add(this.player);
  }

  loadLevel(def: LevelDef): void {
    for (const k of this.keys) {
      (k.mesh.geometry as THREE.BufferGeometry).dispose();
    }
    this.levelGroup.clear();
    this.keys = [];
    this.trophy = null;

    for (const kd of def.keys) {
      const w = kd.w ?? 2;
      const d = kd.d ?? 2;
      const type = kd.type ?? "normal";
      const colors: Record<string, [string, string]> = {
        start: ["#9aa0b5", "#1b1d2a"],
        normal: [def.color, "#1b1d2a"],
        checkpoint: ["#ffd84a", "#4a3300"],
        goal: ["#46e07a", "#063015"],
      };
      const [bg, fg] = colors[type];
      const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(bg).multiplyScalar(0.7), roughness: 0.55 });
      const top = new THREE.MeshStandardMaterial({ map: labelTexture(kd.label, w, d, bg, fg), roughness: 0.45 });
      if (type === "goal") {
        top.emissive = new THREE.Color(0x1f8040);
        side.emissive = new THREE.Color(0x0f4020);
      }
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, KEY_THICK, d), [side, side, top, side, side, side]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const base = new THREE.Vector3(kd.x, kd.y ?? 0, kd.z);
      mesh.position.set(base.x, base.y - KEY_THICK / 2, base.z);
      this.levelGroup.add(mesh);
      this.keys.push({ def: kd, mesh, base, pos: base.clone(), delta: new THREE.Vector3(), w, d, activated: false });

      if (type === "goal") {
        const trophy = new THREE.Group();
        const gold = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 0.7, roughness: 0.25, emissive: 0x553300 });
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.25, 0.8, 20), gold);
        cup.position.y = 0.9;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 10), gold);
        stem.position.y = 0.3;
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 16), gold);
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 16), gold);
        handle.position.y = 0.95;
        handle.rotation.y = Math.PI / 2;
        trophy.add(cup, stem, foot, handle);
        trophy.position.set(base.x, base.y + 2.2, base.z);
        this.levelGroup.add(trophy);
        this.trophy = trophy;
      }
    }

    const startKey = this.keys.find((k) => k.def.type === "start") ?? this.keys[0];
    this.respawnPoint.copy(startKey.base);
    this.deaths = 0;
    this.time = 0;
    this.finished = false;
    this.yaw = 0;
    this.respawn();
  }

  private respawn(): void {
    this.pos.copy(this.respawnPoint);
    this.vel.set(0, 0, 0);
    this.grounded = false;
    this.groundKey = null;
    this.facing = 0;
    this.footprints.clear();
    this.trail.clear();
  }

  restart(): void {
    const startKey = this.keys.find((k) => k.def.type === "start") ?? this.keys[0];
    this.respawnPoint.copy(startKey.base);
    this.keys.forEach((k) => (k.activated = false));
    this.deaths = 0;
    this.finished = false;
    this.respawn();
  }

  setMoveSpeed(s: number): void {
    this.moveSpeed = s;
  }

  setCosmetics(footprints: boolean, trail: TrailStyle | null): void {
    this.footprintsOn = footprints;
    this.trailStyle = trail;
    if (!footprints) this.footprints.clear();
    if (!trail) this.trail.clear();
  }

  // ---------- 입력 ----------

  private bindInput(): void {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    };
    window.addEventListener("keydown", (e) => {
      if (isTyping(e)) return;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      this.input.add(e.code);
      if (e.code === "Space" && !e.repeat) this.jumpBuffer = 0.15;
    });
    window.addEventListener("keyup", (e) => this.input.delete(e.code));
    window.addEventListener("blur", () => this.input.clear());

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
      (document.activeElement as HTMLElement | null)?.blur?.();
    });
    el.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      this.yaw -= (e.clientX - this.lastPointer.x) * 0.006;
      this.pitch = THREE.MathUtils.clamp(this.pitch + (e.clientY - this.lastPointer.y) * 0.005, -0.15, 1.3);
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener("pointerup", () => (this.dragging = false));
    el.addEventListener("pointercancel", () => (this.dragging = false));
    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.01, 4, 22);
      },
      { passive: false },
    );
  }

  /** 화면 터치 버튼 등에서 사용 */
  setVirtualKey(code: string, down: boolean): void {
    if (down) {
      this.input.add(code);
      if (code === "Space") this.jumpBuffer = 0.15;
    } else this.input.delete(code);
  }

  // ---------- 업데이트 ----------

  private update(dt: number): void {
    this.time += dt;
    if (this.trophy) {
      this.trophy.rotation.y += dt * 1.5;
      this.trophy.position.y = this.keys.find((k) => k.def.type === "goal")!.pos.y + 2.2 + Math.sin(this.time * 2) * 0.2;
    }

    // 움직이는 키
    for (const k of this.keys) {
      const mv = k.def.move;
      if (!mv) continue;
      const prev = k.pos.clone();
      k.pos.copy(k.base);
      k.pos[mv.axis] += Math.sin(this.time * mv.speed + (mv.phase ?? 0)) * mv.amp;
      k.delta.subVectors(k.pos, prev);
      k.mesh.position.set(k.pos.x, k.pos.y - KEY_THICK / 2, k.pos.z);
    }

    if (!this.paused && !this.finished) this.simulate(dt);
    this.player.position.copy(this.pos);
    this.player.rotation.y = this.facing;

    this.footprints.update(dt);
    this.trail.update(dt);
    this.updateCamera();
  }

  private simulate(dt: number): void {
    // 서 있는 키가 움직이면 같이 이동
    if (this.grounded && this.groundKey) this.pos.add(this.groundKey.delta);

    const inp = this.input;
    const f = (inp.has("KeyW") || inp.has("ArrowUp") ? 1 : 0) - (inp.has("KeyS") || inp.has("ArrowDown") ? 1 : 0);
    const r = (inp.has("KeyD") || inp.has("ArrowRight") ? 1 : 0) - (inp.has("KeyA") || inp.has("ArrowLeft") ? 1 : 0);
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    let dx = fx * f + rx * r;
    let dz = fz * f + rz * r;
    const len = Math.hypot(dx, dz);
    const moving = len > 0.01;
    if (moving) {
      dx /= len;
      dz /= len;
      const target = Math.atan2(-dx, -dz);
      let diff = target - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += diff * Math.min(1, dt * 14);
    }
    this.vel.x = moving ? dx * this.moveSpeed : 0;
    this.vel.z = moving ? dz * this.moveSpeed : 0;

    this.coyote = this.grounded ? 0.1 : this.coyote - dt;
    this.jumpBuffer -= dt;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vel.y = JUMP_VEL;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.grounded = false;
      this.groundKey = null;
    }
    this.vel.y = Math.max(-45, this.vel.y - GRAVITY * dt);

    // 빠른 속도에서도 키를 통과하지 않도록 잘게 나눠서 계산
    const before = this.pos.clone();
    const travel = Math.max(Math.hypot(this.vel.x, this.vel.z), Math.abs(this.vel.y)) * dt;
    const steps = Math.min(300, Math.max(1, Math.ceil(travel / 0.2)));
    for (let i = 0; i < steps; i++) this.step(dt / steps);
    if (!this.grounded) this.groundKey = null;

    // 효과
    if (moving) {
      const moved = Math.hypot(this.pos.x - before.x, this.pos.z - before.z);
      if (this.footprintsOn && this.grounded) this.footprints.track(moved, this.pos.x, this.pos.y, this.pos.z, this.facing);
      if (this.trailStyle) {
        const bx = this.pos.x + Math.sin(this.facing) * 0.45;
        const bz = this.pos.z + Math.cos(this.facing) * 0.45;
        this.trail.emit(dt, this.trailStyle, bx, this.pos.y + 0.75, bz);
      }
    } else this.trail.resetTimer();

    // 체크포인트 / 골
    const gk = this.groundKey;
    if (this.grounded && gk) {
      if (gk.def.type === "checkpoint" && !gk.activated) {
        gk.activated = true;
        this.respawnPoint.copy(gk.base);
        const top = (gk.mesh.material as THREE.MeshStandardMaterial[])[2];
        top.emissive = new THREE.Color(0x665500);
        this.onCheckpoint?.();
      }
      if (gk.def.type === "goal") {
        this.finished = true;
        this.onWin?.();
      }
    }

    if (this.pos.y < FALL_LIMIT) {
      this.deaths++;
      this.onDeath?.(this.deaths);
      this.respawn();
    }

    // 캐릭터 모습
    const bob = moving && this.grounded ? Math.abs(Math.sin(this.time * (8 + this.moveSpeed * 0.3))) * 0.12 : 0;
    this.model.position.y = bob;
    this.model.rotation.x = moving ? -Math.min(0.45, this.moveSpeed * 0.008) : 0;
    const squash = this.grounded ? 1 : 1.06;
    this.model.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
  }

  private step(sdt: number): void {
    // 수평 이동 + 키 옆면 충돌
    this.pos.x += this.vel.x * sdt;
    this.pos.z += this.vel.z * sdt;
    for (const k of this.keys) {
      const top = k.pos.y;
      const bottom = top - KEY_THICK;
      if (this.pos.y >= top - 0.05 || this.pos.y + PLAYER_H <= bottom) continue;
      const hx = k.w / 2 + PLAYER_R;
      const hz = k.d / 2 + PLAYER_R;
      const ox = this.pos.x - k.pos.x;
      const oz = this.pos.z - k.pos.z;
      if (Math.abs(ox) >= hx || Math.abs(oz) >= hz) continue;
      // 살짝 낮은 턱은 자동으로 올라감
      if (top - this.pos.y < 0.3) {
        this.pos.y = top;
        if (this.vel.y < 0) this.vel.y = 0;
        continue;
      }
      const px = hx - Math.abs(ox);
      const pz = hz - Math.abs(oz);
      if (px < pz) this.pos.x += (ox >= 0 ? 1 : -1) * px;
      else this.pos.z += (oz >= 0 ? 1 : -1) * pz;
    }

    // 수직 이동 + 착지/머리 충돌
    const prevY = this.pos.y;
    this.pos.y += this.vel.y * sdt;
    this.grounded = false;
    for (const k of this.keys) {
      const ox = Math.abs(this.pos.x - k.pos.x);
      const oz = Math.abs(this.pos.z - k.pos.z);
      if (ox >= k.w / 2 + PLAYER_R * 0.6 || oz >= k.d / 2 + PLAYER_R * 0.6) continue;
      const top = k.pos.y;
      const bottom = top - KEY_THICK;
      if (this.vel.y <= 0 && prevY >= top - 0.02 && this.pos.y <= top) {
        this.pos.y = top;
        this.vel.y = 0;
        this.grounded = true;
        this.groundKey = k;
      } else if (this.vel.y > 0 && prevY + PLAYER_H <= bottom + 0.02 && this.pos.y + PLAYER_H > bottom) {
        this.pos.y = bottom - PLAYER_H;
        this.vel.y = 0;
      }
    }
  }

  private updateCamera(): void {
    const target = new THREE.Vector3(this.pos.x, this.pos.y + 1.2, this.pos.z);
    const cp = Math.cos(this.pitch);
    this.camera.position.set(
      target.x + Math.sin(this.yaw) * cp * this.camDist,
      target.y + Math.sin(this.pitch) * this.camDist,
      target.z + Math.cos(this.yaw) * cp * this.camDist,
    );
    this.camera.lookAt(target);
    this.sun.position.set(this.pos.x + 12, this.pos.y + 25, this.pos.z + 8);
    this.sun.target.position.copy(this.pos);
  }
}
