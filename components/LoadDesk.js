import * as THREE from 'three'
import { PCFShadowMap, PCFSoftShadowMap } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default async function render(width, height) {
    var container = document.getElementById('canvas');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF5FFF5);

    const camera = new THREE.PerspectiveCamera(35, width / height, .1, 1000);
    camera.position.z = 1
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    // Use soft shadows only on larger devices because they're more computationally costly
    renderer.shadowMap.type = window.innerWidth < 750 ? PCFShadowMap : PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Light that brightens whole model
    const light = new THREE.AmbientLight(0x404040, 1.5); // soft white light
    scene.add(light);

    // Sun-like light that brightens front and casts shadow behind
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(1, 1, 2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.camera.top = 2;
    dirLight.shadow.camera.bottom = - 2;
    dirLight.shadow.camera.left = - 2;
    dirLight.shadow.camera.right = 2;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 40;
    scene.add(dirLight);


    // Orbit Controls
    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.maxPolarAngle = Math.PI / 2;
    // controls.minPolarAngle = Math.PI / 2;
    // controls.enableZoom = false;


    // Loading manager to show desk image before desk 3d model is loaded
    const loadManager = new THREE.LoadingManager(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.zIndex = -1
            container.classList.remove('scale-75')
        }
    });


    // Create shadowmaterial ground
    const shadowMaterial = new THREE.ShadowMaterial();
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10, 16, 16),
        shadowMaterial
    );
    shadowMaterial.opacity = 0.2
    ground.rotateX(-51.5);
    ground.position.z = -.293;
    ground.castShadow = false;
    ground.receiveShadow = true;
    scene.add(ground);


    // Instantiate a loader
    const loader = new GLTFLoader(loadManager);

    // Load a glTF resource
    await loader.load(
        // resource URL
        'assets/models/desk/desk.gltf',
        // called when the resource is loaded
        function (gltf) {
            scene.add(gltf.scene);
            gltf.scene.rotateX(-49.9);
            gltf.scene.position.y = -0.1;
            gltf.scene.rotation.y = 550.2;

            gltf.scene.traverse(function (object) {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.receiveShadow = true
                }
            })

            let rotation = window.innerWidth < 750 ? 0.005 : 0.0013

            const animate = function () {
                requestAnimationFrame(animate);
                gltf.scene.rotation.y += rotation;
                renderer.render(scene, camera);

            };

            animate();
        },
        // called while loading is progressing
        function (xhr) {
            if (xhr.loaded === 173632) {
                console.log("Model loaded");
            }
        },
        function (error) {
            console.log(error)
        }
    );

    window.onresize = function () {
        renderer.setSize(container.offsetHeight, container.offsetWidth);
    };
}