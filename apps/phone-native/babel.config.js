// VisionCamera frame processors are worklets: the worklets-core Babel plugin must run (https://react-native-vision-camera.com/docs/guides/frame-processors).
module.exports = function (api) {
  api.cache(true)
  return { presets: ['babel-preset-expo'], plugins: [['react-native-worklets-core/plugin']] }
}
