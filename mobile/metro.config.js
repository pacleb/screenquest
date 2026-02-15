const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const defaultConfig = getDefaultConfig(projectRoot);

const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [path.resolve(monorepoRoot, "node_modules")],
    disableHierarchicalLookup: true,
    resolveRequest: (context, moduleName, platform) => {
      if (
        moduleName === "axios" ||
        moduleName === "axios/dist/node/axios.cjs"
      ) {
        return context.resolveRequest(
          context,
          "axios/dist/browser/axios.cjs",
          platform,
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
