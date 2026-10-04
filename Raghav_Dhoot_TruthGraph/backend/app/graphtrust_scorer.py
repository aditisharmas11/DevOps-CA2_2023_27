import math

from app.config import Settings, get_settings
from app.models import ClaimEvidence, ClaimVerdict, EvidenceNodeScore, VerdictLabel


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def authority_score(
    reliability: int,
    source_type: str = "web",
    has_domain: bool = True,
) -> float:
    if reliability >= 5:
        return 1.0
    if reliability == 4:
        return 0.85
    if reliability == 3:
        return 0.7
    if reliability == 2:
        return 0.55
    if reliability == 1:
        return 0.3

    fallback = {
        "trusted_database": 0.9,
        "academic": 0.85,
        "domain_specific": 0.75,
        "news": 0.7,
        "web": 0.45,
    }.get(source_type, 0.45)

    return fallback if has_domain else 0.2


def relevance_score(score: float | None) -> float:
    return _clamp(score if score is not None else 0.5)


def sigmoid_confidence(raw_score: float, k: float) -> int:
    """Return a 0-100 truth-support score from signed graph evidence."""
    truth_score = 1 / (1 + math.exp(-k * raw_score))
    return round(truth_score * 100)


def certainty_from_truth_score(truth_score: int) -> int:
    """Convert a directional truth score into confidence in the verdict."""
    return round(abs(truth_score - 50) * 2)


def verdict_from_truth_score(truth_score: int, has_evidence_signal: bool) -> VerdictLabel:
    if not has_evidence_signal:
        return "unverifiable"
    if truth_score > 70:
        return "true"
    if truth_score < 30:
        return "false"
    return "misleading"


class GraphTrustScorer:
    """CWCP-inspired graph scoring over direct Tavily evidence nodes."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def score_claim(
        self,
        claim_evidence: ClaimEvidence,
        verdict: ClaimVerdict,
    ) -> tuple[ClaimVerdict, list[EvidenceNodeScore]]:
        nodes = self._node_scores(claim_evidence, verdict)

        support_total = sum(node.weight for node in nodes if node.stance == "support")
        contradiction_total = sum(
            node.weight / node.hop_distance
            for node in nodes
            if node.stance == "contradiction"
        )

        raw_score = support_total - contradiction_total
        truth_score = sigmoid_confidence(raw_score, self.settings.graph_confidence_k)
        graph_certainty = certainty_from_truth_score(truth_score)

        has_signal = any(
            node.stance != "neutral" and node.agreement > 0
            for node in nodes
        )
        graph_verdict = verdict_from_truth_score(truth_score, has_signal)

        # Keep "confidence" as certainty in the verdict, not as probability that
        # the claim is true. This prevents strongly false claims from appearing
        # as low-confidence just because their truth-support score is near zero.
        combined_confidence = (
            round((graph_certainty + verdict.confidence) / 2)
            if has_signal
            else min(verdict.confidence, 50)
        )

        reasoning_suffix = (
            f" GraphTrust evidence balance R={raw_score:.3f}; "
            f"verdict confidence={combined_confidence}/100."
        )

        return (
            verdict.model_copy(
                update={
                    "verdict": graph_verdict,
                    "confidence": combined_confidence,
                    "graph_score": round(raw_score, 4),
                    "graph_confidence": graph_certainty,
                    "reasoning": f"{verdict.reasoning}{reasoning_suffix}",
                }
            ),
            nodes,
        )

    def _node_scores(
        self,
        claim_evidence: ClaimEvidence,
        verdict: ClaimVerdict,
    ) -> list[EvidenceNodeScore]:
        supporting = set(verdict.supporting_sources)
        contradicting = set(verdict.contradicting_sources)
        agreement = verdict.confidence / 100
        nodes: list[EvidenceNodeScore] = []

        for source in claim_evidence.evidence:
            url = str(source.url)
            stance = self._stance(url, supporting, contradicting)
            node_agreement = agreement if stance != "neutral" else 0.0
            authority = authority_score(
                source.reliability,
                source_type=source.source_type,
                has_domain=bool(source.url.host),
            )
            relevance = relevance_score(source.score)
            weight = authority * relevance * node_agreement

            nodes.append(
                EvidenceNodeScore(
                    url=url,
                    stance=stance,
                    authority=round(authority, 4),
                    relevance=round(relevance, 4),
                    agreement=round(node_agreement, 4),
                    hop_distance=self.settings.direct_evidence_hop_distance,
                    weight=round(weight, 4),
                )
            )

        return nodes

    @staticmethod
    def _stance(
        url: str,
        supporting: set[str],
        contradicting: set[str],
    ) -> str:
        if url in supporting:
            return "support"
        if url in contradicting:
            return "contradiction"
        return "neutral"
