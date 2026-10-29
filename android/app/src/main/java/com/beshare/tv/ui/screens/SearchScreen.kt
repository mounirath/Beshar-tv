package com.beshare.tv.ui.screens

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
import com.beshare.tv.data.model.Movie
import com.beshare.tv.data.model.Series
import com.beshare.tv.ui.player.PlayerActivity
import com.beshare.tv.ui.theme.*
import com.beshare.tv.ui.viewmodel.MainViewModel

/**
 * Écran de Recherche Globale (Chaînes TV, Films VOD et Séries).
 */
@Composable
fun SearchScreen(
    viewModel: MainViewModel,
    onBack: () -> Unit,
    onSelectSeries: (Series) -> Unit
) {
    val context = LocalContext.current
    var query by remember { mutableStateOf("") }
    val channels by viewModel.channels.collectAsState()
    val movies by viewModel.movies.collectAsState()
    val series by viewModel.series.collectAsState()

    val filteredChannels = remember(query, channels) {
        if (query.isBlank()) emptyList()
        else channels.filter { it.name.contains(query, ignoreCase = true) }
    }

    val filteredMovies = remember(query, movies) {
        if (query.isBlank()) emptyList()
        else movies.filter {
            it.title.contains(query, ignoreCase = true) ||
            (it.titleAr?.contains(query) == true)
        }
    }

    val filteredSeries = remember(query, series) {
        if (query.isBlank()) emptyList()
        else series.filter {
            it.title.contains(query, ignoreCase = true) ||
            (it.titleAr?.contains(query) == true)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
            .padding(16.dp)
    ) {
        // En-tête avec champ de saisie
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
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

            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { Text("Rechercher une chaîne, un film ou une série...", color = Color.Gray, fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Indigo400) },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Effacer", tint = Color.Gray)
                        }
                    }
                },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Indigo400,
                    unfocusedBorderColor = Slate800,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedContainerColor = Slate900,
                    unfocusedContainerColor = Slate900
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (query.isBlank()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Search, contentDescription = null, tint = Slate800, modifier = Modifier.size(56.dp))
                    Text("Saisissez un mot-clé pour chercher dans le catalogue", color = Color.Gray, fontSize = 13.sp)
                }
            }
        } else {
            val totalResults = filteredChannels.size + filteredMovies.size + filteredSeries.size
            Text(
                text = "$totalResults résultat(s) trouvé(s)",
                color = Color.Gray,
                fontSize = 12.sp,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 140.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                // Chaînes trouvées
                items(filteredChannels) { ch ->
                    var isFocused by remember { mutableStateOf(false) }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = if (isFocused) Slate800 else Slate900),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(130.dp)
                            .border(1.dp, if (isFocused) Indigo400 else Slate800, RoundedCornerShape(12.dp))
                            .clickable {
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
                            }
                            .onFocusChanged { isFocused = it.isFocused }
                            .focusable()
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp).fillMaxSize(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            if (!ch.logoUrl.isNullOrEmpty()) {
                                AsyncImage(
                                    model = ch.logoUrl,
                                    contentDescription = null,
                                    modifier = Modifier.size(44.dp).clip(RoundedCornerShape(8.dp)),
                                    contentScale = ContentScale.Fit
                                )
                            } else {
                                Icon(Icons.Default.Tv, contentDescription = null, tint = Indigo400, modifier = Modifier.size(36.dp))
                            }

                            Text(ch.name, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text("Chaîne TV", color = Sky400, fontSize = 9.sp)
                        }
                    }
                }

                // Films trouvés
                items(filteredMovies) { movie ->
                    var isFocused by remember { mutableStateOf(false) }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = if (isFocused) Slate800 else Slate900),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .border(1.dp, if (isFocused) Pink500 else Slate800, RoundedCornerShape(12.dp))
                            .clickable {
                                viewModel.resolveStream(
                                    type = "movie",
                                    id = movie.id,
                                    onResolved = { resolvedUrl ->
                                        val intent = Intent(context, PlayerActivity::class.java).apply {
                                            putExtra(PlayerActivity.EXTRA_STREAM_URL, resolvedUrl)
                                            putExtra(PlayerActivity.EXTRA_MEDIA_TITLE, movie.title)
                                        }
                                        context.startActivity(intent)
                                    },
                                    onError = {
                                        val intent = Intent(context, PlayerActivity::class.java).apply {
                                            putExtra(PlayerActivity.EXTRA_STREAM_URL, movie.streamUrl)
                                            putExtra(PlayerActivity.EXTRA_MEDIA_TITLE, movie.title)
                                        }
                                        context.startActivity(intent)
                                    }
                                )
                            }
                            .onFocusChanged { isFocused = it.isFocused }
                            .focusable()
                    ) {
                        Column(modifier = Modifier.fillMaxSize()) {
                            AsyncImage(
                                model = movie.posterUrl,
                                contentDescription = null,
                                modifier = Modifier.fillMaxWidth().height(125.dp),
                                contentScale = ContentScale.Crop
                            )
                            Column(modifier = Modifier.padding(6.dp)) {
                                Text(movie.title, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("Film VOD", color = Pink400, fontSize = 9.sp)
                            }
                        }
                    }
                }

                // Séries trouvées
                items(filteredSeries) { serie ->
                    var isFocused by remember { mutableStateOf(false) }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = if (isFocused) Slate800 else Slate900),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .border(1.dp, if (isFocused) Purple500 else Slate800, RoundedCornerShape(12.dp))
                            .clickable { onSelectSeries(serie) }
                            .onFocusChanged { isFocused = it.isFocused }
                            .focusable()
                    ) {
                        Column(modifier = Modifier.fillMaxSize()) {
                            AsyncImage(
                                model = serie.posterUrl,
                                contentDescription = null,
                                modifier = Modifier.fillMaxWidth().height(125.dp),
                                contentScale = ContentScale.Crop
                            )
                            Column(modifier = Modifier.padding(6.dp)) {
                                Text(serie.title, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("${serie.seasonsCount} Saisons", color = Purple400, fontSize = 9.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
