from urllib.parse import urlparse, urlunparse

from tavily import TavilyClient

from app.config import Settings, get_settings
from app.exceptions import ExternalServiceError
from app.models import ClaimEvidence, EvidenceSource
from app.retry import with_retries


HIGH_RELIABILITY_DOMAINS = {
    "apnews.com": 5,
    "reuters.com": 5,
    "bbc.com": 4,
    "bbc.co.uk": 4,
    "npr.org": 4,
    "who.int": 5,
    "cdc.gov": 5,
    "nih.gov": 5,
    "nasa.gov": 5,
    "noaa.gov": 5,
    "un.org": 5,
    "worldbank.org": 4,
    "factcheck.org": 5,
    "politifact.com": 5,
    "snopes.com": 4,
}

LOW_RELIABILITY_DOMAINS = {
    "facebook.com",
    "reddit.com",
    "x.com",
    "twitter.com",
    "tiktok.com",
    "instagram.com",
}

ACADEMIC_DOMAINS = {"edu", "arxiv.org", "pubmed.ncbi.nlm.nih.gov", "scholar.google.com", "semanticscholar.org"}
NEWS_DOMAINS = {"apnews.com", "reuters.com", "bbc.com", "bbc.co.uk", "npr.org", "nytimes.com", "theguardian.com"}
TRUSTED_DATABASE_DOMAINS = {"who.int", "cdc.gov", "nih.gov", "nasa.gov", "noaa.gov", "un.org", "worldbank.org"}
DOMAIN_SPECIFIC_DOMAINS = {"factcheck.org", "politifact.com", "snopes.com"}


def _host(url: str) -> str:
    return urlparse(url).netloc.lower().removeprefix("www.")


def domain_reliability(url: str) -> int:
    host = _host(url)

    known = max(
        (score for domain, score in HIGH_RELIABILITY_DOMAINS.items() if host == domain or host.endswith(f".{domain}")),
        default=0,
    )
    if known:
        return known

    if any(host == domain or host.endswith(f".{domain}") for domain in LOW_RELIABILITY_DOMAINS):
        return 1
    if host.endswith(".gov") or host.endswith(".gov.uk"):
        return 5
    if host.endswith(".edu") or host.endswith(".ac.uk"):
        return 4
    return 0


def source_type(url: str) -> str:
    host = _host(url)
    if host.endswith(".edu") or host.endswith(".ac.uk") or any(
        host == domain or host.endswith(f".{domain}") for domain in ACADEMIC_DOMAINS
    ):
        return "academic"
    if host.endswith(".gov") or host.endswith(".gov.uk") or any(
        host == domain or host.endswith(f".{domain}") for domain in TRUSTED_DATABASE_DOMAINS
    ):
        return "trusted_database"
    if any(host == domain or host.endswith(f".{domain}") for domain in DOMAIN_SPECIFIC_DOMAINS):
        return "domain_specific"
    if any(host == domain or host.endswith(f".{domain}") for domain in NEWS_DOMAINS):
        return "news"
    return "web"


def canonical_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower().removeprefix("www."), path, "", "", ""))


def evidence_rank(source: EvidenceSource) -> float:
    relevance = source.score if source.score is not None else 0.5
    authority = source.reliability / 5 if source.reliability else {
        "trusted_database": 0.9,
        "academic": 0.85,
        "domain_specific": 0.75,
        "news": 0.7,
        "web": 0.45,
    }.get(source.source_type, 0.45)
    return (0.45 * relevance) + (0.55 * authority)


class EvidenceRetriever:
    def __init__(self, settings: Settings | None = None, tavily_client: TavilyClient | None = None) -> None:
        self.settings = settings or get_settings()
        if tavily_client is not None:
            self.client = tavily_client
        elif self.settings.tavily_api_key:
            self.client = TavilyClient(api_key=self.settings.tavily_api_key)
        else:
            self.client = None

    async def retrieve_for_claims(self, claims: list[str]) -> list[ClaimEvidence]:
        return [await self.retrieve(claim) for claim in claims]

    async def retrieve(self, claim: str) -> ClaimEvidence:
        if self.client is None:
            raise ExternalServiceError("TAVILY_API_KEY is not configured")

        async def operation() -> ClaimEvidence:
            queries = [
                claim,
                f"fact check evidence for and against: {claim}",
                f"research evidence about: {claim}",
            ]

            by_url: dict[str, EvidenceSource] = {}

            for search_index, query in enumerate(queries[: self.settings.tavily_max_searches_per_claim]):
                response = self.client.search(
                    query=query,
                    search_depth=self.settings.tavily_search_depth,
                    max_results=self.settings.tavily_results_per_claim,
                    include_answer=False,
                )

                for item in response.get("results", []):
                    url = item.get("url")
                    content = item.get("content") or item.get("raw_content") or item.get("snippet") or ""
                    score = item.get("score")

                    if not url or not content:
                        continue
                    if score is not None and score < self.settings.tavily_min_relevance:
                        continue

                    source = EvidenceSource(
                        title=item.get("title"),
                        url=url,
                        content=content,
                        score=score,
                        reliability=domain_reliability(url),
                        source_type=source_type(url),
                    )

                    key = canonical_url(url)
                    previous = by_url.get(key)
                    if previous is None or evidence_rank(source) > evidence_rank(previous):
                        by_url[key] = source

                quality_count = sum(
                    1
                    for source in by_url.values()
                    if (source.score or 0) >= self.settings.tavily_min_relevance
                )

                # One good broad search plus one verification-oriented search is
                # normally enough. A third search is only used when the evidence
                # pool is still too small.
                if search_index >= 1 and quality_count >= self.settings.tavily_min_quality_sources:
                    break

            ranked = sorted(by_url.values(), key=evidence_rank, reverse=True)

            # Encourage source diversity so several pages from one site do not
            # crowd out independent evidence.
            selected: list[EvidenceSource] = []
            per_domain: dict[str, int] = {}
            for source in ranked:
                host = _host(str(source.url))
                if per_domain.get(host, 0) >= 2:
                    continue
                selected.append(source)
                per_domain[host] = per_domain.get(host, 0) + 1
                if len(selected) >= self.settings.tavily_max_results_per_claim:
                    break

            return ClaimEvidence(claim=claim, evidence=selected)

        return await with_retries(operation, self.settings, "Tavily search")
