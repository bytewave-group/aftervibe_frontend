const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
        case ".html":
            return "text/html";
        case ".js":
            return "application/javascript";
        case ".css":
            return "text/css";
        case ".json":
            return "application/json";
        case ".png":
            return "image/png";
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".gif":
            return "image/gif";
        case ".svg":
            return "image/svg+xml";
        case ".ico":
            return "image/x-icon";
        case ".woff":
            return "font/woff";
        case ".woff2":
            return "font/woff2";
        case ".ttf":
            return "font/ttf";
        default:
            return "application/octet-stream";
    }
}

function getLocalIP() {
    const interfaces = os.networkInterfaces();

    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }

    return "localhost";
}

function startWebServer(port = 3000) {

    const distPath = path.join(__dirname, "../dist");

    const server = http.createServer((req, res) => {

        let requestPath = decodeURIComponent(req.url.split("?")[0]);

        if (requestPath === "/" || requestPath === "") {
            requestPath = "/index.html";
        }

        let filePath = path.join(distPath, requestPath);

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            filePath = path.join(distPath, "index.html");
        }

        fs.readFile(filePath, (err, content) => {

            if (err) {
                res.writeHead(404);
                res.end("Not Found");
                return;
            }

            res.writeHead(200, {
                "Content-Type": getContentType(filePath)
            });

            res.end(content);

        });

    });

    server.listen(port, () => {

        const ip = getLocalIP();

        console.log("=================================");
        console.log("HTTP Server Started");
        console.log(`Local : http://localhost:${port}`);
        console.log(`Phone : http://${ip}:${port}`);
        console.log("=================================");

    });

}

module.exports = {
    startWebServer
};