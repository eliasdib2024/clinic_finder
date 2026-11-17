import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cx } from '../../lib/format';

/** variant: primary | secondary | ghost | soft | danger | danger-soft · size: sm | md | lg */
export const Button = forwardRef(function Button({ variant = 'primary', size, block, icon: Icon, iconEnd: IconEnd, loading, to, className, children, type = 'button', disabled, ...rest }, ref) {
  const cls = cx('btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', !children && 'btn-icon', className);
  const content = (
    <>
      {loading ? <Loader2 className="spin" aria-hidden /> : Icon ? <Icon aria-hidden /> : null}
      {children}
      {IconEnd && !loading ? <IconEnd aria-hidden /> : null}
    </>
  );
  if (to) return <Link ref={ref} to={to} className={cls} {...rest}>{content}</Link>;
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
});
