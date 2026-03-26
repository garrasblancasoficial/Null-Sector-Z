// ============================================================
// NULL_SECTOR.Z - CORE ENGINE (EL TALLO ROBUSTO)
// ============================================================
import * as THREE from 'three';

export class NullSectorEngine {
    constructor(mapData, playerData, containerId) {
        this.data = mapData;
        this.playerConfig = playerData;
        this.container = document.getElementById(containerId);
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.keys = {};
        this.physicsWorld = []; 
        this.recursos = []; // Array para hachas, comida, etc.
        
        this.boot();
    }

    boot() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.scene.background = new THREE.Color(this.data.env.fogColor);
        this.scene.fog = new THREE.FogExp2(this.data.env.fogColor, this.data.env.fogDensity);

        this.setupLighting();
        this.buildWorld();
        this.spawnPlayer();

        window.onkeydown = (e) => this.keys[e.code] = true;
        window.onkeyup = (e) => this.keys[e.code] = false;
        
        this.run();
    }

    setupLighting() {
        const ambient = new THREE.AmbientLight(0x222233, 0.6);
        this.scene.add(ambient);

        const moon = new THREE.DirectionalLight(0xaaaaff, 0.8);
        moon.position.set(50, 200, 50);
        moon.castShadow = true;
        moon.shadow.mapSize.set(4096, 4096); // Sombras de alta resolución
        this.scene.add(moon);
    }

    buildWorld() {
        // Suelo masivo con textura de rejilla industrial
        const groundGeo = new THREE.PlaneGeometry(2000, 2000);
        const groundMat = new THREE.MeshStandardMaterial({ color: this.data.env.groundColor });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // --- PROCESAMIENTO DE EDIFICIOS (LA RAMA LARGA) ---
        this.data.geometry.forEach(obj => {
            const geo = new THREE.BoxGeometry(obj.w, obj.h, obj.d);
            const mat = new THREE.MeshStandardMaterial({ 
                color: obj.color, 
                roughness: 0.8,
                metalness: 0.2
            });
            const building = new THREE.Mesh(geo, mat);
            building.position.set(obj.x, obj.h / 2, obj.z);
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);

            if(obj.collision) {
                this.physicsWorld.push(new THREE.Box3().setFromObject(building));
            }

            // --- LÓGICA DE RECURSOS DENTRO DE EDIFICIOS ---
            if(obj.recursos && obj.recursos.length > 0) {
                obj.recursos.forEach(res => {
                    this.crearRecursoFisico(res, obj.x, obj.z);
                });
            }
        });
    }

    crearRecursoFisico(res, parentX, parentZ) {
        // El tallo crea el objeto poligonal del recurso
        const itemGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const itemMat = new THREE.MeshStandardMaterial({ 
            color: res.tipo === 'ARMA' ? 0xff0000 : 0x00ff00,
            emissive: res.tipo === 'ARMA' ? 0x330000 : 0x003300
        });
        const item = new THREE.Mesh(itemGeo, itemMat);
        
        // Posicionamiento relativo al edificio (un poco movido del centro)
        item.position.set(parentX + (Math.random() - 0.5) * 2, 0.5, parentZ + (Math.random() - 0.5) * 2);
        item.name = res.nombre;
        this.scene.add(item);
        this.recursos.push(item);
    }

    spawnPlayer() {
        this.player = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.5), new THREE.MeshStandardMaterial({ color: this.playerConfig.gear }));
        body.position.y = 0.9;
        body.castShadow = true;
        this.player.add(body);
        this.scene.add(this.player);
        this.playerBox = new THREE.Box3();
    }

    run() {
        requestAnimationFrame(() => this.run());
        const delta = 0.15;
        const nextPos = this.player.position.clone();

        if(this.keys['KeyW']) nextPos.z -= delta;
        if(this.keys['KeyS']) nextPos.z += delta;
        if(this.keys['KeyA']) nextPos.x -= delta;
        if(this.keys['KeyD']) nextPos.x += delta;

        this.playerBox.setFromCenterAndSize(nextPos, new THREE.Vector3(0.8, 1.8, 0.5));
        let col = this.physicsWorld.some(box => box.intersectsBox(this.playerBox));

        if(!col) this.player.position.copy(nextPos);

        // Cámara PZ Style (Cenital inclinada)
        this.camera.position.lerp(new THREE.Vector3(this.player.position.x, 20, this.player.position.z + 18), 0.08);
        this.camera.lookAt(this.player.position);
        
        this.renderer.render(this.scene, this.camera);
    }
}
