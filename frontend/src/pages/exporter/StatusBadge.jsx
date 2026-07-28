import { STATUS_COLOR } from './exporterUtils';

export default function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || '#A0A0A8';
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11.5,
      fontWeight: 600,
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}
