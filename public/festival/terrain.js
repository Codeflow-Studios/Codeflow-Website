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

function groundTiles(THREE) {
  const random = randomSource(0x434f4153);
  const grass = raster(112, 112, true);
  const track = raster(112, 112, true);
  const turf = noiseField(0x35616d65);
  for (let y=0;y<112;y++) for (let x=0;x<112;x++) {
    const u=x/112, v=y/112;
    // Whole wave periods keep the rolling colour variation continuous across the edges.
    const swale=(Math.sin(tau*(u+v)+1.3)+Math.cos(tau*(u-v*2)))*.09;
    const grain=random();
    grass.pixel(x,y,blendRGB(0x385d51,0x638b67,clamp(.34+swale+grain*.30)));
    track.pixel(x,y,blendRGB(0x997862,0xc4a282,clamp(.3+swale+grain*.36)));
  }

  // Flat islands of nearby shades form larger connected masses beneath the small details.
  for (let i = 0; i < 47; i++) {
    const x = Math.floor(random() * 112), y = Math.floor(random() * 112);
    const w = 4 + Math.floor(random() * 15), h = 2 + Math.floor(random() * 5);
    const patch = [[x,y+1],[x+3,y],[x+w-3,y],[x+w,y+2],[x+w-2,y+h],[x+4,y+h+1],[x,y+h-1]];
    grass.polygon(patch, i % 3 ? 0x4b755d : 0x426952);
    track.polygon(patch, i % 3 ? 0xaf9176 : 0xa88870);
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
  for (let n=0;n<120;n++) {
    const x=random()*112,y=random()*112,length=2+Math.floor(turf(x*.1,y*.1)*5);
    grass.rect(x,y,length,1,n%4 ? 0x547a5d : 0x70906b);
    track.rect(x,y,length+1,1,n%4 ? 0xab8b70 : 0xbb9a7d);
  }
  return { grass: asTexture(THREE,grass,true), earth: asTexture(THREE,track,true) };
}

function duskPanorama(THREE) {
  const sky = raster(1024,512);
  const random = randomSource(0x5457494c);
  const noise = noiseField(0x62616e6b);
  const stops = [[0,0x182540],[.21,0x344064],[.32,0x655f8d],[.39,0xa387aa],
    [.445,0xe4aaac],[.485,0xffc8a0],[.54,0xb494a0],[.63,0x6d7487],[1,0x384554]];
  const sunX=.798, sunY=.434;
  let band=1;
  for(let y=0;y<sky.height;y++) {
    const v=y/sky.height;
    while (v>stops[band][0]) band++;
    const [y0,c0]=stops[band-1], [y1,c1]=stops[band];
    const base=blendRGB(c0,c1,(v-y0)/(y1-y0));
    const cloudBand=smooth(clamp((v-.23)*14))*smooth(clamp((.49-v)*29));
    for(let x=0;x<sky.width;x++) {
      const u=x/sky.width, dx=Math.min(Math.abs(u-sunX),1-Math.abs(u-sunX))*2;
      const dy=v-sunY, radius=dx*dx+dy*dy;
      const glow=.63/(1+radius*88);
      let color=blendRGB(base,0xffc490,glow*smooth(clamp((v-.2)*4.1)));
      if(radius<.007) color=blendRGB(color,0xffdf9e,.56/(1+radius*900));
      if(radius<.00044) color=blendRGB(0xffe6ac,0xfff3cc,clamp(.5-dy*25));
      if(cloudBand>0) {
        // Sheared shelves of vapour catch the light on their lower edges.
        const shear=.78*Math.sin(u*tau*2+.7)+.35*Math.cos(u*tau*3);
        const a=noise(u*16,v*59+shear,16);
        const b=noise(u*32+2,v*134+shear*2,32);
        const c=noise(u*64+4,v*271+shear*4,64);
        const cloud=a*.61+b*.28+c*.11;
        const opacity=smooth(clamp((cloud-.49)*4.9))*cloudBand;
        if(opacity>.003) {
          const edge=noise(u*16,(v+.006)*59+shear,16)-a;
          const light=clamp(.38-edge*3.2+c*.15+glow*.21);
          let cloudColor=blendRGB(0x66628a,0xd99da8,light);
          cloudColor=blendRGB(cloudColor,0xffcea2,clamp(-edge*5.4)*glow*1.25);
          color=blendRGB(color,cloudColor,opacity*.87);
        }
      }
      sky.pixel(x,y,color);
    }
  }
  for(let i=0;i<105;i++) {
    const x=random()*sky.width,y=(.095+random()*.235)*sky.height;
    sky.pixel(x,y,i%7 ? 0x9493b2 : 0xd6c2c6);
  }
  function ridge(base, amplitude, color, shade, horizontal, offset) {
    for(let x=0;x<sky.width;x++) {
      const u=x/sky.width;
      const heightAt=q=>noise(q*horizontal+offset,11.1,horizontal)*.54+
        noise(q*horizontal*2+offset*2,21.8,horizontal*2)*.3+
        noise(q*horizontal*4,12.5,horizontal*4)*.16;
      const h=heightAt(u), silhouette=Math.round(sky.height*(base-h*amplitude));
      const southernFace=clamp(.50+(h-heightAt(u-.005))*4.8);
      sky.rect(x,silhouette,1,sky.height-silhouette,blendRGB(shade,color,southernFace));
    }
  }
  ridge(.51,.068,0xcfa2a7,0xb591a3,8,3);
  ridge(.522,.055,0xaa91a1,0x957f97,12,7);
  ridge(.534,.044,0x897e93,0x756e87,16,11);
  for(let x=0;x<sky.width;x+=2+Math.floor(random()*4)) {
    const y=sky.height*(.525+Math.sin(x/sky.width*tau*6)*.004);
    const h=2+random()*6;
    sky.polygon([[x-2,y+3],[x,y-h],[x+2,y+3]],0x6d6e82);
  }
  ridge(.55,.036,0x687081,0x5c6477,13,5);
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
  const {grass,earth}=groundTiles(THREE);
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
        vec3 meadow = texture2D(map,vMapUv*22.0).rgb;
        vec3 earth = texture2D(festivalEarth,vMapUv*25.0).rgb;
        float mask = texture2D(festivalTrail,vMapUv).r;
        float edge = smoothstep(.05,.97,mask + (meadow.g - .16)*.55);
        vec3 shade = mix(meadow,earth,edge);
        diffuseColor.rgb *= shade*(1.0-.21*(4.0*edge*(1.0-edge)));`)
      .replace('#include <opaque_fragment>',`
        outgoingLight += diffuseColor.rgb * 0.19;
        #include <opaque_fragment>`);
  };
  const ground=new THREE.Mesh(meadowSurface(THREE),material);
  ground.rotation.x=-Math.PI/2;
  ground.receiveShadow=true;
  scene.add(ground,meadowClumps(THREE,trails));

  // Use the panorama directly on the dome. A reflection conversion would soften pixel edges.
  const sky=duskPanorama(THREE);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(145,64,32),new THREE.MeshBasicMaterial({
    map:sky,side:THREE.BackSide,depthTest:false,depthWrite:false,fog:false,toneMapped:false,
  }));
  dome.name='Festival sunset';
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
