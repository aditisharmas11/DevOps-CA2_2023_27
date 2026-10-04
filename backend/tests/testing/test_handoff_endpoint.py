"""Integration tests for GET /projects/{id}/repair/export-bob-handoff.

Verifies: auth required, 404 for unknown project, 404 when no escalation,
and the zip contains exactly AGENTS.md, .bob/rules/forgeflow-stack.md and BOB_HANDOFF.md.
"""

from __future__ import annotations

import io
import json
import zipfile
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from beanie import PydanticObjectId
from httpx import ASGITransport, AsyncClient

from app.api.app import create_app
from app.db.models import Artifact
from app.db.models.enums import ArtifactType, Stage
from app.orchestrator.stages.repair import LOOP_ESCALATED, REPAIR_REPORT_KIND

pytestmark = pytest.mark.usefixtures("mongo_db")


# ------------------------------------------------------------------ fixtures / helpers


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=create_app())
    async with AsyncClient(transport=transport, base_url="http://test") as http:
        yield http


async def _register(client: AsyncClient, email: str) -> str:
    resp = await client.post("/auth/register", json={"email": email, "password": "password123"})
    token: str = resp.json()["access_token"]
    return token


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _project(client: AsyncClient, token: str, name: str = "p") -> str:
    resp = await client.post("/projects", json={"name": name}, headers=_auth(token))
    pid: str = resp.json()["id"]
    return pid


def _escalation_dict(reason: str = "stalled") -> dict:
    """Minimal escalation payload matching Escalation.to_dict()."""
    return {
        "reason": reason,
        "summary": f"Stopped because of {reason}.",
        "failing_tests": [
            {
                "name": "todos [ac-1] rejects empty",
                "criterion_id": "ac-1",
                "file": "todos.test.ts",
                "message": "expected 400, received 201",
            }
        ],
        "diffs_tried": [
            {
                "id": "a1",
                "iteration": 1,
                "target_files": ["backend/src/todos.controller.ts"],
                "outcome": "no_progress",
                "reverted": False,
            }
        ],
        "metrics": {
            "initial_failing": 1,
            "final_failing": 1,
            "failing_by_iteration": [1],
            "regressions_introduced": 0,
            "iterations": 1,
            "tokens_spent": 900,
            "cost_inr": 1.2,
            "wall_clock_s": 30.0,
        },
        "resume": {"stage": "build", "action": "refine", "hint": "Describe what to change"},
    }


def _report_json(*, escalated: bool = True) -> str:
    return json.dumps(
        {
            "outcome": LOOP_ESCALATED if escalated else "fixed",
            "metrics": {
                "initial_failing": 1,
                "final_failing": 1,
                "failing_by_iteration": [1],
                "regressions_introduced": 0,
                "iterations": 1,
                "tokens_spent": 900,
                "cost_inr": 1.2,
                "wall_clock_s": 30.0,
            },
            "attempts": [],
            "final_run_id": None,
            "escalation": _escalation_dict() if escalated else None,
        },
        indent=2,
    )


async def _seed_repair_artifact(project_id: str, *, escalated: bool = True) -> Artifact:
    """Insert a repair_report artifact the way the loop controller would."""
    report = _report_json(escalated=escalated)
    return await Artifact(
        project_id=PydanticObjectId(project_id),
        stage=Stage.test,
        type=ArtifactType.repair_attempt,
        version=1,
        meta={
            "kind": REPAIR_REPORT_KIND,
            "outcome": LOOP_ESCALATED if escalated else "fixed",
            "content": report,  # small enough to be inline
        },
    ).insert()


def _open_zip(data: bytes) -> zipfile.ZipFile:
    return zipfile.ZipFile(io.BytesIO(data))


# ------------------------------------------------------------------ tests


class TestExportBobHandoffAuth:
    async def test_unauthenticated_request_is_401(self, client: AsyncClient) -> None:
        resp = await client.get(f"/projects/{PydanticObjectId()}/repair/export-bob-handoff")
        assert resp.status_code == 401

    async def test_token_with_wrong_user_sees_404(self, client: AsyncClient) -> None:
        owner = await _register(client, "owner_auth@example.com")
        pid = await _project(client, owner)

        intruder = await _register(client, "intruder_auth@example.com")
        resp = await client.get(
            f"/projects/{pid}/repair/export-bob-handoff", headers=_auth(intruder)
        )
        assert resp.status_code == 404


class TestExportBobHandoffNotFound:
    async def test_unknown_project_is_404(self, client: AsyncClient) -> None:
        token = await _register(client, "notfound@example.com")
        fake_pid = str(PydanticObjectId())
        resp = await client.get(
            f"/projects/{fake_pid}/repair/export-bob-handoff", headers=_auth(token)
        )
        assert resp.status_code == 404

    async def test_project_with_no_repair_run_is_404(self, client: AsyncClient) -> None:
        token = await _register(client, "norepair@example.com")
        pid = await _project(client, token)
        resp = await client.get(f"/projects/{pid}/repair/export-bob-handoff", headers=_auth(token))
        assert resp.status_code == 404

    async def test_repair_run_not_escalated_is_404(self, client: AsyncClient) -> None:
        """A repair that ended in 'fixed' (outcome=fixed, escalation=null) → 404."""
        token = await _register(client, "notescalated@example.com")
        pid = await _project(client, token)
        await _seed_repair_artifact(pid, escalated=False)
        resp = await client.get(f"/projects/{pid}/repair/export-bob-handoff", headers=_auth(token))
        assert resp.status_code == 404


class TestExportBobHandoffZip:
    async def test_zip_contains_exactly_three_files(self, client: AsyncClient) -> None:
        token = await _register(client, "zip3@example.com")
        pid = await _project(client, token, name="TodoApp")
        await _seed_repair_artifact(pid)

        resp = await client.get(f"/projects/{pid}/repair/export-bob-handoff", headers=_auth(token))
        assert resp.status_code == 200
        zf = _open_zip(resp.content)
        names = set(zf.namelist())
        assert names == {
            "AGENTS.md",
            ".bob/rules/forgeflow-stack.md",
            "BOB_HANDOFF.md",
        }, f"Unexpected zip contents: {names}"

    async def test_agents_md_contains_project_name(self, client: AsyncClient) -> None:
        token = await _register(client, "agentsmd@example.com")
        pid = await _project(client, token, name="MyTodoApp")
        await _seed_repair_artifact(pid)

        resp = await client.get(f"/projects/{pid}/repair/export-bob-handoff", headers=_auth(token))
        assert resp.status_code == 200
        zf = _open_zip(resp.content)
        agents = zf.read("AGENTS.md").decode("utf-8")
        assert "MyTodoApp" in agents

    async def test_stack_md_contains_fixed_stack(self, client: AsyncClient) -> None:
        token = await _register(client, "stackmd@example.com")
        pid = await _project(client, token)
        await _seed_repair_artifact(pid)

        resp = await client.get(f"/projects/{pid}/repair/export-bob-handoff", headers=_auth(token))
        assert resp.status_code == 200
        zf = _open_zip(resp.content)
        stack = zf.read(".bob/rules/forgeflow-stack.md").decode("utf-8")
        assert "Generated-app stack" in stack
        assert "React 18" in stack

    async def test_bob_handoff_md_contains_failing_test(self, client: AsyncClient) -> None:
        token = await _register(client, "handoffmd@example.com")
        pid = await _project(client, token)
        await _seed_repair_artifact(pid)

        resp = await client.get(f"/projects/{pid}/repair/export-bob-handoff", headers=_auth(token))
        assert resp.status_code == 200
        zf = _open_zip(resp.content)
        handoff = zf.read("BOB_HANDOFF.md").decode("utf-8")
        assert "todos [ac-1] rejects empty" in handoff
        assert "ac-1" in handoff

    async def test_content_type_is_zip(self, client: AsyncClient) -> None:
        token = await _register(client, "ctype@example.com")
        pid = await _project(client, token)
        await _seed_repair_artifact(pid)

        resp = await client.get(f"/projects/{pid}/repair/export-bob-handoff", headers=_auth(token))
        assert resp.status_code == 200
        assert "zip" in resp.headers.get("content-type", "")

    async def test_content_disposition_has_filename(self, client: AsyncClient) -> None:
        token = await _register(client, "disp@example.com")
        pid = await _project(client, token)
        await _seed_repair_artifact(pid)

        resp = await client.get(f"/projects/{pid}/repair/export-bob-handoff", headers=_auth(token))
        assert resp.status_code == 200
        cd = resp.headers.get("content-disposition", "")
        assert "bob-handoff-" in cd
        assert ".zip" in cd
