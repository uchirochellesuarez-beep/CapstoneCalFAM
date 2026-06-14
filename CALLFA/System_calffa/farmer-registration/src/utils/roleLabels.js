const ROLE_LABELS = {
  farmer: 'Farmer',
  admin: 'Admin',
  treasurer: 'Treasurer',
  president: 'President',
  auditor: 'Auditor',
  operator: 'Operator',
  agriculturist: 'Agriculturist',
  operation_manager: 'Op. Manager',
  business_manager: 'Bus. Manager',
}

export function formatMemberRole(role) {
  if (!role) return '—'
  if (ROLE_LABELS[role]) return ROLE_LABELS[role]
  return String(role)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
