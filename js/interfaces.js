/**
 * Gemma 4 Particle Edu — Interface Contracts
 * All modules MUST implement these signatures exactly.
 */

// ============================================================
// Data Types
// ============================================================

/**
 * @typedef {Object} Particle
 * @property {number} id
 * @property {number} x - position x (m)
 * @property {number} y - position y (m)
 * @property {number} z - position z (m)
 * @property {number} prevX - previous position x (m)
 * @property {number} prevY - previous position y (m)
 * @property {number} prevZ - previous position z (m)
 * @property {number} ax - acceleration x (m/s²)
 * @property {number} ay - acceleration y (m/s²)
 * @property {number} az - acceleration z (m/s²)
 * @property {number} mass - mass (kg)
 * @property {number} radius - radius (m)
 * @property {boolean} fixed - is pinned in place
 * @property {string} material - material name
 * @property {number} stress - current stress (Pa)
 */

/**
 * @typedef {Object} Spring
 * @property {number} idA - particle A id
 * @property {number} idB - particle B id
 * @property {number} restLength - rest length (m)
 * @property {number} stiffness - spring stiffness (N/m)
 * @property {number} damping - damping coefficient
 */

/**
 * @typedef {Object} Material
 * @property {string} name
 * @property {number} density - kg/m³
 * @property {number} yieldStrength - Pa
 * @property {number} elasticModulus - Pa
 * @property {number} thermalExpansion - 1/K
 * @property {string} color - hex color
 * @property {string} category - 'metal' | 'ceramic' | 'polymer' | 'composite'
 */

/**
 * @typedef {Object} Structure
 * @property {Particle[]} particles
 * @property {Spring[]} springs
 * @property {string} type
 */

/**
 * @typedef {Object} SimConfig
 * @property {string} prompt - structure type
 * @property {Object} physics
 * @property {number} physics.gravity - m/s²
 * @property {number} physics.damping - 0-1
 * @property {number} physics.springStiffness - N/m scale
 * @property {number} physics.density - x1000 kg/m³
 * @property {number} physics.yieldStrength - x1e6 Pa
 * @property {number} physics.temperature - K
 * @property {number} physics.seismic - m/s²
 * @property {number} physics.seismicFreq - Hz
 * @property {number} physics.foundation - m
 * @property {number} physics.windX - m/s²
 * @property {number} physics.windY - m/s²
 * @property {number} physics.windZ - m/s²
 * @property {number} physics.friction - 0-1
 * @property {number} physics.bounciness - 0-1
 */

/**
 * @typedef {Object} Message
 * @property {'system'|'user'|'assistant'} role
 * @property {string} content
 */

// ============================================================
// PhysicsEngine
// ============================================================

/**
 * @class PhysicsEngine
 * Verlet integration physics engine with springs, collisions, external forces.
 *
 * @param {Object} config
 * @param {number} config.gravity - default -9.81 m/s²
 * @param {number} config.damping - default 0.97
 * @param {number} config.dt - default 1/60 s
 *
 * @method addParticle(particle: Partial<Particle>) → number (id)
 * @method removeParticle(id: number) → void
 * @method getParticles() → Particle[]
 * @method addSpring(spring: Spring) → void
 * @method removeSpring(idA: number, idB: number) → void
 * @method getSprings() → Spring[]
 * @method setGravity(value: number) → void
 * @method setDamping(value: number) → void
 * @method setWind(x: number, y: number, z: number) → void
 * @method setSeismic(amplitude: number, frequency: number) → void
 * @method setTemperature(kelvin: number) → void
 * @method integrate(dt: number) → void
 * @method reset() → void
 */

// ============================================================
// Materials
// ============================================================

/**
 * @class Materials
 * Static material database with SI unit properties.
 *
 * @static getMaterial(name: string) → Material
 * @static getAllMaterials() → Map<string, Material>
 * @static getCategories() → string[]
 * @static adjustForTemperature(material: Material, kelvin: number) → Material
 */

// ============================================================
// ParticleSystem
// ============================================================

/**
 * @class ParticleSystem
 * High-level particle lifecycle manager.
 *
 * @param {PhysicsEngine} physicsEngine
 *
 * @method spawn(config: { count, material, position, velocity, fixed? }) → Particle[]
 * @method update(dt: number) → void
 * @method reset() → void
 * @method getStats() → { count, avgVelocity, maxStress }
 * @method on(event: 'collision'|'yield'|'break', callback: Function) → void
 * @method off(event: string, callback: Function) → void
 */

// ============================================================
// NeonRenderer
// ============================================================

/**
 * @class NeonRenderer
 * Three.js WebGL renderer with bloom post-processing.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 * @param {number} options.bloomStrength - default 1.5
 * @param {boolean} options.antialias - default true
 *
 * @method init() → Promise<void>
 * @method render(particles: Particle[], springs: Spring[]) → void
 * @method resize(width: number, height: number) → void
 * @method setBloom(intensity: number) → void
 * @method setCamera(position: {x,y,z}, target: {x,y,z}) → void
 * @method getCamera() → { position, target }
 * @method getRenderer() → THREE.WebGLRenderer
 * @method dispose() → void
 */

// ============================================================
// ArchitectureGenerator
// ============================================================

/**
 * @class ArchitectureGenerator
 * Procedural structure generator using particle-spring systems.
 *
 * @param {ParticleSystem} particleSystem
 *
 * @method generate(type: string, params: Object) → Structure
 * @method getTypes() → string[]
 * @static getDefaultParams(type: string) → Object
 */

// ============================================================
// SimulationManager
// ============================================================

/**
 * @class SimulationManager
 * Orchestrates physics, particles, rendering, and presets.
 *
 * @param {Object} deps
 * @param {PhysicsEngine} deps.physicsEngine
 * @param {ParticleSystem} deps.particleSystem
 * @param {ArchitectureGenerator} deps.archGenerator
 * @param {NeonRenderer} deps.renderer
 *
 * @method loadPreset(name: string) → SimConfig
 * @method applyParams(json: Object) → void
 * @method start() → void
 * @method stop() → void
 * @method reset() → void
 * @method isRunning() → boolean
 * @method getState() → { time, particleCount, fps }
 * @method on(event: 'start'|'stop'|'reset'|'frame', callback: Function) → void
 */

// ============================================================
// GemmaChat
// ============================================================

/**
 * @class GemmaChat
 * Ollama streaming chat client with simulation param extraction.
 *
 * @param {string} apiEndpoint - default '/api/chat'
 *
 * @method send(message: string) → ReadableStream
 * @method parseSimulationParams(fullResponse: string) → SimConfig|null
 * @method getHistory() → Message[]
 * @method clearHistory() → void
 * @method checkConnection() → Promise<boolean>
 * @method on(event: 'stream'|'params'|'error'|'complete', callback: Function) → void
 * @method off(event: string, callback: Function) → void
 */

// ============================================================
// XRController
// ============================================================

/**
 * @class XRController
 * WebXR VR session manager.
 *
 * @param {NeonRenderer} renderer
 *
 * @method isSupported() → boolean
 * @method enterVR() → Promise<void>
 * @method exitVR() → void
 * @method on(event: 'select'|'squeeze'|'enter'|'exit', callback: Function) → void
 * @method off(event: string, callback: Function) → void
 */

// ============================================================
// I18n
// ============================================================

/**
 * @class I18n
 * Lightweight i18n with interpolation and locale switching.
 *
 * @param {string} defaultLocale - 'ko' or 'en'
 *
 * @method t(key: string, params?: Object) → string
 * @method setLocale(locale: string) → void
 * @method getLocale() → string
 * @method getAvailableLocales() → string[]
 * @method on(event: 'localeChange', callback: Function) → void
 */

export {
  // This file is documentation-only.
  // Each module implements its own class in its own file.
};
