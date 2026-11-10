/* New hero: split the name into letters, pointer spotlight + portrait tilt */
(function(){
  var hx=document.getElementById('home'); if(!hx) return;
  var i=0;
  hx.querySelectorAll('.hx-name .ln').forEach(function(ln){
    var t=ln.textContent.trim(); ln.setAttribute('aria-label',t); ln.textContent='';
    t.split('').forEach(function(c){var s=document.createElement('span');s.className='ch';s.setAttribute('aria-hidden','true');s.style.setProperty('--i',i++);s.textContent=c;ln.appendChild(s)});
  });
  setTimeout(function(){var n=hx.querySelector('.hx-name');if(n)n.classList.add('shine')},2200);
  if(!window.matchMedia('(pointer:fine)').matches) return;
  var por=hx.querySelector('.hx-portrait');
  hx.addEventListener('mousemove',function(e){
    var r=hx.getBoundingClientRect();
    hx.style.setProperty('--mx',(e.clientX-r.left)+'px');hx.style.setProperty('--my',(e.clientY-r.top)+'px');
    if(por){var x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;por.style.setProperty('--tx',(x*14)+'deg');por.style.setProperty('--ty',(-y*10)+'deg')}
  });
})();

/* "Available for work" button: ripple on click, then glide to the contact section */
(function(){
  var b=document.getElementById('hxBadge'); if(!b) return;
  b.addEventListener('click',function(e){
    e.preventDefault();
    var r=b.getBoundingClientRect(),s=Math.max(r.width,r.height)*2.2,d=document.createElement('span');
    d.className='rp';d.style.cssText='width:'+s+'px;height:'+s+'px;left:'+(e.clientX-r.left-s/2)+'px;top:'+(e.clientY-r.top-s/2)+'px';
    b.appendChild(d);setTimeout(function(){d.remove()},750);
    var c=document.getElementById('message')||document.getElementById('contact'); if(c) setTimeout(function(){c.scrollIntoView({behavior:'smooth'})},180);
  });
  if(window.matchMedia('(pointer:fine)').matches){
    b.addEventListener('mousemove',function(e){var r=b.getBoundingClientRect();b.style.transform='translate('+((e.clientX-r.left-r.width/2)*.12)+'px,'+((e.clientY-r.top-r.height/2)*.25-2)+'px)'});
    b.addEventListener('mouseleave',function(){b.style.transform=''});
  }
})();
