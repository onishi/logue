package org.wagaya.logue.ui.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import org.wagaya.logue.auth.AuthRepository

@Composable
fun LoginScreen(authRepository: AuthRepository, onSignedIn: () -> Unit) {
    val viewModel: LoginViewModel = viewModel(
        factory = viewModelFactory {
            initializer { LoginViewModel(authRepository) }
        },
    )
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("logue", style = MaterialTheme.typography.headlineLarge)

        when (val state = uiState) {
            is LoginUiState.Error -> Text(state.message, color = MaterialTheme.colorScheme.error)
            LoginUiState.SigningIn -> CircularProgressIndicator()
            LoginUiState.Idle -> Unit
        }

        Button(
            onClick = { viewModel.signIn(onSignedIn) },
            enabled = uiState !is LoginUiState.SigningIn,
        ) {
            Text("Googleでログイン")
        }
    }
}
