package com.example.grannytung.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.SoundPool
import com.example.grannytung.R
import com.example.grannytung.data.GameSettings
import kotlinx.coroutines.launch

class SoundManager(private val context: Context, private val settings: GameSettings) {

    private val soundPool: SoundPool
    private val soundMap = mutableMapOf<String, Int>()

    private var chasePlayer: MediaPlayer? = null
    private var isChasePlaying = false

    init {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        soundPool = SoundPool.Builder()
            .setMaxStreams(8)
            .setAudioAttributes(audioAttributes)
            .build()

        loadSound("tung", R.raw.sfx_tung)
        loadSound("sahur_voice", R.raw.sfx_sahur_voice)
        loadSound("bat_hit", R.raw.sfx_bat_hit)
        loadSound("jumpscare", R.raw.sfx_jumpscare)
        loadSound("creak", R.raw.sfx_creak)
        loadSound("door", R.raw.sfx_door)
        loadSound("door1", R.raw.sfx_door1)
        loadSound("drawer", R.raw.sfx_drawer)
        loadSound("drop", R.raw.sfx_item_drop)
        loadSound("shotgun", R.raw.sfx_shotgun)
        loadSound("crossbow", R.raw.sfx_crossbow)
        loadSound("bounce", R.raw.sfx_bounce)
        loadSound("painting_drop", R.raw.sfx_painting_drop)
    }

    private fun loadSound(key: String, resId: Int) {
        try {
            soundMap[key] = soundPool.load(context, resId, 1)
        } catch (_: Exception) {}
    }

    fun playSfx(key: String, volumeScale: Float = 1.0f) {
        val soundId = soundMap[key] ?: return
        val vol = settings.masterVolume * settings.sfxVolume * volumeScale
        if (vol > 0f) {
            soundPool.play(soundId, vol, vol, 1, 0, 1.0f)
        }
    }

    fun playTung() {
        playSfx("tung", 1.0f)
    }

    fun playSahurVoice() {
        playSfx("sahur_voice", 1.0f)
    }

    fun playTungPattern(scope: kotlinx.coroutines.CoroutineScope) {
        scope.launch(kotlinx.coroutines.Dispatchers.Default) {
            playTung()
            kotlinx.coroutines.delay(240)
            playTung()
            kotlinx.coroutines.delay(240)
            playTung()
            kotlinx.coroutines.delay(300)
            playSahurVoice()
        }
    }

    fun startChaseMusic() {
        if (isChasePlaying) return
        try {
            if (chasePlayer == null) {
                chasePlayer = MediaPlayer.create(context, R.raw.sfx_sahur_chase).apply {
                    isLooping = true
                }
            }
            val vol = settings.masterVolume * settings.musicVolume
            chasePlayer?.setVolume(vol, vol)
            chasePlayer?.start()
            isChasePlaying = true
        } catch (_: Exception) {}
    }

    fun stopChaseMusic() {
        if (!isChasePlaying) return
        try {
            chasePlayer?.pause()
            chasePlayer?.seekTo(0)
            isChasePlaying = false
        } catch (_: Exception) {}
    }

    fun updateVolumes() {
        val musicVol = settings.masterVolume * settings.musicVolume
        try {
            chasePlayer?.setVolume(musicVol, musicVol)
        } catch (_: Exception) {}
    }

    fun release() {
        stopChaseMusic()
        try {
            chasePlayer?.release()
            chasePlayer = null
            soundPool.release()
        } catch (_: Exception) {}
    }
}
