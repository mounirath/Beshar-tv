package com.beshare.tv.ui.screens

import android.os.Build
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.beshare.tv.data.api.ApiClient
import com.beshare.tv.ui.theme.*
import com.beshare.tv.ui.viewmodel.MainViewModel

/**
 * Écran des Paramètres et Diagnostics Système de l'application Android TV / Mobile.
 */
@Composable
fun SettingsScreen(
    viewModel: MainViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val deviceId: String = remember(context) { ApiClient.getOrCreateDeviceId(context) }
    val isDemoMode by viewModel.isDemoMode.collectAsState()
    var showServerDialog by remember { mutableStateOf(false) }
    var bufferMode by remember { mutableStateOf("standard") }

    if (showServerDialog) {
        ServerConfigDialog(
            currentUrl = ApiClient.getBaseUrl(context),
            currentAnonKey = ApiClient.getAnonKey(context),
            onDismiss = { showServerDialog = false },
            onSave = { newUrl, newKey ->
                viewModel.saveServerConfig(newUrl, newKey)
                showServerDialog = false
                Toast.makeText(context, "Configuration serveur mise à jour !", Toast.LENGTH_SHORT).show()
            }
        )
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

            Icon(Icons.Default.Settings, contentDescription = null, tint = Indigo400, modifier = Modifier.size(24.dp))
            Text(
                text = "Paramètres & Diagnostics",
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            // Section 1 : Empreinte Matérielle & Sécurité Terminal
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate900),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().border(1.dp, Slate800, RoundedCornerShape(16.dp))
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.Shield, contentDescription = null, tint = Emerald400, modifier = Modifier.size(20.dp))
                            Text("Identité du Terminal & Quota Multi-Écrans", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        }

                        SettingRow(label = "Identifiant UUID (x-device-id)", value = deviceId)
                        SettingRow(label = "Modèle Matériel", value = "${Build.MANUFACTURER} ${Build.MODEL} (Android ${Build.VERSION.RELEASE})")
                        SettingRow(label = "Type de Terminal", value = "Android TV / Box / Mobile")
                        SettingRow(label = "Version Application", value = "v1.0.0 (Production)")
                    }
                }
            }

            // Section 2 : Configuration Backend & API
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate900),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().border(1.dp, Slate800, RoundedCornerShape(16.dp))
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.Cloud, contentDescription = null, tint = Sky400, modifier = Modifier.size(20.dp))
                            Text("Passerelle Backend Supabase", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        }

                        SettingRow(label = "URL Active", value = ApiClient.getBaseUrl(context))
                        SettingRow(
                            label = "Mode Catalogue",
                            value = if (isDemoMode) "Mode Démonstration (Flux de test)" else "Production Supabase"
                        )
                        SettingRow(
                            label = "Statut URL",
                            value = if (ApiClient.isPlaceholderUrl(context)) "Non configuré (Valeur modèle)" else "Configuré"
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(
                                onClick = { showServerDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = Indigo600),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Changer l'URL", fontSize = 12.sp)
                            }

                            OutlinedButton(
                                onClick = {
                                    if (isDemoMode) {
                                        viewModel.disableDemoMode()
                                        Toast.makeText(context, "Mode Démo désactivé", Toast.LENGTH_SHORT).show()
                                    } else {
                                        viewModel.enableDemoMode()
                                        Toast.makeText(context, "Mode Démo activé", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(
                                    imageVector = if (isDemoMode) Icons.Default.Close else Icons.Default.PlayArrow,
                                    contentDescription = null,
                                    tint = if (isDemoMode) Amber400 else Emerald400,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (isDemoMode) "Quitter Démo" else "Mode Démo",
                                    color = Color.White,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }
            }

            // Section 3 : Optimisation Lecteur Media3 ExoPlayer
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate900),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().border(1.dp, Slate800, RoundedCornerShape(16.dp))
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.Speed, contentDescription = null, tint = Amber400, modifier = Modifier.size(20.dp))
                            Text("Mode de Décodage & Mémoire Tampon (Buffer)", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        }

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            BufferModeButton(
                                title = "Standard (Recommandé)",
                                desc = "3s min / 15s max",
                                isSelected = bufferMode == "standard",
                                onClick = { bufferMode = "standard" },
                                modifier = Modifier.weight(1f)
                            )
                            BufferModeButton(
                                title = "Faible Latence (Sport)",
                                desc = "1s min / 5s max",
                                isSelected = bufferMode == "low_latency",
                                onClick = { bufferMode = "low_latency" },
                                modifier = Modifier.weight(1f)
                            )
                            BufferModeButton(
                                title = "Connexion Instable",
                                desc = "8s min / 30s max",
                                isSelected = bufferMode == "high_buffer",
                                onClick = { bufferMode = "high_buffer" },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // Section 4 : Action de Réinitialisation / Resynchronisation
            item {
                var isSyncFocused by remember { mutableStateOf(false) }

                Button(
                    onClick = {
                        viewModel.bootstrapAndAuthenticate()
                        Toast.makeText(context, "Catalogue et catégories resynchronisés !", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = if (isSyncFocused) Indigo500 else Indigo600),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .onFocusChanged { isSyncFocused = it.isFocused }
                        .focusable()
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Forcer la synchronisation du catalogue", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun SettingRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = Color.Gray, fontSize = 12.sp)
        Text(value, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun BufferModeButton(
    title: String,
    desc: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isFocused by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .background(
                when {
                    isSelected -> Indigo600
                    isFocused -> Slate800
                    else -> Slate950
                },
                RoundedCornerShape(10.dp)
            )
            .border(
                1.dp,
                if (isFocused) Color.White else if (isSelected) Indigo500 else Slate800,
                RoundedCornerShape(10.dp)
            )
            .clickable(onClick = onClick)
            .onFocusChanged { isFocused = it.isFocused }
            .focusable()
            .padding(10.dp)
    ) {
        Column {
            Text(title, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Text(desc, color = if (isSelected) Color.White.copy(alpha = 0.8f) else Color.Gray, fontSize = 10.sp)
        }
    }
}
