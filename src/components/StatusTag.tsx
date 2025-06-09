import React from 'react'

export function StatusTag({ status }: { status: 'pending' | 'done' }) {
  let color = ''
  let label = ''
  if (status === 'pending') {
    color = 'bg-yellow-100 text-yellow-800 border-yellow-300'
    label = 'In progress'
  } else if (status === 'done') {
    color = 'bg-green-100 text-green-800 border-green-300'
    label = 'Completed'
  }
  return (
    <span className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold ${color}`}>{label}</span>
  )
}
export default StatusTag 