/* =========================================================================
   GAME.JS - GRANNY AI OVERHAUL, DYNAMIC KICK PHYSICS, NAVMESH & CUTSCENE
   ========================================================================= */

// 1. WAYPOINT GRAPH FOR GRANNY NAVIGATION (NO WALL-HACKING, SMOOTH STAIRS)
const NavGraph = {
  nodes: {
    'bed_start': new THREE.Vector3(-8.5, 6.0, 8.5),
    'door_start': new THREE.Vector3(-5.5, 6.0, 2.5),
    'hall_mid': new THREE.Vector3(-2.0, 6.0, 2.5),
    'hall_east': new THREE.Vector3(4.0, 6.0, 2.5),
    'stairs_top': new THREE.Vector3(5.0, 6.0, 4.5),
    'stairs_mid': new THREE.Vector3(5.0, 3.0, 8.5),
    'stairs_bottom': new THREE.Vector3(5.0, 0.2, 13.5),
    'foyer': new THREE.Vector3(0.0, 0.2, 12.0),
    'front_door': new THREE.Vector3(0.0, 0.2, 16.0),
    'living_room': new THREE.Vector3(-8.0, 0.2, 8.0),
    'dining_room': new THREE.Vector3(-8.0, 0.2, -2.0),
    'kitchen': new THREE.Vector3(8.0, 0.2, -6.0),
    'stairs_down_top': new THREE.Vector3(-5.0, 0.2, -1.5),
    'stairs_down_mid': new THREE.Vector3(-5.0, -3.0, -6.0),
    'stairs_down_bot': new THREE.Vector3(-5.0, -5.8, -10.5),
    'garage_main': new THREE.Vector3(-7.0, -5.8, -6.0),
    'garage_east': new THREE.Vector3(4.0, -5.8, -6.0)
  },

  edges: {
    'bed_start': ['door_start'],
    'door_start': ['bed_start', 'hall_mid'],
    'hall_mid': ['door_start', 'hall_east'],
    'hall_east': ['hall_mid', 'stairs_top'],
    'stairs_top': ['hall_east', 'stairs_mid'],
    'stairs_mid': ['stairs_top', 'stairs_bottom'],
    'stairs_bottom': ['stairs_mid', 'foyer'],
    'foyer': ['stairs_bottom', 'front_door', 'living_room', 'stairs_down_top'],
    'front_door': ['foyer'],
    'living_room': ['foyer', 'dining_room'],
    'dining_room': ['living_room', 'kitchen'],
    'kitchen': ['dining_room'],
    'stairs_down_top': ['foyer', 'stairs_down_mid'],
    'stairs_down_mid': ['stairs_down_top', 'stairs_down_bot'],
    'stairs_down_bot': ['stairs_down_mid', 'garage_main'],
    'garage_main': ['stairs_down_bot', 'garage_east'],
    'garage_east': ['garage_main']
  },

  getNearestNode(pos) {
    let best = null;
    let minDist = Infinity;
    for (const [id, nodePos] of Object.entries(this.nodes)) {
      const d = pos.distanceTo(nodePos);
      if (d < minDist) {
        minDist = d;
        best = id;
      }
    }
    return best;
  },

  findPath(startPos, endPos) {
    const startNode = this.getNearestNode(startPos);
    const endNode = this.getNearestNode(endPos);

    if (startNode === endNode) {
      return [endPos.clone()];
    }

    const queue = [[startNode]];
    const visited = new Set([startNode]);

    while (queue.length > 0) {
      const path = queue.shift();
      const curr = path[path.length - 1];

      if (curr === endNode) {
        return path.map(id => this.nodes[id].clone()).concat([endPos.clone()]);
      }

      for (const neighbor of (this.edges[curr] || [])) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return [endPos.clone()];
  }
};

// 2. FIRST-PERSON HELD VIEWMODEL RIG
const Viewmodel = {
  group: new THREE.Group(),
  models: {},
  activeKey: null,
  loadedDart: null,

  init(camera) {
    camera.add(this.group);
    this.group.position.set(0.32, -0.28, -0.55);

    const bow = new THREE.Group();
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.65), Assets.woodMat);
    bow.add(stock);
    const prod = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.05), Assets.metalMat);
    prod.position.set(0, 0.03, -0.25);
    bow.add(prod);

    this.loadedDart = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), new THREE.MeshBasicMaterial({ color: 0x00ffcc }));
    this.loadedDart.rotation.x = Math.PI * 0.5;
    this.loadedDart.position.set(0, 0.06, -0.15);
    bow.add(this.loadedDart);
    this.models['Tranquilizer Crossbow'] = bow;

    const sg = new THREE.Group();
    const barrels = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), Assets.metalMat);
    barrels.rotation.x = Math.PI * 0.5;
    barrels.position.set(0, 0.05, -0.25);
    sg.add(barrels);
    const sgStock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.4), Assets.woodMat);
    sgStock.position.set(0, -0.02, 0.1);
    sg.add(sgStock);
    this.models['Shotgun'] = sg;

    const hm = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.46, 8), Assets.woodMat);
    hm.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.18), Assets.metalMat);
    head.position.set(0, 0.22, -0.03);
    hm.add(head);
    hm.rotation.x = 0.4;
    this.models['Hammer'] = hm;

    const gas = new THREE.Group();
    const gasBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.18), Assets.bloodMat);
    gas.add(gasBody);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6), Assets.metalMat);
    spout.position.set(0.08, 0.2, 0);
    gas.add(spout);
    this.models['Gasoline Can'] = gas;

    const key = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12), Assets.metalMat);
    key.add(ring);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), Assets.metalMat);
    stem.rotation.x = Math.PI * 0.5;
    stem.position.set(0, 0, -0.09);
    key.add(stem);
    this.models['GenericKey'] = key;

    Object.values(this.models).forEach(m => { m.visible = false; this.group.add(m); });
  },

  setHeldItem(itemName) {
    Object.values(this.models).forEach(m => m.visible = false);
    this.activeKey = itemName;
    if (!itemName) return;

    if (this.models[itemName]) {
      this.models[itemName].visible = true;
    } else if (itemName.includes('Key')) {
      this.models['GenericKey'].visible = true;
    }
  },

  animateBob(dt, isMoving) {
    if (isMoving) {
      const t = performance.now() * 0.008;
      this.group.position.x = 0.32 + Math.cos(t) * 0.015;
      this.group.position.y = -0.28 + Math.sin(t * 2) * 0.015;
    } else {
      this.group.position.set(0.32, -0.28, -0.55);
    }
  }
};

// 3. PLAYER CONTROLLER WITH INTRO CUTSCENE & NON-STICKING AABB COLLISION
const Player = {
  position: new THREE.Vector3(-6.6, 6.0, 8.5),
  velocity: new THREE.Vector3(),
  rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
  radius: 0.35,
  height: 1.75,
  health: 100,
  isCrouched: false,
  isHiding: false,
  isIntroPlaying: false,
  introTimer: 0,
  hidingSpot: null,
  speed: 4.6,
  crouchSpeed: 2.2,
  activeSlot: 0,
  isGrounded: false,

  init(camera, scene) {
    this.flashlight = new THREE.SpotLight(0xfff5e4, 2.6, 24, Math.PI * 0.24, 0.35, 1.2);
    scene.add(this.flashlight);
    scene.add(this.flashlight.target);
    Viewmodel.init(camera);
  },

  updateFlashlight(camera) {
    if (!this.flashlight) return;
    this.flashlight.position.copy(camera.position);
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
    this.flashlight.target.position.copy(camera.position).add(fwd);
  },

  prepareBedPose(camera) {
    this.isIntroPlaying = true;
    this.introTimer = 0;
    this.isHiding = false;
    this.position.set(-9.0, 6.0, 10.5);
    this.rotation.set(0.85, 0, 0);

    if (camera) {
      camera.position.set(-9.0, 7.65, 10.5);
      camera.quaternion.setFromEuler(this.rotation);
      this.updateFlashlight(camera);
    }
  },

  startWakeUpIntro() {
    this.isIntroPlaying = true;
    this.introTimer = 0;
    this.isHiding = false;

    const eyelid = document.getElementById('eyelid-overlay');
    eyelid.style.opacity = '0.9';

    setTimeout(() => { eyelid.style.opacity = '0.3'; }, 400);
    setTimeout(() => { eyelid.style.opacity = '0.85'; }, 800);
    setTimeout(() => { eyelid.style.opacity = '0.0'; }, 1300);
  },

  update(dt, camera) {
    if (this.isIntroPlaying) {
      this.introTimer += dt;

      if (this.introTimer < 1.5) {
        camera.position.set(-9.0, 7.65, 10.5);
        this.rotation.x = 0.85 - Math.sin(this.introTimer * 2.5) * 0.08;
        this.rotation.y = Math.cos(this.introTimer * 1.8) * 0.18;
        this.rotation.z = Math.sin(this.introTimer * 2.0) * 0.06;
      } else if (this.introTimer < 3.2) {
        const t = (this.introTimer - 1.5) / 1.7;
        camera.position.x = THREE.MathUtils.lerp(-9.0, -8.3, t);
        camera.position.y = THREE.MathUtils.lerp(7.65, 7.5, t);
        camera.position.z = THREE.MathUtils.lerp(10.5, 9.4, t);

        this.rotation.x = THREE.MathUtils.lerp(0.85, 0.0, t);
        this.rotation.y = THREE.MathUtils.lerp(0.0, -Math.PI * 0.5, t);
        this.rotation.z = THREE.MathUtils.lerp(this.rotation.z, 0.0, t);
      } else if (this.introTimer < 4.4) {
        const t = (this.introTimer - 3.2) / 1.2;
        camera.position.x = THREE.MathUtils.lerp(-8.3, -6.6, t);
        camera.position.y = THREE.MathUtils.lerp(7.5, 7.62, t);
        camera.position.z = THREE.MathUtils.lerp(9.4, 8.5, t);
      } else {
        this.isIntroPlaying = false;
        this.position.set(-6.6, 6.0, 8.5);
        this.velocity.set(0, 0, 0);

        document.getElementById('hud').style.display = 'block';
        if (document.getElementById('opt-mobile-mode').checked) {
          document.getElementById('mobile-controls').style.display = 'block';
        } else {
          document.getElementById('click-to-focus').style.display = 'flex';
        }
      }

      camera.quaternion.setFromEuler(this.rotation);
      this.updateFlashlight(camera);
      return;
    }

    if (this.isHiding) {
      if (this.hidingSpot) {
        camera.position.copy(this.hidingSpot.position);
      }
      camera.quaternion.setFromEuler(this.rotation);
      this.updateFlashlight(camera);
      return;
    }

    const curSpeed = this.isCrouched ? this.crouchSpeed : this.speed;
    const move = new THREE.Vector3();
    if (Input.keys['KeyW']) move.z -= 1;
    if (Input.keys['KeyS']) move.z += 1;
    if (Input.keys['KeyA']) move.x -= 1;
    if (Input.keys['KeyD']) move.x += 1;

    if (Input.touchMoveDir.lengthSq() > 0.01) {
      move.x += Input.touchMoveDir.x;
      move.z += Input.touchMoveDir.y;
    }

    const isMoving = move.lengthSq() > 0.01;
    if (isMoving) {
      move.normalize();
      move.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
    }

    this.velocity.y -= 22 * dt;
    if (this.velocity.y < -30) this.velocity.y = -30;

    const dx = move.x * curSpeed * dt;
    const dz = move.z * curSpeed * dt;
    const dy = this.velocity.y * dt;

    if (dx !== 0) this.moveAxis(dx, 0);
    if (dz !== 0) this.moveAxis(dz, 2);

    this.moveVertical(dy);

    const eyeHeight = this.isCrouched ? 0.95 : 1.62;
    camera.position.set(this.position.x, this.position.y + eyeHeight, this.position.z);
    camera.quaternion.setFromEuler(this.rotation);

    this.updateFlashlight(camera);
    Viewmodel.animateBob(dt, isMoving);

    // Dynamic Prop & Item Collisions
    this.checkDynamicCollisions(move, curSpeed);
  },

  checkDynamicCollisions(moveDir, speed) {
    // 1. Kick/push dynamic items on the floor
    for (const item of House.physicsItems) {
      if (item.inInventory) continue;
      const d = new THREE.Vector2(this.position.x - item.group.position.x, this.position.z - item.group.position.z);
      const dist = d.length();
      const minDist = this.radius + item.radius;

      if (dist < minDist && dist > 0.01) {
        d.normalize();
        const pushForce = Math.max(speed * 0.8, 2.5);
        item.velocity.x -= d.x * pushForce;
        item.velocity.z -= d.y * pushForce;
        audio.playItemDrop(item.name, pushForce);
        MonsterAI.hearNoise(item.group.position, 10);
      }
    }

    // 2. Tippable Bedside Table Knockdown Check
    for (const prop of House.dynamicProps) {
      if (prop.type === 'table' && !prop.isTipped) {
        const d = new THREE.Vector2(this.position.x - prop.group.position.x, this.position.z - prop.group.position.z);
        const dist = d.length();

        if (dist < (this.radius + prop.radius)) {
          d.normalize();
          prop.isTipped = true;
          prop.rotVel = Math.PI * 1.5;
          prop.velocity.set(-d.x * 2.0, 0, -d.y * 2.0);

          audio.playItemDrop('Table', 6.0);
          MonsterAI.hearNoise(prop.group.position, 25);
          showPrompt('You knocked over the table!');
        }
      }
    }
  },

  moveAxis(delta, axisIndex) {
    const target = this.position.clone();
    if (axisIndex === 0) target.x += delta;
    if (axisIndex === 2) target.z += delta;

    const pMinX = target.x - this.radius;
    const pMaxX = target.x + this.radius;
    const pMinZ = target.z - this.radius;
    const pMaxZ = target.z + this.radius;
    const pMinY = target.y;
    const pMaxY = target.y + (this.isCrouched ? 1.0 : this.height);
    const maxStepHeight = 0.48;

    let stepUpY = target.y;

    for (const box of CollisionWorld.boxes) {
      const xOverlap = pMinX < box.max.x && pMaxX > box.min.x;
      const zOverlap = pMinZ < box.max.z && pMaxZ > box.min.z;

      if (xOverlap && zOverlap) {
        if (box.max.y <= pMinY + 0.06) continue;
        if (box.min.y >= pMaxY - 0.06) continue;

        const heightDiff = box.max.y - pMinY;
        if (heightDiff > 0.06 && heightDiff <= maxStepHeight) {
          if (box.max.y > stepUpY) stepUpY = box.max.y;
          continue;
        }
        return;
      }
    }

    if (axisIndex === 0) this.position.x = target.x;
    if (axisIndex === 2) this.position.z = target.z;
    this.position.y = stepUpY;
  },

  moveVertical(dy) {
    const targetY = this.position.y + dy;
    const pMinX = this.position.x - this.radius;
    const pMaxX = this.position.x + this.radius;
    const pMinZ = this.position.z - this.radius;
    const pMaxZ = this.position.z + this.radius;
    const pHeight = this.isCrouched ? 1.0 : this.height;

    this.isGrounded = false;

    if (dy <= 0) {
      let highestFloor = -999;
      for (const box of CollisionWorld.boxes) {
        if (pMinX < box.max.x && pMaxX > box.min.x && pMinZ < box.max.z && pMaxZ > box.min.z) {
          if (box.max.y <= this.position.y + 0.15 && box.max.y >= targetY - 0.1) {
            if (box.max.y > highestFloor) highestFloor = box.max.y;
          }
        }
      }

      if (highestFloor > -900) {
        this.position.y = highestFloor;
        this.velocity.y = 0;
        this.isGrounded = true;
        return;
      }
      this.position.y = targetY;
    } else {
      for (const box of CollisionWorld.boxes) {
        if (pMinX < box.max.x && pMaxX > box.min.x && pMinZ < box.max.z && pMaxZ > box.min.z) {
          if (box.min.y >= this.position.y + pHeight && box.min.y <= targetY + pHeight) {
            this.velocity.y = 0;
            this.position.y = box.min.y - pHeight;
            return;
          }
        }
      }
      this.position.y = targetY;
    }
  },

  fireWeapon(camera) {
    const cur = Inventory.items[this.activeSlot];
    if (!cur) return;

    if (cur.name === 'Tranquilizer Crossbow') {
      audio.playCrossbow();
      Viewmodel.loadedDart.visible = false;
      setTimeout(() => { Viewmodel.loadedDart.visible = true; }, 1200);

      if (MonsterAI.mesh && camera.position.distanceTo(MonsterAI.mesh.position) < 18) {
        MonsterAI.stun(MonsterAI.getStunDuration());
      }
      NetworkEngine.sendShot(camera.position, new THREE.Vector3(0, 0, -1).applyEuler(this.rotation), 40, 'dart');
    } else if (cur.name === 'Shotgun') {
      audio.playShotgun();
      if (MonsterAI.mesh && camera.position.distanceTo(MonsterAI.mesh.position) < 10) {
        MonsterAI.stun(MonsterAI.getStunDuration());
      }
      NetworkEngine.sendShot(camera.position, new THREE.Vector3(0, 0, -1).applyEuler(this.rotation), 100, 'shotgun');
    }
  },

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    document.getElementById('health-bar-fill').style.width = `${this.health}%`;
    if (this.health <= 0) {
      triggerJumpscare();
      this.health = 100;
      document.getElementById('health-bar-fill').style.width = '100%';
    }
  }
};

// 4. INVENTORY ENGINE
const Inventory = {
  items: [null, null, null, null, null],

  add(itemRecord) {
    for (let i = 0; i < 5; i++) {
      if (!this.items[i]) {
        this.items[i] = itemRecord;
        this.render();
        this.syncViewmodel();
        return true;
      }
    }
    return false;
  },

  remove(name) {
    for (let i = 0; i < 5; i++) {
      if (this.items[i] && this.items[i].name === name) {
        this.items[i] = null;
        this.render();
        this.syncViewmodel();
        return true;
      }
    }
    return false;
  },

  has(name) {
    return this.items.some(it => it && it.name === name);
  },

  dropCurrent(camera, scene) {
    const cur = this.items[Player.activeSlot];
    if (!cur) return;

    this.items[Player.activeSlot] = null;
    this.render();
    this.syncViewmodel();

    const fwd = new THREE.Vector3(0, 0, -1.2).applyEuler(Player.rotation);
    const dropPos = camera.position.clone().add(fwd);
    cur.group.position.copy(dropPos);
    scene.add(cur.group);
    cur.inInventory = false;

    cur.velocity.copy(fwd.clone().multiplyScalar(4).add(new THREE.Vector3(0, 1.8, 0)));
    cur.isGrounded = false;
  },

  selectSlot(idx) {
    Player.activeSlot = (idx + 5) % 5;
    for (let i = 0; i < 5; i++) {
      document.getElementById(`slot-${i}`).classList.toggle('active', i === Player.activeSlot);
    }
    this.syncViewmodel();
  },

  syncViewmodel() {
    const it = this.items[Player.activeSlot];
    Viewmodel.setHeldItem(it ? it.name : null);
  },

  render() {
    for (let i = 0; i < 5; i++) {
      const slotEl = document.getElementById(`slot-${i}`).querySelector('.slot-name');
      slotEl.innerText = this.items[i] ? this.items[i].name : 'EMPTY';
    }
  }
};

// 5. UPDATE PROPS, ITEMS & DOORS INTERPOLATION
function updatePhysicsAndWorld(dt) {
  // A. Interpolate open/close animated doors
  for (const door of House.doors) {
    if (Math.abs(door.currentAngle - door.targetAngle) > 0.01) {
      door.currentAngle = THREE.MathUtils.damp(door.currentAngle, door.targetAngle, 10, dt);
      door.pivot.rotation.y = door.currentAngle;
    }
  }

  // B. Interpolate drawers
  for (const drawer of House.drawers) {
    if (Math.abs(drawer.currentZ - drawer.targetZ) > 0.005) {
      drawer.currentZ = THREE.MathUtils.damp(drawer.currentZ, drawer.targetZ, 8, dt);
      drawer.group.position.z = drawer.currentZ;
    }
  }

  // C. Dynamic Tippable Table Physics
  for (const prop of House.dynamicProps) {
    if (prop.type === 'table') {
      if (prop.isTipped && prop.group.rotation.z < Math.PI * 0.5) {
        prop.group.rotation.z += prop.rotVel * dt;
        prop.group.position.addScaledVector(prop.velocity, dt);
        prop.velocity.multiplyScalar(0.92);

        if (prop.vaseMesh) {
          prop.vaseMesh.position.y = Math.max(0.1, prop.vaseMesh.position.y - 4.0 * dt);
        }
      }
    }
  }

  // D. Dynamic Items on Ground
  for (const item of House.physicsItems) {
    if (item.inInventory) continue;

    if (!item.isGrounded) {
      item.velocity.y -= 18 * dt;
      item.group.position.addScaledVector(item.velocity, dt);

      const pos = item.group.position;
      for (const box of CollisionWorld.boxes) {
        if (pos.x >= box.min.x && pos.x <= box.max.x && pos.z >= box.min.z && pos.z <= box.max.z) {
          if (pos.y <= box.max.y + 0.15 && pos.y >= box.min.y) {
            pos.y = box.max.y + 0.08;
            item.isGrounded = true;
            item.velocity.set(0, 0, 0);
            audio.playItemDrop(item.name, 3.0);
            MonsterAI.hearNoise(pos, 12);
            break;
          }
        }
      }
    } else {
      // Horizontal friction when sliding
      if (item.velocity.lengthSq() > 0.01) {
        item.group.position.x += item.velocity.x * dt;
        item.group.position.z += item.velocity.z * dt;
        item.velocity.multiplyScalar(0.9);
      }
    }
  }
}

// 6. GRANNY AI: NAVMESH PATHFINDING & CONE VISION (NO WALL-HACKING)
const MonsterAI = {
  mesh: null,
  state: 'PATROL',
  speed: 2.3,
  chaseSpeed: 3.9,
  visionRange: 14.0,
  visionAngle: Math.PI * 0.42,
  hearingRadiusMod: 1.0,
  stunTimer: 0,
  currentPath: [],
  targetPos: new THREE.Vector3(),
  searchTimer: 0,
  patrolNodes: ['hall_mid', 'hall_east', 'stairs_top', 'foyer', 'living_room', 'dining_room', 'kitchen', 'garage_main'],
  patrolIdx: 0,

  init(scene) {
    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0x999990, roughness: 0.9 }));
    torso.position.y = 1.3;
    torso.rotation.x = 0.15;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), Assets.skinMat);
    head.position.set(0, 2.3, 0.15);
    g.add(head);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), Assets.bloodMat);
    eye.position.set(-0.12, 2.35, 0.45);
    const eye2 = eye.clone(); eye2.position.x = 0.12;
    g.add(eye); g.add(eye2);

    const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.4, 6), Assets.woodMat);
    bat.position.set(0.6, 1.2, 0.4);
    bat.rotation.set(0.4, 0, -0.5);
    g.add(bat);

    g.position.set(0, 0.2, 12.0);
    scene.add(g);
    this.mesh = g;

    this.applyDifficultySettings();
  },

  applyDifficultySettings() {
    const d = GameState.difficulty || 'normal';
    if (d === 'easy') {
      this.speed = 1.8;
      this.chaseSpeed = 2.9;
      this.visionRange = 10.0;
      this.visionAngle = Math.PI * 0.33;
      this.hearingRadiusMod = 0.7;
    } else if (d === 'normal') {
      this.speed = 2.3;
      this.chaseSpeed = 3.9;
      this.visionRange = 14.0;
      this.visionAngle = Math.PI * 0.42;
      this.hearingRadiusMod = 1.0;
    } else if (d === 'hard') {
      this.speed = 2.8;
      this.chaseSpeed = 4.8;
      this.visionRange = 18.0;
      this.visionAngle = Math.PI * 0.50;
      this.hearingRadiusMod = 1.3;
    } else if (d === 'extreme') {
      this.speed = 3.3;
      this.chaseSpeed = 5.5;
      this.visionRange = 22.0;
      this.visionAngle = Math.PI * 0.60;
      this.hearingRadiusMod = 1.6;
    }
  },

  getStunDuration() {
    const d = GameState.difficulty || 'normal';
    if (d === 'easy') return 150;
    if (d === 'normal') return 120;
    if (d === 'hard') return 90;
    return 60;
  },

  hasLineOfSightToPlayer() {
    if (Player.isHiding || Player.isIntroPlaying) return false;

    const toPlayer = new THREE.Vector3().subVectors(Player.position, this.mesh.position);
    const dist = toPlayer.length();
    if (dist > this.visionRange) return false;

    // Check Granny's Forward Facing Direction
    const fwd = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation);
    toPlayer.normalize();

    // Field-Of-View Check: If her back is turned, she CANNOT see you!
    const angle = fwd.angleTo(toPlayer);
    if (angle > this.visionAngle) return false;

    // Raycast Line of Sight Obstacle Check (Walls & Closed Doors)
    const ray = new THREE.Ray(
      new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 1.8, this.mesh.position.z),
      toPlayer
    );

    for (const box of CollisionWorld.boxes) {
      if (box.intersectsRay(ray)) {
        const hitDist = ray.origin.distanceTo(box.clampPoint(ray.origin, new THREE.Vector3()));
        if (hitDist < dist - 0.5) return false; // Blocked by wall!
      }
    }
    return true;
  },

  hearNoise(pos, radius) {
    if (this.state === 'STUNNED') return;
    const effectiveRadius = radius * this.hearingRadiusMod;
    const dist = this.mesh.position.distanceTo(pos);

    if (dist <= effectiveRadius) {
      this.targetPos.copy(pos);
      this.currentPath = NavGraph.findPath(this.mesh.position, pos);
      this.state = 'INVESTIGATE';
      audio.triggerTungSahurPattern();
    }
  },

  stun(duration) {
    this.state = 'STUNNED';
    this.stunTimer = duration;
    audio.stopChase();
    audio.playTung();
  },

  update(dt) {
    if (!this.mesh) return;

    if (this.state === 'STUNNED') {
      this.stunTimer -= dt;
      this.mesh.rotation.z = 1.3;
      if (this.stunTimer <= 0) {
        this.mesh.rotation.z = 0;
        this.state = 'PATROL';
        this.pickNextPatrolNode();
      }
      return;
    }

    const canSee = this.hasLineOfSightToPlayer();

    // State Machine Transitions
    if (canSee) {
      if (this.state !== 'CHASE') {
        this.state = 'CHASE';
        audio.startChase();
      }
      this.targetPos.copy(Player.position);
      this.currentPath = [Player.position.clone()];
    } else if (this.state === 'CHASE') {
      // Lost Sight -> Move to Last Seen Coordinate
      this.state = 'SEARCH_LAST_SEEN';
      audio.stopChase();
      this.currentPath = NavGraph.findPath(this.mesh.position, this.targetPos);
      this.searchTimer = 4.0;
    }

    // Path Navigation Following
    let spd = (this.state === 'CHASE') ? this.chaseSpeed : this.speed;

    if (this.currentPath.length > 0) {
      const nextWaypoint = this.currentPath[0];
      const dir = new THREE.Vector3().subVectors(nextWaypoint, this.mesh.position);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 0.8) {
        this.currentPath.shift();
        if (this.currentPath.length === 0) {
          if (this.state === 'SEARCH_LAST_SEEN' || this.state === 'INVESTIGATE') {
            this.state = 'LOOK_AROUND';
            this.searchTimer = 3.5;
          } else if (this.state === 'PATROL') {
            this.pickNextPatrolNode();
          }
        }
      } else {
        dir.normalize();
        this.mesh.position.x += dir.x * spd * dt;
        this.mesh.position.z += dir.z * spd * dt;
        this.mesh.position.y = THREE.MathUtils.damp(this.mesh.position.y, nextWaypoint.y, 6, dt);
        this.mesh.rotation.y = THREE.MathUtils.damp(this.mesh.rotation.y, Math.atan2(dir.x, dir.z), 8, dt);
      }
    } else if (this.state === 'LOOK_AROUND') {
      this.searchTimer -= dt;
      this.mesh.rotation.y += Math.sin(this.searchTimer * 2) * 0.03;
      if (this.searchTimer <= 0) {
        this.state = 'PATROL';
        this.pickNextPatrolNode();
      }
    } else if (this.state === 'PATROL') {
      this.pickNextPatrolNode();
    }

    // Catch Player Check
    const distToPlayer = this.mesh.position.distanceTo(Player.position);
    if (distToPlayer < 1.4 && !Player.isHiding && !Player.isIntroPlaying && this.state !== 'STUNNED') {
      triggerJumpscare();
    }
  },

  pickNextPatrolNode() {
    this.patrolIdx = (this.patrolIdx + 1) % this.patrolNodes.length;
    const nodeId = this.patrolNodes[this.patrolIdx];
    const target = NavGraph.nodes[nodeId];
    this.currentPath = NavGraph.findPath(this.mesh.position, target);
  }
};

// 7. INPUT & POINTER LOCK
const Input = {
  keys: {},
  mouseSens: 0.0022,
  invertY: 1,
  touchMoveDir: new THREE.Vector2(),

  init(container, camera, scene) {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE') doInteract(camera);
      if (e.code === 'KeyG') Inventory.dropCurrent(camera, scene);
      if (e.code === 'KeyC') toggleCrouch();
      if (e.code >= 'Digit1' && e.code <= 'Digit5') {
        Inventory.selectSlot(parseInt(e.code.replace('Digit', '')) - 1);
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    window.addEventListener('wheel', (e) => {
      if (e.deltaY > 0) Inventory.selectSlot(Player.activeSlot + 1);
      else if (e.deltaY < 0) Inventory.selectSlot(Player.activeSlot - 1);
    });

    window.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement === container && e.button === 0) {
        Player.fireWeapon(camera);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === container) {
        Player.rotation.y -= e.movementX * this.mouseSens;
        Player.rotation.x -= e.movementY * this.mouseSens * this.invertY;
        const maxPitch = Player.isHiding ? 0.5 : Math.PI * 0.45;
        Player.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, Player.rotation.x));
      }
    });

    document.getElementById('click-to-focus').onclick = () => {
      container.requestPointerLock();
    };
    document.addEventListener('pointerlockchange', () => {
      const isLocked = document.pointerLockElement === container;
      const inGame = document.getElementById('hud').style.display === 'block';
      document.getElementById('click-to-focus').style.display =
        (inGame && !isLocked && !document.getElementById('opt-mobile-mode').checked && !Player.isIntroPlaying) ? 'flex' : 'none';
    });

    for (let i = 0; i < 5; i++) {
      document.getElementById(`slot-${i}`).onclick = () => Inventory.selectSlot(i);
    }

    this.setupTouchControls(camera, scene);
  },

  setupTouchControls(camera, scene) {
    const bind = (zoneId, knobId, cb) => {
      const zone = document.getElementById(zoneId);
      const knob = document.getElementById(knobId);
      let touchId = null, center = { x: 0, y: 0 };

      zone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        touchId = t.identifier;
        const r = zone.getBoundingClientRect();
        center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, { passive: false });

      zone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === touchId) {
            const dx = t.clientX - center.x;
            const dy = t.clientY - center.y;
            const dist = Math.min(45, Math.hypot(dx, dy));
            const angle = Math.atan2(dy, dx);
            const kx = Math.cos(angle) * dist;
            const ky = Math.sin(angle) * dist;
            knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
            cb(kx / 45, ky / 45);
          }
        }
      }, { passive: false });

      const end = (e) => {
        e.preventDefault();
        touchId = null;
        knob.style.transform = 'translate(-50%, -50%)';
        cb(0, 0);
      };
      zone.addEventListener('touchend', end, { passive: false });
      zone.addEventListener('touchcancel', end, { passive: false });
    };

    bind('touch-move', 'knob-move', (x, y) => { this.touchMoveDir.set(x, y); });
    bind('touch-look', 'knob-look', (x, y) => {
      Player.rotation.y -= x * 0.04;
      Player.rotation.x -= y * 0.04 * this.invertY;
      Player.rotation.x = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, Player.rotation.x));
    });

    document.getElementById('m-btn-use').onclick = () => doInteract(camera);
    document.getElementById('m-btn-drop').onclick = () => Inventory.dropCurrent(camera, scene);
    document.getElementById('m-btn-crouch').onclick = toggleCrouch;
    document.getElementById('m-btn-fire').onclick = () => Player.fireWeapon(camera);
  }
};

function toggleCrouch() {
  if (Player.isHiding) {
    emergeFromHiding();
    return;
  }
  Player.isCrouched = !Player.isCrouched;
  const ind = document.getElementById('stealth-indicator');
  ind.innerText = Player.isCrouched ? 'STEALTH: CROUCHED' : 'STEALTH: STANDING';
}

function emergeFromHiding() {
  if (Player.hidingSpot && Player.hidingSpot.emergePosition) {
    Player.position.copy(Player.hidingSpot.emergePosition);
  }
  Player.isHiding = false;
  document.getElementById('stealth-indicator').innerText = 'STEALTH: STANDING';
  document.getElementById('stealth-indicator').classList.remove('hidden');
  showPrompt('Emerged from hiding space.');
}

function doInteract(camera) {
  audio.init();
  if (Player.isHiding) {
    emergeFromHiding();
    return;
  }

  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const meshes = House.interactables.map(o => o.mesh);
  const hits = ray.intersectObjects(meshes, true);

  if (hits.length > 0 && hits[0].distance < 3.2) {
    const hitObj = hits[0].object;
    const target = House.interactables.find(o => o.mesh === hitObj || o.mesh === hitObj.parent);
    if (target) {
      const msg = target.action(Inventory);
      showPrompt(msg || 'Interacted.');
    }
    return;
  }

  for (const spot of House.hidingSpots) {
    if (Player.position.distanceTo(spot.position) < 2.5) {
      Player.isHiding = true;
      Player.hidingSpot = spot;
      document.getElementById('stealth-indicator').innerText = `STEALTH: UNDER ${spot.type.toUpperCase()}`;
      document.getElementById('stealth-indicator').classList.add('hidden');
      showPrompt(`Hiding under ${spot.type}. Rotate mouse to look around! Press [C] or [E] to emerge.`);
      return;
    }
  }
}

function showPrompt(text) {
  const p = document.getElementById('interaction-prompt');
  p.innerText = text;
  p.style.display = 'block';
  clearTimeout(p._t);
  p._t = setTimeout(() => { p.style.display = 'none'; }, 2400);
}

// 8. DAY PROGRESSION & JUMPSCARE SEQUENCE
function triggerJumpscare() {
  audio.stopChase();
  audio.playJumpscare();
  const overlay = document.getElementById('jumpscare-overlay');
  overlay.style.display = 'block';

  setTimeout(() => {
    overlay.style.display = 'none';
    GameState.day++;
    if (GameState.day > GameState.maxDays) {
      alert('THE 5 DAYS ARE OVER. You failed to escape.');
      window.location.reload();
    } else {
      respawnPlayer();
    }
  }, 1400);
}

function respawnPlayer() {
  Player.health = 100;
  document.getElementById('health-bar-fill').style.width = '100%';
  MonsterAI.mesh.position.set(0, 0.2, 12.0);
  MonsterAI.state = 'PATROL';
  showDaySequence();
}

function showDaySequence() {
  document.getElementById('hud').style.display = 'none';
  document.getElementById('mobile-controls').style.display = 'none';
  document.getElementById('click-to-focus').style.display = 'none';

  const splash = document.getElementById('day-splash');
  splash.style.transition = 'none';
  splash.style.display = 'flex';
  splash.style.opacity = '1';

  document.getElementById('day-title').innerText = `DAY ${GameState.day}`;
  document.getElementById('day-subtitle').innerText =
    GameState.day === 1 ? 'Find a way out before she catches you.' :
    GameState.day === 5 ? 'FINAL DAY. She will not spare you.' :
    'You woke up with a pounding headache.';

  Player.prepareBedPose(camera);

  setTimeout(() => {
    splash.style.transition = 'opacity 1.0s ease';
    splash.style.opacity = '0';

    setTimeout(() => {
      splash.style.display = 'none';
      Player.startWakeUpIntro();
    }, 1000);
  }, 2200);
}

function triggerVictory(method) {
  alert(`VICTORY! ${method}`);
  window.location.reload();
}

// 9. SETTINGS & UI CONTROLLER
const SettingsEngine = {
  init(renderer, camera, scene) {
    const fovEl = document.getElementById('opt-fov');
    fovEl.oninput = (e) => {
      camera.fov = parseFloat(e.target.value);
      camera.updateProjectionMatrix();
      document.getElementById('opt-fov-val').innerText = `${e.target.value}°`;
    };

    const gammaEl = document.getElementById('opt-gamma');
    gammaEl.oninput = (e) => {
      const v = parseFloat(e.target.value);
      scene.children.forEach(c => {
        if (c.isAmbientLight) c.intensity = 0.28 * v;
      });
      document.getElementById('opt-gamma-val').innerText = `${v.toFixed(1)}`;
    };

    const resEl = document.getElementById('opt-res');
    resEl.oninput = (e) => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, parseFloat(e.target.value)));
      document.getElementById('opt-res-val').innerText = `${e.target.value}x`;
    };

    const fogEl = document.getElementById('opt-fog');
    fogEl.onchange = (e) => {
      const v = e.target.value;
      if (v === 'none') scene.fog.density = 0;
      else if (v === 'light') scene.fog.density = 0.04;
      else if (v === 'normal') scene.fog.density = 0.07;
      else if (v === 'heavy') scene.fog.density = 0.12;
    };

    const sensEl = document.getElementById('opt-sens');
    sensEl.oninput = (e) => {
      Input.mouseSens = 0.0022 * parseFloat(e.target.value);
      document.getElementById('opt-sens-val').innerText = `${e.target.value}`;
    };

    document.getElementById('opt-inverty').onchange = (e) => {
      Input.invertY = e.target.checked ? -1 : 1;
    };

    document.getElementById('opt-crosshair').onchange = (e) => {
      document.getElementById('crosshair').className = e.target.value;
    };

    document.getElementById('opt-mobile-mode').onchange = (e) => {
      const inGame = document.getElementById('hud').style.display === 'block';
      if (inGame) {
        document.getElementById('mobile-controls').style.display = e.target.checked ? 'block' : 'none';
        if (!e.target.checked) document.getElementById('click-to-focus').style.display = 'flex';
      }
    };

    const updateVols = () => {
      const m = parseFloat(document.getElementById('opt-vol-master').value);
      const s = parseFloat(document.getElementById('opt-vol-sfx').value);
      const mu = parseFloat(document.getElementById('opt-vol-music').value);
      audio.setVolumes(m, s, mu);
    };
    document.getElementById('opt-vol-master').oninput = updateVols;
    document.getElementById('opt-vol-sfx').oninput = updateVols;
    document.getElementById('opt-vol-music').oninput = updateVols;

    ['gfx', 'ctrl', 'audio', 'prof'].forEach(tab => {
      document.getElementById(`tab-btn-${tab}`).onclick = () => {
        ['gfx', 'ctrl', 'audio', 'prof'].forEach(t => {
          document.getElementById(`tab-btn-${t}`).classList.toggle('active', t === tab);
          document.getElementById(`tab-${t}`).style.display = (t === tab) ? 'block' : 'none';
        });
      };
    });
  }
};

// 10. MULTIPLAYER NETWORKING
const NetworkEngine = {
  client: null,
  isHost: false,
  myId: 'survivor_' + Math.random().toString(36).substring(2, 9),
  roomCode: '',
  roomName: '',
  maxPlayers: 8,
  peers: {},

  init(scene) {
    const pill = document.getElementById('net-status-pill');
    try {
      this.client = new Paho.MQTT.Client('broker.hivemq.com', 8884, this.myId);
      this.client.onConnectionLost = () => {
        pill.innerText = 'STATUS: RECONNECTING TO CLUSTER...';
        pill.style.color = '#ffaa00';
        setTimeout(() => this.init(scene), 3000);
      };
      this.client.onMessageArrived = (msg) => {
        this.handlePacket(scene, msg.destinationName, JSON.parse(msg.payloadString));
      };
      this.client.connect({
        useSSL: true,
        timeout: 6,
        onSuccess: () => {
          pill.innerText = '● CONNECTED TO GLOBAL MULTIPLAYER (Live Across Devices)';
          pill.style.color = '#00ffaa';
          this.client.subscribe('granny_v4_lobbies/#');
        }
      });
    } catch (e) {}
  },

  broadcast(topic, data) {
    if (this.client && this.client.isConnected()) {
      const msg = new Paho.MQTT.Message(JSON.stringify(data));
      msg.destinationName = topic;
      this.client.send(msg);
    }
  },

  handlePacket(scene, topic, data) {
    if (data.sender === this.myId) return;

    if (topic === 'granny_v4_lobbies/announce') {
      renderLobbyCard(data);
    } else if (topic === 'granny_v4_lobbies/query' && this.isHost) {
      this.announce();
    } else if (topic === `granny_v4_room/${this.roomCode}`) {
      if (data.type === 'JOIN') {
        this.peers[data.sender] = { name: data.name, wardrobe: data.wardrobe, pos: new THREE.Vector3() };
        updateRoomUI();
        if (this.isHost) this.announce();
      } else if (data.type === 'START') {
        startGame();
      } else if (data.type === 'SYNC') {
        this.updateRemoteSurvivor(scene, data.sender, data);
      } else if (data.type === 'SHOT') {
        const hitPos = new THREE.Vector3(data.x, data.y, data.z);
        if (Player.position.distanceTo(hitPos) < 2.2) {
          Player.takeDamage(data.dmg);
          showPrompt(`Hit by friendly fire ${data.weapon}! -${data.dmg} HP`);
        }
      }
    }
  },

  announce() {
    this.broadcast('granny_v4_lobbies/announce', {
      code: this.roomCode,
      name: this.roomName,
      count: Object.keys(this.peers).length + 1,
      max: this.maxPlayers
    });
  },

  updateRemoteSurvivor(scene, id, data) {
    if (!this.peers[id] || !this.peers[id].mesh) {
      const g = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: data.wardrobe ? data.wardrobe.shirt : 0x335577 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.1, 8), bodyMat);
      body.position.y = 0.9;
      g.add(body);

      const headMat = new THREE.MeshStandardMaterial({ color: data.wardrobe ? data.wardrobe.skin : 0xd8b28a });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), headMat);
      head.position.y = 1.65;
      g.add(head);

      scene.add(g);
      this.peers[id] = { mesh: g, name: data.name };
    }

    const p = this.peers[id];
    if (p.mesh) {
      p.mesh.position.set(data.x, data.y, data.z);
      p.mesh.rotation.y = data.rotY;

      if (Player.position.distanceTo(p.mesh.position) < 0.8) {
        const push = new THREE.Vector3().subVectors(Player.position, p.mesh.position).normalize().multiplyScalar(0.08);
        Player.position.add(push);
      }
    }
  },

  sendShot(origin, dir, dmg, weapon) {
    if (GameState.mode === 'mp') {
      const hitTarget = origin.clone().add(dir.multiplyScalar(8));
      this.broadcast(`granny_v4_room/${this.roomCode}`, {
        type: 'SHOT',
        sender: this.myId,
        x: hitTarget.x, y: hitTarget.y, z: hitTarget.z,
        dmg, weapon
      });
    }
  },

  tickSync() {
    if (GameState.mode === 'mp' && this.roomCode) {
      this.broadcast(`granny_v4_room/${this.roomCode}`, {
        type: 'SYNC',
        sender: this.myId,
        name: document.getElementById('prof-name').value,
        x: Player.position.x,
        y: Player.position.y,
        z: Player.position.z,
        rotY: Player.rotation.y,
        wardrobe: {
          shirt: document.getElementById('wardrobe-shirt').value,
          skin: document.getElementById('wardrobe-skin').value
        }
      });
    }
  }
};

// 11. RUNTIME INITIALIZATION & GAME LOOP
const GameState = { mode: 'sp', difficulty: 'normal', day: 1, maxDays: 5 };

const canvasContainer = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040404);
scene.fog = new THREE.FogExp2(0x040404, 0.07);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 70);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
canvasContainer.appendChild(renderer.domElement);

const ambLight = new THREE.AmbientLight(0x282828);
scene.add(ambLight);

House.build(scene);
Player.init(camera, scene);
MonsterAI.init(scene);
Input.init(canvasContainer, camera, scene);
NetworkEngine.init(scene);
SettingsEngine.init(renderer, camera, scene);

const showScreen = (id) => {
  ['main-menu', 'sp-modal', 'mp-modal', 'wardrobe-modal', 'settings-modal'].forEach(s => {
    document.getElementById(s).style.display = (s === id) ? 'flex' : 'none';
  });
};

document.getElementById('btn-singleplayer').onclick = () => showScreen('sp-modal');
document.getElementById('btn-multiplayer').onclick = () => showScreen('mp-modal');
document.getElementById('btn-wardrobe').onclick = () => showScreen('wardrobe-modal');
document.getElementById('btn-settings').onclick = () => showScreen('settings-modal');

document.getElementById('sp-back').onclick = () => showScreen('main-menu');
document.getElementById('btn-mp-back').onclick = () => showScreen('main-menu');
document.getElementById('wardrobe-back').onclick = () => showScreen('main-menu');
document.getElementById('settings-back').onclick = () => showScreen('main-menu');

document.getElementById('sp-start').onclick = () => {
  GameState.mode = 'sp';
  GameState.difficulty = document.getElementById('sp-diff').value;
  MonsterAI.applyDifficultySettings();
  startGame();
};

function startGame() {
  audio.init();
  showScreen('');
  showDaySequence();
}

document.getElementById('btn-show-create-lobby').onclick = () => {
  document.getElementById('mp-create-box').style.display = 'block';
};
document.getElementById('mp-max-players').oninput = (e) => {
  document.getElementById('mp-max-players-val').innerText = e.target.value;
};
document.getElementById('btn-commit-create-lobby').onclick = () => {
  NetworkEngine.isHost = true;
  NetworkEngine.roomCode = 'SAH-' + Math.floor(10 + Math.random() * 89);
  NetworkEngine.roomName = document.getElementById('mp-room-name').value;
  NetworkEngine.maxPlayers = parseInt(document.getElementById('mp-max-players').value);

  document.getElementById('mp-lobby-browser').style.display = 'none';
  document.getElementById('mp-create-box').style.display = 'none';
  document.getElementById('mp-lobby-room').style.display = 'block';
  document.getElementById('room-header').innerText = `LOBBY: ${NetworkEngine.roomName}`;
  document.getElementById('room-code-display').innerText = NetworkEngine.roomCode;

  NetworkEngine.client.subscribe(`granny_v4_room/${NetworkEngine.roomCode}`);
  NetworkEngine.announce();
  updateRoomUI();
};
document.getElementById('btn-sync-lobbies').onclick = () => {
  document.getElementById('lobbies-list').innerHTML = '<div style="color:#aaa;">Scanning for active lobbies...</div>';
  NetworkEngine.broadcast('granny_v4_lobbies/query', { sender: NetworkEngine.myId });
};
document.getElementById('btn-join-code').onclick = () => {
  const code = document.getElementById('mp-direct-code').value.trim().toUpperCase();
  if (code.length >= 4) {
    NetworkEngine.roomCode = code;
    document.getElementById('mp-lobby-browser').style.display = 'none';
    document.getElementById('mp-lobby-room').style.display = 'block';
    NetworkEngine.client.subscribe(`granny_v4_room/${code}`);
    NetworkEngine.broadcast(`granny_v4_room/${code}`, {
      type: 'JOIN',
      sender: NetworkEngine.myId,
      name: document.getElementById('prof-name').value,
      wardrobe: {
        shirt: document.getElementById('wardrobe-shirt').value,
        skin: document.getElementById('wardrobe-skin').value
      }
    });
    updateRoomUI();
  }
};

function renderLobbyCard(data) {
  const list = document.getElementById('lobbies-list');
  if (list.querySelector(`[data-code="${data.code}"]`)) return;
  if (list.innerText.includes('Scanning') || list.innerText.includes('Click SYNC')) {
    list.innerHTML = '';
  }

  const div = document.createElement('div');
  div.setAttribute('data-code', data.code);
  div.style.cssText = 'padding:7px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;';
  div.innerHTML = `
    <span><b>${data.name}</b> [${data.code}] (${data.count}/${data.max})</span>
    <button class="menu-btn small">JOIN</button>
  `;

  div.querySelector('button').onclick = () => {
    NetworkEngine.roomCode = data.code;
    NetworkEngine.roomName = data.name;
    document.getElementById('mp-lobby-browser').style.display = 'none';
    document.getElementById('mp-lobby-room').style.display = 'block';
    document.getElementById('room-header').innerText = `LOBBY: ${data.name}`;
    document.getElementById('room-code-display').innerText = data.code;

    NetworkEngine.client.subscribe(`granny_v4_room/${data.code}`);
    NetworkEngine.broadcast(`granny_v4_room/${data.code}`, {
      type: 'JOIN',
      sender: NetworkEngine.myId,
      name: document.getElementById('prof-name').value,
      wardrobe: {
        shirt: document.getElementById('wardrobe-shirt').value,
        skin: document.getElementById('wardrobe-skin').value
      }
    });
    updateRoomUI();
  };

  list.appendChild(div);
}

function updateRoomUI() {
  const count = Object.keys(NetworkEngine.peers).length + 1;
  document.getElementById('room-player-count').innerText = count;
  const list = document.getElementById('room-player-list');
  list.innerHTML = `<li>${document.getElementById('prof-name').value} (You)</li>`;
  
  Object.values(NetworkEngine.peers).forEach(p => {
    list.innerHTML += `<li>${p.name || 'Survivor'}</li>`;
  });

  if (NetworkEngine.isHost && count >= 2) {
    document.getElementById('btn-start-multiplayer-game').style.display = 'block';
    document.getElementById('waiting-msg').style.display = 'none';
  }
}

document.getElementById('btn-start-multiplayer-game').onclick = () => {
  NetworkEngine.broadcast(`granny_v4_room/${NetworkEngine.roomCode}`, {
    type: 'START',
    sender: NetworkEngine.myId
  });
  startGame();
};

// 12. RUNTIME TICKING & MASTER RENDER LOOP
let lastTime = performance.now();
setInterval(() => { NetworkEngine.tickSync(); }, 50);

function gameLoop() {
  requestAnimationFrame(gameLoop);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.08);
  lastTime = now;

  Player.update(dt, camera);
  MonsterAI.update(dt);
  updatePhysicsAndWorld(dt);

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

gameLoop();
