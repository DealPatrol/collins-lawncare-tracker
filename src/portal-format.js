// Format job data for portal display (sanitized for public view).

export function formatJobForPortal(job) {
  return {
    id: job.id,
    name: job.name,
    address: job.address,
    status: job.status || 'in-progress',
    startTime: job.startTime,
    endTime: job.endTime,
    pay: job.pay,
    billing: job.billing,
    monthlyRate: job.monthlyRate,
    photos: job.photos || [],
    notes: job.notes,
    completedAt: job.endTime,
    payments: (job.payments || []).map((p) => ({
      id: p.id,
      amount: p.amount,
      date: p.date,
      status: p.status,
    })),
  };
}
