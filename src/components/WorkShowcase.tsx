import React, { useState } from 'react';
import { ExternalLink, Github, ArrowUpRight, CheckCircle2, X } from 'lucide-react';

export interface Project {
  id: string;
  slug: string;
  title: string;
  category: string;
  short_description: string;
  full_case_study: string;
  cover_image: string;
  gallery_images: string[];
  tech_stack: string[];
  live_url?: string;
  repo_url?: string;
  client_name?: string;
  completion_date?: string;
  is_featured: boolean;
  metrics?: { label: string; value: string }[];
}

interface WorkShowcaseProps {
  projects: Project[];
  loading?: boolean;
}

export const WorkShowcase: React.FC<WorkShowcaseProps> = ({ projects, loading }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeProjectModal, setActiveProjectModal] = useState<Project | null>(null);

  const categories = ['All', 'Photography & Portfolio', 'Healthcare & Clinic', 'E-commerce & Retail', 'Custom Web Application'];

  const filteredProjects = selectedCategory === 'All'
    ? projects
    : projects.filter((p) => p.category.toLowerCase().includes(selectedCategory.toLowerCase()) || selectedCategory.toLowerCase().includes(p.category.toLowerCase()));

  return (
    <section id="work" className="py-24 border-t border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="text-xs font-semibold tracking-[0.2em] text-[#d89f66] uppercase mb-2">
              PORTFOLIO &amp; ARCHITECTURAL SHOWCASE
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f1f2f4] tracking-tight">
              Selected Works &amp; Real Deployments
            </h2>
          </div>
          <p className="text-sm text-[#9ca3af] max-w-md">
            Every project represents real engineering rigor, tailored business logic, and measurable digital outcomes.
          </p>
        </div>

        {/* Filter Controls (Functional Tabs adhering to Zero-Pill rule) */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#121418] border border-white/[0.08] rounded-xl max-w-fit mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#1e222a] text-[#f1f2f4] shadow-sm font-semibold'
                  : 'text-[#9ca3af] hover:text-[#f1f2f4] hover:bg-white/[0.03]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#111317] border border-white/[0.06] rounded-2xl p-6 h-80 animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-[#111317] border border-white/[0.08] rounded-2xl">
            <p className="text-[#9ca3af] text-sm">No projects found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => setActiveProjectModal(project)}
                className="group surface-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
              >
                {/* Project Visual Container */}
                <div className="relative aspect-[16/10] bg-[#14171d] overflow-hidden border-b border-white/[0.06]">
                  {project.cover_image ? (
                    <img
                      src={project.cover_image}
                      alt={project.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top opacity-90 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#6b7280]">
                      <span className="font-mono text-xs">SD INFINOVA ENGINE</span>
                    </div>
                  )}

                  {/* Top-right open action indicator */}
                  <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#090a0c]/80 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 group-hover:text-[#d89f66] group-hover:border-[#d89f66]/40 transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Project Content */}
                <div className="p-6 sm:p-7 space-y-4">
                  {/* Unboxed Metadata Line (Frontend Constitution Rule) */}
                  <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                    <span className="font-medium text-[#d89f66]">{project.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{project.completion_date || '2025'}</span>
                    {project.client_name && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{project.client_name}</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-[#f1f2f4] group-hover:text-[#d89f66] transition-colors">
                    {project.title}
                  </h3>

                  <p className="text-sm text-[#9ca3af] leading-relaxed line-clamp-2">
                    {project.short_description}
                  </p>

                  {/* Metrics Row */}
                  {project.metrics && project.metrics.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
                      {project.metrics.map((m, idx) => (
                        <div key={idx}>
                          <div className="text-base font-bold font-mono text-[#f1f2f4] tabular-nums">{m.value}</div>
                          <div className="text-[11px] text-[#6b7280] truncate">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Project Case Study Modal */}
        {activeProjectModal && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setActiveProjectModal(null)}
          >
            <div
              className="bg-[#101217] border border-white/[0.12] rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 relative my-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveProjectModal(null)}
                className="absolute top-5 right-5 p-2 rounded-lg text-[#9ca3af] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Close Case Study"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div>
                <div className="flex items-center gap-2 text-xs text-[#d89f66] font-semibold uppercase tracking-wider mb-2">
                  <span>{activeProjectModal.category}</span>
                  <span className="text-white/20">·</span>
                  <span>{activeProjectModal.completion_date}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#f1f2f4]">
                  {activeProjectModal.title}
                </h3>
                {activeProjectModal.client_name && (
                  <p className="text-xs text-[#9ca3af] mt-1">
                    Client: <span className="text-[#d1d5db]">{activeProjectModal.client_name}</span>
                  </p>
                )}
              </div>

              {/* Cover Preview */}
              {activeProjectModal.cover_image && (
                <div className="aspect-[16/9] rounded-xl overflow-hidden border border-white/[0.08] bg-[#090a0c]">
                  <img
                    src={activeProjectModal.cover_image}
                    alt={activeProjectModal.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Case Study Details */}
              <div className="space-y-4 text-sm leading-relaxed text-[#d1d5db]">
                <div>
                  <h4 className="text-xs font-bold text-[#f1f2f4] uppercase tracking-wider mb-1.5">
                    Project Overview &amp; Challenge
                  </h4>
                  <p className="text-[#9ca3af]">{activeProjectModal.short_description}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#f1f2f4] uppercase tracking-wider mb-1.5">
                    Engineering Architecture &amp; Execution
                  </h4>
                  <p className="text-[#9ca3af] whitespace-pre-line">{activeProjectModal.full_case_study}</p>
                </div>

                {/* Tech Stack List */}
                <div>
                  <h4 className="text-xs font-bold text-[#f1f2f4] uppercase tracking-wider mb-2">
                    Technologies Deployed
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeProjectModal.tech_stack.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-mono px-2.5 py-1 rounded bg-[#181b22] border border-white/[0.08] text-[#d1d5db]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Metrics */}
                {activeProjectModal.metrics && activeProjectModal.metrics.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-[#f1f2f4] uppercase tracking-wider mb-2">
                      Verified Impact &amp; Metrics
                    </h4>
                    <div className="grid grid-cols-3 gap-3 p-4 bg-[#14171d] rounded-xl border border-white/[0.06]">
                      {activeProjectModal.metrics.map((m, idx) => (
                        <div key={idx}>
                          <div className="text-lg font-bold font-mono text-[#d89f66] tabular-nums">{m.value}</div>
                          <div className="text-xs text-[#9ca3af]">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.08]">
                {activeProjectModal.live_url && (
                  <a
                    href={activeProjectModal.live_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 text-xs font-semibold text-[#090a0c] bg-[#d89f66] hover:bg-[#e5b380] rounded-lg inline-flex items-center gap-1.5 transition-colors"
                  >
                    View Live Project <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {activeProjectModal.repo_url && (
                  <a
                    href={activeProjectModal.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 text-xs font-medium text-[#d1d5db] hover:text-white bg-[#181b22] hover:bg-[#20242d] border border-white/[0.08] rounded-lg inline-flex items-center gap-1.5 transition-colors"
                  >
                    Repository <Github className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
