package com.beshare.tv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import com.beshare.tv.ui.screens.HomeScreen
import com.beshare.tv.ui.theme.BeShareTVTheme
import com.beshare.tv.ui.viewmodel.MainViewModel

/**
 * Activité Principale BeShare TV
 * Point d'entrée pour les téléviseurs Android TV et terminaux mobiles Android.
 */
class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            BeShareTVTheme {
                HomeScreen(viewModel = viewModel)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Actualisation automatique du catalogue lors de la réouverture
        viewModel.bootstrapAndAuthenticate()
    }
}
