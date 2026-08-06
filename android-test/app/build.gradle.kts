import java.net.URL

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

    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        applicationId = "app.rhia.localtest"
        minSdk = 31
        targetSdk = 35
        versionCode = 22
        versionName = "0.22"
    }
}

dependencies {
    implementation("net.java.dev.jna:jna:5.18.1@aar")
    implementation("com.alphacephei:vosk-android:0.3.75@aar")
}

val prepareGermanVoskModel by tasks.registering {
    val modelRoot = layout.projectDirectory.dir("src/main/assets/model-de")
    outputs.dir(modelRoot)

    doLast {
        val marker = modelRoot.file("am/final.mdl").asFile
        if (marker.isFile) return@doLast

        val archive = layout.buildDirectory.file("vosk-model-small-de-0.15.zip").get().asFile
        archive.parentFile.mkdirs()
        if (!archive.isFile) {
            URL("https://alphacephei.com/vosk/models/vosk-model-small-de-0.15.zip")
                .openStream().use { input ->
                    archive.outputStream().use { output -> input.copyTo(output) }
                }
        }

        delete(modelRoot)
        copy {
            from(zipTree(archive))
            into(modelRoot)
            eachFile {
                path = path.substringAfter("/", path)
            }
            includeEmptyDirs = false
        }
        check(marker.isFile) { "Das deutsche Vosk-Modell wurde nicht korrekt entpackt." }
        modelRoot.file("uuid").asFile.writeText("rhia-vosk-small-de-0.15")
    }
}

tasks.named("preBuild") {
    dependsOn(prepareGermanVoskModel)
}
