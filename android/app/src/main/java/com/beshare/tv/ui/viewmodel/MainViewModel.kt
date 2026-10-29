package com.beshare.tv.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.beshare.tv.data.model.*
import com.beshare.tv.data.repository.CatalogRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class CatalogUiState {
    object Loading : CatalogUiState()
    data class Success(val message: String? = null) : CatalogUiState()
    data class Error(val message: String) : CatalogUiState()
    data class ScreenLimitReached(val maxDevices: Int, val activeDevices: Int) : CatalogUiState()
}

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = CatalogRepository(application)

    private val _uiState = MutableStateFlow<CatalogUiState>(CatalogUiState.Loading)
    val uiState: StateFlow<CatalogUiState> = _uiState.asStateFlow()

    private val _activeTab = MutableStateFlow("live") // "live", "movies", "series", "favorites"
    val activeTab: StateFlow<String> = _activeTab.asStateFlow()

    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories: StateFlow<List<Category>> = _categories.asStateFlow()

    private val _selectedCategoryId = MutableStateFlow<String?>(null)
    val selectedCategoryId: StateFlow<String?> = _selectedCategoryId.asStateFlow()

    private val _channels = MutableStateFlow<List<Channel>>(emptyList())
    val channels: StateFlow<List<Channel>> = _channels.asStateFlow()

    private val _movies = MutableStateFlow<List<Movie>>(emptyList())
    val movies: StateFlow<List<Movie>> = _movies.asStateFlow()

    private val _series = MutableStateFlow<List<Series>>(emptyList())
    val series: StateFlow<List<Series>> = _series.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _currentEpg = MutableStateFlow<Map<String, EpgProgram>>(emptyMap())
    val currentEpg: StateFlow<Map<String, EpgProgram>> = _currentEpg.asStateFlow()

    init {
        bootstrapAndAuthenticate()
    }

    fun bootstrapAndAuthenticate() {
        viewModelScope.launch {
            _uiState.value = CatalogUiState.Loading

            // 1. Handshake matériel avec vérification de limite d'écrans
            val handshakeRes = repository.performHandshake()
            if (handshakeRes.isFailure) {
                val err = handshakeRes.exceptionOrNull()?.message ?: "Erreur d'authentification terminal"
                if (err.contains("Limite d'écrans") || err.contains("429")) {
                    _uiState.value = CatalogUiState.ScreenLimitReached(2, 2)
                    return@launch
                }
                _uiState.value = CatalogUiState.Error(err)
                return@launch
            }

            // 2. Chargement initial des catégories Live TV
            loadCategories(_activeTab.value)
        }
    }

    fun switchTab(tab: String) {
        _activeTab.value = tab
        _selectedCategoryId.value = null
        loadCategories(tab)
    }

    fun selectCategory(categoryId: String?) {
        _selectedCategoryId.value = categoryId
        when (_activeTab.value) {
            "live" -> loadChannels(categoryId)
            "movies" -> loadMovies(categoryId)
            "series" -> loadSeries(categoryId)
        }
    }

    private fun loadCategories(type: String) {
        viewModelScope.launch {
            val res = repository.getCategories(if (type == "favorites") "live" else type)
            if (res.isSuccess) {
                val cats = res.getOrNull() ?: emptyList()
                _categories.value = cats
                val firstCat = cats.firstOrNull()?.id
                _selectedCategoryId.value = firstCat

                when (type) {
                    "live", "favorites" -> loadChannels(firstCat)
                    "movies" -> loadMovies(firstCat)
                    "series" -> loadSeries(firstCat)
                }
                _uiState.value = CatalogUiState.Success()
            } else {
                _uiState.value = CatalogUiState.Error(res.exceptionOrNull()?.message ?: "Erreur de chargement")
            }
        }
    }

    fun loadChannels(categoryId: String?) {
        viewModelScope.launch {
            val res = repository.getChannels(categoryId)
            if (res.isSuccess) {
                _channels.value = res.getOrNull()?.channels ?: emptyList()
            }
        }
    }

    fun loadMovies(categoryId: String?) {
        viewModelScope.launch {
            val res = repository.getMovies(categoryId, _searchQuery.value)
            if (res.isSuccess) {
                _movies.value = res.getOrNull() ?: emptyList()
            }
        }
    }

    fun loadSeries(categoryId: String?) {
        viewModelScope.launch {
            val res = repository.getSeries(categoryId, _searchQuery.value)
            if (res.isSuccess) {
                _series.value = res.getOrNull() ?: emptyList()
            }
        }
    }

    fun onSearchChange(query: String) {
        _searchQuery.value = query
        when (_activeTab.value) {
            "movies" -> loadMovies(_selectedCategoryId.value)
            "series" -> loadSeries(_selectedCategoryId.value)
        }
    }

    fun resolveStream(type: String, id: String, onResolved: (String) -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            val res = repository.resolveStreamUrl(type, id)
            if (res.isSuccess && res.getOrNull() != null) {
                onResolved(res.getOrNull()!!.streamUrl)
            } else {
                onError(res.exceptionOrNull()?.message ?: "Flux inaccessible")
            }
        }
    }
}
