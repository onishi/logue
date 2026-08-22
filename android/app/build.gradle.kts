plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "org.wagaya.logue"
    compileSdk = 34

    defaultConfig {
        applicationId = "org.wagaya.logue"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"

        // Web版と同じ本番APIをデフォルトにする。ローカルAPI（wrangler dev）を指したい場合は
        // local.properties に API_BASE_URL=http://10.0.2.2:8787 のように書いて上書きする
        // （エミュレータからホストの localhost には 10.0.2.2 でアクセスする）。
        // Retrofit の Retrofit.Builder#baseUrl は末尾に "/" が必須のため、必ず付けること。
        buildConfigField("String", "API_BASE_URL", "\"https://logue-api.anison.workers.dev/\"")
        // Credential Manager の Sign in with Google に渡す serverClientId。
        // 既存の（ウェブアプリケーション種別の）GOOGLE_CLIENT_ID をそのまま使う。
        buildConfigField("String", "GOOGLE_SERVER_CLIENT_ID", "\"\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.09.02"))

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.4")
    implementation("androidx.activity:activity-compose:1.9.1")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")

    // Credential Manager（Sign in with Google）
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")

    // API通信
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-kotlinx-serialization:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.1")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
