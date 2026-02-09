const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the monorepo root for changes (pnpm hoists some deps here)
config.watchFolders = [monorepoRoot];

// 2. Tell Metro where to resolve packages from (both mobile and root node_modules)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Ensure Metro can follow symlinks (critical for pnpm)
config.resolver.unstable_enableSymlinks = true;

// 4. Force axios to resolve to its browser build instead of the Node.js
//    one (which requires crypto, http, etc. that don't exist in RN).
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "axios" || moduleName === "axios/dist/node/axios.cjs") {
    return context.resolveRequest(
      context,
      "axios/dist/browser/axios.cjs",
      platform,
    );
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
