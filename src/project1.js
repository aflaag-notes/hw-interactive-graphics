// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform(positionX, positionY, rotation, scale) {
    // First, we transform the rotation degree into radians
    const rad = rotation * Math.PI / 180;

    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // This is the scaling matrix in homogeneous coordinates
    // written in column-major order.
    let scale_matrix = [
        scale,      0, 0,
             0, scale, 0,
             0,     0, 1
    ];

    // This is the rotation matrix in homogeneous coordinates
    // written in column-major order.
    let rotation_matrix = [
         cos, sin, 0,
        -sin, cos, 0,
            0,  0, 1
    ];

    // This is the translation matrix in homogeneous coordinates
    // written in column-major order.
    let translation_matrix = [
                1,         0, 0,
                0,         1, 0,
        positionX, positionY, 1
    ];

    // We need to be careful in this step! Since we want to compute 
    // 
    // T * R * S
    // 
    // and the function ApplyTransform(trans1, trans2) computes
    //
    // T2 * T1
    // 
    // we get that
    // 
    // T * R * S = T * (R * S)
    //           = T * ApplyTransform(scale_matrix, rotation_matrix)
    //           = ApplyTransform(ApplyTransform(scale_matrix, rotation_matrix))
    return ApplyTransform(ApplyTransform(scale_matrix, rotation_matrix), translation_matrix);

    // We observe that we could have just written the matrix
    //
    // return [
    //      scale * c, scale * s, 0,
    //     -scale * s, scale * c, 0,
    //      positionX, positionY, 1
    // ];
    //
    // which is just the precomputed version of the result.
    // Clearly, this would be much faster computationally but 
    // we wrote the complete product for educational purposes.
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform(trans1, trans2) {
    let output = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (let r = 0; r < 3; r++) { // row index
        for (let c = 0; c < 3; c++) { // col index
            // This loop will compute the scalar product
            // between the r-th row of trans1, and the 
            // c-th column of trans2, given that both 
            // matrices are in column-major order
            for (let z = 0; z < 3; z++) {
                output[r + c * 3] += trans2[r + 3 * z] * trans1[c * 3 + z]
            }
        }
    }

    return output;
}
