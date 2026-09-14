'use client';
import { useEffect, useRef, useState } from 'react';
import type { Pet } from '@/lib/game/types';
import type { CreatureMood } from '@/lib/client/creature3d';
export default function CreatureView({
  pet,
  mood = 'idle',
  item,
}: {
  pet: Pet | null;
  mood?: CreatureMood;
  item?: string;
}) {
  const ref = useRef<HTMLDivElement>(null),
    moodRef = useRef(mood);
  moodRef.current = mood;
  const [error, setError] = useState('');
  useEffect(() => {
    let dispose = () => {},
      cancelled = false;
    void Promise.all([
      import('three'),
      import('@/lib/client/creature3d'),
      import('@/lib/client/treasure3d'),
    ])
      .then(([T, { createCreature }, { createTreasure }]) => {
        if (cancelled || !ref.current) return;
        const host = ref.current,
          renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.4;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = T.PCFSoftShadowMap;
        host.appendChild(renderer.domElement);
        const scene = new T.Scene(),
          camera = new T.PerspectiveCamera(35, 1, 0.1, 40);
        camera.position.set(3.8, 2.8, 6.8);
        camera.lookAt(0, 1.35, 0);
        scene.add(new T.HemisphereLight('#e9f1ff', '#8e7762', 3));
        const light = new T.DirectionalLight('#ffe8c6', 4);
        light.position.set(-3, 7, 4);
        light.castShadow = true;
        light.shadow.mapSize.set(512, 512);
        scene.add(light);
        const creature = item
          ? createTreasure(item)
          : createCreature(
              pet?.appearance.includes('starlight') ? 'starlight' : 'sunbeam',
              pet?.species,
              pet?.equipped,
            );
        scene.add(creature.root);
        const geo = new T.CircleGeometry(2.2, 48),
          mat = new T.ShadowMaterial({ opacity: 0.16 }),
          floor = new T.Mesh(geo, mat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
        const resize = () => {
          if (!host.clientWidth || !host.clientHeight) return;
          renderer.setSize(host.clientWidth, host.clientHeight, false);
          camera.aspect = host.clientWidth / host.clientHeight;
          camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        resize();
        let frame = 0,
          last = performance.now(),
          t = 0;
        const loop = (n: number) => {
          if (cancelled) return;
          frame = requestAnimationFrame(loop);
          const dt = Math.min(0.05, (n - last) / 1000);
          last = n;
          if (document.hidden) return;
          t += dt;
          creature.animate(dt, t, 0, moodRef.current, 0);
          renderer.render(scene, camera);
        };
        frame = requestAnimationFrame(loop);
        dispose = () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
          creature.dispose();
          geo.dispose();
          mat.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      })
      .catch(() => {
        if (!cancelled)
          setError(
            'The 3D portrait needs WebGL. Your companion is still saved.',
          );
      });
    return () => {
      cancelled = true;
      dispose();
    };
  }, [pet?.appearance, pet?.species, pet?.equipped.join(','), item]);
  return (
    <div
      className="creature-view"
      ref={ref}
      role="img"
      aria-label={
        item
          ? `${item.replaceAll('_', ' ')} collectible model`
          : `${pet?.name || 'Your companion'}, a 3D ${pet?.species || 'cat'}`
      }
    >
      {error && <p>{error}</p>}
    </div>
  );
}
