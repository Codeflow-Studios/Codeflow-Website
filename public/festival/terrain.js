import { paths } from './layout.js';

const extent = 260;
const tau = 2 * Math.PI;
const wrap = (n, span) => ((n % span) + span) % span;

function randomSource(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Draw into a wrapped integer grid so a stroke can cross a tile's seam.
function raster(width, height, repeatY = false) {
  const bytes = new Uint8Array(width * height * 4);
  function pixel(x, y, rgb) {
    x = wrap(Math.floor(x), width);
    y = Math.floor(y);
    if (repeatY) y = wrap(y, height);
    if (y < 0 || y >= height) return;
    const i = 4 * (x + y * width);
    bytes[i] = (rgb >> 16) & 255;
    bytes[i + 1] = (rgb >> 8) & 255;
    bytes[i + 2] = rgb & 255;
    bytes[i + 3] = 255;
  }
  function rect(x, y, w, h, color) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pixel(x + i, y + j, color);
  }
  function polygon(vertices, color) {
    const ys = vertices.map(v => v[1]);
    for (let row = Math.floor(Math.min(...ys)); row < Math.ceil(Math.max(...ys)); row++) {
      const scan = row + .5;
      const hits = [];
      for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const [x0, y0] = vertices[j], [x1, y1] = vertices[i];
        if ((y0 > scan) !== (y1 > scan)) hits.push(x0 + (scan - y0) * (x1 - x0) / (y1 - y0));
      }
      hits.sort((a, b) => a - b);
      for (let i = 0; i + 1 < hits.length; i += 2) {
        const x = Math.ceil(hits[i] - .5);
        rect(x, row, Math.ceil(hits[i + 1] - .5) - x, 1, color);
      }
    }
  }
  return { bytes, width, height, pixel, rect, polygon };
}

function asTexture(THREE, image, tile = false) {
  const texture = new THREE.DataTexture(image.bytes, image.width, image.height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = tile ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = tile ? THREE.NearestMipmapNearestFilter : THREE.NearestFilter;
  texture.generateMipmaps = tile;
  texture.needsUpdate = true;
  return texture;
}

function groundTiles(THREE) {
  const random = randomSource(0x434f4153);
  const grass = raster(112, 112, true);
  const track = raster(112, 112, true);
  grass.rect(0, 0, 112, 112, 0x447467);
  track.rect(0, 0, 112, 112, 0xb08670);

  // Flat islands of nearby shades form larger connected masses beneath the small details.
  for (let i = 0; i < 47; i++) {
    const x = Math.floor(random() * 112), y = Math.floor(random() * 112);
    const w = 4 + Math.floor(random() * 15), h = 2 + Math.floor(random() * 5);
    const patch = [[x,y+1],[x+3,y],[x+w-3,y],[x+w,y+2],[x+w-2,y+h],[x+4,y+h+1],[x,y+h-1]];
    grass.polygon(patch, i % 3 ? 0x48786b : 0x3f6e63);
    track.polygon(patch, i % 3 ? 0xb78d75 : 0xa9816d);
  }
  for (let i = 0; i < 74; i++) {
    const x = Math.floor(random() * 112), y = Math.floor(random() * 112);
    const h = 2 + Math.floor(random() * 4);
    const foot = [[x-2,y],[x-3,y-3],[x-1,y-2],[x,y],[x+1,y-h],[x+2,y-h-1],[x+2,y],[x+5,y-2],[x+4,y+1],[x,y+2]];
    grass.polygon(foot, i % 3 ? 0x345e57 : 0x3a665b);
    grass.rect(x+1,y-h+1,1,Math.max(1,h-1),i % 3 ? 0x63916e : 0x729875);
    grass.rect(x+3,y-1,2,1,0x57886b);
  }
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(random() * 112), y = Math.floor(random() * 112);
    const petals = i % 2 ? [0xd5b5c2,0xb18bb5] : [0xe1cb9c,0xd5a777];
    for (let n = 0; n < 2 + i % 3; n++) {
      const xx = x + Math.floor(random() * 7), yy = y + Math.floor(random() * 5);
      grass.rect(xx, yy, 1, 3, 0x315f51);
      grass.rect(xx-1, yy-1, 3, 1, petals[1]);
      grass.pixel(xx, yy-2, petals[0]);
      grass.pixel(xx, yy-1, 0xf3dca6);
    }
  }
  for (let i = 0; i < 55; i++) {
    const x = Math.floor(random() * 112), y = Math.floor(random() * 112);
    const w = 1 + Math.floor(random() ** 2 * 5);
    track.rect(x + 1,y + 1,w,1,0x947269);
    track.rect(x,y,w + 1,1,i % 3 ? 0xc89e82 : 0x9a8179);
    if (w > 2) {
      track.rect(x+1,y-1,w-1,1,0xd5ae90);
      track.pixel(x + w,y,0xb1917e);
    }
  }
  return { grass: asTexture(THREE,grass,true), earth: asTexture(THREE,track,true) };
}

function drawCloud(sky, x, y, width, depth, distant = false) {
  const outline = [[0,.72],[.10,.69],[.16,.51],[.30,.50],[.36,.24],[.44,.28],[.50,0],
    [.62,.05],[.68,.31],[.77,.34],[.81,.52],[.92,.55],[1,.78],[.87,.83],[.77,.96],[.44,.90],[.31,1],[.07,.91]];
  const crown = [[.12,.70],[.30,.49],[.36,.24],[.44,.28],[.50,0],[.62,.05],[.68,.31],
    [.77,.34],[.79,.46],[.64,.42],[.56,.28],[.46,.43],[.36,.44],[.31,.60]];
  const under = [[.24,.84],[.43,.70],[.58,.76],[.71,.66],[.84,.71],[.92,.63],[1,.78],[.86,.83],[.77,.96],[.46,.89]];
  function shape(vertices, color) {
    sky.polygon(vertices.map(([u,v])=>[x+u*width,y+v*depth]), color);
  }
  shape(outline, distant ? 0xb68899 : 0x877d9f);
  shape(crown, distant ? 0xf6b59e : 0xd69da5);
  shape(under, distant ? 0x9e7e97 : 0x716c94);
  sky.rect(x+width*.12,y+depth*.83,Math.max(3,Math.floor(width*.19)),1,distant ? 0xe9a69a : 0xb98ca0);
}

function duskPanorama(THREE) {
  const sky = raster(768,384);
  const random = randomSource(0x5457494c);
  const stops = [
    [0,0x202747],[69,0x36385f],[109,0x53507b],[134,0x76628d],[153,0xa27b9c],
    [165,0xc68b9f],[177,0xeaa798],[186,0xffc298],[197,0xd8a4a4],[215,0x7a7288],[384,0x384554],
  ];
  for (let s = 1; s < stops.length; s++) {
    const [y0,c0] = stops[s-1], [y1,c1] = stops[s];
    for (let y=y0; y < y1; y++) {
      const t = Math.floor((y-y0)/(y1-y0)*24)/24;
      let rgb = 0;
      for (const shift of [16,8,0]) {
        const a = (c0 >> shift) & 255, b = (c1 >> shift) & 255;
        rgb |= Math.round(a+(b-a)*t) << shift;
      }
      sky.rect(0,y,sky.width,1,rgb);
    }
  }
  for (let i=0; i<110; i++) {
    const x = Math.floor(random()*sky.width), y = 54+Math.floor(random()*83);
    sky.pixel(x,y, i % 4 ? 0x9c93b2 : 0xe2c7b9);
    if (i % 27 === 0) {
      sky.rect(x-1,y,3,1,0xb9a4ba);
      sky.rect(x,y-1,1,3,0xd5bcc3);
    }
  }
  // The sunset is west of the main stage. Three thin atmospheric bands clip the lower disk.
  const sunX = 613, sunY = 168;
  for (let y = -10; y <= 10; y++) {
    const half = Math.floor(Math.sqrt(10.4**2 - y*y));
    if (y === 6 || y === 9) continue;
    sky.rect(sunX-half,sunY+y,half*2+1,1,y < 0 ? 0xffebbb : y < 5 ? 0xffdb9d : 0xffca92);
  }
  for (const [x,y,w,h] of [[535,153,48,8],[633,157,62,9],[671,144,41,8],[489,166,23,4],
    [714,169,44,6],[21,152,64,9],[131,163,53,7],[234,147,76,11],[341,160,48,7],[412,168,69,7],
    [73,127,40,7],[315,137,31,6],[466,142,26,5]]) drawCloud(sky,x,y,w,h,y>=158);
  sky.polygon([[550,148],[573,143],[580,142],[563,147],[552,149]],0xdfa6af);
  sky.polygon([[556,150],[574,146],[562,150]],0xc397a8);
  sky.polygon([[170,148],[193,141],[198,140],[177,147]],0xd9a2ab);

  function ridge(base, color, first, second, phase) {
    for (let x=0; x<sky.width; x++) {
      const a=x/sky.width*tau;
      const y=Math.floor(base+Math.sin(a*first+phase)*3.4+Math.sin(a*second+.9)*2.2+Math.cos(a*19+phase)*.9);
      sky.rect(x,y,1,sky.height-y,color);
    }
  }
  ridge(186,0xb38c9f,4,11,1.7);
  ridge(191,0x948197,6,13,1.1);
  ridge(195,0x776f88,3,9,2.4);
  for(let x=0; x<sky.width; x+=2+Math.floor(random()*4)) {
    const y=197+Math.floor(Math.sin(x/sky.width*tau*7)*1.7);
    const h=2+Math.floor(random()*5);
    sky.polygon([[x-2,y+2],[x,y-h],[x+2,y+2]],0x6b697e);
  }
  ridge(199,0x626475,5,12,.2);
  return asTexture(THREE,sky);
}

function pathMask(THREE) {
  const size = 1024;
  const pixels = new Uint8Array(size*size);
  const step = extent/size;
  for (const path of paths) {
    const rounding = Math.min(2,path.depth*.23,path.width*.23);
    const left = Math.max(0,Math.floor((path.x-path.width/2-1)/step+size/2));
    const right = Math.min(size-1,Math.ceil((path.x+path.width/2+1)/step+size/2));
    const top = Math.max(0,Math.floor(size/2-(path.z+path.depth/2+1)/step));
    const bottom = Math.min(size-1,Math.ceil(size/2-(path.z-path.depth/2-1)/step));
    for (let row=top; row<=bottom; row++) for (let col=left; col<=right; col++) {
      const x=(col+.5-size/2)*step, z=(size/2-row-.5)*step;
      const u=Math.abs(x-path.x)-path.width/2+rounding, v=Math.abs(z-path.z)-path.depth/2+rounding;
      const edge=Math.sin(z*1.12+x*.72)*.13+Math.cos(x*2.7-z*1.8)*.09;
      const distance=Math.hypot(Math.max(u,0),Math.max(v,0))+Math.min(Math.max(u,v),0)-rounding+edge;
      const coverage=distance<-.2 ? 255 : distance<.07 ? 158 : distance<.29 ? 67 : 0;
      const i=row*size+col;
      pixels[i]=Math.max(pixels[i],coverage);
    }
  }
  const texture=new THREE.DataTexture(pixels,size,size,THREE.RedFormat);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate=true;
  return texture;
}

export function addTerrain(THREE, scene) {
  const {grass,earth}=groundTiles(THREE);
  const trails=pathMask(THREE);
  const material=new THREE.MeshLambertMaterial({ map:grass });
  material.onBeforeCompile=shader=>{
    shader.uniforms.festivalEarth={value:earth};
    shader.uniforms.festivalTrail={value:trails};
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
        uniform sampler2D festivalEarth;
        uniform sampler2D festivalTrail;`)
      .replace('#include <map_fragment>',`
        vec3 meadow = texture2D(map,vMapUv*17.0).rgb;
        vec3 earth = texture2D(festivalEarth,vMapUv*21.0).rgb;
        float mask = texture2D(festivalTrail,vMapUv).r;
        vec3 shade = mix(meadow, meadow*0.72, step(0.15,mask));
        shade = mix(shade, earth*vec3(0.78,0.79,0.82),step(0.45,mask));
        diffuseColor.rgb *= mix(shade,earth,step(0.85,mask));`)
      .replace('#include <opaque_fragment>',`
        outgoingLight += diffuseColor.rgb * 0.23;
        #include <opaque_fragment>`);
  };
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(extent,extent),material);
  ground.rotation.x=-Math.PI/2;
  ground.receiveShadow=true;
  scene.add(ground);

  // Use the panorama directly on the dome. A reflection conversion would soften pixel edges.
  const sky=duskPanorama(THREE);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(145,64,32),new THREE.MeshBasicMaterial({
    map:sky,side:THREE.BackSide,depthTest:false,depthWrite:false,fog:false,toneMapped:false,
  }));
  dome.name='Pixel dusk';
  dome.renderOrder=-100;
  dome.frustumCulled=false;
  dome.onBeforeRender=(_renderer,_scene,camera)=>{
    dome.matrixWorld.copyPosition(camera.matrixWorld);
  };
  scene.add(dome);
  const reflections=sky.clone();
  reflections.mapping=THREE.EquirectangularReflectionMapping;
  reflections.needsUpdate=true;
  scene.environment=reflections;
  scene.environmentIntensity=.26;
}
