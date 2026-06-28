import { filterPublishedPosts, isNewsPublished } from './publishedNews';

const vnDayFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Bài đăng trong N ngày gần nhất (tính theo ngày VN, mặc định 7). */
export function isNewsRecent(pubDate: Date, now = new Date(), withinDays = 7): boolean {
  const tz = 'Asia/Ho_Chi_Minh';
  const dayKey = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: tz });
  const parse = (key: string) => {
    const [y, m, day] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, day);
  };
  const diffDays = (parse(dayKey(now)) - parse(dayKey(pubDate))) / 86_400_000;
  return diffDays >= 0 && diffDays < withinDays;
}

/** Hiển thị ngày đăng theo giờ VN, ví dụ: 1 thg 7, 2026 */
export function formatNewsDate(pubDate: Date): string {
  return vnDayFormatter.format(pubDate);
}

export function sortPublishedNews<T extends { data: { pubDate: Date; lang?: string } }>(
  posts: T[],
  lang = 'vi',
  now = new Date(),
): T[] {
  return filterPublishedPosts(posts, now)
    .filter((p) => p.data.lang === lang)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export { filterPublishedPosts, isNewsPublished };
