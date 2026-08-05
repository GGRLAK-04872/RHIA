plugins {
    id("com.android.application")
}

android {
    namespace = "app.rhia.localtest"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.rhia.localtest"
        minSdk = 31
        targetSdk = 35
        versionCode = 1
        versionName = "0.1"
    }
}
