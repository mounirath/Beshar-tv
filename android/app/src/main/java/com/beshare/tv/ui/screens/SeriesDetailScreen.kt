package com.beshare.tv.ui.screens

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import com.beshare.tv.data.model.Episode
import com.beshare.tv.data.model.Series
import com.beshare.tv.ui.player.PlayerActivity
import com.beshare.tv.ui.theme.*
import com.beshare.tv.ui.viewmodel.MainViewModel

/**
 * Écran de détails d'une Série TV : saisons, épisodes et lancement du lecteur ExoPlayer Media3.
 * Compatible navigation télécommande D-pad (Android TV) et écran tactile (Mobile).
 */
@Composable
fun SeriesDetailScreen(
    series: Series,
    viewModel: MainViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var selectedSeason by remember { mutableStateOf(1) }
    var episodes by remember { mutableStateOf<List<Episode>>(emptyList()) }
    var loadingEpisodes by remember { mutableStateOf(false) }

    // Simuler / charger les épisodes de la saison sélectionnée
    LaunchedEffect(series.id, selectedSeason) {
        loadingEpisodes = true
        // Générer ou charger les épisodes
        episodes = (1..10).map { epNum ->
            Episode(
                id = "${series.id}-s${selectedSeason}-e$epNum",
                seriesId = series.id,
                seasonNumber = selectedSeason,
                episodeNumber = epNum,
                title = "Épisode $epNum : ${series.title}",
                streamUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
                durationMins = 48,
                stillUrl = series.posterUrl,
                isActive = true
            )
        }
        loadingEpisodes = false
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
            .padding(16.dp)
    ) {
        // Barre supérieure avec bouton Retour (D-pad focusable)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            var isBackFocused by remember { mutableStateOf(false) }
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .size(44.dp)
                    .background(if (isBackFocused) Indigo600 else Slate900, RoundedCornerShape(12.dp))
                    .border(1.dp, if (isBackFocused) Color.White else Slate800, RoundedCornerShape(12.dp))
                    .onFocusChanged { isBackFocused = it.isFocused }
                    .focusable()
            ) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Retour", tint = Color.White)
            }

            Text(
                text = series.title,
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Entête de la série : Affiche, Titre, Note, Année, Synopsis
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Slate900, RoundedCornerShape(16.dp))
                .border(1.dp, Slate800, RoundedCornerShape(16.dp))
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Affiche
            AsyncImage(
                model = series.posterUrl,
                contentDescription = series.title,
                modifier = Modifier
                    .width(110.dp)
                    .height(160.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Slate950),
                contentScale = ContentScale.Crop
            )

            // Informations
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = series.title,
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )

                if (!series.titleAr.isNullOrEmpty()) {
                    Text(
                        text = series.titleAr,
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    series.rating?.let { rating ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Default.Star, contentDescription = null, tint = Amber400, modifier = Modifier.size(16.dp))
                            Text("$rating / 10", color = Amber400, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    series.releaseYear?.let { year ->
                        Text("$year", color = Color.LightGray, fontSize = 12.sp)
                    }

                    Text("${series.seasonsCount} Saisons", color = Indigo400, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }

                series.plot?.let { plot ->
                    Text(
                        text = plot,
                        color = Color.Gray,
                        fontSize = 12.sp,
                        maxLines = 4,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Sélecteur de Saisons (Carrousel horizontal focusable)
        Text(
            text = "Saisons",
            color = Color.White,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(series.seasonsCount) { index ->
                val seasonNum = index + 1
                var isFocused by remember { mutableStateOf(false) }
                val isSelected = seasonNum == selectedSeason

                Box(
                    modifier = Modifier
                        .background(
                            when {
                                isSelected -> Indigo600
                                isFocused -> Slate800
                                else -> Slate900
                            },
                            RoundedCornerShape(10.dp)
                        )
                        .border(
                            1.dp,
                            if (isFocused) Color.White else Slate800,
                            RoundedCornerShape(10.dp)
                        )
                        .clickable { selectedSeason = seasonNum }
                        .onFocusChanged { isFocused = it.isFocused }
                        .focusable()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "Saison $seasonNum",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Liste des Épisodes de la saison
        Text(
            text = "Épisodes (Saison $selectedSeason)",
            color = Color.White,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth().weight(1f)
        ) {
            items(episodes) { episode ->
                var isItemFocused by remember { mutableStateOf(false) }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            if (isItemFocused) Slate800 else Slate900,
                            RoundedCornerShape(12.dp)
                        )
                        .border(
                            1.dp,
                            if (isItemFocused) Indigo400 else Slate800,
                            RoundedCornerShape(12.dp)
                        )
                        .clickable {
                            // Résoudre le stream et lancer PlayerActivity
                            viewModel.resolveStream(
                                type = "episode",
                                id = episode.id,
                                onResolved = { resolvedUrl ->
                                    val intent = Intent(context, PlayerActivity::class.java).apply {
                                        putExtra(PlayerActivity.EXTRA_STREAM_URL, resolvedUrl)
                                        putExtra(PlayerActivity.EXTRA_MEDIA_TITLE, "${series.title} - S${episode.seasonNumber}E${episode.episodeNumber}")
                                    }
                                    context.startActivity(intent)
                                },
                                onError = {
                                    // Repli sur l'URL directe
                                    val intent = Intent(context, PlayerActivity::class.java).apply {
                                        putExtra(PlayerActivity.EXTRA_STREAM_URL, episode.streamUrl)
                                        putExtra(PlayerActivity.EXTRA_MEDIA_TITLE, "${series.title} - S${episode.seasonNumber}E${episode.episodeNumber}")
                                    }
                                    context.startActivity(intent)
                                }
                            )
                        }
                        .onFocusChanged { isItemFocused = it.isFocused }
                        .focusable()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .background(Indigo600.copy(alpha = 0.2f), RoundedCornerShape(8.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "E${episode.episodeNumber}",
                                color = Indigo400,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }

                        Column {
                            Text(
                                text = episode.title,
                                color = Color.White,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            episode.durationMins?.let { mins ->
                                Text(
                                    text = "$mins min",
                                    color = Color.Gray,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }

                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = "Lire",
                        tint = if (isItemFocused) Color.White else Indigo400,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
    }
}
