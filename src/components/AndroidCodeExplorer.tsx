/**
 * BeShare TV — Explorateur de Code Source Android & Module Media3 (Étape 5)
 * Chemin: /src/components/AndroidCodeExplorer.tsx
 */
import React, { useState } from 'react';
import { Smartphone, Tv, Copy, Check, Code2, Play, Terminal, Layers, FileCode } from 'lucide-react';

interface AndroidCodeExplorerProps {
  lang: 'fr' | 'ar';
}

export const AndroidCodeExplorer: React.FC<AndroidCodeExplorerProps> = ({ lang }) => {
  const [selectedFile, setSelectedFile] = useState<string>('player');
  const [copied, setCopied] = useState(false);

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const files = [
    { id: 'player', name: 'PlayerActivity.kt', title: 'AndroidX Media3 ExoPlayer', path: '/android/app/src/main/java/com/beshare/tv/ui/player/PlayerActivity.kt' },
    { id: 'home', name: 'HomeScreen.kt', title: 'Jetpack Compose & D-pad Focus', path: '/android/app/src/main/java/com/beshare/tv/ui/screens/HomeScreen.kt' },
    { id: 'viewmodel', name: 'MainViewModel.kt', title: 'Architecture MVVM & Quotas', path: '/android/app/src/main/java/com/beshare/tv/ui/viewmodel/MainViewModel.kt' },
    { id: 'api_service', name: 'BeShareApiService.kt', title: 'Interface Retrofit Coroutines', path: '/android/app/src/main/java/com/beshare/tv/data/api/BeShareApiService.kt' },
    { id: 'models', name: 'Models.kt', title: 'Modèles de données (Live, VOD, EPG)', path: '/android/app/src/main/java/com/beshare/tv/data/model/Models.kt' },
    { id: 'manifest', name: 'AndroidManifest.xml', title: 'Manifest TV Leanback & Mobile', path: '/android/app/src/main/AndroidManifest.xml' },
    { id: 'gradle', name: 'build.gradle.kts', title: 'Configuration Gradle & Dépendances', path: '/android/app/build.gradle.kts' },
  ];

  const currentFileObj = files.find((f) => f.id === selectedFile) || files[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">
              {lang === 'fr' 
                ? 'Étape 5 : Code Source Android (Kotlin, Jetpack Compose & Media3)' 
                : 'المرحلة 5: كود تطبيق أندرويد (كوتلن، جيت باك كومبوز ومشغل ميديا 3)'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'fr'
              ? 'Projet complet disponible dans /android/ prêt à être compilé dans Android Studio ou déployé sur TV.'
              : 'المشروع كامل في مجلد /android/ وجاهز للبناء والتثبيت على شاشات وتلفزيونات أندرويد.'}
          </p>
        </div>

        <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold flex items-center gap-1.5">
          <Tv className="w-3.5 h-3.5" /> Android TV & Mobile
        </span>
      </div>

      {/* File Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => setSelectedFile(file.id)}
            className={`px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 ${
              selectedFile === file.id
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{file.name}</span>
          </button>
        ))}
      </div>

      {/* Code Viewer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="font-mono text-slate-400">
            <span className="text-indigo-400 font-bold">{currentFileObj.title}</span> — {currentFileObj.path}
          </div>

          <button
            onClick={() => copyCode(currentFileObj.path)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? (lang === 'fr' ? 'Copié !' : 'تم النسخ') : (lang === 'fr' ? 'Copier le chemin' : 'نسخ المسار')}
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
          {selectedFile === 'player' && (
            <pre>{`// PlayerActivity.kt — AndroidX Media3 ExoPlayer
class PlayerActivity : ComponentActivity(), Player.Listener {
    private var exoPlayer: ExoPlayer? = null
    
    private fun initializePlayer() {
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(3000, 15000, 1000, 2000).build()

        val player = ExoPlayer.Builder(this)
            .setLoadControl(loadControl)
            .build()
            
        // Support HLS avec lecture adaptive
        if (streamUrl.contains(".m3u8")) {
            val hlsSource = HlsMediaSource.Factory(httpDataSourceFactory)
                .setAllowChunklessPreparation(true)
                .createMediaSource(mediaItem)
            player.setMediaSource(hlsSource)
        }
        player.prepare()
    }
    
    // Support D-pad Télécommande Android TV
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_DPAD_CENTER) {
            exoPlayer?.let { if (it.isPlaying) it.pause() else it.play() }
            return true
        }
        return super.dispatchKeyEvent(event)
    }
}`}</pre>
          )}

          {selectedFile === 'home' && (
            <pre>{`// HomeScreen.kt — Jetpack Compose avec focus D-pad
@Composable
fun ChannelCard(channel: Channel, onClick: () -> Unit) {
    var isFocused by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .onFocusChanged { isFocused = it.isFocused }
            .focusable() // Surbrillance à la télécommande
            .border(
                width = if (isFocused) 3.dp else 1.dp,
                color = if (isFocused) Emerald400 else Slate800,
                shape = RoundedCornerShape(12.dp)
            )
            .clickable(onClick = onClick)
    ) {
        // Logo, nom de chaîne et EPG en cours
    }
}`}</pre>
          )}

          {selectedFile === 'viewmodel' && (
            <pre>{`// MainViewModel.kt — Gestion MVVM et contrôle d'écrans
class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val _uiState = MutableStateFlow<CatalogUiState>(CatalogUiState.Loading)
    val uiState: StateFlow<CatalogUiState> = _uiState.asStateFlow()

    fun bootstrapAndAuthenticate() {
        viewModelScope.launch {
            val handshake = repository.performHandshake()
            if (handshake.isFailure && handshake.error.contains("429")) {
                _uiState.value = CatalogUiState.ScreenLimitReached(2, 2)
                return@launch
            }
            loadCategories("live")
        }
    }
}`}</pre>
          )}

          {selectedFile === 'api_service' && (
            <pre>{`// BeShareApiService.kt — Retrofit Coroutines
interface BeShareApiService {
    @POST("client-api?action=handshake")
    suspend fun deviceHandshake(
        @Header("x-device-id") deviceId: String
    ): Response<HandshakeResponse>

    @GET("client-api?action=channels")
    suspend fun getChannels(
        @Query("category_id") categoryId: String?
    ): Response<ChannelsResponse>

    @GET("client-api?action=resolve_stream")
    suspend fun resolveStream(
        @Query("type") type: String,
        @Query("id") id: String
    ): Response<StreamResolveResponse>
}`}</pre>
          )}

          {selectedFile === 'models' && (
            <pre>{`// Models.kt
data class Category(val id: String, val name: String, val nameAr: String?)
data class Channel(val id: String, val name: String, val logoUrl: String?)
data class Movie(val id: String, val title: String, val posterUrl: String?)
data class Series(val id: String, val title: String, val seasonsCount: Int)`}</pre>
          )}

          {selectedFile === 'manifest' && (
            <pre>{`<!-- AndroidManifest.xml -->
<uses-feature android:name="android.software.leanback" android:required="false" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />

<activity android:name=".MainActivity" android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity>`}</pre>
          )}

          {selectedFile === 'gradle' && (
            <pre>{`// app/build.gradle.kts
dependencies {
    implementation("androidx.tv:tv-foundation:1.0.0-alpha11")
    implementation("androidx.tv:tv-material:1.0.0")
    implementation("androidx.media3:media3-exoplayer:1.5.0")
    implementation("androidx.media3:media3-exoplayer-hls:1.5.0")
    implementation("androidx.media3:media3-ui:1.5.0")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
}`}</pre>
          )}
        </div>
      </div>
    </div>
  );
};
