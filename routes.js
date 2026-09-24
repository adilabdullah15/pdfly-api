// pdfly-api — routes.js
// Request handlers for POST /api/merge and POST /api/images-to-pdf.
//
// Both endpoints use multer memoryStorage (files live in req.files buffers,
// nothing is written to disk). Per-file and total size limits are enforced,
// invalid inputs produce 400 JSON {error}, and pdf-lib failures produce 502.

const multer = require("multer");
const { PDFDocument } = require("pdf-lib");

// ---- Limits ---------------------------------------------------------------
const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB combined per request

// ---- Helpers --------------------------------------------------------------

// Memory-only upload engine: no disk writes.
function makeUpload() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { files: MAX_FILES, fileSize: MAX_TOTAL_BYTES },
  });
}

// Sum of all uploaded file sizes; rejects oversized requests.
function checkTotalSize(files) {
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    throw Object.assign(new Error("Total upload size must not exceed 25MB"), { status: 400 });
  }
}

// Accept only files the browser/OS labelled as PDF.
function assertAllPdf(files) {
  for (const f of files) {
    if (f.mimetype !== "application/pdf") {
      throw Object.assign(
        new Error(`Invalid file "${f.originalname}": expected application/pdf`),
        { status: 400 }
      );
    }
  }
}

// Accept only JPEG or PNG images.
function assertAllImages(files) {
  for (const f of files) {
    if (!["image/jpeg", "image/png"].includes(f.mimetype)) {
      throw Object.assign(
        new Error(`Invalid file "${f.originalname}": expected image/jpeg or image/png`),
        { status: 400 }
      );
    }
  }
}

// Send a generated PDF as a download attachment.
function sendPdf(res, bytes, filename) {
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": bytes.length,
  });
  res.send(Buffer.from(bytes));
}

// Run a multer middleware inside an async handler, converting any multer
// error into a 400 with a plain message instead of leaking internals.
function runUpload(req, res, upload) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) {
        reject(Object.assign(new Error(err.message), { status: 400 }));
      } else {
        resolve();
      }
    });
  });
}

// ---- Endpoint 1: POST /api/merge ------------------------------------------
// Multipart field "files": 2–20 PDFs, ≤25MB total, merged in upload order.
async function mergeHandler(req, res) {
  const upload = makeUpload().array("files", MAX_FILES);
  try {
    await runUpload(req, res, upload);

    const files = req.files || [];
    if (files.length < 2) {
      return res.status(400).json({ error: "Provide between 2 and 20 PDF files in field \"files\"" });
    }

    assertAllPdf(files);
    checkTotalSize(files);

    const merged = await PDFDocument.create();
    for (const f of files) {
      const doc = await PDFDocument.load(f.buffer);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    }
    const bytes = await merged.save();
    sendPdf(res, bytes, "merged.pdf");
  } catch (err) {
    if (err && err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Merge failed:", err && err.message ? err.message : err);
    res.status(502).json({ error: "Failed to merge PDF files" });
  }
}

// ---- Endpoint 2: POST /api/images-to-pdf ----------------------------------
// Multipart field "images" (alias "files" also accepted): 1–20 JPEG/PNG,
// ≤25MB total. Each image goes on its own A4 page, scaled to fit and centered.
const A4_WIDTH = 595.28;   // points
const A4_HEIGHT = 841.89;  // points

async function imagesToPdfHandler(req, res) {
  // Accept both "images" and "files" field names; multer fields() gives us both.
  const upload = makeUpload().fields([
    { name: "images", maxCount: MAX_FILES },
    { name: "files", maxCount: MAX_FILES },
  ]);
  try {
    await runUpload(req, res, upload);

    const fieldFiles = req.files || {};
    const files = [...(fieldFiles.images || []), ...(fieldFiles.files || [])];
    if (files.length < 1 || files.length > MAX_FILES) {
      return res.status(400).json({ error: "Provide between 1 and 20 image files in field \"images\"" });
    }

    assertAllImages(files);
    checkTotalSize(files);

    const doc = await PDFDocument.create();
    for (const f of files) {
      let image;
      if (f.mimetype === "image/png") {
        image = await doc.embedPng(f.buffer);
      } else {
        image = await doc.embedJpg(f.buffer);
      }
      // Scale to fit within A4 preserving aspect ratio, then center.
      const scale = Math.min(A4_WIDTH / image.width, A4_HEIGHT / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
      page.drawImage(image, {
        x: (A4_WIDTH - drawWidth) / 2,
        y: (A4_HEIGHT - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      });
    }
    const bytes = await doc.save();
    sendPdf(res, bytes, "images.pdf");
  } catch (err) {
    if (err && err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Images-to-PDF failed:", err && err.message ? err.message : err);
    res.status(502).json({ error: "Failed to convert images to PDF" });
  }
}

module.exports = { mergeHandler, imagesToPdfHandler };
