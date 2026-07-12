import * as THREE from "three";
import Player from "../entities/Player";
import Ball from "../entities/Ball";
import { BALL_RADIUS, GOAL_BOTTOM, GOAL_DEPTH, GOAL_TOP, PITCH, PITCH_CENTER_X, PITCH_CENTER_Y, PITCH_HEIGHT, PITCH_WIDTH, PLAYER_RADIUS } from "../config";

// Pixel-space (the existing 2D gameplay coordinates) to Three.js world-space scale.
const SCALE = 1 / 18;
const PLAYER_HEIGHT = 1.9;
const PLAYER_RADIUS_3D = (PLAYER_RADIUS * SCALE) / 1.05;
const BALL_RADIUS_3D = BALL_RADIUS * SCALE * 1.4;

const HOME_COLOR = 0x2456d6;
const HOME_GK_COLOR = 0x0e2f7a;
const AWAY_COLOR = 0xf2f2f2;
const AWAY_GK_COLOR = 0xe0a300;

function toWorld(xPx: number, yPx: number): { x: number; z: number } {
  return { x: (xPx - PITCH_CENTER_X) * SCALE, z: (yPx - PITCH_CENTER_Y) * SCALE };
}

interface PlayerRig {
  group: THREE.Group;
  body: THREE.Mesh;
  nose: THREE.Mesh;
  ring: THREE.Mesh;
}

/**
 * Renders the match on a separate Three.js canvas layered above the (now invisible) Phaser
 * canvas. Game simulation stays entirely in MatchScene/Arcade Physics - this class only reads
 * player/ball positions each frame and draws a 3D broadcast-style view of them, so none of the
 * tuned 2D gameplay logic has to change.
 */
export default class MatchRenderer3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private homeRigs: PlayerRig[] = [];
  private awayRigs: PlayerRig[] = [];
  private ballMesh!: THREE.Mesh;
  private lastBallPx: { x: number; y: number } | null = null;

  constructor(private container: HTMLElement, width: number, height: number) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = false;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.top = "0";
    this.renderer.domElement.style.left = "0";
    this.renderer.domElement.style.zIndex = "5";
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 300);
    this.setupCamera();
    this.setupLighting();
    this.buildPitch();
    this.buildGoals();
    this.buildBall();
  }

  private setupCamera() {
    // Elevated, angled "broadcast" camera set back from the halfway line so the whole pitch
    // is visible at once, rather than a top-down or a ball-following camera.
    this.camera.position.set(0, 33, 28);
    this.camera.lookAt(0, 0, -2);
  }

  private setupLighting() {
    this.scene.background = new THREE.Color(0x0a1f14);
    this.scene.fog = new THREE.Fog(0x0a1f14, 45, 95);

    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff6e0, 0.9);
    sun.position.set(-15, 30, 10);
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xbfd8ff, 0.35);
    fill.position.set(15, 20, -10);
    this.scene.add(fill);
  }

  private buildPitch() {
    const texture = this.buildPitchTexture();
    const w = PITCH_WIDTH * SCALE;
    const h = PITCH_HEIGHT * SCALE;
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0, 0);
    this.scene.add(mesh);

    // A darker apron beyond the touchlines so the pitch doesn't float in the void.
    const apronGeo = new THREE.PlaneGeometry(w + 10, h + 10);
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x0d2417, roughness: 1 });
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(0, -0.02, 0);
    this.scene.add(apron);
  }

  private buildPitchTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = Math.round((1024 * PITCH_HEIGHT) / PITCH_WIDTH);
    const ctx = canvas.getContext("2d")!;
    const sx = canvas.width / PITCH_WIDTH;
    const sy = canvas.height / PITCH_HEIGHT;

    const stripeCount = 10;
    const stripeW = canvas.width / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#1c6a37" : "#175c2f";
      ctx.fillRect(i * stripeW, 0, stripeW, canvas.height);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 70 * sx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    const boxW = 120 * sx;
    const boxH = 260 * sy;
    ctx.strokeRect(0, cy - boxH / 2, boxW, boxH);
    ctx.strokeRect(canvas.width - boxW, cy - boxH / 2, boxW, boxH);

    const smallW = 50 * sx;
    const smallH = 140 * sy;
    ctx.strokeRect(0, cy - smallH / 2, smallW, smallH);
    ctx.strokeRect(canvas.width - smallW, cy - smallH / 2, smallW, smallH);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private buildGoals() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const postRadius = 0.06;
    const goalHeight = 1.7;
    const goalHalfWidth = ((GOAL_BOTTOM - GOAL_TOP) * SCALE) / 2;
    const depth = GOAL_DEPTH * SCALE;

    [PITCH.left, PITCH.right].forEach((edgeX) => {
      const { x } = toWorld(edgeX, PITCH_CENTER_Y);
      const facing = edgeX === PITCH.left ? -1 : 1;
      const group = new THREE.Group();

      const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 10);
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(x, goalHeight / 2, -goalHalfWidth);
      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(x, goalHeight / 2, goalHalfWidth);

      const crossGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalHalfWidth * 2, 10);
      const crossbar = new THREE.Mesh(crossGeo, postMat);
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(x, goalHeight, 0);

      const backLeft = new THREE.Mesh(postGeo, postMat);
      backLeft.position.set(x + facing * depth, goalHeight / 2, -goalHalfWidth);
      const backRight = new THREE.Mesh(postGeo, postMat);
      backRight.position.set(x + facing * depth, goalHeight / 2, goalHalfWidth);
      const topBack = new THREE.Mesh(crossGeo, postMat);
      topBack.rotation.z = Math.PI / 2;
      topBack.position.set(x + facing * depth, goalHeight, 0);

      const sideGeo = new THREE.CylinderGeometry(postRadius, postRadius, depth, 8);
      const sideL = new THREE.Mesh(sideGeo, postMat);
      sideL.rotation.x = Math.PI / 2;
      sideL.position.set(x + (facing * depth) / 2, goalHeight, -goalHalfWidth);
      const sideR = new THREE.Mesh(sideGeo, postMat);
      sideR.rotation.x = Math.PI / 2;
      sideR.position.set(x + (facing * depth) / 2, goalHeight, goalHalfWidth);

      group.add(leftPost, rightPost, crossbar, backLeft, backRight, topBack, sideL, sideR);
      this.scene.add(group);
    });
  }

  private buildBall() {
    const geo = new THREE.SphereGeometry(BALL_RADIUS_3D, 16, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    this.ballMesh = new THREE.Mesh(geo, mat);
    this.ballMesh.position.set(0, BALL_RADIUS_3D, 0);
    this.scene.add(this.ballMesh);
  }

  private createPlayerRig(team: "home" | "away", isGK: boolean): PlayerRig {
    const color = team === "home" ? (isGK ? HOME_GK_COLOR : HOME_COLOR) : isGK ? AWAY_GK_COLOR : AWAY_COLOR;
    const noseColor = team === "away" && !isGK ? 0x1a1a1a : 0xffffff;

    const group = new THREE.Group();

    const bodyGeo = new THREE.CapsuleGeometry(PLAYER_RADIUS_3D, PLAYER_HEIGHT - PLAYER_RADIUS_3D * 2, 4, 10);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = PLAYER_HEIGHT / 2;
    group.add(body);

    const noseGeo = new THREE.ConeGeometry(0.16, 0.4, 8);
    const noseMat = new THREE.MeshStandardMaterial({ color: noseColor, roughness: 0.5 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.z = -Math.PI / 2;
    nose.position.set(PLAYER_RADIUS_3D + 0.16, PLAYER_HEIGHT * 0.62, 0);
    group.add(nose);

    const ringGeo = new THREE.RingGeometry(0.55, 0.72, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.visible = false;
    group.add(ring);

    this.scene.add(group);
    return { group, body, nose, ring };
  }

  createTeams(home: Player[], away: Player[]) {
    this.homeRigs.forEach((r) => this.scene.remove(r.group));
    this.awayRigs.forEach((r) => this.scene.remove(r.group));
    this.homeRigs = home.map((p) => this.createPlayerRig("home", p.role === "GK"));
    this.awayRigs = away.map((p) => this.createPlayerRig("away", p.role === "GK"));
  }

  private syncTeam(players: Player[], rigs: PlayerRig[], controlled: Player | null) {
    players.forEach((p, i) => {
      const rig = rigs[i];
      if (!rig) return;
      const { x, z } = toWorld(p.x, p.y);
      rig.group.position.set(x, 0, z);
      rig.group.rotation.y = -p.rotation;
      rig.ring.visible = p === controlled;
    });
  }

  sync(home: Player[], away: Player[], ball: Ball, controlled: Player | null) {
    this.syncTeam(home, this.homeRigs, controlled);
    this.syncTeam(away, this.awayRigs, controlled);

    const { x, z } = toWorld(ball.x, ball.y);
    this.ballMesh.position.set(x, BALL_RADIUS_3D, z);

    if (this.lastBallPx) {
      const dx = ball.x - this.lastBallPx.x;
      const dy = ball.y - this.lastBallPx.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.01) {
        const dirWorld = new THREE.Vector3(dx, 0, dy).normalize();
        const axis = new THREE.Vector3(-dirWorld.z, 0, dirWorld.x);
        const angle = (dist * SCALE) / BALL_RADIUS_3D;
        this.ballMesh.rotateOnWorldAxis(axis, angle);
      }
    }
    this.lastBallPx = { x: ball.x, y: ball.y };
  }

  resize(width: number, height: number) {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          const mat = m as THREE.MeshStandardMaterial;
          if (mat.map) mat.map.dispose();
          mat.dispose();
        });
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
