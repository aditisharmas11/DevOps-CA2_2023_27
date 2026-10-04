from app.graphtrust_scorer import (
    GraphTrustScorer,
    authority_score,
    certainty_from_truth_score,
    sigmoid_confidence,
)
from app.models import ClaimEvidence, ClaimVerdict, EvidenceSource


def test_authority_score_maps_source_tiers():
    assert authority_score(5) == 1.0
    assert authority_score(4) == 0.85
    assert authority_score(1) == 0.3
    assert authority_score(0, source_type="academic") == 0.85
    assert authority_score(0, source_type="web") == 0.45
    assert authority_score(0, has_domain=False) == 0.2


def test_sigmoid_confidence_is_directional_truth_score():
    assert sigmoid_confidence(1.22, 2.5) == 95
    assert sigmoid_confidence(-1.22, 2.5) == 5
    assert certainty_from_truth_score(95) == 90
    assert certainty_from_truth_score(5) == 90


def test_score_claim_uses_authority_relevance_agreement_and_stance(test_settings):
    scorer = GraphTrustScorer(test_settings)
    claim_evidence = ClaimEvidence(
        claim="Apollo 11 landed on the Moon.",
        evidence=[
            EvidenceSource(
                url="https://www.nasa.gov/apollo-11",
                content="Apollo 11 landed on the Moon.",
                score=0.8,
                reliability=5,
                source_type="trusted_database",
            ),
            EvidenceSource(
                url="https://example.com/moon-hoax",
                content="Apollo 11 did not land on the Moon.",
                score=0.5,
                reliability=0,
                source_type="web",
            ),
        ],
    )
    verdict = ClaimVerdict(
        claim="Apollo 11 landed on the Moon.",
        verdict="true",
        confidence=90,
        reasoning="NASA supports the claim.",
        supporting_sources=["https://www.nasa.gov/apollo-11"],
        contradicting_sources=["https://example.com/moon-hoax"],
    )

    scored, nodes = scorer.score_claim(claim_evidence, verdict)

    assert nodes[0].weight == 0.72
    assert nodes[1].weight == 0.2025
    assert scored.graph_score == 0.5175
    assert scored.confidence == 73
    assert scored.verdict == "true"


def test_strong_contradiction_can_be_high_confidence_false(test_settings):
    scorer = GraphTrustScorer(test_settings)
    claim_evidence = ClaimEvidence(
        claim="Vaccines contain microchips.",
        evidence=[
            EvidenceSource(
                url="https://www.cdc.gov/vaccines",
                content="Vaccines do not contain microchips.",
                score=0.95,
                reliability=5,
                source_type="trusted_database",
            )
        ],
    )
    verdict = ClaimVerdict(
        claim="Vaccines contain microchips.",
        verdict="false",
        confidence=95,
        reasoning="CDC evidence contradicts the claim.",
        contradicting_sources=["https://www.cdc.gov/vaccines"],
    )

    scored, _ = scorer.score_claim(claim_evidence, verdict)

    assert scored.verdict == "false"
    assert scored.confidence >= 80
    assert scored.graph_score < 0
