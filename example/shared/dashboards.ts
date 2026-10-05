// A convention of this example project, not something @hash wires up: the dashboards that should
// show in the top bar's switcher. Leave one out (like `hello`, a small kiosk panel) and it stays
// reachable by URL but never shows in the switcher.
export const switchableDashboards = [
  { id: 'home', title: 'Home' },
  { id: 'second-floor', title: '2nd Floor' },
  { id: 'kitchen', title: 'Kitchen' },
];
