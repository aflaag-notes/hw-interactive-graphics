// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform(positionX, positionY, rotation, scale) {
    // let scale_matrix = [
    //     scale * positionX, 0, 0,
    //     0, scale * positionY, 0,
    //     0, 0, 1
    // ];
    //
    // return scale_matrix;
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform(trans1, trans2) {
    let output = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < 3; i++) { // row index
        for (let j = 0; j < 9; j += 3) { // col index
            // console.log(i, j);
            
            for (let z = 0; z < 3; z++) {
                // console.log(i + 3 * z);
                // console.log(j + z)

                output[i + j] += trans2[i + 3 * z] * trans1[j + z]
                // console.log(trans2[i + 3 * z], trans1[j + z], output[i + j]);
            }

            // console.log("end element");
        }
    }

    return output;
}

// console.log(ApplyTransform([0, 1, 2, 3, 4, 5, 6, 7, 8], [0, 1, 2, 3, 4, 5, 6, 7, 8]))
