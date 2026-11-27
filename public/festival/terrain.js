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

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = t => t*t*(3-2*t);
const mix = (a,b,t) => a+(b-a)*t;
function blendRGB(a,b,t) {
  return (Math.round(mix(a>>16,b>>16,t))<<16) |
    (Math.round(mix((a>>8)&255,(b>>8)&255,t))<<8) | Math.round(mix(a&255,b&255,t));
}

// Periodic value noise keeps both the panoramic horizon and ground tiles seamless.
function noiseField(seed) {
  const random = randomSource(seed);
  const field = Float32Array.from({length:4096},random);
  return (x,y,period=64) => {
    const ix=Math.floor(x), iy=Math.floor(y), u=smooth(x-ix), v=smooth(y-iy);
    const a=wrap(ix,period), b=(a+1)%period, row=(iy&63)*64, next=((iy+1)&63)*64;
    return mix(mix(field[row+a],field[row+b],u),mix(field[next+a],field[next+b],u),v);
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
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = tile ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  texture.anisotropy = tile ? 4 : 1;
  texture.generateMipmaps = tile;
  texture.needsUpdate = true;
  return texture;
}

// Seeded, tileable surfaces shared by the 3D world and the overhead fallback.
const surfaceTiles = new Map();
function paintSurface(kind) {
  if (surfaceTiles.has(kind)) return surfaceTiles.get(kind);
  const size = 256;
  const random = randomSource(kind === 'grass' ? 0x434f4153 : kind === 'earth' ? 0x50544853 : 0x4445434b);
  const noise = noiseField(kind === 'grass' ? 0x35616d65 : 0x574f4f44);
  const tile = raster(size, size, true);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const patches = noise(u * 8, v * 8, 8);
    const flecks = noise(u * 32, v * 32, 32);
    const grain = random();
    if (kind === 'deck') {
      const plank = Math.floor(y / 32);
      const fibre = noise(u * 8, v * 64, 8);
      const joint = y % 32;
      const stain = clamp(.15 + fibre * .36 + noise(plank, .3, 8) * .28 + grain * .10);
      const shade = blendRGB(0x363344, 0x837990, stain);
      tile.pixel(x,y,joint === 0 ? 0x292539 : joint === 1 ? blendRGB(shade,0xa299ab,.36) : shade);
    } else if (kind === 'grass') {
      const shade = clamp(.16 + patches * .54 + flecks * .18 + grain * .13);
      tile.pixel(x,y,blendRGB(0x2d514f,0x75906a,shade));
    } else {
      const shade = clamp(.16 + patches * .45 + flecks * .18 + grain * .21);
      tile.pixel(x,y,blendRGB(0x806252,0xc2a688,shade));
    }
  }
  if (kind === 'grass') {
    for (let i = 0; i < 530; i++) {
      const x = random() * size, y = random() * size, height = 2 + random() * 5;
      const lean = random() < .5 ? -1 : 1;
      const light = i % 5 ? 0x6d9269 : 0x91a67b;
      tile.polygon([[x-1,y+1],[x+2,y+1],[x+lean*3,y-height]],0x345b51);
      tile.polygon([[x,y],[x+1.5,y],[x+lean*3,y-height]],light);
    }
    for (let i = 0; i < 19; i++) {
      const x = random()*size, y = random()*size;
      const petal = i % 3 ? 0xd5b0c5 : 0xe2ca95;
      tile.rect(x-1,y,3,1,petal);
      tile.rect(x,y-1,1,3,petal);
      tile.pixel(x,y,0xf1ddd0);
    }
  } else if (kind === 'earth') {
    for (let i = 0; i < 470; i++) {
      const x = random()*size, y = random()*size, radius = .8+random()**2*3.8;
      tile.polygon([[x-radius,y],[x,y-radius*.65],[x+radius,y],[x+radius*.6,y+radius*.7],[x-radius*.6,y+radius*.7]],i%3?0x987969:0x7e665c);
      tile.rect(x-radius*.55,y-1,Math.max(1,radius),1,i%4?0xc1a58f:0xa99282);
    }
  } else {
    for (let y = 16; y < size; y += 32) {
      const seam = (y * 5) % size;
      tile.rect(seam,y-14,1,29,0x4a4357);
      for (const offset of [-4,5]) {
        tile.pixel(seam+offset,y-9,0xa79bab);
        tile.pixel(seam+offset,y-8,0x282436);
        tile.pixel(seam+offset,y+9,0xa79bab);
        tile.pixel(seam+offset,y+10,0x282436);
      }
    }
  }
  surfaceTiles.set(kind,tile);
  return tile;
}

export function makeFestivalSurfaceCanvas(kind) {
  const tile = paintSurface(kind);
  const canvas = Object.assign(document.createElement('canvas'),{width:tile.width,height:tile.height});
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(tile.width,tile.height);
  image.data.set(tile.bytes);
  ctx.putImageData(image,0,0);
  return canvas;
}

export function makeDeckMaterial(THREE,width,depth) {
  const texture = asTexture(THREE,paintSurface('deck'),true);
  texture.repeat.set(width/5,depth/5);
  return new THREE.MeshStandardMaterial({map:texture,roughness:.79,metalness:.06});
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
      const coverage=Math.round(255*smooth(clamp((.39-distance)/.84)));
      const i=row*size+col;
      pixels[i]=Math.max(pixels[i],coverage);
    }
  }
  const texture=new THREE.DataTexture(pixels,size,size,THREE.RedFormat);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate=true;
  return texture;
}

function meadowSurface(THREE) {
  const plane=new THREE.PlaneGeometry(extent,extent,72,72);
  const pos=plane.attributes.position;
  const colors=[], noise=noiseField(0x416d6265);
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i), z=-pos.getY(i);
    const n=noise(x*.058,z*.058)*.65+noise(x*.15,z*.15)*.35;
    colors.push(.79+n*.29,.83+n*.22,.84+n*.19);
  }
  plane.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  return plane;
}

// Opaque folded leaves keep the verge dimensional without per-plant draw calls or overdraw.
function meadowClumps(THREE,trails) {
  const random=randomSource(0x416d6265);
  const foliage=[], tints=[], swatches=[0x4e805b,0x659263,0x719563,0x809f6e];
  const color=new THREE.Color();
  const {width,data}=trails.image;
  const trackAt=(x,z)=>data[Math.floor((.5-z/extent)*width)*width+Math.floor((.5+x/extent)*width)];
  function triangle(vertices, tint, shade) {
    foliage.push(...vertices);
    color.setHex(tint).multiplyScalar(shade);
    for(let v=0;v<3;v++) tints.push(color.r,color.g,color.b);
  }
  for(let i=0;i<920;i++) {
    const x=(random()-.5)*104, z=(random()-.5)*88;
    if(trackAt(x,z)>0) continue;
    const besideTrail=trackAt(x-1.6,z)||trackAt(x+1.6,z)||trackAt(x,z-1.6)||trackAt(x,z+1.6);
    if(!besideTrail && random()>.39) continue;
    const bladeCount=4+Math.floor(random()*4);
    const tint=swatches[Math.floor(random()*swatches.length)];
    for(let b=0;b<bladeCount;b++) {
      const a=random()*tau, spread=.48*random();
      const bx=x+Math.cos(a)*spread,bz=z+Math.sin(a)*spread;
      const span=.038+random()*.073,h=.15+random()*.30, lean=h*(.35+random()*.63);
      const dx=Math.cos(a)*span,dz=Math.sin(a)*span;
      const tipX=bx+Math.sin(a)*lean,tipZ=bz-Math.cos(a)*lean;
      const ridgeX=bx+Math.sin(a)*span*.53,ridgeZ=bz-Math.cos(a)*span*.53;
      triangle([bx-dx,.012,bz-dz,ridgeX,.06,ridgeZ,tipX,h,tipZ],tint,.72);
      triangle([ridgeX,.06,ridgeZ,bx+dx,.012,bz+dz,tipX,h,tipZ],tint,1.08);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(foliage,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(tints,3));
  const plants=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));
  plants.name='Grass at the verge';
  return plants;
}

export function addTerrain(THREE, scene) {
  const grass=asTexture(THREE,paintSurface('grass'),true);
  const earth=asTexture(THREE,paintSurface('earth'),true);
  const trails=pathMask(THREE);
  const material=new THREE.MeshStandardMaterial({map:grass,vertexColors:true,roughness:.96,metalness:0});
  material.onBeforeCompile=shader=>{
    shader.uniforms.festivalEarth={value:earth};
    shader.uniforms.festivalTrail={value:trails};
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
        uniform sampler2D festivalEarth;
        uniform sampler2D festivalTrail;`)
      .replace('#include <map_fragment>',`
        vec3 meadow = texture2D(map,vMapUv*29.0).rgb;
        vec3 earth = texture2D(festivalEarth,vMapUv*34.0).rgb;
        float variation = texture2D(map,vec2(vMapUv.y,-vMapUv.x)*6.0 + .37).g;
        meadow *= .88 + variation*.48;
        earth *= .92 + variation*.36;
        float mask = texture2D(festivalTrail,vMapUv).r;
        float edge = smoothstep(.05,.97,mask + (meadow.g - .16)*.55);
        vec3 verge = mix(meadow, earth, .28);
        vec3 shade = mix(meadow,earth,edge);
        diffuseColor.rgb *= mix(shade,verge,.28*(4.0*edge*(1.0-edge)));`)
      .replace('#include <opaque_fragment>',`
        outgoingLight += diffuseColor.rgb * 0.19;
        #include <opaque_fragment>`);
  };
  const ground=new THREE.Mesh(meadowSurface(THREE),material);
  ground.rotation.x=-Math.PI/2;
  ground.receiveShadow=true;
  scene.add(ground,meadowClumps(THREE,trails));

}
