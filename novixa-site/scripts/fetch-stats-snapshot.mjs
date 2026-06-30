/**
 * Fetch Cloudflare zone analytics at build time → public/stats-snapshot.json
 * Uses process.env on Cloudflare Pages build (CF_ZONE_ID, CLOUDFLARE_API_TOKEN).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outPath = join(root, 'public', 'stats-snapshot.json');

const STATS_QUERY = `
query NovixaStats($zoneTag: String!, $hStart: Time!, $hEnd: Time!, $dStart: Date!, $dEnd: Date!) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      hours: httpRequests1hGroups(
        orderBy: [datetime_ASC]
        limit: 48
        filter: { datetime_geq: $hStart, datetime_lt: $hEnd }
      ) {
        dimensions { datetime }
        uniq { uniques }
        sum { requests }
      }
      hourTotal: httpRequests1hGroups(
        limit: 1
        filter: { datetime_geq: $hStart, datetime_lt: $hEnd }
      ) {
        uniq { uniques }
        sum { requests, pageViews }
      }
      days: httpRequests1dGroups(
        orderBy: [date_ASC]
        limit: 7
        filter: { date_geq: $dStart, date_lt: $dEnd }
      ) {
        dimensions { date }
        uniq { uniques }
        sum { requests, pageViews }
      }
      topPages: httpRequestsAdaptiveGroups(
        limit: 10
        orderBy: [count_DESC]
        filter: {
          datetime_geq: $hStart
          datetime_lt: $hEnd
          requestSource: "eyeball"
        }
      ) {
        count
        dimensions { clientRequestPath }
      }
    }
  }
}
`;

function vnDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function writeSnapshot(payload) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function fetchStats() {
  const zoneId = process.env.CF_ZONE_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!zoneId || !token) {
    writeSnapshot({
      ok: false,
      error:
        'Chưa có CF_ZONE_ID hoặc CLOUDFLARE_API_TOKEN lúc build. Thêm trên Cloudflare Pages → Variables and secrets → Retry deployment.',
      generatedAt: new Date().toISOString(),
    });
    console.warn('fetch-stats-snapshot: skipped (missing CF_ZONE_ID or CLOUDFLARE_API_TOKEN)');
    return;
  }

  const now = new Date();
  const hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const today = vnDateString(now);
  const dStart = addDays(today, -6);
  const dEnd = addDays(today, 1);

  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: STATS_QUERY,
      variables: {
        zoneTag: zoneId,
        hStart: hStart.toISOString(),
        hEnd: now.toISOString(),
        dStart,
        dEnd,
      },
    }),
  });

  if (!res.ok) {
    writeSnapshot({
      ok: false,
      error: `Cloudflare API HTTP ${res.status}`,
      generatedAt: now.toISOString(),
    });
    console.warn(`fetch-stats-snapshot: HTTP ${res.status}`);
    return;
  }

  const payload = await res.json();
  if (payload.errors?.length) {
    writeSnapshot({
      ok: false,
      error: payload.errors.map((e) => e.message).join('; '),
      generatedAt: now.toISOString(),
    });
    console.warn('fetch-stats-snapshot:', payload.errors[0]?.message);
    return;
  }

  const zone = payload.data?.viewer?.zones?.[0];
  if (!zone) {
    writeSnapshot({
      ok: false,
      error: 'Không tìm thấy zone — kiểm tra CF_ZONE_ID.',
      generatedAt: now.toISOString(),
    });
    return;
  }

  const hourTotal = zone.hourTotal?.[0];
  const todayRow = zone.days?.find((row) => row.dimensions?.date === today);

  writeSnapshot({
    ok: true,
    generatedAt: now.toISOString(),
    timezone: 'Asia/Ho_Chi_Minh',
    summary: {
      todayVisitors: todayRow?.uniq?.uniques ?? 0,
      todayPageViews: todayRow?.sum?.pageViews ?? 0,
      todayRequests: todayRow?.sum?.requests ?? 0,
      last24hVisitors: hourTotal?.uniq?.uniques ?? 0,
      last24hPageViews: hourTotal?.sum?.pageViews ?? 0,
      last24hRequests: hourTotal?.sum?.requests ?? 0,
    },
    hourly: (zone.hours ?? []).map((row) => ({
      time: row.dimensions?.datetime ?? '',
      visitors: row.uniq?.uniques ?? 0,
      requests: row.sum?.requests ?? 0,
    })),
    daily: (zone.days ?? []).map((row) => ({
      date: row.dimensions?.date ?? '',
      visitors: row.uniq?.uniques ?? 0,
      pageViews: row.sum?.pageViews ?? 0,
      requests: row.sum?.requests ?? 0,
    })),
    topPages: (zone.topPages ?? []).map((row) => ({
      path: row.dimensions?.clientRequestPath ?? '/',
      views: row.count ?? 0,
    })),
  });
  console.log('fetch-stats-snapshot: wrote', outPath);
}

fetchStats().catch((err) => {
  writeSnapshot({
    ok: false,
    error: err instanceof Error ? err.message : 'Unknown error',
    generatedAt: new Date().toISOString(),
  });
  console.warn('fetch-stats-snapshot failed:', err);
});
