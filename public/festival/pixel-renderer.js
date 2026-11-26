// Composite the console-style scene at a fixed resolution. A three-sample
// edge filter blends polygon silhouettes while flat areas keep their texture.
export function createPixelRenderer(THREE, renderer) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  });
  const pass = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const texel = new THREE.Vector2();
  const finish = new THREE.ShaderMaterial({
    uniforms: { source: { value: target.texture }, texel: { value: texel } },
    depthTest: false, depthWrite: false,
    vertexShader: `
      varying vec2 sampleUV;
      void main() {
        sampleUV = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D source;
      uniform vec2 texel;
      varying vec2 sampleUV;
      vec3 bright(vec2 offset) {
        vec3 light = texture2D(source, sampleUV + offset * texel).rgb;
        return clamp(light - .84, 0., 2.2);
      }
      void main() {
        vec3 hdr = texture2D(source, sampleUV).rgb;
        vec3 left = texture2D(source, sampleUV - vec2(texel.x, 0.)).rgb;
        vec3 right = texture2D(source, sampleUV + vec2(texel.x, 0.)).rgb;
        vec3 edge = abs(left - right);
        float coverage = .15 * smoothstep(.08, .60, max(edge.r, max(edge.g, edge.b)));
        hdr = mix(hdr, (left + right) * .5, coverage);
        vec3 halo = bright(vec2(2., 0.)) + bright(vec2(-2., 0.))
                  + bright(vec2(0., 2.)) + bright(vec2(0., -2.));
        gl_FragColor = vec4(hdr + halo * .045, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        vec3 rgb = gl_FragColor.rgb;
        float luma = dot(rgb, vec3(.26, .56, .18));
        rgb = mix(vec3(luma), rgb, 1.13);
        float shade = 1. - smoothstep(.06, .47, luma);
        float warm = smoothstep(.56, .94, luma);
        rgb += shade * vec3(.014, .003, .028) + warm * vec3(.012, .004, -.008);
        gl_FragColor = vec4(clamp(rgb, 0., 1.), 1.);
      }`,
  });
  pass.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), finish));
  renderer.domElement.style.imageRendering = 'pixelated';
  return {
    resize(width, height) {
      const pixelSize = Math.max(1, Math.min(Math.floor(width / 200), Math.round(Math.max(width, height) / 630)));
      const w = Math.ceil(width / pixelSize), h = Math.ceil(height / pixelSize);
      target.setSize(w, h);
      texel.set(1 / w, 1 / h);
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
