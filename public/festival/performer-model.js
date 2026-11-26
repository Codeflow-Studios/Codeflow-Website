// The sculpt is assembled in joint-local space. Every rigid section shares
// one vertex-coloured surface for its fabric, skin, seams and accessories.
export function createPerformer(THREE, scene) {
  const surface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, metalness: .035 });
  // Keep dark fabric and facial features readable in the long shadows across the midway.
  surface.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
      'outgoingLight += diffuseColor.rgb * 0.35;\n#include <opaque_fragment>');
  };
  const tau = Math.PI * 2;
  const position = new THREE.Vector3(), normal = new THREE.Vector3(), color = new THREE.Color();
  function joint(parent, x, y, z) {
    const node = new THREE.Group();
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  }
  function sculpt(node) {
    const points = [], normals = [], colors = [];
    function place(geometry, tint, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
      const mesh = geometry.index ? geometry.toNonIndexed() : geometry;
      const pose = new THREE.Object3D();
      pose.position.set(x,y,z); pose.rotation.set(rx,ry,rz); pose.scale.set(sx,sy,sz); pose.updateMatrix();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(pose.matrix);
      color.set(tint);
      for (let i=0; i<mesh.attributes.position.count; i++) {
        position.fromBufferAttribute(mesh.attributes.position,i).applyMatrix4(pose.matrix);
        normal.fromBufferAttribute(mesh.attributes.normal,i).applyNormalMatrix(normalMatrix);
        points.push(position.x,position.y,position.z);
        normals.push(normal.x,normal.y,normal.z);
        colors.push(color.r,color.g,color.b);
      }
      if (mesh !== geometry) mesh.dispose();
      geometry.dispose();
    }
    function shell(rows, tint, count = 16, drape = 0) {
      const verts = [], indices = [];
      for (const [y, rx, rz, dz = 0, dx = 0] of rows) {
        for (let i=0; i<count; i++) {
          const angle=(i+.5)*tau/count;
          const fold = 1 + drape * (Math.cos(angle*5 + y*8)*.56 + Math.sin(angle*3 - y*6)*.44);
          verts.push(dx + Math.sin(angle)*rx*fold,y,dz + Math.cos(angle)*rz*fold);
        }
      }
      for(let r=1;r<rows.length;r++) for(let i=0;i<count;i++) {
        const a=(r-1)*count+i,b=(r-1)*count+(i+1)%count,c=a+count,d=b+count;
        indices.push(a,b,c,b,d,c);
      }
      const last=(rows.length-1)*count;
      for(let i=1;i<count-1;i++) indices.push(0,i+1,i,last,last+i,last+i+1);
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
      g.setIndex(indices);g.computeVertexNormals();
      place(g,tint,0,0,0);
    }
    function slab(t,x,y,z,w,h,d,roll=0,yaw=0,pitch=0) {
      place(new THREE.BoxGeometry(),t,x,y,z,w,h,d,pitch,yaw,roll);
    }
    function facet(t,x,y,z,w,h,d,roll=0,detail=0) {
      place(new THREE.IcosahedronGeometry(1,detail),t,x,y,z,w,h,d,0,0,roll);
    }
    // Tapered seams follow the volume instead of projecting a square tab through it.
    function seam(tint, path, radius) {
      const curve = new THREE.CatmullRomCurve3(path.map(v => new THREE.Vector3(...v)));
      const segments = Math.max(4, path.length * 2);
      const tube = new THREE.TubeGeometry(curve, segments, radius, 4, false);
      const coords = tube.attributes.position;
      const point = new THREE.Vector3();
      for (let row = 0; row <= segments; row++) {
        const along = row / segments;
        const center = curve.getPointAt(along);
        const taper = .22 + .78 * Math.sin(along * Math.PI);
        for (let side = 0; side <= 4; side++) {
          const index = row * 5 + side;
          point.fromBufferAttribute(coords, index).sub(center).multiplyScalar(taper).add(center);
          coords.setXYZ(index, point.x, point.y, point.z);
        }
      }
      place(tube, tint, 0, 0, 0);
    }
    function finish() {
      const g=new THREE.BufferGeometry();
      for (const [name,data] of [['position',points],['normal',normals],['color',colors]]) {
        g.setAttribute(name,new THREE.Float32BufferAttribute(data,3));
      }
      const mesh=new THREE.Mesh(g,surface);mesh.castShadow=true;mesh.receiveShadow=true;
      node.add(mesh);
      return mesh;
    }
    return { shell, slab, facet, seam, finish };
  }

  // Curved patches project the artist illustration onto the sculpted face and shirt.
  function portrait(head, chest, fallback, matar) {
    const rows = matar ? [
      [-.017,.086,.111,.040,78,108,9], [.023,.147,.144,.036,74,108,14],
      [.086,.172,.158,.029,66,108,17], [.155,.190,.170,.019,58,107,20],
      [.215,.199,.173,.012,47,107,21], [.272,.202,.173,.004,38,107,22],
      [.299,.198,.169,.001,33,107,21],
    ] : [
      [-.029,.091,.118,.041,90,111,8], [.013,.145,.142,.041,84,111,15],
      [.079,.171,.154,.033,73,110,20], [.155,.191,.170,.020,59,109,22],
      [.216,.199,.173,.013,46,109,23], [.275,.201,.172,.002,39,109,24],
      [.329,.198,.169,-.006,32,109,23],
    ];
    const shirtRows = [
      [.015,matar?.328:.295,.213,0,212,115,34], [.10,matar?.318:.285,.205,0,198,115,39],
      [.33,matar?.304:.271,.191,0,166,115,40], [.56,.325,.209,0,133,114,42],
      [.69,.373,.204,0,110,114,42], [.737,.356,.183,0,99,114,31],
    ];
    function projectArtwork(parent, rings, isFace) {
      const coords=[], uvs=[], shades=[], triangles=[];
      const columns=18;
      for (let r=0; r<rings.length; r++) {
        const [y,rx,rz,shift,imageY,imageX,span]=rings[r];
        for (let c=0; c<=columns; c++) {
          const u=c/columns, a=(2*u-1)*1.34;
          const fold=isFace ? 1 : 1 + .039*(Math.cos(a*5+y*8)*.56 + Math.sin(a*3-y*6)*.44);
          const x=Math.sin(a)*rx*fold;
          const nose=Math.exp(-((x/.042)**2) - ((y-.154)/.082)**2)*.052;
          const cheek=Math.exp(-(((Math.abs(x)-.11)/.048)**2) - ((y-.156)/.056)**2)*.012;
          const relief=isFace ? nose+cheek : 0;
          coords.push(x,y,shift+Math.cos(a)*rz*fold+.006+relief);
          const width=isFace ? span : span*.89;
          uvs.push((imageX+width*Math.sin(a)/Math.sin(1.34))/240,1-imageY/240);
          const edge=Math.min(1,c/2,(columns-c)/2);
          const border=isFace ? (r===0?.28:r===rings.length-1?.65:1)
            : Math.min(.78, r*.44, (rings.length-1-r)*.44);
          const alpha=edge*border;
          shades.push(1,1,1,alpha);
          if (r && c) {
            const n=r*(columns+1)+c;
            triangles.push(n-columns-2,n-columns-1,n,n-columns-2,n,n-1);
          }
        }
      }
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
      geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
      geo.setAttribute('color',new THREE.Float32BufferAttribute(shades,4));
      geo.setIndex(triangles);geo.computeVertexNormals();
      const mat=new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,roughness:.88,metalness:0,
        emissive:0xffffff,emissiveIntensity:.25,depthWrite:false});
      const mesh=new THREE.Mesh(geo,mat);
      parent.add(mesh);
      mesh.visible=false;
      return mesh;
    }
    const face=projectArtwork(head, rows, true);
    const clothing=projectArtwork(chest, shirtRows, false);
    const file=matar?'matar.png':'gauthier.png';
    const map=new THREE.TextureLoader().load('/festival/avatars/'+file,()=>{
      map.colorSpace=THREE.SRGBColorSpace;
      for (const mesh of [face,clothing]) {
        mesh.material.map=mesh.material.emissiveMap=map;
        mesh.material.needsUpdate=true;
        mesh.visible=true;
      }
      fallback.visible=false;
    });
  }

  function build(matar) {
    const root=joint(scene,0,0,0), pelvis=joint(root,0,1.20,0), chest=joint(pelvis,0,.04,0);
    const head=joint(chest,0,.91,.01);
    const skin=matar?'#df986e':'#d58e68', skinLight=matar?'#efad81':'#e3a478';
    const hair=matar?'#222430':'#503b36', eye='#33303b', shirt=matar?'#34343d':'#343847';
    let s=sculpt(pelvis);
    s.shell([[-.18,.265,.185],[.00,.29,.194],[.14,.255,.177]],'#373849');
    s.slab('#292b38',0,.07,.025,.54,.075,.33);
    s.slab('#85818a',0,.065,.187,.088,.046,.02);
    s.finish();
    s=sculpt(chest);
    const hem=matar?.318:.285;
    s.shell([[-.046,hem,.202],[.01,hem+.011,.209],[.10,hem,.203],[.33,hem-.014,.189],[.56,.325,.207],[.69,.373,.202],[.747,.356,.180],[.79,.257,.146],[.816,.177,.127]],shirt,24,.039);
    s.shell([[.77,.16,.130],[.85,.149,.119],[.96,.134,.116]],skin);
    s.shell([[-.046,hem+.004,.204],[-.024,hem+.01,.211]],'#292d38',24,.039);
    if (!matar) {
      s.shell([[.63,.263,.183,-.015],[.69,.261,.197,-.022],[.74,.232,.185,-.013],[.82,.183,.154],[.868,.148,.13]],'#2d303d',24,.054);
      s.seam('#51525e',[[-.19,.79,-.089],[-.162,.733,-.154],[.035,.682,-.219],[.168,.696,-.172],[.222,.736,-.062]],.026);
      s.seam('#414452',[[-.22,.726,.085],[-.128,.690,.156],[.049,.716,.172],[.174,.773,.075]],.023);
      s.seam('#464957',[[-.225,.557,-.132],[-.186,.493,-.159],[-.122,.443,-.175]],.013);
    } else {
      s.shell([[.762,.173,.144],[.797,.156,.132]],'#242630');
      for(let i=0;i<7;i++) {
        const a=i*.81;
        s.slab('#514953',Math.sin(a)*.13,.85+(i%3)*.024,Math.cos(a)*.11,.063,.022,.025,.54-i%2,a);
      }
    }
    s.seam('#424551',[[.236,.07,-.126],[.131,.093,-.183],[-.078,.14,-.197]],.017);
    s.seam('#272b35',[[-.249,.18,.103],[-.155,.142,.168],[-.043,.128,.191]],.014);
    for(const side of [-1,1]) {
      s.seam('#484a55',[[side*.134,.777,-.10],[side*.218,.764,-.105],[side*.318,.719,-.086]],.011);
    }
    s.finish();
    s=sculpt(head);
    s.shell([[-.045,.093,.11,.035],[.005,.145,.133,.040],[.12,.185,.159,.015],[.27,.194,.161],[.36,.185,.159],[.426,.127,.119]],skin,20);
    for (const side of [-1,1]) {
      s.facet(skinLight,side*.184,.185,-.01,.038,.064,.039,side*.11,1);
      s.slab('#ad6d58',side*.191,.189,.013,.025,.048,.014);
    }
    s.finish();
    s=sculpt(head);
    for (const side of [-1,1]) {
      s.slab(hair,side*.082,.251,.159,.085,.025,.018,side*.12);
      s.slab('#d6b8aa',side*.082,.220,.168,.068,.025,.013,side*.06);
      s.slab(eye,side*.078,.220,.177,.025,.028,.012);
      s.slab('#dddfcd',side*.078-.004,.228,.185,.009,.009,.005);
    }
    s.facet(skinLight,0,.161,.168,.047,.067,.065);
    s.slab('#975e55',.001,.079,.177,.078,.014,.010);
    const fallbackFace=s.finish();
    s=sculpt(head);
    if (matar) {
      s.shell([[.265,.218,.188,-.005],[.31,.222,.19,-.005],[.389,.205,.183,-.017],[.441,.164,.151,-.021],[.472,.115,.115,-.025],[.487,.029,.034,-.022]],'#292b38',24);
      s.shell([[.262,.224,.193,-.005],[.289,.225,.193,-.005]],'#41414c',24);
      s.facet('#353844',0,.281,-.206,.211,.029,.148,0,1);
      s.facet('#383944',0,.487,-.024,.029,.012,.029,0,1);
      for(const side of [-1,1]) {
        s.seam('#50515b',[[side*.014,.484,-.023],[side*.125,.454,-.085],[side*.174,.392,-.120],[side*.183,.295,-.113]],.008);
      }
      s.slab('#1c202a',0,.285,.184,.114,.027,.014);
      for (const x of [-.035,0,.035]) s.slab('#848084',x,.287,.195,.009,.008,.004);
      s.slab('#aeb0af',-.158,.335,-.118,.035,.046,.01,0,.85);
    } else {
      s.facet('#453631',0,.222,-.107,.182,.129,.082,0,1);
      s.shell([[.254,.203,.169,-.010],[.301,.211,.173,-.007],[.386,.195,.165,-.009],[.444,.126,.119],[.451,.045,.051]],hair,20);
      for(let strand=-3;strand<=3;strand++) {
        const x=strand*.044, rear=-.16+Math.abs(strand)*.013;
        s.seam(strand%2?'#674b3d':'#594138',[[x*.84-.015,.223,rear],[x,.311,rear-.012],[x*.9+.02,.39,rear+.029],[x*.67+.023,.423,rear+.068]],.012);
      }
      for(let i=0;i<7;i++){
        const x=(i-3)*.045;
        s.facet(i%2?'#644638':'#75513d',x,.354+Math.cos(i)*.011,.117-Math.abs(x)*.38,.055,.088,.067,-.30,0);
      }
      s.facet('#634738',.08,.43,-.038,.116,.043,.119,-.17);
      for(const side of [-1,1]){
        s.slab('#805a48',side*.154,.08,.075,.048,.105,.084,side*-.25);
        s.slab('#735144',side*.099,.034,.142,.076,.048,.027,side*.23);
      }
      s.facet('#735044',0,.017,.142,.093,.038,.031);
      s.slab('#805442',0,.098,.175,.069,.012,.009);
    }
    s.finish();
    portrait(head,chest,fallbackFace,matar);
    const arms=[],legs=[];
    for (const side of [-1,1]) {
      const shoulder=joint(chest,side*.343,.68,.0), elbow=joint(shoulder,side*.045,-.34,0);
      s=sculpt(shoulder);
      const cuff=matar?.122:.098;
      s.shell([[-.362,cuff,cuff+.006,0,side*.046],[-.316,cuff+.006,cuff+.010,0,side*.043],[-.213,.122,.125,0,side*.03],[-.074,.139,.132,0,side*.012],[.026,.119,.111],[.072,.061,.064]],shirt,16,.04);
      s.shell([[-.363,cuff+.002,cuff+.008,0,side*.047],[-.342,cuff+.006,cuff+.011,0,side*.044]],'#42434f',16,.036);
      s.finish();
      s=sculpt(elbow);
      const forearm=matar?skin:shirt;
      s.shell([[-.325,.061,.068,.055],[-.24,.083,.086,.045],[-.11,.097,.102,.025],[.019,.092,.102]],forearm);
      if(matar){
        // Curved ink follows the taper of each forearm and shows from the rear.
        for(let i=0;i<6;i++) {
          const y=-.044-i*.042, r=.10-i*.005, z=.018+i*.006;
          const twist=(i%2?-1:1)*(side<0?.14:.27);
          const arc=[-.46,.02,.64,1.28,1.87,2.48].map((a,j)=>[
            side*Math.cos(a+twist)*r,y+Math.sin(j*1.5+i)*.016,z+Math.sin(a+twist)*r
          ]);
          s.seam(i%2?'#635057':'#554951',arc,.012);
          s.seam('#6c5556',[[side*r*.61,y+.015,z-r*.72],[side*r*.83,y+.006,z-r*.54],[side*r*.96,y-.012,z-r*.20]],.009);
        }
      } else {
        s.shell([[-.316,.067,.077,.056],[-.276,.078,.086,.05]],'#292d38');
        s.slab(side<0?'#834e54':'#48808a',side*.10,-.106,.012,.015,.092,.029);
      }
      s.facet(skinLight,0,-.353,.063,.061,.078,.067,0,1);
      s.facet(skin,-side*.045,-.356,.107,.028,.048,.029,side*.31,1);
      for(let finger=0;finger<4;finger++) {
        const z=.025+finger*.025;
        s.facet(finger%2?skinLight:skin,-side*.008,-.397+.006*Math.abs(finger-2),z,.042,.048-.006*Math.abs(finger-2),.017,side*-.20,1);
      }
      s.finish();arms.push({side,shoulder,elbow});
      const hip=joint(pelvis,side*.154,-.10,0), knee=joint(hip,0,-.55,0), foot=joint(knee,0,-.43,0);
      s=sculpt(hip);
      s.shell([[-.558,.119,.134,.010],[-.485,.122,.142,.012],[-.419,.135,.143,-.006],[-.252,.147,.163],[.02,.141,.153]],'#393b48',16,.049);
      if (!matar) {
        s.slab('#343642',side*.135,-.287,-.005,.057,.174,.168);
        s.slab('#555461',side*.164,-.222,-.003,.016,.033,.166);
      }
      s.seam('#51525d',[[side*.10,-.037,-.101],[side*.136,-.120,-.073],[side*.15,-.20,-.044]],.009);
      s.seam('#494b57',[[side*.107,-.451,-.069],[side*.076,-.423,-.121],[-side*.038,-.396,-.144]],.012);
      s.finish();
      s=sculpt(knee);
      s.shell([[-.439,.102,.117,-.018],[-.358,.116,.125,-.024],[-.307,.112,.126,-.031],[-.174,.128,.132,-.021],[-.072,.119,.126],[.012,.12,.137,.007]],'#323541',16,.044);
      s.shell([[-.418,.108,.120,-.016],[-.386,.112,.124,-.016]],'#464854');s.finish();
      s=sculpt(foot);
      s.shell([[-.109,.119,.214,.055],[-.074,.127,.219,.056],[-.033,.122,.213,.057],[.028,.104,.172,.030],[.071,.087,.105,-.015]],'#323641',18);
      s.shell([[-.115,.119,.214,.055],[-.098,.124,.219,.055],[-.086,.125,.22,.055]],'#797982',18);
      s.seam('#5b5d66',[[side*.108,-.043,.159],[side*.122,-.036,.059],[side*.107,-.008,-.029],[side*.08,-.001,-.085]],.013);
      s.seam('#5c5c69',[[-.052,.019,-.108],[0,.012,-.126],[.052,.019,-.108]],.011);
      for(let lace=0;lace<3;lace++) {
        const y=.020+lace*.014,z=.161-lace*.032;
        s.seam('#72717c',[[-.048,y-.009,z-.008],[0,y+.005,z],[.048,y-.009,z+.008]],.006);
      }
      s.finish();
      legs.push({side,hip,knee,foot});
    }
    return {root,pelvis,chest,head,arms,legs};
  }
  const models={gauthier:build(false),matar:build(true)};
  let active='',phase=0,weight=0,facing=0;
  return (player,dt,time,overview,reduceMotion)=>{
    const id=player.artist==='matar'?'matar':'gauthier';
    const model=models[id];
    if(active!==id){
      for(const [name,rig] of Object.entries(models)) rig.root.visible=name===id;
      facing=player.heading;active=id;
    }
    const delta=player.heading-facing;
    facing+=Math.atan2(Math.sin(delta),Math.cos(delta))*(1-Math.exp(-18*dt));
    model.root.position.set(player.x,.024,player.z);
    model.root.rotation.y=facing;
    weight+=(Math.min(1,player.speed/6)-weight)*(1-Math.exp(-14*dt));
    phase+=Math.min(15,player.speed*1.38)*dt;
    const motion=reduceMotion?0:weight;
    const idle=reduceMotion?0:Math.sin(time*2.1)*(1-weight);
    const run=THREE.MathUtils.clamp((player.speed-6)/6,0,1);
    const stride=Math.sin(phase), swing=Math.cos(phase);
    model.pelvis.position.y=1.17+(.012-.036*stride*stride-.037*run)*motion+idle*.004;
    model.pelvis.rotation.y=stride*.045*motion;
    model.chest.rotation.set((.055+.072*run)*motion,-stride*.14*motion,swing*.025*motion);
    model.head.rotation.set(-(.048+.064*run)*motion,stride*.067*motion+idle*.022,-swing*.017*motion);
    for(const {side,shoulder,elbow} of model.arms){
      shoulder.rotation.set(-.065+side*stride*(.47+.22*run)*motion,side*swing*.035*motion,side*(.13+.012*idle));
      elbow.rotation.x=-.19-(.22+.28*run+.12*side*swing)*motion;
    }
    for(const {side,hip,knee,foot} of model.legs){
      // Target the sole first so the planted foot sits flat while the pelvis moves.
      const forward=side*stride*(.26+.13*run)*motion;
      const lift=Math.max(0,side*swing)**1.6*(.145+.11*run)*motion;
      const down=model.pelvis.position.y-.10-.115-lift;
      const reachSquared=down*down+forward*forward;
      const bend=Math.acos(THREE.MathUtils.clamp((reachSquared-.55**2-.43**2)/(2*.55*.43),-1,1));
      const thigh=-Math.atan2(forward,down)-Math.atan2(.43*Math.sin(bend),.55+.43*Math.cos(bend));
      hip.rotation.x=thigh;
      knee.rotation.x=bend;
      foot.rotation.x=-thigh-bend+.18*side*stride*lift;
    }
  };
}
