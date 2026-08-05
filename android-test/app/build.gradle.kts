plugins {
    id("com.android.application")
}

android {
    namespace = "app.rhia.localtest"
    compileSdk = 35

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "app.rhia.localtest"
        minSdk = 31
        targetSdk = 35
        versionCode = 5
        versionName = "0.5"
    }
}
