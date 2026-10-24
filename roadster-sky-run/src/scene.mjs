/**
 * Original, asset-free roadster scene. Simulation values are in metres/seconds.
 * Three.js r149 is supplied by the host as globalThis.THREE.
 * The player stays at z=0; every roadside object moves relative to distance.
 */
import { createHazardScene } from './hazard-scene.mjs';
import { ROAD_HALF_WIDTH, LANE_CENTERS, PLAYER_START_X } from './road-config.mjs';

export function createRoadsterScene(canvas) {
  const T = globalThis.THREE;
  if (!T?.WebGLRenderer) throw new Error('Three.js 尚未加载');
  if (!canvas) throw new Error('缺少游戏画布');
  const roadWidth=ROAD_HALF_WIDTH*2;
  const laneDividers=LANE_CENTERS.slice(0,-1).map((center,index)=>(center+LANE_CENTERS[index+1])/2);
  const railX=ROAD_HALF_WIDTH+.9;
  const lampX=ROAD_HALF_WIDTH+3.2;
  const canopyWidth=roadWidth+3.6;

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.6));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  scene.name = 'roadster-sky-run';
  const horizon = new T.Color('#b8d9e9');
  scene.background = horizon;
  scene.fog = new T.Fog(horizon, 115, 550);
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.1, 1150);
  camera.position.set(PLAYER_START_X, 3.5, 8.5);
  const lookAt = new T.Vector3(0, 1.1, -20);
  const temp = new T.Object3D();
  const resources = { geometries: new Set(), materials: new Set(), textures: new Set() };
  const keepGeometry = geometry => (resources.geometries.add(geometry), geometry);
  const keepMaterial = material => (resources.materials.add(material), material);
  const keepTexture = texture => (resources.textures.add(texture), texture);
  const material = (color, extra = {}) => keepMaterial(new T.MeshStandardMaterial({ color, roughness: 0.72, ...extra }));
  const basic = (color, extra = {}) => keepMaterial(new T.MeshBasicMaterial({ color, ...extra }));
  const unitBox = keepGeometry(new T.BoxGeometry(1, 1, 1));
  const planeGeometry = keepGeometry(new T.PlaneGeometry(1, 1));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const wrap = (n, length) => ((n % length) + length) % length;
  const mix = (a, b, factor) => a + (b - a) * factor;
  let seed = 17843;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function texture(width, height, draw, encoding = T.sRGBEncoding) {
    const target = document.createElement('canvas');
    target.width = width;
    target.height = height;
    const context = target.getContext('2d');
    if (!context) throw new Error('无法创建场景纹理');
    draw(context, width, height);
    const result = keepTexture(new T.CanvasTexture(target));
    result.encoding = encoding;
    result.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    return result;
  }
  function box(parent, mat, x, y, z, sx, sy, sz, shadows = false) {
    const mesh = new T.Mesh(unitBox, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    parent.add(mesh);
    return mesh;
  }
  function plane(parent, mat, x, y, z, sx, sy) {
    const mesh = new T.Mesh(planeGeometry, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, 1);
    parent.add(mesh);
    return mesh;
  }
  function instance(parent, geometry, mat, count) {
    const mesh = new T.InstancedMesh(geometry, mat, count);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    // Instanced transforms recycle across the entire visible road.
    mesh.frustumCulled = false;
    parent.add(mesh);
    return mesh;
  }
  function setInstance(mesh, index, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    temp.position.set(x, y, z);
    temp.scale.set(sx, sy, sz);
    temp.rotation.set(rx, ry, rz);
    temp.updateMatrix();
    mesh.setMatrixAt(index, temp.matrix);
  }

  // A compact generated environment gives the silver body readable reflections.
  const environment = texture(512, 256, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#579acb');
    gradient.addColorStop(0.42, '#d1e7ed');
    gradient.addColorStop(0.52, '#faf6e8');
    gradient.addColorStop(0.6, '#67795d');
    gradient.addColorStop(1, '#29333b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillRect(w * 0.18, 18, w * 0.19, 71);
    ctx.fillStyle = 'rgba(255,255,255,.48)';
    ctx.fillRect(w * 0.73, 26, w * 0.1, 79);
  });
  environment.mapping = T.EquirectangularReflectionMapping;
  const pmrem = new T.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromEquirectangular(environment);
  scene.environment = environmentTarget.texture;
  pmrem.dispose();

  const hemisphere = new T.HemisphereLight('#e6f5ff', '#566342', 1.35);
  scene.add(hemisphere);
  const sunlight = new T.DirectionalLight('#fff3d3', 2.05);
  sunlight.position.set(-24, 45, 22);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  sunlight.shadow.camera.left = -15;
  sunlight.shadow.camera.right = 15;
  sunlight.shadow.camera.top = 20;
  sunlight.shadow.camera.bottom = -16;
  sunlight.shadow.camera.near = 1;
  sunlight.shadow.camera.far = 105;
  sunlight.shadow.normalBias = 0.05;
  sunlight.shadow.bias = -0.00025;
  scene.add(sunlight, sunlight.target);

  const skyMaterial = keepMaterial(new T.ShaderMaterial({
    uniforms: { top: { value: new T.Color('#72abe0') }, bottom: { value: horizon } },
    vertexShader: 'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 top;uniform vec3 bottom;varying vec3 vDirection;void main(){float h=pow(max(normalize(vDirection).y,0.0),0.55);gl_FragColor=vec4(mix(bottom,top,h),1.0);}',
    side: T.BackSide, depthWrite: false, fog: false,
  }));
  const sky = new T.Mesh(keepGeometry(new T.SphereGeometry(1000, 24, 12)), skyMaterial);
  sky.renderOrder = -100;
  scene.add(sky);

  const glowTexture = texture(128, 128, (ctx, w, h) => {
    const glow = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    glow.addColorStop(0, 'rgba(255,252,231,1)');
    glow.addColorStop(0.13, 'rgba(255,253,238,.95)');
    glow.addColorStop(0.3, 'rgba(255,247,222,.2)');
    glow.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  });
  const sun = new T.Sprite(keepMaterial(new T.SpriteMaterial({ map: glowTexture, transparent: true, depthWrite: false, fog: false })));
  sun.position.set(-210, 260, -500);
  sun.scale.set(145, 145, 1);
  scene.add(sun);

  const cloudTexture = texture(256, 128, (ctx, w, h) => {
    const puffs = [[.2,.60,.26],[.38,.42,.32],[.59,.47,.3],[.77,.58,.22],[.49,.65,.33]];
    for (const [x, y, r] of puffs) {
      const gradient = ctx.createRadialGradient(w*x, h*y, 0, w*x, h*y, h*r);
      gradient.addColorStop(0, 'rgba(255,255,255,.85)');
      gradient.addColorStop(.56, 'rgba(255,255,255,.61)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
  });
  const cloudMaterial = keepMaterial(new T.SpriteMaterial({ map: cloudTexture, transparent: true, opacity: .78, depthWrite: false, fog: false }));
  const clouds = [];
  for (let i = 0; i < 8; i++) {
    const cloud = new T.Sprite(cloudMaterial);
    cloud.position.set(-470 + i * 130, 100 + (i % 3) * 37, -520 - (i % 2) * 80);
    cloud.scale.set(185 + (i % 3) * 35, 83 + (i % 2) * 15, 1);
    cloud.userData.startX = cloud.position.x;
    clouds.push(cloud);
    scene.add(cloud);
  }

  function mountainRidge(z, color, averageHeight, jaggedness) {
    const vertices = [];
    const colors = [];
    const colorObject = new T.Color(color);
    const shades = [0.9, 1, 1.06];
    const points = [];
    for (let i = 0; i <= 36; i++) points.push({ x: -900 + i * 50, y: averageHeight + random() * jaggedness });
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]; const b = points[i + 1];
      vertices.push(a.x, -3, z + 10, b.x, -3, z + 10, a.x, a.y, z, b.x, -3, z + 10, b.x, b.y, z, a.x, a.y, z);
      for (let j = 0; j < 6; j++) colors.push(colorObject.r * shades[i % 3], colorObject.g * shades[i % 3], colorObject.b * shades[i % 3]);
    }
    const geometry = keepGeometry(new T.BufferGeometry());
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const mesh = new T.Mesh(geometry, basic('#ffffff', { vertexColors: true, fog: false, side: T.DoubleSide }));
    scene.add(mesh);
  }
  mountainRidge(-720, '#90b5c7', 32, 46);
  mountainRidge(-630, '#75a2b0', 17, 40);
  mountainRidge(-555, '#6f968c', 5, 28);

  const asphaltTexture = texture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#505861';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 11500; i++) {
      const shade = 51 + Math.floor(random() * 82);
      ctx.fillStyle = `rgba(${shade},${shade+5},${shade+10},${.2+random()*.3})`;
      ctx.fillRect(random()*w, random()*h, random()>.92?2:1, 1);
    }
  });
  asphaltTexture.wrapS = asphaltTexture.wrapT = T.RepeatWrapping;
  asphaltTexture.repeat.set(3, 180);
  const road = plane(scene, material('#e0e2e3', { map: asphaltTexture, roughness: .99 }), 0, 0, -350, roadWidth, 1100);
  road.name = 'asphalt-road';
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  const grassTexture = texture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#82a650';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const c = 50 + Math.floor(random()*50);
      ctx.fillStyle = `rgba(${c+44},${c+72},${c+12},.27)`;
      ctx.fillRect(random()*w, random()*h, 1+random()*2, 1);
    }
  });
  grassTexture.wrapS = grassTexture.wrapT = T.RepeatWrapping;
  grassTexture.repeat.set(165, 150);
  const ground = plane(scene, material('#d6e9a7', { map: grassTexture, roughness: 1 }), 0, -.048, -350, 1500, 1400);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  const shoulderMaterial = material('#b5bba6');
  const white = material('#fbfcf4', { roughness: .88 });
  for (const side of [-1, 1]) {
    box(scene, shoulderMaterial, side*(ROAD_HALF_WIDTH+.28), -.004, -350, .56, .028, 1100);
    const edge=box(scene, white, side*(ROAD_HALF_WIDTH-.18), .014, -350, .14, .024, 1100);
    edge.name=`outer-road-edge-${side}`;
  }
  const markings = instance(scene, unitBox, white, 54*laneDividers.length);
  markings.name='internal-lane-markings';
  const roadPeriod = 648;

  const railMaterial = material('#c5d3d0', { metalness: .52, roughness: .5 });
  const postMaterial = material('#99aaa5', { metalness: .25 });
  for (const side of [-1, 1]) {
    box(scene, railMaterial, side*railX, .76, -265, .13, .26, 700);
    box(scene, railMaterial, side*railX, .82, -265, .20, .045, 700);
  }
  const railPosts = instance(scene, unitBox, postMaterial, 140);
  const reflectorMaterial = basic('#faf2b6');
  const railReflectors = instance(scene, unitBox, reflectorMaterial, 70);

  const poleGeometry = keepGeometry(new T.CylinderGeometry(.065, .1, 1, 7));
  const poleMaterial = material('#728c92', { metalness: .45, roughness: .64 });
  const lampPoles = instance(scene, poleGeometry, poleMaterial, 28);
  const lampArms = instance(scene, unitBox, poleMaterial, 28);
  const lampHeads = instance(scene, unitBox, material('#ececdc', { emissive: '#fff5bc', emissiveIntensity: .6 }), 28);

  const trunks = instance(scene, keepGeometry(new T.CylinderGeometry(.09, .15, 1, 6)), material('#797a4c'), 90);
  const crowns = instance(scene, keepGeometry(new T.IcosahedronGeometry(1, 1)), material('#577c45', { roughness: 1 }), 90);
  const trees = [];
  for (let i = 0; i < 90; i++) {
    trees.push({ x: (i%2 ? 1 : -1) * (ROAD_HALF_WIDTH+9 + random()*150), z: random()*620, size: 1.1+random()*2.35, turn: random()*Math.PI });
    crowns.setColorAt(i, new T.Color().setHSL(.24 + random()*.04, .2+random()*.18, .25+random()*.09));
  }
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;

  // Canopies are built once and recycled, never allocated in the frame loop.
  const canopyTop = material('#d1dfdc', { metalness: .46, roughness: .53 });
  const canopyEdge = material('#355b70', { metalness: .4 });
  const pillarMaterial = material('#a5bfbe', { metalness: .42 });
  const boothWhite = material('#ebf3e5');
  const boothGlass = material('#92cce0', { metalness: .08, roughness: .12, transparent:true, opacity:.14, depthWrite:false });
  const boothRed = material('#e4655c');
  const islandMaterial = material('#bbc2ab');
  const signTexture = texture(768, 128, (ctx, w, h) => {
    ctx.fillStyle = '#164660'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = '#8ed6e3'; ctx.lineWidth = 5; ctx.strokeRect(4,4,w-8,h-8);
    ctx.fillStyle = '#f2f6ed'; ctx.font = 'bold 66px "Noto Sans SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('收费站', 38, 67);
    ctx.fillStyle = '#a8e8ef'; ctx.font = 'bold 49px sans-serif'; ctx.textAlign = 'right'; ctx.fillText('TOLL', w-40, 67);
  });
  const signMaterial = basic('#ffffff', { map: signTexture });
  const arrowTexture = texture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#163e47'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = '#82f4c0'; ctx.beginPath();
    ctx.moveTo(25,10);ctx.lineTo(39,10);ctx.lineTo(39,31);ctx.lineTo(50,31);ctx.lineTo(32,53);ctx.lineTo(14,31);ctx.lineTo(25,31);ctx.closePath();ctx.fill();
  });
  const arrowMaterial = basic('#ffffff', { map: arrowTexture });
  const stripeTexture = texture(256, 32, (ctx, w, h) => {
    ctx.fillStyle = '#fff9ec'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = '#e05d51';
    for (let x = -32; x < w; x += 64) {ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+32,0);ctx.lineTo(x+64,h);ctx.lineTo(x+32,h);ctx.closePath();ctx.fill();}
  });
  const barrierMaterial = material('#ffffff', { map: stripeTexture, roughness: .6 });
  const workerUniform=material('#368fa6',{roughness:.75});
  const workerCap=material('#214762',{roughness:.8});
  const workerSkin=material('#eeb995',{roughness:.88});
  const workerEyes=basic('#293744');
  const workerHeadGeometry=keepGeometry(new T.SphereGeometry(.135,10,8));
  const workerHandGeometry=keepGeometry(new T.SphereGeometry(.056,8,6));
  const workerTorsoGeometry=keepGeometry(new T.CylinderGeometry(.145,.175,.44,8));
  const workerCapGeometry=keepGeometry(new T.CylinderGeometry(.147,.149,.075,10));
  function makeWorker(parent,x,index){
    const group=new T.Group();group.name=`toll-worker-${index}`;group.position.set(x,0,.32);parent.add(group);
    const torso=new T.Mesh(workerTorsoGeometry,workerUniform);torso.position.y=1.24;group.add(torso);
    const head=new T.Mesh(workerHeadGeometry,workerSkin);head.position.y=1.61;group.add(head);
    const cap=new T.Mesh(workerCapGeometry,workerCap);cap.position.y=1.765;group.add(cap);
    box(group,workerCap,0,1.739,.121,.31,.027,.17);
    for(const side of [-1,1])box(group,workerEyes,side*.047,1.633,.125,.023,.026,.012);
    const arm=new T.Group();arm.position.set(.19,1.39,.012);group.add(arm);
    box(arm,workerUniform,0,-.113,0,.103,.245,.11);
    const hand=new T.Mesh(workerHandGeometry,workerSkin);hand.position.y=-.278;arm.add(hand);
    arm.rotation.z=2.5;
    const restingArm=box(group,workerUniform,-.196,1.25,.02,.105,.30,.12);restingArm.rotation.z=-.18;
    const restingHand=new T.Mesh(workerHandGeometry,workerSkin);restingHand.position.set(-.222,1.083,.034);group.add(restingHand);
    return {group,arm,index};
  }
  const stationPool = [];
  function makeStation() {
    const group = new T.Group();
    group.name = `toll-station-pool-${stationPool.length}`;
    const roof = new T.Group();
    group.add(roof);
    box(roof, canopyEdge, 0, -.31, 0, canopyWidth, .6, 1);
    box(roof, canopyTop, 0, -.025, 0, canopyWidth+.4, .09, 1.03);
    const roofFront = box(roof, canopyTop, 0, -.32, .505, canopyWidth, .045, .035);
    const sign = plane(group, signMaterial, 0, 0, 0, 5.1, .72);
    const pillars = [];
    for (const x of [-ROAD_HALF_WIDTH-1.1, ...laneDividers, ROAD_HALF_WIDTH+1.1]) {
      pillars.push(box(group, pillarMaterial, x, 0, 0, .25, 1, .28));
    }
    const arrows = [];
    const barriers = [];
    for (const [laneIndex,x] of LANE_CENTERS.entries()) {
      const arrow=plane(group, arrowMaterial, x, 0, 0, .5, .5);
      arrow.name=`toll-lane-arrow-${laneIndex}`;arrows.push(arrow);
      const barrier=box(group, barrierMaterial, x, .99, 0, 3.65, .13, .12);
      barrier.name=`toll-lane-barrier-${laneIndex}`;barriers.push(barrier);
    }
    const workers=[];
    const boothPositions=LANE_CENTERS.map((center,index)=>center-(index?LANE_CENTERS[index]-LANE_CENTERS[index-1]:LANE_CENTERS[1]-center)/2);
    for (const [index,x] of boothPositions.entries()) {
      box(group, islandMaterial, x, .08, 0, 1.08, .16, 6.1);
      box(group, boothWhite, x, .60, -.12, .88, 1.04, 1.70);
      box(group, boothGlass, x, 1.50, .75, .78, .73, .018);
      for(const side of [-1,1]){
        box(group, boothWhite, x+side*.418, 1.50, .742, .049, .79, .055);
        box(group, boothGlass, x+side*.435, 1.50, -.10, .016, .73, 1.68);
      }
      box(group, canopyEdge, x, 1.956, -.12, 1.02, .13, 1.86);
      box(group, boothRed, x, .43, .741, .88, .16, .018);
      box(group, boothWhite, x, 1.12, .71, .91, .065, .20);
      workers.push(makeWorker(group,x,index));
    }
    scene.add(group);
    const result = { group, roof, roofFront, sign, pillars, arrows, barriers, workers };
    stationPool.push(result);
    return result;
  }
  for (let i = 0; i < 8; i++) makeStation();

  // Body sections form a continuous sculpted shell, with a distinct rear deck,
  // tapered nose, raised wheel shoulders, glasshouse and dark underbody.
  const silver = material('#c5d2d3', { metalness: .72, roughness: .25, envMapIntensity: 1.1 });
  const silverLight = material('#dce4df', { metalness: .65, roughness: .24 });
  const graphite = material('#202a30', { metalness: .35, roughness: .55 });
  const black = material('#12191d', { roughness: .83 });
  const glass = material('#203843', { metalness: .6, roughness: .14, envMapIntensity: 1.5 });
  const rubber = material('#161b1c', { roughness: .94 });
  const chrome = material('#bac8c8', { metalness: .87, roughness: .18 });
  const redLight = material('#fd3d43', { emissive: '#ff1727', emissiveIntensity: 1.15, roughness: .2 });
  const whiteLight = material('#fff8dc', { emissive: '#d3f5ff', emissiveIntensity: 1 });
  const car = new T.Group();
  car.name = 'player-roadster';
  scene.add(car);
  function loft(sections, mat) {
    const vertices = [];
    const indices = [];
    for (const section of sections) {
      const { z, width, topWidth, bottom = .28, mid = .55, top } = section;
      vertices.push(-width*.91,bottom,z, width*.91,bottom,z, width,mid,z, topWidth,top,z, -topWidth,top,z, -width,mid,z);
    }
    for (let row = 0; row < sections.length - 1; row++) {
      for (let j = 0; j < 6; j++) {
        const a = row*6+j, b = row*6+(j+1)%6, c = (row+1)*6+j, d=(row+1)*6+(j+1)%6;
        indices.push(a,c,b,b,c,d);
      }
    }
    for (let j=1;j<5;j++) {indices.push(0,j,j+1); const base=(sections.length-1)*6;indices.push(base,base+j+1,base+j);}
    const geometry = keepGeometry(new T.BufferGeometry());
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices,3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new T.Mesh(geometry, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    car.add(mesh);
    return mesh;
  }
  loft([
    {z:2.15,width:.92,topWidth:.85,top:.79,mid:.48},
    {z:1.7,width:1.015,topWidth:.84,top:.91,mid:.56},
    {z:.62,width:1.025,topWidth:.82,top:.87},
    {z:-.7,width:1.015,topWidth:.81,top:.78},
    {z:-1.68,width:.975,topWidth:.80,top:.68,mid:.48},
    {z:-2.22,width:.84,topWidth:.73,top:.51,mid:.38,bottom:.27},
  ], silver);
  loft([
    {z:2.16,width:.90,topWidth:.89,top:.53,mid:.32,bottom:.22},
    {z:1.78,width:.92,topWidth:.9,top:.56,mid:.34,bottom:.23},
  ], graphite);
  loft([
    {z:1.1,width:.74,topWidth:.66,top:.88,mid:.82,bottom:.79},
    {z:.4,width:.7,topWidth:.55,top:1.25,mid:1.0,bottom:.8},
    {z:-.39,width:.70,topWidth:.55,top:1.23,mid:1.0,bottom:.78},
    {z:-1.0,width:.73,topWidth:.68,top:.83,mid:.79,bottom:.77},
  ], glass);
  const roofPanel = box(car, graphite, 0, 1.245, .015, 1.1, .029, .75, true);
  roofPanel.rotation.x = -.018;
  for (const side of [-1, 1]) {
    const rearPillar = box(car, silverLight, side*.635, 1.06, .72, .072, .068, .76, true);
    rearPillar.rotation.x = -.49;
    const frontPillar = box(car, silverLight, side*.635, 1.03, -.68, .055, .055, .70, true);
    frontPillar.rotation.x = .59;
    box(car, graphite, side*.999, .3, -.02, .105, .13, 3.42, true);
    const sideVent = box(car, graphite, side*1.019, .62, .48, .024, .20, .56);
    sideVent.rotation.x = -.12;
    box(car, silver, side*.88, .99, -.46, .32, .032, .045, true);
    const mirror = new T.Mesh(keepGeometry(new T.SphereGeometry(1, 10, 6)), silver);
    mirror.position.set(side*1.073, 1.01, -.47);
    mirror.scale.set(.145,.063,.104);
    mirror.castShadow = true;
    car.add(mirror);
  }
  for (let i=0;i<4;i++) {
    const z=.55+i*.135;
    const louvre=box(car, graphite, 0, 1.224-(z-.4)*.48, z, 1.19+(z-.55)*.1, .025, .065);
    louvre.rotation.x = -.45;
  }
  // Rear lamp bar, spoiler lip and plate are prominent in the chase view.
  box(car, graphite, 0, .707, 2.161, 1.82, .215, .025);
  box(car, redLight, 0, .77, 2.182, 1.78, .034, .028);
  for (const side of [-1,1]) {
    box(car, redLight, side*.875, .713, 2.183, .026, .135, .028);
    box(car, whiteLight, side*.61, .566, -2.137, .40, .025, .08);
  }
  box(car, silverLight, 0, .86, 1.985, 1.92, .045, .23, true);
  box(car, graphite, 0, .25, 2.073, 1.6, .10, .50, true);
  for (let i=-2;i<=2;i++) box(car, graphite, i*.29, .30, 2.16, .036, .26, .40, true);
  const exhaustGeometry = keepGeometry(new T.CylinderGeometry(.092,.105,.15,14));
  const exhaustInnerGeometry = keepGeometry(new T.CylinderGeometry(.069,.069,.155,12));
  for (const x of [-.45,0,.45]) {
    const exhaust = new T.Mesh(exhaustGeometry, chrome);
    exhaust.position.set(x,.466,2.208); exhaust.rotation.x=Math.PI/2; car.add(exhaust);
    const interior = new T.Mesh(exhaustInnerGeometry, black);
    interior.position.set(x,.466,2.214); interior.rotation.x=Math.PI/2; car.add(interior);
  }
  const plateTexture=texture(256,80,(ctx,w,h)=>{
    ctx.fillStyle='#d8e1dd';ctx.fillRect(0,0,w,h);ctx.fillStyle='#405461';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 36px sans-serif';ctx.fillText('SKY RUN',w/2,h/2);
  });
  plane(car,basic('#ffffff',{map:plateTexture}),0,.625,2.184,.43,.134);

  const wheelGeometry = keepGeometry(new T.CylinderGeometry(.36,.36,.285,24));
  const rimGeometry = keepGeometry(new T.CylinderGeometry(.232,.232,.298,20));
  const rimRingGeometry = keepGeometry(new T.TorusGeometry(.218,.018,6,24));
  const discGeometry = keepGeometry(new T.CylinderGeometry(.17,.17,.014,16));
  const archGeometry = keepGeometry(new T.TorusGeometry(.382,.028,6,20,Math.PI));
  const wheelSpokeGeometry = keepGeometry(new T.BoxGeometry(.025,.034,.386));
  const brakeMaterial = material('#918465', {metalness:.8,roughness:.5});
  const wheels = [];
  for (const x of [-1.008,1.008]) for (const z of [-1.39,1.39]) {
    const wheel = new T.Group();
    wheel.position.set(x,.374,z);
    const tire = new T.Mesh(wheelGeometry,rubber);tire.rotation.z=Math.PI/2;tire.castShadow=true;wheel.add(tire);
    const rim = new T.Mesh(rimGeometry,graphite);rim.rotation.z=Math.PI/2;wheel.add(rim);
    const side=Math.sign(x);
    const ring = new T.Mesh(rimRingGeometry,chrome);ring.rotation.y=Math.PI/2;ring.position.x=side*.154;wheel.add(ring);
    const disc = new T.Mesh(discGeometry,brakeMaterial);disc.rotation.z=Math.PI/2;disc.position.x=side*.137;wheel.add(disc);
    for (let i=0;i<5;i++) {
      const spoke=new T.Mesh(wheelSpokeGeometry,chrome);spoke.position.x=side*.161;spoke.rotation.x=i*Math.PI/5;wheel.add(spoke);
    }
    const hub=box(wheel,chrome,side*.173,0,0,.032,.084,.084);hub.rotation.x=Math.PI/4;
    car.add(wheel);wheels.push(wheel);
    const arch=new T.Mesh(archGeometry,silver);arch.position.set(x,.374,z);arch.rotation.y=Math.PI/2;arch.castShadow=true;car.add(arch);
  }

  const shadowTexture = texture(128,128,(ctx,w,h)=>{
    const g=ctx.createRadialGradient(w/2,h/2,4,w/2,h/2,w/2);g.addColorStop(0,'rgba(0,0,0,.42)');g.addColorStop(.5,'rgba(0,0,0,.29)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  });
  const shadowMaterial=basic('#161f23',{map:shadowTexture,transparent:true,depthWrite:false,opacity:.85});
  const contactShadow=plane(scene,shadowMaterial,0,.024,0,3.1,5.9);contactShadow.rotation.x=-Math.PI/2;

  const jetGroup=new T.Group();car.add(jetGroup);
  const nozzleGeometry=keepGeometry(new T.CylinderGeometry(.11,.105,.12,12));
  const plumeGeometry=keepGeometry(new T.CylinderGeometry(.04,.15,.75,10,1,true));
  const coreGeometry=keepGeometry(new T.CylinderGeometry(.035,.073,.40,10,1,true));
  const blueFlame=basic('#55c8ff',{transparent:true,opacity:.44,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
  const whiteFlame=basic('#d6f8ff',{transparent:true,opacity:.85,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
  const plumes=[];
  for (const x of [-.57,.57]) for(const z of [-.87,.87]) {
    const nozzle=new T.Mesh(nozzleGeometry,graphite);nozzle.position.set(x,.244,z);car.add(nozzle);
    const plume=new T.Mesh(plumeGeometry,blueFlame);plume.position.set(x,-.17,z);jetGroup.add(plume);
    const core=new T.Mesh(coreGeometry,whiteFlame);core.position.set(x,.02,z);jetGroup.add(core);
    plumes.push(plume,core);
  }
  const particleGeometry=keepGeometry(new T.IcosahedronGeometry(1,0));
  const jetParticles=instance(scene,particleGeometry,basic('#6dd9ff',{transparent:true,opacity:.30,depthWrite:false,blending:T.AdditiveBlending}),32);
  const dustMaterial=basic('#d7dccb',{transparent:true,opacity:.30,depthWrite:false});
  const dustParticles=instance(scene,particleGeometry,dustMaterial,20);
  const sparkMaterial=basic('#ffbf60',{transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending});
  const sparks=instance(scene,unitBox,sparkMaterial,16);
  jetParticles.visible=false;jetGroup.visible=false;dustParticles.visible=false;sparks.visible=false;

  const hazards=createHazardScene({T,scene,camera,material,basic,box,keepGeometry,keepMaterial,texture,unitBox});

  let destroyed=false, lastDistance=0, lastX=0, firstFrame=true, lastEventId=null;
  let cameraHeight=0, steering=0, landingTime=10, crashTime=10, clearTime=10;
  let impactX=0, impactDistance=0;
  let width=1, height=1;
  function resize(nextWidth, nextHeight) {
    if (destroyed) return;
    width=Math.max(1,Math.floor(nextWidth||canvas.clientWidth||960));
    height=Math.max(1,Math.floor(nextHeight||canvas.clientHeight||600));
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.6));
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
  }
  function updateRoad(distance) {
    asphaltTexture.offset.y=wrap(distance/(1100/180),1);
    grassTexture.offset.y=wrap(distance/(1400/150),1);
    for(let i=0;i<54;i++) {
      const z=45-wrap(i*12-distance,roadPeriod);
      for(let lane=0;lane<laneDividers.length;lane++) setInstance(markings,i*laneDividers.length+lane,laneDividers[lane],.024,z,.155,.026,4.6);
    }
    markings.instanceMatrix.needsUpdate=true;
    for(let i=0;i<70;i++) {
      const z=45-wrap(i*10-distance,700);
      for(let side=0;side<2;side++) setInstance(railPosts,i*2+side,(side?1:-1)*railX,.40,z,.09,.80,.11);
      setInstance(railReflectors,i,(i%2?1:-1)*(railX+.1),.84,z,.035,.10,.15);
    }
    railPosts.instanceMatrix.needsUpdate=true;railReflectors.instanceMatrix.needsUpdate=true;
    for(let i=0;i<14;i++) {
      const z=35-wrap(i*46-distance,644);
      for(let side=0;side<2;side++) {
        const s=side?1:-1,index=i*2+side;
        setInstance(lampPoles,index,s*lampX,3.8,z,1,7.6,1);
        setInstance(lampArms,index,s*(lampX-.5),7.59,z,1.1,.11,.12,0,0,s*.09);
        setInstance(lampHeads,index,s*(lampX-1.06),7.54,z,.72,.07,.27);
      }
    }
    lampPoles.instanceMatrix.needsUpdate=true;lampArms.instanceMatrix.needsUpdate=true;lampHeads.instanceMatrix.needsUpdate=true;
    for(let i=0;i<trees.length;i++) {
      const tree=trees[i],z=40-wrap(tree.z-distance,620);
      setInstance(trunks,i,tree.x,tree.size*.37,z,tree.size*.45,tree.size*.9,tree.size*.45);
      setInstance(crowns,i,tree.x,tree.size*1.13,z,tree.size,tree.size*.79,tree.size*.95,0,tree.turn,0);
    }
    trunks.instanceMatrix.needsUpdate=true;crowns.instanceMatrix.needsUpdate=true;
  }
  function updateStations(stations,distance,time) {
    let visibleIndex=0;
    for (const station of stations||[]) {
      const relative=station.z-distance;
      if(relative < -35 || relative>630 || visibleIndex>=stationPool.length) continue;
      const target=stationPool[visibleIndex++];
      const h=clamp(Number(station.height)||5.3,3,10),depth=clamp(Number(station.depth)||5.6,2,14);
      target.group.visible=true;target.group.position.z=-relative;
      target.roof.position.y=h;target.roof.scale.z=depth;
      target.sign.position.set(0,h-.36,depth*.518+.025);
      for(const pillar of target.pillars){pillar.scale.y=h-.6;pillar.position.y=(h-.6)*.5;}
      for(let i=0;i<LANE_CENTERS.length;i++){
        target.arrows[i].position.y=h-.985;target.arrows[i].position.z=depth*.5+.045;
        target.barriers[i].position.z=depth*.5+.68;
      }
      for(const worker of target.workers)worker.arm.rotation.z=2.5+(relative<155?Math.sin(time*5.6+worker.index*1.1)*.15:0);
    }
    for(let i=visibleIndex;i<stationPool.length;i++)stationPool[i].group.visible=false;
  }
  function render(state, deltaTime=1/60) {
    if(destroyed)return;
    const dt=clamp(Number(deltaTime)||0,0,.1);
    const time=Number(state.time)||0,distance=Number(state.distance)||0;
    const carHeight=Math.max(0,Number(state.height)||0),x=Number(state.x)||0;
    const speed=Math.max(0,Number(state.speed)||0);
    const resetting=distance<lastDistance-1||(state.event?.type==='start'&&state.event.id!==lastEventId);
    if(firstFrame||resetting){cameraHeight=carHeight;lastX=x;steering=0;landingTime=crashTime=clearTime=10;}
    if(state.phase!=='paused'){landingTime+=dt;crashTime+=dt;clearTime+=dt;}
    if(state.event?.id!=null&&state.event.id!==lastEventId){
      lastEventId=state.event.id;
      const type=String(state.event.type||'').toLowerCase();
      if(type.includes('land')){landingTime=0;impactX=x;impactDistance=distance;}
      if(type.includes('crash')){crashTime=0;impactX=x;impactDistance=distance;}
      if(type.includes('clear')||type==='success'){clearTime=0;}
    }
    // Render-only easing never changes simulation values.
    const ease=1-Math.exp(-dt*8);
    cameraHeight=mix(cameraHeight,carHeight,ease);
    const lateralVelocity=dt>0?(x-lastX)/dt:0;
    steering=mix(steering,clamp(lateralVelocity,-7,7),ease);
    const tilt=clamp((Number(state.vy)||0)*.012,-.12,.17);
    const roadBuzz=carHeight<.08 && state.phase==='running'?Math.sin(time*33)*Math.min(speed/40,1)*.011:0;
    car.position.set(x,carHeight+roadBuzz,0);
    car.rotation.set(tilt,-steering*.019,-steering*.014);
    for(const wheel of wheels)wheel.rotation.x=-distance/.36;
    contactShadow.position.x=x;
    const shadowScale=1+carHeight*.035;
    contactShadow.scale.set(3.1*shadowScale,5.9*shadowScale,1);
    shadowMaterial.opacity=clamp(.84-carHeight*.041,.1,.84);
    sunlight.position.set(-24+x,45+carHeight*.25,22);
    sunlight.target.position.set(x,carHeight*.30,-3);

    updateRoad(distance);updateStations(state.stations,distance,time);
    for(const cloud of clouds)cloud.position.x=cloud.userData.startX+Math.sin(time*.006)*12;
    const boosting=!!state.boosting&&state.phase==='running';
    redLight.emissiveIntensity=1.15+Math.max(0,1-clearTime/.42)*1.5;
    jetGroup.visible=boosting;jetParticles.visible=boosting;
    if(boosting){
      for(let i=0;i<plumes.length;i++)plumes[i].scale.y=.86+Math.sin(time*37+i*1.8)*.18;
      for(let i=0;i<32;i++){
        const p=wrap(time*2.6+i*.141,1),nozzle=i%4;
        const px=x+(nozzle%2?.57:-.57)+Math.sin(i*9.1+time*4)*p*.11;
        const pz=nozzle<2?-.87:.87;
        const r=.035+p*.085;
        setInstance(jetParticles,i,px,Math.max(.04,carHeight+.17-p*1.5),pz+p*.15,r,r*(1.7+p),r);
      }
      jetParticles.instanceMatrix.needsUpdate=true;
    }
    dustParticles.visible=landingTime<.65;
    if(dustParticles.visible){
      const fade=1-landingTime/.65;
      dustMaterial.opacity=fade*.30;
      for(let i=0;i<20;i++){
        const angle=i/20*Math.PI*2,radius=.45+landingTime*(1.2+(i%4)*.7),size=.05+landingTime*.30;
        setInstance(dustParticles,i,impactX+Math.cos(angle)*radius,.06+Math.sin(landingTime*3)*.1,distance-impactDistance+Math.sin(angle)*radius*1.55,size,.06+size*.25,size);
      }
      dustParticles.instanceMatrix.needsUpdate=true;
    }
    sparks.visible=crashTime<.6;
    if(sparks.visible){
      sparkMaterial.opacity=1-crashTime/.6;
      for(let i=0;i<16;i++){
        const angle=i*2.39996,spread=crashTime*(2+(i%5));
        setInstance(sparks,i,impactX+Math.cos(angle)*spread,carHeight+.3+Math.max(0,Math.sin(angle))*spread-crashTime*crashTime*2,distance-impactDistance+Math.sin(angle)*spread,.025,.025,.15,angle,time*6,angle*.7);
      }
      sparks.instanceMatrix.needsUpdate=true;
    }
    const shake=landingTime<.25?Math.sin(landingTime*76)*(.25-landingTime)*.17:0;
    const portrait=width/height<1.3;
    const followX=x*(portrait?.98:.70);
    camera.position.x=firstFrame||resetting?followX:mix(camera.position.x,followX,1-Math.exp(-dt*13));
    camera.position.y=(portrait?3.9:3.5)+cameraHeight+shake;
    camera.position.z=(portrait?12.5:8.5)+(boosting?.15:0);
    const desiredFov=(portrait?68:58)+Math.min(speed/80,1)*1.8+(boosting?1.2:0);
    if(firstFrame||resetting||Math.abs(camera.fov-desiredFov)>.01){camera.fov=firstFrame||resetting?desiredFov:mix(camera.fov,desiredFov,ease);camera.updateProjectionMatrix();}
    lookAt.set(x*(portrait?.70:.40),1.05+cameraHeight*.78,-20);
    camera.lookAt(lookAt);
    hazards.render(state);
    renderer.render(scene,camera);
    lastDistance=distance;lastX=x;firstFrame=false;
  }
  function dispose() {
    if(destroyed)return;
    destroyed=true;
    scene.environment=null;
    for(const geometry of resources.geometries)geometry.dispose();
    for(const mat of resources.materials)mat.dispose();
    for(const tex of resources.textures)tex.dispose();
    environmentTarget.dispose();
    if(sunlight.shadow.map)sunlight.shadow.map.dispose();
    renderer.renderLists.dispose();
    renderer.dispose();
    scene.clear();
  }
  resize(canvas.clientWidth||960,canvas.clientHeight||600);
  return { render, resize, dispose };
}
