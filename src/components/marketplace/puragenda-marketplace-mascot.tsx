type PuragendaMarketplaceMascotProps = {
  className?: string;
};

/**
 * Pura is a tiny calendar guide built from the same violet, pink and warm
 * cream palette used throughout Puragenda's public brand.
 */
export function PuragendaMarketplaceMascot({
  className,
}: PuragendaMarketplaceMascotProps) {
  return (
    <svg
      viewBox="0 0 280 250"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M35 166C13 116 42 51 100 31c57-20 131 2 153 59 21 54-7 118-61 141-57 24-134-8-157-65Z"
        fill="#B28DFF"
        stroke="#1A1E24"
        strokeWidth="5"
      />
      <path
        d="M211 39c11-20 28-16 29 2 18-9 30 5 18 19 17 8 12 25-7 24-1 19-19 23-28 6-15 12-29 0-20-16-19-5-23-22-5-28Z"
        fill="#FFB5E8"
        stroke="#1A1E24"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="m45 51 5 14 14 5-14 5-5 14-5-14-14-5 14-5 5-14Z"
        fill="#FFF5BA"
        stroke="#1A1E24"
        strokeLinejoin="round"
        strokeWidth="3.5"
      />

      <g transform="rotate(-4 137 134)">
        <path
          d="M74 90c0-13 10-23 23-23h85c13 0 23 10 23 23v93c0 13-10 23-23 23H97c-13 0-23-10-23-23V90Z"
          fill="#7C3AED"
          stroke="#1A1E24"
          strokeWidth="6"
        />
        <path
          d="M74 105h131v78c0 13-10 23-23 23H97c-13 0-23-10-23-23v-78Z"
          fill="#FFFAEB"
          stroke="#1A1E24"
          strokeWidth="6"
        />
        <path d="M105 58v23M173 58v23" stroke="#1A1E24" strokeLinecap="round" strokeWidth="9" />
        <circle cx="118" cy="145" r="5.5" fill="#1A1E24" />
        <circle cx="162" cy="145" r="5.5" fill="#1A1E24" />
        <path d="M122 169c11 10 25 10 36 0" fill="none" stroke="#1A1E24" strokeLinecap="round" strokeWidth="5" />
        <circle cx="101" cy="161" r="8" fill="#FFB5E8" opacity=".75" />
        <circle cx="179" cy="161" r="8" fill="#FFB5E8" opacity=".75" />
      </g>

      <path
        d="M79 173c-17 3-25 13-25 28"
        fill="none"
        stroke="#1A1E24"
        strokeLinecap="round"
        strokeWidth="6"
      />
      <path
        d="M196 169c13 1 21 8 26 19"
        fill="none"
        stroke="#1A1E24"
        strokeLinecap="round"
        strokeWidth="6"
      />
      <circle cx="226" cy="197" r="25" fill="#85E3FF" stroke="#1A1E24" strokeWidth="6" />
      <circle cx="226" cy="197" r="13" fill="#FFFAEB" stroke="#1A1E24" strokeWidth="4" />
      <path d="m244 216 15 16" stroke="#1A1E24" strokeLinecap="round" strokeWidth="9" />

      <path
        d="M84 205c-6 20 7 30 23 22M185 205c8 19-4 29-19 24"
        fill="none"
        stroke="#1A1E24"
        strokeLinecap="round"
        strokeWidth="6"
      />
    </svg>
  );
}
