import React from 'react';

import { Input } from '@mad/ui';

import { Field } from './DJBasicInfoCard';
import type { DJSocialLinksCardProps } from './types';

export const DJSocialLinksCard: React.FC<DJSocialLinksCardProps> = ({
  instagram,
  setInstagram,
  soundcloud,
  setSoundcloud,
  youtube,
  setYoutube,
  facebook,
  setFacebook,
  twitter,
  setTwitter,
  spotify,
  setSpotify,
  website,
  setWebsite,
  isActive,
  setIsActive,
}) => {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
      <h2 className="text-white font-semibold">Social & Streaming Profiles</h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Instagram URL" htmlFor="dj-instagram">
          <Input
            id="dj-instagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="https://instagram.com/..."
          />
        </Field>
        <Field label="SoundCloud Profile URL" htmlFor="dj-soundcloud">
          <Input
            id="dj-soundcloud"
            value={soundcloud}
            onChange={(e) => setSoundcloud(e.target.value)}
            placeholder="https://soundcloud.com/..."
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="YouTube Channel URL" htmlFor="dj-youtube">
          <Input
            id="dj-youtube"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="https://youtube.com/..."
          />
        </Field>
        <Field label="Facebook Page URL" htmlFor="dj-facebook">
          <Input
            id="dj-facebook"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder="https://facebook.com/..."
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Twitter/X Profile URL" htmlFor="dj-twitter">
          <Input
            id="dj-twitter"
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="https://twitter.com/..."
          />
        </Field>
        <Field label="Spotify Artist URL" htmlFor="dj-spotify">
          <Input
            id="dj-spotify"
            value={spotify}
            onChange={(e) => setSpotify(e.target.value)}
            placeholder="https://open.spotify.com/artist/..."
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Personal / Agency Website URL" htmlFor="dj-website">
          <Input
            id="dj-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
          />
        </Field>
      </div>
      <div className="flex items-center gap-3 cursor-pointer select-none py-1">
        <input
          type="checkbox"
          id="dj-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 accent-accent-purple rounded"
        />
        <label htmlFor="dj-active" className="text-text-secondary text-sm">
          Mark this DJ as active for event lineups
        </label>
      </div>
    </div>
  );
};
