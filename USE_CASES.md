# Heramb 🔑 — Use Cases Where It Shines

---

## Use Case 1: The Solo Dev Shipping a SaaS at Midnight

**Stack:** Next.js → Vercel, Express + Socket.io → Railway, Redis → Railway, Postgres → Neon

**The situation:**
Arjun is a solo founder. He's been building a real-time collaborative tool for 3 months. It's Friday night. He wants to show it to investors on Monday. He's never deployed this stack to production before.

**Without Heramb:**
- 2 hours figuring out why Socket.io keeps falling back to polling
- Realises he hardcoded `port 3000` instead of `process.env.PORT`
- Railway keeps crashing, logs are cryptic
- Finally gets backend up, copies URL to Vercel
- Deploys frontend, CORS blocks everything
- Goes back to Railway, adds CORS_ORIGIN
- Redeploys backend, now WebSocket disconnects after 15 minutes (Railway's request timeout)
- Googles it at 2am, finds a GitHub issue from 2022
- Ships at 4am, exhausted, introduces a bug in the process

**With Heramb:**
```bash
heramb init    # 2 minutes — detects socket.io, warns about PORT, configures Redis adapter
heramb deploy  # 8 minutes — full pipeline, CORS wired, WS tested, done
```
Arjun is in bed by midnight. Demo goes well. Investor is impressed.

**Where Heramb shines:**
- Caught the hardcoded port before deploy even started
- Detected socket.io in package.json, auto-added Redis adapter config
- Solved the CORS circular dependency without Arjun knowing it was even a problem
- Smoke tested the WebSocket handshake before calling it done

---

## Use Case 2: The Team That Deploys to Preview Environments 10 Times a Day

**Stack:** React → Netlify, FastAPI → Render, Redis → Upstash

**The situation:**
A 4-person startup runs feature branches. Every PR gets a preview environment — frontend on Netlify, backend on Render, fresh Upstash Redis per preview. They're doing 10 PRs a day. Each preview deploy takes one developer 20 minutes of manual work.

**Without Heramb:**
- 10 PRs × 20 minutes = 200 minutes of developer time per day just on deploy config
- Each preview has a different backend URL — developer manually updates Netlify env var each time
- CORS breaks on every new preview because the Netlify preview URL is unpredictable (`deploy-preview-47--myapp.netlify.app`)
- Redis connection strings get copy-pasted wrong twice a week
- New team member spent their entire first day just trying to deploy a preview

**With Heramb:**
```bash
heramb deploy --env preview --branch feat/new-dashboard
```

Heramb provisions a fresh Upstash Redis, deploys the Render backend, captures the URL, deploys to Netlify, wires all env vars, patches CORS. Every time. Automatically.

```
Preview environment ready 🔑
  Frontend : https://deploy-preview-47--myapp.netlify.app
  Backend  : https://api-feat-new-dashboard.onrender.com
  Redis    : provisioned (preview tier)
  WS test  : ✓ OK
```

**Where Heramb shines:**
- Preview environments become a one-liner
- CORS wired correctly for every unique Netlify preview URL automatically
- Redis provisioned and torn down per branch — no shared state pollution between previews
- New team members can deploy without understanding the infra at all

---

## Use Case 3: Migrating From One Provider to Another Without Downtime

**Stack:** React → Vercel, Node.js → Heroku (dying), Redis → Redis Cloud

**The situation:**
Heroku killed its free tier. Priya's startup runs on Heroku and needs to migrate to Render. She has a live production app with real users. She can't afford downtime. She's scared.

**Without Heramb:**
- Manually recreates all env vars on Render (some are forgotten, app crashes)
- Deploys to Render, points DNS, realises CORS still references old Heroku URL on Vercel
- App is broken for 45 minutes during the switchover
- Redis connection string format is different between providers, app errors on startup
- Users notice, trust is damaged

**With Heramb:**
```bash
heramb migrate backend --from heroku --to render
```

Heramb:
1. Reads all env vars from Heroku
2. Deploys the same codebase to Render
3. Runs smoke tests on the new deployment before touching DNS
4. Updates Vercel's `NEXT_PUBLIC_API_URL` to the new Render URL
5. Patches CORS on the new Render deployment
6. Validates everything works end to end
7. Only then marks migration complete

**Where Heramb shines:**
- Zero forgotten env vars — reads them directly from the source provider
- Validates the new deployment *before* any DNS or config switch
- CORS and frontend env vars updated atomically — no window where they're mismatched
- If anything fails, the old Heroku deployment is still live and untouched

---

## Use Case 4: The Agency Deploying 5 Different Client Projects a Week

**Stack:** Varies per client — Next.js, Nuxt, plain React, Django, Laravel

**The situation:**
Ravi runs a 6-person dev agency. Every client has a different stack preference. Some want Vercel + Railway. Some want Netlify + Render. One enterprise client insists on AWS. His team wastes enormous time on deployment configuration that is never the same twice.

**Without Heramb:**
- Every project has a different deploy script written by whoever set it up
- When that person leaves, nobody knows how the deploy works
- CORS is broken on at least one client project at any given time
- Onboarding new developers includes a 2-hour "how to deploy Project X" session
- One developer accidentally deployed the wrong branch to production last month

**With Heramb:**
```
client-a/heramb.config.json  → { frontend: vercel, backend: railway }
client-b/heramb.config.json  → { frontend: netlify, backend: render }
client-c/heramb.config.json  → { frontend: cloudflare-pages, backend: fly }
```

Every project deploys the same way:
```bash
heramb deploy
```

**Where Heramb shines:**
- One mental model across all client projects regardless of provider combination
- New developers deploy correctly on day one
- Config is version controlled — everyone knows exactly how each project is wired
- `heramb status` gives a unified view across all providers in one command

---

## Use Case 5: The Developer Who Keeps Breaking Production With CORS

**Stack:** Vue.js → Cloudflare Pages, NestJS → Fly.io, Redis → Upstash

**The situation:**
Every time Deepika deploys a new version, CORS breaks. She forgets to update `CORS_ORIGIN` on the backend after Cloudflare generates a new preview URL. It happens at least twice a month. Her users see a white screen. She gets a Slack message. She feels terrible.

**Without Heramb:**
This is a human process problem. There's no tooling to enforce it. It keeps happening.

**With Heramb:**
CORS patching is not a manual step. It is a pipeline step that runs automatically after every frontend deploy. It is physically impossible to forget because Heramb does not let the deploy complete until CORS is correctly set and verified.

```
[8/10] Patching CORS_ORIGIN...  ✓ fly.io env updated → https://new-preview.pages.dev
[9/10] Verifying CORS...        ✓ preflight request OK
[10/10] Done. 🔑 Unlocked
```

**Where Heramb shines:**
- CORS misconfiguration is eliminated as a category of error, not just fixed once
- The patch-and-verify step runs on every deploy, not just when someone remembers
- `heramb ws test` can be run independently at any time to verify the full stack

---

## Use Case 6: CI/CD in GitHub Actions With Zero Config Drift

**Stack:** React → Vercel, Go backend → Railway, Postgres → Neon

**The situation:**
A team of 8 runs continuous deployment. Every merge to main deploys to production. But their GitHub Actions workflow has grown into a 300-line YAML file that nobody fully understands. Env vars are duplicated across the workflow file, Railway dashboard, and Vercel dashboard. They get out of sync constantly.

**Without Heramb:**
- Three places to update env vars — someone always misses one
- New env vars require updating the GitHub Actions YAML, the Railway dashboard, AND the Vercel dashboard
- A developer added a `DATABASE_URL` to the app but forgot to add it to the CI workflow — production was broken for an hour before anyone noticed

**With Heramb:**
```yaml
# .github/workflows/deploy.yml — the entire deploy config
- name: Deploy
  run: npx heramb deploy
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
    VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

`heramb.config.json` in the repo is the single source of truth. The GitHub Actions workflow is 8 lines. Env vars are declared once in `heramb.config.json` and in GitHub secrets — nowhere else.

**Where Heramb shines:**
- Single source of truth for deployment config — the repo, not three dashboards
- Adding a new env var means editing one file, not three places
- The workflow is readable by anyone on the team in 30 seconds
- `heramb status` in CI prints a clear deploy summary with URLs for the PR comment

---

## Use Case 7: The Developer Learning Deployment for the First Time

**Stack:** Next.js → Vercel, Express → Railway, Redis → Railway

**The situation:**
Kabir just finished a bootcamp. He built a chat app. He wants to deploy it. He has never deployed anything with WebSockets or Redis before. He watches three YouTube tutorials, they all contradict each other, and none of them show the CORS step.

**Without Heramb:**
- 6 hours of confusion across Railway docs, Vercel docs, Stack Overflow
- Gets backend up but doesn't understand why WebSocket won't connect
- Never figures out the CORS issue, ships with `CORS_ORIGIN=*` in production
- Gives up on Redis and removes it from the app entirely
- Tells his friends "deployment is the worst part of web dev"

**With Heramb:**
```bash
npx heramb init
# → Detected: Next.js frontend, Express backend, Redis
# → Found socket.io — enabling Redis adapter config
# → Warning: server.js uses port 3000. Railway needs process.env.PORT.
#    Fix: change to app.listen(process.env.PORT || 3000)
# → heramb.config.json created

npx heramb deploy
# → Everything wired. 🔑 Unlocked.
```

Kabir ships a real production app with WebSockets and Redis on his first attempt. He understands what was configured because Heramb prints every step clearly. He learns by watching, not by debugging.

**Where Heramb shines:**
- Catches the most common beginner mistakes before they cause failures
- Makes the invisible wiring (CORS, env vars, WS config) visible and educational
- Lowers the barrier to shipping real production-grade infrastructure
- Builds correct habits — version controlled config, proper env var management

---

## The Common Thread

Heramb shines whenever:

- **Two or more platforms need to know about each other** — and the information only exists after one of them deploys
- **The same deployment steps are repeated** — across projects, branches, team members, or clients
- **A human is the glue between platforms** — copy-pasting URLs, updating dashboards, remembering the right order
- **WebSockets or Redis are involved** — because these have sharp edges that bite everyone the first time
- **The cost of a broken deploy is high** — production downtime, a demo going wrong, a client losing trust

In all these cases, the problem is not that developers are not smart enough to figure it out. The problem is that it should never have required figuring out in the first place.

**That is what Heramb fixes.**

---

*Heramb. The key to deployment that just works.*
