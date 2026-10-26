export function machineryStatusLabel(machineOrStatus) {
  if (machineOrStatus && typeof machineOrStatus === 'object') {
    const setStatus = machineOrStatus.stored_status || machineOrStatus.status
    if (setStatus === 'Available' || setStatus === 'Unavailable') return setStatus
    if (machineOrStatus.availability_status) return machineOrStatus.availability_status
    return 'Unavailable'
  }
  return machineOrStatus === 'Available' ? 'Available' : 'Unavailable'
}
