/**
 * Translate stored English notification title/message for display.
 * DB rows stay English; UI maps by notification_type (+ message patterns).
 */

function typeOf(notification) {
  return String(notification?.notification_type || '').toLowerCase()
}

function extractBookingId(title) {
  const match = String(title || '').match(/Booking\s*#\s*(\d+)/i)
  return match ? match[1] : null
}

function stripBookingSuffix(title) {
  return String(title || '').replace(/\s*[—\-]\s*Booking\s*#\s*\d+\s*$/i, '').trim()
}

function parseCollectibleMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^Rental completed for (.+) \((.+)\)\. Accounts receivable:\s*(₱[\d,]+\.\d{2})\.?$/i
  )
  if (!match) return null
  return { farmer: match[1].trim(), machinery: match[2].trim(), amount: match[3].trim() }
}

function parseExpensePendingMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^Completed rental for (.+) \((.+)\) requires expense recording\. Transaction date:\s*(.+)\.?$/i
  )
  if (!match) return null
  return { machinery: match[1].trim(), farmer: match[2].trim(), date: match[3].trim() }
}

function parseAnnouncementPostedMessage(message) {
  const text = String(message || '')
  const match = text.match(/^(.+?)\s+posted:\s*(.+)$/i)
  if (!match) return null
  return { name: match[1].trim(), title: match[2].trim() }
}

function parseDownPaymentProofMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^(.+) submitted down payment proof for (.+) \((₱[\d,]+\.\d{2})\)\. Please verify\.?$/i
  )
  if (!match) return null
  return { farmer: match[1].trim(), machinery: match[2].trim(), amount: match[3].trim() }
}

function parseBalancePaymentProofMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^(.+) submitted (partial )?balance payment for (.+) \((₱[\d,]+\.\d{2})\)\. Please verify\.?$/i
  )
  if (!match) return null
  return {
    farmer: match[1].trim(),
    isPartial: Boolean(match[2]),
    machinery: match[3].trim(),
    amount: match[4].trim()
  }
}

function parseRefundRequestMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^(.+) requested a down payment refund for (.+) \((₱[\d,]+\.\d{2})\)\. Please review\.?$/i
  )
  if (!match) return null
  return { farmer: match[1].trim(), machinery: match[2].trim(), amount: match[3].trim() }
}

function parseConfirmBookingMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^Down payment verified for (.+) \((.+)\)\. Perform final confirmation for (.+)\.?$/i
  )
  if (!match) return null
  return { machinery: match[1].trim(), farmer: match[2].trim(), date: match[3].trim() }
}

function parseBookingApprovedMessage(message) {
  const text = String(message || '')
  let match = text.match(
    /^Your booking scheduled for (.+) has been approved and assigned to an operator\. Pay the treasurer after the service is completed\.?$/i
  )
  if (match) return { date: match[1].trim() }
  match = text.match(/^Your booking scheduled for (.+) has been approved\.?$/i)
  if (!match) return null
  return { date: match[1].trim() }
}

function parseDownPaymentRequiredMessage(message) {
  const text = String(message || '')
  let match = text.match(
    /^Your booking for (.+) is approved pending payment\. Pay ([\d.]+)% down \((₱[\d,]+\.\d{2})\) to reserve your slot\.?$/i
  )
  if (match) return { date: match[1].trim(), percent: match[2].trim(), amount: match[3].trim(), withAmount: true }
  match = text.match(
    /^Your booking for (.+) is approved pending payment\. Pay 20% down \((₱[\d,]+\.\d{2})\) to reserve your slot\.?$/i
  )
  if (match) return { date: match[1].trim(), percent: '20', amount: match[2].trim(), withAmount: true }
  match = text.match(
    /^Your booking for (.+) requires a(?: \d+%| 20%)? down payment before reservation\.?$/i
  )
  if (match) return { date: match[1].trim(), withAmount: false }
  return null
}

function parsePaymentRejectedMessage(message) {
  const text = String(message || '')
  let match = text.match(
    /^Your down payment was rejected\. Reason: (.+)\. Please resubmit payment proof\.?$/i
  )
  if (match) return { reason: match[1].trim() }
  if (/^Your down payment was rejected\. Please resubmit payment proof\.?$/i.test(text)) {
    return { reason: null }
  }
  return null
}

function parseBookingConfirmedMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^Your machinery rental for (.+) is officially confirmed and reserved\.?$/i
  )
  if (!match) return null
  return { date: match[1].trim() }
}

function parseBookingRejectedMessage(message) {
  const text = String(message || '')
  let match = text.match(
    /^Your booking scheduled for (.+) was rejected\. Reason: (.+)$/i
  )
  if (match) return { date: match[1].trim(), reason: match[2].trim() }
  match = text.match(/^Your booking scheduled for (.+) was rejected\.?$/i)
  if (match) return { date: match[1].trim(), reason: null }
  return null
}

function parseBookingExpiredMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^Your booking scheduled for (.+) expired because the scheduled date has already passed\.?$/i
  )
  if (!match) return null
  return { date: match[1].trim() }
}

function parseOperatorAssignedMessage(message) {
  const text = String(message || '')
  let match = text.match(
    /^A booking for (.+) on (.+) has been approved and assigned to you\.?$/i
  )
  if (!match) {
    match = text.match(
      /^A booking for (.+) on (.+) has been confirmed and assigned to you\.?$/i
    )
  }
  if (!match) return null
  return { machinery: match[1].trim(), date: match[2].trim() }
}

function parseOperatorUpdatedMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^The booking schedule for (.+) has been updated\. New date: (.+)\.?$/i
  )
  if (!match) return null
  return { machinery: match[1].trim(), date: match[2].trim() }
}

function parseOperatorCancelledMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^The booking for (.+) scheduled on (.+) has been cancelled\.?$/i
  )
  if (!match) return null
  return { machinery: match[1].trim(), date: match[2].trim() }
}

function parseOperatorIncomeMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^You received (₱[\d,]+\.\d{2}) labor compensation for (.+) \((.+)\)\.?$/i
  )
  if (!match) return null
  return { amount: match[1].trim(), machinery: match[2].trim(), date: match[3].trim() }
}

function parseIncomeSubmittedMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^(.+) submitted a farm income record\. Please review and mark as Eligible if qualified\.?$/i
  )
  if (!match) return null
  return { farmer: match[1].trim() }
}

function parseIncomeEligibleMessage(message) {
  const text = String(message || '')
  const match = text.match(
    /^(.+) is now eligible\. Please allocate fertilizer and seeds assistance\.?$/i
  )
  if (!match) return null
  return { farmer: match[1].trim() }
}

function bookingTitle(baseKey, bookingKey, bookingId, t) {
  if (bookingId) return t(`header.notif.${bookingKey}`, { id: bookingId })
  return t(`header.notif.${baseKey}`)
}

function machineFromTitle(title, suffixRe) {
  const cleaned = stripBookingSuffix(title)
  const match = cleaned.match(suffixRe)
  return match ? match[1].trim() : null
}

export function formatNotificationTitle(notification, t) {
  const type = typeOf(notification)
  const title = String(notification?.title || '')
  const bookingId = extractBookingId(title)

  if (type === 'announcement_posted' || /^New Announcement Posted$/i.test(title)) {
    return t('header.newAnnouncementPosted')
  }

  if (type === 'treasurer_collectible_created' || /^New Collectible/i.test(title)) {
    return bookingTitle('newCollectible', 'newCollectibleBooking', bookingId, t)
  }

  if (type === 'treasurer_expense_pending' || /^Expense Entry Required/i.test(title)) {
    return bookingTitle('expenseEntryRequired', 'expenseEntryRequiredBooking', bookingId, t)
  }

  if (type === 'treasurer_down_payment_submitted' || /^Down Payment Proof$/i.test(title)) {
    return t('header.notif.downPaymentProof')
  }

  if (type === 'treasurer_down_payment_due' || /^Down Payment Due$/i.test(title)) {
    return t('header.notif.downPaymentDue')
  }

  if (type === 'treasurer_balance_payment_submitted') {
    const isPartial = /^Partial\b/i.test(title)
    return bookingTitle(
      isPartial ? 'partialPaymentProof' : 'balancePaymentProof',
      isPartial ? 'partialPaymentProofBooking' : 'balancePaymentProofBooking',
      bookingId,
      t
    )
  }

  if (type === 'treasurer_gcash_payment_submitted' || /^GCash Payment Proof/i.test(title)) {
    const txn = title.match(/GCash Payment Proof\s*[—\-]\s*(.+)$/i)
    if (txn) {
      const parts = txn[1].trim().split(/\s+/)
      const txnType = parts[0] || ''
      const ref = parts.slice(1).join(' ') || ''
      return t('header.notif.gcashPaymentProofTxn', { type: txnType, ref })
    }
    return t('header.notif.gcashPaymentProof')
  }

  if (type === 'gcash_payment_verified') {
    return t('header.notif.gcashVerified')
  }

  if (type === 'gcash_payment_rejected') {
    return t('header.notif.gcashRejected')
  }

  if (type === 'treasurer_refund_requested' || /^Refund Request/i.test(title)) {
    const refundMatch = title.match(/^Refund Request\s+(.+?)\s*[—\-]\s*Booking/i)
    const refundNumber = refundMatch ? refundMatch[1].trim() : ''
    if (bookingId && refundNumber) {
      return t('header.notif.refundRequestBooking', { number: refundNumber, id: bookingId })
    }
    if (bookingId) return t('header.notif.refundRequestBookingPlain', { id: bookingId })
    return t('header.notif.refundRequest')
  }

  if (type === 'booking_down_payment_required' && /^Confirm Booking$/i.test(title)) {
    return t('header.notif.confirmBooking')
  }

  if (type === 'booking_approved' || /Booking Approved$/i.test(title)) {
    const machine = machineFromTitle(title, /^(.+)\s+Booking Approved$/i)
    return machine
      ? t('header.notif.bookingApproved', { machinery: machine })
      : t('header.notif.bookingApprovedPlain')
  }

  if (type === 'booking_down_payment_required' || /Down Payment Required$/i.test(title)) {
    const machine = machineFromTitle(title, /^(.+)\s*[—\-]\s*Down Payment Required$/i)
    return machine
      ? t('header.notif.downPaymentRequired', { machinery: machine })
      : t('header.notif.downPaymentRequiredPlain')
  }

  if (type === 'booking_payment_rejected' || /Payment Rejected$/i.test(title)) {
    const machine = machineFromTitle(title, /^(.+)\s*[—\-]\s*Payment Rejected$/i)
    return machine
      ? t('header.notif.paymentRejected', { machinery: machine })
      : t('header.notif.paymentRejectedPlain')
  }

  if (type === 'booking_payment_verified' || /Down Payment Verified$/i.test(title)) {
    const machine = machineFromTitle(title, /^(.+)\s*[—\-]\s*Down Payment Verified$/i)
    return machine
      ? t('header.notif.downPaymentVerified', { machinery: machine })
      : t('header.notif.downPaymentVerifiedPlain')
  }

  if (type === 'booking_confirmed' || /Booking Confirmed$/i.test(title)) {
    const machine = machineFromTitle(title, /^(.+)\s+Booking Confirmed$/i)
    return machine
      ? t('header.notif.bookingConfirmed', { machinery: machine })
      : t('header.notif.bookingConfirmedPlain')
  }

  if (type === 'booking_rejected' || /Booking Rejected$/i.test(title)) {
    const machine = machineFromTitle(title, /^(.+)\s+Booking Rejected$/i)
    return machine
      ? t('header.notif.bookingRejected', { machinery: machine })
      : t('header.notif.bookingRejectedPlain')
  }

  if (type === 'booking_expired' || /Booking Expired$/i.test(title)) {
    const machine = machineFromTitle(title, /^(.+)\s+Booking Expired$/i)
    return machine
      ? t('header.notif.bookingExpired', { machinery: machine })
      : t('header.notif.bookingExpiredPlain')
  }

  if (type === 'operator_booking_assigned' || /Booking Assigned$/i.test(title)) {
    const machine = machineFromTitle(title, /^(.+)\s+Booking Assigned$/i)
    return machine
      ? t('header.notif.bookingAssigned', { machinery: machine })
      : t('header.notif.bookingAssignedPlain')
  }

  if (type === 'operator_booking_updated' || /Schedule Updated$/i.test(title)) {
    const machine = machineFromTitle(title, /^(.+)\s+Schedule Updated$/i)
    return machine
      ? t('header.notif.scheduleUpdated', { machinery: machine })
      : t('header.notif.scheduleUpdatedPlain')
  }

  if (type === 'operator_booking_cancelled' || /Booking Cancelled$/i.test(title)) {
    const machine = machineFromTitle(title, /^(.+)\s+Booking Cancelled$/i)
    return machine
      ? t('header.notif.bookingCancelled', { machinery: machine })
      : t('header.notif.bookingCancelledPlain')
  }

  if (type === 'operator_income_credited' || /^Income Credited/i.test(title)) {
    const machine = machineFromTitle(title, /^Income Credited\s*[—\-]\s*(.+)$/i)
    return machine
      ? t('header.notif.incomeCredited', { machinery: machine })
      : t('header.notif.incomeCreditedPlain')
  }

  if (type === 'assistance_allocated' || /Assistance Approved$/i.test(title)) {
    const match = title.match(/^(.+)\s+Assistance Approved$/i)
    const label = match ? match[1].trim() : ''
    return label
      ? t('header.notif.assistanceApproved', { label })
      : t('header.notif.assistanceApprovedPlain')
  }

  if (type === 'president_income_submitted' || /^Farm Income Submitted for Review$/i.test(title)) {
    return t('header.notif.incomeSubmittedReview')
  }

  if (type === 'agriculturist_income_eligible' || /^Eligible for Fertilizer and Seeds$/i.test(title)) {
    return t('header.notif.incomeEligibleAssistance')
  }

  if (type === 'income_rejected' || /^Farm Income Record Rejected$/i.test(title)) {
    return t('header.notif.incomeRejected')
  }

  return title
}

export function formatNotificationMessage(notification, t) {
  const type = typeOf(notification)
  const message = String(notification?.message || '')
  const farmerFallback = t('header.notif.aFarmer')
  const machineryFallback = t('header.notif.machinery')

  if (type === 'announcement_posted' || parseAnnouncementPostedMessage(message)) {
    const parsed = parseAnnouncementPostedMessage(message)
    if (parsed) {
      return t('header.announcementPostedBy', {
        name: parsed.name || t('header.anOfficer'),
        title: parsed.title
      })
    }
  }

  if (type === 'treasurer_collectible_created' || /^Rental completed for /i.test(message)) {
    const parsed = parseCollectibleMessage(message)
    if (parsed) {
      return t('header.notif.collectibleMsg', {
        farmer: parsed.farmer || farmerFallback,
        machinery: parsed.machinery || machineryFallback,
        amount: parsed.amount
      })
    }
  }

  if (type === 'treasurer_expense_pending' || /^Completed rental for /i.test(message)) {
    const parsed = parseExpensePendingMessage(message)
    if (parsed) {
      return t('header.notif.expensePendingMsg', {
        machinery: parsed.machinery || machineryFallback,
        farmer: parsed.farmer || farmerFallback,
        date: parsed.date
      })
    }
  }

  if (type === 'treasurer_down_payment_submitted') {
    const parsed = parseDownPaymentProofMessage(message)
    if (parsed) {
      return t('header.notif.downPaymentProofMsg', {
        farmer: parsed.farmer || farmerFallback,
        machinery: parsed.machinery || machineryFallback,
        amount: parsed.amount
      })
    }
  }

  if (type === 'treasurer_down_payment_due') {
    const text = String(message || '')
    const match = text.match(
      /^(.+?) must pay a ([\d.]+%\s+)?down payment of (₱[\d,]+\.\d{2}) for (.+?) \(booking date ([^)]+)\)/i
    )
    if (match) {
      return t('header.notif.downPaymentDueMsg', {
        farmer: match[1].trim(),
        percent: match[2] || '',
        amount: match[3].trim(),
        machinery: match[4].trim(),
        date: match[5].trim()
      })
    }
    return t('header.notif.downPaymentDueMsgPlain')
  }

  if (type === 'treasurer_balance_payment_submitted') {
    const parsed = parseBalancePaymentProofMessage(message)
    if (parsed) {
      return t(
        parsed.isPartial
          ? 'header.notif.partialBalancePaymentMsg'
          : 'header.notif.balancePaymentMsg',
        {
          farmer: parsed.farmer || farmerFallback,
          machinery: parsed.machinery || machineryFallback,
          amount: parsed.amount
        }
      )
    }
  }

  if (type === 'treasurer_gcash_payment_submitted') {
    const text = String(message || '')
    const match = text.match(/^(.+) submitted GCash payment proof for (.+) (.+)\. Please check/i)
    if (match) {
      return t('header.notif.gcashPaymentProofMsg', {
        farmer: match[1].trim(),
        type: match[2].trim(),
        ref: match[3].trim().replace(/\.$/, '')
      })
    }
  }

  if (type === 'gcash_payment_verified') {
    const text = String(message || '')
    const match = text.match(/Your GCash (.+) payment of (₱[\d,]+\.\d{2}) was confirmed\. Receipt (.+)\.?/i)
    if (match) {
      return t('header.notif.gcashVerifiedMsg', {
        type: match[1].trim(),
        amount: match[2].trim(),
        receipt: match[3].trim()
      })
    }
    return t('header.notif.gcashVerified')
  }

  if (type === 'gcash_payment_rejected') {
    const text = String(message || '')
    const withReason = text.match(/Your GCash (.+) payment proof was rejected\. Reason: (.+)\. You may/i)
    if (withReason) {
      return t('header.notif.gcashRejectedMsgReason', {
        type: withReason[1].trim(),
        reason: withReason[2].trim()
      })
    }
    const plain = text.match(/Your GCash (.+) payment proof was rejected/i)
    if (plain) {
      return t('header.notif.gcashRejectedMsg', { type: plain[1].trim() })
    }
    return t('header.notif.gcashRejected')
  }

  if (type === 'treasurer_refund_requested') {
    const parsed = parseRefundRequestMessage(message)
    if (parsed) {
      return t('header.notif.refundRequestMsg', {
        farmer: parsed.farmer || farmerFallback,
        machinery: parsed.machinery || machineryFallback,
        amount: parsed.amount
      })
    }
  }

  if (/^Down payment verified for /i.test(message) || (type === 'booking_down_payment_required' && parseConfirmBookingMessage(message))) {
    const parsed = parseConfirmBookingMessage(message)
    if (parsed) {
      return t('header.notif.confirmBookingMsg', {
        machinery: parsed.machinery || machineryFallback,
        farmer: parsed.farmer || farmerFallback,
        date: parsed.date
      })
    }
  }

  if (type === 'booking_approved') {
    const parsed = parseBookingApprovedMessage(message)
    if (parsed) return t('header.notif.bookingApprovedMsg', { date: parsed.date })
  }

  if (type === 'booking_down_payment_required') {
    const parsed = parseDownPaymentRequiredMessage(message)
    if (parsed?.withAmount) {
      return t('header.notif.downPaymentRequiredMsgAmount', {
        date: parsed.date,
        amount: parsed.amount,
        percent: parsed.percent || '20'
      })
    }
    if (parsed) return t('header.notif.downPaymentRequiredMsg', { date: parsed.date })
  }

  if (type === 'booking_payment_rejected') {
    const parsed = parsePaymentRejectedMessage(message)
    if (parsed?.reason) {
      return t('header.notif.paymentRejectedMsgReason', { reason: parsed.reason })
    }
    if (parsed) return t('header.notif.paymentRejectedMsg')
  }

  if (type === 'booking_payment_verified') {
    const pctMatch = String(message).match(/Your ([\d.]+)% down payment has been verified/i)
    if (pctMatch) return t('header.notif.downPaymentVerifiedMsg', { percent: pctMatch[1] })
    if (/verified/i.test(message)) return t('header.notif.downPaymentVerifiedMsgPlain')
  }

  if (type === 'booking_confirmed') {
    const parsed = parseBookingConfirmedMessage(message)
    if (parsed) return t('header.notif.bookingConfirmedMsg', { date: parsed.date })
  }

  if (type === 'booking_rejected') {
    const parsed = parseBookingRejectedMessage(message)
    if (parsed?.reason) {
      return t('header.notif.bookingRejectedMsgReason', {
        date: parsed.date,
        reason: parsed.reason
      })
    }
    if (parsed) return t('header.notif.bookingRejectedMsg', { date: parsed.date })
  }

  if (type === 'booking_expired') {
    const parsed = parseBookingExpiredMessage(message)
    if (parsed) return t('header.notif.bookingExpiredMsg', { date: parsed.date })
  }

  if (type === 'operator_booking_assigned') {
    const parsed = parseOperatorAssignedMessage(message)
    if (parsed) {
      return t('header.notif.bookingAssignedMsg', {
        machinery: parsed.machinery,
        date: parsed.date
      })
    }
  }

  if (type === 'operator_booking_updated') {
    const parsed = parseOperatorUpdatedMessage(message)
    if (parsed) {
      return t('header.notif.scheduleUpdatedMsg', {
        machinery: parsed.machinery,
        date: parsed.date
      })
    }
  }

  if (type === 'operator_booking_cancelled') {
    const parsed = parseOperatorCancelledMessage(message)
    if (parsed) {
      return t('header.notif.bookingCancelledMsg', {
        machinery: parsed.machinery,
        date: parsed.date
      })
    }
  }

  if (type === 'operator_income_credited') {
    const parsed = parseOperatorIncomeMessage(message)
    if (parsed) {
      return t('header.notif.incomeCreditedMsg', {
        amount: parsed.amount,
        machinery: parsed.machinery,
        date: parsed.date
      })
    }
  }

  if (type === 'president_income_submitted') {
    const parsed = parseIncomeSubmittedMessage(message)
    if (parsed) {
      return t('header.notif.incomeSubmittedReviewMsg', {
        farmer: parsed.farmer || farmerFallback
      })
    }
  }

  if (type === 'agriculturist_income_eligible') {
    const parsed = parseIncomeEligibleMessage(message)
    if (parsed) {
      return t('header.notif.incomeEligibleAssistanceMsg', {
        farmer: parsed.farmer || farmerFallback
      })
    }
  }

  if (type === 'income_rejected') {
    const text = String(message || '')
    const withReason = text.match(/^Your farm income record was not approved\. Reason: (.+)\. Please update and resubmit\.?$/i)
    if (withReason) {
      return t('header.notif.incomeRejectedMsgReason', { reason: withReason[1].trim() })
    }
    return t('header.notif.incomeRejectedMsg')
  }

  return message
}
