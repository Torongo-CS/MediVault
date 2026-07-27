// src/lib/theme.svelte.ts
class ThemeSystem {
  currentTheme = $state('theme-1');
  isDarkMode = $state(false);

  constructor() {
    if (typeof window !== 'undefined') {
      this.currentTheme = localStorage.getItem('user-canvas-theme') || 'theme-1';
      this.isDarkMode = localStorage.getItem('user-dark-mode') === 'true';
    }
  }

  changeTheme(newTheme: string) {
    this.currentTheme = newTheme;
    localStorage.setItem('user-canvas-theme', newTheme);

    // CRITICAL: Instantly apply the changes to the DOM before Svelte even schedules a redraw
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      html.setAttribute('data-theme', newTheme);
      
      // Force-lock the dark mode based on our store state
      if (this.isDarkMode) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('user-dark-mode', String(this.isDarkMode));

    if (typeof document !== 'undefined') {
      if (this.isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }
}

export const themeManager = new ThemeSystem();