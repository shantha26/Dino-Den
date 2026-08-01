const http = require('http');
const fs = require('fs');

const PORT = 8080;
const apkPath = 'C:\\Users\\Shantha\\Downloads\\app-debug.apk';

const server = http.createServer((req, res) => {
  if (req.url === '/app-debug.apk' || req.url === '/download') {
    if (!fs.existsSync(apkPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('APK File not found');
    }
    const stat = fs.statSync(apkPath);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="app-debug.apk"'
    });
    fs.createReadStream(apkPath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Download App APK</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: white; text-align: center; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; padding: 2.5rem 2rem; border-radius: 1.25rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); max-width: 400px; width: 100%; border: 1px solid #334155; }
          .icon { font-size: 3rem; margin-bottom: 1rem; }
          h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 700; color: #f8fafc; }
          p { color: #94a3b8; font-size: 0.95rem; margin: 0 0 2rem 0; line-height: 1.5; }
          .btn { display: block; background: #3b82f6; color: #ffffff; padding: 1rem 1.5rem; border-radius: 0.75rem; font-weight: 600; text-decoration: none; font-size: 1.1rem; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.5); }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">📱</div>
          <h1>Kids Play Area</h1>
          <p>Android Debug APK Package<br><small style="color: #64748b;">(Size: ~4.8 MB)</small></p>
          <a class="btn" href="/app-debug.apk">📥 Download APK File</a>
        </div>
      </body>
      </html>
    `);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`APK Download Server running on port ${PORT}`);
});
