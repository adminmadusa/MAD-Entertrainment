'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import {
  adminGetEmailTemplates,
  adminPreviewEmailTemplate,
  type EmailTemplateInfo,
} from '@/lib/api/admin/diagnostics.service';
import { Modal, Spinner, EmptyState } from '@mad/ui';
import { Mail, Smartphone, Monitor, X } from '@mad/ui/icons';

export interface EmailTemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailTemplatePreviewModal({
  isOpen,
  onClose,
}: EmailTemplatePreviewModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('booking_confirmation');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<EmailTemplateInfo[]>({
    queryKey: ['admin', 'diagnostics', 'email-templates'],
    queryFn: adminGetEmailTemplates,
    enabled: isOpen,
  });

  const { data: previewData, isLoading: isLoadingPreview, isError } = useQuery({
    queryKey: ['admin', 'diagnostics', 'email-templates', selectedTemplateId],
    queryFn: () => adminPreviewEmailTemplate(selectedTemplateId),
    enabled: isOpen && !!selectedTemplateId,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="email-preview-modal-title"
      className="glass border border-white/10 p-0 max-w-5xl overflow-hidden rounded-2xl flex flex-col max-h-[90vh]"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 id="email-preview-modal-title" className="text-base font-bold text-white">
              Email Template Gallery & Live Preview
            </h3>
            <p className="text-xs text-text-muted">
              Live mock preview of all customer-facing transactional emails
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport switcher */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'desktop'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'mobile'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-xl border border-white/10 text-text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex flex-1 overflow-hidden min-h-[500px]">
        {/* Template Selector Sidebar */}
        <div className="w-64 border-r border-white/10 p-3 overflow-y-auto bg-black/20 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted px-2 py-1 block">
            Templates ({templates.length})
          </span>

          {isLoadingTemplates ? (
            <div className="p-4 flex justify-center">
              <Spinner size="sm" />
            </div>
          ) : (
            templates.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex flex-col gap-0.5 ${
                    isSelected
                      ? 'bg-purple-500/15 border border-purple-500/40 text-purple-200'
                      : 'hover:bg-white/5 text-text-secondary hover:text-white border border-transparent'
                  }`}
                >
                  <span className="font-semibold text-white">{tpl.name}</span>
                  <div className="flex items-center justify-between text-[10px] text-text-muted">
                    <span>{tpl.category}</span>
                    <span className="font-mono opacity-60">{tpl.id}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Preview Frame */}
        <div className="flex-1 flex flex-col bg-[#0d0d0d] overflow-hidden">
          {/* Email Header Bar */}
          {previewData && (
            <div className="px-6 py-2.5 border-b border-white/10 bg-black/40 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <span className="text-text-muted font-medium">Subject:</span>
                <span className="text-white font-semibold truncate">{previewData.subject}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-purple-300">
                {previewData.templateId}
              </span>
            </div>
          )}

          {/* Iframe Viewport */}
          <div className="flex-1 overflow-auto p-4 flex justify-center items-start bg-[#0a0a0a]">
            {isLoadingPreview ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 py-20">
                <Spinner size="md" />
                <span className="text-xs text-text-muted">Rendering email template...</span>
              </div>
            ) : isError || !previewData?.html ? (
              <EmptyState
                icon={<Mail className="w-8 h-8" />}
                title="Could not render template"
                description="Failed to load preview data for this email template."
              />
            ) : (
              <div
                className={`transition-all duration-200 bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl ${
                  viewMode === 'desktop' ? 'w-full max-w-[650px]' : 'w-[375px]'
                }`}
                style={{ height: '580px' }}
              >
                <iframe
                  title={`Preview: ${selectedTemplateId}`}
                  srcDoc={previewData.html}
                  sandbox="allow-same-origin"
                  className="w-full h-full border-0 bg-black"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
