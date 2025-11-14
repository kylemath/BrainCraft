// BrainCraft - Minecraft in a Simulated Brain
class BrainCraft {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        
        // Game state
        this.world = new Map();
        this.player = {
            position: new THREE.Vector3(0, 10, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            onGround: false
        };
        this.selectedBlock = 'neuron';
        this.raycaster = new THREE.Raycaster();
        
        // Brain-themed block types
        this.blockTypes = {
            neuron: { color: 0xff6b6b, emissive: 0x331111, name: 'Neuron' },
            synapse: { color: 0x4ecdc4, emissive: 0x112222, name: 'Synapse' },
            glial: { color: 0x45b7d1, emissive: 0x111133, name: 'Glial Cell' },
            blood: { color: 0xf39c12, emissive: 0x332211, name: 'Blood Vessel' },
            tissue: { color: 0x9b59b6, emissive: 0x221133, name: 'Brain Tissue' }
        };
        
        this.init();
    }
    
    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x0a0a1a);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);
        
        // Setup camera
        this.camera.position.copy(this.player.position);
        
        // Setup lighting
        this.setupLighting();
        
        // Generate brain world
        this.generateBrainWorld();
        
        // Setup controls
        this.setupControls();
        
        // Setup UI
        this.setupUI();
        
        // Start game loop
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupLighting() {
        // Ambient lighting for brain atmosphere
        const ambientLight = new THREE.AmbientLight(0x404080, 0.3);
        this.scene.add(ambientLight);
        
        // Neural network style directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Add pulsing neural activity lights
        this.neuralLights = [];
        for (let i = 0; i < 5; i++) {
            const light = new THREE.PointLight(0x00ff00, 1, 30);
            light.position.set(
                (Math.random() - 0.5) * 100,
                Math.random() * 50 + 10,
                (Math.random() - 0.5) * 100
            );
            this.scene.add(light);
            this.neuralLights.push(light);
        }
    }
    
    generateBrainWorld() {
        const worldSize = 32;
        const noise = new SimplexNoise();
        
        // Generate brain-like terrain using noise
        for (let x = -worldSize; x < worldSize; x++) {
            for (let z = -worldSize; z < worldSize; z++) {
                // Base height using noise
                const baseHeight = Math.floor(noise.noise2D(x * 0.1, z * 0.1) * 8 + 5);
                
                for (let y = 0; y < baseHeight + 5; y++) {
                    let blockType = 'tissue'; // Default brain tissue
                    
                    // Create brain structures
                    if (y < baseHeight) {
                        // Underground layers
                        if (Math.random() < 0.1) blockType = 'blood';
                        else if (Math.random() < 0.2) blockType = 'glial';
                    } else if (y === baseHeight) {
                        // Surface layer
                        if (Math.random() < 0.3) blockType = 'neuron';
                        else if (Math.random() < 0.4) blockType = 'synapse';
                    } else if (y > baseHeight && y < baseHeight + 3) {
                        // Above ground - sparse neurons and synapses
                        if (Math.random() < 0.05) blockType = 'neuron';
                        else if (Math.random() < 0.08) blockType = 'synapse';
                    }
                    
                    this.setBlock(x, y, z, blockType);
                }
            }
        }
        
        // Create some floating neural clusters
        for (let i = 0; i < 20; i++) {
            const clusterPos = new THREE.Vector3(
                (Math.random() - 0.5) * 60,
                Math.random() * 30 + 20,
                (Math.random() - 0.5) * 60
            );
            this.createNeuralCluster(clusterPos);
        }
    }
    
    createNeuralCluster(center) {
        const radius = Math.random() * 5 + 2;
        for (let x = -radius; x <= radius; x++) {
            for (let y = -radius; y <= radius; y++) {
                for (let z = -radius; z <= radius; z++) {
                    if (x*x + y*y + z*z <= radius*radius) {
                        const pos = center.clone().add(new THREE.Vector3(x, y, z));
                        const blockType = Math.random() < 0.6 ? 'neuron' : 'synapse';
                        this.setBlock(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z), blockType);
                    }
                }
            }
        }
    }
    
    setBlock(x, y, z, blockType) {
        const key = `${x},${y},${z}`;
        this.world.set(key, blockType);
        this.createBlockMesh(x, y, z, blockType);
    }
    
    getBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        return this.world.get(key);
    }
    
    createBlockMesh(x, y, z, blockType) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({
            color: this.blockTypes[blockType].color,
            emissive: this.blockTypes[blockType].emissive
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { blockType, position: { x, y, z } };
        
        this.scene.add(mesh);
        return mesh;
    }
    
    setupControls() {
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.mouseDown = { left: false, right: false };
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Number keys for block selection
            if (e.code >= 'Digit1' && e.code <= 'Digit5') {
                const index = parseInt(e.code.replace('Digit', '')) - 1;
                const blockTypes = Object.keys(this.blockTypes);
                if (blockTypes[index]) {
                    this.selectedBlock = blockTypes[index];
                    this.updateInventoryUI();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse controls
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.renderer.domElement) {
                this.camera.rotation.y -= e.movementX * 0.002;
                this.camera.rotation.x -= e.movementY * 0.002;
                this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x));
            }
        });
        
        document.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement === this.renderer.domElement) {
                if (e.button === 0) this.mouseDown.left = true;
                if (e.button === 2) this.mouseDown.right = true;
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouseDown.left = false;
            if (e.button === 2) this.mouseDown.right = false;
        });
        
        // Click to lock pointer
        this.renderer.domElement.addEventListener('click', () => {
            this.renderer.domElement.requestPointerLock();
        });
        
        // Prevent context menu
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Inventory slot clicks
        document.querySelectorAll('.inventory-slot').forEach((slot, index) => {
            slot.addEventListener('click', () => {
                const blockTypes = Object.keys(this.blockTypes);
                this.selectedBlock = blockTypes[index];
                this.updateInventoryUI();
            });
        });
    }
    
    updateInventoryUI() {
        document.querySelectorAll('.inventory-slot').forEach((slot, index) => {
            const blockTypes = Object.keys(this.blockTypes);
            slot.classList.toggle('active', blockTypes[index] === this.selectedBlock);
        });
    }
    
    setupUI() {
        this.updateInventoryUI();
    }
    
    updatePlayer(deltaTime) {
        const moveSpeed = 10;
        const jumpForce = 15;
        const gravity = -30;
        
        // Handle movement
        const moveVector = new THREE.Vector3();
        
        if (this.keys['KeyW']) moveVector.z -= 1;
        if (this.keys['KeyS']) moveVector.z += 1;
        if (this.keys['KeyA']) moveVector.x -= 1;
        if (this.keys['KeyD']) moveVector.x += 1;
        
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.multiplyScalar(moveSpeed * deltaTime);
            
            // Apply camera rotation to movement
            moveVector.applyEuler(new THREE.Euler(0, this.camera.rotation.y, 0));
            this.player.velocity.x = moveVector.x;
            this.player.velocity.z = moveVector.z;
        } else {
            this.player.velocity.x *= 0.8;
            this.player.velocity.z *= 0.8;
        }
        
        // Handle jumping
        if (this.keys['Space'] && this.player.onGround) {
            this.player.velocity.y = jumpForce;
            this.player.onGround = false;
        }
        
        // Apply gravity
        this.player.velocity.y += gravity * deltaTime;
        
        // Update position
        this.player.position.add(this.player.velocity.clone().multiplyScalar(deltaTime));
        
        // Ground collision
        const groundY = this.getGroundHeight(this.player.position.x, this.player.position.z);
        if (this.player.position.y <= groundY + 1.8) {
            this.player.position.y = groundY + 1.8;
            this.player.velocity.y = 0;
            this.player.onGround = true;
        } else {
            this.player.onGround = false;
        }
        
        // Update camera position
        this.camera.position.copy(this.player.position);
        this.camera.position.y += 1.6; // Eye height
        
        // Update UI
        document.getElementById('position').textContent = 
            `${Math.floor(this.player.position.x)}, ${Math.floor(this.player.position.y)}, ${Math.floor(this.player.position.z)}`;
    }
    
    getGroundHeight(x, z) {
        const checkY = 50;
        for (let y = checkY; y >= 0; y--) {
            if (this.getBlock(Math.floor(x), y, Math.floor(z))) {
                return y;
            }
        }
        return 0;
    }
    
    handleBlockInteraction() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const mesh = intersect.object;
            
            if (mesh.userData.blockType) {
                const pos = mesh.userData.position;
                document.getElementById('lookingAt').textContent = this.blockTypes[mesh.userData.blockType].name;
                
                // Left click - break block
                if (this.mouseDown.left) {
                    this.breakBlock(pos.x, pos.y, pos.z);
                }
                
                // Right click - place block
                if (this.mouseDown.right) {
                    const face = intersect.face;
                    const normal = face.normal;
                    const newPos = {
                        x: pos.x + Math.round(normal.x),
                        y: pos.y + Math.round(normal.y),
                        z: pos.z + Math.round(normal.z)
                    };
                    this.placeBlock(newPos.x, newPos.y, newPos.z, this.selectedBlock);
                }
            }
        } else {
            document.getElementById('lookingAt').textContent = 'None';
        }
    }
    
    breakBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        if (this.world.has(key)) {
            this.world.delete(key);
            
            // Remove mesh from scene
            this.scene.children.forEach((child, index) => {
                if (child.userData.position && 
                    child.userData.position.x === x &&
                    child.userData.position.y === y &&
                    child.userData.position.z === z) {
                    this.scene.remove(child);
                }
            });
        }
    }
    
    placeBlock(x, y, z, blockType) {
        if (!this.getBlock(x, y, z)) {
            this.setBlock(x, y, z, blockType);
        }
    }
    
    updateNeuralLights(deltaTime) {
        const time = this.clock.getElapsedTime();
        this.neuralLights.forEach((light, index) => {
            light.intensity = 0.5 + Math.sin(time * 2 + index) * 0.3;
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        this.updatePlayer(deltaTime);
        this.handleBlockInteraction();
        this.updateNeuralLights(deltaTime);
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Simple noise function for terrain generation
class SimplexNoise {
    constructor() {
        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        this.p = [];
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(Math.random() * 256);
        }
        this.perm = [];
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    }
    
    noise2D(xin, yin) {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        
        let s = (xin + yin) * F2;
        let i = Math.floor(xin + s);
        let j = Math.floor(yin + s);
        
        let t = (i + j) * G2;
        let x0 = xin - (i - t);
        let y0 = yin - (j - t);
        
        let i1, j1;
        if (x0 > y0) {
            i1 = 1; j1 = 0;
        } else {
            i1 = 0; j1 = 1;
        }
        
        let x1 = x0 - i1 + G2;
        let y1 = y0 - j1 + G2;
        let x2 = x0 - 1.0 + 2.0 * G2;
        let y2 = y0 - 1.0 + 2.0 * G2;
        
        i &= 255;
        j &= 255;
        
        let gi0 = this.perm[i + this.perm[j]] % 12;
        let gi1 = this.perm[i + i1 + this.perm[j + j1]] % 12;
        let gi2 = this.perm[i + 1 + this.perm[j + 1]] % 12;
        
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        let n0 = t0 < 0 ? 0.0 : Math.pow(t0, 4) * this.dot(this.grad3[gi0], x0, y0);
        
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        let n1 = t1 < 0 ? 0.0 : Math.pow(t1, 4) * this.dot(this.grad3[gi1], x1, y1);
        
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        let n2 = t2 < 0 ? 0.0 : Math.pow(t2, 4) * this.dot(this.grad3[gi2], x2, y2);
        
        return 70.0 * (n0 + n1 + n2);
    }
    
    dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }
}

// Start the game
window.addEventListener('load', () => {
    new BrainCraft();
});
