import React from 'react';
import { getSkyroomFileTypeKind, SkyroomFileTypeKind } from './fileTypeKind';

type Props = {
  filename?: string | null;
  kind?: SkyroomFileTypeKind;
  className?: string;
  size?: number;
};

const Glyph: React.FC<{ kind: SkyroomFileTypeKind }> = ({ kind }) => {
  switch (kind) {
    case 'pdf':
      return (
        <>
          <path
            d="M6.2 2.4h5.1L14.6 5.7v9.1a1.2 1.2 0 01-1.2 1.2H6.2A1.2 1.2 0 015 14.8V3.6a1.2 1.2 0 011.2-1.2z"
            fill="currentColor"
            opacity="0.22"
          />
          <path
            d="M11.2 2.5v2.6c0 .55.45 1 1 1h2.3"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M6.2 2.4h5.1L14.6 5.7v9.1a1.2 1.2 0 01-1.2 1.2H6.2A1.2 1.2 0 015 14.8V3.6a1.2 1.2 0 011.2-1.2z"
            stroke="currentColor"
            strokeWidth="1.35"
            fill="none"
          />
          <path
            d="M7.1 10.2c.9-2.1 1.7-3.3 2.4-3.3.5 0 .6.7.3 2.1-.3 1.5-.1 2.5.5 2.5.7 0 1.5-1.1 2.3-3.2"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    case 'audio':
      return (
        <>
          <circle cx="10" cy="10" r="7.1" fill="currentColor" opacity="0.18" />
          <path
            d="M8.2 7.1v5.1a1.35 1.35 0 11-1.2-.2V8.7l5.2-1.2v4.2a1.35 1.35 0 11-1.2-.2V6.2L8.2 7.1z"
            fill="currentColor"
          />
        </>
      );
    case 'video':
      return (
        <>
          <rect x="3.2" y="4.4" width="13.6" height="11.2" rx="2.2" fill="currentColor" opacity="0.18" />
          <rect
            x="3.2"
            y="4.4"
            width="13.6"
            height="11.2"
            rx="2.2"
            stroke="currentColor"
            strokeWidth="1.35"
            fill="none"
          />
          <path d="M8.4 7.3v5.4L13.2 10 8.4 7.3z" fill="currentColor" />
        </>
      );
    case 'image':
      return (
        <>
          <rect x="3.4" y="4.2" width="13.2" height="11.6" rx="2" fill="currentColor" opacity="0.18" />
          <rect
            x="3.4"
            y="4.2"
            width="13.2"
            height="11.6"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.35"
            fill="none"
          />
          <circle cx="7.6" cy="8.1" r="1.25" fill="currentColor" />
          <path
            d="M4.8 14.2l3.4-3.5 2.2 2.1 2.5-2.7 2.3 4.1H4.8z"
            fill="currentColor"
          />
        </>
      );
    case 'word':
      return (
        <>
          <path
            d="M5.4 2.6h6.4L15 5.8v9.4a1.2 1.2 0 01-1.2 1.2H5.4A1.2 1.2 0 014.2 15.2V3.8a1.2 1.2 0 011.2-1.2z"
            fill="currentColor"
            opacity="0.18"
          />
          <path
            d="M5.4 2.6h6.4L15 5.8v9.4a1.2 1.2 0 01-1.2 1.2H5.4A1.2 1.2 0 014.2 15.2V3.8a1.2 1.2 0 011.2-1.2z"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
          />
          <path
            d="M6.6 7.4l1.3 5.2 1.4-3.5 1.4 3.5 1.3-5.2"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      );
    case 'excel':
      return (
        <>
          <rect x="3.6" y="3.4" width="12.8" height="13.2" rx="2" fill="currentColor" opacity="0.18" />
          <rect
            x="3.6"
            y="3.4"
            width="12.8"
            height="13.2"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
          />
          <path d="M10 4.2v11.6M4.4 8.2h11.2M4.4 12.2h11.2" stroke="currentColor" strokeWidth="1.25" />
        </>
      );
    case 'powerpoint':
      return (
        <>
          <rect x="3.4" y="4" width="13.2" height="12" rx="2" fill="currentColor" opacity="0.18" />
          <rect
            x="3.4"
            y="4"
            width="13.2"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
          />
          <path
            d="M7.2 7.1h2.4a2 2 0 010 4H7.2V7.1zm0 5.8V12"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      );
    case 'text':
      return (
        <>
          <path
            d="M5.6 2.5h6.2L15 5.7v9.3a1.2 1.2 0 01-1.2 1.2H5.6A1.2 1.2 0 014.4 15V3.7a1.2 1.2 0 011.2-1.2z"
            fill="currentColor"
            opacity="0.18"
          />
          <path
            d="M5.6 2.5h6.2L15 5.7v9.3a1.2 1.2 0 01-1.2 1.2H5.6A1.2 1.2 0 014.4 15V3.7a1.2 1.2 0 011.2-1.2z"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
          />
          <path
            d="M7 9.1h6M7 11.6h4.4M7 6.6h3.2"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </>
      );
    default:
      return (
        <>
          <path
            d="M5.8 2.4h5.4L14.8 6v8.8a1.2 1.2 0 01-1.2 1.2H5.8A1.2 1.2 0 014.6 14.8V3.6a1.2 1.2 0 011.2-1.2z"
            fill="currentColor"
            opacity="0.18"
          />
          <path
            d="M11.1 2.5v2.8c0 .55.45 1 1 1h2.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M5.8 2.4h5.4L14.8 6v8.8a1.2 1.2 0 01-1.2 1.2H5.8A1.2 1.2 0 014.6 14.8V3.6a1.2 1.2 0 011.2-1.2z"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
          />
        </>
      );
  }
};

const SkyroomFileTypeIcon: React.FC<Props> = ({
  filename,
  kind: kindProp,
  className,
  size = 20,
}) => {
  const kind = kindProp || getSkyroomFileTypeKind(filename);

  return (
    <span
      className={['skyroom-file-type-icon', `skyroom-file-type-icon--${kind}`, className]
        .filter(Boolean)
        .join(' ')}
      data-skyroom-file-type={kind}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 20 20" width={size} height={size} fill="none" focusable="false">
        <Glyph kind={kind} />
      </svg>
    </span>
  );
};

export const getSkyroomFileTypeMenuIcon = (filename?: string | null) => ({
  svgContent: <SkyroomFileTypeIcon filename={filename} size={18} />,
});

export default SkyroomFileTypeIcon;
