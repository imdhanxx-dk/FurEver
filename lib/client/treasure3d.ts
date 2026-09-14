import * as T from 'three';
import { createCreature, type Creature } from './creature3d';
/** Original collectible models also describe the worn accessories in creature3d. */
export function createTreasure(item: string): Creature {
  if (item === 'moon_fox') return createCreature('starlight');
  const root = new T.Group(),
    model = new T.Group();
  root.add(model);
  model.position.y = 1.25;
  const gold = new T.MeshStandardMaterial({
      color: '#dca947',
      metalness: 0.65,
      roughness: 0.3,
    }),
    silver = new T.MeshStandardMaterial({
      color: '#b7d3dc',
      metalness: 0.55,
      roughness: 0.23,
    }),
    green = new T.MeshStandardMaterial({ color: '#528f76', roughness: 0.62 }),
    blue = new T.MeshStandardMaterial({ color: '#273e66', roughness: 0.52 }),
    light = new T.MeshStandardMaterial({
      color: '#d6b6ea',
      emissive: '#977bd3',
      emissiveIntensity: 0.16,
      metalness: 0.35,
      roughness: 0.26,
    });
  const materials = [gold, silver, green, blue, light];
  const add = (
    geometry: T.BufferGeometry,
    material: T.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    model.add(m);
    return m;
  };
  const ring = (radius: number, thickness: number, material: T.Material) =>
    add(new T.TorusGeometry(radius, thickness, 12, 48), material);
  const star = () => {
    const shape = new T.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2,
        r = i % 2 ? 0.2 : 0.43;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return new T.ExtrudeGeometry(shape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelSize: 0.035,
      bevelThickness: 0.025,
      bevelSegments: 2,
      steps: 1,
    });
  };
  if (item === 'moon_collar') {
    const collar = ring(0.8, 0.09, blue);
    collar.rotation.x = Math.PI / 2.5;
    const charm = add(
      new T.TorusGeometry(0.23, 0.065, 10, 32, Math.PI * 1.55),
      silver,
      0,
      -0.32,
      0.75,
    );
    charm.rotation.z = -0.5;
    add(new T.SphereGeometry(0.055, 12, 8), gold, 0, -0.02, 0.74);
  } else if (item === 'ribbon') {
    for (const side of [-1, 1]) {
      const bow = add(
        new T.SphereGeometry(1, 20, 14),
        green,
        side * 0.43,
        0,
        0,
      );
      bow.scale.set(0.48, 0.3, 0.16);
      bow.rotation.z = side * -0.25;
      const tail = add(
        new T.BoxGeometry(0.28, 0.7, 0.08),
        green,
        side * 0.2,
        -0.5,
        0,
      );
      tail.rotation.z = side * 0.25;
    }
    add(new T.SphereGeometry(0.19, 18, 14), gold);
  } else if (item === 'star_crown') {
    const circlet = ring(0.74, 0.07, gold);
    circlet.rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const point = add(
        star(),
        gold,
        Math.sin(a) * 0.73,
        0.22,
        Math.cos(a) * 0.73,
      );
      point.scale.setScalar(0.45);
      point.rotation.y = a;
    }
  } else if (item === 'aurora') {
    add(new T.TorusKnotGeometry(0.57, 0.055, 72, 8, 2, 3), light);
    ring(0.95, 0.018, silver);
  } else if (item === 'event_leaf') {
    ring(0.65, 0.06, green);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const leaf = add(
        new T.SphereGeometry(1, 12, 8),
        i % 3 === 0 ? gold : green,
        Math.cos(a) * 0.67,
        Math.sin(a) * 0.67,
        0.02,
      );
      leaf.scale.set(0.2, 0.1, 0.035);
      leaf.rotation.z = a + 0.45;
    }
  } else if (item === 'ticket') {
    add(new T.BoxGeometry(1, 1.5, 0.08), blue);
    const seal = add(star(), gold, 0, 0, 0.07);
    seal.scale.setScalar(0.8);
    for (const side of [-1, 1])
      add(new T.BoxGeometry(0.83, 0.035, 0.015), gold, 0, side * 0.58, 0.052);
  } else {
    add(new T.OctahedronGeometry(0.7, 0), light);
  }
  return {
    root,
    animate(dt, t) {
      model.rotation.y = T.MathUtils.damp(
        model.rotation.y,
        Math.sin(t * 0.55) * 0.4,
        6,
        dt,
      );
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
      materials.forEach((m) => m.dispose());
    },
  };
}
