const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync('public')) fs.mkdirSync('public');
copyRecursiveSync('assets', 'public/assets');
copyRecursiveSync('data', 'public/data');
copyRecursiveSync('views', 'public/views');
fs.copyFileSync('index.html', 'public/index.html');
fs.copyFileSync('manifest.json', 'public/manifest.json');
console.log('Build completed!');
