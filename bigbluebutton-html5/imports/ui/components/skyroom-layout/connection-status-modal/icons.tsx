import React from 'react';

type IconProps = {
  className?: string;
};

export const StatsTabIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
    <path
      d="M4 14V10M8 14V6M12 14V8M16 14V4"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

export const MyLogsTabIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
    <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M4.5 16.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

export const SessionLogsTabIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
    <circle cx="7" cy="7.5" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="13" cy="7.5" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M3.5 15.5c0-2.4 1.8-4 3.5-4M13 11.5c1.7 0 3.5 1.6 3.5 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const UploadIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M8 11V3M8 3L5.5 5.5M8 3L10.5 5.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M8 3v8M8 11L5.5 8.5M8 11l2.5-2.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const AudioIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect x="6" y="3" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M4 7.5a4 4 0 008 0M8 11.5v2"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

export const VideoIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect x="2.5" y="4.5" width="7.5" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M10 7l3.5-2v6L10 9"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

export const NetworkIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M3 11.5h10M5 8.5h6M7 5.5h2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="8" cy="12.5" r="1" fill="currentColor" />
  </svg>
);

export const CopyIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect x="5.5" y="5.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M4.5 10.5h-1a1.5 1.5 0 01-1.5-1.5v-6A1.5 1.5 0 013.5 1.5h6A1.5 1.5 0 0111 3v1"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

export const EmptyStateIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
    <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    <path
      d="M16 30c2.5-4 5.5-6 8-6s5.5 2 8 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.5"
    />
    <circle cx="24" cy="32" r="2" fill="currentColor" opacity="0.5" />
  </svg>
);
