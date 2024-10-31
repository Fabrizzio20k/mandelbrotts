"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const Mandelbrot: React.FC = () => {
    const canvasRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Crear la escena, cámara y renderer
        const scene = new THREE.Scene();
        const camera = new THREE.Camera();
        const renderer = new THREE.WebGLRenderer({ antialias: true });

        // Definir los uniformes (Mover la declaración aquí para evitar el acceso antes de inicialización)
        const uniforms = {
            resolution: { type: 'v2', value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            zoom: { type: 'f', value: 1.0 },
            offsetX: { type: 'f', value: -0.7 },
            offsetY: { type: 'f', value: 0.27015 },
            maxIterations: { type: 'i', value: 700 },
        };

        // Asegurar que el renderer se ajuste al tamaño del contenedor
        const adjustRendererSize = () => {
            if (canvasRef.current) {
                const { clientWidth, clientHeight } = canvasRef.current;
                renderer.setSize(clientWidth, clientHeight);
                uniforms.resolution.value.set(clientWidth, clientHeight); // Acceso a uniforms ahora es seguro
            }
        };

        // Llamar inicialmente a la función para ajustar el tamaño
        adjustRendererSize();

        if (canvasRef.current) {
            canvasRef.current.appendChild(renderer.domElement);
        }

        // Crear el material Shader
        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        precision highp float;

        uniform vec2 resolution;
        uniform float zoom;
        uniform float offsetX;
        uniform float offsetY;
        uniform int maxIterations;

        int mandelbrot(vec2 c) {
          vec2 z = vec2(0.0);
          int iter;
          for (iter = 0; iter < maxIterations; iter++) {
            if (dot(z, z) > 4.0) break;
            z = vec2(z.x * z.x - z.y * z.y + c.x, 2.0 * z.x * z.y + c.y);
          }
          return iter;
        }

        vec3 getColor(int iteration, int maxIterations) {
            if (iteration == maxIterations) return vec3(0.0, 0.0, 0.0); // Fondo negro profundo

            float t = float(iteration) / float(maxIterations);

            // Gradiente de tonos verdes vibrantes
            float r = 0.1 + 0.4 * cos(3.0 + t * 5.0);       // Tonos oscuros y tenues en rojo para resaltar el verde
            float g = 0.3 + 0.7 * cos(3.0 + t * 6.0);       // Verde vibrante para estructuras
            float b = 0.1 + 0.3 * cos(3.0 + t * 4.0 + 2.0); // Un toque de azul para dar profundidad

            return vec3(r, g, b);
        }


        void main() {
          vec2 uv = (gl_FragCoord.xy / resolution.xy - 0.5) * 2.0;
          uv.x *= resolution.x / resolution.y;

          vec2 c = vec2(uv.x / zoom + offsetX, uv.y / zoom + offsetY);
          int iterations = mandelbrot(c);

          vec3 color = getColor(iterations, maxIterations);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
        });

        // Crear la geometría del plano y añadir a la escena
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Tiempo para animación y ajuste de offset
        let startTime = Date.now();
        let moveX = 0;
        let moveY = 0;

        // Función para animar el fractal
        const animate = () => {
            requestAnimationFrame(animate);

            uniforms.zoom.value *= 1.005;

            // Verificar zonas vacías
            if (checkForEmptyFractal()) {
                adjustOffset();
            }

            // Comprobar tiempo de animación (reiniciar después de 45 segundos)
            const elapsedTime = (Date.now() - startTime) / 1000;
            if (elapsedTime >= 30 && elapsedTime <= 35) {
                //resetAnimation();
                //adjustOffset();
                uniforms.offsetX.value += 0.00000107;
                uniforms.offsetY.value += 0.00000034;
                //uniforms.offsetY.value += moveY;
            }
            else {
                uniforms.offsetX.value += 0;
            }

            renderer.render(scene, camera);
        };

        // Ajustar offset para buscar nuevas áreas interesantes
        const adjustOffset = () => {
            moveX += (Math.random() - 0.5) * 0.05;
            moveY += (Math.random() - 0.5) * 0.05;
            uniforms.offsetX.value += moveX;
            uniforms.offsetY.value += moveY;
        };

        // Comprobar si la imagen tiene demasiados píxeles blancos (zona vacía)
        const checkForEmptyFractal = (): boolean => {
            const pixels = new Uint8Array(renderer.domElement.width * renderer.domElement.height * 4);
            const renderTarget = renderer.getRenderTarget();
            if (renderTarget) {
                renderer.readRenderTargetPixels(
                    renderTarget,
                    0,
                    0,
                    renderer.domElement.width,
                    renderer.domElement.height,
                    pixels
                );
            }

            let whitePixelCount = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i] === 255 && pixels[i + 1] === 255 && pixels[i + 2] === 255) {
                    whitePixelCount++;
                }
            }

            return (whitePixelCount / (pixels.length / 4)) > 0.9;
        };

        // Resetear la animación
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const resetAnimation = () => {
            uniforms.zoom.value = 1.0;
            uniforms.offsetX.value = -0.7;
            uniforms.offsetY.value = 0.27015;
            startTime = Date.now();
        };

        // Ajustar el tamaño del canvas al cambiar el tamaño de la ventana
        const handleResize = () => {
            adjustRendererSize();
        };

        window.addEventListener('resize', handleResize);

        // Iniciar la animación
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (canvasRef.current) {
                canvasRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    return <div ref={canvasRef} className="w-full h-full" />;
};

export default Mandelbrot;
