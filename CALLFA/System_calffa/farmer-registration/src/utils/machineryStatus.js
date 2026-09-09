export function machineryStatusLabel(machineOrStatus) {
  if (machineOrStatus && typeof machineOrStatus === 'object') {
    if (machineOrStatus.availability_status) return machineOrStatus.availability_status
    return machineOrStatus.status === 'Available' ? 'Available' : 'Unavailable'
  }
  return machineOrStatus === 'Available' ? 'Available' : 'Unavailable'
}
