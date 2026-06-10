// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// colyseus.js dependencies (@colyseus/httpie) ship a Node build under the
// "import" condition; prefer their "browser" build on native platforms.
config.resolver.unstable_conditionNames = ["browser", "require", "react-native"];

module.exports = config;
