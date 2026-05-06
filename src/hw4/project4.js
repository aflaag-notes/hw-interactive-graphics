// var raytraceFS = `
// struct Ray {
// 	vec3 pos;
// 	vec3 dir;
// };
//
// struct Material {
// 	vec3  k_d;	// diffuse coefficient
// 	vec3  k_s;	// specular coefficient
// 	float n;	// specular exponent
// };
//
// struct Sphere {
// 	vec3     center;
// 	float    radius;
// 	Material mtl;
// };
//
// struct Light {
// 	vec3 position;
// 	vec3 intensity;
// };
//
// struct HitInfo {
// 	float    t;
// 	vec3     position;
// 	vec3     normal;
// 	Material mtl;
// };
//
// uniform Sphere spheres[ NUM_SPHERES ];
// uniform Light  lights [ NUM_LIGHTS  ];
// uniform samplerCube envMap;
// uniform int bounceLimit;
//
// bool IntersectRay( inout HitInfo hit, Ray ray );
//
// // Shades the given point and returns the computed color.
// vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
// {
// 	vec3 color = vec3(0,0,0);
// 	for ( int i=0; i<NUM_LIGHTS; ++i ) {
// 		// TO-DO: Check for shadows
// 		// TO-DO: If not shadowed, perform shading using the Blinn model
// 		color += mtl.k_d * lights[i].intensity;	// change this line
// 	}
// 	return color;
// }
//
// // Intersects the given ray with all spheres in the scene
// // and updates the given HitInfo using the information of the sphere
// // that first intersects with the ray.
// // Returns true if an intersection is found.
// bool IntersectRay( inout HitInfo hit, Ray ray )
// {
// 	hit.t = 1e30;
// 	bool foundHit = false;
// 	for ( int i=0; i<NUM_SPHERES; ++i ) {
// 		// TO-DO: Test for ray-sphere intersection
// 		// TO-DO: If intersection is found, update the given HitInfo
// 	}
// 	return foundHit;
// }
//
// // Given a ray, returns the shaded color where the ray intersects a sphere.
// // If the ray does not hit a sphere, returns the environment color.
// vec4 RayTracer( Ray ray )
// {
// 	HitInfo hit;
// 	if ( IntersectRay( hit, ray ) ) {
// 		vec3 view = normalize( -ray.dir );
// 		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
//
// 		// Compute reflections
// 		vec3 k_s = hit.mtl.k_s;
// 		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
// 			if ( bounce >= bounceLimit ) break;
// 			if ( hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0 ) break;
//
// 			Ray r;	// this is the reflection ray
// 			HitInfo h;	// reflection hit info
//
// 			// TO-DO: Initialize the reflection ray
//
// 			if ( IntersectRay( h, r ) ) {
// 				// TO-DO: Hit found, so shade the hit point
// 				// TO-DO: Update the loop variables for tracing the next reflection ray
// 			} else {
// 				// The refleciton ray did not intersect with anything,
// 				// so we are using the environment color
// 				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
// 				break;	// no more reflections
// 			}
// 		}
// 		return vec4( clr, 1 );	// return the accumulated color, including the reflections
// 	} else {
// 		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );	// return the environment color
// 	}
// }
// `;

var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;
	vec3  k_s;
	float n;
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point using Blinn-Phong with shadow rays.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	// NO normal flipping (match second version)
	vec3 n = normal;

	vec3 color = vec3(0,0,0);
	for ( int i=0; i<NUM_LIGHTS; ++i ) {
		vec3 toLight    = lights[i].position - position;
		float lightDist = length( toLight );
		vec3 L          = normalize( toLight );

		Ray shadowRay;
		shadowRay.pos = position + n * 0.001;   // smaller bias
	        shadowRay.dir = L;

		HitInfo shadowHit;
		bool inShadow = false;
		if ( IntersectRay( shadowHit, shadowRay ) ) {
			if ( shadowHit.t < lightDist ) inShadow = true;
		}

		if ( !inShadow ) {
			float diff = max( dot(n, L), 0.0 );
			vec3 clr   = diff * mtl.k_d;
			vec3 h     = normalize( L + view );
			float spec = max( dot(n, h), 0.0 );
			if ( spec > 0.0 ) clr += mtl.k_s * pow( spec, mtl.n );
			color += clr * lights[i].intensity;
		}
	}
	return color;
}

// Intersects the ray with all spheres; updates hit with the closest one.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
	hit.t = 1e30;
	bool foundHit = false;
	for ( int i=0; i<NUM_SPHERES; ++i ) {
		vec3  oc   = ray.pos - spheres[i].center;
		float a    = dot( ray.dir, ray.dir );
		float b    = 2.0 * dot( oc, ray.dir );
		float c    = dot( oc, oc ) - spheres[i].radius * spheres[i].radius;
		float disc = b*b - 4.0*a*c;

		if ( disc >= 0.0 ) {
			float sq = sqrt( disc );

                        float t = (-b - sq) / (2.0*a);

                        if ( t > 0.0 && t < hit.t ) {
				hit.t        = t;
				hit.position = ray.pos + t * ray.dir;
				hit.normal   = normalize( hit.position - spheres[i].center );
				hit.mtl      = spheres[i].mtl;
				foundHit     = true;
			}
		}
	}
	return foundHit;
}

// Traces a ray, shades the hit point, and accumulates mirror reflections.
vec4 RayTracer( Ray ray )
{
	HitInfo hit;
	if ( IntersectRay( hit, ray ) ) {
		vec3 view = normalize( -ray.dir );
		vec3 clr  = Shade( hit.mtl, hit.position, hit.normal, view );

		vec3 k_s = hit.mtl.k_s;
		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
			if ( bounce >= bounceLimit ) break;

			// termination based on current material (match second version)
			if ( hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0 ) break;

			vec3 n = hit.normal;

			Ray r;
			r.pos = hit.position + n * 0.001;   // smaller bias

			// reflection direction changed to match second version
			r.dir = reflect( ray.dir, n );

			HitInfo h;
			if ( IntersectRay( h, r ) ) {
				vec3 reflView = normalize( -r.dir );
				clr += k_s * Shade( h.mtl, h.position, h.normal, reflView );
				k_s  = k_s * h.mtl.k_s;
				// update state like second version
				ray  = r;
				hit  = h;
				view = normalize( -r.dir );
			} else {
				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
				break;
			}
		}
		return vec4( clr, 1 );
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );
	}
}
`;

// var raytraceFS = `
// struct Ray {
// 	vec3 pos;
// 	vec3 dir;
// };
//
// struct Material {
// 	vec3  k_d;	// diffuse coefficient
// 	vec3  k_s;	// specular coefficient
// 	float n;	// specular exponent
// };
//
// struct Sphere {
// 	vec3     center;
// 	float    radius;
// 	Material mtl;
// };
//
// struct Light {
// 	vec3 position;
// 	vec3 intensity;
// };
//
// struct HitInfo {
// 	float    t;
// 	vec3     position;
// 	vec3     normal;
// 	Material mtl;
// };
//
// uniform Sphere spheres[ NUM_SPHERES ];
// uniform Light  lights [ NUM_LIGHTS  ];
// uniform samplerCube envMap;
// uniform int bounceLimit;
// float bias = 0.001;
//
// bool IntersectRay( inout HitInfo hit, Ray ray );
//
// // Shades the given point and returns the computed color.
// vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
// {
// 	vec3 color = vec3(0,0,0);
// 	for ( int i=0; i<NUM_LIGHTS; ++i ) {
// 		// DONE-TO-DO: Check for shadows
// 		Light curr_light = lights[i];
// 		vec3 tmp = curr_light.position - position;
// 		vec3 light_dir = normalize(tmp);
// 		float light_distance = length(tmp);
//
// 		Ray ray_shadow;
// 		ray_shadow.dir=light_dir;
// 		ray_shadow.pos=position + (normal * bias);
//
// 		HitInfo hit_shadow;
// 		bool tmp2=IntersectRay( hit_shadow, ray_shadow );
// 		bool shadowed = tmp2 && hit_shadow.t<light_distance;
//
// 		if (!shadowed){
// 			// DONE-TO-DO: If not shadowed, perform shading using the Blinn model
// 			float diff = max(dot(normal,light_dir),0.0);
// 			vec3 diffuse = diff*mtl.k_d;
// 			vec3 halfway = normalize(light_dir+view);
// 			float spec = pow(max(dot(normal, halfway), 0.0), mtl.n);
// 			vec3 specular = spec * mtl.k_s;
//
// 			color += (diffuse + specular) * curr_light.intensity;
// 		}
// 	}
// 	return color;
// }
//
// // Intersects the given ray with all spheres in the scene
// // and updates the given HitInfo using the information of the sphere
// // that first intersects with the ray.
// // Returns true if an intersection is found.
// bool IntersectRay( inout HitInfo hit, Ray ray )
// {
// 	hit.t = 1e30;
// 	bool foundHit = false;
// 	for ( int i=0; i<NUM_SPHERES; ++i ) {
// 		// DONE-TO-DO: Test for ray-sphere intersection
// 		// DONE-TO-DO: If intersection is found, update the given HitInfo
// 		Sphere curr_sphere = spheres[i];
// 		vec3 cent = curr_sphere.center;
// 		float r = curr_sphere.radius;
// 		vec3 p = ray.pos;
// 		vec3 d = ray.dir;
//
// 		vec3 tmp = p-cent;
//
// 		float a = dot(d,d);
// 		float b = dot(2.*d,tmp);
// 		float c = dot(tmp,tmp)-r*r;
// 		float delta = b*b-4.*a*c;
//
// 		if(delta >= 0.){
// 			float t = (-b-sqrt(delta))/(a*2.);
// 			if (t<hit.t && t>0.0){
// 				foundHit=true;
// 				hit.t = t;
// 				hit.position = p+d*t;
// 				hit.normal = normalize(hit.position-cent);
// 				hit.mtl = curr_sphere.mtl;
// 			}
// 		}
// 	}
// 	return foundHit;
// }
//
// // Given a ray, returns the shaded color where the ray intersects a sphere.
// // If the ray does not hit a sphere, returns the environment color.
// vec4 RayTracer( Ray ray )
// {
// 	HitInfo hit;
// 	if ( IntersectRay( hit, ray ) ) {
// 		vec3 view = normalize( -ray.dir );
// 		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
//
// 		// Compute reflections
// 		vec3 k_s = hit.mtl.k_s;
// 		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
// 			if ( bounce >= bounceLimit ) break;
// 			if ( hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0 ) break;
//
// 			Ray r;	// this is the reflection ray
// 			HitInfo h;	// reflection hit info
//
// 			// DONE-TO-DO: Initialize the reflection ray
// 			r.pos = hit.position + bias*hit.normal;
// 			r.dir = reflect(ray.dir,hit.normal);
//
// 			if ( IntersectRay( h, r ) ) {
// 				// DONE-TO-DO: Hit found, so shade the hit point
// 				vec3 view = normalize( -r.dir );
// 				clr += k_s * Shade( h.mtl, h.position, h.normal, view );
//
// 				// DONE-TO-DO: Update the loop variables for tracing the next reflection ray
// 				ray=r;
// 				k_s *= h.mtl.k_s;
// 				hit=h;
// 			} else {
// 				// The reflection ray did not intersect with anything,
// 				// so we are using the environment color
// 				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
// 				break;	// no more reflections
// 			}
// 		}
// 		return vec4( clr, 1 );	// return the accumulated color, including the reflections
// 	} else {
// 		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );	// return the environment color
// 	}
// }
// `;
//
