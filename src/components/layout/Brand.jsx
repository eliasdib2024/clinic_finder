import { tx } from '../../lib/i18n';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/format';

export function BrandMark({ size = 34 }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 12.5h4l2-4.5 3.2 9 2.6-6.5 1.4 2h5.8" />
      </svg>
    </span>
  );
}

export function Brand({ to = '/', light, className }) {
  return (
    <Link to={to} className={cx('brand', light && 'light', className)} aria-label={tx('ClinicFinder home')}>
      <BrandMark />
      <span>ClinicFinder</span>
    </Link>
  );
}
