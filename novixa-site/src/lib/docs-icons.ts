export function navIcon(index: number): string {
  const icons = [
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3h8v18H8zM8 8h8M8 13h8"/></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3 19c1-3 3.5-4.5 6-4.5S14 16 15 19M14 16.5c1.5-.7 3-.7 4.5 0 .7 1.2 1 2 1 2.5"/></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h5"/></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16v12H4zM8 7V5h8v2"/><path d="M8 12h8M8 15h5"/></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z"/></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V5h4l2 3h10v11H4z"/><path d="M8 14h6"/></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4h10v16H7zM10 8h4M10 12h4M10 16h3"/></svg>`,
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6h12v14H6z"/><path d="M9 10l2 2 4-4"/></svg>`,
  ];
  return icons[Math.min(index, icons.length - 1)];
}

export function cardIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h8l5 5v15H7V2zm8 1.5V8h4.5L15 3.5z"/></svg>`;
}

export function benefitIcon(kind: string): string {
  const map: Record<string, string> = {
    shield: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3zm0 2.2L6 6.1v4.9c0 3.8 2.5 7.2 6 8.7 3.5-1.5 6-4.9 6-8.7V6.1l-6-1.9z"/></svg>`,
    book: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h11a2 2 0 012 2v14l-3-1.5L13 19l-3-1.5L7 19V5a2 2 0 012-2H6z"/></svg>`,
    download: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.2l3.5-3.5 1.4 1.4L12 17l-4.9-4.9 1.4-1.4L11 13.2V3h1zM5 19h14v2H5v-2z"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.4-7-10a4.2 4.2 0 017-3 4.2 4.2 0 017 3c0 5.6-7 10-7 10z"/></svg>`,
  };
  return map[kind] ?? map.shield;
}
