import * as THREE from 'three';

import { LIGHTING } from './constants';

/**
 * 안식처 결 라이팅 (spec D11) — warm tone + soft shadow + Fog.
 * 차가운 흰 라이팅 = 사무실 결 (위반 신호).
 */
export function applyWarmLighting(scene: THREE.Scene): void {
  scene.background = new THREE.Color(LIGHTING.BACKGROUND);
  scene.fog = new THREE.Fog(LIGHTING.FOG_COLOR, LIGHTING.FOG_NEAR, LIGHTING.FOG_FAR);

  const ambient = new THREE.AmbientLight(LIGHTING.AMBIENT_COLOR, LIGHTING.AMBIENT_INTENSITY);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(
    LIGHTING.DIRECTIONAL_COLOR,
    LIGHTING.DIRECTIONAL_INTENSITY,
  );
  directional.position.set(
    LIGHTING.DIRECTIONAL_POSITION.x,
    LIGHTING.DIRECTIONAL_POSITION.y,
    LIGHTING.DIRECTIONAL_POSITION.z,
  );
  directional.castShadow = true;
  directional.shadow.mapSize.width = 2048;
  directional.shadow.mapSize.height = 2048;
  directional.shadow.camera.near = 0.5;
  directional.shadow.camera.far = 60;
  directional.shadow.camera.left = -30;
  directional.shadow.camera.right = 30;
  directional.shadow.camera.top = 30;
  directional.shadow.camera.bottom = -30;
  directional.shadow.bias = -0.0005;
  scene.add(directional);
}
