<template>
  <div id="wrapper">
    <webview id="scrapbox-webview" v-bind:src="currentURL" v-on:new-window="openOnBrowser"></webview>
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
    <el-dialog title="Cross-Search" :visible.sync="showSearchPalette" :width="'500px'">
      <el-input ref="search" v-model="searchQuery" clearable autofocus />
      <el-table :data="searchResult" highlight-current-row @cell-click="rowClicked" empty-text="No data" v-show="searchResult.length>0">
        <el-table-column class="searchColumn" prop="project" label="Project" width="100px" show-overflow-tooltip />
        <el-table-column class="searchColumn" prop="title" label="Title" width="360px" show-overflow-tooltip />
      </el-table>
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
        showSearchPalette: false,
        searchQuery: '',
        scrapboxHost: electronStore.get('scrapboxHost'),
        scrapboxToken: electronStore.get('scrapboxToken'),
        searchResult: [],
        currentRow: null,
        currentURL: electronStore.get('scrapboxHost', this.scrapboxHost),
        pageCache: null
      }
    },
    watch: {
      searchQuery: function (val) {
        if (val.length === 0) {
          this.searchResult = []
          return
        }
        var result = []
        for (const page of this.pageCache) {
          if (page.content.indexOf(val) >= 0) {
            result.push({'host': page.host, 'project': page.project, 'title': page.title})
          }
        }
        this.searchResult = result
      }
    },
    methods: {
      updatePreferences () {
        electronStore.set('scrapboxHost', this.scrapboxHost)
        electronStore.set('scrapboxToken', this.scrapboxToken)
        ipcRenderer.send('updateScrapboxToken', {host: this.scrapboxHost, token: this.scrapboxToken})
      },
      openOnBrowser (event) {
        shell.openExternal(event.url)
      },
      rowClicked (val) {
        this.goTo(val.host, val.project, val.title)
      },
      goTo (host, project, page) {
        this.showSearchPalette = false
        this.currentURL = host + '/' + project + '/' + page
      }
    },
    created: function () {
      ipcRenderer.on('CmdOrCtrl+,', (msg) => {
        this.showPreferences = true
      })

      ipcRenderer.on('CmdOrCtrl+p', (msg) => {
        this.searchQuery = ''
        this.showSearchPalette = true
      })

      const host = electronStore.get('scrapboxHost', this.scrapboxHost)
      const projects = ['private']

      var pages = []
      for (const project of projects) {
        this.$http
          .get(host + '/api/pages/' + project, {withCredentials: true})
          .then(response => {
            if (response.status === 200) {
              for (const page of response.data.pages) {
                pages.push({'host': host, 'project': project, 'title': page.title, 'content': page.title + page.descriptions.toString()})
              }
            }
          })
      }
      this.pageCache = pages
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

.el-table__body-wrapper {
  cursor: pointer;
}
</style>
