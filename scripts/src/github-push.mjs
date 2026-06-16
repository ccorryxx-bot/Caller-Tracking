#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const TOKEN = process.env.GIT_TOKEN;
const OWNER = "ccorryxx-bot";
const REPO = "Caller-Tracking";
const BRANCH = "main";
const ROOT = "/home/runner/workspace";

if (!TOKEN) { console.error("GIT_TOKEN not set"); process.exit(1); }

const api = async (endpoint, method = "GET", body) => {
  const r = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GitHub API ${method} ${endpoint} → ${r.status}: ${t}`);
  }
  return r.json();
};

// Get all git-tracked files that exist on disk (skip deleted/untracked deletions)
const files = execSync("git --no-optional-locks ls-files", { cwd: ROOT })
  .toString().trim().split("\n").filter(Boolean)
  .filter((f) => fs.existsSync(path.join(ROOT, f)));

console.log(`📁 ${files.length} files to push`);

// Get GitHub current HEAD SHA
const refData = await api(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`);
const baseTreeSha = refData.object.sha;
console.log(`🌿 GitHub HEAD: ${baseTreeSha}`);

// Upload blobs in parallel batches of 20
const BATCH = 20;
const treeItems = [];

for (let i = 0; i < files.length; i += BATCH) {
  const batch = files.slice(i, i + BATCH);
  const results = await Promise.all(
    batch.map(async (relPath) => {
      const absPath = path.join(ROOT, relPath);
      const content = fs.readFileSync(absPath);
      const isBinary = content.includes(0);
      const blob = await api(`/repos/${OWNER}/${REPO}/git/blobs`, "POST", {
        content: content.toString(isBinary ? "base64" : "utf8"),
        encoding: isBinary ? "base64" : "utf-8",
      });
      return { path: relPath, mode: "100644", type: "blob", sha: blob.sha };
    })
  );
  treeItems.push(...results);
  console.log(`  ✓ ${Math.min(i + BATCH, files.length)}/${files.length} blobs`);
}

// Create tree
console.log("🌲 Creating tree...");
const tree = await api(`/repos/${OWNER}/${REPO}/git/trees`, "POST", {
  tree: treeItems,
  // No base_tree — we replace everything cleanly
});

// Create commit
console.log("💾 Creating commit...");
const commit = await api(`/repos/${OWNER}/${REPO}/git/commits`, "POST", {
  message: "Push full Caller Tracking app from Replit",
  tree: tree.sha,
  parents: [baseTreeSha],
});

// Force-update branch ref
console.log("🚀 Updating branch ref...");
await api(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, "PATCH", {
  sha: commit.sha,
  force: true,
});

console.log(`✅ Done! Pushed to https://github.com/${OWNER}/${REPO}/tree/${BRANCH}`);
console.log(`   Commit: ${commit.sha}`);
