const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [path.resolve(monorepoRoot, "node_modules")];
config.resolver.disableHierarchicalLookup = true;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "axios" || moduleName === "axios/dist/node/axios.cjs") {
    return context.resolveRequest(
      context,
      "axios/dist/browser/axios.cjs",
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
