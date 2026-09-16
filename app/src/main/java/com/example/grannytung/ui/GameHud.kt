package com.example.grannytung.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.grannytung.data.GrannyState
import com.example.grannytung.data.ItemsCatalogue
import com.example.grannytung.engine.GameEngine
import kotlin.math.roundToInt
import kotlin.math.sqrt

@Composable
fun GameHud(
    game: GameEngine,
    onOpenMenu: () -> Unit,
    onMove: (Float, Float) -> Unit,
    onLook: (Float, Float) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier.fillMaxSize()) {
        // --- TOP BAR: Stealth & Granny Alert ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 28.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Stealth status pill
            val stealthText = when {
                game.isHiding -> "STEALTH: ${game.hidingSpotDescription.uppercase()}"
                game.isCrouching -> "STEALTH: CROUCHED"
                else -> "STEALTH: STANDING"
            }
            val stealthColor = when {
                game.isHiding -> Color(0xFF00E676)
                game.isCrouching -> Color(0xFFFFEB3B)
                else -> Color(0xFFB0BEC5)
            }

            Box(
                modifier = Modifier
                    .background(Color(0xCC111111), RoundedCornerShape(8.dp))
                    .border(1.dp, stealthColor.copy(alpha = 0.6f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text(
                    text = stealthText,
                    color = stealthColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Top Right: Day / Granny Status Pill
            Column(horizontalAlignment = Alignment.End) {
                Box(
                    modifier = Modifier
                        .background(Color(0xCC111111), RoundedCornerShape(8.dp))
                        .border(1.dp, Color(0xFFD32F2F), RoundedCornerShape(8.dp))
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "DAY ${game.currentDay} / ${game.maxDays}",
                        color = Color(0xFFFF5252),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                if (game.granny.state == GrannyState.STUNNED) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Box(
                        modifier = Modifier
                            .background(Color(0xDD004D40), RoundedCornerShape(6.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "GRANNY ASLEEP: ${game.granny.stunTimer.toInt()}s",
                            color = Color(0xFF64FFDA),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // --- CENTER INTERACTION PROMPT ---
        game.interactionPrompt?.let { prompt ->
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .offset(y = 60.dp)
                    .background(
                        Brush.horizontalGradient(
                            listOf(Color.Transparent, Color(0xDD000000), Color.Transparent)
                        )
                    )
                    .padding(horizontal = 24.dp, vertical = 8.dp)
            ) {
                Text(
                    text = prompt,
                    color = Color(0xFFFFD54F),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
            }
        }

        // --- LOOK TOUCH DRAG SURFACE (Across entire right half of screen) ---
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 90.dp)
                .pointerInput(Unit) {
                    detectDragGestures { change, dragAmount ->
                        change.consume()
                        val sens = 0.0035f * game.settings.mouseSensitivity
                        onLook(dragAmount.x * sens, dragAmount.y * sens)
                    }
                }
        )

        // --- BOTTOM CONTROLS & INVENTORY ---
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(bottom = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Virtual Joystick & Action Buttons Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                // Virtual Joystick on the left
                VirtualJoystick(
                    onMove = onMove,
                    modifier = Modifier.size(130.dp)
                )

                // Action Buttons on the right
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ActionButton(
                        label = "MENU",
                        color = Color(0xFF455A64),
                        onClick = onOpenMenu,
                        modifier = Modifier.testTag("btn_menu")
                    )

                    ActionButton(
                        label = "CROUCH",
                        color = if (game.isCrouching) Color(0xFFFF8F00) else Color(0xFF37474F),
                        onClick = { game.toggleCrouch() },
                        modifier = Modifier.testTag("btn_crouch")
                    )

                    ActionButton(
                        label = "DROP",
                        color = Color(0xFF795548),
                        onClick = { game.dropItem() },
                        modifier = Modifier.testTag("btn_drop")
                    )

                    val isHoldingWeapon = game.activeItem == ItemsCatalogue.SHOTGUN || game.activeItem == ItemsCatalogue.CROSSBOW
                    if (isHoldingWeapon) {
                        ActionButton(
                            label = "FIRE",
                            color = Color(0xFFD32F2F),
                            onClick = { game.fireWeapon() },
                            modifier = Modifier.testTag("btn_fire")
                        )
                    }

                    ActionButton(
                        label = "USE",
                        color = Color(0xFF2E7D32),
                        isPrimary = true,
                        onClick = { game.interact() },
                        modifier = Modifier.testTag("btn_use")
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 5 Inventory Slots
            Row(
                modifier = Modifier
                    .background(Color(0xDD12100E), RoundedCornerShape(10.dp))
                    .border(1.dp, Color(0xFF3E2723), RoundedCornerShape(10.dp))
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                for (i in 0 until 5) {
                    val item = game.inventorySlots[i]
                    val isSelected = i == game.activeSlotIndex

                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSelected) Color(0xFF3E2723) else Color(0xFF1E1A18))
                            .border(
                                width = if (isSelected) 2.dp else 1.dp,
                                color = if (isSelected) Color(0xFFFFD54F) else Color(0xFF424242),
                                shape = RoundedCornerShape(8.dp)
                            )
                            .clickable { game.activeSlotIndex = i }
                            .padding(2.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        if (item != null) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = item.iconEmoji,
                                    fontSize = 20.sp
                                )
                                Text(
                                    text = item.name,
                                    color = Color(0xFFEEEEEE),
                                    fontSize = 7.5.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    textAlign = TextAlign.Center
                                )
                            }
                        } else {
                            Text(
                                text = "${i + 1}",
                                color = Color(0xFF616161),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun VirtualJoystick(
    onMove: (Float, Float) -> Unit,
    modifier: Modifier = Modifier
) {
    val radius = 55.dp
    var knobOffsetX by remember { mutableFloatStateOf(0f) }
    var knobOffsetY by remember { mutableFloatStateOf(0f) }

    Box(
        modifier = modifier
            .clip(CircleShape)
            .background(Color(0x66000000))
            .border(2.dp, Color(0x66FFFFFF), CircleShape)
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { offset ->
                        val dx = offset.x - size.width * 0.5f
                        val dy = offset.y - size.height * 0.5f
                        val dist = sqrt(dx * dx + dy * dy)
                        val maxR = size.width * 0.45f
                        val factor = if (dist > maxR) maxR / dist else 1f
                        knobOffsetX = dx * factor
                        knobOffsetY = dy * factor
                        onMove(knobOffsetX / maxR, -knobOffsetY / maxR)
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        val newX = knobOffsetX + dragAmount.x
                        val newY = knobOffsetY + dragAmount.y
                        val dist = sqrt(newX * newX + newY * newY)
                        val maxR = size.width * 0.45f
                        val factor = if (dist > maxR) maxR / dist else 1f
                        knobOffsetX = newX * factor
                        knobOffsetY = newY * factor
                        onMove(knobOffsetX / maxR, -knobOffsetY / maxR)
                    },
                    onDragEnd = {
                        knobOffsetX = 0f
                        knobOffsetY = 0f
                        onMove(0f, 0f)
                    },
                    onDragCancel = {
                        knobOffsetX = 0f
                        knobOffsetY = 0f
                        onMove(0f, 0f)
                    }
                )
            },
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .offset { IntOffset(knobOffsetX.roundToInt(), knobOffsetY.roundToInt()) }
                .size(46.dp)
                .clip(CircleShape)
                .background(Color(0xCCFFFFFF))
                .border(1.dp, Color.Black, CircleShape)
        )
    }
}

@Composable
fun ActionButton(
    label: String,
    color: Color,
    isPrimary: Boolean = false,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val size = if (isPrimary) 58.dp else 48.dp
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(color)
            .border(1.5.dp, Color(0x66FFFFFF), CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = Color.White,
            fontSize = if (isPrimary) 12.sp else 10.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
    }
}
