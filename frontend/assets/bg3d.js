/* Full-page 3D motion background: gold star-tunnel, perspective grids and wireframe solids.
 * Scroll flies the camera through the tunnel; mouse adds parallax. */
(function(){
  var canvas=document.getElementById('three-canvas'); if(!canvas||!window.THREE) return;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches, mobile=innerWidth<768, T=THREE;
  var renderer; try{renderer=new T.WebGLRenderer({canvas:canvas,alpha:true,antialias:false,powerPreference:'low-power'})}catch(e){return}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1:1.5)); renderer.setSize(innerWidth,innerHeight);
  var scene=new T.Scene(); scene.fog=new T.FogExp2(0x070707,.028);
  var cam=new T.PerspectiveCamera(65,innerWidth/innerHeight,.1,220); cam.position.set(0,0,6);
  var GOLD=0xe6cf9f, GOLD2=0xc9a96e, SPAN=130;

  // star tunnel
  var N=mobile?900:2600, pos=new Float32Array(N*3), col=new Float32Array(N*3), c=new T.Color();
  var pal=[0xfbf7ee,0xe6cf9f,0xc9a96e,0x8f7bff];
  for(var i=0;i<N;i++){
    var a=Math.random()*6.283, r=2.5+Math.pow(Math.random(),.6)*32;
    pos[i*3]=Math.cos(a)*r; pos[i*3+1]=Math.sin(a)*r*.7; pos[i*3+2]=6-Math.random()*SPAN;
    c.setHex(pal[Math.random()<.08?3:(Math.random()*3|0)]); c.multiplyScalar(.45+Math.random()*.55);
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  var cv=document.createElement('canvas');cv.width=cv.height=32;var cx=cv.getContext('2d'),gr=cx.createRadialGradient(16,16,0,16,16,16);
  gr.addColorStop(0,'#fff');gr.addColorStop(.35,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');cx.fillStyle=gr;cx.fillRect(0,0,32,32);
  var tex=new T.CanvasTexture(cv);
  var pg=new T.BufferGeometry(); pg.setAttribute('position',new T.BufferAttribute(pos,3)); pg.setAttribute('color',new T.BufferAttribute(col,3));
  var stars=new T.Points(pg,new T.PointsMaterial({map:tex,size:.34,vertexColors:true,transparent:true,opacity:.85,blending:T.AdditiveBlending,depthWrite:false}));
  scene.add(stars);

  // perspective grids (floor + ceiling)
  function grid(y,o){var g=new T.GridHelper(180,90,GOLD2,GOLD2);g.material.transparent=true;g.material.opacity=o;g.material.depthWrite=false;g.position.y=y;scene.add(g);return g}
  var floor=grid(-8,.2), roof=grid(10,.08);

  // wireframe solids that the camera flies past
  var geos=[new T.IcosahedronGeometry(1.5,1),new T.TorusKnotGeometry(.9,.26,90,10),new T.OctahedronGeometry(1.3,0),new T.TorusGeometry(1.2,.07,8,48),new T.DodecahedronGeometry(1.2,0)];
  var shapes=[], M=mobile?9:16;
  for(var s=0;s<M;s++){
    var m=new T.Mesh(geos[s%geos.length],new T.MeshBasicMaterial({color:s%3?GOLD:GOLD2,wireframe:true,transparent:true,opacity:.3}));
    var side=s%2?1:-1; m.position.set(side*(6.5+Math.random()*8),(Math.random()-.5)*10,6-s*(SPAN/M)-Math.random()*6);
    m.userData={rx:(Math.random()-.5)*.012,ry:(Math.random()-.5)*.014,ph:Math.random()*6.28,y0:m.position.y};
    scene.add(m); shapes.push(m);
  }

  var mx=0,my=0,sy=0,sv=0,lastY=scrollY,camZ=6,t0=0;
  addEventListener('mousemove',function(e){mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
  addEventListener('resize',function(){cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

  function frame(t){
    var p=pg.attributes.position.array;
    sy+=(scrollY-sy)*.08; sv+=((scrollY-lastY)-sv)*.1; lastY=scrollY;
    camZ=6-sy*.012-t*.0018;                               // constant glide + scroll fly-through
    cam.position.z=camZ; cam.position.x+=(mx*3-cam.position.x)*.04; cam.position.y+=(-my*2-cam.position.y)*.04;
    cam.rotation.z+=(-mx*.06-Math.max(-.12,Math.min(.12,sv*.002))-cam.rotation.z)*.05;
    cam.lookAt(cam.position.x*.3,cam.position.y*.3,camZ-12);
    for(var i=0;i<N;i++){ if(p[i*3+2]>camZ+8) p[i*3+2]-=SPAN; }
    pg.attributes.position.needsUpdate=true;
    var snap=Math.round((camZ-70)/2)*2; floor.position.z=snap; roof.position.z=snap;
    for(var k=0;k<shapes.length;k++){
      var m=shapes[k],u=m.userData; m.rotation.x+=u.rx; m.rotation.y+=u.ry; m.position.y=u.y0+Math.sin(t*.0006+u.ph)*.8;
      if(m.position.z>camZ+6) m.position.z-=SPAN;
    }
    renderer.render(scene,cam);
  }
  if(reduce){frame(0);return}
  (function loop(t){requestAnimationFrame(loop); if(!document.hidden&&!window.__bgPause) frame(t)})(0);
})();
