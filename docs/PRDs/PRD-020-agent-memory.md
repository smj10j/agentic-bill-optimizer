# PRD-020 — Agent Conversation Memory

**Priority**: P1
**Status**: Draft
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Problem Statement

The agent starts fresh each conversation — it doesn't remember that you're saving for a vacation, prefer aggressive savings, or just got a raise. Without long-term memory, every interaction feels like talking to a stranger. Persistent memory makes the agent feel like a real personal CFO who knows your situation, preferences, and history.

---

## Key Ideas

- Conversation summarization and storage after each session
- Automatic preference extraction (risk tolerance, savings style, goals)
- Goal tracking across sessions with progress updates
- Context window management (prioritize relevant memories)
- Memory categories: goals, preferences, personal facts, interaction history
- User-editable memory (view, correct, or delete what the agent remembers)
- Privacy controls on stored context with clear data retention policies

---

## Success Metrics

- Context recall accuracy (does the agent reference past conversations correctly?)
- Reduction in repeated questions across sessions
- User satisfaction with agent personalization (survey/NPS)
- Memory edit/delete usage (proxy for trust and transparency)
- Task completion improvement with memory vs. without
