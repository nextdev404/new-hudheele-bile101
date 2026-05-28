const { env } = require("./env");

const DEV_ORIGINS = [
  "http://127.0.0.1:5501",
  "http://localhost:5501",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:5502",
  "http://localhost:5502",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
];

function isAllowedOrigin(origin) {
  if (!origin) {
    return env.nodeEnv !== "production";
  }
  if (env.nodeEnv === "development") {
    return true;
  }
  const allowed = new Set([env.frontendOrigin, ...DEV_ORIGINS]);
  return allowed.has(origin);
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked origin: ${origin}`));
    }
  },
  credentials: true,
};

module.exports = { corsOptions, isAllowedOrigin };
