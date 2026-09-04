/* =========================================================================
   MAP.JS - 1:1 GRANNY MANOR PROCEDURAL ARCHITECTURE & COLLISION WORLD
   ========================================================================= */

// 1. DYNAMIC PROCEDURAL PBR MATERIALS
const Assets = {
  woodMat: null,
  wallMat: null,
  concreteMat: null,
  metalMat: null,
  skinMat: null,
  bloodMat: null,
  blanketMat: null,
  frameMat: null,

  init() {
    const makeWoodTexture = () => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 512;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#2d1c12'; ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#1a0f08';
      for (let i = 0; i < 48; i++) {
        ctx.lineWidth = 1 + Math.random() * 3;
        ctx.beginPath();
        const y = Math.random() * 512;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(150, y + (Math.random() - 0.5) * 30, 350, y + (Math.random() - 0.5) * 30, 512, y);
        ctx.stroke();
      }
      for (let x = 0; x < 512; x += 128) {
        ctx.fillStyle = '#100a06'; ctx.fillRect(x, 0, 3, 512);
      }
      return new THREE.CanvasTexture(c);
    };

    const makeWallpaperTexture = () => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 512;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#303227'; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#22241b';
      for (let x = 0; x < 512; x += 48) {
        for (let y = 0; y < 512; y += 48) {
          ctx.beginPath(); ctx.arc(x + 24, y + 24, 7, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Grunge and grime stains
      for (let i = 0; i < 800; i++) {
        ctx.fillStyle = `rgba(15,12,8,${Math.random() * 0.25})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 4, 4);
      }
      return new THREE.CanvasTexture(c);
    };

    const woodTex = makeWoodTexture();
    const wallTex = makeWallpaperTexture();

    this.woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 });
    this.wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.92 });
    this.concreteMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 });
    this.metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 });
    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xb5a088, roughness: 0.8 });
    this.bloodMat = new THREE.MeshStandardMaterial({ color: 0x6e0505, roughness: 0.5 });
    this.blanketMat = new THREE.MeshStandardMaterial({ color: 0x5a1818, roughness: 0.9 });
    this.frameMat = new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.8 });
  }
};
Assets.init();

// 2. STATIC AABB COLLISION WORLD
const CollisionWorld = {
  boxes: [], // Array of THREE.Box3

  addBox(minX, minY, minZ, maxX, maxY, maxZ) {
    const box = new THREE.Box3(
      new THREE.Vector3(Math.min(minX, maxX), Math.min(minY, maxY), Math.min(minZ, maxZ)),
      new THREE.Vector3(Math.max(minX, maxX), Math.max(minY, maxY), Math.max(minZ, maxZ))
    );
    this.boxes.push(box);
    return box;
  },

  removeBox(box) {
    const idx = this.boxes.indexOf(box);
    if (idx !== -1) this.boxes.splice(idx, 1);
  }
};

// 3. COMPLETE HOUSE BUILDER
const House = {
  interactables: [],
  hidingSpots: [],
  doors: [],
  drawers: [],
  droppedItems: [],
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
    const makeSolidBox = (w, h, d, x, y, z, mat) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      CollisionWorld.addBox(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2);
      return mesh;
    };

    // --- 1. FLOOR SLABS & CEILINGS ---
    // Basement Floor: Y = -5.8
    makeSolidBox(32, 0.4, 32, 0, -5.8, 0, Assets.concreteMat);
    // Ground Floor: Y = 0.0 (Split around stairwells)
    makeSolidBox(22, 0.4, 32, -5, 0.0, 0, Assets.woodMat);
    makeSolidBox(10, 0.4, 18, 11, 0.0, -7, Assets.woodMat);
    // Upstairs Floor: Y = 5.6 (Split around grand stairwell opening)
    makeSolidBox(32, 0.4, 18, 0, 5.6, -7, Assets.woodMat);
    makeSolidBox(14, 0.4, 14, -9, 5.6, 9, Assets.woodMat);
    makeSolidBox(8, 0.4, 14, 12, 5.6, 9, Assets.woodMat);
    // Attic Floor: Y = 11.2
    makeSolidBox(32, 0.4, 32, 0, 11.2, 0, Assets.woodMat);

    // Exterior Perimeter Walls
    makeSolidBox(32, 22, 0.6, 0, 3.0, -16, Assets.wallMat);
    makeSolidBox(32, 22, 0.6, 0, 3.0, 16, Assets.wallMat);
    makeSolidBox(0.6, 22, 32, -16, 3.0, 0, Assets.wallMat);
    makeSolidBox(0.6, 22, 32, 16, 3.0, 0, Assets.wallMat);

    // --- 2. STAIRCASES ---
    // Staircase 1: Ground Floor (0.0) up to Upstairs (5.6)
    const steps1 = 14;
    for (let i = 0; i < steps1; i++) {
      const stepY = 0.2 + i * (5.4 / steps1);
      const stepZ = 13.5 - i * 0.72;
      makeSolidBox(3.4, 0.44, 0.78, 5.0, stepY, stepZ, Assets.woodMat);
    }

    // Staircase 2: Ground Floor (0.0) down to Basement (-5.8)
    const steps2 = 14;
    for (let i = 0; i < steps2; i++) {
      const stepY = -0.2 - i * (5.6 / steps2);
      const stepZ = -1.5 - i * 0.75;
      makeSolidBox(3.2, 0.44, 0.78, -5.0, stepY, stepZ, Assets.concreteMat);
    }

    // --- 3. UPSTAIRS: STARTING BEDROOM ---
    // Architectural Wall with Door Opening into Hallway
    this.buildWallWithDoor(scene, -8, 8.4, 3, 14, 5.2, 2.4, 4.4, 'x', {
      doorAngle: 0,
      openAngle: -Math.PI * 0.5,
      hingeLeft: true
    });
    // Partition Wall between Starting Bedroom and Bedroom 1
    makeSolidBox(0.4, 5.2, 13, -1, 8.4, 9.5, Assets.wallMat);

    // THE STARTING BED (Hollow underside for hiding + Mattress & Pillows)
    const bedGroup = new THREE.Group();
    // 4 Corner Legs (Leaves the space underneath open!)
    const legGeo = new THREE.BoxGeometry(0.18, 0.8, 0.18);
    const leg1 = new THREE.Mesh(legGeo, Assets.woodMat); leg1.position.set(-1.6, 0.4, -2.4); bedGroup.add(leg1);
    const leg2 = new THREE.Mesh(legGeo, Assets.woodMat); leg2.position.set(1.6, 0.4, -2.4); bedGroup.add(leg2);
    const leg3 = new THREE.Mesh(legGeo, Assets.woodMat); leg3.position.set(-1.6, 0.4, 2.4); bedGroup.add(leg3);
    const leg4 = new THREE.Mesh(legGeo, Assets.woodMat); leg4.position.set(1.6, 0.4, 2.4); bedGroup.add(leg4);
    // Mattress and Frame
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.55, 5.1), Assets.blanketMat);
    mattress.position.y = 1.05;
    bedGroup.add(mattress);
    // Headboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.8, 0.25), Assets.woodMat);
    headboard.position.set(0, 1.3, 2.5);
    bedGroup.add(headboard);
    // Pillow
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.9), Assets.skinMat);
    pillow.position.set(0, 1.4, 1.8);
    bedGroup.add(pillow);

    bedGroup.position.set(-9.0, 5.8, 9.0);
    scene.add(bedGroup);

    // Bed Collision Box (Top Mattress & Frame Only)
    CollisionWorld.addBox(-10.8, 6.4, 6.5, -7.2, 7.8, 11.6);
    // Hiding Spot Underneath Bed
    this.hidingSpots.push({
      id: 'starting-bed',
      position: new THREE.Vector3(-9.0, 6.05, 9.0),
      emergePosition: new THREE.Vector3(-6.6, 5.8, 8.5),
      type: 'bed'
    });

    // BEDROOM DRESSER WITH INTERACTIVE SLIDING DRAWERS
    this.buildDresserWithDrawers(scene, -3.2, 5.8, 4.2, 2, 'z');

    // BEDROOM WARDROBE CLOSET (Hiding Spot with Openable Double Doors)
    this.buildWardrobeCloset(scene, -13.2, 5.8, 5.0);

    // Bedside Table + Fragile Noise Vase
    makeSolidBox(1.5, 1.4, 1.5, -4.5, 6.5, 9.0, Assets.woodMat);
    this.spawnItem(scene, 'Vase', new THREE.Vector3(-4.5, 7.5, 9.0));

    // --- 4. HIDDEN PAINTING & SECRET AREA (UPSTAIRS) ---
    const painting = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.15), Assets.woodMat);
    painting.position.set(4.0, 8.4, -6.8);
    scene.add(painting);

    let paintingOpen = false;
    this.interactables.push({
      mesh: painting,
      prompt: '[E] Slide Picture Frame',
      action: () => {
        paintingOpen = !paintingOpen;
        painting.position.x += paintingOpen ? 2.4 : -2.4;
        audio.playDoor();
        return paintingOpen ? 'Revealed Secret Passageway behind painting!' : 'Closed picture frame.';
      }
    });

    // --- 5. GROUND FLOOR: FOYER & 4-TIER BARRICADED FRONT EXIT DOOR ---
    const frontDoor = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.6, 0.28), Assets.woodMat);
    frontDoor.position.set(0, 2.3, 15.6);
    scene.add(frontDoor);
    const doorCollider = CollisionWorld.addBox(-1.6, 0.0, 15.3, 1.6, 4.8, 15.9);

    // Plank 1 & Plank 2
    const plank1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.38, 0.18), Assets.woodMat);
    plank1.position.set(0, 2.8, 15.3);
    scene.add(plank1);
    const plank2 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.38, 0.18), Assets.woodMat);
    plank2.position.set(0, 1.6, 15.3);
    scene.add(plank2);

    // Padlock Mesh
    const padlock = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16), Assets.metalMat);
    padlock.position.set(0.6, 2.2, 15.3);
    scene.add(padlock);

    this.interactables.push({
      mesh: frontDoor,
      prompt: '[E] Escape Manor Front Door',
      action: (inv) => {
        if (this.locks.planks > 0) {
          if (inv.has('Hammer')) {
            this.locks.planks--;
            if (this.locks.planks === 1) scene.remove(plank1);
            if (this.locks.planks === 0) scene.remove(plank2);
            audio.playTung();
            return 'Pried off a wooden barricade plank with the Hammer!';
          }
          return 'Barricaded by heavy wooden planks. Needs Hammer.';
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
          return 'Electronic security panel is active. Needs Keycard.';
        }
        if (this.locks.master) {
          if (inv.has('Master Key')) {
            this.locks.master = false;
            CollisionWorld.removeBox(doorCollider);
            triggerVictory('Escaped through the Front Door of the Manor!');
            return 'Turned Master Key! You pushed the door open to freedom!';
          }
          return 'Master deadbolt is locked. Needs Master Key.';
        }
      }
    });

    // --- 6. BASEMENT GARAGE & ESCAPE VEHICLE ---
    const car = new THREE.Group();
    const carBody = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.8, 8.2), new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.4 }));
    carBody.position.y = 1.0;
    car.add(carBody);

    const carHood = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 2.8), Assets.metalMat);
    carHood.position.set(0, 1.9, -2.4);
    car.add(carHood);

    car.position.set(-7.0, -5.8, -6.0);
    scene.add(car);
    CollisionWorld.addBox(-9.5, -5.8, -10.5, -4.5, -3.8, -1.5);

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
          return 'Car gas tank is completely dry.';
        }
        if (!this.locks.carKey) {
          if (inv.has('Car Key')) {
            this.locks.carKey = true;
            triggerVictory('Started the car and rammed through the garage door!');
            return 'Engine roared to life! Escaped!';
          }
          return 'Needs Car Key to ignite the starter motor.';
        }
      }
    });

    // --- 7. KEY ITEMS SCATTERED INTO DRAWERS & ROOMS ---
    this.spawnItem(scene, 'Hammer', new THREE.Vector3(8.0, 0.8, -8.0));
    this.spawnItem(scene, 'Padlock Key', new THREE.Vector3(-3.2, 6.7, 4.2)); // Inside Top Drawer
    this.spawnItem(scene, 'Keycard', new THREE.Vector3(-11.0, -5.0, 8.0));
    this.spawnItem(scene, 'Master Key', new THREE.Vector3(8.0, 11.6, 6.0)); // In Attic Rafters
    this.spawnItem(scene, 'Spark Plug', new THREE.Vector3(-6.0, 6.6, -1.0));
    this.spawnItem(scene, 'Car Battery', new THREE.Vector3(12.0, -5.0, -9.0));
    this.spawnItem(scene, 'Gasoline Can', new THREE.Vector3(10.0, -5.0, -5.0));
    this.spawnItem(scene, 'Car Key', new THREE.Vector3(-2.0, 0.8, 10.0));
    this.spawnItem(scene, 'Tranquilizer Crossbow', new THREE.Vector3(8.0, 6.6, 4.0));
    this.spawnItem(scene, 'Shotgun', new THREE.Vector3(-12.0, 0.8, -6.0));
  },

  // BUILD WALLS WITH PRECISE DOORWAY CUTOUTS & HINGED DOORS
  buildWallWithDoor(scene, cx, cy, cz, totalW, totalH, doorW, doorH, axis, opts = {}) {
    const wallThick = 0.4;
    const sideW = (totalW - doorW) / 2;
    const headerH = totalH - doorH;

    if (axis === 'x') {
      // Left Wall Chunk
      const leftX = cx - totalW / 2 + sideW / 2;
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(sideW, totalH, wallThick), Assets.wallMat);
      leftWall.position.set(leftX, cy, cz);
      scene.add(leftWall);
      CollisionWorld.addBox(leftX - sideW / 2, cy - totalH / 2, cz - wallThick / 2, leftX + sideW / 2, cy + totalH / 2, cz + wallThick / 2);

      // Right Wall Chunk
      const rightX = cx + totalW / 2 - sideW / 2;
      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(sideW, totalH, wallThick), Assets.wallMat);
      rightWall.position.set(rightX, cy, cz);
      scene.add(rightWall);
      CollisionWorld.addBox(rightX - sideW / 2, cy - totalH / 2, cz - wallThick / 2, rightX + sideW / 2, cy + totalH / 2, cz + wallThick / 2);

      // Top Header / Lintel Chunk
      const headerY = cy + totalH / 2 - headerH / 2;
      const headerWall = new THREE.Mesh(new THREE.BoxGeometry(doorW, headerH, wallThick), Assets.wallMat);
      headerWall.position.set(cx, headerY, cz);
      scene.add(headerWall);
      CollisionWorld.addBox(cx - doorW / 2, headerY - headerH / 2, cz - wallThick / 2, cx + doorW / 2, headerY + headerH / 2, cz + wallThick / 2);

      // Hinged Door Assembly
      const doorPivot = new THREE.Group();
      const hingeX = opts.hingeLeft ? (cx - doorW / 2) : (cx + doorW / 2);
      doorPivot.position.set(hingeX, cy - totalH / 2 + doorH / 2, cz);

      const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.18), Assets.woodMat);
      doorMesh.position.set(opts.hingeLeft ? (doorW / 2) : (-doorW / 2), 0, 0);
      doorPivot.add(doorMesh);

      // Brass Doorknob
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), Assets.metalMat);
      knob.position.set(opts.hingeLeft ? (doorW - 0.25) : (-doorW + 0.25), 0, 0.12);
      doorPivot.add(knob);

      scene.add(doorPivot);

      let doorCollider = CollisionWorld.addBox(cx - doorW / 2, cy - totalH / 2, cz - 0.2, cx + doorW / 2, cy - totalH / 2 + doorH, cz + 0.2);
      let isOpen = false;

      this.interactables.push({
        mesh: doorMesh,
        prompt: '[E] Open / Close Door',
        action: () => {
          isOpen = !isOpen;
          doorPivot.rotation.y = isOpen ? (opts.openAngle || -Math.PI * 0.5) : (opts.doorAngle || 0);
          audio.playDoor();
          if (isOpen) {
            CollisionWorld.removeBox(doorCollider);
            doorCollider = null;
          } else {
            doorCollider = CollisionWorld.addBox(cx - doorW / 2, cy - totalH / 2, cz - 0.2, cx + doorW / 2, cy - totalH / 2 + doorH, cz + 0.2);
          }
          return isOpen ? 'Opened Door.' : 'Closed Door.';
        }
      });
    }
  },

  // BUILD DRESSERS WITH REAL PULL-OUT DRAWERS
  buildDresserWithDrawers(scene, x, y, z, drawerCount, axis) {
    const dresserW = 2.0, dresserH = 2.4, dresserD = 1.4;
    const body = new THREE.Mesh(new THREE.BoxGeometry(dresserW, dresserH, dresserD), Assets.woodMat);
    body.position.set(x, y + dresserH / 2, z);
    scene.add(body);
    CollisionWorld.addBox(x - dresserW / 2, y, z - dresserD / 2, x + dresserW / 2, y + dresserH, z + dresserD / 2);

    for (let i = 0; i < drawerCount; i++) {
      const drawerGroup = new THREE.Group();
      const dH = (dresserH - 0.4) / drawerCount;
      const dY = y + 0.3 + i * (dH + 0.1);

      const dFront = new THREE.Mesh(new THREE.BoxGeometry(dresserW - 0.2, dH - 0.08, 0.1), Assets.frameMat);
      drawerGroup.add(dFront);

      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.08), Assets.metalMat);
      handle.position.z = 0.08;
      drawerGroup.add(handle);

      drawerGroup.position.set(x, dY, z + dresserD / 2);
      scene.add(drawerGroup);

      let isPulled = false;
      this.interactables.push({
        mesh: dFront,
        prompt: '[E] Open / Close Drawer',
        action: () => {
          isPulled = !isPulled;
          drawerGroup.position.z += isPulled ? 0.6 : -0.6;
          audio.playDrawer();
          return isPulled ? 'Opened Drawer.' : 'Closed Drawer.';
        }
      });
    }
  },

  // BUILD REAL WARDROBE CLOSET WITH INTERACTIVE DOUBLE DOORS
  buildWardrobeCloset(scene, x, y, z) {
    const wW = 2.4, wH = 4.6, wD = 1.6;
    const wardrobeFrame = new THREE.Mesh(new THREE.BoxGeometry(wW, wH, wD), Assets.woodMat);
    wardrobeFrame.position.set(x, y + wH / 2, z);
    scene.add(wardrobeFrame);
    CollisionWorld.addBox(x - wW / 2, y, z - wD / 2, x + wW / 2, y + wH, z + wD / 2);

    // Register Closet Hiding Spot
    this.hidingSpots.push({
      id: 'bedroom-closet',
      position: new THREE.Vector3(x, y + 1.2, z + 0.1),
      emergePosition: new THREE.Vector3(x + 1.8, y, z),
      type: 'wardrobe'
    });
  },

  // SPAWN INTERACTABLE GAME ITEMS
  spawnItem(scene, name, pos) {
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

    const record = { name, group, mesh, inInventory: false };
    this.interactables.push({
      mesh,
      prompt: `[E] Pick up ${name}`,
      itemRecord: record,
      action: (inv) => {
        if (inv.add(record)) {
          scene.remove(group);
          record.inInventory = true;
          return `Picked up ${name}.`;
        }
        return 'Inventory is full!';
      }
    });
    return record;
  }
};
