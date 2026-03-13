# Web CLAUDE.md

Next.js/TypeScript-specific conventions for the `web/` directory. Inherits all rules from the root `CLAUDE.md`.

## Tooling

```bash
# All commands run from web/
cd web

# Lint
npm run lint

# Format check (Biome — formatting only, no linting)
npm run format:check

# Auto-format
npm run format

# Type check (catches errors lint misses)
npx tsc --noEmit

# Build (full production check)
npm run build

# Run all quality gates
npm run lint && npm run format:check && npx tsc --noEmit && npm run build
```

ESLint config: `eslint.config.mjs` (next/core-web-vitals + next/typescript).
Biome config: `biome.json` (formatting only — linting disabled, ESLint handles that).
TypeScript: strict mode enabled in `tsconfig.json`.

## TypeScript Rules

- **No `any` types** — use `unknown` and narrow, or define proper types in `src/types/`
- Use `interface` for object shapes, `type` for unions/intersections/utility types
- Define shared types in `src/types/` — one file per domain (e.g., `transcript.ts`, `analysis.ts`)
- Use `str | null` over `str | undefined` for API response fields (matches Supabase)
- Prefer `const` assertions and `satisfies` for type-safe constants

```typescript
// Good — typed, narrowed
interface Transcript {
  id: string;
  title: string;
  status: "pending" | "processing" | "complete" | "failed";
  created_at: string;
  content: string | null;
}

// Bad — avoid
const data: any = await response.json();
```

## State Management

### Zustand (client state)
- Stores in `src/stores/` — one per domain (auth, org config)
- Use for auth tokens, user session, org configuration
- Keep stores minimal — don't duplicate server state

### React Query (server state)
- API client modules in `src/lib/api/` — one per resource
- Use `useQuery` for reads, `useMutation` for writes
- Configure `staleTime` and `gcTime` per query based on data freshness needs
- Invalidate related queries after mutations
- Never duplicate React Query data into Zustand

```typescript
// src/lib/api/transcripts.ts
import ky from "ky";

const api = ky.create({ prefixUrl: process.env.NEXT_PUBLIC_API_URL });

export async function getTranscripts(): Promise<Transcript[]> {
  return api.get("api/transcripts").json();
}

// In component
const { data, isLoading } = useQuery({
  queryKey: ["transcripts"],
  queryFn: getTranscripts,
});
```

## Component Organization

```
src/components/
├── charts/       # Nivo data visualizations (radar, bar, line, heatmap)
├── cards/        # Metric card, coaching card
├── effects/      # Visual effects (waveform, decode animation, pulse glow)
├── journey/      # Call journey (phase timeline, waveform rail)
├── layout/       # Sidebar, topbar, page header
├── shared/       # Reusable: score badge, status badge, empty state, skeleton
└── ui/           # shadcn/ui primitives — DO NOT edit directly
```

**Rules:**
- `ui/` components are managed by shadcn CLI — customize via props/variants, not direct edits
- One component per file, named to match the export (e.g., `score-gauge.tsx` → `ScoreGauge`)
- Co-locate component-specific types at the top of the file
- Extract shared types to `src/types/`

## Signal Design System

See root `CLAUDE.md` for full design system reference. Key reminders:

- **Always use CSS custom properties** from `globals.css`, not hardcoded hex values
- **Score displays**: pair with `getScoreColor()` + `getScoreGlow()` from `src/lib/constants.ts`
- **Card pattern**: `bg-card/80 border border-border rounded-lg`
- **Headings**: `font-display text-sm font-semibold`
- **Data values**: `font-mono` for scores, timestamps, metrics

## Form Handling

- **react-hook-form** + **zod** for form validation
- Define Zod schemas alongside form components
- Use `@hookform/resolvers/zod` to connect schemas

```typescript
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().min(1, "Content is required"),
});

type FormData = z.infer<typeof schema>;

const form = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

## Animation Conventions

- **Framer Motion** (`motion/react`) for page transitions and interactive animations
- Use `motion.div` with `initial`, `animate`, `exit` for enter/exit animations
- Keep animations subtle — 200-300ms duration, ease-out timing
- Use `AnimatePresence` for components that mount/unmount
- Disable animations when `prefers-reduced-motion` is set

## Error Handling

- API errors surface via React Query's `error` state — display with Sonner toasts
- Use `toast.error()` from Sonner for user-facing error messages
- Never show raw error messages from the API — transform to user-friendly text
- Use error boundaries for unexpected render errors

```typescript
import { toast } from "sonner";

const mutation = useMutation({
  mutationFn: createAnalysis,
  onError: (error) => {
    toast.error("Failed to start analysis. Please try again.");
  },
  onSuccess: () => {
    toast.success("Analysis started.");
    queryClient.invalidateQueries({ queryKey: ["analyses"] });
  },
});
```

## Path Aliases

Use `@/*` alias for imports (configured in `tsconfig.json`):

```typescript
// Good
import { ScoreGauge } from "@/components/charts/score-gauge";
import { COLORS } from "@/lib/constants";

// Bad — no relative paths climbing multiple levels
import { ScoreGauge } from "../../../components/charts/score-gauge";
```

## Performance

- Use `next/image` for all images (automatic optimization)
- Lazy-load heavy chart components with `dynamic(() => import(...), { ssr: false })`
- Avoid rendering Nivo charts on the server — they require DOM
- Keep bundle size in check — import specific icons from `lucide-react`, not the entire library
