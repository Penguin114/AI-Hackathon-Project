import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Theme } from "@/lib/plan";
import { chamberLayout } from "./layouts";

export type Target = "notes" | "log" | "cabinet" | "mechanism" | "door";
const stationTargets = ["notes", "log", "cabinet", "mechanism"] as const;
const panorama: Partial<Record<Theme, string>> = {
  space: "world-space", ocean: "world-ocean", city: "world-city", alien: "world-alien",
};

export function buildRoom(scene: T.Scene, theme: Theme, index: number) {
  const layout = chamberLayout(theme,index);
  const [wall, ground, structure, accent, light] = layout.colors;
  const mirror = index % 2 ? -1 : 1;
  const outline = layout.outline.map(([x,z])=>new T.Vector2(x*mirror,z));
  const shape = new T.Shape(outline.map(point=>new T.Vector2(point.x,-point.y)));
  const edges = outline.map((start,i)=>new T.Line3(
    new T.Vector3(start.x,0,start.y),
    new T.Vector3(outline[(i+1)%outline.length].x,0,outline[(i+1)%outline.length].y),
  ));
  const materials = new Map<string,T.MeshStandardMaterial>();
  const blockers: T.Object3D[] = [];
  const colliders: Array<{ x:number; z:number; radius:number }> = [];
  const groups: Record<Target,T.Group> = {
    notes:new T.Group(), log:new T.Group(), cabinet:new T.Group(), mechanism:new T.Group(), door:new T.Group(),
  };
  const anchors = {} as Record<Target,T.Vector3>;
  Object.values(groups).forEach(group=>scene.add(group));
  scene.background = new T.Color(structure);
  scene.fog = new T.Fog(structure,21,43);

  function material(color:string, emissive=false) {
    const key = color + emissive;
    if (!materials.has(key)) materials.set(key,new T.MeshStandardMaterial({
      color, roughness: .57, metalness: .17,
      emissive: emissive ? color : "#000000", emissiveIntensity: emissive ? .6 : 0,
    }));
    return materials.get(key)!;
  }
  function mesh<M extends T.Material>(geometry:T.BufferGeometry, surface:M, x:number,y:number,z:number,parent:T.Object3D=scene) {
    const object=new T.Mesh(geometry,surface);
    object.position.set(x,y,z);
    object.receiveShadow=true;
    parent.add(object);
    return object;
  }
  function box(w:number,h:number,d:number,x:number,y:number,z:number,surface:T.Material,parent:T.Object3D=scene,radius=0) {
    const geometry=radius ? new RoundedBoxGeometry(w,h,d,2,radius) : new T.BoxGeometry(w,h,d);
    return mesh(geometry,surface,x,y,z,parent);
  }
  function cylinder(top:number,bottom:number,height:number,x:number,y:number,z:number,surface:T.Material,parent:T.Object3D=scene,sides=24) {
    return mesh(new T.CylinderGeometry(top,bottom,height,sides),surface,x,y,z,parent);
  }
  function hoop(radius:number,tube:number,x:number,y:number,z:number,surface:T.Material,parent:T.Object3D=scene) {
    return mesh(new T.TorusGeometry(radius,tube,8,40),surface,x,y,z,parent);
  }

  const glow = material(accent,true);
  const accentMaterial = material(accent);
  const metal = material(structure);
  const fascia = material(wall);
  const floorMaterial = new T.MeshStandardMaterial({color:ground,roughness:.69,metalness:.08});
  if (["city","ocean","lab","space"].includes(theme)) {
    const loader=new T.TextureLoader();
    const textures=[
      loader.load("/polyhaven/metal-plate-Diffuse.jpg"),
      loader.load("/polyhaven/metal-plate-nor_gl.jpg"),
      loader.load("/polyhaven/metal-plate-Rough.jpg"),
    ];
    for(const texture of textures){
      texture.wrapS=texture.wrapT=T.RepeatWrapping;
      texture.repeat.set(.39,.39);
      texture.anisotropy=4;
    }
    const [diffuse,normal,roughness]=textures;
    diffuse.colorSpace=T.SRGBColorSpace;
    floorMaterial.map=diffuse;
    floorMaterial.normalMap=normal;
    floorMaterial.roughnessMap=roughness;
    floorMaterial.normalScale.set(.28,.28);
  }
  // A restrained deck pattern supplies scale cues while walking through large spaces.
  const deckGeometry = new T.ShapeGeometry(shape);
  if(theme==="ocean"){
    const rippleGeometry=new T.ShapeGeometry(shape);
    const shimmer=new T.ShaderMaterial({
      uniforms:{time:{value:0},strength:{value:.25}},
      transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      vertexShader:`
        varying vec2 deckPosition;
        void main(){
          deckPosition=position.xy;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        }
      `,
      fragmentShader:`
        varying vec2 deckPosition;
        uniform float time;
        uniform float strength;
        void main(){
          vec2 p=deckPosition*2.6;
          float a=sin(p.x*1.8+p.y*.81+sin(p.y-time*.64)+time*.43);
          float b=sin(p.y*1.9-p.x*.72+sin(p.x+time*.41));
          float crest=pow(clamp(1.0-abs(a+b),0.0,1.0),8.0);
          float fade=smoothstep(-6.0,4.0,deckPosition.x);
          gl_FragColor=vec4(.16,.70,.86,crest*fade*strength);
        }
      `,
    });
    const caustics=mesh(rippleGeometry,shimmer,0,.009,0);
    caustics.rotation.x=-Math.PI/2;
    caustics.userData.update=(time:number)=>{shimmer.uniforms.time.value=time;};
  }
  const coords = deckGeometry.getAttribute("position");
  const cornerColors = [];
  for(let i=0;i<coords.count;i++){
    const shade=new T.Color(ground).lerp(new T.Color(wall),Math.min(1,Math.hypot(coords.getX(i),coords.getY(i))/9)*.3);
    cornerColors.push(shade.r,shade.g,shade.b);
  }
  floorMaterial.color.set("white"); floorMaterial.vertexColors=true;
  // The floor is triangulated from the same outline used for player collision.
  deckGeometry.setAttribute("color",new T.Float32BufferAttribute(cornerColors,3));
  mesh(deckGeometry,floorMaterial,0,0,0).rotation.x=-Math.PI/2;

  const ceiling=mesh(new T.ShapeGeometry(shape),new T.MeshStandardMaterial({color:structure,roughness:.8,side:T.DoubleSide}),0,layout.height,0);
  ceiling.rotation.x=Math.PI/2;
  ceiling.scale.y=-1;
  const serviceMetal=material(new T.Color(structure).lerp(new T.Color(wall),.52).getStyle());
  const floorPanel=material(new T.Color(ground).multiplyScalar(.69).getStyle());
  const lineMaterial=new T.MeshBasicMaterial({color:new T.Color(accent).lerp(new T.Color(structure),.25)});
  const artForClassic:Partial<Record<Theme,string>>={tower:"tower",archive:"archive",greenhouse:"greenhouse"};
  const panoramaFile=panorama[theme]??artForClassic[theme];
  const skyTexture=panoramaFile ? new T.TextureLoader().load("/"+panoramaFile+".webp") : null;
  if(skyTexture)skyTexture.colorSpace=T.SRGBColorSpace;
  const windowMaterial = new T.MeshBasicMaterial({map:skyTexture,color:skyTexture?"white":light,side:T.DoubleSide});
  for (let i=0; i<edges.length; i++) {
    const {start,end}=edges[i];
    const width=start.distanceTo(end);
    const bay=new T.Group();
    bay.position.copy(start).lerp(end,.5);
    bay.rotation.y=-Math.atan2(end.z-start.z,end.x-start.x);
    scene.add(bay);
    const wallPanel=box(width+.08,layout.height,.28,0,layout.height/2,0,fascia,bay);
    blockers.push(wallPanel);
    const inset=mirror*.18;
    box(width+.10,.25,.40,0,.16,inset,metal,bay,.05);
    box(width+.10,.28,.40,0,layout.height-.22,inset,metal,bay,.06);
    for(const x of [-width*.46,width*.46]){
      box(.26,layout.height-.4,.49,x,layout.height/2,inset,metal,bay,.08);
      box(.095,.62,.52,x,layout.height-.8,inset,glow,bay,.025);
    }
    if (width>1.7) {
      const grate=box(width-.23,.028,.63,0,.019,mirror*.57,floorPanel,bay,.012);
      grate.receiveShadow=true;
      box(width-.28,.024,.03,0,.034,mirror*.88,lineMaterial,bay);
      for(let divider=-width*.36;divider<width*.4;divider+=.24){
        box(.035,.027,.36,divider,.034,mirror*.50,serviceMetal,bay);
      }
      box(width*.77,.12,.11,0,1.02,mirror*.22,serviceMetal,bay,.035);
      box(width*.77,.08,.11,0,1.20,mirror*.22,metal,bay,.027);
    }
    if(i>0 && width>2.3 && (i%2===1 || theme==="ocean")){
      box(width-.65,2.25,.38,0,2.85,inset,metal,bay,.13);
      const pane=new T.PlaneGeometry(width-.96,1.88);
      if(skyTexture){
        const uv=pane.getAttribute("uv");
        const section=((Math.floor(i/2)+index)%4)*.20;
        for(let vertex=0;vertex<uv.count;vertex++)uv.setX(vertex,section+uv.getX(vertex)*.40);
      }
      const view=mesh(pane,windowMaterial,0,2.85,inset+mirror*.205,bay);
      if(mirror<0)view.rotation.y=Math.PI;
      box(width-.75,.09,.49,0,1.84,inset,glow,bay,.025);
      box(.08,1.92,.44,0,2.85,inset,metal,bay);
    } else if(width>3.2 && i!==0 && (theme==="archive" || theme==="tower")){
      const shelfWidth=width*.64;
      box(shelfWidth,2.50,.25,0,1.41,inset,metal,bay,.06);
      for(const y of [.49,1.23,1.95]){
        box(shelfWidth,.12,.59,0,y,mirror*.43,fascia,bay,.03);
        for(let x=-shelfWidth/2+.19;x<shelfWidth/2-.12;x+=.22){
          const height=.27+.30*Math.abs(Math.sin(x*8+y*5));
          const bookColor=[wall,accent,ground,"#608e91"][Math.floor((x+shelfWidth)*11+y*7)%4];
          box(.17,height,.26,x,y+.06+height/2,mirror*.51,material(bookColor),bay,.025);
          box(.105,.035,.02,x,y+height*.70,mirror*.653,accentMaterial,bay);
        }
      }
    } else {
      box(width*.55,1.45,.32,0,2.72,inset,material(ground),bay,.12);
      for(const y of [2.30,2.48,2.66])box(width*.36,.045,.41,0,y,inset,accentMaterial,bay,.012);
    }
    if (width>2.8 && i>0 && (theme==="greenhouse" || theme==="lab" || theme==="ocean")) {
      for(const x of [-width*.31,width*.31]){
        const foot=cylinder(.24,.32,.41,x,.22,mirror*.5,serviceMetal,bay,12);
        foot.castShadow=true;
        for(let j=0;j<4;j++){
          const leaf=mesh(new T.SphereGeometry(.14,10,8),material(theme==="greenhouse"?"#a1c860":light),x+.13*Math.sin(j*2.7),.52+j*.12,mirror*(.47+j*.04),bay);
          leaf.scale.set(.76,2.1,1);
          leaf.rotation.z=j%2===0?.45:-.45;
        }
      }
    }
  }

  const [landmarkX, landmarkZ]=layout.landmark;
  const centerpiece=new T.Group();
  centerpiece.position.set(landmarkX*mirror,0,landmarkZ);
  scene.add(centerpiece);
  const pedestal=cylinder(1.27,1.45,.36,0,.18,0,metal,centerpiece,theme==="alien"?6:32);
  pedestal.castShadow=true;
  const trim=hoop(1.27,.033,0,.37,0,glow,centerpiece);
  trim.rotation.x=Math.PI/2;
  const halo=hoop(1.55,.042,0,.018,0,accentMaterial,centerpiece);
  halo.rotation.x=Math.PI/2;
  for(const [x,z] of layout.stations){
    const start=new T.Vector3(x*mirror,.006,z);
    const direction=centerpiece.position.clone().sub(start);
    direction.y=0;
    const length=direction.length()-1.6;
    if(length<=.6)continue;
    direction.normalize();
    const normal=new T.Vector3(-direction.z,0,direction.x);
    for(const side of [-1,1]){
      for(let step=0;step<5;step++){
        const offset=(step+.5)*length/5;
        const spot=start.clone().addScaledVector(direction,offset).addScaledVector(normal,side*.37);
        if(!containsPoint(spot.x,spot.z))continue;
        const strip=box(.033,.018,length/9,spot.x,.012,spot.z,step%2===0?lineMaterial:serviceMetal);
        strip.rotation.y=Math.atan2(direction.x,direction.z);
      }
    }
  }
  const landmarkParts=buildLandmark(theme);
  const scanRing=hoop(.95,.019,0,1.65,0,glow,centerpiece);
  scanRing.rotation.x=Math.PI/2;
  const movingEffects=scene.children.filter(object=>typeof object.userData.update==="function");
  blockers.push(...landmarkParts);
  colliders.push({x:centerpiece.position.x,z:landmarkZ,radius:1.48});
  if(index>0){
    // Later chambers wrap the landmark with a service partition, changing the route around it.
    const side=index===2 ? -mirror : mirror;
    const zOffset=index===1 ? .72 : -.68;
    const divider=new T.Group();
    divider.position.set(centerpiece.position.x+side*1.26,0,landmarkZ+zOffset);
    divider.rotation.y=side*Math.PI*.28;
    scene.add(divider);
    const panel=box(1.75,2.50,.28,0,1.30,0,metal,divider,.10);
    panel.castShadow=true;
    blockers.push(panel);
    box(1.39,1.91,.09,0,1.38,.19,serviceMetal,divider,.08);
    for(const x of [-.42,0,.42])box(.04,1.19,.032,x,1.39,.25,lineMaterial,divider,.008);
    for(const x of [-.56,0,.56]){
      const position=divider.localToWorld(new T.Vector3(x,0,0));
      colliders.push({x:position.x,z:position.z,radius:.29});
    }
  }

  function buildLandmark(kind:Theme) {
    const geometry:Record<Theme,()=>T.BufferGeometry>={
      tower:()=>new T.TorusKnotGeometry(.71,.20,80,10,2,3),
      archive:()=>new T.DodecahedronGeometry(.85),
      greenhouse:()=>new T.SphereGeometry(.66,24,16),
      lab:()=>new T.CapsuleGeometry(.62,.84,8,24),
      space:()=>new T.IcosahedronGeometry(.77,2),
      ocean:()=>new T.SphereGeometry(.65,24,16),
      city:()=>new T.CylinderGeometry(.42,.82,1.8,8),
      alien:()=>new T.OctahedronGeometry(.96),
    };
    const parts:T.Mesh[]=[];
    const nextGeometry=[
      ()=>new T.CylinderGeometry(.49,.86,1.86,10),
      ()=>new T.TorusKnotGeometry(.53,.14,72,10,3,4),
      ()=>new T.IcosahedronGeometry(.95,1),
    ];
    const body=mesh((nextGeometry[index-1]??geometry[kind])(),material(kind==="greenhouse"?"#a5df64":accent),0,1.65,0,centerpiece);
    body.rotation.set(.28,.65,.21);
    body.castShadow=true;
    parts.push(body);
    if(kind==="ocean" || kind==="greenhouse" || kind==="lab"){
      const glass=new T.MeshPhysicalMaterial({color:light,transparent:true,opacity:.23,roughness:.25,metalness:.05,side:T.DoubleSide,depthWrite:false});
      cylinder(.91,.91,2.65,0,1.68,0,glass,centerpiece,36);
      cylinder(.96,.88,.16,0,3.0,0,metal,centerpiece,36);
      cylinder(.92,.96,.22,0,.48,0,metal,centerpiece,36);
      for(let i=0;i<12;i++){
        const a=i*2.399;
        const specimen=mesh(new T.IcosahedronGeometry(.1+i%3*.035,1),material(i%2===0?accent:light,true),Math.cos(a)*.64,.65+i*.18,Math.sin(a)*.64,centerpiece);
        specimen.scale.y=1.9;
      }
    } else {
      for(let i=0;i<3;i++){
        const ring=hoop(.92+i*.13,.026,0,1.65,0,glow,centerpiece);
        ring.rotation.set(.48+i*.65,i*.8,0);
      }
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3;
        cylinder(.09,.16,.62,Math.cos(a)*1.06,.63,Math.sin(a)*1.06,fascia,centerpiece,8);
      }
    }
    if (kind==="ocean" || kind==="lab") {
      for(const direction of [-1,1]){
        const pipe=new T.CatmullRomCurve3([
          new T.Vector3(direction*.9,.56,0),new T.Vector3(direction*1.18,.63,0),
          new T.Vector3(direction*1.21,2.56,0),new T.Vector3(direction*.92,2.86,0),
        ]);
        mesh(new T.TubeGeometry(pipe,24,.085,8,false),accentMaterial,0,0,0,centerpiece);
        for(const y of [.8,1.7,2.53])cylinder(.125,.125,.13,direction*1.20,y,0,metal,centerpiece);
      }
    }
    if (kind==="greenhouse") {
      for(let i=0;i<12;i++){
        const angle=i*Math.PI/6;
        const leaf=mesh(new T.SphereGeometry(.24,12,8),material(i%2?"#b6d96d":"#56a698"),Math.cos(angle)*.90,1.03+(i%3)*.36,Math.sin(angle)*.90,centerpiece);
        leaf.scale.set(.68,2.0,1.0);
        leaf.rotation.set(.4,angle,-.65);
      }
    }
    if (kind==="city") {
      for(let i=0;i<7;i++){
        const angle=i*2.399;
        const height=.4+(i%3)*.32;
        const x=Math.cos(angle)*.93, z=Math.sin(angle)*.93;
        box(.25,height,.24,x,.38+height/2,z,fascia,centerpiece,.045);
        for(let y=.53;y<.30+height;y+=.17)box(.18,.038,.246,x,y,z,glow,centerpiece);
      }
    }
    if (kind==="tower" || kind==="archive" || kind==="alien") {
      for (let i=0;i<10;i++){
        const angle=i*Math.PI/5;
        const obelisk=mesh(new T.CylinderGeometry(.07,.18,.65+i%3*.18,5),i%2?fascia:accentMaterial,Math.cos(angle)*.95,.73,Math.sin(angle)*.95,centerpiece);
        obelisk.rotation.z=.16*Math.cos(angle);
      }
    }
    return parts;
  }

  if(index===1 || index===3){
    const overheadMachine=cylinder(1.25,.81,.49,landmarkX*mirror,layout.height-.27,landmarkZ,serviceMetal);
    overheadMachine.castShadow=true;
    for(const radius of [.71,1.03]){
      hoop(radius,.034,landmarkX*mirror,layout.height-.56,landmarkZ,lineMaterial).rotation.x=Math.PI/2;
    }
    for(const x of [-.76,.76]){
      const pipe=new T.CatmullRomCurve3([
        new T.Vector3(landmarkX*mirror+x,layout.height-.15,landmarkZ),
        new T.Vector3(landmarkX*mirror+x,layout.height-.42,landmarkZ+.72),
        new T.Vector3(landmarkX*mirror+x,layout.height-.42,landmarkZ+2.3),
      ]);
      mesh(new T.TubeGeometry(pipe,18,.10,10,false),serviceMetal,0,0,0);
    }
  }

  // Arches and overhead light fixtures mark paths through the room.
  for(const edgeIndex of [0,Math.floor(edges.length/3),Math.floor(edges.length*2/3)]){
    const { start,end }=edges[edgeIndex];
    const mid=start.clone().lerp(end,.5);
    mid.lerp(centerpiece.position,.36);
    const beam=new T.Group();
    beam.position.copy(mid);
    beam.rotation.y=-Math.atan2(end.z-start.z,end.x-start.x);
    scene.add(beam);
    const arch=mesh(new T.TorusGeometry(1.68,.14,8,36,Math.PI),metal,0,2.62,0,beam);
    arch.scale.z=1.4;
    mesh(new T.TorusGeometry(1.63,.035,8,36,Math.PI),glow,0,2.62,.13,beam);
    box(3.3,.10,.25,0,layout.height-.25,0,glow,beam,.04);
  }

  let drawer: T.Object3D | undefined;
  let dial: T.Object3D | undefined;
  for(const [i,target] of stationTargets.entries()){
    const [x,z]=layout.stations[i];
    const group=groups[target];
    group.position.set(x*mirror,0,z);
    group.rotation.y=Math.atan2(centerpiece.position.x-group.position.x,landmarkZ-z);
    const floorTrim=hoop(.65,.025,0,.022,0,glow,group);
    floorTrim.rotation.x=Math.PI/2;
    colliders.push({x:group.position.x,z,radius:.55});
    cylinder(.39,.58,.24,0,.14,0,metal,group,12);
    cylinder(.31,.39,.74,0,.63,0,fascia,group,12);
    box(1.06,.15,.79,0,1.05,0,metal,group,.07).castShadow=true;
    box(.83,.04,.54,0,1.14,.01,accentMaterial,group,.045);
    if(target==="cabinet"){
      box(1.05,.73,.65,0,1.35,0,metal,group,.11);
      drawer=new T.Group();group.add(drawer);
      box(.88,.42,.18,0,1.42,.36,fascia,drawer,.06);
      box(.29,.05,.08,0,1.46,.48,glow,drawer,.02);
    } else if(target==="mechanism"){
      const monitor=box(.94,.57,.23,0,1.48,-.10,metal,group,.09);
      monitor.rotation.x=-.17;
      dial=hoop(.18,.029,0,1.46,.04,glow,group);
      box(.13,.06,.055,0,1.46,.065,glow,dial);
    } else {
      const tablet=box(.65,.08,.45,0,1.21,.04,metal,group,.045);
      tablet.rotation.x=.15;
      for(let line=0;line<3;line++){
        box(.44-line*.075,.026,.025,0,1.253,.015+line*.095,glow,group,.007);
      }
      if(target==="log"){
        hoop(.20,.022,0,1.58,-.11,glow,group).rotation.y=.25;
        cylinder(.065,.105,.37,0,1.38,-.14,fascia,group,12);
        mesh(new T.IcosahedronGeometry(.12,1),accentMaterial,0,1.58,-.11,group);
      } else {
        for(const x of [-.38,.38]){
          const sample=cylinder(.07,.10,.31,x,1.28,-.18,serviceMetal,group,12);
          sample.rotation.z=x*.7;
          cylinder(.06,.06,.06,x,1.43,-.18,glow,group,12);
        }
      }
    }
    group.updateMatrixWorld(true);
    anchors[target]=new T.Vector3(0,1.78,.37).applyMatrix4(group.matrixWorld);
  }

  const [doorX,doorZ]=layout.door;
  const door=groups.door;
  door.position.set(doorX*mirror-.85,0,doorZ+.07);
  const hatch = box(2.47,3.57,.32,doorX*mirror,1.78,doorZ,metal,scene,.13);
  hatch.castShadow=true;
  box(2.05,3.23,.18,doorX*mirror,1.615,doorZ+.13,material("#111926"),scene,.12);
  box(1.71,2.88,.21,.85,1.49,.18,fascia,door,.12);
  for(const x of [.18,1.52]) box(.09,2.34,.10,x,1.5,.31,glow,door,.025);
  hoop(.48,.047,.85,1.52,.34,accentMaterial,door);
  cylinder(.18,.18,.09,.85,1.52,.34,glow,door,8).rotation.x=Math.PI/2;
  const status = mesh(new T.SphereGeometry(.088,16,10),glow.clone(),doorX*mirror,3.23,doorZ+.31);
  const escapeLight = new T.PointLight(accent,0,5,2);
  escapeLight.position.set(doorX*mirror,1.85,doorZ+.85);
  scene.add(escapeLight);
  anchors.door=new T.Vector3(doorX*mirror,1.9,doorZ+.47);

  scene.add(new T.HemisphereLight(light,"#566483",2.15));
  const overhead=new T.DirectionalLight("#fff2dd",2.4);
  overhead.position.set(-3,10,4);
  overhead.castShadow=true;
  overhead.shadow.mapSize.set(1024,1024);
  Object.assign(overhead.shadow.camera,{left:-10,right:10,top:9,bottom:-9,far:30});
  overhead.shadow.normalBias=.035;
  scene.add(overhead);
  for(const [x,z,color] of [[-3,-2,light],[3,2,accent]] as const){
    const localLight=new T.PointLight(color,31,12,2);
    localLight.position.set(x,3.9,z);
    scene.add(localLight);
  }

  const positionBuffer=new Float32Array(90*3);
  for(let i=0;i<90;i++){
    positionBuffer[i*3]=Math.sin(i*12.98)*4.1;
    positionBuffer[i*3+1]=(i*.617)%4.15;
    positionBuffer[i*3+2]=Math.cos(i*27.1)*4.5;
  }
  const dustGeometry=new T.BufferGeometry();
  dustGeometry.setAttribute("position",new T.BufferAttribute(positionBuffer,3));
  const dust=new T.Points(dustGeometry,new T.PointsMaterial({color:light,size:.028,opacity:.6,transparent:true,depthWrite:false}));
  scene.add(dust);

  const testPoint=new T.Vector3();
  const nearest=new T.Vector3();
  function containsPoint(x:number,z:number){
    let inside=false;
    for(const {start,end} of edges){
      if((start.z>z)!==(end.z>z) && x<(end.x-start.x)*(z-start.z)/(end.z-start.z)+start.x)inside=!inside;
    }
    return inside;
  }
  function canWalk(x:number,z:number) {
    testPoint.set(x,0,z);
    for(const edge of edges){
      if(testPoint.distanceToSquared(edge.closestPointToPoint(testPoint,true,nearest))<.25**2)return false;
    }
    return containsPoint(x,z) && colliders.every(obstacle=>Math.hypot(x-obstacle.x,z-obstacle.z)>obstacle.radius+.20);
  }

  return {
    groups,anchors,door,drawer:drawer!,dial:dial!,status,escapeLight,dust,blockers,canWalk,animate:(seconds:number)=>{
      landmarkParts[0].rotation.y=.65+seconds*.32;
      scanRing.position.y=1.65+Math.sin(seconds*1.15)*.69;
      for(const effect of movingEffects)effect.userData.update(seconds);
    },
    spawn:new T.Vector3(layout.spawn[0]*mirror,1.68,layout.spawn[1]),
  };
}
