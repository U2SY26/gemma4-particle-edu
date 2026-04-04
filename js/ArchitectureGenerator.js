/**
 * ArchitectureGenerator
 * Converts text prompts into particle target positions forming architectural structures.
 * Uses procedural template-based generation with parameterization.
 */

export class ArchitectureGenerator {
    constructor() {
        this.spacing = 0.10; // particle spacing in meters
    }

    /**
     * Main entry: parse prompt and generate structure
     * Returns { targets, assignments, connections, loads, roles, metadata }
     */
    _generateTemplate(params) {
        switch (params.type) {
            case 'house': return this._templateHouse(params);
            case 'tower': return this._templateTower(params);
            case 'bridge': return this._templateBridge(params);
            case 'cathedral': return this._templateCathedral(params);
            case 'pyramid': return this._templatePyramid(params);
            case 'skyscraper': return this._templateSkyscraper(params);
            case 'dome': return this._templateDome(params);
            case 'arch': return this._templateArch(params);
            case 'temple': return this._templateTemple(params);
            case 'castle': return this._templateCastle(params);
            case 'wall': return this._templateWall(params);
            case 'stadium': return this._templateStadium(params);
            case 'cube': return this._templateCube(params);
            case 'sphere': return this._templateSphere(params);
            // Molecule domain
            case 'molecule': return this._templateMolecule(params);
            case 'dna': return this._templateDNA(params);
            case 'protein': return this._templateProtein(params);
            // Orbit domain
            case 'solar_system': return this._templateSolarSystem(params);
            case 'galaxy': return this._templateGalaxy(params);
            case 'asteroid_field': return this._templateAsteroidField(params);
            // Weather domain
            case 'cloud': return this._templateCloud(params);
            case 'tornado': return this._templateTornado(params);
            case 'rain': return this._templateRain(params);
            // Fluid domain
            case 'water_drop': return this._templateWaterDrop(params);
            case 'river': return this._templateRiver(params);
            case 'ocean_wave': return this._templateOceanWave(params);
            // Electromagnetic domain
            case 'magnet': return this._templateMagnet(params);
            case 'electron_cloud': return this._templateElectronCloud(params);
            default: return this._templateHouse(params);
        }
    }

    generate(promptText, totalParticles) {
        const prompt = promptText.toLowerCase().trim();
        const params = this._parsePrompt(prompt);
        const baseSpacing = 0.10;

        // Auto-fit: iteratively scale up + reduce spacing until all particles are used.
        // Prefers bigger structures over denser packing for visual clarity.
        const minSpacing = 0.04;

        this.spacing = baseSpacing;
        let count = this._generateTemplate(params).positions.length / 3;

        // Iterate: scale up, then binary-search spacing
        for (let round = 0; round < 4 && count < totalParticles * 0.95; round++) {
            const deficit = totalParticles / Math.max(count, 1);
            params.scale *= Math.pow(deficit, 0.4); // grow structure

            // Binary-search spacing within this scale
            let lo = minSpacing, hi = Math.max(this.spacing, baseSpacing);
            for (let iter = 0; iter < 8; iter++) {
                const mid = (lo + hi) / 2;
                this.spacing = mid;
                const c = this._generateTemplate(params).positions.length / 3;
                if (c < totalParticles) {
                    hi = mid;
                } else {
                    lo = mid;
                }
            }
            this.spacing = (lo + hi) / 2;
            count = this._generateTemplate(params).positions.length / 3;
        }

        let structure = this._generateTemplate(params);
        let structCount = structure.positions.length / 3;

        // Trim if overshot
        if (structCount > totalParticles) {
            structure.positions = new Float32Array(structure.positions.buffer, 0, totalParticles * 3);
            structure.roles = new Uint8Array(structure.roles.buffer, 0, totalParticles);
            structure.loads = new Float32Array(structure.loads.buffer, 0, totalParticles);
            structure.connections = structure.connections.filter(c => c.i < totalParticles && c.j < totalParticles);
            structCount = totalParticles;
        }

        const assignments = new Uint32Array(structCount);
        for (let i = 0; i < structCount; i++) {
            assignments[i] = i;
        }

        const allRoles = new Uint8Array(totalParticles);
        const allLoads = new Float32Array(totalParticles);
        allRoles.set(structure.roles.subarray(0, Math.min(structCount, totalParticles)));
        allLoads.set(structure.loads.subarray(0, Math.min(structCount, totalParticles)));

        this._calculateLoads(allLoads, structure.connections, allRoles, structCount);

        // Reset for next call
        this.spacing = baseSpacing;

        return {
            targets: structure.positions,
            assignments,
            connections: structure.connections,
            loads: allLoads,
            roles: allRoles,
            metadata: {
                type: params.type,
                particleCount: totalParticles,
                structuralParticles: structCount,
                ambientParticles: totalParticles - structCount,
                description: params.description,
            }
        };
    }

    _parsePrompt(prompt) {
        const params = {
            type: 'house',
            scale: 1.0,
            heightMul: 1.0,
            widthMul: 1.0,
            style: 'modern',
            floors: 5,
            count: 1,
            description: prompt,
        };

        // Structure type keywords
        const types = {
            'house': 'house', 'home': 'house', 'cabin': 'house', '집': 'house', '주택': 'house',
            'tower': 'tower', 'turret': 'tower', '탑': 'tower', '타워': 'tower',
            'bridge': 'bridge', '다리': 'bridge', '교량': 'bridge',
            'cathedral': 'cathedral', 'church': 'cathedral', '성당': 'cathedral', '교회': 'cathedral',
            'pyramid': 'pyramid', '피라미드': 'pyramid',
            'skyscraper': 'skyscraper', 'highrise': 'skyscraper', '빌딩': 'skyscraper', '고층': 'skyscraper', '마천루': 'skyscraper',
            'dome': 'dome', '돔': 'dome',
            'arch': 'arch', '아치': 'arch',
            'temple': 'temple', '신전': 'temple', '사원': 'temple',
            'castle': 'castle', 'fortress': 'castle', '성': 'castle', '성곽': 'castle',
            'wall': 'wall', '벽': 'wall',
            'stadium': 'stadium', '경기장': 'stadium', '스타디움': 'stadium',
            'cube': 'cube', '큐브': 'cube', '정육면체': 'cube',
            'sphere': 'sphere', '구': 'sphere', '구체': 'sphere',
            'building': 'skyscraper', '건물': 'skyscraper',
            // Molecule domain
            'molecule': 'molecule', '분자': 'molecule',
            'dna': 'dna', 'DNA': 'dna',
            'protein': 'protein', '단백질': 'protein',
            // Orbit domain
            'solar': 'solar_system', 'solar_system': 'solar_system', '태양계': 'solar_system', '태양': 'solar_system',
            'galaxy': 'galaxy', '은하': 'galaxy',
            'asteroid': 'asteroid_field', 'asteroid_field': 'asteroid_field', '소행성': 'asteroid_field',
            // Weather domain
            'cloud': 'cloud', '구름': 'cloud',
            'tornado': 'tornado', '토네이도': 'tornado', '회오리': 'tornado',
            'rain': 'rain', '비': 'rain',
            // Fluid domain
            'drop': 'water_drop', 'water_drop': 'water_drop', '물방울': 'water_drop',
            'river': 'river', '강': 'river',
            'wave': 'ocean_wave', 'ocean_wave': 'ocean_wave', '파도': 'ocean_wave', '해일': 'ocean_wave',
            // Electromagnetic domain
            'magnet': 'magnet', '자석': 'magnet', '자기장': 'magnet',
            'electron': 'electron_cloud', 'electron_cloud': 'electron_cloud', '전자': 'electron_cloud',
        };

        // Size modifiers
        const sizeModifiers = {
            'small': 0.5, 'tiny': 0.4, 'little': 0.5,
            'large': 2.0, 'big': 2.0, 'huge': 3.0, 'giant': 3.0, 'massive': 3.5,
            '작은': 0.5, '큰': 2.0, '거대한': 3.0,
        };

        // Style modifiers
        const styleModifiers = {
            'gothic': 'gothic', '고딕': 'gothic',
            'modern': 'modern', '모던': 'modern', '현대': 'modern',
            'classical': 'classical', '고전': 'classical',
        };

        // Height/width modifiers
        const heightMods = { 'tall': 2.0, 'short': 0.5, '높은': 2.0, '낮은': 0.5 };
        const widthMods = { 'wide': 2.0, 'narrow': 0.5, '넓은': 2.0, '좁은': 0.5 };

        // Parse
        const words = prompt.split(/\s+/);
        for (const word of words) {
            if (types[word]) params.type = types[word];
            if (sizeModifiers[word]) params.scale = sizeModifiers[word];
            if (styleModifiers[word]) params.style = styleModifiers[word];
            if (heightMods[word]) params.heightMul = heightMods[word];
            if (widthMods[word]) params.widthMul = widthMods[word];
        }

        // Extract floor count
        const floorMatch = prompt.match(/(\d+)\s*(층|floor|story|stories)/);
        if (floorMatch) params.floors = parseInt(floorMatch[1]);

        // Extract numeric count
        const countMatch = prompt.match(/(\d+)\s*(tower|arch|column|span|개|탑)/);
        if (countMatch) params.count = parseInt(countMatch[1]);

        return params;
    }

    // ==================== PRIMITIVE GENERATORS ====================

    _addParticlesAlongLine(arr, roles, roleType, x1, y1, z1, x2, y2, z2, spacing) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const count = Math.max(2, Math.floor(length / spacing));
        const startIdx = arr.length / 3;

        for (let i = 0; i <= count; i++) {
            const t = i / count;
            arr.push(x1 + dx * t, y1 + dy * t, z1 + dz * t);
            roles.push(roleType);
        }

        // Create chain connections
        const connections = [];
        for (let i = 0; i < count; i++) {
            connections.push({
                i: startIdx + i,
                j: startIdx + i + 1,
                restLength: length / count,
                stiffness: roleType === 2 ? 80 : (roleType === 3 ? 50 : 30),
                damping: 5.0,
            });
        }

        return { startIdx, endIdx: startIdx + count, connections };
    }

    _addParticlesAlongArc(arr, roles, roleType, cx, cy, cz, rx, ry, startAngle, endAngle, axis, spacing) {
        const arcLength = Math.abs(endAngle - startAngle) * Math.max(rx, ry);
        const count = Math.max(4, Math.floor(arcLength / spacing));
        const startIdx = arr.length / 3;

        for (let i = 0; i <= count; i++) {
            const t = startAngle + (endAngle - startAngle) * (i / count);
            let x, y, z;

            if (axis === 'y') {
                x = cx + Math.cos(t) * rx;
                y = cy + Math.sin(t) * ry;
                z = cz;
            } else if (axis === 'x') {
                x = cx;
                y = cy + Math.sin(t) * ry;
                z = cz + Math.cos(t) * rx;
            } else {
                x = cx + Math.cos(t) * rx;
                y = cy;
                z = cz + Math.sin(t) * ry;
            }

            arr.push(x, y, z);
            roles.push(roleType);
        }

        const connections = [];
        for (let i = 0; i < count; i++) {
            const segLen = arcLength / count;
            connections.push({
                i: startIdx + i,
                j: startIdx + i + 1,
                restLength: segLen,
                stiffness: 40,
                damping: 5.0,
            });
        }

        return { startIdx, endIdx: startIdx + count, connections };
    }

    _connectPoints(connections, idx1, idx2, restLength) {
        connections.push({
            i: idx1,
            j: idx2,
            restLength: restLength || 0.15,
            stiffness: 40,
            damping: 5.0,
        });
    }

    // ==================== TEMPLATES ====================

    _templateHouse(params) {
        const s = params.scale;
        const w = 3 * s * params.widthMul;
        const h = 3 * s * params.heightMul;
        const d = 4 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // 4 corner columns
        const cols = [
            this._addParticlesAlongLine(positions, roles, 2, -w/2, 0, -d/2, -w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 2, w/2, 0, -d/2, w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 2, w/2, 0, d/2, w/2, h, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 2, -w/2, 0, d/2, -w/2, h, d/2, sp),
        ];
        cols.forEach(c => connections.push(...c.connections));

        // Top beams (connecting column tops)
        const topBeams = [
            this._addParticlesAlongLine(positions, roles, 3, -w/2, h, -d/2, w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 3, w/2, h, -d/2, w/2, h, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 3, w/2, h, d/2, -w/2, h, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 3, -w/2, h, d/2, -w/2, h, -d/2, sp),
        ];
        topBeams.forEach(b => connections.push(...b.connections));

        // Base beams (foundation)
        const baseBeams = [
            this._addParticlesAlongLine(positions, roles, 1, -w/2, 0, -d/2, w/2, 0, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 1, w/2, 0, -d/2, w/2, 0, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 1, w/2, 0, d/2, -w/2, 0, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 1, -w/2, 0, d/2, -w/2, 0, -d/2, sp),
        ];
        baseBeams.forEach(b => connections.push(...b.connections));

        // Roof ridge
        const ridgeH = h + 1.5 * s;
        const ridge = this._addParticlesAlongLine(positions, roles, 3, 0, ridgeH, -d/2, 0, ridgeH, d/2, sp);
        connections.push(...ridge.connections);

        // Roof rafters (4 lines from ridge ends to column tops)
        const rafters = [
            this._addParticlesAlongLine(positions, roles, 4, 0, ridgeH, -d/2, -w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, 0, ridgeH, -d/2, w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, 0, ridgeH, d/2, -w/2, h, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, 0, ridgeH, d/2, w/2, h, d/2, sp),
        ];
        rafters.forEach(r => connections.push(...r.connections));

        // Mid-height horizontal beams (stiffening)
        const midH = h * 0.5;
        const midBeams = [
            this._addParticlesAlongLine(positions, roles, 4, -w/2, midH, -d/2, w/2, midH, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, w/2, midH, -d/2, w/2, midH, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, w/2, midH, d/2, -w/2, midH, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, -w/2, midH, d/2, -w/2, midH, -d/2, sp),
        ];
        midBeams.forEach(b => connections.push(...b.connections));

        // Cross-bracing on front and back
        const braces = [
            this._addParticlesAlongLine(positions, roles, 4, -w/2, 0, -d/2, w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, w/2, 0, -d/2, -w/2, h, -d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, -w/2, 0, d/2, w/2, h, d/2, sp),
            this._addParticlesAlongLine(positions, roles, 4, w/2, 0, d/2, -w/2, h, d/2, sp),
        ];
        braces.forEach(b => connections.push(...b.connections));

        // Wall surface fill
        const wallSp = sp * 2.5;
        const wallFaces = [
            { x0: -w/2, z0: -d/2, x1: w/2, z1: -d/2 },
            { x0: w/2, z0: -d/2, x1: w/2, z1: d/2 },
            { x0: w/2, z0: d/2, x1: -w/2, z1: d/2 },
            { x0: -w/2, z0: d/2, x1: -w/2, z1: -d/2 },
        ];
        for (const face of wallFaces) {
            const fdx = face.x1 - face.x0;
            const fdz = face.z1 - face.z0;
            const wallLen = Math.sqrt(fdx * fdx + fdz * fdz);
            const uSteps = Math.max(1, Math.floor(wallLen / wallSp));
            const vSteps = Math.max(1, Math.floor(h / wallSp));
            for (let u = 1; u < uSteps; u++) {
                for (let v = 1; v < vSteps; v++) {
                    positions.push(
                        face.x0 + fdx * (u / uSteps),
                        h * (v / vSteps),
                        face.z0 + fdz * (u / uSteps)
                    );
                    roles.push(3);
                }
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateTower(params) {
        const s = params.scale;
        const floors = params.floors || 6;
        const baseW = 2 * s * params.widthMul;
        const floorH = 1.2 * s * params.heightMul;
        const taper = 0.92; // each floor slightly narrower
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        for (let f = 0; f < floors; f++) {
            const w = baseW * Math.pow(taper, f);
            const y0 = f * floorH;
            const y1 = (f + 1) * floorH;

            // 4 columns for this floor
            const corners = [
                [-w/2, -w/2], [w/2, -w/2], [w/2, w/2], [-w/2, w/2]
            ];

            const colSegments = [];
            for (const [cx, cz] of corners) {
                const col = this._addParticlesAlongLine(positions, roles, 2, cx, y0, cz, cx, y1, cz, sp);
                connections.push(...col.connections);
                colSegments.push(col);
            }

            // Horizontal beams at top of floor
            for (let i = 0; i < 4; i++) {
                const [x1, z1] = corners[i];
                const [x2, z2] = corners[(i + 1) % 4];
                const beam = this._addParticlesAlongLine(positions, roles, 3, x1, y1, z1, x2, y1, z2, sp);
                connections.push(...beam.connections);
            }

            // Cross-bracing on two faces
            if (f % 2 === 0) {
                const brace1 = this._addParticlesAlongLine(positions, roles, 4,
                    corners[0][0], y0, corners[0][1], corners[2][0], y1, corners[2][1], sp);
                connections.push(...brace1.connections);
            } else {
                const brace1 = this._addParticlesAlongLine(positions, roles, 4,
                    corners[1][0], y0, corners[1][1], corners[3][0], y1, corners[3][1], sp);
                connections.push(...brace1.connections);
            }
        }

        // Spire
        const topY = floors * floorH;
        const spireH = 2 * s;
        const spire = this._addParticlesAlongLine(positions, roles, 2, 0, topY, 0, 0, topY + spireH, 0, sp);
        connections.push(...spire.connections);

        // Spire supports
        const topW = baseW * Math.pow(taper, floors - 1);
        const spireCorners = [
            [-topW/2, -topW/2], [topW/2, -topW/2], [topW/2, topW/2], [-topW/2, topW/2]
        ];
        for (const [cx, cz] of spireCorners) {
            const support = this._addParticlesAlongLine(positions, roles, 4, cx, topY, cz, 0, topY + spireH, 0, sp);
            connections.push(...support.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateBridge(params) {
        const s = params.scale;
        const span = 12 * s * params.widthMul;
        const h = 4 * s * params.heightMul;
        const deckW = 2 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Deck beams (two parallel)
        const deck1 = this._addParticlesAlongLine(positions, roles, 3, -span/2, h*0.3, -deckW/2, span/2, h*0.3, -deckW/2, sp);
        const deck2 = this._addParticlesAlongLine(positions, roles, 3, -span/2, h*0.3, deckW/2, span/2, h*0.3, deckW/2, sp);
        connections.push(...deck1.connections, ...deck2.connections);

        // Cross beams on deck
        const deckLen = span;
        const crossCount = Math.floor(deckLen / (sp * 8));
        for (let i = 0; i <= crossCount; i++) {
            const x = -span/2 + (span * i / crossCount);
            const cross = this._addParticlesAlongLine(positions, roles, 3, x, h*0.3, -deckW/2, x, h*0.3, deckW/2, sp);
            connections.push(...cross.connections);
        }

        // Warren truss on each side
        const trussCount = 12;
        for (const zSide of [-deckW/2, deckW/2]) {
            for (let i = 0; i < trussCount; i++) {
                const x0 = -span/2 + (span * i / trussCount);
                const x1 = -span/2 + (span * (i + 1) / trussCount);
                const xMid = (x0 + x1) / 2;

                // Vertical
                const vert = this._addParticlesAlongLine(positions, roles, 2, x0, h*0.3, zSide, x0, h*0.3 + h*0.5, zSide, sp);
                connections.push(...vert.connections);

                // Diagonal up
                const diagUp = this._addParticlesAlongLine(positions, roles, 4, x0, h*0.3, zSide, xMid, h*0.3 + h*0.5, zSide, sp);
                connections.push(...diagUp.connections);

                // Diagonal down
                const diagDown = this._addParticlesAlongLine(positions, roles, 4, xMid, h*0.3 + h*0.5, zSide, x1, h*0.3, zSide, sp);
                connections.push(...diagDown.connections);
            }

            // Top chord
            const topChord = this._addParticlesAlongLine(positions, roles, 3, -span/2, h*0.3 + h*0.5, zSide, span/2, h*0.3 + h*0.5, zSide, sp);
            connections.push(...topChord.connections);
        }

        // Support columns at ends
        for (const xEnd of [-span/2, span/2]) {
            for (const zSide of [-deckW/2, deckW/2]) {
                const col = this._addParticlesAlongLine(positions, roles, 1, xEnd, 0, zSide, xEnd, h*0.3, zSide, sp);
                connections.push(...col.connections);
            }
        }

        // Middle support
        for (const zSide of [-deckW/2, deckW/2]) {
            const col = this._addParticlesAlongLine(positions, roles, 1, 0, 0, zSide, 0, h*0.3, zSide, sp);
            connections.push(...col.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateCathedral(params) {
        const s = params.scale;
        const naveL = 10 * s;
        const naveW = 4 * s * params.widthMul;
        const naveH = 6 * s * params.heightMul;
        const aisleW = 2 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];
        const isGothic = params.style === 'gothic';
        const columnCount = 8;

        // Nave columns (two rows)
        for (let i = 0; i < columnCount; i++) {
            const z = -naveL/2 + (naveL * i / (columnCount - 1));

            // Left column
            const leftCol = this._addParticlesAlongLine(positions, roles, 2, -naveW/2, 0, z, -naveW/2, naveH, z, sp);
            connections.push(...leftCol.connections);

            // Right column
            const rightCol = this._addParticlesAlongLine(positions, roles, 2, naveW/2, 0, z, naveW/2, naveH, z, sp);
            connections.push(...rightCol.connections);

            // Pointed arch between columns (gothic) or round arch
            if (isGothic) {
                // Pointed arch: two arcs meeting at a point
                const peakH = naveH + 1.5 * s;
                const archL = this._addParticlesAlongLine(positions, roles, 5, -naveW/2, naveH, z, 0, peakH, z, sp);
                const archR = this._addParticlesAlongLine(positions, roles, 5, naveW/2, naveH, z, 0, peakH, z, sp);
                connections.push(...archL.connections, ...archR.connections);
            } else {
                // Round arch
                const arch = this._addParticlesAlongArc(positions, roles, 5,
                    0, naveH, z, naveW/2, 1.5 * s, Math.PI, 0, 'y', sp);
                connections.push(...arch.connections);
            }

            // Outer aisle columns
            const leftOuter = this._addParticlesAlongLine(positions, roles, 2,
                -naveW/2 - aisleW, 0, z, -naveW/2 - aisleW, naveH * 0.6, z, sp);
            const rightOuter = this._addParticlesAlongLine(positions, roles, 2,
                naveW/2 + aisleW, 0, z, naveW/2 + aisleW, naveH * 0.6, z, sp);
            connections.push(...leftOuter.connections, ...rightOuter.connections);

            // Flying buttresses
            const flyL = this._addParticlesAlongLine(positions, roles, 4,
                -naveW/2 - aisleW, naveH * 0.55, z, -naveW/2, naveH * 0.8, z, sp);
            const flyR = this._addParticlesAlongLine(positions, roles, 4,
                naveW/2 + aisleW, naveH * 0.55, z, naveW/2, naveH * 0.8, z, sp);
            connections.push(...flyL.connections, ...flyR.connections);
        }

        // Ridge beam
        const ridgeH = isGothic ? naveH + 1.5 * s : naveH + 1.5 * s;
        const ridge = this._addParticlesAlongLine(positions, roles, 3,
            0, ridgeH, -naveL/2, 0, ridgeH, naveL/2, sp);
        connections.push(...ridge.connections);

        // Apse (semicircle at one end)
        const apseR = naveW / 2;
        const apseCols = 6;
        for (let i = 0; i <= apseCols; i++) {
            const angle = -Math.PI/2 + Math.PI * (i / apseCols);
            const ax = Math.cos(angle) * apseR;
            const az = naveL/2 + Math.sin(angle) * apseR;
            const apseCol = this._addParticlesAlongLine(positions, roles, 2, ax, 0, az, ax, naveH * 0.8, az, sp);
            connections.push(...apseCol.connections);
        }

        // Front facade - rose window (circle of particles)
        const roseR = 1.2 * s;
        const roseCY = naveH * 0.6;
        const roseCZ = -naveL/2;
        const rosePoints = 24;
        const roseStartIdx = positions.length / 3;
        for (let i = 0; i < rosePoints; i++) {
            const angle = (2 * Math.PI * i) / rosePoints;
            positions.push(Math.cos(angle) * roseR, roseCY + Math.sin(angle) * roseR, roseCZ);
            roles.push(5);
        }
        // Connect rose window ring
        for (let i = 0; i < rosePoints; i++) {
            connections.push({
                i: roseStartIdx + i,
                j: roseStartIdx + ((i + 1) % rosePoints),
                restLength: 2 * Math.PI * roseR / rosePoints,
                stiffness: 30,
                damping: 5,
            });
        }

        // Spire
        const spire = this._addParticlesAlongLine(positions, roles, 2, 0, ridgeH, -naveL/2, 0, ridgeH + 4*s, -naveL/2, sp);
        connections.push(...spire.connections);

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templatePyramid(params) {
        const s = params.scale;
        const base = 6 * s * params.widthMul;
        const h = 5 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // 4 edge lines from base corners to apex
        const corners = [
            [-base/2, 0, -base/2],
            [base/2, 0, -base/2],
            [base/2, 0, base/2],
            [-base/2, 0, base/2],
        ];

        for (const [cx, cy, cz] of corners) {
            const edge = this._addParticlesAlongLine(positions, roles, 2, cx, cy, cz, 0, h, 0, sp);
            connections.push(...edge.connections);
        }

        // Base edges
        for (let i = 0; i < 4; i++) {
            const [x1, y1, z1] = corners[i];
            const [x2, y2, z2] = corners[(i + 1) % 4];
            const baseEdge = this._addParticlesAlongLine(positions, roles, 1, x1, y1, z1, x2, y2, z2, sp);
            connections.push(...baseEdge.connections);
        }

        // Horizontal rings at regular heights
        const ringCount = 6;
        for (let r = 1; r < ringCount; r++) {
            const t = r / ringCount;
            const ringH = h * t;
            const ringW = base * (1 - t);

            const ringCorners = [
                [-ringW/2, ringH, -ringW/2],
                [ringW/2, ringH, -ringW/2],
                [ringW/2, ringH, ringW/2],
                [-ringW/2, ringH, ringW/2],
            ];

            for (let i = 0; i < 4; i++) {
                const [x1, y1, z1] = ringCorners[i];
                const [x2, y2, z2] = ringCorners[(i + 1) % 4];
                const ring = this._addParticlesAlongLine(positions, roles, 3, x1, y1, z1, x2, y2, z2, sp);
                connections.push(...ring.connections);
            }
        }

        // Cross-bracing on each face
        for (let i = 0; i < 4; i++) {
            const [x1, , z1] = corners[i];
            const [x2, , z2] = corners[(i + 1) % 4];
            const midX = (x1 + x2) / 2;
            const midZ = (z1 + z2) / 2;
            const brace = this._addParticlesAlongLine(positions, roles, 4, midX, 0, midZ, 0, h, 0, sp);
            connections.push(...brace.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateSkyscraper(params) {
        const s = params.scale;
        const floors = params.floors || 10;
        const baseW = 3 * s * params.widthMul;
        const baseD = 3 * s;
        const floorH = 1.0 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Core columns (4 inner)
        const coreW = baseW * 0.3;
        const coreCorners = [
            [-coreW/2, -coreW/2], [coreW/2, -coreW/2],
            [coreW/2, coreW/2], [-coreW/2, coreW/2]
        ];

        for (const [cx, cz] of coreCorners) {
            const col = this._addParticlesAlongLine(positions, roles, 2, cx, 0, cz, cx, floors * floorH, cz, sp);
            connections.push(...col.connections);
        }

        // Perimeter columns
        const periCount = 4; // columns per side
        for (let side = 0; side < 4; side++) {
            for (let p = 0; p < periCount; p++) {
                let x, z;
                const t = (p + 0.5) / periCount;

                switch (side) {
                    case 0: x = -baseW/2 + baseW * t; z = -baseD/2; break;
                    case 1: x = baseW/2; z = -baseD/2 + baseD * t; break;
                    case 2: x = baseW/2 - baseW * t; z = baseD/2; break;
                    case 3: x = -baseW/2; z = baseD/2 - baseD * t; break;
                }

                const col = this._addParticlesAlongLine(positions, roles, 2, x, 0, z, x, floors * floorH, z, sp);
                connections.push(...col.connections);
            }
        }

        // Floor beams and bracing every 2 floors
        for (let f = 0; f <= floors; f++) {
            const y = f * floorH;

            // Perimeter beams
            const fCorners = [
                [-baseW/2, -baseD/2], [baseW/2, -baseD/2],
                [baseW/2, baseD/2], [-baseW/2, baseD/2]
            ];

            for (let i = 0; i < 4; i++) {
                const [x1, z1] = fCorners[i];
                const [x2, z2] = fCorners[(i + 1) % 4];
                const beam = this._addParticlesAlongLine(positions, roles, 3, x1, y, z1, x2, y, z2, sp);
                connections.push(...beam.connections);
            }

            // Core to perimeter beams (every other floor)
            if (f % 2 === 0 && f > 0) {
                for (const [cx, cz] of coreCorners) {
                    // Connect to nearest perimeter corner
                    const px = cx > 0 ? baseW/2 : -baseW/2;
                    const pz = cz > 0 ? baseD/2 : -baseD/2;
                    const beam = this._addParticlesAlongLine(positions, roles, 3, cx, y, cz, px, y, pz, sp);
                    connections.push(...beam.connections);
                }
            }

            // Cross-bracing (every 3rd floor)
            if (f > 0 && f % 3 === 0) {
                const prevY = (f - 3) * floorH;
                const brace = this._addParticlesAlongLine(positions, roles, 4,
                    -baseW/2, prevY, -baseD/2, baseW/2, y, -baseD/2, sp);
                connections.push(...brace.connections);
                const brace2 = this._addParticlesAlongLine(positions, roles, 4,
                    baseW/2, prevY, -baseD/2, -baseW/2, y, -baseD/2, sp);
                connections.push(...brace2.connections);
            }
        }

        // Wall surface fill - add particles on each wall face per floor
        const wallSp = sp * 2.5; // coarser grid for wall fill
        for (let f = 0; f < floors; f++) {
            const y0 = f * floorH;
            const y1 = (f + 1) * floorH;

            // 4 wall faces
            const wallFaces = [
                { x0: -baseW/2, z0: -baseD/2, x1: baseW/2, z1: -baseD/2 }, // front
                { x0: baseW/2, z0: -baseD/2, x1: baseW/2, z1: baseD/2 },   // right
                { x0: baseW/2, z0: baseD/2, x1: -baseW/2, z1: baseD/2 },   // back
                { x0: -baseW/2, z0: baseD/2, x1: -baseW/2, z1: -baseD/2 }, // left
            ];

            for (const face of wallFaces) {
                const dx = face.x1 - face.x0;
                const dz = face.z1 - face.z0;
                const wallLen = Math.sqrt(dx * dx + dz * dz);
                const uSteps = Math.max(1, Math.floor(wallLen / wallSp));
                const vSteps = Math.max(1, Math.floor(floorH / wallSp));

                for (let u = 1; u < uSteps; u++) {
                    for (let v = 1; v < vSteps; v++) {
                        const t = u / uSteps;
                        const s2 = v / vSteps;
                        positions.push(
                            face.x0 + dx * t,
                            y0 + floorH * s2,
                            face.z0 + dz * t
                        );
                        roles.push(3); // beam role for wall particles
                    }
                }
            }
        }

        // Top deck beams
        const topY = floors * floorH;
        const deckCorners = [
            [-baseW/2, -baseD/2], [baseW/2, -baseD/2],
            [baseW/2, baseD/2], [-baseW/2, baseD/2]
        ];
        for (let i = 0; i < 4; i++) {
            const [x1, z1] = deckCorners[i];
            const [x2, z2] = deckCorners[(i + 1) % 4];
            const beam = this._addParticlesAlongLine(positions, roles, 3, x1, topY, z1, x2, topY, z2, sp);
            connections.push(...beam.connections);
        }

        // Spire only for tall buildings (6+ floors)
        if (floors >= 6) {
            const spire = this._addParticlesAlongLine(positions, roles, 2, 0, topY, 0, 0, topY + 3*s, 0, sp);
            connections.push(...spire.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateDome(params) {
        const s = params.scale;
        const r = 4 * s * params.widthMul;
        const h = 4 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Dynamic counts based on spacing — denser spacing = more elements
        const basePoints = Math.max(12, Math.round(2 * Math.PI * r / sp));
        const ribCount = Math.max(4, Math.round(Math.PI * r / (sp * 3)));
        const ringCount = Math.max(3, Math.round(Math.PI * r / (sp * 4)));

        // Base ring
        const baseStartIdx = positions.length / 3;
        for (let i = 0; i < basePoints; i++) {
            const angle = (2 * Math.PI * i) / basePoints;
            positions.push(Math.cos(angle) * r, 0, Math.sin(angle) * r);
            roles.push(1);
        }
        for (let i = 0; i < basePoints; i++) {
            connections.push({
                i: baseStartIdx + i,
                j: baseStartIdx + ((i + 1) % basePoints),
                restLength: 2 * Math.PI * r / basePoints,
                stiffness: 60,
                damping: 5,
            });
        }

        // Meridian ribs
        for (let i = 0; i < ribCount; i++) {
            const angle = (2 * Math.PI * i) / ribCount;
            const segCount = Math.max(8, Math.round(Math.PI * r / (2 * sp)));
            const startIdx = positions.length / 3;

            for (let j = 0; j <= segCount; j++) {
                const t = j / segCount;
                const phi = t * Math.PI / 2;
                const radius = r * Math.cos(phi);
                const y = h * Math.sin(phi);
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                positions.push(x, y, z);
                roles.push(5);
            }

            for (let j = 0; j < segCount; j++) {
                connections.push({
                    i: startIdx + j,
                    j: startIdx + j + 1,
                    restLength: Math.PI * r / (2 * segCount),
                    stiffness: 50,
                    damping: 5,
                });
            }
        }

        // Parallel rings at different heights
        for (let ri = 1; ri < ringCount; ri++) {
            const t = ri / ringCount;
            const phi = t * Math.PI / 2;
            const ringR = r * Math.cos(phi);
            const ringY = h * Math.sin(phi);
            const ringPts = Math.max(6, Math.round(2 * Math.PI * ringR / sp));
            const ringStart = positions.length / 3;

            for (let i = 0; i < ringPts; i++) {
                const angle = (2 * Math.PI * i) / ringPts;
                positions.push(Math.cos(angle) * ringR, ringY, Math.sin(angle) * ringR);
                roles.push(3);
            }

            for (let i = 0; i < ringPts; i++) {
                connections.push({
                    i: ringStart + i,
                    j: ringStart + ((i + 1) % ringPts),
                    restLength: 2 * Math.PI * ringR / ringPts,
                    stiffness: 40,
                    damping: 5,
                });
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateArch(params) {
        const s = params.scale;
        const w = 4 * s * params.widthMul;
        const h = 5 * s * params.heightMul;
        const d = 1 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Two parallel arches
        for (const z of [-d/2, d/2]) {
            // Left column
            const leftCol = this._addParticlesAlongLine(positions, roles, 2, -w/2, 0, z, -w/2, h*0.6, z, sp);
            connections.push(...leftCol.connections);

            // Right column
            const rightCol = this._addParticlesAlongLine(positions, roles, 2, w/2, 0, z, w/2, h*0.6, z, sp);
            connections.push(...rightCol.connections);

            // Arch curve
            const arch = this._addParticlesAlongArc(positions, roles, 5,
                0, h*0.6, z, w/2, h*0.4, Math.PI, 0, 'y', sp);
            connections.push(...arch.connections);
        }

        // Cross beams between the two arches
        const crossCount = Math.max(6, Math.round(w / sp));
        for (let i = 0; i <= crossCount; i++) {
            const t = i / crossCount;
            const angle = Math.PI * t;
            const x = Math.cos(angle) * w/2;
            const y = h*0.6 + Math.sin(angle) * h*0.4;
            const cross = this._addParticlesAlongLine(positions, roles, 3, x, y, -d/2, x, y, d/2, sp);
            connections.push(...cross.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateTemple(params) {
        const s = params.scale;
        const w = 6 * s * params.widthMul;
        const d = 8 * s;
        const h = 5 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Platform/base
        const baseH = 0.5 * s;
        const baseCorners = [[-w/2, -d/2], [w/2, -d/2], [w/2, d/2], [-w/2, d/2]];
        for (let i = 0; i < 4; i++) {
            const [x1, z1] = baseCorners[i];
            const [x2, z2] = baseCorners[(i + 1) % 4];
            const beam = this._addParticlesAlongLine(positions, roles, 1, x1, baseH, z1, x2, baseH, z2, sp);
            connections.push(...beam.connections);
        }

        // Columns (perimeter)
        const colsPerSide = 6;
        for (let side = 0; side < 4; side++) {
            for (let c = 0; c < colsPerSide; c++) {
                const t = c / (colsPerSide - 1);
                let x, z;
                switch (side) {
                    case 0: x = -w/2 + w * t; z = -d/2; break;
                    case 1: x = w/2; z = -d/2 + d * t; break;
                    case 2: x = w/2 - w * t; z = d/2; break;
                    case 3: x = -w/2; z = d/2 - d * t; break;
                }

                const col = this._addParticlesAlongLine(positions, roles, 2, x, baseH, z, x, h, z, sp);
                connections.push(...col.connections);
            }
        }

        // Entablature (top beams)
        for (let i = 0; i < 4; i++) {
            const [x1, z1] = baseCorners[i];
            const [x2, z2] = baseCorners[(i + 1) % 4];
            const beam = this._addParticlesAlongLine(positions, roles, 3, x1, h, z1, x2, h, z2, sp);
            connections.push(...beam.connections);
        }

        // Pediment (triangular gable on front and back)
        const peakH = h + 1.5 * s;
        for (const zEnd of [-d/2, d/2]) {
            const ped1 = this._addParticlesAlongLine(positions, roles, 3, -w/2, h, zEnd, 0, peakH, zEnd, sp);
            const ped2 = this._addParticlesAlongLine(positions, roles, 3, w/2, h, zEnd, 0, peakH, zEnd, sp);
            connections.push(...ped1.connections, ...ped2.connections);
        }

        // Ridge beam
        const ridge = this._addParticlesAlongLine(positions, roles, 3, 0, peakH, -d/2, 0, peakH, d/2, sp);
        connections.push(...ridge.connections);

        // Roof rafters
        const rafterCount = 6;
        for (let i = 0; i <= rafterCount; i++) {
            const z = -d/2 + d * (i / rafterCount);
            const raft1 = this._addParticlesAlongLine(positions, roles, 4, -w/2, h, z, 0, peakH, z, sp);
            const raft2 = this._addParticlesAlongLine(positions, roles, 4, w/2, h, z, 0, peakH, z, sp);
            connections.push(...raft1.connections, ...raft2.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateCastle(params) {
        const s = params.scale;
        const w = 8 * s * params.widthMul;
        const d = 8 * s;
        const wallH = 4 * s * params.heightMul;
        const towerH = 6 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // 4 corner towers
        const towerW = 1.5 * s;
        const towerCorners = [
            [-w/2, -d/2], [w/2, -d/2], [w/2, d/2], [-w/2, d/2]
        ];

        for (const [tx, tz] of towerCorners) {
            // Tower columns
            const tc = [
                [tx - towerW/2, tz - towerW/2],
                [tx + towerW/2, tz - towerW/2],
                [tx + towerW/2, tz + towerW/2],
                [tx - towerW/2, tz + towerW/2],
            ];

            for (const [cx, cz] of tc) {
                const col = this._addParticlesAlongLine(positions, roles, 2, cx, 0, cz, cx, towerH, cz, sp);
                connections.push(...col.connections);
            }

            // Tower top beams
            for (let i = 0; i < 4; i++) {
                const [x1, z1] = tc[i];
                const [x2, z2] = tc[(i + 1) % 4];
                const beam = this._addParticlesAlongLine(positions, roles, 3, x1, towerH, z1, x2, towerH, z2, sp);
                connections.push(...beam.connections);
            }

            // Battlements (merlons)
            for (let i = 0; i < 4; i++) {
                const [cx, cz] = tc[i];
                const merlon = this._addParticlesAlongLine(positions, roles, 4, cx, towerH, cz, cx, towerH + 0.5*s, cz, sp);
                connections.push(...merlon.connections);
            }
        }

        // Curtain walls between towers
        const wallPairs = [
            [towerCorners[0], towerCorners[1]],
            [towerCorners[1], towerCorners[2]],
            [towerCorners[2], towerCorners[3]],
            [towerCorners[3], towerCorners[0]],
        ];

        for (const [[x1, z1], [x2, z2]] of wallPairs) {
            // Wall base
            const base = this._addParticlesAlongLine(positions, roles, 1, x1, 0, z1, x2, 0, z2, sp);
            connections.push(...base.connections);

            // Wall top
            const top = this._addParticlesAlongLine(positions, roles, 3, x1, wallH, z1, x2, wallH, z2, sp);
            connections.push(...top.connections);

            // Wall verticals
            const wallLen = Math.sqrt((x2-x1)**2 + (z2-z1)**2);
            const vertCount = Math.floor(wallLen / (sp * 10));
            for (let v = 1; v < vertCount; v++) {
                const t = v / vertCount;
                const vx = x1 + (x2 - x1) * t;
                const vz = z1 + (z2 - z1) * t;
                const vert = this._addParticlesAlongLine(positions, roles, 2, vx, 0, vz, vx, wallH, vz, sp);
                connections.push(...vert.connections);
            }
        }

        // Gate (front wall)
        const gateH = wallH * 0.7;
        const gateW = 1.5 * s;
        const gateFrontZ = -d/2;
        const gateL = this._addParticlesAlongLine(positions, roles, 2, -gateW/2, 0, gateFrontZ, -gateW/2, gateH, gateFrontZ, sp);
        const gateR = this._addParticlesAlongLine(positions, roles, 2, gateW/2, 0, gateFrontZ, gateW/2, gateH, gateFrontZ, sp);
        connections.push(...gateL.connections, ...gateR.connections);

        // Gate arch
        const gateArch = this._addParticlesAlongArc(positions, roles, 5,
            0, gateH, gateFrontZ, gateW/2, gateW/2, Math.PI, 0, 'y', sp);
        connections.push(...gateArch.connections);

        // Keep (central tower)
        const keepW = 2 * s;
        const keepH = towerH * 1.2;
        const keepCorners = [
            [-keepW/2, -keepW/2], [keepW/2, -keepW/2],
            [keepW/2, keepW/2], [-keepW/2, keepW/2]
        ];

        for (const [cx, cz] of keepCorners) {
            const col = this._addParticlesAlongLine(positions, roles, 2, cx, 0, cz, cx, keepH, cz, sp);
            connections.push(...col.connections);
        }

        for (let i = 0; i < 4; i++) {
            const [x1, z1] = keepCorners[i];
            const [x2, z2] = keepCorners[(i + 1) % 4];
            const beam = this._addParticlesAlongLine(positions, roles, 3, x1, keepH, z1, x2, keepH, z2, sp);
            connections.push(...beam.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateWall(params) {
        const s = params.scale;
        const w = 10 * s * params.widthMul;
        const h = 3 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Bottom beam
        const bottom = this._addParticlesAlongLine(positions, roles, 1, -w/2, 0, 0, w/2, 0, 0, sp);
        connections.push(...bottom.connections);

        // Top beam
        const top = this._addParticlesAlongLine(positions, roles, 3, -w/2, h, 0, w/2, h, 0, sp);
        connections.push(...top.connections);

        // Vertical studs
        const studCount = Math.floor(w / (sp * 8));
        for (let i = 0; i <= studCount; i++) {
            const x = -w/2 + w * (i / studCount);
            const stud = this._addParticlesAlongLine(positions, roles, 2, x, 0, 0, x, h, 0, sp);
            connections.push(...stud.connections);
        }

        // Cross bracing
        const braceCount = Math.floor(studCount / 2);
        for (let i = 0; i < braceCount; i++) {
            const x1 = -w/2 + w * (2*i / studCount);
            const x2 = -w/2 + w * ((2*i + 2) / studCount);
            const brace = this._addParticlesAlongLine(positions, roles, 4, x1, 0, 0, x2, h, 0, sp);
            connections.push(...brace.connections);
        }

        // Mid-height rail
        const mid = this._addParticlesAlongLine(positions, roles, 3, -w/2, h/2, 0, w/2, h/2, 0, sp);
        connections.push(...mid.connections);

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateStadium(params) {
        const s = params.scale;
        const r = 6 * s * params.widthMul;
        const h = 4 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Elliptical columns
        const colCount = 24;
        for (let i = 0; i < colCount; i++) {
            const angle = (2 * Math.PI * i) / colCount;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r * 0.7; // elliptical

            const col = this._addParticlesAlongLine(positions, roles, 2, x, 0, z, x, h, z, sp);
            connections.push(...col.connections);
        }

        // Tiers (horizontal rings at different heights)
        const tiers = 4;
        for (let t = 1; t <= tiers; t++) {
            const tierH = h * (t / tiers);
            const tierR = r + (t / tiers) * s; // slightly wider at top (rake angle)
            const ringStart = positions.length / 3;
            const ringPts = colCount;

            for (let i = 0; i < ringPts; i++) {
                const angle = (2 * Math.PI * i) / ringPts;
                positions.push(Math.cos(angle) * tierR, tierH, Math.sin(angle) * tierR * 0.7);
                roles.push(3);
            }

            for (let i = 0; i < ringPts; i++) {
                connections.push({
                    i: ringStart + i,
                    j: ringStart + ((i + 1) % ringPts),
                    restLength: 2 * Math.PI * tierR / ringPts,
                    stiffness: 40,
                    damping: 5,
                });
            }
        }

        // Radial beams connecting tiers
        for (let i = 0; i < colCount; i += 3) {
            const angle = (2 * Math.PI * i) / colCount;
            const innerR = r * 0.6;
            const x1 = Math.cos(angle) * innerR;
            const z1 = Math.sin(angle) * innerR * 0.7;
            const x2 = Math.cos(angle) * (r + s);
            const z2 = Math.sin(angle) * (r + s) * 0.7;

            const beam = this._addParticlesAlongLine(positions, roles, 3, x1, 0.5*s, z1, x2, h, z2, sp);
            connections.push(...beam.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateCube(params) {
        const s = params.scale;
        const size = 4 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        const h = size * params.heightMul;
        const w = size * params.widthMul;

        // 12 edges of a cube
        const corners = [
            [-w/2, 0, -w/2], [w/2, 0, -w/2], [w/2, 0, w/2], [-w/2, 0, w/2],
            [-w/2, h, -w/2], [w/2, h, -w/2], [w/2, h, w/2], [-w/2, h, w/2],
        ];

        // Bottom edges
        for (let i = 0; i < 4; i++) {
            const [x1,y1,z1] = corners[i];
            const [x2,y2,z2] = corners[(i+1)%4];
            const e = this._addParticlesAlongLine(positions, roles, 1, x1,y1,z1, x2,y2,z2, sp);
            connections.push(...e.connections);
        }
        // Top edges
        for (let i = 4; i < 8; i++) {
            const [x1,y1,z1] = corners[i];
            const [x2,y2,z2] = corners[4 + (i-4+1)%4];
            const e = this._addParticlesAlongLine(positions, roles, 3, x1,y1,z1, x2,y2,z2, sp);
            connections.push(...e.connections);
        }
        // Vertical edges
        for (let i = 0; i < 4; i++) {
            const [x1,y1,z1] = corners[i];
            const [x2,y2,z2] = corners[i+4];
            const e = this._addParticlesAlongLine(positions, roles, 2, x1,y1,z1, x2,y2,z2, sp);
            connections.push(...e.connections);
        }

        // Face diagonals for stability
        for (let i = 0; i < 4; i++) {
            const [x1,y1,z1] = corners[i];
            const [x2,y2,z2] = corners[(i+1)%4 + 4];
            const e = this._addParticlesAlongLine(positions, roles, 4, x1,y1,z1, x2,y2,z2, sp);
            connections.push(...e.connections);
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateSphere(params) {
        const s = params.scale;
        const r = 3 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Dynamic counts based on spacing
        const meridianCount = Math.max(6, Math.round(Math.PI * r / (sp * 2)));
        const segCount = Math.max(8, Math.round(Math.PI * r / sp));
        const ringCount = Math.max(4, Math.round(Math.PI * r / (sp * 3)));

        // Meridians
        for (let m = 0; m < meridianCount; m++) {
            const phi = (2 * Math.PI * m) / meridianCount;
            const startIdx = positions.length / 3;

            for (let j = 0; j <= segCount; j++) {
                const theta = Math.PI * (j / segCount);
                const x = r * Math.sin(theta) * Math.cos(phi);
                const y = r * Math.cos(theta) + r;
                const z = r * Math.sin(theta) * Math.sin(phi);
                positions.push(x, y, z);
                roles.push(5);
            }

            for (let j = 0; j < segCount; j++) {
                connections.push({
                    i: startIdx + j,
                    j: startIdx + j + 1,
                    restLength: Math.PI * r / segCount,
                    stiffness: 40,
                    damping: 5,
                });
            }
        }

        // Parallel rings
        for (let ri = 1; ri < ringCount; ri++) {
            const theta = Math.PI * (ri / ringCount);
            const ringR = r * Math.sin(theta);
            const ringY = r * Math.cos(theta) + r;
            const ringPts = Math.max(6, Math.round(2 * Math.PI * ringR / sp));
            const ringStart = positions.length / 3;

            for (let i = 0; i < ringPts; i++) {
                const phi = (2 * Math.PI * i) / ringPts;
                positions.push(Math.cos(phi) * ringR, ringY, Math.sin(phi) * ringR);
                roles.push(3);
            }

            for (let i = 0; i < ringPts; i++) {
                connections.push({
                    i: ringStart + i,
                    j: ringStart + ((i + 1) % ringPts),
                    restLength: 2 * Math.PI * ringR / ringPts,
                    stiffness: 35,
                    damping: 5,
                });
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    // ==================== MOLECULE DOMAIN ====================

    _templateMolecule(params) {
        const s = params.scale;
        const r = 3 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Spherical cluster of particles with weak bonds
        const count = Math.max(20, Math.round(4 * Math.PI * r * r / (sp * sp)));
        const startIdx = 0;

        // Distribute on a sphere using Fibonacci spiral for even spacing
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < count; i++) {
            const y = 1 - (2 * i / (count - 1)); // -1 to 1
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;

            // Randomize radius slightly for organic feel
            const rr = r * (0.7 + Math.random() * 0.3);
            positions.push(
                Math.cos(theta) * radiusAtY * rr,
                y * rr + r,
                Math.sin(theta) * radiusAtY * rr
            );
            roles.push(5); // decorative
        }

        // Connect nearby particles (weak molecular bonds)
        const bondThreshold = sp * 6;
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < bondThreshold) {
                    connections.push({
                        i, j,
                        restLength: dist,
                        stiffness: 10, // weak bonds
                        damping: 3.0,
                    });
                }
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateDNA(params) {
        const s = params.scale;
        const helixR = 1.5 * s * params.widthMul;
        const totalH = 10 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Two intertwined helices with cross-links
        const turns = 3;
        const pointsPerTurn = Math.max(12, Math.round(2 * Math.PI * helixR / sp));
        const totalPoints = turns * pointsPerTurn;

        // Helix 1
        const helix1Start = positions.length / 3;
        for (let i = 0; i <= totalPoints; i++) {
            const t = i / totalPoints;
            const angle = t * turns * 2 * Math.PI;
            const y = t * totalH;
            positions.push(
                Math.cos(angle) * helixR,
                y,
                Math.sin(angle) * helixR
            );
            roles.push(2); // column role (backbone)
        }
        // Chain connections for helix 1
        for (let i = 0; i < totalPoints; i++) {
            const segLen = totalH / totalPoints;
            connections.push({
                i: helix1Start + i,
                j: helix1Start + i + 1,
                restLength: Math.sqrt(segLen * segLen + (2 * Math.PI * helixR / totalPoints) ** 2),
                stiffness: 60,
                damping: 5.0,
            });
        }

        // Helix 2 (offset by PI)
        const helix2Start = positions.length / 3;
        for (let i = 0; i <= totalPoints; i++) {
            const t = i / totalPoints;
            const angle = t * turns * 2 * Math.PI + Math.PI;
            const y = t * totalH;
            positions.push(
                Math.cos(angle) * helixR,
                y,
                Math.sin(angle) * helixR
            );
            roles.push(2);
        }
        for (let i = 0; i < totalPoints; i++) {
            const segLen = totalH / totalPoints;
            connections.push({
                i: helix2Start + i,
                j: helix2Start + i + 1,
                restLength: Math.sqrt(segLen * segLen + (2 * Math.PI * helixR / totalPoints) ** 2),
                stiffness: 60,
                damping: 5.0,
            });
        }

        // Cross-links (base pairs) every few steps
        const crossLinkInterval = Math.max(2, Math.floor(pointsPerTurn / 5));
        for (let i = 0; i <= totalPoints; i += crossLinkInterval) {
            // Midpoint particle on the cross-link
            const x1 = positions[(helix1Start + i) * 3];
            const y1 = positions[(helix1Start + i) * 3 + 1];
            const z1 = positions[(helix1Start + i) * 3 + 2];
            const x2 = positions[(helix2Start + i) * 3];
            const y2 = positions[(helix2Start + i) * 3 + 1];
            const z2 = positions[(helix2Start + i) * 3 + 2];

            const midIdx = positions.length / 3;
            positions.push((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
            roles.push(3); // beam role for cross-links

            const halfDist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2) / 2;
            connections.push({
                i: helix1Start + i,
                j: midIdx,
                restLength: halfDist,
                stiffness: 30,
                damping: 5.0,
            });
            connections.push({
                i: midIdx,
                j: helix2Start + i,
                restLength: halfDist,
                stiffness: 30,
                damping: 5.0,
            });
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateProtein(params) {
        const s = params.scale;
        const r = 3 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Alpha-helix segment (core spine)
        const helixR = 0.8 * s;
        const helixH = 6 * s * params.heightMul;
        const helixTurns = 4;
        const helixPts = Math.max(20, Math.round(helixTurns * 2 * Math.PI * helixR / sp));

        const helixStart = positions.length / 3;
        for (let i = 0; i <= helixPts; i++) {
            const t = i / helixPts;
            const angle = t * helixTurns * 2 * Math.PI;
            const y = t * helixH;
            positions.push(
                Math.cos(angle) * helixR,
                y,
                Math.sin(angle) * helixR
            );
            roles.push(2); // backbone
        }
        for (let i = 0; i < helixPts; i++) {
            connections.push({
                i: helixStart + i,
                j: helixStart + i + 1,
                restLength: helixH / helixPts * 1.1,
                stiffness: 50,
                damping: 5.0,
            });
        }

        // Beta-sheet region (flat zigzag near top)
        const sheetW = 3 * s * params.widthMul;
        const sheetH = 1.5 * s;
        const sheetY = helixH + 1 * s;
        const sheetRows = 4;
        const sheetCols = Math.max(4, Math.round(sheetW / sp));

        for (let row = 0; row < sheetRows; row++) {
            const rowStart = positions.length / 3;
            const z = -sheetW / 2 + sheetW * (row / (sheetRows - 1));
            for (let col = 0; col <= sheetCols; col++) {
                const t = col / sheetCols;
                const x = -sheetW / 2 + sheetW * t;
                // Zigzag pleating
                const yOff = (col % 2 === 0) ? 0 : sp * 1.5;
                positions.push(x, sheetY + yOff, z);
                roles.push(3); // beam
            }
            // Chain connections within row
            for (let col = 0; col < sheetCols; col++) {
                connections.push({
                    i: rowStart + col,
                    j: rowStart + col + 1,
                    restLength: sheetW / sheetCols,
                    stiffness: 40,
                    damping: 5.0,
                });
            }
        }

        // Inter-row hydrogen bonds for beta-sheet
        for (let row = 0; row < sheetRows - 1; row++) {
            const row1Start = helixPts + 1 + row * (sheetCols + 1);
            const row2Start = helixPts + 1 + (row + 1) * (sheetCols + 1);
            for (let col = 0; col <= sheetCols; col += 2) {
                const i1 = row1Start + col;
                const i2 = row2Start + col;
                if (i1 < positions.length / 3 && i2 < positions.length / 3) {
                    const dx = positions[i1 * 3] - positions[i2 * 3];
                    const dy = positions[i1 * 3 + 1] - positions[i2 * 3 + 1];
                    const dz = positions[i1 * 3 + 2] - positions[i2 * 3 + 2];
                    connections.push({
                        i: i1, j: i2,
                        restLength: Math.sqrt(dx * dx + dy * dy + dz * dz),
                        stiffness: 20,
                        damping: 3.0,
                    });
                }
            }
        }

        // Globular cloud around the structure
        const globCount = Math.max(30, Math.round(4 * Math.PI * r * r / (sp * sp * 4)));
        const cx = 0, cy = helixH / 2 + sheetH, cz = 0;
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < globCount; i++) {
            const y = 1 - (2 * i / (globCount - 1));
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            const rr = r * (0.5 + Math.random() * 0.5);
            positions.push(
                cx + Math.cos(theta) * radiusAtY * rr,
                cy + y * rr,
                cz + Math.sin(theta) * radiusAtY * rr
            );
            roles.push(5); // decorative
        }

        // Weak connections among globular particles
        const globStart = positions.length / 3 - globCount;
        const globThreshold = sp * 5;
        for (let i = globStart; i < positions.length / 3; i++) {
            for (let j = i + 1; j < Math.min(i + 20, positions.length / 3); j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < globThreshold) {
                    connections.push({
                        i, j,
                        restLength: dist,
                        stiffness: 8,
                        damping: 2.0,
                    });
                }
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    // ==================== ORBIT DOMAIN ====================

    _templateSolarSystem(params) {
        const s = params.scale;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Central sun — dense sphere
        const sunR = 1.2 * s;
        const sunPts = Math.max(12, Math.round(2 * Math.PI * sunR / sp));
        const sunStart = positions.length / 3;

        // Sun surface ring (equatorial)
        for (let i = 0; i < sunPts; i++) {
            const angle = (2 * Math.PI * i) / sunPts;
            positions.push(Math.cos(angle) * sunR, sunR, Math.sin(angle) * sunR);
            roles.push(1); // foundation = core
        }
        for (let i = 0; i < sunPts; i++) {
            connections.push({
                i: sunStart + i,
                j: sunStart + ((i + 1) % sunPts),
                restLength: 2 * Math.PI * sunR / sunPts,
                stiffness: 80,
                damping: 5,
            });
        }

        // Sun meridian rings
        for (let m = 1; m < 3; m++) {
            const phi = Math.PI * m / 3;
            const mStart = positions.length / 3;
            const mPts = Math.max(8, Math.round(2 * Math.PI * sunR * Math.sin(phi) / sp));
            for (let i = 0; i < mPts; i++) {
                const angle = (2 * Math.PI * i) / mPts;
                const rr = sunR * Math.sin(phi);
                positions.push(
                    Math.cos(angle) * rr,
                    sunR + sunR * Math.cos(phi),
                    Math.sin(angle) * rr
                );
                roles.push(1);
            }
            for (let i = 0; i < mPts; i++) {
                connections.push({
                    i: mStart + i,
                    j: mStart + ((i + 1) % mPts),
                    restLength: 2 * Math.PI * sunR * Math.sin(phi) / mPts,
                    stiffness: 70,
                    damping: 5,
                });
            }
        }

        // Orbiting planets at increasing radii
        const planets = [
            { orbitR: 3 * s, planetR: 0.3 * s, pts: 24 },
            { orbitR: 5 * s, planetR: 0.5 * s, pts: 32 },
            { orbitR: 7 * s, planetR: 0.8 * s, pts: 40 },
            { orbitR: 9.5 * s, planetR: 0.6 * s, pts: 36 },
            { orbitR: 12 * s, planetR: 0.4 * s, pts: 28 },
        ];

        for (const planet of planets) {
            // Orbit ring
            const orbitPts = Math.max(planet.pts, Math.round(2 * Math.PI * planet.orbitR / (sp * 3)));
            const orbitStart = positions.length / 3;
            for (let i = 0; i < orbitPts; i++) {
                const angle = (2 * Math.PI * i) / orbitPts;
                positions.push(
                    Math.cos(angle) * planet.orbitR,
                    sunR, // same plane as sun center
                    Math.sin(angle) * planet.orbitR
                );
                roles.push(4); // brace (orbit path)
            }
            for (let i = 0; i < orbitPts; i++) {
                connections.push({
                    i: orbitStart + i,
                    j: orbitStart + ((i + 1) % orbitPts),
                    restLength: 2 * Math.PI * planet.orbitR / orbitPts,
                    stiffness: 15,
                    damping: 3,
                });
            }

            // Planet body (small ring at one point on orbit)
            const planetAngle = Math.random() * 2 * Math.PI;
            const px = Math.cos(planetAngle) * planet.orbitR;
            const pz = Math.sin(planetAngle) * planet.orbitR;
            const planetPts = Math.max(6, Math.round(2 * Math.PI * planet.planetR / sp));
            const planetStart = positions.length / 3;
            for (let i = 0; i < planetPts; i++) {
                const a = (2 * Math.PI * i) / planetPts;
                positions.push(
                    px + Math.cos(a) * planet.planetR,
                    sunR + Math.sin(a) * planet.planetR,
                    pz
                );
                roles.push(2); // column = planet body
            }
            for (let i = 0; i < planetPts; i++) {
                connections.push({
                    i: planetStart + i,
                    j: planetStart + ((i + 1) % planetPts),
                    restLength: 2 * Math.PI * planet.planetR / planetPts,
                    stiffness: 50,
                    damping: 5,
                });
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateGalaxy(params) {
        const s = params.scale;
        const r = 8 * s * params.widthMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Central bulge
        const bulgeR = 1.5 * s;
        const bulgePts = Math.max(20, Math.round(4 * Math.PI * bulgeR * bulgeR / (sp * sp)));
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const bulgeStart = positions.length / 3;

        for (let i = 0; i < bulgePts; i++) {
            const y = 1 - (2 * i / (bulgePts - 1));
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            const rr = bulgeR * (0.6 + Math.random() * 0.4);
            positions.push(
                Math.cos(theta) * radiusAtY * rr,
                y * rr * 0.5 + bulgeR, // flattened
                Math.sin(theta) * radiusAtY * rr
            );
            roles.push(1); // foundation = core
        }
        // Connect bulge neighbors
        for (let i = bulgeStart; i < bulgeStart + bulgePts; i++) {
            for (let j = i + 1; j < Math.min(i + 8, bulgeStart + bulgePts); j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < sp * 5) {
                    connections.push({
                        i, j,
                        restLength: dist,
                        stiffness: 25,
                        damping: 4,
                    });
                }
            }
        }

        // Spiral arms (logarithmic spiral)
        const armCount = 2;
        const ptsPerArm = Math.max(60, Math.round(r * 8 / sp));
        for (let arm = 0; arm < armCount; arm++) {
            const armOffset = (2 * Math.PI * arm) / armCount;
            const armStart = positions.length / 3;

            for (let i = 0; i < ptsPerArm; i++) {
                const t = i / ptsPerArm;
                const armR = bulgeR + (r - bulgeR) * t;
                const angle = armOffset + t * 3 * Math.PI; // spiral winding
                // Scatter width increases with radius
                const scatter = t * sp * 3;
                const yJitter = (Math.random() - 0.5) * sp * 2;
                positions.push(
                    Math.cos(angle) * armR + (Math.random() - 0.5) * scatter,
                    bulgeR + yJitter,
                    Math.sin(angle) * armR + (Math.random() - 0.5) * scatter
                );
                roles.push(3); // beam = arm particles
            }
            // Chain along arm
            for (let i = 0; i < ptsPerArm - 1; i++) {
                const idx = armStart + i;
                const dx = positions[idx * 3] - positions[(idx + 1) * 3];
                const dy = positions[idx * 3 + 1] - positions[(idx + 1) * 3 + 1];
                const dz = positions[idx * 3 + 2] - positions[(idx + 1) * 3 + 2];
                connections.push({
                    i: idx,
                    j: idx + 1,
                    restLength: Math.sqrt(dx * dx + dy * dy + dz * dz),
                    stiffness: 12,
                    damping: 3,
                });
            }
        }

        // Scattered disk particles between arms
        const diskPts = Math.max(40, Math.round(Math.PI * r * r / (sp * sp * 6)));
        for (let i = 0; i < diskPts; i++) {
            const dr = bulgeR + Math.random() * (r - bulgeR);
            const angle = Math.random() * 2 * Math.PI;
            const yJitter = (Math.random() - 0.5) * sp * 1.5;
            positions.push(
                Math.cos(angle) * dr,
                bulgeR + yJitter,
                Math.sin(angle) * dr
            );
            roles.push(5); // decorative
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateAsteroidField(params) {
        const s = params.scale;
        const majorR = 6 * s * params.widthMul; // torus major radius
        const minorR = 2 * s; // torus minor radius
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Particles scattered in a toroidal region
        const count = Math.max(80, Math.round(4 * Math.PI * Math.PI * majorR * minorR / (sp * sp)));

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * 2 * Math.PI; // around torus
            const phi = Math.random() * 2 * Math.PI; // within tube
            const tubeR = minorR * (0.3 + Math.random() * 0.7); // scattered within tube

            const x = (majorR + tubeR * Math.cos(phi)) * Math.cos(theta);
            const y = tubeR * Math.sin(phi) + majorR * 0.5; // lift above ground
            const z = (majorR + tubeR * Math.cos(phi)) * Math.sin(theta);

            positions.push(x, y, z);
            roles.push(5); // decorative
        }

        // Sparse connections between nearby asteroids
        const threshold = sp * 5;
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < Math.min(i + 15, count); j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < threshold) {
                    connections.push({
                        i, j,
                        restLength: dist,
                        stiffness: 5,
                        damping: 2.0,
                    });
                }
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    // ==================== WEATHER DOMAIN ====================

    _templateCloud(params) {
        const s = params.scale;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Main cloud body — multiple overlapping gaussian blobs
        const blobCenters = [
            { x: 0, y: 5 * s, z: 0, r: 2.5 * s },
            { x: 2 * s, y: 5.5 * s, z: 0.5 * s, r: 2 * s },
            { x: -1.5 * s, y: 5.2 * s, z: -0.5 * s, r: 1.8 * s },
            { x: 0.5 * s, y: 5.8 * s, z: -1 * s, r: 1.5 * s },
            { x: -0.5 * s, y: 4.8 * s, z: 1 * s, r: 1.6 * s },
        ];

        let totalCount = 0;
        for (const blob of blobCenters) {
            const count = Math.max(15, Math.round(4 / 3 * Math.PI * blob.r * blob.r * blob.r / (sp * sp * sp * 4)));
            totalCount += count;

            for (let i = 0; i < count; i++) {
                // Gaussian-like: Box-Muller transform
                const u1 = Math.random(), u2 = Math.random(), u3 = Math.random();
                const u4 = Math.random(), u5 = Math.random(), u6 = Math.random();
                const gx = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                const gy = Math.sqrt(-2 * Math.log(u3)) * Math.cos(2 * Math.PI * u4);
                const gz = Math.sqrt(-2 * Math.log(u5)) * Math.cos(2 * Math.PI * u6);

                positions.push(
                    blob.x + gx * blob.r * 0.4,
                    blob.y + Math.abs(gy * blob.r * 0.3), // keep above center
                    blob.z + gz * blob.r * 0.4
                );
                roles.push(5); // decorative
            }
        }

        // Very weak connections for cohesion
        const threshold = sp * 4;
        for (let i = 0; i < totalCount; i++) {
            for (let j = i + 1; j < Math.min(i + 12, totalCount); j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < threshold) {
                    connections.push({
                        i, j,
                        restLength: dist * 1.2, // loose
                        stiffness: 3,
                        damping: 1.0,
                    });
                }
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateTornado(params) {
        const s = params.scale;
        const baseR = 3 * s * params.widthMul;
        const topR = 0.5 * s;
        const h = 12 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Vertical spiral column: radius decreases with height
        const spiralTurns = 6;
        const ptsPerTurn = Math.max(16, Math.round(2 * Math.PI * baseR / sp));
        const totalPts = spiralTurns * ptsPerTurn;

        const spiralStart = positions.length / 3;
        for (let i = 0; i <= totalPts; i++) {
            const t = i / totalPts;
            const angle = t * spiralTurns * 2 * Math.PI;
            const currentR = baseR * (1 - t) + topR * t; // linear taper
            const y = t * h;

            // Add jitter for turbulence
            const jitter = sp * 0.5 * (1 - t);
            positions.push(
                Math.cos(angle) * currentR + (Math.random() - 0.5) * jitter,
                y,
                Math.sin(angle) * currentR + (Math.random() - 0.5) * jitter
            );
            roles.push(2); // column = main vortex
        }
        // Chain along spiral
        for (let i = 0; i < totalPts; i++) {
            const idx = spiralStart + i;
            const dx = positions[idx * 3] - positions[(idx + 1) * 3];
            const dy = positions[idx * 3 + 1] - positions[(idx + 1) * 3 + 1];
            const dz = positions[idx * 3 + 2] - positions[(idx + 1) * 3 + 2];
            connections.push({
                i: idx,
                j: idx + 1,
                restLength: Math.sqrt(dx * dx + dy * dy + dz * dz),
                stiffness: 30,
                damping: 4,
            });
        }

        // Horizontal ring layers for structure
        const ringLayers = 8;
        for (let layer = 0; layer < ringLayers; layer++) {
            const t = layer / ringLayers;
            const ringR = baseR * (1 - t) + topR * t;
            const ringY = t * h;
            const ringPts = Math.max(8, Math.round(2 * Math.PI * ringR / (sp * 2)));
            const ringStart = positions.length / 3;

            for (let i = 0; i < ringPts; i++) {
                const angle = (2 * Math.PI * i) / ringPts + t * Math.PI; // offset each ring
                positions.push(
                    Math.cos(angle) * ringR,
                    ringY,
                    Math.sin(angle) * ringR
                );
                roles.push(3); // beam
            }
            for (let i = 0; i < ringPts; i++) {
                connections.push({
                    i: ringStart + i,
                    j: ringStart + ((i + 1) % ringPts),
                    restLength: 2 * Math.PI * ringR / ringPts,
                    stiffness: 20,
                    damping: 3,
                });
            }
        }

        // Debris particles scattered around base
        const debrisPts = Math.max(20, Math.round(Math.PI * baseR * baseR / (sp * sp * 3)));
        for (let i = 0; i < debrisPts; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const dr = baseR * (0.5 + Math.random() * 1.0);
            const dy = Math.random() * h * 0.3;
            positions.push(
                Math.cos(angle) * dr,
                dy,
                Math.sin(angle) * dr
            );
            roles.push(4); // brace = debris
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateRain(params) {
        const s = params.scale;
        const areaW = 8 * s * params.widthMul;
        const areaD = 8 * s;
        const h = 10 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Rain particles: spawned at height, distributed across area
        const count = Math.max(50, Math.round(areaW * areaD * h / (sp * sp * sp * 8)));

        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * areaW;
            const y = Math.random() * h; // distributed through column
            const z = (Math.random() - 0.5) * areaD;

            // Slight drift pattern
            const drift = Math.sin(x * 0.5) * sp * 2;
            positions.push(x + drift, y, z);
            roles.push(5); // decorative
        }

        // Vertical streak connections (nearby rain drops in same column)
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < Math.min(i + 10, count); j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const horizontalDist = Math.sqrt(dx * dx + dz * dz);
                // Only connect nearly vertical neighbors
                if (horizontalDist < sp * 2) {
                    const dy = Math.abs(positions[i * 3 + 1] - positions[j * 3 + 1]);
                    if (dy < sp * 6) {
                        connections.push({
                            i, j,
                            restLength: dy,
                            stiffness: 5,
                            damping: 1.0,
                        });
                    }
                }
            }
        }

        // Ground puddle ring
        const puddleR = areaW * 0.3;
        const puddlePts = Math.max(12, Math.round(2 * Math.PI * puddleR / (sp * 2)));
        const puddleStart = positions.length / 3;
        for (let i = 0; i < puddlePts; i++) {
            const angle = (2 * Math.PI * i) / puddlePts;
            positions.push(Math.cos(angle) * puddleR, 0, Math.sin(angle) * puddleR);
            roles.push(1); // foundation = ground
        }
        for (let i = 0; i < puddlePts; i++) {
            connections.push({
                i: puddleStart + i,
                j: puddleStart + ((i + 1) % puddlePts),
                restLength: 2 * Math.PI * puddleR / puddlePts,
                stiffness: 20,
                damping: 4,
            });
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    // ==================== FLUID DOMAIN ====================

    _templateWaterDrop(params) {
        const s = params.scale;
        const r = 2.5 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Sphere of particles with surface tension springs
        // Fibonacci sphere distribution
        const count = Math.max(30, Math.round(4 * Math.PI * r * r / (sp * sp)));
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));

        // Surface shell
        for (let i = 0; i < count; i++) {
            const y = 1 - (2 * i / (count - 1));
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            positions.push(
                Math.cos(theta) * radiusAtY * r,
                y * r + r,
                Math.sin(theta) * radiusAtY * r
            );
            roles.push(3); // beam = surface
        }

        // Surface tension: connect each particle to nearby ones
        const surfaceThreshold = sp * 4;
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < surfaceThreshold) {
                    connections.push({
                        i, j,
                        restLength: dist,
                        stiffness: 40, // strong surface tension
                        damping: 5.0,
                    });
                }
            }
        }

        // Inner core particles (denser packing)
        const coreCount = Math.max(10, Math.round(count * 0.3));
        const coreStart = positions.length / 3;
        for (let i = 0; i < coreCount; i++) {
            const y = 1 - (2 * i / (coreCount - 1));
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            const coreR = r * 0.5;
            positions.push(
                Math.cos(theta) * radiusAtY * coreR,
                y * coreR + r,
                Math.sin(theta) * radiusAtY * coreR
            );
            roles.push(2); // column = core
        }

        // Core internal bonds
        for (let i = coreStart; i < coreStart + coreCount; i++) {
            for (let j = i + 1; j < Math.min(i + 10, coreStart + coreCount); j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < sp * 5) {
                    connections.push({
                        i, j,
                        restLength: dist,
                        stiffness: 30,
                        damping: 4.0,
                    });
                }
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateRiver(params) {
        const s = params.scale;
        const length = 15 * s * params.widthMul;
        const width = 3 * s;
        const depth = 0.5 * s;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Elongated stream of particles flowing in one direction
        // Sinusoidal meandering path
        const segments = Math.max(20, Math.round(length / sp));
        const widthPts = Math.max(4, Math.round(width / (sp * 2)));
        const depthPts = Math.max(2, Math.round(depth / sp));

        for (let seg = 0; seg <= segments; seg++) {
            const t = seg / segments;
            const x = -length / 2 + length * t;
            // Meander
            const meander = Math.sin(t * Math.PI * 3) * width * 0.4;
            const segStart = positions.length / 3;

            for (let w = 0; w < widthPts; w++) {
                for (let d = 0; d < depthPts; d++) {
                    const wt = w / (widthPts - 1);
                    const dt = d / (depthPts - 1);
                    const z = -width / 2 + width * wt + meander;
                    const y = depth * dt;
                    positions.push(x, y, z);

                    if (d === 0) {
                        roles.push(1); // foundation = riverbed
                    } else if (w === 0 || w === widthPts - 1) {
                        roles.push(2); // column = banks
                    } else {
                        roles.push(3); // beam = water surface
                    }
                }
            }

            // Connect particles within this cross-section
            const crossPts = widthPts * depthPts;
            for (let i = 0; i < crossPts - 1; i++) {
                const idx1 = segStart + i;
                const idx2 = segStart + i + 1;
                // Only connect within same row or column
                if ((i + 1) % depthPts !== 0) {
                    const dx = positions[idx1 * 3] - positions[idx2 * 3];
                    const dy = positions[idx1 * 3 + 1] - positions[idx2 * 3 + 1];
                    const dz = positions[idx1 * 3 + 2] - positions[idx2 * 3 + 2];
                    connections.push({
                        i: idx1, j: idx2,
                        restLength: Math.sqrt(dx * dx + dy * dy + dz * dz),
                        stiffness: 15,
                        damping: 3,
                    });
                }
            }

            // Connect to previous segment
            if (seg > 0) {
                const prevStart = segStart - crossPts;
                for (let i = 0; i < crossPts; i++) {
                    const dx = positions[(prevStart + i) * 3] - positions[(segStart + i) * 3];
                    const dy = positions[(prevStart + i) * 3 + 1] - positions[(segStart + i) * 3 + 1];
                    const dz = positions[(prevStart + i) * 3 + 2] - positions[(segStart + i) * 3 + 2];
                    connections.push({
                        i: prevStart + i,
                        j: segStart + i,
                        restLength: Math.sqrt(dx * dx + dy * dy + dz * dz),
                        stiffness: 10,
                        damping: 2,
                    });
                }
            }
        }

        // Riverbank edges (stronger connections along length)
        const bankSp = sp * 3;
        const bankL = this._addParticlesAlongLine(positions, roles, 1,
            -length / 2, 0, -width / 2 - sp, length / 2, 0, -width / 2 - sp, bankSp);
        const bankR = this._addParticlesAlongLine(positions, roles, 1,
            -length / 2, 0, width / 2 + sp, length / 2, 0, width / 2 + sp, bankSp);
        connections.push(...bankL.connections, ...bankR.connections);

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateOceanWave(params) {
        const s = params.scale;
        const waveLength = 12 * s * params.widthMul;
        const waveW = 8 * s;
        const amplitude = 1.5 * s * params.heightMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Sinusoidal surface grid
        const xSteps = Math.max(20, Math.round(waveLength / sp));
        const zSteps = Math.max(12, Math.round(waveW / sp));
        const waves = 2.5; // number of wave periods

        for (let xi = 0; xi <= xSteps; xi++) {
            for (let zi = 0; zi <= zSteps; zi++) {
                const t = xi / xSteps;
                const x = -waveLength / 2 + waveLength * t;
                const z = -waveW / 2 + waveW * (zi / zSteps);
                const y = Math.sin(t * waves * 2 * Math.PI) * amplitude + amplitude;

                positions.push(x, y, z);

                // Crest particles vs trough
                if (Math.sin(t * waves * 2 * Math.PI) > 0.5) {
                    roles.push(5); // arch = crest
                } else if (Math.sin(t * waves * 2 * Math.PI) < -0.5) {
                    roles.push(1); // foundation = trough
                } else {
                    roles.push(3); // beam = surface
                }
            }
        }

        // Grid connections
        for (let xi = 0; xi <= xSteps; xi++) {
            for (let zi = 0; zi <= zSteps; zi++) {
                const idx = xi * (zSteps + 1) + zi;

                // Connect to right neighbor
                if (zi < zSteps) {
                    const jdx = idx + 1;
                    const dx = positions[idx * 3] - positions[jdx * 3];
                    const dy = positions[idx * 3 + 1] - positions[jdx * 3 + 1];
                    const dz = positions[idx * 3 + 2] - positions[jdx * 3 + 2];
                    connections.push({
                        i: idx, j: jdx,
                        restLength: Math.sqrt(dx * dx + dy * dy + dz * dz),
                        stiffness: 25,
                        damping: 4,
                    });
                }

                // Connect to next row
                if (xi < xSteps) {
                    const jdx = (xi + 1) * (zSteps + 1) + zi;
                    const dx = positions[idx * 3] - positions[jdx * 3];
                    const dy = positions[idx * 3 + 1] - positions[jdx * 3 + 1];
                    const dz = positions[idx * 3 + 2] - positions[jdx * 3 + 2];
                    connections.push({
                        i: idx, j: jdx,
                        restLength: Math.sqrt(dx * dx + dy * dy + dz * dz),
                        stiffness: 25,
                        damping: 4,
                    });
                }
            }
        }

        // Seafloor reference line
        const floor = this._addParticlesAlongLine(positions, roles, 1,
            -waveLength / 2, 0, 0, waveLength / 2, 0, 0, sp * 3);
        connections.push(...floor.connections);

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    // ==================== ELECTROMAGNETIC DOMAIN ====================

    _templateMagnet(params) {
        const s = params.scale;
        const poleR = 1.2 * s;
        const poleDist = 6 * s * params.widthMul;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // North pole cluster
        const northX = -poleDist / 2;
        const northPts = Math.max(12, Math.round(4 * Math.PI * poleR * poleR / (sp * sp)));
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const northStart = positions.length / 3;

        for (let i = 0; i < northPts; i++) {
            const y = 1 - (2 * i / (northPts - 1));
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            positions.push(
                northX + Math.cos(theta) * radiusAtY * poleR,
                y * poleR + poleR * 2,
                Math.sin(theta) * radiusAtY * poleR
            );
            roles.push(1); // foundation = north pole
        }
        // Connect north pole internally
        for (let i = northStart; i < northStart + northPts; i++) {
            for (let j = i + 1; j < Math.min(i + 8, northStart + northPts); j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < sp * 5) {
                    connections.push({ i, j, restLength: dist, stiffness: 60, damping: 5 });
                }
            }
        }

        // South pole cluster
        const southX = poleDist / 2;
        const southPts = northPts;
        const southStart = positions.length / 3;

        for (let i = 0; i < southPts; i++) {
            const y = 1 - (2 * i / (southPts - 1));
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            positions.push(
                southX + Math.cos(theta) * radiusAtY * poleR,
                y * poleR + poleR * 2,
                Math.sin(theta) * radiusAtY * poleR
            );
            roles.push(2); // column = south pole
        }
        for (let i = southStart; i < southStart + southPts; i++) {
            for (let j = i + 1; j < Math.min(i + 8, southStart + southPts); j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < sp * 5) {
                    connections.push({ i, j, restLength: dist, stiffness: 60, damping: 5 });
                }
            }
        }

        // Field lines — curved arcs from north to south pole
        const fieldLineCount = 8;
        const cy = poleR * 2; // center height
        for (let f = 0; f < fieldLineCount; f++) {
            const phi = (2 * Math.PI * f) / fieldLineCount;
            const lineStart = positions.length / 3;
            const linePts = Math.max(12, Math.round(poleDist * 1.5 / sp));

            for (let i = 0; i <= linePts; i++) {
                const t = i / linePts;
                // Parametric arc from north to south
                const x = northX + (southX - northX) * t;
                // Field line bulges outward in y and z
                const bulge = Math.sin(t * Math.PI);
                const fieldR = poleR * 2.0 * bulge;
                const y = cy + Math.cos(phi) * fieldR;
                const z = Math.sin(phi) * fieldR;

                positions.push(x, y, z);
                roles.push(4); // brace = field lines
            }
            for (let i = 0; i < linePts; i++) {
                const idx = lineStart + i;
                const dx = positions[idx * 3] - positions[(idx + 1) * 3];
                const dy = positions[idx * 3 + 1] - positions[(idx + 1) * 3 + 1];
                const dz = positions[idx * 3 + 2] - positions[(idx + 1) * 3 + 2];
                connections.push({
                    i: idx,
                    j: idx + 1,
                    restLength: Math.sqrt(dx * dx + dy * dy + dz * dz),
                    stiffness: 20,
                    damping: 3,
                });
            }
        }

        // Bar connecting poles (magnet body)
        const bar = this._addParticlesAlongLine(positions, roles, 3,
            northX, cy, 0, southX, cy, 0, sp);
        connections.push(...bar.connections);

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    _templateElectronCloud(params) {
        const s = params.scale;
        const sp = this.spacing;
        const positions = [];
        const roles = [];
        const connections = [];

        // Central nucleus — compact cluster
        const nucleusR = 0.6 * s;
        const nucleusPts = Math.max(8, Math.round(4 * Math.PI * nucleusR * nucleusR / (sp * sp)));
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const nucleusStart = positions.length / 3;
        const centerY = 4 * s;

        for (let i = 0; i < nucleusPts; i++) {
            const y = 1 - (2 * i / (nucleusPts - 1));
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            positions.push(
                Math.cos(theta) * radiusAtY * nucleusR,
                centerY + y * nucleusR,
                Math.sin(theta) * radiusAtY * nucleusR
            );
            roles.push(1); // foundation = nucleus
        }
        // Strong nucleus bonds
        for (let i = nucleusStart; i < nucleusStart + nucleusPts; i++) {
            for (let j = i + 1; j < Math.min(i + 6, nucleusStart + nucleusPts); j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < sp * 4) {
                    connections.push({ i, j, restLength: dist, stiffness: 80, damping: 5 });
                }
            }
        }

        // Electron probability shells (s, p orbital approximations)
        // 1s orbital — spherical
        const s1R = 2 * s;
        const s1Pts = Math.max(20, Math.round(4 * Math.PI * s1R * s1R / (sp * sp * 2)));
        for (let i = 0; i < s1Pts; i++) {
            const y = 1 - (2 * i / (s1Pts - 1));
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            // Randomize radius for probability cloud effect
            const rr = s1R * (0.5 + Math.random() * 0.5);
            positions.push(
                Math.cos(theta) * radiusAtY * rr,
                centerY + y * rr,
                Math.sin(theta) * radiusAtY * rr
            );
            roles.push(5); // decorative = electron cloud
        }

        // 2p orbital — dumbbell shape along y-axis
        const p2R = 3.5 * s * params.heightMul;
        const p2Pts = Math.max(20, Math.round(4 * Math.PI * p2R * p2R / (sp * sp * 3)));
        for (let i = 0; i < p2Pts; i++) {
            const y = 1 - (2 * i / (p2Pts - 1));
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            // Dumbbell: thinner at equator, fatter at poles
            const lobeScale = Math.abs(y) * 0.8 + 0.2;
            const rr = p2R * lobeScale * (0.5 + Math.random() * 0.5);
            const xr = rr * radiusAtY * 0.5; // compressed horizontally
            positions.push(
                Math.cos(theta) * xr,
                centerY + y * rr,
                Math.sin(theta) * xr
            );
            roles.push(4); // brace = p orbital
        }

        // 2p orbital along x-axis
        const p2xPts = Math.max(15, Math.round(p2Pts * 0.7));
        for (let i = 0; i < p2xPts; i++) {
            const y = 1 - (2 * i / (p2xPts - 1));
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            const lobeScale = Math.abs(y) * 0.8 + 0.2;
            const rr = p2R * 0.8 * lobeScale * (0.5 + Math.random() * 0.5);
            // Rotated: dumbbell along x
            positions.push(
                Math.cos(theta) * rr * radiusAtY + (y > 0 ? 1 : -1) * rr * 0.3,
                centerY + Math.sin(theta) * radiusAtY * rr * 0.5,
                Math.sin(theta) * rr * radiusAtY * 0.5
            );
            roles.push(3); // beam = another orbital
        }

        // Weak probabilistic connections within each shell
        const cloudStart = nucleusStart + nucleusPts;
        const totalCloud = positions.length / 3 - cloudStart;
        const cloudThreshold = sp * 5;
        for (let i = cloudStart; i < cloudStart + totalCloud; i++) {
            for (let j = i + 1; j < Math.min(i + 12, cloudStart + totalCloud); j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < cloudThreshold) {
                    connections.push({
                        i, j,
                        restLength: dist * 1.1, // slightly loose
                        stiffness: 6,
                        damping: 2,
                    });
                }
            }
        }

        return {
            positions: new Float32Array(positions),
            roles: new Uint8Array(roles),
            loads: new Float32Array(roles.length),
            connections,
        };
    }

    // ==================== UNIVERSAL GENERATOR ====================

    /**
     * Generate a simulation from a Gemma 4 particle spec.
     * Called when `simulation.particles` exists in the JSON response.
     * Returns the same { targets, assignments, connections, loads, roles, metadata } format
     * as generate() so the rest of the pipeline works identically.
     *
     * @param {Object} spec  — the `simulation.particles` object from Gemma 4
     * @param {number} totalParticles — max particle budget
     * @returns {{ targets, assignments, connections, loads, roles, metadata }}
     */
    generateFromSpec(spec, totalParticles) {
        const groups = spec.groups || [];
        if (groups.length === 0) {
            // Empty spec — fall through to default
            return this.generate('sphere', totalParticles);
        }

        const positions = [];
        const roles = [];
        const connections = [];
        const groupMeta = [];  // track start/end indices per group

        for (const group of groups) {
            const startIdx = positions.length / 3;
            const count = Math.min(group.count || 100, totalParticles - positions.length / 3);
            if (count <= 0) break;

            const shape = (group.shape || 'random_sphere').toLowerCase();
            const params = group.params || {};
            const role = (group.role !== undefined) ? group.role : 3;

            // Generate positions for this group
            this._generateShape(positions, roles, shape, params, count, role);

            const endIdx = positions.length / 3;
            const actualCount = endIdx - startIdx;

            // Generate connections for this group
            const connect = (group.connect || 'none').toLowerCase();
            this._generateConnections(connections, positions, connect, startIdx, endIdx);

            groupMeta.push({ name: group.name || `group_${groupMeta.length}`, startIdx, endIdx, count: actualCount });
        }

        let structCount = positions.length / 3;

        // Trim if over budget
        if (structCount > totalParticles) {
            positions.length = totalParticles * 3;
            roles.length = totalParticles;
            const trimmedConns = connections.filter(c => c.i < totalParticles && c.j < totalParticles);
            connections.length = 0;
            connections.push(...trimmedConns);
            structCount = totalParticles;
        }

        const assignments = new Uint32Array(structCount);
        for (let i = 0; i < structCount; i++) assignments[i] = i;

        const allRoles = new Uint8Array(totalParticles);
        const allLoads = new Float32Array(totalParticles);
        allRoles.set(new Uint8Array(roles.slice(0, Math.min(structCount, totalParticles))));
        allLoads.fill(0);
        this._calculateLoads(allLoads, connections, allRoles, structCount);

        return {
            targets: new Float32Array(positions),
            assignments,
            connections,
            loads: allLoads,
            roles: allRoles,
            metadata: {
                type: 'custom',
                particleCount: totalParticles,
                structuralParticles: structCount,
                ambientParticles: totalParticles - structCount,
                description: `Universal spec: ${groups.map(g => g.name || g.shape).join(', ')}`,
                groups: groupMeta,
            },
        };
    }

    // ---- Shape generators ----

    _generateShape(positions, roles, shape, params, count, role) {
        switch (shape) {
            case 'helix':       return this._shapeHelix(positions, roles, params, count, role);
            case 'sphere':      return this._shapeSphere(positions, roles, params, count, role);
            case 'random_sphere': return this._shapeRandomSphere(positions, roles, params, count, role);
            case 'grid':        return this._shapeGrid(positions, roles, params, count, role);
            case 'ring':        return this._shapeRing(positions, roles, params, count, role);
            case 'disk':        return this._shapeDisk(positions, roles, params, count, role);
            case 'line':        return this._shapeLine(positions, roles, params, count, role);
            case 'wave':        return this._shapeWave(positions, roles, params, count, role);
            case 'spiral':      return this._shapeSpiral(positions, roles, params, count, role);
            case 'shell':       return this._shapeShell(positions, roles, params, count, role);
            case 'cylinder':    return this._shapeCylinder(positions, roles, params, count, role);
            case 'cone':        return this._shapeCone(positions, roles, params, count, role);
            case 'torus':       return this._shapeTorus(positions, roles, params, count, role);
            case 'random_box':  return this._shapeRandomBox(positions, roles, params, count, role);
            case 'point_cloud': return this._shapePointCloud(positions, roles, params, count, role);
            default:            return this._shapeRandomSphere(positions, roles, params, count, role);
        }
    }

    _center(params) {
        const c = params.center || [0, 5, 0];
        return { cx: c[0], cy: c[1], cz: c[2] };
    }

    /** Helix (spring/coil) — radius, pitch, turns */
    _shapeHelix(positions, roles, params, count, role) {
        const r = params.radius || 3;
        const pitch = params.pitch || 0.5;
        const turns = params.turns || 5;
        const { cx, cy, cz } = this._center(params);

        for (let i = 0; i < count; i++) {
            const t = (i / (count - 1)) * turns * Math.PI * 2;
            positions.push(
                cx + Math.cos(t) * r,
                cy + (t / (Math.PI * 2)) * pitch + (i / count) * turns * pitch,
                cz + Math.sin(t) * r
            );
            roles.push(role);
        }
    }

    /** Fibonacci sphere — evenly distributed points on a sphere surface */
    _shapeSphere(positions, roles, params, count, role) {
        const r = params.radius || 3;
        const { cx, cy, cz } = this._center(params);
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));

        for (let i = 0; i < count; i++) {
            const y = 1 - (2 * i / (count - 1));
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            positions.push(
                cx + Math.cos(theta) * radiusAtY * r,
                cy + y * r,
                cz + Math.sin(theta) * radiusAtY * r
            );
            roles.push(role);
        }
    }

    /** Random sphere — random points inside a sphere volume */
    _shapeRandomSphere(positions, roles, params, count, role) {
        const r = params.radius || 3;
        const { cx, cy, cz } = this._center(params);

        for (let i = 0; i < count; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const rr = r * Math.cbrt(Math.random());
            positions.push(
                cx + rr * Math.sin(phi) * Math.cos(theta),
                cy + rr * Math.sin(phi) * Math.sin(theta),
                cz + rr * Math.cos(phi)
            );
            roles.push(role);
        }
    }

    /** 3D grid */
    _shapeGrid(positions, roles, params, count, role) {
        const spacing = params.spacing || 0.3;
        const { cx, cy, cz } = this._center(params);
        const side = Math.max(2, Math.ceil(Math.cbrt(count)));
        let placed = 0;

        for (let ix = 0; ix < side && placed < count; ix++) {
            for (let iy = 0; iy < side && placed < count; iy++) {
                for (let iz = 0; iz < side && placed < count; iz++) {
                    positions.push(
                        cx + (ix - side / 2) * spacing,
                        cy + (iy - side / 2) * spacing,
                        cz + (iz - side / 2) * spacing
                    );
                    roles.push(role);
                    placed++;
                }
            }
        }
    }

    /** Circular ring */
    _shapeRing(positions, roles, params, count, role) {
        const r = params.radius || 3;
        const { cx, cy, cz } = this._center(params);

        for (let i = 0; i < count; i++) {
            const theta = (2 * Math.PI * i) / count;
            positions.push(
                cx + Math.cos(theta) * r,
                cy,
                cz + Math.sin(theta) * r
            );
            roles.push(role);
        }
    }

    /** Flat disk (filled circle) */
    _shapeDisk(positions, roles, params, count, role) {
        const r = params.radius || 3;
        const { cx, cy, cz } = this._center(params);

        for (let i = 0; i < count; i++) {
            const rr = r * Math.sqrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            positions.push(
                cx + rr * Math.cos(theta),
                cy,
                cz + rr * Math.sin(theta)
            );
            roles.push(role);
        }
    }

    /** Linear arrangement */
    _shapeLine(positions, roles, params, count, role) {
        const length = params.length || 10;
        const dir = params.direction || [1, 0, 0];
        const { cx, cy, cz } = this._center(params);
        const mag = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]) || 1;
        const nx = dir[0] / mag, ny = dir[1] / mag, nz = dir[2] / mag;

        for (let i = 0; i < count; i++) {
            const t = (i / (count - 1)) * length - length / 2;
            positions.push(cx + nx * t, cy + ny * t, cz + nz * t);
            roles.push(role);
        }
    }

    /** Sinusoidal wave surface */
    _shapeWave(positions, roles, params, count, role) {
        const amplitude = params.amplitude || 2;
        const wavelength = params.wavelength || 4;
        const width = params.width || 10;
        const depth = params.depth || 10;
        const { cx, cy, cz } = this._center(params);
        const side = Math.max(2, Math.ceil(Math.sqrt(count)));
        let placed = 0;

        for (let ix = 0; ix < side && placed < count; ix++) {
            for (let iz = 0; iz < side && placed < count; iz++) {
                const x = (ix / (side - 1) - 0.5) * width;
                const z = (iz / (side - 1) - 0.5) * depth;
                const y = amplitude * Math.sin((2 * Math.PI * x) / wavelength)
                        * Math.cos((2 * Math.PI * z) / wavelength);
                positions.push(cx + x, cy + y, cz + z);
                roles.push(role);
                placed++;
            }
        }
    }

    /** Flat spiral (galaxy-like) */
    _shapeSpiral(positions, roles, params, count, role) {
        const r = params.radius || 8;
        const turns = params.turns || 3;
        const spread = params.spread || 0.5;
        const { cx, cy, cz } = this._center(params);

        for (let i = 0; i < count; i++) {
            const t = i / count;
            const angle = t * turns * 2 * Math.PI;
            const rr = t * r;
            // Add some random spread for naturalism
            const jitter = (Math.random() - 0.5) * spread * rr * 0.3;
            positions.push(
                cx + Math.cos(angle) * (rr + jitter),
                cy + (Math.random() - 0.5) * spread * 0.5,
                cz + Math.sin(angle) * (rr + jitter)
            );
            roles.push(role);
        }
    }

    /** Hollow sphere surface (shell) */
    _shapeShell(positions, roles, params, count, role) {
        const r = params.radius || 3;
        const { cx, cy, cz } = this._center(params);
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));

        for (let i = 0; i < count; i++) {
            const y = 1 - (2 * i / (count - 1));
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = goldenAngle * i;
            positions.push(
                cx + Math.cos(theta) * radiusAtY * r,
                cy + y * r,
                cz + Math.sin(theta) * radiusAtY * r
            );
            roles.push(role);
        }
    }

    /** Cylindrical distribution */
    _shapeCylinder(positions, roles, params, count, role) {
        const r = params.radius || 2;
        const height = params.height || 6;
        const { cx, cy, cz } = this._center(params);

        for (let i = 0; i < count; i++) {
            const rr = r * Math.sqrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const y = (Math.random() - 0.5) * height;
            positions.push(
                cx + rr * Math.cos(theta),
                cy + y,
                cz + rr * Math.sin(theta)
            );
            roles.push(role);
        }
    }

    /** Conical distribution */
    _shapeCone(positions, roles, params, count, role) {
        const r = params.radius || 3;
        const height = params.height || 6;
        const { cx, cy, cz } = this._center(params);

        for (let i = 0; i < count; i++) {
            const t = Math.random();          // 0=tip, 1=base
            const rr = r * t * Math.sqrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            positions.push(
                cx + rr * Math.cos(theta),
                cy + (1 - t) * height,
                cz + rr * Math.sin(theta)
            );
            roles.push(role);
        }
    }

    /** Torus (donut) — majorRadius, minorRadius */
    _shapeTorus(positions, roles, params, count, role) {
        const R = params.majorRadius || 4;
        const rr = params.minorRadius || 1;
        const { cx, cy, cz } = this._center(params);

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.random() * 2 * Math.PI;
            const x = (R + rr * Math.cos(phi)) * Math.cos(theta);
            const y = rr * Math.sin(phi);
            const z = (R + rr * Math.cos(phi)) * Math.sin(theta);
            positions.push(cx + x, cy + y, cz + z);
            roles.push(role);
        }
    }

    /** Random box — width, height, depth */
    _shapeRandomBox(positions, roles, params, count, role) {
        const w = params.width || 6;
        const h = params.height || 6;
        const d = params.depth || 6;
        const { cx, cy, cz } = this._center(params);

        for (let i = 0; i < count; i++) {
            positions.push(
                cx + (Math.random() - 0.5) * w,
                cy + (Math.random() - 0.5) * h,
                cz + (Math.random() - 0.5) * d
            );
            roles.push(role);
        }
    }

    /** Point cloud — scattered loosely in space */
    _shapePointCloud(positions, roles, params, count, role) {
        const spread = params.spread || 10;
        const { cx, cy, cz } = this._center(params);

        for (let i = 0; i < count; i++) {
            // Gaussian-ish distribution
            const r = spread * (Math.random() + Math.random() + Math.random()) / 3;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions.push(
                cx + r * Math.sin(phi) * Math.cos(theta),
                cy + r * Math.sin(phi) * Math.sin(theta),
                cz + r * Math.cos(phi)
            );
            roles.push(role);
        }
    }

    // ---- Connection generators ----

    _generateConnections(connections, positions, connectType, startIdx, endIdx) {
        const count = endIdx - startIdx;
        if (count < 2) return;

        // Parse connect type — e.g. "nearest:5"
        const [type, argStr] = connectType.split(':');
        const arg = argStr ? parseInt(argStr) : undefined;

        switch (type) {
            case 'chain':   return this._connectChain(connections, positions, startIdx, endIdx);
            case 'grid':    return this._connectGrid(connections, positions, startIdx, endIdx);
            case 'nearest': return this._connectNearest(connections, positions, startIdx, endIdx, arg || 3);
            case 'all':     return this._connectAll(connections, positions, startIdx, endIdx);
            case 'surface': return this._connectSurface(connections, positions, startIdx, endIdx);
            case 'none':    return;
            default:        return;
        }
    }

    _dist3(positions, i, j) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /** Chain — connect sequential neighbors */
    _connectChain(connections, positions, startIdx, endIdx) {
        for (let i = startIdx; i < endIdx - 1; i++) {
            const dist = this._dist3(positions, i, i + 1);
            connections.push({
                i, j: i + 1,
                restLength: dist,
                stiffness: 40,
                damping: 5.0,
            });
        }
    }

    /** Grid — connect each particle to its 6 nearest sequential neighbors */
    _connectGrid(connections, positions, startIdx, endIdx) {
        const count = endIdx - startIdx;
        const side = Math.ceil(Math.cbrt(count));

        for (let idx = 0; idx < count; idx++) {
            const ix = idx % side;
            const iy = Math.floor(idx / side) % side;
            const iz = Math.floor(idx / (side * side));
            const pi = startIdx + idx;

            // Connect to +x, +y, +z neighbors
            const neighbors = [
                { dx: 1, dy: 0, dz: 0 },
                { dx: 0, dy: 1, dz: 0 },
                { dx: 0, dy: 0, dz: 1 },
            ];

            for (const n of neighbors) {
                const nx = ix + n.dx, ny = iy + n.dy, nz = iz + n.dz;
                if (nx >= side || ny >= side || nz >= side) continue;
                const ni = nz * side * side + ny * side + nx;
                if (ni >= count) continue;
                const pj = startIdx + ni;
                const dist = this._dist3(positions, pi, pj);
                connections.push({
                    i: pi, j: pj,
                    restLength: dist,
                    stiffness: 30,
                    damping: 4.0,
                });
            }
        }
    }

    /** Nearest N — connect to N nearest neighbors (brute-force, capped for perf) */
    _connectNearest(connections, positions, startIdx, endIdx, N) {
        const count = endIdx - startIdx;
        // Cap to prevent O(n^2) blowup on large groups
        const maxScan = Math.min(count, 500);
        const step = count > maxScan ? Math.floor(count / maxScan) : 1;
        const connected = new Set();

        for (let i = startIdx; i < endIdx; i += step) {
            // Find N nearest to particle i
            const dists = [];
            for (let j = startIdx; j < endIdx; j++) {
                if (i === j) continue;
                dists.push({ j, d: this._dist3(positions, i, j) });
            }
            dists.sort((a, b) => a.d - b.d);

            for (let k = 0; k < Math.min(N, dists.length); k++) {
                const key = Math.min(i, dists[k].j) + '_' + Math.max(i, dists[k].j);
                if (connected.has(key)) continue;
                connected.add(key);
                connections.push({
                    i, j: dists[k].j,
                    restLength: dists[k].d,
                    stiffness: 25,
                    damping: 4.0,
                });
            }
        }
    }

    /** All — fully connected (small groups only, capped at 100 particles) */
    _connectAll(connections, positions, startIdx, endIdx) {
        const count = endIdx - startIdx;
        const cap = Math.min(endIdx, startIdx + 100);

        for (let i = startIdx; i < cap; i++) {
            for (let j = i + 1; j < cap; j++) {
                const dist = this._dist3(positions, i, j);
                connections.push({
                    i, j,
                    restLength: dist,
                    stiffness: 15,
                    damping: 3.0,
                });
            }
        }
    }

    /** Surface — connect neighbors on a surface (Delaunay-like approximation) */
    _connectSurface(connections, positions, startIdx, endIdx) {
        // Approximation: connect to nearest 6 neighbors
        this._connectNearest(connections, positions, startIdx, endIdx, 6);
    }

    // ==================== UTILITY ====================

    _generateAmbientParticles(structPositions, count, scale) {
        if (count <= 0) return new Float32Array(0);

        const positions = new Float32Array(count * 3);

        // Find bounding box of structure
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        const structCount = structPositions.length / 3;
        for (let i = 0; i < structCount; i++) {
            const x = structPositions[i * 3];
            const y = structPositions[i * 3 + 1];
            const z = structPositions[i * 3 + 2];
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        }

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const cz = (minZ + maxZ) / 2;
        const spread = Math.max(maxX - minX, maxY - minY, maxZ - minZ) * 1.5;

        // Scatter ambient particles loosely around the structure
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            // Gaussian-like distribution around center
            const r = Math.random() * spread;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[idx] = cx + r * Math.sin(phi) * Math.cos(theta);
            positions[idx + 1] = Math.abs(cy + r * Math.sin(phi) * Math.sin(theta) * 0.5);
            positions[idx + 2] = cz + r * Math.cos(phi);
        }

        return positions;
    }

    _calculateLoads(loads, connections, roles, structCount) {
        // Simple top-down load propagation
        // Start with self-weight at top, propagate down via connections
        loads.fill(0);

        for (let i = 0; i < structCount; i++) {
            const role = roles[i];
            if (role === 1) loads[i] = 1.0;       // foundation
            else if (role === 2) loads[i] = 0.7;   // column
            else if (role === 3) loads[i] = 0.4;   // beam
            else if (role === 4) loads[i] = 0.3;   // brace
            else if (role === 5) loads[i] = 0.5;   // arch
        }
    }
}
