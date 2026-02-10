const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

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

// 4. Pin singleton packages to mobile's copies (React 18, not CMS's React 19).
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules", "react"),
  "react-native": path.resolve(projectRoot, "node_modules", "react-native"),
  "react-dom": path.resolve(projectRoot, "node_modules", "react-dom"),
};

// 5. Hardcode react resolution to mobile's React 18 copy.
//    extraNodeModules is not enough — pnpm symlinks cause Metro to find
//    React 19 (from CMS) when resolving from packages in the .pnpm store.
//    Returning hardcoded paths completely bypasses Metro's node_modules traversal.
const reactDir = fs.realpathSync(
  path.resolve(projectRoot, "node_modules", "react"),
);
const reactFiles = {
  react: path.join(reactDir, "index.js"),
  "react/jsx-runtime": path.join(reactDir, "jsx-runtime.js"),
  "react/jsx-dev-runtime": path.join(reactDir, "jsx-dev-runtime.js"),
  "react/react.shared-subset": path.join(reactDir, "react.shared-subset.js"),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Hardcoded React 18 resolution — no traversal, no symlink following
  if (reactFiles[moduleName]) {
    return { type: "sourceFile", filePath: reactFiles[moduleName] };
  }

  // Axios: use browser build instead of Node.js build
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
