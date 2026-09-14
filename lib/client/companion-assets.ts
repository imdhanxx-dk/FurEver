import {
  prepareCompanionAtlas,
  type CompanionAtlas,
} from './companion-renderer';

// Reuse public starter parts across the sanctuary and previews. Private designs
// are never retained in a shared cache after their owning component unmounts.
const starters = new Map<string, Promise<CompanionAtlas>>();
export function loadCompanionAtlas(source: string): Promise<CompanionAtlas> {
  const cacheable =
    source === '/assets/companion-rig.png' ||
    source === '/assets/starlight-rig.png';
  const existing = cacheable && starters.get(source);
  if (existing) return existing;
  const loaded = new Promise<CompanionAtlas>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        resolve(
          prepareCompanionAtlas(
            image,
            source === '/assets/starlight-rig.png' ? 'starlight' : undefined,
          ),
        );
      } catch (error) {
        reject(error);
      }
      image.onload = image.onerror = null;
    };
    image.onerror = () => {
      image.onload = image.onerror = null;
      reject(new Error('Companion unavailable'));
    };
    image.src = source;
  });
  if (cacheable) {
    starters.set(source, loaded);
    void loaded.catch(() => {
      if (starters.get(source) === loaded) starters.delete(source);
    });
  }
  return loaded;
}
