<template>
<div id="#world">
    <digital-plane></digital-plane>
</div>
</template>

<style lang="scss">

body {
    background-color: #222;
}

</style>

<script lang="ts">
import { Component, Prop, Watch, Vue } from 'vue-property-decorator';

import VueMixinTween from 'vue-mixin-tween';

import { timeout } from '../promise';

import DigitalPlane from '@/components/DigitalPlane.vue'; // @ is an alias to /src

@Component({
    mixins: [
        VueMixinTween('veil'),
        VueMixinTween('opacity'),
        VueMixinTween('verticalOffset')
    ],

    components: {
        DigitalPlane: DigitalPlane
    }
})
export default class World extends Vue {

    created() {
    }

    async mounted() {
    }
}
</script>