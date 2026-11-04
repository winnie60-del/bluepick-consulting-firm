import { COMPANY } from '../config/company';

export default function Logo({ light = false }) {
  return (
    <div className={`logo ${light ? 'light' : ''}`}>
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect x="2" y="2" width="14" height="14" rx="2" fill="#2f80ed" />
        <rect x="12" y="12" width="14" height="14" rx="2" fill="#7db4ff" opacity=".9" />
      </svg>
      <span><strong>Bluepick</strong><small>{COMPANY.short}</small></span>
    </div>
  );
}
