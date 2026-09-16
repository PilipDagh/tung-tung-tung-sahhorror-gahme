package com.example.grannytung.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.example.grannytung.audio.SoundManager
import com.example.grannytung.data.CareerStats
import com.example.grannytung.data.GameSettings
import com.example.grannytung.engine.GameEngine
import kotlin.random.Random

enum class AppScreen {
    MAIN_MENU,
    IN_GAME
}

@Composable
fun GrannyApp() {
    val context = LocalContext.current
    val settings = remember { GameSettings() }
    val careerStats = remember { CareerStats() }
    val soundManager = remember { SoundManager(context, settings) }

    val gameEngine = remember { GameEngine(settings, soundManager, careerStats) }

    var currentScreen by remember { mutableStateOf(AppScreen.MAIN_MENU) }
    var isPaused by remember { mutableStateOf(false) }

    // Directional move input from virtual joystick
    var joystickMoveX by remember { mutableFloatStateOf(0f) }
    var joystickMoveZ by remember { mutableFloatStateOf(0f) }

    // Clean up sound resources on disposal
    DisposableEffect(Unit) {
        onDispose {
            soundManager.release()
        }
    }

    // High performance Game Loop (runs when on IN_GAME screen and not paused)
    LaunchedEffect(currentScreen, isPaused) {
        if (currentScreen == AppScreen.IN_GAME && !isPaused) {
            var lastTime = System.currentTimeMillis()
            while (true) {
                withFrameMillis { currentFrameTime ->
                    val now = System.currentTimeMillis()
                    val dt = ((now - lastTime) / 1000.0f).coerceIn(0.001f, 0.05f)
                    lastTime = now

                    // Move player based on joystick
                    if (joystickMoveX != 0f || joystickMoveZ != 0f) {
                        gameEngine.movePlayer(joystickMoveX, joystickMoveZ, dt)
                    }

                    // Tick game world & Granny AI
                    gameEngine.update(dt)
                }
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        when (currentScreen) {
            AppScreen.MAIN_MENU -> {
                MainMenuScreen(
                    settings = settings,
                    stats = careerStats,
                    onStartGame = {
                        val preset = Random.nextInt(1, 6)
                        gameEngine.startNewGame(preset)
                        isPaused = false
                        currentScreen = AppScreen.IN_GAME
                    }
                )
            }

            AppScreen.IN_GAME -> {
                // 3D First Person Raycast Canvas
                GameCanvas(
                    game = gameEngine,
                    modifier = Modifier.fillMaxSize()
                )

                // Mobile Touch HUD & Controls
                GameHud(
                    game = gameEngine,
                    onOpenMenu = { isPaused = true },
                    onMove = { x, z ->
                        joystickMoveX = x
                        joystickMoveZ = z
                    },
                    onLook = { yawDelta, pitchDelta ->
                        gameEngine.rotateLook(yawDelta, pitchDelta)
                    }
                )

                // Pause Dialog
                if (isPaused && !gameEngine.isGameOver && !gameEngine.isEscaped) {
                    PauseDialog(
                        onResume = { isPaused = false },
                        onRestartDay = {
                            isPaused = false
                            gameEngine.resetToBedroomSpawn()
                        },
                        onQuitToMenu = {
                            isPaused = false
                            soundManager.stopChaseMusic()
                            currentScreen = AppScreen.MAIN_MENU
                        }
                    )
                }

                // Game Over Dialog
                if (gameEngine.isGameOver) {
                    GameOverDialog(
                        game = gameEngine,
                        onPlayAgain = {
                            val preset = Random.nextInt(1, 6)
                            gameEngine.startNewGame(preset)
                        },
                        onQuitToMenu = {
                            soundManager.stopChaseMusic()
                            currentScreen = AppScreen.MAIN_MENU
                        }
                    )
                }

                // Victory Dialog
                if (gameEngine.isEscaped) {
                    VictoryDialog(
                        game = gameEngine,
                        onPlayAgain = {
                            val preset = Random.nextInt(1, 6)
                            gameEngine.startNewGame(preset)
                        },
                        onQuitToMenu = {
                            soundManager.stopChaseMusic()
                            currentScreen = AppScreen.MAIN_MENU
                        }
                    )
                }
            }
        }
    }
}
