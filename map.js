/* =========================================================================
   MAP.JS - 1:1 MANOR BLUEPRINT, SEAMLESS FLOORS (NO GAPS), 3D DRAWERS & PROPS
   ========================================================================= */

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
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#2d1c12'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#180f08';
      for (let i = 0; i < 32; i++) {
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        const y = Math.random() * 256;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(80, y + (Math.random() - 0.5) * 20, 180, y + (Math.random() - 0.5) * 20, 256, y);
        ctx.stroke();
      }
      return new THREE.CanvasTexture(c);
    };

    const makeWallpaperTexture = () => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#303227'; ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#22241b';
      for (let x = 0; x < 256; x += 32) {
        for (let y = 0; y < 256; y += 32) {
          ctx.beginPath(); ctx.arc(x + 16, y + 16, 5, 0, Math.PI * 2); ctx.fill();
        }
      }
      return new THREE.CanvasTexture(c);
    };

    this.woodMat = new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.85 });
    this.wallMat = new THREE.MeshStandardMaterial({ map: makeWallpaperTexture(), roughness: 0.92 });
    this.concreteMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 });
    this.metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 });
    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xb5a088, roughness: 0.8 });
    this.bloodMat = new THREE.MeshStandardMaterial({ color: 0x6e0505, roughness: 0.5 });
    this.blanketMat = new THREE.MeshStandardMaterial({ color: 0x5a1818, roughness: 0.9 });
    this.frameMat = new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.8 });
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

    // --- 1. CONTINUOUS SOLID FLOORS (ZERO GAPS / ZERO HOLES) ---
    // Basement Floor: Surface is exactly Y = -6.0
    makeSolidBox(36, 0.4, 36, 0, -6.2, 0, Assets.concreteMat);

    // Ground Floor: Surface is exactly Y = 0.0 (Seamless surrounding stairwell cutouts)
    // Left side & Foyer
    makeSolidBox(21.2, 0.4, 36, -7.4, -0.2, 0, Assets.woodMat);
    // Right side
    makeSolidBox(11.2, 0.4, 36, 12.4, -0.2, 0, Assets.woodMat);
    // Ground Back (Behind stairs)
    makeSolidBox(3.6, 0.4, 21.8, 5.0, -0.2, -7.1, Assets.woodMat);
    // Ground Front landing
    makeSolidBox(3.6, 0.4, 4.0, 5.0, -0.2, 16.0, Assets.woodMat);

    // Upstairs Floor: Surface is exactly Y = 6.0 (Continuous with only the stairwell opening)
    // Left side (Entire Starting Bedroom, Bedroom 1, Hallway left)
    makeSolidBox(21.2, 0.4, 36, -7.4, 5.8, 0, Assets.woodMat);
    // Right side (Bathroom, Hallway right)
    makeSolidBox(11.2, 0.4, 36, 12.4, 5.8, 0, Assets.woodMat);
    // Upstairs Back corridor
    makeSolidBox(3.6, 0.4, 21.8, 5.0, 5.8, -7.1, Assets.woodMat);
    // Upstairs Front landing walkway
    makeSolidBox(3.6, 0.4, 4.0, 5.0, 5.8, 16.0, Assets.woodMat);

    // Attic Floor: Surface is exactly Y = 11.5
    makeSolidBox(36, 0.4, 36, 0, 11.3, 0, Assets.woodMat);

    // Perimeter Exterior Walls
    makeSolidBox(36, 24, 0.6, 0, 3.0, -18, Assets.wallMat, true);
    makeSolidBox(36, 24, 0.6, 0, 3.0, 18, Assets.wallMat, true);
    makeSolidBox(0.6, 24, 36, -18, 3.0, 0, Assets.wallMat, true);
    makeSolidBox(0.6, 24, 36, 18, 3.0, 0, Assets.wallMat, true);

    // --- 2. ACCURATE STAIRCASES (NO GAPS TO SURROUNDING FLOORS) ---
    // Staircase 1: Ground Floor (0.0) up to Upstairs (6.0)
    const steps1 = 15;
    for (let i = 0; i < steps1; i++) {
      const stepH = 0.4;
      const stepTop = (i + 1) * (6.0 / steps1);
      const stepZ = 13.5 - i * 0.68;
      makeSolidBox(3.4, stepH, 0.75, 5.0, stepTop - stepH / 2, stepZ, Assets.woodMat);
    }

    // Staircase 2: Ground Floor (0.0) down to Basement (-6.0)
    const steps2 = 15;
    for (let i = 0; i < steps2; i++) {
      const stepH = 0.4;
      const stepTop = -i * (6.0 / steps2);
      const stepZ = -2.0 - i * 0.75;
      makeSolidBox(3.2, stepH, 0.78, -5.0, stepTop - stepH / 2, stepZ, Assets.concreteMat);
    }

    // --- 3. UPSTAIRS: STARTING BEDROOM ---
    // Wall with Door into Hallway
    this.buildWallWithDoor(scene, -8, 8.8, 2, 14, 5.6, 2.4, 4.4, 'x', {
      doorAngle: 0,
      openAngle: -Math.PI * 0.5,
      hingeLeft: true,
      doorName: 'Bedroom Door'
    });
    // Partition Wall between Bedrooms
    makeSolidBox(0.4, 5.6, 16, -1, 8.8, 10, Assets.wallMat, true);

    // STARTING BED (Hollow underside for hiding)
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

    // Bed top mattress collider only
    CollisionWorld.addBox(-10.8, 6.6, 7.0, -7.2, 8.0, 12.1, true);

    this.hidingSpots.push({
      id: 'starting-bed',
      position: new THREE.Vector3(-9.0, 6.25, 9.5),
      emergePosition: new THREE.Vector3(-6.6, 6.0, 8.5),
      type: 'bed'
    });

    // STARTING ROOM TIPPABLE TABLE + FRAGILE VASE (DETAILED MODEL)
    this.buildTippableTable(scene, -4.5, 6.0, 8.5);

    // DRESSER WITH 3D CAVITY DRAWERS THAT HOLD ITEMS
    this.buildDresserWithRealDrawers(scene, -3.2, 6.0, 3.8);

    // Wardrobe closet
    this.buildWardrobeCloset(scene, -13.5, 6.0, 5.0);

    // --- 4. HIDDEN PAINTING & SECRET AREA ---
    const painting = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.15), Assets.woodMat);
    painting.position.set(4.0, 8.8, -7.8);
    scene.add(painting);

    let paintingOpen = false;
    this.interactables.push({
      mesh: painting,
      prompt: '[E] Slide Painting',
      action: () => {
        paintingOpen = !paintingOpen;
        painting.position.x += paintingOpen ? 2.4 : -2.4;
        audio.playDoor();
        return paintingOpen ? 'Opened Secret Passage behind the painting!' : 'Closed picture frame.';
      }
    });

    // --- 5. GROUND FLOOR: FOYER & 4-TIER FRONT EXIT DOOR ---
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

    // --- 6. BASEMENT GARAGE & ESCAPE VEHICLE ---
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

    // --- 7. SPAWN ITEMS (ONE KEY IS STORED INSIDE THE DRESSER DRAWER) ---
    this.spawnPhysicsItem(scene, 'Hammer', new THREE.Vector3(8.0, 0.3, -8.0), 0.3);
    this.spawnPhysicsItem(scene, 'Keycard', new THREE.Vector3(-11.0, -5.7, 8.0), 0.15);
    this.spawnPhysicsItem(scene, 'Master Key', new THREE.Vector3(8.0, 11.8, 6.0), 0.15);
    this.spawnPhysicsItem(scene, 'Spark Plug', new THREE.Vector3(-6.0, 6.3, -1.0), 0.2);
    this.spawnPhysicsItem(scene, 'Car Battery', new THREE.Vector3(12.0, -5.7, -9.0), 0.4);
    this.spawnPhysicsItem(scene, 'Gasoline Can', new THREE.Vector3(10.0, -5.7, -5.0), 0.35);
    this.spawnPhysicsItem(scene, 'Car Key', new THREE.Vector3(-2.0, 0.3, 10.0), 0.15);
    this.spawnPhysicsItem(scene, 'Tranquilizer Crossbow', new THREE.Vector3(8.0, 6.3, 4.0), 0.4);
    this.spawnPhysicsItem(scene, 'Shotgun', new THREE.Vector3(-12.0, 0.3, -6.0), 0.45);
  },

  // TIPPABLE BEDSIDE TABLE WITH CROSS BRACES & AN ANTIQUE CRACKED VASE
  buildTippableTable(scene, x, y, z) {
    const tableGroup = new THREE.Group();

    // Tabletop with bevel
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 1.3), Assets.woodMat);
    top.position.y = 1.35;
    tableGroup.add(top);

    // Turned wooden legs
    const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.35, 8);
    const l1 = new THREE.Mesh(legGeo, Assets.woodMat); l1.position.set(0.5, 0.67, 0.5); tableGroup.add(l1);
    const l2 = new THREE.Mesh(legGeo, Assets.woodMat); l2.position.set(-0.5, 0.67, 0.5); tableGroup.add(l2);
    const l3 = new THREE.Mesh(legGeo, Assets.woodMat); l3.position.set(0.5, 0.67, -0.5); tableGroup.add(l3);
    const l4 = new THREE.Mesh(legGeo, Assets.woodMat); l4.position.set(-0.5, 0.67, -0.5); tableGroup.add(l4);

    // Lower storage shelf board
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 1.1), Assets.woodMat);
    shelf.position.y = 0.35;
    tableGroup.add(shelf);

    // Fragile Porcelain Vase
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

  // DRESSER WITH 3D HOLLOW CAVITY DRAWERS (CAN STORE AND CARRY ITEMS)
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

      // 1. Bottom tray plate
      const btm = new THREE.Mesh(new THREE.BoxGeometry(dW, 0.04, dD), Assets.frameMat);
      btm.position.set(0, 0.02, -dD / 2);
      drawerGroup.add(btm);

      // 2. Front face
      const front = new THREE.Mesh(new THREE.BoxGeometry(dW + 0.05, dH, 0.08), Assets.frameMat);
      front.position.set(0, dH / 2, 0);
      drawerGroup.add(front);

      // 3. Brass handle
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.08), Assets.metalMat);
      handle.position.set(0, dH / 2, 0.07);
      drawerGroup.add(handle);

      // 4. Side & back walls of tray
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

      // Put the Padlock Key inside the Top Drawer!
      if (i === 1) {
        const keyItem = this.spawnPhysicsItem(scene, 'Padlock Key', new THREE.Vector3(0, 0.08, -dD / 2), 0.15);
        drawerGroup.add(keyItem.group);
        keyItem.group.position.set(0, 0.08, -dD / 2);
      }

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
        if (inv.add(record)) {
          if (group.parent) group.parent.remove(group);
          record.inInventory = true;
          return `Picked up ${name}.`;
        }
        return 'Inventory is full!';
      }
    });
    return record;
  }
};
