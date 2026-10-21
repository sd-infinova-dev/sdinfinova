import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Inbox,
  Briefcase,
  FileText,
  Settings,
  Image as ImageIcon,
  Activity,
  LogOut,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Download,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Layers,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sd_admin_token'));
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState('admin@sdinfinova.com');
  const [loginPassword, setLoginPassword] = useState('InfinovaAdmin2026!');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'analytics' | 'inquiries' | 'projects' | 'blog' | 'services' | 'media' | 'settings' | 'logs'>('analytics');

  // Data states
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Search & Filter
  const [inquirySearch, setInquirySearch] = useState('');
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState('all');

  // Modals
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [selectedInquiryDetail, setSelectedInquiryDetail] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Check auth on mount
  useEffect(() => {
    if (token) {
      verifySession();
    }
  }, [token]);

  // Load active tab data
  useEffect(() => {
    if (token) {
      loadTabData();
    }
  }, [token, activeTab]);

  const verifySession = async () => {
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUser(data.user);
      } else {
        handleLogout();
      }
    } catch {
      handleLogout();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('sd_admin_token', data.token);
      setToken(data.token);
      setAdminUser(data.user);
      setStatusMessage('Signed in successfully.');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email or password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {}
    }
    localStorage.removeItem('sd_admin_token');
    setToken(null);
    setAdminUser(null);
  };

  const loadTabData = async () => {
    setLoadingData(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'analytics') {
        const res = await fetch('/api/v1/admin/analytics', { headers });
        if (res.ok) setAnalyticsData(await res.json());
      } else if (activeTab === 'inquiries') {
        const res = await fetch('/api/v1/admin/inquiries', { headers });
        if (res.ok) setInquiries(await res.json());
      } else if (activeTab === 'projects') {
        const res = await fetch('/api/v1/admin/projects', { headers });
        if (res.ok) setProjects(await res.json());
      } else if (activeTab === 'blog') {
        const res = await fetch('/api/v1/admin/blog', { headers });
        if (res.ok) setBlogPosts(await res.json());
      } else if (activeTab === 'services') {
        const res = await fetch('/api/v1/services');
        if (res.ok) setServices(await res.json());
      } else if (activeTab === 'media') {
        const res = await fetch('/api/v1/admin/media', { headers });
        if (res.ok) setMediaAssets(await res.json());
      } else if (activeTab === 'settings') {
        const res = await fetch('/api/v1/settings');
        if (res.ok) setSiteSettings(await res.json());
      } else if (activeTab === 'logs') {
        const res = await fetch('/api/v1/admin/activity', { headers });
        if (res.ok) setActivityLogs(await res.json());
      }
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      setLoadingData(false);
    }
  };

  // Inquiry update
  const handleUpdateInquiryStatus = async (id: string, newStatus: string, notes?: string) => {
    try {
      const res = await fetch(`/api/v1/admin/inquiries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, internal_notes: notes })
      });
      if (res.ok) {
        setStatusMessage('Inquiry status updated in database.');
        loadTabData();
        if (selectedInquiryDetail && selectedInquiryDetail.id === id) {
          setSelectedInquiryDetail({ ...selectedInquiryDetail, status: newStatus, internal_notes: notes });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inquiry record?')) return;
    try {
      const res = await fetch(`/api/v1/admin/inquiries/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setStatusMessage('Inquiry record deleted.');
        loadTabData();
        setSelectedInquiryDetail(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Project save
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    try {
      const isNew = !editingProject.id;
      const url = isNew ? '/api/v1/admin/projects' : `/api/v1/admin/projects/${editingProject.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingProject)
      });

      if (res.ok) {
        setStatusMessage(isNew ? 'New project published.' : 'Project updated.');
        setEditingProject(null);
        loadTabData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to save project');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Permanently delete this project from the database?')) return;
    try {
      const res = await fetch(`/api/v1/admin/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setStatusMessage('Project deleted.');
        loadTabData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Blog save
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    try {
      const isNew = !editingPost.id;
      const url = isNew ? '/api/v1/admin/blog' : `/api/v1/admin/blog/${editingPost.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingPost)
      });

      if (res.ok) {
        setStatusMessage(isNew ? 'Article created.' : 'Article updated.');
        setEditingPost(null);
        loadTabData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to save article');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (!confirm('Permanently delete this article?')) return;
    try {
      const res = await fetch(`/api/v1/admin/blog/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setStatusMessage('Article deleted.');
        loadTabData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Site Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(siteSettings)
      });
      if (res.ok) {
        setStatusMessage('Global site settings updated in PostgreSQL.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Media upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('alt_text', file.name);

    try {
      const res = await fetch('/api/v1/admin/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setStatusMessage('Media asset uploaded.');
        loadTabData();
      } else {
        const d = await res.json();
        alert(d.error || 'Upload failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // -------------------------------------------------------------
  // RENDER: LOGIN SCREEN (If not authenticated)
  // -------------------------------------------------------------
  if (!token || !adminUser) {
    return (
      <div className="fixed inset-0 z-50 bg-[#090a0c] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111317] border border-white/[0.1] rounded-3xl p-8 space-y-6 shadow-2xl relative">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <BrandLogo size="lg" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Studio Admin Panel</h2>
            <p className="text-xs text-[#9ca3af]">
              Authenticate to manage CMS projects, client inquiries, and analytics.
            </p>
          </div>

          {/* Quick Demo Credentials Helper Callout */}
          <div className="p-3.5 rounded-xl bg-[#181b22] border border-[#d89f66]/30 text-xs text-[#d1d5db] space-y-1">
            <div className="font-semibold text-[#d89f66] flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" /> Initial Administrator Credentials:
            </div>
            <div className="font-mono text-[11px] text-[#9ca3af]">
              Email: <span className="text-white">admin@sdinfinova.com</span>
            </div>
            <div className="font-mono text-[11px] text-[#9ca3af]">
              Password: <span className="text-white">InfinovaAdmin2026!</span>
            </div>
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#171a22] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#d89f66]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#171a22] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#d89f66]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#6b7280] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 rounded-xl bg-[#d89f66] hover:bg-[#eec397] text-[#090a0c] font-bold text-sm transition-colors cursor-pointer"
              >
                {loginLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
              </button>
            </div>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={onClose}
              className="text-xs text-[#6b7280] hover:text-[#9ca3af] transition-colors cursor-pointer"
            >
              &larr; Back to Public Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: FULL ADMIN DASHBOARD CONSOLE (Inspired by screenshot image_ee582da3.png)
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 bg-[#090a0c] text-[#f1f2f4] flex flex-col overflow-hidden font-sans">
      {/* Toast notification message */}
      {statusMessage && (
        <aside aria-label="Status notification" className="absolute top-4 right-6 z-50 bg-[#161922] border border-[#d89f66]/40 text-xs text-[#f1f2f4] px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#d89f66]" />
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="ml-2 text-[#6b7280] hover:text-white">
            &times;
          </button>
        </aside>
      )}

      {/* Admin Top Header */}
      <header className="h-16 border-b border-white/[0.08] bg-[#0c0d10] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <BrandLogo size="sm" />
          <span className="text-xs text-white/30">/</span>
          <div className="text-xs font-mono uppercase tracking-wider text-[#d89f66]">
            {activeTab} manager
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Active Admin Profile */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#9ca3af]">
            <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
            <span className="text-white font-medium">{adminUser.name}</span>
            <span className="text-[#6b7280]">({adminUser.role})</span>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-[#d1d5db] hover:text-white bg-[#16181f] border border-white/[0.08] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Live Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleLogout}
            className="p-2 text-[#9ca3af] hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.04] cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container: Sidebar + Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-white/[0.08] bg-[#0d0f12] flex flex-col justify-between shrink-0 p-4 overflow-y-auto">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-[#6b7280] font-mono px-3 py-2">
              Management
            </div>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#181b22] text-[#d89f66] font-semibold border border-white/[0.06]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Analytics Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('inquiries')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'inquiries'
                  ? 'bg-[#181b22] text-[#d89f66] font-semibold border border-white/[0.06]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-4 h-4" />
                <span>Inquiries Inbox</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-[#181b22] text-[#d89f66] font-semibold border border-white/[0.06]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Projects CMS</span>
            </button>

            <button
              onClick={() => setActiveTab('blog')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'blog'
                  ? 'bg-[#181b22] text-[#d89f66] font-semibold border border-white/[0.06]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Blog &amp; Insights</span>
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-[#181b22] text-[#d89f66] font-semibold border border-white/[0.06]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Services Manager</span>
            </button>

            <button
              onClick={() => setActiveTab('media')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'media'
                  ? 'bg-[#181b22] text-[#d89f66] font-semibold border border-white/[0.06]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Media Library</span>
            </button>

            <div className="text-[10px] uppercase tracking-wider text-[#6b7280] font-mono px-3 pt-6 pb-2">
              System
            </div>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#181b22] text-[#d89f66] font-semibold border border-white/[0.06]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Site Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-[#181b22] text-[#d89f66] font-semibold border border-white/[0.06]'
                  : 'text-[#9ca3af] hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Audit Log</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-[#13151a] border border-white/[0.06] text-[11px] text-[#6b7280]">
            <div className="font-semibold text-[#d1d5db] mb-1">PostgreSQL Persistent</div>
            <div>Storage: ./data/postgres</div>
            <div className="text-[10px] text-[#4ade80] mt-0.5">● Engine Nominal</div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#090a0c]">
          {/* TAB 1: ANALYTICS OVERVIEW */}
          {activeTab === 'analytics' && (
            <div className="space-y-8 max-w-6xl">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Studio Metrics &amp; Performance</h1>
                <p className="text-xs text-[#9ca3af] mt-1">
                  Privacy-first aggregate telemetry stored directly in PostgreSQL.
                </p>
              </div>

              {/* Metric Cards (Styled inspired by image_ee582da3.png) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="p-5 rounded-2xl bg-[#111317] border border-white/[0.08]">
                  <div className="text-xs text-[#9ca3af] font-medium">Total Site Views</div>
                  <div className="text-3xl font-extrabold font-mono text-white mt-2 tabular-nums">
                    {analyticsData?.metrics?.totalViews ?? '--'}
                  </div>
                  <div className="text-[11px] text-[#4ade80] mt-1 font-medium">+14% vs last week</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#111317] border border-white/[0.08]">
                  <div className="text-xs text-[#9ca3af] font-medium">Total Inquiries</div>
                  <div className="text-3xl font-extrabold font-mono text-[#d89f66] mt-2 tabular-nums">
                    {analyticsData?.metrics?.totalInquiries ?? '--'}
                  </div>
                  <div className="text-[11px] text-[#9ca3af] mt-1">
                    {analyticsData?.metrics?.newInquiries ?? 0} new pending review
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#111317] border border-white/[0.08]">
                  <div className="text-xs text-[#9ca3af] font-medium">Conversion Rate</div>
                  <div className="text-3xl font-extrabold font-mono text-[#4b9be6] mt-2 tabular-nums">
                    {analyticsData?.metrics?.conversionRate ?? '--'}
                  </div>
                  <div className="text-[11px] text-[#9ca3af] mt-1">Visit-to-inquiry ratio</div>
                </div>

                <div className="p-5 rounded-2xl bg-[#111317] border border-white/[0.08]">
                  <div className="text-xs text-[#9ca3af] font-medium">Published Projects</div>
                  <div className="text-3xl font-extrabold font-mono text-white mt-2 tabular-nums">
                    {analyticsData?.metrics?.publishedProjects ?? '--'}
                  </div>
                  <div className="text-[11px] text-[#9ca3af] mt-1">
                    {analyticsData?.metrics?.publishedPosts ?? 0} blog articles active
                  </div>
                </div>
              </div>

              {/* Grid 2: Traffic Trend & Top Visited Pages */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Traffic Activity */}
                <div className="lg:col-span-7 p-6 rounded-2xl bg-[#111317] border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Daily Traffic Overview</h3>
                    <span className="text-xs font-mono text-[#9ca3af]">Last 7 days</span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {analyticsData?.dailyViews && analyticsData.dailyViews.length > 0 ? (
                      analyticsData.dailyViews.map((dv: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04]">
                          <span className="font-mono text-[#9ca3af]">{dv.date_str}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-[#171a22] rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-[#d89f66] h-full rounded-full"
                                style={{ width: `${Math.min(100, (parseInt(dv.views) / 30) * 100)}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-white tabular-nums w-8 text-right">
                              {dv.views}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#6b7280]">No traffic events recorded yet.</p>
                    )}
                  </div>
                </div>

                {/* Top Visited Pages */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-[#111317] border border-white/[0.08] space-y-4">
                  <h3 className="text-sm font-bold text-white">Top Visited Pages</h3>
                  <div className="space-y-2.5 pt-1">
                    {analyticsData?.topPaths && analyticsData.topPaths.length > 0 ? (
                      analyticsData.topPaths.map((tp: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#15181f]">
                          <span className="font-mono text-[#d1d5db] truncate max-w-[200px]">{tp.path}</span>
                          <span className="font-mono text-[#d89f66] font-semibold tabular-nums">{tp.views} views</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#6b7280]">No page paths logged.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Inquiries Preview */}
              <div className="p-6 rounded-2xl bg-[#111317] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Recent Project Submissions</h3>
                  <button
                    onClick={() => setActiveTab('inquiries')}
                    className="text-xs text-[#d89f66] hover:underline cursor-pointer"
                  >
                    Open Full Inbox &rarr;
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[#6b7280] font-mono">
                        <th className="pb-3">Client</th>
                        <th className="pb-3">Project Type</th>
                        <th className="pb-3">Budget</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {analyticsData?.recentInquiries?.map((inq: any) => (
                        <tr key={inq.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 font-medium text-white">
                            <div>{inq.name}</div>
                            <div className="text-[11px] text-[#6b7280]">{inq.business_name || inq.email}</div>
                          </td>
                          <td className="py-3 text-[#9ca3af]">{inq.project_type}</td>
                          <td className="py-3 font-mono text-[#d89f66]">{inq.budget_range}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#181b22] text-[#d1d5db]">
                              {inq.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedInquiryDetail(inq);
                                setActiveTab('inquiries');
                              }}
                              className="text-xs text-[#d89f66] hover:underline"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INQUIRIES INBOX */}
          {activeTab === 'inquiries' && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Client Inquiries Inbox</h1>
                  <p className="text-xs text-[#9ca3af] mt-1">
                    Lead intake, qualification notes, and communication workflows.
                  </p>
                </div>

                <a
                  href="/api/v1/admin/inquiries/export/csv"
                  className="px-4 py-2 rounded-xl bg-[#16181f] border border-white/[0.08] hover:bg-[#1f232d] text-xs font-semibold text-[#f1f2f4] flex items-center gap-1.5 transition-colors self-start"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </a>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-[#6b7280]" />
                  <input
                    type="text"
                    value={inquirySearch}
                    onChange={(e) => setInquirySearch(e.target.value)}
                    placeholder="Search by client name, email, or project type..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#111317] border border-white/[0.08] text-xs text-white placeholder-[#6b7280] focus:outline-none focus:border-[#d89f66]"
                  />
                </div>

                <div className="flex items-center gap-1 bg-[#111317] p-1 rounded-xl border border-white/[0.08]">
                  {['all', 'new', 'contacted', 'qualified', 'won', 'lost'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setInquiryStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg uppercase tracking-wider transition-colors cursor-pointer ${
                        inquiryStatusFilter === st
                          ? 'bg-[#1e222a] text-[#d89f66] font-semibold'
                          : 'text-[#9ca3af] hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inquiries Table */}
              <div className="bg-[#111317] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#16181f] text-[#6b7280] font-mono border-b border-white/[0.06]">
                    <tr>
                      <th className="py-3 px-4">Client &amp; Contact</th>
                      <th className="py-3 px-4">Project Scope</th>
                      <th className="py-3 px-4">Budget &amp; Timeline</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {inquiries
                      .filter((inq) => {
                        if (inquiryStatusFilter !== 'all' && inq.status !== inquiryStatusFilter) return false;
                        if (inquirySearch) {
                          const q = inquirySearch.toLowerCase();
                          return (
                            inq.name.toLowerCase().includes(q) ||
                            inq.email.toLowerCase().includes(q) ||
                            (inq.business_name && inq.business_name.toLowerCase().includes(q)) ||
                            inq.project_type.toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((inq) => (
                        <tr key={inq.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-medium">
                            <div className="text-white">{inq.name}</div>
                            <div className="text-[11px] text-[#d89f66]">{inq.email}</div>
                            {inq.phone && <div className="text-[10px] text-[#6b7280]">{inq.phone}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[#f1f2f4]">{inq.project_type}</div>
                            <div className="text-[11px] text-[#6b7280] truncate max-w-xs">{inq.description}</div>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <div className="text-[#d89f66]">{inq.budget_range}</div>
                            <div className="text-[10px] text-[#6b7280]">{inq.expected_timeline}</div>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={inq.status}
                              onChange={(e) => handleUpdateInquiryStatus(inq.id, e.target.value)}
                              className="bg-[#171a22] border border-white/[0.08] text-[11px] rounded-lg px-2 py-1 text-white font-mono focus:outline-none focus:border-[#d89f66]"
                            >
                              <option value="new">NEW</option>
                              <option value="contacted">CONTACTED</option>
                              <option value="qualified">QUALIFIED</option>
                              <option value="won">WON</option>
                              <option value="lost">LOST</option>
                              <option value="archived">ARCHIVED</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => setSelectedInquiryDetail(inq)}
                              className="px-2.5 py-1 text-xs bg-[#1a1d24] text-white hover:bg-[#232732] rounded border border-white/[0.06] cursor-pointer"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => handleDeleteInquiry(inq.id)}
                              className="p-1 text-[#6b7280] hover:text-red-400 cursor-pointer"
                              title="Delete inquiry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Inquiry Detail Modal */}
              {selectedInquiryDetail && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                  <div className="bg-[#111317] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <h3 className="text-base font-bold text-white">Inquiry Details</h3>
                      <button
                        onClick={() => setSelectedInquiryDetail(null)}
                        className="text-[#6b7280] hover:text-white"
                      >
                        &times;
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[#6b7280]">Client:</span>{' '}
                        <strong className="text-white">{selectedInquiryDetail.name}</strong> ({selectedInquiryDetail.business_name || 'Individual'})
                      </div>
                      <div>
                        <span className="text-[#6b7280]">Contact:</span>{' '}
                        <a href={`mailto:${selectedInquiryDetail.email}`} className="text-[#d89f66] underline">
                          {selectedInquiryDetail.email}
                        </a>{' '}
                        · {selectedInquiryDetail.phone || 'No phone provided'}
                      </div>
                      <div>
                        <span className="text-[#6b7280]">Location:</span> {selectedInquiryDetail.location || 'Nepal'}
                      </div>
                      <div>
                        <span className="text-[#6b7280]">Project Scope:</span> {selectedInquiryDetail.project_type}
                      </div>
                      <div>
                        <span className="text-[#6b7280]">Budget:</span> {selectedInquiryDetail.budget_range}
                      </div>
                      <div>
                        <span className="text-[#6b7280]">Timeline:</span> {selectedInquiryDetail.expected_timeline}
                      </div>
                      <div className="pt-2 border-t border-white/[0.06]">
                        <span className="text-[#6b7280] block mb-1">Project Description:</span>
                        <div className="p-3 rounded-lg bg-[#161820] text-[#d1d5db] whitespace-pre-wrap leading-relaxed">
                          {selectedInquiryDetail.description}
                        </div>
                      </div>

                      <div>
                        <span className="text-[#6b7280] block mb-1">Internal Notes:</span>
                        <textarea
                          rows={3}
                          value={selectedInquiryDetail.internal_notes || ''}
                          onChange={(e) =>
                            setSelectedInquiryDetail({
                              ...selectedInquiryDetail,
                              internal_notes: e.target.value
                            })
                          }
                          className="w-full p-2.5 rounded-lg bg-[#161820] border border-white/[0.08] text-white focus:outline-none focus:border-[#d89f66]"
                          placeholder="Add team notes on WhatsApp communication, quotation sent, next steps..."
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                      <select
                        value={selectedInquiryDetail.status}
                        onChange={(e) =>
                          handleUpdateInquiryStatus(
                            selectedInquiryDetail.id,
                            e.target.value,
                            selectedInquiryDetail.internal_notes
                          )
                        }
                        className="bg-[#171a22] border border-white/[0.08] text-xs rounded-lg px-3 py-1.5 text-white font-mono"
                      >
                        <option value="new">NEW</option>
                        <option value="contacted">CONTACTED</option>
                        <option value="qualified">QUALIFIED</option>
                        <option value="won">WON</option>
                        <option value="lost">LOST</option>
                      </select>

                      <button
                        onClick={() => {
                          handleUpdateInquiryStatus(
                            selectedInquiryDetail.id,
                            selectedInquiryDetail.status,
                            selectedInquiryDetail.internal_notes
                          );
                          setSelectedInquiryDetail(null);
                        }}
                        className="px-4 py-2 bg-[#d89f66] text-[#090a0c] font-bold text-xs rounded-lg hover:bg-[#eec397]"
                      >
                        Save Notes &amp; Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROJECTS CMS */}
          {activeTab === 'projects' && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Portfolio Projects Manager</h1>
                  <p className="text-xs text-[#9ca3af] mt-1">
                    Manage studio showcase case studies, metrics, live URLs, and media.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setEditingProject({
                      title: '',
                      slug: '',
                      category: 'Business Website',
                      short_description: '',
                      full_case_study: '',
                      cover_image: '/assets/projects/sd-tech-photograph.png',
                      tech_stack: ['React', 'TypeScript', 'Tailwind CSS'],
                      live_url: '',
                      repo_url: '',
                      client_name: '',
                      completion_date: '2026',
                      is_featured: false,
                      is_published: true,
                      metrics: [{ label: 'Lighthouse Score', value: '98/100' }]
                    })
                  }
                  className="px-4 py-2 bg-[#d89f66] hover:bg-[#eec397] text-[#090a0c] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Project</span>
                </button>
              </div>

              {/* Projects List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-5 rounded-2xl bg-[#111317] border border-white/[0.08] space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#9ca3af] mb-2">
                        <span className="font-semibold text-[#d89f66]">{proj.category}</span>
                        <span className="font-mono">{proj.completion_date || '2025'}</span>
                      </div>
                      <h3 className="text-lg font-bold text-white">{proj.title}</h3>
                      <p className="text-xs text-[#9ca3af] line-clamp-2 mt-1">{proj.short_description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            proj.is_published ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                          }`}
                        >
                          {proj.is_published ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                        {proj.is_featured && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-400">
                            FEATURED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingProject(proj)}
                          className="p-1.5 text-[#9ca3af] hover:text-white rounded bg-[#181b22] border border-white/[0.06]"
                          title="Edit Project"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(proj.id)}
                          className="p-1.5 text-[#9ca3af] hover:text-red-400 rounded bg-[#181b22] border border-white/[0.06]"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Project Editor Modal */}
              {editingProject && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-[#111317] border border-white/[0.1] rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8 shadow-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <h3 className="text-base font-bold text-white">
                        {editingProject.id ? 'Edit Project' : 'Create New Project'}
                      </h3>
                      <button onClick={() => setEditingProject(null)} className="text-[#6b7280] hover:text-white">
                        &times;
                      </button>
                    </div>

                    <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[#9ca3af] mb-1">Project Title *</label>
                          <input
                            type="text"
                            required
                            value={editingProject.title}
                            onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                            className="w-full p-2 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[#9ca3af] mb-1">Category *</label>
                          <input
                            type="text"
                            required
                            value={editingProject.category}
                            onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })}
                            className="w-full p-2 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[#9ca3af] mb-1">Client Name</label>
                          <input
                            type="text"
                            value={editingProject.client_name || ''}
                            onChange={(e) => setEditingProject({ ...editingProject, client_name: e.target.value })}
                            className="w-full p-2 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[#9ca3af] mb-1">Completion Year</label>
                          <input
                            type="text"
                            value={editingProject.completion_date || '2026'}
                            onChange={(e) => setEditingProject({ ...editingProject, completion_date: e.target.value })}
                            className="w-full p-2 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#9ca3af] mb-1">Short Description</label>
                        <input
                          type="text"
                          value={editingProject.short_description || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, short_description: e.target.value })}
                          className="w-full p-2 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[#9ca3af] mb-1">Full Architectural Case Study</label>
                        <textarea
                          rows={4}
                          value={editingProject.full_case_study || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, full_case_study: e.target.value })}
                          className="w-full p-2.5 rounded-lg bg-[#171a22] border border-white/[0.08] text-white leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[#9ca3af] mb-1">Cover Image URL</label>
                          <input
                            type="text"
                            value={editingProject.cover_image || ''}
                            onChange={(e) => setEditingProject({ ...editingProject, cover_image: e.target.value })}
                            className="w-full p-2 rounded-lg bg-[#171a22] border border-white/[0.08] text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[#9ca3af] mb-1">Live Demo URL</label>
                          <input
                            type="url"
                            value={editingProject.live_url || ''}
                            onChange={(e) => setEditingProject({ ...editingProject, live_url: e.target.value })}
                            className="w-full p-2 rounded-lg bg-[#171a22] border border-white/[0.08] text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingProject.is_published}
                            onChange={(e) => setEditingProject({ ...editingProject, is_published: e.target.checked })}
                          />
                          <span className="text-white">Published on public website</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingProject.is_featured}
                            onChange={(e) => setEditingProject({ ...editingProject, is_featured: e.target.checked })}
                          />
                          <span className="text-white">Featured showcase card</span>
                        </label>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => setEditingProject(null)}
                          className="px-4 py-2 rounded-lg text-[#9ca3af] hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-[#d89f66] text-[#090a0c] font-bold rounded-lg hover:bg-[#eec397]"
                        >
                          Save Project
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BLOG CMS */}
          {activeTab === 'blog' && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Blog &amp; Knowledge Base CMS</h1>
                  <p className="text-xs text-[#9ca3af] mt-1">
                    Publish SEO-optimized articles, guides, and engineering thoughts.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setEditingPost({
                      title: '',
                      slug: '',
                      excerpt: '',
                      content: '',
                      author: adminUser.name,
                      cover_image: '/assets/projects/clothing-brand.png',
                      category: 'Web Engineering',
                      tags: ['Nepal', 'Web Strategy'],
                      reading_time_minutes: 5,
                      is_published: true,
                      seo_title: '',
                      seo_description: ''
                    })
                  }
                  className="px-4 py-2 bg-[#d89f66] hover:bg-[#eec397] text-[#090a0c] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Write Article</span>
                </button>
              </div>

              <div className="space-y-4">
                {blogPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-5 rounded-2xl bg-[#111317] border border-white/[0.08] flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                        <span className="font-semibold text-[#d89f66]">{post.category}</span>
                        <span>·</span>
                        <span>{post.reading_time_minutes} min read</span>
                        <span>·</span>
                        <span className="text-emerald-400">
                          {post.is_published ? '● PUBLISHED' : '○ DRAFT'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{post.title}</h3>
                      <p className="text-xs text-[#6b7280] line-clamp-1">{post.excerpt}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditingPost(post)}
                        className="p-2 text-[#9ca3af] hover:text-white rounded bg-[#181b22] border border-white/[0.06]"
                        title="Edit Article"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBlog(post.id)}
                        className="p-2 text-[#9ca3af] hover:text-red-400 rounded bg-[#181b22] border border-white/[0.06]"
                        title="Delete Article"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Blog Editor Modal */}
              {editingPost && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-[#111317] border border-white/[0.1] rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8 shadow-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <h3 className="text-base font-bold text-white">
                        {editingPost.id ? 'Edit Article' : 'Write New Article'}
                      </h3>
                      <button onClick={() => setEditingPost(null)} className="text-[#6b7280] hover:text-white">
                        &times;
                      </button>
                    </div>

                    <form onSubmit={handleSaveBlog} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-[#9ca3af] mb-1">Article Title *</label>
                        <input
                          type="text"
                          required
                          value={editingPost.title}
                          onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                          className="w-full p-2 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[#9ca3af] mb-1">Category</label>
                          <input
                            type="text"
                            value={editingPost.category}
                            onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })}
                            className="w-full p-2 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[#9ca3af] mb-1">Estimated Reading Time (mins)</label>
                          <input
                            type="number"
                            value={editingPost.reading_time_minutes}
                            onChange={(e) => setEditingPost({ ...editingPost, reading_time_minutes: parseInt(e.target.value) || 5 })}
                            className="w-full p-2 rounded-lg bg-[#171a22] border border-white/[0.08] text-white font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#9ca3af] mb-1">Summary Excerpt</label>
                        <textarea
                          rows={2}
                          value={editingPost.excerpt}
                          onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                          className="w-full p-2 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[#9ca3af] mb-1">Article Body Content</label>
                        <textarea
                          rows={8}
                          value={editingPost.content}
                          onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                          className="w-full p-2.5 rounded-lg bg-[#171a22] border border-white/[0.08] text-white leading-relaxed font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingPost.is_published}
                            onChange={(e) => setEditingPost({ ...editingPost, is_published: e.target.checked })}
                          />
                          <span className="text-white">Publish immediately</span>
                        </label>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => setEditingPost(null)}
                          className="px-4 py-2 rounded-lg text-[#9ca3af] hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-[#d89f66] text-[#090a0c] font-bold rounded-lg hover:bg-[#eec397]"
                        >
                          Save Article
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SERVICES MANAGER */}
          {activeTab === 'services' && (
            <div className="space-y-6 max-w-6xl">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Services &amp; Offerings</h1>
                <p className="text-xs text-[#9ca3af] mt-1">
                  8 active studio service packages with deliverables and problem-solution definitions.
                </p>
              </div>

              <div className="space-y-4">
                {services.map((srv, idx) => (
                  <div key={srv.id} className="p-5 rounded-2xl bg-[#111317] border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#d89f66]">{(idx + 1).toString().padStart(2, '0')}.</span>
                        <h3 className="text-base font-bold text-white">{srv.title}</h3>
                      </div>
                      <span className="text-xs font-mono text-emerald-400">ACTIVE</span>
                    </div>
                    <p className="text-xs text-[#d89f66]">{srv.tagline}</p>
                    <p className="text-xs text-[#9ca3af] leading-relaxed">{srv.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: MEDIA LIBRARY */}
          {activeTab === 'media' && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Studio Media Library</h1>
                  <p className="text-xs text-[#9ca3af] mt-1">
                    Store and manage project screenshots, brand icons, and client assets.
                  </p>
                </div>

                <label className="px-4 py-2 bg-[#d89f66] hover:bg-[#eec397] text-[#090a0c] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer">
                  <Plus className="w-4 h-4" />
                  <span>Upload Image</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {mediaAssets.length === 0 ? (
                <div className="text-center py-16 bg-[#111317] border border-white/[0.08] rounded-2xl space-y-2">
                  <ImageIcon className="w-8 h-8 text-[#6b7280] mx-auto" />
                  <p className="text-xs text-[#9ca3af]">No uploaded media files yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {mediaAssets.map((asset) => (
                    <div key={asset.id} className="bg-[#111317] border border-white/[0.08] rounded-xl overflow-hidden p-2 space-y-2">
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <img src={asset.url} alt={asset.alt_text} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-[11px] text-[#9ca3af] truncate">{asset.original_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: SITE SETTINGS */}
          {activeTab === 'settings' && siteSettings && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Global Site Configuration</h1>
                <p className="text-xs text-[#9ca3af] mt-1">
                  Adjust studio headlines, contact information, and business coordinates.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-[#111317] border border-white/[0.08] space-y-5 text-xs">
                <div>
                  <label className="block text-[#9ca3af] mb-1">Studio Brand Name</label>
                  <input
                    type="text"
                    value={siteSettings.site_name || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, site_name: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                  />
                </div>

                <div>
                  <label className="block text-[#9ca3af] mb-1">Hero Main Headline</label>
                  <input
                    type="text"
                    value={siteSettings.headline || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, headline: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#9ca3af] mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={siteSettings.contact_email || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, contact_email: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[#9ca3af] mb-1">WhatsApp Number</label>
                    <input
                      type="text"
                      value={siteSettings.whatsapp_number || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, whatsapp_number: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#9ca3af] mb-1">Location</label>
                  <input
                    type="text"
                    value={siteSettings.location || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, location: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[#171a22] border border-white/[0.08] text-white"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#d89f66] hover:bg-[#eec397] text-[#090a0c] font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Save Changes to Database
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 8: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Security &amp; Activity Audit Log</h1>
                <p className="text-xs text-[#9ca3af] mt-1">
                  Immutable record of administrative actions, logins, and database edits.
                </p>
              </div>

              <div className="bg-[#111317] border border-white/[0.08] rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#16181f] text-[#6b7280] font-mono border-b border-white/[0.06]">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Operator</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono text-[#6b7280]">{log.created_at}</td>
                        <td className="py-3 px-4 font-medium text-white">{log.user_name}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[#d89f66]">{log.action}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#9ca3af]">{log.target_type} ({log.target_id})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
