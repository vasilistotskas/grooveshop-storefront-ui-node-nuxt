---
name: feedback-git-merge-heuristic-large-refactor
description: Git's 3-way merge can silently pick one side's whole rewrite as "unconflicted" on heavily-refactored files — don't trust conflict markers alone
metadata:
  type: feedback
---

When a file has been heavily restructured on one branch (e.g. a decomposition refactor split one class into three files) while the other branch made smaller targeted edits to the same original file, git's line-based diff3 merge can align hunks in surprising ways: large stretches that "look" unconflicted in the merged output may actually have silently discarded one side's entire logic for that region, even though a naive reading suggests "no conflict = nothing to check here."

Concretely, in the media-stream multi-tenant merge (`grooveshop-media-stream`, see [[media-stream-mt-merge-2026-07-24]]), `CacheImageResourceOperation`'s constructor, imports, and several helper methods showed **no conflict markers** post-merge, yet the plan had explicitly predicted conflicts there — because a prior sync on the branch had already partially reconciled things, and/or the diff3 boundary detection happened to land cleanly. Two controller/service files the plan predicted would conflict (`media-stream-image.controller.ts`, `request-validator.service.ts`) also auto-merged with zero markers.

**Why:** trusting "no `<<<<<<<` markers" as proof that a region is correct would have missed silently-reverted tenant logic. The only way to be sure was to manually diff each auto-merged file's actual content against a plain `git show <other-branch>:<file>` fetch of both sides, and cross-check every method/call-site the plan flagged as tenant-relevant.
**How to apply:** on any merge involving files where one side did a substantial refactor, don't rely on conflict-marker presence to decide what needs review. Pull both sides' canonical content (`git show <ref>:<path>`) and diff against the merged working tree, especially around any logic the merge is specifically supposed to preserve (tenant isolation, security checks, feature flags). This is slower but catches silent reversions that pure conflict-marker resolution would miss.
