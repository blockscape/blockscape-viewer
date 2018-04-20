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

    readonly pos: THREE.Vector2;

    constructor(pos: THREE.Vector2) {

        //super(PLOT_PLANE_GEOMETRY, new MeshBasicMaterial({ color: 0x0000ff}));
        super(PLOT_PLANE_GEOMETRY, PLOT_SHADER_PROGRAM);

        this.translateX(pos.x);
        this.translateY(pos.y);

        this.pos = pos;

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

@Component
export default class DigitalPlane  extends Vue {

    @Prop() private startCenter: THREE.Vector2 = new THREE.Vector2(0, 0);

    private width: number = 400;
    private height: number = 300;

    private center: THREE.Vector2 = new THREE.Vector2();
    private centerDrag: THREE.Vector2 = new THREE.Vector2();
    private zoom: number = 0;
    private zoomDrag: number = 0;

    private plots: Plot3D[] = [];

    // 3D Basic constructs
    private camera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    private scene: THREE.Scene = new THREE.Scene();
    private renderer: THREE.WebGLRenderer|null = null;

    private prevT: number = -1;

    private mousePrevPos: THREE.Vector2|null = null;

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

        this.center.x = 0.5;
        this.center.y = 0.5;
        this.centerDrag.x = 0.5;
        this.centerDrag.y = 0.5;
        this.zoom = -1;
        this.zoomDrag = -1;

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

        let delta = event.deltaY * 0.01;

        let absdelta = Math.abs(delta);

        this.zoom += delta;

        this.center.x = origin.x - (origin.x - this.center.x) / Math.pow(2, delta);
        this.center.y = origin.y - (origin.y - this.center.y) / Math.pow(2, delta);

        console.log(origin.x, origin.y, this.zoom);

        event.preventDefault();

        return false;
    }

    mouseMove(event: any) {
        if(event.buttons & 1) {
            if(event.type == 'mousedown') {
                this.mousePrevPos = new THREE.Vector2(event.screenX, event.screenY);
            }
            else if(event.type == 'mousemove' && this.mousePrevPos) {
                let dx = event.screenX - this.mousePrevPos.x;
                let dy = event.screenY - this.mousePrevPos.y;

                this.center.x -= (dx / ZOOM_PLOT_SIZE) * this.zoomCoordSize;
                this.center.y += (dy / ZOOM_PLOT_SIZE) * this.zoomCoordSize;

                this.mousePrevPos.x = event.screenX;
                this.mousePrevPos.y = event.screenY;
            }
            else if(event.type == 'mouseup') {
                this.mousePrevPos = null;
            }
        }
    }

    pixelToPlaneCoords(pixel: THREE.Vector2): THREE.Vector2 {
        return new THREE.Vector2(
            this.center.x + ((pixel.x - this.width / 2) / ZOOM_PLOT_SIZE) * this.zoomCoordSize,
            this.center.y - ((pixel.y - this.height / 2) / ZOOM_PLOT_SIZE) * this.zoomCoordSize
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

    // called when the view position changes so that plots can be added or removed from the map
    reloadPlots() {
        // find the viewport min/max coords
        let min = this.pixelToPlaneCoords(new THREE.Vector2());
        let max = new THREE.Vector2(this.center.x - min.x, this.center.y - min.y);

        // add or remove plots
        min.x = Math.floor(min.x);
        min.y = Math.floor(min.y);
        max.x = Math.ceil(max.x);
        max.y = Math.ceil(max.y);
        let count = max.x - min.x * max.y - min.y;
        if(count > 100) {
            // fudged viewing mode--download no plot data, but draw something convincing
            // consider not actually clearing it out, we just happen to be doing that right now
            this.plots = [];
        }
        else {
            if(min == this.plots[0].pos &&
                max == this.plots[this.plots.length - 1].pos)
                return; // no change to plots
            
            let newplots = new Array(count);
            var i = 0;
            var j = 0;
            for(let y = min.y;y < max.y;y++) {
                for(let x = min.x;x < max.x;x++) {
                    let p = new THREE.Vector2(x, y);
                    if(this.plots[i].pos == p) {
                        newplots[j++] = this.plots[i++];
                    }

                    // create the new plot
                    newplots[j++] = new Plot3D(p);
                }
            }

            this.plots = newplots;
        }
    }

    update(t: number) {
        var timePassed = 1 / 60;
        if(this.prevT != -1)
            timePassed = t - this.prevT;

        this.centerDrag.x += (this.center.x - this.centerDrag.x) * 10.0 * (timePassed / 1000);
        this.centerDrag.y += (this.center.y - this.centerDrag.y) * 10.0 * (timePassed / 1000);
        this.zoomDrag = (this.zoom - this.zoomDrag) * 10.0 * (timePassed / 1000);
    }

    draw() {
        // TODO: Take into account screen width/height for zoom
        this.camera.left = -this.orthoWidth / 2;
        this.camera.right = this.orthoWidth / 2;
        this.camera.top = this.orthoHeight / 2;
        this.camera.bottom = -this.orthoHeight / 2;

        this.camera.position.x = this.centerDrag.x;
        this.camera.position.y = this.centerDrag.y;
        this.camera.position.z = 10;

        this.camera.updateProjectionMatrix();

        this.camera.lookAt(new THREE.Vector3(this.centerDrag.x, this.centerDrag.y, 0));

        if(this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    animate(t: number) {

        if((<any>this.$refs.canvas).offsetWidth != (<any>this.$refs.canvas).width || (<any>this.$refs.canvas).offsetHeight != (<any>this.$refs.canvas).height) {
            this.resize();
        }

        this.update(t);
        this.draw();
        
        // we only want to keep animating if there is stuff to do
        requestAnimationFrame(this.animate);

        this.prevT = t;
    }

    get zoomCoordSize() {
        return Math.pow(1 / 2, this.zoom);
    }

    get zoomDragCoordSize() {
        return Math.pow(1 / 2, this.zoomDrag);
    }

    get orthoWidth() {
        return this.zoomCoordSize * (this.width / ZOOM_PLOT_SIZE);
    }

    get orthoHeight() {
        return this.zoomCoordSize * (this.height / ZOOM_PLOT_SIZE);
    }
}
</script>
