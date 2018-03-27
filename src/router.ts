import Vue from 'vue'
import Router from 'vue-router'
import EntryLoader from './views/EntryLoader.vue'
import About from './views/About.vue'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'entry-loader',
      component: EntryLoader
    },
    {
      path: '/about',
      name: 'about',
      component: About
    }
  ]
})
