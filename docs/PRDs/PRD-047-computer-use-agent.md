# PRD-047 — Computer Use Agent for Financial Tasks

**Priority**: P1
**Status**: Draft
**Last Updated**: 2026-03-09
**Registry**: [REGISTRY.md](./REGISTRY.md)

---

## Vision

The most powerful thing Orbit can do for users is act in the world on their behalf — not just analyze and suggest, but actually execute. Computer use gives Orbit the ability to operate any website, interact with any web form, navigate any UI, and complete financial tasks that traditionally required a human being. This is the technological moat that no spreadsheet, no budget app, and no financial advisor can match.

---

## What Is Computer Use?

Claude's computer use capability allows the AI model to:
- Take screenshots of a browser window
- Identify UI elements (buttons, forms, menus)
- Click, type, scroll, and navigate
- Read the results of its actions and adapt

This enables Orbit to interact with any financial service's website exactly as a human would — but faster, without emotional friction, and without forgetting what it was supposed to do.

---

## High-Value Use Cases

### Tier 1: Subscription Cancellation (see PRD-009)
**Impact**: High, immediate, deterministic
- Navigate to account settings, find cancellation flow, execute
- Handle retention offers according to user preferences
- Capture confirmation screenshot and number
- Works on: Netflix, Hulu, Disney+, Spotify, Adobe, gym apps, SaaS tools

### Tier 2: Bill Negotiation Chat (see PRD-008)
**Impact**: High, moderate reliability
- Open provider's live chat
- Present scripted negotiation opener with competitor pricing as leverage
- Evaluate retention offers against user's stated criteria
- Accept, counter, or decline per user prefs
- Works on: internet providers, wireless carriers, streaming services

### Tier 3: Service Transfers
**Impact**: High, relatively straightforward
- Switch insurance provider: fill out new application, upload docs, set up payment
- Transfer investment accounts (ACATS process)
- Open new HYSA accounts for yield product

### Tier 4: Refund Chasing
**Impact**: Medium, high user delight
- Identify eligible refunds (hotel price drops, airline schedule changes, subscription prorated refunds)
- Navigate to the refund claim interface
- Submit claim with relevant data
- Follow up if not resolved

### Tier 5: Form Filing
**Impact**: High for specific users
- Tax forms (help file quarterly estimated taxes)
- Credit card rewards redemption
- Insurance claims (gather evidence, fill claim form)

---

## Authorization Framework

Computer use acting as the user's agent requires explicit, logged authorization:

### Session Authorization Model

```sql
CREATE TABLE computer_use_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  task_type TEXT NOT NULL,           -- 'cancellation', 'negotiation', 'refund', etc.
  target_service TEXT NOT NULL,      -- 'netflix', 'comcast', etc.
  authorization_text TEXT NOT NULL,  -- what user explicitly authorized
  authorized_at INTEGER NOT NULL,
  scope TEXT NOT NULL,               -- JSON: what actions are permitted
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  action_log TEXT,                   -- JSON: every action taken
  screenshots TEXT,                  -- JSON: base64 screenshots at key steps
  outcome TEXT,
  completed_at INTEGER,
  created_at INTEGER NOT NULL
);
```

### Authorization Flow
1. User initiates task: "Cancel my Netflix subscription"
2. Orbit shows: "I'll navigate to Netflix.com, go to your account settings, and cancel your subscription. I'll screenshot each step. This may take 2-3 minutes."
3. User must explicitly tap: **"Authorize — let Orbit do this"**
4. Session created with explicit scope limitation (only Netflix.com, only this session)
5. Agent executes, logging every action with screenshots
6. User reviews outcome with full audit trail

### Scope Limitations (enforced)
- Domain restriction: agent only operates on the explicitly authorized domain
- Action types: limited to navigation, form fill, button clicks (no file downloads, no payment entries without secondary approval)
- Duration: sessions expire after 30 minutes
- No credential storage: if login is needed, user enters credentials in a secure passthrough

---

## Infrastructure

### Cloudflare Browser Rendering
Cloudflare provides a Browser Rendering API (Puppeteer/CDP) that runs headless Chrome in Workers. This is the natural infrastructure choice given we're on Cloudflare Workers.

```typescript
// Conceptual — actual Browser Rendering API
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://www.netflix.com/cancelplan');
// ... Claude drives the page via computer use ...
```

**Limitation**: Complex multi-step sessions may require a persistent connection beyond a single Worker invocation. Use Durable Objects to maintain session state across multiple round-trips.

### Alternative: Dedicated Browser Service
For complex sessions, run a dedicated headless Chrome instance on a server (e.g., Browserless.io, or our own Docker container). More reliable for long-running sessions.

### Claude Computer Use API Integration

```typescript
interface ComputerUseStep {
  type: 'screenshot' | 'click' | 'type' | 'scroll' | 'key';
  coordinate?: [number, number];
  text?: string;
}

async function executeComputerUseSession(
  task: string,
  targetUrl: string,
  sessionId: string
): Promise<ComputerUseResult> {
  let page = await browser.newPage();
  await page.goto(targetUrl);

  let continueLoop = true;
  while (continueLoop) {
    const screenshot = await page.screenshot({ encoding: 'base64' });

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      tools: [{ type: 'computer_20250124', name: 'computer', display_width_px: 1280, display_height_px: 800 }],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshot } },
            { type: 'text', text: task }
          ]
        }
      ]
    });

    // Execute actions from response, capture results
    // Loop until task complete or error
  }
}
```

---

## Safety Architecture

### "Show Me First" Mode (default)
Before executing any irreversible action (submitting a cancellation, accepting an offer), the agent pauses and shows the user a screenshot:
- "I'm about to click 'Confirm Cancellation'. This will cancel your subscription. Proceed?"
- User must approve each irreversible action

### "Full Auto" Mode (opt-in)
For users who trust the agent and want zero friction:
- Agent executes within pre-authorized scope without per-step confirmation
- Still logs all actions with screenshots
- User can review full transcript afterward

### Rollback Capability
For reversible actions:
- Cancellation: resubscribe immediately if within cancellation window
- Form submission: confirmation before final submit
- For truly irreversible actions: always require explicit user confirmation regardless of mode

### Anomaly Detection
If the agent encounters something unexpected during execution (e.g., "Your account has been flagged for suspicious activity" or a captcha it can't solve), it pauses immediately and notifies the user rather than guessing.

---

## Limitation Handling

| Situation | Agent Response |
|---|---|
| CAPTCHA encountered | Pause, ask user to complete manually, then resume |
| 2FA required | Pause, ask user for code, then resume |
| Unexpected screen state | Screenshot + "I don't recognize this screen. Want me to continue or stop?" |
| Session timeout | Restart from last checkpoint |
| Legal/ToS warning | Show to user, require explicit acknowledgment |

---

## Privacy Model

- Screenshots stored encrypted, deleted after 7 days (unless user saves them)
- Agent does not store credentials (passthrough only)
- Cloudflare Browser Rendering runs in isolated sandboxed environments
- No browsing history retained between sessions
- User can request deletion of all session logs

---

## Competitive Moat

This capability doesn't exist anywhere in consumer personal finance:
- **Monarch Money**: Tracks, suggests. Does nothing.
- **Copilot**: Beautiful, passive. No action.
- **Cleo**: Chat AI for budgeting. No execution.
- **Rocket Money** (formerly Truebill): Human concierge for subscription cancellation — slow, human-dependent, expensive
- **DoNotPay**: Attempted automation but limited reliability and narrow scope

Orbit's computer use agent is the first personal finance product that literally does things on your behalf with a complete, auditable trail.

---

## Rollout Plan

1. **Alpha** (internal): Cancellation on 5 most common subscription services
2. **Beta** (100 users): Cancellation + negotiation coaching script generation
3. **GA Phase 1**: Cancellation automation for top 50 subscription providers
4. **GA Phase 2**: Bill negotiation chat automation for top 10 internet/wireless carriers
5. **GA Phase 3**: Refund chasing, form assistance, broader provider coverage

---

## Success Metrics

| Metric | Target |
|---|---|
| Task completion rate (no human intervention needed) | >80% |
| Task completion rate (with human assistance at 1 pause) | >95% |
| Avg session duration | <3 minutes for cancellations |
| False action rate (agent does something user didn't intend) | <0.1% |
| User session authorization rate (authorized vs. viewed) | >70% |
| User trust score post-session | >4.5/5.0 |
| Net savings per computer use action | >$10 avg |

---

## Dependencies

- PRD-009 (Subscription Cancellation) — primary use case
- PRD-008 (Bill Negotiation) — negotiation automation
- Cloudflare Browser Rendering API — headless browser infrastructure
- Anthropic claude-opus-4-6 computer use API — vision + action model
