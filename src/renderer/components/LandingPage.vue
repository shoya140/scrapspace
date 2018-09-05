<template>
  <div id="wrapper">
    <el-tabs v-model="currentTab" type="border-card" editable stretch @edit="handleTabsEdit">
      <el-tab-pane v-for="(item, index) in tabs" :key="item.name" :name="item.name" :label="item.url">
        <webview v-bind:src="item.url" class="scrapbox-webview" v-on:new-window="openOnBrowser"></webview>
      </el-tab-pane>
    </el-tabs>
    <el-dialog id="preferences-dialog" title="Manage projects" :visible.sync="showPreferences" width="500px">
      <el-form inline status-icon style="text-align:center;">
        <el-form-item>
          <el-input size="small" v-model="preference.host" placeholder="host" style="width:160px;"></el-input>
        </el-form-item>
        <span class="form-slash">/</span>
        <el-form-item>
          <el-input size="small" v-model="preference.project" placeholder="project" style="width:170px;" ref="project"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button size="small" type="primary" @click="addProject" :disabled="preference.project.length===0">Register</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="registeredProjects" empty-text="No project" :show-header="false">
        <el-table-column prop="url" show-overflow-tooltip />
        <el-table-column label="Operations" width="180px">
          <template slot-scope="scope">
            <el-button size="mini" @click="openProject(scope.$index, scope.row)">Open</el-button>
            <el-button size="mini" type="danger" @click="removeProject(scope.$index, scope.row)">Remove</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
    <el-dialog title="Developer Menu" :visible.sync="showDeveloperMenu" width="500px">
      <el-form>
        <el-form-item label="URL" :label-width="'60px'">
          <el-input v-model="scrapboxHost" auto-complete="off" placeholder=""></el-input>
        </el-form-item>
        <el-form-item label="Token" :label-width="'60px'">
          <el-input v-model="scrapboxToken" auto-complete="off" placeholder=""></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="showPreferences = false; updatePreferences()">Login</el-button>
      </span>
    </el-dialog>
    <el-dialog title="Open URL" :visible.sync="showOpenURL" width="500px">
      <el-form @submit.native.prevent="openURL" inline style="text-align:center;">
        <el-form-item>
          <el-input ref="open" v-model="nextURL" placeholder="https://scrapbox.io" style="width:340px;"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="openURL">Open</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
    <el-dialog id="search-dialog" title="Cross-search" :visible.sync="showSearchPalette" width="500px">
      <el-form @submit.native.prevent="searchKeyEnter">
      <el-input ref="search" v-model="searchQuery" clearable @keyup.down.native="searchKeyDown" @keyup.up.native="searchKeyUp" />
      </el-form>
      <el-table ref="searchTable" :data="searchResult" highlight-current-row  @cell-click="rowClicked" empty-text="No data" v-show="searchResult.length>0">
        <el-table-column prop="project" label="Project" width="100px" show-overflow-tooltip />
        <el-table-column prop="title" label="Title" width="360px" show-overflow-tooltip />
      </el-table>
    </el-dialog>
    <el-progress id="page-cache-progress" type="circle" :percentage="pageCacheProgress" :width="20" :stroke-width="4" :show-text="false" v-show="showPageCacheProgress"></el-progress>
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
        tabs: [],
        currentTab: '-1',
        showPreferences: false,
        showSearchPalette: false,
        showDeveloperMenu: false,
        showOpenURL: false,
        searchQuery: '',
        scrapboxHost: electronStore.get('scrapboxHost'),
        scrapboxToken: electronStore.get('scrapboxToken'),
        searchResult: [],
        currentRow: null,
        nextURL: null,
        pageCache: [],
        preference: {
          host: 'https://scrapbox.io',
          project: ''
        },
        registeredProjects: electronStore.get('registeredProjects'),
        pageCacheProgress: 0,
        showPageCacheProgress: false
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
        this.updateCurrentRow(this.searchResult.length > 0 ? 0 : null)
      },
      pageCacheProgress: function (val) {
        this.showPageCacheProgress = true
        if (val === 100) {
          setTimeout(() => {
            this.showPageCacheProgress = false
          }, 1000)
        }
      },
      tabs: function (val) {
        ipcRenderer.send('updateTabs', val)
      }
    },
    computed: {
      webView: function () {
        return document.getElementsByClassName('scrapbox-webview')[this.currentTab]
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
        this.goTo(val.host + '/' + val.project + '/' + val.title)
      },
      searchKeyEnter (e) {
        if (this.currentRow != null) {
          const r = this.searchResult[this.currentRow]
          this.goTo(r.host + '/' + r.project + '/' + r.title)
        }
      },
      searchKeyDown (e) {
        if (this.currentRow != null && this.currentRow < this.searchResult.length - 1) {
          this.updateCurrentRow(this.currentRow + 1)
        }
      },
      searchKeyUp (e) {
        if (this.currentRow != null && this.currentRow > 0) {
          this.updateCurrentRow(this.currentRow - 1)
        }
      },
      updateCurrentRow (val) {
        this.currentRow = val
        if (val != null) {
          this.$refs.searchTable.setCurrentRow(this.searchResult[val])
        } else {
          this.$refs.searchTable.setCurrentRow()
        }
      },
      goTo (url) {
        this.showSearchPalette = false
        this.showPreferences = false
        this.showDeveloperMenu = false
        this.showOpenURL = false
        this.webView.src = url
        this.tabs.splice(this.currentTab, 1, {name: this.currentTab, url: url})
      },
      addProject () {
        this.registeredProjects.push({
          host: this.preference.host,
          project: this.preference.project,
          url: this.preference.host + '/' + this.preference.project + '/'})
        electronStore.set('registeredProjects', this.registeredProjects)
        this.preference.host = 'https://scrapbox.io'
        this.preference.project = ''
        this.reloadPageCache()
      },
      removeProject (index, row) {
        this.registeredProjects.splice(index, 1)
        electronStore.set('registeredProjects', this.registeredProjects)
        this.reloadPageCache()
      },
      openProject (index, row) {
        this.goTo(this.registeredProjects[index].url)
      },
      reloadPageCache () {
        this.pageCacheProgress = 0
        var pages = []
        for (const r of this.registeredProjects) {
          this.$http
            .get(r.host + '/api/pages/' + r.project, {withCredentials: true})
            .then(response => {
              if (response.status === 200) {
                for (const page of response.data.pages) {
                  pages.push({'host': r.host, 'project': r.project, 'title': page.title, 'content': page.title + page.descriptions.toString()})
                }
              }
              this.pageCacheProgress += (100 / this.registeredProjects.length)
            })
        }
        this.pageCache = pages
      },
      openURL () {
        this.goTo(this.nextURL)
      },
      addTab () {
        var url = ''
        if (this.registeredProjects.length > 0) {
          const r = this.registeredProjects[0]
          url = r.host + '/' + r.project + '/'
          this.reloadPageCache()
        } else {
          url = 'https://scrapbox.io'
          this.$notify({
            title: 'Welcome to Scrapspace :)',
            message: 'Open Preferences and register your project.',
            duration: 10000
          })
        }
        let newTabName = ++this.currentTab + ''
        this.tabs.push({
          name: newTabName,
          url: url
        })
        this.currentTab = newTabName
      },
      closeTab (targetName) {
        let tabs = this.tabs
        let activeName = this.currentTab
        if (activeName === targetName) {
          tabs.forEach((tab, index) => {
            if (tab.name === targetName) {
              let nextTab = tabs[index + 1] || tabs[index - 1]
              if (nextTab) {
                activeName = nextTab.name
              }
            }
          })
        }
        this.currentTab = activeName
        this.tabs = tabs.filter(tab => tab.name !== targetName)
      },
      handleTabsEdit (targetName, action) {
        if (action === 'add') {
          this.addTab()
          document.activeElement.blur()
        }
        if (action === 'remove') {
          this.closeTab(targetName)
        }
      }
    },
    created: function () {
      ipcRenderer.on('Preferences', (msg) => {
        this.showPreferences = true
        setTimeout(() => {
          this.$refs.project.focus()
        }, 0)
      })

      ipcRenderer.on('New Page', (msg) => {
        this.webView.executeJavaScript('document.getElementsByClassName("new-button")[0].click()')
      })

      ipcRenderer.on('New Tab', (msg) => {
        this.addTab()
      })

      ipcRenderer.on('Close Tab', (msg) => {
        this.closeTab(this.currentTab)
      })

      ipcRenderer.on('Open URL', (msg) => {
        this.nextURL = this.webView.getURL()
        this.showOpenURL = true
        setTimeout(() => {
          this.$refs.open.focus()
        }, 0)
      })

      ipcRenderer.on('Cross-Search', (msg) => {
        this.searchQuery = ''
        this.showSearchPalette = true
        setTimeout(() => {
          this.$refs.search.focus()
        }, 0)
      })

      ipcRenderer.on('Developer Menu', (msg) => {
        this.showDeveloperMenu = true
      })

      ipcRenderer.on('Reload Page', (msg) => {
        this.webView.reload()
      })

      ipcRenderer.on('Reload Page Cache', (msg) => {
        this.reloadPageCache()
      })

      ipcRenderer.on('Focus Tab', (event, msg) => {
        this.currentTab = msg
      })
    },
    mounted: function () {
      this.addTab()
    }
  }
</script>

<style lang="scss">

$tab-margin: 4px;

.el-tabs__header {
  top: 0;
  left: 78px;
  right: 0;
  height: $titlebar-height;
  position: fixed;
  z-index: 10;
}

.el-tabs--border-card>.el-tabs__header {
  background-color: $brand-color;
  border-bottom: solid 1px darken($brand-color, 10%);
  .el-tabs__item.is-active {
    background-color: darken($brand-color, 10%);
    border-left: solid 1px darken($brand-color, 10%);
    border-right: solid 1px darken($brand-color, 10%);
    border-radius: 3px 3px 0 0;
  }
  .el-tabs__item {
    margin: $tab-margin 0 0 0;
    font-size: 12px;
    height: $titlebar-height - $tab-margin;
    line-height: $titlebar-height - $tab-margin;
    color: #dddddd;
    &:not(.is-disabled):hover {
      color: #ffffff;
    }
    &.is-active {
      color: #dddddd;
    }
  }
}

.el-tabs__new-tab {
  margin: 7px;
  font-size: 20px;
  width: 26px;
  height: 26px;
  line-height: 26px;
  border-style: none;
  &:hover {
    color: #ffffff;
  }
}

.el-tabs, .el-tabs__content, .el-tab-pane {
  height: 100%;
}

.el-tabs--border-card>.el-tabs__content {
  position: absolute;
  top: $titlebar-height;
  right: 0;
  left: 0;
  padding: 0;
  height: calc(100% - #{$titlebar-height+1});
  border-top: solid 1px darken($brand-color, 10%);
}

.scrapbox-webview {
  width: 100%;
  height: 100%;
}

#preferences-dialog {
  .el-dialog {
    min-height: 250px;
  }
}

#search-dialog {
  .el-table__body-wrapper {
    cursor: pointer;
  }
}

#page-cache-progress {
  position: absolute;
  left: 10px;
  bottom: 5px;
  z-index: 10;
  opacity: 0.9;
}

.form-slash {
  margin-left:-10px; 
  line-height: 42px; 
  font-size: 20px; 
  color:#dddddd;
}

</style>
