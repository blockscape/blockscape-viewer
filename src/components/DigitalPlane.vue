<template>
<div class="digital-plane" ref="plane">
    <canvas ref="canvas"
            style="width: 100%; height: 100%"
            :width="width"
            :height="height"></canvas>
</div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from 'vue-property-decorator';
import _ from 'lodash';
import * as THREE from 'three';

import VueMixinTween from 'vue-mixin-tween';

import { pathRoundedRect } from '../canvas';

import { easeOutCubic, easeInCubic } from '../easing';
import { MeshBasicMaterial } from 'three';
import { mixins } from 'vue-class-component/lib/util';

const FLY_DELAY_RATE = 300;
const FLY_DELAY_PERCENT = 300;
const FLY_TIME = 200;
const FLY_TURN = 50;

class Building3D {


    // 3D Constructs

}

class Robot3D {

}

let PLOT_VERTEX_SHADER = `
varying vec2 point;

void main() {

    point = position.xy;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

let PLOT_FRAGMENT_SHADER = `
uniform vec3 color;
uniform float zoom;

varying vec2 point;

float div_mod(float top, float bottom) {
    return top - (bottom * floor(top / bottom));
}

float calculateAmp(float scalar, float size, float width) {
    float diff = abs(div_mod(scalar, size));
    diff = min(size - diff, diff);

    return max((width - diff) / width, 0.0);
}

void main() {

    // display two zoom levels worth of zoom: amp 1 for the bigger level, and amp 2 for the smaller level
    float gridSize = pow(1.0 / 2.0, floor(zoom) + 3.0);
    //float gridSize = 0.125;
    float lineWidth = gridSize / 10.0;

    float amp = 
        max(calculateAmp(point.x, gridSize, lineWidth),
            calculateAmp(point.y, gridSize, lineWidth));

    gridSize /= 2.0;

    amp = 
        max(amp, 0.5 * max(calculateAmp(point.x, gridSize, lineWidth),
            calculateAmp(point.y, gridSize, lineWidth)));

    gl_FragColor = vec4(color, amp);
}
`

let PLOT_SHADER_PROGRAM = new THREE.ShaderMaterial({
    uniforms: {
        zoom: { value: 0.0 },
        color: { value: new THREE.Vector3(1, 1, 1) }
    },
    vertexShader: PLOT_VERTEX_SHADER,
    fragmentShader: PLOT_FRAGMENT_SHADER,
    transparent: true
});

// each plot is 1x1 in the 3d world
let PLOT_PLANE_GEOMETRY = new THREE.PlaneBufferGeometry(1, 1);

class Plot3D extends THREE.Mesh {
    private buildings: Building3D[] = [];
    private robots: Robot3D[] = [];

    constructor(pos: THREE.Vector2) {

        //super(PLOT_PLANE_GEOMETRY, new MeshBasicMaterial({ color: 0x0000ff}));
        super(PLOT_PLANE_GEOMETRY, PLOT_SHADER_PROGRAM);

        this.translateX(pos.x);
        this.translateY(pos.y);

        // open connection to RPC
    }

    update(t: number) {

    }

    onBeforeRender = () => {
        PLOT_SHADER_PROGRAM.uniforms.color = { value: new THREE.Color(0x444444) };
    }
}

// how big one plot is on the screen if zoom = 0
let ZOOM_PLOT_SIZE = 256.0;

@Component({
    mixins: [
        VueMixinTween('zoom'),
        VueMixinTween('centerx'),
        VueMixinTween('centery')
    ]
})
export default class DigitalPlane  extends Vue {

    @Prop() private startCenter: THREE.Vector2 = new THREE.Vector2(0, 0);

    private width: number = 400;
    private height: number = 300;

    private centerx: number = 0;
    private centery: number = 0;
    private zoom: number = 0;

    private plots: Plot3D[] = [];

    // 3D Basic constructs
    private camera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    private scene: THREE.Scene = new THREE.Scene();
    private renderer: THREE.WebGLRenderer|null = null;

    private drag: THREE.Vector2|null = null;

    created() {

        // for testing
        this.plots.push(new Plot3D(new THREE.Vector2(0, 0)));
        this.plots.push(new Plot3D(new THREE.Vector2(0, 1)));
        this.plots.push(new Plot3D(new THREE.Vector2(1, 0)));
        this.plots.push(new Plot3D(new THREE.Vector2(1, 1)));
        /*this.plots.push(new Plot3D(new THREE.Vector2(0, 0)));
        this.plots.push(new Plot3D(new THREE.Vector2(0, 0)));
        this.plots.push(new Plot3D(new THREE.Vector2(0, 0)));
        this.plots.push(new Plot3D(new THREE.Vector2(0, 0)));*/
        this.scene.add(this.plots[0]);
        this.scene.add(this.plots[1]);
        this.scene.add(this.plots[2]);
        this.scene.add(this.plots[3]);

        this.centerx = 0.5;
        this.centery = 0.5
        this.zoom = -1;

        /*var geometry = new THREE.BoxGeometry( 1, 1, 1 );
			var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
			var cube = new THREE.Mesh( geometry, material );
			this.scene.add( cube );*/
    }

    mounted() {
        this.resize();

        (<HTMLCanvasElement>this.$refs.canvas).addEventListener('wheel', this.mouseZoom);

        (<HTMLCanvasElement>this.$refs.canvas).addEventListener('mousedown', this.mouseMove);
        (<HTMLCanvasElement>this.$refs.canvas).addEventListener('mousemove', this.mouseMove);
        (<HTMLCanvasElement>this.$refs.canvas).addEventListener('mouseup', this.mouseMove);


        this.renderer = new THREE.WebGLRenderer({
            canvas: <HTMLCanvasElement>this.$refs.canvas,
            antialias: true
        });

        this.renderer.setClearColor(new THREE.Color(0x222222));
        //this.renderer.setClearAlpha(0);

        requestAnimationFrame(this.animate);
    }

    mouseZoom(event: any) {

        // figure out where the mouse is hovering over
        let origin = this.pixelToPlaneCoords(new THREE.Vector2(
            event.clientX - (<HTMLCanvasElement>this.$refs.canvas).offsetLeft,
            event.clientY - (<HTMLCanvasElement>this.$refs.canvas).offsetTop));

        if(event.deltaY < 0) {
            this.zoom++;
            this.centerx = (this.centerx + origin.x) / 2;
            this.centery = (this.centery + origin.y) / 2;
        }
        else {
            this.zoom--;

            this.centerx = this.centerx + (this.centerx - origin.x);
            this.centery = this.centery + (this.centery - origin.y);
        }

        event.preventDefault();

        return false;
    }

    mouseMove(event: any) {
        if(event.buttons & 1) {
            if(event.type == 'mousedown') {
                this.drag = new THREE.Vector2(event.screenX, event.screenY);
            }
            else if(event.type == 'mousemove' && this.drag) {
                let dx = event.screenX - this.drag.x;
                let dy = event.screenY - this.drag.y;

                this.centerx -= (dx / ZOOM_PLOT_SIZE) * this.zoomCoordSize;
                this.centery += (dy / ZOOM_PLOT_SIZE) * this.zoomCoordSize;

                this.drag.x = event.screenX;
                this.drag.y = event.screenY;
            }
            else if(event.type == 'mouseup') {
                this.drag = null;
            }
        }
    }

    pixelToPlaneCoords(pixel: THREE.Vector2): THREE.Vector2 {
        return new THREE.Vector2(
            this.centerx + ((pixel.x - this.width / 2) / ZOOM_PLOT_SIZE) * this.zoomCoordSize,
            this.centery - ((pixel.y - this.height / 2) / ZOOM_PLOT_SIZE) * this.zoomCoordSize
        );
    }

    /*planeToPixelCoords(plane: THREE.Vector2): THREE.Vector2 {

    }*/

    resize() {

        if(this.renderer) {
            this.renderer.setSize((<any>this.$refs.canvas).offsetWidth, (<any>this.$refs.canvas).offsetHeight, false);
        }

        this.width = (<any>this.$refs.canvas).width;
        this.height = (<any>this.$refs.canvas).height;

        //this.renderer.
    }

    animate(t: number) {

        if((<any>this.$refs.canvas).offsetWidth != (<any>this.$refs.canvas).width || (<any>this.$refs.canvas).offsetHeight != (<any>this.$refs.canvas).height) {
            this.resize();
        }

        // TODO: Take into account screen width/height for zoom
        this.camera.left = -this.orthoWidth / 2;
        this.camera.right = this.orthoWidth / 2;
        this.camera.top = this.orthoHeight / 2;
        this.camera.bottom = -this.orthoHeight / 2;

        this.camera.position.x = this.centerx;
        this.camera.position.y = this.centery;
        this.camera.position.z = 10;

        this.camera.updateProjectionMatrix();

        this.camera.lookAt(new THREE.Vector3(this.centerx, this.centery, 0));

        if(this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
        
        // we only want to keep animating if there is stuff to do
        requestAnimationFrame(this.animate);
    }

    get zoomCoordSize() {
        return Math.pow(1 / 2, this.zoom);
    }

    get orthoWidth() {
        return this.zoomCoordSize * (this.width / ZOOM_PLOT_SIZE);
    }

    get orthoHeight() {
        return this.zoomCoordSize * (this.height / ZOOM_PLOT_SIZE);
    }
}
</script>
