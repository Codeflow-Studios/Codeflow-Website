export const festivalLights = {
  dark: '#020105',
  purple: '#410380',
  pink: '#fa2d82',
  yellow: '#dcf105',
};

// Shallow puddles on the midway pick up the light of the nearest stand.
export const puddles = [
  { x: -2.6, z: 32.7, width: 1.35, depth: 3.9, tint: festivalLights.yellow, angle: .18 },
  { x: 3.2, z: 21.2, width: .9, depth: 2.6, tint: festivalLights.yellow, angle: -.23 },
  { x: -2.1, z: 6.4, width: 1.7, depth: 3.4, tint: festivalLights.pink, angle: .39 },
  { x: 3.7, z: -6.6, width: 1.1, depth: 3.7, tint: festivalLights.pink, angle: .29 },
  { x: -4.4, z: -18.2, width: 2.8, depth: 1.6, tint: festivalLights.pink, angle: -.23 },
  { x: -23, z: 12, width: 3.8, depth: 1.3, tint: festivalLights.yellow, angle: -.19 },
  { x: -34.8, z: 10.2, width: 2.9, depth: 1.5, tint: festivalLights.yellow, angle: .29 },
  { x: 23.1, z: 10.2, width: 4.5, depth: 1.7, tint: festivalLights.pink, angle: -.25 },
  { x: 33.7, z: 12.3, width: 1.4, depth: 3, tint: festivalLights.pink, angle: .43 },
  { x: -12.8, z: 38.4, width: 2.7, depth: 1.1, tint: festivalLights.pink, angle: -.20 },
];

export function addGroundLight(THREE, scene) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
    uniforms: { time: { value: 0 }, shade: { value: new THREE.Color(festivalLights.purple) } },
    vertexShader: `
      varying vec2 point;
      varying vec3 tint;
      void main() {
        point = uv * 2.0 - 1.0;
        tint = instanceColor;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 point;
      varying vec3 tint;
      uniform float time;
      uniform vec3 shade;
      void main() {
        float edge = length(point) + .075*sin(point.x*13. + point.y*7.) + .045*cos(point.y*17.);
        float water = 1. - smoothstep(.78, .98, edge);
        float glint = pow(max(0., cos(point.x*9. + sin(point.y*8.)*.42)), 4.);
        glint *= .74 + .26*cos(point.y*21. + time*1.5);
        float centre = max(0., 1. - abs(point.y));
        vec3 reflection = mix(shade * .28, tint, .20 + glint*centre*.45);
        gl_FragColor = vec4(reflection, water*(.40 + glint*.17));
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, puddles.length);
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  for (const [i, puddle] of puddles.entries()) {
    transform.position.set(puddle.x,.018,puddle.z);
    transform.rotation.y = puddle.angle;
    transform.scale.set(puddle.width,1,puddle.depth);
    transform.updateMatrix();
    mesh.setMatrixAt(i,transform.matrix);
    mesh.setColorAt(i,color.set(puddle.tint));
  }
  mesh.name = 'Puddle light reflections';
  scene.add(mesh);
  return time => { material.uniforms.time.value = time; };
}
