from app.config import Settings, get_settings
from app.evidence_graph import EvidenceGraphBuilder
from app.exceptions import InvalidModelOutputError
from app.graphtrust_scorer import GraphTrustScorer
from app.llm_client import LlamaClient
from app.multi_agent import MultiAgentReasoner
from app.neo4j_repository import Neo4jGraphRepository
from app.models import ClaimEvidence, ClaimVerdict, VerificationResponse, VerdictLabel


SYSTEM_PROMPT = """You are a careful fact-checking analyst.
Use only the supplied evidence. Return strict JSON only.

Judge the EXACT user claim, not whether the evidence is useful or whether your
own explanation is sensible.

Classify every cited source relative to the exact claim:
- supporting_sources: the source indicates the claim itself is true.
- contradicting_sources: the source indicates the claim itself is false.
- A relevant source that does neither belongs in neither list.

Important example:
Claim: "We can share toothbrushes with anyone."
Evidence: "Sharing toothbrushes can spread bacteria and viruses and should be avoided."
That evidence CONTRADICTS the claim. It does not support it.

Verdict rules:
- "true": the evidence substantially supports the exact claim.
- "false": the evidence substantially contradicts the exact claim.
- "misleading": part of the claim is correct but important context or wording changes its meaning.
- "unverifiable": the supplied evidence is insufficient to responsibly decide.

Confidence means how certain you are in the verdict, regardless of whether the
verdict is true or false. A strongly false claim can therefore have 95 confidence.

Do not cite a source unless its URL appears exactly in the evidence list.
Never put the same URL in both supporting_sources and contradicting_sources.
For true, false, or misleading verdicts, reasoning must reference the supplied evidence.

The JSON shape must be:
{
  "claim": "string",
  "verdict": "true" | "false" | "misleading" | "unverifiable",
  "confidence": 0,
  "reasoning": "string",
  "supporting_sources": ["https://..."],
  "contradicting_sources": ["https://..."]
}"""


class VerdictEngine:
    def __init__(
        self,
        llm_client: LlamaClient | None = None,
        settings: Settings | None = None,
        graph_scorer: GraphTrustScorer | None = None,
        graph_builder: EvidenceGraphBuilder | None = None,
        multi_agent_reasoner: MultiAgentReasoner | None = None,
        graph_repository: Neo4jGraphRepository | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.llm_client = llm_client or LlamaClient(self.settings)
        self.graph_scorer = graph_scorer or GraphTrustScorer(self.settings)
        self.graph_builder = graph_builder or EvidenceGraphBuilder()
        self.multi_agent_reasoner = multi_agent_reasoner or MultiAgentReasoner()
        self.graph_repository = graph_repository or Neo4jGraphRepository(self.settings)

    async def verify_claims(self, claim_evidence: list[ClaimEvidence]) -> VerificationResponse:
        verdicts = []
        evidence_graphs = []

        for item in claim_evidence:
            llm_verdict = await self.verify_claim(item)
            graph_verdict, node_scores = self.graph_scorer.score_claim(item, llm_verdict)
            evidence_graph = self.graph_builder.build(item, graph_verdict, node_scores)
            agent_findings = self.multi_agent_reasoner.analyze(
                item,
                graph_verdict,
                evidence_graph,
                node_scores,
            )
            graph_verdict = graph_verdict.model_copy(
                update={
                    "evidence_nodes": node_scores,
                    "agent_findings": agent_findings,
                }
            )

            self.graph_repository.save_graph(evidence_graph)
            verdicts.append(graph_verdict)
            evidence_graphs.append(evidence_graph)

        credibility_score = self._credibility_score(verdicts)

        return VerificationResponse(
            overall_verdict=self._overall_verdict(credibility_score, verdicts),
            overall_confidence=self._overall_confidence(verdicts),
            credibility_score=credibility_score,
            claims=verdicts,
            evidence_graphs=evidence_graphs,
        )

    async def verify_claim(self, claim_evidence: ClaimEvidence) -> ClaimVerdict:
        evidence_lines = "\n".join(
            f"- URL: {source.url}\n"
            f"  Title: {source.title or 'Untitled'}\n"
            f"  Evidence: {source.content}"
            for source in claim_evidence.evidence
        )

        prompt = f"""Claim:
{claim_evidence.claim}

Evidence:
{evidence_lines or "No evidence found."}

Before producing JSON, compare each evidence passage to the exact wording of
the claim. A source is supporting only if it makes the claim more likely to be
true; it is contradicting if it makes the claim more likely to be false.

Return only valid JSON with keys: claim, verdict, confidence, reasoning,
supporting_sources, contradicting_sources.
Use integer confidence from 0 to 100. Source lists must contain URL strings only."""

        try:
            verdict = await self.llm_client.complete_json(
                SYSTEM_PROMPT,
                prompt,
                ClaimVerdict,
            )
        except InvalidModelOutputError:
            retry_prompt = (
                f"{prompt}\n\n"
                "Your prior answer was malformed. Return only valid JSON matching the requested keys."
            )
            verdict = await self.llm_client.complete_json(
                SYSTEM_PROMPT,
                retry_prompt,
                ClaimVerdict,
            )

        return self._enforce_source_rule(verdict, claim_evidence)

    @staticmethod
    def _normalize_url(url: str) -> str:
        return url.strip().rstrip("/")

    @classmethod
    def _enforce_source_rule(
        cls,
        verdict: ClaimVerdict,
        claim_evidence: ClaimEvidence,
    ) -> ClaimVerdict:
        valid_by_normalized = {
            cls._normalize_url(str(source.url)): str(source.url)
            for source in claim_evidence.evidence
        }

        supporting = [
            valid_by_normalized[normalized]
            for url in verdict.supporting_sources
            if (normalized := cls._normalize_url(url)) in valid_by_normalized
        ]
        contradicting = [
            valid_by_normalized[normalized]
            for url in verdict.contradicting_sources
            if (normalized := cls._normalize_url(url)) in valid_by_normalized
        ]

        overlap = set(supporting) & set(contradicting)
        if overlap:
            supporting = [url for url in supporting if url not in overlap]
            contradicting = [url for url in contradicting if url not in overlap]

        update = {
            "supporting_sources": list(dict.fromkeys(supporting)),
            "contradicting_sources": list(dict.fromkeys(contradicting)),
        }

        if verdict.verdict != "unverifiable" and not (supporting or contradicting):
            update.update(
                {
                    "verdict": "unverifiable",
                    "confidence": min(verdict.confidence, 50),
                    "reasoning": (
                        "The model did not cite valid evidence from the supplied source list, "
                        "so this claim is treated as unverifiable."
                    ),
                }
            )

        return verdict.model_copy(update=update)

    @staticmethod
    def _credibility_score(verdicts: list[ClaimVerdict]) -> int:
        """Estimate how believable the original claim is, not model certainty."""
        if not verdicts:
            return 50

        claim_scores: list[int] = []
        for item in verdicts:
            if item.verdict == "true":
                claim_scores.append(item.confidence)
            elif item.verdict == "false":
                claim_scores.append(100 - item.confidence)
            else:
                # Misleading and unverifiable claims should sit near the middle
                # instead of being mistaken for high-credibility claims merely
                # because the model is confident in that label.
                claim_scores.append(50)

        return round(sum(claim_scores) / len(claim_scores))

    @staticmethod
    def _overall_confidence(verdicts: list[ClaimVerdict]) -> int:
        if not verdicts:
            return 0
        return round(sum(item.confidence for item in verdicts) / len(verdicts))

    @staticmethod
    def _overall_verdict(
        score: int,
        verdicts: list[ClaimVerdict],
    ) -> VerdictLabel:
        if not verdicts:
            return "unverifiable"

        if len(verdicts) == 1:
            return verdicts[0].verdict

        if all(item.verdict == "unverifiable" for item in verdicts):
            return "unverifiable"

        decided = [item.verdict for item in verdicts if item.verdict != "unverifiable"]
        if decided and all(label == decided[0] for label in decided):
            return decided[0]

        if score > 70:
            return "true"
        if score < 30:
            return "false"
        return "misleading"
