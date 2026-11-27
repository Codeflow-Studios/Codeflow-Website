import { addArtistHead } from './artist-head.js';

// The sculpt is assembled in joint-local space. Every rigid section shares
// one vertex-coloured surface for its fabric, skin, seams and accessories.
export function createPerformer(THREE, scene) {
  const surface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, metalness: .035 });
  // Keep dark fabric and facial features readable in the long shadows across the midway.
  surface.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 garmentPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ngarmentPosition = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 garmentPosition;')
      .replace('#include <opaque_fragment>', `
        float pitch = length(fwidth(garmentPosition)) * 160.;
        float weave = cos(garmentPosition.y*155. + garmentPosition.x*101.) *
                      cos(garmentPosition.z*159. - garmentPosition.x*113.);
        float grain = weave * (1. - smoothstep(.35,1.4,pitch));
        float darkFabric = 1. - smoothstep(.105,.27,diffuseColor.r);
        outgoingLight = (outgoingLight + diffuseColor.rgb * .35) * (1. + grain * darkFabric * .09);
        #include <opaque_fragment>`);
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
    // Tailored leather follows a series of cut edges. Narrow bevels catch the
    // stage light, while a painted ridge gives even black cloth a readable fold.
    function tailored(rows, outward, palette, relief = .012) {
      const vertices = [], tints = [], indices = [];
      const direction = new THREE.Vector3(...outward).normalize();
      for (const [ax, ay, az, bx, by, bz] of rows) {
        for (const [u, fold, shade] of [[0,0,0],[.12,.5,1],[.46,1,2],[.89,.38,1],[1,0,0]]) {
          vertices.push(ax+(bx-ax)*u+direction.x*relief*fold,
            ay+(by-ay)*u+direction.y*relief*fold,
            az+(bz-az)*u+direction.z*relief*fold);
          color.set(palette[shade]);
          tints.push(color.r,color.g,color.b);
        }
      }
      const across = new THREE.Vector3().fromArray(vertices,12).sub(new THREE.Vector3().fromArray(vertices));
      const along = new THREE.Vector3().fromArray(vertices,15).sub(new THREE.Vector3().fromArray(vertices));
      const reverse = across.cross(along).dot(direction) < 0;
      for (let row=1; row<rows.length; row++) for (let col=0; col<4; col++) {
        const a=(row-1)*5+col, b=a+1, c=a+5, d=c+1;
        indices.push(...(reverse ? [a,c,b,b,c,d] : [a,b,c,b,d,c]));
      }
      const patch = new THREE.BufferGeometry();
      patch.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      patch.setIndex(indices);
      patch.computeVertexNormals();
      const axes = patch.getAttribute('normal');
      for (const index of indices) {
        const offset=index*3;
        points.push(vertices[offset],vertices[offset+1],vertices[offset+2]);
        normals.push(axes.getX(index),axes.getY(index),axes.getZ(index));
        colors.push(tints[offset],tints[offset+1],tints[offset+2]);
      }
      patch.dispose();
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
    return { shell, slab, facet, seam, tailored, finish };
  }

  function build(matar) {
    const root=joint(scene,0,0,0), pelvis=joint(root,0,1.20,0), chest=joint(pelvis,0,.04,0);
    const head=joint(chest,0,.91,.01);
    const skin=matar?'#df986e':'#d58e68', skinLight=matar?'#efad81':'#e3a478';
    const shirt=matar?'#34343d':'#343847';
    const leather = matar ? ['#342b35','#594349','#79564e'] : ['#242d39','#35434e','#4c5d66'];
    const steel = matar ? ['#534047','#886950','#c39a69'] : ['#374450','#687880','#9baba8'];
    const lining = matar ? '#8a504a' : '#4f7780';
    let s=sculpt(pelvis);
    s.shell([[-.18,.265,.185],[.00,.29,.194],[.14,.255,.177]],'#373849');
    s.shell([[-.093,.281,.202],[-.074,.293,.211],[-.010,.302,.215],[.008,.291,.208]],leather[1],20);
    s.shell([[-.075,.295,.214],[-.062,.297,.216]],leather[2],20);
    s.slab(steel[1],0,-.035,.216,.121,.079,.023);
    s.slab(leather[0],0,-.035,.231,.084,.045,.012);
    s.slab(steel[2],-.002,-.031,.240,.064,.011,.009);
    for (const side of [-1,1]) {
      s.slab(steel[1],side*.182,-.031,-.170,.036,.080,.018,0,side*.55);
      s.slab(leather[2],side*.199,-.038,.158,.035,.081,.028,0,side*.65);
    }
    s.finish();
    s=sculpt(chest);
    const hem=matar?.318:.285;
    s.shell([[-.046,hem,.202],[.01,hem+.011,.209],[.10,hem,.203],[.33,hem-.014,.189],[.56,.325,.207],[.69,.373,.202],[.747,.356,.180],[.79,.257,.146],[.816,.177,.127]],shirt,24,.039);
    if (!matar) s.shell([[.77,.16,.130],[.85,.149,.119],[.96,.134,.116]],skin);
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
    if (matar) {
      // A broad crossed harness sits over the tour shirt and follows the spine.
      for (const side of [-1,1]) {
        s.tailored([
          [side*.215,.757,-.134, side*.307,.712,-.125],
          [side*.123,.597,-.205, side*.204,.574,-.178],
          [side*.012,.427,-.216, side*.084,.410,-.209],
          [-side*.096,.278,-.196, -side*.032,.245,-.203],
          [-side*.201,.113,-.159, -side*.132,.086,-.190],
        ],[0,0,-1],leather,.013);
        s.tailored([
          [side*.307,.712,-.125, side*.338,.679,-.073],
          [side*.298,.768,-.047, side*.349,.727,-.014],
          [side*.283,.763,.063, side*.332,.726,.094],
          [side*.237,.688,.149, side*.303,.663,.123],
          [side*.233,.61,.158, side*.285,.602,.137],
        ],[side,.75,0],leather,.009);
        s.slab(steel[1],side*.176,.59,-.198,.095,.029,.026,-side*.55,-side*.30);
        s.slab(steel[2],side*.230,.685,.151,.053,.017,.013,-side*.24,side*.45);
      }
      s.facet(steel[2],0,.403,-.238,.070,.061,.021,.78);
      s.facet(leather[0],0,.403,-.253,.038,.033,.010,.78);
      s.tailored([[-.227,.141,-.140,.227,.141,-.140],
        [-.235,.089,-.139,.235,.089,-.139],
        [-.183,.014,-.174,.183,.014,-.174]], [0,0,-1],leather,.085);
      s.tailored([[.177,.732,.173,.249,.701,.158],[.094,.632,.200,.175,.603,.185],
        [-.026,.491,.219,.045,.461,.217],[-.140,.354,.178,-.069,.326,.204],
        [-.225,.198,.144,-.168,.161,.175],[-.266,.079,.122,-.201,.048,.163]],
        [0,0,1],leather,.016);
      s.slab(steel[1],.079,.566,.220,.081,.055,.019,.76);
      s.slab(leather[0],.079,.566,.230,.050,.030,.010,.76);
      for (const side of [-1,1]) {
        s.tailored([[side*.270,.640,.154,side*.320,.648,.105],
          [side*.255,.452,.133,side*.310,.463,.082],
          [side*.236,.267,.139,side*.295,.248,.073],
          [side*.251,.075,.148,side*.302,.066,.095]], [side*.55,0,1],leather,.012);
      }
    } else {
      // A short storm mantle parts around the hood and drapes over the shoulder blades.
      for (const side of [-1,1]) {
        s.tailored([
          [side*.106,.791,-.131, side*.246,.773,-.115],
          [side*.096,.735,-.222, side*.335,.704,-.108],
          [side*.035,.645,-.223, side*.304,.642,-.139],
          [side*.021,.578,-.215, side*.209,.604,-.177],
          [side*.044,.527,-.209, side*.126,.543,-.200],
        ],[side*.22,.2,-1],leather,.019);
        s.seam(lining,[[side*.046,.529,-.218],[side*.125,.549,-.209],
          [side*.206,.608,-.185],[side*.298,.641,-.145]],.014);
        s.tailored([[side*.024,.511,-.210,side*.199,.541,-.181],
          [side*.023,.311,-.193,side*.177,.344,-.161],
          [side*.037,.047,-.208,side*.190,.073,-.168],
          [side*.091,-.017,-.203,side*.174,.024,-.177]], [side*.22,0,-1],
          ['#232933','#303d48','#404f5a'],.011);
        s.facet(steel[1],side*.255,.655,-.179,.024,.018,.012);
        s.tailored([[side*.153,.789,.122,side*.273,.753,.112],
          [side*.177,.700,.189,side*.330,.671,.103],
          [side*.220,.581,.162,side*.294,.577,.120],
          [side*.193,.435,.158,side*.271,.441,.094],
          [side*.194,.273,.152,side*.262,.282,.092],
          [side*.128,.047,.193,side*.253,.069,.124],
          [side*.145,-.029,.191,side*.233,.004,.142]],
          [side*.32,0,1],leather,.019);
        s.seam(lining,[[side*.185,.691,.196],[side*.221,.580,.172],
          [side*.199,.449,.167]],.010);
        for (const [y,z] of [[.386,.159],[.329,.158]]) {
          s.slab(steel[1],side*.219,y,z,.044,.014,.014,side*.20,side*.58);
        }
      }
      s.slab(steel[1],0,.619,-.237,.056,.060,.017,.78);
      s.slab(lining,0,.619,-.248,.034,.038,.009,.78);
    }
    // Embossed cuff hems and a laminated festival pass add shape under side lighting.
    const passColor = matar ? '#c580ad' : '#afb982';
    s.seam(passColor,[[-.105,.76,.170],[-.062,.63,.215],[0,.515,.221],[.062,.63,.215],[.105,.76,.170]],.011);
    s.slab('#292732',0,.471,.229,.118,.142,.020);
    s.slab(passColor,0,.473,.244,.095,.116,.012);
    s.slab('#3c3548',0,.502,.253,.067,.020,.008);
    s.slab('#ece0bc',0,.454,.253,.060,.030,.008);
    // Artist-specific embroidery stays readable from the follow camera.
    const patchZ = -.274;
    const trim = matar ? '#f0a4d2' : '#d8ed96';
    s.slab('#262333',0,.52,patchZ,.282,.173,.013);
    s.seam(matar ? '#92567d' : '#758552',[
      [-.145,.434,patchZ-.009],[-.145,.607,patchZ-.009],[.145,.607,patchZ-.009],
      [.145,.434,patchZ-.009],[-.145,.434,patchZ-.009],
    ],.012);
    const insignia = matar
      ? [[-.101,.519],[-.081,.519],[-.066,.539],[-.052,.496],[-.033,.551],[-.015,.481],
         [.008,.566],[.028,.492],[.047,.543],[.064,.506],[.080,.528],[.101,.519]]
      : [[-.004,.568],[-.070,.513],[-.012,.513],[-.044,.473],[.075,.532],[.019,.532],[.057,.568]];
    s.seam(trim,insignia.map(([x,y])=>[x,y,patchZ-.016]),.015);
    for (const side of [-1,1]) {
      s.seam(matar?'#8c6284':'#818c5b',[
        [side*.275,.735,-.182],[side*.303,.690,-.161],[side*.284,.65,-.177],
      ],.013);
    }
    s.finish();
    addArtistHead(THREE,head,matar,sculpt);
    const arms=[],legs=[];
    for (const side of [-1,1]) {
      const shoulder=joint(chest,side*.343,.68,.0), elbow=joint(shoulder,side*.045,-.34,0);
      s=sculpt(shoulder);
      const cuff=matar?.122:.098;
      s.shell([[-.362,cuff,cuff+.006,0,side*.046],[-.316,cuff+.006,cuff+.010,0,side*.043],[-.213,.122,.125,0,side*.03],[-.074,.139,.132,0,side*.012],[.026,.119,.111],[.072,.061,.064]],shirt,16,.04);
      s.shell([[-.363,cuff+.002,cuff+.008,0,side*.047],[-.342,cuff+.006,cuff+.011,0,side*.044]],'#42434f',16,.036);
      if (side === (matar ? 1 : -1)) {
        // Floating lames telescope down the sleeve when the arm swings.
        for (let i=0; i<3; i++) {
          const y=.037-i*.065, x=side*(.026+i*.007), r=.147+i*.007;
          s.shell([[y-.044,r,.145,0,x],[y-.024,r+.012,.152,0,x],
            [y+.028,r-.014,.134,0,x],[y+.056,r*.64,.091,0,x]],leather[i===0?2:1],12);
          s.shell([[y-.043,r+.002,.147,0,x],[y-.031,r+.011,.153,0,x]],steel[0],12);
        }
        for (const z of [-.072,.072]) s.facet(steel[2],side*.183,-.059,z,.019,.019,.015);
      } else {
        s.shell([[-.279,.137,.132,0,side*.035],[-.262,.140,.138,0,side*.035],
          [-.239,.134,.131,0,side*.034]],leather[1],16);
        s.tailored([[side*.129,-.002,-.026,side*.123,-.002,.046],
          [side*.159,-.117,-.055,side*.159,-.117,.061],
          [side*.158,-.219,-.031,side*.163,-.206,.027]],
          [side,0,0],leather);
      }
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
      // The open inner edge leaves Matar's sleeve tattoos visible.
      if (!matar || side>0) {
        s.tailored([[side*.050,-.052,-.063, side*.100,-.067,.062],
          [side*.047,-.119,-.066, side*.102,-.121,.065],
          [side*.041,-.235,-.035, side*.080,-.246,.087],
          [side*.026,-.282,-.023, side*.065,-.271,.076]],
          [side,0,-.29],leather,.025);
        for (const [y,r,z] of [[-.115,.101,.026],[-.252,.083,.047]]) {
          s.shell([[y-.013,r,r+.006,z],[y+.014,r+.003,r+.009,z]],leather[1],14);
          s.slab(steel[1],side*(r+.005),y,z-.012,.016,.026,.052);
        }
        s.seam(steel[1],[[side*.086,-.078,-.042],[side*.086,-.15,-.047],
          [side*.069,-.232,-.021]],.008);
      } else {
        s.shell([[-.307,.071,.075,.053],[-.273,.078,.082,.05]],leather[0],14);
        s.shell([[-.287,.076,.081,.052],[-.279,.079,.084,.052]],steel[1],14);
      }
      s.facet(skinLight,0,-.353,.063,.061,.078,.067,0,1);
      s.facet(skin,-side*.045,-.356,.107,.028,.048,.029,side*.31,1);
      for(let finger=0;finger<4;finger++) {
        const z=.025+finger*.025;
        s.facet(finger%2?skinLight:skin,-side*.008,-.397+.006*Math.abs(finger-2),z,.042,.048-.006*Math.abs(finger-2),.017,side*-.20,1);
      }
      const wrist = matar ? (side<0?'#b673b1':'#626d8d') : (side<0?'#97ad6b':'#646e89');
      s.shell([[-.317,.072,.080,.055],[-.304,.076,.084,.053],[-.287,.079,.087,.050]],wrist,18);
      s.slab('#dfd1b2',side*.078,-.301,.061,.018,.017,.035);
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
      if (!matar) {
        // The split coat skirts ride with their respective hip, clear of the knee joint.
        s.tailored([[-side*.140,.08,-.210,side*.115,.055,-.143],
          [-side*.118,-.076,-.207,side*.148,-.069,-.122],
          [-side*.094,-.214,-.195,side*.155,-.237,-.101],
          [-side*.030,-.379,-.184,side*.103,-.315,-.144]],
          [side*.24,0,-1],leather,.023);
        s.seam(lining,[[-side*.030,-.376,-.189],[side*.031,-.349,-.177],
          [side*.105,-.310,-.150]],.012);
      } else if (side<0) {
        s.shell([[-.237,.151,.164],[-.215,.154,.168]],leather[1],16);
        s.tailored([[side*.074,-.065,-.150,side*.130,-.060,-.088],
          [side*.090,-.117,-.158,side*.154,-.102,-.081],
          [side*.093,-.248,-.154,side*.156,-.236,-.073],
          [side*.085,-.276,-.145,side*.143,-.263,-.080]], [side,0,-.75],leather,.030);
        s.slab(steel[1],side*.123,-.135,-.154,.037,.029,.023,0,side*.65);
      }
      s.finish();
      s=sculpt(knee);
      s.shell([[-.439,.102,.117,-.018],[-.358,.116,.125,-.024],[-.307,.112,.126,-.031],[-.174,.128,.132,-.021],[-.072,.119,.126],[.012,.12,.137,.007]],'#323541',16,.044);
      s.shell([[-.418,.108,.120,-.016],[-.386,.112,.124,-.016]],'#464854');
      s.shell([[-.430,.104,.123,-.018],[-.375,.119,.136,-.022],
        [-.286,.120,.138,-.027],[-.197,.132,.143,-.021]],leather[0],16);
      s.shell([[-.226,.135,.146,-.022],[-.198,.136,.149,-.021]],leather[1],16);
      s.tailored([[-.077,-.155,-.136,.079,-.155,-.136],
        [-.115,-.201,-.105,.116,-.201,-.109],
        [-.082,-.300,-.143,.086,-.296,-.140],
        [-.048,-.401,-.143,.053,-.397,-.140]], [0,0,-1],leather,.064);
      s.tailored([[-.073,-.143,.097,.075,-.143,.097],
        [-.104,-.193,.081,.103,-.193,.082],
        [-.063,-.284,.094,.066,-.279,.094],
        [-.039,-.342,.106,.040,-.337,.105]], [0,0,1],leather,.045);
      s.seam(lining,[[side*.071,-.169,-.149],[side*.088,-.214,-.145],
        [side*.057,-.308,-.171]],.010);
      s.slab(steel[1],side*.121,-.219,-.043,.021,.035,.066);
      s.finish();
      s=sculpt(foot);
      s.shell([[-.109,.119,.214,.055],[-.074,.127,.219,.056],[-.033,.122,.213,.057],[.028,.104,.172,.030],[.071,.087,.105,-.015]],'#323641',18);
      s.shell([[-.115,.119,.214,.055],[-.098,.124,.219,.055],[-.086,.125,.22,.055]],'#797982',18);
      s.seam('#5b5d66',[[side*.108,-.043,.159],[side*.122,-.036,.059],[side*.107,-.008,-.029],[side*.08,-.001,-.085]],.013);
      s.seam('#5c5c69',[[-.052,.019,-.108],[0,.012,-.126],[.052,.019,-.108]],.011);
      s.seam(matar ? '#aa6b99' : '#8e9d6b', [
        [-.076,-.064,-.132],[0,-.064,-.142],[.076,-.064,-.132],
      ],.013);
      for (let tread=0;tread<4;tread++){
        s.slab('#242735',side*.112,-.107,-.075+tread*.068,.021,.012,.025);
      }
      s.tailored([[-.069,.013,-.101,.069,.013,-.101],
        [-.099,-.049,-.116,.099,-.049,-.116],
        [-.103,-.084,-.116,.103,-.084,-.116]], [0,0,-1],leather,.048);
      for(let lace=0;lace<3;lace++) {
        const y=.020+lace*.014,z=.161-lace*.032;
        s.seam('#72717c',[[-.048,y-.009,z-.008],[0,y+.005,z],[.048,y-.009,z+.008]],.006);
      }
      s.finish();
      legs.push({side,hip,knee,foot});
    }
    const marker=joint(chest,.17,.33,.30);
    const gear=sculpt(marker);
    gear.slab('#4de1c3',0,0,.10,.19,.17,.40);
    gear.slab('#b8ffeb',0,.087,.07,.15,.025,.35);
    gear.slab('#364650',0,-.067,-.046,.102,.215,.116);
    gear.facet('#454c72',0,.17,.04,.27,.16,.23);
    gear.slab('#85aeff',0,.225,.04,.19,.047,.18);
    gear.slab('#ff905c',0,.011,.36,.115,.11,.27);
    gear.slab('#ffc091',0,.011,.49,.128,.125,.05);
    gear.finish();
    return {root,pelvis,chest,head,arms,legs,marker};
  }
  const models={gauthier:build(false),matar:build(true)};
  let active='',phase=0,weight=0,facing=0, lateral=0,longitudinal=0;
  return (player,dt,time,overview,reduceMotion)=>{
    const id=player.artist==='matar'?'matar':'gauthier';
    const model=models[id];
    if(active!==id){
      for(const [name,rig] of Object.entries(models)) rig.root.visible=name===id;
      facing=player.heading;active=id;
    }
    const kick = reduceMotion ? 0 : player.markerKick;
    if (player.markerKick > .66) facing = player.heading;
    const delta=player.heading-facing;
    facing+=Math.atan2(Math.sin(delta),Math.cos(delta))*(1-Math.exp(-18*dt));
    model.root.position.set(player.x,.024+(player.jumpHeight || 0),player.z);
    const airborne=reduceMotion?0:(player.liftPose || 0);
    const compression=reduceMotion?0:(player.crouch || 0);
    model.root.rotation.y=facing;
    weight+=(Math.min(1,player.speed/6)-weight)*(1-Math.exp(-14*dt));
    phase+=Math.min(15,player.speed*1.38)*dt;
    const gaitBlend=1-Math.exp(-12*dt);
    lateral+=(-(player.strafe || 0)-lateral)*gaitBlend;
    longitudinal+=((player.forward || 0)-longitudinal)*gaitBlend;
    const motion=reduceMotion?0:weight*(1-airborne*.9);
    const idle=reduceMotion?0:Math.sin(time*2.1)*(1-weight);
    const run=THREE.MathUtils.clamp((player.speed-6)/6,0,1);
    const stride=Math.sin(phase), swing=Math.cos(phase);
    model.pelvis.position.y=1.17+(.012-.036*stride*stride-.037*run)*motion+idle*.004-compression*.14;
    model.pelvis.rotation.y=stride*.045*motion*longitudinal;
    model.pelvis.rotation.z=-lateral*.035*motion;
    model.chest.rotation.set((.055+.072*run)*motion*longitudinal,-stride*.14*motion*longitudinal,(swing*.025-lateral*.11)*motion);
    model.chest.rotation.x+=compression*.17-airborne*.11;
    model.head.rotation.set(-(.048+.064*run)*motion,stride*.067*motion+idle*.022,-swing*.017*motion);
    model.marker.position.set(.17,.33 + idle * .007,.30 - kick * .094);
    model.marker.rotation.x = -kick * .19 + swing * .015 * motion;
    model.chest.rotation.x += kick * .06;
    for (const {side,shoulder,elbow} of model.arms) {
      shoulder.rotation.set((side > 0 ? -.32 : -.78) - kick * .15 + swing * .04 * motion,
        side > 0 ? -.13 : .64, side > 0 ? -.23 : .44);
      elbow.rotation.x = (side > 0 ? -1.16 : -.63) + kick * .27;
    }
    for(const {side,hip,knee,foot} of model.legs){
      // Target the sole first so the planted foot sits flat while the pelvis moves.
      const forward=side*stride*(.26+.13*run)*motion*longitudinal+airborne*(side<0?.16:-.046);
      const outward=side*(.035+Math.abs(lateral)*.1)*motion;
      const sideStep=outward+lateral*side*stride*(.16+.065*run)*motion;
      const lift=Math.max(0,side*swing)**1.6*(.145+.11*run)*motion+airborne*(side<0?.27:.16);
      const down=model.pelvis.position.y-.10-.115-lift;
      const reachSquared=down*down+forward*forward+sideStep*sideStep;
      const bend=Math.acos(THREE.MathUtils.clamp((reachSquared-.55**2-.43**2)/(2*.55*.43),-1,1));
      const thigh=-Math.atan2(forward,down)-Math.atan2(.43*Math.sin(bend),.55+.43*Math.cos(bend));
      hip.rotation.x=thigh;
      hip.rotation.z=Math.atan2(sideStep,down);
      knee.rotation.x=bend;
      foot.rotation.x=-thigh-bend+.18*side*stride*lift;
      foot.rotation.z=-hip.rotation.z;
    }
  };
}
