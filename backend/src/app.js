const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { env } = require("./config/env");
const apiRoutes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error");
const { attachTenant } = require("./middleware/tenant");

const app = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(attachTenant);

app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
