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
      background: '#f1f1f1',
      color: '#111111',
      border: '1px solid rgba(0, 0, 0, 0.18)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {status}
    </span>
  );
}
