import { tx } from '../../lib/i18n';
import { forwardRef, useId, useState, cloneElement, isValidElement } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cx } from '../../lib/format';

const tr = (v) => (typeof v === 'string' ? tx(v) : v);

/** Label + control + hint + inline error, wired with aria attributes. */
export function Field({ label, hint, error, required, children, className, aside, id: idProp }) {
  const auto = useId();
  const id = idProp || `f${auto.replace(/:/g, '')}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, { id: children.props.id || id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy, 'aria-required': required || undefined })
    : children;
  return (
    <div className={cx('field', className)}>
      {label && (
        <div className="field-label">
          <span><label htmlFor={children?.props?.id || id}>{tr(label)}</label>{required && <span aria-hidden="true" style={{ color: 'var(--rose)' }}> *</span>}</span>
          {aside}
        </div>
      )}
      {control}
      {hint && !error && <span id={`${id}-hint`} className="field-hint">{tr(hint)}</span>}
      {error && <span id={`${id}-err`} className="field-error" role="alert"><AlertCircle aria-hidden />{tr(error)}</span>}
    </div>
  );
}

export const Input = forwardRef(function Input({ icon: Icon, className, trailing, ...props }, ref) {
  if (!Icon && !trailing) return <input ref={ref} className={cx('input', className)} {...props} />;
  return (
    <div className="input-wrap">
      {Icon && <Icon className="lead" aria-hidden />}
      <input ref={ref} className={cx('input', Icon && 'has-lead', className)} {...props} style={trailing ? { paddingInlineEnd: 46, ...props.style } : props.style} />
      {trailing && <span className="trail">{trailing}</span>}
    </div>
  );
});

export const PasswordInput = forwardRef(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <Input ref={ref} type={show ? 'text' : 'password'} {...props}
      trailing={<button type="button" className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setShow((s) => !s)} aria-label={show ? tx('Hide password') : tx('Show password')}>{show ? <EyeOff /> : <Eye />}</button>} />
  );
});

export const Select = forwardRef(function Select({ options = [], placeholder, className, ...props }, ref) {
  return (
    <select ref={ref} className={cx('select', className)} {...props}>
      {placeholder !== undefined && <option value="">{tr(placeholder)}</option>}
      {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{tx(o)}</option> : <option key={o.value ?? o.id} value={o.value ?? o.id} disabled={o.disabled}>{tx(o.label ?? o.name)}</option>))}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cx('textarea', className)} {...props} />;
});

export function Checkbox({ label, className, ...props }) {
  return (
    <label className={cx('check', className)}>
      <input type="checkbox" {...props} />
      <span>{tr(label)}</span>
    </label>
  );
}

export function Radio({ label, ...props }) {
  return (
    <label className="check">
      <input type="radio" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Switch({ checked, onChange, label, description, disabled, id }) {
  const auto = useId();
  const lid = id || `sw${auto.replace(/:/g, '')}`;
  return (
    <div className="switch" style={{ justifyContent: 'space-between', width: '100%' }}>
      {label && (
        <label htmlFor={lid} style={{ cursor: 'pointer' }}>
          <div className="strong" style={{ fontSize: 14 }}>{tr(label)}</div>
          {description && <div className="small muted">{tr(description)}</div>}
        </label>
      )}
      <button id={lid} type="button" role="switch" aria-checked={!!checked} className="switch-track" disabled={disabled} onClick={() => onChange(!checked)} />
    </div>
  );
}
