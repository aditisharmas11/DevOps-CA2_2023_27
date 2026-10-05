const pptxgen = require("pptxgenjs");
const fs = require("fs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.title = "DevOps CA2 - Quote Service";

const NAVY = "0B1F3A", TEAL = "0E9AA7", INK = "1F2937", MUTE = "64748B", SOFT = "EAF6F7", WHITE = "FFFFFF";
const F = "Calibri", H = "Cambria";

function title(slide, text) {
  slide.addText(text, { x: 0.6, y: 0.35, w: 8.8, h: 0.8, fontFace: H, fontSize: 32, bold: true, color: NAVY, isTextBox: true, margin: 0 });
}

// 1. Title
let s = pres.addSlide();
s.background = { color: NAVY };
s.addText("DevOps CA2", { x: 0.7, y: 1.3, w: 8.6, h: 0.6, fontFace: F, fontSize: 20, color: "7DD3DC", isTextBox: true, margin: 0 });
s.addText("CI/CD, IaC, Kubernetes and Monitoring for a Quote Service", { x: 0.7, y: 1.9, w: 8.6, h: 1.5, fontFace: H, fontSize: 36, bold: true, color: WHITE, isTextBox: true, margin: 0 });
s.addText("Aryan | TYCSA | Symbiosis Institute of Technology, Pune", { x: 0.7, y: 4.4, w: 8.6, h: 0.4, fontFace: F, fontSize: 14, color: "CBD5E1", isTextBox: true, margin: 0 });

// 2. Architecture
s = pres.addSlide();
s.background = { color: WHITE };
title(s, "Architecture");
const boxes = [
  ["GitHub", "Source + Actions"], ["GHCR", "Container images"], ["Kubernetes", "3 replicas, rolling updates"], ["Prometheus", "Scrapes /metrics"], ["Grafana", "Uptime, latency, errors"],
];
boxes.forEach((b, i) => {
  const x = 0.6 + i * 1.78;
  s.addShape(pres.ShapeType.roundRect, { x, y: 1.7, w: 1.6, h: 1.4, fill: { color: SOFT }, line: { color: TEAL, width: 1.25 }, rectRadius: 0.1 });
  s.addText([{ text: b[0], options: { bold: true, fontSize: 16, color: NAVY, breakLine: true } }, { text: b[1], options: { fontSize: 12, color: INK } }],
    { x, y: 1.7, w: 1.6, h: 1.4, align: "center", valign: "middle", fontFace: F, isTextBox: true });
});
s.addText("Ansible prepares the host runtime (Docker, app user, directories). The Flask service exposes /health, /quote and /metrics.",
  { x: 0.6, y: 3.6, w: 8.8, h: 0.9, fontFace: F, fontSize: 16, color: INK, isTextBox: true, margin: 0 });

// 3. Pipeline flow
s = pres.addSlide();
s.background = { color: WHITE };
title(s, "Pipeline flow");
s.addImage({ path: "pipeline-diagram.png", x: 0.6, y: 1.3, w: 8.8, h: 3.41 });
s.addText("Push to main: test, validate, build, push, deploy. A failed rollout triggers kubectl rollout undo.",
  { x: 0.6, y: 4.85, w: 8.8, h: 0.5, fontFace: F, fontSize: 14, color: MUTE, isTextBox: true, margin: 0 });

// 4. Challenges
s = pres.addSlide();
s.background = { color: WHITE };
title(s, "Challenges");
const ch = [
  ["Zero-downtime rollouts", "Readiness probes on /health keep traffic away from pods that are not ready yet."],
  ["Meaningful latency metric", "A histogram lets Grafana compute p95, not just an average."],
  ["Idempotent configuration", "Ansible modules (apt, user, file) instead of shell, so reruns change nothing."],
];
ch.forEach((c, i) => {
  const y = 1.4 + i * 1.3;
  s.addShape(pres.ShapeType.ellipse, { x: 0.6, y: y + 0.1, w: 0.7, h: 0.7, fill: { color: TEAL }, line: { color: TEAL } });
  s.addText(String(i + 1), { x: 0.6, y: y + 0.1, w: 0.7, h: 0.7, align: "center", valign: "middle", fontFace: F, fontSize: 20, bold: true, color: WHITE, isTextBox: true, margin: 0 });
  s.addText([{ text: c[0], options: { bold: true, fontSize: 20, color: NAVY, breakLine: true } }, { text: c[1], options: { fontSize: 14, color: INK } }],
    { x: 1.6, y, w: 7.8, h: 0.9, fontFace: F, valign: "top", isTextBox: true, margin: 0 });
});

// 5. Lessons
s = pres.addSlide();
s.background = { color: NAVY };
s.addText("Lessons learned", { x: 0.6, y: 0.35, w: 8.8, h: 0.8, fontFace: H, fontSize: 32, bold: true, color: WHITE, isTextBox: true, margin: 0 });
s.addText([
  { text: "Gate every stage so broken code never reaches the cluster", options: { bullet: true, breakLine: true } },
  { text: "Health probes and resource limits make rolling updates safe", options: { bullet: true, breakLine: true } },
  { text: "Instrument the app first; dashboards follow from good metrics", options: { bullet: true, breakLine: true } },
  { text: "Keep everything in Git: pipeline, playbook, manifests, dashboard", options: { bullet: true } },
], { x: 0.6, y: 1.5, w: 8.8, h: 3, fontFace: F, fontSize: 20, color: WHITE, paraSpaceAfter: 14, isTextBox: true, margin: 0 });

pres.writeFile({ fileName: "DevOps_CA2_Slides.pptx" }).then(() => console.log("deck written"));
