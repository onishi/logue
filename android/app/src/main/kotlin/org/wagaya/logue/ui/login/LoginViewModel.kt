package org.wagaya.logue.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.wagaya.logue.auth.AuthRepository

sealed interface LoginUiState {
    data object Idle : LoginUiState
    data object SigningIn : LoginUiState
    data class Error(val message: String) : LoginUiState
}

class LoginViewModel(private val authRepository: AuthRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun signIn(onSignedIn: () -> Unit) {
        _uiState.value = LoginUiState.SigningIn
        viewModelScope.launch {
            authRepository.signIn()
                .onSuccess { onSignedIn() }
                .onFailure { error ->
                    _uiState.value = LoginUiState.Error(error.message ?: "ログインに失敗しました")
                }
        }
    }
}
