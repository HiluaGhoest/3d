import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Set the background color of the scene
renderer.setClearColor(0x000000);  // Black background

// Add OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

// Add basic lighting to the scene with increased intensity
const ambientLight = new THREE.AmbientLight(0x404040, 1.5); // Increase ambient light intensity
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3); // Increase directional light intensity
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Create a PointLight with increased intensity
const pointLight = new THREE.PointLight(0xffffff, 3, 100); // Increase intensity
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// Create a SpotLight with increased intensity
const spotLight = new THREE.SpotLight(0xffffff, 3.0); // Increase intensity
spotLight.position.set(5, 10, 5);
spotLight.target.position.set(0, 0, 0);
spotLight.angle = Math.PI / 6;
spotLight.intensity = 5; // Keep this high
spotLight.distance = 500;
spotLight.penumbra = 0.1;
spotLight.decay = 1;
scene.add(spotLight);

// Create a HemisphereLight with increased intensity
const hemiLight = new THREE.HemisphereLight(0x4040ff, 0x404040, 2.0); // Increase intensity
scene.add(hemiLight);

// Load the GLTF model (the car)
const loader = new GLTFLoader();

// Load a cubemap (environment map) for reflections
const hdrLoader = new RGBELoader();
hdrLoader.setDataType(THREE.HalfFloatType); // For better performance with HDR environments

// Utility function to load textures from a folder
function loadTexturesFromFolder(basePath, textureNames) {
    const textures = {};
    const texturePromises = textureNames.map(name => {
        return new Promise((resolve, reject) => {
            // Try to load the .jpg texture first
            const texturePathJPG = `textures/${basePath}/${name}.jpg`;
            const texturePathPNG = `textures/${basePath}/${name}.png`;

            const textureLoader = new THREE.TextureLoader();

            // Try loading the JPG first
            textureLoader.load(
                texturePathJPG,
                texture => {
                    textures[name] = texture;
                    resolve(); // Resolve when texture is loaded
                },
                undefined, // Progress handler (optional)
                () => {
                    // If JPG fails, try PNG
                    textureLoader.load(
                        texturePathPNG,
                        texture => {
                            textures[name] = texture;
                            resolve(); // Resolve when texture is loaded
                        },
                        undefined,
                        error => reject(`Failed to load texture for ${name}`) // Reject if both fail
                    );
                }
            );
        });
    });

    // Wait until all textures are loaded
    return Promise.all(texturePromises).then(() => textures);
}


  
// Assuming you have a cubemap image file, replace the path with the actual cubemap texture
hdrLoader.load('hdr/little_paris_eiffel_tower_4k.hdr', function (hdrEquirect) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envMap = pmremGenerator.fromEquirectangular(hdrEquirect).texture;

    // Set the environment map globally
    scene.environment = envMap;  // This sets the global environment map for the scene
    scene.background = envMap;  // Optional: Set the background to the same environment map

    hdrLoader.load('hdr/little_paris_eiffel_tower_4k.hdr', function (hdrEquirect) {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const envMap = pmremGenerator.fromEquirectangular(hdrEquirect).texture;
    
        // Set the environment map globally
        scene.environment = envMap;  // This sets the global environment map for the scene
        scene.background = envMap;  // Optional: Set the background to the same environment map
    
        // Load the GLTF model
        loader.load('models/car/audi_futuristic_concept_car.glb', function (gltf) {
            const carModel = gltf.scene;
            scene.add(carModel);
    
            // Define the texture base path and texture names
            const carBodyTextures = 'metal'; // Example for a specific mesh
            const carBodyNames = ['ao', 'color', 'height', 'mettalic', 'normal', 'roughness'];
    
            // Load the textures asynchronously
            loadTexturesFromFolder(carBodyTextures, carBodyNames).then(textures => {
                // Flip textures vertically (if required)
                Object.values(textures).forEach(texture => texture.flipY = false);
    
                // Traverse through all objects in the scene to apply the glass texture
                carModel.traverse(function (child) {
                    if (child.isMesh && child.material.isMeshStandardMaterial) {
                        console.log("Checking mesh: ", child.name);
                        console.log("Material name for mesh", child.name, ":", child.material.name);
    
                        // Check for meshes with the "windows" material
                        if (child.material.name === 'windows') {
                            console.log("Found mesh with 'windows' material:", child.name);
    
                            // Apply window texture for glass parts
                            child.material.map = textures.color;  // Assuming 'color' is the window texture name
                            child.material.normalMap = textures.normal;
                            child.material.aoMap = textures.ao;
                            child.material.metalnessMap = textures.metallic;
                            child.material.roughnessMap = textures.roughness;
                            child.material.heightMap = textures.height;
    
                            // Glass material should have a higher roughness and lower metalness
                            child.material.metalness = 0.0;
                            child.material.roughness = 0.6; // Glass tends to have a higher roughness
    
                            // Enable transparency for the glass material
                            child.material.transparent = true;
                            child.material.opacity = 0.5;  // Adjust as needed for glass transparency
                            child.material.blending = THREE.NormalBlending; // Standard blending mode for transparency
                        } else {
                            // Apply the default body texture to other parts
                            if (child.material.name === 'carbody') {
                                child.material.map = textures.color;
                                child.material.normalMap = textures.normal;
                                child.material.aoMap = textures.ao;
                                child.material.metalnessMap = textures.metallic;
                                child.material.roughnessMap = textures.roughness;
                            }
    
                            // Set general PBR properties for the body parts
                            child.material.metalness = 1.0;
                            child.material.roughness = 0.3;
                        }
    
                        // Ensure material is updated
                        child.material.needsUpdate = true;
                    }
                });
    
            }).catch(err => {
                console.error("Error loading textures:", err);
            });
    
        }, undefined, function (error) {
            console.error(error);
        });
    });    
});

// Camera positioning
camera.position.z = 5;

// Handle window resizing
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});


// Update the helper in the animation loop
function animate() {
    controls.update(); // Update controls
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);