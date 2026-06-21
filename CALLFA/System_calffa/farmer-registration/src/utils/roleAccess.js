/** Officers who may apply for loans and book machinery (excludes agriculturist). */
export const OFFICER_LOAN_APPLICANT_ROLES = [
  'president',
  'treasurer',
  'auditor',
  'operator',
  'operation_manager',
  'business_manager'
]

export const MACHINERY_BOOKING_ROLES = ['farmer', ...OFFICER_LOAN_APPLICANT_ROLES]

export const canBookMachinery = (role) =>
  MACHINERY_BOOKING_ROLES.includes(String(role || '').toLowerCase())

export const canApplyOfficerLoan = (role) =>
  OFFICER_LOAN_APPLICANT_ROLES.includes(String(role || '').toLowerCase())

/** President verifies treasurer bookings; treasurer verifies everyone else. */
export const canVerifyMachineryPayment = (actorRole, bookerRole, actorId, bookerId) => {
  if (!actorRole || !bookerRole || actorId == null || bookerId == null) return false
  if (parseInt(actorId, 10) === parseInt(bookerId, 10)) return false

  const actor = String(actorRole).toLowerCase()
  const booker = String(bookerRole).toLowerCase()

  if (booker === 'treasurer') return actor === 'president'
  return actor === 'treasurer'
}
