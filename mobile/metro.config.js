const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all workspace folders so Metro picks up changes from shared/ etc.
config.watchFolders = [monorepoRoot];

// 2. With node-linker=hoisted all deps live in the root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Tell Metro that the project root for source files is mobile/
//    but packages should also be found at the monorepo root.
config.resolver.disableHierarchicalLookup = true;

// 4. Axios: use browser build instead of Node.js build
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
