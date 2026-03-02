/**
 * Renderiza texto con URLs como enlaces clickeables.
 */
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function LinkableText({ text, className = '' }: { text: string; className?: string }) {
  if (!text || typeof text !== 'string') return null;

  const parts = text.split(URL_REGEX);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.match(URL_REGEX) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ecodelivery-green underline hover:text-ecodelivery-green-dark break-all"
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </span>
  );
}
