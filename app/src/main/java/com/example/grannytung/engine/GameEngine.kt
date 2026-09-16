package com.example.grannytung.engine

import com.example.grannytung.audio.SoundManager
import com.example.grannytung.data.CarEscapeState
import com.example.grannytung.data.CareerStats
import com.example.grannytung.data.FrontDoorLockState
import com.example.grannytung.data.GameSettings
import com.example.grannytung.data.GrannyState
import com.example.grannytung.data.ItemDef
import com.example.grannytung.data.ItemsCatalogue
import com.example.grannytung.data.WorldItem
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class GameEngine(
    val settings: GameSettings,
    val soundManager: SoundManager,
    val careerStats: CareerStats
) {
    val mapBuilder = MapBuilder()
    var granny: MonsterAI

    // Player state
    var playerX = -6.0f
    var playerY = 6.0f
    var playerZ = -6.0f
    var playerYaw = 0.0f
    var playerPitch = 0.0f

    var isCrouching = false
    var isHiding = false
    var hidingSpotDescription: String = ""

    var health = 100
    var currentDay = 1
    val maxDays = 5

    var isDaySplashActive = true
    var daySplashTimer = 3.5f

    var isJumpscareActive = false
    var jumpscareTimer = 0f

    var isGameOver = false
    var isEscaped = false
    var escapeType = ""

    // Inventory: 5 slots
    val inventorySlots = Array<ItemDef?>(5) { null }
    var activeSlotIndex = 0

    val frontDoorState = FrontDoorLockState()
    val carEscapeState = CarEscapeState()

    var interactionPrompt: String? = null

    init {
        mapBuilder.buildWorld(1)
        granny = MonsterAI(mapBuilder.navGraph, mapBuilder.collisionBoxes, soundManager, settings.difficulty)
        resetToBedroomSpawn()
    }

    fun startNewGame(presetNumber: Int = 1) {
        mapBuilder.buildWorld(presetNumber)
        granny = MonsterAI(mapBuilder.navGraph, mapBuilder.collisionBoxes, soundManager, settings.difficulty)
        currentDay = 1
        health = 100
        isGameOver = false
        isEscaped = false
        escapeType = ""
        for (i in 0 until 5) inventorySlots[i] = null
        activeSlotIndex = 0

        frontDoorState.padlockUnlocked = false
        frontDoorState.wiresCut = false
        frontDoorState.codeEntered = false
        frontDoorState.planksRemoved = false
        frontDoorState.masterKeyUnlocked = false
        frontDoorState.isDoorOpen = false

        carEscapeState.batteryInstalled = false
        carEscapeState.sparkPlugInstalled = false
        carEscapeState.enginePartInstalled = false
        carEscapeState.gasFilled = false
        carEscapeState.garageDoorOpen = false
        carEscapeState.carStarted = false

        resetToBedroomSpawn()
    }

    fun resetToBedroomSpawn() {
        playerX = -6.0f
        playerY = 6.0f
        playerZ = -6.0f
        playerYaw = 0.0f
        playerPitch = 0.0f
        isCrouching = false
        isHiding = false
        isDaySplashActive = true
        daySplashTimer = 3.5f
        isJumpscareActive = false
        granny.respawnAtSafeLocation()
    }

    val activeItem: ItemDef?
        get() = inventorySlots[activeSlotIndex]

    fun update(dt: Float) {
        if (isGameOver || isEscaped) return

        if (isDaySplashActive) {
            daySplashTimer -= dt
            if (daySplashTimer <= 0f) {
                isDaySplashActive = false
            }
            return
        }

        if (isJumpscareActive) {
            jumpscareTimer -= dt
            if (jumpscareTimer <= 0f) {
                isJumpscareActive = false
                currentDay++
                careerStats.daysSurvived++
                if (currentDay > maxDays) {
                    isGameOver = true
                    careerStats.deaths++
                } else {
                    resetToBedroomSpawn()
                }
            }
            return
        }

        // Update Granny AI
        granny.update(dt, playerX, playerY, playerZ, isHiding) {
            triggerJumpscare()
        }

        // Check weak attic floor hazard
        checkAtticWeakPlank()

        // Update interaction prompt
        updateInteractionPrompt()
    }

    private fun checkAtticWeakPlank() {
        if (abs(playerY - mapBuilder.weakPlankY) < 1.0f) {
            if (playerX in mapBuilder.weakPlankMinX..mapBuilder.weakPlankMaxX &&
                playerZ in mapBuilder.weakPlankMinZ..mapBuilder.weakPlankMaxZ
            ) {
                if (!mapBuilder.weakPlankTriggered) {
                    mapBuilder.weakPlankTriggered = true
                    soundManager.playSfx("creak", 1.0f)
                    granny.hearNoise(playerX, playerY, playerZ, 25.0f)
                }
            } else {
                mapBuilder.weakPlankTriggered = false
            }
        }
    }

    fun movePlayer(moveX: Float, moveZ: Float, dt: Float) {
        if (isDaySplashActive || isJumpscareActive || isHiding) return

        val speed = if (isCrouching) 2.2f else 4.2f
        val cosYaw = cos(playerYaw)
        val sinYaw = sin(playerYaw)

        // Forward / backward & strafe left / right
        val dx = (sinYaw * moveZ + cosYaw * moveX) * speed * dt
        val dz = (cosYaw * moveZ - sinYaw * moveX) * speed * dt

        val newX = playerX + dx
        val newZ = playerZ + dz

        if (!checkWallCollision(newX, playerY, playerZ)) {
            playerX = newX
        }
        if (!checkWallCollision(playerX, playerY, newZ)) {
            playerZ = newZ
        }
    }

    fun rotateLook(deltaYaw: Float, deltaPitch: Float) {
        if (isHiding) {
            playerYaw += deltaYaw * 0.4f
            return
        }
        playerYaw += deltaYaw
        val pitchMultiplier = if (settings.invertY) -1f else 1f
        playerPitch = (playerPitch + deltaPitch * pitchMultiplier).coerceIn(-1.2f, 1.2f)
    }

    fun toggleCrouch() {
        if (isHiding) return
        isCrouching = !isCrouching
    }

    fun toggleHiding() {
        if (isHiding) {
            isHiding = false
            hidingSpotDescription = ""
            return
        }

        val nearestSpot = mapBuilder.hidingSpots.find { it.distanceTo(playerX, playerY, playerZ) < 2.0f }
        if (nearestSpot != null) {
            isHiding = true
            hidingSpotDescription = nearestSpot.name
            playerX = nearestSpot.x
            playerY = nearestSpot.y
            playerZ = nearestSpot.z
        }
    }

    private fun checkWallCollision(x: Float, y: Float, z: Float): Boolean {
        val radius = 0.4f
        val pMinX = x - radius
        val pMaxX = x + radius
        val pMinZ = z - radius
        val pMaxZ = z + radius
        val pMinY = y
        val pMaxY = y + 1.8f

        for (box in mapBuilder.collisionBoxes) {
            if (box.tag.startsWith("floor")) continue
            if (box.intersects(pMinX, pMinY, pMinZ, pMaxX, pMaxY, pMaxZ)) {
                return true
            }
        }
        return false
    }

    private fun updateInteractionPrompt() {
        if (isHiding) {
            interactionPrompt = "[USE] Exit Hiding Spot"
            return
        }

        // 1. Check nearby hiding spot
        val spot = mapBuilder.hidingSpots.find { it.distanceTo(playerX, playerY, playerZ) < 2.0f }
        if (spot != null) {
            interactionPrompt = "[USE] ${spot.name}"
            return
        }

        // 2. Check front door interaction
        val frontDoor = mapBuilder.doors.find { it.id == "door_front" }
        if (frontDoor != null && frontDoor.distanceTo(playerX, playerY, playerZ) < 2.5f) {
            val held = activeItem
            interactionPrompt = when {
                !frontDoorState.padlockUnlocked -> {
                    if (held == ItemsCatalogue.PADLOCK_KEY) "[USE] Unlock Heavy Padlock"
                    else "[USE] Heavy Padlock (Needs Padlock Key)"
                }
                !frontDoorState.wiresCut -> {
                    if (held == ItemsCatalogue.CUTTING_PLIERS) "[USE] Cut Alarm Wires"
                    else "[USE] Alarm Wires (Needs Cutting Pliers)"
                }
                !frontDoorState.codeEntered -> {
                    if (held == ItemsCatalogue.PADLOCK_CODE) "[USE] Enter Door Code"
                    else "[USE] Code Lock (Needs Padlock Code)"
                }
                !frontDoorState.planksRemoved -> {
                    if (held == ItemsCatalogue.HAMMER) "[USE] Remove Wooden Planks"
                    else "[USE] Barricade Planks (Needs Hammer)"
                }
                !frontDoorState.masterKeyUnlocked -> {
                    if (held == ItemsCatalogue.MASTER_KEY) "[USE] Turn Master Deadlock"
                    else "[USE] Master Deadlock (Needs Master Key)"
                }
                else -> "[USE] OPEN FRONT DOOR & ESCAPE!"
            }
            return
        }

        // 3. Check Garage Car interaction
        if (abs(playerY - (-12f)) < 2.0f && abs(playerX - (-2.5f)) < 3.0f && abs(playerZ - 1.5f) < 3.0f) {
            val held = activeItem
            interactionPrompt = when {
                !carEscapeState.batteryInstalled -> {
                    if (held == ItemsCatalogue.CAR_BATTERY) "[USE] Install Car Battery"
                    else "[USE] Battery Slot (Needs Car Battery)"
                }
                !carEscapeState.sparkPlugInstalled -> {
                    if (held == ItemsCatalogue.SPARK_PLUG) "[USE] Install Spark Plug"
                    else "[USE] Spark Socket (Needs Spark Plug)"
                }
                !carEscapeState.enginePartInstalled -> {
                    if (held == ItemsCatalogue.ENGINE_PART) "[USE] Mount Engine Part"
                    else "[USE] Motor Bay (Needs Engine Part)"
                }
                !carEscapeState.gasFilled -> {
                    if (held == ItemsCatalogue.GASOLINE_CAN) "[USE] Fill Fuel Tank"
                    else "[USE] Fuel Cap (Needs Gasoline Can)"
                }
                !carEscapeState.garageDoorOpen -> "[USE] Garage Gate Closed (Open with Lever/Winch)"
                else -> {
                    if (held == ItemsCatalogue.CAR_KEY) "[USE] START CAR & RAM TO FREEDOM!"
                    else "[USE] Ignition (Needs Car Key)"
                }
            }
            return
        }

        // 4. Check nearby doors
        val door = mapBuilder.doors.find { it.id != "door_front" && it.distanceTo(playerX, playerY, playerZ) < 2.0f }
        if (door != null) {
            interactionPrompt = if (door.isOpen) "[USE] Close ${door.name}" else "[USE] Open ${door.name}"
            return
        }

        // 5. Check nearby drawers
        val drawer = mapBuilder.drawers.find { it.distanceTo(playerX, playerY, playerZ) < 2.0f }
        if (drawer != null) {
            interactionPrompt = if (drawer.isOpen) "[USE] Close ${drawer.name}" else "[USE] Open ${drawer.name}"
            return
        }

        // 6. Check nearby items
        val item = mapBuilder.items.find { !it.isCollected && it.distanceTo(playerX, playerY, playerZ) < 2.0f }
        if (item != null) {
            interactionPrompt = "[USE] Pick Up ${item.def.name}"
            return
        }

        interactionPrompt = null
    }

    fun interact() {
        if (isDaySplashActive || isJumpscareActive) return

        if (isHiding) {
            toggleHiding()
            return
        }

        // 1. Hiding spot
        val spot = mapBuilder.hidingSpots.find { it.distanceTo(playerX, playerY, playerZ) < 2.0f }
        if (spot != null) {
            toggleHiding()
            return
        }

        // 2. Front Door Escape
        val frontDoor = mapBuilder.doors.find { it.id == "door_front" }
        if (frontDoor != null && frontDoor.distanceTo(playerX, playerY, playerZ) < 2.5f) {
            val held = activeItem
            if (!frontDoorState.padlockUnlocked && held == ItemsCatalogue.PADLOCK_KEY) {
                frontDoorState.padlockUnlocked = true
                consumeActiveItem()
                soundManager.playSfx("door1")
                return
            }
            if (!frontDoorState.wiresCut && held == ItemsCatalogue.CUTTING_PLIERS) {
                frontDoorState.wiresCut = true
                soundManager.playSfx("creak")
                return
            }
            if (!frontDoorState.codeEntered && held == ItemsCatalogue.PADLOCK_CODE) {
                frontDoorState.codeEntered = true
                consumeActiveItem()
                soundManager.playSfx("door1")
                return
            }
            if (!frontDoorState.planksRemoved && held == ItemsCatalogue.HAMMER) {
                frontDoorState.planksRemoved = true
                soundManager.playSfx("bat_hit")
                granny.hearNoise(playerX, playerY, playerZ, 20.0f)
                return
            }
            if (!frontDoorState.masterKeyUnlocked && held == ItemsCatalogue.MASTER_KEY) {
                frontDoorState.masterKeyUnlocked = true
                consumeActiveItem()
                soundManager.playSfx("door1")
                return
            }
            if (frontDoorState.isCompletelyUnlocked) {
                frontDoorState.isDoorOpen = true
                isEscaped = true
                escapeType = "Front Door Escape"
                careerStats.escapes++
                soundManager.playSfx("door")
                return
            }
        }

        // 3. Garage Car Escape
        if (abs(playerY - (-12f)) < 2.0f && abs(playerX - (-2.5f)) < 3.0f && abs(playerZ - 1.5f) < 3.0f) {
            val held = activeItem
            if (!carEscapeState.batteryInstalled && held == ItemsCatalogue.CAR_BATTERY) {
                carEscapeState.batteryInstalled = true
                consumeActiveItem()
                soundManager.playSfx("door1")
                return
            }
            if (!carEscapeState.sparkPlugInstalled && held == ItemsCatalogue.SPARK_PLUG) {
                carEscapeState.sparkPlugInstalled = true
                consumeActiveItem()
                soundManager.playSfx("door1")
                return
            }
            if (!carEscapeState.enginePartInstalled && held == ItemsCatalogue.ENGINE_PART) {
                carEscapeState.enginePartInstalled = true
                consumeActiveItem()
                soundManager.playSfx("door1")
                return
            }
            if (!carEscapeState.gasFilled && held == ItemsCatalogue.GASOLINE_CAN) {
                carEscapeState.gasFilled = true
                consumeActiveItem()
                soundManager.playSfx("door1")
                return
            }
            if (!carEscapeState.garageDoorOpen && held == ItemsCatalogue.WINCH_HANDLE) {
                carEscapeState.garageDoorOpen = true
                soundManager.playSfx("door")
                granny.hearNoise(playerX, playerY, playerZ, 25.0f)
                return
            }
            if (carEscapeState.isReadyToDrive && held == ItemsCatalogue.CAR_KEY) {
                carEscapeState.carStarted = true
                isEscaped = true
                escapeType = "Garage Car Ram Escape"
                careerStats.escapes++
                soundManager.playSfx("bat_hit")
                return
            }
        }

        // 4. Doors
        val door = mapBuilder.doors.find { it.id != "door_front" && it.distanceTo(playerX, playerY, playerZ) < 2.0f }
        if (door != null) {
            door.isOpen = !door.isOpen
            soundManager.playSfx(if (door.isOpen) "door" else "door1")
            granny.hearNoise(door.x, door.y, door.z, 14.0f)
            return
        }

        // 5. Drawers
        val drawer = mapBuilder.drawers.find { it.distanceTo(playerX, playerY, playerZ) < 2.0f }
        if (drawer != null) {
            drawer.isOpen = !drawer.isOpen
            soundManager.playSfx("drawer")
            granny.hearNoise(drawer.x, drawer.y, drawer.z, 12.0f)
            return
        }

        // 6. Pick up item
        val item = mapBuilder.items.find { !it.isCollected && it.distanceTo(playerX, playerY, playerZ) < 2.0f }
        if (item != null) {
            // Find empty slot or replace active
            var placed = false
            for (i in 0 until 5) {
                if (inventorySlots[i] == null) {
                    inventorySlots[i] = item.def
                    item.isCollected = true
                    soundManager.playSfx("door1")
                    placed = true
                    break
                }
            }
            if (!placed) {
                // Drop current item to pick up new one
                dropItem()
                inventorySlots[activeSlotIndex] = item.def
                item.isCollected = true
                soundManager.playSfx("door1")
            }
        }
    }

    fun dropItem() {
        val held = activeItem ?: return
        inventorySlots[activeSlotIndex] = null

        // Add back to world items
        val dropped = WorldItem(
            id = "dropped_${System.currentTimeMillis()}",
            def = held,
            x = playerX,
            y = playerY,
            z = playerZ,
            floor = (playerY / 6.0f).toInt(),
            room = "Floor"
        )
        mapBuilder.items.add(dropped)

        soundManager.playSfx("drop", 1.0f)
        granny.hearNoise(playerX, playerY, playerZ, 18.0f)
    }

    fun fireWeapon() {
        val held = activeItem ?: return
        if (held != ItemsCatalogue.SHOTGUN && held != ItemsCatalogue.CROSSBOW) return

        if (held == ItemsCatalogue.SHOTGUN) {
            soundManager.playSfx("shotgun", 1.0f)
        } else {
            soundManager.playSfx("crossbow", 1.0f)
        }
        consumeActiveItem()

        // Check if Granny is in front of player
        val dx = granny.x - playerX
        val dy = granny.y - playerY
        val dz = granny.z - playerZ
        val dist = sqrt(dx * dx + dy * dy + dz * dz)

        val forwardX = sin(playerYaw)
        val forwardZ = cos(playerYaw)
        val dot = (dx / dist) * forwardX + (dz / dist) * forwardZ

        if (dot > 0.85f && dist < 15.0f && abs(dy) < 2.5f) {
            granny.stun(120.0f)
            careerStats.stuns++
            soundManager.playSfx("bat_hit")
        } else {
            // Noise from firing alerts Granny!
            granny.hearNoise(playerX, playerY, playerZ, 35.0f)
        }
    }

    private fun consumeActiveItem() {
        inventorySlots[activeSlotIndex] = null
    }

    fun triggerJumpscare() {
        isJumpscareActive = true
        jumpscareTimer = 3.0f
    }
}
