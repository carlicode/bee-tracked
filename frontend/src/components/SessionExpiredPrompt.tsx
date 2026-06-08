interface SessionExpiredPromptProps {
  message?: string;
  onRelogin: () => void;
  theme?: 'ecodelivery' | 'beezero';
}

export function SessionExpiredPrompt({
  message = 'Sesión inválida o expirada. Por favor inicia sesión nuevamente.',
  onRelogin,
  theme = 'ecodelivery',
}: SessionExpiredPromptProps) {
  const accent =
    theme === 'beezero'
      ? 'bg-beezero-yellow text-black hover:bg-beezero-yellow-dark'
      : 'bg-ecodelivery-green text-white hover:bg-ecodelivery-green-dark';

  return (
    <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6 text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>
      <p className="text-gray-800 font-medium leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onRelogin}
        className={`w-full px-6 py-4 rounded-lg transition font-bold text-lg ${accent}`}
      >
        Iniciar sesión nuevamente
      </button>
    </div>
  );
}
