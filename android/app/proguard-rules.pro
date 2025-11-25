# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# ============================================
# CRITICAL: MainApplication must be kept
# ============================================
# Keep MainApplication class - MUST be at the top
-keep class com.runon.app.MainApplication { *; }
-keepclassmembers class com.runon.app.MainApplication { *; }
-keepnames class com.runon.app.MainApplication
-dontwarn com.runon.app.MainApplication

# Keep MainActivity
-keep class com.runon.app.MainActivity { *; }
-keepclassmembers class com.runon.app.MainActivity { *; }

# Keep all classes in app package (most important)
-keep class com.runon.app.** { *; }
-keepclassmembers class com.runon.app.** { *; }

# React Native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
    void set*(***);
    *** get*();
}
-keepclassmembers class * {
    @react-native-community.* *;
}

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo
-keepclassmembers class * {
  @expo.modules.core.interfaces.ExpoProp *;
}
-keep @expo.modules.core.interfaces.DoNotStrip class *
-keepclassmembers class * {
  @expo.modules.core.interfaces.DoNotStrip *;
}

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Keep Firebase Analytics
-keep class com.google.firebase.analytics.** { *; }
-keep class com.google.android.gms.measurement.** { *; }

# Keep Firebase Auth
-keep class com.google.firebase.auth.** { *; }
-keep class com.google.android.gms.auth.** { *; }

# Keep Firebase Firestore
-keep class com.google.firebase.firestore.** { *; }

# Keep Firebase Storage
-keep class com.google.firebase.storage.** { *; }

# Keep Firebase Messaging
-keep class com.google.firebase.messaging.** { *; }

# React Native Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.reanimated.** { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# React Native Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# React Native SVG
-keep class com.horcrux.svg.** { *; }

# React Native View Shot
-keep class fr.greweb.reactnativeviewshot.** { *; }

# React Native WebView
-keep class com.reactnativecommunity.webview.** { *; }

# React Native Image Picker
-keep class com.imagepicker.** { *; }

# React Native Notifications
-keep class expo.modules.notifications.** { *; }

# React Native Location
-keep class expo.modules.location.** { *; }

# React Native Network
-keep class expo.modules.network.** { *; }

# React Native Device
-keep class expo.modules.device.** { *; }

# React Native Application
-keep class expo.modules.application.** { *; }

# React Native Constants
-keep class expo.modules.constants.** { *; }

# React Native Font
-keep class expo.modules.font.** { *; }

# React Native Splash Screen
-keep class expo.modules.splashscreen.** { *; }

# React Native Status Bar
-keep class expo.modules.statusbar.** { *; }

# React Native Web Browser
-keep class expo.modules.webbrowser.** { *; }

# React Native Crypto
-keep class expo.modules.crypto.** { *; }

# React Native Blur
-keep class expo.modules.blur.** { *; }

# React Native Linear Gradient
-keep class expo.modules.lineargradient.** { *; }

# React Native Media Library
-keep class expo.modules.medialibrary.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# NetInfo
-keep class com.reactnativecommunity.netinfo.** { *; }

# DateTimePicker
-keep class com.reactnativecommunity.datetimepicker.** { *; }

# Picker
-keep class com.reactnativecommunity.picker.** { *; }

# React Navigation
-keep class com.reactnavigation.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep R class
-keepclassmembers class **.R$* {
    public static <fields>;
}

# Keep BuildConfig
-keep class **.BuildConfig { *; }

# Keep application class
-keep class com.runon.app.MainApplication { *; }
-keep class com.runon.app.MainActivity { *; }

# Keep all native methods
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

# Keep JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# Gson (if used)
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Keep line numbers for stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ============================================
# Critical rules for ClassNotFoundException fix
# ============================================

# Keep all Application classes and their constructors
-keep class * extends android.app.Application { 
    <init>(...);
    *;
}
-keep class * implements com.facebook.react.ReactApplication { *; }

# Keep AppComponentFactory and CoreComponentFactory (critical for app initialization)
-keep class androidx.core.app.CoreComponentFactory { *; }
-keep class android.app.AppComponentFactory { *; }
-keep class * extends android.app.AppComponentFactory { *; }
-keep class * extends androidx.core.app.CoreComponentFactory { *; }

# Keep React Native Host classes
-keep class com.facebook.react.ReactNativeHost { *; }
-keep class com.facebook.react.defaults.DefaultReactNativeHost { *; }
-keep class expo.modules.ReactNativeHostWrapper { *; }
-keep class * extends com.facebook.react.ReactNativeHost { *; }
-keep class * extends com.facebook.react.defaults.DefaultReactNativeHost { *; }

# Keep Expo Application Lifecycle
-keep class expo.modules.ApplicationLifecycleDispatcher { *; }

# Keep React Native Entry Point
-keep class com.facebook.react.ReactNativeApplicationEntryPoint { *; }

# Keep Kotlin metadata for reflection
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep constructors for Application classes
-keepclassmembers class * extends android.app.Application {
    <init>();
    <init>(android.content.Context);
}

# React Native Health (iOS only, but keep for safety)
-keep class com.health.** { *; }
-dontwarn com.health.**

# Samsung Health (if used)
-keep class com.samsung.android.sdk.health.** { *; }
-dontwarn com.samsung.android.sdk.health.**

# Keep all enum classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep custom exceptions
-keep public class * extends java.lang.Exception

# Keep native library names
-keepnames class * {
    native <methods>;
}

# Keep JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep all classes in the app package
-keep class com.runon.app.** { *; }

# Keep all React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep all Expo modules
-keep class expo.modules.** { *; }
-keep class host.exp.exponent.** { *; }

# Keep all React Native community modules
-keep class com.reactnativecommunity.** { *; }

# Keep all React Navigation modules
-keep class com.reactnavigation.** { *; }

# Keep all React Native third-party modules
-keep class com.swmansion.** { *; }
-keep class com.th3rdwave.** { *; }
-keep class com.horcrux.** { *; }
-keep class fr.greweb.** { *; }
-keep class com.imagepicker.** { *; }

# Keep all native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep R class
-keepclassmembers class **.R$* {
    public static <fields>;
}

# Keep BuildConfig
-keep class **.BuildConfig { *; }

# Keep application class
-keep class com.runon.app.MainApplication { *; }
-keep class com.runon.app.MainActivity { *; }

# Keep line numbers for stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ============================================
# Critical rules for ClassNotFoundException fix
# ============================================

# Keep all Application classes and their constructors
-keep class * extends android.app.Application { 
    <init>(...);
    *;
}
-keep class * implements com.facebook.react.ReactApplication { *; }

# Keep AppComponentFactory and CoreComponentFactory (critical for app initialization)
-keep class androidx.core.app.CoreComponentFactory { *; }
-keep class android.app.AppComponentFactory { *; }
-keep class * extends android.app.AppComponentFactory { *; }
-keep class * extends androidx.core.app.CoreComponentFactory { *; }

# Keep React Native Host classes
-keep class com.facebook.react.ReactNativeHost { *; }
-keep class com.facebook.react.defaults.DefaultReactNativeHost { *; }
-keep class expo.modules.ReactNativeHostWrapper { *; }
-keep class * extends com.facebook.react.ReactNativeHost { *; }
-keep class * extends com.facebook.react.defaults.DefaultReactNativeHost { *; }

# Keep Expo Application Lifecycle
-keep class expo.modules.ApplicationLifecycleDispatcher { *; }

# Keep React Native Entry Point
-keep class com.facebook.react.ReactNativeApplicationEntryPoint { *; }

# Keep Kotlin metadata for reflection
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep constructors for Application classes
-keepclassmembers class * extends android.app.Application {
    <init>();
    <init>(android.content.Context);
}

