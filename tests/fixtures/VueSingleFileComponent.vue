<template>
  <div>
    <span>{{ message }}</span>
    <button @click="raiseEvent"></button>
    <slot name="testSlot"></slot>
  </div>
</template>

<script>
  export default {
    name: 'what',
    props: ['message', 'reset'],
    methods: {
      raiseEvent(e) {
        this.reset(e);
        this.$emit('custom-event', e);
      }
    }
  }
</script>
