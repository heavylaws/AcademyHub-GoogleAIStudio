'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, Lock, User, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function AcceptInvitePage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: password || undefined,
          displayName: displayName || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation.');
      }

      setSuccessMessage('Invitation accepted successfully! You can now sign in with your credentials.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '40px auto', padding: '24px', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#111827', color: '#fff', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <ShieldCheck style={{ width: '32px', height: '32px', color: '#3b82f6' }} />
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>AcademyHub Invitation</h1>
        </div>

        {successMessage ? (
          <div style={{ background: '#064e3b', color: '#a7f3d0', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 style={{ width: '24px', height: '24px', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>Welcome to AcademyHub!</p>
              <p style={{ margin: '4px 0 0', fontSize: '14px' }}>{successMessage}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px' }}>
              Set your account details below to accept your invitation and activate your access.
            </p>

            {errorMessage && (
              <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <AlertCircle style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#d1d5db', marginBottom: '6px' }}>
                Display Name (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '12px', top: '12px', width: '18px', height: '18px', color: '#6b7280' }} />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '6px', border: '1px solid #374151', background: '#1f2937', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#d1d5db', marginBottom: '6px' }}>
                Password (for new accounts)
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '12px', top: '12px', width: '18px', height: '18px', color: '#6b7280' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '6px', border: '1px solid #374151', background: '#1f2937', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                Minimum 8 characters. If you already have an account, sign in first.
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {submitting ? (
                <>
                  <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                  <span>Accepting...</span>
                </>
              ) : (
                <span>Accept Invitation</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
