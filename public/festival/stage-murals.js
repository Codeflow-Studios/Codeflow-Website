// World-space arcade marquees drawn on their original pixel grid.
export function drawMarquee(venue) {
  const width = 128, height = 56;
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  const ctx = canvas.getContext('2d');
  const paint = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  function line(color, x, y, endX, endY, weight = 1) {
    const steps = Math.max(1, Math.abs(endX - x), Math.abs(endY - y));
    for (let n = 0; n <= steps; n++) {
      paint(color, Math.round(x + (endX - x) * n / steps), Math.round(y + (endY - y) * n / steps), weight, weight);
    }
  }
  function sun(x, y, r, light, shadow) {
    for (let row = -r; row <= r; row++) {
      const span = Math.floor(Math.sqrt(r * r - row * row));
      if (row > r / 2 && row % 4 === 2) continue;
      paint(row > r / 3 ? shadow : light, x - span, y + row, span * 2, 1);
    }
  }
  const dark = '#1e1830';
  if (venue === 'dixie') {
    paint('#362343', 0, 0, width, height);
    for (let i = 0; i < 6; i++) {
      const x = 4 + 20 * i;
      paint('#6a4d78', x, 11, 17, 33);
      paint('#272137', x + 2, 16, 13, 25);
      paint('#ffacd4', x + 6, 18, 5, 2);
    }
    for (let i = 0; i < 8; i++) {
      const x = 29 + i * 11, y = 39 - i * 2;
      paint('#c2aaca', x, y, 8, 7);
      paint('#18152a', x + 1, y, 6, 2);
    }
  } else if (venue === 'crowd') {
    paint('#254955', 0, 0, width, height);
    for (let n = -55; n < 160; n += 13) line('#2d6468', n, 49, Math.round(61 + (n - 61) * .48), 1, 3);
    sun(67, 23, 22, '#d9f391', '#94d08d');
    // Hands pass the singer across two rows of silhouetted festivalgoers.
    for (let i = 0; i < 17; i++) {
      const x = i * 8 - 2, y = 38 + Math.round(Math.sin(i * 2.1) * 3);
      const color = i % 3 ? '#326c69' : '#619477';
      paint(color, x, y, 5, 7); paint(color, x - 1, y + 5, 8, 13);
      line(color, x + 4, y + 8, x + 8, y - 4, 2); paint(color, x + 7, y - 7, 1, 4);
    }
    line(dark, 24, 29, 46, 33, 5); line(dark, 23, 25, 37, 29, 5);
    line('#677292', 29, 27, 51, 31, 5); line('#3b425d', 29, 31, 52, 32, 4);
    line(dark, 45, 30, 73, 22, 9); line('#e28479', 48, 30, 70, 24, 6);
    line('#f5b587', 56, 29, 72, 24, 2);
    line(dark, 63, 24, 56, 14, 3); line('#ffce93', 65, 23, 58, 14, 2);
    paint(dark, 71, 18, 11, 9); paint('#e39275', 73, 20, 7, 5);
    paint('#50344f', 73, 16, 10, 4); paint('#513750', 80, 20, 3, 4);
    line(dark, 77, 26, 90, 23, 2); paint(dark, 89, 21, 4, 3);
    for (let i = 0; i < 14; i++) {
      const x = i * 10 - 1, y = 46 + Math.round(Math.cos(i * 1.7) * 3);
      paint(dark, x + 1, y, 6, 7); paint(dark, x, y + 6, 9, 9);
      line(dark, x + 3, y + 5, x - 3, y - 6, 2); paint(dark, x - 4, y - 8, 1, 3);
    }
  } else if (venue === 'fighters') {
    paint('#71394f', 0, 0, width, height);
    for (let i = 0; i < 14; i++) line(i % 2 ? '#a34c5d' : '#bd6260', i * 13 - 20, 55, i * 13 + 7, 0, 4);
    const fighter = (mirror, jacket, trim) => {
      const rect = (color, x, y, w, h) => paint(color, mirror ? width - x - w : x, y, w, h);
      rect(dark, 3, 39, 48, 17); rect(jacket, 7, 41, 40, 15);
      rect(dark, 14, 11, 20, 31); rect(dark, 23, 18, 15, 16);
      rect('#ae685e', 17, 18, 17, 18); rect('#efac81', 23, 20, 11, 12);
      rect('#ffd298', 31, 25, 7, 4); rect(dark, 27, 22, 7, 2); rect('#f7e3b0', 31, 24, 2, 1);
      rect(trim, 13, 13, 20, 6); rect(trim, 6, 15, 8, 3);
      rect(dark, 38, 31, 16, 17); rect(jacket, 39, 32, 14, 12);
      rect(trim, 40, 32, 10, 3); rect('#f0be99', 38, 44, 10, 4);
      rect(trim, 13, 43, 3, 12); rect(jacket, 9, 50, 29, 6);
    };
    fighter(false, '#418d92', '#a6e1c6');
    fighter(true, '#a64969', '#ffbb78');
    line('#fff0ac', 70, 5, 58, 27, 4); paint('#ffe297', 60, 25, 9, 4); line('#ffdf98', 66, 29, 57, 48, 3);
  } else {
    paint('#393054', 0, 0, width, height);
    sun(64, 21, 19, '#df9ac3', '#a86da1');
    for (let i = 0; i < 32; i++) {
      const x = (i * 47) % width, y = (i * 17) % 27;
      if (Math.abs(x - 64) > 24) paint('#f5dcb7', x, y, i % 7 === 0 ? 3 : 1, 1);
    }
    for (let i = 0; i < 24; i++) {
      const y = 23 + (i * 7) % 11;
      paint('#333450', i * 6 - 2, y, 7, 37 - y);
      paint('#987ca5', i * 6 + 1, y + 2, 2, 1);
    }
    paint('#28243e', 0, 37, width, 19);
    for (let i = -4; i < 6; i++) line('#845c93', 64, 28, i * 26, 55);
    [39, 44, 53].forEach(y => paint('#7d5f92', 0, y, width, 1));
    // Synthesizer-shaped flyer with stepped wings and a bright exhaust trail.
    line('#f2acbd', 12, 38, 48, 30, 2); line('#805daa', 17, 40, 49, 32, 2);
    line('#1e2037', 43, 30, 85, 23, 6); line('#7fdac7', 46, 29, 86, 23, 3);
    line('#c9ede1', 48, 29, 76, 25, 1); line('#9779c6', 54, 31, 63, 38, 3);
    line('#36465d', 63, 24, 68, 17, 3); paint('#bca5db', 68, 17, 7, 6);
    line('#eee1c7', 74, 18, 82, 22, 2);
  }
  return canvas;
}

export function stageMural(THREE, venue) {
  const texture = new THREE.CanvasTexture(drawMarquee(venue));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  return texture;
}
