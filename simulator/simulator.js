import { getChamberWidth } from "../interface/renderer.js";

const canvas = document.getElementById("cl");
const ctx = canvas.getContext("2d");

const lockDragControls = document.getElementById("lock-drag-controls-vertically");


const chamberPaddingY = 10;
// Leave a tiny gap between core and bible for realism
// Gap between core and bible as percentage of chamber height
const shearLineSpacing = 0;
const chamberWidthJitter = 2;

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
const maxMouseForce = 15;

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
// render.canvas.hidden = true;
let open = false;
let onCloseCallback = () => { };

// let bible = Matter.Body.create({ isStatic: true });
// Matter.Body.setParts(bible, [bibleTop, bibleLeft, bibleRight]);

// create runner
// var runner = Runner.create();

let currentChamber;
// let pins;

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
    // TODO: Remove hardcoded offset of 50
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

    const { innerWidth, outerWidth } = getChamberWidth(lastRenderMetadata.width);
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
    Matter.Body.setPosition(coreBody, { x: coreBody.position.x, y: coreBody.position.y + midLine - coreTop });

    const bibleVertices = chamber.getBiblePoints(innerWidth, outerWidth, lastRenderMetadata.height / 2);
    const bibleCenterX = (lastRenderMetadata.left + lastRenderMetadata.right) / 2;
    const bibleCenterY = canvas.height - (3 * (lastRenderMetadata.bottom + lastRenderMetadata.top) / 4);
    const negativeBibleVertices = chamberVertices(innerWidth, outerWidth, lastRenderMetadata.height / 2, bibleVertices, false)
        .map(point => ({ x: point.x, y: lastRenderMetadata.height / 2 + 10 - point.y }));
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
    const ground = Bodies.rectangle(canvas.width / 2, coreBottom + 50, canvas.width * 2, 100, { isStatic: true });

    return [ground, coreBody, bibleBody];
}

function chamberVertices(innerWidth, outerWidth, height, vertices, openSideUp = true) {
    const points = [];
    // const paddingX = (outerWidth - innerWidth) / 2;
    let paddingX = 2;
    let bottomPadding = openSideUp ? chamberPaddingY : 0;
    let topPadding = openSideUp ? 0 : chamberPaddingY;
    const widthJitter = Math.random() * chamberWidthJitter - (chamberWidthJitter / 2);
    for (let i = 0; i < vertices.length / 2; i++) {
        points.push({
            x: vertices[i].x + paddingX + widthJitter,
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
            x: vertices[i].x + paddingX - widthJitter,
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

function buildCoreHolderBody(allCores, invertVertically = false) {
    const vertices = [];
    const firstCore = allCores[0];
    const lastCore = allCores[allCores.length - 1];

    const coreHolderPaddingX = 1500;
    const coreHolderPaddingY = 100;
    // Start at bottom left corner
    vertices.push({
        x: firstCore.bounds.min.x - coreHolderPaddingX, 
        y: firstCore.bounds.max.y + coreHolderPaddingY
    });
    // Go up to parallel with the top of the first core
    vertices.push({
        x: firstCore.bounds.min.x - coreHolderPaddingX, 
        y: firstCore.bounds.min.y
    });
    // Assume the core vertices go clockwise starting at the bottom left
    // Add points surrounding the core's bounds
    // First chamber:
    /**
     *2    3|      |6
     *      |      |
     *      |      |
     *      |      |
     *     4|______|5
     * 
     * 1
     */
    // Last chamber:
    /**
     *     1|      |4       5
     *      |      |
     *      |      |
     *      |      |
     *     2|______|3
     * 
     *                      6
     */
    for (let core of allCores) {
        vertices.push({x: core.bounds.min.x, y: core.bounds.min.y});
        vertices.push({x: core.bounds.min.x, y: core.bounds.max.y});
        vertices.push({x: core.bounds.max.x, y: core.bounds.max.y});
        vertices.push({x: core.bounds.max.x, y: core.bounds.min.y});
    }

    vertices.push({
        x: lastCore.bounds.max.x + coreHolderPaddingX, 
        y: lastCore.bounds.min.y
    });
    vertices.push({
        x: lastCore.bounds.max.x + coreHolderPaddingX, 
        y: lastCore.bounds.max.y + coreHolderPaddingY
    });

    const coreHolderBody = Bodies.fromVertices(0, 0, vertices, { isStatic: false });
    if (invertVertically) {
        Matter.Body.scale(coreHolderBody, 1, -1);
        const targetMinX = firstCore.bounds.min.x - coreHolderPaddingX;
        const targetMaxY = firstCore.bounds.max.y;

        const currMinX = coreHolderBody.bounds.min.x;
        const currMaxY = coreHolderBody.bounds.max.y;

        Matter.Body.setPosition(coreHolderBody, {
            x: coreHolderBody.position.x + targetMinX - currMinX,
            y: coreHolderBody.position.y + targetMaxY - currMaxY
        });
    } else {
        const targetMinX = firstCore.bounds.min.x - coreHolderPaddingX;
        const targetMinY = firstCore.bounds.min.y;

        const currMinX = coreHolderBody.bounds.min.x;
        const currMinY = coreHolderBody.bounds.min.y;

        Matter.Body.setPosition(coreHolderBody, {
            x: coreHolderBody.position.x + targetMinX - currMinX,
            y: coreHolderBody.position.y + targetMinY - currMinY
        });
    }

    const targetMass = 100;
    Matter.Body.setDensity(coreHolderBody, coreHolderBody.density * targetMass / coreHolderBody.mass);

    return coreHolderBody;
}

function openSimulator(chambers, callback = () => { }) {
    engine = Engine.create();

    // create a renderer
    const render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            wireframes: false
        }
    });
    Matter.Render.run(render);

    world = engine.world;
    onCloseCallback = callback;
    open = true;
    Composite.clear(world);

    // let bible = Matter.Body.create({ isStatic: true });
    // let ground = Matter.Body.create({ isStatic: true });
    let allCores = [];
    let allBibles = [];
    let allPins = [];
    let pinsByChamber = {};
    for (let chamber of chambers) {
        const [currGround, currCore, currBible] = getChamberBodies(chamber);
        console.log("Built bodies", currGround, currCore, currBible, "from chamebr", chamber);
        // allGrounds.push(currGround);
        allCores.push(currCore);
        allBibles.push(currBible);
        pinsByChamber[chamber.chamberIdx] = [];
        for (let pin of chamber.pinStack) {
            let pinBody = getPinBody(pin);
            allPins.push(pinBody);
            pinsByChamber[chamber.chamberIdx].push(pinBody);
        }
    }
    const coreHolder = buildCoreHolderBody(allCores);
    const bibleHolder = buildCoreHolderBody(allBibles, true);
    Matter.Body.setStatic(bibleHolder, true);
    // TODO: Reflect this across the x axis, then move vertically to match the shear line
    

    const ground = Bodies.rectangle(canvas.width/2, coreHolder.bounds.max.y + 250, canvas.width, 500, { isStatic: true });
    // Matter.Body.setParts(core, allCores, false);
    // Matter.Body.setParts(bible, allBibles, false);
    mouseConstraint = Matter.MouseConstraint.create(engine, {
        element: canvas,
    });

    let coreStructureConstraints = [];
    // const dist = (a,b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    // const sub = (a,b) => {
    //     return {x: a.x - b.x, y: a.y - b.y};
    // }
    // const add = (a, b) => {
    //     return {x: a.x + b.x, y: b.y + b.y};
    // };
    // for (let i=0; i<allCores.length - 1; i++) {
    //         const core1 = allCores[i];
    //         const core2 = allCores[i + 1];
    //         const coreHeight = core1.bounds.max.y - core1.bounds.min.y
    //         const coreWidth = core1.bounds.max.x - core1.bounds.min.x;
    //         const topPoint = {
    //             x: 0,
    //             y: coreHeight / 3
    //         };
    //         const bottomPoint = {
    //             x: 0,
    //             y: 0 - (coreHeight / 3)
    //         };
    //         coreStructureConstraints.push(
    //             Constraint.create({
    //                 bodyA: core1,
    //                 bodyB: core2,
    //                 pointA: topPoint,
    //                 pointB: bottomPoint,
    //                 stiffness: 1,
    //                 damping: 0,
    //                 length: 10 + dist(add(topPoint, core1.position), add(bottomPoint, core2.position)),
    //                 render: {
    //                     visible: true
    //                 }
    //             })
    //         );
    //         coreStructureConstraints.push(
    //             Constraint.create({
    //                 bodyA: core1,
    //                 bodyB: core2,
    //                 pointA: bottomPoint,
    //                 pointB: topPoint,
    //                 stiffness: 1,
    //                 damping: 0,
    //                 length: 10 + dist(add(bottomPoint, core1.position), add(topPoint, core2.position)),
    //                 render: {
    //                     visible: true
    //                 }
    //             })
    //         );
    //         console.log("Created core structure constraint", coreStructureConstraints[coreStructureConstraints.length - 1]);
    // }

    Matter.Events.on(engine, 'beforeUpdate', function () {
        if (mouseConstraint.constraint.bodyB && mouseConstraint.constraint.pointB) {
            const clickedBody = mouseConstraint.constraint.bodyB;
            let yForce = -1 * mouseConstraintStiffnessY * ((mouseConstraint.body.position.y + mouseConstraint.constraint.pointB.y) - mouseConstraint.constraint.pointA.y);
            const bodySpeedY = mouseConstraint.body.velocity.y;
            yForce = yForce - (bodySpeedY * mouseConstraintDamping);

            let xForce = 0;
            if (!lockDragControls.checked || clickedBody.id === coreHolder.id) {
                xForce = -1 * mouseConstraintStiffnessX * ((mouseConstraint.body.position.x + mouseConstraint.constraint.pointB.x) - mouseConstraint.constraint.pointA.x);
                const bodySpeedX = mouseConstraint.body.velocity.x;
                xForce = xForce - (bodySpeedX * mouseConstraintDamping);
            }

            xForce = Math.min(15, Math.max(-15, xForce));
            yForce = Math.min(15, Math.max(-15, yForce));


            console.log("xforce, yforce", xForce, yForce);
            Matter.Body.applyForce(clickedBody, clickedBody.position, { x: xForce, y: yForce });
        }
    });
    console.log("Added beforeUpdate listener to", engine);

    rotationForceConstraint = Constraint.create({
        bodyA: coreHolder,
        pointB: {
            // Scale down tension dist based on canvas size
            x: coreHolder.position.x + Math.max(100, (rotationOffset * canvas.width / 1400)),
            y: coreHolder.position.y
        },
        stiffness: rotationForceStiffness,
        damping: rotationForceDamping,
        length: 0,
        render: {
            visible: true
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
                    Engine.update(engine, 10);
                    renderToCanvas();
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
    world.gravity.y = gravity;
    const bodiesToAdd = [];
    bodiesToAdd.push(...allPins);
    // bodiesToAdd.push(...allGrounds);
    bodiesToAdd.push(ground);
    bodiesToAdd.push(...allBibles);
    bodiesToAdd.push(...allCores);
    // bodiesToAdd.push(...coreStructureConstraints);
    bodiesToAdd.push(rotationForceConstraint);
    bodiesToAdd.push(coreHolder);
    bodiesToAdd.push(bibleHolder);
    // bodiesToAdd.push(core);

    console.log("Pins by chamber", pinsByChamber);
    for (let chamber of chambers) {
        let chamberCenterX = (chamber.lastRenderMetadata.left + chamber.lastRenderMetadata.right) / 2;
        let chamberTop = canvas.height - (chamber.lastRenderMetadata.y + chamber.lastRenderMetadata.height);
        let pins = pinsByChamber[chamber.chamberIdx];
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
                visible: true
            }
        });
        bodiesToAdd.push(springConstraint);
    }

    Composite.add(world, bodiesToAdd);
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
    // Runner.stop(runner);
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

export default { isOpen, openSimulator, closeSimulator, getPickHeight, setPickHeight, getTensionDist, setTensionDist };