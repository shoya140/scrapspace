<template>
  <div id="wrapper">
    <webview id="scrapbox-webview" v-bind:src="host()" v-on:new-window="openOnBrowser"></webview>
      <el-dialog title="Preerences" :visible.sync="showPreferences" :width="'500px'">
      <el-form>
        <el-form-item label="URL" :label-width="'60px'">
          <el-input v-model="scrapboxHost" auto-complete="off" placeholder=""></el-input>
        </el-form-item>
        <el-form-item label="Token" :label-width="'60px'">
          <el-input v-model="scrapboxToken" auto-complete="off" placeholder=""></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="showPreferences = false; updatePreferences()">Confirm</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
  import {ipcRenderer, shell} from 'electron'
  import Store from 'electron-store'

  const electronStore = new Store()

  export default {
    name: 'landing-page',
    data: function () {
      return {
        showPreferences: false,
        scrapboxHost: electronStore.get('scrapboxHost'),
        scrapboxToken: electronStore.get('scrapboxToken')
      }
    },
    methods: {
      host () {
        return electronStore.get('scrapboxHost', this.scrapboxHost)
      },
      updatePreferences () {
        electronStore.set('scrapboxHost', this.scrapboxHost)
        electronStore.set('scrapboxToken', this.scrapboxToken)
        ipcRenderer.send('updateScrapboxToken', {host: this.scrapboxHost, token: this.scrapboxToken})
      },
      openOnBrowser (event) {
        shell.openExternal(event.url)
      }
    },
    created: function () {
      ipcRenderer.on('CmdOrCtrl+,', (msg) => {
        this.showPreferences = true
      })
    }
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

#scrapbox-webview {
  width: 100%;
  height: 100%;
}
</style>
