import * as T from 'three';

export type CreatureMood =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sit'
  | 'sleep'
  | 'react'
  | 'jump';
export type Creature = {
  root: T.Group;
  animate: (
    dt: number,
    time: number,
    speed: number,
    mood: CreatureMood,
    turn: number,
  ) => void;
  dispose: () => void;
};
/** Original sculpted mesh character. Joint targets blend exponentially, independent of frame rate. */
export function createCreature(
  style = 'sunbeam',
  species = 'cat',
  equipped: string[] = [],
): Creature {
  const root = new T.Group(),
    rig = new T.Group();
  root.add(rig);
  const geo = new T.SphereGeometry(1, 24, 18);
  const materials: T.Material[] = [];
  const mat = (color: string, roughness = 0.72, metalness = 0) => {
    const m = new T.MeshStandardMaterial({ color, roughness, metalness });
    materials.push(m);
    return m;
  };
  const star = style === 'starlight';
  const fur = mat(star ? '#fff5e8' : '#edcca4'),
    cream = mat('#fff2de'),
    pink = mat('#d58b95'),
    dark = mat('#382b31', 0.35),
    iris = mat(star ? '#5579e7' : '#5d8a80', 0.2),
    gold = mat('#e8ba60', 0.3, 0.58),
    navy = mat('#27395e');
  const mesh = (
    parent: T.Object3D,
    material: T.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) => {
    const o = new T.Mesh(geo, material);
    o.position.set(x, y, z);
    o.scale.set(sx, sy, sz);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const body = new T.Group();
  rig.add(body);
  mesh(body, fur, 0, 1.03, 0, 0.65, 0.7, 0.77);
  mesh(body, cream, 0, 1.07, 0.58, 0.44, 0.49, 0.21);
  const head = new T.Group();
  head.position.set(0, 1.88, 0.38);
  body.add(head);
  mesh(head, fur, 0, 0, 0, 0.84, 0.72, 0.66);
  mesh(head, cream, 0, -0.25, 0.47, 0.59, 0.36, 0.29);
  const eyes: T.Mesh[] = [];
  for (const side of [-1, 1]) {
    const ear = new T.Group();
    ear.position.set(side * 0.58, 0.5, -0.05);
    ear.rotation.z = side * -0.18;
    head.add(ear);
    const cone = new T.ConeGeometry(
      species === 'dog' ? 0.26 : 0.36,
      species === 'dog' ? 0.65 : 0.74,
      3,
      1,
    );
    cone.rotateY(Math.PI / 2);
    const e = new T.Mesh(cone, fur);
    e.scale.z = 0.55;
    e.position.y = 0.24;
    e.castShadow = true;
    ear.add(e);
    const inner = new T.Mesh(new T.ConeGeometry(0.23, 0.48, 3), pink);
    inner.rotation.y = Math.PI / 2;
    inner.scale.z = 0.15;
    inner.position.set(0, 0.22, 0.105);
    ear.add(inner);
    if (species === 'dog') {
      ear.rotation.z = side * 1.45;
      ear.position.y = 0.18;
    }
    const eye = new T.Group();
    eye.position.set(side * 0.34, 0.025, 0.557);
    head.add(eye);
    mesh(eye, dark, 0, 0, 0, 0.235, 0.28, 0.12);
    eyes.push(mesh(eye, iris, 0, -0.008, 0.087, 0.184, 0.22, 0.056));
    eyes.push(mesh(eye, dark, 0, 0.006, 0.13, 0.086, 0.15, 0.028));
    eyes.push(mesh(eye, cream, -0.062, 0.092, 0.153, 0.049, 0.055, 0.018));
    mesh(head, pink, side * 0.52, -0.24, 0.553, 0.15, 0.055, 0.02);
    mesh(head, cream, side * 0.15, -0.32, 0.725, 0.18, 0.12, 0.115);
    for (let n = 0; n < 3; n++) {
      const tuft = mesh(
        head,
        fur,
        side * (0.7 + n * 0.045),
        -0.13 - n * 0.08,
        -0.05,
        0.2,
        0.09,
        0.32,
      );
      tuft.rotation.z = side * (0.3 + n * 0.25);
    }
  }
  mesh(head, pink, 0, -0.25, 0.83, 0.09, 0.055, 0.055);
  mesh(head, dark, 0, -0.41, 0.735, 0.038, 0.032, 0.026);
  const legs: T.Group[] = [];
  for (const z of [0.48, -0.45])
    for (const side of [-1, 1]) {
      const joint = new T.Group();
      joint.position.set(side * 0.42, 0.83, z);
      body.add(joint);
      mesh(joint, fur, 0, -0.23, 0, 0.22, 0.32, 0.25);
      mesh(joint, cream, 0, -0.57, 0.07, 0.25, 0.17, 0.3);
      for (let i = -1; i <= 1; i++)
        mesh(joint, fur, i * 0.1, -0.55, 0.28, 0.027, 0.065, 0.03);
      legs.push(joint);
    }
  const tail: T.Group[] = [];
  let parent: T.Object3D = body;
  for (let i = 0; i < 7; i++) {
    const joint = new T.Group();
    joint.position.set(0, i === 0 ? 1.05 : 0, i === 0 ? -0.66 : -0.27);
    parent.add(joint);
    mesh(
      joint,
      i === 6 ? cream : fur,
      0,
      0,
      -0.12,
      0.2 - i * 0.012,
      0.2 - i * 0.008,
      0.26,
    );
    tail.push(joint);
    parent = joint;
  }
  const collar = new T.Mesh(
    new T.TorusGeometry(0.48, 0.065, 8, 32),
    star ? navy : gold,
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.65, 0.27);
  body.add(collar);
  mesh(body, gold, 0, 1.47, 0.72, 0.1, 0.13, 0.04);
  if (star) {
    const scarf = mesh(body, navy, 0.6, 1.48, -0.01, 0.23, 0.09, 0.64);
    scarf.rotation.y = -0.32;
    mesh(head, gold, 0, 0.42, 0.54, 0.06, 0.14, 0.02);
    mesh(head, gold, 0, 0.42, 0.54, 0.13, 0.045, 0.025);
    mesh(tail[6], gold, 0, -0.22, -0.22, 0.1, 0.14, 0.03);
  }
  if (equipped.includes('ribbon'))
    for (const side of [-1, 1])
      mesh(body, mat('#7eada0'), side * 0.18, 1.5, 0.71, 0.2, 0.13, 0.08);
  if (equipped.includes('moon_collar'))
    mesh(body, mat('#aac6df', 0.2, 0.3), 0, 1.43, 0.79, 0.12, 0.13, 0.05);
  if (equipped.includes('star_crown'))
    for (let i = 0; i < 5; i++)
      mesh(
        head,
        gold,
        (i - 2) * 0.16,
        0.73 + (0.1 - Math.abs(i - 2) * 0.03),
        0.1,
        0.07,
        0.15,
        0.07,
      );
  if (equipped.includes('aurora') || equipped.includes('moon_fox')) {
    const halo = new T.Mesh(
      new T.TorusGeometry(1.0, 0.018, 6, 48),
      mat('#c4a5e4', 0.15, 0.2),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.16;
    root.add(halo);
  }
  let gait = 0,
    blendSpeed = 0,
    pose = 0;
  return {
    root,
    animate(dt, time, speed, mood, turn) {
      const blend = 1 - Math.exp(-dt * 10);
      blendSpeed += (speed - blendSpeed) * blend;
      gait = time * (3 + blendSpeed * 2.7);
      const low = mood === 'sleep' ? 1 : mood === 'sit' ? 0.6 : 0;
      pose += (low - pose) * blend;
      body.position.y = -pose * 0.42 + Math.sin(time * 2) * 0.013;
      body.rotation.x = pose * 0.16;
      body.rotation.z = T.MathUtils.damp(body.rotation.z, -turn * 0.09, 8, dt);
      const stride = Math.min(1, blendSpeed / 5);
      for (let i = 0; i < 4; i++) {
        const phase = i === 0 || i === 3 ? 0 : Math.PI;
        legs[i].rotation.x = T.MathUtils.damp(
          legs[i].rotation.x,
          Math.sin(gait + phase) * stride * 0.68 +
            (i > 1 ? pose * 1.2 : -pose * 0.3),
          12,
          dt,
        );
      }
      const reaction = mood === 'react' ? Math.sin(time * 10) * 0.12 : 0;
      head.rotation.x = T.MathUtils.damp(
        head.rotation.x,
        pose * 0.25 + Math.sin(time * 1.3) * 0.035 + reaction,
        8,
        dt,
      );
      head.rotation.z = T.MathUtils.damp(
        head.rotation.z,
        turn * 0.1 + (mood === 'react' ? Math.sin(time * 8) * 0.12 : 0),
        8,
        dt,
      );
      head.rotation.y = T.MathUtils.damp(
        head.rotation.y,
        Math.sin(time * 0.55) * 0.055 * (1 - stride),
        6,
        dt,
      );
      for (let i = 0; i < tail.length; i++) {
        tail[i].rotation.x = 0.15 + Math.sin(time * 2.2 - i * 0.42) * 0.09;
        tail[i].rotation.y =
          Math.sin(time * 2.5 - i * 0.35) * (0.08 + stride * 0.06);
      }
      const blink = mood === 'sleep' ? 0.06 : time % 4.9 > 4.73 ? 0.1 : 1;
      eyes.forEach(
        (e) =>
          (e.scale.y = T.MathUtils.damp(
            e.scale.y,
            (e.material === iris ? 0.22 : e.material === dark ? 0.15 : 0.055) *
              blink,
            28,
            dt,
          )),
      );
      rig.position.y = mood === 'jump' ? 0.04 : 0;
    },
    dispose() {
      geo.dispose();
      root.traverse((o) => {
        if (o instanceof T.Mesh && o.geometry !== geo) o.geometry.dispose();
      });
      materials.forEach((m) => m.dispose());
    },
  };
}
