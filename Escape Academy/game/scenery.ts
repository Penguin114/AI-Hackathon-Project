import * as T from "three";
import type { Theme } from "@/lib/plan";

export type Target = "notes" | "log" | "cabinet" | "mechanism" | "door";
const palettes = {
  tower: ["#7a5540", "#503122", "#38231d", "#e0a859", "#496d68"],
  greenhouse: ["#4c6950", "#596243", "#29372b", "#b5d188", "#72aaa2"],
  archive: ["#aa805b", "#916345", "#693e29", "#f2ba6c", "#749387"],
  lab: ["#516963", "#455c57", "#2f3d39", "#87d6c1", "#85a9c5"],
};

export function buildRoom(scene: T.Scene, theme: Theme, index: number) {
  const [wall, floor, trim, accent, windowColor] = palettes[theme];
  scene.background = new T.Color("#211812");
  scene.fog = new T.FogExp2("#2b211b",0.039);
  const mats = new Map<string,T.MeshStandardMaterial>();
  const material = (color: string) => {
    if (!mats.has(color)) mats.set(color,new T.MeshStandardMaterial({color,roughness:0.69}));
    return mats.get(color)!;
  };
  const box = (w:number,h:number,d:number,x:number,y:number,z:number,color:string,parent:T.Object3D=scene) => {
    const m = new T.Mesh(new T.BoxGeometry(w,h,d),material(color));
    m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
  };
  const ring = (radius:number,tube:number,x:number,y:number,z:number,color:string,parent:T.Object3D=scene) => {
    const m = new T.Mesh(new T.TorusGeometry(radius,tube,8,42),material(color));
    m.position.set(x,y,z); parent.add(m); return m;
  };
  const groups: Record<Target,T.Group> = {notes:new T.Group(),log:new T.Group(),cabinet:new T.Group(),mechanism:new T.Group(),door:new T.Group()};
  for (const group of Object.values(groups)) scene.add(group);
  const anchors: Record<Target,T.Vector3> = {
    notes:new T.Vector3(-2.55,1.31,-2.85), log:new T.Vector3(2.75,1.19,-2.88),
    cabinet:new T.Vector3(3.42,2.04,-3.75), mechanism:new T.Vector3(-1.96,1.9,-3.75),door:new T.Vector3(.46,2.83,-4.1),
  };
  const blocked: Array<{x:number;z:number;w:number;d:number}> = [
    {x:-2.43,z:-3.37,w:2.08,d:1},{x:3.23,z:-3.58,w:1.61,d:1.05},
    {x:-4.45,z:-.1,w:.67,d:4.1},{x:4.44,z:1.99,w:.7,d:2.5},
  ];
  box(10,.26,10,0,-.14,0,floor);
  box(10,.25,10,0,4.6,0,trim);
  box(10,4.6,.22,0,2.27,-4.85,wall);
  box(10,4.6,.22,0,2.27,4.85,wall);
  for (const sign of [-1,1]) {
    box(.23,4.6,10,sign*4.92,2.27,0,wall);
    box(.22,.36,10,sign*4.78,.19,0,trim);
    box(.25,.18,10,sign*4.77,3.97,0,trim);
    for (let z=-4;z<=4;z+=2) box(.37,4.5,.18,sign*4.7,2.25,z,trim);
  }
  for(let j=0;j<21;j++) {
    const z=(j-10)*.454;
    for(let i=0;i<4;i++) {
      const shade=new T.Color(floor).multiplyScalar(.74+((j*23+i*19)%17)/52);
      box(2.48,.024,.442,(i-1.5)*2.5,.001,z,"#"+shade.getHexString());
    }
  }
  const rug = theme==="greenhouse" ? "#40504a" : "#693e30";
  box(3.2,.041,5.04,.25,.017,.18,rug);
  for(const x of [-1.18,1.68]) box(.045,.012,4.8,x,.044,.18,accent);
  for(const z of [-2.21,2.57]) box(2.9,.012,.045,.25,.044,z,accent);
  for(let i=-2;i<=2;i++) box(.44,.009,.44,.25,.044,.18+i*.85,trim).rotation.y=Math.PI/4;

  for(const z of [-3.4,-1.14,1.14,3.4]) {
    box(10,.2,.32,0,4.28,z,trim);
    for(const x of [-4.4,4.4]) box(.89,.17,.24,x,4.02,z,trim).rotation.z=x<0 ? .55 : -.55;
  }
  for(let x=-4.3;x<4.6;x+=.54) {
    box(.505,.82,.13,x,.6,-4.68,trim);
    box(.615,.055,.21,x,1.01,-4.57,accent);
  }
  const doorX=.46;
  box(2.19,3.45,.27,doorX,1.72,-4.61,trim);
  box(2.01,3.26,.15,doorX,1.64,-4.43,"#160f0c");
  const escapeLight = new T.PointLight(accent,0,7,2);
  escapeLight.position.set(doorX,1.8,-3.85); scene.add(escapeLight);
  const door = groups.door;
  door.position.set(doorX-.91,0,-4.24);
  const core=box(1.83,3.06,.16,.91,1.54,0,trim,door);
  for(let i=0;i<8;i++) box(.209,2.93,.04,.11+i*.225,1.54,.101, i%2===0 ? floor : trim,door);
  for(const y of [.31,2.74]) box(1.8,.17,.11,.91,y,.135,trim,door);
  ring(.49,.045,.91,1.86,.195,accent,door);
  ring(.32,.022,.91,1.86,.196,accent,door);
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    box(.06,.82,.045,.91,1.86,.19,accent,door).rotation.z=a;
  }
  box(.13,.13,.09,.91,1.86,.25,accent,door).rotation.z=Math.PI/4;
  box(.08,.27,.08,1.64,1.52,.21,accent,door);
  const status = new T.Mesh(new T.SphereGeometry(.07,12,8),new T.MeshStandardMaterial({color:"#e48940",emissive:"#e48940",emissiveIntensity:1.7}));
  status.position.set(doorX,3.26,-4.17); scene.add(status);

  const shelfColors=["#986949","#826342","#58766b","#975244","#767652","#534339"];
  function shelf(x:number,z:number,turn:number) {
    const g=new T.Group(); g.position.set(x,0,z);g.rotation.y=turn;scene.add(g);
    box(2,3.35,.36,0,1.68,0,trim,g);
    for(const xx of [-.96,.96]) box(.125,3.47,.59,xx,1.74,.14,floor,g);
    for(let row=0;row<5;row++){
      box(2,.1,.64,0,.23+row*.68,.2,trim,g);
      for(let col=0;col<10;col++){
        const h=.22+((row*13+col*7+index)%11)*.029;
        const x=-.82+col*.177;
        box(.138,h,.27,x,.29+row*.68+h/2,.28,shelfColors[(col*7+row+index)%6],g);
        if(col%3!==1) box(.097,.018,.01,x,.37+row*.68,.42,accent,g);
      }
    }
  }
  shelf(-4.43,-1.13,Math.PI/2); shelf(-4.43,.92,Math.PI/2); shelf(4.47,2,-Math.PI/2);
  const bench=groups.mechanism;
  box(2.03,.15,.93,-2.43,.94,-3.37,trim,bench);
  for(const x of [-3.31,-1.55]) for(const z of [-3.74,-3]) box(.135,.9,.14,x,.45,z,trim,bench);
  box(1.9,.21,.1,-2.43,.79,-2.96,floor,bench);
  box(.94,.68,.31,-1.93,1.41,-3.77,trim,bench);
  ring(.37,.055,-1.93,1.48,-3.57,accent,bench); ring(.28,.02,-1.93,1.48,-3.56,accent,bench);
  const dial = box(.04,.55,.042,-1.93,1.48,-3.531,accent,bench);dial.rotation.z=.55;
  for(let i=0;i<12;i++){
    const angle=i*Math.PI/6;
    box(.03,.086,.026,-1.93+Math.sin(angle)*.43,1.48+Math.cos(angle)*.43,-3.56,accent,bench).rotation.z=-angle;
  }
  const paper = box(.48,.022,.39,-2.56,1.035,-3.07,"#e5c69a",groups.notes);
  paper.rotation.y=.16;
  for(let i=0;i<5;i++) box(.27-i*.011,.005,.011,-2.56,1.05,-3.17+i*.045,"#835d48",groups.notes);
  const cabinet=groups.cabinet;
  box(1.58,1.39,.76,3.24,.71,-3.78,trim,cabinet);
  box(1.65,.12,.91,3.24,1.43,-3.74,floor,cabinet);
  const drawer=new T.Group();drawer.position.set(3.24,1.03,-3.33);cabinet.add(drawer);
  box(1.43,.49,.16,0,0,0,floor,drawer);
  box(.29,.05,.085,0,0,.113,accent,drawer);
  box(1.36,.06,.58,0,-.21,-.27,trim,drawer);
  box(1.39,.34,.10,3.24,.41,-3.31,wall,cabinet);
  box(.26,.05,.09,3.24,.42,-3.22,accent,cabinet);
  box(.38,.09,.27,2.75,1.52,-3.67,"#95523b",groups.log).rotation.y=.12;
  box(.36,.032,.258,2.75,1.556,-3.67,"#debd93",groups.log).rotation.y=.12;
  anchors.log.set(2.76,1.38,-2.97);

  function lamp(x:number,y:number,z:number) {
    const light = new T.PointLight("#ffc079",26,8,2);
    light.position.set(x,y,z+.18);scene.add(light);
    const globe = new T.Mesh(new T.CylinderGeometry(.085,.083,.26,8),new T.MeshStandardMaterial({color:"#ffe5aa",emissive:"#ffad54",emissiveIntensity:2.3}));
    globe.position.set(x,y,z);scene.add(globe);
    for(const yy of [-.16,.15]) box(.27,.08,.27,x,y+yy,z,trim);
    for(const xx of [-.11,.11]) box(.025,.28,.028,x+xx,y,z+.091,accent);
  }
  lamp(-3.85,2.76,-4.43);lamp(2.15,2.76,-4.43);lamp(-3.1,1.26,-3.63);
  const glow = new T.PointLight("#ffa960",17,10,2);glow.position.set(.2,3.85,.5);scene.add(glow);
  const ambient = new T.HemisphereLight("#f7deb2","#43352c",1.86);scene.add(ambient);
  const pale = new T.DirectionalLight(windowColor,1.24);pale.position.set(6,4,1);scene.add(pale);
  const litWindow = new T.MeshStandardMaterial({color:windowColor,emissive:windowColor,emissiveIntensity:.65});
  for(const pos of [-1.47,.12]) {
    box(.32,2.25,1.4,4.76,2.57,pos,trim);
    for(const dy of [-.52,.52]) for(const dz of [-.31,.31]){
      const pane=box(.024,.94,.58,4.57,2.57+dy,pos+dz,windowColor);pane.material=litWindow;
    }
  }
  function pot(x:number,z:number,scale:number){
    const base=new T.Mesh(new T.CylinderGeometry(.32*scale,.23*scale,.37*scale,9),material("#a96745"));
    base.position.set(x,.18*scale,z);scene.add(base);
    for(let i=0;i<9;i++){
      const angle=i*2.4;
      const leaf=new T.Mesh(new T.SphereGeometry(1,7,5),material(i%2===0?"#688055":"#3c664e"));
      leaf.scale.set(.12*scale,.41*scale,.13*scale);
      leaf.position.set(x+Math.cos(angle)*.32*scale,(.59+i%3*.15)*scale,z+Math.sin(angle)*.32*scale);
      leaf.rotation.z=-Math.cos(angle)*.53;leaf.rotation.x=Math.sin(angle)*.53;scene.add(leaf);
    }
  }
  pot(3.88,-1.96,1.13);pot(-3.89,2.21,1);
  if(theme==="greenhouse"){pot(-3.8,-2.2,1.45);pot(3.85,3.75,1.34);pot(3.9,-.23,.92);}
  if(theme==="archive") for(const x of [-3.91,3.95]) {
    const m=new T.Mesh(new T.CylinderGeometry(.23,.37,1.1,5),material("#aa744b"));
    m.position.set(x,.55,1.05); scene.add(m);
  }
  if(theme==="lab") for(let i=0;i<4;i++){
    const tube=new T.Mesh(new T.CylinderGeometry(.065,.065,.24+i*.054,9),material(i%2===0?"#6ca998":"#aa8c57"));
    tube.position.set(3.13+i*.16,1.58+i*.027,-3.75);scene.add(tube);
  }

  const dustCount=160;
  const coords=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++){coords[i*3]=Math.sin(i*12.98)*4.4;coords[i*3+1]=(i*.617)%4.25;coords[i*3+2]=Math.cos(i*27.1)*4.6;}
  const particles=new T.BufferGeometry();particles.setAttribute("position",new T.BufferAttribute(coords,3));
  const dust=new T.Points(particles,new T.PointsMaterial({color:"#ffd695",size:.021,transparent:true,opacity:.48,depthWrite:false}));
  scene.add(dust);
  return { groups, anchors, blocked, door, drawer, status, escapeLight, dial, dust, core };
}