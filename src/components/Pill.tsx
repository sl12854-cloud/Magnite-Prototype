const TONE: Record<string, 'blue' | 'amber' | 'green' | 'red' | 'grey'> = {
  New: 'blue',
  Approved: 'blue',
  Assigned: 'amber',
  'In progress': 'amber',
  'Waiting on client': 'amber',
  'Awaiting approval': 'amber',
  Closed: 'green',
  Sent: 'green',
  'Needs review': 'red',
  'Changes requested': 'red',
  'In Marketo (draft)': 'green',
};

/** Status pill. Blue = new/approved, amber = in progress/awaiting, green = closed/sent, red = needs review. */
export function Pill({ status }: { status: string }) {
  return <span className={`pill pill-${TONE[status] ?? 'grey'}`}>{status}</span>;
}
