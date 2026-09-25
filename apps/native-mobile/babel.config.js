module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-worklets/plugin must be listed last. Required by
    // react-native-reanimated (installed for future screen animations).
    plugins: ["react-native-worklets/plugin"],
  };
};
