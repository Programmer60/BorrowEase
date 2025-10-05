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
Create a `.env` from `.env.example` and set:

- VITE_API_BASE_URL: Backend origin (no trailing slash).
	- Dev: http://localhost:5000
	- Prod: https://<your-backend-on-render>.onrender.com
- VITE_SOCKET_URL (optional): Socket.IO origin. Defaults to VITE_API_BASE_URL origin when unset.

Cloudinary (for profile photo uploads)
- VITE_CLOUDINARY_CLOUD_NAME: your Cloudinary cloud name
- VITE_CLOUDINARY_API_KEY: public API key (optional, not used for unsigned upload request)
- VITE_CLOUDINARY_UPLOAD_PRESET: borrowease_profile (recommended)

In Cloudinary → Settings → Upload → Upload presets:
- Create/Edit `borrowease_profile`
- Set Signing mode: Unsigned
- Add Allowed origins: your Vercel domain(s) and http://localhost:5173
- Optionally restrict file types and size

Signed uploads (recommended): the client now requests a signature from the backend at `/api/sign-upload-profile` and uploads directly to Cloudinary with `timestamp`, `signature`, and optional `folder`. Ensure the server has `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` set.

Notes
- All frontend API calls use a centralized Axios instance configured from these env vars.
- Some development-only fetch calls were updated to use the same base, so your production build will point to the Render backend.

### Architectural Decisions
See root-level `TECH_STACK_DECISIONS.md` for a comprehensive rationale of architectural, security, and scalability decisions (queue design, verification, suppression, rate limiting, content quality heuristics, and UI standardization).

### Deployment (Vercel/Netlify)
1) Build locally to verify:
	- npm run build
	- npm run preview
2) Deploy to your static host (e.g., Vercel or Netlify).
3) Configure environment variables in the host dashboard:
	- VITE_API_BASE_URL = https://<your-backend-on-render>.onrender.com
	- VITE_SOCKET_URL = (optional) leave blank to reuse API origin
4) On the backend (Render), ensure CORS_ORIGIN includes your frontend domain(s), e.g.:
	- CORS_ORIGIN = https://<your-frontend>.vercel.app,https://<staging>.vercel.app

### Future Enhancements
- Surface content quality badge.
- Auto-refresh queued replies post-verification.
- Embed misdirected suppression link in outbound email footers.

### Contributing Guidelines
Prefer small, focused PRs. For new UI primitives, add them under `src/Components/ui/` with a usage example in the relevant screen. Keep accessibility (keyboard + ARIA) in mind for interactive elements.

### License
Internal project – license details TBD.
