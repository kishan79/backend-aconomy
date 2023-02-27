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

const app = express();
app.use(cors());
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

// app.use(errorHandler);

const PORT = process.env.PORT || 4000;

const server = app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
