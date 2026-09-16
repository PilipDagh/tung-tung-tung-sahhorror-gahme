package com.example.grannytung.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.grannytung.data.CareerStats
import com.example.grannytung.data.CrosshairStyle
import com.example.grannytung.data.Difficulty
import com.example.grannytung.data.GameSettings
import com.example.grannytung.data.MultiplayerLobby

@Composable
fun MainMenuScreen(
    settings: GameSettings,
    stats: CareerStats,
    onStartGame: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showSinglePlayerModal by remember { mutableStateOf(false) }
    var showMultiplayerModal by remember { mutableStateOf(false) }
    var showWardrobeModal by remember { mutableStateOf(false) }
    var showSettingsModal by remember { mutableStateOf(false) }
    var showHowToPlayModal by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFF0A0706), Color(0xFF19110E), Color(0xFF060404))
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(24.dp)
        ) {
            // Spooky Title
            Text(
                text = "GRANNY",
                color = Color(0xFFD50000),
                fontSize = 44.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 4.sp
            )
            Text(
                text = "TUNG TUNG SAHUR EDITION",
                color = Color(0xFFFF8A80),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Can you escape the 5-floor haunted manor before Day 5?",
                color = Color(0xFF9E9E9E),
                fontSize = 12.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(36.dp))

            // Main Action Buttons
            MenuOptionButton(
                title = "PLAY GAME",
                subtitle = "Select difficulty & escape",
                color = Color(0xFFB71C1C),
                onClick = { showSinglePlayerModal = true },
                tag = "btn_play_game"
            )

            Spacer(modifier = Modifier.height(12.dp))

            MenuOptionButton(
                title = "MULTIPLAYER LOBBIES",
                subtitle = "Browse rooms & host manor session",
                color = Color(0xFF37474F),
                onClick = { showMultiplayerModal = true },
                tag = "btn_multiplayer"
            )

            Spacer(modifier = Modifier.height(12.dp))

            MenuOptionButton(
                title = "WARDROBE & CUSTOMIZATION",
                subtitle = "Customize survivor appearance",
                color = Color(0xFF4E342E),
                onClick = { showWardrobeModal = true },
                tag = "btn_wardrobe"
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                SmallMenuButton(
                    title = "SETTINGS",
                    onClick = { showSettingsModal = true },
                    tag = "btn_settings"
                )
                SmallMenuButton(
                    title = "HOW TO PLAY",
                    onClick = { showHowToPlayModal = true },
                    tag = "btn_how_to_play"
                )
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Quick Stats Preview
            Text(
                text = "Career Escapes: ${stats.escapes}  |  Granny Stuns: ${stats.stuns}  |  Deaths: ${stats.deaths}",
                color = Color(0xFF757575),
                fontSize = 11.sp
            )
        }
    }

    if (showSinglePlayerModal) {
        SinglePlayerConfigDialog(
            settings = settings,
            onDismiss = { showSinglePlayerModal = false },
            onStart = {
                showSinglePlayerModal = false
                onStartGame()
            }
        )
    }

    if (showMultiplayerModal) {
        MultiplayerLobbiesDialog(
            settings = settings,
            onDismiss = { showMultiplayerModal = false },
            onJoinLobby = {
                showMultiplayerModal = false
                onStartGame()
            }
        )
    }

    if (showWardrobeModal) {
        WardrobeDialog(
            settings = settings,
            onDismiss = { showWardrobeModal = false }
        )
    }

    if (showSettingsModal) {
        SettingsDialog(
            settings = settings,
            stats = stats,
            onDismiss = { showSettingsModal = false }
        )
    }

    if (showHowToPlayModal) {
        HowToPlayDialog(onDismiss = { showHowToPlayModal = false })
    }
}

@Composable
fun MenuOptionButton(
    title: String,
    subtitle: String,
    color: Color,
    onClick: () -> Unit,
    tag: String
) {
    Box(
        modifier = Modifier
            .fillMaxWidth(0.85f)
            .clip(RoundedCornerShape(12.dp))
            .background(color)
            .border(1.5.dp, Color(0x66FFFFFF), RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .testTag(tag)
            .padding(vertical = 12.dp, horizontal = 20.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = title,
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
            Text(
                text = subtitle,
                color = Color(0xFFD7CCC8),
                fontSize = 11.sp
            )
        }
    }
}

@Composable
fun SmallMenuButton(
    title: String,
    onClick: () -> Unit,
    tag: String
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0xFF212121))
            .border(1.dp, Color(0xFF616161), RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .testTag(tag)
            .padding(vertical = 8.dp, horizontal = 16.dp)
    ) {
        Text(
            text = title,
            color = Color(0xFFE0E0E0),
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
fun SinglePlayerConfigDialog(
    settings: GameSettings,
    onDismiss: () -> Unit,
    onStart: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1715)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "ESCAPE CONFIGURATION",
                    color = Color(0xFFFF5252),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(16.dp))

                // Difficulty selector
                Text("Select Difficulty", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(6.dp))
                Difficulty.values().forEach { diff ->
                    val isSelected = settings.difficulty == diff
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSelected) Color(0xFFB71C1C) else Color(0xFF2C2220))
                            .clickable { settings.difficulty = diff }
                            .padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = diff.label,
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Nightmare switch
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Nightmare (Ultra Dark)", color = Color.White, fontSize = 13.sp)
                    Switch(
                        checked = settings.isNightmare,
                        onCheckedChange = { settings.isNightmare = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFFFF5252))
                    )
                }

                // Fun Mode switch
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Fun Mode (Bouncing Balls)", color = Color.White, fontSize = 13.sp)
                    Switch(
                        checked = settings.isFunMode,
                        onCheckedChange = { settings.isFunMode = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF00E676))
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = onStart,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB71C1C)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("btn_confirm_start")
                ) {
                    Text("WAKE UP IN BEDROOM", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun MultiplayerLobbiesDialog(
    settings: GameSettings,
    onDismiss: () -> Unit,
    onJoinLobby: () -> Unit
) {
    val sampleLobbies = listOf(
        MultiplayerLobby("LOBBY-771", "Sahur Escape Squad #1", "GhostHost", 3, 4, Difficulty.NORMAL, false, false),
        MultiplayerLobby("LOBBY-402", "Extreme Attic Survivors", "DreadMaster", 2, 4, Difficulty.EXTREME, true, true),
        MultiplayerLobby("LOBBY-919", "Garage Car Mechanics", "SpeedRunner", 1, 4, Difficulty.HARD, false, false)
    )

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1E)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "MULTIPLAYER LOBBIES",
                    color = Color(0xFF80D8FF),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Join survivors worldwide or host your own session",
                    color = Color(0xFF9E9E9E),
                    fontSize = 11.sp
                )
                Spacer(modifier = Modifier.height(14.dp))

                LazyColumn(modifier = Modifier.height(200.dp)) {
                    items(sampleLobbies) { lobby ->
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFF25252E))
                                .padding(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(lobby.name, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                    Text("Host: ${lobby.host}  |  ${lobby.difficulty.name}", color = Color(0xFFB0BEC5), fontSize = 10.sp)
                                }
                                Button(
                                    onClick = onJoinLobby,
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0091EA)),
                                    modifier = Modifier.height(34.dp)
                                ) {
                                    Text("JOIN (${lobby.playersCount}/${lobby.maxPlayers})", fontSize = 10.sp)
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = onJoinLobby,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C853)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("CREATE NEW LOBBY", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun WardrobeDialog(
    settings: GameSettings,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1917)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "SURVIVOR WARDROBE",
                    color = Color(0xFFFFB74D),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(16.dp))

                // Nightgown Color Choices
                Text("Nightgown Color", color = Color.White, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(0xFF335577, 0xFF772222, 0xFF225522, 0xFF553377, 0xFF444444).forEach { col ->
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(Color(col))
                                .border(
                                    width = if (settings.shirtColor == col) 2.5.dp else 1.dp,
                                    color = if (settings.shirtColor == col) Color.White else Color.Transparent,
                                    shape = RoundedCornerShape(6.dp)
                                )
                                .clickable { settings.shirtColor = col }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Skin Tone Choices
                Text("Skin Tone", color = Color.White, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(0xFFD8B28A, 0xFFE0BB95, 0xFFC69C6D, 0xFF8D5524, 0xFF5C3818).forEach { col ->
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(Color(col))
                                .border(
                                    width = if (settings.skinColor == col) 2.5.dp else 1.dp,
                                    color = if (settings.skinColor == col) Color.White else Color.Transparent,
                                    shape = RoundedCornerShape(6.dp)
                                )
                                .clickable { settings.skinColor = col }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFBF360C)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("SAVE & CLOSE")
                }
            }
        }
    }
}

@Composable
fun SettingsDialog(
    settings: GameSettings,
    stats: CareerStats,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1C1C)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "SETTINGS & AUDIO",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(14.dp))

                // Master Volume Slider
                Text("Master Volume (${(settings.masterVolume * 100).toInt()}%)", color = Color(0xFFE0E0E0), fontSize = 12.sp)
                Slider(
                    value = settings.masterVolume,
                    onValueChange = { settings.masterVolume = it },
                    colors = SliderDefaults.colors(thumbColor = Color(0xFFFF5252), activeTrackColor = Color(0xFFFF5252))
                )

                // SFX Volume Slider
                Text("SFX Volume (${(settings.sfxVolume * 100).toInt()}%)", color = Color(0xFFE0E0E0), fontSize = 12.sp)
                Slider(
                    value = settings.sfxVolume,
                    onValueChange = { settings.sfxVolume = it },
                    colors = SliderDefaults.colors(thumbColor = Color(0xFFFF5252), activeTrackColor = Color(0xFFFF5252))
                )

                // Chase Music Volume Slider
                Text("Sahur Chase Music (${(settings.musicVolume * 100).toInt()}%)", color = Color(0xFFE0E0E0), fontSize = 12.sp)
                Slider(
                    value = settings.musicVolume,
                    onValueChange = { settings.musicVolume = it },
                    colors = SliderDefaults.colors(thumbColor = Color(0xFFFF5252), activeTrackColor = Color(0xFFFF5252))
                )

                // Touch Sensitivity Slider
                Text("Touch Sensitivity (${(settings.mouseSensitivity * 100).toInt()}%)", color = Color(0xFFE0E0E0), fontSize = 12.sp)
                Slider(
                    value = settings.mouseSensitivity,
                    onValueChange = { settings.mouseSensitivity = it },
                    valueRange = 0.5f..2.5f,
                    colors = SliderDefaults.colors(thumbColor = Color(0xFF29B6F6), activeTrackColor = Color(0xFF29B6F6))
                )

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF424242)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("DONE")
                }
            }
        }
    }
}

@Composable
fun HowToPlayDialog(onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1715)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "HOW TO SURVIVE",
                    color = Color(0xFFFF5252),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "• 5 Days: You have 5 days to escape the manor. Each time Granny catches you, a day passes.\n\n" +
                            "• Granny Hears Everything: Dropping items or stepping on the weak creaky board in the attic will alert her!\n\n" +
                            "• Stealth: Crouch to move quietly. When she approaches, interact with beds or wardrobes to hide!\n\n" +
                            "• Two Ways Out:\n" +
                            "  1. Front Exit Door: Find Padlock Key, Cutting Pliers, Code, Hammer & Master Key to open the 5 locks.\n" +
                            "  2. Garage Car: In the sub-basement (Level -2), install the Battery, Spark Plug, Engine Part, Gasoline, and use the Car Key!\n\n" +
                            "• Defend Yourself: Weapons like the Shotgun and Crossbow knock out Granny for 2 minutes!",
                    color = Color(0xFFE0E0E0),
                    fontSize = 11.5.sp,
                    lineHeight = 16.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB71C1C)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("UNDERSTOOD")
                }
            }
        }
    }
}
