import { CloudinaryUpload } from '@/components/CloudinaryUpload';
import { CloudinaryImage } from '@/lib/api/admin/event.service';
import { FormSection } from '@/components/forms/primitives/FormSection';

export function EventMediaSection({
  coverImage,
  onChange,
}: {
  coverImage: CloudinaryImage | null;
  onChange: (value: CloudinaryImage | null) => void;
}) {
  return (
    <FormSection title="Media">
      <CloudinaryUpload
        folder="events"
        value={coverImage}
        onChange={onChange}
        label="Cover Image"
        aspectRatio="aspect-video"
        id="event-cover-image"
      />
    </FormSection>
  );
}
