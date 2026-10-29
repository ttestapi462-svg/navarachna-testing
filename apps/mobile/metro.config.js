const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const nativeWindConfig = withNativeWind(config, { input: "./global.css" });
const enhanceMiddleware = nativeWindConfig.server.enhanceMiddleware;

// React Native's Android BundleDownloader can fail while parsing very large
// multipart bundles from Metro on Windows. Request a regular JS response for
// Android bundles; iOS, web, and non-bundle requests keep Metro's defaults.
nativeWindConfig.server.enhanceMiddleware = (middleware, server) => {
  const enhancedMiddleware = enhanceMiddleware(middleware, server);
  if (typeof enhancedMiddleware !== "function") return enhancedMiddleware;

  return (req, res, next) => {
    if (req.method === "GET" && req.url) {
      try {
        const requestUrl = new URL(req.url, "http://localhost");
        if (
          requestUrl.pathname.endsWith(".bundle") &&
          requestUrl.searchParams.get("platform") === "android"
        ) {
          const acceptedTypes = (req.headers.accept || "")
            .split(",")
            .filter((type) => type.trim().split(";")[0].toLowerCase() !== "multipart/mixed");
          req.headers.accept = acceptedTypes.join(", ") || "application/javascript";
        }
      } catch {
        // Leave malformed or unrelated request URLs untouched.
      }
    }
    return enhancedMiddleware(req, res, next);
  };
};

module.exports = nativeWindConfig;
