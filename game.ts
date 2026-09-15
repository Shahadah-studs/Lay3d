import * as THREE from 'three';
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xbae6fd); scene.fog = new THREE.FogExp2(0xbae6fd, 0.015);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight); renderer.shadowMap.enabled = true; document.body.appendChild(renderer.domElement);
const lightAmbient = new THREE.AmbientLight(0xffffff, 0.6); scene.add(lightAmbient);
const lightDirect = new THREE.DirectionalLight(0xfef08a, 1.0); lightDirect.position.set(20, 40, 20); lightDirect.castShadow = true; scene.add(lightDirect);
const laysBagGroup = new THREE.Group(); const bagGeo = new THREE.BoxGeometry(0.24, 0.36, 0.06); const bagMat = new THREE.MeshStandardMaterial({ color: 0xc91a09, roughness: 0.2, metalness: 0.1 });
const bagMesh = new THREE.Mesh(bagGeo, bagMat); bagMesh.castShadow = true; laysBagGroup.add(bagMesh);
const logoGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.01, 32); const logoMat = new THREE.MeshStandardMaterial({ color: 0xf2cd37, roughness: 0.4 });
const logoMesh = new THREE.Mesh(logoGeo, logoMat); logoMesh.rotation.x = Math.PI / 2; logoMesh.position.set(0, 0, 0.031); laysBagGroup.add(logoMesh); scene.add(laysBagGroup);
const handGroup = new THREE.Group(); const handGeo = new THREE.BoxGeometry(0.08, 0.15, 0.08); const handMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.8 });
const handMesh = new THREE.Mesh(handGeo, handMat); handGroup.add(handMesh);
const heldChipGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.005, 8); const heldChipMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
const heldChipMesh = new THREE.Mesh(heldChipGeo, heldChipMat); heldChipMesh.position.set(0, 0.08, 0); handGroup.add(heldChipMesh); scene.add(handGroup);
let isEatingAnimation = false; let animationProgress = 0; const crunchSound = new Audio('/crunching.mp3');
interface ChipParticle { mesh: THREE.Mesh; velocity: THREE.Vector3; rotationSpeed: THREE.Vector3; life: number; }
const activeChips: ChipParticle[] = [];
function spawnChipParticle() {
    const chipGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.005, 8); const chipMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 }); const chipMesh = new THREE.Mesh(chipGeo, chipMat);
    chipMesh.position.copy(laysBagGroup.position); chipMesh.position.y += 0.1;
    const direction = new THREE.Vector3(0, 0.5, -1).applyQuaternion(camera.quaternion).normalize(); const speed = 3.0 + Math.random() * 2.0; const velocity = direction.multiplyScalar(speed);
    velocity.x += (Math.random() - 0.5) * 0.5; velocity.y += (Math.random() - 0.5) * 0.5;
    const rotationSpeed = new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    scene.add(chipMesh); activeChips.push({ mesh: chipMesh, velocity, rotationSpeed, life: 1.0 });
}
let cameraPosition = new THREE.Vector3(0, 0, 0); let rotationYaw = 0; let rotationPitch = 0; const activeKeys: { [key: string]: boolean } = { w: false, a: false, s: false, d: false };
let isPointerLocked = false; document.body.addEventListener('click', () => { if (!isPointerLocked) document.body.requestPointerLock(); });
document.addEventListener('mousemove', (e) => { if (document.pointerLockElement !== document.body) return; isPointerLocked = true; rotationYaw -= e.movementX * 0.0025; rotationPitch -= e.movementY * 0.0025; rotationPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, rotationPitch)); });
document.addEventListener('pointerlockchange', () => { isPointerLocked = (document.pointerLockElement === document.body); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { document.exitPointerLock(); isPointerLocked = false; } if (e.key.toLowerCase() in activeKeys) activeKeys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { if (e.key.toLowerCase() in activeKeys) activeKeys[e.key.toLowerCase()] = false; });
let totalChipsCrunchCount = 0; const counterUiElement = document.getElementById("counter");
window.addEventListener('mousedown', () => { if (!isPointerLocked || isEatingAnimation) return; isEatingAnimation = true; animationProgress = 0; laysBagGroup.position.z += 0.06; setTimeout(() => { laysBagGroup.position.z -= 0.06; }, 60); });
const chunkSize = 60; const activeChunks = new Map<string, THREE.Group>(); const maxRenderDistance = 2;
const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 8); const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
const leavesGeo = new THREE.ConeGeometry(1.2, 2.5, 8); const leavesMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 });
const groundGeo = new THREE.PlaneGeometry(chunkSize, chunkSize); const groundMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 });
function createTreeElement(x: number, z: number): THREE.Group {
    const tg = new THREE.Group(); const tk = new THREE.Mesh(trunkGeo, trunkMat); tk.position.y = 1; tk.castShadow = true; tg.add(tk);
    const lv = new THREE.Mesh(leavesGeo, leavesMat); lv.position.y = 2.8; lv.castShadow = true; tg.add(lv); tg.position.set(x, -1.6, z); return tg;
}
function generateWorldChunk(cX: number, cZ: number) {
    const key = `${cX},${cZ}`; if (activeChunks.has(key)) return; const cg = new THREE.Group();
    const g = new THREE.Mesh(groundGeo, groundMat); g.rotation.x = -Math.PI / 2; g.position.set(cX * chunkSize, -1.6, cZ * chunkSize); g.receiveShadow = true; cg.add(g);
    const seed = Math.sin(cX * 12.9898 + cZ * 78.233) * 43758.5453; const treeCount = Math.floor((seed - Math.floor(seed)) * 8) + 4;
    for (let i = 0; i < treeCount; i++) {
        const lx = Math.sin(seed + i * 45.3) * 23.4; const lz = Math.cos(seed + i * 87.1) * 23.4;
        const tx = (cX * chunkSize) + (lx - Math.floor(lx)) * (chunkSize - 10) - (chunkSize / 2 - 5);
        const tz = (cZ * chunkSize) + (lz - Math.floor(lz)) * (chunkSize - 10) - (chunkSize / 2 - 5);
        cg.add(createTreeElement(tx, tz));
    }
    scene.add(cg); activeChunks.set(key, cg);
}
function updateChunksAroundPlayer() {
    const ccX = Math.round(cameraPosition.x / chunkSize); const ccZ = Math.round(cameraPosition.z / chunkSize);
    for (let x = -maxRenderDistance; x <= maxRenderDistance; x++) { for (let z = -maxRenderDistance; z <= maxRenderDistance; z++) { generateWorldChunk(ccX + x, ccZ + z); } }
    for (const [key, g] of activeChunks.entries()) {
        const [cx, cz] = key.split(',').map(Number);
        if (Math.abs(cx - ccX) > maxRenderDistance || Math.abs(cz - ccZ) > maxRenderDistance) { scene.remove(g); activeChunks.delete(key); }
    }
}
const processClock = new THREE.Clock();
function engineUpdateLoop() {
    requestAnimationFrame(engineUpdateLoop); const dt = processClock.getDelta();
    for (let i = activeChips.length - 1; i >= 0; i--) {
        const c = activeChips[i]; c.mesh.position.addScaledVector(c.velocity, dt); c.mesh.rotation.x += c.rotationSpeed.x * dt;
        c.mesh.rotation.y += c.rotationSpeed.y * dt; c.velocity.y -= 9.8 * dt; c.life -= dt * 0.8;
        if (c.life <= 0 || c.mesh.position.y < -1.6) { scene.remove(c.mesh); activeChips.splice(i, 1); }
    }
    camera.quaternion.setFromEuler(new THREE.Euler(rotationPitch, rotationYaw, 0, 'YXZ')); camera.position.copy(cameraPosition);
    const fv = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); fv.y = 0; fv.normalize();
    const rv = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); rv.y = 0; rv.normalize();
    const speed = 6.0 * dt;
    if (activeKeys.w) cameraPosition.addScaledVector(fv, speed); if (activeKeys.s) cameraPosition.addScaledVector(fv, -speed);
    if (activeKeys.d) cameraPosition.addScaledVector(rv, speed); if (activeKeys.a) cameraPosition.addScaledVector(rv, -speed);
    updateChunksAroundPlayer();
    laysBagGroup.position.copy(camera.position).add(new THREE.Vector3(0.2, -0.25, -0.45).applyQuaternion(camera.quaternion)); laysBagGroup.quaternion.copy(camera.quaternion);
    if (isEatingAnimation) {
        animationProgress += dt * 2.5; let hOffset = new THREE.Vector3();
        if (animationProgress < 0.4) hOffset.set(0.2, -0.6 + (0.35 * (animationProgress / 0.4)), -0.45);
        else if (animationProgress < 0.8) { const t = (animationProgress - 0.4) / 0.4; hOffset.set(0.2 - (0.2 * t), -0.25 + (0.25 * t), -0.45 + (0.25 * t)); }
        else if (animationProgress >= 1.0) {
            isEatingAnimation = false; totalChipsCrunchCount++; if (counterUiElement) counterUiElement.innerText = totalChipsCrunchCount.toString();
            crunchSound.currentTime = 0; crunchSound.play().catch(() => {}); spawnChipParticle();
        }
        if (isEatingAnimation) { handGroup.position.copy(camera.position).add(hOffset.applyQuaternion(camera.quaternion)); handGroup.quaternion.copy(camera.quaternion); handGroup.visible = true; }
    } else { handGroup.visible = false; }
    renderer.render(scene, camera);
}
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
engineUpdateLoop();

