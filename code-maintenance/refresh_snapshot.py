"""Refresh public metadata with gh; no PR/Issue mutations or Git pushes."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import argparse
import json
import os
import re
import subprocess
import time
import urllib.parse


def now():
    return datetime.now(timezone.utc).isoformat()


def api(path, payload=None):
    env = {k: v for k, v in os.environ.items()
           if k.lower() not in ("http_proxy", "https_proxy", "all_proxy")}
    cmd = ["gh", "api", path]
    if payload is not None:
        cmd += ["--input", "-"]
    for attempt in range(3):
        result = subprocess.run(cmd, input=json.dumps(payload) if payload else None,
                                capture_output=True, text=True, env=env, timeout=45)
        if not result.returncode or not re.search(r"HTTP 50[234]", result.stderr) or attempt == 2:
            break
        print("Temporary GitHub server error; retrying read-only request", flush=True)
        time.sleep(attempt + 1)
    if result.returncode:
        raise RuntimeError(result.stderr.strip()[:350])
    value = json.loads(result.stdout)
    if isinstance(value, dict) and value.get("errors"):
        raise RuntimeError("GitHub returned GraphQL errors; snapshot not replaced")
    return value


def search(query):
    rows = []
    for page in range(1, 11):
        result = api("search/issues?" + urllib.parse.urlencode(
            {"q": query, "per_page": 100, "page": page}))
        if result.get("incomplete_results") or result["total_count"] > 1000:
            raise RuntimeError("Incomplete GitHub search")
        rows.extend(result["items"])
        if len(rows) >= result["total_count"]:
            break
    if len(rows) != result["total_count"] or len({r["html_url"] for r in rows}) != len(rows):
        raise RuntimeError("Incomplete or duplicate GitHub pagination")
    return rows


def public_prs(account):
    query = """query($q:String!,$after:String){search(query:$q,type:ISSUE,first:100,after:$after){
      issueCount pageInfo{hasNextPage endCursor} nodes{... on PullRequest{
      number title url state isDraft createdAt updatedAt closedAt mergedAt
      repository{nameWithOwner isPrivate} headRefName baseRefName headRefOid
      additions deletions changedFiles reviewDecision
      commits(last:1){nodes{commit{statusCheckRollup{state}}}}}}}}"""
    records, cursor = [], None
    while True:
        result = api("graphql", {"query": query, "variables": {
            "q": "is:pr is:public author:" + account, "after": cursor}})["data"]["search"]
        records.extend(result["nodes"])
        if not result["pageInfo"]["hasNextPage"]:
            break
        cursor = result["pageInfo"]["endCursor"]
        if not cursor or len(records) >= 1000:
            raise RuntimeError("Unsupported PR search pagination")
    if len(records) != result["issueCount"] or len({r["url"] for r in records}) != len(records):
        raise RuntimeError("Incomplete PR search")
    stamp, out = now(), []
    for r in records:
        if r["repository"]["isPrivate"]:
            raise RuntimeError("Private PR rejected")
        commits = r["commits"]["nodes"]
        rollup = commits[-1]["commit"]["statusCheckRollup"] if commits else None
        out.append({"id": r["url"], "number": r["number"],
                    "repo": r["repository"]["nameWithOwner"], "url": r["url"],
                    "title": r["title"], "state": r["state"].lower(), "draft": r["isDraft"],
                    "createdAt": r["createdAt"], "updatedAt": r["updatedAt"],
                    "closedAt": r["closedAt"], "mergedAt": r["mergedAt"],
                    "head": r["headRefName"], "base": r["baseRefName"], "sha": r["headRefOid"],
                    "files": r["changedFiles"], "additions": r["additions"], "deletions": r["deletions"],
                    "ci": (rollup["state"] if rollup else "UNKNOWN").lower(),
                    "review": (r["reviewDecision"] or "UNKNOWN").lower(), "ciAsOf": stamp})
    return out, stamp


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=Path, default=Path(__file__).with_name("seed.json"))
    parser.add_argument("--receipt", type=Path, required=True)
    args = parser.parse_args()
    seed = json.loads(args.seed.read_text())
    prior = json.loads(args.seed.read_text())
    errors = []
    seed["prs"], seed["prCheckedAt"] = public_prs(seed["account"])
    print("Public PR states, branches, CI and reviews refreshed:", len(seed["prs"]), flush=True)
    authored = search("is:issue is:public author:" + seed["account"])
    issues = {r["id"]: r for r in seed["issues"]}
    for r in authored:
        repo = r["repository_url"].split("/repos/", 1)[1]
        issues.setdefault(repo + "#" + str(r["number"]), {"id": repo + "#" + str(r["number"]),
                           "repo": repo, "number": r["number"], "mine": True, "tracked": False})
    public = {repo: not api("repos/" + repo)["private"] for repo in {r["repo"] for r in issues.values()}}

    def issue_read(old):
        if not public[old["repo"]]:
            return None
        try:
            r = api("repos/" + old["repo"] + "/issues/" + str(old["number"]))
            if r.get("pull_request"):
                raise RuntimeError("PR must not be tracked as an Issue")
            return {**old, "url": r["html_url"], "title": r["title"], "state": r["state"],
                    "reason": r.get("state_reason"), "author": r["user"]["login"],
                    "createdAt": r["created_at"], "updatedAt": r["updated_at"],
                    "closedAt": r["closed_at"], "labels": [v["name"] for v in r["labels"]],
                    "comments": r["comments"], "checkedAt": now()}
        except Exception as exc:
            errors.append({"id": old["id"], "error": str(exc)})
            return old if old.get("url") else None

    with ThreadPoolExecutor(max_workers=8) as pool:
        seed["issues"] = [r for r in pool.map(issue_read, issues.values()) if r]
    seed["issueCheckedAt"] = now()
    if errors:
        seed["issueScope"] = "partial"
    else:
        seed.pop("issueScope", None)
    print("Issues refreshed:", len(seed["issues"]), flush=True)

    def branch_read(old):
        row = dict(old)
        try:
            parts = urllib.parse.urlsplit(row["url"]).path.split("/tree/", 1)
            r = api("repos" + parts[0] + "/git/ref/heads/" + urllib.parse.unquote(parts[1]))
            row.update(sha=r["object"]["sha"], checkedAt=now(), headError=False)
            row["headChanged"] = bool(row.get("documentedSha") and row["documentedSha"] != row["sha"])
            if row["headChanged"]:
                row["stage"] = "verify"
        except Exception as exc:
            errors.append({"id": row["id"], "error": str(exc)})
            row["headError"] = True
        return row

    with ThreadPoolExecutor(max_workers=8) as pool:
        seed["branches"] = list(pool.map(branch_read, seed["branches"]))
    seed["branchCheckedAt"] = now()
    for row in seed["branches"] + seed["candidates"]:
        if not row.get("branch"):
            continue
        own = [r for r in seed["prs"] if r["repo"].lower() == row["repo"].lower() and r["head"] == row["branch"]]
        row["ownPRs"] = [r["url"] for r in own]
        if own and not row.get("headChanged"):
            row["stage"] = ("existing" if row in seed["candidates"] else
                            "merged_scope" if any(r["state"] == "merged" for r in own) else
                            "submitted" if any(r["state"] == "open" for r in own) else "closed_pr")
    changes = {}
    for key, fields in [("prs", ["state", "ci", "review", "sha"]),
                        ("issues", ["state"]), ("branches", ["sha", "headError"])]:
        old = {r["id"]: r for r in prior[key]}
        changes[key] = [{"id": r["id"], "changes": {f: [old.get(r["id"], {}).get(f), r.get(f)]
                            for f in fields if old.get(r["id"], {}).get(f) != r.get(f)}}
                        for r in seed[key] if any(old.get(r["id"], {}).get(f) != r.get(f) for f in fields)]
    seed["createdAt"] = now()
    args.receipt.write_text(json.dumps({"checkedAt": now(), "changes": changes, "errors": errors}, ensure_ascii=False, indent=2))
    temp = args.seed.with_suffix(".json.tmp")
    temp.write_text(json.dumps(seed, ensure_ascii=False, separators=(",", ":")))
    temp.replace(args.seed)
    print(json.dumps({"records": {k: len(seed[k]) for k in ["prs", "issues", "branches", "candidates"]},
                      "changed": {k: len(v) for k, v in changes.items()}, "errors": len(errors)}), flush=True)


if __name__ == "__main__":
    main()
