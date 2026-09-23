const icons:Record<string,string>={
  'dice-skin-production':'/skill-icons/dice-skin-production.webp',
  'designing-ranked-medals':'/skill-icons/designing-ranked-medals.webp',
  'figma-fundesign-naming':'/skill-icons/figma-fundesign-naming.webp',
  'board-splitter':'/skill-icons/board-splitter.webp',
};

export function skillIcon(slug:string){return icons[slug]||null}
