<template>
<canvas ref="canvas" class="progress-bar"
        :width="width"
        :height="height"></canvas>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

import { strokeRoundedRect } from '../canvas';

@Component
export default class ProgressBar extends Vue {

    // value from 0 to 1 indicating the amount that the progress bar should be filled
    @Prop({default: 0}) private progress: number = 0;

    // number of rows of blocks which should be fit on this progress bar
    @Prop({default: 5}) private blockRows: number = 5;

    // same as blockRows, but for columns
    @Prop({default: 80}) private blockCols: number = 80;

    // the number of pixels each block should occupy
    @Prop({default: 6}) private blockSize: number = 6;

    // the number of pixels of empty space to show between each block
    @Prop({default: 1}) private blockPadding: number = 1;

    // the CSS color style to use while drawing.
    @Prop({default: '#fff'}) private color: string = '#fff';

    private borderSize: number = 1;

    private curProgress: number = 0;

    private ctx: CanvasRenderingContext2D|null = null;



    mounted() {
        this.ctx = (<HTMLCanvasElement>this.$refs.canvas).getContext('2d');

        

        requestAnimationFrame(this.animate);
    }

    animate() {
        
        this.ctx!.strokeStyle = this.color;

        let offset = Math.ceil(this.borderSize / 2);

        strokeRoundedRect(this.ctx!, offset, offset, this.width - offset * 2, this.height - offset * 2, this.borderSize);

        requestAnimationFrame(this.animate);
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
