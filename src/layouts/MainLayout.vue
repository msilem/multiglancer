<template>
  <q-layout view="hHh Lpr lFf">
    <q-header style="background-color: rgb(0, 0, 0);">
      <q-toolbar>
        <q-btn @click="togglePanel" outline :icon="panelOpen ? 'menu_open' : 'view_sidebar'" color="green" class="q-mr-xs">
          <q-tooltip>{{ panelOpen ? 'Hide views panel' : 'Show views panel' }}</q-tooltip>
        </q-btn>
        <q-toolbar-title style="flex: 0 0 auto;">MultiGlancer</q-toolbar-title>

        <q-space />

        <!-- URL list controls -->
        <div class="row items-center q-gutter-xs q-mr-sm">
          <q-btn dense flat icon="list" color="white" @click="urlListDialog = true" title="Paste URL list">
            <q-tooltip>Paste URL list</q-tooltip>
          </q-btn>
          <q-btn dense flat icon="chevron_left" color="white"
            :disable="!appState.urlList.length" @click="prevUrl" title="Previous URL" />
          <div class="text-caption text-white" style="min-width:70px; text-align:center;">
            <template v-if="appState.urlList.length">
              {{ appState.urlIndex + 1 }} / {{ appState.urlList.length }}
            </template>
            <template v-else>— / —</template>
          </div>
          <q-btn dense flat icon="chevron_right" color="white"
            :disable="!appState.urlList.length" @click="nextUrl" title="Next URL" />
        </div>

        <q-btn v-if="isElectron" dense flat icon="camera_alt" color="white" @click="captureScreenshots" class="q-mr-xs">
          <q-tooltip>Capture all views</q-tooltip>
        </q-btn>
        <q-btn dense flat icon="file_download" color="white" @click="doExport" class="q-mr-xs">
          <q-tooltip>Export config</q-tooltip>
        </q-btn>
        <q-btn dense flat icon="file_upload" color="white" @click="openImportDialog" class="q-mr-sm">
          <q-tooltip>Import config</q-tooltip>
        </q-btn>

        <q-btn icon="fab fa-youtube" @click="openLinkOnNewTab('https://www.youtube.com/watch?v=PNrvdtzaujA')" />
        <q-btn icon="fab fa-github" @click="openLinkOnNewTab('https://github.com/imvenx/multiglancer')" />

        <q-input label="Site URL" dark dense standout v-model="appState.url" style="width:30%; min-width: 200px;">
          <template v-slot:append>
            <q-icon v-if="appState.url === ''" name="http" />
            <template v-else>
              <q-icon name="clear" class="cursor-pointer" @click="appState.url = ''" />
              <q-icon name="refresh" class="cursor-pointer" @click="refresh()" />
            </template>
          </template>
        </q-input>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-splitter
        v-if="panelOpen"
        v-model="appState.leftPanelSize"
        :limits="[10, 60]"
        separator-class="mg-splitter-separator"
        style="height: calc(100vh - 50px);"
      >
        <template v-slot:before>
          <div class="left-panel-scroll">
            <div class="row items-center no-wrap q-px-sm q-py-xs panel-header">
              <q-icon name="view_sidebar" size="18px" class="q-mr-sm text-grey-5" />
              <div class="text-subtitle2 text-white">Views</div>
              <q-space />
              <q-btn dense flat round size="sm" icon="menu_open" color="grey-5" @click="togglePanel">
                <q-tooltip>Hide panel</q-tooltip>
              </q-btn>
            </div>
            <q-separator dark />
            <views-edit />
          </div>
        </template>
        <template v-slot:separator>
          <div class="mg-splitter-grip">
            <q-icon name="drag_indicator" size="16px" />
          </div>
        </template>
        <template v-slot:after>
          <router-view />
        </template>
      </q-splitter>
      <template v-else>
        <div class="mg-reopen-stripe" @click="togglePanel">
          <q-icon name="chevron_right" size="20px" />
          <q-tooltip anchor="center right" self="center left">Show views panel</q-tooltip>
        </div>
        <router-view />
      </template>
    </q-page-container>

    <q-card style="position:fixed; bottom: 1em; right:5em; width: 20em; opacity: .7;" class="shadow-10">
      <q-item>
        <q-item-section>
          <q-slider v-model="appState.zoom" :step="0.01" :min="0.1" :max="1" :label="true" />
        </q-item-section>
        <q-item-section side>
          <q-btn round flat dense icon="settings_backup_restore" @click="resetZooms" title="Reset all zooms">
            <q-tooltip>Reset global and individual zoom</q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
    </q-card>

    <!-- Import config dialog -->
    <q-dialog v-model="importDialog">
      <q-card style="min-width: 600px; max-width: 90vw;">
        <q-card-section>
          <div class="text-h6">Import config</div>
          <div class="text-caption">Paste a multiglancer config JSON, or an upstream localStorage dump.</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="importText"
            type="textarea"
            outlined
            rows="14"
            placeholder='{"zoom":0.3, ...} or {"appState":"__q_objt|{...}"}'
          />
          <input
            ref="fileInput"
            type="file"
            accept="application/json,.json,.txt"
            style="display:none"
            @change="onFileChosen"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat icon="upload_file" label="Load from file" @click="fileInput?.click()" />
          <q-space />
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Import" @click="doImport" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Paste URL list dialog -->
    <q-dialog v-model="urlListDialog">
      <q-card style="min-width: 500px; max-width: 80vw;">
        <q-card-section>
          <div class="text-h6">Paste URLs (one per line)</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="urlListText"
            type="textarea"
            outlined
            rows="12"
            placeholder="https://example.com/page1&#10;https://example.com/page2"
          />
          <div class="text-caption q-mt-sm">
            {{ pastedCount }} URLs detected.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Save" @click="saveUrlList" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import ViewsEdit from 'src/components/ViewsEdit.vue';
import { appState, exportAppState, importAppState } from 'src/stores/appState';

const $q = useQuasar()

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

const importDialog = ref(false)
const importText = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function openImportDialog() {
  importText.value = ''
  importDialog.value = true
}

function doExport() {
  try {
    const json = exportAppState()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const a = document.createElement('a')
    a.href = url
    a.download = `multiglancer-config-${yyyy}-${mm}-${dd}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    $q.notify({ type: 'positive', message: 'Config exported' })
  } catch (e) {
    $q.notify({ type: 'negative', message: `Export failed: ${(e as Error).message}` })
  }
}

function onFileChosen(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { importText.value = String(reader.result ?? '') }
  reader.onerror = () => $q.notify({ type: 'negative', message: 'Could not read file' })
  reader.readAsText(file)
  input.value = ''
}

function doImport() {
  try {
    importAppState(importText.value)
    $q.notify({ type: 'positive', message: 'Config imported' })
    importDialog.value = false
  } catch (e) {
    $q.notify({ type: 'negative', message: `Import failed: ${(e as Error).message}` })
  }
}

const panelOpen = computed({
  get: () => appState.value.leftPanelOpen,
  set: (v: boolean) => { appState.value.leftPanelOpen = v }
})

const urlListDialog = ref(false)
const urlListText = ref(appState.value.urlList.join('\n'))

watch(urlListDialog, (open) => {
  if (open) urlListText.value = appState.value.urlList.join('\n')
})

const pastedCount = computed(() =>
  urlListText.value.split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#')).length
)

function saveUrlList() {
  const list = urlListText.value.split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'))
  appState.value.urlList = list
  appState.value.urlIndex = 0
  if (list.length) appState.value.url = list[0]
}

function prevUrl() {
  const list = appState.value.urlList
  if (!list.length) return
  appState.value.urlIndex = (appState.value.urlIndex - 1 + list.length) % list.length
  appState.value.url = list[appState.value.urlIndex]
}

function nextUrl() {
  const list = appState.value.urlList
  if (!list.length) return
  appState.value.urlIndex = (appState.value.urlIndex + 1) % list.length
  appState.value.url = list[appState.value.urlIndex]
}

const openLinkOnNewTab = (url: string) => window.open(url, '_blank')

function refresh() {
  location.reload()
}

function togglePanel() {
  panelOpen.value = !panelOpen.value
}

function resetZooms() {
  appState.value.zoom = 1;
  appState.value.views.forEach(v => {
    v.scale = 1;
  });
}

async function captureScreenshots() {
  try {
    let capturedCount = 0;
    
    // Save original scroll position
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;

    for (let i = 0; i < appState.value.views.length; i++) {
      if (!appState.value.views[i].enabled) continue;
      
      const svgEl = document.getElementById('viewComp' + i);
      if (!svgEl) continue;
      
      // Scroll the view into the center of the viewport so it is fully captured
      svgEl.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
      
      // Wait a moment for the scroll to happen and the page to paint
      await new Promise(r => setTimeout(r, 400));
      
      // Hide overlays so they aren't captured
      document.querySelectorAll('.view-overlay').forEach((el: any) => el.style.display = 'none');
      
      const rect = svgEl.getBoundingClientRect();
      const v = appState.value.views[i];
      
      // Capture the ENTIRE viewport to avoid Electron bounds-check crashes on negative coordinates
      const dataUrl = await (window as any).electronAPI.capturePage();
      
      // Restore overlays
      document.querySelectorAll('.view-overlay').forEach((el: any) => el.style.display = '');
      
      if (!dataUrl) continue;
      
      // We still stretch the captured screenshot back to the original view dimensions 
      // to ensure the saved file matches v.width x v.height
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = dataUrl; });
      
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = v.width;
      sliceCanvas.height = v.height;
      const sCtx = sliceCanvas.getContext('2d');
      if (!sCtx) continue;
      
      // Crop the captured viewport image to the SVG's exact visual dimensions
      sCtx.drawImage(
        img, 
        rect.left, rect.top, rect.width, rect.height, 
        0, 0, sliceCanvas.width, sliceCanvas.height
      );
      const stretchedUrl = sliceCanvas.toDataURL('image/png');
      
      const a = document.createElement('a');
      a.href = stretchedUrl;
      
      let gameName = "game";
      try { gameName = new URL(appState.value.url).hostname.split('.').slice(-2, -1)[0] || "game"; } catch {}
      
      a.download = `${gameName}_${v.name}_${v.width}x${v.height}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      capturedCount++;
    }
    
    // Restore original scroll
    window.scrollTo({ left: originalScrollX, top: originalScrollY, behavior: 'instant' });
    
    if (capturedCount > 0) {
      $q.notify({ type: 'positive', message: `Saved ${capturedCount} screenshots!` });
    } else {
      $q.notify({ type: 'warning', message: 'No enabled views found to capture.' });
    }

  } catch (err: any) {
    console.error(err);
    if (err.name !== 'NotAllowedError') {
      $q.notify({ type: 'negative', message: 'Failed to capture screenshots' });
    }
  }
}

</script>

<style scoped>
.left-panel-scroll {
  height: 100%;
  overflow-y: auto;
}
.panel-header {
  background-color: rgba(255, 255, 255, 0.03);
  min-height: 36px;
}
.mg-splitter-grip {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.45);
  height: 100%;
  width: 100%;
}
.mg-reopen-stripe {
  position: fixed;
  left: 0;
  top: 50px;
  bottom: 0;
  width: 14px;
  background-color: rgba(255, 255, 255, 0.04);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  z-index: 100;
  transition: background-color 0.15s, color 0.15s;
}
.mg-reopen-stripe:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}
</style>

<style>
/* Unscoped: Quasar renders the separator outside the component's scoped selectors */
.mg-splitter-separator {
  background-color: rgba(255, 255, 255, 0.1) !important;
  width: 4px !important;
  transition: background-color 0.15s;
}
.mg-splitter-separator:hover {
  background-color: rgba(100, 181, 246, 0.6) !important;
}
.q-splitter__separator-area {
  cursor: col-resize;
}
</style>
