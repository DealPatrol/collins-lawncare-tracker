import { useEffect, useState } from 'react';
import { fetchPortalJob, formatJobForPortal, generateInvoiceLink } from '../portal.js';

export default function ClientPortal() {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    async function load() {
      if (!token) {
        if (!cancelled) {
          setError('Invalid access link. Please check the URL.');
          setLoading(false);
        }
        return;
      }

      try {
        const remote = await fetchPortalJob(token);
        if (!cancelled) {
          setJob(formatJobForPortal(remote));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Could not load job details.');
          setJob(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div style={portalStyles.container}>
        <div style={portalStyles.loading}>Loading job details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={portalStyles.container}>
        <div style={portalStyles.error}>
          <h2>Access Denied</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={portalStyles.container}>
        <div style={portalStyles.error}>
          <h2>Job Not Found</h2>
          <p>The requested job could not be found. Please check the link.</p>
        </div>
      </div>
    );
  }

  const portalToken = new URLSearchParams(window.location.search).get('token');

  return (
    <div style={portalStyles.container}>
      <div style={portalStyles.header}>
        <h1 style={portalStyles.title}>Job Details</h1>
        <div style={portalStyles.badge}>{job.status.toUpperCase()}</div>
      </div>

      <div style={portalStyles.card}>
        <div style={portalStyles.jobName}>{job.name}</div>
        <div style={portalStyles.address}>{job.address}</div>

        <div style={portalStyles.grid}>
          <div style={portalStyles.gridItem}>
            <div style={portalStyles.label}>Service Date</div>
            <div style={portalStyles.value}>
              {job.startTime ? new Date(job.startTime).toLocaleDateString() : 'TBD'}
            </div>
          </div>
          <div style={portalStyles.gridItem}>
            <div style={portalStyles.label}>Duration</div>
            <div style={portalStyles.value}>
              {job.startTime && job.endTime
                ? `${Math.round((new Date(job.endTime) - new Date(job.startTime)) / 60000)} min`
                : 'TBD'}
            </div>
          </div>
        </div>

        {job.notes && (
          <div style={portalStyles.notes}>
            <div style={portalStyles.label}>Service Notes</div>
            <div style={portalStyles.noteText}>{job.notes}</div>
          </div>
        )}
      </div>

      {job.photos && job.photos.length > 0 && (
        <div style={portalStyles.card}>
          <div style={portalStyles.sectionTitle}>Before & After</div>
          <div style={portalStyles.photoGrid}>
            {job.photos.map((photo, idx) => (
              <img key={idx} src={photo} alt={`Photo ${idx + 1}`} style={portalStyles.photo} />
            ))}
          </div>
        </div>
      )}

      <div style={portalStyles.card}>
        <div style={portalStyles.sectionTitle}>Invoice</div>
        <div style={portalStyles.invoiceRow}>
          <div style={portalStyles.label}>Amount Due</div>
          <div style={portalStyles.amount}>${job.pay.toFixed(2)}</div>
        </div>

        {job.payments && job.payments.length > 0 ? (
          <div>
            <div style={{ fontSize: 12, color: '#22c55e', marginTop: 8, fontWeight: 600 }}>
              Paid in full
            </div>
            {job.payments.map((p) => (
              <div key={p.id} style={portalStyles.paymentItem}>
                <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(p.date).toLocaleDateString()}</div>
                <div style={{ fontWeight: 600, color: '#22c55e' }}>${p.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <button
            style={portalStyles.payButton}
            onClick={() => {
              if (portalToken) {
                window.location.href = generateInvoiceLink(window.location.origin, portalToken);
              }
            }}
          >
            Pay Invoice
          </button>
        )}
      </div>

      <div style={portalStyles.footer}>
        <p style={{ color: '#94a3b8', fontSize: 12 }}>
          Questions? Contact us for support.
        </p>
      </div>
    </div>
  );
}

const portalStyles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    background: '#f8fafb',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  badge: {
    background: '#22c55e',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 700,
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  jobName: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '8px',
  },
  address: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px',
  },
  gridItem: {
    background: '#f1f5f9',
    padding: '12px',
    borderRadius: '6px',
  },
  label: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '4px',
    fontWeight: 600,
  },
  value: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1e293b',
  },
  notes: {
    marginTop: '16px',
  },
  noteText: {
    background: '#f1f5f9',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.5',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '12px',
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  photo: {
    width: '100%',
    height: '150px',
    objectFit: 'cover',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  invoiceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  amount: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#22c55e',
  },
  payButton: {
    width: '100%',
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '6px',
    fontWeight: 700,
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '12px',
  },
  paymentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '32px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  error: {
    background: '#fff',
    borderRadius: '8px',
    padding: '32px 20px',
    textAlign: 'center',
    border: '1px solid #fecaca',
  },
  loading: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#64748b',
  },
};
