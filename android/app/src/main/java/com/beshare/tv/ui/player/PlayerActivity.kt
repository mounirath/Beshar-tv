package com.beshare.tv.ui.player

import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.ui.PlayerView

/**
 * Activité de lecture vidéo plein écran propulsée par AndroidX Media3 ExoPlayer.
 * Conçue pour une expérience fluide sur Android TV (télécommande D-pad) et Mobile.
 */
class PlayerActivity : ComponentActivity(), Player.Listener {

    private var exoPlayer: ExoPlayer? = null
    private var playerView: PlayerView? = null
    private var streamUrl: String? = null
    private var mediaTitle: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Garder l'écran allumé pendant la diffusion
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Masquer la barre système pour un mode plein écran immersif
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
        )

        streamUrl = intent.getStringExtra(EXTRA_STREAM_URL)
        mediaTitle = intent.getStringExtra(EXTRA_MEDIA_TITLE)

        if (streamUrl.isNullOrEmpty()) {
            Toast.makeText(this, "URL de flux introuvable", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        playerView = PlayerView(this).apply {
            useController = true
            controllerShowTimeoutMs = 3500
            setShowBuffering(PlayerView.SHOW_BUFFERING_ALWAYS)
        }

        setContentView(playerView)
        initializePlayer()
    }

    private fun initializePlayer() {
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                3000,   // Min buffer avant lecture
                15000,  // Max buffer
                1000,   // Buffer pour démarrer la lecture
                2000    // Buffer après rebuffering
            )
            .build()

        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setUserAgent("BeShareTV/1.0 (Android TV; ExoPlayer)")
            .setConnectTimeoutMs(15000)
            .setReadTimeoutMs(20000)
            .setAllowCrossProtocolRedirects(true)

        val player = ExoPlayer.Builder(this)
            .setLoadControl(loadControl)
            .setSeekBackIncrementMs(10000)
            .setSeekForwardIncrementMs(10000)
            .build()

        exoPlayer = player
        playerView?.player = player

        val mediaItem = MediaItem.Builder()
            .setUri(streamUrl)
            .setMediaId(mediaTitle ?: "Stream")
            .build()

        if (streamUrl!!.contains(".m3u8") || streamUrl!!.contains("/live/")) {
            val hlsMediaSource = HlsMediaSource.Factory(httpDataSourceFactory)
                .setAllowChunklessPreparation(true)
                .createMediaSource(mediaItem)
            player.setMediaSource(hlsMediaSource)
        } else {
            player.setMediaItem(mediaItem)
        }

        player.addListener(this)
        player.videoScalingMode = C.VIDEO_SCALING_MODE_SCALE_TO_FIT_WITH_CROPPING
        player.playWhenReady = true
        player.prepare()
    }

    override fun onPlayerError(error: PlaybackException) {
        val errorMsg = when (error.errorCode) {
            PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED,
            PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT ->
                "Flux inaccessible ou connexion instable. Nouvelle tentative..."
            PlaybackException.ERROR_CODE_DECODER_INIT_FAILED ->
                "Décodeur matériel non pris en charge sur ce terminal."
            else -> "Erreur de lecture : ${error.localizedMessage}"
        }
        Toast.makeText(this, errorMsg, Toast.LENGTH_LONG).show()

        // Tentative de reprise automatique après 3 secondes
        playerView?.postDelayed({
            exoPlayer?.prepare()
        }, 3000)
    }

    // Gestion des touches de la télécommande Android TV (D-pad)
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                    exoPlayer?.let {
                        if (it.isPlaying) it.pause() else it.play()
                        return true
                    }
                }
                KeyEvent.KEYCODE_DPAD_LEFT -> {
                    exoPlayer?.seekBack()
                    return true
                }
                KeyEvent.KEYCODE_DPAD_RIGHT -> {
                    exoPlayer?.seekForward()
                    return true
                }
                KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                    exoPlayer?.let {
                        if (it.isPlaying) it.pause() else it.play()
                        return true
                    }
                }
            }
        }
        return super.dispatchKeyEvent(event)
    }

    override fun onStop() {
        super.onStop()
        exoPlayer?.pause()
    }

    override fun onDestroy() {
        super.onDestroy()
        exoPlayer?.release()
        exoPlayer = null
    }

    companion object {
        const val EXTRA_STREAM_URL = "extra_stream_url"
        const val EXTRA_MEDIA_TITLE = "extra_media_title"
    }
}
