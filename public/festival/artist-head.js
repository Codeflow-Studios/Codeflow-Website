// Each row follows the jaw, midface or skull and registers a landmark in the portrait.
// Values are local height, half width, front depth, rear depth, image y and image half width.
const skull = [
  [-.067,.035,.092,.060,.918,.047],[-.052,.081,.132,.079,.895,.088],
  [-.028,.126,.154,.103,.858,.140],[.002,.155,.157,.125,.803,.183],
  [.043,.177,.156,.143,.733,.213],[.083,.187,.158,.152,.680,.232],
  [.122,.194,.161,.165,.620,.246],[.169,.204,.161,.178,.543,.255],
  [.218,.205,.160,.184,.460,.258],[.260,.202,.167,.190,.408,.260],
  [.298,.200,.166,.196,.359,.265],[.342,.202,.162,.201,.292,.273],
  [.382,.200,.155,.202,.222,.272],[.424,.186,.143,.190,.150,.258],
  [.462,.163,.126,.171,.090,.228],[.497,.119,.095,.143,.043,.172],
  [.518,.072,.062,.103,.021,.109],[.531,.008,.009,.015,.009,.010],
];
const TAU = 2 * Math.PI;
function bump(x,y,cx,cy,rx,ry) {
  return Math.exp(-(((x-cx)/rx)**2 + ((y-cy)/ry)**2));
}
function features(x,y,matar) {
  const side=Math.abs(x);
  return .045*bump(x,y,0,.185,.031,.092) + (matar?.063:.073)*bump(x,y,0,.128,.039,.037)
    + .035*bump(side,y,.036,.119,.027,.023) - .012*bump(side,y,.085,.215,.050,.027)
    + .018*bump(side,y,.082,.255,.066,.024) + .024*bump(side,y,.122,.159,.051,.046)
    + .017*bump(x,y,0,.061,.069,.029) + .011*bump(x,y,0,.042,.062,.013)
    + .023*bump(x,y,0,-.005,.072,.032);
}

export function addArtistHead(THREE, head, matar, sculpt) {
  const position=[], uv=[], weight=[], colors=[], indices=[];
  const cols=72, segments=3;
  const skin=new THREE.Color(matar?'#bf8166':'#bc795b');
  const scalp=new THREE.Color(matar?'#25222a':'#48352e');
  const beard=new THREE.Color('#5b4034'), tone=new THREE.Color();
  for (let row=0;row<=(skull.length-1)*segments;row++) {
    const lo=Math.min(skull.length-2,Math.floor(row/segments)), t=row/segments-lo;
    const [y,width,front,back,imageY,span]=skull[lo].map((n,i)=>THREE.MathUtils.lerp(n,skull[lo+1][i],t));
    for (let col=0;col<=cols;col++) {
      const a=(col/cols-.5)*TAU, c=Math.cos(a), sn=Math.sin(a);
      const x=sn*width*(matar && y<.11?.97:1);
      const relief=features(x,y,matar)*THREE.MathUtils.smoothstep(c,0,.6);
      const z=c>=0 ? front*Math.pow(c,.76)+relief : back*c;
      position.push(x,y,z);
      uv.push((matar?.498:.494)+span*sn,1-imageY-(matar?.009:0)*Math.exp(-(((y-.044)/.05)**2)));
      weight.push(1-THREE.MathUtils.smoothstep(Math.abs(a),1.08,1.79));
      const side=Math.min(1,Math.abs(a)/1.55);
      const hairline=matar ? .312-.083*side : .335-.164*side-.054*Math.max(0,-c);
      tone.copy(skin);
      if (!matar) {
        const beardline=.043+.096*Math.min(1,Math.abs(x)/.16);
        tone.lerp(beard,.74*(1-THREE.MathUtils.smoothstep(y,beardline-.055,beardline)));
      }
      tone.lerp(scalp,THREE.MathUtils.smoothstep(y,hairline-.015,hairline+.014));
      colors.push(tone.r,tone.g,tone.b);
      if(row && col) {
        const i=row*(cols+1)+col;
        indices.push(i-cols-2,i-cols-1,i, i-cols-2,i,i-1);
      }
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.setAttribute('paintCoverage',new THREE.Float32BufferAttribute(weight,1));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const texture=new THREE.TextureLoader().load('/festival/avatars/'+(matar?'matar':'gauthier')+'-face.jpg');
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;
  const material=new THREE.MeshStandardMaterial({map:texture,vertexColors:true,roughness:.89});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nattribute float paintCoverage; varying float coverage;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\ncoverage = paintCoverage;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying float coverage;')
      .replace('#include <map_fragment>','')
      .replace('#include <color_fragment>',`#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(map,vMapUv).rgb,coverage);`)
      .replace('#include <opaque_fragment>','outgoingLight += diffuseColor.rgb * .16;\n#include <opaque_fragment>');
  };
  const face=new THREE.Mesh(geo,material);
  face.name=matar?'Matar portrait':'Gauthier portrait';
  face.castShadow=face.receiveShadow=true;
  head.add(face);
  const ears=sculpt(head);
  for(const side of [-1,1]) {
    const x=side*.197;
    ears.facet('#bf8065',x,.175,-.011,.031,.070,.043,side*.10,2);
    ears.facet('#975e4f',side*.220,.180,-.008,.008,.037,.022,side*.10,1);
    ears.seam('#d39779',[[side*.213,.137,.006],[side*.225,.170,.022],[side*.224,.211,.012],[side*.218,.232,-.011],[side*.210,.211,-.032]],.008);
    ears.seam('#be826b',[[side*.219,.158,.002],[side*.226,.180,-.005],[side*.220,.198,-.014]],.005);
  }
  ears.finish();
  if (matar) {
    addCap(THREE,head,sculpt);
    addNeckInk(THREE,head);
  } else {
    addHair(THREE,head);
  }
  addGlasses(THREE,head,sculpt,matar);
}

function addGlasses(THREE,head,sculpt,matar) {
  const glasses=new THREE.Group();
  glasses.name=matar?'Matar sunglasses':'Gauthier sunglasses';
  head.add(glasses);
  const shape=new THREE.Shape();
  shape.moveTo(-.080,.028);
  shape.quadraticCurveTo(-.086,.053,-.054,.056);
  shape.lineTo(.069,.051);
  shape.quadraticCurveTo(.083,.050,.081,.034);
  shape.lineTo(.070,-.022);
  shape.quadraticCurveTo(.066,-.036,.040,-.038);
  shape.lineTo(-.044,-.036);
  shape.quadraticCurveTo(-.066,-.035,-.068,-.018);
  shape.closePath();
  const frameGeometry=new THREE.ExtrudeGeometry(shape,{depth:.009,bevelEnabled:true,
    bevelSegments:2,bevelSize:.007,bevelThickness:.005,curveSegments:8});
  const lensGeometry=new THREE.ShapeGeometry(shape,14);
  const frame=new THREE.MeshStandardMaterial({color:matar?'#1e1d23':'#222531',roughness:.39,metalness:.12});
  const lens=new THREE.MeshStandardMaterial({color:matar?'#1d2636':'#202135',roughness:.28,metalness:.3});
  const glint=new THREE.MeshBasicMaterial({color:matar?'#8997aa':'#8797bd',transparent:true,opacity:.22,depthWrite:false});
  const reflection=new THREE.Shape();
  reflection.moveTo(-.029,.035);
  reflection.lineTo(.009,.035);
  reflection.lineTo(-.019,-.017);
  reflection.lineTo(-.047,-.017);
  reflection.closePath();
  const reflectionGeometry=new THREE.ShapeGeometry(reflection);
  const details=sculpt(glasses);
  for (const side of [-1,1]) {
    const temple=new THREE.Group();
    temple.position.set(side*.104,.213,.192);
    temple.rotation.y=side*.32;
    if (!matar) temple.scale.set(1.035,.83,1);
    glasses.add(temple);
    const border=new THREE.Mesh(frameGeometry,frame);
    const pane=new THREE.Mesh(lensGeometry,lens);
    pane.position.set(0,.004,.015);
    pane.scale.set(.87,.73,1);
    const shine=new THREE.Mesh(reflectionGeometry,glint);
    shine.position.z=.0155;
    temple.add(border,pane,shine);
    details.seam('#221f26',[[side*.173,.248,.169],[side*.203,.247,.103],[side*.215,.232,.038],[side*.213,.199,-.025]],.012);
    details.slab('#a6a3a0',side*.174,.248,.174,.011,.005,.005,0,side*.38);
  }
  details.seam('#25232b',[[-.036,.233,.198],[0,.243,.220],[.036,.233,.198]],.010);
  details.finish();
}

function addNeckInk(THREE,head) {
  const coords=[], uv=[], indices=[];
  const sides=32;
  const rings=[[-.153,.151,.134],[-.113,.144,.125],[-.079,.141,.121],[-.040,.134,.116],[-.014,.115,.097],[.016,.085,.079]];
  for(const [row,[y,w,d]] of rings.entries()) for(let col=0;col<=sides;col++) {
    const u=col/sides, a=(u-.5)*TAU, back=Math.max(0,-Math.cos(a));
    coords.push(w*Math.sin(a),y+back*.087,d*Math.cos(a)-.018);
    uv.push(u,row/(rings.length-1));
    if(row && col) {
      const v=row*(sides+1)+col;
      indices.push(v-sides-2,v-sides-1,v,v-sides-2,v,v-1);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:'#b87a60',roughness:.89});
  material.defines={USE_UV:''};
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      float a = (vUv.x - .5) * 6.2831853;
      float y = vUv.y;
      float branch = sin(12.0*a + 9.0*y + 2.5*sin(a*4.0-y*8.0));
      float petals = cos(7.0*a - 13.0*y + 2.5*sin(3.0*a)) + .44*branch;
      float gap = smoothstep(.4, 1.35, abs(a) + (1.0-y)*.43);
      float edge = 1.0-smoothstep(.82, .99, y);
      float ink = smoothstep(.10, .24, petals) * gap * edge;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.033,.024,.030), ink*.92);`);
  };
  const neck=new THREE.Mesh(geo,material);
  neck.name='Matar neck tattoos';
  neck.receiveShadow=true;
  head.add(neck);
}

function addCap(THREE,head,sculpt) {
  // The front panel and its strap are painted into the face. Give the reversed visor a real profile.
  const cap=sculpt(head);
  const brim=new THREE.Shape();
  brim.moveTo(-.17,-.035);
  brim.bezierCurveTo(-.227,-.072,-.212,-.161,-.136,-.205);
  brim.bezierCurveTo(-.056,-.250,.060,-.250,.141,-.206);
  brim.bezierCurveTo(.216,-.168,.229,-.075,.17,-.035);
  brim.quadraticCurveTo(0,-.100,-.17,-.035);
  const visor=new THREE.ExtrudeGeometry(brim,{depth:.011,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:2,curveSegments:12});
  const p=visor.attributes.position;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i), z=p.getY(i), thickness=p.getZ(i);
    p.setXYZ(i,x,.319+thickness-.042*(x/.21)**2+z*.04,z-.10);
  }
  visor.computeVertexNormals();
  const mesh=new THREE.Mesh(visor,new THREE.MeshStandardMaterial({color:'#282936',roughness:.86,side:THREE.DoubleSide}));
  mesh.castShadow=true;
  head.add(mesh);
  cap.seam('#514c54',[[-.177,.272,-.173],[-.186,.288,-.234],[-.111,.297,-.304],[0,.306,-.326],[.111,.297,-.304],[.186,.288,-.234],[.177,.272,-.173]],.006);
  for(const side of [-1,1]) {
    cap.seam('#49464d',[[side*.13,.266,-.149],[side*.135,.35,-.152],[side*.112,.445,-.123],[side*.055,.495,-.085],[0,.519,-.039]],.006);
  }
  cap.facet('#36353b',0,.526,-.016,.022,.011,.025,0,1);
  cap.finish();
}

function addHair(THREE,head) {
  const xyz=[], pigment=[], faces=[];
  const brown=new THREE.Color(), tau=Math.PI*2;
  const hues=['#30231f','#423028','#50382a','#382922','#57402e','#493328'];
  function surface(a,p,thickness) {
    return [
      (.209+thickness)*Math.sin(p)*Math.sin(a),
      .304+(.217+thickness)*Math.cos(p),
      -.009+(.199+thickness)*Math.sin(p)*Math.cos(a),
    ];
  }
  // Overlapping arched locks travel from the crown to the fringe and collar.
  for (let layer=0;layer<3;layer++) {
      const count=[22,36,52][layer];
    for(let i=0;i<count;i++) {
      const angle=tau*(i+.27*layer)/count;
      const c=Math.cos(angle), noise=Math.sin(i*23.17+layer*4.1);
      const start=.10+layer*.405+noise*.089;
      const hairline=1.21+.54*(1-c)*.5+.14*Math.abs(Math.sin(angle));
      const end=layer===2?hairline+.052*noise:start+.71+.06*noise;
      const width=tau/count*.78;
      const base=xyz.length/3;
      for(let down=0;down<=7;down++) {
        const t=down/7, point=Math.pow(t,3);
        const swing=.22*Math.sin(Math.PI*t)*Math.cos(angle+.7)+.31*t+noise*.091*t;
        const spread=width*(.58+.52*Math.sin(Math.PI*t))*(1-.95*point);
        for(let cross=0;cross<5;cross++) {
          const s=(cross-2)/2, ridge=1-s*s;
          const p=start+(end-start)*t+.061*t*s*noise;
          const raised=.005+.0015*layer+.013*ridge*Math.sin(.32+2.54*t)+.009*point;
          xyz.push(...surface(angle+s*spread+swing,p,raised));
          brown.set(hues[(i*5+layer)%hues.length]);
          brown.multiplyScalar(.61+ridge*.50+.19*(1-t)+.17*Math.max(0,-s));
          pigment.push(brown.r,brown.g,brown.b);
          if(down && cross) {
            const v=base+down*5+cross;
            faces.push(v-6,v,v-5, v-6,v-1,v);
          }
        }
      }
    }
  }
  const groom=new THREE.BufferGeometry();
  groom.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
  groom.setAttribute('color',new THREE.Float32BufferAttribute(pigment,3));
  groom.setIndex(faces);
  groom.computeVertexNormals();
  const hair=new THREE.Mesh(groom,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.82}));
  hair.name='Gauthier cropped hair';
  hair.castShadow=true;
  head.add(hair);
}
