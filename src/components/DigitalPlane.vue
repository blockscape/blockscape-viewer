<template>
<div class="digital-plane" ref="plane" style="width: 100%; height: 100%">
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
import { MeshBasicMaterial, Vector2 } from 'three';
import { mixins } from 'vue-class-component/lib/util';

const FLY_DELAY_RATE = 300;
const FLY_DELAY_PERCENT = 300;
const FLY_TIME = 200;
const FLY_TURN = 50;

interface ViewState {
    zoom: number,
    center: THREE.Vector2,
    tilt: number
}

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

/*let PLOT_FRAGMENT_SHADER = `
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
    float lineWidth = gridSize / 20.0;

    float amp = 
        max(calculateAmp(point.x, gridSize, lineWidth),
            calculateAmp(point.y, gridSize, lineWidth));

    gridSize /= 2.0;

    amp = 
        max(amp, 0.5 * max(calculateAmp(point.x, gridSize, lineWidth),
            calculateAmp(point.y, gridSize, lineWidth)));

    gl_FragColor = vec4(color, amp);
}
`*/

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

    float partial = zoom - floor(zoom);

    // display two zoom levels worth of zoom: amp 1 for the bigger level, and amp 2 for the smaller level
    float gridSize = pow(1.0 / 2.0, floor(zoom) + 3.0);
    //float gridSize = 0.125;
    float lineWidth = gridSize / 20.0;

    lineWidth /= (max(0.8, partial) - 0.8) * 5.0 + 1.0;

    float amp = 
        max(calculateAmp(point.x, gridSize, lineWidth),
            calculateAmp(point.y, gridSize, lineWidth));

    gridSize /= 2.0;

    amp = 
        max(amp, partial * max(calculateAmp(point.x, gridSize, lineWidth),
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

let PLOT_BASE_COLOR = new THREE.Color(0x444444);
let PLOT_LOAD_COLOR = new THREE.Color(0x9feaf9);

class Plot3D extends THREE.Mesh {
    private buildings: Building3D[] = [];
    private robots: Robot3D[] = [];

    private state: 'loading'|'active'|'sieged';

    private color: THREE.Color;

    readonly pos: THREE.Vector2;

    private readonly viewState: ViewState;

    constructor(pos: THREE.Vector2, vs: ViewState) {

        //super(PLOT_PLANE_GEOMETRY, new MeshBasicMaterial({ color: 0x0000ff}));
        super(PLOT_PLANE_GEOMETRY, PLOT_SHADER_PROGRAM);

        this.translateX(pos.x);
        this.translateY(pos.y);

        this.pos = pos;
        this.viewState = vs;
        this.color = PLOT_BASE_COLOR;

        // open connection to RPC
        this.state = 'loading';
    }

    update(t: number) {

        let midsecond = (t % 1000) / 1000.0;

        switch(this.state) {
        case 'loading':
            this.color = PLOT_LOAD_COLOR.clone();
            this.color.lerp(PLOT_BASE_COLOR, midsecond);

            break;
        case 'active':

        case 'sieged':
        }
    }

    onBeforeRender = () => {
        PLOT_SHADER_PROGRAM.uniforms.color = { value: this.color };
        PLOT_SHADER_PROGRAM.uniforms.zoom = { value: this.viewState.zoom };
    }
}

// how big one plot is on the screen if zoom = 0
let ZOOM_PLOT_SIZE = 256.0;

@Component
export default class DigitalPlane  extends Vue {

    @Prop() private startCenter: THREE.Vector2 = new THREE.Vector2(0, 0);

    private width: number = 400;
    private height: number = 300;

    private viewState: ViewState = {
        zoom: 0,
        center: new THREE.Vector2(),
        tilt: 0
    };

    private centerDrag: THREE.Vector2 = new THREE.Vector2();
    private zoomDrag: number = 0;
    private tiltDrag: number = 0;

    private plots: Plot3D[] = [];

    // 3D Basic constructs
    private camera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    private scene: THREE.Scene = new THREE.Scene();
    private renderer: THREE.WebGLRenderer|null = null;

    private prevT: number = -1;

    private mousePrevPos: THREE.Vector2|null = null;

    created() {

        // for testing
        /*this.plots.push(new Plot3D(new THREE.Vector2(0, 0)));
        this.plots.push(new Plot3D(new THREE.Vector2(0, 1)));
        this.plots.push(new Plot3D(new THREE.Vector2(1, 0)));
        this.plots.push(new Plot3D(new THREE.Vector2(1, 1)));
        /*this.plots.push(new Plot3D(new THREE.Vector2(0, 0)));
        this.plots.push(new Plot3D(new THREE.Vector2(0, 0)));
        this.plots.push(new Plot3D(new THREE.Vector2(0, 0)));
        this.plots.push(new Plot3D(new THREE.Vector2(0, 0)));
        this.scene.add(this.plots[0]);
        this.scene.add(this.plots[1]);
        this.scene.add(this.plots[2]);
        this.scene.add(this.plots[3]);*/

        this.viewState.center.x = 0.5;
        this.viewState.center.y = 0.5;
        this.centerDrag.x = 0.5;
        this.centerDrag.y = 0.5;
        this.viewState.zoom = -1;
        this.zoomDrag = -1;

        this.reloadPlots();

        /*var geometry = new THREE.BoxGeometry( 1, 1, 1 );
			var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
			var cube = new THREE.Mesh( geometry, material );
			this.scene.add( cube );*/
    }

    mounted() {
        this.camera.up = new THREE.Vector3(0, 1, 1).normalize();

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

        this.viewState.zoom += delta;

        this.viewState.center.x = origin.x - (origin.x - this.viewState.center.x) / Math.pow(2, delta);
        this.viewState.center.y = origin.y - (origin.y - this.viewState.center.y) / Math.pow(2, delta);

        //console.log(origin.x, origin.y, this.zoom);
        this.reloadPlots();

        event.preventDefault();

        return false;
    }

    mouseMove(event: any) {
        if(event.buttons & 1) {
            if(event.type == 'mousedown') {
                this.mousePrevPos = new THREE.Vector2(event.screenX, event.screenY);
            }
            else if(event.type == 'mousemove' && this.mousePrevPos) {
                let dx = (event.screenX - this.mousePrevPos.x) / ZOOM_PLOT_SIZE * this.zoomCoordSize;
                let dy = (event.screenY - this.mousePrevPos.y) / ZOOM_PLOT_SIZE * this.zoomCoordSize;

                this.viewState.center.x += -dx * Math.cos(this.tiltDrag) + dy * Math.sin(this.tiltDrag);
                this.viewState.center.y +=  dx * Math.sin(this.tiltDrag) + dy * Math.cos(this.tiltDrag);

                this.mousePrevPos.x = event.screenX;
                this.mousePrevPos.y = event.screenY;

                this.reloadPlots();
            }
            else if(event.type == 'mouseup') {
                this.mousePrevPos = null;
            }
        }
    }

    pixelToPlaneCoords(pixel: THREE.Vector2): THREE.Vector2 {
        return new THREE.Vector2(
            this.viewState.center.x + ((pixel.x - this.width / 2) / ZOOM_PLOT_SIZE) * this.zoomCoordSize,
            this.viewState.center.y - ((pixel.y - this.height / 2) / ZOOM_PLOT_SIZE) * this.zoomCoordSize
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

        this.reloadPlots();
    }

    // called when the view position changes so that plots can be added or removed from the map
    reloadPlots() {
        // find the viewport min/max coords
        let min = this.pixelToPlaneCoords(new THREE.Vector2(0, this.height));
        let max = new THREE.Vector2(this.viewState.center.x + (this.viewState.center.x - min.x), this.viewState.center.y + (this.viewState.center.y - min.y));

        // add or remove plots
        min.x = Math.floor(min.x);
        min.y = Math.floor(min.y);
        max.x = Math.ceil(max.x + 1);
        max.y = Math.ceil(max.y + 1);
        let count = (max.x - min.x) * (max.y - min.y);
        if(count > 100) {
            // fudged viewing mode--download no plot data, but draw something convincing
            // consider not actually clearing it out, we just happen to be doing that right now
            for(let plot of this.plots) {
                this.scene.remove(plot);
            }
            this.plots = [];
        }
        else {
            //console.log('Now loading plots.');
            if(this.plots.length && min == this.plots[0].pos &&
                max == this.plots[this.plots.length - 1].pos)
                return; // no change to plots
            
            //console.log('Done with you');
            
            let newplots = new Array(count);
            var i = 0;
            var j = 0;
            for(let y = min.y;y < max.y;y++) {
                for(let x = min.x;x < max.x;x++) {
                    let p = new THREE.Vector2(x, y);
                    //console.log('Done with you', i < this.plots.length);
                    while(i < this.plots.length && (this.plots[i].pos.x < x || this.plots[i].pos.y < y)) {
                        // remove plot from scene and increment
                        this.scene.remove(this.plots[i++]);
                    }
                    //console.log('Done with you');
                    if(i < this.plots.length && this.plots[i] && this.plots[i].pos == p) {
                        newplots[j++] = this.plots[i++];
                    }
                    else {
                        // create the new plot
                        newplots[j] = new Plot3D(p, this.viewState);
                        this.scene.add(newplots[j++]);
                    }
                }
            }

            while(i < this.plots.length) {
                // the rest here are all to be removed
                this.scene.remove(this.plots[i++]);
            }

            this.plots = newplots;
        }
    }

    @Watch('viewState.zoom')
    zoomChanged() {
        // change zoom behavior from 0->1
        this.viewState.tilt = ((Math.min(3, Math.max(1, this.viewState.zoom)) - 1) / 2) * Math.PI / 4;

        //console.log('Set tilt: ', this.tilt);
    }

    centerChanged() {
        this.reloadPlots();
    }

    update(t: number) {
        var timePassed = 1 / 60;
        if(this.prevT != -1)
            timePassed = t - this.prevT;

        this.centerDrag.x += (this.viewState.center.x - this.centerDrag.x) * 10.0 * (timePassed / 1000);
        this.centerDrag.y += (this.viewState.center.y - this.centerDrag.y) * 10.0 * (timePassed / 1000);
        this.zoomDrag += (this.viewState.zoom - this.zoomDrag) * 10.0 * (timePassed / 1000);
        this.tiltDrag += (this.viewState.tilt - this.tiltDrag) * 10.0 * (timePassed / 1000);

        for(let plot of this.plots) {
            plot.update(t);
        }
    }

    draw() {
        // TODO: Take into account screen width/height for zoom
        this.camera.left = -this.orthoWidth / 2;
        this.camera.right = this.orthoWidth / 2;
        this.camera.top = this.orthoHeight / 2;
        this.camera.bottom = -this.orthoHeight / 2;

        //console.log(10 * Math.cos(this.tilt));

        this.camera.position.x = this.centerDrag.x - 10 * Math.sin(this.viewState.tilt) * Math.sin(this.tiltDrag);
        this.camera.position.y = this.centerDrag.y - 10 * Math.sin(this.viewState.tilt) * Math.cos(this.tiltDrag);
        this.camera.position.z = 10 * Math.cos(this.viewState.tilt);

        this.camera.up = new THREE.Vector3(Math.sin(this.tiltDrag), Math.cos(this.tiltDrag), 1);

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
        return Math.pow(1 / 2, this.viewState.zoom);
    }

    get zoomDragCoordSize() {
        return Math.pow(1 / 2, this.zoomDrag);
    }

    get orthoWidth() {
        return this.zoomDragCoordSize * (this.width / ZOOM_PLOT_SIZE);
    }

    get orthoHeight() {
        return this.zoomDragCoordSize * (this.height / ZOOM_PLOT_SIZE);
    }
}
</script>
