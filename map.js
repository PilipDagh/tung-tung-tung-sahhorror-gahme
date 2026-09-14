/* =========================================================================
   MAP.JS - COMPLETE 5-TIER MANOR (LEVELS -2 TO 2), SECRET WALL PASSAGES,
   5 ITEM PRESETS, 3D LOBBY, KNOCKABLE PROPS & GITHUB PAINTING LOADER
   ========================================================================= */

// --- TIER ELEVATION DATUM ---
const LEVEL_ELEVATIONS = {
  LEVEL_MINUS_2: -12.0, // Sub-Basement (Garage, Sewers, Spider Cellar)
  LEVEL_MINUS_1: -6.0,  // Main Basement (Hall, Wall Safe, Sauna, Secret Tunnel)
  LEVEL_0: 0.0,         // Ground Floor (Foyer, Kitchen, Dining, Study, Backyard)
  LEVEL_1: 5.0,         // Second Floor (Bedrooms 1-3, Bath, Crow/Meat Room)
  LEVEL_2: 10.0,        // Third Floor / Attic (Jail, Special Room, Nursery, Rafters)
  LOBBY: 30.0           // Isolated 3D Waiting Room
};

const GITHUB_PAINTING_CONFIG = {
  BASE_URL: 'https://raw.githubusercontent.com/PilipDagh/tung-tung-tung-sahhorror-gahme/main/assets/paintings/',
  COUNT: 15,
  TIMEOUT: 3500
};

// --- DYNAMIC PROCEDURAL & ASSET TEXTURE REPOSITORY ---
const Assets = {
  woodMat: null,
  wallMat: null,
  ceilingMat: null,
  concreteMat: null,
  metalMat: null,
  skinMat: null,
  bloodMat: null,
  blanketMat: null,
  frameMat: null,
  posterMat: null,
  elephantMat: null,
  screenMat: null,
  sewerWaterMat: null,

  init() {
    const makeWoodTexture = () => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 512;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#6e4b30'; ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#4a301c';
      for (let i = 0; i < 48; i++) {
        ctx.lineWidth = 1.5 + Math.random() * 2.5;
        ctx.beginPath();
        const y = Math.random() * 512;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(160, y + (Math.random() - 0.5) * 25, 340, y + (Math.random() - 0.5) * 25, 512, y);
        ctx.stroke();
      }
      for (let x = 0; x < 512; x += 128) {
        ctx.fillStyle = '#3a2414'; ctx.fillRect(x, 0, 4, 512);
      }
      return new THREE.CanvasTexture(c);
    };

    const makeWallpaperTexture = () => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 512;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#7a755d'; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#5c5744';
      for (let x = 0; x < 512; x += 48) {
        for (let y = 0; y < 512; y += 48) {
          ctx.beginPath(); ctx.arc(x + 24, y + 24, 7, 0, Math.PI * 2); ctx.fill();
        }
      }
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = `rgba(40, 36, 25, ${Math.random() * 0.22})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 4, 4);
      }
      return new THREE.CanvasTexture(c);
    };

    const makePosterTexture = () => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 320;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#181818'; ctx.fillRect(0, 0, 256, 320);
      ctx.fillStyle = '#8a0303'; ctx.fillRect(12, 12, 232, 296);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
      ctx.fillText('TUNG TUNG TUNG', 128, 52);
      ctx.fillText('SAHUR!', 128, 84);
      ctx.fillStyle = '#4a2815'; ctx.fillRect(68, 115, 120, 130);
      ctx.fillStyle = '#ff3333'; ctx.font = 'bold 16px monospace';
      ctx.fillText('WAKE UP!', 128, 280);
      return new THREE.CanvasTexture(c);
    };

    this.woodMat = new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.75 });
    this.wallMat = new THREE.MeshStandardMaterial({ map: makeWallpaperTexture(), roughness: 0.85 });
    this.ceilingMat = new THREE.MeshStandardMaterial({ color: 0x8a8475, roughness: 0.9 });
    this.concreteMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
    this.metalMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.75, roughness: 0.3 });
    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xd8b28a, roughness: 0.75 });
    this.bloodMat = new THREE.MeshStandardMaterial({ color: 0x880505, roughness: 0.5 });
    this.blanketMat = new THREE.MeshStandardMaterial({ color: 0x7a2222, roughness: 0.85 });
    this.frameMat = new THREE.MeshStandardMaterial({ color: 0x3d2719, roughness: 0.75 });
    this.posterMat = new THREE.MeshStandardMaterial({ map: makePosterTexture(), roughness: 0.5 });
    this.elephantMat = new THREE.MeshStandardMaterial({ color: 0x6e6e78, roughness: 0.8 });
    this.screenMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa });
    this.sewerWaterMat = new THREE.MeshStandardMaterial({ color: 0x1a2e1a, roughness: 0.1, metalness: 0.8 });
  }
};
Assets.init();

// --- COLLISION WORLD REGISTRY ---
const CollisionWorld = {
  boxes: [],
  wallsAndDoors: [],

  addBox(minX, minY, minZ, maxX, maxY, maxZ, isWall = false) {
    const box = new THREE.Box3(
      new THREE.Vector3(Math.min(minX, maxX), Math.min(minY, maxY), Math.min(minZ, maxZ)),
      new THREE.Vector3(Math.max(minX, maxX), Math.max(minY, maxY), Math.max(minZ, maxZ))
    );
    this.boxes.push(box);
    if (isWall) {
      this.wallsAndDoors.push(box);
    }
    return box;
  },

  removeBox(box) {
    const idx = this.boxes.indexOf(box);
    if (idx !== -1) this.boxes.splice(idx, 1);
    const wIdx = this.wallsAndDoors.indexOf(box);
    if (wIdx !== -1) this.wallsAndDoors.splice(wIdx, 1);
  }
};

// --- DYNAMIC GITHUB PAINTING ASSET LOADER ---
class DynamicPaintingLoader {
  constructor() {
    this.baseUrl = GITHUB_PAINTING_CONFIG.BASE_URL;
    this.cache = new Map();
    this.loader = new THREE.TextureLoader();
    this.fallback = this.createFallback();
  }

  createFallback() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2d241e'; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#4a3825'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, 498, 498);
    ctx.fillStyle = '#140e0a';
    ctx.beginPath(); ctx.arc(256, 210, 75, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(256, 380, 110, 90, 0, 0, Math.PI * 2); ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  async loadTexture(index) {
    const name = `painting_${String(index).padStart(2, '0')}.png`;
    const url = `${this.baseUrl}${name}`;
    if (this.cache.has(url)) return this.cache.get(url);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(this.fallback), GITHUB_PAINTING_CONFIG.TIMEOUT);
      this.loader.load(
        url,
        (tex) => {
          clearTimeout(timeout);
          this.cache.set(url, tex);
          resolve(tex);
        },
        undefined,
        () => {
          clearTimeout(timeout);
          resolve(this.fallback);
        }
      );
    });
  }

  assignTextures(frames) {
    const pool = Array.from({ length: GITHUB_PAINTING_CONFIG.COUNT }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    frames.forEach((frameMesh, idx) => {
      const texIndex = pool[idx % pool.length];
      this.loadTexture(texIndex).then((tex) => {
        if (frameMesh && frameMesh.material) {
          frameMesh.material.map = tex;
          frameMesh.material.needsUpdate = true;
        }
      });
    });
  }
}

// --- MASTER HOUSE & 5-TIER ENVIRONMENT ARCHITECT ---
const House = {
  interactables: [],
  hidingSpots: [],
  doors: [],
  drawers: [],
  dynamicProps: [],
  physicsItems: [],
  paintings: [],
  paintingFrames: [],
  paintingLoader: new DynamicPaintingLoader(),
  secretPassages: [],
  locks: {
    planks: 2,
    padlock: true,
    keycard: true,
    master: true,
    carPlug: false,
    carBattery: false,
    carGas: false,
    carKey: false
  },

  build(scene) {
    const makeSolidBox = (w, h, d, x, y, z, mat, isWall = false) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      scene.add(mesh);
      CollisionWorld.addBox(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2, isWall);
      return mesh;
    };

    // =========================================================================
    // 1. ISOLATED 3D MULTIPLAYER LOBBY ROOM (X: 60, Y: 30, Z: 0)
    // =========================================================================
    const lY = LEVEL_ELEVATIONS.LOBBY;
    makeSolidBox(16, 0.4, 16, 60.0, lY - 0.2, 0.0, Assets.concreteMat);
    makeSolidBox(16, 0.4, 16, 60.0, lY + 5.0, 0.0, Assets.ceilingMat);
    makeSolidBox(16, 5.0, 0.4, 60.0, lY + 2.5, -8.0, Assets.wallMat, true);
    makeSolidBox(16, 5.0, 0.4, 60.0, lY + 2.5, 8.0, Assets.wallMat, true);
    makeSolidBox(0.4, 5.0, 16, 52.0, lY + 2.5, 0.0, Assets.wallMat, true);
    makeSolidBox(0.4, 5.0, 16, 68.0, lY + 2.5, 0.0, Assets.wallMat, true);

    const post1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.05), Assets.posterMat);
    post1.position.set(57.5, lY + 2.6, -7.75); scene.add(post1);
    const post2 = post1.clone();
    post2.position.set(62.5, lY + 2.6, -7.75); scene.add(post2);

    this.buildLobbyElephant(scene, 60.0, lY, 0.0);
    this.buildLobbyWardrobe(scene, 53.2, lY, -5.0);
    this.buildHostLaptopTable(scene, 66.8, lY, 2.0);

    // =========================================================================
    // 2. LEVEL -2: SUB-BASEMENT (GARAGE, SEWERS, SPIDER CELLAR) [Y = -12.0]
    // =========================================================================
    const yMinus2 = LEVEL_ELEVATIONS.LEVEL_MINUS_2;
    makeSolidBox(44, 0.4, 44, 0.0, yMinus2 - 0.2, 0.0, Assets.concreteMat);

    // Garage Room (Car Escape Zone)
    makeSolidBox(18, 5.6, 0.5, -10.0, yMinus2 + 2.8, -12.0, Assets.concreteMat, true);
    makeSolidBox(0.5, 5.6, 16, -19.0, yMinus2 + 2.8, -4.0, Assets.concreteMat, true);
    makeSolidBox(18, 5.6, 0.5, -10.0, yMinus2 + 2.8, 4.0, Assets.concreteMat, true);

    // Garage Exit Door (Rammed by car)
    const garageGate = makeSolidBox(0.5, 4.6, 6.0, -19.0, yMinus2 + 2.3, -4.0, Assets.metalMat, true);

    // Escape Car Body
    this.buildEscapeCar(scene, -11.0, yMinus2, -4.0);

    // Ramp connecting Level -2 up to Level -1
    this.buildRamp(scene, [-2.0, yMinus2 + 3.0, -4.0], 4.0, 14.0, 6.0, 0);

    // Spider Cellar
    makeSolidBox(16, 5.6, 0.5, 10.0, yMinus2 + 2.8, -12.0, Assets.concreteMat, true);
    makeSolidBox(0.5, 5.6, 18, 18.0, yMinus2 + 2.8, -3.0, Assets.concreteMat, true);
    makeSolidBox(16, 5.6, 0.5, 10.0, yMinus2 + 2.8, 6.0, Assets.concreteMat, true);

    // Spider Platform & Meat Feeding Bowl
    makeSolidBox(6, 1.4, 6, 12.0, yMinus2 + 0.7, -4.0, Assets.woodMat);
    const spiderBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.2, 12), Assets.metalMat);
    spiderBowl.position.set(12.0, yMinus2 + 1.5, -4.0);
    scene.add(spiderBowl);

    // Sewers & Sewer Cell (Deepest trench)
    makeSolidBox(28, 5.6, 0.5, 0.0, yMinus2 + 2.8, 18.0, Assets.concreteMat, true);
    makeSolidBox(0.5, 5.6, 12, -14.0, yMinus2 + 2.8, 12.0, Assets.concreteMat, true);
    makeSolidBox(0.5, 5.6, 12, 14.0, yMinus2 + 2.8, 12.0, Assets.concreteMat, true);

    // Water Canal Floor
    const sewerWater = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), Assets.sewerWaterMat);
    sewerWater.rotation.x = -Math.PI / 2;
    sewerWater.position.set(0.0, yMinus2 + 0.05, 12.0);
    scene.add(sewerWater);

    // Sewer Cell Door with Shot Target
    this.buildWallWithDoor(scene, 6.0, yMinus2 + 2.8, 14.0, 6.0, 5.6, 2.0, 4.0, 'x', {
      doorName: 'Sewer Cell Gate',
      requiresShotTarget: true
    });

    // =========================================================================
    // 3. LEVEL -1: MAIN BASEMENT [Y = -6.0]
    // =========================================================================
    const yMinus1 = LEVEL_ELEVATIONS.LEVEL_MINUS_1;
    makeSolidBox(36, 0.4, 36, 0.0, yMinus1 - 0.2, 0.0, Assets.concreteMat);

    // Main Basement Hall Perimeter
    makeSolidBox(36, 5.6, 0.6, 0.0, yMinus1 + 2.8, -18.0, Assets.concreteMat, true);
    makeSolidBox(36, 5.6, 0.6, 0.0, yMinus1 + 2.8, 18.0, Assets.concreteMat, true);
    makeSolidBox(0.6, 5.6, 36, -18.0, yMinus1 + 2.8, 0.0, Assets.concreteMat, true);
    makeSolidBox(0.6, 5.6, 36, 18.0, yMinus1 + 2.8, 0.0, Assets.concreteMat, true);

    // Sauna Sealed Room
    makeSolidBox(10, 5.6, 0.5, -12.0, yMinus1 + 2.8, 6.0, Assets.woodMat, true);
    makeSolidBox(0.5, 5.6, 12, -7.0, yMinus1 + 2.8, 12.0, Assets.woodMat, true);
    this.buildWallWithDoor(scene, -12.0, yMinus1 + 2.8, 6.0, 10.0, 5.6, 2.0, 4.2, 'x', {
      doorName: 'Sauna Door'
    });

    // Basement Wall Safe
    makeSolidBox(1.2, 1.2, 0.8, 12.0, yMinus1 + 2.0, 2.0, Assets.metalMat);
    this.interactiveObjects = this.interactiveObjects || new Map();
    this.interactiveObjects.set('BasementWallSafe', {
      position: [12.0, yMinus1 + 2.0, 2.0],
      requiresKey: 'Safe Key',
      unlocked: false
    });

    // Lower Secret Passage to Vertical Wall Cavity
    this.secretPassages.push({
      id: 'Passage_Basement_To_Cavity',
      bounds: new THREE.Box3(new THREE.Vector3(-17.5, yMinus1, -12.0), new THREE.Vector3(-15.0, yMinus1 + 4.0, -9.0)),
      leadsTo: new THREE.Vector3(-16.0, LEVEL_ELEVATIONS.LEVEL_1 + 1.0, -6.0)
    });

    // Stairs Ascending from Level -1 to Level 0 (Ground Floor)
    this.buildStairs(scene, -4.5, yMinus1, -0.5, 3.2, 6.0, 15, -1);

    // =========================================================================
    // 4. LEVEL 0: GROUND FLOOR & BACKYARD [Y = 0.0]
    // =========================================================================
    const y0 = LEVEL_ELEVATIONS.GROUND_FLOOR;
    makeSolidBox(21.2, 0.4, 36, -7.4, y0 - 0.2, 0.0, Assets.woodMat);
    makeSolidBox(11.2, 0.4, 36, 12.4, y0 - 0.2, 0.0, Assets.woodMat);
    makeSolidBox(3.6, 0.4, 21.8, 5.0, y0 - 0.2, -7.1, Assets.woodMat);
    makeSolidBox(3.6, 0.4, 4.0, 5.0, y0 - 0.2, 16.0, Assets.woodMat);

    // Main Hallway / Foyer Perimeter
    makeSolidBox(36, 5.0, 0.6, 0.0, y0 + 2.5, -18.0, Assets.wallMat, true);
    makeSolidBox(36, 5.0, 0.6, 0.0, y0 + 2.5, 18.0, Assets.wallMat, true);
    makeSolidBox(0.6, 5.0, 36, -18.0, y0 + 2.5, 0.0, Assets.wallMat, true);
    makeSolidBox(0.6, 5.0, 36, 18.0, y0 + 2.5, 0.0, Assets.wallMat, true);

    // Main Front Exit Door (5-Tier Lock Infrastructure)
    this.buildFrontExitDoor(scene, 0.0, y0, 17.6);

    // Staircase Closet (Under Grand Stairs)
    this.buildWallWithDoor(scene, 2.0, y0 + 2.5, 10.0, 3.0, 5.0, 1.6, 3.8, 'x', {
      doorName: 'Staircase Closet Door',
      requiresItem: 'Remote Control'
    });

    // Kitchen & Dining Room
    makeSolidBox(12, 5.0, 0.5, -10.0, y0 + 2.5, 2.0, Assets.wallMat, true);
    this.buildWallWithDoor(scene, -6.0, y0 + 2.5, 2.0, 6.0, 5.0, 2.0, 4.0, 'x', { doorName: 'Kitchen Door' });

    // Study
    makeSolidBox(10, 5.0, 0.5, 10.0, y0 + 2.5, 2.0, Assets.wallMat, true);
    this.buildWallWithDoor(scene, 6.0, y0 + 2.5, 2.0, 6.0, 5.0, 2.0, 4.0, 'x', { doorName: 'Study Door' });

    // Grand Stairs to Level 1
    this.buildStairs(scene, 5.0, y0, 13.5, 3.4, 5.0, 15, 1);

    // Backyard Structure (Shed, Well, Guillotine, Playhouse)
    this.buildBackyardZone(scene, y0);

    // =========================================================================
    // 5. LEVEL 1: SECOND FLOOR [Y = 5.0]
    // =========================================================================
    const y1 = LEVEL_ELEVATIONS.SECOND_FLOOR;
    makeSolidBox(21.2, 0.4, 36, -7.4, y1 + 0.8, 0.0, Assets.woodMat);
    makeSolidBox(11.2, 0.4, 36, 12.4, y1 + 0.8, 0.0, Assets.woodMat);
    makeSolidBox(3.6, 0.4, 21.8, 5.0, y1 + 0.8, -7.1, Assets.woodMat);
    makeSolidBox(3.6, 0.4, 4.0, 5.0, y1 + 0.8, 16.0, Assets.woodMat);

    // Bedroom 1 (Spawn Room)
    this.buildWallWithDoor(scene, -8.0, y1 + 3.3, 2.0, 14.0, 5.0, 2.4, 4.2, 'x', {
      doorName: 'Bedroom 1 Door'
    });
    makeSolidBox(0.5, 5.0, 16, -1.0, y1 + 3.3, 10.0, Assets.wallMat, true);

    // Spawn Bed (Underside Hiding Spot)
    this.buildStartingBed(scene, -9.0, y1 + 1.0, 9.5);

    // Bedroom 1 Dresser & Tippable Table
    this.buildTippableTable(scene, -4.5, y1 + 1.0, 8.5);
    this.buildDresserWithRealDrawers(scene, -3.2, y1 + 1.0, 3.8);
    this.buildWardrobeCloset(scene, -13.5, y1 + 1.0, 5.0);

    // Bathroom
    makeSolidBox(10, 5.0, 0.5, 10.0, y1 + 3.3, 2.0, Assets.wallMat, true);
    this.buildWallWithDoor(scene, 6.0, y1 + 3.3, 2.0, 6.0, 5.0, 2.0, 4.0, 'x', { doorName: 'Bathroom Door' });

    // Bedroom 2 & Walk-in Closet
    makeSolidBox(14, 5.0, 0.5, -9.0, y1 + 3.3, -8.0, Assets.wallMat, true);

    // Secret Cavity Behind Walk-in Closet Boxes
    this.secretPassages.push({
      id: 'Passage_Walkin_To_Crow',
      bounds: new THREE.Box3(new THREE.Vector3(-14.0, y1 + 1.0, -8.0), new THREE.Vector3(-11.0, y1 + 4.0, -5.0)),
      leadsTo: new THREE.Vector3(-12.0, y1 + 1.0, -13.0)
    });

    // Meat Room & Crow Room
    makeSolidBox(12, 5.0, 0.5, -9.0, y1 + 3.3, -15.0, Assets.wallMat, true);

    // Stairs Door leading to Level 2 (Attic)
    this.buildWallWithDoor(scene, 5.0, y1 + 3.3, -6.0, 6.0, 5.0, 2.2, 4.2, 'x', {
      doorName: 'Attic Staircase Door'
    });
    this.buildStairs(scene, 5.0, y1 + 1.0, -12.0, 3.0, 5.0, 14, 1);

    // =========================================================================
    // 6. LEVEL 2: THIRD FLOOR / ATTIC [Y = 10.0]
    // =========================================================================
    const y2 = LEVEL_ELEVATIONS.ATTIC;
    makeSolidBox(36, 0.4, 36, 0.0, y2 + 1.3, 0.0, Assets.ceilingMat);

    // Weak / Creaking Breakable Floorboard Zone
    this.buildFragileFloor(scene, 0.0, y2 + 1.3, 4.0, 4.0, 4.0);

    // Jail Room (Wheelchair & Ventilator)
    makeSolidBox(10, 4.5, 0.5, 9.0, y2 + 3.5, 4.0, Assets.wallMat, true);
    this.buildWallWithDoor(scene, 5.0, y2 + 3.5, 4.0, 6.0, 4.5, 2.0, 3.8, 'x', { doorName: 'Jail Cell Gate' });

    // Special Room (Spider Room)
    makeSolidBox(10, 4.5, 0.5, -9.0, y2 + 3.5, 4.0, Assets.wallMat, true);
    this.buildWallWithDoor(scene, -5.0, y2 + 3.5, 4.0, 6.0, 4.5, 2.0, 3.8, 'x', {
      doorName: 'Special Room Door',
      requiresItem: 'Special Key'
    });

    // Nursery / Baby Room
    makeSolidBox(12, 4.5, 0.5, -8.0, y2 + 3.5, -6.0, Assets.wallMat, true);
    this.buildWallWithDoor(scene, -4.0, y2 + 3.5, -6.0, 6.0, 4.5, 2.0, 3.8, 'x', { doorName: 'Nursery Door' });

    // Top Attic Rafters Overlook
    makeSolidBox(24, 0.3, 1.2, 0.0, y2 + 4.2, 0.0, Assets.woodMat);

    // =========================================================================
    // 7. KNOCKABLE PROPS, DYNAMIC PAINTINGS & ITEM PRESET DEPLOYMENT
    // =========================================================================
    this.buildKnockdownPainting(scene, -8.0, y1 + 3.5, 2.25, 0);
    this.buildKnockdownPainting(scene, -1.25, y1 + 3.5, 7.0, Math.PI / 2);
    this.buildKnockdownPainting(scene, -7.0, y0 + 2.5, 17.65, 0);
    this.buildKnockdownPainting(scene, 4.0, y2 + 3.5, 4.25, 0);

    this.paintingLoader.assignTextures(this.paintingFrames);
    this.deployItemPreset(scene);
  },

  // --- SUB-BUILDERS & MECHANICS ---

  buildStairs(scene, x, startY, startZ, width, height, stepCount, dir = 1) {
    const stepDepth = 0.55;
    const stepH = height / stepCount;
    for (let i = 0; i < stepCount; i++) {
      const sY = startY + (i + 1) * stepH;
      const sZ = startZ - dir * i * stepDepth;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, stepH, stepDepth), Assets.woodMat);
      mesh.position.set(x, sY - stepH / 2, sZ);
      mesh.receiveShadow = true;
      scene.add(mesh);
      CollisionWorld.addBox(x - width / 2, sY - stepH, sZ - stepDepth / 2, x + width / 2, sY, sZ + stepDepth / 2);
    }
  },

  buildRamp(scene, pos, width, length, height, rotY) {
    const geo = new THREE.BoxGeometry(width, 0.4, length);
    const mesh = new THREE.Mesh(geo, Assets.concreteMat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.x = Math.atan2(height, length);
    mesh.rotation.y = rotY;
    scene.add(mesh);
    CollisionWorld.addBox(pos[0] - width / 2, pos[1] - height / 2, pos[2] - length / 2, pos[0] + width / 2, pos[1] + height / 2, pos[2] + length / 2);
  },

  buildStartingBed(scene, x, y, z) {
    const g = new THREE.Group();
    const lGeo = new THREE.BoxGeometry(0.18, 0.8, 0.18);
    const l1 = new THREE.Mesh(lGeo, Assets.woodMat); l1.position.set(-1.6, 0.4, -2.4); g.add(l1);
    const l2 = new THREE.Mesh(lGeo, Assets.woodMat); l2.position.set(1.6, 0.4, -2.4); g.add(l2);
    const l3 = new THREE.Mesh(lGeo, Assets.woodMat); l3.position.set(-1.6, 0.4, 2.4); g.add(l3);
    const l4 = new THREE.Mesh(lGeo, Assets.woodMat); l4.position.set(1.6, 0.4, 2.4); g.add(l4);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.55, 5.1), Assets.blanketMat);
    mattress.position.y = 1.05; g.add(mattress);

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.8, 0.25), Assets.woodMat);
    headboard.position.set(0, 1.3, 2.5); g.add(headboard);

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.9), Assets.skinMat);
    pillow.position.set(0, 1.4, 1.8); g.add(pillow);

    g.position.set(x, y, z);
    scene.add(g);

    CollisionWorld.addBox(x - 1.8, y + 0.6, z - 2.5, x + 1.8, y + 2.0, z + 2.6, true);
    this.hidingSpots.push({
      id: 'starting-bed',
      position: new THREE.Vector3(x, y + 0.25, z),
      emergePosition: new THREE.Vector3(x + 2.4, y, z),
      type: 'bed'
    });
  },

  buildEscapeCar(scene, x, y, z) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.8, 8.2), new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.4 }));
    body.position.y = 1.0; car.add(body);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 2.8), Assets.metalMat);
    hood.position.set(0, 1.9, -2.4); car.add(hood);

    car.position.set(x, y, z);
    scene.add(car);
    CollisionWorld.addBox(x - 2.4, y, z - 4.2, x + 2.4, y + 2.2, z + 4.2, true);

    let open = false;
    this.interactables.push({
      mesh: hood,
      prompt: '[E] Open/Close Engine Hood',
      action: () => {
        open = !open;
        hood.rotation.x = open ? -0.5 : 0;
        audio.playDoor();
        return open ? 'Opened Engine Hood.' : 'Closed Hood.';
      }
    });
  },

  buildFrontExitDoor(scene, x, y, z) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.8, 0.28), Assets.woodMat);
    door.position.set(x, y + 2.4, z);
    scene.add(door);

    const collider = CollisionWorld.addBox(x - 1.6, y, z - 0.3, x + 1.6, y + 4.8, z + 0.3, true);

    const plank1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.38, 0.18), Assets.woodMat);
    plank1.position.set(x, y + 2.9, z - 0.3); scene.add(plank1);
    const plank2 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.38, 0.18), Assets.woodMat);
    plank2.position.set(x, y + 1.7, z - 0.3); scene.add(plank2);

    const padlock = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16), Assets.metalMat);
    padlock.position.set(x + 0.6, y + 2.3, z - 0.3); scene.add(padlock);

    this.interactables.push({
      mesh: door,
      prompt: '[E] Main Exit Door',
      action: (inv) => {
        if (this.locks.planks > 0) {
          if (inv.has('Hammer')) {
            this.locks.planks--;
            if (this.locks.planks === 1) scene.remove(plank1);
            if (this.locks.planks === 0) scene.remove(plank2);
            audio.playTung();
            return 'Removed barricade plank!';
          }
          return 'Barricaded by planks. Needs Hammer.';
        }
        if (this.locks.padlock) {
          if (inv.has('Padlock Key')) {
            this.locks.padlock = false;
            scene.remove(padlock);
            audio.playTung();
            return 'Unlocked Padlock!';
          }
          return 'Locked with Padlock. Needs Padlock Key.';
        }
        if (this.locks.keycard) {
          if (inv.has('Keycard')) {
            this.locks.keycard = false;
            audio.playTung();
            return 'Deactivated electronic latch!';
          }
          return 'Electronic lock active. Needs Keycard.';
        }
        if (this.locks.master) {
          if (inv.has('Master Key')) {
            this.locks.master = false;
            CollisionWorld.removeBox(collider);
            triggerVictory('Escaped through the Front Door!');
            return 'Opened Front Door! Freedom!';
          }
          return 'Locked with Master Key bolt.';
        }
      }
    });
  },

  buildBackyardZone(scene, y0) {
    // Shed
    makeSolidBox(6.0, 4.0, 6.0, -11.0, y0 + 2.0, 22.0, Assets.woodMat, true);
    // Well
    const well = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.4, 12), Assets.concreteMat);
    well.position.set(12.0, y0 + 0.7, 22.0); scene.add(well);
    CollisionWorld.addBox(10.8, y0, 20.8, 13.2, y0 + 1.4, 23.2, true);
    // Guillotine
    const guillotine = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.2, 1.4), Assets.woodMat);
    guillotine.position.set(-7.0, y0 + 1.6, 22.0); scene.add(guillotine);
  },

  buildFragileFloor(scene, x, y, z, w, d) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), Assets.woodMat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    this.dynamicProps.push({
      type: 'creaking_plank',
      mesh,
      bounds: new THREE.Box3().setFromObject(mesh),
      broken: false,
      fallPoint: [x, LEVEL_ELEVATIONS.LEVEL_1 + 1.0, z]
    });
  },

  buildTippableTable(scene, x, y, z) {
    const tableGroup = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 1.3), Assets.woodMat);
    top.position.y = 1.35; tableGroup.add(top);

    const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.35, 8);
    const l1 = new THREE.Mesh(legGeo, Assets.woodMat); l1.position.set(0.5, 0.67, 0.5); tableGroup.add(l1);
    const l2 = new THREE.Mesh(legGeo, Assets.woodMat); l2.position.set(-0.5, 0.67, 0.5); tableGroup.add(l2);
    const l3 = new THREE.Mesh(legGeo, Assets.woodMat); l3.position.set(0.5, 0.67, -0.5); tableGroup.add(l3);
    const l4 = new THREE.Mesh(legGeo, Assets.woodMat); l4.position.set(-0.5, 0.67, -0.5); tableGroup.add(l4);

    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.48, 10), Assets.skinMat);
    vase.position.set(0, 1.64, 0); tableGroup.add(vase);

    tableGroup.position.set(x, y, z);
    scene.add(tableGroup);

    this.dynamicProps.push({
      type: 'table',
      group: tableGroup,
      vaseMesh: vase,
      isTipped: false,
      velocity: new THREE.Vector3(),
      rotVel: 0,
      radius: 0.7,
      height: 1.45,
      yPos: y
    });
  },

  buildDresserWithRealDrawers(scene, x, y, z) {
    const dresserW = 2.0, dresserH = 2.4, dresserD = 1.4;
    const body = new THREE.Mesh(new THREE.BoxGeometry(dresserW, dresserH, dresserD), Assets.woodMat);
    body.position.set(x, y + dresserH / 2, z);
    scene.add(body);
    CollisionWorld.addBox(x - dresserW / 2, y, z - dresserD / 2, x + dresserW / 2, y + dresserH, z + dresserD / 2, true);

    for (let i = 0; i < 2; i++) {
      const dGroup = new THREE.Group();
      const dW = dresserW - 0.25;
      const dH = (dresserH - 0.4) / 2 - 0.1;
      const dD = dresserD - 0.2;
      const dY = y + 0.35 + i * (dH + 0.18);

      const btm = new THREE.Mesh(new THREE.BoxGeometry(dW, 0.04, dD), Assets.frameMat);
      btm.position.set(0, 0.02, -dD / 2); dGroup.add(btm);
      const front = new THREE.Mesh(new THREE.BoxGeometry(dW + 0.05, dH, 0.08), Assets.frameMat);
      front.position.set(0, dH / 2, 0); dGroup.add(front);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.08), Assets.metalMat);
      handle.position.set(0, dH / 2, 0.07); dGroup.add(handle);

      dGroup.position.set(x, dY, z + dresserD / 2);
      scene.add(dGroup);

      const dObj = {
        group: dGroup,
        isOpen: false,
        currentZ: z + dresserD / 2,
        targetZ: z + dresserD / 2,
        closedZ: z + dresserD / 2,
        openZ: z + dresserD / 2 + 0.8
      };
      this.drawers.push(dObj);

      this.interactables.push({
        mesh: front,
        prompt: '[E] Open Drawer',
        action: () => {
          dObj.isOpen = !dObj.isOpen;
          dObj.targetZ = dObj.isOpen ? dObj.openZ : dObj.closedZ;
          audio.playDrawer();
          return dObj.isOpen ? 'Opened Drawer.' : 'Closed Drawer.';
        }
      });
    }
  },

  buildWardrobeCloset(scene, x, y, z) {
    const wW = 2.4, wH = 4.6, wD = 1.6;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(wW, wH, wD), Assets.woodMat);
    frame.position.set(x, y + wH / 2, z);
    scene.add(frame);
    CollisionWorld.addBox(x - wW / 2, y, z - wD / 2, x + wW / 2, y + wH, z + wD / 2, true);

    this.hidingSpots.push({
      id: 'bedroom-closet',
      position: new THREE.Vector3(x, y + 1.2, z + 0.1),
      emergePosition: new THREE.Vector3(x + 1.8, y, z),
      type: 'wardrobe'
    });
  },

  buildKnockdownPainting(scene, x, y, z, rotY) {
    const pGroup = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.08), Assets.woodMat);
    pGroup.add(frame);

    const canvasMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.02), Assets.skinMat);
    canvasMesh.position.z = 0.04;
    pGroup.add(canvasMesh);
    this.paintingFrames.push(canvasMesh);

    pGroup.position.set(x, y, z);
    pGroup.rotation.y = rotY;
    scene.add(pGroup);

    this.dynamicProps.push({
      type: 'painting',
      group: pGroup,
      isFallen: false,
      velocity: new THREE.Vector3(),
      rotVel: 0,
      radius: 0.85,
      yPos: y
    });
  },

  buildPushableChair(scene, x, y, z) {
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), Assets.woodMat);
    seat.position.y = 0.75; chair.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.08), Assets.woodMat);
    back.position.set(0, 1.15, -0.32); chair.add(back);

    chair.position.set(x, y, z);
    scene.add(chair);

    this.dynamicProps.push({
      type: 'chair',
      group: chair,
      velocity: new THREE.Vector3(),
      radius: 0.5,
      yPos: y
    });
  },

  buildWallWithDoor(scene, cx, cy, cz, totalW, totalH, doorW, doorH, axis, opts = {}) {
    const wallThick = 0.4;
    const sideW = (totalW - doorW) / 2;
    const headerH = totalH - doorH;

    const leftX = cx - totalW / 2 + sideW / 2;
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(sideW, totalH, wallThick), Assets.wallMat);
    leftWall.position.set(leftX, cy, cz); scene.add(leftWall);
    CollisionWorld.addBox(leftX - sideW / 2, cy - totalH / 2, cz - wallThick / 2, leftX + sideW / 2, cy + totalH / 2, cz + wallThick / 2, true);

    const rightX = cx + totalW / 2 - sideW / 2;
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(sideW, totalH, wallThick), Assets.wallMat);
    rightWall.position.set(rightX, cy, cz); scene.add(rightWall);
    CollisionWorld.addBox(rightX - sideW / 2, cy - totalH / 2, cz - wallThick / 2, rightX + sideW / 2, cy + totalH / 2, cz + wallThick / 2, true);

    const headerY = cy + totalH / 2 - headerH / 2;
    const headerWall = new THREE.Mesh(new THREE.BoxGeometry(doorW, headerH, wallThick), Assets.wallMat);
    headerWall.position.set(cx, headerY, cz); scene.add(headerWall);
    CollisionWorld.addBox(cx - doorW / 2, headerY - headerH / 2, cz - wallThick / 2, cx + doorW / 2, headerY + headerH / 2, cz + wallThick / 2, true);

    const doorPivot = new THREE.Group();
    const hingeX = opts.hingeLeft ? (cx - doorW / 2) : (cx + doorW / 2);
    doorPivot.position.set(hingeX, cy - totalH / 2 + doorH / 2, cz);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.18), Assets.woodMat);
    doorMesh.position.set(opts.hingeLeft ? (doorW / 2) : (-doorW / 2), 0, 0);
    doorPivot.add(doorMesh);

    scene.add(doorPivot);

    const doorObj = {
      pivot: doorPivot,
      mesh: doorMesh,
      collider: CollisionWorld.addBox(cx - doorW / 2, cy - totalH / 2, cz - 0.2, cx + doorW / 2, cy - totalH / 2 + doorH, cz + 0.2, true),
      isOpen: false,
      currentAngle: 0,
      targetAngle: 0,
      openAngle: opts.openAngle || -Math.PI * 0.5,
      closedAngle: opts.doorAngle || 0,
      boxCoords: { minX: cx - doorW / 2, minY: cy - totalH / 2, minZ: cz - 0.2, maxX: cx + doorW / 2, maxY: cy - totalH / 2 + doorH, maxZ: cz + 0.2 }
    };
    this.doors.push(doorObj);

    this.interactables.push({
      mesh: doorMesh,
      prompt: `[E] ${opts.doorName || 'Door'}`,
      action: () => {
        doorObj.isOpen = !doorObj.isOpen;
        doorObj.targetAngle = doorObj.isOpen ? doorObj.openAngle : doorObj.closedAngle;
        audio.playDoor();

        if (doorObj.isOpen) {
          if (doorObj.collider) {
            CollisionWorld.removeBox(doorObj.collider);
            doorObj.collider = null;
          }
        } else {
          if (!doorObj.collider) {
            doorObj.collider = CollisionWorld.addBox(
              doorObj.boxCoords.minX, doorObj.boxCoords.minY, doorObj.boxCoords.minZ,
              doorObj.boxCoords.maxX, doorObj.boxCoords.maxY, doorObj.boxCoords.maxZ,
              true
            );
          }
        }
        return doorObj.isOpen ? 'Opened Door.' : 'Closed Door.';
      }
    });
  },

  buildLobbyElephant(scene, x, y, z) {
    const el = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), Assets.elephantMat);
    body.scale.set(1.1, 0.95, 1.4); body.position.y = 1.9; el.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 10), Assets.elephantMat);
    head.position.set(0, 2.3, 1.5); el.add(head);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.08, 1.4, 8), Assets.elephantMat);
    trunk.rotation.x = -0.3; trunk.position.set(0, 1.3, 2.1); el.add(trunk);

    const boardCanvas = document.createElement('canvas'); boardCanvas.width = 256; boardCanvas.height = 96;
    const bCtx = boardCanvas.getContext('2d');
    bCtx.fillStyle = '#0a0a0a'; bCtx.fillRect(0, 0, 256, 96);
    bCtx.fillStyle = '#ff2222'; bCtx.font = 'bold 26px monospace'; bCtx.textAlign = 'center';
    bCtx.fillText('ADDRESS ME!', 128, 58);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.08), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(boardCanvas) }));
    sign.position.set(0, 1.1, 2.4); el.add(sign);

    el.position.set(x, y, z); scene.add(el);
    CollisionWorld.addBox(x - 1.8, y, z - 1.8, x + 1.8, y + 3.2, z + 2.5, true);
  },

  buildLobbyWardrobe(scene, x, y, z) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.4, 1.4), Assets.woodMat);
    frame.position.set(x, y + 2.2, z); scene.add(frame);
    CollisionWorld.addBox(x - 1.2, y, z - 0.7, x + 1.2, y + 4.4, z + 0.7, true);

    this.interactables.push({
      mesh: frame,
      prompt: '[E] Customize Appearance',
      action: () => {
        showScreen('wardrobe-modal');
        if (typeof WardrobePreview !== 'undefined') WardrobePreview.init();
        return 'Opened Wardrobe.';
      }
    });
  },

  buildHostLaptopTable(scene, x, y, z) {
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.2), Assets.woodMat);
    table.position.set(x, y + 0.7, z); scene.add(table);
    CollisionWorld.addBox(x - 1.1, y, z - 0.6, x + 1.1, y + 1.4, z + 0.6, true);

    const lGroup = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.45), Assets.metalMat); lGroup.add(base);
    const scr = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.03), Assets.screenMat);
    scr.position.set(0, 0.22, -0.22); scr.rotation.x = -0.25; lGroup.add(scr);
    lGroup.position.set(x, y + 1.42, z); scene.add(lGroup);

    this.interactables.push({
      mesh: base,
      prompt: '[E] Terminal Settings',
      action: () => {
        if (!NetworkEngine.isHost) return 'Host Only: You are not the lobby host!';
        openHostLaptopTerminal();
        return 'Accessed Terminal.';
      }
    });
  },

  deployItemPreset(scene) {
    const presets = [
      // PRESET 1
      {
        'Master Key': [-7.0, -11.5, -6.0], 'Hammer': [12.0, 0.5, 22.0], 'Cutting Pliers': [-6.0, 5.5, -4.0],
        'Padlock Key': [8.0, -11.5, -6.0], 'Padlock Code': [-8.0, 1.2, 6.0], 'Battery': [2.0, 10.8, -4.0],
        'Safe Key': [7.0, 11.2, 5.0], 'Weapon Key': [11.0, 0.8, 20.0], 'Melon': [5.0, -11.5, -3.0],
        'Winch Handle': [-7.0, 10.5, 4.0], 'Playhouse Key': [-7.0, 1.0, 3.0], 'Orange Cogwheel': [10.0, -11.8, -8.0],
        'Red Cogwheel': [-5.0, 10.8, -6.0], 'Car Key': [5.0, -4.8, 2.0], 'Special Key': [-9.5, 0.8, 8.5],
        'Meat': [6.5, -11.0, -2.5], 'Gasoline Can': [0.0, -5.2, 1.0], 'Car Battery': [-4.5, 5.8, 6.0],
        'Engine Part': [-8.0, 0.8, -2.0], 'Spark Plug': [3.0, 10.8, -4.0], 'Wrench': [-8.5, 11.2, 6.5]
      },
      // PRESET 2
      {
        'Master Key': [-7.0, 1.0, 3.0], 'Hammer': [7.0, -11.8, -4.0], 'Cutting Pliers': [-7.0, 10.5, 4.0],
        'Padlock Key': [11.0, 0.8, 20.0], 'Padlock Code': [0.0, -10.5, -18.0], 'Battery': [-6.5, 1.2, 8.5],
        'Safe Key': [2.5, 10.8, -3.0], 'Weapon Key': [-7.0, -11.5, -6.0], 'Melon': [-9.5, 0.8, 8.5],
        'Winch Handle': [-9.0, 5.5, -3.0], 'Playhouse Key': [4.0, -11.5, -5.0], 'Orange Cogwheel': [2.5, 10.8, -3.0],
        'Red Cogwheel': [7.0, 11.2, 5.0], 'Car Key': [8.5, 5.8, 7.0], 'Special Key': [2.0, -5.2, -3.0],
        'Meat': [9.0, -11.2, -19.0], 'Gasoline Can': [8.0, 10.5, 2.0], 'Car Battery': [0.0, -5.2, 1.0],
        'Engine Part': [12.0, 0.5, 22.0], 'Spark Plug': [7.0, 0.8, 0.0], 'Wrench': [-6.0, 5.8, -4.0]
      },
      // PRESET 3
      {
        'Master Key': [11.0, 0.8, 20.0], 'Hammer': [-7.0, -11.5, -6.0], 'Cutting Pliers': [-8.0, 6.2, -6.0],
        'Padlock Key': [-7.0, 1.0, 3.0], 'Padlock Code': [-2.0, 0.8, 2.0], 'Battery': [-9.0, 5.5, -7.5],
        'Safe Key': [7.0, 11.2, 5.0], 'Weapon Key': [-9.5, 0.8, 8.5], 'Melon': [12.0, 0.5, 22.0],
        'Winch Handle': [5.0, -4.8, 2.0], 'Playhouse Key': [0.0, 10.8, 2.0], 'Orange Cogwheel': [-9.0, 0.2, -5.0],
        'Red Cogwheel': [-8.0, 5.8, 7.0], 'Car Key': [3.0, 10.8, -4.0], 'Special Key': [-9.0, 5.8, -3.0],
        'Meat': [-6.0, 11.5, -7.0], 'Gasoline Can': [3.0, 0.8, 6.0], 'Car Battery': [8.5, -11.6, -20.0],
        'Engine Part': [-7.5, 5.8, -2.0], 'Spark Plug': [-8.5, 10.8, 6.5], 'Wrench': [-5.5, 1.2, 4.0]
      },
      // PRESET 4
      {
        'Master Key': [8.0, -11.5, -6.0], 'Hammer': [9.0, -11.2, -19.0], 'Cutting Pliers': [5.0, -4.8, 2.0],
        'Padlock Key': [2.5, 10.8, -3.0], 'Padlock Code': [-7.0, 6.5, -7.5], 'Battery': [-9.0, 6.8, -3.0],
        'Safe Key': [-7.0, 10.5, 4.0], 'Weapon Key': [-6.0, -11.4, -4.5], 'Melon': [-7.0, -11.5, -6.0],
        'Winch Handle': [-8.5, 10.8, 6.5], 'Playhouse Key': [7.0, 0.8, 0.0], 'Orange Cogwheel': [-8.0, 6.2, -6.0],
        'Red Cogwheel': [12.0, 0.5, 22.0], 'Car Key': [-5.0, 10.8, -6.0], 'Special Key': [4.0, -11.5, -5.0],
        'Meat': [-7.5, 5.8, -2.0], 'Gasoline Can': [-12.0, 0.5, 22.0], 'Car Battery': [-8.0, 5.5, -2.5],
        'Engine Part': [-5.0, 6.8, -5.0], 'Spark Plug': [-7.0, -11.5, -6.0], 'Wrench': [7.0, 11.2, 5.0]
      },
      // PRESET 5
      {
        'Master Key': [-8.0, 6.2, -6.0], 'Hammer': [12.0, 0.5, 22.0], 'Cutting Pliers': [-6.5, 10.8, -6.0],
        'Padlock Key': [-7.0, 1.0, 3.0], 'Padlock Code': [7.5, 0.8, 0.0], 'Battery': [-2.0, 0.8, 2.0],
        'Safe Key': [8.0, -11.5, -6.0], 'Weapon Key': [-4.5, 5.8, -4.0], 'Melon': [-7.0, 10.5, 4.0],
        'Winch Handle': [8.5, 1.0, -3.0], 'Playhouse Key': [6.0, -11.5, -3.5], 'Orange Cogwheel': [5.0, -11.5, -3.0],
        'Red Cogwheel': [9.0, -11.2, -19.0], 'Car Key': [2.5, 10.8, -3.0], 'Special Key': [-7.5, 5.8, -2.0],
        'Meat': [8.0, -11.5, -2.0], 'Gasoline Can': [-5.0, 0.4, 5.0], 'Car Battery': [-2.5, 0.2, 1.5],
        'Engine Part': [6.5, -10.5, -2.5], 'Spark Plug': [11.0, 0.8, 20.0], 'Wrench': [10.5, -11.8, -7.0]
      }
    ];

    const chosen = presets[Math.floor(Math.random() * presets.length)];
    for (const [name, pos] of Object.entries(chosen)) {
      this.spawnPhysicsItem(scene, name, new THREE.Vector3(pos[0], pos[1], pos[2]));
    }
  },

  spawnPhysicsItem(scene, name, pos, radius = 0.25) {
    const group = new THREE.Group();
    let mesh;

    if (name.includes('Key')) {
      mesh = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16), Assets.metalMat);
    } else if (name.includes('Hammer')) {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.65, 0.14), Assets.metalMat);
    } else if (name.includes('Crossbow')) {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.55), Assets.woodMat);
    } else if (name.includes('Shotgun')) {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 1.15), Assets.metalMat);
    } else if (name.includes('Gasoline')) {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.65, 0.32), Assets.bloodMat);
    } else if (name.includes('Melon')) {
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), new THREE.MeshStandardMaterial({ color: 0x2e5c1e, roughness: 0.7 }));
    } else if (name.includes('Cogwheel')) {
      mesh = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 16), new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.8, roughness: 0.3 }));
    } else {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.48, 10), Assets.skinMat);
    }

    group.add(mesh);
    group.position.copy(pos);
    scene.add(group);

    const record = {
      name,
      group,
      mesh,
      radius,
      velocity: new THREE.Vector3(0, 0, 0),
      inInventory: false,
      isGrounded: true,
      lastPushTime: 0
    };
    this.physicsItems.push(record);

    this.interactables.push({
      mesh,
      prompt: `[E] Pick up ${name}`,
      itemRecord: record,
      action: (inv) => {
        if (record.inInventory) return '';
        if (inv.add(record)) {
          if (group.parent) group.parent.remove(group);
          record.inInventory = true;
          return '';
        }
        return 'Inventory is full!';
      }
    });
    return record;
  }
};
