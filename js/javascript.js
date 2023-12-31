// Helper Classes
class Vertex {
    constructor(x,y, mesh, center) {
        this.x = x;
        this.y = y;
        this.id = mesh.uuid;
        this.color = 0xffffff;
        this.center = center;
        this.cycord = [];
        this.chips = [];
        this.rotorpos = 0;
        this.temppos = 0;
        this.mesh = mesh;
    }

    orderCycord(clockwise = true) {
        const angles = []
        this.cycord.forEach(v => {
            let x = v.x - this.x;
            let y = v.y - this.y;
            let phi = cart2pol(x,y)[1];
            angles.push([phi, v]);
        });
        if (clockwise)
            angles.sort(function (a,b) {return b[0]-a[0]})
        else
            angles.sort(function (a,b) {return a[0]-b[0]})
        const cycord = []
        angles.forEach(a => {
            cycord.push(a[1])
        });
        this.cycord = cycord;
    }

    setFirst(v) {
        this.rotorpos = this.cycord.indexOf(v);
    }

    drawRotor() {
        if (this.id === sink_vertex.id) {
            return;
        }
        let w = this.cycord[this.rotorpos];
        let from = this.center;
        let to = w.center;
        let direction = to.clone().sub(from);
        let length = direction.length();
        const helper = new THREE.ArrowHelper(direction.normalize(), from, length, 0xffffff, 2, 2)
        scene.add(helper)
        this.rotor = helper;
        arrows.push(helper.uuid)
    }
}

function cart2pol(x, y) {
    let r = Math.sqrt(x ** 2 + y ** 2)
    let phi = Math.atan2(y, x)
    return [r, phi]
}


class Edge {
    constructor(v_1, v_2, mesh) {
        this.v_1 = v_1;
        this.v_2 = v_2;
        this.id = mesh.uuid;
        this.color = 0xffffff;
        this.v_1.cycord.push(v_2);
        this.v_2.cycord.push(v_1);
        this.mesh = mesh;
    }

}


// Variables to keep track of
let vertices;
let hyperedges;
let edges_blocks;
let edges;
let cursor;
let edge_index;
let sink;
let tree;
let arrows;
let cverts;
let chips = [];
let sink_vertex;
let edge_count;
let vertex_count;

function init_var() {
    vertices = [];
    hyperedges = [];
    edges_blocks = [];
    edges = [];
    cursor = 0;
    edge_index = 0;
    sink = false;
    tree = [];
    arrows = [];
    cverts = [];
    chips = [];
    t = 0;
    edge_count = 1;
}

const f_per_op = 30;
let t;
let firings;
let total_operations;
let total_frames;
let oldv;
let newv;

init_var()


// Helper Function
function getCenterPoint(mesh) {
    let geometry = mesh.geometry;
    geometry.computeBoundingBox();
    let center = new THREE.Vector3();
    geometry.boundingBox.getCenter( center );
    mesh.localToWorld( center );
    return center;
}


// Variables to make viewing work
init_ui();
let renderer;
let camera;
let scene;

renderer = new THREE.WebGLRenderer();
camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
scene = new THREE.Scene();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement)
camera.position.set(0, 0 , 100);
camera.lookAt( 0, 0, 0);

// Variables to make clicking work
const mouse = new THREE.Vector2();
const intersectionPoint = new THREE.Vector3();
const planeNormal = new THREE.Vector3();
const plane = new THREE.Plane();
const raycaster = new THREE.Raycaster();

// Code for the initial pop-up window

inputs = {
    0: document.getElementById("vertices"),
}

modals = {
    0: document.getElementById("modal"),
    1: document.getElementById("modal2"),
    2: document.getElementById("modal3"),
    3: document.getElementById("modal4"),
}

closeBtns = {
    0: document.getElementById("closeModal"),
    1: document.getElementById("closeModal2"),
    2: document.getElementById("closeModal3"),
    3: document.getElementById("closeModal4"),
}

modals[0].classList.add("open");


// Add a row to the table of hyperedges and the validation symbol
function addRow(tableID) {

    let tableRef = document.getElementById(tableID);
    let newRow = tableRef.insertRow(-1);
    let newCell = newRow.insertCell(0);
    let newElem = document.createElement( 'input' );

    newElem.setAttribute("name", `edge${edge_count}`);
    newElem.setAttribute("id", `edge${edge_count}`);
    newElem.setAttribute("type", `number`);
    newElem.setAttribute("required", "");
    newCell.appendChild(newElem);

    newElem = document.createElement('span')
    newElem.setAttribute("class", "validity");
    newCell.appendChild(newElem)

    edge_count += 1
}

/* Function to validate if an edge is valid, specifically it should:
   1. Have only positive integers
   2. Have no repeated integers
   3. Have no integers above the number of vertices
*/
function validate_edge(edge, vertices) {
    let temp = new Set()
    for (const char of edge) {
        let num = Number(char);
        if (0 >= num || num > vertices || temp.has(num))
            return false;
        temp.add(num);
    }
    return true;
}

function parse_edges() {
    for (let i = 0; i < edge_count; i++) {

        let temp = []
        let edge = document.getElementById(`edge${i}`).value

        for (const char of edge)
            temp.push(Number(char));
        temp.sort();

        edges_blocks.push(temp);
    }
}

function display() {
    let height = window.innerHeight;
    let width = window.innerWidth;

    let quadrant = width / 3;
    let diff = height / (vertex_count + 1);

    for (let i = 0; i < vertex_count; i++) {

        mouse.x = 2 / 3 - .5;
        mouse.y = (i + 1) / (vertex_count + 1) - .5;

        planeNormal.copy(camera.position).normalize();
        plane.setFromNormalAndCoplanarPoint(planeNormal, scene.position);
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(plane, intersectionPoint);
        const sphereMesh = new THREE.Mesh(
            new THREE.CircleGeometry(.5, 360),
            new THREE.MeshBasicMaterial({color: 0xffffff})
        );
        scene.add(sphereMesh);
        sphereMesh.position.copy(intersectionPoint);
        let center = getCenterPoint(sphereMesh);
        vertices.push(new Vertex(mouse.x, mouse.y, sphereMesh, center))
    }

    for (let i = 0; i < edge_count; i++) {
        mouse.x = 1 / 3 - .5;
        mouse.y = (i + 1) / (edge_count + 1) - .5;

        planeNormal.copy(camera.position).normalize();
        plane.setFromNormalAndCoplanarPoint(planeNormal, scene.position);
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(plane, intersectionPoint);
        const sphereMesh = new THREE.Mesh(
            new THREE.CircleGeometry(.5, 360),
            new THREE.MeshBasicMaterial({color: 0xffffff})
        );
        scene.add(sphereMesh);
        sphereMesh.position.copy(intersectionPoint);
        let center = getCenterPoint(sphereMesh);
        hyperedges.push(new Vertex(mouse.x, mouse.y, sphereMesh, center))
        let edge = edges_blocks[i];
        for (let j = 0; j < edge.length; j++) {
            createEdge(vertices[edge[j]-1], hyperedges[i])
        }
    }
    renderer.render(scene, camera);
}

function createEdge(vertex, hyperedge) {
    const material = new MeshLineMaterial({
        color:0x808080,
        linewidth: 1,
        // dashArray: 0.2,
        // dashRatio: 0.3,
        transparent: true,
        opacity: 0.4,
    });
    const line = new MeshLine();
    line.setPoints([vertex.center, hyperedge.center])
    const mesh = new THREE.Mesh(line, material);
    mesh.raycast = MeshLineRaycast;
    scene.add(mesh);
    edges.push(new Edge(vertex, hyperedge, mesh));
}

Object.keys(closeBtns).forEach((i) => {
    switch (i) {
        case "0":
            closeBtns[i].addEventListener("click", () => {
                modals[i].classList.remove("open");
                // window.addEventListener('mousedown', onMouseDown)
                modals[1].classList.add("open");
            });
            break;
        case "1":
            closeBtns[i].addEventListener("click", () => {
                let temp = Number(inputs[i - 1].value)
                if(temp > 2) {
                    modals[i].classList.remove("open");
                    vertex_count = temp;
                    modals[2].classList.add("open");
                }
            });
            break;
        case "2":
            closeBtns[i].addEventListener("click", () => {
                for (let i = 0; i < edge_count; i++) {
                    let temp = document.getElementById(`edge${i}`).value
                    if(!validate_edge(temp, vertex_count))
                        return;
                }
                parse_edges();
                modals[i].classList.remove("open");
                modals[3].classList.add("open");
            });
            break;
        case "3":
            closeBtns[i].addEventListener("click", () => {
                modals[i].classList.remove("open");
                display();
            });
            break;
        case "7":
            closeBtns[i].addEventListener("click", () => {
                while (scene.children.length > 0) {
                    scene.remove(scene.children[0]);
                }
                renderer.render(scene, camera);
                modals[7].classList.remove("open");
                init_var();
                modals[0].classList.add("open");
            });
            break;
        case "8":
            closeBtns[i].addEventListener("click", () => {
                arrows.forEach( (arrow) => {
                    removeObject3D(arrow);
                });
                chips.forEach( (chip) => {
                    removeObject3D(chip.id);
                });
                renderer.render(scene, camera);
                modals[7].classList.remove("open");
                tree = [];
                arrows = [];
                cverts = [];
                chips = [];
                t = 0;
                cursor = 3;
                modals[4].classList.add("open");
            });
            break;
        case "9":
            closeBtns[i].addEventListener("click", () => {
                arrows.forEach( (arrow) => {
                    removeObject3D(arrow);
                });
                chips.forEach( (chip) => {
                    removeObject3D(chip.id);
                });
                renderer.render(scene, camera);
                modals[7].classList.remove("open");
                cverts = [];
                chips = [];
                t = 0;
                cursor = 4;
                modals[5].classList.add("open")
            });
            break;
        default:
            closeBtns[i].addEventListener("click", () => {
                modals[i].classList.remove("open");
                window.addEventListener('mousedown', onMouseDown)
            });
            break;
    }
});