package com.example.grannytung.engine

import com.example.grannytung.audio.SoundManager
import com.example.grannytung.data.Difficulty
import com.example.grannytung.data.GrannyState
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class MonsterAI(
    private val navGraph: NavGraph,
    private val collisionBoxes: List<BoundingBox>,
    private val soundManager: SoundManager,
    private val difficulty: Difficulty
) {
    var state = GrannyState.SLEEPING
    var x = 0.0f
    var y = -6.0f
    var z = 0.0f
    var rotationY = 0.0f

    var graceTimer = 15.0f
    var stunTimer = 0.0f

    val baseSpeed = 3.2f * difficulty.grannySpeedMultiplier
    val chaseSpeed = 5.2f * difficulty.grannySpeedMultiplier

    val fovDegrees = 75.0f
    val viewDistance = 22.0f
    val boundingRadius = 0.55f
    val height = 1.85f

    private var currentPath = mutableListOf<Triple<Float, Float, Float>>()
    private var pathIndex = 0

    val lastKnownPlayerPos = FloatArray(3)
    var investigateWaitTime = 0.0f

    private val patrolCycle = listOf(
        "L1_BASEMENT_HALL",
        "L0_MAIN_FOYER",
        "L0_KITCHEN_CENTER",
        "L1_MAIN_LANDING",
        "L1_BEDROOM1_SPAWN",
        "L2_ATTIC_LANDING",
        "L2_JAIL_ROOM",
        "L0_DINING_ROOM",
        "L2_GARAGE_CENTER"
    )
    private var patrolIndex = 0

    var lastTungChantTime = 0L

    init {
        respawnAtSafeLocation()
    }

    fun respawnAtSafeLocation() {
        val spawnNode = navGraph.nodes["L1_BASEMENT_HALL"]
        if (spawnNode != null) {
            x = spawnNode.x
            y = spawnNode.y
            z = spawnNode.z
        } else {
            x = 0f
            y = -6f
            z = 0f
        }
        state = GrannyState.SLEEPING
        graceTimer = 15.0f
        stunTimer = 0.0f
        currentPath.clear()
        pathIndex = 0
    }

    fun stun(durationSeconds: Float = 120.0f) {
        state = GrannyState.STUNNED
        stunTimer = durationSeconds
        soundManager.stopChaseMusic()
    }

    fun hearNoise(noiseX: Float, noiseY: Float, noiseZ: Float, noiseRadius: Float = 20.0f) {
        if (state == GrannyState.STUNNED) return
        if (graceTimer > 0f) return

        val dx = x - noiseX
        val dy = y - noiseY
        val dz = z - noiseZ
        val dist = sqrt(dx * dx + dy * dy + dz * dz)

        val effectiveRadius = noiseRadius * difficulty.hearingMultiplier
        if (dist <= effectiveRadius) {
            if (state == GrannyState.CHASE && dist > 6.0f) return

            state = GrannyState.INVESTIGATE
            investigateWaitTime = 0.0f
            lastKnownPlayerPos[0] = noiseX
            lastKnownPlayerPos[1] = noiseY
            lastKnownPlayerPos[2] = noiseZ
            recalculatePath(noiseX, noiseY, noiseZ)
            soundManager.playTung()
        }
    }

    fun canSeePlayer(px: Float, py: Float, pz: Float, isHiding: Boolean): Boolean {
        if (state == GrannyState.STUNNED) return false
        if (graceTimer > 0f) return false
        if (isHiding) return false

        val dx = px - x
        val dy = py - y
        val dz = pz - z
        val dist = sqrt(dx * dx + dy * dy + dz * dz)

        if (dist > viewDistance) return false

        // FOV Cone check
        val forwardX = sin(rotationY)
        val forwardZ = cos(rotationY)
        val toPlayerX = dx / dist
        val toPlayerZ = dz / dist
        val dot = forwardX * toPlayerX + forwardZ * toPlayerZ

        val minDot = cos(Math.toRadians((fovDegrees * 0.5).toDouble())).toFloat()
        if (dot < minDot) return false

        // Raycast occlusion against walls
        val steps = (dist * 3).toInt().coerceAtLeast(3)
        for (i in 1 until steps) {
            val t = i.toFloat() / steps
            val rayX = x + dx * t
            val rayY = y + 1.2f + dy * t
            val rayZ = z + dz * t

            for (box in collisionBoxes) {
                if (box.tag.startsWith("floor")) continue
                if (box.contains(rayX, rayY, rayZ)) {
                    return false
                }
            }
        }

        return true
    }

    fun recalculatePath(targetX: Float, targetY: Float, targetZ: Float) {
        currentPath = navGraph.findPath(x, y, z, targetX, targetY, targetZ).toMutableList()
        pathIndex = 0
    }

    fun update(
        dt: Float,
        playerX: Float,
        playerY: Float,
        playerZ: Float,
        isPlayerHiding: Boolean,
        onCatchPlayer: () -> Unit
    ) {
        // Stun State Handling
        if (state == GrannyState.STUNNED) {
            stunTimer -= dt
            if (stunTimer <= 0f) {
                state = GrannyState.PATROL
                advancePatrol()
            }
            return
        }

        // Grace Timer Handling
        if (graceTimer > 0f) {
            graceTimer -= dt
            executePatrolStep(dt, baseSpeed * 0.6f)
            return
        }

        val seesPlayer = canSeePlayer(playerX, playerY, playerZ, isPlayerHiding)

        if (seesPlayer) {
            if (state != GrannyState.CHASE) {
                soundManager.startChaseMusic()
                soundManager.playSahurVoice()
            }
            state = GrannyState.CHASE
            lastKnownPlayerPos[0] = playerX
            lastKnownPlayerPos[1] = playerY
            lastKnownPlayerPos[2] = playerZ
            recalculatePath(playerX, playerY, playerZ)

            // Tung rhythmic loop during chase
            val now = System.currentTimeMillis()
            if (now - lastTungChantTime > 1500) {
                soundManager.playTung()
                lastTungChantTime = now
            }
        } else if (state == GrannyState.CHASE) {
            state = GrannyState.INVESTIGATE
            investigateWaitTime = 0.0f
            recalculatePath(lastKnownPlayerPos[0], lastKnownPlayerPos[1], lastKnownPlayerPos[2])
            soundManager.stopChaseMusic()
        }

        val currentSpeed = if (state == GrannyState.CHASE) chaseSpeed else baseSpeed

        when (state) {
            GrannyState.CHASE, GrannyState.INVESTIGATE -> {
                executePathTraversal(dt, currentSpeed) {
                    if (state == GrannyState.INVESTIGATE) {
                        state = GrannyState.SEARCH_LOOK_AROUND
                        investigateWaitTime = 4.0f
                    }
                }
            }

            GrannyState.SEARCH_LOOK_AROUND -> {
                investigateWaitTime -= dt
                rotationY += dt * 3.0f
                if (investigateWaitTime <= 0f) {
                    state = GrannyState.PATROL
                    advancePatrol()
                }
            }

            GrannyState.PATROL, GrannyState.SLEEPING -> {
                executePatrolStep(dt, baseSpeed)
            }

            GrannyState.STUNNED -> {}
        }

        // Attack Hitbox Trigger
        if (state == GrannyState.CHASE) {
            val dx = x - playerX
            val dy = y - playerY
            val dz = z - playerZ
            val hitDist = sqrt(dx * dx + dz * dz)
            if (hitDist < 1.7f && abs(dy) < 1.8f) {
                soundManager.stopChaseMusic()
                soundManager.playSfx("bat_hit")
                soundManager.playSfx("jumpscare")
                onCatchPlayer()
            }
        }
    }

    private fun executePatrolStep(dt: Float, speed: Float) {
        if (currentPath.isEmpty() || pathIndex >= currentPath.size) {
            advancePatrol()
        }
        executePathTraversal(dt, speed) {
            advancePatrol()
        }
    }

    private fun advancePatrol() {
        patrolIndex = (patrolIndex + 1) % patrolCycle.size
        val targetNodeId = patrolCycle[patrolIndex]
        val node = navGraph.nodes[targetNodeId]
        if (node != null) {
            recalculatePath(node.x, node.y, node.z)
        }
    }

    private fun executePathTraversal(dt: Float, moveSpeed: Float, onReachDestination: () -> Unit) {
        if (pathIndex >= currentPath.size) {
            onReachDestination()
            return
        }

        val nextPoint = currentPath[pathIndex]
        val dx = nextPoint.first - x
        val dy = nextPoint.second - y
        val dz = nextPoint.third - z
        val distToWaypoint = sqrt(dx * dx + dz * dz)

        if (distToWaypoint < 0.45f) {
            pathIndex++
            if (pathIndex >= currentPath.size) {
                onReachDestination()
                return
            }
        }

        val targetAngle = atan2(dx, dz)
        rotationY = targetAngle

        val stepDist = moveSpeed * dt
        if (distToWaypoint > 0.001f) {
            x += (dx / distToWaypoint) * stepDist
            z += (dz / distToWaypoint) * stepDist
        }
        y += dy.coerceIn(-0.4f, 0.4f) * 5.0f * dt
    }
}
