/* =========================================================================
   GAME.JS - CORE CONTROLLER, CUTSCENES, WEAPONS, AI & NETWORK ENGINE
   ========================================================================= */

// 1. FIRST-PERSON HELD VIEWMODEL RIG
const Viewmodel = {
  group: new THREE.Group(),
  models: {},
  activeKey: null,
  loadedDart: null,

  init(camera) {
    camera.add(this.group);
    this.group.position.set(0.32, -0.28, -0.55);

    // Crossbow Model with Loaded Tranquilizer Dart
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

    // Shotgun Model
    const sg = new THREE.Group();
    const barrels = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), Assets.metalMat);
    barrels.rotation.x = Math.PI * 0.5;
    barrels.position.set(0, 0.05, -0.25);
    sg.add(barrels);
    const sgStock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.4), Assets.woodMat);
    sgStock.position.set(0, -0.02, 0.1);
    sg.add(sgStock);
    this.models['Shotgun'] = sg;

    // Claw Hammer Model
    const hm = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.46, 8), Assets.woodMat);
    hm.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.18), Assets.metalMat);
    head.position.set(0, 0.22, -0.03);
    hm.add(head);
    hm.rotation.x = 0.4;
    this.models['Hammer'] = hm;

    // Gasoline Can Model
    const gas = new THREE.Group();
    const gasBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.18), Assets.bloodMat);
    gas.add(gasBody);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6), Assets.metalMat);
    spout.position.set(0.08, 0.2, 0);
    gas.add(spout);
    this.models['Gasoline Can'] = gas;

    // Generic Key Model
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

// 2. PLAYER CONTROLLER WITH INTRO CUTSCENE & UNDER-BED LOOK
const Player = {
  position: new THREE.Vector3(-6.6, 5.8, 8.5),
  velocity: new THREE.Vector3(),
  rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
  radius: 0.38,
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
    this.flashlight = new THREE.SpotLight(0xfff5e4, 2.4, 24, Math.PI * 0.24, 0.35, 1.2);
    scene.add(this.flashlight);
    scene.add(this.flashlight.target);
    Viewmodel.init(camera);
  },

  startWakeUpIntro() {
    this.isIntroPlaying = true;
    this.introTimer = 0;
    this.isHiding = false;
    this.rotation.set(0.85, 0, 0.12); // Lying down on pillow facing ceiling

    const eyelid = document.getElementById('eyelid-overlay');
    eyelid.style.opacity = '1';

    // Wake-up Animation Timeline
    setTimeout(() => { eyelid.style.opacity = '0.3'; }, 600);
    setTimeout(() => { eyelid.style.opacity = '0.9'; }, 1100);
    setTimeout(() => { eyelid.style.opacity = '0.0'; }, 1600);
  },

  update(dt, camera) {
    // A. WAKE-UP BED CUTSCENE PROGRESSION
    if (this.isIntroPlaying) {
      this.introTimer += dt;
      if (this.introTimer < 2.0) {
        // Lying on bed groggily looking around
        camera.position.set(-9.0, 7.25, 9.8);
        this.rotation.x = 0.85 - Math.sin(this.introTimer * 2) * 0.15;
        this.rotation.y = Math.cos(this.introTimer * 1.5) * 0.25;
      } else if (this.introTimer < 3.4) {
        // Sitting up on edge of bed
        const progress = (this.introTimer - 2.0) / 1.4;
        camera.position.lerpVectors(new THREE.Vector3(-9.0, 7.25, 9.8), new THREE.Vector3(-8.2, 7.1, 8.8), progress);
        this.rotation.x = THREE.MathUtils.lerp(0.7, 0.0, progress);
        this.rotation.y = THREE.MathUtils.lerp(0.2, -Math.PI * 0.5, progress);
      } else if (this.introTimer < 4.2) {
        // Stepping off the mattress onto the open floor outside bed collider!
        const progress = (this.introTimer - 3.4) / 0.8;
        camera.position.lerpVectors(new THREE.Vector3(-8.2, 7.1, 8.8), new THREE.Vector3(-6.6, 7.4, 8.5), progress);
      } else {
        // Intro complete! Full movement control unlocked
        this.isIntroPlaying = false;
        this.position.set(-6.6, 5.8, 8.5); // Safely on open bedroom floor!
      }
      camera.quaternion.setFromEuler(this.rotation);
      return;
    }

    // B. UNDER-BED FREE LOOK SYSTEM
    if (this.isHiding) {
      if (this.hidingSpot) {
        camera.position.copy(this.hidingSpot.position);
      }
      camera.quaternion.setFromEuler(this.rotation); // Fully look around while hiding!
      return;
    }

    // C. STANDARD FIRST-PERSON MOVEMENT & PHYSICS
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

    // Gravity
    this.velocity.y -= 22 * dt;
    const dx = move.x * curSpeed * dt;
    const dz = move.z * curSpeed * dt;
    const dy = this.velocity.y * dt;

    // Swept AABB Collision Resolution
    this.resolveMovement(dx, 0, 0);
    this.resolveMovement(0, 0, dz);
    this.resolveMovement(0, dy, 0);

    // Eye Height & Camera
    const eyeHeight = this.isCrouched ? 0.95 : 1.62;
    camera.position.set(this.position.x, this.position.y + eyeHeight, this.position.z);
    camera.quaternion.setFromEuler(this.rotation);

    // Dynamic Flashlight
    this.flashlight.position.copy(camera.position);
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
    this.flashlight.target.position.copy(camera.position).add(fwd);

    Viewmodel.animateBob(dt, isMoving);
  },

  resolveMovement(dx, dy, dz) {
    const targetPos = this.position.clone().add(new THREE.Vector3(dx, dy, dz));
    const playerBox = new THREE.Box3();

    const updateBox = (p) => {
      playerBox.min.set(p.x - this.radius, p.y, p.z - this.radius);
      playerBox.max.set(p.x + this.radius, p.y + this.height, p.z + this.radius);
    };

    updateBox(targetPos);

    for (const box of CollisionWorld.boxes) {
      if (playerBox.intersectsBox(box)) {
        // Automatic Stair Step Climbing (Heights <= 0.48m)
        const stepH = box.max.y - this.position.y;
        if (stepH > 0 && stepH <= 0.48 && dy <= 0) {
          this.position.y = box.max.y;
          this.velocity.y = 0;
          this.isGrounded = true;
          return;
        }

        // Floor Contact
        if (dy < 0) {
          this.position.y = box.max.y;
          this.velocity.y = 0;
          this.isGrounded = true;
          return;
        } else if (dy > 0) { // Ceiling
          this.velocity.y = 0;
          return;
        }
        return; // Block horizontal clipping
      }
    }

    this.position.add(new THREE.Vector3(dx, dy, dz));
  },

  fireWeapon(camera) {
    const cur = Inventory.items[this.activeSlot];
    if (!cur) return;

    if (cur.name === 'Tranquilizer Crossbow') {
      audio.playCrossbow();
      Viewmodel.loadedDart.visible = false;
      setTimeout(() => { Viewmodel.loadedDart.visible = true; }, 1200);

      if (MonsterAI.mesh && camera.position.distanceTo(MonsterAI.mesh.position) < 18) {
        MonsterAI.stun(120);
      }
      NetworkEngine.sendShot(camera.position, new THREE.Vector3(0, 0, -1).applyEuler(this.rotation), 40, 'dart');
    } else if (cur.name === 'Shotgun') {
      audio.playShotgun();
      if (MonsterAI.mesh && camera.position.distanceTo(MonsterAI.mesh.position) < 10) {
        MonsterAI.stun(120);
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

// 3. INVENTORY ENGINE WITH WHEEL SCROLLING & DROP PHYSICS
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

    // Realistic Drop Physics
    House.droppedItems.push({
      item: cur,
      velocity: fwd.clone().multiplyScalar(4).add(new THREE.Vector3(0, 1.8, 0)),
      landed: false
    });
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

// 4. DROPPED ITEM PHYSICS & ACOUSTIC SHOCKWAVE DISPATCHER
function updateDroppedItemsPhysics(dt) {
  for (let i = House.droppedItems.length - 1; i >= 0; i--) {
    const d = House.droppedItems[i];
    if (d.landed) continue;

    d.velocity.y -= 18 * dt; // Gravity
    d.item.group.position.addScaledVector(d.velocity, dt);

    // Floor Collision Check
    const pos = d.item.group.position;
    for (const box of CollisionWorld.boxes) {
      if (pos.x >= box.min.x && pos.x <= box.max.x && pos.z >= box.min.z && pos.z <= box.max.z) {
        if (pos.y <= box.max.y + 0.15 && pos.y >= box.min.y) {
          pos.y = box.max.y + 0.12;
          d.landed = true;

          // Sound Impact & Granny Alert
          audio.playItemDrop(d.item.name, Math.abs(d.velocity.y));
          const noiseRadius = (d.item.name.includes('Hammer') || d.item.name.includes('Vase') || d.item.name.includes('Shotgun')) ? 24 : 14;
          MonsterAI.hearNoise(pos, noiseRadius);
          break;
        }
      }
    }
  }
}

// 5. TUNG TUNG GRANNY AI STATE MACHINE
const MonsterAI = {
  mesh: null,
  state: 'PATROL',
  speed: 3.2,
  chaseSpeed: 5.4,
  stunTimer: 0,
  investigateTarget: new THREE.Vector3(),
  patrolIndex: 0,
  patrolPoints: [
    new THREE.Vector3(-8.0, 5.8, 5.0),
    new THREE.Vector3(2.0, 5.8, 5.0),
    new THREE.Vector3(0.0, 0.2, 4.0),
    new THREE.Vector3(8.0, 0.2, -4.0),
    new THREE.Vector3(-4.0, -5.8, -4.0),
    new THREE.Vector3(0.0, 11.2, 0.0)
  ],

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

    g.position.set(0, 0.2, 0);
    scene.add(g);
    this.mesh = g;
  },

  hearNoise(pos, radius = 16) {
    if (this.state === 'STUNNED') return;
    if (this.mesh.position.distanceTo(pos) <= radius) {
      this.investigateTarget.copy(pos);
      this.state = 'INVESTIGATE';
      audio.triggerTungSahurPattern();
    }
  },

  stun(duration = 120) {
    this.state = 'STUNNED';
    this.stunTimer = duration;
    audio.stopChase();
    audio.playTung();
  },

  update(dt) {
    if (!this.mesh) return;

    if (this.state === 'STUNNED') {
      this.stunTimer -= dt;
      this.mesh.rotation.z = 1.3; // Knocked sideways
      if (this.stunTimer <= 0) {
        this.state = 'PATROL';
        this.mesh.rotation.z = 0;
      }
      return;
    }

    const dist = this.mesh.position.distanceTo(Player.position);
    if (!Player.isHiding && dist < 16) {
      const toPlayer = new THREE.Vector3().subVectors(Player.position, this.mesh.position).normalize();
      const fwd = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation);
      if (fwd.angleTo(toPlayer) < Math.PI * 0.48) {
        if (this.state !== 'CHASE') {
          this.state = 'CHASE';
          audio.startChase();
        }
      }
    }

    let target = null;
    let spd = this.speed;

    if (this.state === 'CHASE') {
      spd = this.chaseSpeed;
      target = Player.position;
      if (Player.isHiding && dist > 3.0) {
        this.state = 'INVESTIGATE';
        this.investigateTarget.copy(Player.position);
        audio.stopChase();
      }
    } else if (this.state === 'INVESTIGATE') {
      target = this.investigateTarget;
      if (this.mesh.position.distanceTo(this.investigateTarget) < 1.5) this.state = 'PATROL';
    } else {
      target = this.patrolPoints[this.patrolIndex];
      if (this.mesh.position.distanceTo(target) < 1.8) {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
      }
    }

    if (target) {
      const dir = new THREE.Vector3().subVectors(target, this.mesh.position);
      dir.y = 0;
      if (dir.length() > 0.1) {
        dir.normalize();
        this.mesh.position.x += dir.x * spd * dt;
        this.mesh.position.z += dir.z * spd * dt;
        this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }

    if (dist < 1.5 && !Player.isHiding && this.state !== 'STUNNED' && !Player.isIntroPlaying) {
      triggerJumpscare();
    }
  }
};

// 6. GLOBAL CROSS-DEVICE MULTIPLAYER ENGINE
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

      // Player Collision against remote survivors
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

// 7. INPUT & POINTER LOCK CONTROLLER
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

    // Pointer Lock Handlers
    document.getElementById('click-to-focus').onclick = () => {
      container.requestPointerLock();
    };
    document.addEventListener('pointerlockchange', () => {
      const isLocked = document.pointerLockElement === container;
      const inGame = document.getElementById('hud').style.display === 'block';
      document.getElementById('click-to-focus').style.display =
        (inGame && !isLocked && !document.getElementById('opt-mobile-mode').checked) ? 'flex' : 'none';
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
        const t = e.changedTouches[0];
        touchId = t.identifier;
        const r = zone.getBoundingClientRect();
        center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });

      zone.addEventListener('touchmove', (e) => {
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
      });

      const end = () => {
        touchId = null;
        knob.style.transform = 'translate(-50%, -50%)';
        cb(0, 0);
      };
      zone.addEventListener('touchend', end);
      zone.addEventListener('touchcancel', end);
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

  // Check Hiding Spots (Under Bed / Wardrobe)
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
function showDaySplash(dayNum) {
  const splash = document.getElementById('day-splash');
  document.getElementById('day-title').innerText = `DAY ${dayNum}`;
  document.getElementById('day-subtitle').innerText =
    dayNum === 1 ? 'Find a way out before she catches you.' :
    dayNum === 5 ? 'FINAL DAY. She will not spare you.' :
    'You woke up with a pounding headache.';

  splash.style.display = 'flex';
  requestAnimationFrame(() => { splash.style.opacity = '1'; });

  setTimeout(() => {
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.style.display = 'none';
      Player.startWakeUpIntro();
    }, 1200);
  }, 2000);
}

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
  MonsterAI.mesh.position.set(0, 0.2, 0);
  MonsterAI.state = 'PATROL';
  showDaySplash(GameState.day);
}

function triggerVictory(method) {
  alert(`VICTORY! ${method}`);
  window.location.reload();
}

// 9. SETTINGS & UI CONTROLLER
const SettingsEngine = {
  init(renderer, camera, scene) {
    // FOV Slider
    const fovEl = document.getElementById('opt-fov');
    fovEl.oninput = (e) => {
      camera.fov = parseFloat(e.target.value);
      camera.updateProjectionMatrix();
      document.getElementById('opt-fov-val').innerText = `${e.target.value}°`;
    };

    // Gamma Slider
    const gammaEl = document.getElementById('opt-gamma');
    gammaEl.oninput = (e) => {
      const v = parseFloat(e.target.value);
      scene.children.forEach(c => {
        if (c.isAmbientLight) c.intensity = 0.28 * v;
      });
      document.getElementById('opt-gamma-val').innerText = `${v.toFixed(1)}`;
    };

    // Resolution Scale
    const resEl = document.getElementById('opt-res');
    resEl.oninput = (e) => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, parseFloat(e.target.value)));
      document.getElementById('opt-res-val').innerText = `${e.target.value}x`;
    };

    // Fog Density
    const fogEl = document.getElementById('opt-fog');
    fogEl.onchange = (e) => {
      const v = e.target.value;
      if (v === 'none') scene.fog.density = 0;
      else if (v === 'light') scene.fog.density = 0.04;
      else if (v === 'normal') scene.fog.density = 0.07;
      else if (v === 'heavy') scene.fog.density = 0.12;
    };

    // Sensitivity Slider
    const sensEl = document.getElementById('opt-sens');
    sensEl.oninput = (e) => {
      Input.mouseSens = 0.0022 * parseFloat(e.target.value);
      document.getElementById('opt-sens-val').innerText = `${e.target.value}`;
    };

    // Invert Y
    document.getElementById('opt-inverty').onchange = (e) => {
      Input.invertY = e.target.checked ? -1 : 1;
    };

    // Crosshairs
    document.getElementById('opt-crosshair').onchange = (e) => {
      document.getElementById('crosshair').className = e.target.value;
    };

    // Mobile Mode Toggle
    document.getElementById('opt-mobile-mode').onchange = (e) => {
      document.getElementById('mobile-controls').style.display = e.target.checked ? 'block' : 'none';
      if (!e.target.checked) document.getElementById('click-to-focus').style.display = 'flex';
    };

    // Audio Mixers
    const updateVols = () => {
      const m = parseFloat(document.getElementById('opt-vol-master').value);
      const s = parseFloat(document.getElementById('opt-vol-sfx').value);
      const mu = parseFloat(document.getElementById('opt-vol-music').value);
      audio.setVolumes(m, s, mu);
    };
    document.getElementById('opt-vol-master').oninput = updateVols;
    document.getElementById('opt-vol-sfx').oninput = updateVols;
    document.getElementById('opt-vol-music').oninput = updateVols;

    // Tabs
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

// 10. RUNTIME INITIALIZATION & GAME LOOP
const GameState = { mode: 'sp', day: 1, maxDays: 5 };

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

// Main Menu Handlers
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
  startGame();
};

function startGame() {
  audio.init();
  showScreen('');
  document.getElementById('hud').style.display = 'block';

  if (document.getElementById('opt-mobile-mode').checked) {
    document.getElementById('mobile-controls').style.display = 'block';
  } else {
    canvasContainer.requestPointerLock();
  }
  respawnPlayer();
}

// Multiplayer UI Helpers
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
