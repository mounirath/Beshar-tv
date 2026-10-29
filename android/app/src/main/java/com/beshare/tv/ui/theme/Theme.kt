package com.beshare.tv.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Palette Slate
val Slate950 = Color(0xFF020617)
val Slate900 = Color(0xFF0F172A)
val Slate800 = Color(0xFF1E293B)
val Slate700 = Color(0xFF334155)
val Slate600 = Color(0xFF475569)
val Slate500 = Color(0xFF64748B)
val Slate400 = Color(0xFF94A3B8)

// Palette Indigo
val Indigo950 = Color(0xFF1E1B4B)
val Indigo600 = Color(0xFF4F46E5)
val Indigo500 = Color(0xFF6366F1)
val Indigo400 = Color(0xFF818CF8)

// Palette Emerald & Teal
val Emerald500 = Color(0xFF10B981)
val Emerald400 = Color(0xFF34D399)

// Palette Sky / Cyan
val Sky500 = Color(0xFF0EA5E9)
val Sky400 = Color(0xFF38BDF8)

// Palette Pink / Rose
val Pink500 = Color(0xFFEC4899)
val Pink400 = Color(0xFFF472B6)

// Palette Purple / Violet
val Purple500 = Color(0xFFA855F7)
val Purple400 = Color(0xFFC084FC)

// Palette Amber / Gold
val Amber500 = Color(0xFFF59E0B)
val Amber400 = Color(0xFFFBBF24)

private val DarkColorScheme = darkColorScheme(
    primary = Indigo600,
    secondary = Emerald400,
    background = Slate950,
    surface = Slate900,
    onPrimary = Color.White,
    onBackground = Color.White,
    onSurface = Color.White
)

@Composable
fun BeShareTVTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
