// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project2.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
    // Constants
    const cX = Math.cos(rotationX);
    const sX = Math.sin(rotationX);
    const cY = Math.cos(rotationY);
    const sY = Math.sin(rotationY);

    // Translation matrix
    let trans = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translationX, translationY, translationZ, 1
    ];

    // X rotation matrix
    let rotX = [
        1,  0,    0,  0,
        0,  cX,  sX,  0,
        0, -sX,  cX,  0,
        0,   0,   0,  1
    ];

    // Y rotation matrix
    let rotY = [
        cY,  0, -sY,  0,
         0,  1,   0,  0,
        sY,  0,  cY,  0,
         0,  0,   0,  1
    ];

    // The rotation matrix is R_X * R_Y
    let rot = MatrixMult(rotX, rotY);
    
    // We observe that we could just use the 
    // precomputed version for speed, but we will leave 
    // the MatrixMult for educational purposes to show 
    // what is the actual product
    // 
    // let rot = [
    //     cY,  sX * sY, -cX * sY, 0,
    //      0,       cX,       sX, 0,
    //     sY, -sX * cY,    cX*cY, 0,
    //      0,        0,        0, 1
    // ];

    // The final MVP matrix will be composed of 
    // 
    // MVP = Proj * (Trans * (R_X * R_Y))
    // 
    // exactly in this order of operations.
    let MVP = MatrixMult(projectionMatrix, MatrixMult(trans, rot));

    return MVP;
}

const meshVS = `
    attribute vec3 aPosition; // vertex position
    attribute vec2 aTexCoord; // vertex texture coordinate

    uniform mat4 MVP;         // model-view-projection matrix
    uniform bool swapYZ;      // toggle swapping Y and Z axes

    varying vec2 vTexCoord;   // pass to fragment shader

    void main() {
        // attributes are read-only
        vec3 pos = aPosition;

        // swap Y and Z, if needed
        if (swapYZ) {
            float tmp = pos.y;
            pos.y = pos.z;
            pos.z = tmp;
        }

        // pass 'aTexCoord' to fragment shader
        vTexCoord = aTexCoord;

        // apply the MVP matrix
        gl_Position = MVP * vec4(pos, 1.0);
    }
`;

const meshFS = `
    precision mediump float;

    uniform bool useTexture; // toggle texture on/off
    uniform sampler2D tex;   // texture sampler

    varying vec2 vTexCoord;  // received from vertex shader

    void main() {
        // default color
        vec4 color = vec4(1, gl_FragCoord.z * gl_FragCoord.z, 0, 1);

        if (useTexture) {
            color = texture2D(tex, vTexCoord);
        }

        gl_FragColor = color;
    }
`;

class MeshDrawer {
    constructor() {
        this.vertexBuffer = gl.createBuffer();
        this.textureBuffer = gl.createBuffer();

        this.program = InitShaderProgram(meshVS, meshFS);

        this.aPosition = gl.getAttribLocation(this.program, "aPosition");
        this.aTexCoord = gl.getAttribLocation(this.program, "aTexCoord");
        
        // Boolean flags initialization
        gl.useProgram(this.program);

        const swapYZLoc = gl.getUniformLocation(this.program, 'swapYZ');
        gl.uniform1i(swapYZLoc, 0);

        const useTextureLoc = gl.getUniformLocation(this.program, 'useTexture');
        gl.uniform1i(useTextureLoc, 0);
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
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        // Update the number of vertices
        this.numVertices = vertPos.length / 3;
    }
    
    // This method is called when the user changes the state of the
    // "Swap Y-Z Axes" checkbox. The argument is a boolean that indicates
    // if the checkbox is checked.
    swapYZ(swap) {
        gl.useProgram(this.program);

        const swapYZLoc = gl.getUniformLocation(this.program, "swapYZ");
        gl.uniform1i(swapYZLoc, swap ? 1 : 0);
    }
    
    // This method is called to draw the triangular mesh.
    // The argument is the transformation matrix, the same matrix returned
    // by the GetModelViewProjection function above.
    draw(trans) {
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(this.aPosition);
        gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
        gl.enableVertexAttribArray(this.aTexCoord);
        gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);

        const MVPLoc = gl.getUniformLocation(this.program, "MVP");
        gl.uniformMatrix4fv(MVPLoc, false, trans);

        // Bind the texture unit
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        // Draw the triangles
        gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
    }
    
    // This method is called to set the texture of the mesh.
    // The argument is an HTML IMG element containing the texture data.
    setTexture(img) {
        this.texture = gl.createTexture();

        // Load the texture
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

        // Set the parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        // Bind the texture unit
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        // Activate the shader program
        gl.useProgram(this.program);

        // Set the texture sampler to match the texture unit
        const samplerLoc = gl.getUniformLocation(this.program, 'tex')
        gl.uniform1i(samplerLoc, 0);

        this.showTexture(true);
    }

    // This method is called when the user changes the state of the
    // "Show Texture" checkbox. The argument is a boolean that indicates
    // if the checkbox is checked.
    showTexture(show) {
        gl.useProgram(this.program);

        const useTextureLoc = gl.getUniformLocation(this.program, 'useTexture');
        gl.uniform1i(useTextureLoc, show ? 1 : 0);
    }
}
