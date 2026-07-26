# GoDaddy and Cloudflare DNS

Goal: GoDaddy is only the registrar. Cloudflare is DNS and Worker routing.

## Current Status

- Domain: `kashmirijewels.com`
- Registrar: GoDaddy
- Registered: yes
- Current nameservers from RDAP:
  - `ns29.domaincontrol.com`
  - `ns30.domaincontrol.com`
- Public DNS result: `NXDOMAIN`
- RDAP status includes `client hold`

`client hold` is the blocker. It means the registrar/registry is not publishing the domain in DNS. Cloudflare
cannot make `kashmirijewels.com` or `qa.kashmirijewels.com` work until GoDaddy removes that hold.

## What To Do In GoDaddy

1. Open GoDaddy.
2. Go to `My Products` -> `Domains` -> `kashmirijewels.com`.
3. Check for pending actions:
   - email verification
   - registrant/contact verification
   - payment/order verification
   - domain suspension/hold notice
4. Complete the pending action.
5. Wait until the domain no longer shows a hold/suspension.

Then verify locally:

```bash
dig kashmirijewels.com NS
```

It should stop returning `NXDOMAIN`.

## What To Do In Cloudflare

After GoDaddy hold is removed:

1. Cloudflare -> `Websites` -> `Add a domain`.
2. Add `kashmirijewels.com`.
3. Choose the Free plan.
4. Cloudflare will give two nameservers.
5. Copy any existing DNS records from GoDaddy into Cloudflare if needed.
6. In GoDaddy, change nameservers to Cloudflare's two nameservers.
7. Wait until Cloudflare marks the site active.

## What I Can Do After That

Once Cloudflare shows `kashmirijewels.com` active, I can run/verify:

```bash
dig kashmirijewels.com NS
dig kashmirijewels.com
dig www.kashmirijewels.com
dig qa.kashmirijewels.com
pnpm exec wrangler deployments list
```

After code and environment secrets are ready, deployments will create Worker custom-domain routes:

- prod: `kashmirijewels.com`
- prod: `www.kashmirijewels.com`
- QA: `qa.kashmirijewels.com`

## Current Cloudflare Worker Status

- Prod Worker `kashmiri-jewels` exists.
- QA Worker `kashmiri-jewels-qa` does not exist yet.
- No Worker secrets are configured, which is expected because this app uses Vite/GitHub build-time
  environment variables for public Supabase config.
- Do not deploy QA until the GitHub `qa` environment has QA Supabase secrets.

## Cloudflare Environments

The repo config already defines:

- default/prod Worker: `kashmiri-jewels`
- QA Worker environment: `kashmiri-jewels-qa`

Nothing else should be added in Cloudflare for now. Avoid paid add-ons.

## Zero-Cost Notes

- Use Cloudflare Free.
- Do not enable paid add-ons.
- Do not use Cloudflare Images, R2, D1, Queues, or paid Workers features unless intentionally added later.

## Cost Safety Check

CLI checks showed:

- `wrangler.jsonc` has no KV, D1, R2, Queues, Durable Objects, Hyperdrive, Vectorize, AI, or paid bindings.
- D1 list is empty.
- KV namespace list is empty.
- Queues list is empty.
- R2 is not enabled on the account.

Dashboard checks still needed:

1. `Manage Account` -> `Billing` -> `Subscriptions`: confirm Workers is Free and there are no paid add-ons.
2. `Manage Account` -> `Billing` -> `Billable Usage`: create a budget alert at `$1`.
3. `Workers & Pages` -> `Plans`: confirm Workers plan is Free.
4. When adding `kashmirijewels.com`, choose the Cloudflare Free website plan.
