// A shared evergreen crown. Each drooping branch has an upper face that catches
// the light and a darker underside. Trees reuse this mesh in a single batch.
export function spruceCrown(THREE) {
  const positions = [], colors = [];
  const face = (a, b, c, tint) => {
    positions.push(...a, ...b, ...c);
    for (const point of [a,b,c]) colors.push(tint * .53, tint, tint * .77);
  };
  for (let level = 0; level < 9; level++) {
    const y = .16 + level * .09;
    const span = .38 * (1 - level / 10);
    const branches = 13 - Math.floor(level / 2);
    for (let i = 0; i < branches; i++) {
      const a = 2 * Math.PI * i / branches + level * 2.314;
      const r = span * (.9 + .13 * Math.sin(a * 3 + level));
      const end = [Math.cos(a) * r, y - .062, Math.sin(a) * r];
      const left = [Math.cos(a - .37) * r * .65, y - .015, Math.sin(a - .37) * r * .65];
      const right = [Math.cos(a + .37) * r * .65, y, Math.sin(a + .37) * r * .65];
      const ridge = [Math.cos(a) * r * .52, y + .070, Math.sin(a) * r * .52];
      const trunk = [0, y + .22 - .007 * level, 0];
      const tint = .46 + .16 * Math.sin(i * 1.61 + level) + level * .021;
      face(trunk, ridge, left, tint);
      face(trunk, right, ridge, tint * 1.19);
      face(left, ridge, end, tint * 1.04);
      face(ridge, right, end, tint * 1.15);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  return geometry;
}

export function festoonGlow(THREE, scene, bulbs, color) {
  const points = new THREE.BufferGeometry();
  points.setAttribute('position', new THREE.Float32BufferAttribute(bulbs,3));
  const material = new THREE.ShaderMaterial({
    uniforms: { screenHeight: { value: 800 }, tint: { value: new THREE.Color(color) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float screenHeight;
      void main(){
        vec4 p = modelViewMatrix * vec4(position,1.);
        gl_Position = projectionMatrix * p;
        gl_PointSize = clamp(screenHeight * .54 / max(1., -p.z), 3., 110.);
      }`,
    fragmentShader: `
      uniform vec3 tint;
      void main(){
        float r = length(gl_PointCoord*2.-1.);
        if(r>=1.) discard;
        float a = .34 * exp(-4.8*r*r) * (1.-smoothstep(.55,1.,r));
        gl_FragColor = vec4(tint, a);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Points(points, material);
  mesh.renderOrder = 2;
  scene.add(mesh);
  return pixels => { material.uniforms.screenHeight.value = pixels; };
}
