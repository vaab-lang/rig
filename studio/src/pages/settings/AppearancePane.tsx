import { useStudio } from '@/lib/studio-context'
import type { NavMode, ThemeMode } from '@/lib/prefs'

export function AppearancePane() {
  const { navMode, setNavMode, theme, setTheme } = useStudio()

  return (
    <div className="grid max-w-md gap-4">
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Theme</legend>
        {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => (
          <label key={mode} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="theme-mode"
              checked={theme === mode}
              onChange={() => setTheme(mode)}
              className="accent-primary"
            />
            {mode}
          </label>
        ))}
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Nav mode</legend>
        {(['icons', 'full'] as NavMode[]).map((mode) => (
          <label key={mode} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="nav-mode"
              checked={navMode === mode}
              onChange={() => setNavMode(mode)}
              className="accent-primary"
            />
            {mode}
          </label>
        ))}
      </fieldset>
    </div>
  )
}
