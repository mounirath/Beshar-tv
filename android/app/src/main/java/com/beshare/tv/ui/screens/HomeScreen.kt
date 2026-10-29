package com.beshare.tv.ui.screens

import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import com.beshare.tv.data.model.Category
import com.beshare.tv.data.model.Channel
import com.beshare.tv.data.model.Movie
import com.beshare.tv.data.model.Series
import com.beshare.tv.ui.player.PlayerActivity
import com.beshare.tv.ui.theme.*
import com.beshare.tv.ui.viewmodel.CatalogUiState
import com.beshare.tv.ui.viewmodel.MainViewModel

/**
 * Écran d'accueil principal orchestrant la navigation D-pad :
 * - Catalogue Direct (Live TV), Films (VOD), Séries TV
 * - Guide TV (EPG)
 * - Recherche Globale
 * - Paramètres & Diagnostics
 */
@Composable
fun HomeScreen(viewModel: MainViewModel) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val activeTab by viewModel.activeTab.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val selectedCatId by viewModel.selectedCategoryId.collectAsState()
    val channels by viewModel.channels.collectAsState()
    val movies by viewModel.movies.collectAsState()
    val series by viewModel.series.collectAsState()

    // Navigation d'écran interne : "catalog", "search", "epg", "settings", "series_detail"
    var currentScreen by remember { mutableStateOf("catalog") }
    var selectedSeriesForDetail by remember { mutableStateOf<Series?>(null) }

    when (currentScreen) {
        "search" -> {
            SearchScreen(
                viewModel = viewModel,
                onBack = { currentScreen = "catalog" },
                onSelectSeries = {
                    selectedSeriesForDetail = it
                    currentScreen = "series_detail"
                }
            )
            return
        }
        "epg" -> {
            EpgScreen(
                viewModel = viewModel,
                onBack = { currentScreen = "catalog" }
            )
            return
        }
        "settings" -> {
            SettingsScreen(
                viewModel = viewModel,
                onBack = { currentScreen = "catalog" }
            )
            return
        }
        "series_detail" -> {
            selectedSeriesForDetail?.let { ser ->
                SeriesDetailScreen(
                    series = ser,
                    viewModel = viewModel,
                    onBack = { currentScreen = "catalog" }
                )
                return
            }
        }
    }

    // Écran Standard du Catalogue
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
            .padding(16.dp)
    ) {
        // En-tête / Barre de Navigation Supérieure (Compatible Télécommande D-pad)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(
                    imageVector = Icons.Default.Tv,
                    contentDescription = null,
                    tint = Indigo400,
                    modifier = Modifier.size(28.dp)
                )
                Text(
                    text = "BeShare TV",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Onglets Centraux (Live, VOD, Séries)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                NavTabItem(
                    title = "Live TV",
                    icon = Icons.Default.LiveTv,
                    isSelected = activeTab == "live",
                    onClick = { viewModel.switchTab("live") }
                )
                NavTabItem(
                    title = "Films VOD",
                    icon = Icons.Default.Movie,
                    isSelected = activeTab == "movies",
                    onClick = { viewModel.switchTab("movies") }
                )
                NavTabItem(
                    title = "Séries",
                    icon = Icons.Default.VideoLibrary,
                    isSelected = activeTab == "series",
                    onClick = { viewModel.switchTab("series") }
                )
            }

            // Boutons d'Action (Recherche, Guide EPG, Paramètres)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ActionIconButton(
                    icon = Icons.Default.Search,
                    contentDescription = "Recherche",
                    onClick = { currentScreen = "search" }
                )
                ActionIconButton(
                    icon = Icons.Default.Schedule,
                    contentDescription = "Guide TV EPG",
                    onClick = { currentScreen = "epg" }
                )
                ActionIconButton(
                    icon = Icons.Default.Settings,
                    contentDescription = "Paramètres",
                    onClick = { currentScreen = "settings" }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Gestion des états UI (Erreur, Limite d'écrans, Chargement, Succès)
        when (val state = uiState) {
            is CatalogUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Indigo400)
                }
            }
            is CatalogUiState.ScreenLimitReached -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate900),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = Color.Red, modifier = Modifier.size(48.dp))
                            Text("Limite d'écrans simultanés atteinte", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(
                                "Votre compte est déjà actif sur ${state.activeDevices}/${state.maxDevices} appareils.",
                                color = Color.Gray,
                                fontSize = 14.sp
                            )
                            Button(onClick = { viewModel.bootstrapAndAuthenticate() }, colors = ButtonDefaults.buttonColors(containerColor = Indigo600)) {
                                Text("Réessayer")
                            }
                        }
                    }
                }
            }
            is CatalogUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(state.message, color = Color.Red, fontSize = 14.sp)
                        Button(onClick = { viewModel.bootstrapAndAuthenticate() }, colors = ButtonDefaults.buttonColors(containerColor = Indigo600)) {
                            Text("Réessayer")
                        }
                    }
                }
            }
            is CatalogUiState.Success -> {
                // Carrousel horizontal des catégories
                if (categories.isNotEmpty()) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(categories) { category ->
                            CategoryChip(
                                category = category,
                                isSelected = category.id == selectedCatId,
                                onClick = { viewModel.selectCategory(category.id) }
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                // Grille de contenu adaptée au mode (Chaînes / Films / Séries)
                when (activeTab) {
                    "live" -> {
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = 130.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(channels) { channel ->
                                ChannelCard(
                                    channel = channel,
                                    onClick = {
                                        viewModel.resolveStream(
                                            type = "channel",
                                            id = channel.id,
                                            onResolved = { streamUrl ->
                                                val intent = Intent(context, PlayerActivity::class.java).apply {
                                                    putExtra(PlayerActivity.EXTRA_STREAM_URL, streamUrl)
                                                    putExtra(PlayerActivity.EXTRA_MEDIA_TITLE, channel.name)
                                                }
                                                context.startActivity(intent)
                                            },
                                            onError = { error ->
                                                val intent = Intent(context, PlayerActivity::class.java).apply {
                                                    putExtra(PlayerActivity.EXTRA_STREAM_URL, channel.streamUrl)
                                                    putExtra(PlayerActivity.EXTRA_MEDIA_TITLE, channel.name)
                                                }
                                                context.startActivity(intent)
                                            }
                                        )
                                    }
                                )
                            }
                        }
                    }
                    "movies" -> {
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = 140.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(movies) { movie ->
                                MovieCard(
                                    movie = movie,
                                    onClick = {
                                        viewModel.resolveStream(
                                            type = "movie",
                                            id = movie.id,
                                            onResolved = { streamUrl ->
                                                val intent = Intent(context, PlayerActivity::class.java).apply {
                                                    putExtra(PlayerActivity.EXTRA_STREAM_URL, streamUrl)
                                                    putExtra(PlayerActivity.EXTRA_MEDIA_TITLE, movie.title)
                                                }
                                                context.startActivity(intent)
                                            },
                                            onError = { error ->
                                                val intent = Intent(context, PlayerActivity::class.java).apply {
                                                    putExtra(PlayerActivity.EXTRA_STREAM_URL, movie.streamUrl)
                                                    putExtra(PlayerActivity.EXTRA_MEDIA_TITLE, movie.title)
                                                }
                                                context.startActivity(intent)
                                            }
                                        )
                                    }
                                )
                            }
                        }
                    }
                    "series" -> {
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = 140.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(series) { serie ->
                                SeriesCard(
                                    series = serie,
                                    onClick = {
                                        selectedSeriesForDetail = serie
                                        currentScreen = "series_detail"
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun NavTabItem(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }

    Surface(
        color = if (isSelected) Indigo600 else if (isFocused) Slate800 else Slate900,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .onFocusChanged { isFocused = it.isFocused }
            .focusable()
            .clickable(onClick = onClick)
            .border(
                width = if (isFocused) 2.dp else 1.dp,
                color = if (isFocused) Emerald400 else Slate800,
                shape = RoundedCornerShape(12.dp)
            )
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
            Text(text = title, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun ActionIconButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    contentDescription: String,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }

    IconButton(
        onClick = onClick,
        modifier = Modifier
            .size(38.dp)
            .background(if (isFocused) Indigo600 else Slate900, RoundedCornerShape(10.dp))
            .border(1.dp, if (isFocused) Color.White else Slate800, RoundedCornerShape(10.dp))
            .onFocusChanged { isFocused = it.isFocused }
            .focusable()
    ) {
        Icon(icon, contentDescription = contentDescription, tint = Color.White, modifier = Modifier.size(18.dp))
    }
}

@Composable
fun CategoryChip(
    category: Category,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }

    Surface(
        color = if (isSelected) Indigo600.copy(alpha = 0.3f) else if (isFocused) Slate800 else Slate900,
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier
            .onFocusChanged { isFocused = it.isFocused }
            .focusable()
            .clickable(onClick = onClick)
            .border(
                width = 1.dp,
                color = if (isSelected) Indigo400 else if (isFocused) Color.White else Slate800,
                shape = RoundedCornerShape(10.dp)
            )
    ) {
        Text(
            text = category.name,
            color = if (isSelected) Indigo400 else Color.White,
            fontSize = 12.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
        )
    }
}

@Composable
fun ChannelCard(
    channel: Channel,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }

    Card(
        colors = CardDefaults.cardColors(containerColor = if (isFocused) Slate800 else Slate900),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(115.dp)
            .onFocusChanged { isFocused = it.isFocused }
            .focusable()
            .clickable(onClick = onClick)
            .border(
                width = if (isFocused) 2.dp else 1.dp,
                color = if (isFocused) Indigo400 else Slate800,
                shape = RoundedCornerShape(12.dp)
            )
    ) {
        Column(
            modifier = Modifier
                .padding(10.dp)
                .fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            if (!channel.logoUrl.isNullOrEmpty()) {
                AsyncImage(
                    model = channel.logoUrl,
                    contentDescription = channel.name,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Slate950)
                )
            } else {
                Icon(
                    imageVector = Icons.Default.Tv,
                    contentDescription = null,
                    tint = Indigo400,
                    modifier = Modifier.size(40.dp)
                )
            }

            Text(
                text = channel.name,
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun MovieCard(
    movie: Movie,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }

    Card(
        colors = CardDefaults.cardColors(containerColor = Slate900),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(0.68f)
            .onFocusChanged { isFocused = it.isFocused }
            .focusable()
            .clickable(onClick = onClick)
            .border(
                width = if (isFocused) 3.dp else 1.dp,
                color = if (isFocused) Pink500 else Color.Transparent,
                shape = RoundedCornerShape(12.dp)
            )
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            AsyncImage(
                model = movie.posterUrl,
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .background(Color.Black.copy(alpha = 0.8f))
                    .padding(6.dp)
            ) {
                Text(
                    text = movie.title,
                    color = Color.White,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun SeriesCard(
    series: Series,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }

    Card(
        colors = CardDefaults.cardColors(containerColor = Slate900),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(0.68f)
            .onFocusChanged { isFocused = it.isFocused }
            .focusable()
            .clickable(onClick = onClick)
            .border(
                width = if (isFocused) 3.dp else 1.dp,
                color = if (isFocused) Purple500 else Color.Transparent,
                shape = RoundedCornerShape(12.dp)
            )
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            AsyncImage(
                model = series.posterUrl,
                contentDescription = series.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .background(Color.Black.copy(alpha = 0.8f))
                    .padding(6.dp)
            ) {
                Column {
                    Text(
                        text = series.title,
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${series.seasonsCount} Saisons",
                        color = Purple400,
                        fontSize = 10.sp
                    )
                }
            }
        }
    }
}
