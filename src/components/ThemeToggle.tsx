import { useTheme } from '@/hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="group relative flex items-center space-x-2 px-4 py-3 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 dark:from-blue-600 dark:to-purple-700 hover:from-yellow-500 hover:to-orange-600 dark:hover:from-blue-700 dark:hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-yellow-300 dark:border-blue-400 focus:outline-none focus:ring-4 focus:ring-yellow-200 dark:focus:ring-blue-300 focus:ring-opacity-75"
      title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
    >
      <div className="relative w-6 h-6 overflow-hidden flex-shrink-0">
        {/* Sun Icon */}
        <div className={`absolute inset-0 transform transition-all duration-500 ${
          theme === 'light' ? 'rotate-0 scale-100 opacity-100' : 'rotate-180 scale-0 opacity-0'
        }`}>
          <svg
            className="w-6 h-6 text-white drop-shadow-sm"
            fill="currentColor"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
        
        {/* Moon Icon */}
        <div className={`absolute inset-0 transform transition-all duration-500 ${
          theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-180 scale-0 opacity-0'
        }`}>
          <svg
            className="w-6 h-6 text-white drop-shadow-sm"
            fill="currentColor"
            stroke="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        </div>
      </div>
      
      {/* Text Label */}
      <span className="text-sm font-bold text-white drop-shadow-sm">
        {theme === 'light' ? 'ダーク' : 'ライト'}
      </span>
    </button>
  );
}