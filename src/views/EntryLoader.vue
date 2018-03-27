<template>
<div id="#entry-show">
    <div class="logo complete-center" :style="{
        opacity: opacityTween,
        top: (50 - verticalOffsetTween) + '%'
    }">
        <img src="../assets/img/icons8-sugar-cube.svg" />
        <span ref="veiledText" :style="{
            width: veilTween + 'px'
            }">SCAPE</span>
    </div>
    <div class="progress complete-center" :style="{
        opacity: (verticalOffsetTween - 7.5) / 7.5,
        top: (50 + verticalOffsetTween) + '%'    
    }">
        <ProgressBar></ProgressBar>
    </div>
</div>
</template>

<style lang="scss" scoped>
.logo {
    display: inline-block;
    margin-right: 20px;
}

.logo img {
    width: 50px;
    height: 50px;
    margin-left: 10px;
    margin-right: 10px;
}

.logo span {
    color: white;
    vertical-align: bottom;
    font-size: 50px;
    font-family: Quicksand;
    font-weight: lighter;
    overflow: hidden;
    display: inline-block;
    direction: rtl;
}
</style>

<script lang="ts">
import { Component, Prop, Watch, Vue } from 'vue-property-decorator';

import VueMixinTween from 'vue-mixin-tween';

import { timeout } from '../promise';

import ProgressBar from '@/components/ProgressBar.vue'; // @ is an alias to /src

@Component({
    mixins: [
        VueMixinTween('veil'),
        VueMixinTween('opacity'),
        VueMixinTween('verticalOffset')
    ],

    components: {
        ProgressBar
    }
})
export default class EntryLoader extends Vue {

    private stage = 'start';
    private veil = 0;
    private opacity = 0;

    private verticalOffset = 0;

    created() {
        this.veil = 0.1;
        this.opacity = 0.1;
        this.verticalOffset = 0.1;
    }

    async mounted() {
        this.opacity = 1;
        await timeout(1000);
        this.veil = 0.1;
        await timeout(1000);
        this.veil = (<any>this.$refs.veiledText).scrollWidth;

        await timeout(500);
        this.verticalOffset = 15;
    }
}
</script>


