import * as T from "three";
import type { WorldDesign } from "@/lib/world-design";

export const backdropImages:Partial<Record<WorldDesign["backdrop"],string>> = {
  stars:"world-space", reef:"world-ocean", skyline:"world-city",
};

const landscapes:Partial<Record<WorldDesign["backdrop"],{
  sky:string;
  horizon:string;
  ridge:string;
  ground:string;
}>> = {
  snow:{sky:"#183965",horizon:"#80bedc",ridge:"#aecad8",ground:"#48718e"},
  forest:{sky:"#162f43",horizon:"#95b99b",ridge:"#41675d",ground:"#183e36"},
  cavern:{sky:"#100e23",horizon:"#755e96",ridge:"#4b4270",ground:"#231b3e"},
  storm:{sky:"#201f39",horizon:"#d78565",ridge:"#845e6b",ground:"#47364c"},
};

export function makeWorldBackdrop(name:WorldDesign["backdrop"]) {
  const colors=landscapes[name];
  if(!colors)return null;
  return new T.ShaderMaterial({
    side:T.DoubleSide,
    uniforms:{
      sky:{value:new T.Color(colors.sky)}, horizon:{value:new T.Color(colors.horizon)},
      ridge:{value:new T.Color(colors.ridge)}, ground:{value:new T.Color(colors.ground)},
      trees:{value:name==="forest"?1:0}, cave:{value:name==="cavern"?1:0},
    },
    vertexShader:`
      varying vec3 viewPosition;
      void main() {
        vec4 world=modelMatrix*vec4(position,1.0);
        viewPosition=world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }
    `,
    fragmentShader:`
      varying vec3 viewPosition;
      uniform vec3 sky, horizon, ridge, ground;
      uniform float trees, cave;
      void main() {
        vec3 ray=normalize(viewPosition-cameraPosition);
        float x=atan(ray.z,ray.x)*2.4;
        float y=ray.y;
        vec3 color=mix(horizon,sky,smoothstep(-.16,.44,y));
        float peaks=.6*sin(x*2.0)+.27*sin(x*4.3+1.0)+.13*sin(x*8.4);
        float distant=.04+peaks*.18;
        color=mix(color,ridge,1.0-smoothstep(distant,distant+.012,y));
        float nearRidge=-.13+.064*sin(x*3.1)+.025*sin(x*9.0);
        nearRidge+=trees*.13*pow(1.0-abs(fract(x*5.4)*2.0-1.0),3.0);
        color=mix(color,ground,1.0-smoothstep(nearRidge,nearRidge+.012,y));
        float ceiling=.29+.14*sin(x*2.1)+.027*sin(x*12.0);
        color=mix(color,ground,cave*smoothstep(ceiling,ceiling+.02,y));
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}
