import { type CloudinaryImage } from '@/lib/api/admin/event.service';
import { EventMemoryPublicationState, EventStatus } from '@mad/shared';

export interface MemoryGalleryItem extends CloudinaryImage {
  order: number;
}

export interface MemoriesState {
  publicationState: EventMemoryPublicationState;
  heading: string;
  thankYouMessage: string;
  /** Comma-separated string; split to string[] on submit */
  highlightsInput: string;
  gallery: MemoryGalleryItem[];
}

export interface EventMemoriesCardProps {
  eventStatus: EventStatus;
  eventSlug: string;
  value: MemoriesState;
  onChange: (next: MemoriesState) => void;
}

export type UploadEntry = {
  id: string;
  name: string;
  progress: number;
  state: 'uploading' | 'success' | 'error';
  error?: string;
};
