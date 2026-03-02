const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Config plugin that adds `use_modular_headers!` to the Podfile
 * to fix Firebase Swift static library integration issues.
 */
function withModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );

      let podfileContent = fs.readFileSync(podfilePath, "utf-8");

      // Add use_modular_headers! right after platform declaration if not present
      if (!podfileContent.includes("use_modular_headers!")) {
        podfileContent = podfileContent.replace(
          /^(platform :ios.*$)/m,
          "$1\nuse_modular_headers!",
        );
        fs.writeFileSync(podfilePath, podfileContent);
      }

      return config;
    },
  ]);
}

module.exports = withModularHeaders;
