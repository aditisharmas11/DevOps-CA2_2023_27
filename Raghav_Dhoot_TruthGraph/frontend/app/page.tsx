"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  Activity, ArrowRight, BookOpen, BrainCircuit, Check, CircleDot, Clock3,
  ExternalLink, FileSearch, GitBranch, Globe2, History, Info, Menu,
  Moon, Network, Search, ShieldCheck, Sparkles, Sun, Trash2, X, Zap,
} from "lucide-react";

type Page = "home" | "verify" | "results" | "pipeline" | "history" | "about";
type Verdict = "true" | "false" | "misleading" | "unverifiable";
type HistoryItem = { id: string; input: string; verdict: Verdict; score: number; date: string };
type EvidenceItem = {
  id: string; title: string; host: string; url: string;
  stance: "Supports" | "Contradicts" | "Neutral";
  authority: number; relevance: number; agreement: number;
};
type DemoResult = {
  query: string; verdict: Verdict; confidence: number; credibility: number;
  claims: number; support: number; contradict: number; reasoning: string;
  evidence: EvidenceItem[];
  agents: { name: string; summary: string; confidence: number }[];
};
type ApiResponse = {
  overall_verdict: Verdict;
  overall_confidence: number;
  credibility_score: number;
  claims: {
    claim: string; verdict: Verdict; confidence: number; reasoning: string;
    evidence_nodes: {
      url: string; stance: "support" | "contradiction" | "neutral";
      authority: number; relevance: number; agreement: number;
    }[];
    agent_findings: { agent: string; summary: string; confidence: number }[];
  }[];
  evidence_graphs: {
    claim: string; claim_node_id: string;
    nodes: {
      id: string; type: string; label: string; url?: string | null;
      authority?: number | null; relevance?: number | null; agreement?: number | null;
    }[];
    edges: { source: string; target: string; type: string; weight?: number | null }[];
  }[];
};

const API_BASE_URL = (((import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) || "http://127.0.0.1:8000").replace(/\/$/, "");

const demoResults = [{
  query: "Renewable energy accounted for more than 30% of global electricity generation in 2023.",
  verdict: "true" as Verdict, confidence: 91, credibility: 87, claims: 3, support: 6, contradict: 1,
  reasoning: "Multiple independent, high-authority sources report that renewables passed the 30% threshold in 2023. The strongest agreement comes from energy agencies and global electricity reviews.",
  evidence: [
    { id: "e1", title: "Global Electricity Review 2024", host: "ember-energy.org", url: "https://ember-energy.org", stance: "Supports", authority: 96, relevance: 94, agreement: 91 },
    { id: "e2", title: "Renewables 2023 analysis", host: "iea.org", url: "https://iea.org", stance: "Supports", authority: 98, relevance: 89, agreement: 93 },
    { id: "e3", title: "World Energy Outlook dataset", host: "ourworldindata.org", url: "https://ourworldindata.org", stance: "Supports", authority: 88, relevance: 86, agreement: 90 },
    { id: "e4", title: "Regional energy mix commentary", host: "energynews.example", url: "https://energynews.example", stance: "Contradicts", authority: 52, relevance: 58, agreement: 38 },
  ],
  agents: [
    { name: "Evidence Analyst", summary: "The claim is directly supported by two primary energy datasets.", confidence: 94 },
    { name: "Contradiction Resolver", summary: "The opposing source discusses one region, not the global total.", confidence: 88 },
    { name: "Source Auditor", summary: "The strongest sources are recent, independent and methodologically transparent.", confidence: 91 },
  ],
}, {
  query: "The Great Wall of China is visible from the Moon with the naked eye.",
  verdict: "false" as Verdict, confidence: 96, credibility: 8, claims: 1, support: 0, contradict: 7,
  reasoning: "Astronaut accounts and space-agency explanations agree that the Great Wall is generally not visible from the Moon without magnification. Its narrow width and low contrast make the popular claim false.",
  evidence: [
    { id: "e1", title: "Great Wall visibility from space", host: "nasa.gov", url: "https://nasa.gov", stance: "Contradicts", authority: 99, relevance: 98, agreement: 97 },
    { id: "e2", title: "Can you see the Great Wall from space?", host: "esa.int", url: "https://esa.int", stance: "Contradicts", authority: 98, relevance: 96, agreement: 96 },
    { id: "e3", title: "The Great Wall: common myths", host: "britannica.com", url: "https://britannica.com", stance: "Contradicts", authority: 90, relevance: 91, agreement: 94 },
    { id: "e4", title: "Popular landmarks seen from orbit", host: "space.com", url: "https://space.com", stance: "Contradicts", authority: 76, relevance: 84, agreement: 89 },
  ],
  agents: [
    { name: "Evidence Analyst", summary: "Authoritative space agencies directly reject the naked-eye Moon claim.", confidence: 98 },
    { name: "Contradiction Resolver", summary: "The myth confuses low Earth orbit photography with visibility from the Moon.", confidence: 96 },
    { name: "Source Auditor", summary: "The evidence is consistent across primary and reference sources.", confidence: 95 },
  ],
}, {
  query: "Lightning never strikes the same place twice.",
  verdict: "false" as Verdict, confidence: 98, credibility: 5, claims: 1, support: 0, contradict: 8,
  reasoning: "Lightning frequently strikes tall or exposed structures more than once. Weather agencies document repeated strikes, making the absolute word “never” decisively false.",
  evidence: [
    { id: "e1", title: "Lightning myths and facts", host: "weather.gov", url: "https://weather.gov", stance: "Contradicts", authority: 99, relevance: 99, agreement: 98 },
    { id: "e2", title: "Understanding repeated lightning strikes", host: "noaa.gov", url: "https://noaa.gov", stance: "Contradicts", authority: 99, relevance: 97, agreement: 98 },
    { id: "e3", title: "Lightning science overview", host: "ucar.edu", url: "https://ucar.edu", stance: "Contradicts", authority: 93, relevance: 92, agreement: 96 },
    { id: "e4", title: "How lightning chooses a path", host: "nationalgeographic.com", url: "https://nationalgeographic.com", stance: "Contradicts", authority: 84, relevance: 86, agreement: 91 },
  ],
  agents: [
    { name: "Evidence Analyst", summary: "Repeated strikes are directly observed and well documented.", confidence: 99 },
    { name: "Contradiction Resolver", summary: "The claim is absolute, so one verified repeat strike disproves it.", confidence: 98 },
    { name: "Source Auditor", summary: "Government weather sources provide the strongest evidence.", confidence: 97 },
  ],
}, {
  query: "Humans use only 10% of their brains.",
  verdict: "false" as Verdict, confidence: 95, credibility: 7, claims: 1, support: 0, contradict: 6,
  reasoning: "Brain imaging and neurological evidence show activity across virtually all brain regions over time. Different areas serve different functions, but there is no dormant 90% reserve.",
  evidence: [
    { id: "e1", title: "Do we use only 10 percent of our brain?", host: "britannica.com", url: "https://britannica.com", stance: "Contradicts", authority: 90, relevance: 97, agreement: 95 },
    { id: "e2", title: "The ten-percent brain myth", host: "snopes.com", url: "https://snopes.com", stance: "Contradicts", authority: 82, relevance: 94, agreement: 92 },
    { id: "e3", title: "Mapping activity in the human brain", host: "nih.gov", url: "https://nih.gov", stance: "Contradicts", authority: 99, relevance: 91, agreement: 96 },
    { id: "e4", title: "How the brain works", host: "mayoclinic.org", url: "https://mayoclinic.org", stance: "Contradicts", authority: 96, relevance: 87, agreement: 93 },
  ],
  agents: [
    { name: "Evidence Analyst", summary: "Neuroimaging contradicts the idea that 90% of the brain is unused.", confidence: 97 },
    { name: "Contradiction Resolver", summary: "The myth mistakes task-specific activity for total brain usage.", confidence: 94 },
    { name: "Source Auditor", summary: "Medical and research sources converge on the same conclusion.", confidence: 96 },
  ],
}, {
  query: "Water boils at exactly 100°C everywhere on Earth.",
  verdict: "misleading" as Verdict, confidence: 94, credibility: 32, claims: 1, support: 2, contradict: 5,
  reasoning: "Water boils near 100°C at standard sea-level pressure, but boiling point changes with atmospheric pressure and dissolved substances. The statement is valid only under specific conditions, not everywhere.",
  evidence: [
    { id: "e1", title: "Boiling point and atmospheric pressure", host: "usgs.gov", url: "https://usgs.gov", stance: "Contradicts", authority: 98, relevance: 97, agreement: 96 },
    { id: "e2", title: "Phase changes of water", host: "nist.gov", url: "https://nist.gov", stance: "Contradicts", authority: 99, relevance: 94, agreement: 97 },
    { id: "e3", title: "Water boiling at standard pressure", host: "britannica.com", url: "https://britannica.com", stance: "Supports", authority: 90, relevance: 88, agreement: 84 },
    { id: "e4", title: "Cooking and boiling at altitude", host: "extension.colostate.edu", url: "https://extension.colostate.edu", stance: "Contradicts", authority: 88, relevance: 91, agreement: 93 },
  ],
  agents: [
    { name: "Evidence Analyst", summary: "The 100°C figure assumes standard atmospheric pressure.", confidence: 96 },
    { name: "Contradiction Resolver", summary: "The word “everywhere” conflicts with well-established altitude effects.", confidence: 95 },
    { name: "Source Auditor", summary: "Standards and scientific sources clearly identify the missing condition.", confidence: 93 },
  ],
}] satisfies DemoResult[];

function mapApiResponse(input: string, response: ApiResponse): DemoResult {
  const graphNodes = response.evidence_graphs.flatMap(graph => graph.nodes.filter(node => node.type !== "claim"));
  const titleByUrl = new Map(graphNodes.filter(node => node.url).map(node => [node.url as string, node.label]));
  const evidence = response.claims.flatMap(claim => claim.evidence_nodes).map((node, index): EvidenceItem => {
    const host = node.url.replace(/^https?:\/\//, "");
    return {
      id: `e${index + 1}`,
      title: titleByUrl.get(node.url) || host,
      host,
      url: node.url,
      stance: node.stance === "support" ? "Supports" : node.stance === "contradiction" ? "Contradicts" : "Neutral",
      authority: Math.round(node.authority * 100),
      relevance: Math.round(node.relevance * 100),
      agreement: Math.round(node.agreement * 100),
    };
  });
  const agents = response.claims.flatMap(claim => claim.agent_findings).map(finding => ({
    name: finding.agent,
    summary: finding.summary,
    confidence: finding.confidence,
  }));
  return {
    query: input,
    verdict: response.overall_verdict,
    confidence: response.overall_confidence,
    credibility: response.credibility_score,
    claims: response.claims.length,
    support: evidence.filter(item => item.stance === "Supports").length,
    contradict: evidence.filter(item => item.stance === "Contradicts").length,
    reasoning: response.claims.map(claim => claim.reasoning).filter(Boolean).join(" ") || "The available evidence was insufficient for a detailed explanation.",
    evidence,
    agents,
  };
}
const verdicts = {
  true: ["Supported", "✓", "positive"], false: ["False", "×", "negative"],
  misleading: ["Misleading", "!", "warning"], unverifiable: ["Unverifiable", "?", "neutral"],
} as const;
const NavigationContext = createContext<(page: Page) => void>(() => {});
const useNavigation = () => useContext(NavigationContext);

function AmbientInterface() {
  useEffect(() => {
    const move = (event: PointerEvent) => {
      document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return <div className="ambient-interface" aria-hidden="true"><div className="paper-layer"/><div className="noise-layer"/><div className="editorial-grid"/><div className="liquid-shape liquid-one"/><div className="liquid-shape liquid-two"/><div className="evidence-thread thread-one"/><div className="evidence-thread thread-two"/><div className="cursor-light"/><div className="margin-index">TG / EVIDENCE SYSTEM / 2026</div></div>;
}

function Logo() {
  const go = useNavigation();
  return <button className="logo" onClick={() => go("home")}><span className="logo-mark"><CircleDot size={17} /><i /><i /></span><span>TRUTH<span>GRAPH</span></span></button>;
}
function Badge({ verdict }: { verdict: Verdict }) {
  const [label, icon, tone] = verdicts[verdict];
  return <span className={`verdict ${tone}`}><b>{icon}</b>{label}</span>;
}
function Navbar({ page, setPage, theme, toggleTheme }: { page: Page; setPage: (p: Page) => void; theme: "light" | "dark"; toggleTheme: () => void }) {
  const [open, setOpen] = useState(false);
  const change = (p: Page) => { setPage(p); setOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }) };
  return <header className="navbar"><div className="nav-inner"><Logo /><nav className={open ? "nav-links open" : "nav-links"}>{([["verify","Verify"],["pipeline","How it works"],["history","History"],["about","About"]] as const).map(([id,label])=><button key={id} className={page===id?"active":""} onClick={()=>change(id)}>{label}</button>)}</nav><div className="nav-tools"><button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme==="light"?"dark":"light"} mode`} title={`Switch to ${theme==="light"?"dark":"light"} mode`}><span className="theme-track"><Sun size={14}/><Moon size={14}/><i/></span><b>{theme==="light"?"Light":"Dark"}</b></button></div><button className="menu" onClick={()=>setOpen(!open)} aria-label="Toggle navigation">{open?<X/>:<Menu/>}</button></div></header>;
}
function Footer() {
  return <footer><div><Logo /><p>Evidence you can inspect. Confidence you can understand.</p></div><div className="footer-meta"><span>Academic project • 2026–27</span><span>Human judgment remains essential.</span></div></footer>;
}
function NetworkVisual() {
  const sources = [
    { id: 0, label: "CLAIM", title: "Renewables passed 30% of global electricity", meta: "GraphTrust score • 87%" },
    { id: 1, label: "SOURCE 01", title: "Global Electricity Review", meta: "Supports • Authority 96" },
    { id: 2, label: "SOURCE 02", title: "International energy dataset", meta: "Supports • Authority 98" },
    { id: 3, label: "SOURCE 03", title: "Regional energy commentary", meta: "Contradicts • Authority 52" },
    { id: 4, label: "SOURCE 04", title: "Secondary contextual source", meta: "Neutral • Authority 71" },
  ];
  const [active, setActive] = useState(0);
  const activate = (id: number) => setActive(id);
  return <div className="network-card"><div className="scan-line" /><span className="network-label"><Activity size={14}/> LIVE EVIDENCE MAP</span><span className="network-stamp">CLICK A NODE / TRACE 0047</span><svg viewBox="0 0 600 420" role="img" aria-label="Interactive evidence network"><defs><linearGradient id="line"><stop stopColor="#ff5a1f"/><stop offset="1" stopColor="#d73b0b"/></linearGradient></defs><g className="graph-lines"><path d="M300 210 L130 85 M300 210 L490 95 M300 210 L510 310 M300 210 L110 320 M130 85 L490 95"/></g><g className={`node support interactive-node ${active===1?"selected":""}`} transform="translate(130 85)"><circle r="38"/><text y="4">SOURCE 01</text></g><g className={`node support interactive-node ${active===2?"selected":""}`} transform="translate(490 95)"><circle r="38"/><text y="4">SOURCE 02</text></g><g className={`node oppose interactive-node ${active===3?"selected":""}`} transform="translate(510 310)"><circle r="38"/><text y="4">SOURCE 03</text></g><g className={`node neutral-node interactive-node ${active===4?"selected":""}`} transform="translate(110 320)"><circle r="38"/><text y="4">SOURCE 04</text></g><g className={`node claim-node interactive-node ${active===0?"selected":""}`} transform="translate(300 210)"><circle r="65"/><text y="-4">CLAIM</text><text className="score" y="23">87%</text></g></svg><button className="node-hotspot hotspot-1" aria-label="Inspect source 1" onClick={()=>activate(1)}/><button className="node-hotspot hotspot-2" aria-label="Inspect source 2" onClick={()=>activate(2)}/><button className="node-hotspot hotspot-3" aria-label="Inspect source 3" onClick={()=>activate(3)}/><button className="node-hotspot hotspot-4" aria-label="Inspect source 4" onClick={()=>activate(4)}/><button className="node-hotspot hotspot-claim" aria-label="Inspect claim" onClick={()=>activate(0)}/><div className="network-inspector" aria-live="polite"><span>{sources[active].label}</span><div><b>{sources[active].title}</b><small>{sources[active].meta}</small></div><ArrowRight size={16}/></div><div className="network-legend"><span><i className="dot support-dot"/>Support</span><span><i className="dot oppose-dot"/>Contradiction</span><span><i className="dot neutral-dot"/>Neutral</span></div></div>;
}
function InteractiveFeatureCard({ Icon, title, body, index }: { Icon: typeof Globe2; title: string; body: string; index: number }) {
  const move = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    event.currentTarget.style.setProperty("--card-x", `${x * 100}%`);
    event.currentTarget.style.setProperty("--card-y", `${y * 100}%`);
    event.currentTarget.style.setProperty("--card-rx", `${(0.5 - y) * 7}deg`);
    event.currentTarget.style.setProperty("--card-ry", `${(x - 0.5) * 7}deg`);
  };
  const reset = (event: React.PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--card-rx", "0deg");
    event.currentTarget.style.setProperty("--card-ry", "0deg");
  };
  return <article className="feature-card interactive-feature" onPointerMove={move} onPointerLeave={reset}><span className="feature-number">0{index+1}</span><div className="icon-box"><Icon size={22}/></div><h3>{title}</h3><p>{body}</p><span className="card-signal" aria-hidden="true"/></article>;
}
function HomePage() {
  const go = useNavigation();
  const features = [
    [Globe2,"Multi-source verification","Retrieves live evidence across independent sources instead of relying on a single document."],
    [Network,"Dynamic evidence graph","Maps support, contradiction, citation and similarity as inspectable relationships."],
    [Activity,"GraphTrust scoring","Weights authority, relevance and agreement to produce a traceable confidence score."],
    [BrainCircuit,"Multi-agent analysis","Independent reasoning agents audit evidence and resolve conflicting findings."],
    [FileSearch,"Explainable verdicts","Connects each conclusion back to the specific evidence that produced it."],
  ] as const;
  return <><main><section className="hero section"><div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/> EXPLAINABLE AI VERIFICATION</div><h1>Don&apos;t just trust<br/>a verdict. <span>Trace it.</span></h1><p>TruthGraph turns complex claims into transparent evidence networks—scored, cross-checked and explained by specialised AI agents.</p><div className="hero-actions"><button className="primary" onClick={()=>go("verify")}>Verify a claim <ArrowRight size={18}/></button><button className="secondary" onClick={()=>go("pipeline")}>Explore the pipeline <GitBranch size={17}/></button></div><div className="trust-row"><span><Check/>Multi-source</span><span><Check/>Auditable scores</span><span><Check/>Explainable output</span></div><div className="hero-telemetry"><span><b>08</b> reasoning stages</span><span><b>03</b> specialist agents</span><span><b>100%</b> traceable logic</span></div></div><NetworkVisual/></section><section className="section feature-section"><div className="section-head"><div><span className="kicker">WHY TRUTHGRAPH</span><h2>Verification, with the reasoning left in.</h2></div><p>Ordinary classifiers give you a label. TruthGraph shows how sources connect, where they disagree, and why a verdict deserves confidence.</p></div><div className="feature-grid">{features.map(([Icon,title,body],i)=><InteractiveFeatureCard key={title} Icon={Icon} title={title} body={body} index={i}/>)}</div></section><section className="section objectives"><div className="section-head"><div><span className="kicker">THE CORE OBJECTIVE</span><h2>Build. Score. Resolve. Explain.</h2></div></div><div className="objective-grid">{[["01","Build","Create a typed evidence graph from claims, sources and their relationships."],["02","Score","Use consensus-weighted confidence propagation to evaluate the graph."],["03","Resolve","Let independent agents identify conflicts before a verdict is formed."],["04","Explain","Trace the final answer back to its strongest supporting evidence."]].map(([n,t,b])=><article key={t}><span>{n}</span><h3>{t}</h3><p>{b}</p></article>)}</div></section><section className="cta section"><div><span className="kicker">SEE THE REASONING</span><h2>Put a claim under the lens.</h2><p>Try the interactive demo and explore every score, source and connection behind the verdict.</p></div><button className="primary" onClick={()=>go("verify")}>Start verification <ArrowRight size={18}/></button></section></main><Footer/></>;
}
const steps = [
  "Reading your claim",
  "Finding reliable sources",
  "Checking supporting evidence",
  "Looking for contradictions",
  "Comparing source quality",
  "Calculating confidence",
  "Preparing your explanation",
];
function VerifyPage({ complete }: { complete: (input:string, mode:"text"|"url")=>Promise<void> }) {
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [step,setStep]=useState(0);
  const [error,setError]=useState("");
  const valid=input.trim().length>=20;

  useEffect(()=>{
    if(!loading)return;
    const timer=setInterval(()=>setStep(s=>Math.min(s+1,6)),900);
    return()=>clearInterval(timer);
  },[loading]);

  const analyse=async()=>{
    setStep(0);
    setError("");
    setLoading(true);
    try{
      await complete(input.trim(),"text");
    }catch(err){
      setError(err instanceof Error?err.message:"Verification failed. Please try again.");
      setLoading(false);
    }
  };

  if(loading)return <main className="subpage"><section className="processing"><div className="orb"><BrainCircuit size={38}/><span/></div><span className="kicker">CHECKING YOUR CLAIM</span>
<h1>We're comparing the evidence</h1>
<p>
  TruthGraph is finding relevant sources, checking whether they support or
  contradict your claim, and preparing a clear explanation.
</p><div className="progress-list">{steps.map((s,i)=><div key={s} className={i<step?"done":i===step?"current":""}><span>{i<step?<Check size={14}/>:i+1}</span><b>{s}</b>{i===step&&<em>In progress</em>}</div>)}</div></section></main>;

  const randomClaim=()=>{
    const choices=demoResults.filter(x=>x.query!==input);
    setInput(choices[Math.floor(Math.random()*choices.length)].query);
  };

  return <main className="subpage verify-page">
    <div className="page-intro">
      <span className="kicker">CHECK A CLAIM</span>
      <h1>What would you like to verify?</h1>
      <p>
        TruthGraph fact-checks a claim by gathering evidence from multiple sources,
        comparing where those sources agree or disagree, and showing you how the
        final verdict was reached.
      </p>
    </div>

    <section className="verify-layout">
      <div className="input-panel">
        <div className="field-head">
          <label htmlFor="claim">Enter a statement you want to check</label>
          <span>{input.length} / 5,000</span>
        </div>

        <textarea
          id="claim"
          maxLength={5000}
          value={input}
          onChange={e=>setInput(e.target.value)}
          placeholder="Example: Humans use only 10% of their brains."
        />

        <div className="input-actions">
          <button className="text-button" onClick={randomClaim}>
            <Zap size={15}/>Use random claim
          </button>
          {input&&<button className="text-button" onClick={()=>setInput("")}>
            <Trash2 size={15}/>Clear
          </button>}
        </div>

        <button className="analyse" disabled={!valid} onClick={analyse}>
          <Search size={19}/>Check this claim <ArrowRight size={18}/>
        </button>

        {error
          ?<p className="demo-note api-error"><Info size={14}/>{error}</p>
          :<p className="demo-note"><Info size={14}/>TruthGraph compares multiple sources so you can see the evidence behind its verdict.</p>
        }
      </div>

      <aside className="what-happens">
        <span className="kicker">HOW IT WORKS</span>
        <h3>From your claim to an explained verdict.</h3>
        <div>{steps.map((s,i)=><p key={s}><span>{i+1}</span>{s}</p>)}</div>
        <div className="time-note">
          <Clock3/>
          <span>
            <b>Live evidence takes time</b>
            TruthGraph may run more than one search when a claim needs additional evidence.
          </span>
        </div>
      </aside>
    </section>
  </main>;
}
function scoreLabel(value:number){
  if(value>=90)return "Very high";
  if(value>=75)return "High";
  if(value>=50)return "Moderate";
  if(value>=25)return "Low";
  return "Very low";
}

function evidenceStrength(evidence:EvidenceItem){
  return Math.round(
    (evidence.authority*evidence.relevance*evidence.agreement)/10000
  );
}

function claimSupportExplanation(value:number){
  if(value>=80)return "The evidence strongly supports the original claim.";
  if(value>=60)return "The evidence leans toward supporting the original claim.";
  if(value>40)return "The evidence is mixed or not decisive about the original claim.";
  if(value>20)return "The evidence leans toward contradicting the original claim.";
  return "The evidence strongly contradicts the original claim.";
}

function sourceName(host:string){
  const clean=host
    .replace(/^https?:\/\//,"")
    .replace(/^www\./,"")
    .split("/")[0];

  const known:Record<string,string>={
    "nasa.gov":"NASA",
    "nih.gov":"National Institutes of Health",
    "noaa.gov":"NOAA",
    "weather.gov":"National Weather Service",
    "nist.gov":"NIST",
    "usgs.gov":"U.S. Geological Survey",
    "iea.org":"International Energy Agency",
    "esa.int":"European Space Agency",
    "britannica.com":"Britannica",
    "mayoclinic.org":"Mayo Clinic",
    "ourworldindata.org":"Our World in Data",
    "snopes.com":"Snopes",
    "reddit.com":"Reddit",
    "facebook.com":"Facebook",
  };

  return known[clean] || clean;
}

function cleanReasoning(reasoning:string){
  return reasoning
    .replace(/\s*GraphTrust CWCP score R=[-\d.]+;?\s*confidence=\d+\/100\s*using authority x relevance x agreement over cited evidence nodes\.?/gi,"")
    .replace(/\s*GraphTrust score R=[-\d.]+.*$/gi,"")
    .replace(/\s*GraphTrust evidence balance R=[-\d.]+;?\s*verdict confidence=\d+\/100\.?/gi,"")
    .trim();
}

function friendlyAgent(name:string,index:number){
  const lower=name.toLowerCase();

  if(lower.includes("evidence"))return ["Evidence review","Reviewed the evidence"];
  if(lower.includes("contradiction"))return ["Contradiction check","Looked for conflicting evidence"];
  if(lower.includes("relationship"))return ["Source comparison","Compared the sources"];
  if(lower.includes("confidence"))return ["Confidence calculation","Calculated confidence"];
  if(lower.includes("summar"))return ["Final explanation","Created the final explanation"];

  return [`Analysis step ${index+1}`,name];
}
function Gauge({value}:{value:number}){return <div className="gauge" style={{"--score":`${value*3.6}deg`} as React.CSSProperties}><div><strong>{value}</strong><span>/ 100</span></div></div>}
function EvidenceGraph({result}:{result:DemoResult}){
  const [selected,setSelected]=useState("claim");
  const selectedIndex=result.evidence.findIndex(item=>item.id===selected);
  const selectedEvidence=result.evidence.find(item=>item.id===selected);
  const neutralCount=Math.max(0,result.evidence.length-result.support-result.contradict);
  const center={x:350,y:215};
  const nodeRadius=result.evidence.length>12?21:result.evidence.length>8?25:34;

  const positions=result.evidence.map((item,index)=>{
    const angle=-Math.PI/2+(index/result.evidence.length)*Math.PI*2;
    return {
      ...item,
      x:center.x+Math.cos(angle)*270,
      y:center.y+Math.sin(angle)*165
    };
  });

  return <div className="result-graph">
    <div className="graph-canvas">
      <svg
        viewBox="0 0 700 430"
        role="img"
        aria-label={`Evidence graph showing the claim connected to ${result.evidence.length} sources`}
      >
        <g className="result-lines">
          {positions.map(item=>
            <line
              key={item.id}
              className={
                item.stance==="Supports"
                  ?"support-edge"
                  :item.stance==="Contradicts"
                    ?"contradict-edge"
                    :"neutral-edge"
              }
              x1={center.x}
              y1={center.y}
              x2={item.x}
              y2={item.y}
            />
          )}
        </g>

        {positions.map((item,index)=>{
          const supports=item.stance==="Supports";
          const neutral=item.stance==="Neutral";

          const selectWithKeyboard=(event:React.KeyboardEvent<SVGGElement>)=>{
            if(event.key==="Enter"||event.key===" "){
              event.preventDefault();
              setSelected(item.id);
            }
          };

          return <g
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={`Source ${index+1}: ${item.title}. ${item.stance} the claim.`}
            className={`click-node ${selected===item.id?"selected":""} ${supports?"green":neutral?"gray":"red"}`}
            transform={`translate(${item.x} ${item.y})`}
            onClick={()=>setSelected(item.id)}
            onKeyDown={selectWithKeyboard}
          >
            <circle r={nodeRadius}/>
            <text className="source-number" y="-4">S{index+1}</text>
            <text className="source-mark" y="15">{supports?"✓":neutral?"•":"×"}</text>
          </g>
        })}

        <g
          role="button"
          tabIndex={0}
          aria-label="Primary claim"
          className={`click-node central ${selected==="claim"?"selected":""}`}
          transform={`translate(${center.x} ${center.y})`}
          onClick={()=>setSelected("claim")}
          onKeyDown={event=>{
            if(event.key==="Enter"||event.key===" "){
              event.preventDefault();
              setSelected("claim");
            }
          }}
        >
          <circle r="59"/>
          <text y="-3">CLAIM</text>
          <text y="22" className="mini">{result.credibility}/100</text>
        </g>
      </svg>

      <div className="network-legend">
        <span><i className="dot support-dot"/>Supports</span>
        <span><i className="dot oppose-dot"/>Contradicts</span>
        <span><i className="dot neutral-dot"/>Neutral</span>
      </div>
    </div>

    <aside className="node-panel">
      <div className="node-picker">
        <span>CHOOSE A NODE</span>
        <div>
          <button
            className={selected==="claim"?"active":""}
            onClick={()=>setSelected("claim")}
          >
            Claim
          </button>
          {result.evidence.map((item,index)=>
            <button
              key={item.id}
              className={selected===item.id?"active":""}
              onClick={()=>setSelected(item.id)}
              title={sourceName(item.host)}
            >
              S{index+1}
            </button>
          )}
        </div>
      </div>

      {selected==="claim"
        ?<>
          <span className="kicker">PRIMARY CLAIM</span>
          <h3>“{result.query}”</h3>
          <p className="node-source">
            This is the exact statement TruthGraph is checking.
          </p>

          <dl>
            <div>
              <dt>Current verdict</dt>
              <dd>{result.verdict==="true"?"Supported":result.verdict==="false"?"False":result.verdict==="misleading"?"Misleading":"Unverifiable"}</dd>
            </div>
            <div>
              <dt>Verdict confidence</dt>
              <dd>{result.confidence}%</dd>
            </div>
            <div>
              <dt>Claim support score</dt>
              <dd>{result.credibility}/100</dd>
            </div>
            <div>
              <dt>Evidence found</dt>
              <dd>{result.evidence.length} sources</dd>
            </div>
          </dl>

          <p className="node-explain">
            {result.support} support · {result.contradict} contradict
            {neutralCount>0?` · ${neutralCount} neutral`:""}
          </p>
        </>
        :selectedEvidence
          ?<>
            <span className="kicker">SOURCE {selectedIndex+1}</span>
            <h3>{selectedEvidence.title}</h3>
            <p className="node-source">{sourceName(selectedEvidence.host)}</p>
            <p className="node-explain">
              {selectedEvidence.stance==="Supports"
                ?"This source gives evidence in favour of the claim."
                :selectedEvidence.stance==="Contradicts"
                  ?"This source gives evidence against the claim."
                  :"This source is related to the claim but does not clearly support or contradict it."}
            </p>

            <dl>
              <div>
                <dt>Role in verdict</dt>
                <dd>{selectedEvidence.stance}</dd>
              </div>
              <div>
                <dt>Source quality</dt>
                <dd>{selectedEvidence.authority}/100</dd>
              </div>
              <div>
                <dt>Match to claim</dt>
                <dd>{selectedEvidence.relevance}/100</dd>
              </div>
              <div>
                <dt>Contribution</dt>
                <dd>{evidenceStrength(selectedEvidence)}/100</dd>
              </div>
            </dl>

            <p className="node-explain">
              Source quality estimates how dependable the source is. Match to claim
              shows how directly the page addresses your statement. Contribution is
              the final weight this source receives in TruthGraph&apos;s scoring.
            </p>

            <a
              className="node-link"
              href={selectedEvidence.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View original source <ExternalLink size={13}/>
            </a>
          </>
          :<p className="node-explain">Select a source to inspect it.</p>
      }
    </aside>
  </div>;
}
function ResultsPage({result}:{result:DemoResult}){
  const go=useNavigation();
  const [tab,setTab]=useState("overview");

  const summary={
    true:[
      "Strongly supported",
      "The available evidence strongly supports this claim."
    ],
    false:[
      "Strongly contradicted",
      "The available evidence strongly contradicts this claim."
    ],
    misleading:[
      "Missing important context",
      "Some parts may be correct, but important context changes the meaning."
    ],
    unverifiable:[
      "Insufficient evidence",
      "TruthGraph did not find enough evidence to reach a responsible conclusion."
    ]
  }[result.verdict];

  const neutralCount=Math.max(
    0,
    result.evidence.length-result.support-result.contradict
  );

  const friendlyReasoning=cleanReasoning(result.reasoning);

  return <main className="subpage results-page">

    <div className="result-top">
      <div>
        <button className="back-link" onClick={()=>go("verify")}>
          ← New verification
        </button>
        <span className="kicker">ANALYSIS COMPLETE</span>
        <h1>Verdict & evidence</h1>
        <p className="query">“{result.query}”</p>
      </div>
      <Badge verdict={result.verdict}/>
    </div>

    <section className="summary-grid">
      <article className="score-card">
        <Gauge value={result.credibility}/>
        <div>
          <span>CLAIM SUPPORT SCORE</span>
          <h2>{summary[0]}</h2>
          <p>
            {claimSupportExplanation(result.credibility)}
          </p>
        </div>
      </article>

      <article className="metrics-card">
        <div>
          <strong>{result.confidence}%</strong>
          <span>Verdict confidence</span>
        </div>
        <div>
          <strong>{result.claims}</strong>
          <span>Claims checked</span>
        </div>
        <div>
          <strong>{result.support}</strong>
          <span>Sources supporting the claim</span>
        </div>
        <div>
          <strong>{result.contradict}</strong>
          <span>Sources contradicting the claim</span>
        </div>
      </article>
    </section>

    <section className="reasoning-card">
      <div className="icon-box">
        <BrainCircuit/>
      </div>

      <div>
        <span className="kicker">WHY THIS VERDICT</span>
        <p>{friendlyReasoning}</p>
        <p>
          <b>Evidence checked:</b>{" "}
          TruthGraph analysed {result.evidence.length} sources.
          {" "}{result.support} support the claim,
          {" "}{result.contradict} contradict it
          {neutralCount>0?`, and ${neutralCount} are neutral`:""}.
        </p>
      </div>
    </section>

    <section className="claim-detail">
      <div className="claim-title">
        <div>
          <span className="claim-num">CLAIM 01</span>
          <h2>{result.query}</h2>
        </div>
        <Badge verdict={result.verdict}/>
      </div>

      <div className="result-tabs">
        {[
          ["overview","Overview"],
          ["evidence","Evidence"],
          ["graph","Evidence graph"],
          ["agents","How TruthGraph checked this"],
          ["scores","Score breakdown"]
        ].map(([id,label])=>
          <button
            key={id}
            className={tab===id?"active":""}
            onClick={()=>setTab(id)}
          >
            {label}
          </button>
        )}
      </div>

      {tab==="overview"&&
        <div className="tab-content overview-content">
          <div>
            <span>How sure is TruthGraph about the verdict?</span>
            <strong>{result.confidence}%</strong>
            <i><b style={{width:`${result.confidence}%`}}/></i>
            <p>
              {scoreLabel(result.confidence)} confidence means TruthGraph found a
              clear evidence pattern for the verdict above. A high confidence can
              apply to either a supported or a false claim.
            </p>
          </div>

          <div>
            <span>How much does the evidence support the claim?</span>
            <strong>{result.credibility}/100</strong>
            <i><b style={{width:`${result.credibility}%`}}/></i>
            <p>
              0 means the evidence strongly contradicts the original claim.
              100 means it strongly supports it. Around 50 means the evidence is
              mixed, incomplete or unclear.
            </p>
          </div>

          <div>
            <span>Sources analysed</span>
            <strong>{result.evidence.length}</strong>
            <p>
              {result.support} supporting · {result.contradict} contradicting
              {neutralCount>0?` · ${neutralCount} neutral`:""}
            </p>
            <p>
              TruthGraph can use a different number of sources for different claims,
              depending on how much useful evidence it finds.
            </p>
          </div>
        </div>
      }

      {tab==="evidence"&&
        <div className="tab-content evidence-list">
          {result.evidence.map((e,index)=>
            <article key={e.id}>
              <div className={`stance ${
                e.stance==="Supports"
                  ?"support-bg"
                  :e.stance==="Contradicts"
                    ?"oppose-bg"
                    :""
              }`}>
                {e.stance==="Supports"
                  ?<Check/>
                  :e.stance==="Contradicts"
                    ?<X/>
                    :<CircleDot/>
                }
              </div>

              <div>
                <span>SOURCE {index+1} · {e.stance.toUpperCase()}</span>
                <h3>{e.title}</h3>
                <a href={e.url} target="_blank" rel="noopener noreferrer">
                  {sourceName(e.host)}
                  <ExternalLink size={13}/>
                </a>
              </div>

              <div className="evidence-score">
                <strong>{e.authority}%</strong>
                <span>source quality</span>
              </div>
            </article>
          )}
        </div>
      }

      {tab==="graph"&&
        <div className="tab-content">
          <div className="formula">
            <Info/>
            <span>
              <b>How to read this graph</b>
              Your claim is in the centre and each S circle is one source.
              Green sources support the claim, red sources contradict it and grey
              sources are neutral. Click a source circle, or use the source buttons
              beside the graph, to see exactly how that source affected the result.
            </span>
          </div>

          <EvidenceGraph result={result}/>
        </div>
      }

      {tab==="agents"&&
        <div className="tab-content agent-grid">
          {result.agents.map((agent,index)=>{
            const [shortName,action]=friendlyAgent(agent.name,index);

            return <article key={`${agent.name}-${index}`}>
              <div className="agent-icon">
                {index===0
                  ?<BrainCircuit/>
                  :index===1
                    ?<ShieldCheck/>
                    :<Search/>
                }
              </div>

              <span>STEP {String(index+1).padStart(2,"0")}</span>
              <h3>{shortName}</h3>

              <p>
                <b>{action}.</b>{" "}
                {cleanReasoning(agent.summary)}
              </p>

              <div>
                <b>{agent.confidence}%</b>{" "}
                confidence in this step&apos;s conclusion
              </div>
            </article>
          })}
        </div>
      }

      {tab==="scores"&&
        <div className="tab-content score-table">
          <div className="formula">
            <Info/>
            <span>
              <b>How each source affects the verdict</b>
              These values show how much weight TruthGraph gives each source while
              checking this claim. They do not mean that a source is a certain
              percentage &quot;true&quot;.
            </span>
          </div>

          <div className="score-guide">
            <div>
              <b>Source quality</b>
              <span>How dependable the source is for fact-checking.</span>
            </div>
            <div>
              <b>Match to claim</b>
              <span>How directly the source discusses this exact claim.</span>
            </div>
            <div>
              <b>Verdict certainty</b>
              <span>How confidently TruthGraph identified the source&apos;s role.</span>
            </div>
            <div>
              <b>Contribution</b>
              <span>How much weight the source receives in the final calculation.</span>
            </div>
          </div>

          <div className="score-header" aria-hidden="true">
            <span>Source</span>
            <span>Quality</span>
            <span>Match</span>
            <span>Certainty</span>
            <span>Contribution</span>
          </div>

          {result.evidence.map((e,index)=>
            <div className="score-row" key={e.id}>
              <span className="score-source">
                <i className={
                  e.stance==="Supports"
                    ?"green-dot"
                    :e.stance==="Contradicts"
                      ?"red-dot"
                      :"neutral-dot"
                }/>
                <span>
                  <b>{`S${index+1} · ${sourceName(e.host)}`}</b>
                  <small>{e.stance}</small>
                </span>
              </span>

              <b>{e.authority}%</b>
              <b>{e.relevance}%</b>
              <b>{e.agreement}%</b>
              <strong>{evidenceStrength(e)}%</strong>
            </div>
          )}

          <div className="formula">
            <Info/>
            <span>
              <b>Contribution = quality × match × certainty</b>
              A high contribution means this source had more influence on the
              evidence calculation. A low contribution does not automatically mean
              the source is false; it may simply be less relevant, less reliable or
              neutral for this particular claim.
            </span>
          </div>
        </div>
      }
    </section>
  </main>;
}
function PipelinePage(){
 const stages=[[FileSearch,"01","Input processing","Read the submitted text and prepare the claim for fact-checking."],[Search,"02","Claim extraction","Identify the specific factual statement or statements that can be checked."],[Globe2,"03","Live evidence retrieval","Search multiple sources and broaden the search when more evidence is needed."],[BrainCircuit,"04","Initial verdict","Analyse evidence stance, meaning and source quality."],[Network,"05","Evidence graph","Connect claims and evidence through typed, inspectable relationships."],[Activity,"06","GraphTrust / CWCP","Weight evidence by authority, relevance and agreement."],[ShieldCheck,"07","Multi-agent review","Independent agents audit sources and resolve contradictions."],[BookOpen,"08","Explainable output","Return a verdict traceable back to evidence."]] as const;
 return <main className="subpage pipeline-page"><div className="page-intro"><span className="kicker">THE METHODOLOGY</span><h1>From raw claim to explainable verdict.</h1><p>TruthGraph builds an auditable reasoning path in eight connected stages.</p></div><div className="pipeline-grid">{stages.map(([Icon,n,t,b])=><article key={n}><span className="stage-num">{n}</span><div className="icon-box"><Icon/></div><h2>{t}</h2><p>{b}</p></article>)}</div><section className="formula-band"><div><span className="kicker">CORE NOVELTY</span><h2>Consensus-Weighted Confidence Propagation</h2><p>CWCP preserves the structure of agreement instead of flattening every source into the same vote.</p></div><code>weight<sub>n</sub> = authority × relevance × agreement</code></section></main>;
}
function AboutPage(){
 return <main className="subpage about-page"><div className="page-intro"><span className="kicker">ABOUT THE PROJECT</span><h1>Making AI answers easier to question.</h1><p>TruthGraph is a final-year academic project exploring explainable, graph-based fact verification.</p></div><section className="about-grid"><article className="large"><span className="kicker">THE PROBLEM</span><h2>Flat retrieval hides the reasoning.</h2><p>AI systems can hallucinate, process evidence in isolation and produce confident answers without explaining where that confidence came from.</p><div className="problem-pills"><span>LLM hallucinations</span><span>Isolated evidence</span><span>Missing explainability</span></div></article><article><span className="kicker">THE THESIS</span><h3>Structure creates transparency.</h3><p>A typed evidence graph plus an explicit confidence formula should create outputs that are both more accurate and more explainable.</p></article><article><span className="kicker">THE GOAL</span><h3>Human-readable reasoning.</h3><p>Give users a clear path from every verdict back to the evidence.</p></article></section><section className="comparison"><span className="kicker">WHY IT&apos;S DIFFERENT</span><h2>Beyond attention scores and majority votes.</h2><div className="compare-table"><div><b>Approach</b><b>Evidence relations</b><b>Confidence</b><b>Explainability</b></div><div><strong>GEAR (2019)</strong><span>Implicit attention</span><span>Softmax score</span><span>Low</span></div><div><strong>KGAT (2020)</strong><span>Implicit kernels</span><span>Softmax score</span><span>Low</span></div><div><strong>Multi-agent debate</strong><span>No graph</span><span>Majority vote</span><span>Moderate</span></div><div className="highlight"><strong>TruthGraph</strong><span>Typed graph</span><span>Auditable CWCP</span><span>High</span></div></div></section><section className="limitation"><Info/><div><h3>Important limitation</h3><p>Automated verdicts depend on retrieved evidence and model reasoning. TruthGraph should support—not replace—critical human judgment.</p></div></section></main>;
}
function HistoryPage({items,clear,remove}:{items:HistoryItem[];clear:()=>void;remove:(id:string)=>void}){
 const go = useNavigation();
 return <main className="subpage history-page"><div className="page-intro row"><div><span className="kicker">LOCAL HISTORY</span><h1>Your recent verifications.</h1><p>Saved only in this browser. No account or server storage is used.</p></div>{items.length>0&&<button className="secondary danger" onClick={clear}><Trash2/>Clear all</button>}</div>{items.length===0?<section className="empty-state"><History/><h2>No verifications yet</h2><p>Your successful analyses will appear here for quick access.</p><button className="primary" onClick={()=>go("verify")}>Verify your first claim <ArrowRight/></button></section>:<section className="history-list">{items.map(x=><article key={x.id} onClick={()=>go("results")}><div className="history-icon"><FileSearch/></div><div><span>{new Date(x.date).toLocaleString()}</span><h3>{x.input}</h3></div><Badge verdict={x.verdict}/><strong>{x.score}<small>/100</small></strong><button onClick={e=>{e.stopPropagation();remove(x.id)}} aria-label="Delete"><Trash2/></button></article>)}</section>}</main>;
}
export default function Home(){
 const [page,setPage]=useState<Page>("home");
 const [theme,setTheme]=useState<"light"|"dark">("light");
 const [result,setResult]=useState<DemoResult>(demoResults[0]);
 const [history,setHistory]=useState<HistoryItem[]>(()=>{if(typeof window==="undefined")return [];try{return JSON.parse(localStorage.getItem("truthgraph-history")||"[]")}catch{return []}});
 const complete=async(input:string,mode:"text"|"url")=>{
   let response:Response;
   try{
     response=await fetch(`${API_BASE_URL}/verify`,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({input,type:mode})});
   }catch{
     throw new Error("The TruthGraph backend is offline. Start FastAPI and Neo4j, then retry.");
   }
   const payload=await response.json().catch(()=>({detail:"The backend returned an unreadable response."})) as ApiResponse|{detail?:string};
   if(!response.ok)throw new Error(("detail" in payload&&payload.detail)||`Verification failed with status ${response.status}.`);
   const selected=mapApiResponse(input,payload as ApiResponse);
   setResult(selected);
   const next=[{id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,input,verdict:selected.verdict,score:selected.credibility,date:new Date().toISOString()},...history].slice(0,10);
   setHistory(next);localStorage.setItem("truthgraph-history",JSON.stringify(next));setPage("results");window.scrollTo(0,0);
 };
 const clear=()=>{if(confirm("Clear all local verification history?")){setHistory([]);localStorage.removeItem("truthgraph-history")}};
 const remove=(id:string)=>{const next=history.filter(x=>x.id!==id);setHistory(next);localStorage.setItem("truthgraph-history",JSON.stringify(next))};
 const navigate=(p:Page)=>{setPage(p);window.scrollTo({top:0,behavior:"smooth"})};
 useEffect(()=>{document.documentElement.dataset.theme=theme},[theme]);
 const toggleTheme=()=>setTheme(current=>{const next=current==="light"?"dark":"light";document.documentElement.dataset.theme=next;localStorage.setItem("truthgraph-theme",next);return next});
 return <NavigationContext.Provider value={navigate}><AmbientInterface/><Navbar page={page} setPage={setPage} theme={theme} toggleTheme={toggleTheme}/><div className="page-shell" key={page}>{page==="verify"?<VerifyPage complete={complete}/>:page==="results"?<ResultsPage result={result}/>:page==="pipeline"?<PipelinePage/>:page==="history"?<HistoryPage items={history} clear={clear} remove={remove}/>:page==="about"?<AboutPage/>:<HomePage/>}{page!=="home"&&<Footer/>}</div></NavigationContext.Provider>;
}
