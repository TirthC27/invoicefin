import { STATUS_COLOR } from './exporterUtils';

export default function StatusBadge({ status }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 11px',
      borderRadius: 50,
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.16)',
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {status}
    </span>
  );
}
