import React, { useState } from 'react';
import { ArrowUpRight, Clock, User, X } from 'lucide-react';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  cover_image: string;
  category: string;
  tags: string[];
  reading_time_minutes: number;
  published_at?: string;
  seo_title?: string;
  seo_description?: string;
}

interface BlogSectionProps {
  posts: BlogPost[];
  loading?: boolean;
}

export const BlogSection: React.FC<BlogSectionProps> = ({ posts, loading }) => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  return (
    <section id="insights" className="py-24 border-t border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="text-xs font-semibold tracking-[0.2em] text-[#d89f66] uppercase mb-2">
              THOUGHT LEADERSHIP &amp; INSIGHTS
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#f1f2f4] tracking-tight">
              Engineering Insights &amp; Market Perspectives
            </h2>
          </div>
          <p className="text-sm text-[#9ca3af] max-w-md">
            Pragmatic guides on website design economics in Nepal, technical SEO, performance architecture, and digital growth.
          </p>
        </div>

        {/* Blog Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#111317] rounded-2xl h-72 animate-pulse border border-white/[0.06]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {posts.map((post) => (
              <article
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="group surface-card rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#d89f66]/30"
              >
                <div className="p-6 sm:p-7 space-y-4">
                  {/* Unboxed Metadata Line (Frontend Constitution Rule) */}
                  <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                    <span className="font-semibold text-[#d89f66]">{post.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#6b7280]" />
                      {post.reading_time_minutes} min read
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#f1f2f4] group-hover:text-[#d89f66] transition-colors leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#9ca3af] leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>

                <div className="px-6 pb-6 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#6b7280]">
                  <span className="flex items-center gap-1.5 text-[#9ca3af]">
                    <User className="w-3 h-3 text-[#d89f66]" /> {post.author}
                  </span>
                  <span className="text-[#d89f66] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
                    Read article <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Full Article Modal */}
        {selectedPost && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedPost(null)}
          >
            <div
              className="bg-[#101217] border border-white/[0.12] rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 relative my-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-5 right-5 p-2 rounded-lg text-[#9ca3af] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Close Article"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div>
                <div className="flex items-center gap-2 text-xs text-[#d89f66] font-semibold uppercase tracking-wider mb-2">
                  <span>{selectedPost.category}</span>
                  <span className="text-white/20">·</span>
                  <span>{selectedPost.reading_time_minutes} min read</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#f1f2f4] leading-tight">
                  {selectedPost.title}
                </h3>
                <div className="text-xs text-[#9ca3af] mt-2 flex items-center gap-2">
                  <span>By {selectedPost.author}</span>
                  <span className="text-white/20">·</span>
                  <span>SD Infinova Publishing</span>
                </div>
              </div>

              {/* Content */}
              <div className="prose prose-invert max-w-none text-sm text-[#d1d5db] space-y-4 leading-relaxed border-t border-white/[0.08] pt-6">
                <p className="text-base text-[#f1f2f4] font-medium leading-relaxed italic border-l-2 border-[#d89f66] pl-4">
                  {selectedPost.excerpt}
                </p>
                <div className="whitespace-pre-line text-[#9ca3af] space-y-4">
                  {selectedPost.content}
                </div>
              </div>

              {/* Tags */}
              {selectedPost.tags && selectedPost.tags.length > 0 && (
                <div className="pt-4 border-t border-white/[0.08] flex items-center gap-2 flex-wrap text-xs text-[#9ca3af]">
                  <span className="text-white/40">Topic Tags:</span>
                  {selectedPost.tags.map((tag, idx) => (
                    <span key={idx} className="font-mono text-[11px] text-[#d89f66]">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
