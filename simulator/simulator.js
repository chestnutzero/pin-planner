import { getChamberWidth } from "../interface/renderer.js";

const canvas = document.getElementById("cl");
const ctx = canvas.getContext("2d");

const lockDragControls = document.getElementById("lock-drag-controls-vertically");


const chamberPaddingY = 10;
// Leave a tiny gap between core and bible for realism
// Gap between core and bible as percentage of chamber height
const shearLineSpacing = .004;

// Settings that control spring forces and animation speeds
const subSteps = 3;
let rotationForceStiffness = .0008;
const rotationForceDamping = .02;
let rotationOffset = 150;

// Standard pin area per sq unit that we base spring force calculations on
// If a pin is smaller, we'll scale up its density, and scale down if it's larger
const baselinePinArea = 400 * 200 / 7;
// Same for chamber area, but this is for total chamber size, not per unit of height
const targetCoreMass = 50;

const mouseConstraintStiffnessX = .05;
const mouseConstraintStiffnessY = .08;
const mouseConstraintDamping = .5;

const springConstraintStiffness = 0.00001;
const springConstraintDamping = 0.001;
const friction = 0.04;
const frictionStatic = .5;
const gravity = 2;

// module aliases
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Constraint = Matter.Constraint,
    Vector = Matter.Vector;

// create an engine

// create a renderer
// const render = Render.create({
//     element: document.body,
//     engine: engine,
//     options: {
//         wireframes: false
//     }
// });
// render.canvas.hidden = true;
let open = false;
let onCloseCallback = () => {};

// create two boxes and a ground
// var ground = Bodies.rectangle(0, canvas.height - 70, canvas.width, 70, { isStatic: false });
// var coreBottom = Bodies.rectangle(200, 610, 207, 60, { isStatic: false, friction, frictionStatic });
// var coreLeftBottom = Bodies.rectangle(8, 382, 300, 5, { isStatic: false, friction, frictionStatic });
// var coreLeftTop = Bodies.rectangle(8, 490, 300, 180, { isStatic: false, friction, frictionStatic });
// var coreRight = Bodies.rectangle(392, 480, 300, 200, { isStatic: false, friction, frictionStatic });
// coreLeftBottom.frictionStatic = frictionStatic;
// coreLeftTop.frictionStatic = frictionStatic;
// coreRight.frictionStatic = frictionStatic;

// let core = Matter.Body.create();
// Matter.Body.setParts(core, [coreBottom, coreLeftBottom, coreLeftTop, coreRight]);
// core.frictionStatic = frictionStatic;

// var bibleLeft = Bodies.rectangle(6, 280, 300, 200, { isStatic: true, friction, frictionStatic });
// var bibleRight = Bodies.rectangle(394, 280, 300, 200, { isStatic: true, friction, frictionStatic });
// let bibleTop = Bodies.rectangle(0, 150, 1000, 60, { isStatic: true, friction, frictionStatic });
// bibleLeft.frictionStatic = frictionStatic;
// bibleRight.frictionStatic = frictionStatic;

// let bible = Matter.Body.create({ isStatic: true });
// Matter.Body.setParts(bible, [bibleTop, bibleLeft, bibleRight]);
// bible.frictionStatic = frictionStatic;

// add all of the bodies to the world

// run the renderer
// Render.run(render);

// create runner
var runner = Runner.create();

let currentChamber;
let pins;

let rotationForceConstraint, pickForceConstraint, mouseConstraint;
let animationStarted = false;
let registeredKeyListeners = false;

let engine;
let world;

function getPinBody(pin) {
    const lastRenderMetadata = pin.lastRenderMetadata;
    const vertices = pin.points.map(point => {
        return {
            x: point.x * lastRenderMetadata.width,
            y: (1 - point.y) * lastRenderMetadata.height
        }
    });
    const x = (lastRenderMetadata.left + lastRenderMetadata.right) / 2;
    const y = canvas.height - (lastRenderMetadata.bottom + lastRenderMetadata.top) / 2;
    let body = Bodies.fromVertices(x, y, vertices, { friction, frictionStatic });
    body.frictionStatic = frictionStatic;
    body.friction = friction;

    // ;)
    const desiredBottom = canvas.height - lastRenderMetadata.y;
    const pinBodyBottom = body.bounds.max.y;
    Matter.Body.setPosition(body, {x: body.position.x, y: body.position.y + desiredBottom - pinBodyBottom});
    // Scale density with size - smaller pin footprint means more density, so our spring forces behave the same
    Matter.Body.setDensity(body, .001 * baselinePinArea / (lastRenderMetadata.width * lastRenderMetadata.height / pin.pinHeight))

    console.debug("Built pin", body, "from vertices", vertices);

    // console.log("Initial body", body);
    // console.log("Vertices", vertices);
    // console.log("x, y", x, y);
    // console.log("Lastrendermetadata was", lastRenderMetadata, "and new body's bounds are", body.bounds);
    // matter.js automatically moves body so center of mass is at specified (x, y)
    // try to adjust so the vertices line up with the original vertices
    // let deltaX = lastRenderMetadata.left - body.bounds.min.x;
    // let deltaY = lastRenderMetadata.bottom - (canvas.height - body.bounds.min.y);
    // Matter.Body.setPosition(body, body.position.x + deltaX, body.position.y + deltaY);
    return body;
}

function getChamberBodies(chamber) {
    // This represents the entire chamber
    const lastRenderMetadata = chamber.lastRenderMetadata;

    const {innerWidth, outerWidth} = getChamberWidth(lastRenderMetadata.width);
    const midLine = canvas.height - (lastRenderMetadata.bottom + lastRenderMetadata.top) / 2;

    const coreVertices = chamber.getCorePoints(innerWidth, outerWidth, lastRenderMetadata.height / 2);
    const coreCenterX = (lastRenderMetadata.left + lastRenderMetadata.right) / 2;
    const coreCenterY = canvas.height - (lastRenderMetadata.bottom + lastRenderMetadata.top) / 4;
    const negativeCoreVertices = chamberVertices(innerWidth, outerWidth, lastRenderMetadata.height / 2, coreVertices)
        .map(point => ({x: point.x, y:lastRenderMetadata.height/2 + 10 - point.y}));
    const coreBody = Bodies.fromVertices(coreCenterX, coreCenterY, negativeCoreVertices, 
        { friction, frictionStatic, isStatic: false });
    Matter.Body.setDensity(coreBody, coreBody.density * targetCoreMass / coreBody.mass);
    console.log("Built body with mass", coreBody.mass, "and density", coreBody.density);

    // Reposition to match desired bounds
    const coreTop = coreBody.bounds.min.y;
    Matter.Body.setPosition(coreBody, {x: coreBody.position.x, y: coreBody.position.y + midLine - coreTop});

    const bibleVertices = chamber.getBiblePoints(innerWidth, outerWidth, lastRenderMetadata.height / 2);
    const bibleCenterX = (lastRenderMetadata.left + lastRenderMetadata.right) / 2;
    const bibleCenterY = canvas.height - (3 * (lastRenderMetadata.bottom + lastRenderMetadata.top) / 4);
    const negativeBibleVertices = chamberVertices(innerWidth, outerWidth, lastRenderMetadata.height / 2, bibleVertices, false)
        .map(point => ({x: point.x, y:lastRenderMetadata.height/2 + 10 - point.y}));
    const bibleBody = Bodies.fromVertices(bibleCenterX, bibleCenterY, negativeBibleVertices, { friction, frictionStatic, isStatic: true });

    // Reposition to match desired bounds
    const bibleBottom = bibleBody.bounds.max.y;
    const shearLineSpacingPixels = shearLineSpacing * lastRenderMetadata.height;
    Matter.Body.setPosition(
        bibleBody, 
        {
            x: bibleBody.position.x, 
            y: bibleBody.position.y + (midLine - shearLineSpacingPixels) - bibleBottom
        });

    const coreBottom = coreBody.bounds.max.y;
    const ground = Bodies.rectangle(canvas.width / 2, coreBottom + 50, canvas.width * 2, 100, {isStatic: true});

    return [ground, coreBody, bibleBody];
}

function chamberVertices(innerWidth, outerWidth, height, vertices, openSideUp = true) {
    const points = [];
    // const paddingX = (outerWidth - innerWidth) / 2;
    let paddingX = canvas.width * 2;
    let bottomPadding = openSideUp ? chamberPaddingY : 0;
    let topPadding = openSideUp ? 0 : chamberPaddingY;
    for (let i = 0; i < vertices.length / 2; i++) {
        points.push({
            x: vertices[i].x + paddingX,
            y: vertices[i].y + bottomPadding
        });
    }
    if (openSideUp) {
        points.push({ x: 0, y: height + (chamberPaddingY) });
        points.push({ x: 0, y: 0 });
        points.push({ x: outerWidth + (paddingX * 2), y: 0 });
        points.push({ x: outerWidth + (paddingX * 2), y: height + (chamberPaddingY) });
    }
    for (let i = vertices.length / 2; i < vertices.length; i++) {
        points.push({
            x: vertices[i].x + paddingX,
            y: vertices[i].y + bottomPadding
        });
    }
    if (!openSideUp) {
        points.push({ x: outerWidth + (paddingX * 2), y: 0 });
        points.push({ x: outerWidth + (paddingX * 2), y: height + topPadding + bottomPadding });
        points.push({ x: 0, y: height + topPadding + bottomPadding });
        points.push({ x: 0, y: 0 });
    }
    console.debug("Built points for chamber", points);
    return points;
}

function openSimulator(chamber, callback = () => { }) {
    engine = Engine.create();
    world = engine.world;
    onCloseCallback = callback;
    open = true;
    Composite.clear(world);
    currentChamber = chamber;
    pins = [];
    const [ground, core, bible] = getChamberBodies(chamber);
    for (let pin of chamber.pinStack) {
        let pinBody = getPinBody(pin);
        pins.push(pinBody);
    }
    mouseConstraint = Matter.MouseConstraint.create(engine, {
        element: canvas,
    });

    Matter.Events.on(engine, 'beforeUpdate', function () {
        if (mouseConstraint.constraint.bodyB && mouseConstraint.constraint.pointB) {
            const clickedBody = mouseConstraint.constraint.bodyB;
            let yForce = -1 * mouseConstraintStiffnessY * ((mouseConstraint.body.position.y + mouseConstraint.constraint.pointB.y) - mouseConstraint.constraint.pointA.y);
            const bodySpeedY = mouseConstraint.body.velocity.y;
            yForce = yForce - (bodySpeedY * mouseConstraintDamping);

            let xForce = 0;
            if (!lockDragControls.checked || clickedBody.id === core.id) {
                xForce = -1 * mouseConstraintStiffnessX * ((mouseConstraint.body.position.x + mouseConstraint.constraint.pointB.x) - mouseConstraint.constraint.pointA.x);
                const bodySpeedX = mouseConstraint.body.velocity.x;
                xForce = xForce - (bodySpeedX * mouseConstraintDamping);
            }

            // console.log("xforce, yforce", xForce, yForce);
            Matter.Body.applyForce(clickedBody, clickedBody.position, { x: xForce, y: yForce });
        }
    });
    console.log("Added beforeUpdate listener to", engine);

    rotationForceConstraint = Constraint.create({
        bodyA: core,
        pointB: {
            // Scale down tension dist based on canvas size
            x: core.position.x + Math.max(100, (rotationOffset * canvas.width / 1400)),
            y: core.position.y
        },
        stiffness: rotationForceStiffness,
        damping: rotationForceDamping,
        length: 0,
        render: {
            visible: false
        }
    });

    if (!registeredKeyListeners) {
        registeredKeyListeners = true;
        document.addEventListener("keydown", (event) => {
            if (event.repeat) {
                return;
            }
            switch (event.key) {
                case "a":
                    rotationForceConstraint.pointB.x -= 75;
                    rotationForceConstraint.damping += .005;
                    // rotationForceConstraint.stiffness += .002;
                    break;
                case "s":
                    rotationForceConstraint.pointB.x -= 75;
                    rotationForceConstraint.damping += .005;
                    break;
                case "d":
                    rotationForceConstraint.pointB.x += 75;
                    rotationForceConstraint.damping += .005;
                    break;
                case "f":
                    rotationForceConstraint.pointB.x += 75;
                    rotationForceConstraint.damping += .005;
                    // rotationForceConstraint.stiffness += .002;
                    break;
            }
        });
        document.addEventListener("keyup", (event) => {
            switch (event.key) {
                case "a":
                    rotationForceConstraint.pointB.x += 75;
                    rotationForceConstraint.damping -= .005;
                    // rotationForceConstraint.stiffness -= .002;
                    break;
                case "s":
                    rotationForceConstraint.pointB.x += 75;
                    rotationForceConstraint.damping -= .005;
                    break;
                case "d":
                    rotationForceConstraint.pointB.x -= 75;
                    rotationForceConstraint.damping -= .005;
                    break;
                case "f":
                    rotationForceConstraint.pointB.x -= 75;
                    rotationForceConstraint.damping -= .005;
                    // rotationForceConstraint.stiffness -= .002;
                    break;
            }
        });
    }

    const chamberCenterX = (chamber.lastRenderMetadata.left + chamber.lastRenderMetadata.right) / 2;
    const chamberTop = canvas.height - (chamber.lastRenderMetadata.y + chamber.lastRenderMetadata.height);
    let springConstraint = Constraint.create({
        bodyA: pins[pins.length - 1],
        pointB: {
            x: chamberCenterX,
            y: chamberTop
        },
        stiffness: springConstraintStiffness,
        damping: springConstraintDamping,
        length: chamber.lastRenderMetadata.height,
        render: {
            visible: false
        }
    });
    world.gravity.y = gravity;

    const bodiesToAdd = [...pins, ground, core, bible];

    bodiesToAdd.push(rotationForceConstraint);
    bodiesToAdd.push(springConstraint);

    Composite.add(world, bodiesToAdd);

    // Runner.run(runner, engine);

    // let frameCount = 0;

    // render.canvas.hidden = false;
    renderToCanvas();

    if (!animationStarted) {
        animationStarted = true;
        let lastTime;
        (function run(time) {
            if (!open) {
                return;
            }
            window.requestAnimationFrame(run);
            let deltaToUse = 1000 / 60 / subSteps;
            if (lastTime) {
                deltaToUse = (time - lastTime) / subSteps;
            }
            lastTime = time;
            for (let i = 0; i < subSteps; i += 1) {
                // Matter.Body.applyForce(core, core.position, {x: .001 * tensionDist, y: 0});
                // Matter.Body.applyForce(pins[0], pins[0].position, {x: 0, y: -.001 * pickHeight})
                // Matter.Body.setAngularVelocity(core, 0);
                Engine.update(engine, deltaToUse);
            }
            renderToCanvas();
        })();
    }

}

function renderToCanvas() {
    if (!open) {
        return;
    }

    var bodies = Composite.allBodies(engine.world);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < bodies.length; i += 1) {
        const body = bodies[i];
        const decompBodies = body.parts;
        ctx.fillStyle = `hsl(${(body.id * 24) % 360}, 70%, 60%)`;
        ctx.beginPath();
        for (var j = 0; j < decompBodies.length; j += 1) {
            if (body.parts.length > 1 && decompBodies[j].id == body.id) {
                continue;
            }
            var vertices = decompBodies[j].vertices;

            ctx.moveTo(vertices[0].x, canvas.height - vertices[0].y);

            for (var k = 1; k < vertices.length; k += 1) {
                ctx.lineTo(vertices[k].x, canvas.height - vertices[k].y);
            }

            ctx.lineTo(vertices[0].x, canvas.height - vertices[0].y);
        }
        ctx.closePath();
        ctx.fill();
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#999';
}

function getPickHeight() {
    return pickForceConstraint.stiffness;
}

function getTensionDist() {
    return rotationForceConstraint.stiffness;
}

function setPickHeight(pickPressure) {
    pickForceConstraint.stiffness = pickPressure;
}

function setTensionDist(tensionPressure) {
    rotationForceConstraint.stiffness = tensionPressure;
}

function isOpen() {
    return open;
}

function closeSimulator() {
    currentChamber = null;
    Runner.stop(runner);
    Engine.clear(engine);
    console.log("Cleared engine", engine);
    animationStarted = false;
    open = false;
    onCloseCallback();
    if (mouseConstraint) {
        console.log("Mouseconstraint:", mouseConstraint);
        console.log("Attempting remove event listener", mouseConstraint.mouse.mousemove, "from element", mouseConstraint.mouse.element);
        mouseConstraint.mouse.element.removeEventListener("touchmove", mouseConstraint.mouse.mousemove);
        mouseConstraint.mouse.element.removeEventListener("touchstart", mouseConstraint.mouse.mousedown);
        mouseConstraint.mouse.element.removeEventListener("touchend", mouseConstraint.mouse.mouseup);
    }
}

export default {isOpen, openSimulator, closeSimulator, getPickHeight, setPickHeight, getTensionDist, setTensionDist};