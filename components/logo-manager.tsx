'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LOGO_BUCKET, logoUrl } from '@/lib/designers';

const TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

/** A designer's logo, with upload / change / remove controls for its verified managers (and admins). */
export function LogoManager({ brandId, brandName, initialPath }: { brandId: number; brandName: string; initialPath: string | null }) {
  const [path, setPath] = useState<string | null>(initialPath);
  const [canEdit, setCanEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data: u } = await supabase!.auth.getUser();
      if (!u.user) return;
      const [m, a] = await Promise.all([
        supabase!.rpc('is_brand_manager', { p_brand_id: brandId }),
        supabase!.rpc('is_admin'),
      ]);
      setCanEdit(m.data === true || a.data === true);
    })();
  }, [brandId]);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !supabase) return;
    if (!TYPES.includes(file.type)) { setError('Please use a PNG, JPG or WebP image.'); return; }
    if (file.size > MAX_BYTES) { setError('Logos must be under 2 MB.'); return; }
    setBusy(true); setError('');
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const newPath = `${brandId}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from(LOGO_BUCKET).upload(newPath, file, { contentType: file.type, upsert: false });
    if (up.error) { setBusy(false); setError(up.error.message); return; }
    const { error: err } = await supabase.rpc('set_brand_logo', { p_brand_id: brandId, p_path: newPath });
    if (err) { await supabase.storage.from(LOGO_BUCKET).remove([newPath]); setBusy(false); setError(err.message); return; }
    if (path) await supabase.storage.from(LOGO_BUCKET).remove([path]);
    setPath(newPath); setBusy(false);
  }

  async function remove() {
    if (!supabase || !path || !window.confirm('Remove this logo?')) return;
    setBusy(true); setError('');
    const { error: err } = await supabase.rpc('set_brand_logo', { p_brand_id: brandId, p_path: null });
    if (err) { setBusy(false); setError(err.message); return; }
    await supabase.storage.from(LOGO_BUCKET).remove([path]);
    setPath(null); setBusy(false);
  }

  const url = logoUrl(path);
  if (!url && !canEdit) return null;

  return (
    <>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="designer-logo" src={url} alt={`${brandName} logo`} />
      ) : (
        <button type="button" className="designer-logo empty" onClick={() => input.current?.click()} disabled={busy}>+ Add your logo</button>
      )}
      {canEdit && (
        <div className="logo-controls">
          <button type="button" className="text-button" onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Uploading…' : url ? 'Change logo' : 'Upload logo (free)'}</button>
          {url && <button type="button" className="text-button" onClick={remove} disabled={busy}>Remove</button>}
          <span className="logo-hint">Square PNG, JPG or WebP, under 2 MB</span>
          {error && <span className="reply-error">{error}</span>}
        </div>
      )}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPick} />
    </>
  );
}
