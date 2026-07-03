import { EDITORIAL_HUB, EDITORIAL_PLAN, getUpcomingPlan } from './lib/news-content-plan.mjs';

const upcoming = getUpcomingPlan();

console.log(`=== ${EDITORIAL_HUB.name} ===`);
console.log(`Lịch: ${EDITORIAL_HUB.startDate} → ${EDITORIAL_HUB.endDate}`);
console.log(`Tổng kế hoạch: ${EDITORIAL_PLAN.length} bài`);
console.log(`Sắp tới: ${upcoming.length} bài\n`);

for (const item of upcoming.slice(0, 12)) {
  console.log(`${item.publishDate}  [${item.id}]  ${item.title}`);
}

if (upcoming.length > 12) {
  console.log(`… và ${upcoming.length - 12} bài nữa`);
}
