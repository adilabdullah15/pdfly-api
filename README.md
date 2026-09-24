# pdfly-api

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A lightweight PDF toolkit REST API — merge multiple PDF files into one, or convert a set of images into a single A4 PDF document.

## Features

- **Merge PDFs** — combine 2–20 PDF files into a single PDF, in upload order
- **Images to PDF** — turn 1–20 JPEG/PNG images into one PDF, each image on its own A4 page, scaled to fit and centered
- **In-memory uploads** — nothing is written to disk (`multer` memory storage)
- **Sensible limits** — max 20 files and 25MB total per request
- **Clear errors** — `400` JSON for invalid input, `502` JSON when a PDF cannot be built

## Quick Start

```bash
npm install
npm start
```

The server listens on port `3000` (override with the `PORT` environment variable). For development with auto-restart:

```bash
npm run dev
```

## API

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/health` | Health check → `{ "status": "ok" }` |
| `POST` | `/api/merge` | Merge 2–20 PDFs (multipart field `files`) → `merged.pdf` |
| `POST` | `/api/images-to-pdf` | Convert 1–20 JPEG/PNG images (multipart field `images`, alias `files`) → `images.pdf` |

### Merge PDFs

```bash
curl -F "files=@a.pdf" -F "files=@b.pdf" \
  http://localhost:3000/api/merge --output merged.pdf
```

### Convert images to PDF

```bash
curl -F "images=@photo1.jpg" -F "images=@photo2.png" \
  http://localhost:3000/api/images-to-pdf --output images.pdf
```

## Error Cases

All errors are returned as JSON: `{ "error": "<message>" }`.

| Status | When |
| ------ | ---- |
| `400` | Fewer than 2 or more than 20 files sent to `/api/merge`; fewer than 1 or more than 20 files sent to `/api/images-to-pdf` |
| `400` | A `/api/merge` file is not `application/pdf`, or a `/api/images-to-pdf` file is not `image/jpeg` / `image/png` |
| `400` | Total upload size exceeds 25MB, or the multipart field name is wrong |
| `404` | Unknown route |
| `502` | A PDF could not be read or built (corrupt file, unsupported content) |

## Structure

```
pdfly-api/
├── server.js      # Express app: middleware, routes, error handler
├── routes.js      # /api/merge and /api/images-to-pdf handlers
├── package.json
├── .gitignore
└── LICENSE
```

## Tech Stack

- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
- [multer](https://github.com/expressjs/multer) — multipart upload handling (memory storage)
- [pdf-lib](https://pdf-lib.js.org/) — PDF merging, creation and image embedding
- [cors](https://github.com/expressjs/cors)

## Author

**Adil Abdullah Khan** — BS Information Technology, Thal University Bhakkar, Pakistan

- Email: adilabdullahkhan35@gmail.com
- GitHub: https://github.com/adilabdullah15

## License

MIT — see [LICENSE](LICENSE).
