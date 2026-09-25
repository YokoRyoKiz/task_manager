import React, { useState, useEffect } from 'react';
import { Monitor, RefreshCw } from 'lucide-react';
import { fetchAllPersons, fetchAllSchedules } from '../api/notion';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  blue:   '#bae6fd',
  pink:   '#fbcfe8',
  yellow: '#fde68a',
  green:  '#bbf7d0',
};

function formatTime(hour) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function MiniTimetable({ schedules, date }) {
  const hourHeight = 40;
  const startHour = 6;
  const endHour = 22;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => i + startHour);

  const todayStr = date.toISOString().split('T')[0];
  const todaySchedules = schedules.filter(s => {
    const d = s.date?.split('T')[0];
    return d === todayStr;
  });

  return (
    <div style={{ position: 'relative', height: `${(endHour - startHour) * hourHeight}px`, minWidth: '140px', flex: 1 }}>
      {/* Hour lines */}
      {hours.map(h => (
        <div key={h} style={{
          position: 'absolute',
          top: `${(h - startHour) * hourHeight}px`,
          left: 0,
          right: 0,
          height: `${hourHeight}px`,
          borderBottom: '1px dashed rgba(0,0,0,0.08)',
          display: 'flex',
        }}>
          <div style={{
            width: '32px',
            fontSize: '0.65rem',
            color: 'var(--text-secondary)',
            textAlign: 'right',
            paddingRight: '4px',
            transform: 'translateY(-8px)',
            flexShrink: 0,
          }}>
            {h}:00
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid rgba(0,0,0,0.08)' }} />
        </div>
      ))}

      {/* Schedule items */}
      {todaySchedules.map(item => {
        const clampedStart = Math.max(item.startHour, startHour);
        const clampedEnd = Math.min(item.endHour, endHour);
        if (clampedEnd <= clampedStart) return null;
        const top = (clampedStart - startHour) * hourHeight;
        const height = (clampedEnd - clampedStart) * hourHeight;
        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              top: `${top}px`,
              height: `${Math.max(height, 18)}px`,
              left: '36px',
              right: '4px',
              background: COLORS[item.color] || COLORS.blue,
              color: '#1e293b',
              borderRadius: '6px',
              padding: '2px 5px',
              fontSize: '0.7rem',
              fontWeight: 600,
              overflow: 'hidden',
              zIndex: 5,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.title}
            </div>
            {height >= 30 && (
              <div style={{ fontSize: '0.6rem', opacity: 0.8 }}>
                {formatTime(item.startHour)}–{formatTime(item.endHour)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MonitorPage() {
  const { currentUser } = useAuth();
  const [persons, setPersons] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();

  const load = () => {
    setLoading(true);
    Promise.all([fetchAllPersons(), fetchAllSchedules()])
      .then(([ps, ss]) => {
        setPersons(ps);
        setAllSchedules(ss);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Group schedules by personId
  const schedulesByPerson = {};
  for (const s of allSchedules) {
    const pid = s.personId || '__unknown__';
    if (!schedulesByPerson[pid]) schedulesByPerson[pid] = [];
    schedulesByPerson[pid].push(s);
  }

  // Show persons from DB, plus any in schedules not in person list
  const personIds = new Set(persons.map(p => p.id));
  const extraIds = Object.keys(schedulesByPerson).filter(id => id !== '__unknown__' && !personIds.has(id));

  const displayPersons = [
    ...persons,
    ...extraIds.map(id => ({ id, name: id })),
  ];

  return (
    <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Monitor size={20} style={{ color: 'var(--accent-primary)' }} />
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            モニター — {today.getMonth() + 1}月{today.getDate()}日のスケジュール
          </h2>
        </div>
        <button
          className="btn-icon glass-panel"
          onClick={load}
          title="更新"
          style={{ width: '36px', height: '36px', background: 'var(--bg-secondary)' }}
        >
          <RefreshCw size={16} style={{ color: loading ? 'var(--accent-primary)' : 'var(--text-secondary)', transition: 'transform 0.5s', transform: loading ? 'rotate(360deg)' : 'rotate(0deg)' }} />
        </button>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          読み込み中...
        </div>
      ) : displayPersons.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Monitor size={40} style={{ opacity: 0.3 }} />
          <p>スケジュールがありません</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '1rem', minWidth: `${displayPersons.length * 180}px`, alignItems: 'flex-start' }}>
            {displayPersons.map(person => {
              const personSchedules = schedulesByPerson[person.id] || [];
              const isMe = currentUser?.id === person.id;
              return (
                <div
                  key={person.id}
                  className="glass-panel"
                  style={{
                    flex: '1 0 160px',
                    maxWidth: '240px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: isMe ? 'linear-gradient(135deg, rgba(53,155,229,0.08), rgba(11,126,201,0.08))' : 'var(--bg-secondary)',
                    border: isMe ? '2px solid var(--accent-primary)' : '1px solid var(--board-border)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Person header */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--board-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: isMe ? 'rgba(53,155,229,0.12)' : 'transparent',
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      flexShrink: 0,
                    }}>
                      {person.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: isMe ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}>
                        {person.name} {isMe && '(自分)'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {personSchedules.length}件の予定
                      </div>
                    </div>
                  </div>

                  {/* Mini timetable */}
                  <div style={{ padding: '0.5rem', overflowY: 'auto' }}>
                    {personSchedules.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '2rem 0' }}>
                        予定なし
                      </div>
                    ) : (
                      <MiniTimetable schedules={personSchedules} date={today} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
