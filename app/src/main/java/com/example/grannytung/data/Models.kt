package com.example.grannytung.data

import kotlin.math.sqrt

enum class Difficulty(val label: String, val grannySpeedMultiplier: Float, val hearingMultiplier: Float) {
    EASY("Easy (Slower Granny)", 0.75f, 0.7f),
    NORMAL("Normal (Standard)", 1.0f, 1.0f),
    HARD("Hard (Fast AI + Creaky floors)", 1.25f, 1.3f),
    EXTREME("Extreme (Aggressive AI + Dark)", 1.45f, 1.6f)
}

enum class CrosshairStyle(val label: String) {
    DOT("Subtle Dot"),
    CROSS("Tactical Crosshair"),
    RING("Classic Horror Ring"),
    NONE("None (Immersive)")
}

data class GameSettings(
    var difficulty: Difficulty = Difficulty.NORMAL,
    var isNightmare: Boolean = false,
    var extraLocks: Boolean = false,
    var isFunMode: Boolean = false,
    var fovDegrees: Float = 75f,
    var mouseSensitivity: Float = 1.0f,
    var invertY: Boolean = false,
    var crosshairStyle: CrosshairStyle = CrosshairStyle.DOT,
    var masterVolume: Float = 1.0f,
    var sfxVolume: Float = 1.0f,
    var musicVolume: Float = 1.0f,
    var survivorName: String = "Survivor",
    var shirtColor: Long = 0xFF335577,
    var skinColor: Long = 0xFFD8B28A,
    var pantsColor: Long = 0xFF22222B
)

data class CareerStats(
    var escapes: Int = 0,
    var deaths: Int = 0,
    var stuns: Int = 0,
    var daysSurvived: Int = 0
)

data class ItemDef(
    val id: String,
    val name: String,
    val description: String,
    val iconEmoji: String,
    val color: Long = 0xFFD4AF37
)

object ItemsCatalogue {
    val MASTER_KEY = ItemDef("master_key", "Master Key", "Unlocks the main front door deadlock", "🔑", 0xFFFFD700)
    val HAMMER = ItemDef("hammer", "Hammer", "Removes wooden barricade planks", "🔨", 0xFF8B4513)
    val CUTTING_PLIERS = ItemDef("cutting_pliers", "Cutting Pliers", "Cuts high-voltage alarm wires", "✂️", 0xFF4682B4)
    val PADLOCK_KEY = ItemDef("padlock_key", "Padlock Key", "Unlocks the heavy front door padlock", "🗝️", 0xFFDAA520)
    val PADLOCK_CODE = ItemDef("padlock_code", "Padlock Code", "4-digit code for electronic lock", "📄", 0xFFE0E0E0)
    val BATTERY = ItemDef("battery", "Battery", "Powers electrical switches and flashlight", "🔋", 0xFF32CD32)
    val SAFE_KEY = ItemDef("safe_key", "Safe Key", "Opens wall safes throughout the manor", "🗝️", 0xFFB8860B)
    val WEAPON_KEY = ItemDef("weapon_key", "Weapon Key", "Opens the playhouse weapon locker", "🔑", 0xFFCD853F)
    val MELON = ItemDef("melon", "Melon", "Can be sliced with the guillotine", "🍈", 0xFF3CB371)
    val WINCH_HANDLE = ItemDef("winch_handle", "Winch Handle", "Raises well bucket & garage door", "⚙️", 0xFF708090)
    val PLAYHOUSE_KEY = ItemDef("playhouse_key", "Playhouse Key", "Unlocks the courtyard playhouse", "🔑", 0xFF9370DB)
    val ORANGE_COGWHEEL = ItemDef("orange_cogwheel", "Orange Cogwheel", "Component for playhouse mechanism", "⚙️", 0xFFFFA500)
    val RED_COGWHEEL = ItemDef("red_cogwheel", "Red Cogwheel", "Component for playhouse mechanism", "⚙️", 0xFFFF4500)
    val CAR_KEY = ItemDef("car_key", "Car Key", "Starts the garage escape car ignition", "🔑", 0xFF1E90FF)
    val SPECIAL_KEY = ItemDef("special_key", "Special Key", "Unlocks secret room in attic", "🗝️", 0xFFD2691E)
    val MEAT = ItemDef("meat", "Meat", "Distracts the cellar spider / crow", "🥩", 0xFFDC143C)
    val GASOLINE_CAN = ItemDef("gasoline_can", "Gasoline Can", "Fuel for the escape car", "⛽", 0xFFFF0000)
    val CAR_BATTERY = ItemDef("car_battery", "Car Battery", "Provides power to the escape car", "🔋", 0xFF2F4F4F)
    val ENGINE_PART = ItemDef("engine_part", "Engine Part", "Repairs the escape car motor", "🔩", 0xFF696969)
    val SPARK_PLUG = ItemDef("spark_plug", "Spark Plug", "Ignition spark for car engine", "⚡", 0xFFFFD700)
    val WRENCH = ItemDef("wrench", "Wrench", "Unbolts car battery / drain gates", "🔧", 0xFF708090)
    val SHOTGUN = ItemDef("shotgun", "Shotgun", "Fires pellets that knock out Granny for 2 mins", "🔫", 0xFF8B0000)
    val CROSSBOW = ItemDef("crossbow", "Crossbow", "Fires tranquilizer darts at Granny", "🏹", 0xFF2E8B57)

    fun findByName(name: String): ItemDef {
        return when (name) {
            "Master Key" -> MASTER_KEY
            "Hammer" -> HAMMER
            "Cutting Pliers" -> CUTTING_PLIERS
            "Padlock Key" -> PADLOCK_KEY
            "Padlock Code" -> PADLOCK_CODE
            "Battery" -> BATTERY
            "Safe Key" -> SAFE_KEY
            "Weapon Key" -> WEAPON_KEY
            "Melon" -> MELON
            "Winch Handle" -> WINCH_HANDLE
            "Playhouse Key" -> PLAYHOUSE_KEY
            "Orange Cogwheel" -> ORANGE_COGWHEEL
            "Red Cogwheel" -> RED_COGWHEEL
            "Car Key" -> CAR_KEY
            "Special Key" -> SPECIAL_KEY
            "Meat" -> MEAT
            "Gasoline Can" -> GASOLINE_CAN
            "Car Battery" -> CAR_BATTERY
            "Engine Part" -> ENGINE_PART
            "Spark Plug" -> SPARK_PLUG
            "Wrench" -> WRENCH
            "Shotgun" -> SHOTGUN
            "Crossbow" -> CROSSBOW
            else -> ItemDef(name.lowercase().replace(" ", "_"), name, "Key item", "📦")
        }
    }
}

data class WorldItem(
    val id: String,
    val def: ItemDef,
    var x: Float,
    var y: Float,
    var z: Float,
    var floor: Int,
    var room: String,
    var isCollected: Boolean = false
) {
    fun distanceTo(px: Float, py: Float, pz: Float): Float {
        val dx = x - px
        val dy = y - py
        val dz = z - pz
        return sqrt(dx * dx + dy * dy + dz * dz)
    }
}

data class FrontDoorLockState(
    var padlockUnlocked: Boolean = false,
    var wiresCut: Boolean = false,
    var codeEntered: Boolean = false,
    var planksRemoved: Boolean = false,
    var masterKeyUnlocked: Boolean = false,
    var isDoorOpen: Boolean = false
) {
    val isCompletelyUnlocked: Boolean
        get() = padlockUnlocked && wiresCut && codeEntered && planksRemoved && masterKeyUnlocked
}

data class CarEscapeState(
    var batteryInstalled: Boolean = false,
    var sparkPlugInstalled: Boolean = false,
    var enginePartInstalled: Boolean = false,
    var gasFilled: Boolean = false,
    var garageDoorOpen: Boolean = false,
    var carStarted: Boolean = false
) {
    val isReadyToDrive: Boolean
        get() = batteryInstalled && sparkPlugInstalled && enginePartInstalled && gasFilled && garageDoorOpen
}

enum class GrannyState {
    SLEEPING,
    PATROL,
    INVESTIGATE,
    CHASE,
    SEARCH_LOOK_AROUND,
    STUNNED
}

data class MultiplayerLobby(
    val id: String,
    val name: String,
    val host: String,
    val playersCount: Int,
    val maxPlayers: Int,
    val difficulty: Difficulty,
    val isFunMode: Boolean,
    val isGrannyPlayer: Boolean
)
