package com.example.grannytung.ui

import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import com.example.grannytung.data.CrosshairStyle
import com.example.grannytung.data.GrannyState
import com.example.grannytung.engine.GameEngine
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

@Composable
fun GameCanvas(
    game: GameEngine,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier.fillMaxSize()) {
        val width = size.width
        val height = size.height

        drawIntoCanvas { composeCanvas ->
            val canvas = composeCanvas.nativeCanvas

            // 1. Draw Ceiling & Floor with horror ambient gradients
            val centerY = height * 0.5f + game.playerPitch * height * 0.8f

            val ceilPaint = Paint().apply {
                color = if (game.settings.isNightmare) Color.rgb(4, 3, 3) else Color.rgb(18, 14, 12)
            }
            canvas.drawRect(0f, 0f, width, centerY, ceilPaint)

            val floorPaint = Paint().apply {
                color = if (game.settings.isNightmare) Color.rgb(6, 4, 3) else Color.rgb(24, 18, 14)
            }
            canvas.drawRect(0f, centerY, width, height, floorPaint)

            // 2. 3D Raycasting for Walls
            val numRays = 110
            val rayStep = width / numRays
            val fovRad = Math.toRadians(game.settings.fovDegrees.toDouble()).toFloat()
            val halfFov = fovRad * 0.5f

            val wallPaint = Paint().apply { isAntiAlias = true }
            val depthBuffer = FloatArray(numRays)

            val px = game.playerX
            val py = game.playerY
            val pz = game.playerZ
            val yaw = game.playerYaw

            val currentFloorBoxes = game.mapBuilder.collisionBoxes.filter {
                abs(it.minY - py) < 4.0f || abs(it.maxY - py) < 4.0f
            }

            for (i in 0 until numRays) {
                val rayAngle = yaw - halfFov + (i.toFloat() / numRays) * fovRad
                val rayDirX = sin(rayAngle)
                val rayDirZ = cos(rayAngle)

                var closestDist = 28.0f
                var hitTag = "wall_interior"
                var hitSide = 0

                // March ray against boxes
                var dist = 0.2f
                while (dist < 26.0f) {
                    val sampleX = px + rayDirX * dist
                    val sampleZ = pz + rayDirZ * dist

                    var hit = false
                    for (box in currentFloorBoxes) {
                        if (box.tag.startsWith("floor")) continue
                        if (sampleX >= box.minX && sampleX <= box.maxX && sampleZ >= box.minZ && sampleZ <= box.maxZ) {
                            hit = true
                            hitTag = box.tag
                            closestDist = dist
                            break
                        }
                    }
                    if (hit) break
                    dist += 0.18f
                }

                // Fish-eye correction
                val correctedDist = closestDist * cos(rayAngle - yaw)
                depthBuffer[i] = correctedDist

                if (correctedDist < 26.0f) {
                    val wallHeight = (height * 1.8f) / (correctedDist.coerceAtLeast(0.4f))
                    val top = centerY - wallHeight * 0.5f
                    val bottom = centerY + wallHeight * 0.5f

                    // Lighting & Material
                    val maxLightDist = if (game.settings.isNightmare) 12.0f else 20.0f
                    val lightFactor = (1.0f - (correctedDist / maxLightDist)).coerceIn(0.06f, 1.0f)

                    val (r, g, b) = when {
                        hitTag.contains("stone") -> Triple(75, 70, 65)
                        hitTag.contains("brick") -> Triple(85, 55, 45)
                        hitTag.contains("attic") -> Triple(55, 40, 30)
                        hitTag.contains("bars") -> Triple(40, 40, 40)
                        hitTag.contains("wood") -> Triple(70, 50, 35)
                        hitTag.contains("car") -> Triple(60, 65, 75)
                        else -> Triple(90, 80, 70)
                    }

                    val finalR = (r * lightFactor).toInt().coerceIn(0, 255)
                    val finalG = (g * lightFactor).toInt().coerceIn(0, 255)
                    val finalB = (b * lightFactor).toInt().coerceIn(0, 255)

                    wallPaint.color = Color.rgb(finalR, finalG, finalB)
                    val left = i * rayStep
                    val right = (i + 1) * rayStep + 1f
                    canvas.drawRect(left, top, right, bottom, wallPaint)
                }
            }

            // 3. Render 3D Sprite Objects (Sorted Back to Front)
            data class SpriteObj(
                val x: Float,
                val y: Float,
                val z: Float,
                val type: String,
                val label: String,
                val color: Int
            )

            val sprites = mutableListOf<SpriteObj>()

            // Front Door
            val frontDoor = game.mapBuilder.doors.find { it.id == "door_front" }
            if (frontDoor != null && abs(frontDoor.y - py) < 3.0f) {
                sprites.add(
                    SpriteObj(
                        frontDoor.x, frontDoor.y + 1.2f, frontDoor.z,
                        "front_door",
                        if (game.frontDoorState.isCompletelyUnlocked) "FRONT DOOR (UNLOCKED)" else "FRONT EXIT (5 LOCKS)",
                        Color.rgb(180, 50, 50)
                    )
                )
            }

            // Escape Car in Garage
            if (abs(py - (-12f)) < 3.0f) {
                sprites.add(
                    SpriteObj(
                        -2.5f, -11.0f, 1.5f,
                        "car",
                        if (game.carEscapeState.isReadyToDrive) "ESCAPE CAR (READY!)" else "ESCAPE CAR (REPAIRS NEEDED)",
                        Color.rgb(40, 120, 200)
                    )
                )
            }

            // Items on floor
            for (item in game.mapBuilder.items) {
                if (item.isCollected) continue
                if (abs(item.y - py) < 2.5f) {
                    sprites.add(
                        SpriteObj(
                            item.x, item.y + 0.3f, item.z,
                            "item",
                            "${item.def.iconEmoji} ${item.def.name}",
                            item.def.color.toInt()
                        )
                    )
                }
            }

            // Granny Monster
            if (abs(game.granny.y - py) < 3.5f) {
                sprites.add(
                    SpriteObj(
                        game.granny.x, game.granny.y + 1.0f, game.granny.z,
                        "granny",
                        when (game.granny.state) {
                            GrannyState.STUNNED -> "GRANNY (ASLEEP 💤)"
                            GrannyState.CHASE -> "GRANNY (CHASING YOU!)"
                            GrannyState.INVESTIGATE -> "GRANNY (INVESTIGATING)"
                            else -> "GRANNY"
                        },
                        Color.rgb(220, 30, 30)
                    )
                )
            }

            // Sort sprites by distance descending
            val sortedSprites = sprites.map { s ->
                val dx = s.x - px
                val dy = s.y - py
                val dz = s.z - pz
                val dist = sqrt(dx * dx + dz * dz)
                Pair(s, dist)
            }.sortedByDescending { it.second }

            val spritePaint = Paint().apply { isAntiAlias = true }
            val textPaint = Paint().apply {
                isAntiAlias = true
                textAlign = Paint.Align.CENTER
                textSize = 28f
                color = Color.WHITE
                setShadowLayer(4f, 0f, 0f, Color.BLACK)
            }

            for ((obj, dist) in sortedSprites) {
                if (dist < 0.3f || dist > 24.0f) continue

                val dx = obj.x - px
                val dz = obj.z - pz
                val spriteAngle = atan2(dx, dz)
                var diffAngle = spriteAngle - yaw

                while (diffAngle < -Math.PI) diffAngle += (2 * Math.PI).toFloat()
                while (diffAngle > Math.PI) diffAngle -= (2 * Math.PI).toFloat()

                if (abs(diffAngle) < halfFov + 0.3f) {
                    val screenX = (width * 0.5f) + (diffAngle / halfFov) * (width * 0.5f)
                    val rayIdx = ((screenX / width) * numRays).toInt().coerceIn(0, numRays - 1)

                    if (dist < depthBuffer[rayIdx] + 0.4f) {
                        val spriteHeight = (height * 1.5f) / dist
                        val spriteWidth = spriteHeight * 0.65f
                        val screenY = centerY + (py - obj.y) * (height / dist) - spriteHeight * 0.5f

                        val lightFactor = (1.0f - (dist / 22.0f)).coerceIn(0.1f, 1.0f)

                        if (obj.type == "granny") {
                            // Render Granny Figure
                            drawGrannySprite(canvas, screenX, screenY, spriteWidth, spriteHeight, game.granny.state, lightFactor)
                        } else if (obj.type == "item") {
                            // Render Item Billboard Box
                            spritePaint.color = obj.color
                            val itemSize = (spriteHeight * 0.35f).coerceIn(16f, 80f)
                            val itemRect = RectF(
                                screenX - itemSize * 0.5f,
                                screenY + spriteHeight * 0.7f - itemSize * 0.5f,
                                screenX + itemSize * 0.5f,
                                screenY + spriteHeight * 0.7f + itemSize * 0.5f
                            )
                            canvas.drawRoundRect(itemRect, 8f, 8f, spritePaint)
                            canvas.drawText(obj.label, screenX, itemRect.top - 8f, textPaint)
                        } else {
                            // Render Structure Billboard (Front Door / Car)
                            spritePaint.color = obj.color
                            val boxRect = RectF(
                                screenX - spriteWidth * 0.5f,
                                screenY,
                                screenX + spriteWidth * 0.5f,
                                screenY + spriteHeight
                            )
                            spritePaint.alpha = (255 * lightFactor).toInt()
                            canvas.drawRoundRect(boxRect, 12f, 12f, spritePaint)
                            canvas.drawText(obj.label, screenX, screenY - 12f, textPaint)
                        }
                    }
                }
            }

            // 4. Flashlight Spotlight & Darkness Vignette
            val spotlightRadius = max(width, height) * 0.65f
            val vignettePaint = Paint().apply {
                shader = RadialGradient(
                    width * 0.5f, centerY,
                    spotlightRadius,
                    intArrayOf(Color.TRANSPARENT, Color.argb(160, 0, 0, 0), Color.argb(240, 2, 2, 2)),
                    floatArrayOf(0.15f, 0.65f, 1.0f),
                    Shader.TileMode.CLAMP
                )
            }
            canvas.drawRect(0f, 0f, width, height, vignettePaint)

            // 5. Blood Vignette (Chased or Hurt)
            if (game.granny.state == GrannyState.CHASE) {
                val bloodPaint = Paint().apply {
                    shader = RadialGradient(
                        width * 0.5f, height * 0.5f,
                        width * 0.6f,
                        intArrayOf(Color.TRANSPARENT, Color.argb(40, 180, 0, 0), Color.argb(180, 150, 0, 0)),
                        floatArrayOf(0.4f, 0.8f, 1.0f),
                        Shader.TileMode.CLAMP
                    )
                }
                canvas.drawRect(0f, 0f, width, height, bloodPaint)
            }

            // 6. Crosshair Reticle
            val cx = width * 0.5f
            val cy = centerY
            val reticlePaint = Paint().apply {
                color = Color.argb(200, 255, 255, 255)
                isAntiAlias = true
                style = Paint.Style.STROKE
                strokeWidth = 2.5f
            }

            when (game.settings.crosshairStyle) {
                CrosshairStyle.DOT -> {
                    reticlePaint.style = Paint.Style.FILL
                    canvas.drawCircle(cx, cy, 3.5f, reticlePaint)
                }
                CrosshairStyle.CROSS -> {
                    canvas.drawLine(cx - 10f, cy, cx + 10f, cy, reticlePaint)
                    canvas.drawLine(cx, cy - 10f, cx, cy + 10f, reticlePaint)
                }
                CrosshairStyle.RING -> {
                    canvas.drawCircle(cx, cy, 9f, reticlePaint)
                    reticlePaint.style = Paint.Style.FILL
                    canvas.drawCircle(cx, cy, 2.5f, reticlePaint)
                }
                CrosshairStyle.NONE -> {}
            }

            // 7. Day Splash Screen Overlay
            if (game.isDaySplashActive) {
                val alpha = (game.daySplashTimer / 3.5f).coerceIn(0f, 1f)
                val splashBg = Paint().apply {
                    color = Color.argb((255 * alpha).toInt(), 0, 0, 0)
                }
                canvas.drawRect(0f, 0f, width, height, splashBg)

                val dayTextPaint = Paint().apply {
                    color = Color.argb((255 * alpha).toInt(), 220, 20, 20)
                    textSize = 64f
                    isFakeBoldText = true
                    textAlign = Paint.Align.CENTER
                }
                canvas.drawText("DAY ${game.currentDay}", width * 0.5f, height * 0.45f, dayTextPaint)

                val subPaint = Paint().apply {
                    color = Color.argb((200 * alpha).toInt(), 200, 200, 200)
                    textSize = 28f
                    textAlign = Paint.Align.CENTER
                }
                canvas.drawText("Find a way out before she catches you.", width * 0.5f, height * 0.55f, subPaint)
            }

            // 8. Jumpscare Screen Overlay
            if (game.isJumpscareActive) {
                drawJumpscareOverlay(canvas, width, height)
            }
        }
    }
}

private fun drawGrannySprite(
    canvas: android.graphics.Canvas,
    cx: Float,
    cy: Float,
    w: Float,
    h: Float,
    state: GrannyState,
    lightFactor: Float
) {
    val bodyPaint = Paint().apply {
        isAntiAlias = true
        color = Color.rgb((70 * lightFactor).toInt(), (55 * lightFactor).toInt(), (45 * lightFactor).toInt())
    }

    // Body (Tattered Dress)
    val bodyRect = RectF(cx - w * 0.35f, cy + h * 0.35f, cx + w * 0.35f, cy + h)
    canvas.drawRoundRect(bodyRect, 10f, 10f, bodyPaint)

    // Head
    val headPaint = Paint().apply {
        isAntiAlias = true
        color = Color.rgb((120 * lightFactor).toInt(), (110 * lightFactor).toInt(), (100 * lightFactor).toInt())
    }
    val headRadius = w * 0.28f
    val headCenterY = cy + h * 0.22f
    canvas.drawCircle(cx, headCenterY, headRadius, headPaint)

    // Glowing Menacing Red Eyes
    val eyePaint = Paint().apply {
        isAntiAlias = true
        color = Color.rgb(255, 30, 30)
        setShadowLayer(8f, 0f, 0f, Color.RED)
    }
    val eyeDist = headRadius * 0.45f
    canvas.drawCircle(cx - eyeDist, headCenterY - 4f, 4.5f, eyePaint)
    canvas.drawCircle(cx + eyeDist, headCenterY - 4f, 4.5f, eyePaint)

    // Bloody Bat Weapon in Hand
    val batPaint = Paint().apply {
        isAntiAlias = true
        color = Color.rgb(90, 45, 20)
        strokeWidth = 9f
    }
    val batEndX = cx + w * 0.45f
    val batEndY = cy + h * 0.2f
    canvas.drawLine(cx + w * 0.25f, cy + h * 0.6f, batEndX, batEndY, batPaint)

    // Blood on bat tip
    val bloodPaint = Paint().apply {
        isAntiAlias = true
        color = Color.rgb(180, 0, 0)
    }
    canvas.drawCircle(batEndX, batEndY, 6f, bloodPaint)

    // Stunned indicator Zzz
    if (state == GrannyState.STUNNED) {
        val zPaint = Paint().apply {
            color = Color.rgb(0, 255, 200)
            textSize = 34f
            isFakeBoldText = true
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText("💤 ASLEEP", cx, cy - 14f, zPaint)
    }
}

private fun drawJumpscareOverlay(
    canvas: android.graphics.Canvas,
    width: Float,
    height: Float
) {
    // Red flash background
    val flashPaint = Paint().apply {
        color = Color.argb(220, 160, 0, 0)
    }
    canvas.drawRect(0f, 0f, width, height, flashPaint)

    val cx = width * 0.5f
    val cy = height * 0.5f

    // Giant terrifying face lunging
    val headPaint = Paint().apply {
        color = Color.rgb(90, 80, 70)
        isAntiAlias = true
    }
    canvas.drawCircle(cx, cy, height * 0.32f, headPaint)

    // Bloody Mouth screaming
    val mouthPaint = Paint().apply {
        color = Color.rgb(20, 5, 5)
        isAntiAlias = true
    }
    canvas.drawOval(
        RectF(cx - height * 0.12f, cy + height * 0.05f, cx + height * 0.12f, cy + height * 0.22f),
        mouthPaint
    )

    // Glowing blazing red eyes
    val eyePaint = Paint().apply {
        color = Color.rgb(255, 0, 0)
        isAntiAlias = true
        setShadowLayer(25f, 0f, 0f, Color.RED)
    }
    canvas.drawCircle(cx - height * 0.12f, cy - height * 0.08f, 22f, eyePaint)
    canvas.drawCircle(cx + height * 0.12f, cy - height * 0.08f, 22f, eyePaint)

    // Bat swinging down
    val batPaint = Paint().apply {
        color = Color.rgb(60, 30, 10)
        strokeWidth = 24f
    }
    canvas.drawLine(cx + height * 0.35f, cy - height * 0.25f, cx - height * 0.2f, cy + height * 0.15f, batPaint)

    val caughtPaint = Paint().apply {
        color = Color.WHITE
        textSize = 52f
        isFakeBoldText = true
        textAlign = Paint.Align.CENTER
        setShadowLayer(10f, 0f, 0f, Color.RED)
    }
    canvas.drawText("GRANNY CAUGHT YOU!", cx, height * 0.88f, caughtPaint)
}
