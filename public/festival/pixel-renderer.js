// Light blooms at quarter resolution while the native scene keeps crisp edges.
export function createPixelRenderer(THREE, renderer) {
  const type = renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const options = { type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, options);
  const bloomX = new THREE.WebGLRenderTarget(1, 1, { ...options, depthBuffer: false });
  const bloomY = new THREE.WebGLRenderTarget(1, 1, { ...options, depthBuffer: false });
  const screen = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const triangle = new THREE.BufferGeometry();
  triangle.setAttribute('position', new THREE.Float32BufferAttribute([-1,-1,0, 3,-1,0, -1,3,0], 3));
  const quad = new THREE.Mesh(triangle);
  quad.frustumCulled = false;
  screen.add(quad);
  const vertexShader = `
    varying vec2 coord;
    void main() {
      coord = position.xy * .5 + .5;
      gl_Position = vec4(position.xy, 0., 1.);
    }`;

  function blur(source, extract) {
    return new THREE.ShaderMaterial({
      uniforms: { source: { value: source }, stepUV: { value: new THREE.Vector2() } },
      defines: extract ? { EXTRACT: 1 } : {},
      depthWrite: false, depthTest: false, toneMapped: false, vertexShader,
      fragmentShader: `
        uniform sampler2D source;
        uniform vec2 stepUV;
        varying vec2 coord;
        vec3 sampleLight(float offset) {
          vec3 c = texture2D(source, coord + offset * stepUV).rgb;
          #ifdef EXTRACT
            float peak = max(c.r, max(c.g, c.b));
            c *= smoothstep(.62, 1.48, peak);
          #endif
          return min(c, vec3(5.));
        }
        void main() {
          vec3 c = sampleLight(0.) * .227027;
          c += (sampleLight(-1.384615) + sampleLight(1.384615)) * .316216;
          c += (sampleLight(-3.230769) + sampleLight(3.230769)) * .070270;
          gl_FragColor = vec4(c, 1.);
        }`,
    });
  }
  const horizontal = blur(sceneTarget.texture, true);
  const vertical = blur(bloomX.texture, false);
  const texel = new THREE.Vector2();
  const finish = new THREE.ShaderMaterial({
    uniforms: { source: { value: sceneTarget.texture }, bloom: { value: bloomY.texture }, texel: { value: texel } },
    depthWrite: false, depthTest: false, vertexShader,
    fragmentShader: `
      varying vec2 coord;
      uniform sampler2D source, bloom;
      uniform vec2 texel;
      float brightness(vec3 c) { return dot(c, vec3(.25,.58,.17)); }
      void main() {
        vec3 hdr = texture2D(source, coord).rgb;
        vec3 n = texture2D(source, coord + vec2(0.,texel.y)).rgb;
        vec3 s = texture2D(source, coord - vec2(0.,texel.y)).rgb;
        vec3 e = texture2D(source, coord + vec2(texel.x,0.)).rgb;
        vec3 w = texture2D(source, coord - vec2(texel.x,0.)).rgb;
        float dx = brightness(e) - brightness(w);
        float dy = brightness(n) - brightness(s);
        float contrast = max(abs(dx), abs(dy));
        // Soften stair steps along diagonals while preserving printed signs and textures.
        float diagonal = min(abs(dx), abs(dy)) / max(.001, contrast);
        hdr = mix(hdr, (n+s+e+w)*.25, diagonal * smoothstep(.04,.4,contrast) * .32);
        hdr += texture2D(bloom, coord).rgb * .17;
        gl_FragColor = vec4(hdr, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        vec3 rgb = gl_FragColor.rgb;
        float luma = brightness(rgb);
        rgb = mix(vec3(luma), rgb, 1.08);
        rgb += (1. - smoothstep(.04, .4, luma)) * vec3(.004,.004,.014);
        gl_FragColor = vec4(clamp(rgb, 0., 1.), 1.);
      }`,
  });
  renderer.domElement.style.imageRendering = 'auto';
  function drawPass(material, destination) {
    quad.material = material;
    renderer.setRenderTarget(destination);
    renderer.render(screen, camera);
  }
  return {
    resize(width, height) {
      const scale = Math.min(1, 1280 / width, 800 / height);
      const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
      const bw = Math.max(1, Math.ceil(w / 4)), bh = Math.max(1, Math.ceil(h / 4));
      sceneTarget.setSize(w, h);
      bloomX.setSize(bw, bh);
      bloomY.setSize(bw, bh);
      horizontal.uniforms.stepUV.value.set(1 / bw, 0);
      vertical.uniforms.stepUV.value.set(0, 1 / bh);
      texel.set(1 / w, 1 / h);
      renderer.setSize(w, h, false);
      return h;
    },
    draw(scene, view) {
      renderer.setRenderTarget(sceneTarget);
      renderer.render(scene, view);
      drawPass(horizontal, bloomX);
      drawPass(vertical, bloomY);
      drawPass(finish, null);
    },
  };
}
