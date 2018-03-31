<template>
<div class="digital-plane" ref="plane">
    <canvas ref="canvas" class="progress-bar"
            :width="width"
            :height="height"></canvas>
</div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from 'vue-property-decorator';
import _ from 'lodash';
import THREE from 'three';

import { pathRoundedRect } from '../canvas';

import { easeOutCubic, easeInCubic } from '../easing';

const FLY_DELAY_RATE = 300;
const FLY_DELAY_PERCENT = 300;
const FLY_TIME = 200;
const FLY_TURN = 50;

class Building3D {


    // 3D Constructs

}

class Robot3D {

}

@Component
export default class DigitalPlane  extends Vue {

    @Prop() private startCenter: number;

    private width: number;
    private height: number;

    private center: number;
    private zoom: number;


    // 3D Basic constructs
    private camera: THREE.Camera;
    private scene: THREE.Scene;
    private renderer: THREE.Renderer;

    private buildings: Building3D[];
    private robots: Robot3D[];

    private planeGeometry: THREE.PlaneBufferGeometry;
    private planeMaterial: THREE.ShaderMaterial;
    private planeMesh: THREE.Mesh;

    created() {
        this.camera = new THREE.OrthographicCamera(-1, 1, -1, 1, 0.1, 100);

        this.scene = new THREE.Scene();

        this.planeGeometry = new THREE.PlaneBufferGeometry(Number.MAX_VALUE, Number.MAX_VALUE);
        this.planeMaterial = new THREE.ShaderMaterial({

        });
        this.planeMesh = new THREE.Mesh(this.planeGeometry, this.planeMaterial);

        this.scene.add(this.planeMesh);
    }

    mounted() {
        this.resize();
        requestAnimationFrame(this.animate);
    }

    resize() {
        this.width = (<any>this.$refs.plane).innerWidth;
        this.height = (<any>this.$refs.plane).innerHeight;
    }

    animate(t: number) {
        this.renderer.render(this.scene, this.camera);
        
        // we only want to keep animating if there is stuff to do
        requestAnimationFrame(this.animate);
    }
}
</script>
