const express = require("express");
const dotenv = require("dotenv");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const hpp = require("hpp");
const cors = require("cors");
const connectDB = require("./config/db");
// const errorHandler = require("./middleware/error");
const morgan = require("morgan");

dotenv.config({ path: "./.env" });

connectDB();

const pool = require("./routes/pool");
const user = require("./routes/user");
const validator = require("./routes/validator");
const collection = require("./routes/collection");
const nft = require("./routes/nft");
const buysell = require("./routes/buysell");
const lendborrow = require("./routes/lendborrow");
const swap = require("./routes/swap");
const notification = require("./routes/notification");
const dashboard = require("./routes/dashboard");
const homepage = require("./routes/homepage");
const kyb = require("./routes/kyb");
const kyc = require("./routes/kyc");
const webhook = require("./routes/webhook");

const app = express();
app.use(cors({ origin: "*" }));
app.use("/webhook", express.raw({ type: 'application/json' }), webhook);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(mongoSanitize());
app.use(helmet());
app.use(hpp());

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Aconomy application." });
});

app.use("/api/v1/pool", pool);
app.use("/api/v1/user", user);
app.use("/api/v1/validator", validator);
app.use("/api/v1/collection", collection);
app.use("/api/v1/nft", nft);
app.use("/api/v1/buysell", buysell);
app.use("/api/v1/lendborrow", lendborrow);
app.use("/api/v1/swap", swap);
app.use("/api/v1/notifications", notification);
app.use("/api/v1/dashboard", dashboard);
app.use("/api/v1/home", homepage);
app.use("/api/v1/kyb", kyb);
app.use("/api/v1/kyc", kyc);

// app.use(errorHandler);

const PORT = process.env.PORT || 8080;

const server = app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
