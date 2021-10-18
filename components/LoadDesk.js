import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default async function render(width, height) {
    var container = document.getElementById('canvas');

    const scene = new THREE.Scene();
    const backgroundColor = new THREE.Color(0xF5FFF5);
    scene.background = backgroundColor

    const camera = new THREE.PerspectiveCamera(35, width / height, .1, 1000);
    camera.position.z = 0.8
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Light that brightens whole model
    const light = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(light);

    // Sun-like light that brightens front
    const pointLight = new THREE.PointLight(0xffffff, 8, 100);
    pointLight.position.set(50, 50, 50);
    scene.add(pointLight);

    // Instantiate a loader
    const loader = new GLTFLoader();

    // Load a glTF resource
    await loader.load(
        // resource URL
        'assets/models/desk/desk.gltf',
        // called when the resource is loaded
        function (gltf) {
            scene.add(gltf.scene);
            gltf.scene.rotateX(-49.9)
            gltf.scene.position.y = -0.1
            gltf.scene.rotation.y = 550

            const animate = function () {
                requestAnimationFrame(animate);
                gltf.scene.rotation.y += 0.001;
                renderer.render(scene, camera);
            };

            animate();
        },
        // called while loading is progressing
        function (xhr) {
        },
        function (error) {
            console.log(error)
        }
    );

    // document.getElementById('blocker').style.visibility = 'hidden'
}