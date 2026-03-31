const swapYZ = false;
const showTexture = true;

// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project2.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
    const cX = Math.cos(rotationX);
    const sX = Math.sin(rotationX);
    const cY = Math.cos(rotationY);
    const sY = Math.sin(rotationY);

    let trans = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translationX, translationY, translationZ, 1
    ];

    let rotX = [
        1,  0,    0,  0,
        0,  cX,  sX,  0,
        0, -sX,  cX,  0,
        0,   0,   0,  1
    ];

    let rotY = [
        cY,  0, -sY,  0,
         0,  1,   0,  0,
        sY,  0,  cY,  0,
         0,  0,   0,  1
    ];

    let rot = MatrixMult(rotX, rotY);
    
    // let rot = [
    //     cY,        0,       -sY,      0,
    //     sY * sX,   cX,      cY * sX,  0,
    //     sY * cX,  -sX,      cY * cX,  0,
    //     0,         0,       0,        1
    // ];

    // TODO: implementa la rotazione per YZ swap
    let mvp = MatrixMult(projectionMatrix, MatrixMult(trans, rot));

    return mvp;
}

const meshVS = `
    attribute vec3 aPosition;   // vertex position
    attribute vec2 aTexCoord;   // vertex texture coordinate

    uniform mat4 uMVP;          // model-view-projection matrix
    uniform bool uSwapYZ;       // toggle swapping Y and Z axes

    varying vec2 vTexCoord;     // pass to fragment shader

    void main() {
        vec3 pos = aPosition;

        // Swap Y and Z if requested
        if (uSwapYZ) {
            float tmp = pos.y;
            pos.y = pos.z;
            pos.z = tmp;
        }

        vTexCoord = aTexCoord;           // pass texcoord to fragment shader
        gl_Position = uMVP * vec4(pos, 1.0);
    }
`;

const meshFS = `
    precision mediump float;

    uniform bool uUseTexture;    // toggle texture on/off
    uniform sampler2D tex;       // texture sampler

    varying vec2 vTexCoord;      // received from vertex shader

    void main() {
        vec4 color = vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1); // default color

        if (uUseTexture) {
            color = texture2D(tex, vTexCoord);
        }

        gl_FragColor = color;
    }
`;

class MeshDrawer {
    constructor() {
        // create buffers
        this.vertBuffer = gl.createBuffer();
        this.texBuffer = gl.createBuffer();

        // create vertex shader
        let vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, meshVS);
        gl.compileShader(vertexShader);

        // vertex shader handling
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error("Vertex shader error: ", gl.getShaderInfoLog(vertexShader));
            gl.deleteShader(vertexShader);
        }

        // create fragment shader
        let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, meshFS);
        gl.compileShader(fragmentShader);

        // fragment shader handling
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error("Fragment shader error: ", gl.getShaderInfoLog(fragmentShader));
            gl.deleteShader(fragmentShader);
        }

        // create program
        this.program = gl.createProgram();

        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error("Program link error: ", gl.getProgramInfoLog(this.program));
            gl.deleteProgram(this.program);
        }

        // attributes locations
        this.aPosition = gl.getAttribLocation(this.program, "aPosition");
        this.aTexCoord = gl.getAttribLocation(this.program, "aTexCoord");
    }
    
    // This method is called every time the user opens an OBJ file.
    // The arguments of this function is an array of 3D vertex positions
    // and an array of 2D texture coordinates.
    // Every item in these arrays is a floating point value, representing one
    // coordinate of the vertex position or texture coordinate.
    // Every three consecutive elements in the vertPos array forms one vertex
    // position and every three consecutive vertex positions form a triangle.
    // Similarly, every two consecutive elements in the texCoords array
    // form the texture coordinate of a vertex.
    // Note that this method can be called multiple times.
    setMesh(vertPos, texCoords) {
        // bind the vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

        // bind the texture buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        // update the number of vertices
        this.numVertices = vertPos.length / 3;
    }
    
    // This method is called when the user changes the state of the
    // "Swap Y-Z Axes" checkbox. The argument is a boolean that indicates
    // if the checkbox is checked.
    swapYZ(swap) {
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.useProgram(this.program);

        const uSwap = gl.getUniformLocation(this.program, "uSwapYZ");
        gl.uniform1i(uSwap, swap ? 1 : 0);
    }
    
    // This method is called to draw the triangular mesh.
    // The argument is the transformation matrix, the same matrix returned
    // by the GetModelViewProjection function above.
    draw( trans )
    {
            // [TO-DO] Complete the WebGL initializations before drawing

            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.useProgram(this.program);

            // Positions
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
            gl.enableVertexAttribArray(this.aPosition);
            gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);

            // Texture coords
            gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
            gl.enableVertexAttribArray(this.aTexCoord);
            gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);

            // Set MVP matrix uniform
            const uMVP = gl.getUniformLocation(this.program, "uMVP");
            gl.uniformMatrix4fv(uMVP, false, trans);

            // Bind texture if needed
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.tex);

            // Draw triangles
            gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);

    }
    
    // This method is called to set the texture of the mesh.
    // The argument is an HTML IMG element containing the texture data.
    setTexture(img) {
        this.tex = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, this.tex);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

        // No generateMipmap — remove it entirely

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // CLAMP_TO_EDGE required for non-power-of-two textures
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.tex);

        gl.useProgram(this.program);
        gl.uniform1i(gl.getUniformLocation(this.program, 'tex'), 0);
    }

    
    // This method is called when the user changes the state of the
    // "Show Texture" checkbox. 
    // The argument is a boolean that indicates if the checkbox is checked.
    showTexture( show )
    {
            // [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
        // Activate the shader program
        gl.useProgram(this.program);

        const uUseTexture = gl.getUniformLocation(this.program, 'uUseTexture');

        // Set it: 1 = true, 0 = false
        gl.uniform1i(uUseTexture, show ? 1 : 0);
    }
    
}

