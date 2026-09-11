/* =========================================================================
   MAP.JS - 1:1 BLUEPRINT MANOR, 3D LOBBY, REAL 3D DRAWERS, KNOCK-DOWN
   PAINTINGS, SEAMLESS ZERO-GAP FLOORS & 7 RANDOM ITEM SPAWN PRESETS
   ========================================================================= */

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

  init() {
    // 1. Weathered Amber-Brown Oak Plank Texture (Brightened 2.5x)
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
      // Plank Separator Grooves
      for (let x = 0; x < 512; x += 128) {
        ctx.fillStyle = '#3a2414'; ctx.fillRect(x, 0, 4, 512);
      }
      return new THREE.CanvasTexture(c);
    };

    // 2. Decayed Victorian Floral Wallpaper Texture (Aged Tan/Olive)
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
      // Stains & Grime
      for (let i = 0; i < 600; i++) {
        ctx.fillStyle = `rgba(40, 36, 25, ${Math.random() * 0.22})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 4, 4);
      }
      return new THREE.CanvasTexture(c);
    };

    // 3. "Tung Tung Tung Sahur" Poster Texture for Lobby
    const makePosterTexture = () => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 320;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#181818'; ctx.fillRect(0, 0, 256, 320);
      ctx.fillStyle = '#8a0303'; ctx.fillRect(12, 12, 232, 296);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
      ctx.fillText('TUNG TUNG TUNG', 128, 52);
      ctx.fillText('SAHUR!', 128, 84);
      // Drum silhouette
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
  }
};
Assets.init();

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

const House = {
  interactables: [],
  hidingSpots: [],
  doors: [],
  drawers: [],
  dynamicProps: [],
  physicsItems: [],
  paintings: [],
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
    // SECTION A: 3D AMONG US-STYLE MULTIPLAYER LOBBY ROOM
    // =========================================================================
    const lobbyY = 30.0;
    makeSolidBox(16, 0.4, 16, 60.0, lobbyY - 0.2, 0.0, Assets.concreteMat);
    makeSolidBox(16, 0.4, 16, 60.0, lobbyY + 5.0, 0.0, Assets.ceilingMat);
    makeSolidBox(16, 5.0, 0.4, 60.0, lobbyY + 2.5, -8.0, Assets.wallMat, true);
    makeSolidBox(16, 5.0, 0.4, 60.0, lobbyY + 2.5, 8.0, Assets.wallMat, true);
    makeSolidBox(0.4, 5.0, 16, 52.0, lobbyY + 2.5, 0.0, Assets.wallMat, true);
    makeSolidBox(0.4, 5.0, 16, 68.0, lobbyY + 2.5, 0.0, Assets.wallMat, true);

    const poster1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.05), Assets.posterMat);
    poster1.position.set(57.5, lobbyY + 2.6, -7.75);
    scene.add(poster1);
    const poster2 = poster1.clone();
    poster2.position.set(62.5, lobbyY + 2.6, -7.75);
    scene.add(poster2);

    this.buildLobbyElephant(scene, 60.0, lobbyY, 0.0);
    this.buildLobbyWardrobe(scene, 53.2, lobbyY, -5.0);
    this.buildHostLaptopTable(scene, 66.8, lobbyY, 2.0);

    // =========================================================================
    // SECTION B: CONTINUOUS MANOR FLOORS (ZERO GAPS / ZERO HOLES)
    // =========================================================================
    // Basement Floor: Surface is exactly Y = -6.0
    makeSolidBox(36, 0.4, 36, 0, -6.2, 0, Assets.concreteMat);

    // Ground Floor: Surface is exactly Y = 0.0
    makeSolidBox(21.2, 0.4, 36, -7.4, -0.2, 0, Assets.woodMat);
    makeSolidBox(11.2, 0.4, 36, 12.4, -0.2, 0, Assets.woodMat);
    makeSolidBox(3.6, 0.4, 21.8, 5.0, -0.2, -7.1, Assets.woodMat);
    makeSolidBox(3.6, 0.4, 4.0, 5.0, -0.2, 16.0, Assets.woodMat);

    // Upstairs Floor: Surface is exactly Y = 6.0
    makeSolidBox(21.2, 0.4, 36, -7.4, 5.8, 0, Assets.woodMat);
    makeSolidBox(11.2, 0.4, 36, 12.4, 5.8, 0, Assets.woodMat);
    makeSolidBox(3.6, 0.4, 21.8, 5.0, 5.8, -7.1, Assets.woodMat);
    makeSolidBox(3.6, 0.4, 4.0, 5.0, 5.8, 16.0, Assets.woodMat);

    // Attic Floor: Surface is exactly Y = 11.5
    makeSolidBox(36, 0.4, 36, 0, 11.3, 0, Assets.ceilingMat);

    // Outer Perimeter Manor Walls
    makeSolidBox(36, 24, 0.6, 0, 3.0, -18, Assets.wallMat, true);
    makeSolidBox(36, 24, 0.6, 0, 3.0, 18, Assets.wallMat, true);
    makeSolidBox(0.6, 24, 36, -18, 3.0, 0, Assets.wallMat, true);
    makeSolidBox(0.6, 24, 36, 18, 3.0, 0, Assets.wallMat, true);

    // =========================================================================
    // SECTION C: ACCURATE BASEMENT & GRAND STAIRCASES (1:1 BLUEPRINT)
    // =========================================================================
    // 1. Grand Stairs: Ground Floor ($0.0$) up to Upstairs ($6.0$)
    const steps1 = 15;
    for (let i = 0; i < steps1; i++) {
      const stepH = 0.4;
      const stepTop = (i + 1) * (6.0 / steps1);
      const stepZ = 13.5 - i * 0.68;
      makeSolidBox(3.4, stepH, 0.75, 5.0, stepTop - stepH / 2, stepZ, Assets.woodMat);
    }

    // 2. Basement Stairs: Descends from Z = -0.5 to Z = -8.75 down to Basement
    const steps2 = 15;
    for (let i = 0; i < steps2; i++) {
      const stepH = 0.4;
      const stepTop = -i * (6.0 / steps2);
      const stepZ = -0.5 - i * 0.55;
      makeSolidBox(3.2, stepH, 0.6, -4.5, stepTop - stepH / 2, stepZ, Assets.concreteMat);
    }
    // Enclosure Walls for Basement Stairs
    makeSolidBox(0.4, 7.0, 9.0, -6.3, -3.0, -4.5, Assets.wallMat, true);
    makeSolidBox(0.4, 7.0, 9.0, -2.7, -3.0, -4.5, Assets.wallMat, true);

    // =========================================================================
    // SECTION D: STARTING BEDROOM & INTERIOR PROPS
    // =========================================================================
    // South Wall with Fitted Doorway into Hallway
    this.buildWallWithDoor(scene, -8, 8.8, 2, 14, 5.6, 2.4, 4.4, 'x', {
      doorAngle: 0,
      openAngle: -Math.PI * 0.5,
      hingeLeft: true,
      doorName: 'Starting Bedroom Door'
    });
    // Partition Wall between Bedrooms
    makeSolidBox(0.4, 5.6, 16, -1, 8.8, 10, Assets.wallMat, true);

    // THE STARTING BED (Hollow Underside for Hiding)
    const bedGroup = new THREE.Group();
    const legGeo = new THREE.BoxGeometry(0.18, 0.8, 0.18);
    const l1 = new THREE.Mesh(legGeo, Assets.woodMat); l1.position.set(-1.6, 0.4, -2.4); bedGroup.add(l1);
    const l2 = new THREE.Mesh(legGeo, Assets.woodMat); l2.position.set(1.6, 0.4, -2.4); bedGroup.add(l2);
    const l3 = new THREE.Mesh(legGeo, Assets.woodMat); l3.position.set(-1.6, 0.4, 2.4); bedGroup.add(l3);
    const l4 = new THREE.Mesh(legGeo, Assets.woodMat); l4.position.set(1.6, 0.4, 2.4); bedGroup.add(l4);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.55, 5.1), Assets.blanketMat);
    mattress.position.y = 1.05;
    bedGroup.add(mattress);

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.8, 0.25), Assets.woodMat);
    headboard.position.set(0, 1.3, 2.5);
    bedGroup.add(headboard);

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.9), Assets.skinMat);
    pillow.position.set(0, 1.4, 1.8);
    bedGroup.add(pillow);

    bedGroup.position.set(-9.0, 6.0, 9.5);
    scene.add(bedGroup);

    CollisionWorld.addBox(-10.8, 6.6, 7.0, -7.2, 8.0, 12.1, true);

    this.hidingSpots.push({
      id: 'starting-bed',
      position: new THREE.Vector3(-9.0, 6.25, 9.5),
      emergePosition: new THREE.Vector3(-6.6, 6.0, 8.5),
      type: 'bed'
    });

    // Tippable Bedside Table + Fragile Vase
    this.buildTippableTable(scene, -4.5, 6.0, 8.5);

    // Dresser with 3D Hollow-Cavity Drawers
    this.buildDresserWithRealDrawers(scene, -3.2, 6.0, 3.8);

    // Wardrobe Closet
    this.buildWardrobeCloset(scene, -13.5, 6.0, 5.0);

    // Knock-Down Wall Paintings (Fall & clatter on collision)
    this.buildKnockdownPainting(scene, -8.0, 8.5, 2.22, 0);
    this.buildKnockdownPainting(scene, -1.22, 8.5, 7.0, Math.PI * 0.5);
    this.buildKnockdownPainting(scene, -7.0, 2.5, 17.65, 0);

    // Dynamic Pushable Chairs
    this.buildPushableChair(scene, -6.0, 0.0, 8.0);
    this.buildPushableChair(scene, -8.0, 0.0, -2.0);

    // Hidden Painting Door to Secret Room
    const secretPainting = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.15), Assets.woodMat);
    secretPainting.position.set(4.0, 8.8, -7.8);
    scene.add(secretPainting);

    let paintingOpen = false;
    this.interactables.push({
      mesh: secretPainting,
      prompt: '[E] Slide Secret Painting',
      action: () => {
        paintingOpen = !paintingOpen;
        secretPainting.position.x += paintingOpen ? 2.4 : -2.4;
        audio.playDoor();
        return paintingOpen ? 'Opened Secret Passage!' : 'Closed picture frame.';
      }
    });

    // =========================================================================
    // SECTION E: GROUND FOYER FRONT EXIT & BASEMENT GARAGE CAR
    // =========================================================================
    const frontDoor = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.8, 0.28), Assets.woodMat);
    frontDoor.position.set(0, 2.4, 17.6);
    scene.add(frontDoor);
    const doorCollider = CollisionWorld.addBox(-1.6, 0.0, 17.3, 1.6, 4.8, 17.9, true);

    const plank1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.38, 0.18), Assets.woodMat);
    plank1.position.set(0, 2.9, 17.3);
    scene.add(plank1);
    const plank2 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.38, 0.18), Assets.woodMat);
    plank2.position.set(0, 1.7, 17.3);
    scene.add(plank2);

    const padlock = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16), Assets.metalMat);
    padlock.position.set(0.6, 2.3, 17.3);
    scene.add(padlock);

    this.interactables.push({
      mesh: frontDoor,
      prompt: '[E] Escape Front Door',
      action: (inv) => {
        if (this.locks.planks > 0) {
          if (inv.has('Hammer')) {
            this.locks.planks--;
            if (this.locks.planks === 1) scene.remove(plank1);
            if (this.locks.planks === 0) scene.remove(plank2);
            audio.playTung();
            return 'Pried off a barricade plank with the Hammer!';
          }
          return 'Barricaded by heavy planks. Needs Hammer.';
        }
        if (this.locks.padlock) {
          if (inv.has('Padlock Key')) {
            this.locks.padlock = false;
            scene.remove(padlock);
            audio.playTung();
            return 'Unlocked and removed the heavy Padlock!';
          }
          return 'Locked with a heavy brass Padlock. Needs Padlock Key.';
        }
        if (this.locks.keycard) {
          if (inv.has('Keycard')) {
            this.locks.keycard = false;
            audio.playTung();
            return 'Swiped Keycard! Electronic locks deactivated!';
          }
          return 'Electronic security panel active. Needs Keycard.';
        }
        if (this.locks.master) {
          if (inv.has('Master Key')) {
            this.locks.master = false;
            CollisionWorld.removeBox(doorCollider);
            triggerVictory('Escaped through the Front Door of the Manor!');
            return 'Turned Master Key! You are free!';
          }
          return 'Master deadbolt is locked. Needs Master Key.';
        }
      }
    });

    // Escape Car in Garage
    const car = new THREE.Group();
    const carBody = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.8, 8.2), new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.4 }));
    carBody.position.y = 1.0;
    car.add(carBody);

    const carHood = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 2.8), Assets.metalMat);
    carHood.position.set(0, 1.9, -2.4);
    car.add(carHood);

    car.position.set(-7.0, -6.0, -6.0);
    scene.add(car);
    CollisionWorld.addBox(-9.5, -6.0, -10.5, -4.5, -4.0, -1.5, true);

    let hoodOpen = false;
    this.interactables.push({
      mesh: carHood,
      prompt: '[E] Open/Close Engine Hood',
      action: () => {
        hoodOpen = !hoodOpen;
        carHood.rotation.x = hoodOpen ? -0.5 : 0;
        audio.playDoor();
        return hoodOpen ? 'Opened Car Hood.' : 'Closed Car Hood.';
      }
    });

    this.interactables.push({
      mesh: carBody,
      prompt: '[E] Inspect Escape Vehicle',
      action: (inv) => {
        if (!this.locks.carPlug) {
          if (inv.has('Spark Plug')) {
            this.locks.carPlug = true;
            inv.remove('Spark Plug');
            audio.playTung();
            return 'Installed Spark Plug into engine block!';
          }
          return 'Car engine is missing a Spark Plug.';
        }
        if (!this.locks.carBattery) {
          if (inv.has('Car Battery')) {
            this.locks.carBattery = true;
            inv.remove('Car Battery');
            audio.playTung();
            return 'Installed Car Battery into power terminals!';
          }
          return 'Car power bay is missing a Battery.';
        }
        if (!this.locks.carGas) {
          if (inv.has('Gasoline Can')) {
            this.locks.carGas = true;
            inv.remove('Gasoline Can');
            audio.playTung();
            return 'Poured gasoline into fuel tank!';
          }
          return 'Car gas tank is empty.';
        }
        if (!this.locks.carKey) {
          if (inv.has('Car Key')) {
            this.locks.carKey = true;
            triggerVictory('Started the car and smashed through the garage door!');
            return 'Engine started!';
          }
          return 'Needs Car Key to ignite starter motor.';
        }
      }
    });

    // =========================================================================
    // SECTION F: 7 RANDOMIZED ITEM SPAWN PRESETS
    // =========================================================================
    this.applyRandomItemPreset(scene);
  },

  // 7 DISTINCT ITEM SPAWN PRESETS
  applyRandomItemPreset(scene) {
    const presets = [
      // Preset 0: Standard Route
      {
        'Padlock Key': new THREE.Vector3(-3.2, 6.75, 4.0), // In Dresser Drawer
        'Master Key': new THREE.Vector3(8.0, 11.8, 6.0),   // Attic
        'Hammer': new THREE.Vector3(8.0, 0.3, -8.0),       // Kitchen
        'Keycard': new THREE.Vector3(-11.0, -5.7, 8.0),    // Basement
        'Spark Plug': new THREE.Vector3(-6.0, 6.3, -1.0),  // Bedroom 2
        'Car Battery': new THREE.Vector3(12.0, -5.7, -9.0),// Basement Workroom
        'Gasoline Can': new THREE.Vector3(10.0, -5.7, -5.0),
        'Car Key': new THREE.Vector3(-2.0, 0.3, 10.0),     // Foyer Table
        'Tranquilizer Crossbow': new THREE.Vector3(8.0, 6.3, 4.0),
        'Shotgun': new THREE.Vector3(-12.0, 0.3, -6.0)
      },
      // Preset 1: Bathroom & Shed Scramble
      {
        'Padlock Key': new THREE.Vector3(6.0, 6.3, -7.0),  // Bathroom
        'Master Key': new THREE.Vector3(-11.0, -5.7, 8.0), // Basement Tunnel
        'Hammer': new THREE.Vector3(12.0, -5.7, -9.0),     // Basement Shelf
        'Keycard': new THREE.Vector3(-3.2, 6.75, 4.0),     // Dresser Drawer
        'Spark Plug': new THREE.Vector3(8.0, 11.8, 6.0),   // Attic
        'Car Battery': new THREE.Vector3(8.0, 0.3, -8.0),  // Kitchen
        'Gasoline Can': new THREE.Vector3(-6.0, 6.3, -1.0),
        'Car Key': new THREE.Vector3(8.0, 6.3, 4.0),
        'Tranquilizer Crossbow': new THREE.Vector3(-2.0, 0.3, 10.0),
        'Shotgun': new THREE.Vector3(10.0, -5.7, -5.0)
      },
      // Preset 2: Secret Room Priority
      {
        'Padlock Key': new THREE.Vector3(8.0, 11.8, 6.0),  // Attic
        'Master Key': new THREE.Vector3(-3.2, 6.75, 4.0),  // Dresser Drawer
        'Hammer': new THREE.Vector3(-2.0, 0.3, 10.0),
        'Keycard': new THREE.Vector3(8.0, 0.3, -8.0),
        'Spark Plug': new THREE.Vector3(12.0, -5.7, -9.0),
        'Car Battery': new THREE.Vector3(-11.0, -5.7, 8.0),
        'Gasoline Can': new THREE.Vector3(6.0, 6.3, -7.0),
        'Car Key': new THREE.Vector3(10.0, -5.7, -5.0),
        'Tranquilizer Crossbow': new THREE.Vector3(-6.0, 6.3, -1.0),
        'Shotgun': new THREE.Vector3(8.0, 6.3, 4.0)
      },
      // Preset 3: Garage Cache
      {
        'Padlock Key': new THREE.Vector3(10.0, -5.7, -5.0),
        'Master Key': new THREE.Vector3(8.0, 0.3, -8.0),
        'Hammer': new THREE.Vector3(8.0, 11.8, 6.0),
        'Keycard': new THREE.Vector3(-6.0, 6.3, -1.0),
        'Spark Plug': new THREE.Vector3(-3.2, 6.75, 4.0), // Dresser Drawer
        'Car Battery': new THREE.Vector3(6.0, 6.3, -7.0),
        'Gasoline Can': new THREE.Vector3(12.0, -5.7, -9.0),
        'Car Key': new THREE.Vector3(-11.0, -5.7, 8.0),
        'Tranquilizer Crossbow': new THREE.Vector3(-12.0, 0.3, -6.0),
        'Shotgun': new THREE.Vector3(-2.0, 0.3, 10.0)
      },
      // Preset 4: Kitchen Lockout
      {
        'Padlock Key': new THREE.Vector3(-2.0, 0.3, 10.0),
        'Master Key': new THREE.Vector3(6.0, 6.3, -7.0),
        'Hammer': new THREE.Vector3(-11.0, -5.7, 8.0),
        'Keycard': new THREE.Vector3(8.0, 11.8, 6.0),
        'Spark Plug': new THREE.Vector3(10.0, -5.7, -5.0),
        'Car Battery': new THREE.Vector3(-3.2, 6.75, 4.0), // Dresser Drawer
        'Gasoline Can': new THREE.Vector3(8.0, 0.3, -8.0),
        'Car Key': new THREE.Vector3(-6.0, 6.3, -1.0),
        'Tranquilizer Crossbow': new THREE.Vector3(12.0, -5.7, -9.0),
        'Shotgun': new THREE.Vector3(8.0, 6.3, 4.0)
      },
      // Preset 5: Bathroom & Vent Stash
      {
        'Padlock Key': new THREE.Vector3(-6.0, 6.3, -1.0),
        'Master Key': new THREE.Vector3(10.0, -5.7, -5.0),
        'Hammer': new THREE.Vector3(-3.2, 6.75, 4.0),      // Dresser Drawer
        'Keycard': new THREE.Vector3(6.0, 6.3, -7.0),
        'Spark Plug': new THREE.Vector3(-2.0, 0.3, 10.0),
        'Car Battery': new THREE.Vector3(8.0, 11.8, 6.0),
        'Gasoline Can': new THREE.Vector3(-11.0, -5.7, 8.0),
        'Car Key': new THREE.Vector3(8.0, 0.3, -8.0),
        'Tranquilizer Crossbow': new THREE.Vector3(10.0, -5.7, -5.0),
        'Shotgun': new THREE.Vector3(12.0, -5.7, -9.0)
      },
      // Preset 6: Extreme Dispersion
      {
        'Padlock Key': new THREE.Vector3(12.0, -5.7, -9.0),
        'Master Key': new THREE.Vector3(-2.0, 0.3, 10.0),
        'Hammer': new THREE.Vector3(6.0, 6.3, -7.0),
        'Keycard': new THREE.Vector3(10.0, -5.7, -5.0),
        'Spark Plug': new THREE.Vector3(8.0, 0.3, -8.0),
        'Car Battery': new THREE.Vector3(-6.0, 6.3, -1.0),
        'Gasoline Can': new THREE.Vector3(8.0, 11.8, 6.0),
        'Car Key': new THREE.Vector3(-3.2, 6.75, 4.0),     // Dresser Drawer
        'Tranquilizer Crossbow': new THREE.Vector3(-11.0, -5.7, 8.0),
        'Shotgun': new THREE.Vector3(-12.0, 0.3, -6.0)
      }
    ];

    const chosen = presets[Math.floor(Math.random() * presets.length)];
    for (const [name, pos] of Object.entries(chosen)) {
      this.spawnPhysicsItem(scene, name, pos);
    }
  },

  // 3D ELEPHANT WITH "ADDRESS ME!" SIGNBOARD IN LOBBY
  buildLobbyElephant(scene, x, y, z) {
    const elephant = new THREE.Group();

    const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), Assets.elephantMat);
    body.scale.set(1.1, 0.95, 1.4);
    body.position.y = 1.9;
    elephant.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 10), Assets.elephantMat);
    head.position.set(0, 2.3, 1.5);
    elephant.add(head);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.08, 1.4, 8), Assets.elephantMat);
    trunk.rotation.x = -0.3;
    trunk.position.set(0, 1.3, 2.1);
    elephant.add(trunk);

    const earGeo = new THREE.BoxGeometry(0.1, 0.8, 0.8);
    const leftEar = new THREE.Mesh(earGeo, Assets.elephantMat);
    leftEar.position.set(-0.95, 2.4, 1.4);
    leftEar.rotation.y = -0.35;
    elephant.add(leftEar);
    const rightEar = leftEar.clone();
    rightEar.position.x = 0.95;
    rightEar.rotation.y = 0.35;
    elephant.add(rightEar);

    const legGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.3, 8);
    const l1 = new THREE.Mesh(legGeo, Assets.elephantMat); l1.position.set(-0.75, 0.65, 0.8); elephant.add(l1);
    const l2 = new THREE.Mesh(legGeo, Assets.elephantMat); l2.position.set(0.75, 0.65, 0.8); elephant.add(l2);
    const l3 = new THREE.Mesh(legGeo, Assets.elephantMat); l3.position.set(-0.75, 0.65, -0.8); elephant.add(l3);
    const l4 = new THREE.Mesh(legGeo, Assets.elephantMat); l4.position.set(0.75, 0.65, -0.8); elephant.add(l4);

    const boardCanvas = document.createElement('canvas'); boardCanvas.width = 256; boardCanvas.height = 96;
    const bCtx = boardCanvas.getContext('2d');
    bCtx.fillStyle = '#0a0a0a'; bCtx.fillRect(0, 0, 256, 96);
    bCtx.fillStyle = '#ff2222'; bCtx.font = 'bold 26px monospace'; bCtx.textAlign = 'center';
    bCtx.fillText('ADDRESS ME!', 128, 58);
    const boardTex = new THREE.CanvasTexture(boardCanvas);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.08), new THREE.MeshBasicMaterial({ map: boardTex }));
    sign.position.set(0, 1.1, 2.4);
    elephant.add(sign);

    elephant.position.set(x, y, z);
    scene.add(elephant);
    CollisionWorld.addBox(x - 1.8, y, z - 1.8, x + 1.8, y + 3.2, z + 2.5, true);
  },

  // INTERACTIVE WARDROBE CLOSET IN LOBBY ROOM
  buildLobbyWardrobe(scene, x, y, z) {
    const wardrobeFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.4, 1.4), Assets.woodMat);
    wardrobeFrame.position.set(x, y + 2.2, z);
    scene.add(wardrobeFrame);
    CollisionWorld.addBox(x - 1.2, y, z - 0.7, x + 1.2, y + 4.4, z + 0.7, true);

    this.interactables.push({
      mesh: wardrobeFrame,
      prompt: '[E] Customize Appearance',
      action: () => {
        showScreen('wardrobe-modal');
        if (typeof WardrobePreview !== 'undefined') WardrobePreview.init();
        return 'Opened Wardrobe.';
      }
    });
  },

  // HOST LAPTOP TERMINAL TABLE IN LOBBY ROOM
  buildHostLaptopTable(scene, x, y, z) {
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.2), Assets.woodMat);
    table.position.set(x, y + 0.7, z);
    scene.add(table);
    CollisionWorld.addBox(x - 1.1, y, z - 0.6, x + 1.1, y + 1.4, z + 0.6, true);

    const laptopGroup = new THREE.Group();
    const lBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.45), Assets.metalMat);
    laptopGroup.add(lBase);
    const lScreen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.03), Assets.screenMat);
    lScreen.position.set(0, 0.22, -0.22);
    lScreen.rotation.x = -0.25;
    laptopGroup.add(lScreen);

    laptopGroup.position.set(x, y + 1.42, z);
    scene.add(laptopGroup);

    this.interactables.push({
      mesh: lBase,
      prompt: '[E] Host Terminal',
      action: () => {
        if (!NetworkEngine.isHost) {
          return 'Host Only: You are not the lobby host!';
        }
        openHostLaptopTerminal();
        return 'Accessed Manor Terminal.';
      }
    });
  },

  // KNOCK-DOWN WALL PAINTINGS
  buildKnockdownPainting(scene, x, y, z, rotY) {
    const pGroup = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.08), Assets.woodMat);
    pGroup.add(frame);

    const canvasMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.02), Assets.skinMat);
    canvasMesh.position.z = 0.04;
    pGroup.add(canvasMesh);

    pGroup.position.set(x, y, z);
    pGroup.rotation.y = rotY;
    scene.add(pGroup);

    const paintingProp = {
      type: 'painting',
      group: pGroup,
      isFallen: false,
      velocity: new THREE.Vector3(),
      rotVel: 0,
      radius: 0.85,
      yPos: y
    };
    this.dynamicProps.push(paintingProp);
  },

  // DYNAMIC PUSHABLE CHAIRS
  buildPushableChair(scene, x, y, z) {
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), Assets.woodMat);
    seat.position.y = 0.75;
    chair.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.08), Assets.woodMat);
    back.position.set(0, 1.15, -0.32);
    chair.add(back);

    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8);
    const c1 = new THREE.Mesh(legGeo, Assets.woodMat); c1.position.set(0.28, 0.37, 0.28); chair.add(c1);
    const c2 = new THREE.Mesh(legGeo, Assets.woodMat); c2.position.set(-0.28, 0.37, 0.28); chair.add(c2);
    const c3 = new THREE.Mesh(legGeo, Assets.woodMat); c3.position.set(0.28, 0.37, -0.28); chair.add(c3);
    const c4 = new THREE.Mesh(legGeo, Assets.woodMat); c4.position.set(-0.28, 0.37, -0.28); chair.add(c4);

    chair.position.set(x, y, z);
    scene.add(chair);

    const chairProp = {
      type: 'chair',
      group: chair,
      velocity: new THREE.Vector3(),
      radius: 0.5,
      yPos: y
    };
    this.dynamicProps.push(chairProp);
  },

  // REAL 3D HOLLOW CAVITY DRAWERS
  buildDresserWithRealDrawers(scene, x, y, z) {
    const dresserW = 2.0, dresserH = 2.4, dresserD = 1.4;
    const body = new THREE.Mesh(new THREE.BoxGeometry(dresserW, dresserH, dresserD), Assets.woodMat);
    body.position.set(x, y + dresserH / 2, z);
    scene.add(body);
    CollisionWorld.addBox(x - dresserW / 2, y, z - dresserD / 2, x + dresserW / 2, y + dresserH, z + dresserD / 2, true);

    const drawerCount = 2;
    for (let i = 0; i < drawerCount; i++) {
      const drawerGroup = new THREE.Group();
      const dW = dresserW - 0.25;
      const dH = (dresserH - 0.4) / drawerCount - 0.1;
      const dD = dresserD - 0.2;
      const dY = y + 0.35 + i * (dH + 0.18);

      // Hollow Tray Construction
      const btm = new THREE.Mesh(new THREE.BoxGeometry(dW, 0.04, dD), Assets.frameMat);
      btm.position.set(0, 0.02, -dD / 2);
      drawerGroup.add(btm);

      const front = new THREE.Mesh(new THREE.BoxGeometry(dW + 0.05, dH, 0.08), Assets.frameMat);
      front.position.set(0, dH / 2, 0);
      drawerGroup.add(front);

      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.08), Assets.metalMat);
      handle.position.set(0, dH / 2, 0.07);
      drawerGroup.add(handle);

      const sideLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, dH - 0.08, dD), Assets.frameMat);
      sideLeft.position.set(-dW / 2 + 0.02, dH / 2 - 0.04, -dD / 2);
      drawerGroup.add(sideLeft);

      const sideRight = sideLeft.clone();
      sideRight.position.x = dW / 2 - 0.02;
      drawerGroup.add(sideRight);

      const back = new THREE.Mesh(new THREE.BoxGeometry(dW, dH - 0.08, 0.04), Assets.frameMat);
      back.position.set(0, dH / 2 - 0.04, -dD);
      drawerGroup.add(back);

      drawerGroup.position.set(x, dY, z + dresserD / 2);
      scene.add(drawerGroup);

      const drawerObj = {
        group: drawerGroup,
        isOpen: false,
        currentZ: z + dresserD / 2,
        targetZ: z + dresserD / 2,
        closedZ: z + dresserD / 2,
        openZ: z + dresserD / 2 + 0.8
      };
      this.drawers.push(drawerObj);

      this.interactables.push({
        mesh: front,
        prompt: '[E] Drawer',
        action: () => {
          drawerObj.isOpen = !drawerObj.isOpen;
          drawerObj.targetZ = drawerObj.isOpen ? drawerObj.openZ : drawerObj.closedZ;
          audio.playDrawer();
          return drawerObj.isOpen ? 'Opened Drawer.' : 'Closed Drawer.';
        }
      });
    }
  },

  buildTippableTable(scene, x, y, z) {
    const tableGroup = new THREE.Group();

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 1.3), Assets.woodMat);
    top.position.y = 1.35;
    tableGroup.add(top);

    const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.35, 8);
    const l1 = new THREE.Mesh(legGeo, Assets.woodMat); l1.position.set(0.5, 0.67, 0.5); tableGroup.add(l1);
    const l2 = new THREE.Mesh(legGeo, Assets.woodMat); l2.position.set(-0.5, 0.67, 0.5); tableGroup.add(l2);
    const l3 = new THREE.Mesh(legGeo, Assets.woodMat); l3.position.set(0.5, 0.67, -0.5); tableGroup.add(l3);
    const l4 = new THREE.Mesh(legGeo, Assets.woodMat); l4.position.set(-0.5, 0.67, -0.5); tableGroup.add(l4);

    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 1.1), Assets.woodMat);
    shelf.position.y = 0.35;
    tableGroup.add(shelf);

    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.48, 10), Assets.skinMat);
    vase.position.set(0, 1.64, 0);
    tableGroup.add(vase);

    tableGroup.position.set(x, y, z);
    scene.add(tableGroup);

    const prop = {
      type: 'table',
      group: tableGroup,
      vaseMesh: vase,
      isTipped: false,
      velocity: new THREE.Vector3(),
      rotVel: 0,
      radius: 0.7,
      height: 1.45,
      yPos: y
    };
    this.dynamicProps.push(prop);
  },

  buildWardrobeCloset(scene, x, y, z) {
    const wW = 2.4, wH = 4.6, wD = 1.6;
    const wardrobeFrame = new THREE.Mesh(new THREE.BoxGeometry(wW, wH, wD), Assets.woodMat);
    wardrobeFrame.position.set(x, y + wH / 2, z);
    scene.add(wardrobeFrame);
    CollisionWorld.addBox(x - wW / 2, y, z - wD / 2, x + wW / 2, y + wH, z + wD / 2, true);

    this.hidingSpots.push({
      id: 'bedroom-closet',
      position: new THREE.Vector3(x, y + 1.2, z + 0.1),
      emergePosition: new THREE.Vector3(x + 1.8, y, z),
      type: 'wardrobe'
    });
  },

  buildWallWithDoor(scene, cx, cy, cz, totalW, totalH, doorW, doorH, axis, opts = {}) {
    const wallThick = 0.4;
    const sideW = (totalW - doorW) / 2;
    const headerH = totalH - doorH;

    const leftX = cx - totalW / 2 + sideW / 2;
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(sideW, totalH, wallThick), Assets.wallMat);
    leftWall.position.set(leftX, cy, cz);
    scene.add(leftWall);
    CollisionWorld.addBox(leftX - sideW / 2, cy - totalH / 2, cz - wallThick / 2, leftX + sideW / 2, cy + totalH / 2, cz + wallThick / 2, true);

    const rightX = cx + totalW / 2 - sideW / 2;
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(sideW, totalH, wallThick), Assets.wallMat);
    rightWall.position.set(rightX, cy, cz);
    scene.add(rightWall);
    CollisionWorld.addBox(rightX - sideW / 2, cy - totalH / 2, cz - wallThick / 2, rightX + sideW / 2, cy + totalH / 2, cz + wallThick / 2, true);

    const headerY = cy + totalH / 2 - headerH / 2;
    const headerWall = new THREE.Mesh(new THREE.BoxGeometry(doorW, headerH, wallThick), Assets.wallMat);
    headerWall.position.set(cx, headerY, cz);
    scene.add(headerWall);
    CollisionWorld.addBox(cx - doorW / 2, headerY - headerH / 2, cz - wallThick / 2, cx + doorW / 2, headerY + headerH / 2, cz + wallThick / 2, true);

    const doorPivot = new THREE.Group();
    const hingeX = opts.hingeLeft ? (cx - doorW / 2) : (cx + doorW / 2);
    doorPivot.position.set(hingeX, cy - totalH / 2 + doorH / 2, cz);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.18), Assets.woodMat);
    doorMesh.position.set(opts.hingeLeft ? (doorW / 2) : (-doorW / 2), 0, 0);
    doorPivot.add(doorMesh);

    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), Assets.metalMat);
    knob.position.set(opts.hingeLeft ? (doorW - 0.25) : (-doorW + 0.25), 0, 0.12);
    doorPivot.add(knob);

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
