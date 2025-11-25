if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/lee_mac/.gradle/caches/8.14.3/transforms/d12afc8ddd29a944806881abcbf6e56c/transformed/hermes-android-0.81.5-release/prefab/modules/libhermes/libs/android.armeabi-v7a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/lee_mac/.gradle/caches/8.14.3/transforms/d12afc8ddd29a944806881abcbf6e56c/transformed/hermes-android-0.81.5-release/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

