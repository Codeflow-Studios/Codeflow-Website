// Cloth shares a single moving surface and a single pennant atlas. The design
// repeats across both sides, keeping the three stages legible from the path.
export function createFestivalAtmosphere(THREE, scene, venues, reduceMotion) {
  const canvas = Object.assign(document.createElement('canvas'), { width: 128, height: 128 });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#eee8d8'; ctx.fillRect(0,0,128,128);
  ctx.fillStyle = '#263346';
  for(let x=0;x<8;x++) for(let y=0;y<2;y++) {
    if((x+y)%2===0) { ctx.fillRect(x*16,y*16,16,16); ctx.fillRect(x*16,96+y*16,16,16); }
  }
  ctx.beginPath();
  ctx.moveTo(66,36);ctx.lineTo(72,54);ctx.lineTo(95,63);ctx.lineTo(72,69);ctx.lineTo(62,94);
  ctx.lineTo(55,72);ctx.lineTo(33,64);ctx.lineTo(57,55);ctx.closePath();ctx.fill();
  const clothMap = new THREE.CanvasTexture(canvas);
  clothMap.colorSpace=THREE.SRGBColorSpace;
  const vertices=[], texCoords=[], colors=[], faces=[], anchors=[];
  for(const [i,v] of venues.entries()) {
    const tint=new THREE.Color(v.color);
    for(const side of [-1,1]) {
      const x=v.x+side*(i===0?10.7:8.82), y=i===0?10.9:8.55, z=v.z+4.0;
      const start=vertices.length/3, phase=i*1.9+side;
      const mast=new THREE.Mesh(new THREE.CylinderGeometry(.044,.074,2.9,6),new THREE.MeshStandardMaterial({color:'#9d9fab',metalness:.35,roughness:.6}));
      mast.position.set(x,y-1.42,z);scene.add(mast);
      for(let row=0;row<=2;row++) for(let col=0;col<=7;col++) {
        const u=col/7,t=row/2;
        const xx=x+side*(.06+u*3.35), yy=y-t*(1.31-.22*u)-u*.12;
        vertices.push(xx,yy,z);texCoords.push(u,1-t);colors.push(tint.r,tint.g,tint.b);
        anchors.push({u,y:yy,z,phase});
        if(row&&col) {const end=start+row*8+col;faces.push(end-9,end-1,end,end-9,end,end-8);}
      }
    }
  }
  const shape=new THREE.BufferGeometry();
  const positions=new THREE.Float32BufferAttribute(vertices,3);
  shape.setAttribute('position',positions);shape.setAttribute('uv',new THREE.Float32BufferAttribute(texCoords,2));
  shape.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));shape.setIndex(faces);
  const flags=new THREE.Mesh(shape,new THREE.MeshBasicMaterial({map:clothMap,vertexColors:true,side:THREE.DoubleSide}));
  flags.name='Festival podiumvlaggen';scene.add(flags);
  positions.setUsage(THREE.DynamicDrawUsage);
  function blow(time) {
    for (let i=0;i<anchors.length;i++) {
      const a=anchors[i], wave=Math.sin(a.u*6.8-time*2.7+a.phase);
      positions.setY(i,a.y+a.u*(wave*.14+Math.sin(a.u*4.7-time+a.phase)*.09));
      positions.setZ(i,a.z+a.u*(wave*.57+.19*Math.sin(a.u*13-time*2.7)));
    }
    positions.needsUpdate=true;
  }
  blow(.86);
  return reduceMotion?()=>{}:blow;
}
