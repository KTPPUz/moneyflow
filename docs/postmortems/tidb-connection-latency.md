# TiDB connection latency — 31 October 2026

## Summary

The deployed `/api/finance` eventually returned JSON but was slow in the user's authenticated browser. External requests to that deployment were redirected by Vercel SSO, so authenticated production timing could not be collected. A separate, reproducible defect in the workspace connection configuration disabled TLS for a TiDB URL without `sslaccept`, causing a 10-second connection timeout in a read-only probe. Certificate-verified TLS connected successfully. This change fixes that confirmed configuration defect; it does not claim that TLS was the only cause of the deployed latency.

## Symptom and reproduction

Use the configured database URL without printing credentials. Create a MariaDB pool with `databaseConfig(url)`, `connectionLimit: 1`, `minimumIdle: 0`, `connectTimeout: 8000`, `acquireTimeout: 10000`, then request a connection and run only `SELECT 1`.

The old configuration selected `ssl: false` because the URL did not include `sslaccept`. The baseline probe ended with `ER_GET_CONNECTION_TIMEOUT` after 10,001 ms. No financial tables were read or written.

## Root cause

`src/lib/db-config.ts::databaseConfig` previously inferred TLS only from the Prisma URL options `sslaccept=strict` or `sslaccept=accept_invalid_certs`. A TiDB Cloud connection string can omit those options even though TiDB Cloud requires TLS. Missing a flag therefore selected a connection mode that the configured provider did not accept. The driver's pool acquisition deadline converted the failure into a long wait.

The finance read path also queried `financeState` outside the transaction and again inside it for initialized users. That redundant round trip was confirmed from the source, independently of the TLS issue. The deployed Function region is unknown; the configured database gateway is in ap-southeast-1, and the repository previously had no Function-region configuration.

## Fix

- `prismaDatabaseUrl` adds `sslaccept=strict` for hosts ending in `.tidbcloud.com`. Both Prisma CLI configuration and the runtime driver use this normalization. Certificate verification stays enabled; local MySQL behavior is preserved.
- `vercel.json` sets Function region to Singapore (`sin1`) to match the currently configured database. Change this if the database location changes.
- `readFinance` reads state once inside the same transactional snapshot as the financial data. The parallel initialization conflict fallback and revision contract remain intact.
- `/api/finance` returns `Server-Timing` for `session`, `finance`, and `total`, plus `X-MoneyFlow-Region` and `Cache-Control: private, no-store`. Optional `MONEYFLOW_LOG_TIMINGS=true` logs only status, timings, and region.

## Debug ledger

| Experiment                                                          | Result                                                         | Conclusion                                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Public deployment GET /login, /dashboard, /api/finance              | Redirected to Vercel SSO                                       | External timing does not measure the authenticated app                                         |
| Workspace DB configuration, no TLS                                  | Pool acquisition timeout at 10,001 ms                          | Confirmed connection configuration fails                                                       |
| Same database and credentials, only enable certificate-verified TLS | Connect 1,605 ms; subsequent SELECT 1 queries 76 / 106 / 56 ms | Provider accepts TLS; successful queries disprove the hypothesis that it is simply unavailable |
| New automatic TiDB configuration                                    | Verified TLS, connect 1,582 ms; SELECT 1 90 ms                 | Confirmed fix works in the probe environment                                                   |

These results include network latency from the test machine. They are not a production API benchmark and do not establish the Vercel Function region.

## Why it slipped through

The original database configuration test covered explicit `sslaccept=strict` and local MySQL, but omitted a TiDB Cloud URL without SSL options. Local tests could pass even though a copied cloud connection URL selected a different TLS mode.

## Validation

- Unit suite: 18 groups passed, including URL normalization/TLS defaults, hostname-boundary protection, snapshot/user scoping, and success/failure timing collection.
- Read regression test uses a fake transaction client and checks one state read plus five user-scoped collection reads. It performs no SQL writes.
- Lint has no errors; existing internal-navigation warnings remain outside this change.
- Production build and TypeScript checks run with `npm run build`; no migration is executed by that command.
- No production accounts or transactions were created for browser tests. Full authenticated production performance remains to be measured after deployment.

## Deployment and follow-up

Deploy this source to Vercel. Check that the finance response includes `X-MoneyFlow-Region: sin1`, then inspect `Server-Timing` in DevTools. If the request remains slow, collect the stage durations and Vercel Runtime Logs; do not assume the SQL stage is responsible when session timing is high. No private finance payload is needed for diagnostics.

Sources: [TiDB TLS requirements](https://docs.pingcap.com/tidbcloud/connect-to-tidb-cluster-serverless/), [Vercel Function regions](https://vercel.com/docs/functions/configuring-functions/region).
