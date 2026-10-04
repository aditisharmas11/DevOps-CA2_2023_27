import pytest

from app.models import ClaimEvidence, ClaimVerdict, EvidenceSource
from app.verdict_engine import VerdictEngine


class MockLLM:
    async def complete_json(self, system_prompt, user_prompt, output_model):
        if "microchips" in user_prompt:
            return ClaimVerdict(
                claim="Vaccines contain microchips.",
                verdict="false",
                confidence=94,
                reasoning="The cited CDC source contradicts this claim.",
                supporting_sources=[],
                contradicting_sources=["https://www.cdc.gov/vaccines"],
            )
        return ClaimVerdict(
            claim="Apollo 11 landed on the Moon in 1969.",
            verdict="true",
            confidence=96,
            reasoning="The cited NASA source supports the Apollo 11 landing date.",
            supporting_sources=["https://www.nasa.gov/apollo-11"],
            contradicting_sources=[],
        )


class MockGraphRepository:
    def __init__(self):
        self.saved = []

    def save_graph(self, graph):
        self.saved.append(graph)


@pytest.mark.asyncio
async def test_verify_claim_true_and_confidence_in_range(test_settings):
    engine = VerdictEngine(MockLLM(), test_settings)
    evidence = ClaimEvidence(
        claim="Apollo 11 landed on the Moon in 1969.",
        evidence=[
            EvidenceSource(
                url="https://www.nasa.gov/apollo-11",
                content="Apollo 11 landed in July 1969.",
            )
        ],
    )

    verdict = await engine.verify_claim(evidence)

    assert verdict.verdict == "true"
    assert 0 <= verdict.confidence <= 100


@pytest.mark.asyncio
async def test_verify_claim_false_and_confidence_in_range(test_settings):
    engine = VerdictEngine(MockLLM(), test_settings)
    evidence = ClaimEvidence(
        claim="Vaccines contain microchips.",
        evidence=[
            EvidenceSource(
                url="https://www.cdc.gov/vaccines",
                content="Vaccines do not contain microchips.",
            )
        ],
    )

    verdict = await engine.verify_claim(evidence)

    assert verdict.verdict == "false"
    assert 0 <= verdict.confidence <= 100


@pytest.mark.asyncio
async def test_verify_claims_returns_graph_and_agent_transparency(test_settings):
    repository = MockGraphRepository()
    engine = VerdictEngine(MockLLM(), test_settings, graph_repository=repository)
    evidence = ClaimEvidence(
        claim="Apollo 11 landed on the Moon in 1969.",
        evidence=[
            EvidenceSource(
                url="https://www.nasa.gov/apollo-11",
                content="Apollo 11 landed in July 1969.",
                score=0.9,
                reliability=5,
                source_type="trusted_database",
            )
        ],
    )

    response = await engine.verify_claims([evidence])

    assert response.evidence_graphs
    assert response.claims[0].evidence_nodes
    assert response.claims[0].agent_findings
    assert response.claims[0].graph_score is not None
    assert repository.saved == response.evidence_graphs


@pytest.mark.asyncio
async def test_false_claim_stays_false_with_high_verdict_confidence(test_settings):
    repository = MockGraphRepository()
    engine = VerdictEngine(MockLLM(), test_settings, graph_repository=repository)
    evidence = ClaimEvidence(
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

    response = await engine.verify_claims([evidence])

    assert response.overall_verdict == "false"
    assert response.overall_confidence >= 80
    assert response.credibility_score <= 20


def test_credibility_means_believability_not_certainty(test_settings):
    engine = VerdictEngine(MockLLM(), test_settings)

    strongly_true = ClaimVerdict(
        claim="A",
        verdict="true",
        confidence=95,
        reasoning="Supported.",
        supporting_sources=["https://example.com/a"],
    )
    strongly_false = ClaimVerdict(
        claim="B",
        verdict="false",
        confidence=95,
        reasoning="Contradicted.",
        contradicting_sources=["https://example.com/b"],
    )

    assert engine._credibility_score([strongly_true]) == 95
    assert engine._credibility_score([strongly_false]) == 5
    assert engine._credibility_score([strongly_true, strongly_false]) == 50


def test_single_claim_overall_verdict_uses_claim_label(test_settings):
    engine = VerdictEngine(MockLLM(), test_settings)
    verdict = ClaimVerdict(
        claim="Sharing toothbrushes with anyone is safe.",
        verdict="false",
        confidence=94,
        reasoning="Dental-health evidence contradicts the claim.",
        contradicting_sources=["https://example.com/dental"],
    )

    assert engine._overall_verdict(6, [verdict]) == "false"
