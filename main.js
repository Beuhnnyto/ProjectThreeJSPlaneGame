import * as THREE from "three";
import InputsGestion from "./js/inputs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

let scene, camera, renderer;
const keyboard = new InputsGestion();
const clock = new THREE.Clock();
let movingCube;
const collideMeshList = [];
const cubes = [];
let crash = false;
let score = 0;
const scoreText = document.getElementById("score");
let id = 0;
let crashId = " ";
let lastCrashId = " ";
let gameTime = 60; // 60 seconds gameplay
let timerInterval;
// import Stats from "three/examples/jsm/libs/stats.module.js";


// var stats = new Stats();
// stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild(stats.dom);

init();
animate();


// Initialize every element of the scene
function init() {

	// Create the scene
	scene = new THREE.Scene();

	// Create the camera
	const screenWidth = window.innerWidth;
	const screenHeight = window.innerHeight;
	camera = new THREE.PerspectiveCamera(
		45,
		screenWidth / screenHeight,
		1,
		20000
	);
	camera.position.set(0, 170, 400);

	// Select the DOM element to attach the renderer
	const canvas = document.querySelector(".webgl");
	renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
	renderer.setSize(screenWidth, screenHeight);

	// Initialize the Player
	const cubeGeometry = new THREE.BoxGeometry(50, 25, 60);
	const wireMaterial = new THREE.MeshBasicMaterial({
		color: 0x00ff00,
		wireframe: true,
		visible: false,
	});

	movingCube = new THREE.Mesh(cubeGeometry, wireMaterial);
	movingCube.position.set(0, 25, -20);
	scene.add(movingCube);

	// Set up th model of the player
	const loader = new GLTFLoader();
	loader.load("./models/cartoon_plane/scene.gltf", (gltf) => {
		const root = gltf.scene;
		root.scale.set(50, 50, 50);
		root.rotateY(Math.PI);
		movingCube.add(root);
	});

	// Create the skybox
	const skyboxGeometry = new THREE.BoxGeometry(10000, 10000, 10000);
	const skyboxMaterial = new THREE.MeshBasicMaterial({
		map: new THREE.TextureLoader().load("./resources/skybox.jpg"),
		side: THREE.BackSide,
	});
	const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
	scene.add(skybox);

	// Create the lights
	const Dirlight = new THREE.DirectionalLight(0xffffff, 1);
	Dirlight.position.set(0, 0, 1);
	scene.add(Dirlight);
	const AmbLight = new THREE.AmbientLight(0xffffff, 0.5);
	scene.add(AmbLight);


	// Start the timer
	startTimer();
}


// Animate the scene
function animate() {
	// stats.begin();
	requestAnimationFrame(animate);
	update();
	renderer.render(scene, camera);
	// stats.end();
}

// Update the scene
function update() {
	const delta = clock.getDelta();
	const moveDistance = 200 * delta;
	const rotateAngle = (Math.PI / 2) * delta;

	// Move the player with an animation
	if (keyboard.pressed("left") || keyboard.pressed("Q")) {
		if (movingCube.position.x > -270) movingCube.position.x -= moveDistance;
		if (camera.position.x > -150) {
			camera.position.x -= moveDistance * 0.6;
			if (camera.rotation.z > (-5 * Math.PI) / 180) {
				camera.rotation.z -= (0.2 * Math.PI) / 180;
				movingCube.rotation.z += (0.2 * Math.PI) / 180;
			}
		}
	}
	if (keyboard.pressed("right") || keyboard.pressed("D")) {
		if (movingCube.position.x < 270) movingCube.position.x += moveDistance;
		if (camera.position.x < 150) {
			camera.position.x += moveDistance * 0.6;
			if (camera.rotation.z < (5 * Math.PI) / 180) {
				camera.rotation.z += (0.2 * Math.PI) / 180;
				movingCube.rotation.z -= (0.2 * Math.PI) / 180;
			}
		}
	}

	// If the player is not moving, reset the camera and the player rotation
	if (
		!(
			keyboard.pressed("left") ||
			keyboard.pressed("right") ||
			keyboard.pressed("Q") ||
			keyboard.pressed("D")
		)
	) {
		const rotationDelta = camera.rotation.z;
		camera.rotation.z -= rotationDelta / 10;
		movingCube.rotation.z -= movingCube.rotation.z / 10;
	}


	// Check for collision
	const originPoint = movingCube.position.clone();
	const positions = movingCube.geometry.attributes.position;
	for (let i = 0; i < positions.count; i++) {
		const localVertex = new THREE.Vector3()
			.fromBufferAttribute(positions, i)
			.clone();
		const globalVertex = localVertex.applyMatrix4(movingCube.matrix);
		const directionVector = globalVertex.sub(movingCube.position);

		// Check if the player is colliding with any other object
		const ray = new THREE.Raycaster(
			originPoint,
			directionVector.clone().normalize()
		);
		const collisionResults = ray.intersectObjects(collideMeshList);
		if (
			collisionResults.length > 0 &&
			collisionResults[0].distance < directionVector.length()
		) {
			crash = true;
			crashId = collisionResults[0].object.name;
			break;
		}
		crash = false;
	}


	// if collision is detected, update the score accordingly
	if (crash) {
		console.log("Crash");
		if (crashId !== lastCrashId) {
			lastCrashId = crashId;
			if (crashId.includes("bad")) {
				score -= 100;
				document.getElementById("bad").play();
			} else if (crashId.includes("good")) {
				score += 100;
				document.getElementById("good").play();
			}
		}
	}

	// Spawn new bad cubes
	if (Math.random() < 0.03 && cubes.length < 30) {
		BadRandomCubeGenerator();
	}

	// Spawn new good cubes
	if (Math.random() < 0.01 && cubes.length < 30) {
		GoodCubeGenerator();
	}

	// Remove the cubes that are out of the screen
	for (let i = 0; i < cubes.length; i++) {
		if (cubes[i].position.z > camera.position.z) {
			scene.remove(cubes[i]);
			cubes.splice(i, 1);
			collideMeshList.splice(i, 1);
		} else {
			cubes[i].position.z += 10;
		}
	}
	
	// Update the score for each frame
	score += 0.1;
	scoreText.innerText = "Score:" + Math.floor(score);
}

// Function to generate random number between two numbers
function getRandomArbitrary(min, max) {
	return Math.random() * (max - min) + min;
}

// Function to generate bad cubes
function BadRandomCubeGenerator() {
	const a = 1 * 50;
	const b = 1 * 50;
	const c = 1 * 50;

	const geometry = new THREE.BoxGeometry(a, b, c);
	const material = new THREE.MeshBasicMaterial({
		visible: false
	});
	
	const cube = new THREE.Mesh(geometry, material);
	
	// load the 3d model of the bad cube
	const loader = new GLTFLoader();
	loader.load("./models/low_poly_bird/scene.gltf", (gltf) => {
		const root = gltf.scene;
		root.scale.set(120, 120, 120);
		cube.add(root);
	});
	cube.position.x = getRandomArbitrary(-250, 250);
	cube.position.y = 1 + b / 2;
	cube.position.z = getRandomArbitrary(-800, -1200);
	
	cubes.push(cube);
	cube.name = "bad_" + id;
	id++;
	collideMeshList.push(cube);
	
	scene.add(cube);
	return cube;
}

// Function to generate good cubes
function GoodCubeGenerator() {
	const a = 1 * 50;
	const b = 1 * 50;
	const c = 1 * 50;
	
	const geometry = new THREE.BoxGeometry(a, b, c);
	const material = new THREE.MeshBasicMaterial({
		visible: false
	});
	
	const cube = new THREE.Mesh(geometry, material);
	
	const loader = new GLTFLoader();
	loader.load("./models/bit_coin/scene.gltf", (gltf) => {
		const root = gltf.scene;
		root.scale.set(100, 100, 100);
		cube.add(root);
	});
	
	cube.position.x = getRandomArbitrary(-250, 250);
	cube.position.y = 1 + b / 2;
	cube.position.z = getRandomArbitrary(-800, -1200);
	
	cubes.push(cube);
	cube.name = "good_" + id;
	id++;
	collideMeshList.push(cube);
	
	scene.add(cube);
	
	return cube;
}

// Function to start the timer
function startTimer() {
	timerInterval = setInterval(() => {
		gameTime--;
		if (gameTime <= 0) {
			clearInterval(timerInterval);
			gameOver();
		}
	}, 1000);
	setInterval(() => {
		document.getElementById("timer").innerText = "Time: " + gameTime;
	}, 1000);
}

// Function to end the game
function gameOver() {
	cancelAnimationFrame(animate);

	alert(`Game Over!\nYour Final Score: ${Math.floor(score)}`);
	const restart = confirm("Do you want to continue ?");
	if (restart) {
		resetGame();
	} else {
		window.location.href = "./index.html";
	}
}

// Function to reset the game
function resetGame() {
	clearInterval(timerInterval);
	gameTime = 60; // 60 seconds
	score = 0;
	scoreText.innerText = "Score: 0";

	movingCube.position.set(0, 25, -20);

	cubes.forEach((cube) => scene.remove(cube));
	cubes.length = 0;
	collideMeshList.length = 0;

	startTimer();

	animate();

	setTimeout(() => {
		BadRandomCubeGenerator();
		GoodCubeGenerator();
	}, 5000);
}


