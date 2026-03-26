// ============================================================
// NULL_SECTOR.Z - CORE ENGINE v2.0 (EL TALLO MAESTRO)
// ============================================================
import * as THREE from 'three';

export class NullSectorEngine {
    constructor(mapData, playerData, containerId) {
        // --- INYECCIÓN DE RAMAS ---
        this.mapData = mapData;
        this.playerData = playerData;
        this.container = document.getElementById(containerId);

        // --- NÚCLEO DE RENDERIZADO ---
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        
        // --- SISTEMAS INTERNOS ---
        this.clock = new THREE.Clock();
        this.keys = {};
        this.physicsWorld = []; 
        this.items = []; 
        this.lights = [];
        
        this.player = new THREE.Group();
        this.playerVel = new THREE.Vector3();
        this.isMoving = false;

        this.init();
    }

    init() {
        // Configuración de Pantalla Completa
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Atmósfera de "Null Sector"
        this.scene.background = new THREE.Color(this.mapData.env.fogColor);
        this.scene.fog = new THREE.FogExp2(this.mapData.env.fogColor, this.mapData.env.fogDensity);

        this.setupLights();
        this.buildVastCity();
        this.spawnSurvivor();

        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        window.addEventListener('resize', () => this.handleResize());

        this.mainLoop();
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0x1a1a2e, 0.5);
        this.scene.add(ambient);

        // Luz de Luna / Satélite con sombras masivas
        this.mainLight = new THREE.DirectionalLight(0x5555ff, 1.2);
        this.mainLight.position.set(200, 400, 200);
        this.mainLight.castShadow = true;
        
        this.mainLight.shadow.mapSize.set(8192, 8192); // Máxima resolución de sombras
        this.mainLight.shadow.camera.left = -500;
        this.mainLight.shadow.camera.right = 500;
        this.mainLight.shadow.camera.top = 500;
        this.mainLight.shadow.camera.bottom = -500;
        this.scene.add(this.mainLight);
    }

    buildVastCity() {
        // Suelo Infinito
        const groundGeo = new THREE.PlaneGeometry(5000, 5000);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid Industrial
        const grid = new THREE.GridHelper(5000, 200, 0x00ff41, 0x050505);
        this.scene.add(grid);

        // PROCESAMIENTO DE LA RAMA DE GEOMETRÍA
        this.mapData.geometry.forEach(obj => {
            const geo = new THREE.BoxGeometry(obj.w, obj.h, obj.d);
            const mat = new THREE.MeshStandardMaterial({ 
                color: obj.color, 
                metalness: 0.3, 
                roughness: 0.7 
            });
            const building = new THREE.Mesh(geo, mat);
            building.position.set(obj.x, obj.h / 2, obj.z);
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);

            if(obj.collision) {
                this.physicsWorld.push(new THREE.Box3().setFromObject(building));
            }

            // Inyectar Recursos solo dentro de Edificios
            if(obj.hasLoot && obj.lootTable) {
                this.generateLootInside(obj);
            }
        });
    }

    generateLootInside(building) {
        building.lootTable.forEach(loot => {
            const itemGeo = new THREE.IcosahedronGeometry(0.3, 0); // Polígono real
            const itemMat = new THREE.MeshStandardMaterial({ 
                color: loot.color, 
                emissive: loot.color, 
                emissiveIntensity: 0.5 
            });
            const item = new THREE.Mesh(itemGeo, itemMat);
            
            // Posicionamiento aleatorio dentro del volumen del edificio
            item.position.set(
                building.x + (Math.random() - 0.5) * (building.w - 1),
                0.5,
                building.z + (Math.random() - 0.5) * (building.d - 1)
            );
            this.scene.add(item);
            this.items.push(item);

            // Luz local para el recurso
            const light = new THREE.PointLight(loot.color, 5, 4);
            light.position.copy(item.position);
            light.position.y = 1;
            this.scene.add(light);
        });
    }

    spawnSurvivor() {
        const mSkin = new THREE.MeshStandardMaterial({ color: this.playerData.skin });
        const mGear = new THREE.MeshStandardMaterial({ color: this.playerData.gear });

        // Avatar Poligonal Articulado
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.4), mGear);
        torso.position.y = 1.3;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mSkin);
        head.position.y = 2.1;
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), mGear);
        legL.position.set(-0.25, 0.4, 0);
        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), mGear);
        legR.position.set(0.25, 0.4, 0);

        this.player.add(torso, head, legL, legR);
        this.player.position.set(0, 0, 0);
        this.scene.add(this.player);
        this.playerBox = new THREE.Box3();
    }

    mainLoop() {
        requestAnimationFrame(() => this.mainLoop());
        const dt = this.clock.getDelta();
        
        this.updatePhysics(dt);
        this.updateCamera(dt);
        this.renderer.render(this.scene, this.camera);
    }

    updatePhysics(dt) {
        const speed = this.playerData.baseSpeed * dt * 50;
        const nextPos = this.player.position.clone();
        this.isMoving = false;

        if(this.keys['KeyW']) { nextPos.z -= speed; this.isMoving = true; }
        if(this.keys['KeyS']) { nextPos.z += speed; this.isMoving = true; }
        if(this.keys['KeyA']) { nextPos.x -= speed; this.isMoving = true; }
        if(this.keys['KeyD']) { nextPos.x += speed; this.isMoving = true; }

        // Colisión AABB Real
        this.playerBox.setFromCenterAndSize(
            new THREE.Vector3(nextPos.x, 1, nextPos.z), 
            new THREE.Vector3(1, 2, 1)
        );

        let hit = this.physicsWorld.some(box => box.intersectsBox(this.playerBox));

        if(!hit) {
            this.player.position.copy(nextPos);
        }

        if(this.isMoving) {
            const angle = Math.atan2(nextPos.x - this.player.position.x, nextPos.z - this.player.position.z);
            this.player.rotation.y = THREE.MathUtils.lerp(this.player.rotation.y, angle, 0.1);
        }
    }

    updateCamera(dt) {
        const targetCam = new THREE.Vector3(this.player.position.x, 25, this.player.position.z + 20);
        this.camera.position.lerp(targetCam, 0.05);
        this.camera.lookAt(this.player.position);
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
