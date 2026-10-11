"use client"
import * as React from "react"

export type LandPalette = "dawn" | "alpine" | "dusk" | "mist"
export type Slide = { image?: string; title?: string; caption?: string; alt?: string; palette?: LandPalette; seed?: number }
export type LensZoomCarouselProps = { slides?: Slide[]; height?: number | string; duration?: number; depth?: number; autoplay?: number; ink?: string; onChange?: (index: number) => void; className?: string; style?: React.CSSProperties; ariaLabel?: string; activeIndex?: number; backgroundMode?: boolean }
export const wrap = (i: number, n: number) => n ? ((i % n) + n) % n : 0
export const ghostScale = (depth: number, g: number) => depth + (depth - 1) * 0.6 * (g + 1)
export const pad2 = (n: number) => n < 10 ? "0" + n : String(n)
const palettes = { dawn: ["#e7b7a5","#f8e8d6","#3a2a3b"], alpine: ["#7ea5c8","#e3ecf2","#1c3044"], dusk: ["#2a2450","#ef8d60","#18121f"], mist: ["#c4d0cb","#eef1ec","#2c3a33"] } as const
function paintLandscape(seed: number, palette: LandPalette): string {
  if (typeof document === "undefined") return ""
  const c = document.createElement("canvas"); c.width=1200; c.height=750
  const g=c.getContext("2d"); if(!g) return ""
  const p=palettes[palette]; const sky=g.createLinearGradient(0,0,0,750)
  sky.addColorStop(0,p[0]);sky.addColorStop(1,p[1]);g.fillStyle=sky;g.fillRect(0,0,1200,750)
  g.fillStyle="#ffffffa0";g.beginPath();g.arc(250+seed%500,230,55,0,Math.PI*2);g.fill()
  for(let layer=0;layer<5;layer++){const y=350+layer*85;g.fillStyle=layer===4?p[2]:p[0];g.globalAlpha=.3+layer*.15;g.beginPath();g.moveTo(0,750);for(let x=0;x<=1200;x+=12)g.lineTo(x,y+Math.sin(x/125+seed+layer)*35+Math.sin(x/50+layer)*12);g.lineTo(1200,750);g.fill()}g.globalAlpha=1
  return c.toDataURL("image/jpeg",.82)
}
const DEFAULT_SLIDES: Slide[] = [{title:"First Light",caption:"Haze lifting off the eastern ridges.",palette:"dawn",seed:3},{title:"High Pass",caption:"Cold air, clear to the far range.",palette:"alpine",seed:8},{title:"Ember Hour",caption:"The last of the sun on the valley floor.",palette:"dusk",seed:14},{title:"Still Valley",caption:"Morning mist that never quite lifts.",palette:"mist",seed:21}]
function useSlideImages(slides:Slide[]) {
  const key=slides.map(s=>s.image || (s.palette||"dawn")+":"+(s.seed??1)).join("|")
  const [painted,setPainted]=React.useState<string[]>([])
  React.useEffect(()=>{setPainted(slides.map((s,i)=>s.image?"":paintLandscape(s.seed??i+1,s.palette||"dawn")))},[key])
  return slides.map((s,i)=>s.image||painted[i]||"")
}
const CSS=`
.lz-root{position:relative;width:100%;overflow:hidden;background:#0d0d0f;color:var(--lz-ink);user-select:none;touch-action:pan-y;outline:none}
.lz-root:focus-visible{outline:2px solid var(--lz-ink);outline-offset:-2px}
.lz-base,.lz-in{position:absolute;inset:0}
.lz-base{transition:filter .9s ease,transform 1.4s cubic-bezier(.2,.7,.2,1)}
.lz-root[data-moving="1"] .lz-base{filter:brightness(.42);transform:scale(1.04)}
.lz-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
.lz-in{overflow:hidden;animation:lz-show var(--lz-d) ease both}
.lz-main{animation:lz-zoom var(--lz-d) cubic-bezier(.16,.8,.2,1) both}
.lz-ghost{mix-blend-mode:screen;animation:lz-ghost var(--lz-d) cubic-bezier(.16,.8,.2,1) both}
.lz-shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.78),transparent 65%);pointer-events:none}
.lz-text{position:absolute;left:clamp(20px,4vw,56px);bottom:85px;right:clamp(20px,25vw,300px);pointer-events:none}
.lz-title{font:600 clamp(30px,5vw,64px)/1.1 ui-serif,Georgia,serif}
.lz-cap{margin-top:12px;font:400 14px/1.5 system-ui,sans-serif;opacity:.88}
.lz-nav{position:absolute;right:clamp(20px,4vw,56px);bottom:76px;display:flex;align-items:center;gap:12px}
.lz-count{font:500 12px ui-monospace,monospace;letter-spacing:.12em}
.lz-btn{width:42px;height:42px;border-radius:50%;border:1px solid #ffffff88;display:grid;place-items:center;background:#0004;color:inherit;cursor:pointer}
.lz-btn:hover{background:#ffffff;color:#111}
.lz-track{position:absolute;left:clamp(20px,4vw,56px);right:clamp(20px,4vw,56px);bottom:30px;height:2px;background:#ffffff44}
.lz-fill{height:100%;background:var(--lz-ink);transform-origin:left;transform:scaleX(0)}
.lz-fill[data-run="1"]{animation:lz-fill var(--lz-auto) linear forwards}
.lz-root[data-paused="1"] .lz-fill{animation-play-state:paused}
.lz-background .lz-text,.lz-background .lz-nav,.lz-background .lz-track{display:none}\n.lz-background .lz-shade{background:linear-gradient(90deg,rgba(7,7,18,.80),rgba(7,7,18,.66)),linear-gradient(to top,rgba(7,7,18,.82),transparent)}\n.lz-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@keyframes lz-show{from{opacity:0}35%{opacity:1}to{opacity:1}}
@keyframes lz-zoom{from{transform:scale(var(--lz-depth));filter:blur(14px) brightness(1.2)}to{transform:scale(1);filter:none}}
@keyframes lz-ghost{from{transform:scale(var(--lz-g));opacity:.4;filter:blur(6px)}to{transform:scale(1);opacity:0;filter:none}}
@keyframes lz-fill{to{transform:scaleX(1)}}
@media(prefers-reduced-motion:reduce){.lz-in,.lz-main,.lz-ghost,.lz-fill{animation:none!important}.lz-ghost{display:none}.lz-base{transition:none}}
@media(max-width:520px){.lz-text{bottom:145px;right:20px}.lz-nav{left:20px;right:auto;bottom:66px}}
`
export default function LensZoomCarousel({slides=DEFAULT_SLIDES,height="100svh",duration=1050,depth=1.35,autoplay=6000,ink="#ffffff",onChange,className,style,ariaLabel="Image carousel",activeIndex,backgroundMode=false}:LensZoomCarouselProps) {
  const n=slides.length;const srcs=useSlideImages(slides)
  const [index,setIndex]=React.useState(0)
  const [incoming,setIncoming]=React.useState<null|{to:number;dir:number;id:number}>(null)
  const [paused,setPaused]=React.useState(false)
  const rootRef=React.useRef<HTMLDivElement>(null)
  const down=React.useRef<null|{x:number;y:number}>(null)
  const go=React.useCallback((dir:number)=>{if(n<2)return;setIncoming(prev=>prev?prev:{to:wrap(index+dir,n),dir,id:Date.now()})},[n,index])
  React.useEffect(()=>{onChange?.(index)},[index,onChange])
  React.useEffect(()=>{if(activeIndex===undefined||n<1)return;const target=wrap(activeIndex,n);if(target===index){setIncoming(null);return}setIncoming({to:target,dir:target>index?1:-1,id:Date.now()})},[activeIndex,index,n])
  React.useEffect(()=>{const root=rootRef.current;if(!root||typeof IntersectionObserver==="undefined")return;let seen=true;const sync=()=>setPaused(!seen||document.hidden);const io=new IntersectionObserver(([entry])=>{seen=entry.isIntersecting;sync()});io.observe(root);document.addEventListener("visibilitychange",sync);return()=>{io.disconnect();document.removeEventListener("visibilitychange",sync)}},[])
  React.useEffect(()=>{if(!incoming)return;const t=window.setTimeout(()=>{setIndex(incoming.to);setIncoming(null)},Math.max(100,duration)+80);return()=>window.clearTimeout(t)},[incoming,duration])
  React.useEffect(()=>{if(activeIndex!==undefined||!autoplay||paused||incoming||n<2)return;const t=window.setTimeout(()=>go(1),autoplay);return()=>window.clearTimeout(t)},[autoplay,paused,incoming,n,index,go,activeIndex])
  React.useEffect(()=>{if(index>=n&&n>0)setIndex(0)},[index,n])
  const shown=incoming?incoming.to:index;const slide=slides[shown]||{}
  return <div ref={rootRef} className={["lz-root",backgroundMode?"lz-background":null,className].filter(Boolean).join(" ")} style={{height,["--lz-ink" as string]:ink,["--lz-d" as string]:duration+"ms",["--lz-auto" as string]:autoplay+"ms",...style}} data-moving={incoming?"1":"0"} data-paused={paused?"1":"0"} role={backgroundMode?undefined:"region"} aria-roledescription={backgroundMode?undefined:"carousel"} aria-label={backgroundMode?undefined:ariaLabel} tabIndex={backgroundMode?-1:0} onKeyDown={e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();go(e.key==="ArrowRight"?1:-1)}}} onPointerDown={e=>{down.current={x:e.clientX,y:e.clientY}}} onPointerUp={e=>{const p=down.current;down.current=null;if(p&&Math.abs(e.clientX-p.x)>40&&Math.abs(e.clientX-p.x)>Math.abs(e.clientY-p.y))go(e.clientX<p.x?1:-1)}}>
    <style>{CSS}</style><div className="lz-base">{srcs[index]&&<img className="lz-img" src={srcs[index]} alt={slides[index]?.alt||slides[index]?.title||""} draggable={false}/>}</div>
    {incoming&&<div className="lz-in" key={incoming.id} style={{["--lz-depth" as string]:String(incoming.dir>=0?depth:1/depth)}} aria-hidden="true">{srcs[incoming.to]&&<><img className="lz-img lz-main" src={srcs[incoming.to]} alt="" draggable={false}/>{[1,0].map(g=><img key={g} className="lz-img lz-ghost" src={srcs[incoming.to]} alt="" draggable={false} style={{["--lz-g" as string]:String(ghostScale(incoming.dir>=0?depth:1/depth,g)),animationDelay:g*40+"ms"}}/>)}</>}</div>}
    <div className="lz-shade" aria-hidden="true"/><div className="lz-text" key={shown}><h2 className="lz-title">{slide.title}</h2><p className="lz-cap">{slide.caption}</p></div>
    {!backgroundMode && <div className="lz-nav"><span className="lz-count" aria-hidden="true">{pad2(shown+1)} / {pad2(n)}</span><button type="button" className="lz-btn" aria-label="Previous slide" disabled={n<2 || !!incoming} onClick={()=>go(-1)} onPointerDown={e=>e.stopPropagation()}>‹</button><button type="button" className="lz-btn" aria-label="Next slide" disabled={n<2 || !!incoming} onClick={()=>go(1)} onPointerDown={e=>e.stopPropagation()}>›</button></div>}
    <div className="lz-track" aria-hidden="true"><div key={index} className="lz-fill" data-run={autoplay>0&&n>1&&!incoming&&!paused?"1":"0"}/></div>{!backgroundMode && <span className="lz-sr" aria-live="polite">Slide {shown+1} of {n}{slide.title?": "+slide.title:""}</span>}
  </div>
}
