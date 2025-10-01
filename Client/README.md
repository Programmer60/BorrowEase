## BorrowEase Client

Modern React + Vite front-end powering the BorrowEase platform. Includes advanced admin operations for the Contact & Support pipeline, real‑time UX enhancements, and layered anti-abuse features.

### Key Front-End Features
| Feature | Summary |
|---------|---------|
| Contact Management Admin | Intelligent filters, priority badges, spam/risk indicators, bulk actions. |
| Verification UI | Guest email ownership modal & status badges. |
| Custom Checkbox & Badges | Reusable accessible components for consistent visual language. |
| Toast Notifications | Non-blocking feedback via `react-hot-toast`. |
| Dark Mode | Theme toggle + Tailwind dark variant support. |

### Tech Stack
- React 19 + Vite for fast HMR & modern build.
- Tailwind CSS utility-first styling.
- `react-hot-toast` for UX feedback.
- `lucide-react` icons.
- Framer Motion (available for animated sections / accordions).

### Support & Triage Pipeline (Client Hooks)
The client consumes backend endpoints supporting:
- Spam & risk scoring (display only; computed server-side).
- Content quality flags (gibberish/low quality – future UI surface).
- Rate limit responses (structured 429 handling recommended).
- Verification state transitions.

### Development Scripts
`pnpm dev` or `npm run dev` – start dev server.
`npm run build` – production build.
`npm run preview` – preview built assets.

### Environment
Create a `.env` mirroring `.env.example` (if provided) with any API base URL variables you need.

### Architectural Decisions
See root-level `TECH_STACK_DECISIONS.md` for a comprehensive rationale of architectural, security, and scalability decisions (queue design, verification, suppression, rate limiting, content quality heuristics, and UI standardization).

### Future Enhancements
- Surface content quality badge.
- Auto-refresh queued replies post-verification.
- Embed misdirected suppression link in outbound email footers.

### Contributing Guidelines
Prefer small, focused PRs. For new UI primitives, add them under `src/Components/ui/` with a usage example in the relevant screen. Keep accessibility (keyboard + ARIA) in mind for interactive elements.

### License
Internal project – license details TBD.
