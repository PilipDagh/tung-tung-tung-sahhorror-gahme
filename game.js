/* =========================================================================
   GAME.JS - COMPLETE CONTROLLER, NAVGRAPH, PAUSE MENU, LIGHTING & AI
   ========================================================================= */

const _tempVecA = new THREE.Vector3();
const _tempRayOrigin = new THREE.Vector3();
const _tempClampPt = new THREE.Vector3();

// 1. WAYPOINT GRAPH FOR GRANNY NAVIGATION
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

// 2. PERSISTENT LOCAL STORAGE & CAREER STATS
const CareerStats = {
  load() {
    const savedName = localStorage.getItem('granny_username');
    if (savedName) {
      document.getElementById('prof-name').value = savedName;
    } else {
      const randGuest = 'Survivor_' + Math.floor(100 + Math.random() * 899);
      document.getElementById('prof-name').value = randGuest;
      localStorage.setItem('granny_username', randGuest);
    }

    const s = localStorage.getItem('granny_v5_stats');
    if (s) {
      try { Object.assign(GameState.playerStats, JSON.parse(s)); } catch(e){}
    }
    this.updateUI();

    document.getElementById('prof-name').onchange = (e) => {
      localStorage.setItem('granny_username', e.target.value.trim() || 'Survivor');
    };
  },

  save() {
    localStorage.setItem('granny_v5_stats', JSON.stringify(GameState.playerStats));
    this.updateUI();
  },

  updateUI() {
    document.getElementById('stat-escapes').innerText = GameState.playerStats.escapes;
    document.getElementById('stat-deaths').innerText = GameState.playerStats.deaths;
    document.getElementById('stat-stuns').innerText = GameState.playerStats.stuns;
    document.getElementById('stat-days').innerText = GameState.playerStats.days;
  }
};

// 3. FIRST-PERSON VIEWMODEL RIG
const Viewmodel = {
  group: new THREE.Group(),
  models: {},
  activeKey: null,
  loadedDart: null,
  gpBat: null,
  isSwinging: false,
  swingTime: 0,

  init(camera) {
    camera.add(this.group);
    this.group.position.set(0.32, -0.28, -0.55);

    // Crossbow Viewmodel
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

    // Shotgun Viewmodel
    const sg = new THREE.Group();
    const barrels = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), Assets.metalMat);
    barrels.rotation.x = Math.PI * 0.5;
    barrels.position.set(0, 0.05, -0.25);
    sg.add(barrels);
    const sgStock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.4), Assets.woodMat);
    sgStock.position.set(0, -0.02, 0.1);
    sg.add(sgStock);
    this.models['Shotgun'] = sg;

    // Hammer Viewmodel
    const hm = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.46, 8), Assets.woodMat);
    hm.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.18), Assets.metalMat);
    head.position.set(0, 0.22, -0.03);
    hm.add(head);
    hm.rotation.x = 0.4;
    this.models['Hammer'] = hm;

    // Gasoline Can Viewmodel
    const gas = new THREE.Group();
    const gasBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.18), Assets.bloodMat);
    gas.add(gasBody);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6), Assets.metalMat);
    spout.position.set(0.08, 0.2, 0);
    gas.add(spout);
    this.models['Gasoline Can'] = gas;

    // Keys Viewmodel
    const key = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12), Assets.metalMat);
    key.add(ring);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), Assets.metalMat);
    stem.rotation.x = Math.PI * 0.5;
    stem.position.set(0, 0, -0.09);
    key.add(stem);
    this.models['GenericKey'] = key;

    // GP Mallet Bat Viewmodel
    const batGroup = new THREE.Group();
    const batMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 1.1, 8), Assets.woodMat);
    batMesh.position.set(0.1, 0.1, -0.2);
    batMesh.rotation.set(0.5, 0, -0.3);
    batGroup.add(batMesh);
    this.models['GP_Bat'] = batGroup;
    this.gpBat = batGroup;

    Object.values(this.models).forEach(m => { m.visible = false; this.group.add(m); });
  },

  setHeldItem(itemName) {
    Object.values(this.models).forEach(m => m.visible = false);
    this.activeKey = itemName;
    if (!itemName) return;

    if (GameState.isGP) {
      this.models['GP_Bat'].visible = true;
      return;
    }

    if (this.models[itemName]) {
      this.models[itemName].visible = true;
    } else if (itemName.includes('Key')) {
      this.models['GenericKey'].visible = true;
    }
  },

  triggerBatSwing() {
    if (this.isSwinging) return;
    this.isSwinging = true;
    this.swingTime = 0;
  },

  animate(dt, isMoving) {
    if (this.isSwinging && this.gpBat) {
      this.swingTime += dt * 6.5;
      this.gpBat.rotation.x = 0.5 - Math.sin(this.swingTime) * 1.4;
      this.gpBat.rotation.y = Math.sin(this.swingTime) * 0.8;
      if (this.swingTime >= Math.PI) {
        this.isSwinging = false;
        this.gpBat.rotation.set(0, 0, 0);
      }
    } else if (isMoving) {
      const t = performance.now() * 0.008;
      this.group.position.x = 0.32 + Math.cos(t) * 0.015;
      this.group.position.y = -0.28 + Math.sin(t * 2) * 0.015;
    } else {
      this.group.position.set(0.32, -0.28, -0.55);
    }
  }
};

// 4. PLAYER CONTROLLER WITH LIGHTING & PHYSICS
const Player = {
  position: new THREE.Vector3(-6.5, 6.0, 8.5),
  velocity: new THREE.Vector3(),
  rotation: new THREE.Euler(0, -Math.PI * 0.5, 0, 'YXZ'),
  radius: 0.35,
  height: 1.75,
  health: 100,
  isCrouched: false,
  isHiding: false,
  isGhost: false,
  isIntroPlaying: false,
  introTimer: 0,
  hidingSpot: null,
  speed: 4.6,
  crouchSpeed: 2.2,
  limpMultiplier: 1.0,
  activeSlot: 0,
  isGrounded: false,

  init(camera, scene) {
    this.torchLight = new THREE.PointLight(0xffeedd, 2.5, 30);
    this.torchLight.position.set(0, 0, 0.2);
    camera.add(this.torchLight);

    Viewmodel.init(camera);
  },

  prepareBedPose(camera) {
    this.isIntroPlaying = true;
    this.introTimer = 0;
    this.isHiding = false;
    this.position.set(-8.8, 6.0, 9.5);
    this.rotation.set(0.2, -Math.PI * 0.5, 0);

    if (camera) {
      camera.position.set(-8.8, 7.45, 9.5);
      camera.quaternion.setFromEuler(this.rotation);
    }
  },

  startWakeUpIntro() {
    this.isIntroPlaying = true;
    this.introTimer = 0;
    this.isHiding = false;

    const eyelid = document.getElementById('eyelid-overlay');
    if (eyelid) {
      eyelid.style.display = 'none';
      eyelid.style.opacity = '0';
    }
  },

  update(dt, camera) {
    if (this.isIntroPlaying) {
      this.introTimer += dt;

      if (this.introTimer < 1.2) {
        camera.position.set(-8.8, 7.45, 9.5);
        this.rotation.x = 0.2 - Math.sin(this.introTimer * 3.0) * 0.05;
        this.rotation.y = -Math.PI * 0.5 + Math.cos(this.introTimer * 2.0) * 0.1;
      } else if (this.introTimer < 2.4) {
        const t = (this.introTimer - 1.2) / 1.2;
        camera.position.x = THREE.MathUtils.lerp(-8.8, -6.5, t);
        camera.position.y = THREE.MathUtils.lerp(7.45, 7.62, t);
        camera.position.z = THREE.MathUtils.lerp(9.5, 8.5, t);
        this.rotation.x = THREE.MathUtils.lerp(0.2, 0.0, t);
      } else {
        this.isIntroPlaying = false;
        this.position.set(-6.5, 6.0, 8.5);
        this.velocity.set(0, 0, 0);

        document.getElementById('hud').style.display = 'block';
        if (document.getElementById('opt-mobile-mode').checked) {
          document.getElementById('mobile-controls').style.display = 'block';
        } else {
          document.getElementById('click-to-focus').style.display = 'flex';
        }
      }

      camera.quaternion.setFromEuler(this.rotation);
      return;
    }

    if (this.isGhost) {
      const ghostSpd = 7.0;
      const fwd = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
      const right = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation);

      if (Input.keys['KeyW']) this.position.addScaledVector(fwd, ghostSpd * dt);
      if (Input.keys['KeyS']) this.position.addScaledVector(fwd, -ghostSpd * dt);
      if (Input.keys['KeyA']) this.position.addScaledVector(right, -ghostSpd * dt);
      if (Input.keys['KeyD']) this.position.addScaledVector(right, ghostSpd * dt);
      if (Input.keys['Space']) this.position.y += ghostSpd * dt;
      if (Input.keys['KeyC']) this.position.y -= ghostSpd * dt;

      camera.position.copy(this.position);
      camera.quaternion.setFromEuler(this.rotation);
      return;
    }

    if (this.isHiding) {
      if (this.hidingSpot) {
        camera.position.copy(this.hidingSpot.position);
      }
      camera.quaternion.setFromEuler(this.rotation);
      return;
    }

    const curSpeed = (this.isCrouched ? this.crouchSpeed : this.speed) * this.limpMultiplier;
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

    if (GameState.funMode) {
      if (Input.keys['KeyZ']) this.velocity.y = 4.0;
      else if (Input.keys['KeyX']) this.velocity.y = -4.0;
      else this.velocity.y *= 0.95;
    } else {
      this.velocity.y -= 22 * dt;
      if (this.velocity.y < -25) this.velocity.y = -25;
    }

    const dx = move.x * curSpeed * dt;
    const dz = move.z * curSpeed * dt;
    const dy = this.velocity.y * dt;

    if (dx !== 0) this.moveAxis(dx, 0);
    if (dz !== 0) this.moveAxis(dz, 2);

    this.moveVertical(dy);

    const eyeHeight = this.isCrouched ? 0.95 : (GameState.isGP ? 2.0 : 1.62);
    camera.position.set(this.position.x, this.position.y + eyeHeight, this.position.z);
    camera.quaternion.setFromEuler(this.rotation);

    Viewmodel.animate(dt, isMoving);
    this.checkDynamicCollisions(move, curSpeed);
  },

  checkDynamicCollisions(moveDir, speed) {
    const now = performance.now();

    for (let i = 0; i < House.physicsItems.length; i++) {
      const item = House.physicsItems[i];
      if (item.inInventory) continue;

      const dx = this.position.x - item.group.position.x;
      const dz = this.position.z - item.group.position.z;
      const distSq = dx * dx + dz * dz;
      const minDist = this.radius + item.radius;

      if (distSq < (minDist * minDist) && distSq > 0.001) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const nz = dz / dist;
        const pushForce = Math.max(speed * 0.8, 2.5);

        item.velocity.x -= nx * pushForce;
        item.velocity.z -= nz * pushForce;

        if (now - item.lastPushTime > 400) {
          item.lastPushTime = now;
          audio.playItemDrop(item.name);
          MonsterAI.hearNoise(item.group.position, 12);
        }
      }
    }

    for (let i = 0; i < House.dynamicProps.length; i++) {
      const prop = House.dynamicProps[i];
      if (prop.type === 'table' && !prop.isTipped) {
        const dx = this.position.x - prop.group.position.x;
        const dz = this.position.z - prop.group.position.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < (this.radius + prop.radius) * (this.radius + prop.radius)) {
          const dist = Math.sqrt(distSq);
          prop.isTipped = true;
          prop.rotVel = Math.PI * 1.5;
          prop.velocity.set(-(dx / dist) * 2.0, 0, -(dz / dist) * 2.0);

          audio.playItemDrop('Table');
          MonsterAI.hearNoise(prop.group.position, 25);
          showPrompt('You knocked over the bedside table!');
        }
      } else if (prop.type === 'painting' && !prop.isFallen) {
        const dist = this.position.distanceTo(prop.group.position);
        if (dist < 0.9) {
          prop.isFallen = true;
          prop.velocity.set(0, -3.0, 0);
          audio.playPaintingDrop();
          MonsterAI.hearNoise(prop.group.position, 18);
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

    for (let i = 0; i < CollisionWorld.boxes.length; i++) {
      const box = CollisionWorld.boxes[i];
      const xOverlap = pMinX < box.max.x && pMaxX > box.min.x;
      const zOverlap = pMinZ < box.max.z && pMaxZ > box.min.z;

      if (xOverlap && zOverlap) {
        if (box.max.y <= pMinY + 0.08) continue;
        if (box.min.y >= pMaxY - 0.08) continue;

        const heightDiff = box.max.y - pMinY;
        if (heightDiff > 0.08 && heightDiff <= maxStepHeight) {
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
    if (GameState.funMode) {
      this.position.y += dy;
      return;
    }

    const targetY = this.position.y + dy;
    const pMinX = this.position.x - this.radius;
    const pMaxX = this.position.x + this.radius;
    const pMinZ = this.position.z - this.radius;
    const pMaxZ = this.position.z + this.radius;
    const pHeight = this.isCrouched ? 1.0 : this.height;

    this.isGrounded = false;

    if (dy <= 0) {
      let highestFloor = -999;
      for (let i = 0; i < CollisionWorld.boxes.length; i++) {
        const box = CollisionWorld.boxes[i];
        if (pMinX < box.max.x && pMaxX > box.min.x && pMinZ < box.max.z && pMaxZ > box.min.z) {
          if (box.max.y <= this.position.y + 0.25 && box.max.y >= targetY - 0.25) {
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

      if (targetY < -6.0) {
        this.position.y = -6.0;
        this.velocity.y = 0;
        this.isGrounded = true;
        return;
      }

      this.position.y = targetY;
    } else {
      for (let i = 0; i < CollisionWorld.boxes.length; i++) {
        const box = CollisionWorld.boxes[i];
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
    if (GameState.isGP) {
      Viewmodel.triggerBatSwing();
      audio.playBatHit();

      const hitDist = 2.2;
      for (const [id, peer] of Object.entries(NetworkEngine.peers)) {
        if (peer.mesh && !peer.isGhost) {
          const toPeer = new THREE.Vector3().subVectors(peer.mesh.position, this.position);
          if (toPeer.length() < hitDist) {
            const fwd = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
            toPeer.normalize();
            if (fwd.angleTo(toPeer) < Math.PI * 0.35) {
              NetworkEngine.broadcastKill(id);
            }
          }
        }
      }
      return;
    }

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

  becomeGhost(corpsePos) {
    this.isGhost = true;
    document.getElementById('ghost-indicator').style.display = 'block';
    document.getElementById('stealth-indicator').innerText = 'STATUS: GHOST (SPECTATOR)';
    spawnDeadCorpseMesh(scene, corpsePos || this.position);
  }
};

// 5. INVENTORY SYSTEM (SILENT PICKUP & DROP)
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

// 6. FUN MODE ZERO-G PHYSICS
const FunPhysics = {
  balls: [],

  spawnBouncyBall(scene, pos, dir) {
    const geo = new THREE.SphereGeometry(0.35, 12, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 1.0, 0.5),
      roughness: 0.1,
      metalness: 0.2
    });
    const ballMesh = new THREE.Mesh(geo, mat);
    ballMesh.position.copy(pos);
    scene.add(ballMesh);

    const ball = {
      mesh: ballMesh,
      velocity: dir.clone().multiplyScalar(12.0),
      radius: 0.35
    };
    this.balls.push(ball);
    audio.playBounce();
  },

  update(dt) {
    for (let i = 0; i < this.balls.length; i++) {
      const b = this.balls[i];
      b.mesh.position.addScaledVector(b.velocity, dt);

      for (let j = 0; j < CollisionWorld.boxes.length; j++) {
        const box = CollisionWorld.boxes[j];
        if (box.containsPoint(b.mesh.position)) {
          b.velocity.negate().multiplyScalar(1.02);
          audio.playBounce();
          break;
        }
      }
    }
  }
};

// 7. WORLD PROPS & INTERPOLATION
function updatePhysicsAndWorld(dt) {
  for (let i = 0; i < House.doors.length; i++) {
    const door = House.doors[i];
    if (Math.abs(door.currentAngle - door.targetAngle) > 0.01) {
      door.currentAngle = THREE.MathUtils.damp(door.currentAngle, door.targetAngle, 10, dt);
      door.pivot.rotation.y = door.currentAngle;
    }
  }

  for (let i = 0; i < House.drawers.length; i++) {
    const drawer = House.drawers[i];
    if (Math.abs(drawer.currentZ - drawer.targetZ) > 0.005) {
      drawer.currentZ = THREE.MathUtils.damp(drawer.currentZ, drawer.targetZ, 8, dt);
      drawer.group.position.z = drawer.currentZ;
    }
  }

  for (let i = 0; i < House.dynamicProps.length; i++) {
    const prop = House.dynamicProps[i];
    if (prop.type === 'table' && prop.isTipped && prop.group.rotation.z < Math.PI * 0.5) {
      prop.group.rotation.z += prop.rotVel * dt;
      prop.group.position.addScaledVector(prop.velocity, dt);
      prop.velocity.multiplyScalar(0.92);

      if (prop.vaseMesh) {
        prop.vaseMesh.position.y = Math.max(0.1, prop.vaseMesh.position.y - 4.0 * dt);
      }
    } else if (prop.type === 'painting' && prop.isFallen && prop.group.position.y > 6.2) {
      prop.group.position.addScaledVector(prop.velocity, dt);
    }
  }

  for (let i = 0; i < House.physicsItems.length; i++) {
    const item = House.physicsItems[i];
    if (item.inInventory) continue;

    if (!item.isGrounded) {
      item.velocity.y -= (GameState.funMode ? 0 : 18) * dt;
      item.group.position.addScaledVector(item.velocity, dt);

      const pos = item.group.position;
      for (let j = 0; j < CollisionWorld.boxes.length; j++) {
        const box = CollisionWorld.boxes[j];
        if (pos.x >= box.min.x && pos.x <= box.max.x && pos.z >= box.min.z && pos.z <= box.max.z) {
          if (pos.y <= box.max.y + 0.15 && pos.y >= box.min.y) {
            pos.y = box.max.y + 0.08;
            item.isGrounded = true;
            item.velocity.set(0, 0, 0);
            audio.playItemDrop(item.name);
            MonsterAI.hearNoise(pos, 12);
            break;
          }
        }
      }
    }
  }

  if (GameState.funMode) {
    FunPhysics.update(dt);
  }
}

// 8. GRANNY TUNG TUNG SAHUR AI (CONE VISION & PROXIMITY AGGRO)
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
  animTime: 0,
  rightArm: null,
  head: null,
  losCheckFrame: 0,
  lastCanSeeResult: false,

  init(scene) {
    const g = new THREE.Group();

    const sarongCanvas = document.createElement('canvas');
    sarongCanvas.width = 128; sarongCanvas.height = 128;
    const sCtx = sarongCanvas.getContext('2d');
    sCtx.fillStyle = '#4a382a'; sCtx.fillRect(0, 0, 128, 128);
    sCtx.fillStyle = '#b89055';
    for (let i = 0; i < 64; i += 16) {
      for (let j = 0; j < 64; j += 16) sCtx.fillRect(i * 2, j * 2, 4, 4);
    }
    const sarongTex = new THREE.CanvasTexture(sarongCanvas);
    const gownMat = new THREE.MeshStandardMaterial({ map: sarongTex, roughness: 0.9 });
    const woodMat = Assets.woodMat;
    const skinMat = Assets.skinMat;

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.72, 1.85, 10), gownMat);
    torso.position.y = 1.3;
    torso.rotation.x = 0.22;
    g.add(torso);

    const kentongan = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.75, 8), woodMat);
    kentongan.rotation.z = Math.PI * 0.45;
    kentongan.rotation.x = 0.3;
    kentongan.position.set(0.1, 1.35, 0.48);
    g.add(kentongan);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.35, 0.25);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 10), skinMat);
    headGroup.add(skull);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), eyeMat);
    eye1.position.set(-0.13, 0.06, 0.32);
    const eye2 = eye1.clone(); eye2.position.x = 0.13;
    headGroup.add(eye1); headGroup.add(eye2);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 0.65), new THREE.MeshStandardMaterial({ color: 0x888888 }));
    hair.position.set(0, 0.22, -0.05);
    headGroup.add(hair);

    g.add(headGroup);
    this.head = headGroup;

    const arm = new THREE.Group();
    arm.position.set(0.65, 1.9, 0.15);
    const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6), gownMat);
    armMesh.position.y = -0.45;
    arm.add(armMesh);

    const mallet = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.2, 6), woodMat);
    mallet.position.set(0, -0.85, 0.25);
    mallet.rotation.x = 0.5;
    arm.add(mallet);

    g.add(arm);
    this.rightArm = arm;

    g.position.set(0, 0.2, 12.0);
    scene.add(g);
    this.mesh = g;

    this.applyDifficultySettings();
  },

  applyDifficultySettings() {
    const d = GameState.difficulty || 'normal';
    if (d === 'easy') {
      this.speed = 1.8; this.chaseSpeed = 2.9; this.visionRange = 10.0;
      this.visionAngle = Math.PI * 0.33; this.hearingRadiusMod = 0.7;
    } else if (d === 'normal') {
      this.speed = 2.3; this.chaseSpeed = 3.9; this.visionRange = 14.0;
      this.visionAngle = Math.PI * 0.42; this.hearingRadiusMod = 1.0;
    } else if (d === 'hard') {
      this.speed = 2.8; this.chaseSpeed = 4.8; this.visionRange = 18.0;
      this.visionAngle = Math.PI * 0.50; this.hearingRadiusMod = 1.3;
    } else if (d === 'extreme') {
      this.speed = 3.3; this.chaseSpeed = 5.5; this.visionRange = 22.0;
      this.visionAngle = Math.PI * 0.60; this.hearingRadiusMod = 1.6;
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
    if (Player.isHiding || Player.isIntroPlaying || Player.isGhost) return false;

    this.losCheckFrame++;
    if (this.losCheckFrame % 4 !== 0) return this.lastCanSeeResult;

    _tempVecA.subVectors(Player.position, this.mesh.position);
    const dist = _tempVecA.length();
    if (dist > this.visionRange) {
      this.lastCanSeeResult = false;
      return false;
    }

    const fwd = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation);
    _tempVecA.normalize();

    const angle = fwd.angleTo(_tempVecA);
    if (angle > this.visionAngle) {
      this.lastCanSeeResult = false;
      return false;
    }

    if (dist < 4.5 && !Player.isCrouched) {
      this.lastCanSeeResult = true;
      return true;
    }

    _tempRayOrigin.set(this.mesh.position.x, this.mesh.position.y + 1.8, this.mesh.position.z);
    const ray = new THREE.Ray(_tempRayOrigin, _tempVecA);

    const walls = CollisionWorld.wallsAndDoors;
    for (let i = 0; i < walls.length; i++) {
      const box = walls[i];
      if (box.intersectsRay(ray)) {
        box.clampPoint(ray.origin, _tempClampPt);
        if (ray.origin.distanceTo(_tempClampPt) < dist - 0.5) {
          this.lastCanSeeResult = false;
          return false;
        }
      }
    }

    this.lastCanSeeResult = true;
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
    if (!this.mesh || GameState.isGP) return;

    this.animTime += dt;
    if (this.rightArm) {
      this.rightArm.rotation.x = -0.3 + Math.sin(this.animTime * (this.state === 'CHASE' ? 8 : 4)) * 0.35;
    }
    if (this.head) {
      this.head.rotation.y = Math.sin(this.animTime * 2) * 0.15;
    }

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

    if (canSee) {
      if (this.state !== 'CHASE') {
        this.state = 'CHASE';
        audio.startChase();
      }
      this.targetPos.copy(Player.position);
      this.currentPath = [Player.position.clone()];
    } else if (this.state === 'CHASE') {
      this.state = 'SEARCH_LAST_SEEN';
      audio.stopChase();
      this.currentPath = NavGraph.findPath(this.mesh.position, this.targetPos);
      this.searchTimer = 4.0;
    }

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

    const distToPlayer = this.mesh.position.distanceTo(Player.position);
    if (distToPlayer < 1.5 && !Player.isHiding && !Player.isIntroPlaying && !Player.isGhost && this.state !== 'STUNNED') {
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

// 9. INPUT & CONTROLLER WITH PAUSE MENU [M] KEY
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
      if (e.code === 'KeyM') togglePauseMenu();
      if (e.code === 'Enter') handleLobbyStartTrigger();
      if (e.code === 'KeyL' && GameState.funMode) {
        FunPhysics.spawnBouncyBall(scene, camera.position, new THREE.Vector3(0, 0, -1).applyEuler(Player.rotation));
      }
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
      if (document.pointerLockElement === container && !GameState.isPaused) {
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
        (inGame && !isLocked && !document.getElementById('opt-mobile-mode').checked && !Player.isIntroPlaying && !GameState.isPaused) ? 'flex' : 'none';
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

    document.getElementById('m-btn-menu').onclick = togglePauseMenu;
    document.getElementById('m-btn-use').onclick = () => doInteract(camera);
    document.getElementById('m-btn-drop').onclick = () => Inventory.dropCurrent(camera, scene);
    document.getElementById('m-btn-crouch').onclick = toggleCrouch;
    document.getElementById('m-btn-fire').onclick = () => Player.fireWeapon(camera);

    document.getElementById('m-btn-spawn').onclick = () => {
      if (GameState.funMode) {
        FunPhysics.spawnBouncyBall(scene, camera.position, new THREE.Vector3(0, 0, -1).applyEuler(Player.rotation));
      }
    };
    document.getElementById('m-btn-up').onclick = () => { Player.velocity.y = 4.0; };
    document.getElementById('m-btn-down').onclick = () => { Player.velocity.y = -4.0; };
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
      if (msg) showPrompt(msg);
    }
    return;
  }

  for (let i = 0; i < House.hidingSpots.length; i++) {
    const spot = House.hidingSpots[i];
    if (Player.position.distanceTo(spot.position) < 2.5) {
      Player.isHiding = true;
      Player.hidingSpot = spot;
      document.getElementById('stealth-indicator').innerText = `STEALTH: UNDER ${spot.type.toUpperCase()}`;
      document.getElementById('stealth-indicator').classList.add('hidden');
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

// 10. PAUSE & IN-GAME ACTION MENU ([M] OR MOBILE [MENU])
function togglePauseMenu() {
  const pMenu = document.getElementById('pause-menu-modal');
  const isOpen = pMenu.style.display === 'flex';

  if (isOpen) {
    pMenu.style.display = 'none';
    if (GameState.mode === 'sp') GameState.isPaused = false;
    if (!document.getElementById('opt-mobile-mode').checked) {
      canvasContainer.requestPointerLock();
    }
  } else {
    pMenu.style.display = 'flex';
    document.exitPointerLock();
    if (GameState.mode === 'sp') {
      GameState.isPaused = true;
      document.getElementById('pause-menu-title').innerText = 'PAUSED';
      document.getElementById('pause-menu-sub').innerText = 'Singleplayer paused.';
    } else {
      GameState.isPaused = false;
      document.getElementById('pause-menu-title').innerText = 'GAME MENU';
      document.getElementById('pause-menu-sub').innerText = 'Multiplayer active in background (no pause).';
    }
  }
}

document.getElementById('btn-pause-resume').onclick = togglePauseMenu;
document.getElementById('btn-pause-settings').onclick = () => {
  document.getElementById('settings-modal').style.display = 'flex';
};
document.getElementById('btn-pause-stats').onclick = () => {
  document.getElementById('settings-modal').style.display = 'flex';
  document.getElementById('tab-btn-prof').click();
};
document.getElementById('btn-pause-exit').onclick = () => {
  window.location.reload();
};

// 11. DAY PROGRESSION, JUMPSCARE & GAME OVER
function triggerJumpscare() {
  audio.stopChase();
  audio.playBatHit();
  audio.playJumpscare();
  const overlay = document.getElementById('jumpscare-overlay');
  overlay.style.display = 'block';

  setTimeout(() => {
    overlay.style.display = 'none';
    GameState.day++;
    GameState.playerStats.deaths++;
    CareerStats.save();

    if (GameState.day > GameState.maxDays) {
      showGameOverModal('The 5 days are up. Granny eliminated all survivors.');
    } else {
      respawnPlayer();
    }
  }, 1400);
}

function updateDayVignetteAndSpeed() {
  const blood = document.getElementById('blood-vignette');
  const opacities = [0, 0, 0.25, 0.45, 0.65, 0.88];
  blood.style.opacity = opacities[GameState.day] || 0;

  const speedMultipliers = [1, 1, 0.92, 0.84, 0.76, 0.68];
  Player.limpMultiplier = speedMultipliers[GameState.day] || 1;
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
    GameState.day === 5 ? 'DAY 5, no escape...' :
    'You woke up with a pounding headache.';

  updateDayVignetteAndSpeed();
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
  GameState.playerStats.escapes++;
  CareerStats.save();
  alert(`VICTORY! ${method}`);
  window.location.reload();
}

function showGameOverModal(reason) {
  document.getElementById('game-over-modal').style.display = 'flex';
  document.getElementById('game-over-reason').innerText = reason;
  updateVoteUI();
}

function updateVoteUI() {
  const total = Object.keys(NetworkEngine.peers).length + 1;
  document.getElementById('vote-count').innerText = GameState.restartVotes;
  document.getElementById('vote-required').innerText = total;

  if (GameState.restartVotes >= total) {
    document.getElementById('game-over-modal').style.display = 'none';
    GameState.day = 1;
    GameState.restartVotes = 0;
    respawnPlayer();
  }
}

document.getElementById('btn-vote-restart').onclick = () => {
  GameState.restartVotes++;
  NetworkEngine.broadcast('VOTE_RESTART', { count: GameState.restartVotes });
  updateVoteUI();
};
document.getElementById('btn-leave-lobby').onclick = () => {
  window.location.reload();
};

// 12. HOST LAPTOP TERMINAL
function openHostLaptopTerminal() {
  const modal = document.getElementById('laptop-modal');
  modal.style.display = 'flex';

  const table = document.getElementById('laptop-player-table');
  table.innerHTML = `<div><b>${document.getElementById('prof-name').value} (Host)</b> - Stats: Escapes ${GameState.playerStats.escapes} | Deaths ${GameState.playerStats.deaths}</div>`;

  Object.values(NetworkEngine.peers).forEach((p, idx) => {
    table.innerHTML += `<div><b>${p.name || 'Survivor ' + (idx + 1)}</b> - Connected (Ping: 45ms)</div>`;
  });
}
document.getElementById('btn-close-laptop').onclick = () => {
  document.getElementById('laptop-modal').style.display = 'none';
};

// 13. 3D LOBBY START COUNTDOWN
let lobbyCountdownTimer = null;
let lobbyCountdownVal = 10;

function handleLobbyStartTrigger() {
  if (!NetworkEngine.isHost || GameState.inGame) return;
  if (lobbyCountdownTimer) return;

  lobbyCountdownVal = 10;
  const banner = document.getElementById('lobby-countdown-banner');
  banner.style.display = 'block';
  document.getElementById('lobby-countdown-num').innerText = lobbyCountdownVal;

  NetworkEngine.broadcast('LOBBY_COUNTDOWN_START', { val: 10 });

  lobbyCountdownTimer = setInterval(() => {
    lobbyCountdownVal--;
    document.getElementById('lobby-countdown-num').innerText = lobbyCountdownVal;

    if (lobbyCountdownVal <= 0) {
      clearInterval(lobbyCountdownTimer);
      lobbyCountdownTimer = null;
      banner.style.display = 'none';
      NetworkEngine.broadcast('HOST_LAUNCH_MANOR', {});
      launchManorGame();
    }
  }, 1000);
}

function cancelLobbyCountdown() {
  if (lobbyCountdownTimer) {
    clearInterval(lobbyCountdownTimer);
    lobbyCountdownTimer = null;
    document.getElementById('lobby-countdown-banner').style.display = 'none';
    showPrompt('Player joined/left! Start countdown canceled.');
  }
}

// 14. MULTIPLAYER NETWORKING
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
          this.client.subscribe('granny_v5_lobbies/#');
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

  broadcastKill(targetId) {
    this.broadcast(`granny_v5_room/${this.roomCode}`, {
      type: 'PLAYER_KILLED',
      target: targetId,
      corpsePos: Player.position
    });
  },

  handlePacket(scene, topic, data) {
    if (data.sender === this.myId) return;

    if (topic === 'granny_v5_lobbies/announce') {
      renderLobbyCard(data);
    } else if (topic === 'granny_v5_lobbies/query' && this.isHost) {
      this.announce();
    } else if (topic === `granny_v5_room/${this.roomCode}`) {
      if (data.type === 'JOIN') {
        cancelLobbyCountdown();
        this.peers[data.sender] = { name: data.name, wardrobe: data.wardrobe, pos: new THREE.Vector3() };
        updateVoteUI();
        if (this.isHost) this.announce();
      } else if (data.type === 'LEAVE') {
        cancelLobbyCountdown();
        delete this.peers[data.sender];
        updateVoteUI();
      } else if (data.type === 'LOBBY_COUNTDOWN_START') {
        const b = document.getElementById('lobby-countdown-banner');
        b.style.display = 'block';
        document.getElementById('lobby-countdown-num').innerText = data.val;
      } else if (data.type === 'HOST_LAUNCH_MANOR') {
        launchManorGame();
      } else if (data.type === 'SYNC') {
        this.updateRemoteSurvivor(scene, data.sender, data);
      } else if (data.type === 'PLAYER_KILLED') {
        if (data.target === this.myId) {
          Player.becomeGhost(data.corpsePos);
          audio.playBatHit();
        }
      } else if (data.type === 'VOTE_RESTART') {
        GameState.restartVotes = data.count;
        updateVoteUI();
      }
    }
  },

  announce() {
    this.broadcast('granny_v5_lobbies/announce', {
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

      const nameSprite = createNameplate(data.name || 'Survivor');
      nameSprite.position.y = 2.15;
      g.add(nameSprite);

      scene.add(g);
      this.peers[id] = { mesh: g, name: data.name, isGhost: false };
    }

    const p = this.peers[id];
    if (p.mesh) {
      if (data.isGhost) {
        p.mesh.visible = false;
        return;
      }
      p.mesh.position.set(data.x, data.y, data.z);
      p.mesh.rotation.y = data.rotY;

      if (Player.position.distanceTo(p.mesh.position) < 0.8 && !Player.isGhost) {
        const push = new THREE.Vector3().subVectors(Player.position, p.mesh.position).normalize().multiplyScalar(0.08);
        Player.position.add(push);
      }
    }
  },

  tickSync() {
    if (this.roomCode) {
      this.broadcast(`granny_v5_room/${this.roomCode}`, {
        type: 'SYNC',
        sender: this.myId,
        name: document.getElementById('prof-name').value,
        x: Player.position.x,
        y: Player.position.y,
        z: Player.position.z,
        rotY: Player.rotation.y,
        isGhost: Player.isGhost,
        wardrobe: {
          shirt: document.getElementById('wardrobe-shirt').value,
          skin: document.getElementById('wardrobe-skin').value
        }
      });
    }
  }
};

function createNameplate(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center';
  ctx.fillText(text, 128, 42);
  const tex = new THREE.CanvasTexture(c);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
}

function spawnDeadCorpseMesh(scene, pos) {
  const corpse = new THREE.Group();
  const cMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 1.4), cMat);
  body.position.y = 0.12;
  corpse.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), Assets.skinMat);
  head.position.set(0, 0.15, 0.85);
  corpse.add(head);
  corpse.position.copy(pos);
  scene.add(corpse);
}

// 15. GAME LAUNCH & GP SELECTION
function launchManorGame() {
  GameState.inGame = true;
  document.getElementById('main-menu').style.display = 'none';

  const total = Object.keys(NetworkEngine.peers).length + 1;
  if (total >= 5 && document.getElementById('mp-enable-gp').checked) {
    const allIds = [NetworkEngine.myId, ...Object.keys(NetworkEngine.peers)];
    const chosenGP = allIds[Math.floor(Math.random() * allIds.length)];
    if (chosenGP === NetworkEngine.myId) {
      setupAsGrannyPlayer();
      return;
    }
  }

  document.getElementById('role-badge').style.display = 'block';
  document.getElementById('role-badge').innerText = 'ROLE: SURVIVOR';

  showDaySequence();
}

function setupAsGrannyPlayer() {
  GameState.isGP = true;
  document.getElementById('role-badge').style.display = 'block';
  document.getElementById('role-badge').innerText = 'ROLE: GRANNY (HUNTER)';
  document.getElementById('role-badge').style.background = '#8a0303';

  const napOverlay = document.getElementById('gp-nap-overlay');
  napOverlay.style.display = 'flex';
  let napSecs = 10;
  document.getElementById('gp-countdown-timer').innerText = napSecs;

  const napInterval = setInterval(() => {
    napSecs--;
    document.getElementById('gp-countdown-timer').innerText = napSecs;
    if (napSecs <= 0) {
      clearInterval(napInterval);
      napOverlay.style.display = 'none';

      Player.position.set(-7.0, -5.8, -6.0);
      Viewmodel.setHeldItem('GP_Bat');
      document.getElementById('hud').style.display = 'block';
      showPrompt('You woke up! Hunt down survivors with [LMB / FIRE]!');
    }
  }, 1000);
}

// 16. SETTINGS CONTROLLER (LIVE FPS & UI SCALE SLIDERS)
const SettingsEngine = {
  init(renderer, camera, scene) {
    const fpsSlider = document.getElementById('opt-fps-slider');
    fpsSlider.oninput = (e) => {
      const v = parseInt(e.target.value);
      EngineLimiter.targetFPS = v;
      EngineLimiter.frameInterval = 1000 / v;
      document.getElementById('opt-fps-val').innerText = `${v} FPS`;
    };

    const uiSlider = document.getElementById('opt-uiscale');
    uiSlider.oninput = (e) => {
      const scale = parseFloat(e.target.value);
      document.documentElement.style.setProperty('--ui-scale', scale);
      document.getElementById('opt-uiscale-val').innerText = `${Math.round(scale * 100)}%`;
    };

    const fovEl = document.getElementById('opt-fov');
    fovEl.oninput = (e) => {
      camera.fov = parseFloat(e.target.value);
      camera.updateProjectionMatrix();
      document.getElementById('opt-fov-val').innerText = `${e.target.value}°`;
    };

    const gammaEl = document.getElementById('opt-gamma');
    gammaEl.oninput = (e) => {
      const v = parseFloat(e.target.value);
      ambLight.intensity = 0.95 * v;
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
      if (v === 'none') scene.fog.near = 999;
      else if (v === 'light') { scene.fog.near = 35; scene.fog.far = 100; }
      else if (v === 'normal') { scene.fog.near = 25; scene.fog.far = 90; }
      else if (v === 'heavy') { scene.fog.near = 10; scene.fog.far = 35; }
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

// 17. RUNTIME INITIALIZATION & BULLETPROOF LIGHTING
const GameState = {
  mode: 'sp',
  difficulty: 'normal',
  day: 1,
  maxDays: 5,
  inGame: false,
  isGP: false,
  funMode: false,
  isPaused: false,
  restartVotes: 0,
  playerStats: { escapes: 0, deaths: 0, stuns: 0, days: 0 }
};

const EngineLimiter = {
  targetFPS: 120,
  frameInterval: 1000 / 120,
  lastFrameTime: performance.now()
};

const canvasContainer = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x3a3028);
scene.fog = new THREE.Fog(0x3a3028, 25, 90);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 90);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
canvasContainer.appendChild(renderer.domElement);

// Base Ambient Light
const ambLight = new THREE.AmbientLight(0xffeedd, 0.95);
scene.add(ambLight);

// Overhead Directional Light
const sunLight = new THREE.DirectionalLight(0xffeedd, 0.6);
sunLight.position.set(0, 20, 0);
scene.add(sunLight);

// Room Lamps in Manor
const bedroomLamp = new THREE.PointLight(0xffb055, 2.5, 25);
bedroomLamp.position.set(-8, 9.5, 8);
scene.add(bedroomLamp);

const foyerLamp = new THREE.PointLight(0xffdd99, 2.5, 25);
foyerLamp.position.set(0, 4.2, 8);
scene.add(foyerLamp);

const basementLight = new THREE.PointLight(0x77dd99, 2.0, 22);
basementLight.position.set(-4, -3.5, -4);
scene.add(basementLight);

// Build Map, Player & AI
House.build(scene);
Player.init(camera, scene);
MonsterAI.init(scene);
Input.init(canvasContainer, camera, scene);
NetworkEngine.init(scene);
SettingsEngine.init(renderer, camera, scene);
CareerStats.load();

const showScreen = (id) => {
  ['main-menu', 'sp-modal', 'mp-modal', 'wardrobe-modal', 'settings-modal', 'pause-menu-modal'].forEach(s => {
    document.getElementById(s).style.display = (s === id) ? 'flex' : 'none';
  });
};

document.getElementById('btn-singleplayer').onclick = () => showScreen('sp-modal');
document.getElementById('btn-multiplayer').onclick = () => {
  showScreen('mp-modal');
  document.getElementById('mp-lobby-browser').style.display = 'block';
  document.getElementById('mp-create-box').style.display = 'none';
  document.getElementById('row-mp-back').style.display = 'flex';
};
document.getElementById('btn-wardrobe').onclick = () => showScreen('wardrobe-modal');
document.getElementById('btn-settings').onclick = () => showScreen('settings-modal');

document.getElementById('sp-back').onclick = () => showScreen('main-menu');
document.getElementById('btn-mp-back').onclick = () => showScreen('main-menu');
document.getElementById('wardrobe-back').onclick = () => showScreen('main-menu');
document.getElementById('settings-back').onclick = () => {
  if (GameState.inGame) {
    document.getElementById('settings-modal').style.display = 'none';
  } else {
    showScreen('main-menu');
  }
};

document.getElementById('sp-start').onclick = () => {
  GameState.mode = 'sp';
  GameState.difficulty = document.getElementById('sp-diff').value;
  GameState.funMode = document.getElementById('sp-funmode').checked;

  if (GameState.funMode) {
    document.body.classList.add('fun-mode-active');
    document.getElementById('m-btn-spawn').style.display = 'flex';
    document.getElementById('m-btn-up').style.display = 'flex';
    document.getElementById('m-btn-down').style.display = 'flex';
  } else {
    document.body.classList.remove('fun-mode-active');
    document.getElementById('m-btn-spawn').style.display = 'none';
    document.getElementById('m-btn-up').style.display = 'none';
    document.getElementById('m-btn-down').style.display = 'none';
  }

  MonsterAI.applyDifficultySettings();
  audio.init();
  showScreen('');
  showDaySequence();
};

// MULTIPLAYER "+ CREATE" TOGGLE HANDLERS
document.getElementById('btn-show-create-lobby').onclick = () => {
  document.getElementById('mp-lobby-browser').style.display = 'none';
  document.getElementById('mp-create-box').style.display = 'block';
  document.getElementById('row-mp-back').style.display = 'none';
};

document.getElementById('btn-cancel-create').onclick = () => {
  document.getElementById('mp-create-box').style.display = 'none';
  document.getElementById('mp-lobby-browser').style.display = 'block';
  document.getElementById('row-mp-back').style.display = 'flex';
};

document.getElementById('mp-max-players').oninput = (e) => {
  const v = parseInt(e.target.value);
  document.getElementById('mp-max-players-val').innerText = v;
  const is5OrMore = v >= 5;
  document.getElementById('row-player-granny').style.display = is5OrMore ? 'flex' : 'none';
  document.getElementById('row-funmode').style.display = is5OrMore ? 'flex' : 'none';
  if (!is5OrMore) {
    document.getElementById('mp-enable-gp').checked = false;
    document.getElementById('mp-funmode').checked = false;
  }
};

document.getElementById('btn-commit-create-lobby').onclick = () => {
  NetworkEngine.isHost = true;
  NetworkEngine.roomCode = 'SAH-' + Math.floor(10 + Math.random() * 89);
  NetworkEngine.roomName = document.getElementById('mp-room-name').value.trim();
  NetworkEngine.maxPlayers = parseInt(document.getElementById('mp-max-players').value);

  GameState.mode = 'mp';
  GameState.difficulty = document.getElementById('mp-diff').value;
  MonsterAI.applyDifficultySettings();

  GameState.funMode = document.getElementById('mp-funmode').checked || (NetworkEngine.roomName.toUpperCase() === 'FUN TIME');
  if (GameState.funMode) {
    document.body.classList.add('fun-mode-active');
    document.getElementById('m-btn-spawn').style.display = 'flex';
    document.getElementById('m-btn-up').style.display = 'flex';
    document.getElementById('m-btn-down').style.display = 'flex';
  } else {
    document.body.classList.remove('fun-mode-active');
    document.getElementById('m-btn-spawn').style.display = 'none';
    document.getElementById('m-btn-up').style.display = 'none';
    document.getElementById('m-btn-down').style.display = 'none';
  }

  showScreen('');

  try {
    if (NetworkEngine.client && NetworkEngine.client.isConnected()) {
      NetworkEngine.client.subscribe(`granny_v5_room/${NetworkEngine.roomCode}`);
      NetworkEngine.announce();
    }
  } catch (err) {}

  Player.position.set(60.0, 30.0, 2.0);
  document.getElementById('hud').style.display = 'block';
  showPrompt('Spawned in 3D Lobby! Press [Enter] to start, or [E] on laptop for settings.');
};

document.getElementById('btn-sync-lobbies').onclick = () => {
  document.getElementById('lobbies-list').innerHTML = '<div style="color:#aaa;">Scanning for active lobbies...</div>';
  NetworkEngine.broadcast('granny_v5_lobbies/query', { sender: NetworkEngine.myId });
};

document.getElementById('btn-join-code').onclick = () => {
  const code = document.getElementById('mp-direct-code').value.trim().toUpperCase();
  if (code.length >= 4) {
    NetworkEngine.roomCode = code;
    showScreen('');

    try {
      if (NetworkEngine.client && NetworkEngine.client.isConnected()) {
        NetworkEngine.client.subscribe(`granny_v5_room/${code}`);
        NetworkEngine.broadcast(`granny_v5_room/${code}`, {
          type: 'JOIN',
          sender: NetworkEngine.myId,
          name: document.getElementById('prof-name').value,
          wardrobe: {
            shirt: document.getElementById('wardrobe-shirt').value,
            skin: document.getElementById('wardrobe-skin').value
          }
        });
      }
    } catch (err) {}

    Player.position.set(60.0, 30.0, 2.0);
    document.getElementById('hud').style.display = 'block';
    showPrompt('Entered 3D Waiting Room! Waiting for host to start...');
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
    showScreen('');
    try {
      if (NetworkEngine.client && NetworkEngine.client.isConnected()) {
        NetworkEngine.client.subscribe(`granny_v5_room/${data.code}`);
        NetworkEngine.broadcast(`granny_v5_room/${data.code}`, {
          type: 'JOIN',
          sender: NetworkEngine.myId,
          name: document.getElementById('prof-name').value,
          wardrobe: {
            shirt: document.getElementById('wardrobe-shirt').value,
            skin: document.getElementById('wardrobe-skin').value
          }
        });
      }
    } catch (err) {}
    Player.position.set(60.0, 30.0, 2.0);
    document.getElementById('hud').style.display = 'block';
  };

  list.appendChild(div);
}

// 18. THROTTLED 1-1200 FPS ENGINE LOOP
setInterval(() => { NetworkEngine.tickSync(); }, 50);

function gameLoop() {
  requestAnimationFrame(gameLoop);

  const now = performance.now();
  const elapsed = now - EngineLimiter.lastFrameTime;

  if (elapsed < EngineLimiter.frameInterval) return;
  EngineLimiter.lastFrameTime = now - (elapsed % EngineLimiter.frameInterval);

  const dt = GameState.isPaused ? 0 : Math.min(elapsed / 1000, 0.05);

  if (!GameState.isPaused) {
    Player.update(dt, camera);
    MonsterAI.update(dt);
    updatePhysicsAndWorld(dt);
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

gameLoop();
