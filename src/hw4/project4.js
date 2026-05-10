var raytraceFS = `
    struct Ray {
        vec3 pos;
        vec3 dir;
    };

    struct Material {
        vec3  k_d; // diffuse coefficient
        vec3  k_s; // specular coefficient
        float n;   // specular exponent
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

    uniform Sphere spheres[NUM_SPHERES];
    uniform Light lights[NUM_LIGHTS];
    uniform samplerCube envMap;
    uniform int bounceLimit;

    bool IntersectRay(inout HitInfo hit, Ray ray);

    // Shades the given point using Blinn-Phong with shadow rays.
    vec3 Shade(Material mtl, vec3 position, vec3 normal, vec3 view) {
        vec3 color = vec3(0, 0, 0);

        vec3 n = normal;

        for (int i = 0; i < NUM_LIGHTS; ++i) {
            vec3 toLight = lights[i].position - position;
            float lightDist = length(toLight);
            vec3 L = normalize(toLight);

            Ray shadowRay;

            shadowRay.pos = position + n * 0.001;
            shadowRay.dir = L;

            HitInfo shadowHit;

            bool inShadow = false;

            // Check for shadows
            if (IntersectRay(shadowHit, shadowRay)) {
                if (shadowHit.t < lightDist) {
                    inShadow = true;
                }
            }

            // If not shadowed, perform shading using Blinn mode
            if (!inShadow) {
                float diff = max(dot(n, L), 0.0);
                vec3 clr = diff * mtl.k_d;
                vec3 h = normalize(L + view);
                float spec = max(dot(n, h), 0.0);

                if (spec > 0.0) {
                    clr += mtl.k_s * pow(spec, mtl.n);
                }

                color += clr * lights[i].intensity;
            }
        }
        return color;
    }

    // Intersects the given ray with all spheres in the scene
    // and updates the given HitInfo using the information of the sphere
    // that first intersects with the ray.
    // Returns true if an intersection is found.
    bool IntersectRay(inout HitInfo hit, Ray ray) {
        hit.t = 1e30;

        bool foundHit = false;

        for (int i = 0; i < NUM_SPHERES; ++i) {
            vec3 oc = ray.pos - spheres[i].center;

            float a = dot(ray.dir, ray.dir);
            float b = 2.0 * dot(oc, ray.dir);
            float c = dot(oc, oc) - spheres[i].radius * spheres[i].radius;
            float disc = b * b - 4.0 * a * c;

            if (disc >= 0.0) {
                float sq = sqrt(disc);

                float t = (-b - sq) / (2.0 * a);

                if (t > 0.0 && t < hit.t) {
                    hit.t = t;
                    hit.position = ray.pos + t * ray.dir;
                    hit.normal = normalize(hit.position - spheres[i].center);
                    hit.mtl = spheres[i].mtl;

                    foundHit = true;
                }
            }
        }
        return foundHit;
    }

    // Given a ray, returns the shaded color where the ray intersects a sphere.
    // If the ray does not hit a sphere, returns the environment color.
    vec4 RayTracer(Ray ray) {
        HitInfo hit;

        if (IntersectRay(hit, ray)) {
            vec3 view = normalize(-ray.dir);
            vec3 clr  = Shade(hit.mtl, hit.position, hit.normal, view);

            // Compute reflections
            vec3 k_s = hit.mtl.k_s;

            for (int bounce = 0; bounce < MAX_BOUNCES; ++bounce) {
                if ((bounce >= bounceLimit) || (hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0)) {
                    break;
                }

                vec3 n = hit.normal;

                Ray r; // this is the reflection ray

                r.pos = hit.position + n * 0.001;
                r.dir = reflect( ray.dir, n );

                HitInfo h; // reflection hit info

                // Hit found, so shade the hit point
                if (IntersectRay(h, r)) {
                    vec3 reflView = normalize(-r.dir);
                    clr += k_s * Shade(h.mtl, h.position, h.normal, reflView);
                    k_s  = k_s * h.mtl.k_s;

                    // Update the loop variables for tracing the next reflection ray
                    ray  = r;
                    hit  = h;
                    view = normalize(-r.dir);
                } else {
                    // The refleciton ray did not intersect with anything,
                    // so we are using the environment color
                    clr += k_s * textureCube(envMap, r.dir.xzy).rgb;

                    break; // no more reflections
                }
            }

            return vec4(clr, 1);
        } else {
            // return the environment color
            return vec4(textureCube(envMap, ray.dir.xzy).rgb, 0);
        }
    }
`;
