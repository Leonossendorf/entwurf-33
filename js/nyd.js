// Café nyd: echte Fotos, flüssige Übergänge beim Scrollen, weiche Linse unter der Maus
export async function createNyd({ canvas, wrap, root, rec = false, reduced = false }) {
  // fit: 0 = Bild füllt alles, 1 = ganzes Bild sichtbar (Rand weich verschwommen); fx/fy: Bildmitte
  const SET = [
    { src: 'assets/img/nyd/hero-room.webp', fit: 0, fx: .5, fy: .5 },
    { src: 'assets/img/nyd/acai.webp', fit: .82, fx: .48, fy: .5 },
    { src: 'assets/img/nyd/tisch.webp', fit: 1, fx: .5, fy: .5 },
    { src: 'assets/img/nyd/avocado.webp', fit: .8, fx: .5, fy: .5 },
    { src: 'assets/img/nyd/karottenkuchen.webp', fit: .75, fx: .5, fy: .5 },
    { src: 'assets/img/nyd/sitzbank.webp', fit: .15, fx: .5, fy: .5 },
    { src: 'assets/img/nyd/fassade.webp', fit: .1, fx: .5, fy: .55 },
  ];
  const IMGS = SET.map(s => s.src);
  const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: rec });
  const caps = [...root.querySelectorAll('.cap')], num = root.querySelector('#nydNum'), bar = root.querySelector('#nydBar');
  let cur = -1;
  const setCap = i => { if (i === cur) return; cur = i; caps.forEach((c, k) => c.classList.toggle('on', k === i)); num.textContent = String(i + 1).padStart(2, '0'); };
  if (!gl) return null;
  const vs = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv=p*.5+.5; gl_Position=vec4(p,0.,1.); }`;
  const fs = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D A, B; uniform vec2 sA, sB, ms, fA, fB; uniform float f, t, asp, spd, zA, zB;
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), q=fract(p); q=q*q*(3.-2.*q); return mix(mix(h(i),h(i+vec2(1,0)),q.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),q.x),q.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n2(p); p*=2.03; a*=.5; } return v; }
vec2 cover(vec2 u, vec2 s, float z, vec2 fc){ return (u-.5)*s/z+fc; }
vec3 samp(sampler2D T, vec2 q, float e){
  vec2 c = clamp(q, 0., 1.); float out_ = step(.0001, max(max(-q.x, q.x-1.), max(-q.y, q.y-1.)));
  vec3 sharp = vec3(texture(T, q+vec2(e*.0028,0.)).r, texture(T, q).g, texture(T, q-vec2(e*.0028,0.)).b);
  vec3 soft = textureLod(T, c, 6.5).rgb*.62;
  float edge = smoothstep(0., .015, max(max(-q.x, q.x-1.), max(-q.y, q.y-1.)));
  return mix(sharp, soft, edge);
}
void main(){
  vec2 u = uv; vec2 d = u-ms; d.x*=asp; float r=length(d);
  float lens = exp(-r*r/.035)*(.035+.06*spd); float wav = sin(r*70.-t*7.)*exp(-r*9.)*.004*spd;
  u -= (d/(r+1e-4))*(lens*.35+wav)*vec2(1./asp,1.); u += (ms-.5)*.012;
  float n = fbm(u*vec2(asp,1.)*2.4+vec2(t*.04,0.)); float th = f*1.5-.25;
  float m = 1.-smoothstep(th-.14, th+.14, n + (1.-u.y)*.15); float e = m*(1.-m)*4.;
  vec2 flow = (vec2(fbm(u*3.+1.7),fbm(u*3.+4.1))-.5)*.22;
  vec2 ua = cover(u + flow*f, sA, zA, fA), ub = cover(u - flow*(1.-f), sB, zB, fB);
  vec3 ca = samp(A, ua, e), cb = samp(B, ub, e);
  vec3 c = mix(ca, cb, m) + e*vec3(.98,.93,.92)*.12 + (h(uv*vec2(1600.,900.)+t)-.5)*.03;
  o = vec4(c,1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr); gl.useProgram(pr);
  const U = {}; for (const n of ['A', 'B', 'sA', 'sB', 'ms', 'f', 't', 'asp', 'spd', 'zA', 'zB', 'fA', 'fB']) U[n] = gl.getUniformLocation(pr, n);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.uniform1i(U.A, 0); gl.uniform1i(U.B, 1);
  const ims = await Promise.all(IMGS.map(src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = src; })));
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const tex = [], asps = [];
  ims.forEach(im => { const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    tex.push(tx); asps.push(im.width / im.height); });
  root.querySelector('.nyd-fallback').style.display = 'none';
  const resize = () => { const d = Math.min(devicePixelRatio, 2); canvas.width = canvas.clientWidth * d; canvas.height = canvas.clientHeight * d; gl.viewport(0, 0, canvas.width, canvas.height); };
  resize();
  const ms = { x: .5, y: .5, tx: .5, ty: .5, spd: 0 };
  addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); const nx = (e.clientX - r.left) / r.width, ny = 1 - (e.clientY - r.top) / r.height; ms.spd = Math.min(1.5, ms.spd + Math.hypot(nx - ms.tx, ny - ms.ty) * 6); ms.tx = nx; ms.ty = ny; }, { passive: true });
  let t = 0, sp = 0;
  // Mischung aus 'füllen' und 'ganz zeigen' je Bild
  const scale = (a, fit) => { const c = canvas.width / canvas.height; const cov = c > a ? [1, a / c] : [c / a, 1]; const con = c > a ? [c / a, 1] : [1, a / c]; return [cov[0] + (con[0] - cov[0]) * fit, cov[1] + (con[1] - cov[1]) * fit]; };
  return {
    resize,
    update(dt) {
      t += dt;
      const p = Math.min(1, Math.max(0, (scrollY - wrap.offsetTop) / (wrap.offsetHeight - innerHeight)));
      sp += (p - sp) * (reduced ? 1 : 1 - Math.exp(-dt * 6));
      const x = sp * (IMGS.length - 1), i = Math.min(IMGS.length - 2, Math.floor(x));
      let f = x - i; f = Math.min(1, Math.max(0, (f - 0.25) / 0.5));
      setCap(f > 0.5 ? i + 1 : i); bar.style.width = (sp * 100) + '%';
      ms.x += (ms.tx - ms.x) * (1 - Math.exp(-dt * 8)); ms.y += (ms.ty - ms.y) * (1 - Math.exp(-dt * 8)); ms.spd *= Math.exp(-dt * 2.2);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[i]); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[i + 1]);
      const fitMob = canvas.width < canvas.height ? 0.35 : 1;
      gl.uniform2fv(U.sA, scale(asps[i], SET[i].fit * fitMob)); gl.uniform2fv(U.sB, scale(asps[i + 1], SET[i + 1].fit * fitMob)); gl.uniform2f(U.ms, ms.x, ms.y);
      gl.uniform2f(U.fA, SET[i].fx, SET[i].fy); gl.uniform2f(U.fB, SET[i + 1].fx, SET[i + 1].fy);
      gl.uniform1f(U.f, f); gl.uniform1f(U.t, t); gl.uniform1f(U.asp, canvas.width / canvas.height); gl.uniform1f(U.spd, reduced ? 0 : ms.spd);
      gl.uniform1f(U.zA, 1.0 + (x - i) * 0.04); gl.uniform1f(U.zB, 1.06 - f * 0.06);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
}
