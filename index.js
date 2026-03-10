const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const app = express();
app.use(express.static("public"));

const PORT = 5000;
const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

const uploads = new Map(); // replace with Redis/DB in real production

app.use(express.raw({ limit: "50mb", type: "application/octet-stream" }));

/*
---------------------------------
INIT UPLOAD
---------------------------------
*/

app.post("/upload/init", express.json(), (req, res) => {
    const { filename, size } = req.body;

    if (!filename || !size) {
        return res.status(400).json({ error: "missing fields" });
    }

    const id = uuid();
    const filepath = path.join(UPLOAD_DIR, id + "-" + filename);

    const fd = fs.openSync(filepath, "w");

    uploads.set(id, {
        filename,
        filepath,
        size,
        fd,
        uploaded: 0,
        created: Date.now()
    });

    res.json({
        uploadId: id
    });
});

/*
---------------------------------
UPLOAD CHUNK
---------------------------------
*/

app.put("/upload/chunk", (req, res) => {
    const uploadId = req.headers["upload-id"];
    const offset = Number(req.headers["chunk-offset"]);

    if (!uploads.has(uploadId)) {
        return res.status(404).json({ error: "upload not found" });
    }

    const upload = uploads.get(uploadId);

    const buffer = req.body;

    fs.write(upload.fd, buffer, 0, buffer.length, offset, (err, written) => {

        if (err) {
            return res.status(500).json({ error: err.message });
        }

        upload.uploaded += written;

        res.json({
            received: written
        });

    });
});

/*
---------------------------------
COMPLETE UPLOAD
---------------------------------
*/

app.post("/upload/complete", express.json(), (req, res) => {

    const { uploadId } = req.body;

    const upload = uploads.get(uploadId);

    if (!upload) {
        return res.status(404).json({ error: "upload not found" });
    }

    fs.closeSync(upload.fd);

    uploads.delete(uploadId);

    res.json({
        message: "upload complete",
        fileId: path.basename(upload.filepath)
    });
});

/*
---------------------------------
DOWNLOAD FILE
---------------------------------
*/

app.get("/file/:id", (req, res) => {

    const filepath = path.join(UPLOAD_DIR, req.params.id);

    if (!fs.existsSync(filepath)) {
        return res.status(404).send("file not found");
    }

    const stat = fs.statSync(filepath);

    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.id}"`);

    const stream = fs.createReadStream(filepath);

    stream.pipe(res);
});

/*
---------------------------------
AUTO CLEANUP (optional)
---------------------------------
*/

setInterval(() => {

    const now = Date.now();

    for (const [id, upload] of uploads.entries()) {

        if (now - upload.created > 1000 * 60 * 60) { // 1 hour

            fs.closeSync(upload.fd);

            try {
                fs.unlinkSync(upload.filepath);
            } catch {}

            uploads.delete(id);

        }
    }

}, 60000);

app.listen(PORT, () => {
    console.log("Server running on", PORT);
});