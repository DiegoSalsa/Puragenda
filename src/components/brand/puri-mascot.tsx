import type { SVGProps } from "react";

export type PuriVariant = "default" | "greeting" | "wave" | "thinking" | "attention" | "success";

type Props = SVGProps<SVGSVGElement> & {
  variant?: PuriVariant;
  compact?: boolean;
};

/** The same outlined silhouette is used at avatar and illustration sizes. */
export function PuriMascot({ variant = "default", compact = false, ...props }: Props) {
  const waving = variant === "greeting" || variant === "wave" || variant === "success";
  const thinking = variant === "thinking";
  const attentive = variant === "attention";
  const success = variant === "success";

  return (
    <svg viewBox={compact ? "8 -2 144 152" : "0 0 160 160"} fill="none" aria-hidden="true" focusable="false" {...props}>
      <path d="M83 38 C87 25 96 16 107 13" stroke="#171717" strokeWidth="5" strokeLinecap="round" />
      <path d="M83 38 C87 25 96 16 107 13" stroke="#9B70FF" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="111" cy="13" r="10" fill="#FFD84D" stroke="#171717" strokeWidth="4" />
      <circle cx="115" cy="9" r="3" fill="white" />

      {!compact && <>
        <path d="M49 124 C40 129 37 138 41 143 C47 149 62 147 67 139 L67 127" fill="#A980FA" stroke="#171717" strokeWidth="4" strokeLinejoin="round" />
        <path d="M92 127 L93 139 C98 148 113 149 119 143 C123 138 120 130 111 124" fill="#A980FA" stroke="#171717" strokeWidth="4" strokeLinejoin="round" />
        <path d="M30 83 C15 78 9 91 13 107 C15 117 23 125 34 121 C42 118 43 108 39 99" fill="#AE87FA" stroke="#171717" strokeWidth="4" strokeLinejoin="round" />
        {waving ? (
          <path d="M128 83 C140 75 143 62 149 62 C156 63 157 78 151 90 C146 101 138 105 125 105" fill="#AE87FA" stroke="#171717" strokeWidth="4" strokeLinejoin="round" />
        ) : thinking ? (
          <path d="M125 91 C135 87 143 92 144 102 C144 112 134 117 123 112" fill="#AE87FA" stroke="#171717" strokeWidth="4" strokeLinejoin="round" />
        ) : (
          <path d="M127 82 C139 79 147 87 146 99 C145 110 137 118 126 115" fill="#AE87FA" stroke="#171717" strokeWidth="4" strokeLinejoin="round" />
        )}
      </>}

      <path d="M79 34 C112 34 136 54 138 83 C141 113 121 135 82 138 C44 141 23 122 22 92 C21 57 43 35 79 34Z" fill="#FFF9FF" stroke="#171717" strokeWidth="4.5" />
      <path d="M47 93 C48 66 65 52 87 51 C111 50 126 65 126 87 C127 106 114 117 89 119 C61 122 46 113 47 93Z" fill="#E9D8FF" stroke="#B98BFF" strokeWidth="3.5" />
      <path d="M57 69 C66 59 81 56 96 59" stroke="white" strokeWidth="5" strokeLinecap="round" opacity=".8" />
      <ellipse cx="60" cy="101" rx="9" ry="5" fill="#FFB5D5" opacity=".8" />
      <ellipse cx="112" cy="100" rx="9" ry="5" fill="#FFB5D5" opacity=".8" />

      {attentive ? <>
        <circle cx="70" cy="84" r="7" fill="#171717" />
        <circle cx="106" cy="84" r="7" fill="#171717" />
        <circle cx="72" cy="81" r="2.3" fill="white" />
        <circle cx="108" cy="81" r="2.3" fill="white" />
        <circle cx="88" cy="99" r="4" fill="#171717" />
      </> : thinking ? <>
        <path d="M62 85 C66 79 72 79 77 85" stroke="#171717" strokeWidth="4" strokeLinecap="round" />
        <circle cx="106" cy="84" r="7" fill="#171717" />
        <circle cx="108" cy="81" r="2.3" fill="white" />
        <path d="M84 103 C89 99 95 99 100 102" stroke="#171717" strokeWidth="4" strokeLinecap="round" />
      </> : success ? <>
        <path d="M61 84 C66 78 73 78 78 84 M98 84 C103 78 110 78 115 84" stroke="#171717" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M78 97 C81 110 96 113 103 97 C96 101 85 101 78 97Z" fill="#171717" stroke="#171717" strokeWidth="3" strokeLinejoin="round" />
        <path d="M84 104 C89 101 95 102 98 105" stroke="#FFB5D5" strokeWidth="4" strokeLinecap="round" />
      </> : <>
        <ellipse cx="70" cy="84" rx="7" ry="8" fill="#171717" />
        <circle cx="72" cy="80" r="2.3" fill="white" />
        {waving ? <path d="M99 84 C104 78 111 78 115 84" stroke="#171717" strokeWidth="4.5" strokeLinecap="round" /> : <>
          <ellipse cx="106" cy="84" rx="7" ry="8" fill="#171717" />
          <circle cx="108" cy="80" r="2.3" fill="white" />
        </>}
        <path d="M80 97 C83 107 96 108 101 97 C94 100 87 100 80 97Z" fill="#171717" stroke="#171717" strokeWidth="3" strokeLinejoin="round" />
        <path d="M86 102 C90 100 95 101 98 103" stroke="#FFB5D5" strokeWidth="3" strokeLinecap="round" />
      </>}

      {!compact && <>
        <path d="M145 47 L150 37 M150 53 L156 50" stroke="#7C3AED" strokeWidth="4" strokeLinecap="round" opacity={waving ? 1 : 0} />
        {thinking && <path d="M135 46 C139 39 149 42 149 47 C149 51 144 51 143 56 M143 61 L143 62" stroke="#7C3AED" strokeWidth="3.5" strokeLinecap="round" />}
        {attentive && <path d="M144 48 L146 40 M149 52 L155 48" stroke="#FFD84D" strokeWidth="4" strokeLinecap="round" />}
      </>}
    </svg>
  );
}
