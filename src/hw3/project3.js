// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project1.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix(translationX, translationY, translationZ, rotationX, rotationY) {
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

    // The final MV matrix will be composed of 
    // 
    // MVP = Proj * (Trans * (R_X * R_Y))
    // 
    // exactly in this order of operations.
    let MV = MatrixMult(trans, rot);

    return MV;
}

const meshVS = `
    attribute vec3 aPosition;  // vertex position
    attribute vec2 aTexCoord;  // vertex texture coordinate
    attribute vec3 aNormals;   // normals

    uniform mat4 MVP;          // model-view-projection matrix
    uniform mat4 MV;           // model-view matrix
    uniform mat3 normalMatrix; // normals matrix
    uniform bool swapYZ;       // toggle swapping Y and Z axes

    varying vec2 vTexCoord;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
        vec3 pos = aPosition;
        vec3 nor = aNormals;

        // swap Y and Z, if needed
        if (swapYZ) {
            float tmp;

            // swap YZ pos
            tmp = pos.y;
            pos.y = pos.z;
            pos.z = tmp;

            // swap YZ normal
            tmp = nor.y;
            nor.y = nor.z;
            nor.z = tmp;
        }
        
        vTexCoord = aTexCoord;
        vNormal   = normalize(normalMatrix * nor);
        vPosition = vec3(MV * vec4(pos, 1.0));

        // apply the MVP matrix
        gl_Position = MVP * vec4(pos, 1.0);
    }
`;

const meshFS = `
    precision mediump float;

    uniform bool       useTexture; // toggle texture on/off
    uniform sampler2D  tex;        // texture sampler
    uniform vec3       lightDir;   // direction *toward* the light, view-space, normalized
    uniform float      shininess;

    varying vec2 vTexCoord;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
        vec4 Kd = useTexture
            ? texture2D(tex, vTexCoord)
            : vec4(1.0);

        vec4 Ka = Kd;
        vec4 Ks = vec4(1.0);
        vec4 I = vec4(1.0);

        vec3 N = normalize(vNormal);
        vec3 L = normalize(lightDir);
        vec3 V = normalize(-vPosition); // toward camera
        vec3 H = normalize(L + V);

        float diff = max(dot(N, L), 0.0);
        float spec = (diff > 0.0) ? pow(max(dot(N, H), 0.0), shininess) : 0.0;
        float Ia = 0.1;

        vec3 lit = I.rgb * (diff * Kd.rgb + Ks.rgb * spec) + Ia * Ka.rgb;

        gl_FragColor = vec4(lit, Kd.a);
    }
`;

class MeshDrawer {
    constructor() {
        this.vertexBuffer  = gl.createBuffer();
        this.textureBuffer = gl.createBuffer();
        this.normalsBuffer = gl.createBuffer();

        this.program = InitShaderProgram(meshVS, meshFS);

        // Attribute locations
        this.aPosition = gl.getAttribLocation(this.program, "aPosition");
        this.aTexCoord = gl.getAttribLocation(this.program, "aTexCoord");
        this.aNormals  = gl.getAttribLocation(this.program, "aNormals");
        
        // Uniform locations
        this.uMVP          = gl.getUniformLocation(this.program, "MVP");
        this.uMV           = gl.getUniformLocation(this.program, "MV");
        this.uNormalMatrix = gl.getUniformLocation(this.program, "normalMatrix");
        this.uSwapYZ       = gl.getUniformLocation(this.program, "swapYZ");
        this.uUseTexture   = gl.getUniformLocation(this.program, "useTexture");
        this.uTex          = gl.getUniformLocation(this.program, "tex");
        this.uLightDir     = gl.getUniformLocation(this.program, "lightDir");
        this.uShininess    = gl.getUniformLocation(this.program, "shininess");

        // Boolean flags initialization
        gl.useProgram(this.program);

        gl.uniform1i(this.uSwapYZ,     0);
        gl.uniform1i(this.uUseTexture, 0);
        gl.uniform3f(this.uLightDir,   0.0, 1.0, 1.0);
        gl.uniform1f(this.uShininess,  32.0);
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
    setMesh(vertPos, texCoords, normals) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        // Update the number of vertices
        this.numVertices = vertPos.length / 3;
    }

    // This method is called when the user changes the state of the
    // "Swap Y-Z Axes" checkbox. The argument is a boolean that indicates
    // if the checkbox is checked.
    swapYZ(swap) {
        gl.useProgram(this.program);

        gl.uniform1i(this.uSwapYZ, swap ? 1 : 0);
    }
	

    // This method is called to draw the triangular mesh.
    // The arguments are the model-view-projection transformation matrixMVP,
    // the model-view transformation matrixMV, the same matrix returned
    // by the GetModelViewProjection function above, and the normal
    // transformation matrix, which is the inverse-transpose of matrixMV.
    draw(matrixMVP, matrixMV, matrixNormal) {
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(this.aPosition);
        gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
        gl.enableVertexAttribArray(this.aTexCoord);
        gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
        gl.enableVertexAttribArray(this.aNormals);
        gl.vertexAttribPointer(this.aNormals, 3, gl.FLOAT, false, 0, 0);

        // Bind the texture unit
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.uTex, 0);

        gl.uniformMatrix4fv(this.uMVP, false, matrixMVP);
        gl.uniformMatrix4fv(this.uMV, false, matrixMV);
        gl.uniformMatrix3fv(this.uNormalMatrix, false, matrixNormal);

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
        gl.uniform1i(this.uTex, 0);

        this.showTexture(true);
    }
	
    // This method is called when the user changes the state of the
    // "Show Texture" checkbox. The argument is a boolean that indicates
    // if the checkbox is checked.
    showTexture(show) {
        gl.useProgram(this.program);

        gl.uniform1i(this.uUseTexture, show ? 1 : 0);
    }

    // This method is called to set the incoming light direction
    setLightDir(x, y, z) {
        gl.useProgram(this.program);

        gl.uniform3f(this.uLightDir, x, y, z);
    }

    // This method is called to set the shininess of the material
    setShininess(shininess) {
        gl.useProgram(this.program);

        gl.uniform1f(this.uShininess, shininess);
    }
}
