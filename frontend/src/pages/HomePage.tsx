import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LensZoomCarousel, { type Slide } from '@/components/ui/lens-zoom-carousel';


const U = (id: string) => 'https://images.unsplash.com/photo-' + id + '?q=80&w=1800&auto=format&fit=crop';
const backgroundSlides: Slide[] = [
  {image:U('1506905925346-21bda4d32df4'),alt:'Mountain sunrise'},
  {image:U('1501785888041-af3ef285b470'),alt:'Alpine lake'},
  {image:U('1469474968028-56623f02e42e'),alt:'Golden forest valley'},
  {image:U('1464822759023-fed622ff2c3b'),alt:'Snow covered mountains'},
  {image:U('1500534314209-a25ddb2bd429'),alt:'Blue mountain ridges'},
  {image:U('1433086966358-54859d0ed716'),alt:'Waterfall landscape'},
];
import { ArrowRightIcon, ChatBubbleLeftRightIcon, EnvelopeIcon, BoltIcon, ChartBarIcon, SparklesIcon, GiftIcon, CheckIcon, PlayCircleIcon } from '@heroicons/react/24/outline';

const features = [
  { icon: ChatBubbleLeftRightIcon, title: 'Comment-triggered automations', text: 'Respond to matching YouTube comments with your configured message and form link.' },
  { icon: EnvelopeIcon, title: 'Capture leads, deliver content', text: 'Collect opt-in email addresses through branded forms and send your configured resources.' },
  { icon: BoltIcon, title: 'Visual workflow builder', text: 'Design triggers, conditions, replies and email actions without writing code.' },
  { icon: ChartBarIcon, title: 'Activity and delivery tracking', text: 'Review automation activity and email delivery status from one dashboard.' },
  { icon: SparklesIcon, title: 'AI reply assistance', text: 'Planned capability: suggest relevant responses to incoming comments.' },
  { icon: GiftIcon, title: 'Sentiment & giveaways', text: 'Planned capabilities: comment sentiment insights and fair giveaway selection.' },
];
const plans = [
  { name: 'Free', price: '₹0', description: 'Explore the platform and get started.', benefits: ['Dashboard access', 'Visual workflow exploration', 'Core automation tools'], featured: false },
  { name: 'Premium', price: 'Coming soon', description: 'For creators ready to scale.', benefits: ['Advanced automation options', 'Expanded usage limits', 'Priority support (planned)'], featured: true },
];
export function HomePage() {
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const progress = Math.min(1, Math.max(0, window.scrollY / max));
        setBackgroundIndex(Math.min(backgroundSlides.length - 1, Math.floor(progress * backgroundSlides.length)));
      });
    };
    update();
    window.addEventListener("scroll", update, {passive:true});
    window.addEventListener("resize", update);
    return () => {cancelAnimationFrame(frame);window.removeEventListener("scroll",update);window.removeEventListener("resize",update)};
  }, []);
  return <div className="relative isolate min-h-screen bg-transparent text-slate-100">
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true"><LensZoomCarousel slides={backgroundSlides} activeIndex={backgroundIndex} backgroundMode height="100%" duration={900} autoplay={0} ariaLabel="Decorative scrolling background" /></div>
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] overflow-hidden" aria-hidden="true"><div className="absolute -top-44 left-[5%] h-[480px] w-[480px] rounded-full bg-violet-700/20 blur-[120px]"/><div className="absolute right-[5%] top-24 h-[380px] w-[380px] rounded-full bg-cyan-600/10 blur-[120px]"/></div>
    <header className="sticky top-0 z-50 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0d0d14]/85 px-5 py-4 backdrop-blur-md sm:px-8">
      <Link to="/" className="flex items-center gap-3 font-bold tracking-tight text-white"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500"><PlayCircleIcon className="h-6 w-6"/></span><span>YouTube Automation</span></Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm text-slate-300 md:flex"><a className="hover:text-white" href="#features">Features</a><a className="hover:text-white" href="#how-it-works">How it works</a><a className="hover:text-white" href="#pricing">Pricing</a></nav>
      <div className="flex items-center gap-2 sm:gap-3"><button type="button" aria-label="Toggle navigation menu" aria-expanded={mobileMenuOpen} aria-controls="mobile-home-nav" onClick={()=>setMobileMenuOpen(open=>!open)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white md:hidden"><span aria-hidden="true">{mobileMenuOpen?"✕":"☰"}</span></button><Link className="whitespace-nowrap text-sm font-medium text-slate-300 hover:text-white" to="/login">Log in</Link><Link className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500" to="/register">Get started <span aria-hidden="true">→</span></Link></div>
      {mobileMenuOpen && <nav id="mobile-home-nav" aria-label="Mobile navigation" className="flex w-full flex-col gap-1 border-t border-white/10 pt-3 md:hidden">{[["Features","#features"],["How it works","#how-it-works"],["Pricing","#pricing"]].map(([label,href])=><a key={href} href={href} onClick={()=>setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm text-slate-100 hover:bg-white/10">{label}</a>)}</nav>}
    </header>
    <main className="relative z-10">
      <section className="relative mx-auto max-w-7xl px-5 pb-24 pt-20 text-center sm:px-8 sm:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-xs font-semibold text-violet-200"><BoltIcon className="h-4 w-4"/> Built for YouTube creators</span>
        <h1 className="mx-auto mt-8 max-w-5xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">Turn YouTube comments into <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">real connections.</span></h1>
        <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">Automate comment replies, collect email leads with beautiful forms, and deliver valuable content — all from one creator-friendly dashboard.</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"><Link to="/register" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-7 py-4 font-semibold text-white shadow-lg shadow-violet-800/30 hover:bg-violet-500 sm:w-auto">Get Started for Free <ArrowRightIcon className="h-5 w-5"/></Link><a href="#how-it-works" className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-7 py-4 font-semibold text-slate-200 hover:bg-white/10 sm:w-auto">See How It Works</a></div>
        <p className="mt-5 text-xs text-slate-400">No payment required to create an account. Availability of features depends on setup.</p>
      </section>
      <section id="features" className="scroll-mt-24 border-t border-white/[0.06] bg-[#0b0b14]/10 py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8"><p className="text-sm font-semibold uppercase tracking-widest text-violet-400">Features</p><h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">Everything you need to grow your creator community</h2><p className="mt-4 max-w-2xl text-slate-400">Make every conversation count. Planned features are clearly labeled.</p><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{features.map(({icon:Icon,title,text})=><article key={title} className="rounded-2xl border border-white/10 bg-[#161624]/20 backdrop-blur-[2px] p-7 transition hover:border-violet-500/40"><div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"><Icon className="h-6 w-6"/></div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{text}</p></article>)}</div></div></section>
      <section id="how-it-works" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-24 sm:px-8"><p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Simple by design</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">From comment to connection</h2><div className="mt-12 grid gap-6 md:grid-cols-3">{[['01','Connect your channel','Authorize your YouTube channel using the supported Google integration.'],['02','Build your automation','Choose videos, set keyword rules, and customize your reply and form.'],['03','Engage and follow up','Let your configured workflow process matching comments and requested emails.']].map(([n,title,desc])=><div key={n} className="border-l-2 border-violet-500/50 pl-6"><span className="text-3xl font-extrabold text-violet-400">{n}</span><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{desc}</p></div>)}</div></section>
      <section id="pricing" className="scroll-mt-24 border-y border-white/[0.06] bg-white/[0.01] py-24"><div className="mx-auto max-w-5xl px-5 sm:px-8"><div className="text-center"><p className="text-sm font-semibold uppercase tracking-widest text-violet-400">Pricing preview</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Start free. Grow when you're ready.</h2><p className="mt-4 text-slate-400">Illustrative plans only. Premium pricing and entitlements are not yet finalized.</p></div><div className="mt-12 grid gap-6 md:grid-cols-2">{plans.map(plan=><article key={plan.name} className={`relative rounded-3xl border p-8 ${plan.featured?'border-violet-500/50 bg-violet-500/[0.08]':'border-white/10 bg-[#161624]/20 backdrop-blur-[2px]'}`}>{plan.featured&&<span className="absolute right-6 top-6 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-200">Preview</span>}<h3 className="text-xl font-bold">{plan.name}</h3><p className="mt-5 text-4xl font-extrabold">{plan.price}</p><p className="mt-4 text-sm text-slate-400">{plan.description}</p><ul className="my-8 space-y-4">{plan.benefits.map(item=><li key={item} className="flex items-start gap-3 text-sm text-slate-300"><CheckIcon className="h-5 w-5 shrink-0 text-cyan-400"/>{item}</li>)}</ul>{plan.featured?<span className="block rounded-xl border border-white/15 px-5 py-3 text-center text-sm font-semibold text-slate-300">Pricing to be announced</span>:<Link to="/register" className="block rounded-xl bg-violet-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-violet-500">Get Started for Free</Link>}</article>)}</div></div></section>
      <section className="px-5 py-24 text-center"><h2 className="text-3xl font-bold sm:text-4xl">Ready to make every comment count?</h2><p className="mx-auto mt-4 max-w-xl text-slate-400">Build meaningful connections with your audience, one automation at a time.</p><Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-4 font-semibold text-white hover:bg-violet-500">Get Started for Free <ArrowRightIcon className="h-5 w-5"/></Link></section>
    </main>
    <footer className="border-t border-white/10 bg-[#090911]/35"><div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between"><div><p className="font-bold text-white">YouTube Automation</p><p className="mt-2 text-xs text-slate-400">Creator tools for smarter engagement.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-6 text-sm text-slate-400"><Link to="/terms" className="hover:text-white">Terms of Service</Link><Link to="/privacy" className="hover:text-white">Privacy Policy</Link><Link to="/contact" className="hover:text-white">Contact Us</Link></nav><p className="text-xs text-slate-400">© {new Date().getFullYear()} YouTube Automation.</p></div></footer>
  </div>;
}
