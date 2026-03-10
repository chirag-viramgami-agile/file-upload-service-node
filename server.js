require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { v4: uuid } = require("uuid");
const crypto = require("crypto");

const Upload = require("./models/Upload");
const connectDB = require("./config/db");

connectDB();

const app = express();

const PORT = process.env.PORT || 5000;

const CHUNK_SIZE = 8 * 1024 * 1024;

const UPLOAD_DIR = path.join(__dirname, "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

app.use(compression());
app.use(express.json());
app.use(express.static("public"));

app.use(
   rateLimit({
      windowMs: 60000,
      max: 200,
   }),
);

/* ---------------- INIT ---------------- */

app.post("/upload/init", async (req, res) => {
   const { filename, size, token } = req.body;

   if (!filename || !size) {
      return res.status(400).json({ error: "missing parameters" });
   }

   if (token) {
      const existing = await Upload.findOne({ uploadId: token });

      if (existing) {
         return res.json({
            uploadId: existing.uploadId,
            chunkSize: existing.chunkSize,
            uploadedChunks: existing.uploadedChunks,
            totalChunks: existing.totalChunks,
         });
      }
   }

   const uploadId = uuid();
   const safeName = path.basename(filename).replace(/[^a-zA-Z0-9.\-_]/g, "-")
   const filepath = path.join(UPLOAD_DIR, uploadId + "-" + safeName);
   const totalChunks = Math.ceil(size / CHUNK_SIZE);

   // create file
   const fd = fs.openSync(filepath, "w");
   fs.ftruncateSync(fd, size);
   fs.closeSync(fd);

   const uploadFolder = path.join(UPLOAD_DIR, uploadId)
   fs.mkdirSync(uploadFolder)
   fs.mkdirSync(path.join(uploadFolder,"chunks"))


   // Record
   await Upload.create({
      uploadId,
      filename: safeName,
      filepath,
      size,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      uploadedChunks: [],
      status: "uploading",
   });

   res.json({ uploadId, chunkSize: CHUNK_SIZE });
});

/* ---------------- STATUS ---------------- */

app.get("/upload/status", async (req, res) => {
   const { uploadId } = req.query;

   const upload = await Upload.findOne({ uploadId });

   if (!upload) return res.status(404).end();

   res.json({
      uploadedChunks: upload.uploadedChunks,
      totalChunks: upload.totalChunks,
      chunkSize: upload.chunkSize,
   });
});

/* ---------------- CHUNK ---------------- */

// app.put("/upload/chunk", async (req, res) => {
//    const uploadId = req.headers["upload-id"];
//    const chunkIndex = Number(req.headers["chunk-index"]);
//    const clientHash = req.headers["chunk-hash"];

//    const upload = await Upload.findOne({ uploadId });

//    if (!upload) return res.status(404).end();

//    const result = await Upload.updateOne(
//       { uploadId, uploadedChunks: { $ne: chunkIndex } },
//       { $addToSet: { uploadedChunks: chunkIndex } },
//    );

//    if (result.modifiedCount === 0) {
//       return res.json({ already: true });
//    }

//    const start = chunkIndex * upload.chunkSize;

//    const hash = crypto.createHash("sha256");

//    const writeStream = fs.createWriteStream(upload.filepath, {
//       flags: "r+",
//       start,
//    });

//    let bytesWritten = 0;

//    req.on("data", (chunk) => {
//       hash.update(chunk);
//       bytesWritten += chunk.length;
//    });

//    req.pipe(writeStream);

//    writeStream.on("finish", async () => {
//       const serverHash = hash.digest("hex");

//       if (serverHash !== clientHash) {
//          return res.status(400).json({ error: "chunk corrupted" });
//       }

//       res.json({ received: bytesWritten });
//    });

//    writeStream.on("error", (err) => {
//       console.error(err);
//       res.status(500).end();
//    });
// });

app.put("/upload/chunk", async (req, res) => {
   const uploadId = req.headers["upload-id"];
   const chunkIndex = Number(req.headers["chunk-index"]);
   const clientHash = req.headers["chunk-hash"];

   if (!uploadId || chunkIndex === undefined || !clientHash) {
      return res.status(400).json({ error: "missing chunk headers" });
   }

   const upload = await Upload.findOne({ uploadId });

   if (!upload) {
      return res.status(404).json({ error: "upload not found" });
   }

   if (!fs.existsSync(upload.filepath)) {
      return res.status(500).json({ error: "upload file missing on server" });
   }

   /* prevent duplicate chunk writes */
   const result = await Upload.updateOne(
      { uploadId, uploadedChunks: { $ne: chunkIndex } },
      { $addToSet: { uploadedChunks: chunkIndex } },
   );

   if (result.modifiedCount === 0) {
      return res.json({ already: true });
   }

   const start = chunkIndex * upload.chunkSize;

   const hash = crypto.createHash("sha256");

   // file write
   // const writeStream = fs.createWriteStream(upload.filepath, {
   //    flags: "r+",
   //    start,
   // });
   const chunkPath = path.join(
      UPLOAD_DIR, uploadId,
      "chunks", chunkIndex + ".chunk"
   )
   const writeStream = fs.createWriteStream(chunkPath)

   // 
   let bytesWritten = 0;

   req.on("data", (chunk) => {
      hash.update(chunk);
      bytesWritten += chunk.length;
   });

   req.pipe(writeStream);

   writeStream.on("finish", async () => {
      const serverHash = hash.digest("hex");

      if (serverHash !== clientHash) {
         return res.status(400).json({
            error: "chunk corrupted",
         });
      }

      res.json({
         received: bytesWritten,
      });
   });

   writeStream.on("error", (err) => {
      console.error(err);
      res.status(500).end();
   });
});

/* ---------------- COMPLETE ---------------- */

app.post("/upload/complete", async (req, res) => {
   const { uploadId } = req.body;

   const upload = await Upload.findOne({ uploadId });
   if (!upload) return res.status(404).end();

   // CHUNK MERGE
   const uploadFolder = path.join(UPLOAD_DIR, uploadId);
   const chunkDir = path.join(uploadFolder, "chunks");

   const finalPath = path.join(UPLOAD_DIR, uploadId + "-" + upload.filename);
   const final = fs.createWriteStream(finalPath)

   if(upload.status !== 'complete') {
      for (let i = 0; i < upload.totalChunks; i++) {
         const chunkPath = path.join(chunkDir, i + ".chunk")
         if (!fs.existsSync(chunkPath)) {
            return res.status(500).json({
               error: `missing chunk ${i}`
            });
         }

         await new Promise((resolve, reject) => {
            const stream = fs.createReadStream(chunkPath);

            stream.pipe(final, { end: false });

            stream.on("end", resolve);
            stream.on("error", reject);
         });
      }
      final.end();
      fs.rmSync(uploadFolder, { recursive: true, force: true })
      // MERGE END
      
      upload.status = "complete";
      upload.filepath = finalPath;
      await upload.save();
   }

   if (upload.uploadedChunks.length !== upload.totalChunks) {
      return res.status(400).json({
         success: false,
         message: "upload incomplete"
      });
   }
   
   res.json({
      fileId: path.basename(upload.filepath),
      success: true,
      message: "upload complete"
   });
});

/* ---------------- DOWNLOAD ---------------- */

app.get("/file/:id", (req, res) => {
   const filepath = path.join(UPLOAD_DIR, req.params.id);

   if (!fs.existsSync(filepath)) return res.status(404).end();

   const stat = fs.statSync(filepath);

   const range = req.headers.range;

   if (!range) {
      res.setHeader("Content-Length", stat.size);

      return fs.createReadStream(filepath).pipe(res);
   }

   const parts = range.replace(/bytes=/, "").split("-");

   const start = parseInt(parts[0]);
   const end = parts[1] ? parseInt(parts[1]) : stat.size - 1;

   const chunkSize = end - start + 1;

   res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "application/octet-stream",
   });

   fs.createReadStream(filepath, { start, end }).pipe(res);
});

/* ---------------- CLEANUP ---------------- */

setInterval(async () => {
   const t = 24 * 60 * 60 * 1000;//24h
   const stale = await Upload.find({
      updatedAt: { $lt: Date.now() - t },
      status: {$in: ["uploading","complete"]},
   });

   for (const u of stale) {
      if (fs.existsSync(u.filepath)) {
         fs.unlinkSync(u.filepath);
      }

      await Upload.deleteOne({ uploadId: u.uploadId });
   }
}, 3600000);//1hr

const server = app.listen(PORT, () => {
   console.log("server running", PORT);
});

/* HTTP Keep Alive */

server.keepAliveTimeout = 65000;
