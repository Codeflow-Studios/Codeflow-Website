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
    function shell(rows, tint, count = 10) {
      const verts = [], indices = [];
      for (const [y, rx, rz, dz = 0, dx = 0] of rows) {
        for (let i=0; i<count; i++) {
          const angle=(i+.5)*tau/count;
          verts.push(dx + Math.sin(angle)*rx,y,dz + Math.cos(angle)*rz);
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
    function finish() {
      const g=new THREE.BufferGeometry();
      for (const [name,data] of [['position',points],['normal',normals],['color',colors]]) {
        g.setAttribute(name,new THREE.Float32BufferAttribute(data,3));
      }
      const mesh=new THREE.Mesh(g,surface);mesh.castShadow=true;mesh.receiveShadow=true;
      node.add(mesh);
    }
    return { shell, slab, facet, finish };
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
    s.shell([[-.035,.285,.198],[.08,.30,.205],[.31,.276,.182],[.57,.328,.212],[.72,.38,.205],[.78,.29,.159],[.815,.18,.125]],shirt,12);
    s.shell([[.77,.16,.130],[.85,.149,.119],[.96,.134,.116]],skin);
    if (!matar) s.shell([[.735,.193,.153],[.79,.192,.146],[.85,.163,.139],[.88,.139,.124]],'#272b38');
    else {
      s.shell([[.762,.173,.144],[.797,.156,.132]],'#242630');
      for(let i=0;i<7;i++) {
        const a=i*.81;
        s.slab('#514953',Math.sin(a)*.13,.85+(i%3)*.024,Math.cos(a)*.11,.063,.022,.025,.54-i%2,a);
      }
    }
    s.slab('#42434f',.07,.11,-.18,.22,.026,.018,.12);
    s.slab('#252834',-.07,.20,.17,.24,.028,.023,-.16);
    s.slab('#494957',.075,.33,.168,.20,.017,.023,.25);
    s.finish();
    s=sculpt(head);
    s.shell([[-.045,.093,.11,.035],[.005,.145,.133,.040],[.12,.190,.169,.018],[.27,.202,.17],[.36,.185,.159],[.426,.127,.119]],skin,12);
    for (const side of [-1,1]) {
      s.facet(skinLight,side*.184,.185,-.01,.043,.071,.04);
      s.slab('#ad6d58',side*.191,.189,.013,.025,.048,.014);
      s.slab(hair,side*.082,.251,.159,.085,.025,.018,side*.12);
      s.slab('#d6b8aa',side*.082,.220,.168,.068,.025,.013,side*.06);
      s.slab(eye,side*.078,.220,.177,.025,.028,.012);
      s.slab('#dddfcd',side*.078-.004,.228,.185,.009,.009,.005);
    }
    s.facet(skinLight,0,.161,.168,.047,.067,.065);
    s.slab('#975e55',.001,.079,.177,.078,.014,.010);
    if (matar) {
      s.shell([[.265,.218,.188,-.005],[.31,.222,.19,-.005],[.42,.193,.17,-.02],[.472,.115,.115,-.025],[.48,.03,.034,-.022]],'#292b38',12);
      s.shell([[.262,.224,.193,-.005],[.289,.225,.193,-.005]],'#3b3b46',12);
      s.facet('#353844',0,.281,-.206,.211,.029,.148,0,1);
      s.slab('#1c202a',0,.285,.184,.114,.027,.014);
      for (const x of [-.035,0,.035]) s.slab('#848084',x,.287,.195,.009,.008,.004);
      s.slab('#aeb0af',-.158,.335,-.118,.035,.046,.01,0,.85);
    } else {
      s.shell([[.254,.203,.169,-.010],[.301,.211,.173,-.007],[.386,.195,.165,-.009],[.444,.126,.119],[.451,.045,.051]],hair,12);
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
    const arms=[],legs=[];
    for (const side of [-1,1]) {
      const shoulder=joint(chest,side*.343,.68,.0), elbow=joint(shoulder,side*.045,-.34,0);
      s=sculpt(shoulder);
      s.shell([[-.373,.097,.105,0,side*.047],[-.25,.117,.117,0,side*.033],[-.065,.138,.130,0,side*.012],[.045,.105,.105],[.075,.055,.06]],shirt);
      s.shell([[-.348,.102,.11,0,side*.048],[-.315,.110,.115,0,side*.044]],'#434451');
      s.finish();
      s=sculpt(elbow);
      const forearm=matar?skin:shirt;
      s.shell([[-.325,.061,.068,.055],[-.24,.083,.086,.045],[-.11,.097,.102,.025],[.019,.092,.102]],forearm);
      if(matar){
        for(let i=0;i<5;i++) {
          const y=-.057-i*.043,z=.022+i*.005;
          s.slab(i%2?'#5d5056':'#524650',side*(.087-i*.004),y,z,.017,.033,.094,0,0,side*(i%2?.55:-.56));
          s.slab('#665459',side*.029,y-.013,z+.074,.077,.016,.016,side*.52);
        }
      } else {
        s.shell([[-.316,.067,.077,.056],[-.276,.078,.086,.05]],'#292d38');
        s.slab(side<0?'#834e54':'#48808a',side*.10,-.106,.012,.015,.092,.029);
      }
      s.facet(skinLight,0,-.362,.069,.074,.097,.070,0,1);
      s.facet(skin,-side*.061,-.346,.101,.034,.060,.040,side*.25);
      s.finish();arms.push({side,shoulder,elbow});
      const hip=joint(pelvis,side*.154,-.10,0), knee=joint(hip,0,-.55,0), foot=joint(knee,0,-.43,0);
      s=sculpt(hip);
      s.shell([[-.56,.119,.134,.01],[-.40,.134,.148],[-.17,.151,.165],[.02,.141,.153]],'#393b48');
      if (!matar) {
        s.slab('#343642',side*.135,-.287,-.005,.057,.174,.168);
        s.slab('#555461',side*.164,-.222,-.003,.016,.033,.166);
      }
      s.finish();
      s=sculpt(knee);
      s.shell([[-.439,.102,.117,-.018],[-.346,.116,.124,-.02],[-.174,.128,.132,-.021],[.012,.12,.137,.007]],'#323541');
      s.shell([[-.418,.108,.120,-.016],[-.386,.112,.124,-.016]],'#464854');s.finish();
      s=sculpt(foot);
      s.shell([[-.109,.119,.214,.055],[-.074,.127,.219,.056],[-.033,.122,.213,.057],[.028,.104,.172,.030],[.071,.087,.105,-.015]],'#31343e',10);
      s.shell([[-.115,.119,.214,.055],[-.09,.12,.215,.055]],'#72717b');
      s.slab('#676774',0,.012,.155,.107,.014,.021,0,0,-.2);s.finish();
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
    phase+=Math.min(18,player.speed*1.58)*dt;
    const motion=reduceMotion?0:weight;
    const idle=reduceMotion?0:Math.sin(time*2.1)*(1-weight);
    model.pelvis.position.y=1.20+Math.abs(Math.cos(phase))*.052*motion+idle*.006;
    model.chest.rotation.set(.065*motion,-Math.sin(phase)*.09*motion,0);
    model.head.rotation.set(-.025*motion,Math.sin(phase)*.04*motion+idle*.028,0);
    for(const {side,shoulder,elbow} of model.arms){
      shoulder.rotation.set(-.085+side*Math.sin(phase)*.6*motion,0,side*(.13+.015*idle));
      elbow.rotation.x=-.18-(.17+.16*side*Math.cos(phase))*motion;
    }
    for(const {side,hip,knee,foot} of model.legs){
      hip.rotation.x=-side*Math.sin(phase)*.57*motion;
      knee.rotation.x=Math.max(0,side*Math.cos(phase))*.82*motion;
      foot.rotation.x=-hip.rotation.x*.42-knee.rotation.x*.58;
    }
  };
}
