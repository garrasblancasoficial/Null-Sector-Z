// ============================================================
// NULL_SECTOR.Z - TALLO MAESTRO v3.0 (Soporte Masivo)
// ============================================================
import * as THREE from 'three';

export class NullSectorEngine {
    constructor(mapData, playerData, containerId) {
        this.data = mapData;
        this.pConfig = playerData;
        this.container = document.getElementById(containerId);
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
        
        this.physicsWorld = [];
        this.interactuables = [];
        this.keys = {};

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Atmósfera de Null_Sector
        this.scene.background = new THREE.Color(0x020205);
        this.scene.fog = new THREE.FogExp2(0x020205, 0.008);

        this.setupLights();
        this.generateMegaDistrict(); // El Tallo procesa la Rama
        this.spawnSurvivor();

        window.onkeydown = (e) => this.keys[e.code] = true;
        window.onkeyup = (e) => this.keys[e.code] = false;
        
        this.run();
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0x222233, 0.4);
        this.scene.add(ambient);

        const moon = new THREE.DirectionalLight(0xaaaaff, 0.7);
        moon.position.set(200, 500, 200);
        moon.castShadow = true;
        moon.shadow.mapSize.set(4096, 4096);
        this.scene.add(moon);
    }

    generateMegaDistrict() {
        // Suelo Infinito
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(10000, 10000),
            new THREE.MeshStandardMaterial({ color: 0x0a0a0a })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // --- PROCESAMIENTO DE ESTRUCTURAS ---
        this.data.estructuras.forEach(obj => {
            // 1. Construir Edificio Base
            const buildingGeo = new THREE.BoxGeometry(obj.w, obj.h, obj.d);
            const buildingMat = new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.9 });
            const building = new THREE.Mesh(buildingGeo, buildingMat);
            building.position.set(obj.x, obj.h / 2, obj.z);
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);

            if(obj.col) this.physicsWorld.push(new THREE.Box3().setFromObject(building));

            // 2. GENERADOR DE INTERIORES (Muebles Aleatorios)
            if(obj.tipo === 'RESIDENCIAL' || obj.tipo === 'TIENDA') {
                this.generateInterior(obj);
            }
        });
    }

    generateInterior(building) {
        // El Tallo decide qué muebles poner según el tipo de edificio
        const numMuebles = Math.floor(Math.random() * 4) + 2; // Entre 2 y 5 muebles por casa
        
        for(let i = 0; i < numMuebles; i++) {
            const mType = building.tipo === 'RESIDENCIAL' 
                ? ['SOFA', 'MESA_PEQUEÑA', 'ESTANTERIA', 'CAMA'][Math.floor(Math.random()*4)]
                : ['MOSTRADOR', 'ESTANTE_ARMAS', 'CAJA_REGISTRADORA'][Math.floor(Math.random()*3)];

            const mGeo = new THREE.BoxGeometry(1.5, 0.8, 0.8);
            const mMat = new THREE.MeshStandardMaterial({ color: 0x443322 });
            const mueble = new THREE.Mesh(mGeo, mMat);

            // Posicionamiento aleatorio DENTRO de la casa
            mueble.position.set(
                building.x + (Math.random() - 0.5) * (building.w - 2),
                0.4,
                building.z + (Math.random() - 0.5) * (building.d - 2)
            );
            this.scene.add(mueble);
            this.physicsWorld.push(new THREE.Box3().setFromObject(mueble));

            // 3. SISTEMA DE LOOT SEGÚN DISTRITO/TIENDA
            if(Math.random() > 0.5) {
                this.dropLoot(mueble.position, building.subTipo);
            }
        }
    }

    dropLoot(pos, subTipo) {
        // El Tallo crea el loot basado en el subTipo de la Rama
        const lootTable = {
            'ARMERIA': { color: 0xff0000, name: 'ARMA' },
            'FARMACIA': { color: 0x00ffff, name: 'MEDICINA' },
            'SUPERMERCADO': { color: 0xffff00, name: 'COMIDA' },
            'CASA': { color: 0xffffff, name: 'UTILIDAD' }
        };

        const config = lootTable[subTipo] || lootTable['CASA'];
        const lootGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const lootMat = new THREE.MeshStandardMaterial({ color: config.color, emissive: config.color });
        const loot = new THREE.Mesh(lootGeo, lootMat);
        loot.position.set(pos.x, 1, pos.z);
        this.scene.add(loot);
    }

    spawnSurvivor() {
        this.player = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.5), new THREE.MeshStandardMaterial({ color: this.pConfig.gear }));
        body.position.y = 0.9;
        this.player.add(body);
        this.scene.add(this.player);
        this.playerBox = new THREE.Box3();
    }

    run() {
        requestAnimationFrame(() => this.run());
        const delta = 0.2 * this.pConfig.speed;
        const nextPos = this.player.position.clone();

        if(this.keys['KeyW']) nextPos.z -= delta;
        if(this.keys['KeyS']) nextPos.z += delta;
        if(this.keys['KeyA']) nextPos.x -= delta;
        if(this.keys['KeyD']) nextPos.x += delta;

        this.playerBox.setFromCenterAndSize(nextPos, new THREE.Vector3(0.8, 1.8, 0.5));
        let hit = this.physicsWorld.some(box => box.intersectsBox(this.playerBox));

        if(!hit) this.player.position.copy(nextPos);

        this.camera.position.lerp(new THREE.Vector3(this.player.position.x, 25, this.player.position.z + 20), 0.1);
        this.camera.lookAt(this.player.position);
        this.renderer.render(this.scene, this.camera);
    }
}
