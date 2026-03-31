var swapYZ = false; //Global variable to manage the swap of the axes
var showTexture = true;


// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
        var trans = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                translationX, translationY, translationZ, 1
        ];

        //I compute the sine and cosine of the angles that i need for the rotation matrices
        var cX = Math.cos(rotationX);
        var sX = Math.sin(rotationX);

        var cY = Math.cos(rotationY);
        var sY = Math.sin(rotationY);

        //This matrix swap the Y and Z axes
        var swapYZ_matrix = [
                1, 0, 0, 0,
                0, 0, 1, 0,
                0, 1, 0, 0,
                0, 0, 0, 1
        ];



        var rotX = [
                1, 0, 0, 0,
                0, cX, sX, 0,
                0, -sX, cX, 0,
                0, 0, 0, 1
        ];

        var rotY = [
                cY, 0, -sY, 0,
                0, 1, 0, 0,
                sY, 0, cY, 0,
                0, 0, 0, 1
        ];




        var rotXY = MatrixMult(rotX, rotY);

        if (swapYZ) {
                var rotXY = MatrixMult(rotXY, swapYZ_matrix);
        }

        var projected = MatrixMult(projectionMatrix, trans);


        var mvp = MatrixMult(projected, rotXY);

        return mvp;
}


class MeshDrawer {
        // The constructor is a good place for taking care of the necessary initializations.
        constructor() {
                //I link the shaders
                this.prog = InitShaderProgram(meshVS, meshFS);

                //Buffers
                this.vertbuffer = gl.createBuffer();
                this.textbuffer = gl.createBuffer();
                this.texture = gl.createTexture();

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
                this.numTriangles = vertPos.length / 3;

                gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

                gl.bindBuffer(gl.ARRAY_BUFFER, this.textbuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
        }

        // This method is called when the user changes the state of the
        // "Swap Y-Z Axes" checkbox. 
        // The argument is a boolean that indicates if the checkbox is checked.
        swapYZ(swap) {
                //Managing the global variable
                swapYZ = swap ? 1 : 0;
        }

        // This method is called to draw the triangular mesh.
        // The argument is the transformation matrix, the same matrix returned
        // by the GetModelViewProjection function above.
        draw(trans) {
                gl.useProgram(this.prog);


                gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
                const posAttrib = gl.getAttribLocation(this.prog, "pos");
                gl.enableVertexAttribArray(posAttrib);
                gl.vertexAttribPointer(posAttrib, 3, gl.FLOAT, false, 0, 0);

                const mvpLocation = gl.getUniformLocation(this.prog, "mvp");
                gl.uniformMatrix4fv(mvpLocation, false, trans);

                const texAttrib = gl.getAttribLocation(this.prog, "texCoord");
                gl.enableVertexAttribArray(texAttrib);

                gl.bindBuffer(gl.ARRAY_BUFFER, this.textbuffer);
                gl.vertexAttribPointer(texAttrib, 2, gl.FLOAT, false, 0, 0);

                gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);


                const useTexLoc = gl.getUniformLocation(this.prog, "useTexture");
                gl.uniform1i(useTexLoc, showTexture);
        }

        // This method is called when the user changes the state of the
        // "Show Texture" checkbox. 
        // The argument is a boolean that indicates if the checkbox is checked.
        showTexture(show) {
                gl.useProgram(this.prog);
                if (showTexture) {
                        showTexture = false;
                } else { showTexture = true; }

                const useTexLoc = gl.getUniformLocation(this.prog, "useTexture");
                gl.uniform1i(useTexLoc, showTexture);
        }

        // This method is called to set the texture of the mesh.
        // The argument is an HTML IMG element containing the texture data.
        setTexture(img) {
                // [TO-DO] Bind the texture
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.texture);
                // You can set the texture image data using the following command.
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

                // [TO-DO] Now that we have a texture, it might be a good idea to set
                // some uniform parameter(s) of the fragment shader, so that it uses the texture.
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.useProgram(this.prog);
                const samplerLoc = gl.getUniformLocation(this.prog, "tex");
                gl.uniform1i(samplerLoc, 0);

                const isLoadedLoc = gl.getUniformLocation(this.prog, "isTextureLoaded");
                gl.uniform1i(isLoadedLoc, 1);
                const useTexLoc = gl.getUniformLocation(this.prog, "useTexture");
                gl.uniform1i(useTexLoc, showTexture);
        }

}

// Vertex shader source code
var meshVS = `
        attribute vec3 pos;
        attribute vec2 texCoord;
        uniform mat4 mvp;
        varying vec2 v_texCoord;

        void main()
        {
                v_texCoord = texCoord;
            gl_Position = mvp * vec4(pos, 1.0);
        }
`;
// Fragment shader source code
var meshFS = `
        precision mediump float;

        uniform sampler2D tex; 
        uniform bool useTexture;
        uniform bool isTextureLoaded;
        varying vec2 v_texCoord; 

        void main() {
                if(useTexture && isTextureLoaded){
                        gl_FragColor = texture2D(tex, v_texCoord);
                } else{
                        gl_FragColor = vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);
                }
        }
`;
