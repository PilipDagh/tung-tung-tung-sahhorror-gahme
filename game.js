/**
 * ============================================================================
 * TUNG TUNG TUNG SAHUR - RE-ENGINEERED ENEMY AI & NAV-GRAPH ENGINE
 * File: game.js (MonsterAI Subsystem)
 * ============================================================================
 */

// ============================================================================
// 1. 3D WAYPOINT NAVGRAPH ENGINE
// ============================================================================
export class NavGraph {
    constructor() {
        this.nodes = new Map(); // id -> { id, pos: THREE.Vector3, floor: number, edges: [] }
    }

    addNode(id, x, y, z, floor) {
        this.nodes.set(id, {
            id,
            pos: new THREE.Vector3(x, y, z),
            floor,
            edges: []
        });
    }

    connect(idA, idB, bidirectional = true) {
        const nodeA = this.nodes.get(idA);
        const nodeB = this.nodes.get(idB);
        if (!nodeA || !nodeB) return;

        const dist = nodeA.pos.distanceTo(nodeB.pos);
        // Vertical stair penalty prevents AI from attempting diagonal stair phasing
        const verticalDiff = Math.abs(nodeA.pos.y - nodeB.pos.y);
        const weight = dist + (verticalDiff > 0.5 ? verticalDiff * 2.5 : 0);

        nodeA.edges.push({ to: idB, weight });
        if (bidirectional) {
            nodeB.edges.push({ to: idA, weight });
        }
    }

    getClosestNode(pos, preferredFloor = null) {
        let bestNode = null;
        let minDist = Infinity;

        for (const [id, node] of this.nodes) {
            if (preferredFloor !== null && Math.abs(node.floor - preferredFloor) > 0.5) {
                continue;
            }
            const d = pos.distanceTo(node.pos);
            if (d < minDist) {
                minDist = d;
                bestNode = node;
            }
        }
        return bestNode;
    }

    findPath(startPos, targetPos) {
        const startNode = this.getClosestNode(startPos);
        const endNode = this.getClosestNode(targetPos);

        if (!startNode || !endNode) return [];
        if (startNode.id === endNode.id) return [endNode.pos.clone(), targetPos.clone()];

        // A* Pathfinding Implementation
        const openSet = new Set([startNode.id]);
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        for (const [id] of this.nodes) {
            gScore.set(id, Infinity);
            fScore.set(id, Infinity);
        }

        gScore.set(startNode.id, 0);
        fScore.set(startNode.id, startNode.pos.distanceTo(endNode.pos));

        while (openSet.size > 0) {
            let currentId = null;
            let lowestF = Infinity;
            for (const id of openSet) {
                const f = fScore.get(id);
                if (f < lowestF) {
                    lowestF = f;
                    currentId = id;
                }
            }

            if (currentId === endNode.id) {
                // Reconstruct Path
                const path = [targetPos.clone()];
                let curr = currentId;
                while (cameFrom.has(curr)) {
                    path.unshift(this.nodes.get(curr).pos.clone());
                    curr = cameFrom.get(curr);
                }
                path.unshift(startPos.clone());
                return path;
            }

            openSet.delete(currentId);
            const currentNode = this.nodes.get(currentId);

            for (const edge of currentNode.edges) {
                const tentativeG = gScore.get(currentId) + edge.weight;
                if (tentativeG < gScore.get(edge.to)) {
                    cameFrom.set(edge.to, currentId);
                    gScore.set(edge.to, tentativeG);
                    const neighborPos = this.nodes.get(edge.to).pos;
                    fScore.set(edge.to, tentativeG + neighborPos.distanceTo(endNode.pos));
                    openSet.add(edge.to);
                }
            }
        }
        return [targetPos.clone()]; // Fallback
    }
}

// ============================================================================
// 2. COMPLETE HOUSE WAYPOINT REGISTRY
// ============================================================================
export function buildHouseNavGraph() {
    const nav = new NavGraph();

    // --- LEVEL -2: SUB-BASEMENT & GARAGE (Y = -12.0) ---
    nav.addNode("L2_GARAGE_CENTER", 0.0, -12.0, 0.0, -2);
    nav.addNode("L2_CAR_DRIVER", -2.5, -12.0, 1.5, -2);
    nav.addNode("L2_GARAGE_DOOR", 0.0, -12.0, -8.0, -2);
    nav.addNode("L2_SPIDER_TUNNEL", 8.0, -12.0, 0.0, -2);
    nav.addNode("L2_SPIDER_CELLAR", 14.0, -12.0, 0.0, -2);
    nav.addNode("L2_SEWER_DRAIN", 14.0, -12.0, -7.0, -2);
    nav.addNode("L2_SEWER_CELL", 8.0, -12.0, -7.0, -2);
    nav.addNode("L2_RAMP_BOTTOM", -7.0, -12.0, 4.0, -2);

    nav.connect("L2_GARAGE_CENTER", "L2_CAR_DRIVER");
    nav.connect("L2_GARAGE_CENTER", "L2_GARAGE_DOOR");
    nav.connect("L2_GARAGE_CENTER", "L2_SPIDER_TUNNEL");
    nav.connect("L2_SPIDER_TUNNEL", "L2_SPIDER_CELLAR");
    nav.connect("L2_SPIDER_CELLAR", "L2_SEWER_DRAIN");
    nav.connect("L2_SEWER_DRAIN", "L2_SEWER_CELL");
    nav.connect("L2_GARAGE_CENTER", "L2_RAMP_BOTTOM");

    // --- LEVEL -1: MAIN BASEMENT (Y = -6.0) ---
    nav.addNode("L1_RAMP_TOP", -7.0, -6.0, 4.0, -1);
    nav.addNode("L1_BASEMENT_HALL", 0.0, -6.0, 0.0, -1);
    nav.addNode("L1_WORKBENCH", -3.0, -6.0, -2.0, -1);
    nav.addNode("L1_SAUNA_DOOR", 4.0, -6.0, 2.0, -1);
    nav.addNode("L1_SAUNA_INTERIOR", 8.0, -6.0, 2.0, -1);
    nav.addNode("L1_SECRET_TUNNEL_BASE", -6.0, -6.0, -5.0, -1);
    nav.addNode("L1_BASEMENT_STAIRS_BOTTOM", 3.0, -6.0, -4.0, -1);

    nav.connect("L2_RAMP_BOTTOM", "L1_RAMP_TOP"); // Inter-floor garage ramp
    nav.connect("L1_RAMP_TOP", "L1_BASEMENT_HALL");
    nav.connect("L1_BASEMENT_HALL", "L1_WORKBENCH");
    nav.connect("L1_BASEMENT_HALL", "L1_SAUNA_DOOR");
    nav.connect("L1_SAUNA_DOOR", "L1_SAUNA_INTERIOR");
    nav.connect("L1_BASEMENT_HALL", "L1_SECRET_TUNNEL_BASE");
    nav.connect("L1_BASEMENT_HALL", "L1_BASEMENT_STAIRS_BOTTOM");

    // --- LEVEL 0: GROUND FLOOR (Y = 0.0) ---
    nav.addNode("L0_BASEMENT_STAIRS_TOP", 3.0, 0.0, -4.0, 0);
    nav.addNode("L0_MAIN_FOYER", 0.0, 0.0, 0.0, 0);
    nav.addNode("L0_FRONT_DOOR", 0.0, 0.0, -6.5, 0);
    nav.addNode("L0_STAIRCASE_CLOSET", 4.0, 0.0, -1.0, 0);
    nav.addNode("L0_KITCHEN_ENTRANCE", -4.0, 0.0, 0.0, 0);
    nav.addNode("L0_KITCHEN_CENTER", -7.0, 0.0, 0.0, 0);
    nav.addNode("L0_DINING_ROOM", -7.0, 0.0, 5.0, 0);
    nav.addNode("L0_STUDY_ROOM", 4.0, 0.0, 5.0, 0);
    nav.addNode("L0_BACKYARD_WINDOW", -9.0, 0.0, 5.0, 0);
    nav.addNode("L0_COURTYARD_WELL", -12.0, 0.0, 8.0, 0);
    nav.addNode("L0_COURTYARD_PLAYHOUSE", -16.0, 0.0, 3.0, 0);
    nav.addNode("L0_GRAND_STAIRS_BOTTOM", 0.0, 0.0, 3.0, 0);

    nav.connect("L1_BASEMENT_STAIRS_BOTTOM", "L0_BASEMENT_STAIRS_TOP"); // Inter-floor basement stairs
    nav.connect("L0_BASEMENT_STAIRS_TOP", "L0_MAIN_FOYER");
    nav.connect("L0_MAIN_FOYER", "L0_FRONT_DOOR");
    nav.connect("L0_MAIN_FOYER", "L0_STAIRCASE_CLOSET");
    nav.connect("L0_MAIN_FOYER", "L0_KITCHEN_ENTRANCE");
    nav.connect("L0_KITCHEN_ENTRANCE", "L0_KITCHEN_CENTER");
    nav.connect("L0_KITCHEN_CENTER", "L0_DINING_ROOM");
    nav.connect("L0_DINING_ROOM", "L0_STUDY_ROOM");
    nav.connect("L0_STUDY_ROOM", "L0_MAIN_FOYER");
    nav.connect("L0_DINING_ROOM", "L0_BACKYARD_WINDOW");
    nav.connect("L0_BACKYARD_WINDOW", "L0_COURTYARD_WELL");
    nav.connect("L0_COURTYARD_WELL", "L0_COURTYARD_PLAYHOUSE");
    nav.connect("L0_MAIN_FOYER", "L0_GRAND_STAIRS_BOTTOM");

    // --- LEVEL 1: SECOND FLOOR (Y = 6.0) ---
    nav.addNode("L1_GRAND_STAIRS_TOP", 0.0, 6.0, 3.0, 1);
    nav.addNode("L1_MAIN_LANDING", 0.0, 6.0, 0.0, 1);
    nav.addNode("L1_BEDROOM1_SPAWN", -4.0, 6.0, -3.0, 1); // Player Bed Spawn
    nav.addNode("L1_BATHROOM", -4.0, 6.0, 2.0, 1);
    nav.addNode("L1_BEDROOM2", 4.0, 6.0, -3.0, 1);
    nav.addNode("L1_BEDROOM3_CLOSET", 5.0, 6.0, 2.0, 1);
    nav.addNode("L1_SECRET_PASSAGE", 7.5, 6.0, 2.0, 1);
    nav.addNode("L1_CROW_MEAT_ROOM", 8.0, 6.0, -3.0, 1);
    nav.addNode("L1_ATTIC_STAIRS_BOTTOM", 2.0, 6.0, 5.0, 1);

    nav.connect("L0_GRAND_STAIRS_BOTTOM", "L1_GRAND_STAIRS_TOP"); // Inter-floor grand stairs
    nav.connect("L1_GRAND_STAIRS_TOP", "L1_MAIN_LANDING");
    nav.connect("L1_MAIN_LANDING", "L1_BEDROOM1_SPAWN");
    nav.connect("L1_MAIN_LANDING", "L1_BATHROOM");
    nav.connect("L1_MAIN_LANDING", "L1_BEDROOM2");
    nav.connect("L1_MAIN_LANDING", "L1_BEDROOM3_CLOSET");
    nav.connect("L1_BEDROOM3_CLOSET", "L1_SECRET_PASSAGE");
    nav.connect("L1_SECRET_PASSAGE", "L1_CROW_MEAT_ROOM");
    nav.connect("L1_MAIN_LANDING", "L1_ATTIC_STAIRS_BOTTOM");

    // Connect vertical secret tunnel (Basement Level -1 to Meat Room Level 1)
    nav.connect("L1_SECRET_TUNNEL_BASE", "L1_CROW_MEAT_ROOM");

    // --- LEVEL 2: THIRD FLOOR / ATTIC (Y = 11.5) ---
    nav.addNode("L2_ATTIC_STAIRS_TOP", 2.0, 11.5, 5.0, 2);
    nav.addNode("L2_ATTIC_LANDING", 0.0, 11.5, 2.0, 2);
    nav.addNode("L2_CREAK_PLANK_ZONE", 0.0, 11.5, -2.0, 2);
    nav.addNode("L2_JAIL_ROOM", -4.0, 11.5, -3.0, 2);
    nav.addNode("L2_SPECIAL_SPIDER", 4.0, 11.5, -3.0, 2);
    nav.addNode("L2_NURSERY", -4.0, 11.5, 2.0, 2);
    nav.addNode("L2_SECRET_TOP_RAFTERS", 0.0, 11.5, 5.0, 2);

    nav.connect("L1_ATTIC_STAIRS_BOTTOM", "L2_ATTIC_STAIRS_TOP"); // Inter-floor attic stairs
    nav.connect("L2_ATTIC_STAIRS_TOP", "L2_ATTIC_LANDING");
    nav.connect("L2_ATTIC_LANDING", "L2_CREAK_PLANK_ZONE");
    nav.connect("L2_CREAK_PLANK_ZONE", "L2_JAIL_ROOM");
    nav.connect("L2_CREAK_PLANK_ZONE", "L2_SPECIAL_SPIDER");
    nav.connect("L2_ATTIC_LANDING", "L2_NURSERY");
    nav.connect("L2_ATTIC_LANDING", "L2_SECRET_TOP_RAFTERS");

    return nav;
}

// ============================================================================
// 3. OVERHAULED MONSTER AI CLASS
// ============================================================================
export class MonsterAI {
    constructor(scene, collisionWorld, navGraph, audio) {
        this.scene = scene;
        this.collisionWorld = collisionWorld;
        this.nav = navGraph;
        this.audio = audio;

        // Visual Construction (Granny / Triple T with custom motif)
        this.group = new THREE.Group();
        this.buildMesh();
        this.scene.add(this.group);

        // State Machine States: SLEEPING, PATROL, INVESTIGATE, CHASE, SEARCH_LOOK_AROUND
        this.state = "SLEEPING";
        this.graceTimer = 15.0; // 15s initial spawn grace period
        this.speed = 3.2; // Base walk speed
        this.chaseSpeed = 5.2; // Aggro sprint speed

        // Sensory Parameters
        this.fovDegrees = 75.0;
        this.viewDistance = 22.0;
        this.boundingRadius = 0.55;
        this.height = 1.85;

        // Path Execution
        this.currentPath = [];
        this.pathIndex = 0;
        this.targetDestination = new THREE.Vector3();

        // Memory & Search Routine
        this.lastKnownPlayerPos = new THREE.Vector3();
        this.investigateWaitTime = 0.0;
        this.lookAroundAngle = 0;
        this.patrolCycle = [
            "L1_BASEMENT_HALL",
            "L0_MAIN_FOYER",
            "L0_KITCHEN_CENTER",
            "L1_MAIN_LANDING",
            "L1_BEDROOM1_SPAWN",
            "L2_ATTIC_LANDING",
            "L2_JAIL_ROOM",
            "L0_DINING_ROOM",
            "L2_GARAGE_CENTER"
        ];
        this.patrolIndex = 0;

        // Spawn far away in Basement Level -1
        this.respawnAtSafeLocation();
    }

    buildMesh() {
        const bodyGeo = new THREE.CylinderGeometry(0.35, 0.55, 1.4, 12);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32, roughness: 0.85 });
        this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        this.bodyMesh.position.y = 0.7;
        this.group.add(this.bodyMesh);

        const headGeo = new THREE.SphereGeometry(0.28, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x82776d, roughness: 0.6 });
        this.headMesh = new THREE.Mesh(headGeo, headMat);
        this.headMesh.position.y = 1.55;
        this.group.add(this.headMesh);

        // Weapon (Bloody Bat)
        const batGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.9, 8);
        const batMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
        this.batMesh = new THREE.Mesh(batGeo, batMat);
        this.batMesh.position.set(0.45, 0.8, 0.3);
        this.batMesh.rotation.x = Math.PI / 4;
        this.group.add(this.batMesh);
    }

    respawnAtSafeLocation() {
        // Always place in Basement Hallway on init/day reset
        const spawnNode = this.nav.nodes.get("L1_BASEMENT_HALL");
        if (spawnNode) {
            this.group.position.copy(spawnNode.pos);
        } else {
            this.group.position.set(0.0, -6.0, 0.0);
        }
        this.state = "SLEEPING";
        this.graceTimer = 15.0; // Grace period active
        this.currentPath = [];
    }

    triggerRespawnGrace(seconds = 10.0) {
        this.respawnAtSafeLocation();
        this.graceTimer = seconds;
        this.state = "SLEEPING";
    }

    hearNoise(soundPos, noiseRadius = 20.0) {
        // If within awakening grace period, noise is ignored entirely
        if (this.graceTimer > 0) return;

        const dist = this.group.position.distanceTo(soundPos);
        if (dist <= noiseRadius) {
            // Priority: Do not abort an active direct visual chase unless the sound is very close
            if (this.state === "CHASE" && dist > 6.0) return;

            this.state = "INVESTIGATE";
            this.investigateWaitTime = 0.0;
            this.lastKnownPlayerPos.copy(soundPos);
            this.recalculatePath(soundPos);
            if (this.audio && this.audio.playCreepChuckle) {
                this.audio.playCreepChuckle();
            }
        }
    }

    canSeePlayer(player) {
        if (this.graceTimer > 0) return false;
        if (player.isHiding) return false;

        const aiEye = this.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const playerEye = player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        const dist = aiEye.distanceTo(playerEye);

        if (dist > this.viewDistance) return false;

        // Check Vision Cone (FOV)
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion).normalize();
        const toPlayer = playerEye.clone().sub(aiEye).normalize();
        const angle = THREE.MathUtils.radToDeg(forward.angleTo(toPlayer));

        if (angle > this.fovDegrees * 0.5) return false;

        // Line-of-Sight Occlusion Raycast against Collision Geometry
        const ray = new THREE.Ray(aiEye, toPlayer);
        const testBox = new THREE.Box3();

        for (let i = 0; i < this.collisionWorld.boxes.length; i++) {
            testBox.copy(this.collisionWorld.boxes[i]);
            // Ignore small steps/floor slabs to prevent floor false-positives
            if (testBox.max.y - testBox.min.y < 0.3) continue;

            const intersectionPoint = new THREE.Vector3();
            if (ray.intersectBox(testBox, intersectionPoint)) {
                if (aiEye.distanceTo(intersectionPoint) < dist - 0.2) {
                    return false; // Vision occluded by wall/door
                }
            }
        }
        return true;
    }

    recalculatePath(targetPos) {
        this.currentPath = this.nav.findPath(this.group.position, targetPos);
        this.pathIndex = 0;
    }

    moveWithAABBCollision(deltaMove) {
        const originalPos = this.group.position.clone();

        // 1. Move on X
        this.group.position.x += deltaMove.x;
        let aiBox = new THREE.Box3().setFromCenterAndSize(
            this.group.position.clone().add(new THREE.Vector3(0, this.height * 0.5, 0)),
            new THREE.Vector3(this.boundingRadius * 2, this.height, this.boundingRadius * 2)
        );

        for (let i = 0; i < this.collisionWorld.boxes.length; i++) {
            const b = this.collisionWorld.boxes[i];
            // Step-up tolerance check (<= 0.48m behaves like steps)
            if (aiBox.intersectsBox(b)) {
                if (b.max.y - originalPos.y <= 0.48 && b.max.y > originalPos.y) {
                    this.group.position.y = b.max.y;
                } else {
                    this.group.position.x = originalPos.x; // Block X
                    break;
                }
            }
        }

        // 2. Move on Z
        this.group.position.z += deltaMove.z;
        aiBox.setFromCenterAndSize(
            this.group.position.clone().add(new THREE.Vector3(0, this.height * 0.5, 0)),
            new THREE.Vector3(this.boundingRadius * 2, this.height, this.boundingRadius * 2)
        );

        for (let i = 0; i < this.collisionWorld.boxes.length; i++) {
            const b = this.collisionWorld.boxes[i];
            if (aiBox.intersectsBox(b)) {
                if (b.max.y - originalPos.y <= 0.48 && b.max.y > originalPos.y) {
                    this.group.position.y = b.max.y;
                } else {
                    this.group.position.z = originalPos.z; // Block Z
                    break;
                }
            }
        }

        // 3. Move on Y (Ground clamp / Stair navigation)
        this.group.position.y += deltaMove.y;
    }

    update(dt, player, onCatchPlayerCallback) {
        // --- 1. AWAKENING GRACE PERIOD HANDLING ---
        if (this.graceTimer > 0) {
            this.graceTimer -= dt;
            // Execute passive, non-lethal patrol routine while player wakes up
            this.executePatrolStep(dt, this.speed * 0.6);
            return;
        }

        // --- 2. SENSORY PERCEPTION SCAN ---
        const seesTarget = this.canSeePlayer(player);

        if (seesTarget) {
            this.state = "CHASE";
            this.lastKnownPlayerPos.copy(player.position);
            this.targetDestination.copy(player.position);
            // Dynamic path directly to player when in LOS
            this.recalculatePath(player.position);
        } else if (this.state === "CHASE") {
            // Lost direct Line-of-Sight -> Move to Last Known Position
            this.state = "INVESTIGATE";
            this.investigateWaitTime = 0.0;
            this.recalculatePath(this.lastKnownPlayerPos);
        }

        // --- 3. STATE MACHINE EXECUTION ---
        const currentSpeed = (this.state === "CHASE") ? this.chaseSpeed : this.speed;

        switch (this.state) {
            case "CHASE":
            case "INVESTIGATE":
                this.executePathTraversal(dt, currentSpeed, () => {
                    // Reached destination
                    if (this.state === "INVESTIGATE") {
                        this.state = "SEARCH_LOOK_AROUND";
                        this.investigateWaitTime = 4.0; // Spend 4 seconds searching
                        this.lookAroundAngle = 0;
                    }
                });
                break;

            case "SEARCH_LOOK_AROUND":
                this.investigateWaitTime -= dt;
                // Spin around and scan room
                this.group.rotation.y += dt * 3.0;
                if (this.investigateWaitTime <= 0) {
                    this.state = "PATROL";
                    this.advancePatrol();
                }
                break;

            case "PATROL":
            default:
                this.executePatrolStep(dt, this.speed);
                break;
        }

        // --- 4. KILL HITBOX TRIGGER ---
        if (this.state === "CHASE") {
            const hitDist = this.group.position.distanceTo(player.position);
            const verticalDist = Math.abs(this.group.position.y - player.position.y);
            if (hitDist < 1.7 && verticalDist < 1.8) {
                if (onCatchPlayerCallback) {
                    onCatchPlayerCallback();
                }
            }
        }
    }

    executePatrolStep(dt, speed) {
        if (this.currentPath.length === 0 || this.pathIndex >= this.currentPath.length) {
            this.advancePatrol();
        }
        this.executePathTraversal(dt, speed, () => {
            this.advancePatrol();
        });
    }

    advancePatrol() {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrolCycle.length;
        const targetNodeId = this.patrolCycle[this.patrolIndex];
        const node = this.nav.nodes.get(targetNodeId);
        if (node) {
            this.recalculatePath(node.pos);
        }
    }

    executePathTraversal(dt, moveSpeed, onReachDestination) {
        if (this.pathIndex >= this.currentPath.length) {
            if (onReachDestination) onReachDestination();
            return;
        }

        const nextPoint = this.currentPath[this.pathIndex];
        const flatAiPos = new THREE.Vector3(this.group.position.x, 0, this.group.position.z);
        const flatTargetPos = new THREE.Vector3(nextPoint.x, 0, nextPoint.z);
        const distanceToWaypoint = flatAiPos.distanceTo(flatTargetPos);

        // Check if waypoint reached
        if (distanceToWaypoint < 0.45) {
            this.pathIndex++;
            if (this.pathIndex >= this.currentPath.length) {
                if (onReachDestination) onReachDestination();
                return;
            }
        }

        // Compute step velocity
        const moveDir = new THREE.Vector3()
            .subVectors(nextPoint, this.group.position);
        
        // Handle vertical staircase/ramp transition
        const yDiff = moveDir.y;
        moveDir.y = 0;
        moveDir.normalize();

        const step = moveDir.multiplyScalar(moveSpeed * dt);
        // Vertical step interpolation
        step.y = THREE.MathUtils.clamp(yDiff * 5.0 * dt, -0.4, 0.4);

        // Rotate facing direction smoothly
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 10.0 * dt);

        // Apply swept collision movement
        this.moveWithAABBCollision(step);
    }
}
