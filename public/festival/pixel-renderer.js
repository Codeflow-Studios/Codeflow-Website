// Work at the game's native pixel grid. The lookup texture keeps the entire
// frame, including additive stage lights, inside the same illustrated palette.
const swatches = [
  '191728', '252035', '302943', '443653', '554269', '70567e', '937095', 'be92ad',
  '242a40', '303951', '40516a', '526884', '748aa1', '9eadbb', 'c7ced0', 'f4eee0',
  '283e48', '315950', '3d7160', '539275', '75b881', '9bd38a', 'c5e997', 'e6f7ba',
  '364438', '525d40', '72784a', '949356', 'b6ab66', 'd6cd83', 'f3e5a0', 'fff5cc',
  '503346', '734453', '95575f', 'b76f6c', 'd98776', 'eda681', 'f8c29a', 'f7dac0',
  '382e3d', '56404a', '715052', '8d645e', 'a8806d', 'c39b82', 'ddbaa0', 'efcfb4',
  '4b365e', '66477d', '805b9d', '9c76b9', 'bd95d7', 'ddbbea', '51344d', 'a64671', 'e17195',
  '214657', '296775', '368994', '57a8a8', '88d4c4', 'b6ebd0', 'edb861', 'ffdb79',
  '3c4246', '48474b', '715854', '82645c', '886863', 'a88979', '485b52', '4c6b60',
  '5a7769', '69616b', '967d93', 'cc9ea8', 'e1ad9b', 'f1cba9',
];

function colorLookup(THREE) {
  const colors = swatches.map(hex => [0, 2, 4].map(start => parseInt(hex.slice(start, start + 2), 16)));
  const size = 32;
  const pixels = new Uint8Array(size ** 3 * 4);
  for (let b = 0; b < size; b++) for (let g = 0; g < size; g++) for (let r = 0; r < size; r++) {
    const red = r * 255 / (size - 1), green = g * 255 / (size - 1), blue = b * 255 / (size - 1);
    let distance = Infinity, closest = colors[0];
    for (const color of colors) {
      const dr = color[0] - red, dg = color[1] - green, db = color[2] - blue;
      const error = .30 * dr * dr + .52 * dg * dg + .18 * db * db;
      if (error < distance) { closest = color; distance = error; }
    }
    const index = (g * size * size + b * size + r) * 4;
    pixels.set(closest, index);
    pixels[index + 3] = 255;
  }
  const lookup = new THREE.DataTexture(pixels, size * size, size);
  lookup.minFilter = lookup.magFilter = THREE.NearestFilter;
  lookup.needsUpdate = true;
  return lookup;
}

export function createPixelRenderer(THREE, renderer) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType,
    magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter,
  });
  const pass = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const ink = new THREE.ShaderMaterial({
    uniforms: { source: { value: target.texture }, palette: { value: colorLookup(THREE) } },
    depthTest: false, depthWrite: false,
    vertexShader: `
      varying vec2 sampleUV;
      void main() {
        sampleUV = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D source;
      uniform sampler2D palette;
      varying vec2 sampleUV;
      void main() {
        gl_FragColor = texture2D(source, sampleUV);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        vec3 rgb = gl_FragColor.rgb;
        float luma = dot(rgb, vec3(.27, .55, .18));
        rgb = mix(vec3(luma), rgb, 1.14);
        vec2 cell = mod(floor(gl_FragCoord.xy), 2.0);
        float checker = mod(cell.x + cell.y, 2.0) * .5 + cell.y * .25 - .375;
        vec3 key = floor(clamp(rgb + checker * .019, 0.0, 1.0) * 31.0 + .5);
        vec2 lookupUV = (vec2(key.x + key.z * 32.0, key.y) + .5) / vec2(1024.0, 32.0);
        gl_FragColor = vec4(texture2D(palette, lookupUV).rgb, 1.0);
      }`,
  });
  pass.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ink));
  renderer.domElement.style.imageRendering = 'pixelated';
  return {
    resize(width, height) {
      // Integer scaling gives each game pixel an even footprint on the screen.
      const pixelSize = Math.max(1, Math.min(Math.floor(width / 180),
        Math.max(2, Math.round(Math.max(width, height) / 760))));
      const w = Math.ceil(width / pixelSize), h = Math.ceil(height / pixelSize);
      target.setSize(w, h);
      renderer.setSize(w, h, false);
      return h;
    },
    draw(scene, view) {
      renderer.setRenderTarget(target);
      renderer.render(scene, view);
      renderer.setRenderTarget(null);
      renderer.render(pass, camera);
    },
  };
}
