package com.beshare.tv.ui.screens

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.beshare.tv.data.model.Channel
import com.beshare.tv.data.model.EpgProgram
import com.beshare.tv.ui.player.PlayerActivity
import com.beshare.tv.ui.theme.*
import com.beshare.tv.ui.viewmodel.MainViewModel

/**
 * Écran Grille EPG (Guide des programmes électronique) pour Android TV et Mobile.
 * Affiche la liste des chaînes et le déroulé temporel des émissions en cours et à venir.
 */
@Composable
fun EpgScreen(
    viewModel: MainViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val channels by viewModel.channels.collectAsState()
    var selectedChannel by remember { mutableStateOf<Channel?>(null) }

    LaunchedEffect(channels) {
        if (selectedChannel == null && channels.isNotEmpty()) {
            selectedChannel = channels.first()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
            .padding(16.dp)
    ) {
        // En-tête
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                var isBackFocused by remember { mutableStateOf(false) }
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .size(40.dp)
                        .background(if (isBackFocused) Indigo600 else Slate900, RoundedCornerShape(10.dp))
                        .border(1.dp, if (isBackFocused) Color.White else Slate800, RoundedCornerShape(10.dp))
                        .onFocusChanged { isBackFocused = it.isFocused }
                        .focusable()
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Retour", tint = Color.White)
                }

                Icon(Icons.Default.Schedule, contentDescription = null, tint = Sky400, modifier = Modifier.size(24.dp))
                Text(
                    text = "Guide TV (EPG)",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Conteneur 2 Colonnes : Chaînes (Gauche) + Programmes EPG (Droite)
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Colonne Gauche : Liste des chaînes
            LazyColumn(
                modifier = Modifier
                    .width(220.dp)
                    .fillMaxHeight()
                    .background(Slate900, RoundedCornerShape(16.dp))
                    .border(1.dp, Slate800, RoundedCornerShape(16.dp))
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                items(channels) { ch ->
                    var isFocused by remember { mutableStateOf(false) }
                    val isSelected = ch.id == selectedChannel?.id

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                when {
                                    isSelected -> Indigo600
                                    isFocused -> Slate800
                                    else -> Color.Transparent
                                },
                                RoundedCornerShape(10.dp)
                            )
                            .border(
                                1.dp,
                                if (isFocused) Color.White else Color.Transparent,
                                RoundedCornerShape(10.dp)
                            )
                            .clickable { selectedChannel = ch }
                            .onFocusChanged { isFocused = it.isFocused }
                            .focusable()
                            .padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (!ch.logoUrl.isNullOrEmpty()) {
                            AsyncImage(
                                model = ch.logoUrl,
                                contentDescription = null,
                                modifier = Modifier
                                    .size(28.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(Slate950),
                                contentScale = ContentScale.Fit
                            )
                        } else {
                            Icon(Icons.Default.Tv, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(20.dp))
                        }

                        Text(
                            text = ch.name,
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            // Colonne Droite : Grille EPG de la chaîne sélectionnée
            val ch = selectedChannel
            if (ch != null) {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .background(Slate900, RoundedCornerShape(16.dp))
                        .border(1.dp, Slate800, RoundedCornerShape(16.dp))
                        .padding(16.dp)
                ) {
                    // En-tête de la chaîne sélectionnée avec bouton Lancer la chaîne
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(ch.name, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            Text(
                                "Diffusion continue • HD 1080p",
                                color = Color.Gray,
                                fontSize = 12.sp
                            )
                        }

                        var isPlayFocused by remember { mutableStateOf(false) }
                        Button(
                            onClick = {
                                viewModel.resolveStream(
                                    type = "channel",
                                    id = ch.id,
                                    onResolved = { resolvedUrl ->
                                        val intent = Intent(context, PlayerActivity::class.java).apply {
                                            putExtra(PlayerActivity.EXTRA_STREAM_URL, resolvedUrl)
                                            putExtra(PlayerActivity.EXTRA_MEDIA_TITLE, ch.name)
                                        }
                                        context.startActivity(intent)
                                    },
                                    onError = {
                                        val intent = Intent(context, PlayerActivity::class.java).apply {
                                            putExtra(PlayerActivity.EXTRA_STREAM_URL, ch.streamUrl)
                                            putExtra(PlayerActivity.EXTRA_MEDIA_TITLE, ch.name)
                                        }
                                        context.startActivity(intent)
                                    }
                                )
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = if (isPlayFocused) Indigo500 else Indigo600),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .onFocusChanged { isPlayFocused = it.isFocused }
                                .focusable()
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Regarder le direct", fontSize = 12.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Programme actuel & Programmes suivants simulés
                    val mockPrograms = remember(ch.id) {
                        listOf(
                            EpgProgram(
                                id = "epg-now",
                                channelId = ch.id,
                                epgChannelId = ch.epgChannelId ?: ch.name,
                                title = "Programme en cours : Journal & Direct",
                                description = "Édition spéciale en direct avec reportages d'actualité et météo.",
                                startTime = "20:00",
                                endTime = "20:45",
                                category = "Information"
                            ),
                            EpgProgram(
                                id = "epg-next-1",
                                channelId = ch.id,
                                epgChannelId = ch.epgChannelId ?: ch.name,
                                title = "Film Prime Time / Grande Soirée",
                                description = "Grande fiction cinéma inédite diffusée en version haute définition.",
                                startTime = "20:45",
                                endTime = "22:30",
                                category = "Cinéma"
                            ),
                            EpgProgram(
                                id = "epg-next-2",
                                channelId = ch.id,
                                epgChannelId = ch.epgChannelId ?: ch.name,
                                title = "Magazine de Fin de Soirée",
                                description = "Débat et rétrospective des temps forts de la semaine.",
                                startTime = "22:30",
                                endTime = "23:45",
                                category = "Magazine"
                            )
                        )
                    }

                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth().weight(1f)
                    ) {
                        items(mockPrograms) { prog ->
                            val isCurrent = prog.id == "epg-now"
                            var isProgFocused by remember { mutableStateOf(false) }

                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isCurrent) Indigo950.copy(alpha = 0.5f) else Slate950
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(
                                        1.dp,
                                        when {
                                            isProgFocused -> Color.White
                                            isCurrent -> Sky400.copy(alpha = 0.5f)
                                            else -> Slate800
                                        },
                                        RoundedCornerShape(12.dp)
                                    )
                                    .onFocusChanged { isProgFocused = it.isFocused }
                                    .focusable()
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                "${prog.startTime} - ${prog.endTime}",
                                                color = Sky400,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                            if (isCurrent) {
                                                Box(
                                                    modifier = Modifier
                                                        .background(Color.Red.copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                                        .border(1.dp, Color.Red.copy(alpha = 0.4f), RoundedCornerShape(4.dp))
                                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                                ) {
                                                    Text("DIRECT", color = Color.Red, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                                }
                                            }
                                        }

                                        prog.category?.let { cat ->
                                            Text(cat, color = Color.Gray, fontSize = 11.sp)
                                        }
                                    }

                                    Text(prog.title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)

                                    prog.description?.let { desc ->
                                        Text(desc, color = Color.Gray, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
