import React from 'react'
import Vue from 'vue'
import ReactWrapper from './React'
import { config } from '../../src'

const VUE_COMPONENT_NAME = 'vuera-internal-component-name'
const VUERA_INTERNAL_REACT_WRAPPER = 'vuera-internal-react-wrapper'
const wrapReactChildren = (createElement, children) =>
  createElement(VUERA_INTERNAL_REACT_WRAPPER, {
    props: {
      component: () => <React.Fragment>{children}</React.Fragment>,
    },
  })

// const wrappedReactJsxElement = (createElement, component) =>
//   createElement(VUERA_INTERNAL_REACT_WRAPPER, {
//     props: {
//       component: () => <React.Fragment>{component}</React.Fragment>,
//     }
//   })
export default class VueContainer extends React.Component {
  constructor (props) {
    super(props)

    /**
     * We have to track the current Vue component so that we can reliably catch updates to the
     * `component` prop.
     */
    this.currentVueComponent = props.component

    /**
     * Modify createVueInstance function to pass this binding correctly. Doing this in the
     * constructor to avoid instantiating functions in render.
     */
    const createVueInstance = this.createVueInstance
    const self = this
    this.createVueInstance = function (element, component, prevComponent) {
      createVueInstance(element, self, component, prevComponent)
    }
  }

  componentDidUpdate (prevProps, _prevState, snapshot) {
    const { component, ...props } = this.props

    if (this.currentVueComponent !== component) {
      this.updateVueComponent(prevProps.component, component)
    }
    /**
     * NOTE: we're not comparing this.props and nextProps here, because I didn't want to write a
     * function for deep object comparison. I don't know if this hurts performance a lot, maybe
     * we do need to compare those objects.
     */
    Object.assign(this.vueInstance.$data, props)
  }

  componentWillUnmount () {
    this.vueInstance.$destroy()
  }

  /**
   * Creates and mounts the Vue instance.
   * NOTE: since we need to access the current instance of VueContainer, as well as the Vue instance
   * inside of the Vue constructor, we cannot bind this function to VueContainer, and we need to
   * pass VueContainer's binding explicitly.
   * @param {HTMLElement} targetElement - element to attact the Vue instance to
   * @param {ReactInstance} reactThisBinding - current instance of VueContainer
   */
  createVueInstance (targetElement, reactThisBinding) {
    const { component, on, ...props } = reactThisBinding.props

    // `this` refers to Vue instance in the constructor
    reactThisBinding.vueInstance = new Vue({
      el: targetElement,
      data: props,
      ...config.vueInstanceOptions,
      render (createElement) {
        const wrappedSlots = Object.keys(props).reduce((acc, key) => {
          const prop = props[key]
          if (React.isValidElement(prop)) {
            acc[key] = () => wrapReactChildren(this.$createElement, prop)
          }
          if (Array.isArray(prop) && prop.length > 0 && prop.every(React.isValidElement)) {
            acc[key] = () => prop.map(element => wrapReactChildren(this.$createElement, element))
          }
          return acc
        }, {})
        // console.log('slotsContent', wrappedSlots)
        return createElement(
          VUE_COMPONENT_NAME,
          {
            props: this.$data,
            on,
            scopedSlots: {
              ...wrappedSlots,
              default: () => wrapReactChildren(this.$createElement, this.children),
            },
          }
          // [wrapReactChildren(createElement, this.children)]
        )
      },
      components: {
        [VUE_COMPONENT_NAME]: component,
        'vuera-internal-react-wrapper': ReactWrapper,
      },
    })
  }

  updateVueComponent (prevComponent, nextComponent) {
    this.currentVueComponent = nextComponent

    /**
     * Replace the component in the Vue instance and update it.
     */
    this.vueInstance.$options.components[VUE_COMPONENT_NAME] = nextComponent
    this.vueInstance.$forceUpdate()
  }

  render () {
    return <div className='vuera-wrapper' ref={this.createVueInstance} />
  }
}
