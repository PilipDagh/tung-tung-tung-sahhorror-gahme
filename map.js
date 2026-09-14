/**
 * ============================================================================
 * TUNG TUNG TUNG SAHUR - 1:1 MAP GENERATION & ARCHITECTURE SYSTEM
 * File: map.js
 * ============================================================================
 */

export const CollisionWorld = {
    boxes: [],
    interactives: [],
    doors: [],
    drawers: [],
    paintings: [],
    items: [],

    addStaticBox(box) {
        this.boxes.push(box);
    }
};

// ============================================================================
// 1. ITEM FUNCTIONALITY & 5-PRESET MATRICES
// ============================================================================
export const ITEM_PRESETS = {
    1: {
        "Master Key": { x: -2.5, y: -11.6, z: 2.5, room: "Car Trunk (Level -2)" },
        "Hammer": { x: -12.0, y: -0.5, z: 8.0, room: "Backyard Well Bucket" },
        "Cutting Pliers": { x: 4.5, y: 6.8, z: -3.5, room: "Bedroom 2 Left Drawer (Level 1)" },
        "Padlock Key": { x: 14.5, y: -11.2, z: -1.0, room: "Spider Cellar Safe (Level -2)" },
        "Padlock Code": { x: -8.5, y: 1.2, z: 0.0, room: "Kitchen Cupboard #5 (Level 0)" },
        "Battery": { x: 0.5, y: 12.3, z: 5.5, room: "Secret Area Left Drawer (Level 2)" },
        "Safe Key": { x: -4.0, y: 11.8, z: -4.0, room: "Inside Jail Ventilator (Level 2)" },
        "Weapon Key": { x: -16.0, y: 0.5, z: 3.0, room: "Cogwheel Safe (Playhouse)" },
        "Melon": { x: 13.5, y: -11.5, z: 1.0, room: "Spider Cellar Cupboard #4 (Level -2)" },
        "Winch Handle": { x: 5.0, y: 6.8, z: 3.0, room: "Chest Puzzle (Level 1)" },
        "Playhouse Key": { x: -13.5, y: 0.5, z: 5.0, room: "Inside Melon" },
        "Orange Cogwheel": { x: 14.0, y: -11.8, z: -7.0, room: "Spider Cellar Drain" },
        "Red Cogwheel": { x: -3.5, y: 12.3, z: 2.5, room: "Nursery Right Drawer (Level 2)" },
        "Car Key": { x: 1.0, y: -5.2, z: -1.0, room: "Basement Safe (Level -1)" },
        "Special Key": { x: -6.0, y: 0.8, z: -2.0, room: "Kitchen Locker (Level 0)" },
        "Meat": { x: 14.0, y: -11.0, z: 2.0, room: "Spider Cellar Shelf (Level -2)" },
        "Gasoline Can": { x: -3.0, y: -5.2, z: -2.0, room: "Basement Workbench (Level -1)" },
        "Car Battery": { x: -4.5, y: 6.8, z: -2.5, room: "Bedroom 1 Chest of Drawers (Level 1)" },
        "Engine Part": { x: -7.0, y: 0.8, z: 4.5, room: "Living Room TV Table (Level 0)" },
        "Spark Plug": { x: -0.5, y: 12.3, z: 5.5, room: "Secret Area Right Drawer (Level 2)" },
        "Wrench": { x: 4.0, y: 12.5, z: -3.0, room: "Special Room Locker (Level 2)" }
    },
    2: {
        "Master Key": { x: -13.5, y: 0.5, z: 5.0, room: "Inside Melon" },
        "Hammer": { x: 13.0, y: -11.8, z: 1.5, room: "Spider Cellar Floor (Level -2)" },
        "Cutting Pliers": { x: 5.0, y: 6.8, z: 3.0, room: "Chest Puzzle (Level 1)" },
        "Padlock Key": { x: -16.0, y: 0.5, z: 3.0, room: "Cogwheel Safe (Playhouse)" },
        "Padlock Code": { x: 8.0, y: -11.2, z: -8.0, room: "Sewer Staircase Back Wall (Level -2)" },
        "Battery": { x: -6.5, y: 1.2, z: 0.0, room: "Kitchen Cupboard #6 (Level 0)" },
        "Safe Key": { x: 0.0, y: 12.5, z: 4.5, room: "Secret Area Screwdriver Safe (Level 2)" },
        "Weapon Key": { x: -2.5, y: -11.6, z: 2.5, room: "Car Trunk (Level -2)" },
        "Melon": { x: -6.0, y: 0.8, z: -2.0, room: "Kitchen Locker (Level 0)" },
        "Winch Handle": { x: 7.5, y: 6.5, z: 1.5, room: "Hidden Closet Bottom Shelf (Level 1)" },
        "Playhouse Key": { x: 13.5, y: -11.5, z: 0.5, room: "Spider Cellar Cupboard #3 (Level -2)" },
        "Orange Cogwheel": { x: 0.0, y: 12.5, z: 4.5, room: "Secret Area Screwdriver Safe (Level 2)" },
        "Red Cogwheel": { x: -4.0, y: 12.5, z: -4.0, room: "Behind Jail Ventilator (Level 2)" },
        "Car Key": { x: -4.5, y: 6.5, z: 2.0, room: "Bathroom Toilet (Level 1)" },
        "Special Key": { x: 4.0, y: -5.5, z: 0.0, room: "Hidden Room Table (Level -1)" },
        "Meat": { x: 8.0, y: -11.5, z: -6.5, room: "Sewer Cell Table (Level -2)" },
        "Gasoline Can": { x: -4.5, y: 11.8, z: -2.5, room: "Jail behind Wheelchair (Level 2)" },
        "Car Battery": { x: -3.0, y: -5.2, z: -2.0, room: "Basement Workbench (Level -1)" },
        "Engine Part": { x: -12.0, y: -0.5, z: 8.0, room: "Backyard Well Bucket" },
        "Spark Plug": { x: 3.5, y: 0.8, z: 4.5, room: "Study Left Drawer (Level 0)" },
        "Wrench": { x: 4.5, y: 6.8, z: -2.5, room: "Bedroom 2 Chest (Level 1)" }
    },
    3: {
        "Master Key": { x: -16.0, y: 0.5, z: 3.0, room: "Cogwheel Safe (Playhouse)" },
        "Hammer": { x: -2.5, y: -11.6, z: 2.5, room: "Car Trunk (Level -2)" },
        "Cutting Pliers": { x: 8.0, y: 6.8, z: -3.0, room: "Inside Crow Cage (Level 1)" },
        "Padlock Key": { x: -13.5, y: 0.5, z: 5.0, room: "Inside Melon" },
        "Padlock Code": { x: 4.0, y: 0.8, z: -1.0, room: "Stair Closet (Level 0)" },
        "Battery": { x: 7.5, y: 6.5, z: -2.5, room: "Fireplace (Level 1)" },
        "Safe Key": { x: -4.0, y: 12.0, z: -4.0, room: "Jail Ventilator (Level 2)" },
        "Weapon Key": { x: -6.0, y: 0.8, z: -2.0, room: "Kitchen Locker (Level 0)" },
        "Melon": { x: -12.0, y: -0.5, z: 8.0, room: "Backyard Well Bucket" },
        "Winch Handle": { x: 1.0, y: -5.2, z: -1.0, room: "Inside Basement Safe (Level -1)" },
        "Playhouse Key": { x: 0.0, y: 12.5, z: 4.5, room: "Attic Screwdriver Safe (Level 2)" },
        "Orange Cogwheel": { x: -7.0, y: 0.8, z: 4.5, room: "Dining Room (Level 0)" },
        "Red Cogwheel": { x: -4.5, y: 6.8, z: -3.5, room: "Bedroom 1 Left Drawer (Level 1)" },
        "Car Key": { x: -0.5, y: 12.3, z: 5.5, room: "Secret Area Right Drawer (Level 2)" },
        "Special Key": { x: 7.5, y: 6.8, z: 2.0, room: "Hidden Closet (Level 1)" },
        "Meat": { x: -4.0, y: 12.8, z: 2.0, room: "Nursery above Drawer (Level 2)" },
        "Gasoline Can": { x: 0.0, y: 0.8, z: -2.0, room: "Main Room Shelf (Level 0)" },
        "Car Battery": { x: 8.0, y: -11.8, z: -7.5, room: "Sewer Cell Skeleton (Level -2)" },
        "Engine Part": { x: 5.0, y: 6.5, z: 2.0, room: "Abandoned Closet" },
        "Spark Plug": { x: 4.0, y: 12.5, z: -3.0, room: "Special Room Locker (Level 2)" },
        "Wrench": { x: -7.5, y: 0.8, z: 0.0, room: "Microwave (Level 0)" }
    },
    4: {
        "Master Key": { x: 14.5, y: -11.2, z: -1.0, room: "Spider Cellar Safe (Level -2)" },
        "Hammer": { x: 8.0, y: -11.5, z: -6.5, room: "Sewer Cell Table (Level -2)" },
        "Cutting Pliers": { x: 1.0, y: -5.2, z: -1.0, room: "Basement Safe (Level -1)" },
        "Padlock Key": { x: 0.0, y: 12.5, z: 4.5, room: "Secret Area Screwdriver Safe (Level 2)" },
        "Padlock Code": { x: 8.0, y: 7.2, z: -3.5, room: "Meat Room Wall (Level 1)" },
        "Battery": { x: 7.5, y: 7.0, z: 1.5, room: "Hidden Closet Top Shelf (Level 1)" },
        "Safe Key": { x: 5.0, y: 6.8, z: 3.0, room: "Inside Chest Puzzle" },
        "Weapon Key": { x: -2.5, y: -11.8, z: 1.0, room: "Car Glove Compartment (Level -2)" },
        "Melon": { x: -2.5, y: -11.6, z: 2.5, room: "Car Trunk (Level -2)" },
        "Winch Handle": { x: 4.0, y: 12.5, z: -3.0, room: "Special Room Locker (Level 2)" },
        "Playhouse Key": { x: 3.5, y: 0.8, z: 4.5, room: "Study Left Drawer (Level 0)" },
        "Orange Cogwheel": { x: 8.0, y: 6.8, z: -3.0, room: "Inside Crow Cage (Level 1)" },
        "Red Cogwheel": { x: -12.0, y: -0.5, z: 8.0, room: "Backyard Well Bucket" },
        "Car Key": { x: -3.5, y: 12.3, z: 2.5, room: "Nursery Right Drawer (Level 2)" },
        "Special Key": { x: 13.5, y: -11.5, z: 0.5, room: "Spider Cellar Cupboard #3 (Level -2)" },
        "Meat": { x: 5.0, y: 6.5, z: 2.0, room: "Abandoned Closet" },
        "Gasoline Can": { x: -16.0, y: 0.5, z: -4.0, room: "Shed Bottom Shelf (Level 0)" },
        "Car Battery": { x: 7.5, y: 6.5, z: 2.0, room: "Hidden Closet (Level 1)" },
        "Engine Part": { x: 4.5, y: 7.5, z: -3.0, room: "Bedroom 2 Top Shelf (Level 1)" },
        "Spark Plug": { x: -13.5, y: 0.5, z: 5.0, room: "Inside Melon" },
        "Wrench": { x: -4.0, y: 12.0, z: -4.0, room: "Jail Ventilator (Level 2)" }
    },
    5: {
        "Master Key": { x: 8.0, y: 6.8, z: -3.0, room: "Inside Crow Cage (Level 1)" },
        "Hammer": { x: -12.0, y: -0.5, z: 8.0, room: "Backyard Well Bucket" },
        "Cutting Pliers": { x: -4.5, y: 12.3, z: 2.0, room: "Nursery Left Drawer (Level 2)" },
        "Padlock Key": { x: -13.5, y: 0.5, z: 5.0, room: "Inside Melon" },
        "Padlock Code": { x: 4.5, y: 0.8, z: 4.5, room: "Study Right Drawer (Level 0)" },
        "Battery": { x: 4.0, y: 0.8, z: -1.0, room: "Stair Closet Shelf (Level 0)" },
        "Safe Key": { x: 14.5, y: -11.2, z: -1.0, room: "Spider Cellar Safe (Level -2)" },
        "Weapon Key": { x: 4.5, y: 6.8, z: -2.5, room: "Bedroom 2 Right Drawer (Level 1)" },
        "Melon": { x: 5.0, y: 6.8, z: 3.0, room: "Inside Chest Puzzle" },
        "Winch Handle": { x: 4.5, y: 1.2, z: 5.5, room: "Study Showcase (Level 0)" },
        "Playhouse Key": { x: 13.5, y: -11.5, z: 1.5, room: "Spider Cellar Cupboard #2 (Level -2)" },
        "Orange Cogwheel": { x: 13.5, y: -11.5, z: 1.0, room: "Spider Cellar Cupboard #4 (Level -2)" },
        "Red Cogwheel": { x: 8.0, y: -11.5, z: -6.5, room: "Sewer Cell Table (Level -2)" },
        "Car Key": { x: 0.0, y: 12.5, z: 4.5, room: "Secret Area Screwdriver Safe (Level 2)" },
        "Special Key": { x: 5.0, y: 6.5, z: 2.0, room: "Abandoned Closet" },
        "Meat": { x: 13.5, y: -11.5, z: 2.0, room: "Spider Cellar Cupboard #1 (Level -2)" },
        "Gasoline Can": { x: -7.0, y: 1.2, z: 0.0, room: "Kitchen Cupboard (Level 0)" },
        "Car Battery": { x: 4.0, y: 0.2, z: -1.5, room: "Stair Closet Back Corner (Level 0)" },
        "Engine Part": { x: 14.0, y: -11.0, z: 1.5, room: "Spider Cellar Shelf (Level -2)" },
        "Spark Plug": { x: -16.0, y: 0.5, z: 3.0, room: "Cogwheel Safe (Playhouse)" },
        "Wrench": { x: 14.0, y: -11.8, z: -6.0, room: "Spider Cellar Drain behind Bars (Level -2)" }
    }
};

// ============================================================================
// 2. PROCEDURAL ARCHITECTURAL BUILDER
// ============================================================================
export class House {
    constructor(scene) {
        this.scene = scene;
        this.materials = {
            woodFloor: new THREE.MeshStandardMaterial({ color: 0x3e2b1d, roughness: 0.8 }),
            creakyAtticFloor: new THREE.MeshStandardMaterial({ color: 0x2d1f14, roughness: 0.95 }),
            stoneBasement: new THREE.MeshStandardMaterial({ color: 0x26282a, roughness: 0.9 }),
            concreteGarage: new THREE.MeshStandardMaterial({ color: 0x1f2022, roughness: 0.85 }),
            sewerBricks: new THREE.MeshStandardMaterial({ color: 0x181e18, roughness: 0.95 }),
            interiorWall: new THREE.MeshStandardMaterial({ color: 0x5c5449, roughness: 0.75 }),
            doorWood: new THREE.MeshStandardMaterial({ color: 0x2f1b0c, roughness: 0.7 }),
            metalBars: new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.3 })
        };
    }

    buildSlab(x, y, z, w, h, d, material) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(x, y, z);
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Bounding Box Registration
        const box = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(x, y, z),
            new THREE.Vector3(w, h, d)
        );
        CollisionWorld.addStaticBox(box);
        return mesh;
    }

    buildStaircase(startX, startY, startZ, endX, endY, endZ, steps = 15) {
        const stepWidth = 2.0;
        const dx = (endX - startX) / steps;
        const dy = (endY - startY) / steps;
        const dz = (endZ - startZ) / steps;
        const stepDepth = Math.sqrt(dx * dx + dz * dz) * 1.05;

        for (let i = 0; i < steps; i++) {
            const curX = startX + dx * (i + 0.5);
            const curY = startY + dy * (i + 0.5);
            const curZ = startZ + dz * (i + 0.5);

            this.buildSlab(curX, curY, curZ, stepWidth, Math.abs(dy), stepDepth, this.materials.woodFloor);
        }
    }

    buildHingedDoor(x, y, z, width = 1.4, height = 2.6, opensInward = true) {
        const group = new THREE.Group();
        group.position.set(x - width * 0.5, y, z); // Hinge anchor on edge

        const doorGeo = new THREE.BoxGeometry(width, height, 0.08);
        const doorMesh = new THREE.Mesh(doorGeo, this.materials.doorWood);
        doorMesh.position.set(width * 0.5, height * 0.5, 0);
        group.add(doorMesh);

        this.scene.add(group);

        const doorRecord = {
            group,
            isOpen: false,
            currentAngle: 0,
            targetAngle: 0,
            baseAngle: 0,
            bounds: new THREE.Box3().setFromCenterAndSize(
                new THREE.Vector3(x, y + height * 0.5, z),
                new THREE.Vector3(width, height, 0.2)
            ),
            toggle() {
                this.isOpen = !this.isOpen;
                this.targetAngle = this.isOpen ? (opensInward ? Math.PI * 0.5 : -Math.PI * 0.5) : 0;
            },
            update(dt) {
                this.currentAngle = THREE.MathUtils.lerp(this.currentAngle, this.targetAngle, dt * 6.0);
                this.group.rotation.y = this.currentAngle;
            }
        };

        CollisionWorld.doors.push(doorRecord);
        return doorRecord;
    }

    buildSlidingDrawer(x, y, z, w = 0.8, h = 0.3, d = 0.6) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Tray geometry
        const trayGeo = new THREE.BoxGeometry(w, h, d);
        const trayMesh = new THREE.Mesh(trayGeo, this.materials.doorWood);
        group.add(trayMesh);

        this.scene.add(group);

        const drawerRecord = {
            group,
            isOpen: false,
            baseZ: z,
            currentZ: z,
            targetZ: z,
            toggle() {
                this.isOpen = !this.isOpen;
                this.targetZ = this.isOpen ? this.baseZ + 0.45 : this.baseZ;
            },
            update(dt) {
                this.currentZ = THREE.MathUtils.lerp(this.currentZ, this.targetZ, dt * 8.0);
                this.group.position.z = this.currentZ;
            }
        };

        CollisionWorld.drawers.push(drawerRecord);
        return drawerRecord;
    }

    buildAllFloors() {
        // ====================================================================
        // LEVEL -2: SUB-BASEMENT, GARAGE & SEWERS (Y = -12.0)
        // ====================================================================
        // Floor Slab
        this.buildSlab(0, -12.2, 0, 32, 0.4, 24, this.materials.concreteGarage);
        // Outer Garage Enclosure
        this.buildSlab(0, -9.5, -12, 32, 5.0, 0.4, this.materials.sewerBricks); // North
        this.buildSlab(0, -9.5, 12, 32, 5.0, 0.4, this.materials.sewerBricks);  // South
        this.buildSlab(-16, -9.5, 0, 0.4, 5.0, 24, this.materials.sewerBricks); // West
        this.buildSlab(16, -9.5, 0, 0.4, 5.0, 24, this.materials.sewerBricks);  // East

        // Partition: Spider Cellar (X: 8 to 16, Z: -12 to 2)
        this.buildSlab(8, -9.5, -5, 0.4, 5.0, 14, this.materials.sewerBricks);
        // Sewer Drain Channel
        this.buildSlab(12, -12.5, -7, 6, 0.6, 6, this.materials.sewerBricks);

        // Escape Car Construct (Level -2 Garage)
        const carChassis = this.buildSlab(-2.5, -11.4, 1.5, 2.2, 1.2, 4.4, this.materials.interiorWall);

        // Garage to Basement Ramp / Staircase (Y=-12.0 to Y=-6.0)
        this.buildStaircase(-7.0, -12.0, 4.0, -7.0, -6.0, 10.0, 16);

        // ====================================================================
        // LEVEL -1: MAIN BASEMENT & SAUNA (Y = -6.0)
        // ====================================================================
        // Continuous Floor Slab
        this.buildSlab(0, -6.2, 0, 26, 0.4, 22, this.materials.stoneBasement);
        // Walls
        this.buildSlab(0, -3.5, -11, 26, 5.0, 0.4, this.materials.stoneBasement);
        this.buildSlab(0, -3.5, 11, 26, 5.0, 0.4, this.materials.stoneBasement);
        this.buildSlab(-13, -3.5, 0, 0.4, 5.0, 22, this.materials.stoneBasement);
        this.buildSlab(13, -3.5, 0, 0.4, 5.0, 22, this.materials.stoneBasement);

        // Sauna Room (X: 4 to 12, Z: 0 to 8)
        this.buildSlab(4, -3.5, 4, 0.4, 5.0, 8, this.materials.woodFloor);
        this.buildHingedDoor(4, -6.0, 2, 1.2, 2.4, true);

        // Secret Passage Wall Cavity (Lower Entrance)
        this.buildSlab(-6, -3.5, -5, 0.4, 5.0, 6, this.materials.stoneBasement);

        // Basement to Ground Floor Wooden Stairs (Y=-6.0 to Y=0.0)
        this.buildStaircase(3.0, -6.0, -4.0, 3.0, 0.0, -9.0, 15);

        // ====================================================================
        // LEVEL 0: GROUND FLOOR (Y = 0.0)
        // ====================================================================
        // Seamless Ground Floor Slab
        this.buildSlab(0, -0.2, 0, 24, 0.4, 22, this.materials.woodFloor);
        // Main Perimeter Walls
        this.buildSlab(0, 2.5, -11, 24, 5.0, 0.4, this.materials.interiorWall); // Front Door Wall
        this.buildSlab(0, 2.5, 11, 24, 5.0, 0.4, this.materials.interiorWall);
        this.buildSlab(-12, 2.5, 0, 0.4, 5.0, 22, this.materials.interiorWall);
        this.buildSlab(12, 2.5, 0, 0.4, 5.0, 22, this.materials.interiorWall);

        // Front 5-Tier Exit Door (X=0, Z=-11)
        this.buildHingedDoor(0, 0.0, -11, 1.6, 2.8, false);

        // Interior Dividing Walls: Kitchen / Dining / Study
        this.buildSlab(-4, 2.5, -3, 0.4, 5.0, 12, this.materials.interiorWall); // Kitchen Wall
        this.buildSlab(4, 2.5, 5, 0.4, 5.0, 10, this.materials.interiorWall);  // Study Wall

        // Courtyard / Backyard (Open Exterior)
        this.buildSlab(-16, -0.2, 5, 12, 0.4, 16, this.materials.stoneBasement);
        // Courtyard Playhouse & Well
        this.buildSlab(-16, 1.5, 3, 4, 3.0, 4, this.materials.woodFloor);

        // Grand Central Staircase (Level 0 to Level 1, Y=0.0 to Y=6.0)
        this.buildStaircase(0.0, 0.0, 3.0, 0.0, 6.0, 8.0, 16);

        // ====================================================================
        // LEVEL 1: SECOND FLOOR (Y = 6.0)
        // ====================================================================
        // Level 1 Floor Slab (with stair opening cut-out)
        this.buildSlab(-5, 5.8, 0, 14, 0.4, 22, this.materials.woodFloor);
        this.buildSlab(5, 5.8, 0, 6, 0.4, 22, this.materials.woodFloor);
        this.buildSlab(0, 5.8, -6, 8, 0.4, 10, this.materials.woodFloor);

        // Level 1 Outer Walls
        this.buildSlab(0, 8.5, -11, 24, 5.0, 0.4, this.materials.interiorWall);
        this.buildSlab(0, 8.5, 11, 24, 5.0, 0.4, this.materials.interiorWall);
        this.buildSlab(-12, 8.5, 0, 0.4, 5.0, 22, this.materials.interiorWall);
        this.buildSlab(12, 8.5, 0, 0.4, 5.0, 22, this.materials.interiorWall);

        // Bedroom 1 (Spawn Room: X: -10 to -3, Z: -10 to -2)
        this.buildSlab(-3, 8.5, -6, 0.4, 5.0, 8, this.materials.interiorWall);
        this.buildHingedDoor(-3, 6.0, -3, 1.3, 2.5, true);

        // Spawn Bed (Where player awakens Day 1)
        this.buildSlab(-7.0, 6.4, -6.5, 2.2, 0.8, 3.5, this.materials.doorWood);

        // Crow & Meat Room Secret Corridor
        this.buildSlab(7, 8.5, -3, 0.4, 5.0, 8, this.materials.interiorWall);

        // Attic Dedicated Staircase (Level 1 to Level 2, Y=6.0 to Y=11.5)
        this.buildStaircase(2.0, 6.0, 5.0, 2.0, 11.5, 9.5, 14);

        // ====================================================================
        // LEVEL 2: THIRD FLOOR / ATTIC (Y = 11.5)
        // ====================================================================
        // Unfinished Floorboards
        this.buildSlab(0, 11.3, 0, 20, 0.4, 18, this.materials.creakyAtticFloor);

        // Weak/Creaking Falling Floorboard Zone (Hazard)
        const weakBoard = this.buildSlab(0, 11.35, -2, 3.0, 0.1, 3.0, this.materials.woodFloor);
        weakBoard.name = "WEAK_CREAKY_BOARD";

        // Attic Walls & Slanted Rafters
        this.buildSlab(0, 13.5, -9, 20, 4.0, 0.4, this.materials.interiorWall);
        this.buildSlab(0, 13.5, 9, 20, 4.0, 0.4, this.materials.interiorWall);
        this.buildSlab(-10, 13.5, 0, 0.4, 4.0, 18, this.materials.interiorWall);
        this.buildSlab(10, 13.5, 0, 0.4, 4.0, 18, this.materials.interiorWall);

        // Jail Room Cell (with metal bars)
        this.buildSlab(-4, 13.5, -3, 0.2, 4.0, 6, this.materials.metalBars);

        // Special Spider Room Door
        this.buildHingedDoor(4, 11.5, -3, 1.3, 2.4, true);
    }

    spawnPresetItems(presetNumber = 1) {
        const preset = ITEM_PRESETS[presetNumber] || ITEM_PRESETS[1];
        const itemGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
        const itemMat = new THREE.MeshStandardMaterial({ color: 0xc49a45, roughness: 0.3 });

        for (const [name, data] of Object.entries(preset)) {
            const mesh = new THREE.Mesh(itemGeo, itemMat);
            mesh.position.set(data.x, data.y, data.z);
            mesh.name = `ITEM_${name}`;
            this.scene.add(mesh);

            CollisionWorld.items.push({
                name,
                mesh,
                bounds: new THREE.Box3().setFromObject(mesh),
                locationDescription: data.room
            });
        }
    }
}
