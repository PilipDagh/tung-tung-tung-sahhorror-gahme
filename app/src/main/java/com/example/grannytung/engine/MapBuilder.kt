package com.example.grannytung.engine

import com.example.grannytung.data.ItemsCatalogue
import com.example.grannytung.data.WorldItem
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

data class BoundingBox(
    val minX: Float,
    val minY: Float,
    val minZ: Float,
    val maxX: Float,
    val maxY: Float,
    val maxZ: Float,
    val tag: String = "wall"
) {
    fun contains(x: Float, y: Float, z: Float): Boolean {
        return x in minX..maxX && y in minY..maxY && z in minZ..maxZ
    }

    fun intersects(
        otherMinX: Float, otherMinY: Float, otherMinZ: Float,
        otherMaxX: Float, otherMaxY: Float, otherMaxZ: Float
    ): Boolean {
        return (minX <= otherMaxX && maxX >= otherMinX) &&
                (minY <= otherMaxY && maxY >= otherMinY) &&
                (minZ <= otherMaxZ && maxZ >= otherMinZ)
    }
}

enum class DoorType {
    STANDARD,
    FRONT_EXIT,
    JAIL,
    PLAYHOUSE,
    SAUNA
}

data class ManorDoor(
    val id: String,
    val name: String,
    val x: Float,
    val y: Float,
    val z: Float,
    val width: Float = 1.4f,
    val height: Float = 2.6f,
    var isOpen: Boolean = false,
    val type: DoorType = DoorType.STANDARD
) {
    fun distanceTo(px: Float, py: Float, pz: Float): Float {
        val dx = x - px
        val dy = y - py
        val dz = z - pz
        return sqrt(dx * dx + dy * dy + dz * dz)
    }
}

data class ManorDrawer(
    val id: String,
    val name: String,
    val x: Float,
    val y: Float,
    val z: Float,
    var isOpen: Boolean = false,
    val room: String
) {
    fun distanceTo(px: Float, py: Float, pz: Float): Float {
        val dx = x - px
        val dy = y - py
        val dz = z - pz
        return sqrt(dx * dx + dy * dy + dz * dz)
    }
}

data class HidingSpot(
    val id: String,
    val name: String,
    val x: Float,
    val y: Float,
    val z: Float,
    val floor: Int,
    val isUnderBed: Boolean = true
) {
    fun distanceTo(px: Float, py: Float, pz: Float): Float {
        val dx = x - px
        val dy = y - py
        val dz = z - pz
        return sqrt(dx * dx + dy * dy + dz * dz)
    }
}

class MapBuilder {
    val collisionBoxes = mutableListOf<BoundingBox>()
    val doors = mutableListOf<ManorDoor>()
    val drawers = mutableListOf<ManorDrawer>()
    val hidingSpots = mutableListOf<HidingSpot>()
    val items = mutableListOf<WorldItem>()
    val navGraph = NavGraph()

    // Weak board coordinates in Attic (Level 2)
    val weakPlankMinX = -1.5f
    val weakPlankMaxX = 1.5f
    val weakPlankMinZ = -3.5f
    val weakPlankMaxZ = -0.5f
    val weakPlankY = 11.5f
    var weakPlankTriggered = false

    fun buildWorld(presetNumber: Int = 1) {
        collisionBoxes.clear()
        doors.clear()
        drawers.clear()
        hidingSpots.clear()
        items.clear()

        buildHouseArchitecture()
        buildHouseNavGraph()
        spawnItems(presetNumber)
        setupInteractiveFurniture()
    }

    private fun addBox(x: Float, y: Float, z: Float, w: Float, h: Float, d: Float, tag: String = "wall") {
        collisionBoxes.add(
            BoundingBox(
                minX = x - w * 0.5f,
                minY = y - h * 0.5f,
                minZ = z - d * 0.5f,
                maxX = x + w * 0.5f,
                maxY = y + h * 0.5f,
                maxZ = z + d * 0.5f,
                tag = tag
            )
        )
    }

    private fun buildHouseArchitecture() {
        // --- LEVEL -2: SUB-BASEMENT & GARAGE (Y = -12.0) ---
        addBox(0f, -12.2f, 0f, 32f, 0.4f, 24f, "floor_garage")
        addBox(0f, -9.5f, -12f, 32f, 5.0f, 0.4f, "wall_stone") // North
        addBox(0f, -9.5f, 12f, 32f, 5.0f, 0.4f, "wall_stone")  // South
        addBox(-16f, -9.5f, 0f, 0.4f, 5.0f, 24f, "wall_stone") // West
        addBox(16f, -9.5f, 0f, 0.4f, 5.0f, 24f, "wall_stone")  // East
        // Spider Cellar partition
        addBox(8f, -9.5f, -5f, 0.4f, 5.0f, 14f, "wall_brick")
        // Escape Car construct
        addBox(-2.5f, -11.4f, 1.5f, 2.2f, 1.2f, 4.4f, "car_chassis")

        // --- LEVEL -1: MAIN BASEMENT & SAUNA (Y = -6.0) ---
        addBox(0f, -6.2f, 0f, 26f, 0.4f, 22f, "floor_stone")
        addBox(0f, -3.5f, -11f, 26f, 5.0f, 0.4f, "wall_stone")
        addBox(0f, -3.5f, 11f, 26f, 5.0f, 0.4f, "wall_stone")
        addBox(-13f, -3.5f, 0f, 0.4f, 5.0f, 22f, "wall_stone")
        addBox(13f, -3.5f, 0f, 0.4f, 5.0f, 22f, "wall_stone")
        // Sauna partition
        addBox(4f, -3.5f, 4f, 0.4f, 5.0f, 8f, "wall_wood")
        doors.add(ManorDoor("door_sauna", "Sauna Door", 4f, -6f, 2f, type = DoorType.SAUNA))

        // --- LEVEL 0: GROUND FLOOR (Y = 0.0) ---
        addBox(0f, -0.2f, 0f, 24f, 0.4f, 22f, "floor_wood")
        addBox(0f, 2.5f, -11f, 24f, 5.0f, 0.4f, "wall_interior") // Front Wall
        addBox(0f, 2.5f, 11f, 24f, 5.0f, 0.4f, "wall_interior")
        addBox(-12f, 2.5f, 0f, 0.4f, 5.0f, 22f, "wall_interior")
        addBox(12f, 2.5f, 0f, 0.4f, 5.0f, 22f, "wall_interior")
        // Kitchen / Study dividing walls
        addBox(-4f, 2.5f, -3f, 0.4f, 5.0f, 12f, "wall_interior")
        addBox(4f, 2.5f, 5f, 0.4f, 5.0f, 10f, "wall_interior")
        // Front Exit Door
        doors.add(ManorDoor("door_front", "Main Exit Door", 0f, 0f, -11f, 1.6f, 2.8f, type = DoorType.FRONT_EXIT))
        // Courtyard / Playhouse
        addBox(-16f, -0.2f, 5f, 12f, 0.4f, 16f, "floor_yard")
        doors.add(ManorDoor("door_playhouse", "Playhouse Door", -16f, 0.5f, 3f, type = DoorType.PLAYHOUSE))

        // --- LEVEL 1: SECOND FLOOR (Y = 6.0) ---
        addBox(-5f, 5.8f, 0f, 14f, 0.4f, 22f, "floor_wood")
        addBox(5f, 5.8f, 0f, 6f, 0.4f, 22f, "floor_wood")
        addBox(0f, 5.8f, -6f, 8f, 0.4f, 10f, "floor_wood")
        addBox(0f, 8.5f, -11f, 24f, 5.0f, 0.4f, "wall_interior")
        addBox(0f, 8.5f, 11f, 24f, 5.0f, 0.4f, "wall_interior")
        addBox(-12f, 8.5f, 0f, 0.4f, 5.0f, 22f, "wall_interior")
        addBox(12f, 8.5f, 0f, 0.4f, 5.0f, 22f, "wall_interior")
        // Bedroom 1 (Player Spawn Room)
        addBox(-3f, 8.5f, -6f, 0.4f, 5.0f, 8f, "wall_interior")
        doors.add(ManorDoor("door_bedroom1", "Bedroom Door", -3f, 6f, -3f))
        // Bed in Bedroom 1
        addBox(-7f, 6.4f, -6.5f, 2.2f, 0.8f, 3.5f, "furniture_bed")
        hidingSpots.add(HidingSpot("bed_bedroom1", "Hide Under Bed", -7f, 6f, -6.5f, floor = 1, isUnderBed = true))

        // --- LEVEL 2: THIRD FLOOR / ATTIC (Y = 11.5) ---
        addBox(0f, 11.3f, 0f, 20f, 0.4f, 18f, "floor_attic")
        addBox(0f, 13.5f, -9f, 20f, 4.0f, 0.4f, "wall_attic")
        addBox(0f, 13.5f, 9f, 20f, 4.0f, 0.4f, "wall_attic")
        addBox(-10f, 13.5f, 0f, 0.4f, 4.0f, 18f, "wall_attic")
        addBox(10f, 13.5f, 0f, 0.4f, 4.0f, 18f, "wall_attic")
        // Jail metal bars
        addBox(-4f, 13.5f, -3f, 0.2f, 4.0f, 6f, "bars_metal")
        doors.add(ManorDoor("door_jail", "Jail Cell Door", -4f, 11.5f, -3f, type = DoorType.JAIL))
    }

    private fun setupInteractiveFurniture() {
        // Drawers / Cabinets where items are hidden
        drawers.add(ManorDrawer("drw_bed1_left", "Bedroom Drawer (Left)", -4.5f, 6.8f, -3.5f, room = "Bedroom 1"))
        drawers.add(ManorDrawer("drw_bed1_right", "Bedroom Drawer (Right)", -4.5f, 6.8f, -2.5f, room = "Bedroom 1"))
        drawers.add(ManorDrawer("drw_bed2_left", "Bedroom 2 Drawer", 4.5f, 6.8f, -3.5f, room = "Bedroom 2"))
        drawers.add(ManorDrawer("drw_kitchen_1", "Kitchen Cupboard", -6.5f, 1.2f, 0.0f, room = "Kitchen"))
        drawers.add(ManorDrawer("drw_kitchen_2", "Kitchen Cupboard High", -8.5f, 1.2f, 0.0f, room = "Kitchen"))
        drawers.add(ManorDrawer("drw_study_left", "Study Desk Drawer", 3.5f, 0.8f, 4.5f, room = "Study"))
        drawers.add(ManorDrawer("drw_secret_left", "Secret Area Left Drawer", 0.5f, 12.3f, 5.5f, room = "Secret Area"))
        drawers.add(ManorDrawer("drw_secret_right", "Secret Area Right Drawer", -0.5f, 12.3f, 5.5f, room = "Secret Area"))
        drawers.add(ManorDrawer("drw_nursery_right", "Nursery Right Drawer", -3.5f, 12.3f, 2.5f, room = "Nursery"))
        drawers.add(ManorDrawer("drw_cellar_cupboard", "Cellar Cupboard", 13.5f, -11.5f, 1.0f, room = "Spider Cellar"))

        // Additional Hiding spots
        hidingSpots.add(HidingSpot("wardrobe_hall", "Hide in Wardrobe", 5.0f, 6.0f, 2.0f, floor = 1, isUnderBed = false))
        hidingSpots.add(HidingSpot("bed_nursery", "Hide Under Nursery Bed", -4.0f, 11.5f, 2.0f, floor = 2, isUnderBed = true))
    }

    private fun buildHouseNavGraph() {
        // --- LEVEL -2 (Y = -12.0) ---
        navGraph.addNode("L2_GARAGE_CENTER", 0.0f, -12.0f, 0.0f, -2)
        navGraph.addNode("L2_CAR_DRIVER", -2.5f, -12.0f, 1.5f, -2)
        navGraph.addNode("L2_GARAGE_DOOR", 0.0f, -12.0f, -8.0f, -2)
        navGraph.addNode("L2_SPIDER_TUNNEL", 8.0f, -12.0f, 0.0f, -2)
        navGraph.addNode("L2_SPIDER_CELLAR", 14.0f, -12.0f, 0.0f, -2)
        navGraph.addNode("L2_SEWER_DRAIN", 14.0f, -12.0f, -7.0f, -2)
        navGraph.addNode("L2_SEWER_CELL", 8.0f, -12.0f, -7.0f, -2)
        navGraph.addNode("L2_RAMP_BOTTOM", -7.0f, -12.0f, 4.0f, -2)

        navGraph.connect("L2_GARAGE_CENTER", "L2_CAR_DRIVER")
        navGraph.connect("L2_GARAGE_CENTER", "L2_GARAGE_DOOR")
        navGraph.connect("L2_GARAGE_CENTER", "L2_SPIDER_TUNNEL")
        navGraph.connect("L2_SPIDER_TUNNEL", "L2_SPIDER_CELLAR")
        navGraph.connect("L2_SPIDER_CELLAR", "L2_SEWER_DRAIN")
        navGraph.connect("L2_SEWER_DRAIN", "L2_SEWER_CELL")
        navGraph.connect("L2_GARAGE_CENTER", "L2_RAMP_BOTTOM")

        // --- LEVEL -1 (Y = -6.0) ---
        navGraph.addNode("L1_RAMP_TOP", -7.0f, -6.0f, 10.0f, -1)
        navGraph.addNode("L1_BASEMENT_HALL", 0.0f, -6.0f, 0.0f, -1)
        navGraph.addNode("L1_BASEMENT_WORKBENCH", -3.0f, -6.0f, -2.0f, -1)
        navGraph.addNode("L1_SAUNA_DOOR", 4.0f, -6.0f, 2.0f, -1)
        navGraph.addNode("L1_SAUNA_INSIDE", 8.0f, -6.0f, 4.0f, -1)
        navGraph.addNode("L1_BASEMENT_STAIRS_BOTTOM", 3.0f, -6.0f, -4.0f, -1)

        navGraph.connect("L2_RAMP_BOTTOM", "L1_RAMP_TOP")
        navGraph.connect("L1_RAMP_TOP", "L1_BASEMENT_HALL")
        navGraph.connect("L1_BASEMENT_HALL", "L1_BASEMENT_WORKBENCH")
        navGraph.connect("L1_BASEMENT_HALL", "L1_SAUNA_DOOR")
        navGraph.connect("L1_SAUNA_DOOR", "L1_SAUNA_INSIDE")
        navGraph.connect("L1_BASEMENT_HALL", "L1_BASEMENT_STAIRS_BOTTOM")

        // --- LEVEL 0 (Y = 0.0) ---
        navGraph.addNode("L0_BASEMENT_STAIRS_TOP", 3.0f, 0.0f, -9.0f, 0)
        navGraph.addNode("L0_MAIN_FOYER", 0.0f, 0.0f, -4.0f, 0)
        navGraph.addNode("L0_FRONT_DOOR", 0.0f, 0.0f, -11.0f, 0)
        navGraph.addNode("L0_KITCHEN_CENTER", -7.0f, 0.0f, -3.0f, 0)
        navGraph.addNode("L0_DINING_ROOM", -7.0f, 0.0f, 4.5f, 0)
        navGraph.addNode("L0_STUDY_ROOM", 4.0f, 0.0f, 5.0f, 0)
        navGraph.addNode("L0_COURTYARD_EXIT", -12.0f, 0.0f, 5.0f, 0)
        navGraph.addNode("L0_GRAND_STAIRS_BOTTOM", 0.0f, 0.0f, 3.0f, 0)

        navGraph.connect("L1_BASEMENT_STAIRS_BOTTOM", "L0_BASEMENT_STAIRS_TOP")
        navGraph.connect("L0_BASEMENT_STAIRS_TOP", "L0_MAIN_FOYER")
        navGraph.connect("L0_MAIN_FOYER", "L0_FRONT_DOOR")
        navGraph.connect("L0_MAIN_FOYER", "L0_KITCHEN_CENTER")
        navGraph.connect("L0_KITCHEN_CENTER", "L0_DINING_ROOM")
        navGraph.connect("L0_MAIN_FOYER", "L0_STUDY_ROOM")
        navGraph.connect("L0_DINING_ROOM", "L0_COURTYARD_EXIT")
        navGraph.connect("L0_MAIN_FOYER", "L0_GRAND_STAIRS_BOTTOM")

        // --- LEVEL 1 (Y = 6.0) ---
        navGraph.addNode("L1_GRAND_STAIRS_TOP", 0.0f, 6.0f, 8.0f, 1)
        navGraph.addNode("L1_MAIN_LANDING", 0.0f, 6.0f, 0.0f, 1)
        navGraph.addNode("L1_BEDROOM1_SPAWN", -6.0f, 6.0f, -6.0f, 1)
        navGraph.addNode("L1_BATHROOM", -4.5f, 6.0f, 2.0f, 1)
        navGraph.addNode("L1_BEDROOM2", 5.0f, 6.0f, -3.0f, 1)
        navGraph.addNode("L1_ATTIC_STAIRS_BOTTOM", 2.0f, 6.0f, 5.0f, 1)

        navGraph.connect("L0_GRAND_STAIRS_BOTTOM", "L1_GRAND_STAIRS_TOP")
        navGraph.connect("L1_GRAND_STAIRS_TOP", "L1_MAIN_LANDING")
        navGraph.connect("L1_MAIN_LANDING", "L1_BEDROOM1_SPAWN")
        navGraph.connect("L1_MAIN_LANDING", "L1_BATHROOM")
        navGraph.connect("L1_MAIN_LANDING", "L1_BEDROOM2")
        navGraph.connect("L1_MAIN_LANDING", "L1_ATTIC_STAIRS_BOTTOM")

        // --- LEVEL 2 (Y = 11.5) ---
        navGraph.addNode("L2_ATTIC_STAIRS_TOP", 2.0f, 11.5f, 9.5f, 2)
        navGraph.addNode("L2_ATTIC_LANDING", 0.0f, 11.5f, 2.0f, 2)
        navGraph.addNode("L2_CREAK_PLANK_ZONE", 0.0f, 11.5f, -2.0f, 2)
        navGraph.addNode("L2_JAIL_ROOM", -4.0f, 11.5f, -3.0f, 2)
        navGraph.addNode("L2_NURSERY", -4.0f, 11.5f, 2.0f, 2)

        navGraph.connect("L1_ATTIC_STAIRS_BOTTOM", "L2_ATTIC_STAIRS_TOP")
        navGraph.connect("L2_ATTIC_STAIRS_TOP", "L2_ATTIC_LANDING")
        navGraph.connect("L2_ATTIC_LANDING", "L2_CREAK_PLANK_ZONE")
        navGraph.connect("L2_CREAK_PLANK_ZONE", "L2_JAIL_ROOM")
        navGraph.connect("L2_ATTIC_LANDING", "L2_NURSERY")
    }

    private fun spawnItems(presetNumber: Int) {
        val preset = when (presetNumber) {
            2 -> presetTwo
            3 -> presetThree
            4 -> presetFour
            5 -> presetFive
            else -> presetOne
        }

        preset.forEach { (name, pos) ->
            val def = ItemsCatalogue.findByName(name)
            val floor = when {
                pos.y < -9f -> -2
                pos.y < -3f -> -1
                pos.y < 3f -> 0
                pos.y < 9f -> 1
                else -> 2
            }
            items.add(
                WorldItem(
                    id = "item_${name.lowercase().replace(" ", "_")}",
                    def = def,
                    x = pos.x,
                    y = pos.y,
                    z = pos.z,
                    floor = floor,
                    room = pos.room
                )
            )
        }

        // Add Weapons in secret locations
        items.add(
            WorldItem(
                id = "item_shotgun",
                def = ItemsCatalogue.SHOTGUN,
                x = -2.5f, y = -11.6f, z = 2.5f,
                floor = -2,
                room = "Car Trunk (Level -2)"
            )
        )
        items.add(
            WorldItem(
                id = "item_crossbow",
                def = ItemsCatalogue.CROSSBOW,
                x = -16.0f, y = 0.5f, z = 3.0f,
                floor = 0,
                room = "Playhouse Locker"
            )
        )
    }

    private data class ItemPos(val x: Float, val y: Float, val z: Float, val room: String)

    private val presetOne = mapOf(
        "Master Key" to ItemPos(-2.5f, -11.6f, 2.5f, "Car Trunk (Level -2)"),
        "Hammer" to ItemPos(-12.0f, -0.5f, 8.0f, "Backyard Well Bucket"),
        "Cutting Pliers" to ItemPos(4.5f, 6.8f, -3.5f, "Bedroom 2 Drawer (Level 1)"),
        "Padlock Key" to ItemPos(14.5f, -11.2f, -1.0f, "Spider Cellar Safe (Level -2)"),
        "Padlock Code" to ItemPos(-8.5f, 1.2f, 0.0f, "Kitchen Cupboard (Level 0)"),
        "Battery" to ItemPos(0.5f, 12.3f, 5.5f, "Secret Area Left Drawer (Level 2)"),
        "Safe Key" to ItemPos(-4.0f, 11.8f, -4.0f, "Inside Jail Ventilator (Level 2)"),
        "Weapon Key" to ItemPos(-16.0f, 0.5f, 3.0f, "Cogwheel Safe (Playhouse)"),
        "Melon" to ItemPos(13.5f, -11.5f, 1.0f, "Spider Cellar Cupboard (Level -2)"),
        "Winch Handle" to ItemPos(5.0f, 6.8f, 3.0f, "Chest Puzzle (Level 1)"),
        "Playhouse Key" to ItemPos(-13.5f, 0.5f, 5.0f, "Courtyard Shed"),
        "Orange Cogwheel" to ItemPos(14.0f, -11.8f, -7.0f, "Spider Cellar Drain"),
        "Red Cogwheel" to ItemPos(-3.5f, 12.3f, 2.5f, "Nursery Right Drawer (Level 2)"),
        "Car Key" to ItemPos(1.0f, -5.2f, -1.0f, "Basement Safe (Level -1)"),
        "Special Key" to ItemPos(-6.0f, 0.8f, -2.0f, "Kitchen Locker (Level 0)"),
        "Meat" to ItemPos(14.0f, -11.0f, 2.0f, "Spider Cellar Shelf (Level -2)"),
        "Gasoline Can" to ItemPos(-3.0f, -5.2f, -2.0f, "Basement Workbench (Level -1)"),
        "Car Battery" to ItemPos(-4.5f, 6.8f, -2.5f, "Bedroom 1 Drawer (Level 1)"),
        "Engine Part" to ItemPos(-7.0f, 0.8f, 4.5f, "Living Room TV Table (Level 0)"),
        "Spark Plug" to ItemPos(-0.5f, 12.3f, 5.5f, "Secret Area Right Drawer (Level 2)"),
        "Wrench" to ItemPos(4.0f, 12.5f, -3.0f, "Attic Locker (Level 2)")
    )

    private val presetTwo = mapOf(
        "Master Key" to ItemPos(-13.5f, 0.5f, 5.0f, "Courtyard Shed"),
        "Hammer" to ItemPos(13.0f, -11.8f, 1.5f, "Spider Cellar Floor (Level -2)"),
        "Cutting Pliers" to ItemPos(5.0f, 6.8f, 3.0f, "Chest Puzzle (Level 1)"),
        "Padlock Key" to ItemPos(-16.0f, 0.5f, 3.0f, "Cogwheel Safe (Playhouse)"),
        "Padlock Code" to ItemPos(8.0f, -11.2f, -8.0f, "Sewer Back Wall (Level -2)"),
        "Battery" to ItemPos(-6.5f, 1.2f, 0.0f, "Kitchen Cupboard (Level 0)"),
        "Safe Key" to ItemPos(0.0f, 12.5f, 4.5f, "Secret Area Safe (Level 2)"),
        "Weapon Key" to ItemPos(-2.5f, -11.6f, 2.5f, "Car Trunk (Level -2)"),
        "Melon" to ItemPos(-6.0f, 0.8f, -2.0f, "Kitchen Locker (Level 0)"),
        "Winch Handle" to ItemPos(7.5f, 6.5f, 1.5f, "Hidden Closet (Level 1)"),
        "Playhouse Key" to ItemPos(13.5f, -11.5f, 0.5f, "Spider Cellar (Level -2)"),
        "Orange Cogwheel" to ItemPos(0.0f, 12.5f, 4.5f, "Attic Safe (Level 2)"),
        "Red Cogwheel" to ItemPos(-4.0f, 12.5f, -4.0f, "Behind Jail Ventilator (Level 2)"),
        "Car Key" to ItemPos(-4.5f, 6.5f, 2.0f, "Bathroom Toilet (Level 1)"),
        "Special Key" to ItemPos(4.0f, -5.5f, 0.0f, "Hidden Room Table (Level -1)"),
        "Meat" to ItemPos(8.0f, -11.5f, -6.5f, "Sewer Cell Table (Level -2)"),
        "Gasoline Can" to ItemPos(-4.5f, 11.8f, -2.5f, "Jail behind Wheelchair (Level 2)"),
        "Car Battery" to ItemPos(-3.0f, -5.2f, -2.0f, "Basement Workbench (Level -1)"),
        "Engine Part" to ItemPos(-12.0f, -0.5f, 8.0f, "Backyard Well Bucket"),
        "Spark Plug" to ItemPos(3.5f, 0.8f, 4.5f, "Study Drawer (Level 0)"),
        "Wrench" to ItemPos(4.5f, 6.8f, -2.5f, "Bedroom 2 Chest (Level 1)")
    )

    private val presetThree = mapOf(
        "Master Key" to ItemPos(-16.0f, 0.5f, 3.0f, "Playhouse Safe"),
        "Hammer" to ItemPos(-2.5f, -11.6f, 2.5f, "Car Trunk (Level -2)"),
        "Cutting Pliers" to ItemPos(8.0f, 6.8f, -3.0f, "Inside Crow Cage (Level 1)"),
        "Padlock Key" to ItemPos(-13.5f, 0.5f, 5.0f, "Courtyard Shed"),
        "Padlock Code" to ItemPos(4.0f, 0.8f, -1.0f, "Stair Closet (Level 0)"),
        "Battery" to ItemPos(7.5f, 6.5f, -2.5f, "Fireplace (Level 1)"),
        "Safe Key" to ItemPos(-4.0f, 12.0f, -4.0f, "Jail Ventilator (Level 2)"),
        "Weapon Key" to ItemPos(-6.0f, 0.8f, -2.0f, "Kitchen Locker (Level 0)"),
        "Melon" to ItemPos(-12.0f, -0.5f, 8.0f, "Backyard Well Bucket"),
        "Winch Handle" to ItemPos(1.0f, -5.2f, -1.0f, "Basement Safe (Level -1)"),
        "Playhouse Key" to ItemPos(0.0f, 12.5f, 4.5f, "Attic Safe (Level 2)"),
        "Orange Cogwheel" to ItemPos(-7.0f, 0.8f, 4.5f, "Dining Room (Level 0)"),
        "Red Cogwheel" to ItemPos(-4.5f, 6.8f, -3.5f, "Bedroom 1 Drawer (Level 1)"),
        "Car Key" to ItemPos(-0.5f, 12.3f, 5.5f, "Secret Area Drawer (Level 2)"),
        "Special Key" to ItemPos(7.5f, 6.8f, 2.0f, "Hidden Closet (Level 1)"),
        "Meat" to ItemPos(-4.0f, 12.8f, 2.0f, "Nursery Drawer (Level 2)"),
        "Gasoline Can" to ItemPos(0.0f, 0.8f, -2.0f, "Main Room Shelf (Level 0)"),
        "Car Battery" to ItemPos(8.0f, -11.8f, -7.5f, "Sewer Skeleton (Level -2)"),
        "Engine Part" to ItemPos(5.0f, 6.5f, 2.0f, "Abandoned Closet (Level 1)"),
        "Spark Plug" to ItemPos(4.0f, 12.5f, -3.0f, "Attic Locker (Level 2)"),
        "Wrench" to ItemPos(-7.5f, 0.8f, 0.0f, "Microwave (Level 0)")
    )

    private val presetFour = mapOf(
        "Master Key" to ItemPos(14.5f, -11.2f, -1.0f, "Spider Cellar Safe (Level -2)"),
        "Hammer" to ItemPos(8.0f, -11.5f, -6.5f, "Sewer Cell Table (Level -2)"),
        "Cutting Pliers" to ItemPos(1.0f, -5.2f, -1.0f, "Basement Safe (Level -1)"),
        "Padlock Key" to ItemPos(0.0f, 12.5f, 4.5f, "Secret Area Safe (Level 2)"),
        "Padlock Code" to ItemPos(8.0f, 7.2f, -3.5f, "Meat Room Wall (Level 1)"),
        "Battery" to ItemPos(7.5f, 7.0f, 1.5f, "Hidden Closet Top Shelf (Level 1)"),
        "Safe Key" to ItemPos(5.0f, 6.8f, 3.0f, "Chest Puzzle (Level 1)"),
        "Weapon Key" to ItemPos(-2.5f, -11.8f, 1.0f, "Car Glove Compartment (Level -2)"),
        "Melon" to ItemPos(-2.5f, -11.6f, 2.5f, "Car Trunk (Level -2)"),
        "Winch Handle" to ItemPos(4.0f, 12.5f, -3.0f, "Special Room Locker (Level 2)"),
        "Playhouse Key" to ItemPos(3.5f, 0.8f, 4.5f, "Study Drawer (Level 0)"),
        "Orange Cogwheel" to ItemPos(8.0f, 6.8f, -3.0f, "Crow Cage (Level 1)"),
        "Red Cogwheel" to ItemPos(-12.0f, -0.5f, 8.0f, "Backyard Well Bucket"),
        "Car Key" to ItemPos(-3.5f, 12.3f, 2.5f, "Nursery Drawer (Level 2)"),
        "Special Key" to ItemPos(13.5f, -11.5f, 0.5f, "Spider Cellar Cupboard (Level -2)"),
        "Meat" to ItemPos(5.0f, 6.5f, 2.0f, "Abandoned Closet (Level 1)"),
        "Gasoline Can" to ItemPos(-16.0f, 0.5f, -4.0f, "Shed Bottom Shelf (Level 0)"),
        "Car Battery" to ItemPos(7.5f, 6.5f, 2.0f, "Hidden Closet (Level 1)"),
        "Engine Part" to ItemPos(4.5f, 7.5f, -3.0f, "Bedroom 2 Shelf (Level 1)"),
        "Spark Plug" to ItemPos(-13.5f, 0.5f, 5.0f, "Courtyard Shed"),
        "Wrench" to ItemPos(-4.0f, 12.0f, -4.0f, "Jail Ventilator (Level 2)")
    )

    private val presetFive = mapOf(
        "Master Key" to ItemPos(8.0f, 6.8f, -3.0f, "Crow Cage (Level 1)"),
        "Hammer" to ItemPos(-12.0f, -0.5f, 8.0f, "Backyard Well Bucket"),
        "Cutting Pliers" to ItemPos(-4.5f, 12.3f, 2.0f, "Nursery Drawer (Level 2)"),
        "Padlock Key" to ItemPos(-13.5f, 0.5f, 5.0f, "Courtyard Shed"),
        "Padlock Code" to ItemPos(4.5f, 0.8f, 4.5f, "Study Drawer (Level 0)"),
        "Battery" to ItemPos(4.0f, 0.8f, -1.0f, "Stair Closet Shelf (Level 0)"),
        "Safe Key" to ItemPos(14.5f, -11.2f, -1.0f, "Spider Cellar Safe (Level -2)"),
        "Weapon Key" to ItemPos(4.5f, 6.8f, -2.5f, "Bedroom 2 Drawer (Level 1)"),
        "Melon" to ItemPos(5.0f, 6.8f, 3.0f, "Chest Puzzle (Level 1)"),
        "Winch Handle" to ItemPos(4.5f, 1.2f, 5.5f, "Study Showcase (Level 0)"),
        "Playhouse Key" to ItemPos(13.5f, -11.5f, 1.5f, "Spider Cellar (Level -2)"),
        "Orange Cogwheel" to ItemPos(13.5f, -11.5f, 1.0f, "Spider Cellar (Level -2)"),
        "Red Cogwheel" to ItemPos(8.0f, -11.5f, -6.5f, "Sewer Cell Table (Level -2)"),
        "Car Key" to ItemPos(0.0f, 12.5f, 4.5f, "Attic Safe (Level 2)"),
        "Special Key" to ItemPos(5.0f, 6.5f, 2.0f, "Abandoned Closet (Level 1)"),
        "Meat" to ItemPos(13.5f, -11.5f, 2.0f, "Spider Cellar (Level -2)"),
        "Gasoline Can" to ItemPos(-7.0f, 1.2f, 0.0f, "Kitchen Cupboard (Level 0)"),
        "Car Battery" to ItemPos(4.0f, 0.2f, -1.5f, "Stair Closet Corner (Level 0)"),
        "Engine Part" to ItemPos(14.0f, -11.0f, 1.5f, "Spider Cellar Shelf (Level -2)"),
        "Spark Plug" to ItemPos(-16.0f, 0.5f, 3.0f, "Playhouse Safe"),
        "Wrench" to ItemPos(14.0f, -11.8f, -6.0f, "Drain Bars (Level -2)")
    )
}
