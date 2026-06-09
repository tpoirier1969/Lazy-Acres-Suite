Lazy Acres Suite photo icon update v0.1.21

Copy these files into the repo using the same paths:

- index.html
- site.webmanifest
- apple-touch-icon.png
- assets/app-shell/mountain-photo-icon.png
- assets/app-shell/photo-icon.js

What this does:
- Uses the new photo icon for the browser tab/favicon.
- Uses apple-touch-icon.png for iPhone Home Screen.
- Uses the photo icon in the web manifest.
- Uses photo-icon.js to replace the header brand icon at runtime without rewriting app.js.

After uploading/committing, test:
https://tpoirier1969.github.io/Lazy-Acres-Suite/?v=0.1.21#/dashboard

On iPhone, if the old Home Screen icon sticks, delete the old Home Screen shortcut and add it again from Safari after the new files are live.
