<template>
  <div id="wrapper">
    <webview src="http://localhost:8880"></webview>
  </div>
</template>

<script>
  export default {
    name: 'landing-page'
  }
</script>

<style lang="scss">
#wrapper {
  position: absolute;
  top: 23px;
  left: 0;
  right: 0;
  bottom: 0;
}

webview {
  width: 100%;
  height: 100%;
}
</style>
