<template>
  <div id="wrapper">
    <webview id="scrapbox-webview" v-bind:src="currentURL" v-on:new-window="openOnBrowser"></webview>
    <el-dialog id="preferences-dialog" title="Manage projects" :visible.sync="showPreferences" width="500px">
      <el-form inline status-icon style="text-align:center;">
        <el-form-item>
          <el-input v-model="preference.host" placeholder="host" style="width:170px;"></el-input>
        </el-form-item>
        <el-form-item>
          <el-input v-model="preference.project" placeholder="project" style="width:160px;"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="addProject">Add</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="registeredProjects" empty-text="No project" :show-header="false">
        <el-table-column prop="url" show-overflow-tooltip />
        <el-table-column label="Operations" width="180px">
          <template slot-scope="scope">
            <el-button size="mini" @click="openProject(scope.$index, scope.row)">Open</el-button>
            <el-button size="mini" type="danger" @click="deleteProject(scope.$index, scope.row)">Delete</el-button>
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
        <el-button type="primary" @click="showPreferences = false; updatePreferences()">Confirm</el-button>
      </span>
    </el-dialog>
    <el-dialog id="search-dialog" title="Cross-search" :visible.sync="showSearchPalette" width="500px">
      <el-input ref="search" v-model="searchQuery" clearable autofocus />
      <el-table :data="searchResult" highlight-current-row @cell-click="rowClicked" empty-text="No data" v-show="searchResult.length>0">
        <el-table-column prop="project" label="Project" width="100px" show-overflow-tooltip />
        <el-table-column prop="title" label="Title" width="360px" show-overflow-tooltip />
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
        showDeveloperMenu: false,
        searchQuery: '',
        scrapboxHost: electronStore.get('scrapboxHost'),
        scrapboxToken: electronStore.get('scrapboxToken'),
        searchResult: [],
        currentRow: null,
        currentURL: null,
        pageCache: [],
        preference: {
          host: 'https://scrapbox.io',
          project: ''
        },
        registeredProjects: electronStore.get('registeredProjects')
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
        this.showPreferences = false
        this.showDeveloperMenu = false
        this.currentURL = host + '/' + project + '/' + page
      },
      addProject () {
        this.registeredProjects.push({
          host: this.preference.host,
          project: this.preference.project,
          url: this.preference.host + '/' + this.preference.project + '/'})
        electronStore.set('registeredProjects', this.registeredProjects)
        this.preference.host = 'https://scrapbox.io'
        this.preference.project = ''
      },
      deleteProject (index, row) {
        this.registeredProjects.splice(index, 1)
        electronStore.set('registeredProjects', this.registeredProjects)
      },
      openProject (index, row) {
        const r = this.registeredProjects[index]
        this.goTo(r.host, r.project, '')
      },
      reloadCache () {
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
            })
        }
        this.pageCache = pages
        electronStore.set('pageCache', JSON.stringify(pages))
        this.$message({message: 'Reloaded page caches', type: 'success', duration: 1000})
      }
    },
    created: function () {
      this.currentURL = this.registeredProjects.length > 0 ? this.registeredProjects[0].url : 'https://scrapbox.io'

      ipcRenderer.on('Preferences', (msg) => {
        this.showPreferences = true
      })

      ipcRenderer.on('Cross-Search', (msg) => {
        this.searchQuery = ''
        this.showSearchPalette = true
      })

      ipcRenderer.on('Developer Menu', (msg) => {
        this.showDeveloperMenu = true
      })

      ipcRenderer.on('Reload Cache', (msg) => {
        this.reloadCache()
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

</style>
