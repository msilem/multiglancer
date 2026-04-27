<template>
  <template v-for="view, i in appState.views" :key="i">
    <div v-if="view.enabled" style="text-align:center; display:inline-block; margin:1em">
      <div style="display: flex;justify-content: space-between; align-items: center;">
        <div style="padding: 0 1em; font-weight: 600;">{{ view.name }} {{ view.width }}x{{
          view.height }}</div>
        <div>
          <q-btn v-if="isElectron" title="capture" icon="camera_alt" @click="captureSingleView(view, i)" round outline flat></q-btn>
          <q-btn title="reload" icon="refresh" @click="reloadView(view)" round outline flat></q-btn>
          <q-btn title="full screen" icon="fullscreen" @click="makeFullScreen(i)" round outline flat></q-btn>
          <q-btn title="close" icon="close" @click="view.enabled = false" round outline flat></q-btn>
        </div>
      </div>
      <div style="position: relative; display: inline-block;">
        <div class="view-overlay" style="
          position: absolute;
          top: 6px;
          left: 6px;
          z-index: 10;
          pointer-events: none;
          font-size: 10px;
          font-family: monospace;
          color: white;
          background: rgba(0,0,0,0.55);
          border-radius: 4px;
          padding: 2px 6px;
          white-space: nowrap;
        ">{{ gameName }} &middot; {{ view.name }} {{ view.width }}&times;{{ view.height }}</div>
        <svg :id="`viewComp` + i" :viewBox="`0 0 ${view.width} ${view.height}`"
          :width="view.width * appState.zoom * view.scale" :height="view.height * appState.zoom * view.scale"
          style="box-shadow: 0 0 10px black; display: block;">
          <foreignObject :width="view.width" :height="view.height">
            <iframe :key="view.reloadKey || 0" style="border: none;" :src="getMobileUrl(appState.url)" :width="view.width" :height="view.height" />
          </foreignObject>
        </svg>
      </div>
      <q-slider :min="0.1" :max="2" :step="0.1" v-model="view.scale" />
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { appState } from 'src/stores/appState';

const $q = useQuasar();

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

async function captureSingleView(view: any, i: number) {
  try {
    const svgEl = document.getElementById('viewComp' + i);
    if (!svgEl) return;

    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;
    
    svgEl.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    await new Promise(r => setTimeout(r, 400));


    // Hide overlays so they aren't captured
    document.querySelectorAll('.view-overlay').forEach((el: any) => el.style.display = 'none');

    const rect = svgEl.getBoundingClientRect();
    
    // Capture the ENTIRE viewport to avoid Electron bounds-check crashes
    const dataUrl = await (window as any).electronAPI.capturePage();
    
    // Restore overlays
    document.querySelectorAll('.view-overlay').forEach((el: any) => el.style.display = '');
    
    if (dataUrl) {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = dataUrl; });
      
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = view.width;
      sliceCanvas.height = view.height;
      
      const sCtx = sliceCanvas.getContext('2d');
      if (sCtx) {
        // Crop the captured viewport image to the SVG's exact visual dimensions
        sCtx.drawImage(
          img, 
          rect.left, rect.top, rect.width, rect.height, 
          0, 0, sliceCanvas.width, sliceCanvas.height
        );
        
        const stretchedUrl = sliceCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = stretchedUrl;
        a.download = `${gameName.value}_${view.name}_${view.width}x${view.height}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
    
    window.scrollTo({ left: originalScrollX, top: originalScrollY, behavior: 'instant' });
    
    $q.notify({ type: 'positive', message: `Screenshot of ${view.name} saved!` });
  } catch (err: any) {
    console.error(err);
    if (err.name !== 'NotAllowedError') {
      $q.notify({ type: 'negative', message: 'Failed to capture screenshot' });
    }
  }
}

function getMobileUrl(url: string) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has('device')) u.searchParams.set('device', 'mobile');
    if (!u.searchParams.has('isMobile')) u.searchParams.set('isMobile', 'true');
    return u.toString();
  } catch {
    return url;
  }
}

function makeFullScreen(i: number) {
  document.getElementById('viewComp' + i)?.requestFullscreen()
}

function reloadView(view: any) {
  view.reloadKey = (view.reloadKey || 0) + 1
}

const gameName = computed(() => {
  const urlList: string[] = appState.urlList ?? [];
  const urlIndex: number = appState.urlIndex ?? -1;
  const currentUrl: string = appState.url ?? '';

  // Check for a # comment line immediately before the current URL in the list
  if (urlIndex > 0) {
    const prevLine = urlList[urlIndex - 1]?.trim() ?? '';
    if (prevLine.startsWith('#')) {
      return prevLine.replace(/^#\s*/, '').trim();
    }
  }

  // Fall back to parsing the hostname
  try {
    const hostname = new URL(currentUrl).hostname;
    // e.g. "demogamesfree.pragmaticplay.net" -> pick the second-to-last segment before TLD
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2] ?? hostname;
    }
    return hostname;
  } catch {
    return currentUrl;
  }
});
</script>
