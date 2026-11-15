import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Theme } from "@/lib/plan";
import type { WorldDesign } from "@/lib/world-design";
import { buildChamberLandmark, chamberScene } from "./chamber-scenes";
import { buildGeneratedModel } from "./generated-model";
import { expedition } from "./expedition";
import { buildHazard } from "./hazards";
import { chamberLayout } from "./layouts";
import { roomMeshes } from "./room-meshes";
import { backdropImages, makeWorldBackdrop } from "./world-backdrop";

export type Target = "notes" | "log" | "artifact" | "cabinet" | "mechanism" | "equipment" | "door";
const stationTargets = ["notes", "log", "cabinet", "mechanism"] as const;
const panorama: Partial<Record<Theme, string>> = {
  space: "world-space", ocean: "world-ocean", city: "world-city", alien: "world-alien",
};

export function buildRoom(scene: T.Scene, theme: Theme, index: number, world?:WorldDesign) {
  const custom=world?.chambers[index];
  const model=custom?.model;
  const explore=expedition(theme,index);
  const centralArtifact=!custom&&explore.centerpiece;
  const layout = chamberLayout(theme,index,custom);
  const design=chamberScene(theme,index);
  const landmark=custom?.landmark??design?.apparatus;
  const style=custom?.style??(index===1?"workshop":index===2?"gallery":index===3?"airlock":null);
  const machinery=style==="workshop";
  const gallery=style==="gallery";
  const terminal=style==="airlock";
  const [baseWall,baseGround,baseStructure,baseAccent,baseLight]=layout.colors;
  const accent=custom?.accent??design?.accent??baseAccent;
  const wall=custom?.wall??(machinery?blend(baseWall,"#3b2d31",.65):gallery?blend(baseWall,"#c1d7ed",.41):terminal?blend(baseWall,"#252842",.53):baseWall);
  const ground=custom?blend(wall,"#1f253a",.54):machinery?blend(baseGround,"#1f2329",.58):gallery?blend(baseGround,"#596f87",.44):terminal?blend(baseGround,"#231f30",.66):baseGround;
  const structure=custom?blend(wall,"#10121c",.76):machinery?blend(baseStructure,"#24202a",.49):baseStructure;
  const light=custom?blend("#f2f4ff",accent,.35):machinery?blend(baseLight,accent,.38):gallery?blend(baseLight,"#c4f2ff",.55):baseLight;
  const mirror = index % 2 ? -1 : 1;
  const outline = layout.outline.map(([x,z])=>new T.Vector2(x*mirror,z));
  const shape = new T.Shape(outline.map(point=>new T.Vector2(point.x,-point.y)));
  const edges = outline.map((start,i)=>new T.Line3(
    new T.Vector3(start.x,0,start.y),
    new T.Vector3(outline[(i+1)%outline.length].x,0,outline[(i+1)%outline.length].y),
  ));
  const {material,mesh,box,cylinder,hoop}=roomMeshes(scene);
  const blockers: T.Object3D[] = [];
  const exhibitMeshes = new Map<T.Object3D,Target>();
  const colliders: Array<{ x:number; z:number; radius:number }> = [];
  const groups: Record<Target,T.Group> = {
    notes:new T.Group(), log:new T.Group(), artifact:new T.Group(), cabinet:new T.Group(), mechanism:new T.Group(), equipment:new T.Group(), door:new T.Group(),
  };
  const anchors = {} as Record<Target,T.Vector3>;
  Object.values(groups).forEach(group=>scene.add(group));
  scene.background = new T.Color(structure);
  scene.fog = new T.Fog(structure,21,43);
  function blend(a:string,b:string,amount:number) {
    return new T.Color(a).lerp(new T.Color(b),amount).getStyle();
  }

  const glow = material(accent,true);
  const accentMaterial = material(accent);
  const metal = material(structure);
  const fascia = material(wall);
  const floorMaterial = new T.MeshStandardMaterial({color:ground,roughness:.69,metalness:.08});
  if (!gallery && ["city","ocean","lab","space"].includes(theme)) {
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
  if(theme==="ocean"&&!machinery){
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
  const panoramaFile=world?backdropImages[world.backdrop]:panorama[theme]??artForClassic[theme];
  const galleryPanes:Array<{geometry:T.PlaneGeometry;width:number;height:number;edge:number}>=[];
  const skyTexture=panoramaFile&&(!style||gallery||world) ? new T.TextureLoader().load("/"+panoramaFile+".webp", texture=>{
    // Fit each panoramic pane to its bay without stretching the background.
    const imageAspect=texture.image.width/texture.image.height;
    for(const {geometry,width,height,edge} of galleryPanes){
      const aspect=(width/height)/imageAspect;
      const uSpan=Math.min(1,aspect), vSpan=Math.min(1,1/aspect);
      const uStart=(1-uSpan)*(.25+(edge%4)*.16);
      const vStart=(1-vSpan)*.44;
      const uv=geometry.getAttribute("uv");
      for(let vertex=0;vertex<uv.count;vertex++){
        uv.setXY(vertex,uStart+uv.getX(vertex)*uSpan,vStart+uv.getY(vertex)*vSpan);
      }
      uv.needsUpdate=true;
    }
  }) : null;
  if(skyTexture)skyTexture.colorSpace=T.SRGBColorSpace;
  const worldBackdrop=world?makeWorldBackdrop(world.backdrop):null;
  const windowMaterial = worldBackdrop??new T.MeshBasicMaterial({map:skyTexture,color:skyTexture?"white":light,side:T.DoubleSide});
  const displayGlass = new T.MeshStandardMaterial({
    color:light, transparent:true, opacity:.19, roughness:.23, depthWrite:false,
  });
  function addWallEquipment(bay:T.Group,width:number) {
    const z=mirror*.44;
    if(theme==="space" || theme==="ocean" || theme==="lab"){
      const manifoldColor=material(theme==="ocean"?"#b56c43":theme==="space"?"#7186a2":"#427f8f");
      // Bottles and gauges sit below the windows with their feed lines exposed.
      const header=cylinder(.055,.055,width*.57,0,1.57,z,manifoldColor,bay,12);
      header.rotation.z=Math.PI/2;
      for(const x of [-width*.22,0,width*.22]){
        mesh(new T.CapsuleGeometry(.13,.56,4,12),manifoldColor,x,.84,z,bay);
        for(const y of [.57,1.03])cylinder(.142,.142,.095,x,y,z,metal,bay,12);
        cylinder(.041,.041,.39,x,1.36,z,serviceMetal,bay,8);
        cylinder(.13,.13,.064,x,1.41,z+mirror*.058,metal,bay,12).rotation.x=Math.PI/2;
        cylinder(.096,.096,.073,x,1.41,z+mirror*.075,accentMaterial,bay,12).rotation.x=Math.PI/2;
        box(.022,.113,.01,x,1.41,z+mirror*.117,metal,bay).rotation.z=.57;
      }
    } else if(theme==="city"){
      for(const x of [-width*.21,0,width*.21]){
        box(.59,1.39,.3,x,.82,z,metal,bay,.062);
        box(.53,.17,.08,x,1.40,z+mirror*.17,fascia,bay,.028);
        for(let slot=0;slot<6;slot++){
          const y=.33+slot*.15;
          box(.44,.088,.08,x,y,z+mirror*.16,serviceMetal,bay,.016);
          box(.21,.017,.024,x-.068,y,z+mirror*.209,slot%3===0?glow:accentMaterial,bay);
          box(.032,.026,.025,x+.16,y,z+mirror*.209,glow,bay,.006);
        }
      }
    } else if(theme==="tower"){
      for(const [ratio,y,radius] of [[-.20,1.19,.37],[.04,.92,.52],[.24,1.36,.29]]){
        const x=ratio*width;
        const hub=cylinder(radius*.78,radius*.78,.14,x,y,z,serviceMetal,bay,20);
        hub.rotation.x=Math.PI/2;
        hoop(radius*.71,.029,x,y,z+mirror*.084,accentMaterial,bay);
        for(let tooth=0;tooth<12;tooth++){
          const angle=tooth*Math.PI/6;
          box(radius*.27,radius*.25,.15,x+Math.sin(angle)*radius*.82,y+Math.cos(angle)*radius*.82,z,accentMaterial,bay,.014).rotation.z=-angle;
        }
      }
    } else {
      for(const [j,x] of [-width*.22,0,width*.22].entries()){
        cylinder(.22,.28,.23,x,.25,z,metal,bay,12);
        cylinder(.18,.18,.89,x,.79,z,displayGlass,bay,16);
        cylinder(.21,.21,.13,x,1.25,z,serviceMetal,bay,12);
        if(theme==="archive"){
          const relic=mesh(new T.DodecahedronGeometry(.115+j*.012),accentMaterial,x,.87,z,bay);
          relic.rotation.set(.18,.42+j,.25);
        } else if(theme==="alien"){
          const egg=mesh(new T.IcosahedronGeometry(.139,1),glow,x,.75,z,bay);
          egg.scale.y=1.72;
          hoop(.12,.021,x,.74,z,fascia,bay).rotation.x=Math.PI/2;
        } else {
          for(let leafIndex=0;leafIndex<5;leafIndex++){
            const leaf=mesh(new T.SphereGeometry(.083,8,6),material(leafIndex%2?"#95be59":"#56a698"),x+.06*Math.sin(leafIndex*2.4),.56+leafIndex*.106,z,bay);
            leaf.scale.set(.76,1.9,1);
            leaf.rotation.z=leafIndex%2?.54:-.54;
          }
        }
      }
    }
  }
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
    if (width>1.7&&!gallery) {
      const grate=box(width-.23,.028,.63,0,.019,mirror*.57,floorPanel,bay,.012);
      grate.receiveShadow=true;
      box(width-.28,.024,.03,0,.034,mirror*.88,lineMaterial,bay);
      for(let divider=-width*.36;divider<width*.4;divider+=.24){
        box(.035,.027,.36,divider,.034,mirror*.50,serviceMetal,bay);
      }
      box(width*.77,.12,.11,0,1.02,mirror*.22,serviceMetal,bay,.035);
      box(width*.77,.08,.11,0,1.20,mirror*.22,metal,bay,.027);
    }
    const hasWindow=style ? (gallery&&i%2===1)||(custom&&i===Math.floor(edges.length/2))
      : i%2===1||(theme==="ocean"&&i%4===2);
    if(i>0 && width>2.3 && hasWindow){
      const aperture=gallery?Math.min(2.68,layout.height-2.05):2.25;
      const windowHeight=gallery?layout.height*.60:2.85;
      box(width-.65,aperture,.38,0,windowHeight,inset,metal,bay,.13);
      const pane=new T.PlaneGeometry(width-.96,aperture-.37);
      if(gallery&&skyTexture){
        galleryPanes.push({geometry:pane,width:width-.96,height:aperture-.37,edge:i});
      } else if(skyTexture){
        const uv=pane.getAttribute("uv");
        const section=((Math.floor(i/2)+index)%4)*.20;
        for(let vertex=0;vertex<uv.count;vertex++)uv.setX(vertex,section+uv.getX(vertex)*.40);
      }
      const view=mesh(pane,windowMaterial,0,windowHeight,inset+mirror*.205,bay);
      if(mirror<0)view.rotation.y=Math.PI;
      box(width-.75,.09,.49,0,windowHeight-aperture*.45,inset,glow,bay,.025);
      if(!gallery)box(.08,1.92,.44,0,windowHeight,inset,metal,bay);
    } else if(machinery&&i>0&&width>1.7){
      box(width*.76,2.07,.23,0,2.12,inset,metal,bay,.10);
      for(const y of [1.60,1.79,1.98,2.17,2.36,2.55,2.74]){
        box(width*.65,.077,.12,0,y,mirror*.31,serviceMetal,bay,.018);
      }
      box(width*.39,.09,.021,0,2.88,mirror*.337,glow,bay,.012);
    } else if(terminal&&i>0&&width>1.7){
      box(width*.76,layout.height*.70,.19,0,layout.height*.51,inset,metal,bay,.10);
      for(const x of [-width*.18,width*.18]){
        box(.064,layout.height*.62,.043,x,layout.height*.51,mirror*.31,glow,bay,.026);
      }
    } else if(width>3.2 && i!==0 && (theme==="archive" || theme==="tower")&&!gallery){
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
    if(width>2.65&&i>0&&!gallery&&!terminal&&(i+index)%2===1)addWallEquipment(bay,width);
  }

  const [landmarkX, landmarkZ]=layout.landmark;
  const centerpiece=model?groups.notes:centralArtifact?groups.artifact:new T.Group();
  centerpiece.position.set(landmarkX*mirror,0,landmarkZ);
  if(!model&&!centralArtifact)scene.add(centerpiece);

  function addExhibit(spec:typeof explore.artifact|NonNullable<typeof model>, target:"notes"|"artifact", central:boolean) {
    const group=groups[target];
    const lift=target==="artifact"&&central&&spec.motion==="hover"?.65:0;
    const exhibit=buildGeneratedModel(spec,group,central?layout.height:2.6,central?1.52:.69,lift);
    for(const piece of exhibit.meshes)exhibitMeshes.set(piece,target);
    blockers.push(...exhibit.meshes);
    colliders.push({x:group.position.x,z:group.position.z,radius:exhibit.radius});
    anchors[target]=new T.Vector3(group.position.x,exhibit.anchorHeight+group.position.y,group.position.z);
    if(central){
      hoop(exhibit.radius,.021,0,.023,0,glow,group).rotation.x=Math.PI/2;
      const fill=new T.PointLight("#fff3de",24,6,2);
      fill.position.set(1.1,2.35,2.18);
      group.add(fill);
    } else {
      cylinder(.55,.64,.39,0,-.195,0,metal,group,12).castShadow=true;
      cylinder(.58,.55,.052,0,0,0,accentMaterial,group,12);
    }
  }

  if(model||landmark||centralArtifact){
    if(model||centralArtifact){
      addExhibit(model??explore.artifact,model?"notes":"artifact",true);
    } else if(landmark){
      const {obstacles,footprint}=buildChamberLandmark(landmark,centerpiece,{material,mesh,box,cylinder,hoop},metal,accentMaterial,glow,layout.height);
      blockers.push(...obstacles);
      colliders.push(...footprint);
    }
    if(gallery){
      const displayLight=new T.PointLight(accent,13,7,2);
      displayLight.position.set(0,layout.height-.6,0);
      centerpiece.add(displayLight);
      for(const x of [-1.18,1.18]){
        box(.079,.032,3.64,x,layout.height-.22,0,glow,centerpiece,.017);
      }
    } else {
      // Mark the service aisle and light its overhead crossbeams.
      const aisleX=centerpiece.position.x;
      for(const x of [aisleX-1.58,aisleX+1.58]){
        for(let z=landmarkZ-2.1;z<=landmarkZ+3.3;z+=.36){
          if(containsPoint(x,z))box(.18,.018,.19,x,.016,z,lineMaterial).rotation.y=.75;
        }
      }
      for(const z of [landmarkZ-1.8,landmarkZ+1.9]){
        if(!containsPoint(aisleX,z))continue;
        const beamWidth=containsPoint(aisleX-1.65,z)&&containsPoint(aisleX+1.65,z)?3.3:1.7;
        box(beamWidth,.29,.36,aisleX,layout.height-.55,z,metal,scene,.06);
        box(beamWidth*.73,.062,.15,aisleX,layout.height-.72,z,glow,scene,.018);
      }
    }
  } else {
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
    const body=buildOpeningLandmark(theme);
    body.userData.update=(seconds:number)=>{body.rotation.y=.65+seconds*.32;};
    const scanRing=hoop(.95,.019,0,1.65,0,glow,centerpiece);
    scanRing.rotation.x=Math.PI/2;
    scanRing.userData.update=(seconds:number)=>{scanRing.position.y=1.65+Math.sin(seconds*1.15)*.69;};
    blockers.push(body);
    colliders.push({x:centerpiece.position.x,z:landmarkZ,radius:1.48});
  }
  function buildOpeningLandmark(kind:Theme) {
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
    const body=mesh(kind==="ocean"?new RoundedBoxGeometry(1.04,.48,.89,3,.14):geometry[kind](),material(kind==="ocean"?"#ce8843":kind==="greenhouse"?"#a5df64":accent),0,1.65,0,centerpiece);
    body.rotation.set(.28,.65,.21);
    body.castShadow=true;
    if(kind==="ocean"){
      // Inspection ROV with twin thrusters, skids and a lit camera.
      const lamp=material("#fff0c4",true);
      for(const x of [-.61,.61]){
        cylinder(.17,.19,.65,x,-.06,0,metal,body,16).rotation.x=Math.PI/2;
        hoop(.151,.029,x,-.06,.33,accentMaterial,body);
        box(.09,.06,.69,x,-.36,.01,serviceMetal,body,.024);
        for(const z of [-.25,.26])box(.075,.24,.065,x,-.25,z,metal,body,.015);
      }
      const cameraMount=cylinder(.16,.20,.26,0,-.04,.46,metal,body,16);
      cameraMount.rotation.x=Math.PI/2;
      hoop(.135,.029,0,-.04,.58,accentMaterial,body);
      mesh(new T.SphereGeometry(.103,16,10),lamp,0,-.04,.573,body);
      for(const x of [-.31,.31])box(.19,.07,.03,x,.105,.447,lamp,body,.014);
      box(.55,.081,.47,0,.26,0,serviceMetal,body,.033);
      cylinder(.02,.035,.32,-.29,.36,-.17,metal,body,8).rotation.z=.20;
      for(let i=0;i<8;i++){
        const a=i*2.399;
        const bubble=mesh(new T.SphereGeometry(.025+i%3*.013,8,6),displayGlass.clone(),Math.cos(a)*.68,.60+i*.21,Math.sin(a)*.68,centerpiece);
        bubble.material.opacity=.48;
        bubble.userData.update=(time:number)=>{bubble.position.y=.54+(i*.29+time*(.25+i%3*.09))%2.23;};
      }
    }
    if(kind==="ocean" || kind==="greenhouse" || kind==="lab"){
      const glass=new T.MeshPhysicalMaterial({color:light,transparent:true,opacity:.23,roughness:.25,metalness:.05,side:T.DoubleSide,depthWrite:false});
      cylinder(.91,.91,2.65,0,1.68,0,glass,centerpiece,36);
      cylinder(.96,.88,.16,0,3.0,0,metal,centerpiece,36);
      cylinder(.92,.96,.22,0,.48,0,metal,centerpiece,36);
      for(let i=0;i<(kind==="ocean"?0:12);i++){
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
    return body;
  }

  // Arches and overhead light fixtures mark paths through the room.
  for(const edgeIndex of style?[]:[0,Math.floor(edges.length/3),Math.floor(edges.length*2/3)]){
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
    if(model&&target==="notes")continue;
    const [x,z]=layout.stations[custom?i:explore.stationOrder[i]];
    const group=groups[target];
    group.position.set(x*mirror,0,z);
    group.rotation.y=Math.atan2(centerpiece.position.x-group.position.x,landmarkZ-z);
    colliders.push({x:group.position.x,z,radius:machinery?.69:.55});
    if(machinery){
      box(1.38,.76,.72,0,.52,0,fascia,group,.095);
      box(1.48,.16,.88,0,1.05,0,metal,group,.065).castShadow=true;
      for(const x of [-.53,.53]){
        cylinder(.14,.14,.085,x,.17,0,serviceMetal,group,14).rotation.z=Math.PI/2;
        box(.17,.034,.032,x,.77,.368,glow,group,.005);
      }
    } else if(gallery){
      for(const x of [-.39,.39])box(.13,1.02,.20,x,.52,-.16,serviceMetal,group,.045);
      box(1.23,.11,.66,0,1.11,.04,displayGlass,group,.045);
      box(.98,.025,.039,0,1.15,.36,glow,group,.008);
    } else if(terminal){
      const shell=box(1.06,1.03,.65,0,.57,-.08,metal,group,.11);
      shell.rotation.x=-.13;
      box(.86,.045,.51,0,1.13,.03,serviceMetal,group,.021);
      for(const x of [-.24,.24])box(.045,.62,.036,x,.61,.25,glow,group,.015);
    } else {
      hoop(.65,.025,0,.022,0,glow,group).rotation.x=Math.PI/2;
      cylinder(.39,.58,.24,0,.14,0,metal,group,12);
      cylinder(.31,.39,.74,0,.63,0,fascia,group,12);
      box(1.06,.15,.79,0,1.05,0,metal,group,.07).castShadow=true;
      box(.83,.04,.54,0,1.14,.01,accentMaterial,group,.045);
    }
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
  if(terminal){
    for(const x of [-1.35,1.35]){
      box(.28,3.71,.38,doorX*mirror+x,1.86,doorZ+.23,accentMaterial,scene,.05);
      box(.07,3.26,.054,doorX*mirror+x,1.86,doorZ+.44,glow,scene,.018);
    }
    box(2.95,.26,.35,doorX*mirror,3.75,doorZ+.21,metal,scene,.066);
  }
  const escapeLight = new T.PointLight(accent,0,5,2);
  escapeLight.position.set(doorX*mirror,1.85,doorZ+.85);
  scene.add(escapeLight);
  anchors.door=new T.Vector3(doorX*mirror,1.9,doorZ+.47);

  scene.add(new T.HemisphereLight(light,machinery?"#655462":"#566483",machinery?1.48:2.15));
  const overhead=new T.DirectionalLight(gallery?"#e1f8ff":"#fff2dd",machinery?1.70:gallery?2.7:2.4);
  overhead.position.set(-3,10,4);
  overhead.castShadow=true;
  overhead.shadow.mapSize.set(1024,1024);
  Object.assign(overhead.shadow.camera,{left:-10,right:10,top:9,bottom:-9,far:30});
  overhead.shadow.normalBias=.035;
  scene.add(overhead);
  for(const [x,z,color] of [[-3,-2,light],[3,2,accent]] as const){
    const localLight=new T.PointLight(color,machinery?43:31,12,2);
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

  const spawn=new T.Vector3(layout.spawn[0]*mirror,1.68,layout.spawn[1]);
  function findPlacement(preferredX:number,preferredZ:number,clearance:number) {
    let best:{x:number;z:number;score:number}|undefined;
    for(let x=-7;x<=7;x+=.5){
      for(let z=-6.5;z<=6.5;z+=.5){
        if(Math.hypot(x-spawn.x,z-spawn.z)<2.75 || Math.hypot(x-doorX*mirror,z-doorZ)<2.4)continue;
        if(!canWalk(x,z)||!canWalk(x+clearance,z)||!canWalk(x-clearance,z)||!canWalk(x,z+clearance)||!canWalk(x,z-clearance))continue;
        if(Object.values(anchors).some(anchor=>Math.hypot(x-anchor.x,z-anchor.z)<2.25))continue;
        const score=Math.hypot(x-preferredX,z-preferredZ);
        if(!best||score<best.score)best={x,z,score};
      }
    }
    return best;
  }
  if(!centralArtifact){
    const placement=findPlacement(explore.artifactSide*mirror*5.8,explore.artifactDepth,.73)
      ??findPlacement(explore.artifactSide*mirror*4,explore.artifactDepth,.5);
    const artifact=groups.artifact;
    if(placement){
      artifact.position.set(placement.x,.39,placement.z);
      artifact.rotation.y=Math.atan2(centerpiece.position.x-placement.x,landmarkZ-placement.z);
      addExhibit(explore.artifact,"artifact",false);
    } else {
      // Compact fallback keeps the marking accessible in a tight generated room.
      artifact.position.set(spawn.x,.39,spawn.z-1.25);
      addExhibit(explore.artifact,"artifact",false);
    }
  }
  const equipment=groups.equipment;
  const placement=findPlacement((1.6+index*.75)*mirror,landmarkZ+2.1,.5)??{x:spawn.x,z:spawn.z-1.25};
  equipment.position.set(placement.x,0,placement.z);
  equipment.rotation.y=Math.atan2(spawn.x-placement.x,spawn.z-placement.z);
  colliders.push({x:placement.x,z:placement.z,radius:.48});
  cylinder(.44,.55,.19,0,.11,0,metal,equipment,12);
  cylinder(.28,.36,.83,0,.60,0,serviceMetal,equipment,12);
  box(.82,.13,.63,0,1.08,0,metal,equipment,.065);
  const instrumentGeometries:Record<Theme,()=>T.BufferGeometry>={
    tower:()=>new T.CylinderGeometry(.26,.26,.18,12),
    greenhouse:()=>new T.TorusGeometry(.26,.10,10,20),
    archive:()=>new T.CapsuleGeometry(.16,.19,6,16),
    lab:()=>new T.CapsuleGeometry(.15,.32,6,16),
    space:()=>new T.CylinderGeometry(.19,.19,.49,16),
    ocean:()=>new T.TorusGeometry(.24,.065,10,20),
    city:()=>new RoundedBoxGeometry(.59,.39,.29,2,.08),
    alien:()=>new T.OctahedronGeometry(.32),
  };
  const instrument=mesh(instrumentGeometries[theme](),accentMaterial,0,1.34,0,equipment);
  instrument.castShadow=true;
  if(theme==="tower")instrument.rotation.x=Math.PI/2;
  hoop(.31,.021,0,1.30,.16,lineMaterial,equipment);
  for(const x of [-.22,.22]){
    const fixture=new T.Mesh(new T.CapsuleGeometry(.032,.22,4,6),glow);
    fixture.position.set(x,1.26,.18);
    equipment.add(fixture);
  }
  equipment.updateMatrixWorld(true);
  anchors.equipment=new T.Vector3(0,1.83,.3).applyMatrix4(equipment.matrixWorld);

  const pendulum=new T.Group();
  if(theme==="tower"){
    pendulum.position.set(landmarkX*mirror,layout.height-.23,landmarkZ+.47);
    scene.add(pendulum);
    cylinder(.044,.044,2.3,0,-1.15,0,accentMaterial,pendulum);
    const weight=cylinder(.39,.39,.21,0,-2.37,0,accentMaterial,pendulum,24);
    weight.rotation.x=Math.PI/2;
    weight.castShadow=true;
    hoop(.33,.027,0,-2.37,.12,lineMaterial,pendulum);
  }
  const hazard=buildHazard(scene,theme,shape,spawn,centerpiece.position,canWalk);
  const movingEffects:T.Object3D[]=[];
  scene.traverse(object=>{
    if(typeof object.userData.update==="function")movingEffects.push(object);
  });
  const sightline=new T.Raycaster();
  const direction=new T.Vector3();
  const canInspect=(target:Target, from:T.Vector3)=>{
    const distance=direction.subVectors(anchors[target],from).length();
    if(distance>2.45)return false;
    sightline.set(from,direction.normalize());
    sightline.far=distance-.12;
    return !sightline.intersectObjects(blockers,false).some(hit=>exhibitMeshes.get(hit.object)!==target);
  };

  return {
    groups,anchors,door,drawer:drawer!,dial:dial!,status,escapeLight,dust,blockers,canWalk,canInspect,hazard,animate:(seconds:number,stabilized:boolean)=>{
      pendulum.rotation.z=T.MathUtils.lerp(pendulum.rotation.z,stabilized?0:Math.sin(seconds*1.6)*.62,.17);
      for(const effect of movingEffects)effect.userData.update(seconds);
    },
    spawn, heading:machinery?-.31*mirror:gallery?.19:terminal?-.18:0, pitch:gallery?.16:-.033,
  };
}
