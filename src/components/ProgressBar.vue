<template>
<canvas ref="canvas" class="progress-bar"
        :width="width"
        :height="height"></canvas>
</template>

<script lang="ts">
import { Component, Prop, Watch, Vue } from 'vue-property-decorator';
import _ from 'lodash';

import { pathRoundedRect } from '../canvas';

import { easeOutCubic, easeInCubic } from '../easing';

const FLY_DELAY_RATE = 300;
const FLY_DELAY_PERCENT = 300;
const FLY_TIME = 200;
const FLY_TURN = 50;

@Component
export default class ProgressBar extends Vue {

    // value from 0 to 1 indicating the amount that the progress bar should be filled
    @Prop() private progress: number = 0;

    // number of rows of blocks which should be fit on this progress bar
    @Prop({default: 5}) private blockRows: number = 3;

    // same as blockRows, but for columns
    @Prop({default: 80}) private blockCols: number = 40;

    // the number of pixels each block should occupy
    @Prop({default: 6}) private blockSize: number = 10;

    // the number of pixels of empty space to show between each block
    @Prop({default: 1}) private blockPadding: number = 3;

    // the CSS color style to use while drawing.
    @Prop({default: '#fff'}) private color: string = '#fff';

    private borderSize: number = 1;

    private blocksAnim: number[] = [];

    private ctx: CanvasRenderingContext2D|null = null;

    private lastTime: number = 0;

    mounted() {
        this.ctx = (<HTMLCanvasElement>this.$refs.canvas).getContext('2d');
        this.calculateProgress();

        requestAnimationFrame(this.animate);
    }

    @Watch('progress')
    calculateProgress() {
        let t = this.lastTime;

        let p = Math.floor((this.progress / 100.0) * this.blocksCount);
        let rate = FLY_DELAY_RATE / (this.blocksCount / FLY_DELAY_PERCENT);

        this.adjustBlockCountAnimations();

        for(var i = 0;i < this.blocksAnim.length;i++) {
            if(i < p) {
                if(this.blocksAnim[i] == 0) {
                    this.blocksAnim[i] = t + rate * (p - i - 1);
                }
            }
            else {
                // should be exiting
                if(this.blocksAnim[i] != 0) {
                    this.blocksAnim[i] = t + rate * (i - p);
                }
            }
        }

        requestAnimationFrame(this.animate);
    }

    adjustBlockCountAnimations() {
        if(this.blocksCount != this.blocksAnim.length) {
            this.blocksAnim.length = this.blocksCount;

            for(var i = 0;i < this.blocksAnim.length;i++) {
                if(_.isNil(this.blocksAnim[i])) {
                    this.blocksAnim[i] = 0;
                }
            }
        }
    }

    animate(t: number) {

        this.lastTime = t;

        this.ctx!.clearRect(0, 0, this.width, this.height);
        
        this.ctx!.strokeStyle = this.color;
        this.ctx!.fillStyle = this.color;

        let offset = Math.ceil(this.borderSize / 2);

        pathRoundedRect(this.ctx!, offset, offset, this.width - offset * 2, this.height - offset * 2, this.borderSize);
        this.ctx!.stroke();

        this.adjustBlockCountAnimations();

        // now draw!
        pathRoundedRect(this.ctx!, 0, 0, this.blockSize, this.blockSize, 1);
        this.ctx!.save();

        let p = (this.progress / 100.0) * this.blocksCount;

        let flyDist = this.width * 1.2;

        let done = true;

        for(var i = 0;i < this.blocksCount;i++) {
            if(this.blocksAnim[i] == 0)
                break;
            
            if(i > p && this.blocksAnim[i] <= t + FLY_TIME) {
                this.blocksAnim[i] = 0;
                continue;
            }

            var d, r;
            let e = Math.max(0, Math.min(1, t - this.blocksAnim[i] / FLY_TIME));

            done = done && e == 1;

            if(i <= p) {
                d = flyDist * (1 - Math.min(1, easeOutCubic(e)));
                r = easeOutCubic((1 - e) * FLY_TURN) * Math.PI / 2;
            }
            else {
                d = flyDist * Math.min(1, easeInCubic(e));
                r = easeInCubic(e * FLY_TURN) * Math.PI / 2;
            }

            //console.log('Drawing a block: ', d, r);

            this.ctx!.translate(
                this.borderSize + this.blockPadding + 
                    (this.blockSize + this.blockPadding) * (0.75 + Math.floor(i / this.blockRows)) + d,
                this.borderSize + this.blockPadding + 
                    (this.blockSize + this.blockPadding) * (0.75 + (i % this.blockRows))
            );
            this.ctx!.rotate(r);

            pathRoundedRect(this.ctx!, -this.blockSize, -this.blockSize, this.blockSize, this.blockSize, 1);
            //this.ctx!.restore();
            this.ctx!.fill();

            //this.ctx!.fillRect(0, 0, this.width, this.height);
            this.ctx!.setTransform(1, 0, 0, 1, 0, 0);
        }

        // we only want to keep animating if there is stuff to do
        if(!done)
            requestAnimationFrame(this.animate);
    }

    get blocksCount() {
        return this.blockRows * this.blockCols;
    }

    get width() {
        return this.blockSize * this.blockCols + 
                this.blockPadding * (this.blockCols + 1) + 
                this.borderSize * 2;
    }

    get height() {
        return this.blockSize * this.blockRows + 
                this.blockPadding * (this.blockRows + 1) + 
                this.borderSize * 2;
    }
}
</script>
