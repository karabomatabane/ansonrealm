const yearNode = document.querySelector("#year");

if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const usesCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
const canUseDynamicPointer = !prefersReducedMotion && !usesCoarsePointer;
let isGalleryTransitioning = false;

const easeInOutCubic = (value) => (
    value < 0.5
        ? 4 * value * value * value
        : 1 - Math.pow((-2 * value) + 2, 3) / 2
);

const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

class InteractiveHalftone {
    constructor(frame, canvas, image) {
        this.frame = frame;
        this.canvas = canvas;
        this.context = canvas.getContext("2d");
        this.image = image;
        this.particles = [];
        this.pointerX = -1000;
        this.pointerY = -1000;
        this.radius = 82;
        this.step = 5;
        this.dotColor = "#4b6459";
        this.isAnimating = false;
        this.resizeTimer = null;

        if (!this.context || !this.image) {
            return;
        }

        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerLeave = this.handlePointerLeave.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.animate = this.animate.bind(this);

        if (this.image.complete) {
            this.init();
        } else {
            this.image.addEventListener("load", () => this.init(), { once: true });
        }

        this.frame.addEventListener("pointermove", this.handlePointerMove);
        this.frame.addEventListener("pointerleave", this.handlePointerLeave);
        window.addEventListener("resize", this.handleResize);
    }

    handlePointerMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.pointerX = event.clientX - rect.left;
        this.pointerY = event.clientY - rect.top;
    }

    handlePointerLeave() {
        this.pointerX = -1000;
        this.pointerY = -1000;
    }

    handleResize() {
        window.clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => this.init(), 150);
    }

    init() {
        const rect = this.frame.getBoundingClientRect();

        if (!rect.width || !rect.height || !this.context) {
            return;
        }

        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = Math.round(rect.width * dpr);
        this.canvas.height = Math.round(rect.height * dpr);
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.scale(dpr, dpr);

        const offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = Math.round(rect.width);
        offscreenCanvas.height = Math.round(rect.height);

        const offscreenContext = offscreenCanvas.getContext("2d");

        if (!offscreenContext) {
            return;
        }

        const imageAspect = this.image.naturalWidth / this.image.naturalHeight;
        const frameAspect = offscreenCanvas.width / offscreenCanvas.height;
        let drawWidth;
        let drawHeight;
        let offsetX;
        let offsetY;

        if (imageAspect > frameAspect) {
            drawHeight = offscreenCanvas.height;
            drawWidth = this.image.naturalWidth * (offscreenCanvas.height / this.image.naturalHeight);
            offsetX = (offscreenCanvas.width - drawWidth) * 0.5;
            offsetY = 0;
        } else {
            drawWidth = offscreenCanvas.width;
            drawHeight = this.image.naturalHeight * (offscreenCanvas.width / this.image.naturalWidth);
            offsetX = 0;
            offsetY = (offscreenCanvas.height - drawHeight) * 0.5;
        }

        offscreenContext.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenContext.drawImage(this.image, offsetX, offsetY, drawWidth, drawHeight);

        const imageData = offscreenContext.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height).data;
        const particles = [];

        for (let y = 0; y < offscreenCanvas.height; y += this.step) {
            for (let x = 0; x < offscreenCanvas.width; x += this.step) {
                const index = (y * offscreenCanvas.width + x) * 4;
                const r = imageData[index];
                const g = imageData[index + 1];
                const b = imageData[index + 2];
                const alpha = imageData[index + 3];

                if (alpha < 20) {
                    continue;
                }

                const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                const radius = (1 - brightness) * (this.step * 0.8);

                if (radius <= 0.4) {
                    continue;
                }

                particles.push({
                    ox: x,
                    oy: y,
                    x,
                    y,
                    vx: 0,
                    vy: 0,
                    radius
                });
            }
        }

        this.particles = particles;
        this.frame.classList.add("is-halftone-ready");

        if (!this.isAnimating) {
            this.isAnimating = true;
            window.requestAnimationFrame(this.animate);
        }
    }

    animate() {
        if (!this.context) {
            return;
        }

        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.context.clearRect(0, 0, width, height);
        this.context.fillStyle = this.dotColor;

        for (let index = 0; index < this.particles.length; index += 1) {
            const particle = this.particles[index];
            const dx = this.pointerX - particle.x;
            const dy = this.pointerY - particle.y;
            const distance = Math.sqrt((dx * dx) + (dy * dy));

            if (distance < this.radius) {
                const force = (this.radius - distance) / this.radius;
                const angle = Math.atan2(dy, dx);
                particle.vx -= Math.cos(angle) * force * 3;
                particle.vy -= Math.sin(angle) * force * 3;
            }

            particle.vx += (particle.ox - particle.x) * 0.08;
            particle.vy += (particle.oy - particle.y) * 0.08;
            particle.vx *= 0.82;
            particle.vy *= 0.82;
            particle.x += particle.vx;
            particle.y += particle.vy;

            this.context.beginPath();
            this.context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.context.fill();
        }

        window.requestAnimationFrame(this.animate);
    }
}

class InteractiveBlobScene {
    constructor(container) {
        this.container = container;
        this.blobs = Array.from(container.querySelectorAll("[data-paper-blob]"));
        this.pointerX = window.innerWidth * 0.5;
        this.pointerY = window.innerHeight * 0.5;
        this.smoothedPointerX = this.pointerX;
        this.smoothedPointerY = this.pointerY;
        this.pointerActive = false;
        this.pointerReach = 280;
        this.blobStates = [];
        this.resizeTimer = null;

        if (!this.blobs.length) {
            return;
        }

        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerLeave = this.handlePointerLeave.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.animate = this.animate.bind(this);

        if (canUseDynamicPointer) {
            window.addEventListener("pointermove", this.handlePointerMove);
            window.addEventListener("pointerleave", this.handlePointerLeave);
            window.addEventListener("blur", this.handlePointerLeave);
        }

        window.addEventListener("resize", this.handleResize);
        this.setupBlobs();
        window.requestAnimationFrame(this.animate);
    }

    handlePointerMove(event) {
        this.pointerActive = true;
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
    }

    handlePointerLeave() {
        this.pointerActive = false;
    }

    handleResize() {
        window.clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => this.setupBlobs(), 150);
    }

    setupBlobs() {
        const rect = this.container.getBoundingClientRect();
        const minSide = Math.min(rect.width, rect.height);

        const configs = [
            { x: 0.58, y: 0.52, w: 0.82, h: 0.76, driftX: 12, driftY: 10, pull: 88, scale: 0.24, phase: 0.8 }
        ];

        this.pointerReach = Math.max(380, minSide * 0.86);
        this.blobStates = this.blobs.map((blob, index) => {
            const config = configs[index] || configs[configs.length - 1];
            const width = minSide * config.w;
            const height = minSide * config.h;

            blob.style.width = `${width}px`;
            blob.style.height = `${height}px`;

            return {
                element: blob,
                width,
                height,
                baseX: rect.width * config.x,
                baseY: rect.height * config.y,
                driftX: config.driftX,
                driftY: config.driftY,
                pull: config.pull,
                scaleAmount: config.scale,
                phase: config.phase,
                currentX: rect.width * config.x,
                currentY: rect.height * config.y,
                currentScaleX: 1,
                currentScaleY: 1,
                currentRotate: 0,
                morphA: 50,
                morphB: 50,
                morphC: 50,
                morphD: 50
            };
        });
    }

    animate(time) {
        if (isGalleryTransitioning) {
            window.requestAnimationFrame(this.animate);
            return;
        }

        const rect = this.container.getBoundingClientRect();
        const now = time * 0.001;

        if (this.pointerActive) {
            this.smoothedPointerX += (this.pointerX - this.smoothedPointerX) * 0.24;
            this.smoothedPointerY += (this.pointerY - this.smoothedPointerY) * 0.24;
        }

        this.blobStates.forEach((blob) => {
            const idleX = Math.sin((now * 0.42) + blob.phase) * blob.driftX;
            const idleY = Math.cos((now * 0.5) + (blob.phase * 1.1)) * blob.driftY;

            let targetX = blob.baseX + idleX;
            let targetY = blob.baseY + idleY;
            let targetScaleX = 1 + (Math.sin((now * 0.54) + blob.phase) * 0.03);
            let targetScaleY = 1 + (Math.cos((now * 0.48) + blob.phase) * 0.035);
            let targetRotate = Math.sin((now * 0.24) + blob.phase) * 4;

            if (this.pointerActive && rect.width && rect.height) {
                const localPointerX = this.smoothedPointerX - rect.left;
                const localPointerY = this.smoothedPointerY - rect.top;
                const dx = localPointerX - targetX;
                const dy = localPointerY - targetY;
                const distance = Math.hypot(dx, dy);
                const force = Math.max(0, 1 - (distance / this.pointerReach));
                const pullForce = Math.pow(force, 0.85);

                if (force > 0) {
                    const angle = Math.atan2(dy, dx);
                    targetX += Math.cos(angle) * blob.pull * pullForce;
                    targetY += Math.sin(angle) * blob.pull * pullForce;
                    targetScaleX += pullForce * blob.scaleAmount;
                    targetScaleY -= pullForce * (blob.scaleAmount * 0.34);
                    targetRotate += Math.sin(angle) * pullForce * 12;
                }
            }

            blob.currentX += (targetX - blob.currentX) * 0.085;
            blob.currentY += (targetY - blob.currentY) * 0.085;
            blob.currentScaleX += (targetScaleX - blob.currentScaleX) * 0.08;
            blob.currentScaleY += (targetScaleY - blob.currentScaleY) * 0.08;
            blob.currentRotate += (targetRotate - blob.currentRotate) * 0.08;

            const translateX = blob.currentX - (blob.width * 0.5);
            const translateY = blob.currentY - (blob.height * 0.5);
            const targetMorphA = 48 + (Math.sin((now * 0.66) + blob.phase) * 10);
            const targetMorphB = 56 + (Math.cos((now * 0.58) + blob.phase) * 8);
            const targetMorphC = 50 + (Math.sin((now * 0.74) + (blob.phase * 1.3)) * 11);
            const targetMorphD = 46 + (Math.cos((now * 0.62) + (blob.phase * 0.8)) * 9);

            blob.morphA += (targetMorphA - blob.morphA) * 0.07;
            blob.morphB += (targetMorphB - blob.morphB) * 0.07;
            blob.morphC += (targetMorphC - blob.morphC) * 0.07;
            blob.morphD += (targetMorphD - blob.morphD) * 0.07;

            blob.element.style.borderRadius = `${blob.morphA}% ${blob.morphB}% ${blob.morphC}% ${blob.morphD}% / ${blob.morphC}% ${blob.morphA}% ${blob.morphD}% ${blob.morphB}%`;
            blob.element.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${blob.currentScaleX}, ${blob.currentScaleY}) rotate(${blob.currentRotate}deg)`;
        });

        window.requestAnimationFrame(this.animate);
    }
}

class AnimatedBackgroundBlob {
    constructor(element) {
        this.element = element;
        this.pointerX = window.innerWidth * 0.5;
        this.pointerY = window.innerHeight * 0.5;
        this.smoothedPointerX = this.pointerX;
        this.smoothedPointerY = this.pointerY;
        this.pointerActive = false;
        this.currentX = 0;
        this.currentY = 0;
        this.currentScaleX = 1;
        this.currentScaleY = 1;
        this.currentRotate = 0;
        this.morphA = 52;
        this.morphB = 48;
        this.morphC = 46;
        this.morphD = 54;

        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerLeave = this.handlePointerLeave.bind(this);
        this.animate = this.animate.bind(this);

        if (canUseDynamicPointer) {
            window.addEventListener("pointermove", this.handlePointerMove);
            window.addEventListener("pointerleave", this.handlePointerLeave);
            window.addEventListener("blur", this.handlePointerLeave);
        }

        window.requestAnimationFrame(this.animate);
    }

    handlePointerMove(event) {
        this.pointerActive = true;
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
    }

    handlePointerLeave() {
        this.pointerActive = false;
    }

    animate(time) {
        if (isGalleryTransitioning) {
            window.requestAnimationFrame(this.animate);
            return;
        }

        const rect = this.element.getBoundingClientRect();
        const now = time * 0.001;

        if (this.pointerActive) {
            this.smoothedPointerX += (this.pointerX - this.smoothedPointerX) * 0.12;
            this.smoothedPointerY += (this.pointerY - this.smoothedPointerY) * 0.12;
        }

        let targetX = Math.sin((now * 0.18) + 0.6) * 18;
        let targetY = Math.cos((now * 0.21) + 1.1) * 14;
        let targetScaleX = 1 + (Math.sin((now * 0.26) + 0.8) * 0.025);
        let targetScaleY = 1 + (Math.cos((now * 0.24) + 0.4) * 0.03);
        let targetRotate = Math.sin((now * 0.14) + 0.2) * 3;

        if (this.pointerActive && rect.width && rect.height) {
            const localPointerX = this.smoothedPointerX - rect.left;
            const localPointerY = this.smoothedPointerY - rect.top;
            const centerX = rect.width * 0.5;
            const centerY = rect.height * 0.5;
            const dx = localPointerX - centerX;
            const dy = localPointerY - centerY;
            const distance = Math.hypot(dx, dy);
            const reach = Math.max(rect.width, rect.height) * 0.7;
            const force = Math.max(0, 1 - (distance / reach));

            targetX += (dx / Math.max(rect.width, 1)) * 24 * force;
            targetY += (dy / Math.max(rect.height, 1)) * 24 * force;
            targetScaleX += force * 0.05;
            targetScaleY += force * 0.04;
            targetRotate += (dx / Math.max(rect.width, 1)) * 8 * force;
        }

        this.currentX += (targetX - this.currentX) * 0.05;
        this.currentY += (targetY - this.currentY) * 0.05;
        this.currentScaleX += (targetScaleX - this.currentScaleX) * 0.055;
        this.currentScaleY += (targetScaleY - this.currentScaleY) * 0.055;
        this.currentRotate += (targetRotate - this.currentRotate) * 0.05;

        const targetMorphA = 52 + (Math.sin((now * 0.32) + 0.2) * 8);
        const targetMorphB = 48 + (Math.cos((now * 0.28) + 1.1) * 8);
        const targetMorphC = 46 + (Math.sin((now * 0.35) + 2.4) * 9);
        const targetMorphD = 54 + (Math.cos((now * 0.3) + 3.2) * 7);

        this.morphA += (targetMorphA - this.morphA) * 0.055;
        this.morphB += (targetMorphB - this.morphB) * 0.055;
        this.morphC += (targetMorphC - this.morphC) * 0.055;
        this.morphD += (targetMorphD - this.morphD) * 0.055;

        this.element.style.borderRadius = `${this.morphA}% ${this.morphB}% ${this.morphC}% ${this.morphD}% / ${this.morphC}% ${this.morphA}% ${this.morphD}% ${this.morphB}%`;
        this.element.style.transform = `translate3d(${this.currentX}px, ${this.currentY}px, 0) scale(${this.currentScaleX}, ${this.currentScaleY}) rotate(${this.currentRotate}deg)`;

        window.requestAnimationFrame(this.animate);
    }
}

const initArtCursor = () => {
    if (!canUseDynamicPointer) {
        return;
    }

    const cursor = document.querySelector("[data-art-cursor]");
    const interactiveSelector = "[data-halftone-frame], a, button";

    if (!cursor) {
        return;
    }

    document.body.classList.add("has-art-cursor");

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let cursorFrame = null;

    const renderCursor = () => {
        currentX += (targetX - currentX) * 0.22;
        currentY += (targetY - currentY) * 0.22;

        cursor.style.transform = `translate(${currentX}px, ${currentY}px)`;

        if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
            cursorFrame = window.requestAnimationFrame(renderCursor);
        } else {
            cursorFrame = null;
        }
    };

    const ensureCursor = () => {
        if (cursorFrame === null) {
            cursorFrame = window.requestAnimationFrame(renderCursor);
        }
    };

    window.addEventListener("pointermove", (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
        cursor.classList.add("is-visible");
        ensureCursor();
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
};

const initProfileHalftone = () => {
    if (prefersReducedMotion) {
        return;
    }

    const frame = document.querySelector("[data-halftone-frame]");
    const canvas = document.querySelector("[data-halftone-canvas]");
    const image = frame?.querySelector(".about-profile-image");

    if (!frame || !canvas || !image) {
        return;
    }

    new InteractiveHalftone(frame, canvas, image);
};

const initPaperShape = () => {
    if (prefersReducedMotion) {
        return;
    }

    const paperShape = document.querySelector("[data-paper-shape]");

    if (!paperShape) {
        return;
    }

    new InteractiveBlobScene(paperShape);
};

const initBackgroundBlob = () => {
    if (prefersReducedMotion) {
        return;
    }

    const backgroundBlob = document.querySelector("[data-background-blob]");

    if (!backgroundBlob) {
        return;
    }

    new AnimatedBackgroundBlob(backgroundBlob);
};

const initGalleryTransition = () => {
    const galleryLink = document.querySelector("[data-gallery-link]");

    if (!galleryLink) {
        return;
    }

    const targetSelector = galleryLink.getAttribute("href");
    const target = targetSelector ? document.querySelector(targetSelector) : null;

    if (!target) {
        return;
    }

    let transitionFrame = null;
    let restoreScrollBehavior = null;

    galleryLink.addEventListener("click", (event) => {
        event.preventDefault();

        if (transitionFrame !== null) {
            window.cancelAnimationFrame(transitionFrame);
            transitionFrame = null;
            document.body.classList.remove("is-gallery-transitioning");
            document.body.style.setProperty("--gallery-progress", "0");
        }

        if (typeof restoreScrollBehavior === "function") {
            restoreScrollBehavior();
            restoreScrollBehavior = null;
        }

        const destination = window.scrollY + target.getBoundingClientRect().top - 56;

        if (prefersReducedMotion) {
            window.scrollTo(0, destination);
            window.history.pushState(null, "", targetSelector);
            return;
        }

        const startY = window.scrollY;
        const distance = destination - startY;
        const duration = 1200;
        const startTime = performance.now();
        const root = document.documentElement;
        const previousScrollBehavior = root.style.scrollBehavior;

        root.style.scrollBehavior = "auto";
        isGalleryTransitioning = true;
        restoreScrollBehavior = () => {
            root.style.scrollBehavior = previousScrollBehavior;
            isGalleryTransitioning = false;
        };

        document.body.classList.add("is-gallery-transitioning");

        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);

            document.body.style.setProperty("--gallery-progress", eased.toFixed(3));
            window.scrollTo(0, startY + (distance * eased));

            if (progress < 1) {
                transitionFrame = window.requestAnimationFrame(step);
                return;
            }

            document.body.classList.remove("is-gallery-transitioning");
            document.body.style.setProperty("--gallery-progress", "0");
            restoreScrollBehavior?.();
            restoreScrollBehavior = null;
            window.history.pushState(null, "", targetSelector);
            transitionFrame = null;
        };

        step(startTime);
    });
};

initArtCursor();
initProfileHalftone();
initPaperShape();
initBackgroundBlob();
initGalleryTransition();
