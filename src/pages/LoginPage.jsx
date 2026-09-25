import React, { useState } from 'react';
import { LogIn, User, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchPersonById } from '../api/notion';

export default function LoginPage() {
  const { login } = useAuth();
  const [inputId, setInputId] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleInputChange = (val) => {
    setInputId(val);
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const trimmedId = inputId.trim();
    if (!trimmedId) return;

    setIsLoggingIn(true);
    setError('');

    try {
      // Notionデータベースを直接参照してIDを検索
      const person = await fetchPersonById(trimmedId);

      if (person) {
        // 見つかった → 名前付きでログイン
        login(person);
      } else {
        // DBには接続できたがIDが登録されていない
        setError('このIDは登録されていません。');
      }
    } catch (err) {
      console.error(err);
      setError('人テーブルへの接続に失敗しました。PERSON_DB_IDを確認してください。');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100vw',
      height: '100vh',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '32px',
        padding: '3rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--board-border)',
        animation: 'fadeIn 0.4s ease-out',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.25rem',
          }}>
            OniPro
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            IDを入力してログイン
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <User
              size={18}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={inputId}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="あなたのID"
              autoFocus
              style={{
                width: '100%',
                padding: '0.85rem 1rem 0.85rem 3rem',
                borderRadius: '16px',
                border: `2px solid ${error ? 'var(--accent-danger)' : 'var(--board-border)'}`,
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = 'var(--accent-primary)'; }}
              onBlur={e => { if (!error) e.target.style.borderColor = 'var(--board-border)'; }}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--accent-danger)',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              paddingLeft: '0.5rem',
            }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!inputId.trim() || isLoggingIn}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '1rem', padding: '0.85rem' }}
          >
            {isLoggingIn
              ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> 確認中...</>
              : <><LogIn size={18} /> ログイン</>
            }
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}


