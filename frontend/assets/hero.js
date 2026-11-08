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
