// Offline authoring only. The browser uses the resulting alpha sprites, not a
// 3D engine. Reproducible original models and joint-sampled animation frames.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as T from 'three';
import { SVGRenderer } from 'three/addons/renderers/SVGRenderer.js';
import { createCreature } from '../lib/client/creature3d.ts';
const require = createRequire(import.meta.url);
const sharp = require(process.env.FUREVER_SHARP || 'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
class Element {
  constructor(tag) { this.tag=tag; this.attrs={}; this.childNodes=[]; this.style={}; }
  setAttribute(k,v) { this.attrs[k]=String(v); }
  appendChild(child) { this.childNodes.push(child); }
  removeChild(child) { this.childNodes.splice(this.childNodes.indexOf(child),1); }
  get outerHTML() { return `<${this.tag} ${Object.entries(this.attrs).map(([k,v])=>`${k}="${v}"`).join(' ')}>${this.childNodes.map(c=>c.outerHTML).join('')}</${this.tag}>`; }
}
globalThis.document={createElementNS:(_,tag)=>new Element(tag)};
const renderer=new SVGRenderer(); renderer.setSize(256,256); renderer.setPrecision(2);
renderer.domElement.setAttribute('xmlns','http://www.w3.org/2000/svg');
const scene=new T.Scene();
scene.add(new T.AmbientLight('#ffffff',.5));
const light=new T.DirectionalLight('#fff4de',.7); light.position.set(-4,8,5); scene.add(light);
const camera=new T.OrthographicCamera(-2.5,2.5,2.5,-2.5,.1,100);
camera.position.set(0,10,12); camera.lookAt(0,1.2,0);
const convert=(group)=>group.traverse(o=>{
  if(!o.isMesh) return;
  if(o.geometry.type==='SphereGeometry') o.geometry=new T.SphereGeometry(1,16,12);
  const old=o.material;
  old.isMeshLambertMaterial=true;
});
async function frame(group) {
  scene.add(group); renderer.render(scene,camera); scene.remove(group);
  return sharp(Buffer.from(renderer.domElement.outerHTML)).png().toBuffer();
}
async function saveSheet(name,frames,cols) {
  await sharp({create:{width:cols*256,height:Math.ceil(frames.length/cols)*256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(frames.map((input,i)=>({input,left:(i%cols)*256,top:Math.floor(i/cols)*256}))).webp({quality:87,alphaQuality:100}).toFile(`public/assets/${name}.webp`);
  console.log(`${name}: ${frames.length} frames`);
}
for(const style of ['sunbeam','starlight']) {
  const c=createCreature(style); convert(c.root); const frames=[];
  // Four directions, six walk-cycle samples each. Additional poses stay on the
  // same camera/scale, so blending never changes character identity.
  for(const mood of ['walk','idle','sit','sleep','react']) {
    for(let dir=0;dir<4;dir++) {
      c.root.rotation.y=[0,Math.PI,Math.PI/2,Math.PI/4][dir];
      const count=mood==='walk'?6:1;
      for(let k=0;k<count;k++) {
        const time=k*2*Math.PI/6/16.5;
        for(let settle=0;settle<12;settle++) c.animate(.05,time,mood==='walk'?5:0,mood,0);
        frames.push(await frame(c.root));
      }
    }
  }
  await saveSheet(`${style}-world-v1`,frames,8); c.dispose();
}
const mat=color=>new T.MeshLambertMaterial({color});
const palette={stone:mat('#d6c7a8'),wood:mat('#76604a'),gold:mat('#e3b359'),leaf:mat('#63936a'),lightLeaf:mat('#8db477'),teal:mat('#4ba8af')};
const add=(root,geo,material,pos,scale=[1,1,1])=>{const m=new T.Mesh(geo,material);m.position.set(...pos);m.scale.set(...scale);root.add(m);return m;};
const box=(r,m,p,s)=>add(r,new T.BoxGeometry(1,1,1),m,p,s);
const sphere=(r,m,p,s)=>add(r,new T.SphereGeometry(1,12,9),m,p,s);
const props=[];
for(let i=0;i<16;i++) {
  const r=new T.Group();
  if(i<4) {
    const wall=mat(['#e8d0a7','#ecd6b9','#ddc69e','#c8c6da'][i]),roof=mat(['#5a968c','#b86f5f','#63816d','#535b88'][i]);
    box(r,palette.stone,[0,.12,0],[3.5,.25,2.8]); box(r,wall,[0,1.05,0],[3.2,1.9,2.5]);
    const g=new T.ConeGeometry(2.65,1.35,4);g.rotateY(Math.PI/4);add(r,g,roof,[0,2.65,0],[1,1,.85]);
    box(r,palette.wood,[0,.68,1.27],[.65,1.3,.08]);
    for(const x of [-1.03,1.03]) {box(r,palette.wood,[x,1.15,1.28],[.8,.85,.1]);box(r,mat('#ffe3a0'),[x,1.15,1.34],[.64,.68,.06]);box(r,palette.wood,[x,1.15,1.38],[.035,.7,.02]);}
    box(r,roof,[0,1.9,1.55],[3.5,.12,.75]); box(r,wall,[.9,2.9,-.5],[.45,1.3,.45]);
    if(i===0) {box(r,mat('#86bba4'),[0,1.86,1.56],[3.5,.14,.8]);}
    if(i===3) sphere(r,palette.gold,[0,3.28,0],[.12,.12,.12]);
  } else if(i===4||i===5||i===6) {
    if(i!==6) add(r,new T.CylinderGeometry(.12,.23,2,7),palette.wood,[0,1,0]);
    for(let k=0;k<7;k++) {const a=k*2.4; sphere(r,i===5?mat(k%2?'#c4bd70':'#b2ab5e'):k%2?palette.leaf:palette.lightLeaf,[Math.sin(a)*.65,(i===6?.45:2.1)+(k%3)*.26,Math.cos(a)*.45],[i===6?.6:.87,i===6?.42:.78,.8]);}
    if(i===6) for(let k=0;k<6;k++)sphere(r,mat('#eac5b4'),[Math.sin(k*2.3)*.75,.9,Math.cos(k*2.3)*.6],[.11,.1,.11]);
  } else if(i===7) {for(let k=0;k<3;k++)add(r,new T.DodecahedronGeometry(1),mat(k%2?'#9caaa1':'#89978c'),[(k-1)*.6,.45+k*.12,k%2*.3],[.85,.65,.85]);}
  else if(i===8) {add(r,new T.CylinderGeometry(1.4,1.5,.55,24),palette.stone,[0,.28,0]);const ring=add(r,new T.TorusGeometry(1.23,.17,8,24),palette.stone,[0,.6,0]);ring.rotation.x=Math.PI/2;add(r,new T.CylinderGeometry(1.12,1.12,.04,24),palette.teal,[0,.6,0]);add(r,new T.CylinderGeometry(.15,.3,1,12),palette.stone,[0,1,0]);sphere(r,palette.gold,[0,1.6,0],[.18,.22,.18]);}
  else if(i===9) {for(let z=-1.5;z<=1.5;z+=.3)box(r,mat(z%1>.5?'#a58257':'#98744e'),[0,.18,z],[2.1,.2,.27]);for(const x of [-1,1]){for(const z of [-1.4,1.4])box(r,palette.wood,[x,.7,z],[.13,1.3,.13]);box(r,palette.wood,[x,1.05,0],[.12,.12,3.1]);}}
  else if(i===10) {box(r,palette.wood,[0,.45,0],[1.6,.9,1]);const lid=add(r,new T.CylinderGeometry(.5,.5,1.6,12),mat('#9e774b'),[0,.9,0]);lid.rotation.z=Math.PI/2;for(const x of [-.55,.55])box(r,palette.gold,[x,.6,.54],[.1,1,.04]);box(r,palette.gold,[0,.64,.55],[.25,.3,.08]);}
  else if(i===11) {for(const x of [-1.2,1.2])box(r,palette.wood,[x,1.4,0],[.3,2.8,.3]);box(r,palette.wood,[0,2.7,0],[2.8,.35,.35]);for(let k=-2;k<=2;k++)sphere(r,palette.leaf,[k*.55,2.9,0],[.48,.35,.4]);}
  else if(i===12) {add(r,new T.CylinderGeometry(.055,.09,.8,8),palette.leaf,[0,.4,0]);for(let k=0;k<6;k++){const a=k*Math.PI/3;sphere(r,palette.gold,[Math.sin(a)*.32,1+Math.cos(a)*.23,0],[.2,.25,.1]);}sphere(r,mat('#ffe6a9'),[0,1,0],[.19,.19,.19]);}
  else if(i===13) {for(let k=0;k<3;k++) {const c=add(r,new T.OctahedronGeometry(1),mat(k%2?'#8fdddd':'#55b5b5'),[(k-1)*.34,.6+k*.15,0],[.25,.65,.25]);c.rotation.z=(k-1)*-.2;}}
  else if(i===14) {box(r,palette.stone,[0,.15,0],[1,.3,1]);box(r,palette.stone,[0,.85,0],[.4,1.4,.4]);box(r,palette.gold,[0,1.6,0],[.85,.16,.85]);box(r,mat('#ffdfa0'),[0,1.9,0],[.55,.6,.55]);add(r,new T.ConeGeometry(.65,.5,4),palette.stone,[0,2.45,0]);}
  else {add(r,new T.DodecahedronGeometry(1),mat('#8d96a1'),[0,.55,0],[.55,.95,.4]);box(r,palette.teal,[0,.85,.37],[.06,.45,.04]);box(r,palette.teal,[0,.85,.38],[.3,.05,.04]);}
  camera.left=-2.8;camera.right=2.8;camera.top=2.8;camera.bottom=-2.8;camera.updateProjectionMatrix();
  camera.position.set(0,10,12);camera.lookAt(0,1.2,0);
  props.push(await frame(r));
}
await saveSheet('meadow-props-v1',props,4);
