const yearNode = document.querySelector("#year");

if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const usesCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
const canUseDynamicPointer = !prefersReducedMotion && !usesCoarsePointer;

if (canUseDynamicPointer) {
    const cursor = document.querySelector("[data-art-cursor]");
    const mouseScenes = document.querySelectorAll("[data-mouse-scene]");
    const tiltFrames = document.querySelectorAll("[data-image-tilt]");
    const interactiveSelector = "a, button, [data-image-tilt]";

    if (cursor) {
        document.body.classList.add("has-art-cursor");

        let cursorTargetX = window.innerWidth / 2;
        let cursorTargetY = window.innerHeight / 2;
        let cursorCurrentX = cursorTargetX;
        let cursorCurrentY = cursorTargetY;
        let trailCurrentX = cursorTargetX;
        let trailCurrentY = cursorTargetY;
        let cursorRafId = null;

        const renderCursor = () => {
            cursorCurrentX += (cursorTargetX - cursorCurrentX) * 0.22;
            cursorCurrentY += (cursorTargetY - cursorCurrentY) * 0.22;
            trailCurrentX += (cursorTargetX - trailCurrentX) * 0.11;
            trailCurrentY += (cursorTargetY - trailCurrentY) * 0.11;

            cursor.style.transform = `translate(${cursorCurrentX}px, ${cursorCurrentY}px)`;
            cursor.style.setProperty("--trail-offset-x", `${trailCurrentX - cursorCurrentX}px`);
            cursor.style.setProperty("--trail-offset-y", `${trailCurrentY - cursorCurrentY}px`);

            if (
                Math.abs(cursorTargetX - cursorCurrentX) > 0.1 ||
                Math.abs(cursorTargetY - cursorCurrentY) > 0.1 ||
                Math.abs(cursorTargetX - trailCurrentX) > 0.1 ||
                Math.abs(cursorTargetY - trailCurrentY) > 0.1
            ) {
                cursorRafId = window.requestAnimationFrame(renderCursor);
            } else {
                cursorRafId = null;
            }
        };

        const startCursor = () => {
            if (cursorRafId === null) {
                cursorRafId = window.requestAnimationFrame(renderCursor);
            }
        };

        window.addEventListener("pointermove", (event) => {
            cursorTargetX = event.clientX;
            cursorTargetY = event.clientY;
            cursor.classList.add("is-visible");
            startCursor();
        });

        window.addEventListener("pointerdown", () => {
            cursor.classList.add("is-pressed");
        });

        window.addEventListener("pointerup", () => {
            cursor.classList.remove("is-pressed");
        });

        document.addEventListener("pointerover", (event) => {
            if (event.target.closest(interactiveSelector)) {
                cursor.classList.add("is-interactive");
            }
        });

        document.addEventListener("pointerout", (event) => {
            const currentInteractive = event.target.closest(interactiveSelector);
            const nextInteractive = event.relatedTarget instanceof Element
                ? event.relatedTarget.closest(interactiveSelector)
                : null;

            if (currentInteractive && !nextInteractive) {
                cursor.classList.remove("is-interactive");
            }
        });

        document.addEventListener("mouseleave", () => {
            cursor.classList.remove("is-visible", "is-interactive", "is-pressed");
        });

        window.addEventListener("blur", () => {
            cursor.classList.remove("is-visible", "is-interactive", "is-pressed");
        });
    }

    mouseScenes.forEach((scene) => {
        const layers = scene.querySelectorAll("[data-mouse-layer]");
        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;
        let frameId = null;

        const animate = () => {
            currentX += (targetX - currentX) * 0.12;
            currentY += (targetY - currentY) * 0.12;

            layers.forEach((layer) => {
                const depth = Number(layer.dataset.mouseLayer || 0);
                const moveX = currentX * depth;
                const moveY = currentY * depth;

                layer.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });

            if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
                frameId = window.requestAnimationFrame(animate);
            } else {
                frameId = null;
            }
        };

        const start = () => {
            if (frameId === null) {
                frameId = window.requestAnimationFrame(animate);
            }
        };

        scene.addEventListener("pointermove", (event) => {
            const rect = scene.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;

            targetX = (x - 0.5) * 2;
            targetY = (y - 0.5) * 2;
            start();
        });

        scene.addEventListener("pointerleave", () => {
            targetX = 0;
            targetY = 0;
            start();
        });
    });

    tiltFrames.forEach((frame) => {
        frame.addEventListener("pointermove", (event) => {
            const rect = frame.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            const moveX = (x - 0.5) * 10;
            const moveY = (y - 0.5) * 8;
            const rotate = (x - 0.5) * 3;

            frame.classList.add("is-tilting");
            frame.style.transform = `translate(${moveX}px, ${moveY}px) rotate(${rotate}deg)`;
        });

        frame.addEventListener("pointerleave", () => {
            frame.classList.remove("is-tilting");
            frame.style.transform = "translate(0, 0) rotate(0deg)";
        });
    });
}
