/** Bounded render pools for traffic and stylised arcade anti-air turrets. */
export function createHazardScene({ T, scene, camera, material, basic, box, keepGeometry, keepMaterial, texture, unitBox }) {
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const palette=['#4aa4e3','#ec7851','#ecc754','#e8ebe3','#649d8b','#938ace'];
  const paints=palette.map(color=>material(color,{metalness:.38,roughness:.35}));
  const dark=material('#23303a',{roughness:.72});
  const rubber=material('#192128',{roughness:.98});
  const glass=material('#315b71',{metalness:.55,roughness:.2});
  const metal=material('#bfcbd1',{metalness:.65,roughness:.36});
  const cargoMaterial=material('#e8e4cf',{roughness:.78});
  const truckYellow=material('#edc95a',{metalness:.25,roughness:.48});
  const whiteLight=basic('#fff4ce');
  const rearLight=basic('#fa6651');
  const wheelGeometry=keepGeometry(new T.CylinderGeometry(.34,.34,.24,12));
  const hubGeometry=keepGeometry(new T.CylinderGeometry(.20,.20,.245,10));
  const truckWheelGeometry=keepGeometry(new T.CylinderGeometry(.43,.43,.28,12));
  const truckHubGeometry=keepGeometry(new T.CylinderGeometry(.26,.26,.285,10));
  const sphereGeometry=keepGeometry(new T.SphereGeometry(1,12,8));
  const contentBounds=new T.Box3();
  const boundsSize=new T.Vector3();
  const boundsCenter=new T.Vector3();

  function taperedCabin(width,base,top,front,rear,topFront,topRear) {
    const w=width*.5,tw=w*.82;
    const vertices=[-w,base,front,w,base,front,w,base,rear,-w,base,rear,-tw,top,topFront,tw,top,topFront,tw,top,topRear,-tw,top,topRear];
    const geometry=keepGeometry(new T.BufferGeometry());
    geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    geometry.setIndex([0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0,4,7,6,4,6,5,0,1,2,0,2,3]);
    geometry.computeVertexNormals();
    return geometry;
  }
  const sedanCabin=taperedCabin(1.64,.84,1.48,-1.01,1.32,-.45,.88);
  const suvCabin=taperedCabin(1.68,1.00,1.95,-1.04,1.62,-.75,1.44);

  function trafficModel(kind) {
    const root=new T.Group(),content=new T.Group();root.add(content);
    const bodyParts=[],wheels=[];
    const paintBox=(x,y,z,sx,sy,sz)=>{
      const mesh=box(content,paints[0],x,y,z,sx,sy,sz);bodyParts.push(mesh);return mesh;
    };
    if(kind==='truck'){
      box(content,dark,0,.47,0,1.94,.23,5.30);
      paintBox(0,1.14,-1.78,1.95,1.52,1.64);
      box(content,glass,0,1.55,-2.609,1.65,.64,.024);
      for(const side of [-1,1])box(content,glass,side*.981,1.51,-1.87,.021,.65,.96);
      box(content,cargoMaterial,0,1.74,.71,2.03,2.20,3.28);
      box(content,truckYellow,0,.84,2.36,2.06,.15,.03);
      box(content,dark,0,.62,-2.67,1.98,.18,.18);
      for(const x of [-.68,.68]){
        box(content,whiteLight,x,.94,-2.614,.37,.19,.03);
        box(content,rearLight,x,.65,2.65,.22,.16,.03);
      }
      for(const x of [-.85,-.42,0,.42,.85])box(content,metal,x,1.75,2.362,.022,2.11,.025);
      box(content,metal,0,2.81,.71,2.06,.04,3.32);
    }else{
      const isSUV=kind==='suv';
      paintBox(0,isSUV?.75:.63,0,1.92,isSUV?.73:.52,4.04);
      box(content,dark,0,.34,0,1.89,.16,3.86);
      const cabin=new T.Mesh(isSUV?suvCabin:sedanCabin,glass);content.add(cabin);
      paintBox(0,isSUV?1.963:1.50,isSUV?.35:.21,isSUV?1.40:1.27,.046,isSUV?2.08:1.30);
      for(const side of [-1,1]){
        paintBox(side*.81,isSUV?1.47:1.12,.27,.054,isSUV?.89:.48,.12);
        box(content,whiteLight,side*.64,isSUV?.84:.72,-2.034,.40,.105,.033);
        box(content,rearLight,side*.69,isSUV?.91:.72,2.034,.31,.11,.033);
        if(isSUV)box(content,dark,side*.65,2.025,.30,.055,.075,2.25);
      }
      box(content,dark,0,isSUV?.57:.48,-2.035,1.14,.16,.036);
      box(content,metal,0,.45,2.06,1.76,.07,.075);
    }
    const axle=kind==='truck'?1.83:1.31;
    const radius=kind==='truck'?.43:.34;
    for(const x of [-.968,.968])for(const z of [-axle,axle]){
      const wheel=new T.Group();wheel.position.set(x,radius,z);
      const tire=new T.Mesh(kind==='truck'?truckWheelGeometry:wheelGeometry,rubber);tire.rotation.z=Math.PI/2;wheel.add(tire);
      const hub=new T.Mesh(kind==='truck'?truckHubGeometry:hubGeometry,metal);hub.rotation.z=Math.PI/2;wheel.add(hub);
      content.add(wheel);wheels.push(wheel);
    }
    content.updateMatrixWorld(true);
    contentBounds.setFromObject(content);contentBounds.getSize(boundsSize);contentBounds.getCenter(boundsCenter);
    const dimensions={x:boundsSize.x,y:boundsSize.y,z:boundsSize.z};
    content.position.set(-boundsCenter.x,-contentBounds.min.y,-boundsCenter.z);
    root.userData={bodyParts,wheels,dimensions,radius};
    return root;
  }
  const trafficPool=[];
  for(let i=0;i<10;i++){
    const group=new T.Group();group.name=`traffic-car-${i}`;
    const models={sedan:trafficModel('sedan'),suv:trafficModel('suv'),truck:trafficModel('truck')};
    for(const model of Object.values(models))group.add(model);
    scene.add(group);group.visible=false;trafficPool.push({group,models});
  }

  const concrete=material('#a8b2b3',{roughness:.95});
  const turretBody=material('#557284',{metalness:.55,roughness:.41});
  const turretTrim=material('#bccdd0',{metalness:.62,roughness:.34});
  const warning=material('#efb756',{metalness:.25,roughness:.55});
  const pedestalGeometry=keepGeometry(new T.CylinderGeometry(.83,1.1,.78,12));
  const headGeometry=keepGeometry(new T.CylinderGeometry(.78,.97,.60,12));
  const pipeGeometry=keepGeometry(new T.CylinderGeometry(.19,.23,2.70,12));
  const muzzleGeometry=keepGeometry(new T.CylinderGeometry(.29,.275,.25,12));
  const muzzleInnerGeometry=keepGeometry(new T.CylinderGeometry(.20,.20,.261,12));
  const flashMaterial=basic('#ffc257',{transparent:true,opacity:.92,blending:T.AdditiveBlending,depthWrite:false});
  const coreFlashMaterial=basic('#fff7d9',{transparent:true,opacity:.98,blending:T.AdditiveBlending,depthWrite:false});
  const targetLineMaterial=keepMaterial(new T.LineBasicMaterial({color:'#ff7b55',transparent:true,opacity:.37,depthWrite:false}));
  const turretPool=[];
  for(let i=0;i<8;i++){
    const group=new T.Group();group.name=`roadside-turret-${i}`;
    box(group,concrete,0,.13,0,3.0,.26,3.0);
    box(group,warning,0,.29,0,2.55,.09,2.55);
    const pedestal=new T.Mesh(pedestalGeometry,turretTrim);pedestal.position.y=.74;group.add(pedestal);
    const yaw=new T.Group();group.add(yaw);
    const head=new T.Mesh(headGeometry,turretBody);yaw.add(head);
    const pitch=new T.Group();pitch.position.set(0,.10,.18);yaw.add(pitch);
    const barrel=new T.Group();pitch.add(barrel);
    const pipe=new T.Mesh(pipeGeometry,turretTrim);pipe.rotation.x=Math.PI/2;pipe.position.z=1.46;barrel.add(pipe);
    const muzzle=new T.Mesh(muzzleGeometry,warning);muzzle.rotation.x=Math.PI/2;muzzle.position.z=2.90;barrel.add(muzzle);
    const hole=new T.Mesh(muzzleInnerGeometry,dark);hole.rotation.x=Math.PI/2;hole.position.z=2.907;barrel.add(hole);
    for(const side of [-1,1])box(yaw,warning,side*.79,.1,.08,.18,.59,.78);
    const lightMaterial=basic('#f1b858');
    const beacon=new T.Mesh(sphereGeometry,lightMaterial);beacon.position.set(.67,.61,-.25);beacon.scale.setScalar(.24);yaw.add(beacon);
    const flash=new T.Group();flash.position.z=3.16;barrel.add(flash);
    const glow=new T.Mesh(sphereGeometry,flashMaterial);glow.scale.set(.62,.62,.88);flash.add(glow);
    const flashCore=new T.Mesh(sphereGeometry,coreFlashMaterial);flashCore.scale.set(.22,.22,.46);flash.add(flashCore);
    const lineGeometry=keepGeometry(new T.BufferGeometry());lineGeometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(6),3));
    const line=new T.Line(lineGeometry,targetLineMaterial);line.frustumCulled=false;line.visible=false;scene.add(line);
    group.visible=false;scene.add(group);
    turretPool.push({group,yaw,pitch,barrel,beacon,lightMaterial,flash,line,tip:new T.Vector3()});
  }
  const projectileGlow=texture(64,64,(ctx,w,h)=>{
    const gradient=ctx.createRadialGradient(w/2,h/2,1,w/2,h/2,w/2);
    gradient.addColorStop(0,'rgba(255,249,217,1)');gradient.addColorStop(.28,'rgba(255,188,58,.86)');gradient.addColorStop(.56,'rgba(255,100,28,.37)');gradient.addColorStop(1,'rgba(255,76,20,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  });
  const shotGlowMaterial=keepMaterial(new T.SpriteMaterial({map:projectileGlow,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
  const shotMaterial=basic('#ffe6a1');
  const tailMaterial=basic('#ff983f',{transparent:true,opacity:.72,depthWrite:false,blending:T.AdditiveBlending});
  const tailGeometry=keepGeometry(new T.CylinderGeometry(.13,0,2.5,8,1,true));
  const projectiles=[];
  for(let i=0;i<18;i++){
    const group=new T.Group();group.name=`incoming-projectile-${i}`;
    const ball=new T.Mesh(sphereGeometry,shotMaterial);group.add(ball);
    const glow=new T.Sprite(shotGlowMaterial);group.add(glow);
    const trail=new T.Mesh(tailGeometry,tailMaterial);trail.rotation.x=Math.PI/2;trail.position.z=-1.30;group.add(trail);
    group.visible=false;scene.add(group);projectiles.push({group,ball,glow,trail});
  }
  const lockMaterial=basic('#ff7950',{transparent:true,opacity:.78,depthWrite:false,side:T.DoubleSide});
  const lockGroup=new T.Group();lockGroup.name='air-target-lock';scene.add(lockGroup);
  const lockRing=new T.Mesh(keepGeometry(new T.RingGeometry(1.56,1.594,56)),lockMaterial);lockGroup.add(lockRing);
  for(let i=0;i<4;i++){
    const angle=i*Math.PI/2;
    const tick=box(lockGroup,lockMaterial,Math.cos(angle)*1.65,Math.sin(angle)*1.65,0,.30,.055,.018);tick.rotation.z=angle;
  }
  lockGroup.visible=false;
  const forward=new T.Vector3(0,0,1),direction=new T.Vector3();

  function render(state) {
    const distance=Number(state.distance)||0,time=Number(state.time)||0;
    let used=0;
    for(const vehicle of state.traffic||[]){
      const z=distance-vehicle.z;
      if(z>35||z< -570||used>=trafficPool.length)continue;
      const target=trafficPool[used++],kind=['sedan','suv','truck'].includes(vehicle.kind)?vehicle.kind:'sedan';
      target.group.visible=true;target.group.position.set(vehicle.x,0,z);
      target.group.userData.trafficId=vehicle.id;
      const model=target.models[kind];
      for(const [name,candidate] of Object.entries(target.models))candidate.visible=name===kind;
      const dims=model.userData.dimensions;
      const actualHeight=vehicle.height||(kind==='truck'?2.8:kind==='suv'?1.8:1.4);
      const actualWidth=vehicle.width||2,actualLength=vehicle.length||(kind==='truck'?5.4:4.4);
      model.scale.set(actualWidth/dims.x,actualHeight/dims.y,actualLength/dims.z);
      const colorIndex=Number.isFinite(vehicle.color)?Math.abs(vehicle.color)%paints.length:kind==='sedan'?0:kind==='suv'?1:2;
      for(const panel of model.userData.bodyParts)panel.material=paints[Math.floor(colorIndex)];
      for(const wheel of model.userData.wheels)wheel.rotation.x=-vehicle.z/(model.userData.radius*actualHeight/dims.y);
    }
    for(let i=used;i<trafficPool.length;i++)trafficPool[i].group.visible=false;
    used=0;
    for(const turret of state.turrets||[]){
      const z=distance-turret.z;
      if(z>90||z< -550||used>=turretPool.length)continue;
      const target=turretPool[used++],pivotHeight=Number(turret.y)||1.7;
      target.group.visible=true;target.group.position.set(turret.x,0,z);
      target.group.userData.turretId=turret.id;
      target.yaw.position.y=pivotHeight;
      const aimX=Number.isFinite(turret.aimX)?turret.aimX:state.x;
      const aimY=Number.isFinite(turret.aimY)?turret.aimY:state.height+.8;
      const aimZ=Number.isFinite(turret.aimZ)?turret.aimZ:distance;
      const dx=aimX-turret.x,dy=aimY-pivotHeight-.1,dz=turret.z-aimZ;
      target.yaw.rotation.y=Math.atan2(dx,dz);
      target.pitch.rotation.x=-Math.atan2(dy,Math.hypot(dx,dz));
      const firing=clamp((Number(turret.flash)||0)/.16,0,1);
      target.barrel.position.z=-firing*.19;
      target.flash.visible=firing>0;target.flash.scale.setScalar(.72+firing*.50);
      const tracking=turret.phase==='tracking';
      target.lightMaterial.color.set(tracking?'#ff7048':'#f1b858');
      target.beacon.scale.setScalar(tracking?.28+Math.sin(time*18)*.045:.24);
      target.line.visible=tracking&&state.phase!=='over';
      if(target.line.visible){
        target.group.updateMatrixWorld(true);target.flash.getWorldPosition(target.tip);
        const positions=target.line.geometry.attributes.position;
        positions.setXYZ(0,target.tip.x,target.tip.y,target.tip.z);
        positions.setXYZ(1,aimX,aimY,distance-aimZ);positions.needsUpdate=true;
      }
    }
    for(let i=used;i<turretPool.length;i++){turretPool[i].group.visible=false;turretPool[i].line.visible=false;}
    used=0;
    for(const shot of state.projectiles||[]){
      const z=distance-shot.z;
      if(z>100||z< -560||used>=projectiles.length)continue;
      const target=projectiles[used++],radius=clamp(Number(shot.radius)||.28,.12,.8);
      target.group.visible=true;target.group.position.set(shot.x,shot.y,z);
      target.group.userData.projectileId=shot.id;
      direction.set(shot.vx||0,shot.vy||0,-(shot.vz||0));
      if(direction.lengthSq()>.001)target.group.quaternion.setFromUnitVectors(forward,direction.normalize());
      target.ball.scale.setScalar(radius);target.glow.scale.setScalar(Math.max(1.05,radius*4.2));
      target.trail.scale.set(radius/.28,1,radius/.28);
    }
    for(let i=used;i<projectiles.length;i++)projectiles[i].group.visible=false;
    lockGroup.visible=state.threat?.phase==='locking'&&state.phase!=='over';
    if(lockGroup.visible){
      lockGroup.position.set(state.x,state.height+.75,.4);
      lockGroup.quaternion.copy(camera.quaternion);lockGroup.rotateZ(time*.5);
      const charge=clamp(Number(state.threat.charge)||0,0,1);
      lockGroup.scale.setScalar(1.2-charge*.25);
      lockMaterial.opacity=.45+charge*.35;
    }
  }
  return {render};
}
