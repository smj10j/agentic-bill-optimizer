# PRD-020 — Agent Conversation Memory

**Priority**: P1
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

The difference between a financial advisor and a financial app is memory. A great advisor remembers that you're saving for a house down payment, that you hate being told to cut subscriptions, that you got a promotion in January, and that you have a $2,000 car repair coming up. Today, Orbit starts every conversation from scratch. Persistent, structured memory transforms the agent from a smart chatbot into something that genuinely knows you.

---

## Problem Statement

Current limitations:
1. Each conversation is stateless — the agent has no memory of previous sessions
2. The agent must re-ask for context every time ("What are your financial goals?")
3. The agent can't track progress toward goals the user mentioned last week
4. User preferences stated once (e.g., "I prefer aggressive savings") are forgotten
5. Important facts ("I'm self-employed", "My partner handles investments") are never retained

This makes the agent feel generic rather than personal, undermining the core value proposition of an AI financial advisor.

---

## Memory Architecture

### Storage Schema

```sql
CREATE TABLE agent_memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL CHECK (category IN (
    'goal',           -- "Save $20k for house down payment by 2027"
    'preference',     -- "Prefers weekly digests over daily notifications"
    'fact',           -- "Self-employed as a freelance designer"
    'constraint',     -- "Can't touch retirement accounts (penalties)"
    'milestone',      -- "Reached emergency fund $1k on March 1"
    'instruction'     -- "Never suggest cancelling Spotify (it's for my daughter)"
  )),
  content TEXT NOT NULL,           -- natural language statement
  structured_data TEXT,            -- JSON for machine-readable fields
  source TEXT NOT NULL CHECK (source IN ('extracted', 'explicit', 'inferred')),
    -- extracted: from conversation summary
    -- explicit: user said "remember this"
    -- inferred: agent concluded from behavior patterns
  confidence REAL DEFAULT 1.0,     -- 0.0-1.0 for inferred memories
  relevance_score REAL DEFAULT 1.0, -- decays over time if not referenced
  last_referenced_at INTEGER,
  expires_at INTEGER,              -- null = permanent
  created_at INTEGER NOT NULL
);
```

### Memory Categories

| Category | Examples | Retention |
|---|---|---|
| `goal` | "Save $15k for Europe trip by July", "Pay off credit card by EOY" | Until achieved or user removes |
| `preference` | "Prefers to review before agent acts", "Don't suggest budgets" | Permanent |
| `fact` | "Self-employed", "Two kids", "Partner has separate finances" | Permanent |
| `constraint` | "Can't touch 401k", "No investments — against beliefs" | Permanent |
| `milestone` | "Hit $1k emergency fund March 2026" | Permanent (historical record) |
| `instruction` | "Never cancel Amazon Prime", "Don't mention X" | Permanent |

---

## Memory Operations

### 1. Extraction (automated, after each conversation)
After a conversation ends, the agent makes one final tool call to extract memories:

```json
{
  "tool": "extract_memories",
  "input": {
    "conversation_summary": "...",
    "new_memories": [
      {
        "category": "goal",
        "content": "User wants to save $20,000 for a house down payment by December 2027",
        "structured_data": {"amount_cents": 2000000, "target_date": "2027-12-01"},
        "source": "extracted"
      },
      {
        "category": "preference",
        "content": "User prefers agent to ask before acting on anything over $500",
        "source": "explicit"
      }
    ],
    "memories_to_update": ["mem_abc123"],
    "memories_to_expire": []
  }
}
```

### 2. Recall (at conversation start)
Before each conversation, the most relevant memories are injected into the Claude system prompt:

```
User memories:
- Goal: Save $20k for house down payment by Dec 2027 (progress: $4,200/20,000)
- Preference: Prefers approval before any action >$500
- Fact: Self-employed freelance designer, variable income
- Instruction: Do not suggest cancelling Spotify
- Recent milestone: Emergency fund reached $1,000 on Mar 1, 2026
```

**Selection algorithm**: Retrieve all memories, then rank by:
1. Recency of last reference
2. Category weight (goals and instructions always included)
3. Relevance to current context (if user asks about bills, bill-related memories first)

Cap at ~1,000 tokens of memory context to avoid bloating the prompt.

### 3. Explicit Memory Management
User can view, edit, and delete all stored memories in Settings → Intelligence:
- "Here's what Orbit remembers about you"
- Edit any memory
- Delete any memory
- Add a memory manually: "Always remember: I hate overdraft fees more than anything"

---

## Goal Tracking

Goals are a special memory category with:
- **Target**: amount, date, or behavior (e.g., "cancel 2 subscriptions this month")
- **Progress tracking**: automatic updates when relevant financial events occur
- **Projection**: "At your current savings rate, you'll reach $20k by October 2027 — 2 months early"
- **Celebration**: agent acknowledges milestones proactively

The agent proactively surfaces goal progress in conversations:
- "You're $1,200 closer to your house fund since we last talked. You're on track."
- "Your credit card payoff goal: currently at 67% paid down. At this rate: 4 months to debt-free."

---

## Privacy and Transparency

- **Visible**: All memories viewable and editable in Settings → Intelligence
- **Deletable**: Any memory can be deleted at any time, with no recovery
- **No inferences without transparency**: Inferred memories (confidence < 1.0) shown with "Orbit inferred this — is it correct?"
- **Data retention**: Memories deleted with account deletion within 30 days

---

## Implementation Notes

### Claude Integration
Memory is injected as structured text in the system prompt at the start of each agent call:
```
<user_memory>
[memory content here]
</user_memory>
```

The memory extraction tool is a Claude tool call (`extract_memories`) called as part of the conversation finalization step in `services/agent.ts`.

### Conversation Summarization
After each session, the agent produces a 2-3 sentence summary stored alongside the full message history. The summary is used for:
- Memory extraction context
- Quick recall without loading full history
- The weekly digest (PRD-023)

---

## Success Metrics

| Metric | Target |
|---|---|
| Memories extracted per conversation | Avg 0.5–2 new memories |
| Memory recall accuracy | >90% (correct memories recalled for context) |
| Reduction in repeated questions | >50% fewer "what are your goals?" prompts |
| User memory edit/delete rate | <10% (low = memories are accurate) |
| User satisfaction with personalization | >4.3 / 5.0 |
| Goal completion rate (tracked goals) | >40% within 12 months |

---

## Dependencies

- PRD-007 (Proactive Insights) — memories inform which insights are relevant
- PRD-023 (Weekly Digest) — memories summarized in digest
- PRD-024 (Financial Health Score) — goals feed into score calculation
