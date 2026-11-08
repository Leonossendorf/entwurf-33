// Saftspur: Flüssigkeitssimulation (stabile Strömung nach Jos Stam), eigene Umsetzung in WebGL2
export function createFluid(canvas, { rec = false, mobile = false, reduced = false } = {}) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: rec });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
  const SIM = mobile ? 96 : 160, DYE = mobile ? 512 : 1024;
  const VS = `#version 300 es
in vec2 p; out vec2 uv, L, R, T, B; uniform vec2 tx;
void main(){ uv=p*.5+.5; L=uv-vec2(tx.x,0.); R=uv+vec2(tx.x,0.); T=uv+vec2(0.,tx.y); B=uv-vec2(0.,tx.y); gl_Position=vec4(p,0.,1.); }`;
  const H = `#version 300 es
precision highp float; precision highp sampler2D; in vec2 uv, L, R, T, B; out vec4 o;`;
  const FS = {
    splat: H + `uniform sampler2D tgt; uniform float ar, rad, dk; uniform vec3 col; uniform vec2 pt;
      void main(){ vec2 d=uv-pt; d.x*=ar; float g=exp(-dot(d,d)/rad); o=texture(tgt,uv)+vec4(g*col, g*max(max(col.r,col.g),col.b)*dk); }`,
    advect: H + `uniform sampler2D vel, src; uniform vec2 tx; uniform float dt, diss;
      void main(){ vec2 c=uv-dt*texture(vel,uv).xy*tx; o=texture(src,c)/(1.+diss*dt); }`,
    div: H + `uniform sampler2D vel; void main(){ float l=texture(vel,L).x, r=texture(vel,R).x, t=texture(vel,T).y, b=texture(vel,B).y;
      vec2 C=texture(vel,uv).xy; if(L.x<0.)l=-C.x; if(R.x>1.)r=-C.x; if(T.y>1.)t=-C.y; if(B.y<0.)b=-C.y; o=vec4(.5*(r-l+t-b),0.,0.,1.); }`,
    curl: H + `uniform sampler2D vel; void main(){ o=vec4(.5*(texture(vel,R).y-texture(vel,L).y-texture(vel,T).x+texture(vel,B).x),0.,0.,1.); }`,
    vort: H + `uniform sampler2D vel, cu; uniform float k, dt;
      void main(){ float l=texture(cu,L).x, r=texture(cu,R).x, t=texture(cu,T).x, b=texture(cu,B).x, c=texture(cu,uv).x;
      vec2 f=.5*vec2(abs(t)-abs(b),abs(r)-abs(l)); f/=length(f)+1e-4; f*=k*c; f.y*=-1.; o=vec4(clamp(texture(vel,uv).xy+f*dt,-1000.,1000.),0.,1.); }`,
    press: H + `uniform sampler2D pr, dv; void main(){ o=vec4(.25*(texture(pr,L).x+texture(pr,R).x+texture(pr,T).x+texture(pr,B).x-texture(dv,uv).x),0.,0.,1.); }`,
    grad: H + `uniform sampler2D pr, vel; void main(){ vec2 v=texture(vel,uv).xy-vec2(texture(pr,R).x-texture(pr,L).x,texture(pr,T).x-texture(pr,B).x); o=vec4(v,0.,1.); }`,
    scale: H + `uniform sampler2D tgt; uniform float k; void main(){ o=k*texture(tgt,uv); }`,
    show: H + `uniform sampler2D dye; uniform vec2 tx; uniform vec3 bg; uniform float t, glow;
      float lum(vec3 c){ return dot(c, vec3(.3,.59,.11)); }
      float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec4 D = texture(dye,uv); vec3 c = D.rgb; float m = max(max(c.r,c.g),c.b)+1e-4;
        float a = smoothstep(0.,.42,m)*.96;
        float hl=lum(texture(dye,uv-vec2(tx.x,0.)).rgb), hr=lum(texture(dye,uv+vec2(tx.x,0.)).rgb), hb=lum(texture(dye,uv-vec2(0.,tx.y)).rgb), ht=lum(texture(dye,uv+vec2(0.,tx.y)).rgb);
        vec3 n = normalize(vec3((hl-hr)*2.,(hb-ht)*2.,1.)); vec3 ld = normalize(vec3(-.45,.6,.8));
        float dif = clamp(dot(n,ld),0.,1.), spec = pow(clamp(dot(reflect(-ld,n),vec3(0.,0.,1.)),0.,1.),48.);
        float dark = clamp(D.a/m,0.,1.); vec3 juice = c/m*(1.-.62*dark);
        vec3 col = mix(bg, juice*(.8+.3*dif)*(1.+glow*.25), a) + spec*.4*smoothstep(.08,.5,a);
        col += (hash(uv*vec2(1733.,977.)+t)-.5)*.025;
        o = vec4(col,1.);
      }`
  };
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
  const vs = sh(gl.VERTEX_SHADER, VS), P = {};
  for (const k in FS) {
    const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS[k])); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
    P[k] = { p, u };
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  function resize() { const d = Math.min(devicePixelRatio, mobile ? 1.5 : 2); canvas.width = innerWidth * d; canvas.height = innerHeight * d; }
  resize();
  function fbo(w, h, ifmt, fmt, filter) {
    gl.activeTexture(gl.TEXTURE0); const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, filter], [gl.TEXTURE_MAG_FILTER, filter], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, gl.HALF_FLOAT, null);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT); return { t, f, w, h, tx: [1 / w, 1 / h] };
  }
  const dbl = (w, h, i, f, fl) => { let a = fbo(w, h, i, f, fl), b = fbo(w, h, i, f, fl); return { get r() { return a; }, get w() { return b; }, swap() { [a, b] = [b, a]; } }; };
  const size = res => { const ar = canvas.width / canvas.height; return ar > 1 ? [Math.round(res * ar), res] : [res, Math.round(res / ar)]; };
  const [sw, shh] = size(SIM), [dw, dh] = size(DYE), Lf = gl.LINEAR, Nf = gl.NEAREST;
  const vel = dbl(sw, shh, gl.RG16F, gl.RG, Lf), dye = dbl(dw, dh, gl.RGBA16F, gl.RGBA, Lf), pres = dbl(sw, shh, gl.R16F, gl.RED, Nf);
  const dv = fbo(sw, shh, gl.R16F, gl.RED, Nf), cu = fbo(sw, shh, gl.R16F, gl.RED, Nf);
  let unit = 0;
  const bindT = t => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); return unit++; };
  function run(prog, target, uni) {
    const { p, u } = P[prog]; gl.useProgram(p); unit = 0;
    for (const k in uni) { const v = uni[k]; if (!u[k]) continue; if (v && v.t) gl.uniform1i(u[k], bindT(v.t)); else if (typeof v === 'number') gl.uniform1f(u[k], v); else if (v.length === 2) gl.uniform2fv(u[k], v); else gl.uniform3fv(u[k], v); }
    if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.f); gl.viewport(0, 0, target.w, target.h); } else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  // Farbwelten: Früchte oben, Açaí und Ube bei Bowlers
  const THEMES = {
    fruit: { bg: [0.957, 0.925, 0.878], pal: [[0.85, 0.02, 0.16], [0.95, 0.55, 0.06], [0.55, 0.12, 0.62], [0.45, 0.72, 0.12], [0.62, 0.45, 0.9], [0.96, 0.36, 0.2]], dk: [0.05, 0, 0.4, 0.05, 0.15, 0], glow: 0 },
    ube: { bg: [0.075, 0.035, 0.09], pal: [[0.5, 0.1, 0.62], [0.72, 0.58, 0.95], [0.9, 0.22, 0.48], [0.36, 0.14, 0.7], [0.78, 0.5, 0.88]], dk: [0, 0, 0, 0, 0], glow: 0.6 },
  };
  let theme = THEMES.fruit; const bg = [...theme.bg]; let glow = 0, fade = 0;
  let pi = 0, colT = 0, time = 0;
  const colNow = () => { const a = theme.pal[pi % theme.pal.length], b = theme.pal[(pi + 1) % theme.pal.length]; return a.map((v, i) => (v + (b[i] - v) * colT) * 0.55); };
  function splat(x, y, dx, dy, col, r = 0.0028) {
    const ar = canvas.width / canvas.height;
    run('splat', vel.w, { tgt: vel.r, ar, pt: [x, y], col: [dx, dy, 0], rad: r, dk: 0 }); vel.swap();
    run('splat', dye.w, { tgt: dye.r, ar, pt: [x, y], col, rad: r * 1.1, dk: theme.dk[pi % theme.dk.length] }); dye.swap();
  }
  function step(dt) {
    run('curl', cu, { vel: vel.r, tx: vel.r.tx });
    run('vort', vel.w, { vel: vel.r, cu, k: 22, dt, tx: vel.r.tx }); vel.swap();
    run('div', dv, { vel: vel.r, tx: vel.r.tx });
    run('scale', pres.w, { tgt: pres.r, k: 0.8 }); pres.swap();
    for (let i = 0; i < (mobile ? 16 : 24); i++) { run('press', pres.w, { pr: pres.r, dv, tx: vel.r.tx }); pres.swap(); }
    run('grad', vel.w, { pr: pres.r, vel: vel.r, tx: vel.r.tx }); vel.swap();
    run('advect', vel.w, { vel: vel.r, src: vel.r, tx: vel.r.tx, dt, diss: 0.15 }); vel.swap();
    run('advect', dye.w, { vel: vel.r, src: dye.r, tx: vel.r.tx, dt, diss: 0.45 }); dye.swap();
  }
  const ptr = { x: .5, y: .5, px: .5, py: .5, moved: false, idle: 9 };
  addEventListener('pointermove', e => { ptr.px = ptr.x; ptr.py = ptr.y; ptr.x = e.clientX / innerWidth; ptr.y = 1 - e.clientY / innerHeight; ptr.moved = true; ptr.idle = 0; }, { passive: true });
  let active = true;
  addEventListener('pointerdown', e => { if (!active) return; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; splat(e.clientX / innerWidth, 1 - e.clientY / innerHeight, Math.cos(a) * 900, Math.sin(a) * 900, colNow().map(v => v * 1.4), 0.0016); } pi++; });
  function auto(t) {
    const x = .5 + .34 * Math.sin(t * .53) + .08 * Math.sin(t * 1.7), y = .5 + .27 * Math.cos(t * .71) + .06 * Math.sin(t * 2.3);
    splat(x, y, .34 * .53 * Math.cos(t * .53) * 1800, -.27 * .71 * Math.sin(t * .71) * 1800, colNow().map(v => v * .3), 0.0013);
  }
  for (let i = 0; i < 70; i++) { time += 1 / 30; colT += 0.03; if (colT >= 1) { colT = 0; pi++; } if (i % 2 === 0) auto(time * 1.6 + 2); step(1 / 30); }
  return {
    setActive(v) { active = v; },
    setTheme(name) { const n = THEMES[name] || THEMES.fruit; if (n !== theme) { theme = n; fade = 1.4; pi = 0; colT = 0; } },
    resize,
    update(dt) {
      if (!active) return;
      time += dt; colT += dt * 0.7; if (colT >= 1) { colT = 0; pi++; }
      for (let i = 0; i < 3; i++) bg[i] += (theme.bg[i] - bg[i]) * (1 - Math.exp(-dt * 3));
      glow += (theme.glow - glow) * (1 - Math.exp(-dt * 3));
      ptr.idle += dt;
      if (ptr.moved) { const dx = (ptr.x - ptr.px) * 7000, dy = (ptr.y - ptr.py) * 7000; if (Math.abs(dx) + Math.abs(dy) > 1) splat(ptr.x, ptr.y, dx, dy, colNow().map(v => v * .5), 0.0012); ptr.moved = false; }
      else if (ptr.idle > 2.5 && !reduced) auto(time);
      if (fade > 0) { fade -= dt; run('scale', dye.w, { tgt: dye.r, k: 0.9 }); dye.swap(); }
      step(Math.min(dt, 1 / 30));
      run('show', null, { dye: dye.r, tx: [1 / dw, 1 / dh], bg, t: time % 10, glow });
    }
  };
}
