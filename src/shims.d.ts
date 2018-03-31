declare module '*.vue' {
  import Vue from 'vue';
  export default Vue;
}

declare module 'vue-mixin-tween';

declare function requestAnimationFrame(callback: () => void): void;