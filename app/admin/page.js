'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Settings, Users, Database, Globe, Shield } from 'lucide-react';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('overview');

    const stats = [
        { title: 'إجمالي المشاهدات', value: '1.2M', icon: <Globe size={24} /> },
        { title: 'المستخدمين', value: '45.8K', icon: <Users size={24} /> },
        { title: 'الأفلام المضافة', value: '12,400', icon: <Database size={24} /> },
    ];

    return (
        <main style={{ minHeight: '100vh', background: '#0a0a0a' }}>
            <Navbar />

            <div style={{ display: 'flex', paddingTop: '80px' }}>
                {/* Sidebar */}
                <div style={{ width: '250px', background: '#141414', height: 'calc(100vh - 80px)', padding: '20px' }}>
                    <h2 style={{ fontSize: '1rem', color: '#666', marginBottom: '20px' }}>القائمة الرئيسية</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {['الإحصائيات', 'المحتوى', 'المستخدمين', 'الإعدادات'].map((item, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: '12px 15px',
                                    borderRadius: '6px',
                                    background: i === 0 ? '#e50914' : 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '40px' }}>
                    <h1 className="netflix-title" style={{ fontSize: '2rem', marginBottom: '30px' }}>لوحة التحكم</h1>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                        {stats.map((stat, i) => (
                            <div key={i} className="glass" style={{ padding: '25px', borderRadius: '12px' }}>
                                <div style={{ color: '#e50914', marginBottom: '10px' }}>{stat.icon}</div>
                                <div style={{ color: '#aaa', fontSize: '0.9rem' }}>{stat.title}</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800' }}>{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="glass" style={{ padding: '30px', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '20px' }}>آخر النشاطات</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                            <thead>
                                <tr style={{ color: '#666', fontSize: '0.85rem', borderBottom: '1px solid #333' }}>
                                    <th style={{ padding: '10px' }}>الفيلم / المسلسل</th>
                                    <th style={{ padding: '10px' }}>الحالة</th>
                                    <th style={{ padding: '10px' }}>التاريخ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} style={{ borderBottom: '1px solid #222', fontSize: '0.9rem' }}>
                                        <td style={{ padding: '15px' }}>مسلسل المداح - الحلقة {i}</td>
                                        <td style={{ padding: '15px' }}><span style={{ color: '#46d369' }}>نشط</span></td>
                                        <td style={{ padding: '15px' }}>منذ {i} ساعات</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
