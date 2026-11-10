import {
  CylinderGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Shape,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";

const UP = new Vector3(0, 1, 0);

/** Low poly segment count: 6 to 12 sides, fewer on the lighter scene */
export function segments(count: number, detail: number): number {
  return Math.min(12, Math.max(6, Math.round((count / 5) * detail)));
}

export function part(
  geometry: BufferGeometry,
  material: Material,
  position: [number, number, number] = [0, 0, 0],
): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A cylinder spanning two points: legs, poles, tonearms */
export function rod(from: Vector3, to: Vector3, radius: number, material: Material, sides = 6): Mesh {
  const direction = to.clone().sub(from);
  const mesh = part(new CylinderGeometry(radius, radius, direction.length(), sides), material);
  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  return mesh;
}

const edgeMaterial = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });

/** Thin white edges over the main shapes, so the facets read against the dark */
export function outline(mesh: Mesh): Mesh {
  mesh.add(new LineSegments(new EdgesGeometry(mesh.geometry, 25), edgeMaterial));
  return mesh;
}

/** A flat slab with cut corners: width along x, depth along z, its base at y = 0 */
export function chamferedSlab(width: number, depth: number, height: number, chamfer: number): ExtrudeGeometry {
  const x = width / 2;
  const z = depth / 2;
  const c = Math.min(chamfer, x, z);

  const shape = new Shape();
  shape.moveTo(-x + c, -z);
  shape.lineTo(x - c, -z);
  shape.lineTo(x, -z + c);
  shape.lineTo(x, z - c);
  shape.lineTo(x - c, z);
  shape.lineTo(-x + c, z);
  shape.lineTo(-x, z - c);
  shape.lineTo(-x, -z + c);
  shape.closePath();

  const geometry = new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  // Extruded along z; turn it so the height runs up y and the base sits on y = 0
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
