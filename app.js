// At the start of your file, update the canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', {
    alpha: true,
    antialias: true,
    desynchronized: true
});

// Enable image smoothing for better quality
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

// Set fixed dimensions with higher resolution
const CANVAS_SIZE = 2400;  // Increased from 2000
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// Scale canvas to fit window while maintaining aspect ratio
function fitCanvasToWindow() {
    const padding = 80;
    const scale = Math.min(
        (window.innerWidth) / canvas.width,
        (window.innerHeight - padding) / canvas.height
    );
    
    // Use transform instead of CSS scaling for better quality
    canvas.style.width = `${canvas.width * scale}px`;
    canvas.style.height = `${canvas.height * scale}px`;
    
    // Apply device pixel ratio for retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.style.transform = `scale(${1/dpr})`;
    canvas.style.transformOrigin = '0 0';
}

let isFastMode = false;

function toggleSpeed() {
    isFastMode = !isFastMode;
}

// Update padding definition to be responsive
let VIEWPORT_PADDING = window.innerWidth < 480 ? 15 : 
                      window.innerWidth < 768 ? 20 : 30;

// Create base button style
const buttonStyle = {
    position: 'fixed',
    padding: '12px 20px',
    background: 'black',
    color: 'white',
    border: '1px solid white',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    zIndex: '1000'
};

// Add title with original styling
const title = document.createElement('h1');
title.textContent = 'Drawer';
Object.assign(title.style, {
    position: 'fixed',
    left: `${VIEWPORT_PADDING}px`,
    top: `${VIEWPORT_PADDING}px`,
    color: 'white',
    fontFamily: 'monospace',
    fontSize: '20px',
    margin: '0',
    padding: '0',
    zIndex: '1000'
});
document.body.appendChild(title);

// After canvas setup
console.log('Canvas dimensions:', canvas.width, canvas.height);

// Add global light configuration after canvas setup
const globalLight = {
    x: -1,  // Light direction vector
    y: -1,
    z: -2,
    intensity: 1.4,  // Increased from 1.2
    ambient: 0.4     // Increased from 0.3
};

// Normalize light direction
const lightMagnitude = Math.sqrt(
    globalLight.x * globalLight.x + 
    globalLight.y * globalLight.y + 
    globalLight.z * globalLight.z
);
globalLight.x /= lightMagnitude;
globalLight.y /= lightMagnitude;
globalLight.z /= lightMagnitude;

// Add shape configurations after canvas setup
const shapeTypes = {
    SPHERE: 'sphere',
    TORUS: 'torus',
    SPIRAL: 'spiral',
    WAVE: 'wave',
    CROSS: 'cross'  // New shape type
};

let currentShapeType = shapeTypes.SPHERE; // Default shape
let sharedControlPoints = [];
let sharedObjectRotation = 0;

// Define the Dot class first
class Dot {
    constructor(startX = canvas.width / 2, startY = canvas.height / 2, id) {
        console.log('Creating dot:', id);
        this.x = startX;
        this.y = startY;
        this.lastX = this.x;
        this.lastY = this.y;
        this.id = id;
        this.t = id * 0.1;
        
        // Speed properties
        this.baseSpeed = 4;
        this.fastModeMultiplier = 25;
        this.speedVariation = 0;
        this.currentSpeed = this.baseSpeed;
        this.direction = Math.random() * Math.PI * 2;
        
        // Line properties with dynamic sizing
        this.minWidth = 0.3;  // Reduced from 0.5 for finer details
        this.maxWidth = 10;   // Reduced from 14 for more consistent lines
        this.lineWidth = this.minWidth;
        this.targetLineWidth = this.lineWidth;
        
        // Add line smoothing properties
        this.positionHistory = [];
        this.maxHistoryLength = 3;
        this.smoothingFactor = 0.65;
        
        // Movement interpolation
        this.interpolationSteps = 4;
        this.currentInterpolationStep = 0;
        
        // Enhanced depth control
        this.depthScale = {
            min: 0.4,
            max: 1.2
        };
        
        // Color schemes based on shape types
        this.colorSchemes = {
            [shapeTypes.SPHERE]: {
                hue: 200,        // Blue base
                hueRange: 40,    // Variation in hue
                saturation: 70,  // Vibrant but not too intense
                lightness: 60    // Increased from 50
            },
            [shapeTypes.TORUS]: {
                hue: 280,        // Purple base
                hueRange: 30,    // Smaller variation
                saturation: 60,
                lightness: 55    // Increased from 45
            },
            [shapeTypes.SPIRAL]: {
                hue: 120,        // Green base
                hueRange: 40,
                saturation: 65,
                lightness: 50    // Increased from 40
            },
            [shapeTypes.WAVE]: {
                hue: 180,        // Cyan base
                hueRange: 30,
                saturation: 75,
                lightness: 65    // Increased from 55
            },
            [shapeTypes.CROSS]: {
                hue: 340,        // Red/Pink base
                hueRange: 20,    // Tighter color range
                saturation: 80,  // More saturated
                lightness: 60    // Increased from 50
            }
        };
        
        // Initialize with first color scheme
        const scheme = this.colorSchemes[currentShapeType];
        this.hue = scheme.hue + (Math.random() - 0.5) * scheme.hueRange;
        this.saturation = scheme.saturation + (Math.random() - 0.5) * 20;
        this.lightness = scheme.lightness + (Math.random() - 0.5) * 15;
        this.opacity = Math.random() * 0.6 + 0.4;  // Increased base opacity
        this.targetHue = this.hue;
        this.targetOpacity = this.opacity;
        
        // Behavior properties
        this.behaviors = {
            RANDOM: 'random',
            PROCEDURAL: 'procedural'
        };
        this.currentBehavior = this.behaviors.PROCEDURAL;
        this.forceProceduralMode = true; // Always force procedural

        // Add transition properties
        this.targetX = this.x;
        this.targetY = this.y;
        this.transitionSpeed = 0.05; // Lower = smoother transition

        // Add transition state to Dot class
        this.isTransitioning = false;
        this.transitionDuration = 2000; // 2 seconds of random movement
        this.transitionStartTime = 0;
        
        // Enhanced random movement properties
        this.randomSpeed = Math.random() * 8 + 2; // Variable speed between 2 and 10
        this.randomDirection = Math.random() * Math.PI * 2;
        this.directionChangeRate = Math.random() * 0.4 + 0.1; // How often direction changes
        this.speedVariation = Math.random() * 0.5 + 0.5; // How much speed varies
    }

    updateProcedural() {
        if (!sharedControlPoints || sharedControlPoints.length === 0) {
            console.error('No control points available');
            return;
        }

        // Even slower movement for more connected pattern
        this.t += 0.0002;
        sharedObjectRotation += 0.001;
        
        const pos = ProceduralObject.getPosition(
            this.t,
            sharedControlPoints,
            sharedObjectRotation
        );
        
        // Store last position
        this.lastX = this.x;
        this.lastY = this.y;
        
        // Position smoothing with history
        this.positionHistory.push({ x: pos.x, y: pos.y });
        if (this.positionHistory.length > this.maxHistoryLength) {
            this.positionHistory.shift();
        }
        
        // Calculate smoothed position
        let smoothX = 0;
        let smoothY = 0;
        this.positionHistory.forEach((pos, i) => {
            const weight = Math.pow(this.smoothingFactor, this.maxHistoryLength - i - 1);
            smoothX += pos.x * weight;
            smoothY += pos.y * weight;
        });
        
        const totalWeight = (1 - Math.pow(this.smoothingFactor, this.maxHistoryLength)) / (1 - this.smoothingFactor);
        smoothX /= totalWeight;
        smoothY /= totalWeight;
        
        // Smoother transition with interpolation
        const transitionSpeed = 0.15;  // Increased from 0.1
        this.x += (smoothX - this.x) * transitionSpeed;
        this.y += (smoothY - this.y) * transitionSpeed;
        
        // Enhanced depth effect
        this.currentDepth = Math.max(this.depthScale.min, 
                                   Math.min(this.depthScale.max, pos.depth));
        this.currentLighting = pos.lighting;
        
        // Adjust line width more subtly based on depth
        const depthInfluence = (this.currentDepth - this.depthScale.min) / 
                              (this.depthScale.max - this.depthScale.min);
        this.lineWidth = this.minWidth + 
                        (this.maxWidth - this.minWidth) * depthInfluence;
    }

    update() {
        if (this.isTransitioning) {
            const elapsed = Date.now() - this.transitionStartTime;
            
            if (elapsed > this.transitionDuration) {
                // Transition complete, start new shape
                this.isTransitioning = false;
                this.currentBehavior = this.behaviors.PROCEDURAL;
            } else {
                // More chaotic random movement during transition
                // Random direction changes
                this.randomDirection += (Math.random() - 0.5) * this.directionChangeRate;
                
                // Random speed variations
                this.randomSpeed *= (1 + (Math.random() - 0.5) * this.speedVariation);
                this.randomSpeed = Math.max(2, Math.min(10, this.randomSpeed)); // Keep speed in reasonable range
                
                // Add some occasional sudden direction changes
                if (Math.random() < 0.05) {
                    this.randomDirection += Math.PI * (Math.random() - 0.5);
                }
                
                // Add some occasional bursts of speed
                if (Math.random() < 0.03) {
                    this.randomSpeed *= (Math.random() * 2 + 1);
                }
                
                // Update position with new chaotic movement
                this.x += Math.cos(this.randomDirection) * this.randomSpeed;
                this.y += Math.sin(this.randomDirection) * this.randomSpeed;
                
                // Bounce off canvas edges
                if (this.x < 0 || this.x > canvas.width) {
                    this.randomDirection = Math.PI - this.randomDirection;
                    this.x = Math.max(0, Math.min(canvas.width, this.x));
                }
                if (this.y < 0 || this.y > canvas.height) {
                    this.randomDirection = -this.randomDirection;
                    this.y = Math.max(0, Math.min(canvas.height, this.y));
                }
            }
        } else {
            this.updateProcedural();
        }

        // Dynamic line width updates
        if (Math.random() < (isFastMode ? 0.03 : 0.1)) {
            this.targetLineWidth = Math.random() * (this.maxWidth - this.minWidth) + this.minWidth;
        }
        this.lineWidth += (this.targetLineWidth - this.lineWidth) * (isFastMode ? 0.1 : 0.25);

        // Update colors based on current shape
        const scheme = this.colorSchemes[currentShapeType];
        if (Math.random() < 0.01) {
            this.targetHue = scheme.hue + (Math.random() - 0.5) * scheme.hueRange;
            this.saturation = scheme.saturation + (Math.random() - 0.5) * 20;
            this.lightness = scheme.lightness + (Math.random() - 0.5) * 15;
            this.targetOpacity = Math.random() * 0.5 + 0.3;
        }
        
        // Smooth color transitions
        this.hue += (this.targetHue - this.hue) * 0.05;
        this.opacity += (this.targetOpacity - this.opacity) * 0.15;

        this.drawSegment();
    }

    drawSegment() {
        ctx.beginPath();
        
        // Use quadratic curves for smoother lines
        if (this.positionHistory.length >= 2) {
            const prevPos = this.positionHistory[this.positionHistory.length - 2];
            const currentPos = this.positionHistory[this.positionHistory.length - 1];
            
            // Control point for quadratic curve
            const cpX = (prevPos.x + currentPos.x) / 2;
            const cpY = (prevPos.y + currentPos.y) / 2;
            
            ctx.moveTo(this.lastX, this.lastY);
            ctx.quadraticCurveTo(cpX, cpY, this.x, this.y);
        } else {
            ctx.moveTo(this.lastX, this.lastY);
            ctx.lineTo(this.x, this.y);
        }
        
        // Fine-tuned depth and lighting calculations
        const depthWidth = this.lineWidth * (0.8 + (this.currentDepth || 0.5));
        const depthOpacity = this.opacity * (0.6 + (this.currentDepth || 0.5));
        const adjustedLightness = this.lightness * (this.currentLighting || 1.2);
        
        ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, ${adjustedLightness}%, ${depthOpacity})`;
        ctx.lineWidth = depthWidth;
        ctx.lineCap = 'round';  // Always use round for smoother lines
        
        // Enable line join for smoother corners
        ctx.lineJoin = 'round';
        ctx.miterLimit = 1;
        
        ctx.stroke();
    }
}

// Then define ProceduralObject class
class ProceduralObject {
    static generateControlPoints() {
        console.log('Generating points for shape type:', currentShapeType);
        
        // Random radius between 100 and 300
        const minRadius = 100;
        const maxRadius = 300;
        const radius = Math.random() * (maxRadius - minRadius) + minRadius;
        
        console.log('Generated shape with radius:', radius);
        
        let points;
        switch(currentShapeType) {
            case shapeTypes.SPHERE:
                points = this.generateSphere(radius);
                break;
            case shapeTypes.TORUS:
                points = this.generateTorus(radius);
                break;
            case shapeTypes.SPIRAL:
                points = this.generateSpiral(radius);
                break;
            case shapeTypes.WAVE:
                points = this.generateWave(radius);
                break;
            case shapeTypes.CROSS:
                points = this.generateCross(radius);
                break;
            default:
                points = this.generateSphere(radius);
        }
        
        return points;
    }

    static generateSphere(radius) {
        const points = [];
        const steps = 12;
        
        for (let i = 0; i < steps; i++) {
            const phi = (i / steps) * Math.PI * 2;
            points.push({
                x: radius * Math.cos(phi),
                y: radius * Math.sin(phi * 2) * 0.5, // Dramatic up/down movement
                z: radius * Math.sin(phi) * 0.5,     // Front/back movement
            });
        }
        return points;
    }

    static generateTorus(radius) {
        const points = [];
        const steps = 12;
        const tubeRadius = radius * 0.3;
        
        for (let i = 0; i < steps; i++) {
            const theta = (i / steps) * Math.PI * 2;
            points.push({
                x: (radius + tubeRadius * Math.cos(theta * 4)) * Math.cos(theta),
                y: (radius + tubeRadius * Math.cos(theta * 4)) * Math.sin(theta),
                z: tubeRadius * Math.sin(theta * 4),
            });
        }
        return points;
    }

    static generateSpiral(radius) {
        const points = [];
        const steps = 12;
        
        for (let i = 0; i < steps; i++) {
            const t = (i / steps) * Math.PI * 4; // Two full rotations
            const scale = 1 - (i / steps) * 0.8; // Dramatic inward spiral
            points.push({
                x: radius * scale * Math.cos(t),
                y: radius * scale * Math.sin(t),
                z: radius * (i / steps) - radius/2,
            });
        }
        return points;
    }

    static generateWave(radius) {
        const points = [];
        const steps = 12;
        
        for (let i = 0; i < steps; i++) {
            const t = (i / steps) * Math.PI * 2;
            points.push({
                x: radius * Math.cos(t),
                y: radius * Math.sin(t),
                z: radius * Math.sin(t * 4) * 0.5, // More dramatic waves
            });
        }
        return points;
    }

    static generateCross(radius) {
        const points = [];
        const steps = 12;
        
        // Generate points for a cross shape
        for (let i = 0; i < steps; i++) {
            const segment = Math.floor(i / 3); // Divides into 4 segments
            const fraction = (i % 3) / 2; // Position within segment
            
            let x = 0, y = 0, z = 0;
            
            switch(segment) {
                case 0: // Top arm
                    x = 0;
                    y = radius * (1 - fraction);
                    z = 0;
                    break;
                case 1: // Right arm
                    x = radius * fraction;
                    y = 0;
                    z = 0;
                    break;
                case 2: // Bottom arm
                    x = 0;
                    y = -radius * fraction;
                    z = 0;
                    break;
                case 3: // Left arm
                    x = -radius * (1 - fraction);
                    y = 0;
                    z = 0;
                    break;
            }
            
            points.push({ x, y, z });
        }
        
        return points;
    }

    static getPosition(t, controlPoints, rotationAngle = 0) {
        if (!controlPoints || controlPoints.length === 0) {
            console.error('Invalid control points:', controlPoints);
            return { x: 0, y: 0, depth: 0.5, lighting: 1 };
        }
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Ensure t is positive and wrap around the points array
        const time = Math.abs(t * controlPoints.length);
        const index = Math.floor(time) % controlPoints.length;
        const nextIndex = (index + 1) % controlPoints.length;
        const fraction = time - Math.floor(time);

        const p1 = controlPoints[index];
        const p2 = controlPoints[nextIndex];
        
        if (!p1 || !p2) {
            console.error('Invalid point index:', { index, nextIndex, length: controlPoints.length });
            return { x: centerX, y: centerY, depth: 0.5, lighting: 1 };
        }

        // Simple linear interpolation with smaller scaling
        const scale = 0.8; // Reduced from 1.0 to 0.8
        const x = (p1.x + (p2.x - p1.x) * fraction) * scale;
        const y = (p1.y + (p2.y - p1.y) * fraction) * scale;
        const z = (p1.z + (p2.z - p1.z) * fraction) * scale;

        // Apply rotation
        const rotatedX = x * Math.cos(rotationAngle) - z * Math.sin(rotationAngle);
        const rotatedZ = x * Math.sin(rotationAngle) + z * Math.cos(rotationAngle);
        
        // Enhanced perspective effect
        const perspective = 800; // Reduced from 1200 to 800
        const perspectiveScale = perspective / (perspective + rotatedZ);

        return {
            x: centerX + rotatedX * perspectiveScale,
            y: centerY + y * perspectiveScale,
            depth: (rotatedZ + 300) / 600, // Adjusted for smaller size
            lighting: Math.max(0.2, Math.min(1, ((rotatedZ + 300) / 600) * 1.5))
        };
    }
}

// Then create dots
const dots = [];
for (let i = 0; i < 12; i++) {
    dots.push(new Dot(canvas.width / 2, canvas.height / 2, i));
}

// Initialize first shape
sharedControlPoints = ProceduralObject.generateControlPoints();
sharedObjectRotation = Math.random() * Math.PI * 2;

// Add shape switching button (now positioned below title)
const shapeButton = document.createElement('button');
shapeButton.textContent = 'Switch Shape';
Object.assign(shapeButton.style, {
    ...buttonStyle,
    left: `${VIEWPORT_PADDING}px`,
    top: `${VIEWPORT_PADDING + 50}px`
});

// Add button click handler
shapeButton.addEventListener('click', () => {
    console.log('Button clicked');
    
    // Start transition phase
    dots.forEach(dot => {
        dot.isTransitioning = true;
        dot.transitionStartTime = Date.now();
        dot.randomDirection = Math.random() * Math.PI * 2;
    });
    
    // Schedule shape switch after transition
    setTimeout(() => {
        // Cycle through shapes
        const shapes = Object.values(shapeTypes);
        const currentIndex = shapes.indexOf(currentShapeType);
        currentShapeType = shapes[(currentIndex + 1) % shapes.length];
        console.log('New shape type:', currentShapeType);
        
        // Generate new shape
        sharedControlPoints = ProceduralObject.generateControlPoints();
        
        // Reset dots for new shape but keep their current positions
        dots.forEach(dot => {
            dot.forceProceduralMode = true;
            dot.currentBehavior = dot.behaviors.PROCEDURAL;
            dot.t = dot.id * 0.1;
        });
    }, 2000); // Same as transitionDuration
});

// Add pen style randomizer button (positioned below shape button)
const penStyleButton = document.createElement('button');
penStyleButton.textContent = 'Randomize Pens';
Object.assign(penStyleButton.style, {
    ...buttonStyle,
    left: `${VIEWPORT_PADDING}px`,
    top: `${VIEWPORT_PADDING + 110}px`
});

// Add click handler
penStyleButton.addEventListener('click', () => {
    dots.forEach(dot => {
        // Randomize line width range
        dot.minWidth = Math.random() * 2;
        dot.maxWidth = Math.random() * 15 + 5;
        
        // Randomize opacity range
        dot.opacity = Math.random() * 0.5 + 0.3;
        dot.targetOpacity = dot.opacity;
        
        // Randomize line cap style
        const caps = ['round', 'butt', 'square'];
        dot.lineCap = caps[Math.floor(Math.random() * caps.length)];
        
        // Randomize color variation ranges
        dot.colorSchemes[currentShapeType].hueRange = Math.random() * 60 + 10;
        dot.colorSchemes[currentShapeType].saturation = Math.random() * 40 + 40;
        dot.colorSchemes[currentShapeType].lightness = Math.random() * 30 + 35;
    });
});

// Add hover effects to both buttons
[shapeButton, penStyleButton].forEach(button => {
    button.addEventListener('mouseover', () => {
        Object.assign(button.style, {
            background: 'white',
            color: 'black'
        });
    });
    
    button.addEventListener('mouseout', () => {
        Object.assign(button.style, {
            background: 'black',
            color: 'white'
        });
    });
});

// Make sure to append both buttons to the document
document.body.appendChild(shapeButton);
document.body.appendChild(penStyleButton);

// Add randomize all functionality
let isRandomizeAllActive = false;
let randomizeInterval;

const randomizeAllButton = document.createElement('button');
randomizeAllButton.textContent = 'Randomize All: OFF';
Object.assign(randomizeAllButton.style, {
    ...buttonStyle,
    left: `${VIEWPORT_PADDING}px`,
    top: `${VIEWPORT_PADDING + 170}px`  // Position below other buttons
});

// Function to trigger random changes
function triggerRandomChanges() {
    if (Math.random() < 0.5) {  // 50% chance to switch shape
        shapeButton.click();
    }
    if (Math.random() < 0.5) {  // 50% chance to randomize pens
        penStyleButton.click();
    }
}

// Add click handler for the randomize all button
randomizeAllButton.addEventListener('click', () => {
    isRandomizeAllActive = !isRandomizeAllActive;
    randomizeAllButton.textContent = `Randomize All: ${isRandomizeAllActive ? 'ON' : 'OFF'}`;
    
    if (isRandomizeAllActive) {
        // Initial trigger
        triggerRandomChanges();
        
        // Set up random interval changes
        function scheduleNextChange() {
            const minDelay = 2000;  // Minimum 2 seconds
            const maxDelay = 8000;  // Maximum 8 seconds
            const delay = Math.random() * (maxDelay - minDelay) + minDelay;
            
            randomizeInterval = setTimeout(() => {
                if (isRandomizeAllActive) {
                    triggerRandomChanges();
                    scheduleNextChange();  // Schedule next change
                }
            }, delay);
        }
        
        scheduleNextChange();
    } else {
        // Clear the interval when turned off
        clearTimeout(randomizeInterval);
    }
});

// Add hover effects to the new button
randomizeAllButton.addEventListener('mouseover', () => {
    Object.assign(randomizeAllButton.style, {
        background: 'white',
        color: 'black'
    });
});

randomizeAllButton.addEventListener('mouseout', () => {
    Object.assign(randomizeAllButton.style, {
        background: 'black',
        color: 'white'
    });
});

// Make sure to append the new button to the document
document.body.appendChild(randomizeAllButton);

// Update hover effects array to include all buttons
[shapeButton, penStyleButton, randomizeAllButton].forEach(button => {
    button.addEventListener('mouseover', () => {
        Object.assign(button.style, {
            background: 'white',
            color: 'black'
        });
    });
    
    button.addEventListener('mouseout', () => {
        Object.assign(button.style, {
            background: 'black',
            color: 'white'
        });
    });
});

// Add download button
const downloadButton = document.createElement('button');
downloadButton.textContent = 'Download as JPG';
Object.assign(downloadButton.style, {
    ...buttonStyle,
    left: `${VIEWPORT_PADDING}px`,
    top: `${VIEWPORT_PADDING + 230}px`  // Position below randomize all button
});

// Function to handle download
function downloadCanvasAsJPG() {
    // Temporarily hide UI elements
    const uiElements = [title, shapeButton, penStyleButton, randomizeAllButton, downloadButton, copyright];
    uiElements.forEach(el => el.style.display = 'none');
    
    // Create a temporary canvas with the same dimensions
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Copy the main canvas content
    tempCtx.drawImage(canvas, 0, 0);
    
    // Create download link
    const link = document.createElement('a');
    link.download = `drawer-${Date.now()}.jpg`;
    link.href = tempCanvas.toDataURL('image/jpeg', 0.9);
    link.click();
    
    // Show UI elements again
    uiElements.forEach(el => el.style.display = 'block');
}

// Add click handler for download button
downloadButton.addEventListener('click', downloadCanvasAsJPG);

// Add hover effects to download button
downloadButton.addEventListener('mouseover', () => {
    Object.assign(downloadButton.style, {
        background: 'white',
        color: 'black'
    });
});

downloadButton.addEventListener('mouseout', () => {
    Object.assign(downloadButton.style, {
        background: 'black',
        color: 'white'
    });
});

// Append download button to document
document.body.appendChild(downloadButton);

// Update hover effects array to include download button
[shapeButton, penStyleButton, randomizeAllButton, downloadButton].forEach(button => {
    button.addEventListener('mouseover', () => {
        Object.assign(button.style, {
            background: 'white',
            color: 'black'
        });
    });
    
    button.addEventListener('mouseout', () => {
        Object.assign(button.style, {
            background: 'black',
            color: 'white'
        });
    });
});

// Update resize event listener to include download button
window.addEventListener('resize', () => {
    VIEWPORT_PADDING = window.innerWidth < 480 ? 15 : 
                      window.innerWidth < 768 ? 20 : 30;
    
    title.style.left = `${VIEWPORT_PADDING}px`;
    title.style.top = `${VIEWPORT_PADDING}px`;
    shapeButton.style.left = `${VIEWPORT_PADDING}px`;
    shapeButton.style.top = `${VIEWPORT_PADDING + 50}px`;
    penStyleButton.style.left = `${VIEWPORT_PADDING}px`;
    penStyleButton.style.top = `${VIEWPORT_PADDING + 110}px`;
    randomizeAllButton.style.left = `${VIEWPORT_PADDING}px`;
    randomizeAllButton.style.top = `${VIEWPORT_PADDING + 170}px`;
    downloadButton.style.left = `${VIEWPORT_PADDING}px`;
    downloadButton.style.top = `${VIEWPORT_PADDING + 230}px`;

    if (window.innerWidth < 768) {  // Mobile breakpoint
        copyright.style.right = 'auto';
        copyright.style.left = `${VIEWPORT_PADDING}px`;
    } else {
        copyright.style.right = `${VIEWPORT_PADDING}px`;
        copyright.style.left = 'auto';
    }
});

// Add copyright with responsive positioning
const copyright = document.createElement('div');
Object.assign(copyright.style, {
    position: 'fixed',
    right: `${VIEWPORT_PADDING}px`,  // Default to right side for desktop
    bottom: '30px',
    color: 'white',
    fontFamily: 'monospace',
    fontSize: '12px',
    zIndex: '1000'
});
copyright.innerHTML = '2025 Red Elephant - <a href="https://www.red-elephant.se/" target="_blank" style="color: white; text-decoration: none;">red-elephant.se</a>';
document.body.appendChild(copyright);

// Animation loop
function animate() {
    dots.forEach(dot => dot.update());
    requestAnimationFrame(animate);
}

// Start the animation
animate();