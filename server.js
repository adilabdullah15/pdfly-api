// pdfly-api — PDF Toolkit API
// server.js: Express app wiring for /health, /api/merge, /api/images-to-pdf.

const express = require("express");
const cors = require("cors");

const { mergeHandler, imagesToPdfHandler } = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----------------------------------------------------------
app.use(cors());
app.use(express.json());

// ---- Health check --------------------------------------------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ---- API endpoints -------------------------------------------------------
app.post("/api/merge", mergeHandler);
app.post("/api/images-to-pdf", imagesToPdfHandler);

// ---- 404 fallback --------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ---- Global error handler ------------------------------------------------
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Multer reports file-count/size errors as its own type; surface them as 400.
  if (err && err.code && ["LIMIT_FILE_SIZE", "LIMIT_FILE_COUNT", "LIMIT_UNEXPECTED_FILE"].includes(err.code)) {
    return res.status(400).json({ error: err.message });
  }
  console.error("Unhandled error:", err && err.message ? err.message : err);
  res.status(500).json({ error: "Internal server error" });
});

// ---- Start ---------------------------------------------------------------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`pdfly-api listening on port ${PORT}`);
  });
}

module.exports = app;
