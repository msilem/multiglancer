<template>
  <template v-for="view, i in appState.views.filter(x => x.enabled == true)" :key="i">
    <div style="text-align:center; display:inline-block; margin:1em">
      <div style="display: flex;justify-content: space-between; align-items: center;">
        <div style="padding: 0 1em; font-weight: 600;">{{ view.name }} {{ view.width }}x{{
          view.height }}</div>
        <div>
          <q-btn title="reload" icon="refresh" @click="reloadView(view)" round outline flat></q-btn>
          <q-btn title="full screen" icon="fullscreen" @click="makeFullScreen(i)" round outline flat></q-btn>
          <q-btn title="close" icon="close" @click="view.enabled = false" round outline flat></q-btn>
        </div>
      </div>
      <div style="position: relative; display: inline-block;">
        <div style="
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
            <iframe :key="view.reloadKey || 0" style="border: none;" :src="appState.url" :width="view.width" :height="view.height" />
          </foreignObject>
        </svg>
      </div>
      <q-slider :min="0.1" :max="2" :step="0.1" v-model="view.scale" />
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { appState } from 'src/stores/appState';

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
