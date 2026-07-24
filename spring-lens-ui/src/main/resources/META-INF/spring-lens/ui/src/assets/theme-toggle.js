const THEME_STORAGE_KEY = 'spring-lens-theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

export default class ThemeToggle {
    init() {
        this.button = document.getElementById('theme-toggle');
        if (!this.button) {
            return;
        }

        this.applyTheme(this.getStoredTheme() || this.getPreferredTheme());
        this.button.addEventListener('click', () => this.toggle());
    }

    toggle() {
        this.applyTheme(document.documentElement.classList.contains(DARK_THEME) ? LIGHT_THEME : DARK_THEME);
    }

    applyTheme(theme) {
        const isDark = theme === DARK_THEME;
        const icon = this.button.querySelector('.theme-toggle-icon');

        document.documentElement.classList.toggle(DARK_THEME, isDark);
        this.button.setAttribute('aria-pressed', String(isDark));
        this.button.setAttribute('aria-label', `Switch to ${isDark ? LIGHT_THEME : DARK_THEME} mode`);
        this.button.setAttribute('title', `Switch to ${isDark ? LIGHT_THEME : DARK_THEME} mode`);
        icon.textContent = isDark ? 'light_mode' : 'dark_mode';
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    getStoredTheme() {
        return localStorage.getItem(THEME_STORAGE_KEY);
    }

    getPreferredTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
    }
}
