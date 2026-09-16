package com.example.grannytung.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.grannytung.engine.GameEngine

@Composable
fun PauseDialog(
    onResume: () -> Unit,
    onRestartDay: () -> Unit,
    onQuitToMenu: () -> Unit
) {
    Dialog(onDismissRequest = onResume) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1B1817)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "GAME PAUSED",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    onClick = onResume,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                    modifier = Modifier.fillMaxWidth().testTag("btn_resume")
                ) {
                    Text("RESUME GAME", fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = onRestartDay,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD84315)),
                    modifier = Modifier.fillMaxWidth().testTag("btn_restart_day")
                ) {
                    Text("RESTART CURRENT DAY")
                }

                Button(
                    onClick = onQuitToMenu,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF424242)),
                    modifier = Modifier.fillMaxWidth().testTag("btn_quit_menu")
                ) {
                    Text("MAIN MENU")
                }
            }
        }
    }
}

@Composable
fun GameOverDialog(
    game: GameEngine,
    onPlayAgain: () -> Unit,
    onQuitToMenu: () -> Unit
) {
    Dialog(onDismissRequest = {}) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF210909)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    text = "GAME OVER",
                    color = Color(0xFFFF1744),
                    fontSize = 28.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 2.sp
                )

                Text(
                    text = "You were trapped in the manor for 5 days. Granny did not let you leave...",
                    color = Color(0xFFE0E0E0),
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0x66000000), RoundedCornerShape(8.dp))
                        .padding(12.dp)
                ) {
                    Text("Career Stats:", color = Color(0xFFFF8A80), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text("Total Escapes: ${game.careerStats.escapes}", color = Color.White, fontSize = 11.sp)
                    Text("Granny Stuns: ${game.careerStats.stuns}", color = Color.White, fontSize = 11.sp)
                    Text("Total Deaths: ${game.careerStats.deaths}", color = Color.White, fontSize = 11.sp)
                }

                Button(
                    onClick = onPlayAgain,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD50000)),
                    modifier = Modifier.fillMaxWidth().testTag("btn_game_over_retry")
                ) {
                    Text("TRY AGAIN", fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = onQuitToMenu,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF424242)),
                    modifier = Modifier.fillMaxWidth().testTag("btn_game_over_menu")
                ) {
                    Text("MAIN MENU")
                }
            }
        }
    }
}

@Composable
fun VictoryDialog(
    game: GameEngine,
    onPlayAgain: () -> Unit,
    onQuitToMenu: () -> Unit
) {
    Dialog(onDismissRequest = {}) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0D2818)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    text = "YOU ESCAPED!",
                    color = Color(0xFF00E676),
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 2.sp
                )

                Text(
                    text = "Escape Route: ${game.escapeType}\n\nYou survived all of Granny's traps and made it to safety!",
                    color = Color(0xFFE8F5E9),
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center
                )

                Button(
                    onClick = onPlayAgain,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C853)),
                    modifier = Modifier.fillMaxWidth().testTag("btn_victory_play_again")
                ) {
                    Text("PLAY AGAIN", fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = onQuitToMenu,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF37474F)),
                    modifier = Modifier.fillMaxWidth().testTag("btn_victory_menu")
                ) {
                    Text("MAIN MENU")
                }
            }
        }
    }
}
